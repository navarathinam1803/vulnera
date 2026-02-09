import { Injectable } from '@nitrostack/core';
import { execSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type {
    AuditSummary,
    CompareScansResult,
    SavedScan,
    SeverityLevel,
    ShipReadiness,
    UpgradeSuggestion,
    Vulnerability,
} from './security-assistant.data.js';
import { SEVERITY_ORDER, SEVERITY_SCORE } from './security-assistant.data.js';

const GITHUB_API = 'https://api.github.com';

/** Result of resolving project root (local path or temp dir from GitHub) */
export interface ResolvedProject {
    path: string;
    cleanup?: () => void;
}

export type ProjectType = 'node' | 'python';

/** npm audit --json shape (simplified) */
interface NpmAuditVuln {
    severity?: string;
    via?: string[] | string | Array<{ title?: string } | string>;
    isDirect?: boolean;
    effects?: string[];
    range?: string;
    fixAvailable?: { name?: string; version?: string } | boolean;
}

interface NpmAuditJson {
    auditReportVersion?: number;
    vulnerabilities?: Record<string, NpmAuditVuln>;
    metadata?: {
        vulnerabilities?: { info?: number; low?: number; moderate?: number; high?: number; critical?: number };
    };
}

/** pip-audit --format json shape (simplified). Root can be array or { dependencies } */
interface PipAuditVuln {
    id?: string;
    fix_versions?: string[];
    description?: string;
    known_severity?: string;
}
interface PipAuditDep {
    name: string;
    version: string;
    vulns: PipAuditVuln[];
}
type PipAuditJson = PipAuditDep[] | { version?: number; dependencies?: PipAuditDep[]; vulnerabilities?: PipAuditDep[] };

const MAX_SCANS_PER_REPO = 20;

@Injectable()
export class SecurityAssistantService {
    /** In-memory store of scans per repo for compare-over-time (key: repoId). */
    private static scanStore = new Map<string, SavedScan[]>();

    /**
     * Parse GitHub repo spec into owner and repo.
     * Accepts: "owner/repo", "https://github.com/owner/repo", "github.com/owner/repo".
     */
    parseGitHubRepo(spec: string): { owner: string; repo: string } {
        const trimmed = spec.trim().replace(/\.git$/, '');
        let owner: string;
        let repo: string;
        if (trimmed.includes('github.com/')) {
            const match = trimmed.match(/github\.com[/:](\w(?:[-.\w])*)\/(\w(?:[-.\w])*)/);
            if (!match) throw new Error(`Invalid GitHub URL: ${spec}`);
            [, owner, repo] = match;
        } else if (trimmed.includes('/')) {
            [owner, repo] = trimmed.split('/').map((s) => s.trim());
            if (!owner || !repo) throw new Error(`Invalid GitHub repo: ${spec}`);
        } else {
            throw new Error(`Invalid GitHub repo: use "owner/repo" or full GitHub URL. Got: ${spec}`);
        }
        return { owner, repo };
    }

    /**
     * Base headers for GitHub API. Optional GITHUB_TOKEN for private repos and higher rate limits.
     */
    private githubHeaders(options?: { rawContent?: boolean }): Record<string, string> {
        const token = process.env.GITHUB_TOKEN?.trim();
        const headers: Record<string, string> = {
            Accept: options?.rawContent ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
            'User-Agent': 'RisklensSecurityAssistant/1.0',
            'X-GitHub-Api-Version': '2022-11-28',
        };
        if (token) headers.Authorization = `Bearer ${token}`;
        return headers;
    }

    /**
     * Build URL for GitHub Repos API: GET /repos/{owner}/{repo}. Owner/repo are encoded.
     */
    private githubRepoUrl(owner: string, repo: string): string {
        return `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
    }

    /**
     * Build URL for GitHub Contents API: GET /repos/{owner}/{repo}/contents/{path}.
     * Path segments are encoded so slashes in path are preserved.
     */
    private githubContentsUrl(owner: string, repo: string, filePath: string, ref?: string): string {
        const pathPart = filePath.split('/').map(encodeURIComponent).join('/');
        const url = `${this.githubRepoUrl(owner, repo)}/contents/${pathPart}`;
        return ref ? `${url}?ref=${encodeURIComponent(ref)}` : url;
    }

    /**
     * Check if a GitHub repo exists and is accessible. Throws with a clear message on 404/403.
     */
    private async checkRepoAccess(owner: string, repo: string): Promise<void> {
        const url = this.githubRepoUrl(owner, repo);
        let res: Response;
        try {
            res = await fetch(url, { headers: this.githubHeaders() });
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            throw new Error(`Failed to reach GitHub (${owner}/${repo}). Check network or try again. ${msg}`);
        }
        if (res.status === 404) {
            const hasToken = !!process.env.GITHUB_TOKEN?.trim();
            throw new Error(
                hasToken
                    ? `Repo ${owner}/${repo} not found. Check spelling and that you have access (token scope must include repo).`
                    : `Repo ${owner}/${repo} not found or it is private. For private repos, set GITHUB_TOKEN in your .env.`
            );
        }
        if (res.status === 403) {
            const text = await res.text();
            const rateLimit = text.includes('rate limit') || text.includes('Rate limit');
            throw new Error(
                rateLimit
                    ? `GitHub API rate limit exceeded. Set GITHUB_TOKEN in .env for higher limits, or try again later.`
                    : `GitHub API 403: ${text || res.statusText}`
            );
        }
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`GitHub API ${res.status}: ${text || res.statusText}`);
        }
    }

    /**
     * Fetch a file from GitHub repo (Contents API). Returns decoded content or null if not found.
     */
    private async fetchFromGitHub(owner: string, repo: string, filePath: string, ref?: string): Promise<string | null> {
        const url = this.githubContentsUrl(owner, repo, filePath, ref);
        let res: Response;
        try {
            res = await fetch(url, { headers: this.githubHeaders({ rawContent: true }) });
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            throw new Error(`Failed to fetch ${filePath} from GitHub. Check network. ${msg}`);
        }
        if (res.status === 404) return null;
        if (res.status === 403) {
            const text = await res.text();
            const rateLimit = text.includes('rate limit') || text.includes('Rate limit');
            throw new Error(
                rateLimit ? `GitHub API rate limit exceeded. Try again later or set GITHUB_TOKEN.` : `GitHub API 403: ${text || res.statusText}`
            );
        }
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`GitHub API ${res.status}: ${text || res.statusText}`);
        }
        const raw = await res.text();
        return raw;
    }

    /**
     * Fetch package.json and package-lock.json from a GitHub repo into a temp directory,
     * then return the path. If package-lock.json is missing, runs npm install --package-lock-only to generate it.
     * Use subpath when package.json is in a subdirectory (e.g. "frontend" for frontend/package.json).
     * Caller should call cleanup() when done.
     */
    async prepareProjectFromGitHub(githubRepo: string, ref?: string, subpath?: string): Promise<ResolvedProject> {
        const { owner, repo } = this.parseGitHubRepo(githubRepo);
        await this.checkRepoAccess(owner, repo);

        const prefix = subpath ? `${subpath.replace(/^\/|\/$/g, '')}/` : '';
        const tmpDir = mkdtempSync(join(tmpdir(), `risklens-${owner}-${repo}-`));

        const cleanup = () => {
            try {
                rmSync(tmpDir, { recursive: true, force: true });
            } catch {
                // ignore
            }
        };

        try {
            const pkgJson = await this.fetchFromGitHub(owner, repo, `${prefix}package.json`, ref);
            if (pkgJson) {
                writeFileSync(join(tmpDir, 'package.json'), pkgJson, 'utf-8');
                let lockJson = await this.fetchFromGitHub(owner, repo, `${prefix}package-lock.json`, ref);
                if (!lockJson) lockJson = await this.fetchFromGitHub(owner, repo, `${prefix}npm-shrinkwrap.json`, ref);
                if (lockJson) {
                    writeFileSync(join(tmpDir, 'package-lock.json'), lockJson, 'utf-8');
                } else {
                    try {
                        execSync('npm install --package-lock-only --no-audit --no-fund', {
                            cwd: tmpDir,
                            encoding: 'utf-8',
                            stdio: 'pipe',
                            timeout: 120_000,
                        });
                    } catch {
                        cleanup();
                        throw new Error(
                            `No package-lock.json or npm-shrinkwrap.json at ${prefix || 'root of '}${owner}/${repo}. Generating lockfile failed. Add a lockfile to the repo or use a branch that has one.`
                        );
                    }
                }
                return { path: tmpDir, cleanup };
            }

            const reqTxt = await this.fetchFromGitHub(owner, repo, `${prefix}requirements.txt`, ref);
            if (reqTxt) {
                writeFileSync(join(tmpDir, 'requirements.txt'), reqTxt, 'utf-8');
                return { path: tmpDir, cleanup };
            }

            const pyproject = await this.fetchFromGitHub(owner, repo, `${prefix}pyproject.toml`, ref);
            if (pyproject) {
                writeFileSync(join(tmpDir, 'pyproject.toml'), pyproject, 'utf-8');
                return { path: tmpDir, cleanup };
            }

            throw new Error(
                `No supported project found at ${prefix || 'root of '}${owner}/${repo}. ` +
                    `Expected package.json (Node.js) or requirements.txt / pyproject.toml (Python). ` +
                    (subpath ? `Check subpath "${subpath}".` : `Use "subpath" if the project is in a subdirectory.`)
            );
        } catch (e) {
            cleanup();
            throw e;
        }
    }

    /**
     * Resolve project root from either local projectPath or GitHub repo.
     * When githubRepo is set, it takes precedence: fetches repo into temp dir and returns path + cleanup.
     * subpath: use when package.json is in a subdirectory (e.g. "frontend" for frontend/package.json).
     */
    async resolveProjectRoot(options: {
        projectPath?: string;
        githubRepo?: string;
        ref?: string;
        subpath?: string;
    }): Promise<ResolvedProject> {
        if (options.githubRepo) {
            return this.prepareProjectFromGitHub(options.githubRepo, options.ref, options.subpath);
        }
        const path = options.projectPath ? resolve(options.projectPath) : process.cwd();
        return { path };
    }

    /**
     * Detect project type from directory contents. Prefer Node if both exist.
     */
    detectProjectType(projectRoot?: string): ProjectType | null {
        const cwd = projectRoot ? resolve(projectRoot) : process.cwd();
        if (existsSync(join(cwd, 'package.json'))) return 'node';
        if (existsSync(join(cwd, 'requirements.txt')) || existsSync(join(cwd, 'pyproject.toml')) || existsSync(join(cwd, 'Pipfile'))) return 'python';
        return null;
    }

    /**
     * Run pip-audit on a directory that has requirements.txt or pyproject.toml. Returns parsed JSON or null.
     * Uses requirements file with -r for requirements.txt; uses positional path (.) for pyproject.toml.
     * Tries "pip-audit" then "python -m pip_audit" for environments where pip-audit is not on PATH.
     */
    runPipAudit(projectRoot?: string): PipAuditJson | null {
        const cwd = projectRoot ? resolve(projectRoot) : process.cwd();
        const reqPath = join(cwd, 'requirements.txt');
        const pyprojectPath = join(cwd, 'pyproject.toml');
        const hasReq = existsSync(reqPath);
        const hasPyproject = existsSync(pyprojectPath);
        if (!hasReq && !hasPyproject) return null;

        // requirements.txt: pip-audit -r requirements.txt; pyproject.toml: pip-audit . (positional path)
        const args = hasReq
            ? ['-r', 'requirements.txt', '--format', 'json']
            : ['.', '--format', 'json'];

        const run = (cmd: string, argsList: string[]): string | null => {
            try {
                const out = execSync(`${cmd} ${argsList.map((a) => (a.includes(' ') ? `"${a}"` : a)).join(' ')}`, {
                    cwd,
                    encoding: 'utf-8',
                    maxBuffer: 5 * 1024 * 1024,
                    timeout: 120_000,
                });
                return out;
            } catch (err: unknown) {
                const raw = (err as { stdout?: string })?.stdout;
                return raw ?? null;
            }
        };

        let rawOut = run('pip-audit', args);
        if (rawOut === null) rawOut = run('python -m pip_audit', args);
        if (rawOut === null) return null;

        try {
            return JSON.parse(rawOut) as PipAuditJson;
        } catch {
            return null;
        }
    }

    /**
     * Normalize pip-audit output to our AuditSummary format.
     * Handles both root-level array and { dependencies } / { vulnerabilities } shapes.
     */
    private normalizePipAuditToSummary(audit: PipAuditJson): AuditSummary {
        const counts: Record<SeverityLevel, number> = { critical: 0, high: 0, moderate: 0, low: 0, info: 0 };
        const vulnerabilities: Vulnerability[] = [];
        const deps = Array.isArray(audit)
            ? audit
            : (audit.dependencies ?? audit.vulnerabilities ?? []);
        const severityMap: Record<string, SeverityLevel> = {
            critical: 'critical',
            high: 'high',
            medium: 'moderate',
            moderate: 'moderate',
            low: 'low',
            info: 'info',
        };

        for (const dep of deps) {
            const vulns = dep.vulns ?? [];
            for (const v of vulns) {
                const sevRaw = v.known_severity?.toLowerCase();
                const sev: SeverityLevel = (sevRaw && severityMap[sevRaw]) ? severityMap[sevRaw] : 'high';
                if (!SEVERITY_ORDER.includes(sev)) continue;
                counts[sev]++;
                const fixVer = v.fix_versions?.[0];
                vulnerabilities.push({
                    name: dep.name,
                    severity: sev,
                    title: v.id ?? v.description?.slice(0, 80),
                    id: v.id,
                    range: dep.version,
                    fixAvailable: fixVer ?? false,
                    description: v.description,
                    isDirect: true,
                });
            }
        }

        const totalVulnerabilities = vulnerabilities.length;
        const hasCriticalOrHigh = (counts.critical ?? 0) > 0 || (counts.high ?? 0) > 0;
        return { counts, totalVulnerabilities, hasCriticalOrHigh, vulnerabilities };
    }

    /**
     * Run npm audit in the given project directory and return parsed result.
     * Uses projectRoot or process.cwd() if not provided.
     */
    runAudit(projectRoot?: string): NpmAuditJson | null {
        const cwd = projectRoot ? resolve(projectRoot) : process.cwd();
        const packagePath = resolve(cwd, 'package.json');
        if (!existsSync(packagePath)) {
            return null;
        }
        try {
            const out = execSync('npm audit --json', {
                cwd,
                encoding: 'utf-8',
                maxBuffer: 10 * 1024 * 1024,
            });
            return JSON.parse(out) as NpmAuditJson;
        } catch (err: unknown) {
            const raw = (err as { stdout?: string; stderr?: string })?.stdout;
            if (raw) {
                try {
                    return JSON.parse(raw) as NpmAuditJson;
                } catch {
                    // ignore
                }
            }
            return null;
        }
    }

    /**
     * Get normalized audit summary and vulnerability list for the codebase.
     * Supports Node.js (npm audit) and Python (pip-audit). Detects project type automatically.
     */
    getAuditSummary(projectRoot?: string): AuditSummary {
        const projectType = this.detectProjectType(projectRoot);
        if (projectType === 'python') {
            const pipAudit = this.runPipAudit(projectRoot);
            if (pipAudit) return this.normalizePipAuditToSummary(pipAudit);
            throw new Error(
                'Python project detected but audit failed. Install pip-audit (pip install pip-audit) and ensure Python is on PATH. Try: pip-audit -r requirements.txt or pip-audit . in the project directory.'
            );
        }
        if (projectType !== 'node') {
            return {
                counts: { critical: 0, high: 0, moderate: 0, low: 0, info: 0 },
                totalVulnerabilities: 0,
                hasCriticalOrHigh: false,
                vulnerabilities: [],
            };
        }

        const audit = this.runAudit(projectRoot);
        const counts: Record<SeverityLevel, number> = {
            critical: 0,
            high: 0,
            moderate: 0,
            low: 0,
            info: 0,
        };
        const vulnerabilities: Vulnerability[] = [];

        if (!audit?.vulnerabilities) {
            return {
                counts,
                totalVulnerabilities: 0,
                hasCriticalOrHigh: false,
                vulnerabilities: [],
            };
        }

        const meta = audit.metadata?.vulnerabilities ?? {};
        (Object.keys(counts) as SeverityLevel[]).forEach((s) => {
            counts[s] = meta[s] ?? 0;
        });

        for (const [name, v] of Object.entries(audit.vulnerabilities)) {
            const severity = (v.severity ?? 'moderate') as SeverityLevel;
            if (!SEVERITY_ORDER.includes(severity)) continue;

            const via = Array.isArray(v.via) ? v.via : v.via ? [v.via] : [];
            const firstVia = typeof via[0] === 'string' ? via[0] : (via[0] as { title?: string })?.title;
            let fixVersion: string | boolean | undefined;
            if (typeof v.fixAvailable === 'object' && v.fixAvailable?.version) {
                fixVersion = v.fixAvailable.version;
            } else if (typeof v.fixAvailable === 'boolean' || typeof v.fixAvailable === 'string') {
                fixVersion = v.fixAvailable;
            } else {
                fixVersion = undefined;
            }

            const viaStrings: string[] | undefined = Array.isArray(v.via)
                ? v.via.map((x) => (typeof x === 'string' ? x : (x as { title?: string })?.title ?? ''))
                : undefined;

            vulnerabilities.push({
                name,
                severity,
                title: firstVia,
                range: v.range,
                fixAvailable: fixVersion,
                via: viaStrings?.length ? viaStrings : undefined,
                isDirect: v.isDirect,
                description: firstVia ? `${name}: ${firstVia}` : undefined,
            });
        }

        const totalVulnerabilities = vulnerabilities.length;
        const hasCriticalOrHigh = (counts.critical ?? 0) > 0 || (counts.high ?? 0) > 0;

        return {
            counts,
            totalVulnerabilities,
            hasCriticalOrHigh,
            vulnerabilities,
        };
    }

    /**
     * Answer: "Is this app safe to ship today?"
     * Default policy: safe only when there are no critical or high vulnerabilities.
     */
    getShipReadiness(projectRoot?: string): ShipReadiness {
        const summary = this.getAuditSummary(projectRoot);
        const { counts, hasCriticalOrHigh } = summary;

        const critical = counts.critical ?? 0;
        const high = counts.high ?? 0;
        const moderate = counts.moderate ?? 0;
        const low = counts.low ?? 0;

        const safeToShip = !hasCriticalOrHigh;
        let reason: string;
        let recommendation: string | undefined;

        if (safeToShip && summary.totalVulnerabilities === 0) {
            reason = 'No known vulnerabilities were found in your dependencies. It is reasonable to ship.';
            recommendation = 'Keep running security checks regularly.';
        } else if (safeToShip) {
            reason = `There are no critical or high severity issues. You have ${moderate} moderate and ${low} low severity findings. Shipping is acceptable from a severity standpoint, but consider scheduling fixes.`;
            recommendation = 'Run the "suggest_upgrades" tool to get concrete upgrade steps for moderate/low issues.';
        } else {
            reason = `There are ${critical} critical and ${high} high severity vulnerabilities. Do not ship until these are addressed.`;
            recommendation = 'Use "suggest_upgrades" to get exact upgrade commands, then run them and re-check with "is_app_safe_to_ship".';
        }

        return {
            safeToShip,
            reason,
            critical,
            high,
            moderate,
            low,
            recommendation,
        };
    }

    /**
     * Answer: "Which dependency is highest risk this week?"
     * Returns the single highest-severity vulnerability (by CVSS-style order).
     */
    getHighestRiskDependency(projectRoot?: string): {
        highest: Vulnerability | null;
        summary: string;
        allBySeverity: Vulnerability[];
    } {
        const summary = this.getAuditSummary(projectRoot);
        const sorted = [...summary.vulnerabilities].sort(
            (a, b) => (SEVERITY_SCORE[b.severity] ?? 0) - (SEVERITY_SCORE[a.severity] ?? 0)
        );
        const highest = sorted[0] ?? null;

        let summaryText: string;
        if (!highest) {
            summaryText = 'No vulnerabilities found in this codebase.';
        } else {
            summaryText = `Highest risk: **${highest.name}** (${highest.severity}). ${highest.title ?? highest.description ?? 'No description.'}${highest.fixAvailable ? ` Fix available: ${highest.fixAvailable}.` : ''}`;
        }

        return {
            highest,
            summary: summaryText,
            allBySeverity: sorted,
        };
    }

    /**
     * Summarize vulnerabilities in human language for non-experts.
     */
    getVulnerabilitiesSummary(projectRoot?: string): {
        summary: string;
        bySeverity: Record<SeverityLevel, string[]>;
        total: number;
    } {
        const audit = this.getAuditSummary(projectRoot);
        const bySeverity: Record<SeverityLevel, string[]> = {
            critical: [],
            high: [],
            moderate: [],
            low: [],
            info: [],
        };

        for (const v of audit.vulnerabilities) {
            const line = v.isDirect
                ? `${v.name}: ${v.title ?? 'Vulnerability'} (direct dependency). ${v.fixAvailable ? `Fix: upgrade to ${v.fixAvailable}.` : ''}`
                : `${v.name}: ${v.title ?? 'Vulnerability'} (transitive). ${v.fixAvailable ? `Fix: ${v.fixAvailable}.` : ''}`;
            bySeverity[v.severity].push(line);
        }

        const parts: string[] = [];
        if (audit.totalVulnerabilities === 0) {
            parts.push('No vulnerabilities were found in your dependencies.');
        } else {
            parts.push(`Your project has **${audit.totalVulnerabilities}** vulnerability findings.`);
            for (const sev of SEVERITY_ORDER) {
                const list = bySeverity[sev];
                if (list.length === 0) continue;
                parts.push(`**${sev.toUpperCase()}** (${list.length}):`);
                list.slice(0, 10).forEach((l) => parts.push(`- ${l}`));
                if (list.length > 10) parts.push(`- … and ${list.length - 10} more.`);
            }
            parts.push('Use "suggest_upgrades" to get exact commands to fix them.');
        }

        return {
            summary: parts.join('\n'),
            bySeverity,
            total: audit.totalVulnerabilities,
        };
    }

    /**
     * Suggest exactly what to upgrade in this codebase (actionable commands).
     * Uses npm install for Node and pip install for Python.
     */
    getUpgradeSuggestions(projectRoot?: string): {
        suggestions: UpgradeSuggestion[];
        summary: string;
    } {
        const projectType = this.detectProjectType(projectRoot);
        const audit = this.getAuditSummary(projectRoot);
        const suggestions: UpgradeSuggestion[] = [];
        const seen = new Set<string>();
        const isPip = projectType === 'python';

        for (const v of audit.vulnerabilities) {
            if (!v.fixAvailable || seen.has(v.name)) continue;
            const target = typeof v.fixAvailable === 'string' ? v.fixAvailable : 'latest';
            const action = isPip ? `pip install ${v.name}==${target}` : `npm install ${v.name}@${target}`;
            suggestions.push({
                package: v.name,
                current: v.range ?? 'unknown',
                target,
                severity: v.severity,
                action,
                isSemverCompatible: undefined,
            });
            seen.add(v.name);
        }

        // Prioritize by severity
        suggestions.sort((a, b) => (SEVERITY_SCORE[b.severity] ?? 0) - (SEVERITY_SCORE[a.severity] ?? 0));

        const summary =
            suggestions.length === 0
                ? 'No upgrade fixes available from the audit (or no vulnerabilities). Consider updating packages manually or checking for major-version upgrades.'
                : `Apply these ${suggestions.length} upgrade(s) in order of priority (critical/high first):`;

        return { suggestions, summary };
    }

    /**
     * Build a stable repo identifier for scan storage (used for compare over time).
     */
    getRepoId(options: { githubRepo?: string; ref?: string; subpath?: string; projectPath?: string }): string {
        if (options.githubRepo) {
            const { owner, repo } = this.parseGitHubRepo(options.githubRepo);
            const base = `${owner}/${repo}`;
            const sub = options.subpath?.replace(/^\/|\/$/g, '');
            return sub ? `${base}:${sub}` : base;
        }
        const path = options.projectPath ? resolve(options.projectPath) : process.cwd();
        return `local:${path}`;
    }

    /**
     * Save a scan for the given repo and optionally compare with the previous scan.
     * Returns comparison if a previous scan exists; otherwise returns first-scan result.
     */
    compareScansOverTime(
        repoId: string,
        currentSummary: AuditSummary,
        options: { ref?: string; subpath?: string; projectType?: ProjectType }
    ): CompareScansResult {
        const scannedAt = new Date().toISOString();
        const scan: SavedScan = {
            id: `scan-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            repoId,
            ref: options.ref,
            subpath: options.subpath,
            scannedAt,
            summary: currentSummary,
            projectType: options.projectType,
        };

        let list = SecurityAssistantService.scanStore.get(repoId) ?? [];
        const previous = list.length > 0 ? list[list.length - 1] : null;
        list = [...list, scan].slice(-MAX_SCANS_PER_REPO);
        SecurityAssistantService.scanStore.set(repoId, list);

        const currentSnapshot = {
            scannedAt,
            counts: currentSummary.counts,
            totalVulnerabilities: currentSummary.totalVulnerabilities,
        };

        if (!previous) {
            const summary =
                `First scan saved for **${repoId}**. Total: ${currentSummary.totalVulnerabilities} vulnerability(ies). ` +
                `Run this tool again after making changes to compare over time.`;
            return {
                repoId,
                baseline: currentSnapshot,
                current: currentSnapshot,
                fixed: [],
                introduced: [],
                summary,
                isFirstScan: true,
            };
        }

        const { fixed, introduced } = this.diffVulnerabilities(previous.summary.vulnerabilities, currentSummary.vulnerabilities);
        const totalFixed = fixed.length;
        const totalIntroduced = introduced.length;
        const delta = currentSummary.totalVulnerabilities - previous.summary.totalVulnerabilities;
        let summary = `Compared **${repoId}**: baseline ${previous.scannedAt} → current ${scannedAt}. `;
        if (totalFixed > 0) summary += `**${totalFixed}** fixed. `;
        if (totalIntroduced > 0) summary += `**${totalIntroduced}** new or reintroduced. `;
        summary += `Total change: ${delta >= 0 ? '+' : ''}${delta} vulnerability(ies).`;

        return {
            repoId,
            baseline: {
                scannedAt: previous.scannedAt,
                counts: previous.summary.counts,
                totalVulnerabilities: previous.summary.totalVulnerabilities,
            },
            current: currentSnapshot,
            fixed,
            introduced,
            summary,
        };
    }

    /**
     * Diff two vulnerability lists: fixed = in baseline but not in current; introduced = in current but not in baseline.
     * Match by name + severity; id/title used for display only.
     */
    private diffVulnerabilities(baseline: Vulnerability[], current: Vulnerability[]): { fixed: Vulnerability[]; introduced: Vulnerability[] } {
        const key = (v: Vulnerability) => `${v.name}:${v.severity}`;
        const currentSet = new Set(current.map(key));
        const baselineSet = new Set(baseline.map(key));
        const fixed = baseline.filter((v) => !currentSet.has(key(v)));
        const introduced = current.filter((v) => !baselineSet.has(key(v)));
        return { fixed, introduced };
    }
}

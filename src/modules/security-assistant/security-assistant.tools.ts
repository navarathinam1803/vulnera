import { ToolDecorator as Tool, Widget, ExecutionContext, Injectable, z } from '@nitrostack/core';
import { SecurityAssistantService } from './security-assistant.service.js';

const ScanTargetSchema = z.object({
    projectPath: z
        .string()
        .optional()
        .describe('Local path to the project root (Node: package.json; Python: requirements.txt or pyproject.toml). Ignored if githubRepo is set.'),
    githubRepo: z
        .string()
        .optional()
        .describe('GitHub repo to scan: "owner/repo" or full URL. Supports Node.js (package.json) and Python (requirements.txt or pyproject.toml).'),
    ref: z
        .string()
        .optional()
        .describe('Branch, tag, or commit SHA to use when scanning a GitHub repo (e.g. main, v1.0.0). Defaults to default branch.'),
    subpath: z
        .string()
        .optional()
        .describe('Subdirectory inside the repo (e.g. "frontend", "app"). Use when package.json or requirements.txt is not at repo root.'),
});

type ScanTarget = z.infer<typeof ScanTargetSchema>;

async function withResolvedProject<T>(
    security: SecurityAssistantService,
    args: ScanTarget,
    ctx: ExecutionContext,
    fn: (projectPath: string) => T | Promise<T>
): Promise<T> {
    const resolved = await security.resolveProjectRoot({
        projectPath: args.projectPath,
        githubRepo: args.githubRepo,
        ref: args.ref,
        subpath: args.subpath,
    });
    try {
        return await fn(resolved.path);
    } finally {
        resolved.cleanup?.();
    }
}

// Note: Using explicit deps for ESM compatibility
@Injectable({ deps: [SecurityAssistantService] })
export class SecurityAssistantTools {
    constructor(private readonly security: SecurityAssistantService) { }

    @Tool({
        name: 'is_app_safe_to_ship',
        title: 'Is this app safe to ship today?',
        description:
            'Answers whether the application is safe to ship based on dependency vulnerabilities. Scan a local path or a GitHub repo (use githubRepo). Uses a default policy: safe only when there are no critical or high severity issues.',
        inputSchema: ScanTargetSchema,
        examples: {
            request: { githubRepo: 'expressjs/express' },
            response: {
                safeToShip: false,
                reason: 'There are 1 critical and 2 high severity vulnerabilities. Do not ship until these are addressed.',
                critical: 1,
                high: 2,
                moderate: 3,
                low: 1,
                recommendation: 'Use "suggest_upgrades" to get exact upgrade commands, then run them and re-check with "is_app_safe_to_ship".',
            },
        },
        metadata: { category: 'security', tags: ['dependencies', 'ship-readiness', 'github'] },
    })
    @Widget('ship-readiness')
    async isAppSafeToShip(args: ScanTarget, ctx: ExecutionContext) {
        ctx.logger.info('Checking ship readiness', { projectPath: args.projectPath, githubRepo: args.githubRepo });
        return withResolvedProject(this.security, args, ctx, (path) => this.security.getShipReadiness(path));
    }

    @Tool({
        name: 'get_highest_risk_dependency',
        title: 'Which dependency is highest risk this week?',
        description:
            'Identifies the single dependency with the highest risk. Scan a local path or a GitHub repo (use githubRepo). Returns the top vulnerability and full list sorted by severity.',
        inputSchema: ScanTargetSchema,
        examples: {
            request: { githubRepo: 'lodash/lodash' },
            response: {
                highest: {
                    name: 'lodash',
                    severity: 'high',
                    title: 'Prototype Pollution',
                    fixAvailable: '4.17.21',
                },
                summary: 'Highest risk: **lodash** (high). Prototype Pollution. Fix available: 4.17.21.',
                allBySeverity: [],
            },
        },
        metadata: { category: 'security', tags: ['dependencies', 'prioritization', 'github'] },
    })
    @Widget('highest-risk')
    async getHighestRiskDependency(args: ScanTarget, ctx: ExecutionContext) {
        ctx.logger.info('Getting highest risk dependency', { projectPath: args.projectPath, githubRepo: args.githubRepo });
        return withResolvedProject(this.security, args, ctx, (path) => this.security.getHighestRiskDependency(path));
    }

    @Tool({
        name: 'summarize_vulnerabilities',
        title: 'Summarize vulnerabilities in human language',
        description:
            'Translates technical security audit output into plain-language summaries. Scan a local path or a GitHub repo (use githubRepo).',
        inputSchema: ScanTargetSchema,
        examples: {
            request: { githubRepo: 'nodejs/node' },
            response: {
                summary: 'Your project has **5** vulnerability findings. **HIGH** (2): ... **MODERATE** (3): ...',
                bySeverity: { critical: [], high: [], moderate: [], low: [], info: [] },
                total: 5,
            },
        },
        metadata: { category: 'security', tags: ['dependencies', 'summary', 'human-language', 'github'] },
    })
    @Widget('vulnerability-summary')
    async summarizeVulnerabilities(args: ScanTarget, ctx: ExecutionContext) {
        ctx.logger.info('Summarizing vulnerabilities', { projectPath: args.projectPath, githubRepo: args.githubRepo });
        return withResolvedProject(this.security, args, ctx, (path) => this.security.getVulnerabilitiesSummary(path));
    }

    @Tool({
        name: 'suggest_upgrades',
        title: 'Suggest exactly what to upgrade in this codebase',
        description:
            'Returns concrete upgrade steps and exact npm install commands. Scan a local path or a GitHub repo (use githubRepo). Sorted by severity (critical/high first).',
        inputSchema: ScanTargetSchema,
        examples: {
            request: { githubRepo: 'expressjs/express', ref: 'main' },
            response: {
                suggestions: [
                    {
                        package: 'lodash',
                        current: '<4.17.21',
                        target: '4.17.21',
                        severity: 'high',
                        action: 'npm install lodash@4.17.21',
                    },
                ],
                summary: 'Apply these 1 upgrade(s) in order of priority (critical/high first):',
            },
        },
        metadata: { category: 'security', tags: ['dependencies', 'upgrades', 'actionable', 'github'] },
    })
    @Widget('upgrade-suggestions')
    async suggestUpgrades(args: ScanTarget, ctx: ExecutionContext) {
        ctx.logger.info('Getting upgrade suggestions', { projectPath: args.projectPath, githubRepo: args.githubRepo });
        return withResolvedProject(this.security, args, ctx, (path) => this.security.getUpgradeSuggestions(path));
    }

    @Tool({
        name: 'compare_scans_over_time',
        title: 'Compare vulnerability scans over time for a repo',
        description:
            'Runs a scan for the given repo (or local path), saves it, and compares with the previous saved scan. Use the same githubRepo (or projectPath) each time to build history. First run saves a baseline; subsequent runs show what was fixed or introduced.',
        inputSchema: ScanTargetSchema,
        examples: {
            request: { githubRepo: 'owner/repo' },
            response: {
                repoId: 'owner/repo',
                baseline: { scannedAt: '2025-01-01T12:00:00Z', counts: { critical: 1, high: 2, moderate: 0, low: 0, info: 0 }, totalVulnerabilities: 3 },
                current: { scannedAt: '2025-02-01T12:00:00Z', counts: { critical: 0, high: 0, moderate: 1, low: 0, info: 0 }, totalVulnerabilities: 1 },
                fixed: [{ name: 'lodash', severity: 'high', title: 'Prototype Pollution' }],
                introduced: [],
                summary: 'Compared **owner/repo**: **2** fixed. Total change: -2 vulnerability(ies).',
            },
        },
        metadata: { category: 'security', tags: ['dependencies', 'compare', 'trend', 'github'] },
    })
    @Widget('compare-scans')
    async compareScansOverTime(args: ScanTarget, ctx: ExecutionContext) {
        ctx.logger.info('Comparing scans over time', { projectPath: args.projectPath, githubRepo: args.githubRepo });
        const repoId = this.security.getRepoId({
            githubRepo: args.githubRepo,
            ref: args.ref,
            subpath: args.subpath,
            projectPath: args.projectPath,
        });
        return withResolvedProject(this.security, args, ctx, (path) => {
            const summary = this.security.getAuditSummary(path);
            const projectType = this.security.detectProjectType(path) ?? undefined;
            return this.security.compareScansOverTime(repoId, summary, {
                ref: args.ref,
                subpath: args.subpath,
                projectType,
            });
        });
    }

    @Tool({
        name: 'generate_report',
        title: 'Generate a security report',
        description: 'Generate a security report for the given project.',
        inputSchema: ScanTargetSchema,
        examples: {
            request: { githubRepo: 'owner/repo' },
            response: {
                repoId: 'owner/repo',
                baseline: { scannedAt: '2025-01-01T12:00:00Z', counts: { critical: 1, high: 2, moderate: 0, low: 0, info: 0 }, totalVulnerabilities: 3 },
                current: { scannedAt: '2025-02-01T12:00:00Z', counts: { critical: 0, high: 0, moderate: 1, low: 0, info: 0 }, totalVulnerabilities: 1 },
                fixed: [{ name: 'lodash', severity: 'high', title: 'Prototype Pollution' }],
                introduced: [],
                summary: 'Compared **owner/repo**: **2** fixed. Total change: -2 vulnerability(ies).',
            },
        },
        metadata: { category: 'security', tags: ['dependencies', 'compare', 'trend', 'github'] },
    })
    @Widget('security-report')
    async generateReport(args: ScanTarget, ctx: ExecutionContext) {
        ctx.logger.info('Generating report', { projectPath: args.projectPath, githubRepo: args.githubRepo });
        const reportPath = await withResolvedProject(this.security, args, ctx, (path) => this.security.generateReport(path));
        return { reportPath };
    }
}

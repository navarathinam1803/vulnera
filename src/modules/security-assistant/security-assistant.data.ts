/**
 * Security assistant types for dependency scanning and vulnerability reporting.
 * Aligns with npm audit output and CVSS-style severity.
 */

export type SeverityLevel = 'critical' | 'high' | 'moderate' | 'low' | 'info';

export const SEVERITY_ORDER: SeverityLevel[] = ['critical', 'high', 'moderate', 'low', 'info'];

export const SEVERITY_SCORE: Record<SeverityLevel, number> = {
    critical: 100,
    high: 80,
    moderate: 50,
    low: 20,
    info: 5,
};

export interface Vulnerability {
    /** Package name (e.g. "lodash") */
    name: string;
    /** Severity from audit */
    severity: SeverityLevel;
    /** Human-readable title (e.g. "Prototype Pollution") */
    title?: string;
    /** CVE or advisory ID if available */
    id?: string;
    /** Package version range affected (e.g. "<4.17.21") */
    range?: string;
    /** Fixed in version if available */
    fixAvailable?: string | boolean;
    /** Dependency path (e.g. "risklens > lodash") */
    via?: string | string[];
    /** Whether this is a direct dependency */
    isDirect?: boolean;
    /** One-line description */
    description?: string;
}

export interface AuditSummary {
    /** Total counts by severity */
    counts: Record<SeverityLevel, number>;
    /** Total number of vulnerable packages */
    totalVulnerabilities: number;
    /** Whether the project has any critical or high (unsafe to ship by default) */
    hasCriticalOrHigh: boolean;
    /** List of vulnerabilities normalized for tools */
    vulnerabilities: Vulnerability[];
}

export interface ShipReadiness {
    /** Whether it is safe to ship (no critical/high by default) */
    safeToShip: boolean;
    /** Reason in human language */
    reason: string;
    /** Critical count */
    critical: number;
    /** High count */
    high: number;
    /** Moderate count */
    moderate: number;
    /** Low count */
    low: number;
    /** Optional short recommendation */
    recommendation?: string;
}

export interface UpgradeSuggestion {
    /** Package name */
    package: string;
    /** Current version or range */
    current: string;
    /** Target version to upgrade to */
    target: string;
    /** Severity this fixes */
    severity: SeverityLevel;
    /** Human-readable action (e.g. "Run: npm install lodash@4.17.21") */
    action: string;
    /** Whether fix is a semver-compatible update */
    isSemverCompatible?: boolean;
}

/** A single saved scan for a repo (used for compare over time). */
export interface SavedScan {
    id: string;
    /** Repo identifier: "owner/repo", "owner/repo:subpath", or "local:<path>" */
    repoId: string;
    ref?: string;
    subpath?: string;
    /** ISO timestamp when the scan was run */
    scannedAt: string;
    /** Snapshot of audit at that time */
    summary: AuditSummary;
    projectType?: 'node' | 'python';
}

/** Result of comparing two scans (baseline vs current). */
export interface CompareScansResult {
    /** Repo identifier that was compared */
    repoId: string;
    /** Baseline (older) scan */
    baseline: { scannedAt: string; counts: Record<SeverityLevel, number>; totalVulnerabilities: number };
    /** Current (newer) scan */
    current: { scannedAt: string; counts: Record<SeverityLevel, number>; totalVulnerabilities: number };
    /** Vulnerabilities that were in baseline but are no longer in current (fixed) */
    fixed: Vulnerability[];
    /** Vulnerabilities that appear in current but not in baseline (new/regressions) */
    introduced: Vulnerability[];
    /** Human-readable summary */
    summary: string;
    /** Whether this is the first scan (no previous to compare) */
    isFirstScan?: boolean;
}

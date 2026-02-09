'use client';

import { useTheme, useMaxHeight, useWidgetSDK } from '@nitrostack/widgets';
import { GitCompare, CheckCircle2, AlertTriangle, Calendar } from 'lucide-react';
import { SeverityBadge } from '../../components/SeverityBadge';

export const dynamic = 'force-dynamic';

type SeverityLevel = 'critical' | 'high' | 'moderate' | 'low' | 'info';

interface Vulnerability {
    name: string;
    severity: SeverityLevel;
    title?: string;
    id?: string;
    range?: string;
    fixAvailable?: string | boolean;
}

interface ScanSnapshot {
    scannedAt: string;
    counts: Record<SeverityLevel, number>;
    totalVulnerabilities: number;
}

interface WidgetData {
    repoId: string;
    baseline: ScanSnapshot;
    current: ScanSnapshot;
    fixed: Vulnerability[];
    introduced: Vulnerability[];
    summary: string;
    isFirstScan?: boolean;
}

function formatDate(iso: string): string {
    try {
        const d = new Date(iso);
        return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
    } catch {
        return iso;
    }
}

function stripMarkdown(s: string): string {
    return (s ?? '').replace(/\*\*/g, '');
}

export default function CompareScansWidget() {
    const theme = useTheme();
    const maxHeight = useMaxHeight();
    const isDark = theme === 'dark';
    const { isReady, getToolOutput } = useWidgetSDK();
    const data = getToolOutput<WidgetData>();

    const border = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
    const indigo = isDark ? '#7986cb' : '#3949ab';

    if (!data) {
        return (
            <div
                style={{
                    padding: '40px',
                    textAlign: 'center',
                    color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                    background: isDark ? 'rgba(57, 73, 171, 0.12)' : 'rgba(57, 73, 171, 0.06)',
                    minHeight: '200px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    borderRadius: '8px',
                    border: `1px solid ${border}`,
                }}
            >
                <GitCompare size={40} style={{ color: indigo }} />
                <span>Loading compare scans… {isReady ? '(no data yet)' : '(waiting for SDK)'}</span>
            </div>
        );
    }

    const { repoId, baseline, current, fixed, introduced, summary, isFirstScan } = data;
    const delta = current.totalVulnerabilities - baseline.totalVulnerabilities;
    const improved = delta < 0;
    const same = delta === 0 && !isFirstScan;

    return (
        <div
            style={{
                background: isDark ? 'rgba(57, 73, 171, 0.04)' : 'rgba(57, 73, 171, 0.03)',
                minHeight: '280px',
                maxHeight: maxHeight || '600px',
                overflow: 'auto',
                padding: '16px',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '16px',
                    padding: '8px 12px',
                    background: isDark ? 'rgba(57, 73, 171, 0.2)' : 'rgba(57, 73, 171, 0.12)',
                    borderRadius: '8px',
                    width: 'fit-content',
                }}
            >
                <GitCompare size={22} style={{ color: indigo }} />
                <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 500, color: indigo }}>
                    Compare scans over time
                </h1>
            </div>

            <div
                style={{
                    marginBottom: '16px',
                    padding: '10px 14px',
                    background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.04)',
                    borderRadius: '8px',
                    border: `1px solid ${border}`,
                }}
            >
                <div style={{ fontSize: '13px', fontWeight: 600, color: indigo, marginBottom: '4px' }}>{repoId}</div>
                <p style={{ margin: 0, fontSize: '14px', color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)', lineHeight: 1.4 }}>
                    {stripMarkdown(summary)}
                </p>
            </div>

            {/* Timeline: baseline → current */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'stretch',
                    gap: '12px',
                    marginBottom: '20px',
                    flexWrap: 'wrap',
                }}
            >
                <div
                    style={{
                        flex: '1 1 200px',
                        minWidth: 0,
                        padding: '12px 14px',
                        background: isDark ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.04)',
                        border: `1px solid ${border}`,
                        borderRadius: '8px',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <Calendar size={14} style={{ color: isDark ? '#9ca3af' : '#6b7280' }} />
                        <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: isDark ? '#9ca3af' : '#6b7280' }}>
                            Baseline
                        </span>
                    </div>
                    <div style={{ fontSize: '12px', color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)', marginBottom: '6px' }}>
                        {formatDate(baseline.scannedAt)}
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: isDark ? '#fff' : '#111' }}>
                        {baseline.totalVulnerabilities} vulnerability{baseline.totalVulnerabilities !== 1 ? 'ies' : ''}
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', color: isDark ? '#6b7280' : '#9ca3af' }}>→</div>
                <div
                    style={{
                        flex: '1 1 200px',
                        minWidth: 0,
                        padding: '12px 14px',
                        background: isDark ? 'rgba(57, 73, 171, 0.15)' : 'rgba(57, 73, 171, 0.08)',
                        border: `1px solid ${isDark ? 'rgba(121, 134, 203, 0.4)' : 'rgba(57, 73, 171, 0.25)'}`,
                        borderRadius: '8px',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <Calendar size={14} style={{ color: indigo }} />
                        <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: indigo }}>
                            Current
                        </span>
                    </div>
                    <div style={{ fontSize: '12px', color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)', marginBottom: '6px' }}>
                        {formatDate(current.scannedAt)}
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: indigo }}>
                        {current.totalVulnerabilities} vulnerability{current.totalVulnerabilities !== 1 ? 'ies' : ''}
                        {!isFirstScan && (
                            <span
                                style={{
                                    marginLeft: '8px',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    color: improved ? (isDark ? '#81c784' : '#2e7d32') : same ? (isDark ? '#9ca3af' : '#6b7280') : (isDark ? '#ef9a9a' : '#c62828'),
                                }}
                            >
                                ({delta >= 0 ? '+' : ''}{delta})
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {isFirstScan ? (
                <div
                    style={{
                        padding: '16px',
                        background: isDark ? 'rgba(57, 73, 171, 0.15)' : 'rgba(57, 73, 171, 0.08)',
                        border: `1px solid ${isDark ? 'rgba(121, 134, 203, 0.35)' : 'rgba(57, 73, 171, 0.2)'}`,
                        borderRadius: '8px',
                        color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)',
                        fontSize: '14px',
                    }}
                >
                    First scan saved. Run the same tool again after making changes to see what was fixed or introduced.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {fixed.length > 0 && (
                        <section>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    marginBottom: '10px',
                                }}
                            >
                                <CheckCircle2 size={18} style={{ color: isDark ? '#66bb6a' : '#2e7d32' }} />
                                <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: isDark ? '#81c784' : '#2e7d32' }}>
                                    Fixed ({fixed.length})
                                </h2>
                            </div>
                            <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {fixed.map((v, i) => (
                                    <li
                                        key={`fixed-${v.name}-${i}`}
                                        style={{
                                            fontSize: '13px',
                                            color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.85)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            flexWrap: 'wrap',
                                        }}
                                    >
                                        <SeverityBadge severity={v.severity} isDark={isDark} size="sm" />
                                        <span style={{ fontWeight: 500 }}>{v.name}</span>
                                        {v.title && <span style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}>— {v.title}</span>}
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}
                    {introduced.length > 0 && (
                        <section>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    marginBottom: '10px',
                                }}
                            >
                                <AlertTriangle size={18} style={{ color: isDark ? '#ffab91' : '#e65100' }} />
                                <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: isDark ? '#ffab91' : '#e65100' }}>
                                    New or reintroduced ({introduced.length})
                                </h2>
                            </div>
                            <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {introduced.map((v, i) => (
                                    <li
                                        key={`intro-${v.name}-${i}`}
                                        style={{
                                            fontSize: '13px',
                                            color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.85)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            flexWrap: 'wrap',
                                        }}
                                    >
                                        <SeverityBadge severity={v.severity} isDark={isDark} size="sm" />
                                        <span style={{ fontWeight: 500 }}>{v.name}</span>
                                        {v.title && <span style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}>— {v.title}</span>}
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}
                    {fixed.length === 0 && introduced.length === 0 && (
                        <div
                            style={{
                                padding: '14px',
                                background: isDark ? 'rgba(76, 175, 80, 0.1)' : 'rgba(129, 199, 132, 0.15)',
                                border: `1px solid ${isDark ? 'rgba(76, 175, 80, 0.3)' : 'rgba(46, 125, 50, 0.3)'}`,
                                borderRadius: '8px',
                                fontSize: '14px',
                                color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)',
                            }}
                        >
                            No changes in individual vulnerabilities (count may still differ due to deduplication or tool updates).
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

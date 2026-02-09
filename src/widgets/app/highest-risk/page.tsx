'use client';

import { useTheme, useMaxHeight, useWidgetSDK } from '@nitrostack/widgets';
import { AlertTriangle, Package } from 'lucide-react';
import { SeverityBadge } from '../../components/SeverityBadge';

export const dynamic = 'force-dynamic';

interface Vulnerability {
    name: string;
    severity: string;
    title?: string;
    fixAvailable?: string | boolean;
    description?: string;
}

interface WidgetData {
    highest: Vulnerability | null;
    summary: string;
    allBySeverity: Vulnerability[];
}

export default function HighestRiskWidget() {
    const theme = useTheme();
    const maxHeight = useMaxHeight();
    const isDark = theme === 'dark';
    const { isReady, getToolOutput } = useWidgetSDK();
    const data = getToolOutput<WidgetData>();

    const border = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
    const surface = isDark ? '#1e1e1e' : '#fff';

    const orange = isDark ? '#ff9800' : '#e65100';

    if (!data) {
        return (
            <div
                style={{
                    padding: '40px',
                    textAlign: 'center',
                    color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                    background: isDark ? 'rgba(230, 81, 0, 0.12)' : 'rgba(230, 81, 0, 0.06)',
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
                <AlertTriangle size={40} style={{ color: orange }} />
                <span>Loading highest risk… {isReady ? '(no data yet)' : '(waiting for SDK)'}</span>
            </div>
        );
    }

    const { highest, summary, allBySeverity } = data;

    return (
        <div
            style={{
                background: isDark ? 'rgba(230, 81, 0, 0.04)' : 'rgba(230, 81, 0, 0.03)',
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
                    background: isDark ? 'rgba(230, 81, 0, 0.2)' : 'rgba(230, 81, 0, 0.12)',
                    borderRadius: '8px',
                    width: 'fit-content',
                }}
            >
                <AlertTriangle size={22} style={{ color: orange }} />
                <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 500, color: orange }}>
                    Highest risk dependency
                </h1>
            </div>

            {!highest ? (
                <div
                    style={{
                        padding: '20px',
                        background: isDark ? 'rgba(255, 152, 0, 0.1)' : 'rgba(255, 193, 7, 0.12)',
                        border: `1px solid ${isDark ? 'rgba(255, 152, 0, 0.3)' : 'rgba(245, 124, 0, 0.4)'}`,
                        borderRadius: '8px',
                        color: isDark ? 'rgba(255,255,255,0.87)' : 'rgba(0,0,0,0.87)',
                        fontSize: '14px',
                    }}
                >
                    {summary}
                </div>
            ) : (
                <>
                    {/* Top risk card */}
                    <div
                        style={{
                            padding: '16px 20px',
                            background: surface,
                            border: `1px solid ${border}`,
                            borderRadius: '8px',
                            marginBottom: '16px',
                            borderLeft: `4px solid ${highest.severity === 'critical' ? '#c62828' : highest.severity === 'high' ? '#e65100' : '#ef6c00'}`,
                            boxShadow: isDark ? '0 1px 3px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.08)',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                            <Package size={20} style={{ color: isDark ? '#999' : '#6b7280' }} />
                            <span style={{ fontSize: '16px', fontWeight: '700', color: isDark ? '#fff' : '#111' }}>
                                {highest.name}
                            </span>
                            <SeverityBadge
                                severity={highest.severity as 'critical' | 'high' | 'moderate' | 'low' | 'info'}
                                isDark={isDark}
                            />
                        </div>
                        {highest.title && (
                            <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: isDark ? '#ccc' : '#4b5563' }}>
                                {highest.title}
                            </p>
                        )}
                        {highest.fixAvailable && (
                            <p style={{ margin: 0, fontSize: '13px', color: isDark ? '#4caf50' : '#2e7d32' }}>
                                Fix available: {String(highest.fixAvailable)}
                            </p>
                        )}
                    </div>

                    {/* Summary text */}
                    <p
                        style={{
                            margin: '0 0 16px 0',
                            fontSize: '14px',
                            lineHeight: 1.5,
                            color: isDark ? '#d4d4d4' : '#374151',
                            whiteSpace: 'pre-wrap',
                        }}
                    >
                        {summary.replace(/\*\*/g, '')}
                    </p>

                    {/* All by severity list */}
                    {allBySeverity.length > 1 && (
                        <div>
                            <h3
                                style={{
                                    margin: '0 0 10px 0',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    color: isDark ? '#a3a3a3' : '#6b7280',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                }}
                            >
                                All findings ({allBySeverity.length})
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {allBySeverity.slice(0, 10).map((v, i) => (
                                    <div
                                        key={`${v.name}-${i}`}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            padding: '10px 12px',
                                            background: isDark ? 'rgba(255,255,255,0.04)' : '#fafafa',
                                            borderRadius: '4px',
                                            border: `1px solid ${border}`,
                                        }}
                                    >
                                        <SeverityBadge
                                            severity={v.severity as 'critical' | 'high' | 'moderate' | 'low' | 'info'}
                                            size="sm"
                                            isDark={isDark}
                                        />
                                        <span style={{ fontSize: '13px', fontWeight: '500', color: isDark ? '#e5e5e5' : '#111' }}>
                                            {v.name}
                                        </span>
                                        {v.title && (
                                            <span style={{ fontSize: '12px', color: isDark ? '#737373' : '#6b7280' }}>
                                                {v.title}
                                            </span>
                                        )}
                                    </div>
                                ))}
                                {allBySeverity.length > 10 && (
                                    <div style={{ fontSize: '12px', color: isDark ? '#737373' : '#6b7280' }}>
                                        +{allBySeverity.length - 10} more
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

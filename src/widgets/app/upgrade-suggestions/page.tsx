'use client';

import { useTheme, useMaxHeight, useWidgetSDK } from '@nitrostack/widgets';
import { Terminal, Copy, Package } from 'lucide-react';
import { SeverityBadge } from '../../components/SeverityBadge';

export const dynamic = 'force-dynamic';

interface Suggestion {
    package: string;
    current: string;
    target: string;
    severity: string;
    action: string;
}

interface WidgetData {
    suggestions: Suggestion[];
    summary: string;
}

export default function UpgradeSuggestionsWidget() {
    const theme = useTheme();
    const maxHeight = useMaxHeight();
    const isDark = theme === 'dark';
    const { isReady, getToolOutput } = useWidgetSDK();
    const data = getToolOutput<WidgetData>();

    const border = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
    const surface = isDark ? '#1e1e1e' : '#fff';

    const green = isDark ? '#66bb6a' : '#2e7d32';

    if (!data) {
        return (
            <div
                style={{
                    padding: '40px',
                    textAlign: 'center',
                    color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                    background: isDark ? 'rgba(46, 125, 50, 0.15)' : 'rgba(46, 125, 50, 0.06)',
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
                <Terminal size={40} style={{ color: green }} />
                <span>Loading upgrade suggestions… {isReady ? '(no data yet)' : '(waiting for SDK)'}</span>
            </div>
        );
    }

    const { suggestions, summary } = data;

    const copyToClipboard = (text: string) => {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(text);
        }
    };

    return (
        <div
            style={{
                background: isDark ? 'rgba(46, 125, 50, 0.04)' : 'rgba(46, 125, 50, 0.03)',
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
                    background: isDark ? 'rgba(46, 125, 50, 0.2)' : 'rgba(46, 125, 50, 0.12)',
                    borderRadius: '8px',
                    width: 'fit-content',
                }}
            >
                <Terminal size={22} style={{ color: green }} />
                <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 500, color: green }}>
                    Upgrade suggestions
                </h1>
            </div>

            <p
                style={{
                    margin: '0 0 16px 0',
                    fontSize: '14px',
                    color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                    lineHeight: 1.4,
                }}
            >
                {summary}
            </p>

            {suggestions.length === 0 ? (
                <div
                    style={{
                        padding: '20px',
                        background: isDark ? 'rgba(76, 175, 80, 0.1)' : 'rgba(129, 199, 132, 0.2)',
                        border: `1px solid ${isDark ? 'rgba(76, 175, 80, 0.35)' : 'rgba(46, 125, 50, 0.35)'}`,
                        borderRadius: '8px',
                        color: isDark ? 'rgba(255,255,255,0.87)' : 'rgba(0,0,0,0.87)',
                        fontSize: '14px',
                    }}
                >
                    No upgrade commands available from the audit. Try updating packages manually or check for major
                    version upgrades.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {suggestions.map((s, i) => (
                        <div
                            key={`${s.package}-${i}`}
                            style={{
                                padding: '14px 16px',
                                background: surface,
                                border: `1px solid ${border}`,
                                borderRadius: '8px',
                                borderLeft: `4px solid ${
                                    s.severity === 'critical'
                                        ? '#c62828'
                                        : s.severity === 'high'
                                          ? '#e65100'
                                          : '#ef6c00'
                                }`,
                                boxShadow: isDark ? '0 1px 3px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.08)',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    marginBottom: '8px',
                                    flexWrap: 'wrap',
                                }}
                            >
                                <Package size={18} style={{ color: isDark ? '#999' : '#6b7280' }} />
                                <span style={{ fontSize: '15px', fontWeight: '600', color: isDark ? '#fff' : '#111' }}>
                                    {s.package}
                                </span>
                                <SeverityBadge
                                    severity={s.severity as 'critical' | 'high' | 'moderate' | 'low' | 'info'}
                                    isDark={isDark}
                                />
                                <span style={{ fontSize: '12px', color: isDark ? '#737373' : '#6b7280' }}>
                                    {s.current} → {s.target}
                                </span>
                            </div>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    background: isDark ? 'rgba(46, 125, 50, 0.12)' : 'rgba(46, 125, 50, 0.08)',
                                    border: `1px solid ${isDark ? 'rgba(76, 175, 80, 0.35)' : 'rgba(46, 125, 50, 0.3)'}`,
                                    borderRadius: '4px',
                                    padding: '10px 12px',
                                    fontFamily: 'ui-monospace, monospace',
                                    fontSize: '13px',
                                    color: isDark ? '#81c784' : '#2e7d32',
                                }}
                            >
                                <code style={{ flex: 1, overflow: 'auto', wordBreak: 'break-all' }}>{s.action}</code>
                                <button
                                    onClick={() => copyToClipboard(s.action)}
                                    style={{
                                        padding: '6px',
                                        background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                                        border: `1px solid ${border}`,
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                    title="Copy command"
                                >
                                    <Copy size={14} style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

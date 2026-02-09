'use client';

import { ShieldAlert, CheckCircle } from 'lucide-react';

export interface ShipReadinessData {
    safeToShip: boolean;
    reason: string;
    critical: number;
    high: number;
    moderate: number;
    low: number;
    recommendation?: string;
}

const COUNT_PILLS = [
    { label: 'Critical', bg: 'rgba(198, 40, 40, 0.15)', color: '#c62828' },
    { label: 'High', bg: 'rgba(230, 81, 0, 0.15)', color: '#e65100' },
    { label: 'Moderate', bg: 'rgba(249, 168, 37, 0.2)', color: '#f57c00' },
    { label: 'Low', bg: 'rgba(46, 125, 50, 0.15)', color: '#2e7d32' },
] as const;

interface ShipReadinessCardProps {
    data: ShipReadinessData;
    isDark?: boolean;
}

export function ShipReadinessCard({ data, isDark }: ShipReadinessCardProps) {
    const { safeToShip, reason, critical, high, moderate, low, recommendation } = data;
    const values = [critical, high, moderate, low];
    const surface = isDark ? '#1e1e1e' : '#ffffff';
    const border = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
    const successMuted = isDark ? 'rgba(46, 125, 50, 0.25)' : 'rgba(46, 125, 50, 0.14)';
    const errorMuted = isDark ? 'rgba(211, 47, 47, 0.25)' : 'rgba(211, 47, 47, 0.14)';

    return (
        <div
            style={{
                background: surface,
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: isDark ? '0 2px 4px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.08)',
                border: `1px solid ${border}`,
            }}
        >
            {/* Header */}
            <div
                style={{
                    padding: '16px 20px',
                    background: safeToShip ? successMuted : errorMuted,
                    borderBottom: `1px solid ${border}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                }}
            >
                {safeToShip ? (
                    <CheckCircle size={24} style={{ color: isDark ? '#4caf50' : '#2e7d32', flexShrink: 0 }} />
                ) : (
                    <ShieldAlert size={24} style={{ color: isDark ? '#ef5350' : '#c62828', flexShrink: 0 }} />
                )}
                <div>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 500, color: isDark ? 'rgba(255,255,255,0.87)' : 'rgba(0,0,0,0.87)' }}>
                        {safeToShip ? 'Safe to ship' : 'Not safe to ship'}
                    </h2>
                    <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}>
                        Dependency security check
                    </p>
                </div>
            </div>

            {/* Reason */}
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${border}` }}>
                <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.5, color: isDark ? 'rgba(255,255,255,0.87)' : 'rgba(0,0,0,0.87)' }}>
                    {reason}
                </p>
            </div>

            {/* Counts */}
            <div
                style={{
                    padding: '12px 20px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '10px',
                    background: isDark ? 'rgba(255,255,255,0.04)' : '#fafafa',
                }}
            >
                {COUNT_PILLS.map((pill, i) => (
                    <div
                        key={pill.label}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            background: pill.bg,
                            borderRadius: '4px',
                            border: `1px solid ${pill.color}33`,
                        }}
                    >
                        <span style={{ fontSize: '12px', color: pill.color, fontWeight: 500 }}>{pill.label}</span>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: pill.color }}>{values[i]}</span>
                    </div>
                ))}
            </div>

            {recommendation && (
                <div
                    style={{
                        padding: '12px 20px',
                        background: isDark ? 'rgba(103, 58, 183, 0.2)' : 'rgba(103, 58, 183, 0.1)',
                        borderTop: `1px solid ${border}`,
                    }}
                >
                    <p style={{ margin: 0, fontSize: '13px', color: isDark ? '#b39ddb' : '#5e35b1' }}>
                        💡 {recommendation}
                    </p>
                </div>
            )}
        </div>
    );
}

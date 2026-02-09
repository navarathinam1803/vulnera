'use client';

import { useTheme, useMaxHeight, useWidgetSDK } from '@nitrostack/widgets';
import { Shield } from 'lucide-react';
import { ShipReadinessCard } from '../../components/ShipReadinessCard';

export const dynamic = 'force-dynamic';

interface WidgetData {
    safeToShip: boolean;
    reason: string;
    critical: number;
    high: number;
    moderate: number;
    low: number;
    recommendation?: string;
}

export default function ShipReadinessWidget() {
    const theme = useTheme();
    const maxHeight = useMaxHeight();
    const isDark = theme === 'dark';
    const { isReady, getToolOutput } = useWidgetSDK();
    const data = getToolOutput<WidgetData>();

    const border = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
    const cyan = isDark ? '#4dd0e1' : '#0097a7';

    if (!data) {
        return (
            <div
                style={{
                    padding: '40px',
                    textAlign: 'center',
                    color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                    background: isDark ? 'rgba(0, 151, 167, 0.12)' : 'rgba(0, 151, 167, 0.06)',
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
                <Shield size={40} style={{ color: cyan }} />
                <span>Loading ship readiness… {isReady ? '(no data yet)' : '(waiting for SDK)'}</span>
            </div>
        );
    }

    return (
        <div
            style={{
                background: isDark ? 'rgba(0, 151, 167, 0.06)' : 'rgba(0, 151, 167, 0.04)',
                minHeight: '280px',
                maxHeight: maxHeight || '500px',
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
                    background: isDark ? 'rgba(0, 151, 167, 0.2)' : 'rgba(0, 151, 167, 0.12)',
                    borderRadius: '8px',
                    width: 'fit-content',
                }}
            >
                <Shield size={22} style={{ color: cyan }} />
                <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 500, color: cyan }}>
                    Ship readiness
                </h1>
            </div>
            <ShipReadinessCard data={data} isDark={isDark} />
        </div>
    );
}

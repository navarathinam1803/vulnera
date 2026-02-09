'use client';

type Severity = 'critical' | 'high' | 'moderate' | 'low' | 'info';

/** Material-style chips with clear severity colors (flat, no gradient) */
const SEVERITY_STYLES: Record<Severity, { bg: string; text: string }> = {
    critical: { bg: '#c62828', text: '#fff' },
    high: { bg: '#e65100', text: '#fff' },
    moderate: { bg: '#f9a825', text: '#1a1a1a' },
    low: { bg: '#2e7d32', text: '#fff' },
    info: { bg: '#7b1fa2', text: '#fff' },
};

const SEVERITY_STYLES_DARK: Record<Severity, { bg: string; text: string }> = {
    critical: { bg: '#d32f2f', text: '#fff' },
    high: { bg: '#ff6f00', text: '#fff' },
    moderate: { bg: '#ffb300', text: '#1a1a1a' },
    low: { bg: '#388e3c', text: '#fff' },
    info: { bg: '#ab47bc', text: '#fff' },
};

interface SeverityBadgeProps {
    severity: Severity;
    label?: string;
    isDark?: boolean;
    size?: 'sm' | 'md';
}

export function SeverityBadge({ severity, label, isDark, size = 'md' }: SeverityBadgeProps) {
    const s = (isDark ? SEVERITY_STYLES_DARK : SEVERITY_STYLES)[severity] ?? (isDark ? SEVERITY_STYLES_DARK : SEVERITY_STYLES).info;
    const text = label ?? severity;
    const fontSize = size === 'sm' ? '11px' : '12px';
    const padding = size === 'sm' ? '2px 6px' : '4px 8px';

    return (
        <span
            style={{
                display: 'inline-block',
                background: s.bg,
                color: s.text,
                borderRadius: '4px',
                fontSize,
                fontWeight: 500,
                padding,
                textTransform: 'capitalize',
            }}
        >
            {text}
        </span>
    );
}

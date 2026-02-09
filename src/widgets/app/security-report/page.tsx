'use client';

import { useTheme, useMaxHeight, useWidgetSDK } from '@nitrostack/widgets';
import { FileText, Download, CheckCircle, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';

export const dynamic = 'force-dynamic';

export default function SecurityReportWidget() {
    const theme = useTheme();
    const maxHeight = useMaxHeight();
    const isDark = theme === 'dark';
    const { isReady, getToolOutput } = useWidgetSDK();
    const toolOutput = getToolOutput<{ reportPath: string }>();
    const reportPath = toolOutput?.reportPath;

    // We can't actually "download" a local file path from the browser easily 
    // without a server endpoint to serve it, but we can display it.
    // In a real app, we'd have a route to serve this file.
    // For now, we'll just show the path and a success message.

    const border = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
    const surface = isDark ? '#1e1e1e' : '#fff';
    const green = isDark ? '#66bb6a' : '#2e7d32';
    const textPrimary = isDark ? '#fff' : '#111';
    const textSecondary = isDark ? '#ccc' : '#666';

    if (!isReady) {
        return (
            <div
                style={{
                    padding: '40px',
                    textAlign: 'center',
                    color: textSecondary,
                    minHeight: '200px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                }}
            >
                <div>Waiting for report generation...</div>
            </div>
        );
    }

    if (!reportPath) {
        return (
            <div
                style={{
                    padding: '40px',
                    textAlign: 'center',
                    color: textSecondary,
                    minHeight: '200px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                }}
            >
                <AlertTriangle size={32} style={{ opacity: 0.5 }} />
                <div>No report generated yet. Run the `generate_report` tool.</div>
            </div>
        );
    }

    // Handle error response (which might be an object with a message)
    if (typeof reportPath === 'object' && reportPath !== null) {
        const errorMsg = (reportPath as any).message || JSON.stringify(reportPath);
        return (
            <div
                style={{
                    padding: '40px',
                    textAlign: 'center',
                    color: isDark ? '#ef5350' : '#d32f2f',
                    minHeight: '200px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                }}
            >
                <AlertTriangle size={32} />
                <div>Error generating report: {errorMsg}</div>
            </div>
        );
    }

    return (
        <div
            style={{
                background: isDark ? 'rgba(0,0,0,0.2)' : '#f5f5f5',
                minHeight: '200px',
                maxHeight: maxHeight || '600px',
                overflow: 'auto',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <div
                style={{
                    background: surface,
                    border: `1px solid ${border}`,
                    borderRadius: '12px',
                    padding: '32px',
                    maxWidth: '480px',
                    width: '100%',
                    textAlign: 'center',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                }}
            >
                <div
                    style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        background: isDark ? 'rgba(102, 187, 106, 0.1)' : 'rgba(46, 125, 50, 0.1)',
                        color: green,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 20px auto'
                    }}
                >
                    <CheckCircle size={32} />
                </div>

                <h2 style={{ margin: '0 0 12px 0', fontSize: '20px', color: textPrimary }}>
                    Report Generated Successfully
                </h2>

                <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: textSecondary, lineHeight: 1.5 }}>
                    The security audit report has been generated and saved to your local project directory.
                </p>

                <div
                    style={{
                        background: isDark ? 'rgba(255,255,255,0.05)' : '#f0f0f0',
                        padding: '16px',
                        borderRadius: '8px',
                        marginBottom: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        textAlign: 'left'
                    }}
                >
                    <FileText size={20} style={{ color: textSecondary, flexShrink: 0 }} />
                    <code style={{
                        fontSize: '13px',
                        fontFamily: 'monospace',
                        wordBreak: 'break-all',
                        color: textPrimary
                    }}>
                        {reportPath as string}
                    </code>
                </div>

                <div style={{ fontSize: '12px', color: textSecondary, fontStyle: 'italic' }}>
                    Note: This is a local file path. Please open it using your system's file explorer.
                </div>
            </div>
        </div>
    );
}

'use client';

import { WidgetLayout } from '@nitrostack/widgets';
import 'mapbox-gl/dist/mapbox-gl.css';

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body
                style={{
                    margin: 0,
                    padding: 0,
                    fontFamily: "Roboto, system-ui, -apple-system, sans-serif",
                    background: '#fafafa',
                    minHeight: '100vh',
                    color: 'rgba(0,0,0,0.87)',
                }}
            >
                <style>{`
                    @media (prefers-color-scheme: dark) {
                        body { background: #121212; color: rgba(255,255,255,0.87); }
                    }
                `}</style>
                <WidgetLayout>{children}</WidgetLayout>
            </body>
        </html>
    );
}

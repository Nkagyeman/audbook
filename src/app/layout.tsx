import type { Metadata } from 'next';
import './globals.css';
import { ReaderProvider } from '@/context/ReaderContext';
import ThemeWrapper from '@/components/ThemeWrapper';

export const metadata: Metadata = {
  title: 'Audbook — Immersive Read-Along & AI Voice Reader',
  description: 'Distraction-free e-reader with synchronized voice narration, real-time word highlighting, multi-format parsing, and offline persistence.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col antialiased selection:bg-blue-100 selection:text-blue-900">
        <ReaderProvider>
          <ThemeWrapper>{children}</ThemeWrapper>
        </ReaderProvider>
      </body>
    </html>
  );
}

'use client';

import React, { useEffect, Suspense } from 'react';
import { useReader } from '@/context/ReaderContext';
import MiniReaderDock from './MiniReaderDock';

export default function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const { settings } = useReader();

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', settings.theme);
    }
  }, [settings.theme]);

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-200">
      {children}
      <Suspense fallback={null}>
        <MiniReaderDock />
      </Suspense>
    </div>
  );
}

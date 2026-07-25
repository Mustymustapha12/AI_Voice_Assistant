'use client';

import type { PropsWithChildren } from 'react';

import { QueryProvider } from './query-provider';
import { ThemeProvider } from './theme-provider';

export function ApplicationProviders({ children }: PropsWithChildren): React.JSX.Element {
  return (
    <ThemeProvider>
      <QueryProvider>{children}</QueryProvider>
    </ThemeProvider>
  );
}

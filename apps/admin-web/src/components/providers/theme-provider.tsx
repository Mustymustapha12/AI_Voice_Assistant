'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { PropsWithChildren } from 'react';

export function ThemeProvider({ children }: PropsWithChildren): React.JSX.Element {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      disableTransitionOnChange
      enableSystem
    >
      {children}
    </NextThemesProvider>
  );
}

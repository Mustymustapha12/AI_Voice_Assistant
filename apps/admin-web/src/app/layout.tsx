import type { Metadata } from 'next';
import type { PropsWithChildren } from 'react';

import { ApplicationProviders } from '@/components/providers/application-providers';

import './globals.css';

export const metadata: Metadata = {
  description: 'Enterprise administration for the AI Voice Commerce Platform.',
  title: {
    default: 'AI Voice Commerce',
    template: '%s | AI Voice Commerce',
  },
};

export default function RootLayout({ children }: PropsWithChildren): React.JSX.Element {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background min-h-screen font-sans antialiased">
        <ApplicationProviders>{children}</ApplicationProviders>
      </body>
    </html>
  );
}

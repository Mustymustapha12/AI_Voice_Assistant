import * as React from 'react';

import { cn } from '@/lib/utils';

export function Input({
  className,
  type,
  ...properties
}: React.ComponentProps<'input'>): React.JSX.Element {
  return (
    <input
      className={cn(
        'border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50',
        className,
      )}
      type={type}
      {...properties}
    />
  );
}

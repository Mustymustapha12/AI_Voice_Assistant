import * as React from 'react';

import { cn } from '@/lib/utils';

export function Card({ className, ...properties }: React.ComponentProps<'div'>): React.JSX.Element {
  return (
    <div
      className={cn(
        'border-border/70 bg-card text-card-foreground rounded-xl border shadow-sm',
        className,
      )}
      {...properties}
    />
  );
}

export function CardHeader({
  className,
  ...properties
}: React.ComponentProps<'div'>): React.JSX.Element {
  return <div className={cn('space-y-1.5 p-6', className)} {...properties} />;
}

export function CardTitle({
  children,
  className,
  ...properties
}: React.ComponentProps<'h2'>): React.JSX.Element {
  return (
    <h2 className={cn('text-lg font-semibold tracking-tight', className)} {...properties}>
      {children}
    </h2>
  );
}

export function CardDescription({
  className,
  ...properties
}: React.ComponentProps<'p'>): React.JSX.Element {
  return <p className={cn('text-muted-foreground text-sm', className)} {...properties} />;
}

export function CardContent({
  className,
  ...properties
}: React.ComponentProps<'div'>): React.JSX.Element {
  return <div className={cn('p-6 pt-0', className)} {...properties} />;
}

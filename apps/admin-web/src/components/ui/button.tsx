import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    defaultVariants: {
      size: 'default',
      variant: 'default',
    },
    variants: {
      size: {
        default: 'h-10 px-4 py-2',
        icon: 'size-10',
        lg: 'h-11 px-8',
        sm: 'h-9 px-3',
      },
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
      },
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  readonly asChild?: boolean;
}

export function Button({
  asChild = false,
  className,
  size,
  variant,
  ...properties
}: ButtonProps): React.JSX.Element {
  const Component = asChild ? Slot : 'button';
  return <Component className={cn(buttonVariants({ className, size, variant }))} {...properties} />;
}

export { buttonVariants };

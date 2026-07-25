import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from 'next-themes';
import { describe, expect, it } from 'vitest';

import { ThemeToggle } from './theme-toggle';

describe('ThemeToggle', () => {
  it('offers an accessible theme control', () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="system">
        <ThemeToggle />
      </ThemeProvider>,
    );

    const button = screen.getByRole('button', { name: /Theme:/u });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(button).toHaveAccessibleName(/Switch to/u);
  });
});

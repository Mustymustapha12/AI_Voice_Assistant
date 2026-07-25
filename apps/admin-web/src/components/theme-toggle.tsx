'use client';

import { Laptop, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';

const themes = ['light', 'dark', 'system'] as const;
type Theme = (typeof themes)[number];

const themeIcon: Record<Theme, React.JSX.Element> = {
  dark: <Moon aria-hidden="true" className="size-4" />,
  light: <Sun aria-hidden="true" className="size-4" />,
  system: <Laptop aria-hidden="true" className="size-4" />,
};

function isTheme(value: string | undefined): value is Theme {
  return value !== undefined && themes.includes(value as Theme);
}

export function ThemeToggle(): React.JSX.Element {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const currentTheme = isTheme(theme) ? theme : 'system';
  const nextTheme = themes[(themes.indexOf(currentTheme) + 1) % themes.length] ?? 'system';

  return (
    <Button
      aria-label={`Theme: ${currentTheme}. Switch to ${nextTheme}.`}
      disabled={!mounted}
      onClick={() => setTheme(nextTheme)}
      size="icon"
      type="button"
      variant="outline"
    >
      {themeIcon[currentTheme]}
    </Button>
  );
}

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, type PropsWithChildren } from 'react';

import { useAuth } from '@/components/providers/auth-provider';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';

export default function DashboardLayout({ children }: PropsWithChildren): React.JSX.Element {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (auth.status === 'anonymous') {
      router.replace('/login');
    } else if (auth.user?.mustChangePassword === true) {
      router.replace('/change-password');
    }
  }, [auth.status, auth.user?.mustChangePassword, router]);

  if (auth.status !== 'authenticated' || auth.user === null) {
    return <main className="p-8 text-sm">Restoring secure session…</main>;
  }

  return (
    <div className="min-h-screen">
      <header className="bg-card border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between p-4">
          <Link className="font-semibold" href="/dashboard">
            AI Voice Commerce
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm sm:inline">{auth.user.displayName}</span>
            <ThemeToggle />
            <Button onClick={() => void auth.logout()} size="sm" variant="outline">
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-8 p-6 md:grid-cols-[13rem_1fr]">
        <nav className="space-y-2 text-sm">
          <Link className="hover:bg-accent block rounded-md px-3 py-2" href="/dashboard">
            Overview
          </Link>
          <Link className="hover:bg-accent block rounded-md px-3 py-2" href="/dashboard/sessions">
            Sessions
          </Link>
          {auth.user.role === 'SUPER_ADMIN' ? (
            <Link className="hover:bg-accent block rounded-md px-3 py-2" href="/dashboard/admins">
              Administrators
            </Link>
          ) : null}
        </nav>
        <main>{children}</main>
      </div>
    </div>
  );
}

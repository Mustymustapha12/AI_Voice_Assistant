'use client';

import { useAuth } from '@/components/providers/auth-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardPage(): React.JSX.Element {
  const { user } = useAuth();
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Platform overview</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Authenticated as {user?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Foundation ready</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          Company configuration and commerce capabilities remain intentionally out of scope.
        </CardContent>
      </Card>
    </section>
  );
}

'use client';

// eslint-disable-next-line import-x/no-internal-modules -- official React Hook Form Zod adapter entrypoint.
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiRequest, type AuthenticatedUser } from '@/lib/api-client';

const schema = z.object({ displayName: z.string().min(2).max(120), email: z.email() });
type AdminInput = z.infer<typeof schema>;

export default function AdminsPage(): React.JSX.Element {
  const { user } = useAuth();
  const client = useQueryClient();
  const form = useForm<AdminInput>({ resolver: zodResolver(schema) });
  const admins = useQuery({
    enabled: user?.role === 'SUPER_ADMIN',
    queryFn: () => apiRequest<readonly AuthenticatedUser[]>('/platform/admins'),
    queryKey: ['admins'],
  });
  const createAdmin = useMutation({
    mutationFn: (input: AdminInput) =>
      apiRequest<AuthenticatedUser>('/platform/admins', {
        body: JSON.stringify(input),
        method: 'POST',
      }),
    onSuccess: async () => {
      form.reset();
      await client.invalidateQueries({ queryKey: ['admins'] });
    },
  });
  const removeAdmin = useMutation({
    mutationFn: (id: string) => apiRequest<void>(`/platform/admins/${id}`, { method: 'DELETE' }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['admins'] }),
  });

  if (user?.role !== 'SUPER_ADMIN') {
    return <p className="text-sm text-red-600">Only a Super Admin can manage administrators.</p>;
  }
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Administrators</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Invite or remove platform Admin accounts.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invite Admin</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
            onSubmit={(event) =>
              void form.handleSubmit(async (input) => createAdmin.mutateAsync(input))(event)
            }
          >
            <Input
              aria-label="Display name"
              placeholder="Display name"
              {...form.register('displayName')}
            />
            <Input
              aria-label="Email"
              placeholder="admin@example.com"
              type="email"
              {...form.register('email')}
            />
            <Button disabled={createAdmin.isPending} type="submit">
              Send invitation
            </Button>
          </form>
        </CardContent>
      </Card>
      {(admins.data ?? []).map((admin) => (
        <Card key={admin.id}>
          <CardContent className="flex items-center justify-between gap-4 pt-6">
            <div>
              <p className="font-medium">{admin.displayName}</p>
              <p className="text-muted-foreground text-sm">
                {admin.email} · {admin.status}
              </p>
            </div>
            <Button
              disabled={removeAdmin.isPending}
              onClick={() => removeAdmin.mutate(admin.id)}
              size="sm"
              variant="outline"
            >
              Remove
            </Button>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

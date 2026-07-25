'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiRequest } from '@/lib/api-client';

interface Session {
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly id: string;
  readonly ipAddress: string | null;
  readonly lastUsedAt: string;
  readonly revokedAt: string | null;
  readonly userAgent: string | null;
}

export default function SessionsPage(): React.JSX.Element {
  const client = useQueryClient();
  const sessions = useQuery({
    queryFn: () => apiRequest<readonly Session[]>('/auth/sessions'),
    queryKey: ['sessions'],
  });
  const revoke = useMutation({
    mutationFn: (id: string) => apiRequest<void>(`/auth/sessions/${id}`, { method: 'DELETE' }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['sessions'] }),
  });
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Sessions</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Review and revoke your signed-in devices.
        </p>
      </div>
      {(sessions.data ?? []).map((session) => (
        <Card key={session.id}>
          <CardHeader>
            <CardTitle className="text-base">{session.userAgent ?? 'Unknown device'}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4 text-sm">
            <span className="text-muted-foreground">
              {session.ipAddress ?? 'Unknown IP'} · {new Date(session.lastUsedAt).toLocaleString()}
            </span>
            <Button
              disabled={session.revokedAt !== null || revoke.isPending}
              onClick={() => revoke.mutate(session.id)}
              size="sm"
              variant="outline"
            >
              {session.revokedAt === null ? 'Revoke' : 'Revoked'}
            </Button>
          </CardContent>
        </Card>
      ))}
      {sessions.isLoading ? <p className="text-sm">Loading sessions…</p> : null}
    </section>
  );
}

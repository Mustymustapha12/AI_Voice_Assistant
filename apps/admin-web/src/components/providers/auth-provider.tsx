'use client';

import { useRouter } from 'next/navigation';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  apiRequest,
  clearAccessToken,
  type AuthenticatedUser,
  login as requestLogin,
  refreshAuthentication,
} from '@/lib/api-client';

interface AuthContextValue {
  readonly login: (email: string, password: string) => Promise<void>;
  readonly logout: () => Promise<void>;
  readonly status: 'loading' | 'authenticated' | 'anonymous';
  readonly user: AuthenticatedUser | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren): React.JSX.Element {
  const router = useRouter();
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [status, setStatus] = useState<AuthContextValue['status']>('loading');

  useEffect(() => {
    void refreshAuthentication()
      .then((result) => {
        setUser(result.user);
        setStatus('authenticated');
      })
      .catch(() => {
        clearAccessToken();
        setStatus('anonymous');
      });
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    const result = await requestLogin(email, password);
    setUser(result.user);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await apiRequest<void>('/auth/logout', { method: 'POST' });
    } finally {
      clearAccessToken();
      setUser(null);
      setStatus('anonymous');
      router.replace('/login');
    }
  }, [router]);

  const value = useMemo(() => ({ login, logout, status, user }), [login, logout, status, user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }
  return context;
}

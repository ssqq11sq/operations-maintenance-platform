import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { GlobalRole } from '@omp/shared';
import api from './api';

export type AuthUser = {
  id: number;
  username: string;
  displayName: string;
  phone?: string;
  currentTeamId?: number | null;
  roles: { code: GlobalRole; name: string }[];
};

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  loginWithToken: (accessToken: string, user: AuthUser) => void;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
  hasRole: (...roles: GlobalRole[]) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function loadUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem('omp_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('omp_token'),
  );
  const [user, setUserState] = useState<AuthUser | null>(loadUser);

  const setUser = useCallback((u: AuthUser | null) => {
    setUserState(u);
    if (u) localStorage.setItem('omp_user', JSON.stringify(u));
    else localStorage.removeItem('omp_user');
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      const { data } = await api.post('/auth/login', { username, password });
      localStorage.setItem('omp_token', data.accessToken);
      setToken(data.accessToken);
      setUser(data.user);
    },
    [setUser],
  );

  const loginWithToken = useCallback(
    (accessToken: string, nextUser: AuthUser) => {
      localStorage.setItem('omp_token', accessToken);
      setToken(accessToken);
      setUser(nextUser);
    },
    [setUser],
  );

  const logout = useCallback(() => {
    localStorage.removeItem('omp_token');
    localStorage.removeItem('omp_user');
    setToken(null);
    setUser(null);
  }, [setUser]);

  const refreshProfile = useCallback(async () => {
    const { data } = await api.get('/auth/profile');
    setUser(data);
  }, [setUser]);

  const hasRole = useCallback(
    (...roles: GlobalRole[]) => {
      const codes = (user?.roles || []).map((r) => r.code);
      if (codes.includes(GlobalRole.SUPER_ADMIN)) return true;
      return roles.some((r) => codes.includes(r));
    },
    [user],
  );

  const value = useMemo(
    () => ({
      user,
      token,
      login,
      loginWithToken,
      logout,
      refreshProfile,
      setUser,
      hasRole,
    }),
    [user, token, login, loginWithToken, logout, refreshProfile, setUser, hasRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

//TODO: add unique jwt for using ID
'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import toast from "react-hot-toast";

interface Session {
  isLoggedIn: boolean;
  token: string | null;
  roles: string[] | null;
}

export interface SessionContextType {
  session: Session;
  login: (token: string, roles: string[]) => void;
  logout: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>({
    isLoggedIn: false,
    token: null,
    roles: null,
  });

  useEffect(() => {
    const token = localStorage.getItem('jwt');
    const rolesStr = localStorage.getItem('userRoles');
    
    if (token) {
      const roles = rolesStr ? JSON.parse(rolesStr) : null;
      setSession({ isLoggedIn: true, token, roles });
    }

    const handleLogoutEvent = () => logout();
    window.addEventListener("logout", handleLogoutEvent);

    return () => {
      window.removeEventListener("logout", handleLogoutEvent);
    };
  }, []);

  const login = (token: string, roles: string[]) => {
    localStorage.setItem('jwt', token);
    localStorage.setItem('userRoles', JSON.stringify(roles));
    setSession({ isLoggedIn: true, token, roles });
  };

  const logout = () => {
    localStorage.removeItem('jwt');
    localStorage.removeItem('userRoles');
    setSession({ isLoggedIn: false, token: null, roles: null });
    window.location.href = "/";
    toast.success('Log out successful!');
  };

  return (
    <SessionContext.Provider value={{ session, login, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
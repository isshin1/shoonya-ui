//TODO: add unique jwt for using ID
'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from "@/components/ui/use-toast"
import { API_BASE_URL } from "@/utils/env"


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

    const { toast } = useToast()

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
    const logout = async () => {
    try {
      const token = localStorage.getItem('jwt');
      
      if (token) {
        // Call backend to invalidate the token
        const response = await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          console.warn('Logout API call failed, but proceeding with local cleanup');
        } else {
          const result = await response.json();
          console.log('Backend logout response:', result.message);
        }
      }

      // Always clean up local storage and session regardless of API call result
      localStorage.removeItem('jwt');
      localStorage.removeItem('userRoles');
      setSession({ isLoggedIn: false, token: null, roles: null });
      
      console.log('JWT deleted and session cleared');
      
      toast({
        title: "Logged Out",
        description: "You have been logged out successfully."
      });
      
      window.location.href = "/";
      
    } catch (error) {
      // Even if the API call fails, we should still clear local storage
      localStorage.removeItem('jwt');
      localStorage.removeItem('userRoles');
      setSession({ isLoggedIn: false, token: null, roles: null });
      
      console.error('Logout error:', error);
      
      toast({
        title: "Logged Out",
        description: "You have been logged out successfully."
      });
      
      window.location.href = "/";
    }
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
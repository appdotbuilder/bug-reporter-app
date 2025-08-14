import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { LoginPage } from '@/components/LoginPage';
import { UserDashboard } from '@/components/UserDashboard';
import { AdminDashboard } from '@/components/AdminDashboard';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import type { User, AuthResponse } from '../../server/src/schema';

function App() {
  const [currentUser, setCurrentUser] = useState<Omit<User, 'password_hash'> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  // Check for existing auth token
  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    if (storedToken) {
      setToken(storedToken);
      getCurrentUser(storedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const getCurrentUser = useCallback(async (authToken: string) => {
    try {
      const user = await trpc.auth.getCurrentUser.query(authToken);
      setCurrentUser(user);
      setToken(authToken);
    } catch (error) {
      console.error('Failed to get current user:', error);
      localStorage.removeItem('auth_token');
      setToken(null);
      setCurrentUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLogin = async (username: string, password: string, remember: boolean) => {
    try {
      const response: AuthResponse = await trpc.auth.login.mutate({
        username,
        password,
        remember
      });
      
      setCurrentUser(response.user);
      setToken(response.token);
      
      if (remember) {
        localStorage.setItem('auth_token', response.token);
      } else {
        sessionStorage.setItem('auth_token', response.token);
      }
      
      toast.success('Login berhasil!');
    } catch (error) {
      console.error('Login failed:', error);
      toast.error('Username atau password salah');
      throw error;
    }
  };

  const handleLogout = async () => {
    try {
      if (token) {
        await trpc.auth.logout.mutate(token);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setCurrentUser(null);
      setToken(null);
      localStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_token');
      toast.success('Logout berhasil!');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="animate-pulse text-primary-blue">
          <div className="w-8 h-8 bg-blue-500 rounded-full animate-bounce"></div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <>
        <LoginPage onLogin={handleLogin} />
        <Toaster position="top-right" />
      </>
    );
  }

  return (
    <>
      {currentUser.role === 'admin' ? (
        <AdminDashboard user={currentUser} onLogout={handleLogout} />
      ) : (
        <UserDashboard user={currentUser} onLogout={handleLogout} />
      )}
      <Toaster position="top-right" />
    </>
  );
}

export default App;
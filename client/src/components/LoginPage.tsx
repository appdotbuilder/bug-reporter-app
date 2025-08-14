import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface LoginPageProps {
  onLogin: (role: string) => Promise<void>;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleLogin = async (role: string) => {
    setIsLoading(true);
    
    try {
      await onLogin(role);
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="text-3xl">🐛</span>
            <h1 className="text-3xl font-bold text-blue-900">Bug Reporter</h1>
          </div>
          <p className="text-neutral-600">Masuk ke akun Anda</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-center text-xl">Masuk</CardTitle>
            <CardDescription className="text-center">
              Pilih peran untuk masuk ke aplikasi
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={() => handleRoleLogin('user')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Memproses...
                </div>
              ) : (
                'Masuk sebagai User'
              )}
            </Button>

            <Button
              onClick={() => handleRoleLogin('admin')}
              className="w-full bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-medium py-3"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-neutral-600 border-t-transparent rounded-full animate-spin"></div>
                  Memproses...
                </div>
              ) : (
                'Masuk sebagai Admin'
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="text-center mt-6 text-sm text-neutral-600">
          <p>© 2024 Bug Reporter. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
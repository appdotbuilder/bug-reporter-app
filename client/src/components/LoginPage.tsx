import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface LoginPageProps {
  onLogin: (username: string, password: string, remember: boolean) => Promise<void>;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; password?: string; general?: string }>({});

  const validateForm = () => {
    const newErrors: typeof errors = {};
    
    if (!username.trim()) {
      newErrors.username = 'Field ini wajib diisi';
    }
    
    if (!password.trim()) {
      newErrors.password = 'Field ini wajib diisi';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      await onLogin(username, password, remember);
    } catch (error) {
      setErrors({ general: 'Username atau password salah' });
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
              Silakan masukkan kredensial Anda
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                  className={errors.username ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : ''}
                  disabled={isLoading}
                />
                {errors.username && (
                  <p className="text-sm text-red-600">{errors.username}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  className={errors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : ''}
                  disabled={isLoading}
                />
                {errors.password && (
                  <p className="text-sm text-red-600">{errors.password}</p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={remember}
                  onCheckedChange={(checked: boolean) => setRemember(checked)}
                  disabled={isLoading}
                />
                <Label htmlFor="remember" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Ingat saya
                </Label>
              </div>

              {errors.general && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-600">{errors.general}</p>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Memproses...
                  </div>
                ) : (
                  'Masuk'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center mt-6 text-sm text-neutral-600">
          <p>© 2024 Bug Reporter. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
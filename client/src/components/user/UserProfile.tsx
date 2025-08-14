import { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { User as UserIcon, Mail, Shield, Upload, Lock } from 'lucide-react';
import { toast } from 'sonner';
import type { User, UpdateUserInput, ChangePasswordInput } from '../../../../server/src/schema';

interface UserProfileProps {
  user: Omit<User, 'password_hash'>;
}

export function UserProfile({ user }: UserProfileProps) {
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingPassword, setIsLoadingPassword] = useState(false);

  // Profile form state
  const [profileData, setProfileData] = useState({
    username: user.username,
    full_name: user.full_name,
    email: user.email,
    avatar_url: user.avatar_url
  });

  // Password form state
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  // Errors
  const [profileErrors, setProfileErrors] = useState<Partial<Record<keyof typeof profileData, string>>>({});
  const [passwordErrors, setPasswordErrors] = useState<Partial<Record<keyof typeof passwordData, string>>>({});

  // Validate profile form
  const validateProfile = () => {
    const errors: typeof profileErrors = {};

    if (!profileData.username.trim()) {
      errors.username = 'Username wajib diisi';
    } else if (profileData.username.length < 3) {
      errors.username = 'Username minimal 3 karakter';
    }

    if (!profileData.full_name.trim()) {
      errors.full_name = 'Nama lengkap wajib diisi';
    }

    if (!profileData.email.trim()) {
      errors.email = 'Email wajib diisi';
    } else if (!/\S+@\S+\.\S+/.test(profileData.email)) {
      errors.email = 'Format email tidak valid';
    }

    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validate password form
  const validatePassword = () => {
    const errors: typeof passwordErrors = {};

    if (!passwordData.current_password) {
      errors.current_password = 'Password saat ini wajib diisi';
    }

    if (!passwordData.new_password) {
      errors.new_password = 'Password baru wajib diisi';
    } else if (passwordData.new_password.length < 8) {
      errors.new_password = 'Password minimal 8 karakter';
    }

    if (!passwordData.confirm_password) {
      errors.confirm_password = 'Konfirmasi password wajib diisi';
    } else if (passwordData.new_password !== passwordData.confirm_password) {
      errors.confirm_password = 'Password konfirmasi tidak cocok';
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle avatar upload
  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 5MB');
      return;
    }

    // Create preview URL (stub implementation)
    const previewUrl = URL.createObjectURL(file);
    setProfileData(prev => ({ ...prev, avatar_url: previewUrl }));

    toast.success('Avatar berhasil diubah (preview)');
  };

  // Handle profile update
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateProfile()) {
      toast.error('Mohon periksa kembali data yang diisi');
      return;
    }

    setIsLoadingProfile(true);

    try {
      const updateData: UpdateUserInput = {
        id: user.id,
        username: profileData.username,
        full_name: profileData.full_name,
        email: profileData.email,
        avatar_url: profileData.avatar_url
      };

      await trpc.users.update.mutate(updateData);
      toast.success('Profil berhasil diperbarui!');
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Gagal memperbarui profil. Silakan coba lagi.');
    } finally {
      setIsLoadingProfile(false);
    }
  };

  // Handle password change
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePassword()) {
      toast.error('Mohon periksa kembali data yang diisi');
      return;
    }

    setIsLoadingPassword(true);

    try {
      const changePasswordInput: ChangePasswordInput = {
        user_id: user.id,
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
        confirm_password: passwordData.confirm_password
      };

      await trpc.users.changePassword.mutate(changePasswordInput);
      
      // Reset form
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
      
      toast.success('Password berhasil diubah!');
    } catch (error) {
      console.error('Failed to change password:', error);
      toast.error('Gagal mengubah password. Periksa password lama Anda.');
    } finally {
      setIsLoadingPassword(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">Profil Pengguna</h1>
        <p className="text-neutral-600">
          Kelola informasi akun dan keamanan Anda.
        </p>
      </div>

      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="w-5 h-5" />
            Informasi Akun
          </CardTitle>
          <CardDescription>
            Perbarui informasi dasar akun Anda
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSubmit} className="space-y-6">
            {/* Avatar Section */}
            <div className="flex items-center gap-6">
              <Avatar className="w-20 h-20">
                <AvatarImage 
                  src={profileData.avatar_url || '/default-avatar.png'} 
                  alt={profileData.full_name}
                />
                <AvatarFallback className="text-lg">
                  {profileData.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <Label htmlFor="avatar-upload" className="text-sm font-medium">
                  Foto Profil
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('avatar-upload')?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Foto
                  </Button>
                </div>
                <p className="text-xs text-neutral-500">
                  JPG, PNG, maksimal 5MB
                </p>
              </div>
            </div>

            <Separator />

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="username">
                  Username <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="username"
                  value={profileData.username}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setProfileData(prev => ({ ...prev, username: e.target.value }))
                  }
                  className={profileErrors.username ? 'input-error' : ''}
                />
                {profileErrors.username && (
                  <p className="text-sm text-red-600">{profileErrors.username}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="full_name">
                  Nama Lengkap <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="full_name"
                  value={profileData.full_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setProfileData(prev => ({ ...prev, full_name: e.target.value }))
                  }
                  className={profileErrors.full_name ? 'input-error' : ''}
                />
                {profileErrors.full_name && (
                  <p className="text-sm text-red-600">{profileErrors.full_name}</p>
                )}
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setProfileData(prev => ({ ...prev, email: e.target.value }))
                    }
                    className={`pl-10 ${profileErrors.email ? 'input-error' : ''}`}
                  />
                </div>
                {profileErrors.email && (
                  <p className="text-sm text-red-600">{profileErrors.email}</p>
                )}
              </div>
            </div>

            {/* User Role Display */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-blue-900">Role Akun</span>
              </div>
              <p className="text-sm text-blue-800">
                {user.role === 'admin' ? 'Administrator' : 'User Reporter'}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Role tidak dapat diubah oleh pengguna
              </p>
            </div>

            <Button 
              type="submit" 
              className="btn-primary"
              disabled={isLoadingProfile}
            >
              {isLoadingProfile ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Menyimpan...
                </div>
              ) : (
                'Simpan Perubahan'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Ubah Password
          </CardTitle>
          <CardDescription>
            Pastikan password Anda aman dan mudah diingat
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="current_password">
                Password Saat Ini <span className="text-red-500">*</span>
              </Label>
              <Input
                id="current_password"
                type="password"
                value={passwordData.current_password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setPasswordData(prev => ({ ...prev, current_password: e.target.value }))
                }
                className={passwordErrors.current_password ? 'input-error' : ''}
              />
              {passwordErrors.current_password && (
                <p className="text-sm text-red-600">{passwordErrors.current_password}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="new_password">
                  Password Baru <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="new_password"
                  type="password"
                  value={passwordData.new_password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setPasswordData(prev => ({ ...prev, new_password: e.target.value }))
                  }
                  className={passwordErrors.new_password ? 'input-error' : ''}
                />
                {passwordErrors.new_password && (
                  <p className="text-sm text-red-600">{passwordErrors.new_password}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm_password">
                  Konfirmasi Password <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="confirm_password"
                  type="password"
                  value={passwordData.confirm_password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setPasswordData(prev => ({ ...prev, confirm_password: e.target.value }))
                  }
                  className={passwordErrors.confirm_password ? 'input-error' : ''}
                />
                {passwordErrors.confirm_password && (
                  <p className="text-sm text-red-600">{passwordErrors.confirm_password}</p>
                )}
              </div>
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg">
              <h4 className="font-medium text-yellow-900 mb-2">Tips Password Aman:</h4>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>• Minimal 8 karakter</li>
                <li>• Kombinasi huruf besar dan kecil</li>
                <li>• Mengandung angka dan simbol</li>
                <li>• Tidak menggunakan informasi pribadi</li>
              </ul>
            </div>

            <Button 
              type="submit" 
              className="btn-primary"
              disabled={isLoadingPassword}
            >
              {isLoadingPassword ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Mengubah...
                </div>
              ) : (
                'Ganti Password'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Users, Plus, Edit, Key, Power, Trash2, Search, Filter } from 'lucide-react';
import { toast } from 'sonner';
import type { User, CreateUserInput, UpdateUserInput, UserRole } from '../../../../server/src/schema';

interface AdminUsersProps {
  user: Omit<User, 'password_hash'>;
}

export function AdminUsers({ user }: AdminUsersProps) {
  const [users, setUsers] = useState<Omit<User, 'password_hash'>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    per_page: 10,
    total_pages: 0
  });

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<boolean | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Dialog states
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Omit<User, 'password_hash'> | null>(null);

  // Form states
  const [addUserData, setAddUserData] = useState<CreateUserInput>({
    username: '',
    full_name: '',
    email: '',
    password: '',
    role: 'user',
    avatar_url: null
  });

  const [editUserData, setEditUserData] = useState<Partial<UpdateUserInput>>({});
  const [resetPasswordData, setResetPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const loadUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const filters = {
        search: search || undefined,
        role: roleFilter !== 'all' ? roleFilter : undefined,
        is_active: statusFilter !== 'all' ? statusFilter : undefined,
        page: currentPage,
        per_page: 10
      };

      const response = await trpc.users.getAll.query(filters);
      setUsers(response.data);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Gagal memuat data pengguna');
    } finally {
      setIsLoading(false);
    }
  }, [search, roleFilter, statusFilter, currentPage]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleRoleFilter = (value: string) => {
    setRoleFilter(value as UserRole | 'all');
    setCurrentPage(1);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value === 'all' ? 'all' : value === 'true');
    setCurrentPage(1);
  };

  const validateAddUser = () => {
    const newErrors: Record<string, string> = {};

    if (!addUserData.username.trim()) {
      newErrors.username = 'Username wajib diisi';
    } else if (addUserData.username.length < 3) {
      newErrors.username = 'Username minimal 3 karakter';
    }

    if (!addUserData.full_name.trim()) {
      newErrors.full_name = 'Nama lengkap wajib diisi';
    }

    if (!addUserData.email.trim()) {
      newErrors.email = 'Email wajib diisi';
    } else if (!/\S+@\S+\.\S+/.test(addUserData.email)) {
      newErrors.email = 'Format email tidak valid';
    }

    if (!addUserData.password) {
      newErrors.password = 'Password wajib diisi';
    } else if (addUserData.password.length < 8) {
      newErrors.password = 'Password minimal 8 karakter';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateResetPassword = () => {
    const newErrors: Record<string, string> = {};

    if (!resetPasswordData.newPassword) {
      newErrors.newPassword = 'Password baru wajib diisi';
    } else if (resetPasswordData.newPassword.length < 8) {
      newErrors.newPassword = 'Password minimal 8 karakter';
    }

    if (resetPasswordData.newPassword !== resetPasswordData.confirmPassword) {
      newErrors.confirmPassword = 'Konfirmasi password tidak cocok';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddUser = async () => {
    if (!validateAddUser()) {
      return;
    }

    try {
      await trpc.users.create.mutate(addUserData);
      toast.success('Pengguna berhasil ditambahkan');
      
      // Reset form
      setAddUserData({
        username: '',
        full_name: '',
        email: '',
        password: '',
        role: 'user',
        avatar_url: null
      });
      
      setAddUserOpen(false);
      loadUsers();
    } catch (error) {
      console.error('Failed to create user:', error);
      toast.error('Gagal menambahkan pengguna');
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;

    try {
      const updateData: UpdateUserInput = {
        id: selectedUser.id,
        ...editUserData
      };

      await trpc.users.update.mutate(updateData);
      toast.success('Pengguna berhasil diperbarui');
      
      setEditUserOpen(false);
      setSelectedUser(null);
      setEditUserData({});
      loadUsers();
    } catch (error) {
      console.error('Failed to update user:', error);
      toast.error('Gagal memperbarui pengguna');
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !validateResetPassword()) {
      return;
    }

    try {
      await trpc.users.resetPassword.mutate(selectedUser.id);
      toast.success('Password berhasil direset');
      
      setResetPasswordOpen(false);
      setSelectedUser(null);
      setResetPasswordData({ newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Failed to reset password:', error);
      toast.error('Gagal mereset password');
    }
  };

  const handleToggleUserStatus = async (userId: number) => {
    try {
      await trpc.users.toggleStatus.mutate(userId);
      toast.success('Status pengguna berhasil diubah');
      loadUsers();
    } catch (error) {
      console.error('Failed to toggle user status:', error);
      toast.error('Gagal mengubah status pengguna');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    try {
      await trpc.users.delete.mutate(userId);
      toast.success('Pengguna berhasil dihapus');
      loadUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast.error('Gagal menghapus pengguna');
    }
  };

  const getRoleBadge = (role: UserRole) => {
    return role === 'admin' 
      ? <Badge className="bg-purple-100 text-purple-800">Admin</Badge>
      : <Badge className="bg-blue-100 text-blue-800">User</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Manajemen Pengguna</h1>
          <p className="text-neutral-600">
            Kelola akun pengguna dan pengaturan akses sistem.
          </p>
        </div>
        <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
          <DialogTrigger asChild>
            <Button className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Pengguna
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Tambah Pengguna Baru</DialogTitle>
              <DialogDescription>
                Buat akun pengguna baru untuk sistem
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Username *</Label>
                <Input
                  value={addUserData.username}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setAddUserData(prev => ({ ...prev, username: e.target.value }))
                  }
                  className={errors.username ? 'input-error' : ''}
                />
                {errors.username && <p className="text-sm text-red-600">{errors.username}</p>}
              </div>
              <div className="space-y-2">
                <Label>Nama Lengkap *</Label>
                <Input
                  value={addUserData.full_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setAddUserData(prev => ({ ...prev, full_name: e.target.value }))
                  }
                  className={errors.full_name ? 'input-error' : ''}
                />
                {errors.full_name && <p className="text-sm text-red-600">{errors.full_name}</p>}
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={addUserData.email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setAddUserData(prev => ({ ...prev, email: e.target.value }))
                  }
                  className={errors.email ? 'input-error' : ''}
                />
                {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
              </div>
              <div className="space-y-2">
                <Label>Password *</Label>
                <Input
                  type="password"
                  value={addUserData.password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setAddUserData(prev => ({ ...prev, password: e.target.value }))
                  }
                  className={errors.password ? 'input-error' : ''}
                />
                {errors.password && <p className="text-sm text-red-600">{errors.password}</p>}
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={addUserData.role}
                  onValueChange={(value: UserRole) =>
                    setAddUserData(prev => ({ ...prev, role: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddUserOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleAddUser} className="btn-primary">
                Tambah Pengguna
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filter & Pencarian
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Pencarian</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
                <Input
                  placeholder="Cari pengguna..."
                  value={search}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Select value={roleFilter} onValueChange={handleRoleFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Role</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter.toString()} onValueChange={handleStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="true">Aktif</SelectItem>
                  <SelectItem value="false">Tidak Aktif</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Total</label>
              <div className="flex items-center h-10 px-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-blue-900">
                  {pagination.total} pengguna
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Pengguna</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-neutral-900 mb-2">
                Tidak ada pengguna
              </h3>
              <p className="text-neutral-600">
                {search || roleFilter !== 'all' || statusFilter !== 'all'
                  ? 'Tidak ada pengguna yang sesuai dengan filter.'
                  : 'Belum ada pengguna yang terdaftar.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">ID</TableHead>
                    <TableHead className="w-20">Avatar</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Nama Lengkap</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Login Terakhir</TableHead>
                    <TableHead className="w-48">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((userItem) => (
                    <TableRow key={userItem.id}>
                      <TableCell className="font-mono text-sm">
                        #{userItem.id}
                      </TableCell>
                      <TableCell>
                        <Avatar className="w-10 h-10">
                          <AvatarImage 
                            src={userItem.avatar_url || '/default-avatar.png'} 
                            alt={userItem.full_name}
                          />
                          <AvatarFallback>
                            {userItem.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-medium">{userItem.username}</TableCell>
                      <TableCell>{userItem.full_name}</TableCell>
                      <TableCell>{userItem.email}</TableCell>
                      <TableCell>
                        {getRoleBadge(userItem.role)}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={userItem.is_active}
                          onCheckedChange={() => handleToggleUserStatus(userItem.id)}
                          disabled={userItem.id === user.id} // Can't disable self
                        />
                      </TableCell>
                      <TableCell>
                        {userItem.last_login 
                          ? userItem.last_login.toLocaleDateString('id-ID')
                          : 'Belum pernah'
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Dialog 
                            open={editUserOpen && selectedUser?.id === userItem.id} 
                            onOpenChange={(open) => {
                              setEditUserOpen(open);
                              if (open) {
                                setSelectedUser(userItem);
                                setEditUserData({
                                  username: userItem.username,
                                  full_name: userItem.full_name,
                                  email: userItem.email,
                                  role: userItem.role
                                });
                              } else {
                                setSelectedUser(null);
                                setEditUserData({});
                              }
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="p-2 hover:bg-blue-100">
                                <Edit className="w-4 h-4 text-blue-600" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Pengguna</DialogTitle>
                                <DialogDescription>
                                  Perbarui informasi pengguna
                                </DialogDescription>
                              </DialogHeader>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>Username</Label>
                                  <Input
                                    value={editUserData.username || ''}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                      setEditUserData(prev => ({ ...prev, username: e.target.value }))
                                    }
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Nama Lengkap</Label>
                                  <Input
                                    value={editUserData.full_name || ''}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                      setEditUserData(prev => ({ ...prev, full_name: e.target.value }))
                                    }
                                  />
                                </div>
                                <div className="col-span-2 space-y-2">
                                  <Label>Email</Label>
                                  <Input
                                    type="email"
                                    value={editUserData.email || ''}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                      setEditUserData(prev => ({ ...prev, email: e.target.value }))
                                    }
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Role</Label>
                                  <Select
                                    value={editUserData.role}
                                    onValueChange={(value: UserRole) =>
                                      setEditUserData(prev => ({ ...prev, role: value }))
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="user">User</SelectItem>
                                      <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setEditUserOpen(false)}>
                                  Batal
                                </Button>
                                <Button onClick={handleEditUser} className="btn-primary">
                                  Simpan
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>

                          <Dialog 
                            open={resetPasswordOpen && selectedUser?.id === userItem.id}
                            onOpenChange={(open) => {
                              setResetPasswordOpen(open);
                              if (open) {
                                setSelectedUser(userItem);
                              } else {
                                setSelectedUser(null);
                                setResetPasswordData({ newPassword: '', confirmPassword: '' });
                              }
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="p-2 hover:bg-orange-100">
                                <Key className="w-4 h-4 text-orange-600" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Reset Password</DialogTitle>
                                <DialogDescription>
                                  Reset password untuk {userItem.full_name}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label>Password Baru</Label>
                                  <Input
                                    type="password"
                                    value={resetPasswordData.newPassword}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                      setResetPasswordData(prev => ({ ...prev, newPassword: e.target.value }))
                                    }
                                    className={errors.newPassword ? 'input-error' : ''}
                                  />
                                  {errors.newPassword && <p className="text-sm text-red-600">{errors.newPassword}</p>}
                                </div>
                                <div className="space-y-2">
                                  <Label>Konfirmasi Password</Label>
                                  <Input
                                    type="password"
                                    value={resetPasswordData.confirmPassword}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                      setResetPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))
                                    }
                                    className={errors.confirmPassword ? 'input-error' : ''}
                                  />
                                  {errors.confirmPassword && <p className="text-sm text-red-600">{errors.confirmPassword}</p>}
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setResetPasswordOpen(false)}>
                                  Batal
                                </Button>
                                <Button onClick={handleResetPassword} className="btn-primary">
                                  Reset Password
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-2 hover:bg-green-100"
                            onClick={() => handleToggleUserStatus(userItem.id)}
                            disabled={userItem.id === user.id}
                          >
                            <Power className="w-4 h-4 text-green-600" />
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="p-2 hover:bg-red-100"
                                disabled={userItem.id === user.id}
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Hapus Pengguna</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Apakah Anda yakin ingin menghapus pengguna "{userItem.full_name}"? 
                                  Tindakan ini tidak dapat dibatalkan.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteUser(userItem.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Hapus
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {pagination.total_pages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t">
              <div className="text-sm text-neutral-600">
                Menampilkan {((currentPage - 1) * pagination.per_page) + 1} - {Math.min(currentPage * pagination.per_page, pagination.total)} dari {pagination.total} pengguna
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1 || isLoading}
                >
                  Sebelumnya
                </Button>
                <span className="px-3 py-1 text-sm bg-blue-100 text-blue-900 rounded">
                  {currentPage} / {pagination.total_pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(pagination.total_pages, prev + 1))}
                  disabled={currentPage === pagination.total_pages || isLoading}
                >
                  Selanjutnya
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
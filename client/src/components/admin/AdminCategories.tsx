import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Folder, Plus, Edit, List, Trash2, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
import type { User, Menu, SubMenu, CreateMenuInput, UpdateMenuInput, CreateSubMenuInput, UpdateSubMenuInput } from '../../../../server/src/schema';

interface AdminCategoriesProps {
  user: Omit<User, 'password_hash'>;
}

interface MenuWithSubMenus extends Menu {
  subMenus?: SubMenu[];
  reportCount?: number;
}

export function AdminCategories({ user }: AdminCategoriesProps) {
  const [menus, setMenus] = useState<MenuWithSubMenus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Dialog states
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [editMenuOpen, setEditMenuOpen] = useState(false);
  const [subMenuOpen, setSubMenuOpen] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState<MenuWithSubMenus | null>(null);
  const [selectedSubMenus, setSelectedSubMenus] = useState<SubMenu[]>([]);

  // Form states
  const [addMenuData, setAddMenuData] = useState<CreateMenuInput>({
    name: '',
    description: null,
    is_active: true
  });

  const [editMenuData, setEditMenuData] = useState<Partial<UpdateMenuInput>>({});

  const [addSubMenuData, setAddSubMenuData] = useState<CreateSubMenuInput>({
    menu_id: 0,
    name: '',
    description: null,
    is_active: true
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const loadMenus = useCallback(async () => {
    try {
      setIsLoading(true);
      const menuData = await trpc.menus.getAll.query();
      
      // Load sub menus and report counts for each menu
      const menusWithDetails = await Promise.all(
        menuData.map(async (menu) => {
          try {
            const subMenus = await trpc.menus.subMenus.getByMenuId.query(menu.id);
            // Note: In real implementation, you'd get report counts from API
            const reportCount = Math.floor(Math.random() * 50); // Stub data
            
            return {
              ...menu,
              subMenus,
              reportCount
            };
          } catch (error) {
            return {
              ...menu,
              subMenus: [],
              reportCount: 0
            };
          }
        })
      );
      
      setMenus(menusWithDetails);
    } catch (error) {
      console.error('Failed to load menus:', error);
      toast.error('Gagal memuat data kategori');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMenus();
  }, [loadMenus]);

  const validateMenu = (data: CreateMenuInput | Partial<UpdateMenuInput>) => {
    const newErrors: Record<string, string> = {};

    if (!data.name?.trim()) {
      newErrors.name = 'Nama menu wajib diisi';
    } else if (data.name.length > 100) {
      newErrors.name = 'Nama menu maksimal 100 karakter';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateSubMenu = (data: CreateSubMenuInput) => {
    const newErrors: Record<string, string> = {};

    if (!data.name?.trim()) {
      newErrors.subMenuName = 'Nama sub menu wajib diisi';
    } else if (data.name.length > 100) {
      newErrors.subMenuName = 'Nama sub menu maksimal 100 karakter';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddMenu = async () => {
    if (!validateMenu(addMenuData)) {
      return;
    }

    try {
      await trpc.menus.create.mutate(addMenuData);
      toast.success('Menu berhasil ditambahkan');
      
      // Reset form
      setAddMenuData({
        name: '',
        description: null,
        is_active: true
      });
      
      setAddMenuOpen(false);
      loadMenus();
    } catch (error) {
      console.error('Failed to create menu:', error);
      toast.error('Gagal menambahkan menu');
    }
  };

  const handleEditMenu = async () => {
    if (!selectedMenu || !validateMenu(editMenuData)) {
      return;
    }

    try {
      const updateData: UpdateMenuInput = {
        id: selectedMenu.id,
        ...editMenuData
      };

      await trpc.menus.update.mutate(updateData);
      toast.success('Menu berhasil diperbarui');
      
      setEditMenuOpen(false);
      setSelectedMenu(null);
      setEditMenuData({});
      loadMenus();
    } catch (error) {
      console.error('Failed to update menu:', error);
      toast.error('Gagal memperbarui menu');
    }
  };

  const handleDeleteMenu = async (menuId: number) => {
    try {
      await trpc.menus.delete.mutate(menuId);
      toast.success('Menu berhasil dihapus');
      loadMenus();
    } catch (error) {
      console.error('Failed to delete menu:', error);
      toast.error('Gagal menghapus menu');
    }
  };

  const handleAddSubMenu = async () => {
    if (!selectedMenu || !validateSubMenu(addSubMenuData)) {
      return;
    }

    try {
      const subMenuData: CreateSubMenuInput = {
        ...addSubMenuData,
        menu_id: selectedMenu.id
      };

      await trpc.menus.subMenus.create.mutate(subMenuData);
      toast.success('Sub menu berhasil ditambahkan');
      
      // Reset form and reload sub menus
      setAddSubMenuData({
        menu_id: selectedMenu.id,
        name: '',
        description: null,
        is_active: true
      });
      
      loadSubMenus(selectedMenu.id);
    } catch (error) {
      console.error('Failed to create sub menu:', error);
      toast.error('Gagal menambahkan sub menu');
    }
  };

  const handleDeleteSubMenu = async (subMenuId: number) => {
    try {
      await trpc.menus.subMenus.delete.mutate(subMenuId);
      toast.success('Sub menu berhasil dihapus');
      if (selectedMenu) {
        loadSubMenus(selectedMenu.id);
      }
    } catch (error) {
      console.error('Failed to delete sub menu:', error);
      toast.error('Gagal menghapus sub menu');
    }
  };

  const loadSubMenus = async (menuId: number) => {
    try {
      const subMenus = await trpc.menus.subMenus.getByMenuId.query(menuId);
      setSelectedSubMenus(subMenus);
    } catch (error) {
      console.error('Failed to load sub menus:', error);
    }
  };

  const openSubMenuDialog = (menu: MenuWithSubMenus) => {
    setSelectedMenu(menu);
    setSelectedSubMenus(menu.subMenus || []);
    setAddSubMenuData({
      menu_id: menu.id,
      name: '',
      description: null,
      is_active: true
    });
    setSubMenuOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Manajemen Kategori</h1>
          <p className="text-neutral-600">
            Kelola menu dan sub menu untuk kategorisasi laporan bug.
          </p>
        </div>
        <Dialog open={addMenuOpen} onOpenChange={setAddMenuOpen}>
          <DialogTrigger asChild>
            <Button className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Menu
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Menu Baru</DialogTitle>
              <DialogDescription>
                Buat kategori menu baru untuk laporan bug
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nama Menu *</Label>
                <Input
                  value={addMenuData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setAddMenuData(prev => ({ ...prev, name: e.target.value }))
                  }
                  className={errors.name ? 'input-error' : ''}
                  maxLength={100}
                />
                {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
              </div>
              <div className="space-y-2">
                <Label>Deskripsi (Opsional)</Label>
                <Textarea
                  value={addMenuData.description || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setAddMenuData(prev => ({ ...prev, description: e.target.value || null }))
                  }
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={addMenuData.is_active}
                  onCheckedChange={(checked: boolean) =>
                    setAddMenuData(prev => ({ ...prev, is_active: checked }))
                  }
                />
                <Label htmlFor="is_active">Aktif</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddMenuOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleAddMenu} className="btn-primary">
                Tambah Menu
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Menus Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Folder className="w-5 h-5" />
            Daftar Menu
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : menus.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-neutral-900 mb-2">
                Belum ada menu
              </h3>
              <p className="text-neutral-600 mb-4">
                Tambahkan menu pertama untuk mengkategorikan laporan bug.
              </p>
              <Button onClick={() => setAddMenuOpen(true)} className="btn-primary">
                <Plus className="w-4 h-4 mr-2" />
                Tambah Menu Pertama
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">ID</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Sub Menus</TableHead>
                    <TableHead>Jumlah Laporan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Dibuat</TableHead>
                    <TableHead className="w-36">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {menus.map((menu) => (
                    <TableRow key={menu.id}>
                      <TableCell className="font-mono text-sm">
                        #{menu.id}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{menu.name}</p>
                          {menu.description && (
                            <p className="text-sm text-neutral-600">
                              {menu.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-neutral-600">
                            {menu.subMenus?.length || 0} sub menu
                          </span>
                          {(menu.subMenus?.length || 0) > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-1 h-6"
                              onClick={() => openSubMenuDialog(menu)}
                            >
                              <List className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium text-blue-600">
                          {menu.reportCount || 0}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={menu.is_active}
                          onCheckedChange={async (checked) => {
                            try {
                              await trpc.menus.update.mutate({
                                id: menu.id,
                                is_active: checked
                              });
                              toast.success('Status menu berhasil diubah');
                              loadMenus();
                            } catch (error) {
                              toast.error('Gagal mengubah status menu');
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        {menu.created_at.toLocaleDateString('id-ID')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Dialog 
                            open={editMenuOpen && selectedMenu?.id === menu.id}
                            onOpenChange={(open) => {
                              setEditMenuOpen(open);
                              if (open) {
                                setSelectedMenu(menu);
                                setEditMenuData({
                                  name: menu.name,
                                  description: menu.description
                                });
                              } else {
                                setSelectedMenu(null);
                                setEditMenuData({});
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
                                <DialogTitle>Edit Menu</DialogTitle>
                                <DialogDescription>
                                  Perbarui informasi menu
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label>Nama Menu *</Label>
                                  <Input
                                    value={editMenuData.name || ''}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                      setEditMenuData(prev => ({ ...prev, name: e.target.value }))
                                    }
                                    className={errors.name ? 'input-error' : ''}
                                  />
                                  {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
                                </div>
                                <div className="space-y-2">
                                  <Label>Deskripsi (Opsional)</Label>
                                  <Textarea
                                    value={editMenuData.description || ''}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                                      setEditMenuData(prev => ({ ...prev, description: e.target.value || null }))
                                    }
                                    rows={3}
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setEditMenuOpen(false)}>
                                  Batal
                                </Button>
                                <Button onClick={handleEditMenu} className="btn-primary">
                                  Simpan
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-2 hover:bg-green-100"
                            onClick={() => openSubMenuDialog(menu)}
                          >
                            <List className="w-4 h-4 text-green-600" />
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="p-2 hover:bg-red-100">
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Hapus Menu</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Apakah Anda yakin ingin menghapus menu "{menu.name}"? 
                                  Semua sub menu dan laporan terkait akan terpengaruh.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteMenu(menu.id)}
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
        </CardContent>
      </Card>

      {/* Sub Menu Management Dialog */}
      <Dialog open={subMenuOpen} onOpenChange={setSubMenuOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Manajemen Sub Menu - {selectedMenu?.name}</DialogTitle>
            <DialogDescription>
              Kelola sub menu untuk kategori {selectedMenu?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Add Sub Menu Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tambah Sub Menu</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Nama Sub Menu *</Label>
                    <Input
                      value={addSubMenuData.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setAddSubMenuData(prev => ({ ...prev, name: e.target.value }))
                      }
                      className={errors.subMenuName ? 'input-error' : ''}
                    />
                    {errors.subMenuName && <p className="text-sm text-red-600">{errors.subMenuName}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Deskripsi (Opsional)</Label>
                    <Input
                      value={addSubMenuData.description || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setAddSubMenuData(prev => ({ ...prev, description: e.target.value || null }))
                      }
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleAddSubMenu} className="btn-primary w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Tambah
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sub Menu List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Daftar Sub Menu</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedSubMenus.length === 0 ? (
                  <div className="text-center py-8">
                    <List className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                    <p className="text-neutral-600">Belum ada sub menu</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Nama</TableHead>
                        <TableHead>Deskripsi</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Laporan</TableHead>
                        <TableHead>Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedSubMenus.map((subMenu) => (
                        <TableRow key={subMenu.id}>
                          <TableCell className="font-mono text-sm">
                            #{subMenu.id}
                          </TableCell>
                          <TableCell className="font-medium">
                            {subMenu.name}
                          </TableCell>
                          <TableCell>
                            {subMenu.description || '-'}
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={subMenu.is_active}
                              onCheckedChange={async (checked) => {
                                try {
                                  await trpc.menus.subMenus.update.mutate({
                                    id: subMenu.id,
                                    is_active: checked
                                  });
                                  toast.success('Status sub menu berhasil diubah');
                                  if (selectedMenu) {
                                    loadSubMenus(selectedMenu.id);
                                  }
                                } catch (error) {
                                  toast.error('Gagal mengubah status sub menu');
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-medium text-blue-600">
                              {Math.floor(Math.random() * 20)} {/* Stub data */}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="sm" className="p-2 hover:bg-blue-100">
                                <Edit className="w-4 h-4 text-blue-600" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="p-2 hover:bg-red-100">
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Hapus Sub Menu</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Apakah Anda yakin ingin menghapus sub menu "{subMenu.name}"?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Batal</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteSubMenu(subMenu.id)}
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
                )}
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSubMenuOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, X, Image as ImageIcon, FileText, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import type { User, Menu, SubMenu, CreateReportInput } from '../../../../server/src/schema';

interface AddReportFormProps {
  user: Omit<User, 'password_hash'>;
  onReportCreated?: () => void;
}

interface FileUploadState {
  file: File;
  preview: string;
  uploading: boolean;
  uploaded: boolean;
  url?: string;
}

export function AddReportForm({ user, onReportCreated }: AddReportFormProps) {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [subMenus, setSubMenus] = useState<SubMenu[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMenus, setIsLoadingMenus] = useState(true);
  const [files, setFiles] = useState<FileUploadState[]>([]);

  const [formData, setFormData] = useState<CreateReportInput>({
    user_id: user.id,
    menu_id: 0,
    sub_menu_id: 0,
    name: '',
    description: '',
    screenshots: []
  });

  const [errors, setErrors] = useState<Partial<Record<keyof CreateReportInput, string>>>({});

  // Load menus on component mount
  const loadMenus = useCallback(async () => {
    try {
      setIsLoadingMenus(true);
      const menuData = await trpc.menus.getAll.query();
      setMenus(menuData.filter(menu => menu.is_active));
    } catch (error) {
      console.error('Failed to load menus:', error);
      toast.error('Gagal memuat daftar menu');
    } finally {
      setIsLoadingMenus(false);
    }
  }, []);

  useEffect(() => {
    loadMenus();
  }, [loadMenus]);

  // Load sub menus when menu changes
  const loadSubMenus = useCallback(async (menuId: number) => {
    if (!menuId) {
      setSubMenus([]);
      return;
    }

    try {
      const subMenuData = await trpc.menus.subMenus.getByMenuId.query(menuId);
      setSubMenus(subMenuData.filter(subMenu => subMenu.is_active));
    } catch (error) {
      console.error('Failed to load sub menus:', error);
      toast.error('Gagal memuat daftar sub menu');
    }
  }, []);

  const handleMenuChange = (menuId: string) => {
    const menuIdNum = parseInt(menuId);
    setFormData(prev => ({
      ...prev,
      menu_id: menuIdNum,
      sub_menu_id: 0 // Reset sub menu
    }));
    loadSubMenus(menuIdNum);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const maxFiles = 5 - files.length;
    
    if (selectedFiles.length > maxFiles) {
      toast.error(`Maksimal ${5} file. Sisa slot: ${maxFiles}`);
      return;
    }

    const newFiles: FileUploadState[] = selectedFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      uploading: false,
      uploaded: false
    }));

    setFiles(prev => [...prev, ...newFiles]);
  };

  const handleFileDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    const imageFiles = droppedFiles.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      toast.error('Hanya file gambar yang diizinkan');
      return;
    }

    const maxFiles = 5 - files.length;
    if (imageFiles.length > maxFiles) {
      toast.error(`Maksimal ${5} file. Sisa slot: ${maxFiles}`);
      return;
    }

    const newFiles: FileUploadState[] = imageFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      uploading: false,
      uploaded: false
    }));

    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CreateReportInput, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nama laporan wajib diisi';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Nama laporan maksimal 100 karakter';
    }

    if (!formData.menu_id) {
      newErrors.menu_id = 'Menu wajib dipilih';
    }

    if (!formData.sub_menu_id) {
      newErrors.sub_menu_id = 'Sub menu wajib dipilih';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Deskripsi wajib diisi';
    } else if (formData.description.length > 1000) {
      newErrors.description = 'Deskripsi maksimal 1000 karakter';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Mohon lengkapi semua field yang wajib diisi');
      return;
    }

    setIsLoading(true);

    try {
      // Upload files first (stub implementation)
      const uploadedUrls: string[] = [];
      for (const fileState of files) {
        // In real implementation, this would upload to actual storage
        const stubUrl = `https://example.com/uploads/${fileState.file.name}`;
        uploadedUrls.push(stubUrl);
      }

      const reportData: CreateReportInput = {
        ...formData,
        screenshots: uploadedUrls
      };

      await trpc.reports.create.mutate(reportData);

      toast.success('Laporan berhasil dibuat!');

      // Reset form
      setFormData({
        user_id: user.id,
        menu_id: 0,
        sub_menu_id: 0,
        name: '',
        description: '',
        screenshots: []
      });
      setFiles([]);
      setSubMenus([]);

      if (onReportCreated) {
        onReportCreated();
      }
    } catch (error) {
      console.error('Failed to create report:', error);
      toast.error('Gagal membuat laporan. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      user_id: user.id,
      menu_id: 0,
      sub_menu_id: 0,
      name: '',
      description: '',
      screenshots: []
    });
    setFiles([]);
    setSubMenus([]);
    setErrors({});
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">Buat Laporan Bug</h1>
        <p className="text-neutral-600">
          Laporkan bug atau masalah yang Anda temukan dalam aplikasi.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Detail Laporan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Report Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Nama Laporan <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Contoh: Error saat menyimpan data user"
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData(prev => ({ ...prev, name: e.target.value }))
                }
                className={errors.name ? 'input-error' : 'input-base'}
                maxLength={100}
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name}</p>
              )}
              <p className="text-sm text-neutral-500">
                {formData.name.length}/100 karakter
              </p>
            </div>

            {/* Menu Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Menu <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.menu_id ? formData.menu_id.toString() : ''}
                  onValueChange={handleMenuChange}
                  disabled={isLoadingMenus}
                >
                  <SelectTrigger className={errors.menu_id ? 'input-error' : ''}>
                    <SelectValue placeholder="Pilih menu" />
                  </SelectTrigger>
                  <SelectContent>
                    {menus.map(menu => (
                      <SelectItem key={menu.id} value={menu.id.toString()}>
                        {menu.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.menu_id && (
                  <p className="text-sm text-red-600">{errors.menu_id}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>
                  Sub Menu <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.sub_menu_id ? formData.sub_menu_id.toString() : ''}
                  onValueChange={(value) =>
                    setFormData(prev => ({ ...prev, sub_menu_id: parseInt(value) }))
                  }
                  disabled={!formData.menu_id || subMenus.length === 0}
                >
                  <SelectTrigger className={errors.sub_menu_id ? 'input-error' : ''}>
                    <SelectValue placeholder="Pilih sub menu" />
                  </SelectTrigger>
                  <SelectContent>
                    {subMenus.map(subMenu => (
                      <SelectItem key={subMenu.id} value={subMenu.id.toString()}>
                        {subMenu.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.sub_menu_id && (
                  <p className="text-sm text-red-600">{errors.sub_menu_id}</p>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">
                Deskripsi <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Jelaskan bug yang Anda temukan secara detail..."
                rows={6}
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData(prev => ({ ...prev, description: e.target.value }))
                }
                className={errors.description ? 'input-error' : 'input-base'}
                maxLength={1000}
              />
              {errors.description && (
                <p className="text-sm text-red-600">{errors.description}</p>
              )}
              <p className="text-sm text-neutral-500">
                {formData.description.length}/1000 karakter
              </p>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label>
                Screenshot (Opsional)
              </Label>
              <div
                className="border-2 border-dashed border-neutral-300 rounded-lg p-6 hover:border-blue-400 transition-colors"
                onDrop={handleFileDrop}
                onDragOver={(e) => e.preventDefault()}
              >
                <div className="text-center">
                  <Upload className="w-8 h-8 text-neutral-400 mx-auto mb-4" />
                  <p className="text-sm text-neutral-600 mb-2">
                    Drag & drop gambar di sini
                  </p>
                  <p className="text-xs text-neutral-500 mb-4">
                    atau klik untuk browse
                  </p>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    disabled={files.length >= 5}
                  >
                    Pilih File
                  </Button>
                  <p className="text-xs text-neutral-500 mt-2">
                    Format: JPG, PNG, GIF, WebP • Maksimal: 5MB • Limit: 5 file
                  </p>
                </div>
              </div>

              {/* File Preview */}
              {files.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-4">
                  {files.map((fileState, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square bg-neutral-100 rounded-lg overflow-hidden border">
                        <img
                          src={fileState.preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeFile(index)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                      <p className="text-xs text-neutral-600 mt-1 truncate">
                        {fileState.file.name}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
              <Button
                type="submit"
                className="btn-primary flex-1"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Mengirim...
                  </div>
                ) : (
                  'Kirim Laporan'
                )}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
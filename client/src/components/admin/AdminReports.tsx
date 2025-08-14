import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Eye, Edit, Trash2, Search, Filter, UserPlus, Flag, Download, Users2 } from 'lucide-react';
import { toast } from 'sonner';
import type { User, ReportWithDetails, ReportStatus, ReportPriority, Menu } from '../../../../server/src/schema';

interface AdminReportsProps {
  user: Omit<User, 'password_hash'>;
}

export function AdminReports({ user }: AdminReportsProps) {
  const [reports, setReports] = useState<ReportWithDetails[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [users, setUsers] = useState<Omit<User, 'password_hash'>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReports, setSelectedReports] = useState<number[]>([]);
  
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    per_page: 10,
    total_pages: 0
  });

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<ReportPriority | 'all'>('all');
  const [userFilter, setUserFilter] = useState<number | 'all'>('all');
  const [menuFilter, setMenuFilter] = useState<number | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Dialog states
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [priorityDialogOpen, setPriorityDialogOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<number[]>([]);
  const [priorityTarget, setPriorityTarget] = useState<number[]>([]);

  const loadReports = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const filters = {
        search: search || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        priority: priorityFilter !== 'all' ? priorityFilter : undefined,
        user_id: userFilter !== 'all' ? userFilter : undefined,
        menu_id: menuFilter !== 'all' ? menuFilter : undefined,
        page: currentPage,
        per_page: 10
      };

      const response = await trpc.reports.getAll.query(filters);
      setReports(response.data);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Failed to load reports:', error);
      toast.error('Gagal memuat data laporan');
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, priorityFilter, userFilter, menuFilter, currentPage]);

  const loadFilters = useCallback(async () => {
    try {
      // Load menus for filter
      const menuData = await trpc.menus.getAll.query();
      setMenus(menuData.filter(menu => menu.is_active));

      // Load users for filter
      const userData = await trpc.users.getAll.query({ per_page: 100 });
      setUsers(userData.data);
    } catch (error) {
      console.error('Failed to load filter data:', error);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  useEffect(() => {
    loadFilters();
  }, [loadFilters]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value as ReportStatus | 'all');
    setCurrentPage(1);
  };

  const handlePriorityFilter = (value: string) => {
    setPriorityFilter(value as ReportPriority | 'all');
    setCurrentPage(1);
  };

  const handleUserFilter = (value: string) => {
    setUserFilter(value === 'all' ? 'all' : parseInt(value));
    setCurrentPage(1);
  };

  const handleMenuFilter = (value: string) => {
    setMenuFilter(value === 'all' ? 'all' : parseInt(value));
    setCurrentPage(1);
  };

  const handleSelectReport = (reportId: number, checked: boolean) => {
    setSelectedReports(prev => 
      checked 
        ? [...prev, reportId]
        : prev.filter(id => id !== reportId)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedReports(checked ? reports.map(r => r.id) : []);
  };

  const handleDeleteReport = async (reportId: number) => {
    try {
      await trpc.reports.delete.mutate(reportId);
      toast.success('Laporan berhasil dihapus');
      loadReports();
    } catch (error) {
      console.error('Failed to delete report:', error);
      toast.error('Gagal menghapus laporan');
    }
  };

  const handleBulkStatusUpdate = async (status: ReportStatus) => {
    try {
      await trpc.reports.bulkUpdateStatus.mutate({
        report_ids: selectedReports,
        status
      });
      toast.success(`${selectedReports.length} laporan berhasil diperbarui`);
      setSelectedReports([]);
      loadReports();
    } catch (error) {
      console.error('Failed to bulk update status:', error);
      toast.error('Gagal memperbarui status laporan');
    }
  };

  const handleBulkAssign = async (assignedTo: number) => {
    try {
      await trpc.reports.bulkAssign.mutate({
        report_ids: selectedReports,
        assigned_to: assignedTo
      });
      toast.success(`${selectedReports.length} laporan berhasil di-assign`);
      setSelectedReports([]);
      setAssignDialogOpen(false);
      loadReports();
    } catch (error) {
      console.error('Failed to bulk assign:', error);
      toast.error('Gagal meng-assign laporan');
    }
  };

  const getStatusBadge = (status: ReportStatus) => {
    switch (status) {
      case 'pending':
        return <Badge className="status-pending">Menunggu</Badge>;
      case 'progress':
        return <Badge className="status-progress">Proses</Badge>;
      case 'resolved':
        return <Badge className="status-resolved">Selesai</Badge>;
      case 'closed':
        return <Badge className="status-closed">Ditutup</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: ReportPriority) => {
    switch (priority) {
      case 'low':
        return <Badge className="priority-low">Rendah</Badge>;
      case 'medium':
        return <Badge className="priority-medium">Sedang</Badge>;
      case 'high':
        return <Badge className="priority-high">Tinggi</Badge>;
      case 'critical':
        return <Badge className="priority-critical">Kritis</Badge>;
      default:
        return <Badge>{priority}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">Manajemen Laporan Bug</h1>
        <p className="text-neutral-600">
          Kelola dan review semua laporan bug dari pengguna.
        </p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Pencarian</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
                <Input
                  placeholder="Cari laporan..."
                  value={search}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={handleStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="pending">Menunggu</SelectItem>
                  <SelectItem value="progress">Proses</SelectItem>
                  <SelectItem value="resolved">Selesai</SelectItem>
                  <SelectItem value="closed">Ditutup</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Priority Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Prioritas</label>
              <Select value={priorityFilter} onValueChange={handlePriorityFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Prioritas</SelectItem>
                  <SelectItem value="low">Rendah</SelectItem>
                  <SelectItem value="medium">Sedang</SelectItem>
                  <SelectItem value="high">Tinggi</SelectItem>
                  <SelectItem value="critical">Kritis</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* User Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Pengguna</label>
              <Select value={userFilter.toString()} onValueChange={handleUserFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Pengguna</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Menu Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Menu</label>
              <Select value={menuFilter.toString()} onValueChange={handleMenuFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Menu</SelectItem>
                  {menus.map(menu => (
                    <SelectItem key={menu.id} value={menu.id.toString()}>
                      {menu.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedReports.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-blue-900 font-medium">
                {selectedReports.length} laporan terpilih
              </span>
              <div className="flex items-center gap-2">
                <Select onValueChange={(value) => handleBulkStatusUpdate(value as ReportStatus)}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Update Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Menunggu</SelectItem>
                    <SelectItem value="progress">Proses</SelectItem>
                    <SelectItem value="resolved">Selesai</SelectItem>
                    <SelectItem value="closed">Ditutup</SelectItem>
                  </SelectContent>
                </Select>
                
                <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Users2 className="w-4 h-4 mr-2" />
                      Assign
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Assign Laporan</DialogTitle>
                      <DialogDescription>
                        Pilih pengguna untuk meng-assign {selectedReports.length} laporan
                      </DialogDescription>
                    </DialogHeader>
                    <Select onValueChange={(value) => handleBulkAssign(parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih pengguna" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.filter(u => u.role === 'admin').map(user => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </DialogContent>
                </Dialog>

                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reports Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Daftar Laporan</CardTitle>
            <div className="text-sm text-neutral-600">
              Total: {pagination.total} laporan
            </div>
          </div>
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
          ) : reports.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-neutral-900 mb-2">
                Tidak ada laporan
              </h3>
              <p className="text-neutral-600">
                {search || statusFilter !== 'all' || priorityFilter !== 'all'
                  ? 'Tidak ada laporan yang sesuai dengan filter.'
                  : 'Belum ada laporan yang dibuat.'}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedReports.length === reports.length}
                          onCheckedChange={(checked: boolean) => handleSelectAll(checked)}
                        />
                      </TableHead>
                      <TableHead className="w-16">ID</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Pengguna</TableHead>
                      <TableHead>Menu</TableHead>
                      <TableHead>Prioritas</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Dibuat</TableHead>
                      <TableHead className="w-40">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedReports.includes(report.id)}
                            onCheckedChange={(checked: boolean) => handleSelectReport(report.id, checked)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          #{report.id}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{report.name}</p>
                            <p className="text-sm text-neutral-600 truncate max-w-xs">
                              {report.description}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{report.user.full_name}</TableCell>
                        <TableCell>{report.menu.name}</TableCell>
                        <TableCell>
                          {getPriorityBadge(report.priority)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(report.status)}
                        </TableCell>
                        <TableCell>
                          {report.created_at.toLocaleDateString('id-ID')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" className="p-2 hover:bg-blue-100">
                              <Eye className="w-4 h-4 text-blue-600" />
                            </Button>
                            <Button variant="ghost" size="sm" className="p-2 hover:bg-green-100">
                              <UserPlus className="w-4 h-4 text-green-600" />
                            </Button>
                            <Button variant="ghost" size="sm" className="p-2 hover:bg-orange-100">
                              <Flag className="w-4 h-4 text-orange-600" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="p-2 hover:bg-red-100">
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Hapus Laporan</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Apakah Anda yakin ingin menghapus laporan "{report.name}"?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Batal</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteReport(report.id)}
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

              {/* Mobile Cards */}
              <div className="lg:hidden space-y-4">
                {reports.map((report) => (
                  <Card key={report.id} className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <Checkbox
                        checked={selectedReports.includes(report.id)}
                        onCheckedChange={(checked: boolean) => handleSelectReport(report.id, checked)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs text-neutral-500">
                            #{report.id}
                          </span>
                          {getStatusBadge(report.status)}
                          {getPriorityBadge(report.priority)}
                        </div>
                        <h3 className="font-medium text-neutral-900">{report.name}</h3>
                        <p className="text-sm text-neutral-600 mt-1">
                          {report.user.full_name} • {report.menu.name}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-neutral-600 mb-3 line-clamp-2">
                      {report.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-500">
                        {report.created_at.toLocaleDateString('id-ID')}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="p-2">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="p-2">
                          <UserPlus className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="p-2">
                          <Flag className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}

          {/* Pagination */}
          {pagination.total_pages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t">
              <div className="text-sm text-neutral-600">
                Menampilkan {((currentPage - 1) * pagination.per_page) + 1} - {Math.min(currentPage * pagination.per_page, pagination.total)} dari {pagination.total} laporan
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
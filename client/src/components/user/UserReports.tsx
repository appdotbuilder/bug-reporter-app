import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Eye, Edit, Trash2, Search, Filter, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import type { User, ReportWithDetails, ReportStatus } from '../../../../server/src/schema';

interface UserReportsProps {
  user: Omit<User, 'password_hash'>;
}

export function UserReports({ user }: UserReportsProps) {
  const [reports, setReports] = useState<ReportWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    per_page: 10,
    total_pages: 0
  });

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const loadReports = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const filters = {
        search: search || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        page: currentPage,
        per_page: 10
      };

      const response = await trpc.reports.getUserReports.query({
        userId: user.id,
        filters
      });

      setReports(response.data);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Failed to load reports:', error);
      toast.error('Gagal memuat data laporan');
    } finally {
      setIsLoading(false);
    }
  }, [user.id, search, statusFilter, currentPage]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value as ReportStatus | 'all');
    setCurrentPage(1);
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

  const canEditReport = (status: ReportStatus) => {
    return status !== 'closed';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">Data Laporan Saya</h1>
        <p className="text-neutral-600">
          Kelola dan pantau semua laporan bug yang Anda buat.
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Pencarian</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
                <Input
                  placeholder="Cari nama laporan..."
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

            {/* Quick Stats */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Total</label>
              <div className="flex items-center h-10 px-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-blue-900">
                  {pagination.total} laporan
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Laporan</CardTitle>
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
              <div className="text-6xl mb-4">📄</div>
              <h3 className="text-lg font-medium text-neutral-900 mb-2">
                Tidak ada laporan
              </h3>
              <p className="text-neutral-600 mb-4">
                {search || statusFilter !== 'all'
                  ? 'Tidak ada laporan yang sesuai dengan filter Anda.'
                  : 'Anda belum membuat laporan apapun.'}
              </p>
              {(!search && statusFilter === 'all') && (
                <Button className="btn-primary">
                  Buat Laporan Pertama
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">ID</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Menu</TableHead>
                      <TableHead>Sub Menu</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Dibuat</TableHead>
                      <TableHead className="w-32">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report) => (
                      <TableRow key={report.id}>
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
                        <TableCell>{report.menu.name}</TableCell>
                        <TableCell>{report.sub_menu.name}</TableCell>
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
                            {canEditReport(report.status) && (
                              <Button variant="ghost" size="sm" className="p-2 hover:bg-green-100">
                                <Edit className="w-4 h-4 text-green-600" />
                              </Button>
                            )}
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
                                    Tindakan ini tidak dapat dibatalkan.
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
              <div className="md:hidden space-y-4">
                {reports.map((report) => (
                  <Card key={report.id} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs text-neutral-500">
                            #{report.id}
                          </span>
                          {getStatusBadge(report.status)}
                        </div>
                        <h3 className="font-medium text-neutral-900">{report.name}</h3>
                        <p className="text-sm text-neutral-600 mt-1">
                          {report.menu.name} → {report.sub_menu.name}
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
                        {canEditReport(report.status) && (
                          <Button variant="ghost" size="sm" className="p-2">
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="p-2 text-red-600">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Hapus Laporan</AlertDialogTitle>
                              <AlertDialogDescription>
                                Apakah Anda yakin ingin menghapus laporan ini?
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
                    </div>
                  </Card>
                ))}
              </div>
            </div>
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
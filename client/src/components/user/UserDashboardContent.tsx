import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Clock, CheckCircle, AlertCircle, Plus, Eye } from 'lucide-react';
import { toast } from 'sonner';
import type { User, ReportWithDetails } from '../../../../server/src/schema';

interface UserDashboardContentProps {
  user: Omit<User, 'password_hash'>;
}

interface UserStats {
  total_reports: number;
  pending_reports: number;
  resolved_reports: number;
  recent_reports: ReportWithDetails[];
}

export function UserDashboardContent({ user }: UserDashboardContentProps) {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Get user reports with basic filters
      const userReports = await trpc.reports.getUserReports.query({
        userId: user.id,
        filters: { per_page: 100 } // Get more reports for stats
      });

      // Get recent reports (last 5)
      const recentReports = await trpc.reports.getUserReports.query({
        userId: user.id,
        filters: { per_page: 5 }
      });

      const total = userReports.data.length;
      const pending = userReports.data.filter(r => r.status === 'pending').length;
      const resolved = userReports.data.filter(r => r.status === 'resolved').length;

      setStats({
        total_reports: total,
        pending_reports: pending,
        resolved_reports: resolved,
        recent_reports: recentReports.data
      });
    } catch (error) {
      console.error('Failed to load user stats:', error);
      toast.error('Gagal memuat data dashboard');
    } finally {
      setIsLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="status-pending">Menunggu</Badge>;
      case 'progress':
        return <Badge variant="secondary" className="status-progress">Proses</Badge>;
      case 'resolved':
        return <Badge variant="secondary" className="status-resolved">Selesai</Badge>;
      case 'closed':
        return <Badge variant="secondary" className="status-closed">Ditutup</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">
          Selamat datang, {user.full_name}! 👋
        </h1>
        <p className="text-neutral-600">
          Kelola dan pantau laporan bug Anda dari dashboard ini.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Laporan</CardTitle>
            <FileText className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats?.total_reports || 0}
            </div>
            <p className="text-xs text-neutral-600">
              Total laporan yang Anda buat
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Menunggu</CardTitle>
            <Clock className="w-4 h-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats?.pending_reports || 0}
            </div>
            <p className="text-xs text-neutral-600">
              Laporan sedang menunggu
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selesai</CardTitle>
            <CheckCircle className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats?.resolved_reports || 0}
            </div>
            <p className="text-xs text-neutral-600">
              Laporan telah diselesaikan
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Aksi Cepat</CardTitle>
          <CardDescription>
            Tindakan yang sering dilakukan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button className="btn-primary h-12 flex items-center gap-3">
              <Plus className="w-5 h-5" />
              Buat Laporan Baru
            </Button>
            <Button variant="outline" className="h-12 flex items-center gap-3">
              <FileText className="w-5 h-5" />
              Lihat Semua Laporan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Laporan Terbaru</CardTitle>
          <CardDescription>
            5 laporan terbaru yang Anda buat
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.recent_reports && stats.recent_reports.length > 0 ? (
            <div className="space-y-4">
              {stats.recent_reports.map((report) => (
                <div key={report.id} className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors">
                  <div className="flex-1">
                    <h4 className="font-medium text-neutral-900 mb-1">
                      {report.name}
                    </h4>
                    <div className="flex items-center gap-4 text-sm text-neutral-600">
                      <span>{report.menu.name} → {report.sub_menu.name}</span>
                      <span>•</span>
                      <span>{report.created_at.toLocaleDateString('id-ID')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(report.status)}
                    <Button variant="ghost" size="sm" className="p-2">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
              <h3 className="font-medium text-neutral-900 mb-2">
                Belum ada laporan
              </h3>
              <p className="text-neutral-600 mb-4">
                Anda belum membuat laporan bug apapun.
              </p>
              <Button className="btn-primary">
                <Plus className="w-4 h-4 mr-2" />
                Buat Laporan Pertama
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
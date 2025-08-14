import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Clock, CheckCircle, Users, TrendingUp, TrendingDown, Eye, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import type { User, DashboardStats, ReportWithDetails } from '../../../../server/src/schema';

interface AdminDashboardContentProps {
  user: Omit<User, 'password_hash'>;
}

// Stub chart component for demonstration
const StatsChart = ({ title, type, data, height = 300 }: {
  title: string;
  type: 'line' | 'doughnut';
  data: any;
  height?: number;
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-lg">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <div 
        className="flex items-center justify-center bg-neutral-100 rounded-lg text-neutral-500"
        style={{ height: `${height}px` }}
      >
        📊 Chart: {title} ({type})
        <br />
        <small className="text-xs mt-2">Chart implementation stub</small>
      </div>
    </CardContent>
  </Card>
);

export function AdminDashboardContent({ user }: AdminDashboardContentProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentReports, setRecentReports] = useState<ReportWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Load dashboard stats
      const dashboardStats = await trpc.analytics.getDashboardStats.query();
      setStats(dashboardStats);

      // Load recent reports
      const recent = await trpc.reports.getRecent.query(5);
      setRecentReports(recent);

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Gagal memuat data dashboard');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleUpdateReportStatus = async (reportId: number, status: string) => {
    try {
      await trpc.reports.update.mutate({
        id: reportId,
        status: status as any
      });
      toast.success('Status laporan berhasil diperbarui');
      loadDashboardData(); // Refresh data
    } catch (error) {
      console.error('Failed to update report status:', error);
      toast.error('Gagal memperbarui status laporan');
    }
  };

  const getStatusBadge = (status: string) => {
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

  const getChangeIndicator = (change: number) => {
    if (change > 0) {
      return (
        <div className="flex items-center text-green-600">
          <TrendingUp className="w-4 h-4 mr-1" />
          <span className="text-sm">+{change}%</span>
        </div>
      );
    } else if (change < 0) {
      return (
        <div className="flex items-center text-red-600">
          <TrendingDown className="w-4 h-4 mr-1" />
          <span className="text-sm">{change}%</span>
        </div>
      );
    }
    return (
      <div className="flex items-center text-neutral-500">
        <span className="text-sm">0%</span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {[1, 2].map((i) => (
              <div key={i} className="h-96 bg-gray-200 rounded-lg"></div>
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
          Dashboard Admin 👋
        </h1>
        <p className="text-neutral-600">
          Selamat datang kembali, {user.full_name}. Berikut ringkasan sistem Anda.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Laporan</CardTitle>
            <FileText className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 mb-1">
              {stats?.total_reports || 0}
            </div>
            {stats && getChangeIndicator(stats.reports_change)}
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Menunggu</CardTitle>
            <Clock className="w-4 h-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600 mb-1">
              {stats?.pending_reports || 0}
            </div>
            {stats && getChangeIndicator(stats.pending_change)}
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selesai</CardTitle>
            <CheckCircle className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 mb-1">
              {stats?.resolved_reports || 0}
            </div>
            {stats && getChangeIndicator(stats.resolved_change)}
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">User Aktif</CardTitle>
            <Users className="w-4 h-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600 mb-1">
              {stats?.active_users || 0}
            </div>
            {stats && getChangeIndicator(stats.users_change)}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StatsChart
          title="Laporan Seiring Waktu"
          type="line"
          data={{}}
          height={300}
        />
        <StatsChart
          title="Distribusi Status"
          type="doughnut"
          data={{}}
          height={300}
        />
      </div>

      {/* Recent Reports */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Laporan Terbaru</CardTitle>
              <CardDescription>
                5 laporan terbaru yang memerlukan perhatian
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              Lihat Semua
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentReports && recentReports.length > 0 ? (
            <div className="space-y-4">
              {recentReports.map((report) => (
                <div key={report.id} className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono text-xs text-neutral-500">
                        #{report.id}
                      </span>
                      {getStatusBadge(report.status)}
                    </div>
                    <h4 className="font-medium text-neutral-900 mb-1">
                      {report.name}
                    </h4>
                    <div className="flex items-center gap-4 text-sm text-neutral-600">
                      <span className="flex items-center gap-1">
                        <UserCheck className="w-3 h-3" />
                        {report.user.full_name}
                      </span>
                      <span>•</span>
                      <span>{report.menu.name} → {report.sub_menu.name}</span>
                      <span>•</span>
                      <span>{report.created_at.toLocaleDateString('id-ID')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Quick Status Update */}
                    <Select
                      value={report.status}
                      onValueChange={(value) => handleUpdateReportStatus(report.id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Menunggu</SelectItem>
                        <SelectItem value="progress">Proses</SelectItem>
                        <SelectItem value="resolved">Selesai</SelectItem>
                        <SelectItem value="closed">Ditutup</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="sm" className="p-2">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
              <h3 className="font-medium text-neutral-900 mb-2">
                Tidak ada laporan terbaru
              </h3>
              <p className="text-neutral-600">
                Semua laporan telah ditinjau atau belum ada laporan baru.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
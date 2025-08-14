import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BarChart3, Download, Calendar as CalendarIcon, TrendingUp, Clock, Target, Users2, FileText, PieChart, AreaChart } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { id } from 'date-fns/locale';
import { toast } from 'sonner';
import type { User, AnalyticsDateRange } from '../../../../server/src/schema';

interface AdminAnalyticsProps {
  user: Omit<User, 'password_hash'>;
}

// Stub chart component
const AnalyticsChart = ({ 
  title, 
  type, 
  height = 400, 
  data 
}: {
  title: string;
  type: 'area' | 'pie' | 'bar';
  height?: number;
  data?: any;
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        {type === 'area' && <AreaChart className="w-5 h-5" />}
        {type === 'pie' && <PieChart className="w-5 h-5" />}
        {type === 'bar' && <BarChart3 className="w-5 h-5" />}
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div 
        className="flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg text-blue-600 font-medium"
        style={{ height: `${height}px` }}
      >
        <div className="text-center">
          <div className="text-4xl mb-2">📊</div>
          <p>{title}</p>
          <p className="text-sm text-blue-500 mt-1">Chart Type: {type.toUpperCase()}</p>
          <small className="text-xs text-blue-400 mt-2 block">
            Chart implementation ready for integration
          </small>
        </div>
      </div>
    </CardContent>
  </Card>
);

export function AdminAnalytics({ user }: AdminAnalyticsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [dateRange, setDateRange] = useState<AnalyticsDateRange>({
    start_date: startOfMonth(new Date()),
    end_date: endOfMonth(new Date())
  });
  
  // Export dialog state
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | 'csv'>('pdf');
  const [exportOptions, setExportOptions] = useState({
    include_summary: true,
    include_detailed: true,
    include_charts: true
  });

  // Summary stats (stub data)
  const [summaryStats, setSummaryStats] = useState({
    total_reports: 245,
    avg_resolve_time: 3.2,
    resolution_rate: 78.5,
    most_active_users: [
      { name: 'John Doe', reports: 45 },
      { name: 'Jane Smith', reports: 38 },
      { name: 'Mike Johnson', reports: 32 }
    ]
  });

  const loadAnalytics = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Load dashboard stats
      const stats = await trpc.analytics.getDashboardStats.query();
      
      // Load other analytics data
      const reportsOvertime = await trpc.analytics.getReportsOvertime.query(dateRange);
      const statusDistribution = await trpc.analytics.getStatusDistribution.query(dateRange);
      const topMenus = await trpc.analytics.getTopMenusWithBugs.query({
        limit: 10,
        dateRange
      });
      
      // Update summary stats with real data
      setSummaryStats({
        total_reports: stats.total_reports,
        avg_resolve_time: 3.2, // Stub - would come from getAverageResolutionTime
        resolution_rate: 78.5, // Stub - would come from getResolutionRate
        most_active_users: [
          { name: 'John Doe', reports: 45 },
          { name: 'Jane Smith', reports: 38 },
          { name: 'Mike Johnson', reports: 32 }
        ]
      });

    } catch (error) {
      console.error('Failed to load analytics:', error);
      toast.error('Gagal memuat data analisis');
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const setQuickDateRange = (preset: string) => {
    const now = new Date();
    let start_date: Date;
    let end_date: Date = now;

    switch (preset) {
      case 'today':
        start_date = now;
        break;
      case 'week':
        start_date = subDays(now, 7);
        break;
      case 'month':
        start_date = startOfMonth(now);
        end_date = endOfMonth(now);
        break;
      case 'quarter':
        start_date = subDays(now, 90);
        break;
      case 'year':
        start_date = startOfYear(now);
        end_date = endOfYear(now);
        break;
      default:
        return;
    }

    setDateRange({ start_date, end_date });
  };

  const handleExport = async () => {
    try {
      setIsLoading(true);
      
      await trpc.analytics.exportData.mutate({
        format: exportFormat,
        dateRange,
        options: exportOptions
      });
      
      toast.success('Laporan berhasil diekspor!');
      setExportDialogOpen(false);
    } catch (error) {
      console.error('Failed to export analytics:', error);
      toast.error('Gagal mengekspor laporan');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Analisis Laporan</h1>
          <p className="text-neutral-600">
            Dashboard analisis dan laporan statistik sistem bug reporting.
          </p>
        </div>
        <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
          <DialogTrigger asChild>
            <Button className="btn-primary">
              <Download className="w-4 h-4 mr-2" />
              Export Laporan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Export Laporan Analisis</DialogTitle>
              <DialogDescription>
                Pilih format dan opsi untuk mengekspor laporan analisis
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              {/* Format Selection */}
              <div className="space-y-3">
                <h4 className="font-medium">Format File</h4>
                <Select value={exportFormat} onValueChange={(value: 'pdf' | 'excel' | 'csv') => setExportFormat(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF Document</SelectItem>
                    <SelectItem value="excel">Excel Spreadsheet</SelectItem>
                    <SelectItem value="csv">CSV File</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Export Options */}
              <div className="space-y-3">
                <h4 className="font-medium">Opsi Export</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="summary"
                      checked={exportOptions.include_summary}
                      onCheckedChange={(checked: boolean) =>
                        setExportOptions(prev => ({ ...prev, include_summary: checked }))
                      }
                    />
                    <label htmlFor="summary" className="text-sm">Ringkasan Statistik</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="detailed"
                      checked={exportOptions.include_detailed}
                      onCheckedChange={(checked: boolean) =>
                        setExportOptions(prev => ({ ...prev, include_detailed: checked }))
                      }
                    />
                    <label htmlFor="detailed" className="text-sm">Data Detail</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="charts"
                      checked={exportOptions.include_charts}
                      onCheckedChange={(checked: boolean) =>
                        setExportOptions(prev => ({ ...prev, include_charts: checked }))
                      }
                    />
                    <label htmlFor="charts" className="text-sm">Grafik dan Chart</label>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setExportDialogOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleExport} className="btn-primary" disabled={isLoading}>
                {isLoading ? 'Mengekspor...' : 'Download Laporan'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Date Range Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Periode Analisis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            {/* Quick presets */}
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Hari Ini', value: 'today' },
                { label: '7 Hari', value: 'week' },
                { label: 'Bulan Ini', value: 'month' },
                { label: '3 Bulan', value: 'quarter' },
                { label: 'Tahun Ini', value: 'year' }
              ].map((preset) => (
                <Button
                  key={preset.value}
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickDateRange(preset.value)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-600">Custom:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {format(dateRange.start_date, 'dd MMM yyyy', { locale: id })} - {format(dateRange.end_date, 'dd MMM yyyy', { locale: id })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={{
                      from: dateRange.start_date,
                      to: dateRange.end_date
                    }}
                    onSelect={(range) => {
                      if (range?.from && range?.to) {
                        setDateRange({
                          start_date: range.from,
                          end_date: range.to
                        });
                      }
                    }}
                    numberOfMonths={2}
                    locale={id}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Laporan</CardTitle>
            <FileText className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {summaryStats.total_reports.toLocaleString()}
            </div>
            <p className="text-xs text-neutral-600">
              Dalam periode yang dipilih
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rata-rata Resolve Time</CardTitle>
            <Clock className="w-4 h-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {summaryStats.avg_resolve_time} hari
            </div>
            <p className="text-xs text-neutral-600">
              Waktu penyelesaian rata-rata
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
            <Target className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {summaryStats.resolution_rate}%
            </div>
            <p className="text-xs text-neutral-600">
              Persentase laporan terselesaikan
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">User Teraktif</CardTitle>
            <Users2 className="w-4 h-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {summaryStats.most_active_users[0]?.name || '-'}
            </div>
            <p className="text-xs text-neutral-600">
              {summaryStats.most_active_users[0]?.reports || 0} laporan
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnalyticsChart
          title="Tren Laporan Bulanan"
          type="area"
          height={400}
        />
        <AnalyticsChart
          title="Distribusi Status"
          type="pie"
          height={400}
        />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <AnalyticsChart
          title="Top Menu dengan Bug Terbanyak"
          type="bar"
          height={300}
        />
      </div>

      {/* Most Active Users */}
      <Card>
        <CardHeader>
          <CardTitle>User Paling Aktif</CardTitle>
          <CardDescription>
            Pengguna dengan laporan terbanyak dalam periode ini
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {summaryStats.most_active_users.map((user, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
                    #{index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-neutral-900">{user.name}</p>
                    <p className="text-sm text-neutral-600">{user.reports} laporan dibuat</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="w-16 bg-neutral-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ 
                        width: `${(user.reports / summaryStats.most_active_users[0].reports) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span>Memuat data analisis...</span>
          </div>
        </div>
      )}
    </div>
  );
}
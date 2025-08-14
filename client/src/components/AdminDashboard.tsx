import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { AdminDashboardContent } from '@/components/admin/AdminDashboardContent';
import { AdminReports } from '@/components/admin/AdminReports';
import { AdminUsers } from '@/components/admin/AdminUsers';
import { AdminCategories } from '@/components/admin/AdminCategories';
import { AdminAnalytics } from '@/components/admin/AdminAnalytics';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import type { User } from '../../../server/src/schema';

interface AdminDashboardProps {
  user: Omit<User, 'password_hash'>;
  onLogout: () => void;
}

export function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const [activeRoute, setActiveRoute] = useState('/admin/dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const renderContent = () => {
    switch (activeRoute) {
      case '/admin/dashboard':
        return <AdminDashboardContent user={user} />;
      case '/admin/reports':
        return <AdminReports user={user} />;
      case '/admin/users':
        return <AdminUsers user={user} />;
      case '/admin/categories':
        return <AdminCategories user={user} />;
      case '/admin/analytics':
        return <AdminAnalytics user={user} />;
      default:
        return <AdminDashboardContent user={user} />;
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      {/* Sidebar */}
      <Sidebar
        user={user}
        activeRoute={activeRoute}
        onRouteChange={setActiveRoute}
        onLogout={onLogout}
        isMobile={isMobile}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        {isMobile && (
          <div className="bg-white border-b border-neutral-200 p-4 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-xl">⚙️</span>
              <h1 className="font-bold text-blue-900">Admin Panel</h1>
            </div>
            <div className="w-9" /> {/* Spacer for centering */}
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { UserDashboardContent } from '@/components/user/UserDashboardContent';
import { AddReportForm } from '@/components/user/AddReportForm';
import { UserReports } from '@/components/user/UserReports';
import { UserProfile } from '@/components/user/UserProfile';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import type { User } from '../../../server/src/schema';

interface UserDashboardProps {
  user: Omit<User, 'password_hash'>;
  onLogout: () => void;
}

export function UserDashboard({ user, onLogout }: UserDashboardProps) {
  const [activeRoute, setActiveRoute] = useState('/dashboard');
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
      case '/dashboard':
        return <UserDashboardContent user={user} />;
      case '/add-report':
        return <AddReportForm user={user} onReportCreated={() => setActiveRoute('/reports')} />;
      case '/reports':
        return <UserReports user={user} />;
      case '/profile':
        return <UserProfile user={user} />;
      default:
        return <UserDashboardContent user={user} />;
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
              <span className="text-xl">🐛</span>
              <h1 className="font-bold text-blue-900">Bug Reporter</h1>
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
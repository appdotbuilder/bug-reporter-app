import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Home, 
  Plus, 
  FileText, 
  User as UserIcon, 
  LogOut, 
  Settings, 
  Bug, 
  Users, 
  Folder, 
  BarChart3,
  Menu,
  X
} from 'lucide-react';
import type { User } from '../../../server/src/schema';

interface SidebarProps {
  user: Omit<User, 'password_hash'>;
  activeRoute: string;
  onRouteChange: (route: string) => void;
  onLogout: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  badge?: string | number;
}

export function Sidebar({ 
  user, 
  activeRoute, 
  onRouteChange, 
  onLogout, 
  isCollapsed = false, 
  onToggleCollapse,
  isMobile = false,
  isOpen = false,
  onClose
}: SidebarProps) {
  const isAdmin = user.role === 'admin';

  const userNavItems: NavItem[] = [
    { label: 'Dashboard', icon: Home, path: '/dashboard' },
    { label: 'Buat Laporan', icon: Plus, path: '/add-report' },
    { label: 'Data Laporan', icon: FileText, path: '/reports' },
    { label: 'Profil', icon: UserIcon, path: '/profile' },
  ];

  const adminNavItems: NavItem[] = [
    { label: 'Dashboard', icon: Home, path: '/admin/dashboard' },
    { label: 'Laporan Bug', icon: Bug, path: '/admin/reports', badge: '5' },
    { label: 'User Management', icon: Users, path: '/admin/users' },
    { label: 'Category Management', icon: Folder, path: '/admin/categories' },
    { label: 'Analytics', icon: BarChart3, path: '/admin/analytics' },
  ];

  const navItems = isAdmin ? adminNavItems : userNavItems;

  const handleNavClick = (path: string) => {
    onRouteChange(path);
    if (isMobile && onClose) {
      onClose();
    }
  };

  const sidebarClasses = `
    ${isMobile ? 'fixed' : 'relative'} 
    ${isMobile ? (isOpen ? 'translate-x-0' : '-translate-x-full') : ''} 
    ${isCollapsed && !isMobile ? 'w-16' : 'w-64'} 
    bg-white border-r border-neutral-200 min-h-screen transition-all duration-300 z-40
    ${isMobile ? 'left-0 top-0' : ''}
  `;

  return (
    <>
      {/* Mobile backdrop */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={onClose}
        />
      )}

      <div className={sidebarClasses}>
        {/* Header */}
        <div className="p-4 border-b border-neutral-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{isAdmin ? '⚙️' : '🐛'}</span>
              {(!isCollapsed || isMobile) && (
                <div className="font-bold text-lg text-blue-900">
                  {isAdmin ? 'Admin Panel' : 'Bug Reporter'}
                </div>
              )}
            </div>
            {isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="p-1"
              >
                <X className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.path}>
                <Button
                  variant={activeRoute === item.path ? "default" : "ghost"}
                  className={`
                    w-full justify-start gap-3 h-10
                    ${activeRoute === item.path 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'hover:bg-neutral-100 text-neutral-700'
                    }
                    ${isCollapsed && !isMobile ? 'px-2' : 'px-3'}
                  `}
                  onClick={() => handleNavClick(item.path)}
                >
                  <item.icon className={`${isCollapsed && !isMobile ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0`} />
                  {(!isCollapsed || isMobile) && (
                    <span className="flex-1 text-left">{item.label}</span>
                  )}
                  {(!isCollapsed || isMobile) && item.badge && (
                    <Badge variant="secondary" className="ml-auto">
                      {item.badge}
                    </Badge>
                  )}
                </Button>
              </li>
            ))}
          </ul>
        </nav>

        {/* User Info & Logout */}
        <div className="border-t border-neutral-200 p-4">
          {(!isCollapsed || isMobile) && (
            <div className="mb-4">
              <div className="flex items-center gap-3 p-2">
                <Avatar className="w-8 h-8">
                  <AvatarImage 
                    src={user.avatar_url || '/default-avatar.png'} 
                    alt={user.full_name}
                  />
                  <AvatarFallback>
                    {user.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 truncate">
                    {user.full_name}
                  </p>
                  <p className="text-xs text-neutral-600">
                    {isAdmin ? 'Administrator' : 'Reporter'}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <Button
            variant="ghost"
            className={`
              w-full justify-start gap-3 text-red-600 hover:text-red-700 hover:bg-red-50
              ${isCollapsed && !isMobile ? 'px-2' : 'px-3'}
            `}
            onClick={onLogout}
          >
            <LogOut className={`${isCollapsed && !isMobile ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0`} />
            {(!isCollapsed || isMobile) && <span>Keluar</span>}
          </Button>
        </div>
      </div>
    </>
  );
}
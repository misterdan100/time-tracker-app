import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  UserCircle,
  Download,
  Upload,
  Plus,
  LogOut,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { Button } from '../ui/button';
import Logo from '../Logo';
import ThemeToggle from './ThemeToggle';
import { cn } from '../../lib/utils';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  onOpenTimeEntry: () => void;
  open: boolean;
  onClose: () => void;
}

const COLLAPSE_KEY = 'sidebar-collapsed';

const Sidebar: React.FC<SidebarProps> = ({ onOpenTimeEntry, open, onClose }) => {
  const location = useLocation();
  const { exportData, importData } = useApp();
  const { logout } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Colapso solo en desktop (icono-only). Persistido en localStorage.
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(COLLAPSE_KEY) === 'true';
  });

  useEffect(() => {
    window.localStorage.setItem(COLLAPSE_KEY, String(collapsed));
  }, [collapsed]);

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          importData(data);
        } catch (error) {
          console.error('Error parsing JSON:', error);
          alert('Error importing the file. Make sure it is a valid JSON.');
        }
      };
      reader.readAsText(file);
    }
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/clients', label: 'Clients', icon: Users },
    { path: '/projects', label: 'Projects', icon: Building2 },
    { path: '/invoices', label: 'Invoices', icon: FileText },
  ];

  return (
    <>
      {/* Backdrop on mobile when drawer is open */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex h-screen shrink-0 flex-col bg-card p-3 transition-[transform,width] duration-200 ease-in-out',
          'lg:static lg:m-3 lg:h-auto lg:translate-x-0 lg:rounded-2xl lg:border lg:border-border/60 lg:shadow-soft',
          collapsed ? 'w-64 lg:w-20' : 'w-64',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header: logo + toggle */}
        <div
          className={cn(
            'mb-7 flex items-center gap-2 px-1 pb-2 pt-3',
            collapsed ? 'lg:justify-center' : 'justify-between'
          )}
        >
          <Link
            to="/"
            onClick={onClose}
            className={cn('flex items-center', collapsed && 'lg:hidden')}
          >
            <Logo variant="full" className="h-9 w-auto" />
          </Link>
          {/* Logo compacto cuando está colapsado (solo desktop) */}
          {collapsed && (
            <Link to="/" className="hidden lg:flex">
              <Logo variant="mark" className="h-9 w-9" />
            </Link>
          )}

          {/* Toggle colapso (desktop) */}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'hidden h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground lg:flex',
              collapsed && 'lg:hidden'
            )}
          >
            <PanelLeftClose className="h-5 w-5" />
          </button>

          {/* Cerrar drawer (móvil) */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close menu"
            className="shrink-0 lg:hidden"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Botón expandir cuando está colapsado */}
        {collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            aria-label="Expand sidebar"
            className="mb-3 hidden h-9 w-9 items-center justify-center self-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground lg:flex"
          >
            <PanelLeftOpen className="h-5 w-5" />
          </button>
        )}

        {/* CTA protagónico: Log Time */}
        <Button
          onClick={() => {
            onOpenTimeEntry();
            onClose();
          }}
          className={cn(
            'mb-5 h-11 w-full justify-start gap-2',
            collapsed && 'lg:w-11 lg:justify-center lg:self-center lg:px-0'
          )}
          aria-label="Log Time"
        >
          <Plus className="h-5 w-5 shrink-0" />
          <span className={cn(collapsed && 'lg:hidden')}>Log Time</span>
        </Button>

        {/* Navegación */}
        <nav className="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors',
                  collapsed && 'lg:justify-center lg:px-0',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className={cn(collapsed && 'lg:hidden')}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Toggle de tema */}
        <div className="mb-2 border-t border-border/60 pt-4">
          <ThemeToggle collapsed={collapsed} />
        </div>

        {/* Acciones inferiores */}
        <div className="space-y-1.5 border-t border-border/60 pt-4">
          <Link
            to="/profile"
            onClick={onClose}
            title={collapsed ? 'Profile' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors',
              collapsed && 'lg:justify-center lg:px-0',
              location.pathname === '/profile'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <UserCircle className="h-5 w-5 shrink-0" />
            <span className={cn(collapsed && 'lg:hidden')}>Profile</span>
          </Link>
          <Button
            onClick={exportData}
            variant="ghost"
            title={collapsed ? 'Export JSON' : undefined}
            className={cn(
              'h-10 gap-2 text-muted-foreground',
              collapsed ? 'lg:w-10 lg:justify-center lg:self-center lg:px-0' : 'w-full justify-start'
            )}
          >
            <Download className="h-4 w-4 shrink-0" />
            <span className={cn(collapsed && 'lg:hidden')}>Export JSON</span>
          </Button>
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="ghost"
            title={collapsed ? 'Import JSON' : undefined}
            className={cn(
              'h-10 gap-2 text-muted-foreground',
              collapsed ? 'lg:w-10 lg:justify-center lg:self-center lg:px-0' : 'w-full justify-start'
            )}
          >
            <Upload className="h-4 w-4 shrink-0" />
            <span className={cn(collapsed && 'lg:hidden')}>Import JSON</span>
          </Button>
          <Button
            onClick={logout}
            variant="ghost"
            title={collapsed ? 'Logout' : undefined}
            className={cn(
              'h-10 gap-2 text-destructive hover:text-destructive',
              collapsed ? 'lg:w-10 lg:justify-center lg:self-center lg:px-0' : 'w-full justify-start'
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className={cn(collapsed && 'lg:hidden')}>Logout</span>
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

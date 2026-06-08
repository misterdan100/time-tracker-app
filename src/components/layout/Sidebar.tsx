import React, { useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Building2, Download, Upload, Plus, LogOut } from 'lucide-react';
import { Button } from '../ui/button';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  onOpenTimeEntry: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onOpenTimeEntry }) => {
  const location = useLocation();
  const { exportData, importData } = useApp();
  const { logout } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  ];

  return (
    <aside className="w-64 bg-card border-r border-border p-4 flex flex-col">
      <div className="mb-8 text-center">
        <h1 className="text-xl font-bold text-foreground">Daniel Arq</h1>
        <p className="text-sm text-muted-foreground">Time Tracker</p>
      </div>

      <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="space-y-2 pt-4 border-t border-border">
        <Button
          onClick={onOpenTimeEntry}
          className="w-full justify-start gap-2"
        >
          <Plus className="w-4 h-4" />
          Log Time
        </Button>
        <Button
          onClick={exportData}
          variant="outline"
          className="w-full justify-start gap-2"
        >
          <Download className="w-4 h-4" />
          Export JSON
        </Button>
        <Button
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
          className="w-full justify-start gap-2"
        >
          <Upload className="w-4 h-4" />
          Import JSON
        </Button>
        <Button
          onClick={logout}
          variant="outline"
          className="w-full justify-start gap-2 text-destructive hover:text-destructive"
        >
          <LogOut className="w-4 h-4" />
          Logout
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
  );
};

export default Sidebar;

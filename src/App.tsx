import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/layout/Sidebar';
import { Button } from './components/ui/button';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import ClientDetail from './pages/ClientDetail';
import LoginPage from './pages/LoginPage';
import TimeEntryDialog from './components/dialogs/TimeEntryDialog';
import { Toaster } from 'sonner';

function AppContent() {
  const { projects, addTimeEntry } = useApp();
  const { isAuthenticated, loading } = useAuth();
  const [timeEntryOpen, setTimeEntryOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        onOpenTimeEntry={() => setTimeEntryOpen(true)}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3 lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-bold text-foreground">Daniel Arq</span>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/client/:id" element={<ClientDetail />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/project/:id" element={<ProjectDetail />} />
          </Routes>
        </main>
      </div>
      <TimeEntryDialog
        open={timeEntryOpen}
        onOpenChange={setTimeEntryOpen}
        onSave={addTimeEntry}
        projects={projects}
      />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
        <Toaster richColors position="top-right" />
      </AppProvider>
    </AuthProvider>
  );
}

export default App;

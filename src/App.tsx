import { useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import Sidebar from './components/layout/Sidebar';
import Logo from './components/Logo';
import { Button } from './components/ui/button';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import ClientDetail from './pages/ClientDetail';
import Invoices from './pages/Invoices';
import InvoiceDetail from './pages/InvoiceDetail';
import Profile from './pages/Profile';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import TimeEntryDialog from './components/dialogs/TimeEntryDialog';
import { Toaster } from 'sonner';

/**
 * Rendered outside the app shell. /reset-password also takes over when a session
 * exists, since the recovery link signs the user in before they pick a password.
 */
const AUTH_ROUTES = ['/forgot-password', '/reset-password'];

function AppContent() {
  const { projects, addTimeEntry } = useApp();
  const { isAuthenticated, loading } = useAuth();
  const { pathname } = useLocation();
  const [timeEntryOpen, setTimeEntryOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated || AUTH_ROUTES.includes(pathname)) {
    return (
      <Routes>
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        onOpenTimeEntry={() => setTimeEntryOpen(true)}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden p-3 pl-0 max-lg:pl-3">
        <main className="flex flex-1 flex-col gap-4 overflow-y-auto">
          {/* Header solo en móvil para abrir el sidebar */}
          <header className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card px-3 py-2 shadow-soft lg:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Logo variant="full" className="h-7 w-auto" />
          </header>
          <div className="mx-auto w-full max-w-6xl flex-1 px-1 pb-6 pt-2 lg:pt-4">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/client/:id" element={<ClientDetail />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/project/:id" element={<ProjectDetail />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/invoice/:id" element={<InvoiceDetail />} />
              <Route path="/profile" element={<Profile />} />
            </Routes>
          </div>
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

function ThemedToaster() {
  const { theme } = useTheme();
  return <Toaster richColors position="top-right" theme={theme} />;
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppProvider>
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
          <ThemedToaster />
        </AppProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

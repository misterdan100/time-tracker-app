import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import ClientDetail from './pages/ClientDetail';
import LoginPage from './pages/LoginPage';
import TimeEntryDialog from './components/dialogs/TimeEntryDialog';

function AppContent() {
  const { projects, addTimeEntry } = useApp();
  const { isAuthenticated } = useAuth();
  const [timeEntryOpen, setTimeEntryOpen] = useState(false);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar onOpenTimeEntry={() => setTimeEntryOpen(true)} />
      <main className="flex-1 p-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/client/:id" element={<ClientDetail />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/project/:id" element={<ProjectDetail />} />
        </Routes>
      </main>
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
      </AppProvider>
    </AuthProvider>
  );
}

export default App;

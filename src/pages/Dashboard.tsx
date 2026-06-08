import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Clock, Building2, Users, Calendar, Sparkles } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval, startOfWeek, endOfWeek, eachDayOfInterval, parseISO } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const motivationalQuotes = [
  "Lo estas haciendo muy bien",
  "Resuelve una cosa a la vez",
  "Eres muy inteligente y capaz",
];

const Dashboard: React.FC = () => {
  const { clients, projects, timeEntries } = useApp();

  // Get daily motivational quote based on date
  const getDailyQuote = () => {
    const now = new Date();
    const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
    const quoteIndex = dayOfYear % motivationalQuotes.length;
    return motivationalQuotes[quoteIndex];
  };

  // Calcular horas este mes
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const hoursThisMonth = timeEntries
    .filter((entry) => {
      const entryDate = new Date(entry.date);
      return isWithinInterval(entryDate, { start: monthStart, end: monthEnd });
    })
    .reduce((sum, entry) => sum + entry.hours, 0);

  // Últimos 5 registros de tiempo
  const recentEntries = [...timeEntries]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const getProjectName = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    return project?.name || 'Unknown Project';
  };

  const getClientName = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    const client = clients.find((c) => c.id === project?.clientId);
    return client?.companyName || 'Unknown Client';
  };

  const getProjectColor = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    return project?.color || '#3b82f6';
  };

  // Calcular horas por día de la semana actual
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Lunes como inicio
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const weeklyData = daysOfWeek.map((day) => {
    const dayEntries = timeEntries.filter((entry) => {
      const entryDate = parseISO(entry.date);
      return entryDate.toDateString() === day.toDateString();
    });
    const totalHours = dayEntries.reduce((sum, entry) => sum + entry.hours, 0);
    return {
      day: format(day, 'EEE', { locale: enUS }),
      hours: totalHours,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Activity Overview</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg border border-primary/20">
          <Sparkles className="w-5 h-5 text-primary" />
          <p className="text-sm font-medium text-primary">{getDailyQuote()}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{hoursThisMonth.toFixed(2)}h</div>
                <p className="text-xs text-muted-foreground">This month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Clients</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{clients.length}</div>
                <p className="text-xs text-muted-foreground">Registered</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Projects</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{projects.length}</div>
                <p className="text-xs text-muted-foreground">Active</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Entries</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{timeEntries.length}</div>
                <p className="text-xs text-muted-foreground">Total</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Time by Day (This Week)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip
                formatter={(value: any) => [`${Number(value).toFixed(2)}h`, 'Hours']}
              />
              <Bar dataKey="hours" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Time Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {recentEntries.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No time entries yet
            </p>
          ) : (
            <div className="space-y-4">
              {recentEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: `${getProjectColor(entry.projectId)}20` }}>
                      <Calendar className="h-4 w-4" style={{ color: getProjectColor(entry.projectId) }} />
                    </div>
                    <div>
                      <Link
                        to={`/project/${entry.projectId}`}
                        className="font-medium hover:underline text-primary"
                      >
                        {getProjectName(entry.projectId)}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {getClientName(entry.projectId)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{entry.hours}h</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(entry.date), 'dd/MM/yyyy', { locale: enUS })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;

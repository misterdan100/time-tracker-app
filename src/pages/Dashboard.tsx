import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Button } from '../components/ui/button';
import StatCard from '../components/dashboard/StatCard';
import ActivityCard from '../components/dashboard/ActivityCard';
import { Clock, Building2, Users, Calendar, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval, startOfWeek, endOfWeek, eachDayOfInterval, parseISO, addWeeks } from 'date-fns';
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
    return project?.color || '#4285F4';
  };

  // Navegación de semanas (0 = semana actual, negativo = semanas anteriores)
  const [weekOffset, setWeekOffset] = useState(0);
  const referenceDate = addWeeks(now, weekOffset);
  const weekStart = startOfWeek(referenceDate, { weekStartsOn: 1 }); // Lunes como inicio
  const weekEnd = endOfWeek(referenceDate, { weekStartsOn: 1 });
  const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const weekRangeLabel = `${format(weekStart, 'MMM d', { locale: enUS })} – ${format(weekEnd, 'MMM d, yyyy', { locale: enUS })}`;

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
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Activity Overview</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 dark:border-green-500/30 dark:bg-green-500/10">
          <Sparkles className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
          <p className="text-sm font-semibold text-green-800 dark:text-green-300">{getDailyQuote()}</p>
        </div>
      </div>

      {/* Stat cards — métricas reales */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          tint="blue"
          icon={Clock}
          label="Hours this month"
          value={`${hoursThisMonth.toFixed(1)}h`}
        />
        <StatCard
          tint="beige"
          icon={Building2}
          label="Clients"
          value={clients.length}
        />
        <StatCard
          tint="green"
          icon={Users}
          label="Projects"
          value={projects.length}
        />
        <StatCard
          tint="orange"
          icon={Calendar}
          label="Time entries"
          value={timeEntries.length}
        />
      </div>

      {/* Chart */}
      <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-soft sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-foreground">Time by Day</h2>
            <p className="text-sm text-muted-foreground">
              {weekOffset === 0 ? `This week · ${weekRangeLabel}` : weekRangeLabel}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => setWeekOffset((o) => o - 1)}
              aria-label="Previous week"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => setWeekOffset((o) => Math.min(0, o + 1))}
              disabled={weekOffset >= 0}
              aria-label="Next week"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={weeklyData} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <Tooltip
              cursor={{ fill: 'hsl(var(--accent))' }}
              contentStyle={{
                borderRadius: 12,
                border: '1px solid hsl(var(--border))',
                backgroundColor: 'hsl(var(--card))',
                color: 'hsl(var(--foreground))',
                boxShadow: '0 10px 30px rgba(0,0,0,.12)',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              itemStyle={{ color: 'hsl(var(--foreground))' }}
              formatter={(value: any) => [`${Number(value).toFixed(2)}h`, 'Hours']}
            />
            <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} maxBarSize={48} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Activity */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Recent Activity</h2>
          <Link
            to="/projects"
            className="text-sm font-semibold text-green-700 hover:text-green-800 hover:underline dark:text-green-400 dark:hover:text-green-300"
          >
            View All
          </Link>
        </div>
        {recentEntries.length === 0 ? (
          <div className="rounded-2xl border border-border/60 bg-card p-8 text-center text-muted-foreground shadow-soft">
            No time entries yet
          </div>
        ) : (
          <div className="space-y-3">
            {recentEntries.map((entry) => (
              <ActivityCard
                key={entry.id}
                date={new Date(entry.date)}
                title={getProjectName(entry.projectId)}
                subtitle={getClientName(entry.projectId)}
                hours={entry.hours}
                accent={getProjectColor(entry.projectId)}
                to={`/project/${entry.projectId}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

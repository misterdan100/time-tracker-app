import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { UserMinus, UserPlus, UsersRound } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { useApp } from '../../context/AppContext';

interface ProjectTeamCardProps {
  projectId: string;
}

interface TeamRow {
  userId: string;
  name: string;
  active: boolean;
  assigned: boolean;
  hours: number;
}

/**
 * Admin-only card on a project: who is assigned, how many hours each member logged here,
 * and controls to assign or remove people. Team hours are informational only.
 */
const ProjectTeamCard: React.FC<ProjectTeamCardProps> = ({ projectId }) => {
  const { teamMembers, assignments, teamEntries, assignProject, unassignProject } = useApp();
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<TeamRow | null>(null);

  const rows = useMemo<TeamRow[]>(() => {
    const assigned = new Set(
      assignments.filter((a) => a.projectId === projectId).map((a) => a.userId)
    );
    const hours = new Map<string, number>();
    for (const e of teamEntries) {
      if (e.projectId === projectId) hours.set(e.userId, (hours.get(e.userId) ?? 0) + e.hours);
    }
    return teamMembers
      .filter((m) => assigned.has(m.userId) || hours.has(m.userId))
      .map((m) => ({
        userId: m.userId,
        name: m.displayName || 'Unnamed member',
        active: m.active,
        assigned: assigned.has(m.userId),
        hours: hours.get(m.userId) ?? 0,
      }))
      .sort((a, b) => Number(b.assigned) - Number(a.assigned) || a.name.localeCompare(b.name));
  }, [teamMembers, assignments, teamEntries, projectId]);

  const available = teamMembers.filter(
    (m) => m.active && !rows.some((r) => r.userId === m.userId && r.assigned)
  );
  const teamHours = rows.reduce((sum, r) => sum + r.hours, 0);

  const handleAssign = async () => {
    if (!selected) return;
    setBusy(true);
    const ok = await assignProject(projectId, selected);
    setBusy(false);
    if (ok) setSelected('');
  };

  const confirmRemove = async () => {
    if (!removeTarget) return;
    setBusy(true);
    const ok = await unassignProject(projectId, removeTarget.userId);
    setBusy(false);
    if (ok) setRemoveTarget(null);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <UsersRound className="h-5 w-5 text-muted-foreground" />
          Team
        </CardTitle>
        {teamHours > 0 && (
          <span className="text-sm text-muted-foreground">
            Team hours: <span className="font-semibold text-foreground">{teamHours.toFixed(2)}h</span>
          </span>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {teamMembers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You have no team members yet.{' '}
            <Link to="/admin" className="link font-medium">
              Add people from the Team page
            </Link>
            .
          </p>
        ) : (
          <>
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No one is assigned to this project yet.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {rows.map((row) => (
                  <li key={row.userId} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="truncate font-medium text-foreground">{row.name}</span>
                      {!row.assigned && <Badge tone="neutral">Not assigned</Badge>}
                      {!row.active && <Badge tone="warning">Deactivated</Badge>}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-sm tabular-nums text-muted-foreground">
                        {row.hours.toFixed(2)}h
                      </span>
                      {row.assigned && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove ${row.name} from this project`}
                          onClick={() => setRemoveTarget(row)}
                          disabled={busy}
                        >
                          <UserMinus className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {available.length > 0 && (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Select value={selected} onValueChange={setSelected} disabled={busy}>
                  <SelectTrigger className="sm:flex-1" aria-label="Team member to assign">
                    <SelectValue placeholder="Choose a team member" />
                  </SelectTrigger>
                  <SelectContent>
                    {available.map((m) => (
                      <SelectItem key={m.userId} value={m.userId}>
                        {m.displayName || 'Unnamed member'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleAssign} disabled={!selected || busy} className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Assign
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>

      <Dialog open={!!removeTarget} onOpenChange={(open) => !open && !busy && setRemoveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove from project?</DialogTitle>
            <DialogDescription>
              <span className="font-semibold text-foreground">{removeTarget?.name}</span> will no
              longer be able to log hours on this project.
              {removeTarget && removeTarget.hours > 0
                ? ` The ${removeTarget.hours.toFixed(2)}h they already logged are kept and stay visible to them (read-only).`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRemoveTarget(null)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmRemove} disabled={busy}>
              {busy ? 'Removing…' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ProjectTeamCard;

import React, { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import ProjectStatusBadge from '../project/ProjectStatusBadge';
import { useApp } from '../../context/AppContext';
import { ProjectStatus } from '../../types';

export interface MemberProjectsTarget {
  userId: string;
  name: string;
}

interface MemberProjectsDialogProps {
  /** The member whose projects are edited; null closes the dialog. */
  member: MemberProjectsTarget | null;
  onClose: () => void;
}

const STATUS_ORDER: Record<ProjectStatus, number> = { Active: 0, Paused: 1, Completed: 2 };

/** Checklist of the admin's projects to open (or close) to one team member at once. */
const MemberProjectsDialog: React.FC<MemberProjectsDialogProps> = ({ member, onClose }) => {
  const { projects, assignments, teamEntries, setMemberProjects } = useApp();
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!member) return;
    setSelected(
      new Set(assignments.filter((a) => a.userId === member.userId).map((a) => a.projectId))
    );
    setQuery('');
    setSaving(false);
    // Only when the dialog opens for a member; later assignment changes come from this dialog.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member]);

  const hoursByProject = useMemo(() => {
    const map = new Map<string, number>();
    if (!member) return map;
    for (const e of teamEntries) {
      if (e.userId === member.userId) map.set(e.projectId, (map.get(e.projectId) ?? 0) + e.hours);
    }
    return map;
  }, [teamEntries, member]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.city.toLowerCase().includes(q))
      .sort(
        (a, b) =>
          (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9) ||
          a.name.localeCompare(b.name)
      );
  }, [projects, query]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleSave = async () => {
    if (!member) return;
    setSaving(true);
    const ok = await setMemberProjects(member.userId, Array.from(selected));
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Dialog open={!!member} onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Projects for {member?.name}</DialogTitle>
          <DialogDescription>
            They can log hours on the checked projects. Unchecking one keeps the hours already
            logged there (read-only for them).
          </DialogDescription>
        </DialogHeader>

        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">You have no projects yet.</p>
        ) : (
          <div className="space-y-3">
            {projects.length > 6 && (
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search projects"
                  className="pl-9"
                  aria-label="Search projects"
                />
              </div>
            )}
            <ul className="max-h-[50vh] divide-y divide-border overflow-y-auto rounded-card border border-border">
              {visible.map((p) => {
                const hours = hoursByProject.get(p.id) ?? 0;
                return (
                  <li key={p.id}>
                    <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-accent">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-primary"
                        checked={selected.has(p.id)}
                        onChange={() => toggle(p.id)}
                        disabled={saving}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-foreground">{p.name}</span>
                        {p.city && (
                          <span className="block truncate text-xs text-muted-foreground">
                            {p.city}
                          </span>
                        )}
                      </span>
                      {hours > 0 && (
                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                          {hours.toFixed(2)}h
                        </span>
                      )}
                      <ProjectStatusBadge status={p.status} />
                    </label>
                  </li>
                );
              })}
              {visible.length === 0 && (
                <li className="px-3 py-4 text-center text-sm text-muted-foreground">
                  No projects match.
                </li>
              )}
            </ul>
            <p className="text-xs text-muted-foreground">
              {selected.size} {selected.size === 1 ? 'project' : 'projects'} selected · only
              Active projects appear in their Log Time list
            </p>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || projects.length === 0}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MemberProjectsDialog;

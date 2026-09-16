import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { endOfMonth, format, isWithinInterval, parseISO, startOfMonth } from 'date-fns';
import {
  Ban,
  Building2,
  Eye,
  KeyRound,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Trash2,
  UserCheck,
  UserPlus,
  UsersRound,
} from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Callout } from '../components/ui/callout';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { SortableHead } from '../components/ui/sortable-head';
import MemberDialog from '../components/dialogs/MemberDialog';
import SetPasswordDialog from '../components/dialogs/SetPasswordDialog';
import MemberProjectsDialog, {
  type MemberProjectsTarget,
} from '../components/dialogs/MemberProjectsDialog';
import { useApp } from '../context/AppContext';
import { adminApi, errorMessage } from '../lib/adminApi';
import { dateSortValue, SortAccessors, useSort } from '../lib/sort';
import { DISPLAY_NAME_MAX_LENGTH, type AdminUser } from '../../api/_contract';

type TeamSortKey = 'name' | 'status' | 'lastSignIn' | 'projects' | 'hours';

const displayName = (u: AdminUser) => u.membership?.displayName || u.email;

const fmtSignIn = (iso: string | null) => {
  if (!iso) return 'Never';
  try {
    return format(parseISO(iso), 'MMM d, yyyy · HH:mm');
  } catch {
    return iso;
  }
};

const AdminTeam: React.FC = () => {
  const navigate = useNavigate();
  const { viewAs, startViewAs, stopViewAs, assignments, teamEntries, refreshData } = useApp();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [projectsTarget, setProjectsTarget] = useState<MemberProjectsTarget | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<AdminUser | null>(null);
  const [renameTarget, setRenameTarget] = useState<AdminUser | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [activeTarget, setActiveTarget] = useState<AdminUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const { users: list } = await adminApi.list();
      setUsers(list);
    } catch (err) {
      setLoadError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const members = useMemo(() => users.filter((u) => !u.isSelf), [users]);

  // Hours this month per member (team hours are loaded by AppContext through the lead's RLS access).
  const hoursByUser = useMemo(() => {
    const now = new Date();
    const interval = { start: startOfMonth(now), end: endOfMonth(now) };
    const totals: Record<string, number> = {};
    for (const e of teamEntries) {
      if (!isWithinInterval(new Date(e.date), interval)) continue;
      totals[e.userId] = (totals[e.userId] ?? 0) + e.hours;
    }
    return totals;
  }, [teamEntries]);

  const projectCountByUser = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of assignments) counts[a.userId] = (counts[a.userId] ?? 0) + 1;
    return counts;
  }, [assignments]);

  // Keep AppContext's team data (names, status, hours) in sync after account changes.
  const afterTeamChange = () => {
    refreshData();
  };

  const accessors = useMemo<SortAccessors<AdminUser, TeamSortKey>>(
    () => ({
      name: (u) => displayName(u),
      status: (u) => (u.isSelf ? 0 : u.membership?.active ? 1 : 2),
      lastSignIn: (u) => dateSortValue(u.lastSignInAt),
      projects: (u) => (u.isSelf ? -1 : projectCountByUser[u.id] ?? 0),
      hours: (u) => hoursByUser[u.id] ?? 0,
    }),
    [hoursByUser, projectCountByUser]
  );
  const { sort, toggle, sorted } = useSort(users, accessors, { key: 'status', dir: 'asc' });

  const replaceUser = (next: AdminUser) =>
    setUsers((prev) => prev.map((u) => (u.id === next.id ? next : u)));

  const handleViewAs = (u: AdminUser) => {
    startViewAs({ userId: u.id, name: displayName(u) });
    navigate('/');
  };

  const openRename = (u: AdminUser) => {
    setRenameValue(u.membership?.displayName ?? '');
    setRenameTarget(u);
  };

  const confirmRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTarget) return;
    setBusy(true);
    try {
      const { user } = await adminApi.rename(renameTarget.id, renameValue);
      replaceUser(user);
      afterTeamChange();
      toast.success('Name updated');
      setRenameTarget(null);
    } catch (err) {
      toast.error('Could not rename', { description: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const confirmSetActive = async () => {
    if (!activeTarget) return;
    const nextActive = !activeTarget.membership?.active;
    setBusy(true);
    try {
      const { user } = await adminApi.setActive(activeTarget.id, nextActive);
      replaceUser(user);
      afterTeamChange();
      toast.success(nextActive ? 'Account reactivated' : 'Account deactivated');
      setActiveTarget(null);
    } catch (err) {
      toast.error('Could not update the account', { description: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const openDelete = (u: AdminUser) => {
    setDeleteConfirm('');
    setDeleteTarget(u);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await adminApi.remove(deleteTarget.id, deleteConfirm);
      if (viewAs?.userId === deleteTarget.id) stopViewAs();
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      afterTeamChange();
      toast.success('Account deleted');
      setDeleteTarget(null);
    } catch (err) {
      toast.error('Could not delete the account', { description: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const deleteMatches =
    !!deleteTarget && deleteConfirm.trim().toLowerCase() === deleteTarget.email.toLowerCase();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        subtitle="Accounts for the people who work with you"
        leading={<UsersRound className="h-7 w-7 shrink-0 text-muted-foreground" />}
        actions={
          <Button onClick={() => setCreateOpen(true)} className="w-full gap-2 sm:w-auto">
            <UserPlus className="h-4 w-4" />
            Add member
          </Button>
        }
      />

      {loadError && (
        <Callout
          tone="warning"
          action={
            <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={load}>
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          }
        >
          Could not load the team: {loadError}
        </Callout>
      )}

      {!loading && !loadError && members.length === 0 && (
        <Callout tone="info">
          No team members yet. Add an account for each person who works for you, then open
          Projects in their menu to choose what they can log hours on.
        </Callout>
      )}

      <div className="surface overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead sortKey="name" sort={sort} onSort={toggle}>
                Name
              </SortableHead>
              <SortableHead sortKey="status" sort={sort} onSort={toggle}>
                Status
              </SortableHead>
              <SortableHead
                sortKey="lastSignIn"
                sort={sort}
                onSort={toggle}
                className="hidden md:table-cell"
              >
                Last sign-in
              </SortableHead>
              <SortableHead
                sortKey="projects"
                sort={sort}
                onSort={toggle}
                className="hidden lg:table-cell"
              >
                Projects
              </SortableHead>
              <SortableHead
                sortKey="hours"
                sort={sort}
                onSort={toggle}
                className="hidden sm:table-cell"
              >
                Hours this month
              </SortableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Loading team…
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((u) => {
                const active = !!u.membership?.active;
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">{displayName(u)}</div>
                      <div className="break-all text-xs text-muted-foreground">{u.email}</div>
                    </TableCell>
                    <TableCell>
                      {u.isSelf ? (
                        <Badge tone="info">You · Admin</Badge>
                      ) : active ? (
                        <Badge tone="success">Active</Badge>
                      ) : (
                        <Badge tone="neutral">Deactivated</Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap md:table-cell">
                      {fmtSignIn(u.lastSignInAt)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {u.isSelf ? '—' : projectCountByUser[u.id] ?? 0}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {u.isSelf ? '—' : `${(hoursByUser[u.id] ?? 0).toFixed(2)}h`}
                    </TableCell>
                    <TableCell className="text-right">
                      {u.isSelf ? null : (
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Actions for ${displayName(u)}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onSelect={() => handleViewAs(u)}>
                              <Eye className="h-4 w-4" />
                              View as
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => setProjectsTarget({ userId: u.id, name: displayName(u) })}
                            >
                              <Building2 className="h-4 w-4" />
                              Projects
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => openRename(u)}>
                              <Pencil className="h-4 w-4" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setPasswordTarget(u)}>
                              <KeyRound className="h-4 w-4" />
                              Set password
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setActiveTarget(u)}>
                              {active ? (
                                <>
                                  <Ban className="h-4 w-4" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-4 w-4" />
                                  Reactivate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onSelect={() => openDelete(u)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <MemberDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(user) => {
          setUsers((prev) => [...prev, user]);
          afterTeamChange();
        }}
      />

      <MemberProjectsDialog member={projectsTarget} onClose={() => setProjectsTarget(null)} />

      <SetPasswordDialog target={passwordTarget} onClose={() => setPasswordTarget(null)} />

      {/* Rename */}
      <Dialog open={!!renameTarget} onOpenChange={(open) => !open && !busy && setRenameTarget(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Rename member</DialogTitle>
            <DialogDescription>{renameTarget?.email}</DialogDescription>
          </DialogHeader>
          <form onSubmit={confirmRename} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="renameMember">Name</Label>
              <Input
                id="renameMember"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                maxLength={DISPLAY_NAME_MAX_LENGTH}
                disabled={busy}
                autoFocus
                required
              />
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRenameTarget(null)}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy || !renameValue.trim()}>
                {busy ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Deactivate / reactivate */}
      <Dialog open={!!activeTarget} onOpenChange={(open) => !open && !busy && setActiveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {activeTarget?.membership?.active ? 'Deactivate account?' : 'Reactivate account?'}
            </DialogTitle>
            <DialogDescription>
              {activeTarget?.membership?.active ? (
                <>
                  <span className="font-semibold text-foreground">
                    {activeTarget ? displayName(activeTarget) : ''}
                  </span>{' '}
                  will no longer be able to sign in. Their hours and data are kept, and you can
                  reactivate the account at any time.
                </>
              ) : (
                <>
                  <span className="font-semibold text-foreground">
                    {activeTarget ? displayName(activeTarget) : ''}
                  </span>{' '}
                  will be able to sign in again with their current password.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setActiveTarget(null)} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant={activeTarget?.membership?.active ? 'destructive' : 'default'}
              onClick={confirmSetActive}
              disabled={busy}
            >
              {busy ? 'Saving…' : activeTarget?.membership?.active ? 'Deactivate' : 'Reactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete (typed confirmation) */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && !busy && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete account permanently?</DialogTitle>
            <DialogDescription>
              This deletes the login of{' '}
              <span className="font-semibold text-foreground">
                {deleteTarget ? displayName(deleteTarget) : ''}
              </span>{' '}
              and <span className="font-semibold text-foreground">all of their data</span> (hours,
              invoices, profile). Your own data is not affected. This cannot be undone — to keep
              their history, deactivate the account instead.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="deleteConfirm">
              Type <span className="font-mono">{deleteTarget?.email}</span> to confirm
            </Label>
            <Input
              id="deleteConfirm"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              autoComplete="off"
              disabled={busy}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={busy || !deleteMatches}>
              {busy ? 'Deleting…' : 'Delete account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTeam;

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { TimeEntry } from '../../types';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';

interface TimeEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (entry: Omit<TimeEntry, 'id'>) => void;
  onUpdate?: (id: string, entry: Partial<TimeEntry>) => void;
  projects: Array<{ id: string; name: string; status: string }>;
  editEntry?: TimeEntry;
}

const TimeEntryDialog: React.FC<TimeEntryDialogProps> = ({
  open,
  onOpenChange,
  onSave,
  onUpdate,
  projects,
  editEntry,
}) => {
  const [formData, setFormData] = useState({
    projectId: '',
    date: new Date().toISOString(),
    hours: '',
  });

  const [calendarOpen, setCalendarOpen] = useState(false);

  useEffect(() => {
    if (open) {
      if (editEntry) {
        setFormData({
          projectId: editEntry.projectId,
          date: editEntry.date,
          hours: editEntry.hours.toString(),
        });
      } else {
        setFormData({
          projectId: '',
          date: new Date().toISOString(),
          hours: '',
        });
      }
    }
  }, [open, editEntry]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.projectId && formData.hours) {
      if (editEntry && onUpdate) {
        onUpdate(editEntry.id, {
          projectId: formData.projectId,
          date: formData.date,
          hours: parseFloat(formData.hours),
        });
      } else {
        onSave({
          projectId: formData.projectId,
          date: formData.date,
          hours: parseFloat(formData.hours),
        });
      }
      onOpenChange(false);
    }
  };

  const activeProjects = projects.filter((p) => p.status === 'Active');

  const selectedDate = new Date(formData.date);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {editEntry ? 'Edit Time Entry' : 'Add Time Entry'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="project">Project</Label>
              <Select
                value={formData.projectId}
                onValueChange={(value) =>
                  setFormData({ ...formData, projectId: value })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {activeProjects.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      No active projects
                    </div>
                  ) : (
                    activeProjects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date">Date</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(new Date(formData.date), 'dd/MM/yyyy', { locale: enUS })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      if (date) {
                        setFormData({ ...formData, date: date.toISOString() });
                        setCalendarOpen(false);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="hours">Hours</Label>
              <Input
                id="hours"
                type="number"
                step="0.25"
                min="0.25"
                value={formData.hours}
                onChange={(e) =>
                  setFormData({ ...formData, hours: e.target.value })
                }
                placeholder="Eg: 2.5"
              />
              <p className="text-xs text-muted-foreground">
                You can use fractions of hours (eg: 1.5 = 1 hour 30 minutes)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TimeEntryDialog;

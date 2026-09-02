import React from 'react';
import { ProjectStatus } from '../../types';
import { Badge, type BadgeTone } from '../ui/badge';

const TONES: Record<ProjectStatus, BadgeTone> = {
  Active: 'success',
  Paused: 'warning',
  Completed: 'neutral',
};

const ProjectStatusBadge: React.FC<{ status: ProjectStatus }> = ({ status }) => (
  <Badge tone={TONES[status] ?? 'neutral'}>{status}</Badge>
);

export default ProjectStatusBadge;

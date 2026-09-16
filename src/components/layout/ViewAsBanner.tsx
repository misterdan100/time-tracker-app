import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { Callout } from '../ui/callout';
import { Button } from '../ui/button';
import { useApp } from '../../context/AppContext';

/** Reminder that the admin is looking at a member's account, with a way out. */
const ViewAsBanner: React.FC = () => {
  const { viewAs, stopViewAs } = useApp();
  const navigate = useNavigate();

  if (!viewAs) return null;

  return (
    <Callout
      tone="danger"
      icon={Eye}
      className="mx-auto w-full max-w-6xl"
      action={
        <Button
          variant="outline"
          size="sm"
          className="w-full sm:w-auto"
          onClick={() => {
            stopViewAs();
            navigate('/admin');
          }}
        >
          Exit
        </Button>
      }
    >
      Viewing as <span className="font-semibold">{viewAs.name}</span> — read-only
    </Callout>
  );
};

export default ViewAsBanner;

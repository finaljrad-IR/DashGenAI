import { useState } from 'react';
import { Edit2, Check, X, UserPlus, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateDashboard } from '@/api/dashboards';
import { useToast } from '@/hooks/useToast';
import { useNavigate } from 'react-router-dom';

interface DashboardHeaderProps {
  dashboardId: string;
  initialName: string;
  onInviteClick: () => void;
}

export function DashboardHeader({ dashboardId, initialName, onInviteClick }: DashboardHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [editedName, setEditedName] = useState(initialName);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSave = async () => {
    if (!editedName.trim()) {
      toast({
        title: 'Error',
        description: 'Dashboard name cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    console.log('Updating dashboard name:', editedName);
    try {
      await updateDashboard(dashboardId, { name: editedName });
      console.log('Dashboard name updated successfully');
      setName(editedName);
      setIsEditing(false);
      toast({
        title: 'Success',
        description: 'Dashboard name updated',
      });
    } catch (error: any) {
      console.error('Failed to update dashboard name:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update dashboard name',
        variant: 'destructive',
      });
    }
  };

  const handleCancel = () => {
    setEditedName(name);
    setIsEditing(false);
  };

  return (
    <div className="flex items-center justify-between p-4 border-b bg-card/50 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Input
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              className="h-9 w-64"
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') handleCancel();
              }}
            />
            <Button size="sm" variant="ghost" onClick={handleSave}>
              <Check className="h-4 w-4 text-green-600" />
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancel}>
              <X className="h-4 w-4 text-red-600" />
            </Button>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-bold">{name}</h1>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsEditing(true)}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/my-dashboards')}
        >
          <LayoutDashboard className="h-4 w-4 mr-2" />
          My Dashboards
        </Button>
        <Button
          onClick={onInviteClick}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          size="sm"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Users
        </Button>
      </div>
    </div>
  );
}
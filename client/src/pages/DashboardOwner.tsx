import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { ChatInterface } from "@/components/Dashboard/ChatInterface";
import { DashboardViewer } from "@/components/Dashboard/DashboardViewer";
import { InviteModal } from "@/components/Dashboard/InviteModal";
import { DashboardHeader } from "@/components/Dashboard/DashboardHeader";
import { getDashboard } from "@/api/dashboards";
import { useToast } from "@/hooks/useToast";

export function DashboardOwner() {
  const { id } = useParams<{ id: string }>();
  const [dashboard, setDashboard] = useState<{
    name: string
    previewUrl: string
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (id) {
      loadDashboard();
    }
  }, [id]);

  const loadDashboard = useCallback(async () => {
    if (!id) return

    setIsLoading(true)
    try {
      const response = await getDashboard(id)
      setDashboard(response)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load dashboard'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [id, toast]);

  const handleDashboardUpdate = () => {
    console.log('Dashboard updated, triggering refresh');
    setRefreshTrigger(prev => prev + 1);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-background to-secondary/20">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-lg font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-lg font-medium">Dashboard not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-background to-secondary/20">
      <DashboardHeader
        dashboardId={dashboard._id}
        initialName={dashboard.name}
        onInviteClick={() => setIsInviteModalOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="w-[400px] border-r flex-shrink-0">
          <ChatInterface
            dashboardId={dashboard._id}
            onDashboardUpdate={handleDashboardUpdate}
          />
        </div>

        <div className="flex-1">
          <DashboardViewer
            previewUrl={dashboard.previewUrl}
            refreshTrigger={refreshTrigger}
          />
        </div>
      </div>

      <InviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        dashboardId={dashboard._id}
      />
    </div>
  );
}
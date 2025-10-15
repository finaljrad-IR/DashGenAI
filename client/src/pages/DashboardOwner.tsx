import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { ChatInterface } from "@/components/Dashboard/ChatInterface";
import { DashboardViewer } from "@/components/Dashboard/DashboardViewer";
import { InviteModal } from "@/components/Dashboard/InviteModal";
import { DashboardHeader } from "@/components/Dashboard/DashboardHeader";
import { getProjectById, getSandboxStatus } from "@/api/projects";
import { useToast } from "@/hooks/useToast";
import type { Project } from "@/api/projects";

export function DashboardOwner() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [sandboxUrl, setSandboxUrl] = useState<string>('');
  const [sandboxStatus, setSandboxStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { toast } = useToast();

  const loadDashboard = useCallback(async () => {
    if (!id) return

    setIsLoading(true)
    try {
      const projectData = await getProjectById(id);
      setProject(projectData);

      // Ensure sandbox URL is HTTPS
      let secureUrl = projectData.sandboxUrl || '';
      if (secureUrl && secureUrl.startsWith('http://')) {
        secureUrl = secureUrl.replace('http://', 'https://');
        console.log('Converted sandbox URL to HTTPS:', secureUrl);
      }

      setSandboxUrl(secureUrl);
      setSandboxStatus(projectData.sandboxStatus || projectData.status || '');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load dashboard'
      console.error('Error loading dashboard:', errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [id, toast]);

  const checkSandboxStatus = useCallback(async () => {
    if (!id) return;

    try {
      const status = await getSandboxStatus(id);
      setSandboxStatus(status.sandboxStatus);

      if (status.sandboxUrl) {
        // Ensure sandbox URL is HTTPS
        let secureUrl = status.sandboxUrl;
        if (secureUrl.startsWith('http://')) {
          secureUrl = secureUrl.replace('http://', 'https://');
          console.log('Converted sandbox URL to HTTPS:', secureUrl);
        }

        if (secureUrl !== sandboxUrl) {
          setSandboxUrl(secureUrl);
          // Update project with new URL
          setProject(prev => prev ? { ...prev, sandboxUrl: secureUrl } : null);
        }
      }
    } catch (error) {
      console.error('Error checking sandbox status:', error);
    }
  }, [id, sandboxUrl]);

  useEffect(() => {
    if (id) {
      loadDashboard();
      // Poll sandbox status every 5 seconds
      const interval = setInterval(() => {
        checkSandboxStatus();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [id, loadDashboard, checkSandboxStatus]);

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

  if (!project) {
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
        dashboardId={project._id}
        initialName={project.name}
        onInviteClick={() => setIsInviteModalOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="w-[400px] border-r flex-shrink-0">
          <ChatInterface
            dashboardId={project._id}
            onDashboardUpdate={handleDashboardUpdate}
          />
        </div>

        <div className="flex-1">
          {sandboxUrl ? (
            <DashboardViewer
              previewUrl={sandboxUrl}
              refreshTrigger={refreshTrigger}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-lg font-medium">
                  {sandboxStatus === 'creating' || sandboxStatus === 'deploying'
                    ? 'Setting up your dashboard...'
                    : sandboxStatus === 'failed'
                    ? 'Failed to deploy dashboard'
                    : 'Preparing dashboard...'}
                </p>
                {sandboxStatus === 'failed' && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Please try again or contact support
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <InviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        dashboardId={project._id}
      />
    </div>
  );
}
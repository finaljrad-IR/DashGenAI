import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Loader2, Eye } from "lucide-react";
import { DashboardViewer } from "@/components/Dashboard/DashboardViewer";
import { getDashboard } from "@/api/dashboards";
import { useToast } from "@/hooks/useToast";
import { Card } from "@/components/ui/card";

export function DashboardShared() {
  const { id } = useParams<{ id: string }>();
  const [dashboard, setDashboard] = useState<{
    name: string
    previewUrl: string
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

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

  useEffect(() => {
    if (id) {
      loadDashboard();
    }
  }, [id, loadDashboard]);

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
      <div className="flex items-center justify-between p-4 border-b bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Eye className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{dashboard.name}</h1>
            <p className="text-sm text-muted-foreground">Read-only view</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4">
        <DashboardViewer previewUrl={dashboard.previewUrl} />
      </div>
    </div>
  );
}
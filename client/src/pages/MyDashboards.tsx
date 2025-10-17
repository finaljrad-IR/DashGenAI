import { useState, useEffect, useCallback } from "react";
import { useNavigate } from 'react-router-dom';
import { Loader2, LayoutDashboard, Calendar, Clock, ArrowRight, Trash2, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { getProjects, deleteProject, Project } from '@/api/projects';
import { getSharedDashboards } from '@/api/invitations';
import { useToast } from '@/hooks/useToast';

interface SharedDashboard {
  _id: string;
  name: string;
  status: string;
  sharedBy: string;
  sharedAt: Date;
  accessLevel: string;
}

export function MyDashboards() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [sharedDashboards, setSharedDashboards] = useState<SharedDashboard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const loadProjects = useCallback(async () => {
    setIsLoading(true)
    try {
      const fetchedProjects = await getProjects()
      setProjects(fetchedProjects || [])
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load projects'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  const loadSharedDashboards = useCallback(async () => {
    try {
      const response = await getSharedDashboards()
      setSharedDashboards(response.dashboards || [])
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load shared dashboards'
      console.error('Error loading shared dashboards:', errorMessage)
      // Don't show error toast for shared dashboards, just log it
    }
  }, [])

  useEffect(() => {
    loadProjects();
    loadSharedDashboards();
  }, [loadProjects, loadSharedDashboards]);

  const handleDelete = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjectToDelete(project);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!projectToDelete) return;

    setIsDeleting(true);
    try {
      await deleteProject(projectToDelete._id);
      toast({
        title: "Success",
        description: "Project and sandbox deleted successfully"
      });
      // Reload projects
      await loadProjects();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete project';
      console.error("Delete error:", errorMessage);
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-lg font-medium">Loading your dashboards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            My Dashboards
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage and access all your MongoDB dashboards
          </p>
        </div>
      </div>

      {projects.length === 0 ? (
        <Card className="backdrop-blur-sm bg-card/95 shadow-lg border-2">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-4 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full mb-4">
              <LayoutDashboard className="h-12 w-12 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No dashboards yet</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Create your first dashboard by connecting your MongoDB database
            </p>
            <Button
              onClick={() => navigate('/')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              Create Dashboard
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project, index) => (
            <Card
              key={project._id}
              className="backdrop-blur-sm bg-card/95 shadow-lg border-2 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] cursor-pointer animate-in fade-in slide-in-from-bottom-4"
              style={{ animationDelay: `${index * 100}ms` }}
              onClick={() => navigate(`/dashboard/${project._id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="p-2 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-lg">
                    <LayoutDashboard className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDelete(project, e)}
                      className="hover:bg-red-100 dark:hover:bg-red-900/30"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/dashboard/${project._id}`);
                      }}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardTitle className="mt-4 line-clamp-2">{project.name}</CardTitle>
                <CardDescription className="flex items-center gap-1 mt-2">
                  <Calendar className="h-3 w-3" />
                  Created {formatDate(project.createdAt)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Last modified {formatDate(project.updatedAt)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {sharedDashboards.length > 0 && (
        <div className="space-y-6 mt-12">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-green-100 to-teal-100 dark:from-green-900/30 dark:to-teal-900/30 rounded-lg">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
                Shared with Me
              </h2>
              <p className="text-muted-foreground text-sm">
                Dashboards other users have shared with you
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sharedDashboards.map((dashboard, index) => (
              <Card
                key={dashboard._id}
                className="backdrop-blur-sm bg-card/95 shadow-lg border-2 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] cursor-pointer animate-in fade-in slide-in-from-bottom-4"
                style={{ animationDelay: `${index * 100}ms` }}
                onClick={() => navigate(`/dashboard/${dashboard._id}/shared`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="p-2 bg-gradient-to-br from-green-100 to-teal-100 dark:from-green-900/30 dark:to-teal-900/30 rounded-lg">
                      <Users className="h-6 w-6 text-green-600" />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/dashboard/${dashboard._id}/shared`);
                      }}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardTitle className="mt-4 line-clamp-2">{dashboard.name}</CardTitle>
                  <CardDescription className="flex items-center gap-1 mt-2">
                    <Users className="h-3 w-3" />
                    Shared by {dashboard.sharedBy}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>Shared {formatDate(dashboard.sharedAt.toString())}</span>
                    </div>
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                      {dashboard.accessLevel}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the project "{projectToDelete?.name}" and its associated Daytona sandbox. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
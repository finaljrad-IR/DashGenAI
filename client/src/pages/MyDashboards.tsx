import { useState, useEffect, useCallback } from "react";
import { useNavigate } from 'react-router-dom';
import { Loader2, LayoutDashboard, Calendar, Clock, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getUserDashboards } from '@/api/dashboards';
import { useToast } from '@/hooks/useToast';

export function MyDashboards() {
  const [dashboards, setDashboards] = useState<Array<{
    _id: string
    name: string
    createdAt: string
    previewUrl: string
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadDashboards();
  }, []);

  const loadDashboards = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await getUserDashboards()
      setDashboards(response.dashboards || [])
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load dashboards'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

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

      {dashboards.length === 0 ? (
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
          {dashboards.map((dashboard, index) => (
            <Card
              key={dashboard._id}
              className="backdrop-blur-sm bg-card/95 shadow-lg border-2 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] cursor-pointer animate-in fade-in slide-in-from-bottom-4"
              style={{ animationDelay: `${index * 100}ms` }}
              onClick={() => navigate(`/dashboard/${dashboard._id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="p-2 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-lg">
                    <LayoutDashboard className="h-6 w-6 text-blue-600" />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/dashboard/${dashboard._id}`);
                    }}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
                <CardTitle className="mt-4 line-clamp-2">{dashboard.name}</CardTitle>
                <CardDescription className="flex items-center gap-1 mt-2">
                  <Calendar className="h-3 w-3" />
                  Created {formatDate(dashboard.createdAt)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Last modified {formatDate(dashboard.lastModified)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
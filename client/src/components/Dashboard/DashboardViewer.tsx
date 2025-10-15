import { useState, useEffect } from 'react';
import { Maximize2, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface DashboardViewerProps {
  previewUrl: string;
  refreshTrigger?: number;
}

export function DashboardViewer({ previewUrl, refreshTrigger = 0 }: DashboardViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [iframeKey, setIframeKey] = useState(0);

  useEffect(() => {
    if (refreshTrigger > 0) {
      console.log('Refreshing dashboard iframe');
      handleRefresh();
    }
  }, [refreshTrigger]);

  const handleRefresh = () => {
    console.log('Manual dashboard refresh triggered');
    setIsLoading(true);
    setIframeKey(prev => prev + 1);
  };

  const handleFullscreen = () => {
    const iframe = document.getElementById('dashboard-iframe') as HTMLIFrameElement;
    if (iframe) {
      if (iframe.requestFullscreen) {
        iframe.requestFullscreen();
      }
    }
  };

  const handleIframeLoad = () => {
    console.log('Dashboard iframe loaded successfully');
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b bg-card/50 backdrop-blur-sm">
        <h2 className="text-lg font-semibold">Live Dashboard</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleFullscreen}
          >
            <Maximize2 className="h-4 w-4 mr-2" />
            Fullscreen
          </Button>
        </div>
      </div>

      <div className="flex-1 relative bg-gradient-to-br from-background to-secondary/20 p-4">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-lg font-medium">Loading your dashboard...</p>
            </div>
          </div>
        )}
        
        <Card className="w-full h-full overflow-hidden shadow-2xl">
          <iframe
            key={iframeKey}
            id="dashboard-iframe"
            src={previewUrl}
            className="w-full h-full border-0"
            style={{ pointerEvents: 'auto' }}
            title="Dashboard Preview"
            onLoad={handleIframeLoad}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-pointer-lock"
          />
        </Card>
      </div>
    </div>
  );
}
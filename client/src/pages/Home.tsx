import { HeroSection } from '@/components/HomePage/HeroSection';
import { DashboardForm } from '@/components/HomePage/DashboardForm';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard } from 'lucide-react';

export function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();

  console.log('Home page rendered, user authenticated:', !!user);

  const handleViewDashboards = () => {
    console.log('Navigating to my dashboards page');
    navigate('/my-dashboards');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20">
      <div className="container mx-auto px-4 py-16">
        <HeroSection />

        {user && (
          <div className="max-w-2xl mx-auto mb-8 flex justify-center">
            <Button
              onClick={handleViewDashboards}
              size="lg"
              className="gap-2 shadow-lg hover:shadow-xl transition-all"
              variant="default"
            >
              <LayoutDashboard className="w-5 h-5" />
              View My Dashboards
            </Button>
          </div>
        )}

        <DashboardForm />
      </div>
    </div>
  );
}
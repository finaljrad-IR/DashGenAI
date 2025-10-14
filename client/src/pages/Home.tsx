import { HeroSection } from '@/components/HomePage/HeroSection';
import { DashboardForm } from '@/components/HomePage/DashboardForm';

export function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20">
      <div className="container mx-auto px-4 py-16">
        <HeroSection />
        <DashboardForm />
      </div>
    </div>
  );
}
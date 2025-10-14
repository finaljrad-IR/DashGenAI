import { Database, Sparkles, Zap } from 'lucide-react';

export function HeroSection() {
  return (
    <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex justify-center mb-6">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur-2xl opacity-20 animate-pulse"></div>
          <div className="relative bg-gradient-to-br from-blue-500 to-purple-600 p-4 rounded-2xl shadow-2xl">
            <Database className="h-12 w-12 text-white" />
          </div>
        </div>
      </div>
      
      <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
        AI-Powered MongoDB Dashboard
      </h1>
      
      <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
        Transform your database into beautiful, interactive dashboards in minutes
      </p>
      
      <div className="flex flex-wrap justify-center gap-6 text-sm">
        <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/30 px-4 py-2 rounded-full">
          <Sparkles className="h-4 w-4 text-blue-600" />
          <span className="text-blue-700 dark:text-blue-300">AI-Generated</span>
        </div>
        <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-950/30 px-4 py-2 rounded-full">
          <Zap className="h-4 w-4 text-purple-600" />
          <span className="text-purple-700 dark:text-purple-300">Fully Customizable</span>
        </div>
        <div className="flex items-center gap-2 bg-pink-50 dark:bg-pink-950/30 px-4 py-2 rounded-full">
          <Database className="h-4 w-4 text-pink-600" />
          <span className="text-pink-700 dark:text-pink-300">Real-time Data</span>
        </div>
      </div>
    </div>
  );
}
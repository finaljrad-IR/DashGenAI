import { useState, useCallback } from "react";
import { useForm } from 'react-hook-form';
import { Mail, Database, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { generateDashboard } from '@/api/dashboards';
import { useToast } from '@/hooks/useToast';

interface FormData {
  email: string;
  mongoUri: string;
}

export function DashboardForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const { toast } = useToast();
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>();

  const onSubmit = useCallback(async (data: FormData) => {
    setIsSubmitting(true)
    try {
      console.log('[DashboardForm] Submitting form with data:', data);
      const result = await generateDashboard({ email: data.email, mongoUri: data.mongoUri })
      console.log('[DashboardForm] Dashboard generation result:', result);
      setSubmittedEmail(data.email)
      setIsSuccess(true)
      toast({
        title: "Success! 🎉",
        description: result.message || `We're building your dashboard! You'll receive an email at ${data.email} when it's ready. This usually takes 5-10 minutes.`,
      })
      reset()
    } catch (error: unknown) {
      console.error('[DashboardForm] Error generating dashboard:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate dashboard'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [reset, toast])

  return (
    <Card className="max-w-2xl mx-auto backdrop-blur-sm bg-card/95 shadow-2xl border-2 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Generate Your Dashboard</CardTitle>
        <CardDescription className="text-center">
          Connect your MongoDB database and let AI create a custom dashboard for you
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {isSuccess ? (
          <Alert className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 animate-in fade-in slide-in-from-top-4">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <AlertDescription className="text-green-800 dark:text-green-200 ml-2">
              <strong>We're building your dashboard!</strong>
              <br />
              You'll receive an email at <strong>{submittedEmail}</strong> when it's ready.
              <br />
              This usually takes 5-10 minutes.
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-base font-medium">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  className="pl-10 h-12 text-base"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Please enter a valid email address'
                    }
                  })}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="mongoUri" className="text-base font-medium">
                MongoDB Database URI
              </Label>
              <div className="relative">
                <Database className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  id="mongoUri"
                  type="password"
                  placeholder="mongodb://username:password@host:port/database"
                  className="pl-10 h-12 text-base font-mono"
                  {...register('mongoUri', {
                    required: 'MongoDB URI is required',
                    pattern: {
                      value: /^mongodb(\+srv)?:\/\/.+/,
                      message: 'Please enter a valid MongoDB connection string'
                    }
                  })}
                />
              </div>
              {errors.mongoUri && (
                <p className="text-sm text-destructive">{errors.mongoUri.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Your connection string is encrypted and secure
              </p>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                'Generate My Dashboard'
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
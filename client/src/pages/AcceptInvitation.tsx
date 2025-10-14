import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getInvitationDetails, acceptInvitation } from "@/api/invitations";
import { useToast } from "@/hooks/useToast";

interface FormData {
  password: string;
  confirmPassword: string;
}

export function AcceptInvitation() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [invitation, setInvitation] = useState<{
    email: string
    dashboardName: string
    inviterEmail: string
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const { toast } = useToast();
  const { register, handleSubmit, formState: { errors }, watch } = useForm<FormData>();

  const password = watch('password');

  useEffect(() => {
    if (token) {
      loadInvitationDetails();
    }
  }, [token]);

  useEffect(() => {
    if (password) {
      calculatePasswordStrength(password);
    } else {
      setPasswordStrength(0);
    }
  }, [password]);

  const loadInvitationDetails = useCallback(async () => {
    if (!token) return
    
    try {
      const response = await getInvitationDetails(token)
      setInvitation(response)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load invitation details'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }, [token])

  const calculatePasswordStrength = (pwd: string) => {
    let strength = 0;
    if (pwd.length >= 8) strength += 25;
    if (pwd.length >= 12) strength += 25;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength += 25;
    if (/\d/.test(pwd)) strength += 15;
    if (/[^a-zA-Z0-9]/.test(pwd)) strength += 10;
    setPasswordStrength(Math.min(strength, 100));
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength < 40) return 'bg-red-500';
    if (passwordStrength < 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength < 40) return 'Weak';
    if (passwordStrength < 70) return 'Medium';
    return 'Strong';
  };

  const onSubmit = useCallback(async (data: FormData) => {
    if (!token) return

    setIsLoading(true)
    try {
      const response = await acceptInvitation(token, data.password)
      
      if (response.accessToken) {
        localStorage.setItem('accessToken', response.accessToken)
      }

      toast({
        title: "Welcome! 🎉",
        description: "Your account has been created successfully.",
      })

      setTimeout(() => {
        navigate(`/dashboard/${response.dashboardId}/shared`)
      }, 1000)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to accept invitation'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [token, navigate])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-lg font-medium">Invalid or expired invitation</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20 flex items-center justify-center p-4">
      <Card className="max-w-md w-full backdrop-blur-sm bg-card/95 shadow-2xl border-2 animate-in fade-in slide-in-from-bottom-4">
        <CardHeader className="space-y-3">
          <div className="flex justify-center">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl">
              <Mail className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">You've Been Invited!</CardTitle>
          <CardDescription className="text-center">
            <strong>{invitation.inviterEmail}</strong> invited you to view their dashboard
            <br />
            <span className="text-lg font-semibold text-foreground mt-2 block">
              {invitation.dashboardName}
            </span>
          </CardDescription>
          {invitation.message && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-900 dark:text-blue-100 italic">
                "{invitation.message}"
              </p>
            </div>
          )}
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-base font-medium">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={invitation.email}
                disabled
                className="bg-secondary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-base font-medium">
                Create Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a password"
                  className="pl-10 pr-10"
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 8,
                      message: 'Password must be at least 8 characters'
                    }
                  })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-8 w-8 p-0"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {password && (
                <div className="space-y-1">
                  <Progress value={passwordStrength} className={getPasswordStrengthColor()} />
                  <p className="text-xs text-muted-foreground">
                    Password strength: <span className="font-medium">{getPasswordStrengthText()}</span>
                  </p>
                </div>
              )}
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-base font-medium">
                Confirm Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  className="pl-10 pr-10"
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: (value) =>
                      value === password || 'Passwords do not match'
                  })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-8 w-8 p-0"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Setting up your account...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Set Password & View Dashboard
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
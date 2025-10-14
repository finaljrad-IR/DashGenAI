import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, Mail, Plus, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { sendInvitations } from '@/api/invitations';
import { useToast } from '@/hooks/useToast';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  dashboardId: string;
}

interface FormData {
  email: string;
  message: string;
}

export function InviteModal({ isOpen, onClose, dashboardId }: InviteModalProps) {
  const [emails, setEmails] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<FormData>();

  const currentEmail = watch('email');

  const addEmail = () => {
    const email = currentEmail?.trim();
    if (!email) return;

    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    if (!emailRegex.test(email)) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }

    if (emails.includes(email)) {
      toast({
        title: 'Duplicate Email',
        description: 'This email has already been added',
        variant: 'destructive',
      });
      return;
    }

    console.log('Adding email to invitation list:', email);
    setEmails(prev => [...prev, email]);
    setValue('email', '');
  };

  const removeEmail = (emailToRemove: string) => {
    console.log('Removing email from invitation list:', emailToRemove);
    setEmails(prev => prev.filter(e => e !== emailToRemove));
  };

  const onSubmit = async (data: FormData) => {
    if (emails.length === 0) {
      toast({
        title: 'No Recipients',
        description: 'Please add at least one email address',
        variant: 'destructive',
      });
      return;
    }

    console.log('Sending invitations to:', emails);
    setIsSubmitting(true);

    try {
      const response = await sendInvitations({
        dashboardId,
        emails,
        message: data.message || undefined
      }) as any;

      console.log('Invitations sent successfully:', response);
      
      toast({
        title: 'Success!',
        description: response.message,
      });

      setEmails([]);
      reset();
      onClose();
    } catch (error: any) {
      console.error('Failed to send invitations:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send invitations',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addEmail();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-background">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Invite Users to Your Dashboard</DialogTitle>
          <DialogDescription>
            Share your dashboard with team members. They'll receive an email invitation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">
          <div className="space-y-3">
            <Label htmlFor="email" className="text-base font-medium">
              Email Addresses
            </Label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="colleague@company.com"
                  className="pl-9"
                  {...register('email')}
                  onKeyPress={handleKeyPress}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={addEmail}
                disabled={!currentEmail?.trim()}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>

            {emails.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 bg-secondary/30 rounded-lg border">
                {emails.map((email) => (
                  <Badge
                    key={email}
                    variant="secondary"
                    className="pl-3 pr-1 py-1.5 text-sm"
                  >
                    {email}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-auto p-1 ml-2 hover:bg-destructive/20"
                      onClick={() => removeEmail(email)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="message" className="text-base font-medium">
              Personal Message (Optional)
            </Label>
            <Textarea
              id="message"
              placeholder="Add a personal message to your invitation..."
              className="min-h-[100px] resize-none"
              {...register('message')}
            />
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || emails.length === 0}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Send Invitations ({emails.length})
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
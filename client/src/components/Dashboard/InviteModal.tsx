import { useState } from "react"
import { X, Mail, Plus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { sendInvitations } from "@/api/invitations"
import { useToast } from "@/hooks/useToast"

interface InviteModalProps {
  isOpen: boolean
  onClose: () => void
  dashboardId: string
}

export function InviteModal({ isOpen, onClose, dashboardId }: InviteModalProps) {
  const [emails, setEmails] = useState<string[]>([])
  const [currentEmail, setCurrentEmail] = useState("")
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const addEmail = () => {
    const trimmedEmail = currentEmail.trim()
    
    if (!trimmedEmail) {
      return
    }

    if (!validateEmail(trimmedEmail)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      })
      return
    }

    if (emails.includes(trimmedEmail)) {
      toast({
        title: "Duplicate Email",
        description: "This email has already been added",
        variant: "destructive",
      })
      return
    }

    setEmails([...emails, trimmedEmail])
    setCurrentEmail("")
  }

  const removeEmail = (emailToRemove: string) => {
    setEmails(emails.filter(email => email !== emailToRemove))
  }

  const handleSubmit = async () => {
    if (emails.length === 0) {
      toast({
        title: "No Emails",
        description: "Please add at least one email address",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      await sendInvitations({
        projectId: dashboardId,
        emails,
        message: message.trim() || undefined,
      })

      toast({
        title: "Invitations Sent",
        description: `Successfully sent invitations to ${emails.length} user${emails.length > 1 ? 's' : ''}`,
      })

      // Reset form
      setEmails([])
      setCurrentEmail("")
      setMessage("")
      onClose()
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send invitations. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addEmail()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-white dark:bg-gray-900">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Invite Users to Your Dashboard
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Email Input Section */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Email Addresses
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="email"
                  placeholder="colleague@company.com"
                  value={currentEmail}
                  onChange={(e) => setCurrentEmail(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
              <Button
                type="button"
                onClick={addEmail}
                disabled={isLoading || !currentEmail.trim()}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Email Tags */}
            {emails.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                {emails.map((email) => (
                  <Badge
                    key={email}
                    variant="secondary"
                    className="pl-3 pr-1 py-1.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800"
                  >
                    <span className="mr-1">{email}</span>
                    <button
                      onClick={() => removeEmail(email)}
                      disabled={isLoading}
                      className="ml-1 hover:bg-blue-200 dark:hover:bg-blue-700 rounded-full p-0.5 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Optional Message */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Personal Message (Optional)
            </label>
            <Textarea
              placeholder="Add a personal message to your invitation..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isLoading}
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading || emails.length === 0}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                `Send Invitation${emails.length > 1 ? 's' : ''}`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
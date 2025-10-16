import { useState } from "react";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  FileEdit,
  FileText,
  Search,
  Terminal,
  Bot
} from "lucide-react";
import { ParsedClaudeMessage } from "@/utils/codexLogParser";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface IterationMessageProps {
  message: ParsedClaudeMessage;
}

// Helper to get icon and color based on action type
const getActionStyle = (action: string) => {
  const lowerAction = action.toLowerCase();

  if (lowerAction.includes('editing')) {
    return {
      icon: <FileEdit className="h-4 w-4" />,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50 dark:bg-orange-950/20',
      borderColor: 'border-orange-200 dark:border-orange-800',
    };
  }

  if (lowerAction.includes('writing')) {
    return {
      icon: <FileText className="h-4 w-4" />,
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-950/20',
      borderColor: 'border-green-200 dark:border-green-800',
    };
  }

  if (lowerAction.includes('reading')) {
    return {
      icon: <FileText className="h-4 w-4" />,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20',
      borderColor: 'border-blue-200 dark:border-blue-800',
    };
  }

  if (lowerAction.includes('searching')) {
    return {
      icon: <Search className="h-4 w-4" />,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-950/20',
      borderColor: 'border-purple-200 dark:border-purple-800',
    };
  }

  if (lowerAction.includes('running')) {
    return {
      icon: <Terminal className="h-4 w-4" />,
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-50 dark:bg-cyan-950/20',
      borderColor: 'border-cyan-200 dark:border-cyan-800',
    };
  }

  // Default for agent messages
  return {
    icon: <Bot className="h-4 w-4" />,
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-900/20',
    borderColor: 'border-gray-200 dark:border-gray-800',
  };
};

/**
 * Component for rendering a single iteration message that updates dynamically
 * Shows current action and changes as the AI agent works
 */
export function IterationMessage({ message }: IterationMessageProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isCompleted = message.hasCompleted;
  const isError = message.icon === '❌';
  const actionStyle = getActionStyle(message.currentAction || '');

  return (
    <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2">
      {/* Bot Icon */}
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300",
        isCompleted
          ? isError
            ? "bg-red-100 dark:bg-red-900/30"
            : "bg-green-100 dark:bg-green-900/30"
          : "bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800"
      )}>
        {isCompleted ? (
          isError ? (
            <AlertCircle className="h-4 w-4 text-red-500 animate-in zoom-in duration-300" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-green-500 animate-in zoom-in duration-300" />
          )
        ) : (
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
        )}
      </div>

      {/* Message Content */}
      <div className="flex flex-col gap-1 max-w-[80%]">
        {/* Show loading state with colored action indicator - no outer border */}
        {!isCompleted && (
          <div className="space-y-3">
            {/* Action type with icon and color */}
            <div className={cn(
              "inline-flex items-center gap-2 px-3 py-1.5 rounded-md border transition-all duration-500",
              actionStyle.bgColor,
              actionStyle.borderColor,
              "animate-in slide-in-from-top-2"
            )}>
              <span className={cn("transition-all duration-300", actionStyle.color)}>
                {actionStyle.icon}
              </span>
              <span className={cn("text-sm font-medium", actionStyle.color)}>
                {message.currentAction}
              </span>
            </div>
          </div>
        )}

        {/* Show completion state */}
        {isCompleted && (
          <div className="space-y-3">
            {/* Collapsible "Iteration completed" section */}
            {message.resultDescription && (
              <Card className={cn(
                "p-3 bg-card border transition-all duration-300",
                isError && "border-red-300 dark:border-red-700"
              )}>
                <div
                  className="flex items-center gap-2 cursor-pointer hover:bg-secondary/50 p-2 rounded -mx-2 transition-colors"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform duration-200" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform duration-200" />
                  )}
                  <span className="text-xs font-medium text-muted-foreground">
                    {isError ? 'Error details' : 'Iteration completed'}
                  </span>
                </div>

                {/* Final agent message and result - only shown when expanded */}
                {isExpanded && (
                  <div className="mt-3 space-y-3 border-t pt-3">
                    {/* Final agent message */}
                    {message.currentAction && (
                      <div className="text-sm whitespace-pre-wrap animate-in fade-in slide-in-from-top-2 duration-300">
                        {message.currentAction}
                      </div>
                    )}

                    {/* Result description */}
                    <div className={cn(
                      "text-xs break-words whitespace-pre-wrap font-mono p-3 rounded border animate-in fade-in slide-in-from-top-2 duration-300",
                      isError
                        ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100"
                        : "bg-muted/50 border-border text-muted-foreground"
                    )}>
                      {message.resultDescription}
                    </div>
                  </div>
                )}
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

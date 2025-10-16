import { useState } from "react";
import { Loader2, CheckCircle2, AlertCircle, ChevronDown, ChevronRight } from "lucide-react";
import { ParsedClaudeMessage } from "@/utils/codexLogParser";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface IterationMessageProps {
  message: ParsedClaudeMessage;
}

/**
 * Component for rendering a single iteration message that updates dynamically
 * Shows current action and changes as the AI agent works
 */
export function IterationMessage({ message }: IterationMessageProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isCompleted = message.hasCompleted;
  const isError = message.icon === '❌';

  // Determine the display text
  const displayText = isCompleted && message.resultDescription
    ? message.currentAction // Show the agent's final message
    : message.currentAction;

  return (
    <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2">
      {/* Bot Icon */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800">
        {isCompleted ? (
          isError ? (
            <AlertCircle className="h-4 w-4 text-red-500" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          )
        ) : (
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
        )}
      </div>

      {/* Message Content */}
      <div className="flex flex-col gap-1 max-w-[80%]">
        <Card className={cn(
          "p-3 bg-card border",
          isError && "border-red-300 dark:border-red-700"
        )}>
          {/* Show loading state or current action */}
          {!isCompleted && (
            <div className="flex items-start gap-2">
              <Loader2 className="h-4 w-4 animate-spin mt-0.5 flex-shrink-0" />
              <p className="text-sm whitespace-pre-wrap">{displayText}</p>
            </div>
          )}

          {/* Show completion state */}
          {isCompleted && (
            <div>
              {/* Main message without title */}
              <p className="text-sm whitespace-pre-wrap">{displayText}</p>

              {/* Collapsible "Iteration completed" section */}
              {message.resultDescription && (
                <div className="mt-3">
                  <div
                    className="flex items-center gap-2 cursor-pointer hover:bg-secondary/50 p-2 rounded -mx-2"
                    onClick={() => setIsExpanded(!isExpanded)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className="text-xs font-medium text-muted-foreground">
                      {isError ? 'Error details' : 'Iteration completed'}
                    </span>
                  </div>

                  {isExpanded && (
                    <div className={cn(
                      "mt-2 text-xs break-words whitespace-pre-wrap font-mono p-3 rounded border animate-in fade-in slide-in-from-top-2",
                      isError
                        ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100"
                        : "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 text-muted-foreground"
                    )}>
                      {message.resultDescription}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

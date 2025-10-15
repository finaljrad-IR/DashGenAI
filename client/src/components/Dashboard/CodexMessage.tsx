import { useState } from "react";
import { Brain, Terminal, Bot, CheckCircle2, ChevronDown, ChevronRight } from "lucide-react";
import { ParsedCodexMessage } from "@/utils/codexLogParser";
import { cn } from "@/lib/utils";

interface CodexMessageProps {
  message: ParsedCodexMessage;
}

/**
 * Component for rendering a single Codex log message
 * Displays different UI based on message type (reasoning, command_execution, etc.)
 */
export function CodexMessage({ message }: CodexMessageProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  // Get icon based on message type
  const getIcon = () => {
    switch (message.messageType) {
      case 'reasoning':
        return <Brain className="h-4 w-4 text-blue-500" />;
      case 'command_execution':
        return <Terminal className="h-4 w-4 text-purple-500" />;
      case 'agent_message':
        return <Bot className="h-4 w-4 text-green-500" />;
      case 'turn_completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      default:
        return <Bot className="h-4 w-4 text-gray-500" />;
    }
  };

  // Get background color based on message type
  const getBackgroundColor = () => {
    switch (message.messageType) {
      case 'reasoning':
        return 'bg-blue-50 dark:bg-blue-950/20';
      case 'command_execution':
        return 'bg-purple-50 dark:bg-purple-950/20';
      case 'agent_message':
        return 'bg-green-50 dark:bg-green-950/20';
      case 'turn_completed':
        return 'bg-green-100 dark:bg-green-900/20';
      default:
        return 'bg-gray-50 dark:bg-gray-900/20';
    }
  };

  // Get border color based on message type
  const getBorderColor = () => {
    switch (message.messageType) {
      case 'reasoning':
        return 'border-blue-200 dark:border-blue-800';
      case 'command_execution':
        return 'border-purple-200 dark:border-purple-800';
      case 'agent_message':
        return 'border-green-200 dark:border-green-800';
      case 'turn_completed':
        return 'border-green-300 dark:border-green-700';
      default:
        return 'border-gray-200 dark:border-gray-800';
    }
  };

  // Check if this is an agent_message that should be collapsible
  const isCollapsible = message.messageType === 'agent_message';

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border",
        getBackgroundColor(),
        getBorderColor(),
        isCollapsible && "cursor-pointer hover:shadow-sm transition-shadow"
      )}
      onClick={() => isCollapsible && setIsExpanded(!isExpanded)}
    >
      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">
        {getIcon()}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Title with expand/collapse indicator */}
        <div className="flex items-center gap-2">
          <div className="font-medium text-sm text-foreground mb-1 flex-1">
            {message.title}
          </div>
          {isCollapsible && (
            <div className="flex-shrink-0">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          )}
        </div>

        {/* Description - for non-collapsible or when expanded */}
        {message.description && !isCollapsible && (
          <div className="text-xs text-muted-foreground break-words whitespace-pre-wrap font-mono">
            {message.description}
          </div>
        )}

        {/* Collapsible content for agent_message */}
        {isCollapsible && isExpanded && message.description && (
          <div className="mt-2 text-xs text-muted-foreground break-words whitespace-pre-wrap font-mono bg-background/50 p-3 rounded border border-current/10">
            {message.description}
          </div>
        )}

        {/* Status indicator for in-progress items */}
        {message.status === 'in_progress' && message.messageType !== 'turn_completed' && (
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <div className="animate-pulse">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
            <span>In progress...</span>
          </div>
        )}
      </div>
    </div>
  );
}

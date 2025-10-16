import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Loader2, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { sendChatMessageStreaming } from '@/api/dashboards';
import { getChatMessages, saveChatMessage, type ChatMessage as PersistedChatMessage } from '@/api/projects';
import { useToast } from '@/hooks/useToast';
import { parseClaudeOutput, ParsedClaudeMessage } from '@/utils/codexLogParser';
import { IterationMessage } from './IterationMessage';

interface Message {
  _id: string;
  role: 'user' | 'system';
  content: string;
  timestamp: string;
}

interface ChatInterfaceProps {
  dashboardId: string;
  projectId?: string;
  onDashboardUpdate?: () => void;
}

export function ChatInterface({ dashboardId, projectId, onDashboardUpdate }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIteration, setCurrentIteration] = useState<ParsedClaudeMessage | null>(null);
  const [completedIterations, setCompletedIterations] = useState<ParsedClaudeMessage[]>([]);
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const loadChatHistory = useCallback(async () => {
    if (!projectId) {
      console.log('[ChatInterface] No projectId provided, skipping chat history load');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      console.log('[ChatInterface] Loading chat messages for project:', projectId);
      const chatMessages = await getChatMessages(projectId);

      console.log('[ChatInterface] Loaded chat messages:', chatMessages.length);

      // Convert persisted messages to display format
      const userMessages: Message[] = [];
      const iterationMessages: ParsedClaudeMessage[] = [];

      chatMessages.forEach((msg: PersistedChatMessage) => {
        if (msg.messageType === 'user') {
          userMessages.push({
            _id: msg._id,
            role: 'user',
            content: msg.content,
            timestamp: msg.createdAt,
          });
        } else if (msg.messageType === 'iteration_completed' && msg.metadata) {
          // Reconstruct the iteration message from metadata
          iterationMessages.push({
            currentAction: msg.metadata.currentAction || msg.content,
            resultDescription: msg.metadata.resultDescription || '',
            icon: msg.metadata.icon || '✅',
            hasCompleted: true,
          });
        }
      });

      setMessages(userMessages);
      setCompletedIterations(iterationMessages);
      console.log('[ChatInterface] Loaded', userMessages.length, 'user messages and', iterationMessages.length, 'iteration messages');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load chat history';
      console.error('[ChatInterface] Error loading chat history:', errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [projectId, toast]);

  useEffect(() => {
    loadChatHistory();
  }, [projectId, loadChatHistory]);

  // Auto-scroll to bottom when messages or iteration updates
  useEffect(() => {
    if (scrollViewportRef.current) {
      scrollViewportRef.current.scrollTop = scrollViewportRef.current.scrollHeight;
    }
  }, [messages, currentIteration, completedIterations]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isSending) return;

    const userMessage = {
      _id: Date.now().toString(),
      role: 'user' as const,
      content: inputMessage,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    const messageToSend = inputMessage;
    setInputMessage('');
    setIsSending(true);
    setCurrentIteration(null); // Clear previous iteration

    // Save user message to database if projectId is available
    if (projectId) {
      try {
        console.log('[ChatInterface] Saving user message to database');
        await saveChatMessage(projectId, {
          messageType: 'user',
          content: messageToSend,
        });
        console.log('[ChatInterface] User message saved successfully');
      } catch (error) {
        console.error('[ChatInterface] Error saving user message:', error);
        // Don't show error toast, just log it - message is already in UI
      }
    }

    // Store raw output for parsing
    let rawOutput = '';

    try {
      console.log('[ChatInterface] Starting streaming request to Claude Code:', messageToSend);

      // Use streaming API for real-time updates
      const cleanup = sendChatMessageStreaming(
        dashboardId,
        messageToSend,
        // onChunk callback - handle each chunk as it arrives
        (data) => {
          console.log('[ChatInterface] Received chunk:', data);

          // Accumulate raw output
          const chunkStr = JSON.stringify(data);
          rawOutput += chunkStr + '\n';

          // Parse and update the single iteration message in real-time
          const parsedResponses = parseClaudeOutput(rawOutput);
          if (parsedResponses.length > 0) {
            // Always take the last (most recent) iteration message
            setCurrentIteration(parsedResponses[parsedResponses.length - 1]);
          }
          console.log('[ChatInterface] Updated iteration message');
        },
        // onComplete callback
        async (sessionId) => {
          console.log('[ChatInterface] Stream completed, session ID:', sessionId);

          // Save the completed iteration message to database if we have one and projectId
          if (currentIteration && projectId) {
            try {
              console.log('[ChatInterface] Saving completed iteration message to database');
              await saveChatMessage(projectId, {
                messageType: 'iteration_completed',
                content: currentIteration.currentAction || 'Iteration completed',
                metadata: {
                  sessionId,
                  resultDescription: currentIteration.resultDescription,
                  currentAction: currentIteration.currentAction,
                  icon: currentIteration.icon,
                  hasCompleted: true,
                },
              });
              console.log('[ChatInterface] Iteration message saved successfully');

              // Move current iteration to completed list
              setCompletedIterations(prev => [...prev, currentIteration]);
              setCurrentIteration(null);
            } catch (error) {
              console.error('[ChatInterface] Error saving iteration message:', error);
              // Don't show error toast, just log it
            }
          }

          setIsSending(false);

          // Trigger dashboard refresh
          if (onDashboardUpdate) {
            onDashboardUpdate();
            toast({
              title: "Dashboard Updated",
              description: "Your dashboard has been updated successfully.",
            });
          }
        },
        // onError callback
        (error) => {
          console.error('[ChatInterface] Stream error:', error);
          setIsSending(false);
          toast({
            title: "Error",
            description: error.message || 'Failed to send message',
            variant: "destructive",
          });
        }
      );

      // Store cleanup function (not needed for now, but could be useful for cancellation)
      // If component unmounts, this won't be called automatically
    } catch (error: unknown) {
      console.error('[ChatInterface] Error setting up stream:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      setIsSending(false);
    }
  };

  const formatTime = (timestamp: string | number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-background to-secondary/20">
      <div className="p-4 border-b bg-card/50 backdrop-blur-sm">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-2">
          <Bot className="h-5 w-5 text-blue-600" />
          Dashboard Assistant
        </h2>
        <p className="text-sm text-muted-foreground">Ask me to modify your dashboard</p>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div ref={scrollViewportRef} className="h-full overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Interleave user messages and completed iterations in chronological order */}
              {messages.map((message, idx) => (
                <div key={`message-group-${idx}`}>
                  {/* User Message */}
                  <div className="flex gap-3 flex-row-reverse animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
                      <User className="h-4 w-4 text-white" />
                    </div>

                    <div className="flex flex-col gap-1 max-w-[80%] items-end">
                      <Card className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 text-white border-0">
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </Card>
                      <span className="text-xs text-muted-foreground px-1">
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                  </div>

                  {/* Show completed iteration after user message if exists */}
                  {completedIterations[idx] && (
                    <div className="mt-4">
                      <IterationMessage message={completedIterations[idx]} />
                    </div>
                  )}
                </div>
              ))}

              {/* Show "Running claude code..." only if sending and no iteration message yet */}
              {isSending && !currentIteration && (
                <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800">
                    <Bot className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                  </div>
                  <Card className="p-3 bg-card border">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">Running AI agent...</span>
                    </div>
                  </Card>
                </div>
              )}

              {/* Current Iteration Message - single dynamic message */}
              {currentIteration && (
                <IterationMessage message={currentIteration} />
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t bg-card/50 backdrop-blur-sm">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask me to modify your dashboard..."
            disabled={isSending}
            className="flex-1"
          />
          <Button
            type="submit"
            size="icon"
            disabled={isSending || !inputMessage.trim()}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Changes will be applied in real-time
        </p>
      </div>
    </div>
  );
}

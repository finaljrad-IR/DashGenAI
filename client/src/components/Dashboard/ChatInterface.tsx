import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Loader2, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { sendChatMessageStreaming, getChatHistory } from '@/api/dashboards';
import { useToast } from '@/hooks/useToast';
import { parseClaudeOutput, ParsedClaudeMessage } from '@/utils/codexLogParser';
import { CodexMessage } from './CodexMessage';

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
  const [claudeResponses, setClaudeResponses] = useState<ParsedClaudeMessage[]>([]);
  const [displayedResponses, setDisplayedResponses] = useState<ParsedClaudeMessage[]>([]);
  const [hasReceivedFirstMessage, setHasReceivedFirstMessage] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const loadChatHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getChatHistory(dashboardId)
      if (response.messages) {
        setMessages(response.messages)
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load chat history'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false);
    }
  }, [dashboardId, toast])


  useEffect(() => {
    loadChatHistory();
  }, [dashboardId, loadChatHistory]);

  // Check if user was at the bottom before update
  const isScrolledToBottom = () => {
    if (!scrollViewportRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = scrollViewportRef.current;
    // Consider "at bottom" if within 100px of the bottom
    return scrollHeight - scrollTop - clientHeight < 100;
  };

  // Scroll to bottom function
  const scrollToBottom = () => {
    if (scrollViewportRef.current) {
      scrollViewportRef.current.scrollTop = scrollViewportRef.current.scrollHeight;
    }
  };

  // Process claude responses - when a new non-ignored message arrives, mark all previous as completed
  useEffect(() => {
    const visibleResponses = claudeResponses.filter(r => !r.shouldIgnore);

    if (visibleResponses.length > 0) {
      // Mark that we've received the first visible message
      if (!hasReceivedFirstMessage) {
        setHasReceivedFirstMessage(true);
      }

      // Update all previous messages to remove "in_progress" status when a new message arrives
      const updatedResponses = visibleResponses.map((response, index) => {
        // Keep "in_progress" only for the last message, remove it from all others
        if (index < visibleResponses.length - 1 && response.status === 'in_progress') {
          return { ...response, status: 'completed' as const };
        }
        return response;
      });

      setDisplayedResponses(updatedResponses);
    } else {
      setDisplayedResponses([]);
    }
  }, [claudeResponses, hasReceivedFirstMessage]);

  // Auto-scroll effect - only scroll if user was already at bottom
  useEffect(() => {
    const wasAtBottom = isScrolledToBottom();
    if (wasAtBottom) {
      // Small delay to ensure DOM has updated
      setTimeout(scrollToBottom, 10);
    }
  }, [messages, displayedResponses]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isSending) return

    const userMessage = {
      _id: Date.now().toString(),
      role: 'user' as const,
      content: inputMessage,
      timestamp: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMessage])
    const messageToSend = inputMessage
    setInputMessage('')
    setIsSending(true)
    setClaudeResponses([]) // Clear previous Claude responses
    setDisplayedResponses([]) // Clear displayed responses
    setHasReceivedFirstMessage(false) // Reset for new message

    // Store raw output for parsing
    let rawOutput = ''

    try {
      console.log('[ChatInterface] Starting streaming request to Claude Code:', messageToSend)

      // Use streaming API for real-time updates
      const cleanup = sendChatMessageStreaming(
        dashboardId,
        messageToSend,
        // onChunk callback - handle each chunk as it arrives
        (data) => {
          console.log('[ChatInterface] Received chunk:', data)

          // Accumulate raw output
          const chunkStr = JSON.stringify(data)
          rawOutput += chunkStr + '\n'

          // Parse and update Claude responses in real-time
          const parsedResponses = parseClaudeOutput(rawOutput)
          setClaudeResponses(parsedResponses)
          console.log('[ChatInterface] Updated Claude responses with new chunk, total:', parsedResponses.length)
        },
        // onComplete callback
        (sessionId) => {
          console.log('[ChatInterface] Stream completed, session ID:', sessionId)
          setIsSending(false)
          setHasReceivedFirstMessage(false)

          // Trigger dashboard refresh
          if (onDashboardUpdate) {
            onDashboardUpdate()
            toast({
              title: "Dashboard Updated",
              description: "Your dashboard has been updated successfully.",
            })
          }
        },
        // onError callback
        (error) => {
          console.error('[ChatInterface] Stream error:', error)
          setIsSending(false)
          setHasReceivedFirstMessage(false)
          toast({
            title: "Error",
            description: error.message || 'Failed to send message',
            variant: "destructive",
          })
        }
      )

      // Store cleanup function (not needed for now, but could be useful for cancellation)
      // If component unmounts, this won't be called automatically
    } catch (error: unknown) {
      console.error('[ChatInterface] Error setting up stream:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      setIsSending(false)
      setHasReceivedFirstMessage(false)
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
              {messages.map((message) => (
                <div
                  key={message._id}
                  className={`flex gap-3 animate-in fade-in slide-in-from-bottom-2 ${
                    message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-blue-500 to-purple-600'
                      : 'bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800'
                  }`}>
                    {message.role === 'user' ? (
                      <User className="h-4 w-4 text-white" />
                    ) : (
                      <Bot className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                    )}
                  </div>

                  <div className={`flex flex-col gap-1 max-w-[80%] ${
                    message.role === 'user' ? 'items-end' : 'items-start'
                  }`}>
                    <Card className={`p-3 ${
                      message.role === 'user'
                        ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white border-0'
                        : 'bg-card border'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </Card>
                    <span className="text-xs text-muted-foreground px-1">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                </div>
              ))}

              {/* Show "Running claude code..." only if sending and no visible messages received yet */}
              {isSending && !hasReceivedFirstMessage && (
                <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800">
                    <Bot className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                  </div>
                  <Card className="p-3 bg-card border">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">Running claude code...</span>
                    </div>
                  </Card>
                </div>
              )}

              {/* Claude Code Responses */}
              {displayedResponses.length > 0 && (
                <div className="mt-4 space-y-3">
                  {displayedResponses.map((response) => (
                    <div key={response.id} className="animate-in fade-in slide-in-from-bottom-2">
                      <CodexMessage message={response} />
                    </div>
                  ))}
                </div>
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

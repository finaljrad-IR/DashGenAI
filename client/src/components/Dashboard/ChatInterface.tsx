import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Loader2, Bot, User, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { sendChatMessage, getChatHistory } from '@/api/dashboards';
import { runCodexOnProject, streamProjectLogs } from '@/api/projects';
import { useToast } from '@/hooks/useToast';

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

interface CodexLog {
  id: string;
  type: 'json' | 'text' | 'error';
  content: string;
  timestamp: string;
}

export function ChatInterface({ dashboardId, projectId, onDashboardUpdate }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCodexRunning, setIsCodexRunning] = useState(false);
  const [codexLogs, setCodexLogs] = useState<CodexLog[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
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

  useEffect(() => {
    scrollToBottom();
  }, [messages, codexLogs]);

  useEffect(() => {
    // Cleanup EventSource on unmount
    return () => {
      if (eventSourceRef.current) {
        console.log('Closing EventSource connection');
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

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
    setInputMessage('')
    setIsSending(true)

    try {
      const response = await sendChatMessage(dashboardId, inputMessage)

      if (response.reply) {
        const assistantMessage = {
          _id: (Date.now() + 1).toString(),
          role: 'system' as const,
          content: response.reply,
          timestamp: new Date().toISOString(),
        }
        setMessages(prev => [...prev, assistantMessage])
      }

      if (response.status === 'completed' && onDashboardUpdate) {
        onDashboardUpdate()
        toast({
          title: "Dashboard Updated",
          description: "Your dashboard has been updated successfully.",
        })
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const handleRunCodex = async () => {
    if (!projectId) {
      toast({
        title: "Error",
        description: "Project ID not available",
        variant: "destructive",
      });
      return;
    }

    if (isCodexRunning) {
      return;
    }

    console.log('Starting Codex execution for project:', projectId);
    setIsCodexRunning(true);
    setCodexLogs([]);

    try {
      // Start Codex execution
      const response = await runCodexOnProject(projectId);
      console.log('Codex execution started:', response);

      toast({
        title: "Codex Started",
        description: response.message || "Codex is now running on your project",
      });

      // Start streaming logs
      const eventSource = streamProjectLogs(
        projectId,
        (data) => {
          console.log('Received log data:', data);

          const newLog: CodexLog = {
            id: Date.now().toString() + Math.random(),
            type: data.type === 'json' ? 'json' : data.type === 'error' ? 'error' : 'text',
            content: typeof data.data === 'string' ? data.data : JSON.stringify(data.data, null, 2),
            timestamp: new Date().toISOString(),
          };

          setCodexLogs(prev => [...prev, newLog]);

          // Check if Codex has completed
          if (data.type === 'json' && typeof data.data === 'object' && data.data !== null) {
            const jsonData = data.data as { status?: string };
            if (jsonData.status === 'completed') {
              console.log('Codex execution completed');
              setIsCodexRunning(false);
              if (onDashboardUpdate) {
                onDashboardUpdate();
              }
              toast({
                title: "Codex Completed",
                description: "Your dashboard has been updated successfully",
              });
            }
          }
        },
        (error) => {
          console.error('Error in log stream:', error);
          setIsCodexRunning(false);
          toast({
            title: "Log Stream Error",
            description: error.message || "Failed to stream logs",
            variant: "destructive",
          });
        }
      );

      eventSourceRef.current = eventSource;
    } catch (error: unknown) {
      console.error('Error starting Codex:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start Codex';
      setIsCodexRunning(false);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-background to-secondary/20">
      <div className="p-4 border-b bg-card/50 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-600" />
            Dashboard Assistant
          </h2>
          {projectId && (
            <Button
              onClick={handleRunCodex}
              disabled={isCodexRunning}
              size="sm"
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {isCodexRunning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Run Codex
                </>
              )}
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">Ask me to modify your dashboard</p>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
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
            
            {isSending && (
              <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800">
                  <Bot className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                </div>
                <Card className="p-3 bg-card border">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Thinking...</span>
                  </div>
                </Card>
              </div>
            )}

            {/* Codex Execution Logs */}
            {codexLogs.length > 0 && (
              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <Wand2 className="h-4 w-4 text-purple-600" />
                  <h3 className="text-sm font-semibold text-purple-600">Codex Execution</h3>
                  {isCodexRunning && <Loader2 className="h-4 w-4 animate-spin text-purple-600" />}
                </div>
                {codexLogs.map((log) => (
                  <Card
                    key={log.id}
                    className={`p-3 animate-in fade-in slide-in-from-bottom-1 ${
                      log.type === 'json'
                        ? 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800'
                        : log.type === 'error'
                        ? 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
                        : 'bg-gray-50 border-gray-200 dark:bg-gray-900 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <pre className="text-xs whitespace-pre-wrap font-mono overflow-x-auto">
                          {log.content}
                        </pre>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground mt-1 block">
                      {formatTime(log.timestamp)}
                    </span>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
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
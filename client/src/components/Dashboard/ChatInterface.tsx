import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { sendChatMessage, getChatHistory } from '@/api/dashboards';
import { useToast } from '@/hooks/useToast';

interface Message {
  _id: string;
  role: 'user' | 'system';
  content: string;
  timestamp: string;
}

interface ChatInterfaceProps {
  dashboardId: string;
  onDashboardUpdate?: () => void;
}

export function ChatInterface({ dashboardId, onDashboardUpdate }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadChatHistory();
  }, [dashboardId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadChatHistory = async () => {
    console.log('Loading chat history for dashboard:', dashboardId);
    try {
      const response = await getChatHistory(dashboardId) as any;
      console.log('Chat history loaded:', response.messages.length, 'messages');
      setMessages(response.messages);
    } catch (error: any) {
      console.error('Failed to load chat history:', error);
      toast({
        title: 'Error',
        description: 'Failed to load chat history',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || isSending) return;

    const userMessage: Message = {
      _id: 'temp_' + Date.now(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };

    console.log('Sending chat message:', inputMessage);
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsSending(true);

    try {
      const response = await sendChatMessage(dashboardId, inputMessage) as any;
      console.log('Chat response received:', response);
      
      const systemMessage: Message = {
        _id: 'msg_' + Date.now(),
        role: 'system',
        content: response.reply,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, systemMessage]);

      if (response.status === 'completed' && onDashboardUpdate) {
        console.log('Dashboard update completed, triggering refresh');
        setTimeout(() => {
          onDashboardUpdate();
        }, 1000);
      }
    } catch (error: any) {
      console.error('Failed to send message:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-background to-secondary/20">
      <div className="p-4 border-b bg-card/50 backdrop-blur-sm">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Bot className="h-5 w-5 text-blue-600" />
          Dashboard Assistant
        </h2>
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
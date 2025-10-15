/**
 * Utility for parsing Codex logs from Daytona sandbox
 * Handles different message types and formats them for display
 */

export interface CodexLogItem {
  type: string;
  item?: {
    id: string;
    type: string;
    text?: string;
    command?: string;
    aggregated_output?: string;
    status?: string;
  };
  usage?: {
    input_tokens: number;
    cached_input_tokens: number;
    output_tokens: number;
  };
}

export interface ParsedCodexMessage {
  id: string;
  messageType: 'reasoning' | 'command_execution' | 'agent_message' | 'turn_completed' | 'unknown';
  title: string;
  description?: string;
  icon?: string;
  timestamp: number;
  status?: 'in_progress' | 'completed';
  rawData?: CodexLogItem;
}

/**
 * Parse a single Codex log line (JSON string) into a structured message
 */
export function parseCodexLogLine(logLine: string): ParsedCodexMessage | null {
  try {
    // Try to parse as JSON
    const data: CodexLogItem = JSON.parse(logLine);

    // Handle item.started events
    if (data.type === 'item.started' && data.item) {
      return parseItemStarted(data);
    }

    // Handle item.completed events - we ignore these per requirements
    if (data.type === 'item.completed') {
      return null;
    }

    // Handle turn.completed events
    if (data.type === 'turn.completed') {
      return parseTurnCompleted(data);
    }

    // Unknown message type - show it as unparsed
    return parseUnknownMessage(data);
  } catch (error) {
    // Not valid JSON or parsing error, ignore
    console.debug('Failed to parse Codex log line:', error);
    return null;
  }
}

/**
 * Parse item.started messages
 */
function parseItemStarted(data: CodexLogItem): ParsedCodexMessage | null {
  if (!data.item) return null;

  const baseMessage: ParsedCodexMessage = {
    id: data.item.id,
    messageType: 'unknown',
    title: '',
    timestamp: Date.now(),
    status: data.item.status as 'in_progress' | 'completed' || 'in_progress',
    rawData: data,
  };

  // Handle reasoning type
  if (data.item.type === 'reasoning') {
    return {
      ...baseMessage,
      messageType: 'reasoning',
      title: 'Thinking...',
      description: data.item.text || '',
      icon: '🧠',
    };
  }

  // Handle command_execution type
  if (data.item.type === 'command_execution') {
    return {
      ...baseMessage,
      messageType: 'command_execution',
      title: 'Running a command',
      description: data.item.command || '',
      icon: '⚙️',
    };
  }

  // Handle agent_message type
  if (data.item.type === 'agent_message') {
    return {
      ...baseMessage,
      messageType: 'agent_message',
      title: 'Codex Response',
      description: data.item.text || '',
      icon: '🤖',
      status: 'completed',
    };
  }

  return null;
}

/**
 * Parse turn.completed messages
 */
function parseTurnCompleted(data: CodexLogItem): ParsedCodexMessage {
  return {
    id: `turn-completed-${Date.now()}`,
    messageType: 'turn_completed',
    title: 'Codex task completed',
    description: data.usage
      ? `Used ${data.usage.input_tokens} input tokens, ${data.usage.output_tokens} output tokens`
      : undefined,
    icon: '✅',
    timestamp: Date.now(),
    status: 'completed',
    rawData: data,
  };
}

/**
 * Parse unknown/unparsed messages
 */
function parseUnknownMessage(data: CodexLogItem): ParsedCodexMessage {
  return {
    id: `unknown-${Date.now()}-${Math.random()}`,
    messageType: 'unknown',
    title: `Unknown message type: ${data.type}`,
    description: JSON.stringify(data, null, 2),
    icon: '❓',
    timestamp: Date.now(),
    status: 'completed',
    rawData: data,
  };
}

/**
 * Parse multiple log lines at once
 */
export function parseCodexLogs(logs: string): ParsedCodexMessage[] {
  const lines = logs.split('\n').filter(line => line.trim().length > 0);
  const messages: ParsedCodexMessage[] = [];

  for (const line of lines) {
    const parsed = parseCodexLogLine(line);
    if (parsed) {
      messages.push(parsed);
    }
  }

  return messages;
}

/**
 * Merge new messages with existing ones, avoiding duplicates
 * When a new message arrives, mark all previous messages as "completed"
 */
export function mergeCodexMessages(
  existing: ParsedCodexMessage[],
  newMessages: ParsedCodexMessage[]
): ParsedCodexMessage[] {
  if (newMessages.length === 0) {
    return existing;
  }

  // Mark all existing messages as completed
  const updatedExisting = existing.map(msg => ({
    ...msg,
    status: 'completed' as const,
  }));

  // Filter out duplicate new messages
  const existingIds = new Set(existing.map(m => m.id));
  const uniqueNew = newMessages.filter(m => !existingIds.has(m.id));

  return [...updatedExisting, ...uniqueNew];
}

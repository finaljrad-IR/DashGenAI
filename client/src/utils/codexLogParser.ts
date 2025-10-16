/**
 * Utility for parsing Claude Code output from Daytona sandbox
 * Handles stream-json format from Claude Code CLI
 */

export interface ClaudeCodeOutput {
  type: string;
  subtype?: string;
  is_error?: boolean;
  duration_ms?: number;
  duration_api_ms?: number;
  num_turns?: number;
  result?: string;
  session_id?: string;
  total_cost_usd?: number;
  usage?: {
    input_tokens: number;
    cache_creation_input_tokens: number;
    cache_read_input_tokens: number;
    output_tokens: number;
    server_tool_use?: {
      web_search_requests: number;
    };
    service_tier: string;
    cache_creation?: {
      ephemeral_1h_input_tokens: number;
      ephemeral_5m_input_tokens: number;
    };
  };
  modelUsage?: Record<string, {
    inputTokens: number;
    outputTokens: number;
    cacheReadInputTokens: number;
    cacheCreationInputTokens: number;
    webSearchRequests: number;
    costUSD: number;
    contextWindow: number;
  }>;
  permission_denials?: unknown[];
  uuid?: string;
  message?: {
    content?: Array<{
      text?: string;
      type?: string;
      name?: string;
    }>;
  };
}

export interface ParsedClaudeMessage {
  id: string;
  messageType: 'result' | 'error' | 'raw' | 'assistant' | 'system' | 'tool' | 'iteration';
  title: string;
  description?: string;
  icon?: string;
  timestamp: number;
  status?: 'in_progress' | 'completed';
  rawData?: ClaudeCodeOutput;
  shouldIgnore?: boolean;
  // For iteration message type
  currentAction?: string;
  hasCompleted?: boolean;
  resultDescription?: string;
}

// Tool name to user-friendly message mapping
const TOOL_MESSAGES: Record<string, string> = {
  'edit': 'Editing files',
  'write': 'Writing files',
  'read': 'Reading files',
  'websearch': 'Searching the web',
  'bash': 'Running a command',
  'ls': 'Listing files',
  'multiedit': 'Editing files',
  'killbash': 'Stopping a command',
  'bashoutput': 'Getting the command run output',
};

/**
 * Parse Claude Code JSON output into structured messages
 * Groups all messages into a single iteration message that updates dynamically
 */
export function parseClaudeOutput(output: string): ParsedClaudeMessage[] {
  const messages: ParsedClaudeMessage[] = [];
  let currentAction = '';
  let hasResult = false;
  let resultDescription = '';
  let isError = false;

  // Split by newlines to handle multiple JSON objects
  const lines = output.split('\n').filter(line => line.trim() !== '');

  for (const line of lines) {
    try {
      // Try to parse as JSON
      const data: ClaudeCodeOutput = JSON.parse(line);

      // Ignore status and system messages
      if (data.type === 'status' || data.type === 'system') {
        continue;
      }

      // Ignore user messages with tool_result
      if (data.type === 'user') {
        const contentItems = data.message?.content || [];
        const hasOnlyToolResults = contentItems.length > 0 &&
          contentItems.every(item => item.type === 'tool_result');
        if (hasOnlyToolResults) {
          continue;
        }
      }

      // Handle assistant messages
      if (data.type === 'assistant') {
        const contentItems = data.message?.content || [];

        // Ignore messages that ONLY contain tool_result types
        const hasOnlyToolResults = contentItems.length > 0 &&
          contentItems.every(item => item.type === 'tool_result');

        if (hasOnlyToolResults) {
          continue;
        }

        // Check if any content item has a name (tool usage)
        const toolItems = contentItems.filter(item => item.name && item.type !== 'tool_result');

        if (toolItems.length > 0) {
          // Update current action with the last tool
          for (const contentItem of toolItems) {
            if (contentItem.name) {
              const toolName = contentItem.name.toLowerCase();
              const friendlyMessage = TOOL_MESSAGES[toolName];
              if (friendlyMessage) {
                currentAction = friendlyMessage;
              }
            }
          }
          continue;
        }

        // Regular assistant message (text content)
        const textItems = contentItems.filter(item => item.text && item.type !== 'tool_result');
        if (textItems.length > 0) {
          const textContent = textItems.map(item => item.text).join('\n');
          // This is the AI's response - set as current action
          currentAction = textContent;
        }
        continue;
      }

      // Handle result type - marks iteration as complete
      if (data.type === 'result') {
        hasResult = true;
        isError = data.is_error || false;
        resultDescription = data.result || 'Task completed';
        continue;
      }
    } catch (error) {
      // Not valid JSON for this line, skip it
      console.debug('Failed to parse line as JSON:', line, error);
    }
  }

  // Create single iteration message that represents the entire execution
  if (currentAction || hasResult) {
    messages.push({
      id: `iteration-${Date.now()}`,
      messageType: 'iteration',
      title: 'AI Agent',
      currentAction: currentAction || 'Starting...',
      hasCompleted: hasResult,
      resultDescription: resultDescription,
      icon: hasResult ? (isError ? '❌' : '✅') : '🔄',
      timestamp: Date.now(),
      status: hasResult ? 'completed' : 'in_progress',
    });
  }

  return messages;
}

/**
 * Extract session ID from Claude Code output
 */
export function extractSessionId(output: string): string | null {
  try {
    const data: ClaudeCodeOutput = JSON.parse(output);
    return data.session_id || null;
  } catch (error) {
    console.debug('Failed to extract session ID from output:', error);
    return null;
  }
}

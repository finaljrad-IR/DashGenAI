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
  messageType: 'result' | 'error' | 'raw' | 'assistant' | 'system' | 'tool';
  title: string;
  description?: string;
  icon?: string;
  timestamp: number;
  status?: 'in_progress' | 'completed';
  rawData?: ClaudeCodeOutput;
  shouldIgnore?: boolean;
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
 * Handles multiple JSON objects separated by newlines
 */
export function parseClaudeOutput(output: string): ParsedClaudeMessage[] {
  const messages: ParsedClaudeMessage[] = [];

  // Split by newlines to handle multiple JSON objects
  const lines = output.split('\n').filter(line => line.trim() !== '');

  for (const line of lines) {
    try {
      // Try to parse as JSON
      const data: ClaudeCodeOutput = JSON.parse(line);

      // Rule 0: Ignore messages with type "status"
      if (data.type === 'status') {
        messages.push({
          id: data.uuid || `status-${Date.now()}-${Math.random()}`,
          messageType: 'system',
          title: 'Status Message',
          timestamp: Date.now(),
          shouldIgnore: true,
          rawData: data,
        });
        continue;
      }

      // Rule 1: Ignore messages with type "system"
      if (data.type === 'system') {
        messages.push({
          id: data.uuid || `system-${Date.now()}-${Math.random()}`,
          messageType: 'system',
          title: 'System Message',
          timestamp: Date.now(),
          shouldIgnore: true,
          rawData: data,
        });
        continue;
      }

      // Rule 2: Handle messages with type "assistant"
      if (data.type === 'assistant') {
        const contentItems = data.message?.content || [];

        // Ignore messages that ONLY contain tool_result types
        const hasOnlyToolResults = contentItems.length > 0 &&
          contentItems.every(item => item.type === 'tool_result');

        if (hasOnlyToolResults) {
          messages.push({
            id: data.uuid || `tool-result-${Date.now()}-${Math.random()}`,
            messageType: 'system',
            title: 'Tool Result',
            timestamp: Date.now(),
            shouldIgnore: true,
            rawData: data,
          });
          continue;
        }

        // Check if any content item has a name (tool usage) or is a tool_result
        const toolItems = contentItems.filter(item => item.name && item.type !== 'tool_result');

        if (toolItems.length > 0) {
          // Parse tool usage - there can be many tools
          for (const contentItem of toolItems) {
            if (contentItem.name) {
              const toolName = contentItem.name.toLowerCase();
              const friendlyMessage = TOOL_MESSAGES[toolName];

              if (friendlyMessage) {
                // Known tool - create user-friendly message
                messages.push({
                  id: `${data.uuid || Date.now()}-tool-${toolName}-${Math.random()}`,
                  messageType: 'tool',
                  title: friendlyMessage,
                  icon: '🔧',
                  timestamp: Date.now(),
                  status: 'in_progress',
                  rawData: data,
                });
              } else {
                // Unknown tool - show entire JSON
                messages.push({
                  id: `${data.uuid || Date.now()}-tool-unknown-${Math.random()}`,
                  messageType: 'raw',
                  title: 'Unknown Tool Usage',
                  description: JSON.stringify(data, null, 2),
                  icon: '⚠️',
                  timestamp: Date.now(),
                  status: 'completed',
                  rawData: data,
                });
              }
            }
          }
          continue;
        }

        // Regular assistant message (text content) - only process text that's not tool_result
        const textItems = contentItems.filter(item => item.text && item.type !== 'tool_result');
        if (textItems.length > 0) {
          const textContent = textItems.map(item => item.text).join('\n') || 'Agent message';
          messages.push({
            id: data.uuid || `assistant-${Date.now()}-${Math.random()}`,
            messageType: 'assistant',
            title: 'Agent Message',
            description: textContent,
            icon: '🤖',
            timestamp: Date.now(),
            status: 'completed',
            rawData: data,
          });
        }
        continue;
      }

      // Rule 3: Handle result type with collapsible dropdown
      if (data.type === 'result') {
        messages.push({
          id: data.uuid || `result-${Date.now()}-${Math.random()}`,
          messageType: 'result',
          title: data.is_error ? 'Claude Code Error' : 'Claude Code Completed',
          description: data.result || 'Task completed',
          icon: data.is_error ? '❌' : '✅',
          timestamp: Date.now(),
          status: 'completed',
          rawData: data,
        });
        continue;
      }

      // Unknown type - show raw JSON
      messages.push({
        id: `unknown-${Date.now()}-${Math.random()}`,
        messageType: 'raw',
        title: 'Claude Code Response',
        description: JSON.stringify(data, null, 2),
        icon: '📋',
        timestamp: Date.now(),
        status: 'completed',
        rawData: data,
      });
    } catch (error) {
      // Not valid JSON for this line, skip it or add as raw if it's meaningful
      console.debug('Failed to parse line as JSON:', line, error);
      if (line.trim().length > 0) {
        messages.push({
          id: `raw-${Date.now()}-${Math.random()}`,
          messageType: 'raw',
          title: 'Claude Code Output',
          description: line,
          icon: '📋',
          timestamp: Date.now(),
          status: 'completed',
        });
      }
    }
  }

  // If no messages were parsed successfully, return a single raw message
  if (messages.length === 0) {
    messages.push({
      id: `raw-${Date.now()}`,
      messageType: 'raw',
      title: 'Claude Code Output',
      description: output,
      icon: '📋',
      timestamp: Date.now(),
      status: 'completed',
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

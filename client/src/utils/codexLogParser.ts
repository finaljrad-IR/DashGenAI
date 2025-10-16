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
    }>;
  };
}

export interface ParsedClaudeMessage {
  id: string;
  messageType: 'result' | 'error' | 'raw' | 'assistant' | 'system';
  title: string;
  description?: string;
  icon?: string;
  timestamp: number;
  status?: 'in_progress' | 'completed';
  rawData?: ClaudeCodeOutput;
  shouldIgnore?: boolean;
}

/**
 * Parse Claude Code JSON output into a structured message
 */
export function parseClaudeOutput(output: string): ParsedClaudeMessage {
  try {
    // Try to parse as JSON
    const data: ClaudeCodeOutput = JSON.parse(output);

    // Rule 1: Ignore messages with type "system"
    if (data.type === 'system') {
      return {
        id: data.uuid || `system-${Date.now()}`,
        messageType: 'system',
        title: 'System Message',
        timestamp: Date.now(),
        shouldIgnore: true,
        rawData: data,
      };
    }

    // Rule 2: Handle messages with type "assistant"
    if (data.type === 'assistant') {
      const textContent = data.message?.content?.[0]?.text || 'Agent message';
      return {
        id: data.uuid || `assistant-${Date.now()}`,
        messageType: 'assistant',
        title: 'Agent Message',
        description: textContent,
        icon: '🤖',
        timestamp: Date.now(),
        status: 'completed',
        rawData: data,
      };
    }

    // Rule 3: Handle result type with collapsible dropdown
    if (data.type === 'result') {
      return {
        id: data.uuid || `result-${Date.now()}`,
        messageType: 'result',
        title: data.is_error ? 'Claude Code Error' : 'Claude Code Completed',
        description: data.result || 'Task completed',
        icon: data.is_error ? '❌' : '✅',
        timestamp: Date.now(),
        status: 'completed',
        rawData: data,
      };
    }

    // Unknown type - show raw JSON
    return {
      id: `unknown-${Date.now()}`,
      messageType: 'raw',
      title: 'Claude Code Response',
      description: JSON.stringify(data, null, 2),
      icon: '📋',
      timestamp: Date.now(),
      status: 'completed',
      rawData: data,
    };
  } catch (error) {
    // Not valid JSON, return raw output
    console.debug('Failed to parse Claude Code output, returning raw text:', error);
    return {
      id: `raw-${Date.now()}`,
      messageType: 'raw',
      title: 'Claude Code Output',
      description: output,
      icon: '📋',
      timestamp: Date.now(),
      status: 'completed',
    };
  }
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

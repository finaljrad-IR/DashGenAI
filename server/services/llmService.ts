import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendRequestToOpenAI(model: string, messages: Array<{ role: string; content: string }>): Promise<string> {
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const response = await openai.chat.completions.create({
        model: model,
        messages: messages as Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
        max_tokens: 1024,
      });
      return response.choices[0].message.content || '';
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : 'No stack trace';
      console.error(`Error sending request to OpenAI (attempt ${i + 1}):`, errorMessage, errorStack);
      if (i === MAX_RETRIES - 1) throw error;
      await sleep(RETRY_DELAY);
    }
  }
  return '';
}

async function sendRequestToAnthropic(model: string, messages: Array<{ role: string; content: string }>): Promise<string> {
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      console.log(`Sending request to Anthropic with model: ${model}`);
      // Filter out system messages for Anthropic (they handle it differently)
      const userMessages = messages.filter(m => m.role !== 'system');
      const systemMessage = messages.find(m => m.role === 'system')?.content;

      const response = await anthropic.messages.create({
        model: model,
        messages: userMessages as Array<{ role: 'user' | 'assistant'; content: string }>,
        max_tokens: 1024,
        ...(systemMessage && { system: systemMessage }),
      });
      console.log(`Received response from Anthropic`);
      return response.content[0].type === 'text' ? response.content[0].text : '';
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : 'No stack trace';
      console.error(`Error sending request to Anthropic (attempt ${i + 1}):`, errorMessage, errorStack);
      if (i === MAX_RETRIES - 1) throw error;
      await sleep(RETRY_DELAY);
    }
  }
  return '';
}

async function sendLLMRequest(messages: Array<{ role: string; content: string }>, provider: string = 'openai', model?: string): Promise<string> {
  const defaultModel = provider === 'openai' ? 'gpt-3.5-turbo' : 'claude-3-haiku-20240307';
  const selectedModel = model || defaultModel;

  switch (provider.toLowerCase()) {
    case 'openai':
      return sendRequestToOpenAI(selectedModel, messages);
    case 'anthropic':
      return sendRequestToAnthropic(selectedModel, messages);
    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }
}

export {
  sendLLMRequest
};
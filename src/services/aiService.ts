/**
 * AI Service for NVIDIA NIM API
 * Models supported: moonshotai/kimi-k3, Qwen models, meta/llama-3.2-vision, etc.
 */

const NVIDIA_INVOKE_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const DEFAULT_API_KEY =
  (typeof import.meta !== 'undefined' &&
    (import.meta as { env?: Record<string, string> }).env?.VITE_NVIDIA_API_KEY) ||
  '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';

export type SupportedAiModel =
  | 'moonshotai/kimi-k3'
  | 'moonshotai/kimi-k2.6'
  | 'meta/llama-3.2-11b-vision-instruct'
  | 'deepseek-ai/deepseek-v4-pro-0813';

export interface ChatMessageContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string; // URL or data:image/jpeg;base64,...
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | ChatMessageContentPart[];
}

export interface CompletionOptions {
  model?: SupportedAiModel | string;
  temperature?: number;
  maxTokens?: number;
  reasoningEffort?: 'low' | 'medium' | 'high' | 'max';
  stream?: boolean;
}

/**
 * Send a non-streaming chat completion request
 */
export async function sendChatCompletion(
  messages: ChatMessage[],
  options: CompletionOptions = {}
): Promise<string> {
  const model = options.model || 'moonshotai/kimi-k3';
  const temperature = options.temperature ?? 0.7;
  const maxTokens = options.maxTokens ?? 4096;

  const payload: Record<string, unknown> = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: false,
  };

  if (options.reasoningEffort && model.includes('kimi-k3')) {
    payload.reasoning_effort = options.reasoningEffort;
  }

  const response = await fetch(NVIDIA_INVOKE_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DEFAULT_API_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`NVIDIA API Error (${response.status}): ${errText}`);
  }

  const json = await response.json();
  const content = json.choices?.[0]?.message?.content;
  return content || '';
}

/**
 * Stream a chat completion response chunk by chunk
 */
export async function streamChatCompletion(
  messages: ChatMessage[],
  onChunk: (chunk: string) => void,
  options: CompletionOptions = {}
): Promise<string> {
  const model = options.model || 'moonshotai/kimi-k3';
  const temperature = options.temperature ?? 0.7;
  const maxTokens = options.maxTokens ?? 8192;

  const payload: Record<string, unknown> = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: true,
  };

  if (options.reasoningEffort && model.includes('kimi-k3')) {
    payload.reasoning_effort = options.reasoningEffort;
  }

  const response = await fetch(NVIDIA_INVOKE_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DEFAULT_API_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`NVIDIA API Streaming Error (${response.status}): ${errText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('ReadableStream not supported by browser.');
  }

  const decoder = new TextDecoder('utf-8');
  let fullText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(':')) continue;
      if (trimmed === 'data: [DONE]') return fullText;

      if (trimmed.startsWith('data: ')) {
        try {
          const json = JSON.parse(trimmed.slice(6));
          const delta = json.choices?.[0]?.delta?.content || '';
          if (delta) {
            fullText += delta;
            onChunk(delta);
          }
        } catch {
          // ignore incomplete json chunk in SSE
        }
      }
    }
  }

  return fullText;
}

/**
 * Solve an academic exercise or describe an image with Moonshot Kimi K3 / Vision
 */
export async function analyzeExerciseImage(
  question: string,
  imageUrl: string,
  onChunk?: (chunk: string) => void
): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: question || 'اشرح وحل هذا التمرين المدرسي خطوة بخطوة باللغة العربية مع القواعد والصيغ الرياضية/العلمية اللازمة.',
        },
        {
          type: 'image_url',
          image_url: {
            url: imageUrl,
          },
        },
      ],
    },
  ];

  if (onChunk) {
    return streamChatCompletion(messages, onChunk, {
      model: 'moonshotai/kimi-k3',
      reasoningEffort: 'max',
    });
  }

  return sendChatCompletion(messages, {
    model: 'moonshotai/kimi-k3',
    reasoningEffort: 'max',
  });
}

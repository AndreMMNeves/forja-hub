// Anthropic adapter — usa messages.parse() + zodOutputFormat (SDK 0.100+).
// Sem tool_choice manual, sem regex pra extrair JSON: o SDK valida o output
// contra o schema Zod e devolve `parsed_output` tipado.

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type {
  GenerateStructuredArgs,
  GenerateStructuredResult,
  LLMProvider,
} from "./provider";

export interface AnthropicAdapterOptions {
  apiKey: string;
  defaultModel?: string;
}

const DEFAULT_MODEL = "claude-sonnet-4-6";
const DEFAULT_MAX_TOKENS = 4096;

export class AnthropicAdapter implements LLMProvider {
  readonly name = "anthropic";
  readonly defaultModel: string;
  private client: Anthropic;

  constructor(opts: AnthropicAdapterOptions) {
    this.client = new Anthropic({ apiKey: opts.apiKey });
    this.defaultModel = opts.defaultModel ?? DEFAULT_MODEL;
  }

  async generateStructured<T>(
    args: GenerateStructuredArgs<T>,
  ): Promise<GenerateStructuredResult<T>> {
    const model = args.model ?? this.defaultModel;
    const started = Date.now();

    const message = await this.client.messages.parse({
      model,
      max_tokens: args.maxTokens ?? DEFAULT_MAX_TOKENS,
      ...(args.temperature !== undefined ? { temperature: args.temperature } : {}),
      ...(args.systemPrompt ? { system: args.systemPrompt } : {}),
      messages: [{ role: "user", content: args.userPrompt }],
      output_config: {
        format: zodOutputFormat(args.schema),
      },
    });

    const parsed = message.parsed_output;
    if (parsed === null || parsed === undefined) {
      throw new Error(
        `Anthropic não devolveu parsed_output. stop_reason=${message.stop_reason}`,
      );
    }

    return {
      data: parsed as T,
      usage: {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
        ...(message.usage.cache_read_input_tokens != null
          ? { cacheReadTokens: message.usage.cache_read_input_tokens }
          : {}),
        ...(message.usage.cache_creation_input_tokens != null
          ? { cacheCreationTokens: message.usage.cache_creation_input_tokens }
          : {}),
      },
      model,
      provider: this.name,
      durationMs: Date.now() - started,
    };
  }
}

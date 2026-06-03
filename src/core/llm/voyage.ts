// Voyage AI adapter — embeddings 1024d (voyage-3-large).
// Documentos e queries usam inputType diferente (recomendado pela Voyage)
// pra melhorar retrieval. Batch suportado até 128 itens.

import { VoyageAIClient } from "voyageai";
import type {
  EmbedArgs,
  EmbedResult,
  EmbeddingProvider,
} from "./provider";

export interface VoyageAdapterOptions {
  apiKey: string;
  defaultModel?: string;
  dimensions?: number;
}

const DEFAULT_MODEL = "voyage-3-large";
const DEFAULT_DIMENSIONS = 1024;

export class VoyageAdapter implements EmbeddingProvider {
  readonly name = "voyage";
  readonly defaultModel: string;
  readonly dimensions: number;
  private client: VoyageAIClient;

  constructor(opts: VoyageAdapterOptions) {
    this.client = new VoyageAIClient({ apiKey: opts.apiKey });
    this.defaultModel = opts.defaultModel ?? DEFAULT_MODEL;
    this.dimensions = opts.dimensions ?? DEFAULT_DIMENSIONS;
  }

  async embed(args: EmbedArgs): Promise<EmbedResult> {
    if (args.texts.length === 0) {
      return {
        embeddings: [],
        totalTokens: 0,
        model: args.model ?? this.defaultModel,
        provider: this.name,
      };
    }
    if (args.texts.length > 128) {
      throw new Error(
        `Voyage: batch máximo é 128 itens (recebi ${args.texts.length})`,
      );
    }

    const model = args.model ?? this.defaultModel;
    const res = await this.client.embed({
      input: args.texts,
      model,
      inputType: args.inputType,
      outputDimension: this.dimensions,
    });

    const items = res.data ?? [];
    const embeddings: number[][] = new Array(args.texts.length);
    for (const item of items) {
      if (item.index === undefined || !item.embedding) continue;
      embeddings[item.index] = item.embedding;
    }
    for (let i = 0; i < embeddings.length; i++) {
      if (!embeddings[i]) {
        throw new Error(`Voyage: embedding faltando para o item ${i}`);
      }
    }

    return {
      embeddings,
      totalTokens: res.usage?.totalTokens ?? 0,
      model: res.model ?? model,
      provider: this.name,
    };
  }
}

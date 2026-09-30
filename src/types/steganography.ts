export type EmbeddingMethod = "naive" | "adaptive";

export interface EncodeRequest {
  message: string;
  password: string;
  method: EmbeddingMethod;
  /** Whether to attempt gzip compression before encryption. */
  compress: boolean;
}

export interface EncodeSummary {
  method: EmbeddingMethod;
  imageWidth: number;
  imageHeight: number;
  payloadBytes: number;
  serializedPayloadBytes: number;
  capacityBytes: number;
  payloadDensity: number;
  modifiedChannels: number;
  processingTimeMs: number;
  compressed: boolean;
}

export interface DecodeSummary {
  method: EmbeddingMethod;
  message: string;
  compressed: boolean;
  processingTimeMs: number;
}

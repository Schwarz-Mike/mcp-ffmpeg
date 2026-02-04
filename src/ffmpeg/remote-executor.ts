/**
 * Remote FFmpeg executor (stub for future implementation)
 * Phase 5: Remote API support
 */

import type { FFmpegCommand, FFmpegExecutor, ExecutionResult } from './types.js';
import type { AudioInfo, RemoteConfig } from '../config/types.js';
import { FFmpegError, FFmpegErrorType } from '../errors/index.js';

export class RemoteFFmpegExecutor implements FFmpegExecutor {
  private apiUrl: string;
  private apiKey?: string;
  private timeout: number;

  constructor(config: RemoteConfig) {
    this.apiUrl = config.apiUrl;
    this.apiKey = config.apiKey;
    this.timeout = config.timeout;
  }

  /**
   * Check if remote API is available
   */
  async isAvailable(): Promise<boolean> {
    // Future: Ping health endpoint
    // GET {apiUrl}/health
    return false;
  }

  /**
   * Execute FFmpeg command via remote API
   */
  async execute(_command: FFmpegCommand): Promise<ExecutionResult> {
    // Future implementation:
    // 1. Upload input files to remote API
    // 2. Submit processing job with command parameters
    // 3. Poll for completion
    // 4. Download result to local outputPath

    throw new FFmpegError(
      FFmpegErrorType.REMOTE_API_ERROR,
      'Remote execution is not yet implemented',
      'This feature is planned for Phase 5. Please use local mode for now.'
    );
  }

  /**
   * Probe file via remote API
   */
  async probe(_filePath: string): Promise<AudioInfo> {
    // Future implementation:
    // 1. Upload file to remote API
    // 2. GET probe results
    // 3. Return AudioInfo

    throw new FFmpegError(
      FFmpegErrorType.REMOTE_API_ERROR,
      'Remote probing is not yet implemented',
      'This feature is planned for Phase 5. Please use local mode for now.'
    );
  }
}

/**
 * Remote API response types (for future implementation)
 */
export interface RemoteJobResponse {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  result?: {
    outputUrl: string;
    metadata: Record<string, unknown>;
  };
  error?: string;
}

export interface RemoteUploadResponse {
  fileId: string;
  filename: string;
  size: number;
}

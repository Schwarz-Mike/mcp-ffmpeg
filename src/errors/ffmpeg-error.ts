/**
 * Custom error class for FFmpeg operations
 */

import { FFmpegErrorType } from './types.js';

export class FFmpegError extends Error {
  public readonly type: FFmpegErrorType;
  public readonly details?: string;
  public readonly ffmpegOutput?: string;

  constructor(
    type: FFmpegErrorType,
    message: string,
    details?: string,
    ffmpegOutput?: string
  ) {
    super(message);
    this.name = 'FFmpegError';
    this.type = type;
    this.details = details;
    this.ffmpegOutput = ffmpegOutput;
  }

  /**
   * Convert to MCP-compatible error response
   */
  toMcpResponse(): { content: Array<{ type: 'text'; text: string }>; isError: true } {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              error: true,
              type: this.type,
              message: this.message,
              details: this.details,
              ffmpegOutput: this.ffmpegOutput?.slice(-1000), // Last 1000 chars
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }

  /**
   * Create error from FFmpeg stderr output
   */
  static fromStderr(stderr: string, exitCode?: number): FFmpegError {
    const stderrLower = stderr.toLowerCase();

    // Parse common FFmpeg errors
    if (stderrLower.includes('no such file or directory')) {
      const match = stderr.match(/([^\s:]+):\s*No such file or directory/i);
      const file = match?.[1] || 'unknown';
      return new FFmpegError(
        FFmpegErrorType.FILE_NOT_FOUND,
        `Input file not found: ${file}`,
        undefined,
        stderr
      );
    }

    if (stderrLower.includes('permission denied')) {
      return new FFmpegError(
        FFmpegErrorType.PERMISSION_DENIED,
        'Permission denied accessing file',
        undefined,
        stderr
      );
    }

    if (stderrLower.includes('invalid argument') || stderrLower.includes('invalid option')) {
      return new FFmpegError(
        FFmpegErrorType.INVALID_PARAMETERS,
        'Invalid FFmpeg parameters',
        undefined,
        stderr
      );
    }

    if (stderrLower.includes('invalid data found') || stderrLower.includes('invalid input')) {
      return new FFmpegError(
        FFmpegErrorType.INVALID_INPUT,
        'Invalid or corrupted input file',
        undefined,
        stderr
      );
    }

    // Default processing error
    return new FFmpegError(
      FFmpegErrorType.PROCESSING_ERROR,
      `FFmpeg processing failed${exitCode !== undefined ? ` (exit code: ${exitCode})` : ''}`,
      undefined,
      stderr
    );
  }
}

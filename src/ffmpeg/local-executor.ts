/**
 * Local FFmpeg executor using child_process
 */

import { spawn, execSync } from 'child_process';
import type { FFmpegCommand, FFmpegExecutor, ExecutionResult } from './types.js';
import type { AudioInfo, LocalConfig } from '../config/types.js';
import { parseProbeOutput } from './parser.js';
import { FFmpegError, FFmpegErrorType } from '../errors/index.js';
import { normalizeForFFmpeg } from '../utils/paths.js';

export class LocalFFmpegExecutor implements FFmpegExecutor {
  private ffmpegPath: string;
  private ffprobePath: string;

  constructor(config: LocalConfig) {
    this.ffmpegPath = config.ffmpegPath;
    this.ffprobePath = config.ffprobePath;
  }

  /**
   * Check if FFmpeg is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      execSync(`"${this.ffmpegPath}" -version`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Execute an FFmpeg command
   */
  async execute(command: FFmpegCommand): Promise<ExecutionResult> {
    const args = this.buildArgs(command);

    return new Promise((resolve, reject) => {
      const proc = spawn(this.ffmpegPath, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
      });

      let stderr = '';

      proc.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      proc.on('error', (error: Error) => {
        reject(
          new FFmpegError(
            FFmpegErrorType.FFMPEG_NOT_FOUND,
            `Failed to start FFmpeg: ${error.message}`,
            `FFmpeg path: ${this.ffmpegPath}`
          )
        );
      });

      proc.on('close', (code: number | null) => {
        if (code === 0) {
          resolve({
            success: true,
            outputPath: command.outputPath,
            stderr,
          });
        } else {
          reject(FFmpegError.fromStderr(stderr, code ?? undefined));
        }
      });
    });
  }

  /**
   * Probe an audio file using FFprobe
   */
  async probe(filePath: string): Promise<AudioInfo> {
    const normalizedPath = normalizeForFFmpeg(filePath);

    const args = [
      '-v',
      'quiet',
      '-print_format',
      'json',
      '-show_format',
      '-show_streams',
      '-select_streams',
      'a:0',
      normalizedPath,
    ];

    return new Promise((resolve, reject) => {
      const proc = spawn(this.ffprobePath, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString();
      });

      proc.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      proc.on('error', (error: Error) => {
        reject(
          new FFmpegError(
            FFmpegErrorType.FFPROBE_NOT_FOUND,
            `Failed to start FFprobe: ${error.message}`,
            `FFprobe path: ${this.ffprobePath}`
          )
        );
      });

      proc.on('close', (code: number | null) => {
        if (code === 0) {
          try {
            const info = parseProbeOutput(stdout);
            resolve(info);
          } catch (error) {
            reject(error);
          }
        } else {
          reject(FFmpegError.fromStderr(stderr || `FFprobe exited with code ${code}`, code ?? undefined));
        }
      });
    });
  }

  /**
   * Build command line arguments from FFmpegCommand
   */
  private buildArgs(command: FFmpegCommand): string[] {
    const args: string[] = [];

    // Global options
    if (command.globalOptions) {
      args.push(...command.globalOptions);
    }

    // Input files
    for (const input of command.inputs) {
      // Input-specific options (before -i)
      if (input.options) {
        args.push(...input.options);
      }
      args.push('-i', input.path);
    }

    // Filter graph (simple, single input)
    if (command.filterGraph) {
      args.push('-af', command.filterGraph);
    }

    // Filter complex (multiple inputs)
    if (command.filterComplex) {
      args.push('-filter_complex', command.filterComplex);
    }

    // Output options
    const outOpts = command.outputOptions;

    if (outOpts.map) {
      args.push('-map', outOpts.map);
    }

    if (outOpts.codec) {
      args.push('-c:a', outOpts.codec);
    }

    if (outOpts.bitrate) {
      args.push('-b:a', outOpts.bitrate);
    }

    if (outOpts.sampleRate) {
      args.push('-ar', String(outOpts.sampleRate));
    }

    if (outOpts.channels) {
      args.push('-ac', String(outOpts.channels));
    }

    if (outOpts.format) {
      args.push('-f', outOpts.format);
    }

    if (outOpts.quality !== undefined) {
      args.push('-q:a', String(outOpts.quality));
    }

    if (outOpts.additionalOptions) {
      args.push(...outOpts.additionalOptions);
    }

    // Output path
    args.push(command.outputPath);

    return args;
  }
}

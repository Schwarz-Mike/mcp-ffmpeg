/**
 * Types for FFmpeg execution
 */

import type { AudioInfo } from '../config/types.js';

export interface InputSpec {
  path: string;
  options?: string[]; // e.g., ['-stream_loop', '5']
}

export interface OutputOptions {
  codec?: string;
  bitrate?: string;
  sampleRate?: number;
  channels?: number;
  format?: string;
  quality?: number;
  map?: string;
  additionalOptions?: string[];
}

export interface FFmpegCommand {
  inputs: InputSpec[];
  filterGraph?: string;
  filterComplex?: string;
  outputPath: string;
  outputOptions: OutputOptions;
  globalOptions?: string[];
}

export interface ExecutionResult {
  success: boolean;
  outputPath: string;
  stderr: string;
  duration?: number;
}

export interface ProgressInfo {
  currentTime: number;
  speed?: number;
  size?: number;
  bitrate?: number;
}

export interface FFmpegExecutor {
  execute(command: FFmpegCommand): Promise<ExecutionResult>;
  probe(filePath: string): Promise<AudioInfo>;
  isAvailable(): Promise<boolean>;
}

export interface MeasuredLoudness {
  input_i: string;
  input_tp: string;
  input_lra: string;
  input_thresh: string;
  output_i: string;
  output_tp: string;
  output_lra: string;
  output_thresh: string;
  normalization_type: string;
  target_offset: string;
}

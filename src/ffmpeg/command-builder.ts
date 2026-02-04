/**
 * FFmpeg command builder for constructing complex commands
 */

import type { FFmpegCommand, InputSpec, OutputOptions } from './types.js';
import { normalizeForFFmpeg } from '../utils/paths.js';
import type { AudioQualityConfig } from '../config/types.js';

export class FFmpegCommandBuilder {
  private inputs: InputSpec[] = [];
  private filterChain: string[] = [];
  private filterComplexStr: string | null = null;
  private outputPath: string = '';
  private outputOpts: OutputOptions = {};
  private globalOpts: string[] = ['-y', '-hide_banner'];

  /**
   * Add an input file
   */
  addInput(inputPath: string, options?: string[]): this {
    this.inputs.push({
      path: normalizeForFFmpeg(inputPath),
      options,
    });
    return this;
  }

  /**
   * Add a simple audio filter (for single input)
   */
  addFilter(filter: string): this {
    if (filter) {
      this.filterChain.push(filter);
    }
    return this;
  }

  /**
   * Add multiple filters at once
   */
  addFilters(filters: string[]): this {
    for (const filter of filters) {
      this.addFilter(filter);
    }
    return this;
  }

  /**
   * Set filter_complex for multi-input operations
   */
  setFilterComplex(complex: string): this {
    this.filterComplexStr = complex;
    return this;
  }

  /**
   * Set output path and options
   */
  setOutput(outputPath: string, options: OutputOptions = {}): this {
    this.outputPath = normalizeForFFmpeg(outputPath);
    this.outputOpts = options;
    return this;
  }

  /**
   * Set output from quality config
   */
  setOutputFromQuality(outputPath: string, quality: AudioQualityConfig): this {
    this.outputPath = normalizeForFFmpeg(outputPath);
    this.outputOpts = {
      codec: quality.codec,
      bitrate: quality.bitrate,
      sampleRate: quality.sampleRate,
      channels: quality.channels,
    };
    return this;
  }

  /**
   * Add global options
   */
  addGlobalOption(...options: string[]): this {
    this.globalOpts.push(...options);
    return this;
  }

  /**
   * Build the final command
   */
  build(): FFmpegCommand {
    return {
      inputs: this.inputs,
      filterGraph: this.filterChain.length > 0 ? this.filterChain.join(',') : undefined,
      filterComplex: this.filterComplexStr || undefined,
      outputPath: this.outputPath,
      outputOptions: this.outputOpts,
      globalOptions: this.globalOpts,
    };
  }

  /**
   * Reset builder for reuse
   */
  reset(): this {
    this.inputs = [];
    this.filterChain = [];
    this.filterComplexStr = null;
    this.outputPath = '';
    this.outputOpts = {};
    this.globalOpts = ['-y', '-hide_banner'];
    return this;
  }
}

/**
 * Build compressor filter string
 */
export function buildCompressorFilter(opts: {
  threshold?: string;
  ratio?: number;
  attack?: number;
  release?: number;
  makeupGain?: number;
}): string {
  const threshold = opts.threshold || '-20dB';
  const ratio = opts.ratio ?? 3;
  const attack = opts.attack ?? 200;
  const release = opts.release ?? 800;
  const makeup = opts.makeupGain ?? 0;

  return `acompressor=threshold=${threshold}:ratio=${ratio}:attack=${attack}:release=${release}:makeup=${makeup}`;
}

/**
 * Build loudnorm analysis filter (pass 1)
 */
export function buildLoudnormAnalyzeFilter(opts: {
  targetLoudness?: number;
  truePeak?: number;
  loudnessRange?: number;
}): string {
  const I = opts.targetLoudness ?? -16;
  const TP = opts.truePeak ?? -1.5;
  const LRA = opts.loudnessRange ?? 11;

  return `loudnorm=I=${I}:TP=${TP}:LRA=${LRA}:print_format=json`;
}

/**
 * Build loudnorm apply filter (pass 2) with measured values
 */
export function buildLoudnormApplyFilter(
  opts: {
    targetLoudness?: number;
    truePeak?: number;
    loudnessRange?: number;
  },
  measured: {
    input_i: string;
    input_tp: string;
    input_lra: string;
    input_thresh: string;
    target_offset: string;
  }
): string {
  const I = opts.targetLoudness ?? -16;
  const TP = opts.truePeak ?? -1.5;
  const LRA = opts.loudnessRange ?? 11;

  return `loudnorm=I=${I}:TP=${TP}:LRA=${LRA}:measured_I=${measured.input_i}:measured_TP=${measured.input_tp}:measured_LRA=${measured.input_lra}:measured_thresh=${measured.input_thresh}:offset=${measured.target_offset}:linear=true`;
}

/**
 * Build tempo filter (handles >2x or <0.5x ranges)
 */
export function buildTempoFilter(speed: number): string {
  const filters: string[] = [];
  let remaining = speed;

  // atempo only supports 0.5 to 2.0 range
  // Chain multiple filters for larger changes
  while (remaining > 2.0) {
    filters.push('atempo=2.0');
    remaining /= 2.0;
  }
  while (remaining < 0.5) {
    filters.push('atempo=0.5');
    remaining /= 0.5;
  }
  filters.push(`atempo=${remaining.toFixed(4)}`);

  return filters.join(',');
}

/**
 * Build volume filter
 */
export function buildVolumeFilter(volume: number | string): string {
  if (typeof volume === 'string') {
    // Assume it's in dB format like "5dB"
    return `volume=${volume}`;
  }
  return `volume=${volume.toFixed(4)}`;
}

/**
 * Build fade in filter
 */
export function buildFadeInFilter(duration: number, startTime: number = 0, curve: string = 'tri'): string {
  return `afade=t=in:st=${startTime}:d=${duration}:curve=${curve}`;
}

/**
 * Build fade out filter
 */
export function buildFadeOutFilter(duration: number, startTime: number, curve: string = 'tri'): string {
  return `afade=t=out:st=${startTime}:d=${duration}:curve=${curve}`;
}

/**
 * Build delay filter (in milliseconds)
 */
export function buildDelayFilter(delayMs: number): string {
  return `adelay=${delayMs}|${delayMs}`;
}

/**
 * Build atrim filter for trimming audio
 */
export function buildTrimFilter(start?: number, end?: number, duration?: number): string {
  const parts: string[] = [];
  if (start !== undefined) {
    parts.push(`start=${start}`);
  }
  if (end !== undefined) {
    parts.push(`end=${end}`);
  }
  if (duration !== undefined) {
    parts.push(`duration=${duration}`);
  }
  return `atrim=${parts.join(':')}`;
}

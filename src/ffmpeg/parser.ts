/**
 * FFmpeg and FFprobe output parsers
 */

import type { AudioInfo } from '../config/types.js';
import type { MeasuredLoudness, ProgressInfo } from './types.js';
import { FFmpegError, FFmpegErrorType } from '../errors/index.js';

/**
 * Parse FFprobe JSON output to AudioInfo
 */
export function parseProbeOutput(jsonOutput: string): AudioInfo {
  try {
    const data = JSON.parse(jsonOutput);

    // Get audio stream info
    const audioStream = data.streams?.find((s: { codec_type: string }) => s.codec_type === 'audio');
    const format = data.format;

    if (!audioStream && !format) {
      throw new Error('No audio stream or format info found');
    }

    return {
      duration: parseFloat(format?.duration || audioStream?.duration || '0'),
      sampleRate: parseInt(audioStream?.sample_rate || '44100', 10),
      channels: audioStream?.channels || 2,
      codec: audioStream?.codec_name || 'unknown',
      bitrate: parseInt(format?.bit_rate || audioStream?.bit_rate || '0', 10) / 1000, // Convert to kbps
      format: format?.format_name || 'unknown',
      size: parseInt(format?.size || '0', 10),
    };
  } catch (error) {
    throw new FFmpegError(
      FFmpegErrorType.PARSE_ERROR,
      'Failed to parse FFprobe output',
      String(error),
      jsonOutput
    );
  }
}

/**
 * Parse loudnorm JSON output from FFmpeg stderr
 */
export function parseLoudnormOutput(stderr: string): MeasuredLoudness {
  // FFmpeg outputs loudnorm JSON in a specific format embedded in stderr
  // Look for the JSON block
  const jsonMatch = stderr.match(/\{[\s\S]*?"input_i"[\s\S]*?"target_offset"[\s\S]*?\}/);

  if (!jsonMatch) {
    throw new FFmpegError(
      FFmpegErrorType.PARSE_ERROR,
      'Failed to find loudnorm analysis data in FFmpeg output',
      'Make sure the loudnorm filter is being used with print_format=json',
      stderr.slice(-500)
    );
  }

  try {
    const data = JSON.parse(jsonMatch[0]);
    return {
      input_i: data.input_i,
      input_tp: data.input_tp,
      input_lra: data.input_lra,
      input_thresh: data.input_thresh,
      output_i: data.output_i,
      output_tp: data.output_tp,
      output_lra: data.output_lra,
      output_thresh: data.output_thresh,
      normalization_type: data.normalization_type,
      target_offset: data.target_offset,
    };
  } catch (error) {
    throw new FFmpegError(
      FFmpegErrorType.PARSE_ERROR,
      'Failed to parse loudnorm JSON',
      String(error),
      jsonMatch[0]
    );
  }
}

/**
 * Parse FFmpeg progress output from stderr
 */
export function parseProgress(stderrChunk: string): ProgressInfo | null {
  // FFmpeg progress format:
  // frame=   24 fps=0.0 q=-1.0 size=     384kB time=00:00:01.00 bitrate=3145.7kbits/s speed=2.00x
  const timeMatch = stderrChunk.match(/time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
  const speedMatch = stderrChunk.match(/speed=\s*([\d.]+)x/);
  const sizeMatch = stderrChunk.match(/size=\s*(\d+)kB/);
  const bitrateMatch = stderrChunk.match(/bitrate=\s*([\d.]+)kbits\/s/);

  if (timeMatch) {
    const [, hours, minutes, seconds, centis] = timeMatch;
    const currentTime =
      parseInt(hours, 10) * 3600 +
      parseInt(minutes, 10) * 60 +
      parseInt(seconds, 10) +
      parseInt(centis, 10) / 100;

    return {
      currentTime,
      speed: speedMatch ? parseFloat(speedMatch[1]) : undefined,
      size: sizeMatch ? parseInt(sizeMatch[1], 10) * 1024 : undefined,
      bitrate: bitrateMatch ? parseFloat(bitrateMatch[1]) : undefined,
    };
  }

  return null;
}

/**
 * Extract duration from FFmpeg stderr (when processing)
 */
export function extractDurationFromStderr(stderr: string): number | null {
  // Duration: 00:05:23.45, start: 0.000000, bitrate: 320 kb/s
  const match = stderr.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2})\.(\d{2})/);

  if (match) {
    const [, hours, minutes, seconds, centis] = match;
    return (
      parseInt(hours, 10) * 3600 +
      parseInt(minutes, 10) * 60 +
      parseInt(seconds, 10) +
      parseInt(centis, 10) / 100
    );
  }

  return null;
}

/**
 * Tool: ffmpeg_apply_fade
 * Apply fade-in and/or fade-out effects
 */

import type { FFmpegExecutor } from '../../ffmpeg/types.js';
import type { FFmpegConfig } from '../../config/types.js';
import { FFmpegCommandBuilder, buildFadeInFilter, buildFadeOutFilter } from '../../ffmpeg/command-builder.js';
import { validateInputFile, ensureOutputDir } from '../../utils/paths.js';
import { generateOutputPath } from '../../utils/naming.js';
import { calculateFadeOutStart, formatDuration } from '../../utils/duration.js';

export interface FadeConfig {
  duration: number;           // Fade duration in seconds
  startTime?: number;         // Start time in seconds (default: 0 for fade-in)
  curve?: string;             // Fade curve type
}

export interface ApplyFadeParams {
  inputPath: string;
  outputPath?: string;
  fadeIn?: FadeConfig;
  fadeOut?: FadeConfig;
}

// Available fade curves in FFmpeg
const VALID_CURVES = [
  'tri',      // triangular, linear slope (default)
  'qsin',     // quarter of sine wave
  'esin',     // exponential sine wave
  'hsin',     // half of sine wave
  'log',      // logarithmic
  'ipar',     // inverted parabola
  'qua',      // quadratic
  'cub',      // cubic
  'squ',      // square root
  'cbr',      // cubic root
  'par',      // parabola
  'exp',      // exponential
  'iqsin',    // inverted quarter sine wave
  'ihsin',    // inverted half sine wave
  'dese',     // double-exponential seat
  'desi',     // double-exponential sigmoid
  'losi',     // logistic sigmoid
  'sinc',     // sine cardinal function
  'nofade',   // no fade applied (for testing)
];

export async function handleApplyFade(
  params: ApplyFadeParams,
  executor: FFmpegExecutor,
  config: FFmpegConfig
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  // Validate input file exists
  await validateInputFile(params.inputPath);

  // Must have at least one fade
  if (!params.fadeIn && !params.fadeOut) {
    throw new Error('At least one of fadeIn or fadeOut must be specified');
  }

  // Validate fade curves
  if (params.fadeIn?.curve && !VALID_CURVES.includes(params.fadeIn.curve)) {
    throw new Error(`Invalid fade-in curve: ${params.fadeIn.curve}. Valid options: ${VALID_CURVES.join(', ')}`);
  }
  if (params.fadeOut?.curve && !VALID_CURVES.includes(params.fadeOut.curve)) {
    throw new Error(`Invalid fade-out curve: ${params.fadeOut.curve}. Valid options: ${VALID_CURVES.join(', ')}`);
  }

  // Get input duration for fade-out calculation
  const inputInfo = await executor.probe(params.inputPath);
  const duration = inputInfo.duration;

  // Build filter chain
  const filters: string[] = [];
  const fadeDetails: Record<string, unknown> = {};

  // Fade in
  if (params.fadeIn) {
    const fadeInStart = params.fadeIn.startTime ?? 0;
    const fadeInDuration = params.fadeIn.duration;
    const fadeInCurve = params.fadeIn.curve ?? 'tri';

    filters.push(buildFadeInFilter(fadeInDuration, fadeInStart, fadeInCurve));
    fadeDetails.fadeIn = {
      startTime: fadeInStart,
      duration: fadeInDuration,
      curve: fadeInCurve,
    };
  }

  // Fade out
  if (params.fadeOut) {
    const fadeOutDuration = params.fadeOut.duration;
    const fadeOutCurve = params.fadeOut.curve ?? 'tri';

    // Calculate start time if not provided
    const fadeOutStart =
      params.fadeOut.startTime ?? calculateFadeOutStart(duration, fadeOutDuration);

    filters.push(buildFadeOutFilter(fadeOutDuration, fadeOutStart, fadeOutCurve));
    fadeDetails.fadeOut = {
      startTime: fadeOutStart,
      duration: fadeOutDuration,
      curve: fadeOutCurve,
    };
  }

  // Generate output path if not provided
  let suffix = 'faded';
  if (params.fadeIn && params.fadeOut) {
    suffix = `fade_in${params.fadeIn.duration}s_out${params.fadeOut.duration}s`;
  } else if (params.fadeIn) {
    suffix = `fade_in${params.fadeIn.duration}s`;
  } else if (params.fadeOut) {
    suffix = `fade_out${params.fadeOut.duration}s`;
  }

  const outputPath =
    params.outputPath ||
    generateOutputPath(params.inputPath, config.local!.outputDir, suffix);

  // Ensure output directory exists
  await ensureOutputDir(outputPath);

  // Build command
  const command = new FFmpegCommandBuilder()
    .addInput(params.inputPath)
    .addFilters(filters)
    .setOutputFromQuality(outputPath, config.quality)
    .build();

  await executor.execute(command);

  // Get info about the output file
  const outputInfo = await executor.probe(outputPath);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            success: true,
            inputPath: params.inputPath,
            outputPath,
            ...fadeDetails,
            filters: filters.join(','),
            duration: outputInfo.duration,
            durationFormatted: formatDuration(outputInfo.duration),
          },
          null,
          2
        ),
      },
    ],
  };
}

/**
 * Tool: ffmpeg_adjust_tempo
 * Change playback speed without affecting pitch
 */

import type { FFmpegExecutor } from '../../ffmpeg/types.js';
import type { FFmpegConfig } from '../../config/types.js';
import { FFmpegCommandBuilder, buildTempoFilter } from '../../ffmpeg/command-builder.js';
import { validateInputFile, ensureOutputDir } from '../../utils/paths.js';
import { generateOutputPath } from '../../utils/naming.js';
import { formatDuration } from '../../utils/duration.js';

export interface AdjustTempoParams {
  inputPath: string;
  outputPath?: string;
  speed: number;              // Speed factor: 0.5-2.0+ (default: 1.0)
                              // 0.5 = half speed, 2.0 = double speed
                              // 0.9 = meditation standard
}

export async function handleAdjustTempo(
  params: AdjustTempoParams,
  executor: FFmpegExecutor,
  config: FFmpegConfig
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  // Validate input file exists
  await validateInputFile(params.inputPath);

  // Validate speed range (practical limits)
  const speed = params.speed;
  if (speed <= 0) {
    throw new Error('Speed must be greater than 0');
  }
  if (speed > 100) {
    throw new Error('Speed factor too high (max: 100x)');
  }
  if (speed < 0.01) {
    throw new Error('Speed factor too low (min: 0.01x)');
  }

  // Get original duration
  const inputInfo = await executor.probe(params.inputPath);
  const originalDuration = inputInfo.duration;
  const newDuration = originalDuration / speed;

  // Generate output path if not provided
  const speedStr = speed.toString().replace('.', '_');
  const outputPath =
    params.outputPath ||
    generateOutputPath(params.inputPath, config.local!.outputDir, `tempo_${speedStr}x`);

  // Ensure output directory exists
  await ensureOutputDir(outputPath);

  // Build tempo filter (handles chaining for extreme values)
  const tempoFilter = buildTempoFilter(speed);

  // Build command
  const command = new FFmpegCommandBuilder()
    .addInput(params.inputPath)
    .addFilter(tempoFilter)
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
            speedFactor: speed,
            speedDescription: getSpeedDescription(speed),
            filter: tempoFilter,
            originalDuration: originalDuration,
            originalDurationFormatted: formatDuration(originalDuration),
            newDuration: outputInfo.duration,
            newDurationFormatted: formatDuration(outputInfo.duration),
            durationChange: `${speed < 1 ? '+' : '-'}${Math.abs(Math.round((1 - speed) * 100))}%`,
          },
          null,
          2
        ),
      },
    ],
  };
}

function getSpeedDescription(speed: number): string {
  if (speed === 1) return 'normal speed';
  if (speed === 0.9) return 'meditation pace (90%)';
  if (speed === 0.5) return 'half speed';
  if (speed === 2) return 'double speed';
  if (speed < 1) return `${Math.round(speed * 100)}% speed (slower)`;
  return `${Math.round(speed * 100)}% speed (faster)`;
}

/**
 * Tool: ffmpeg_adjust_volume
 * Adjust volume level of audio
 */

import type { FFmpegExecutor } from '../../ffmpeg/types.js';
import type { FFmpegConfig } from '../../config/types.js';
import { FFmpegCommandBuilder, buildVolumeFilter } from '../../ffmpeg/command-builder.js';
import { validateInputFile, ensureOutputDir } from '../../utils/paths.js';
import { generateOutputPath } from '../../utils/naming.js';

export interface AdjustVolumeParams {
  inputPath: string;
  outputPath?: string;
  volume?: number;     // Volume factor (default: 1.0, e.g., 0.3 = 30%, 1.75 = +75%)
  volumeDb?: number;   // Alternative: volume in dB
}

export async function handleAdjustVolume(
  params: AdjustVolumeParams,
  executor: FFmpegExecutor,
  config: FFmpegConfig
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  // Validate input file exists
  await validateInputFile(params.inputPath);

  // Determine volume adjustment
  let volumeValue: string;
  let volumeDescription: string;

  if (params.volumeDb !== undefined) {
    volumeValue = `${params.volumeDb}dB`;
    volumeDescription = `${params.volumeDb > 0 ? '+' : ''}${params.volumeDb}dB`;
  } else {
    const factor = params.volume ?? 1.0;
    volumeValue = factor.toString();
    const percentage = Math.round(factor * 100);
    volumeDescription = `${percentage}%`;
  }

  // Generate output path if not provided
  const suffix = params.volumeDb !== undefined
    ? `vol_${params.volumeDb}dB`
    : `vol_${Math.round((params.volume ?? 1.0) * 100)}pct`;

  const outputPath =
    params.outputPath ||
    generateOutputPath(
      params.inputPath,
      config.local!.outputDir,
      suffix
    );

  // Ensure output directory exists
  await ensureOutputDir(outputPath);

  // Build command
  const command = new FFmpegCommandBuilder()
    .addInput(params.inputPath)
    .addFilter(buildVolumeFilter(volumeValue))
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
            volumeAdjustment: volumeDescription,
            volumeFilter: buildVolumeFilter(volumeValue),
            duration: outputInfo.duration,
          },
          null,
          2
        ),
      },
    ],
  };
}

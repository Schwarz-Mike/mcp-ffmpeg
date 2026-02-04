/**
 * Tool: ffmpeg_generate_silence
 * Generate silent audio files for pauses
 */

import type { FFmpegExecutor } from '../../ffmpeg/types.js';
import type { FFmpegConfig } from '../../config/types.js';
import { FFmpegCommandBuilder } from '../../ffmpeg/command-builder.js';
import { ensureOutputDir } from '../../utils/paths.js';
import { generateOutputPath } from '../../utils/naming.js';
import { formatDuration } from '../../utils/duration.js';

export interface GenerateSilenceParams {
  duration: number;        // Duration in seconds
  outputPath?: string;
  sampleRate?: number;     // Sample rate (default: 44100)
  channels?: number;       // Number of channels (default: 2)
}

export async function handleGenerateSilence(
  params: GenerateSilenceParams,
  executor: FFmpegExecutor,
  config: FFmpegConfig
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const duration = params.duration;
  const sampleRate = params.sampleRate || config.quality.sampleRate;
  const channels = params.channels || config.quality.channels;

  // Channel layout for anullsrc
  const channelLayout = channels === 1 ? 'mono' : 'stereo';

  // Generate output path if not provided
  const outputPath =
    params.outputPath ||
    generateOutputPath(
      `silence_${duration}s`,
      config.local!.outputDir,
      'generated',
      '.mp3',
      { timestamp: true }
    );

  // Ensure output directory exists
  await ensureOutputDir(outputPath);

  // Build command using lavfi input
  // ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo -t 5 -q:a 9 -acodec libmp3lame output.mp3
  const command = new FFmpegCommandBuilder()
    .addInput(`anullsrc=r=${sampleRate}:cl=${channelLayout}`, ['-f', 'lavfi'])
    .addGlobalOption('-t', String(duration))
    .setOutput(outputPath, {
      codec: config.quality.codec,
      bitrate: config.quality.bitrate,
      sampleRate,
      channels,
    })
    .build();

  await executor.execute(command);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            success: true,
            outputPath,
            duration,
            durationFormatted: formatDuration(duration),
            sampleRate,
            channels,
            channelLayout,
          },
          null,
          2
        ),
      },
    ],
  };
}

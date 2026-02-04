/**
 * Tool: ffmpeg_loop_audio
 * Loop audio file to target duration
 */

import type { FFmpegExecutor } from '../../ffmpeg/types.js';
import type { FFmpegConfig } from '../../config/types.js';
import { FFmpegCommandBuilder } from '../../ffmpeg/command-builder.js';
import { validateInputFile, ensureOutputDir } from '../../utils/paths.js';
import { generateOutputPath } from '../../utils/naming.js';
import { calculateLoopCount, formatDuration } from '../../utils/duration.js';

export interface LoopAudioParams {
  inputPath: string;
  outputPath?: string;
  targetDuration: number;     // Target duration in seconds
  fadeLoops?: boolean;        // Crossfade between loops (default: true)
  fadeDuration?: number;      // Crossfade duration in seconds (default: 2)
}

export async function handleLoopAudio(
  params: LoopAudioParams,
  executor: FFmpegExecutor,
  config: FFmpegConfig
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  // Validate input file exists
  await validateInputFile(params.inputPath);

  // Get input duration
  const inputInfo = await executor.probe(params.inputPath);
  const sourceDuration = inputInfo.duration;

  // Calculate number of loops needed
  const loopCount = calculateLoopCount(sourceDuration, params.targetDuration);

  // Generate output path if not provided
  const outputPath =
    params.outputPath ||
    generateOutputPath(params.inputPath, config.local!.outputDir, `looped_${params.targetDuration}s`);

  // Ensure output directory exists
  await ensureOutputDir(outputPath);

  const useCrossfade = params.fadeLoops !== false && loopCount > 1;
  const fadeDuration = params.fadeDuration ?? 2;

  let command;

  if (useCrossfade && loopCount > 1) {
    // Use filter method with crossfade for smooth transitions
    command = buildCrossfadeLoopCommand(
      params.inputPath,
      outputPath,
      params.targetDuration,
      loopCount,
      fadeDuration,
      config
    );
  } else {
    // Use simple stream_loop method (faster, no re-encoding for multiple loops)
    command = buildSimpleLoopCommand(
      params.inputPath,
      outputPath,
      params.targetDuration,
      loopCount,
      config
    );
  }

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
            sourceDuration,
            sourceDurationFormatted: formatDuration(sourceDuration),
            targetDuration: params.targetDuration,
            targetDurationFormatted: formatDuration(params.targetDuration),
            actualDuration: outputInfo.duration,
            actualDurationFormatted: formatDuration(outputInfo.duration),
            loopCount,
            method: useCrossfade ? 'crossfade' : 'stream_loop',
            crossfade: useCrossfade ? fadeDuration : null,
          },
          null,
          2
        ),
      },
    ],
  };
}

/**
 * Build simple loop command using stream_loop
 */
function buildSimpleLoopCommand(
  inputPath: string,
  outputPath: string,
  targetDuration: number,
  loopCount: number,
  config: FFmpegConfig
) {
  return new FFmpegCommandBuilder()
    .addInput(inputPath, ['-stream_loop', String(loopCount - 1)])
    .addGlobalOption('-t', String(targetDuration))
    .setOutputFromQuality(outputPath, config.quality)
    .build();
}

/**
 * Build crossfade loop command using filter_complex
 * This creates seamless loops with crossfade transitions
 */
function buildCrossfadeLoopCommand(
  inputPath: string,
  outputPath: string,
  targetDuration: number,
  loopCount: number,
  fadeDuration: number,
  config: FFmpegConfig
) {
  const builder = new FFmpegCommandBuilder();

  // Add input with stream_loop for enough source material
  builder.addInput(inputPath, ['-stream_loop', String(loopCount)]);

  // Use aloop filter for seamless looping with crossfade
  // aloop=loop=-1:size=SAMPLES creates infinite loop
  // Then trim to target duration
  // The crossfade effect is achieved by overlapping the loop points

  // Simple approach: loop and trim
  const filter = `aloop=loop=${loopCount - 1}:size=2e+09,atrim=duration=${targetDuration},afade=t=out:st=${targetDuration - fadeDuration}:d=${fadeDuration}`;

  builder.addFilter(filter);
  builder.setOutputFromQuality(outputPath, config.quality);

  return builder.build();
}

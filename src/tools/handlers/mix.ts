/**
 * Tool: ffmpeg_mix_audio
 * Mix multiple audio tracks with volume control and delays
 */

import type { FFmpegExecutor } from '../../ffmpeg/types.js';
import type { FFmpegConfig } from '../../config/types.js';
import { FFmpegCommandBuilder } from '../../ffmpeg/command-builder.js';
import { validateInputFiles, ensureOutputDir } from '../../utils/paths.js';
import { formatDuration } from '../../utils/duration.js';

export interface MixInputConfig {
  path: string;
  volume?: number;            // Volume factor (default: 1.0)
  delay?: number;             // Delay in milliseconds (default: 0)
  fadeIn?: number;            // Fade-in duration in seconds
  fadeOut?: number;           // Fade-out duration in seconds
  loop?: boolean;             // Loop input to match longest track
}

export interface MixAudioParams {
  inputs: MixInputConfig[];
  outputPath: string;
  outputDuration?: 'longest' | 'shortest' | 'first';  // default: 'first'
  normalize?: boolean;        // Apply normalization after mix (default: false)
}

export async function handleMixAudio(
  params: MixAudioParams,
  executor: FFmpegExecutor,
  config: FFmpegConfig
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  // Validate all input files exist
  const inputPaths = params.inputs.map((i) => i.path);
  await validateInputFiles(inputPaths);

  // Ensure output directory exists
  await ensureOutputDir(params.outputPath);

  // Get duration info for each input (needed for fadeout calculations)
  const inputInfos = await Promise.all(
    params.inputs.map(async (input) => {
      const info = await executor.probe(input.path);
      return { ...input, duration: info.duration };
    })
  );

  // Build the command
  const builder = new FFmpegCommandBuilder();

  // Add all inputs
  for (const input of params.inputs) {
    const inputOpts: string[] = [];
    if (input.loop) {
      inputOpts.push('-stream_loop', '-1');
    }
    builder.addInput(input.path, inputOpts.length > 0 ? inputOpts : undefined);
  }

  // Build filter_complex
  const filterParts: string[] = [];
  const mixInputLabels: string[] = [];

  for (let i = 0; i < inputInfos.length; i++) {
    const input = inputInfos[i];
    const streamLabel = `[a${i}]`;
    const filters: string[] = [];

    // Delay filter (convert ms to samples or use adelay)
    if (input.delay && input.delay > 0) {
      // adelay format: delay_left|delay_right (in ms)
      filters.push(`adelay=${input.delay}|${input.delay}`);
    }

    // Fade-in filter
    if (input.fadeIn && input.fadeIn > 0) {
      filters.push(`afade=t=in:st=0:d=${input.fadeIn}`);
    }

    // Fade-out filter (calculate start from duration)
    if (input.fadeOut && input.fadeOut > 0) {
      const fadeOutStart = Math.max(0, input.duration - input.fadeOut);
      filters.push(`afade=t=out:st=${fadeOutStart}:d=${input.fadeOut}`);
    }

    // Volume filter
    if (input.volume !== undefined && input.volume !== 1.0) {
      filters.push(`volume=${input.volume}`);
    }

    // Build the filter chain for this input
    if (filters.length > 0) {
      filterParts.push(`[${i}:a]${filters.join(',')}${streamLabel}`);
    } else {
      filterParts.push(`[${i}:a]acopy${streamLabel}`);
    }

    mixInputLabels.push(streamLabel);
  }

  // Add amix filter
  const duration = params.outputDuration || 'first';
  const amixFilter = `${mixInputLabels.join('')}amix=inputs=${params.inputs.length}:duration=${duration}:dropout_transition=0[mixed]`;
  filterParts.push(amixFilter);

  // Add optional normalization
  let outputLabel = '[mixed]';
  if (params.normalize) {
    filterParts.push('[mixed]loudnorm=I=-16:TP=-1.5:LRA=11[out]');
    outputLabel = '[out]';
  } else {
    // Rename for output
    filterParts.push('[mixed]acopy[out]');
    outputLabel = '[out]';
  }

  builder.setFilterComplex(filterParts.join(';'));
  builder.setOutput(params.outputPath, {
    map: outputLabel,
    codec: config.quality.codec,
    bitrate: config.quality.bitrate,
    sampleRate: config.quality.sampleRate,
  });

  const command = builder.build();
  await executor.execute(command);

  // Get info about the output file
  const outputInfo = await executor.probe(params.outputPath);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            success: true,
            outputPath: params.outputPath,
            inputCount: params.inputs.length,
            inputs: inputInfos.map((input, i) => ({
              index: i,
              path: input.path,
              volume: input.volume ?? 1.0,
              delay: input.delay ?? 0,
              fadeIn: input.fadeIn ?? null,
              fadeOut: input.fadeOut ?? null,
              loop: input.loop ?? false,
              originalDuration: input.duration,
            })),
            outputDuration: params.outputDuration || 'first',
            normalized: params.normalize ?? false,
            totalDuration: outputInfo.duration,
            totalDurationFormatted: formatDuration(outputInfo.duration),
          },
          null,
          2
        ),
      },
    ],
  };
}

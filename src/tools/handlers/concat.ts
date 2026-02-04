/**
 * Tool: ffmpeg_concat_audio
 * Concatenate multiple audio files in sequence
 */

import type { FFmpegExecutor } from '../../ffmpeg/types.js';
import type { FFmpegConfig } from '../../config/types.js';
import { FFmpegCommandBuilder } from '../../ffmpeg/command-builder.js';
import { validateInputFiles, ensureOutputDir, normalizeForFFmpeg } from '../../utils/paths.js';
import { createConcatListFile, cleanupTempFile } from '../../utils/files.js';
import { formatDuration } from '../../utils/duration.js';

export interface ConcatAudioParams {
  inputs: string[];           // Array of input file paths in order
  outputPath: string;
  crossfade?: number;         // Optional crossfade duration in seconds
  useFilter?: boolean;        // Use filter method instead of concat demuxer
}

export async function handleConcatAudio(
  params: ConcatAudioParams,
  executor: FFmpegExecutor,
  config: FFmpegConfig
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  // Validate all input files exist
  await validateInputFiles(params.inputs);

  // Ensure output directory exists
  await ensureOutputDir(params.outputPath);

  // Determine method based on crossfade and useFilter
  const useCrossfade = params.crossfade && params.crossfade > 0;
  const useFilterMethod = params.useFilter || useCrossfade;

  let result;

  if (useFilterMethod) {
    result = await concatWithFilter(params, executor, config);
  } else {
    result = await concatWithDemuxer(params, executor, config);
  }

  // Get info about the output file
  const outputInfo = await executor.probe(params.outputPath);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            success: true,
            inputCount: params.inputs.length,
            inputs: params.inputs,
            outputPath: params.outputPath,
            method: useFilterMethod ? 'filter' : 'demuxer',
            crossfade: useCrossfade ? params.crossfade : null,
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

/**
 * Concatenate using the concat demuxer (faster, no re-encoding for same format)
 */
async function concatWithDemuxer(
  params: ConcatAudioParams,
  executor: FFmpegExecutor,
  _config: FFmpegConfig
): Promise<void> {
  // Create concat list file
  const normalizedPaths = params.inputs.map(normalizeForFFmpeg);
  const listFile = createConcatListFile(normalizedPaths);

  try {
    // Build command
    const command = new FFmpegCommandBuilder()
      .addInput(listFile, ['-f', 'concat', '-safe', '0'])
      .setOutput(params.outputPath, {
        additionalOptions: ['-c', 'copy'],
      })
      .build();

    await executor.execute(command);
  } finally {
    // Clean up temp file
    cleanupTempFile(listFile);
  }
}

/**
 * Concatenate using filter_complex (allows crossfade, requires re-encoding)
 */
async function concatWithFilter(
  params: ConcatAudioParams,
  executor: FFmpegExecutor,
  config: FFmpegConfig
): Promise<void> {
  const builder = new FFmpegCommandBuilder();

  // Add all inputs
  for (const inputPath of params.inputs) {
    builder.addInput(inputPath);
  }

  // Build filter_complex
  const crossfade = params.crossfade || 0;

  if (crossfade > 0 && params.inputs.length > 1) {
    // With crossfade: chain acrossfade filters
    // [0:a][1:a]acrossfade=d=2[a01];[a01][2:a]acrossfade=d=2[out]
    const filterParts: string[] = [];
    let prevLabel = '[0:a]';

    for (let i = 1; i < params.inputs.length; i++) {
      const currentInput = `[${i}:a]`;
      const outputLabel = i === params.inputs.length - 1 ? '[out]' : `[a${i - 1}${i}]`;

      filterParts.push(`${prevLabel}${currentInput}acrossfade=d=${crossfade}${outputLabel}`);
      prevLabel = outputLabel;
    }

    builder.setFilterComplex(filterParts.join(';'));
    builder.setOutput(params.outputPath, {
      map: '[out]',
      codec: config.quality.codec,
      bitrate: config.quality.bitrate,
      sampleRate: config.quality.sampleRate,
    });
  } else {
    // Without crossfade: simple concat filter
    // [0:a][1:a][2:a]concat=n=3:v=0:a=1[out]
    const inputs = params.inputs.map((_, i) => `[${i}:a]`).join('');
    const filter = `${inputs}concat=n=${params.inputs.length}:v=0:a=1[out]`;

    builder.setFilterComplex(filter);
    builder.setOutput(params.outputPath, {
      map: '[out]',
      codec: config.quality.codec,
      bitrate: config.quality.bitrate,
      sampleRate: config.quality.sampleRate,
    });
  }

  const command = builder.build();
  await executor.execute(command);
}

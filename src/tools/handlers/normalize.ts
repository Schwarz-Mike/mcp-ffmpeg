/**
 * Tool: ffmpeg_normalize_audio
 * Normalize audio to broadcast standards (EBU R128 loudnorm) using dual-pass
 */

import type { FFmpegExecutor } from '../../ffmpeg/types.js';
import type { FFmpegConfig } from '../../config/types.js';
import {
  FFmpegCommandBuilder,
  buildLoudnormAnalyzeFilter,
  buildLoudnormApplyFilter,
} from '../../ffmpeg/command-builder.js';
import { parseLoudnormOutput } from '../../ffmpeg/parser.js';
import { validateInputFile, ensureOutputDir } from '../../utils/paths.js';
import { generateOutputPath } from '../../utils/naming.js';
import { getTempFilePath, cleanupTempFile } from '../../utils/files.js';

export interface NormalizeAudioParams {
  inputPath: string;
  outputPath?: string;
  targetLoudness?: number;    // LUFS target (default: -16)
  truePeak?: number;          // True peak in dBTP (default: -1.5)
  loudnessRange?: number;     // LRA in LU (default: 11)
}

export async function handleNormalizeAudio(
  params: NormalizeAudioParams,
  executor: FFmpegExecutor,
  config: FFmpegConfig
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  // Validate input file exists
  await validateInputFile(params.inputPath);

  // Get normalization settings
  const normSettings = {
    targetLoudness: params.targetLoudness ?? config.meditation.normalization.targetLoudness,
    truePeak: params.truePeak ?? config.meditation.normalization.truePeak,
    loudnessRange: params.loudnessRange ?? config.meditation.normalization.loudnessRange,
  };

  // Generate output path if not provided
  const outputPath =
    params.outputPath ||
    generateOutputPath(params.inputPath, config.local!.outputDir, 'normalized');

  // Ensure output directory exists
  await ensureOutputDir(outputPath);

  // PASS 1: Analyze audio loudness
  // We need to capture the stderr output to get the loudnorm measurements
  const analyzeFilter = buildLoudnormAnalyzeFilter(normSettings);

  // Use null output for analysis pass
  const nullOutput = process.platform === 'win32' ? 'NUL' : '/dev/null';

  const analyzeCommand = new FFmpegCommandBuilder()
    .addInput(params.inputPath)
    .addFilter(analyzeFilter)
    .setOutput(nullOutput, { format: 'null' })
    .build();

  const analyzeResult = await executor.execute(analyzeCommand);

  // Parse loudnorm measurements from stderr
  const measured = parseLoudnormOutput(analyzeResult.stderr);

  // PASS 2: Apply normalization with measured values
  const applyFilter = buildLoudnormApplyFilter(normSettings, {
    input_i: measured.input_i,
    input_tp: measured.input_tp,
    input_lra: measured.input_lra,
    input_thresh: measured.input_thresh,
    target_offset: measured.target_offset,
  });

  const applyCommand = new FFmpegCommandBuilder()
    .addInput(params.inputPath)
    .addFilter(applyFilter)
    .setOutputFromQuality(outputPath, config.quality)
    .build();

  await executor.execute(applyCommand);

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
            method: 'dual-pass (EBU R128)',
            measured: {
              inputLoudness: `${measured.input_i} LUFS`,
              inputTruePeak: `${measured.input_tp} dBTP`,
              inputLRA: `${measured.input_lra} LU`,
            },
            target: {
              loudness: `${normSettings.targetLoudness} LUFS`,
              truePeak: `${normSettings.truePeak} dBTP`,
              loudnessRange: `${normSettings.loudnessRange} LU`,
            },
            result: {
              outputLoudness: `${measured.output_i} LUFS`,
              outputTruePeak: `${measured.output_tp} dBTP`,
            },
            duration: outputInfo.duration,
          },
          null,
          2
        ),
      },
    ],
  };
}

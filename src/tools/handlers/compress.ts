/**
 * Tool: ffmpeg_compress_audio
 * Apply professional audio compression to voice recordings for consistent loudness
 */

import type { FFmpegExecutor } from '../../ffmpeg/types.js';
import type { FFmpegConfig } from '../../config/types.js';
import { FFmpegCommandBuilder, buildCompressorFilter } from '../../ffmpeg/command-builder.js';
import { validateInputFile, ensureOutputDir } from '../../utils/paths.js';
import { generateOutputPath } from '../../utils/naming.js';

export interface CompressAudioParams {
  inputPath: string;
  outputPath?: string;
  threshold?: string;         // Compression threshold (default: "-20dB")
  ratio?: number;             // Compression ratio (default: 3)
  attack?: number;            // Attack time in ms (default: 200)
  release?: number;           // Release time in ms (default: 800)
  makeupGain?: number;        // Post-compression gain in dB (default: 0)
}

export async function handleCompressAudio(
  params: CompressAudioParams,
  executor: FFmpegExecutor,
  config: FFmpegConfig
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  // Validate input file exists
  await validateInputFile(params.inputPath);

  // Get compression settings (use meditation defaults if not specified)
  const compressionSettings = {
    threshold: params.threshold ?? config.meditation.compression.threshold,
    ratio: params.ratio ?? config.meditation.compression.ratio,
    attack: params.attack ?? config.meditation.compression.attack,
    release: params.release ?? config.meditation.compression.release,
    makeupGain: params.makeupGain ?? config.meditation.compression.makeupGain,
  };

  // Generate output path if not provided
  const outputPath =
    params.outputPath ||
    generateOutputPath(params.inputPath, config.local!.outputDir, 'compressed');

  // Ensure output directory exists
  await ensureOutputDir(outputPath);

  // Build compressor filter
  const compressorFilter = buildCompressorFilter(compressionSettings);

  // Build command
  const command = new FFmpegCommandBuilder()
    .addInput(params.inputPath)
    .addFilter(compressorFilter)
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
            compression: {
              threshold: compressionSettings.threshold,
              ratio: `${compressionSettings.ratio}:1`,
              attack: `${compressionSettings.attack}ms`,
              release: `${compressionSettings.release}ms`,
              makeupGain: `${compressionSettings.makeupGain}dB`,
            },
            filter: compressorFilter,
            duration: outputInfo.duration,
          },
          null,
          2
        ),
      },
    ],
  };
}

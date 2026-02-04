/**
 * Tool: ffmpeg_convert_format
 * Convert audio between formats
 */

import type { FFmpegExecutor } from '../../ffmpeg/types.js';
import type { FFmpegConfig } from '../../config/types.js';
import { FFmpegCommandBuilder } from '../../ffmpeg/command-builder.js';
import { validateInputFile, ensureOutputDir } from '../../utils/paths.js';
import { generateOutputPath } from '../../utils/naming.js';

export interface ConvertFormatParams {
  inputPath: string;
  outputPath?: string;
  outputFormat: 'mp3' | 'wav' | 'flac' | 'aac' | 'ogg';
  quality?: number;
  bitrate?: string;
  sampleRate?: number;
  channels?: number;
}

interface FormatConfig {
  codec: string;
  defaultBitrate: string;
  extension: string;
}

const FORMAT_CONFIGS: Record<string, FormatConfig> = {
  mp3: { codec: 'libmp3lame', defaultBitrate: '192k', extension: '.mp3' },
  wav: { codec: 'pcm_s16le', defaultBitrate: '', extension: '.wav' },
  flac: { codec: 'flac', defaultBitrate: '', extension: '.flac' },
  aac: { codec: 'aac', defaultBitrate: '192k', extension: '.aac' },
  ogg: { codec: 'libvorbis', defaultBitrate: '192k', extension: '.ogg' },
};

export async function handleConvertFormat(
  params: ConvertFormatParams,
  executor: FFmpegExecutor,
  config: FFmpegConfig
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  // Validate input file exists
  await validateInputFile(params.inputPath);

  const formatConfig = FORMAT_CONFIGS[params.outputFormat];
  if (!formatConfig) {
    throw new Error(`Unsupported output format: ${params.outputFormat}`);
  }

  // Generate output path if not provided
  const outputPath =
    params.outputPath ||
    generateOutputPath(
      params.inputPath,
      config.local!.outputDir,
      'converted',
      formatConfig.extension
    );

  // Ensure output directory exists
  await ensureOutputDir(outputPath);

  // Build command
  const builder = new FFmpegCommandBuilder()
    .addInput(params.inputPath)
    .setOutput(outputPath, {
      codec: formatConfig.codec,
      bitrate: params.bitrate || formatConfig.defaultBitrate || undefined,
      sampleRate: params.sampleRate || config.quality.sampleRate,
      channels: params.channels,
    });

  // Add quality setting for formats that support it
  if (params.quality !== undefined) {
    if (params.outputFormat === 'mp3') {
      // MP3 VBR quality (0-9, lower is better)
      builder.setOutput(outputPath, {
        codec: formatConfig.codec,
        quality: params.quality,
        sampleRate: params.sampleRate || config.quality.sampleRate,
        channels: params.channels,
      });
    } else if (params.outputFormat === 'ogg') {
      // OGG quality (0-10, higher is better)
      builder.setOutput(outputPath, {
        codec: formatConfig.codec,
        quality: params.quality,
        sampleRate: params.sampleRate || config.quality.sampleRate,
        channels: params.channels,
      });
    }
  }

  const command = builder.build();
  await executor.execute(command);

  // Get info about the converted file
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
            format: params.outputFormat,
            codec: formatConfig.codec,
            duration: outputInfo.duration,
            sampleRate: outputInfo.sampleRate,
            channels: outputInfo.channels,
            bitrate: outputInfo.bitrate,
          },
          null,
          2
        ),
      },
    ],
  };
}

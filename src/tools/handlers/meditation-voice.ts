/**
 * Tool: ffmpeg_process_meditation_voice
 * All-in-one voice processing for meditation (compression + normalization + tempo)
 */

import type { FFmpegExecutor } from '../../ffmpeg/types.js';
import type { FFmpegConfig, CompressionSettings, NormalizationSettings } from '../../config/types.js';
import {
  FFmpegCommandBuilder,
  buildCompressorFilter,
  buildLoudnormAnalyzeFilter,
  buildLoudnormApplyFilter,
  buildTempoFilter,
} from '../../ffmpeg/command-builder.js';
import { parseLoudnormOutput } from '../../ffmpeg/parser.js';
import { validateInputFile, ensureOutputDir } from '../../utils/paths.js';
import { generateOutputPath } from '../../utils/naming.js';
import { formatDuration } from '../../utils/duration.js';

export interface MeditationVoiceParams {
  inputPath: string;
  outputPath?: string;
  compression?: Partial<CompressionSettings>;
  normalization?: Partial<NormalizationSettings>;
  tempo?: number;             // Speed adjustment (default: 0.9)
}

export async function handleProcessMeditationVoice(
  params: MeditationVoiceParams,
  executor: FFmpegExecutor,
  config: FFmpegConfig
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  // Validate input file exists
  await validateInputFile(params.inputPath);

  // Get original duration
  const inputInfo = await executor.probe(params.inputPath);
  const originalDuration = inputInfo.duration;

  // Merge settings with meditation defaults
  const compressionSettings: CompressionSettings = {
    threshold: params.compression?.threshold ?? config.meditation.compression.threshold,
    ratio: params.compression?.ratio ?? config.meditation.compression.ratio,
    attack: params.compression?.attack ?? config.meditation.compression.attack,
    release: params.compression?.release ?? config.meditation.compression.release,
    makeupGain: params.compression?.makeupGain ?? config.meditation.compression.makeupGain,
  };

  const normalizationSettings: NormalizationSettings = {
    targetLoudness: params.normalization?.targetLoudness ?? config.meditation.normalization.targetLoudness,
    truePeak: params.normalization?.truePeak ?? config.meditation.normalization.truePeak,
    loudnessRange: params.normalization?.loudnessRange ?? config.meditation.normalization.loudnessRange,
  };

  const tempo = params.tempo ?? config.meditation.tempo;

  // Generate output path if not provided
  const outputPath =
    params.outputPath ||
    generateOutputPath(params.inputPath, config.local!.outputDir, 'voice_processed');

  // Ensure output directory exists
  await ensureOutputDir(outputPath);

  // STEP 1: Analyze for normalization (we need to do this first with compression applied)
  // Apply compression first, then analyze for normalization
  const compressorFilter = buildCompressorFilter(compressionSettings);
  const analyzeFilter = buildLoudnormAnalyzeFilter(normalizationSettings);

  // Combined analysis: compression + loudnorm analysis
  const nullOutput = process.platform === 'win32' ? 'NUL' : '/dev/null';

  const analyzeCommand = new FFmpegCommandBuilder()
    .addInput(params.inputPath)
    .addFilter(`${compressorFilter},${analyzeFilter}`)
    .setOutput(nullOutput, { format: 'null' })
    .build();

  const analyzeResult = await executor.execute(analyzeCommand);
  const measured = parseLoudnormOutput(analyzeResult.stderr);

  // STEP 2: Apply full processing pipeline
  // compression -> normalization -> tempo
  const loudnormFilter = buildLoudnormApplyFilter(normalizationSettings, {
    input_i: measured.input_i,
    input_tp: measured.input_tp,
    input_lra: measured.input_lra,
    input_thresh: measured.input_thresh,
    target_offset: measured.target_offset,
  });

  const tempoFilter = buildTempoFilter(tempo);

  // Build combined filter chain
  const fullFilterChain = [compressorFilter, loudnormFilter, tempoFilter].join(',');

  const processCommand = new FFmpegCommandBuilder()
    .addInput(params.inputPath)
    .addFilter(fullFilterChain)
    .setOutputFromQuality(outputPath, config.quality)
    .build();

  await executor.execute(processCommand);

  // Get info about the output file
  const outputInfo = await executor.probe(outputPath);

  // Calculate expected duration based on tempo
  const expectedDuration = originalDuration / tempo;

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            success: true,
            inputPath: params.inputPath,
            outputPath,
            processing: {
              compression: {
                threshold: compressionSettings.threshold,
                ratio: `${compressionSettings.ratio}:1`,
                attack: `${compressionSettings.attack}ms`,
                release: `${compressionSettings.release}ms`,
              },
              normalization: {
                method: 'dual-pass EBU R128',
                target: {
                  loudness: `${normalizationSettings.targetLoudness} LUFS`,
                  truePeak: `${normalizationSettings.truePeak} dBTP`,
                },
                measured: {
                  inputLoudness: `${measured.input_i} LUFS`,
                  inputTruePeak: `${measured.input_tp} dBTP`,
                },
              },
              tempo: {
                factor: tempo,
                description: `${Math.round(tempo * 100)}% speed`,
              },
            },
            duration: {
              original: originalDuration,
              originalFormatted: formatDuration(originalDuration),
              processed: outputInfo.duration,
              processedFormatted: formatDuration(outputInfo.duration),
              change: `${tempo < 1 ? '+' : '-'}${Math.abs(Math.round((1 - tempo) * 100))}%`,
            },
          },
          null,
          2
        ),
      },
    ],
  };
}

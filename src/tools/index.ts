/**
 * MCP Tool registration for mcp-ffmpeg
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { FFmpegExecutor } from '../ffmpeg/types.js';
import type { FFmpegConfig } from '../config/types.js';
import { FFmpegError } from '../errors/index.js';

// Import all handlers
import {
  handleGetAudioInfo,
  handleConvertFormat,
  handleAdjustVolume,
  handleGenerateSilence,
  handleConcatAudio,
  handleCompressAudio,
  handleNormalizeAudio,
  handleAdjustTempo,
  handleApplyFade,
  handleMixAudio,
  handleLoopAudio,
  handleProcessMeditationVoice,
  handleMixMeditation,
} from './handlers/index.js';

/**
 * Helper to wrap handler with error handling
 */
function wrapHandler<T>(
  handler: (params: T, executor: FFmpegExecutor, config: FFmpegConfig) => Promise<{ content: Array<{ type: 'text'; text: string }> }>
) {
  return async (params: T, executor: FFmpegExecutor, config: FFmpegConfig) => {
    try {
      return await handler(params, executor, config);
    } catch (error) {
      if (error instanceof FFmpegError) {
        return error.toMcpResponse();
      }
      // Wrap unknown errors
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                error: true,
                message: error instanceof Error ? error.message : String(error),
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
  };
}

/**
 * Register all FFmpeg tools with the MCP server
 */
export function registerAllTools(
  server: McpServer,
  executor: FFmpegExecutor,
  config: FFmpegConfig
): void {
  // ===========================================
  // PHASE 1: Core Tools
  // ===========================================

  // Tool 1: Get Audio Info (probe)
  server.tool(
    'ffmpeg_get_audio_info',
    'Get detailed audio file information (duration, sample rate, codec, etc.) using FFprobe',
    {
      filePath: z.string().describe('Path to the audio file to analyze'),
    },
    async (params) => wrapHandler(handleGetAudioInfo)(params, executor, config)
  );

  // Tool 2: Convert Format
  server.tool(
    'ffmpeg_convert_format',
    'Convert audio between formats (mp3, wav, flac, aac, ogg)',
    {
      inputPath: z.string().describe('Input audio file path'),
      outputPath: z.string().optional().describe('Output path (auto-generated if not provided)'),
      outputFormat: z.enum(['mp3', 'wav', 'flac', 'aac', 'ogg']).describe('Target audio format'),
      quality: z.number().optional().describe('Quality setting (format-specific)'),
      bitrate: z.string().optional().describe('Bitrate (e.g., "192k", "320k")'),
      sampleRate: z.number().optional().describe('Sample rate in Hz'),
      channels: z.number().optional().describe('Number of channels (1=mono, 2=stereo)'),
    },
    async (params) => wrapHandler(handleConvertFormat)(params, executor, config)
  );

  // Tool 3: Adjust Volume
  server.tool(
    'ffmpeg_adjust_volume',
    'Adjust volume level of audio (factor or dB)',
    {
      inputPath: z.string().describe('Input audio file path'),
      outputPath: z.string().optional().describe('Output path (auto-generated if not provided)'),
      volume: z.number().optional().describe('Volume factor (0.3 = 30%, 1.75 = 175%)'),
      volumeDb: z.number().optional().describe('Volume adjustment in dB'),
    },
    async (params) => wrapHandler(handleAdjustVolume)(params, executor, config)
  );

  // Tool 4: Generate Silence
  server.tool(
    'ffmpeg_generate_silence',
    'Generate silent audio files for pauses in meditation',
    {
      duration: z.number().describe('Duration in seconds'),
      outputPath: z.string().optional().describe('Output path (auto-generated if not provided)'),
      sampleRate: z.number().optional().describe('Sample rate (default: 44100)'),
      channels: z.number().optional().describe('Number of channels (default: 2)'),
    },
    async (params) => wrapHandler(handleGenerateSilence)(params, executor, config)
  );

  // Tool 5: Concatenate Audio
  server.tool(
    'ffmpeg_concat_audio',
    'Concatenate multiple audio files in sequence with optional crossfade',
    {
      inputs: z.array(z.string()).describe('Array of input file paths in order'),
      outputPath: z.string().describe('Output file path'),
      crossfade: z.number().optional().describe('Crossfade duration in seconds'),
      useFilter: z.boolean().optional().describe('Use filter method instead of concat demuxer'),
    },
    async (params) => wrapHandler(handleConcatAudio)(params, executor, config)
  );

  // ===========================================
  // PHASE 2: Professional Audio Processing
  // ===========================================

  // Tool 6: Compress Audio
  server.tool(
    'ffmpeg_compress_audio',
    'Apply professional audio compression to voice recordings for consistent loudness',
    {
      inputPath: z.string().describe('Input audio file path'),
      outputPath: z.string().optional().describe('Output path (auto-generated if not provided)'),
      threshold: z.string().optional().describe('Compression threshold (default: "-20dB")'),
      ratio: z.number().optional().describe('Compression ratio (default: 3)'),
      attack: z.number().optional().describe('Attack time in ms (default: 200)'),
      release: z.number().optional().describe('Release time in ms (default: 800)'),
      makeupGain: z.number().optional().describe('Post-compression gain in dB (default: 0)'),
    },
    async (params) => wrapHandler(handleCompressAudio)(params, executor, config)
  );

  // Tool 7: Normalize Audio
  server.tool(
    'ffmpeg_normalize_audio',
    'Normalize audio to broadcast standards (EBU R128 loudnorm) using automatic dual-pass',
    {
      inputPath: z.string().describe('Input audio file path'),
      outputPath: z.string().optional().describe('Output path (auto-generated if not provided)'),
      targetLoudness: z.number().optional().describe('LUFS target (default: -16)'),
      truePeak: z.number().optional().describe('True peak in dBTP (default: -1.5)'),
      loudnessRange: z.number().optional().describe('LRA in LU (default: 11)'),
    },
    async (params) => wrapHandler(handleNormalizeAudio)(params, executor, config)
  );

  // Tool 8: Adjust Tempo
  server.tool(
    'ffmpeg_adjust_tempo',
    'Change playback speed without affecting pitch (0.9 = meditation pace)',
    {
      inputPath: z.string().describe('Input audio file path'),
      outputPath: z.string().optional().describe('Output path (auto-generated if not provided)'),
      speed: z.number().describe('Speed factor (0.5 = half, 2.0 = double, 0.9 = meditation)'),
    },
    async (params) => wrapHandler(handleAdjustTempo)(params, executor, config)
  );

  // Tool 9: Apply Fade
  server.tool(
    'ffmpeg_apply_fade',
    'Apply fade-in and/or fade-out effects to audio',
    {
      inputPath: z.string().describe('Input audio file path'),
      outputPath: z.string().optional().describe('Output path (auto-generated if not provided)'),
      fadeIn: z
        .object({
          duration: z.number().describe('Fade-in duration in seconds'),
          startTime: z.number().optional().describe('Start time in seconds (default: 0)'),
          curve: z.string().optional().describe('Fade curve type (tri, qsin, log, etc.)'),
        })
        .optional()
        .describe('Fade-in configuration'),
      fadeOut: z
        .object({
          duration: z.number().describe('Fade-out duration in seconds'),
          startTime: z.number().optional().describe('Start time (auto-calculated if not provided)'),
          curve: z.string().optional().describe('Fade curve type'),
        })
        .optional()
        .describe('Fade-out configuration'),
    },
    async (params) => wrapHandler(handleApplyFade)(params, executor, config)
  );

  // ===========================================
  // PHASE 3: Advanced Features
  // ===========================================

  // Tool 10: Mix Audio
  server.tool(
    'ffmpeg_mix_audio',
    'Mix multiple audio tracks with volume control, delays, and fades',
    {
      inputs: z
        .array(
          z.object({
            path: z.string().describe('Input file path'),
            volume: z.number().optional().describe('Volume factor (default: 1.0)'),
            delay: z.number().optional().describe('Delay in milliseconds'),
            fadeIn: z.number().optional().describe('Fade-in duration in seconds'),
            fadeOut: z.number().optional().describe('Fade-out duration in seconds'),
            loop: z.boolean().optional().describe('Loop input to match longest track'),
          })
        )
        .describe('Array of input track configurations'),
      outputPath: z.string().describe('Output file path'),
      outputDuration: z
        .enum(['longest', 'shortest', 'first'])
        .optional()
        .describe('Duration mode (default: first)'),
      normalize: z.boolean().optional().describe('Apply normalization after mix'),
    },
    async (params) => wrapHandler(handleMixAudio)(params, executor, config)
  );

  // Tool 11: Loop Audio
  server.tool(
    'ffmpeg_loop_audio',
    'Loop audio file to reach a target duration',
    {
      inputPath: z.string().describe('Input audio file path'),
      outputPath: z.string().optional().describe('Output path (auto-generated if not provided)'),
      targetDuration: z.number().describe('Target duration in seconds'),
      fadeLoops: z.boolean().optional().describe('Crossfade between loops (default: true)'),
      fadeDuration: z.number().optional().describe('Crossfade duration in seconds (default: 2)'),
    },
    async (params) => wrapHandler(handleLoopAudio)(params, executor, config)
  );

  // ===========================================
  // PHASE 4: Meditation Workflows
  // ===========================================

  // Tool 12: Process Meditation Voice
  server.tool(
    'ffmpeg_process_meditation_voice',
    'All-in-one voice processing for meditation: compression + normalization + tempo adjustment',
    {
      inputPath: z.string().describe('Input voice recording path'),
      outputPath: z.string().optional().describe('Output path (auto-generated if not provided)'),
      compression: z
        .object({
          threshold: z.string().optional().describe('Compression threshold'),
          ratio: z.number().optional().describe('Compression ratio'),
          attack: z.number().optional().describe('Attack time in ms'),
          release: z.number().optional().describe('Release time in ms'),
        })
        .optional()
        .describe('Compression settings (uses meditation defaults if not provided)'),
      normalization: z
        .object({
          targetLoudness: z.number().optional().describe('LUFS target'),
          truePeak: z.number().optional().describe('True peak in dBTP'),
        })
        .optional()
        .describe('Normalization settings (uses meditation defaults if not provided)'),
      tempo: z.number().optional().describe('Speed factor (default: 0.9 for meditation pace)'),
    },
    async (params) => wrapHandler(handleProcessMeditationVoice)(params, executor, config)
  );

  // Tool 13: Mix Meditation
  server.tool(
    'ffmpeg_mix_meditation',
    'Complete meditation production: mix voice with background music and sounds, add intro/outro',
    {
      voiceTrack: z.string().describe('Processed voice track path'),
      musicTrack: z.string().optional().describe('Background music path'),
      soundEffects: z.string().optional().describe('Sound effects/nature sounds path'),
      outputPath: z.string().describe('Output file path'),
      intro: z
        .object({
          duration: z.number().describe('Intro duration in seconds'),
          fadeIn: z.number().optional().describe('Fade-in duration (default: 3)'),
        })
        .optional()
        .describe('Intro configuration'),
      outro: z
        .object({
          duration: z.number().describe('Outro duration in seconds'),
          fadeOut: z.number().optional().describe('Fade-out duration (default: 3)'),
        })
        .optional()
        .describe('Outro configuration'),
      volumes: z
        .object({
          voice: z.number().optional().describe('Voice volume (default: 1.0)'),
          music: z.number().optional().describe('Music volume (default: 0.3)'),
          sounds: z.number().optional().describe('Sounds volume (default: 0.2)'),
        })
        .optional()
        .describe('Volume levels for each track'),
      finalBoost: z.number().optional().describe('Final volume boost (default: 1.75 = +75%)'),
    },
    async (params) => wrapHandler(handleMixMeditation)(params, executor, config)
  );
}

/**
 * Tool: ffmpeg_mix_meditation
 * Complete meditation production in one step
 */

import type { FFmpegExecutor } from '../../ffmpeg/types.js';
import type { FFmpegConfig } from '../../config/types.js';
import { FFmpegCommandBuilder, buildVolumeFilter } from '../../ffmpeg/command-builder.js';
import { validateInputFile, validateInputFiles, ensureOutputDir } from '../../utils/paths.js';
import { formatDuration, calculateLoopCount } from '../../utils/duration.js';

export interface MeditationMixParams {
  voiceTrack: string;         // Processed voice track path
  musicTrack?: string;        // Background music path
  soundEffects?: string;      // Sound effects path (nature sounds, etc.)
  outputPath: string;

  intro?: {
    duration: number;         // Intro music duration in seconds
    fadeIn?: number;          // Fade-in duration (default: 3)
  };

  outro?: {
    duration: number;         // Outro music duration in seconds
    fadeOut?: number;         // Fade-out duration (default: 3)
  };

  volumes?: {
    voice?: number;           // Voice volume (default: 1.0)
    music?: number;           // Music volume (default: 0.3)
    sounds?: number;          // Sound effects volume (default: 0.2)
  };

  finalBoost?: number;        // Final volume boost (default: 1.75)
}

export async function handleMixMeditation(
  params: MeditationMixParams,
  executor: FFmpegExecutor,
  config: FFmpegConfig
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  // Validate voice track (required)
  await validateInputFile(params.voiceTrack);

  // Validate optional tracks
  const optionalTracks: string[] = [];
  if (params.musicTrack) {
    await validateInputFile(params.musicTrack);
    optionalTracks.push(params.musicTrack);
  }
  if (params.soundEffects) {
    await validateInputFile(params.soundEffects);
    optionalTracks.push(params.soundEffects);
  }

  // Ensure output directory exists
  await ensureOutputDir(params.outputPath);

  // Get track durations
  const voiceInfo = await executor.probe(params.voiceTrack);
  const voiceDuration = voiceInfo.duration;

  // Calculate total duration
  const introDuration = params.intro?.duration ?? 0;
  const outroDuration = params.outro?.duration ?? 0;
  const totalDuration = introDuration + voiceDuration + outroDuration;

  // Get volumes (use meditation defaults)
  const voiceVolume = params.volumes?.voice ?? 1.0;
  const musicVolume = params.volumes?.music ?? config.meditation.musicVolume;
  const soundsVolume = params.volumes?.sounds ?? config.meditation.soundsVolume;
  const finalBoost = params.finalBoost ?? config.meditation.finalBoost;

  // Get fade durations
  const fadeIn = params.intro?.fadeIn ?? config.meditation.fadeInDuration;
  const fadeOut = params.outro?.fadeOut ?? config.meditation.fadeOutDuration;

  // Build the complex filter graph
  const builder = new FFmpegCommandBuilder();
  const filterParts: string[] = [];
  const mixInputs: string[] = [];
  let inputIndex = 0;

  // Input 0: Voice track
  builder.addInput(params.voiceTrack);
  const voiceLabel = '[voice]';

  // Process voice: delay by intro duration, apply volume
  const voiceFilters: string[] = [];
  if (introDuration > 0) {
    voiceFilters.push(`adelay=${introDuration * 1000}|${introDuration * 1000}`);
  }
  if (voiceVolume !== 1.0) {
    voiceFilters.push(`volume=${voiceVolume}`);
  }
  if (voiceFilters.length > 0) {
    filterParts.push(`[${inputIndex}:a]${voiceFilters.join(',')}${voiceLabel}`);
  } else {
    filterParts.push(`[${inputIndex}:a]acopy${voiceLabel}`);
  }
  mixInputs.push(voiceLabel);
  inputIndex++;

  // Input 1: Music track (if provided)
  if (params.musicTrack) {
    const musicInfo = await executor.probe(params.musicTrack);
    const musicDuration = musicInfo.duration;
    const loopCount = calculateLoopCount(musicDuration, totalDuration);

    // Add music input with loop
    builder.addInput(params.musicTrack, ['-stream_loop', String(loopCount)]);
    const musicLabel = '[music]';

    // Process music: trim to total duration, apply fades and volume
    const musicFilters: string[] = [];
    musicFilters.push(`atrim=duration=${totalDuration}`);
    musicFilters.push(`afade=t=in:st=0:d=${fadeIn}`);
    musicFilters.push(`afade=t=out:st=${totalDuration - fadeOut}:d=${fadeOut}`);
    musicFilters.push(`volume=${musicVolume}`);

    filterParts.push(`[${inputIndex}:a]${musicFilters.join(',')}${musicLabel}`);
    mixInputs.push(musicLabel);
    inputIndex++;
  }

  // Input 2: Sound effects (if provided)
  if (params.soundEffects) {
    const soundsInfo = await executor.probe(params.soundEffects);
    const soundsDuration = soundsInfo.duration;
    const loopCount = calculateLoopCount(soundsDuration, totalDuration);

    // Add sounds input with loop
    builder.addInput(params.soundEffects, ['-stream_loop', String(loopCount)]);
    const soundsLabel = '[sounds]';

    // Process sounds: trim to total duration, apply fades and volume
    const soundsFilters: string[] = [];
    soundsFilters.push(`atrim=duration=${totalDuration}`);
    soundsFilters.push(`afade=t=in:st=0:d=${fadeIn}`);
    soundsFilters.push(`afade=t=out:st=${totalDuration - fadeOut}:d=${fadeOut}`);
    soundsFilters.push(`volume=${soundsVolume}`);

    filterParts.push(`[${inputIndex}:a]${soundsFilters.join(',')}${soundsLabel}`);
    mixInputs.push(soundsLabel);
    inputIndex++;
  }

  // Mix all tracks
  const amixFilter = `${mixInputs.join('')}amix=inputs=${mixInputs.length}:duration=longest:dropout_transition=0[mixed]`;
  filterParts.push(amixFilter);

  // Apply final volume boost
  if (finalBoost !== 1.0) {
    filterParts.push(`[mixed]volume=${finalBoost}[out]`);
  } else {
    filterParts.push('[mixed]acopy[out]');
  }

  builder.setFilterComplex(filterParts.join(';'));
  builder.setOutput(params.outputPath, {
    map: '[out]',
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
            tracks: {
              voice: {
                path: params.voiceTrack,
                volume: voiceVolume,
                duration: voiceDuration,
              },
              music: params.musicTrack
                ? {
                    path: params.musicTrack,
                    volume: musicVolume,
                    looped: true,
                  }
                : null,
              soundEffects: params.soundEffects
                ? {
                    path: params.soundEffects,
                    volume: soundsVolume,
                    looped: true,
                  }
                : null,
            },
            timing: {
              intro: introDuration > 0 ? { duration: introDuration, fadeIn } : null,
              voiceDuration,
              outro: outroDuration > 0 ? { duration: outroDuration, fadeOut } : null,
              totalDuration: outputInfo.duration,
              totalDurationFormatted: formatDuration(outputInfo.duration),
            },
            finalBoost: `${Math.round(finalBoost * 100)}%`,
          },
          null,
          2
        ),
      },
    ],
  };
}

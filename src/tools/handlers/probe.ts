/**
 * Tool: ffmpeg_get_audio_info
 * Get detailed audio file information using FFprobe
 */

import type { FFmpegExecutor } from '../../ffmpeg/types.js';
import { validateInputFile } from '../../utils/paths.js';
import { getFileSize } from '../../utils/files.js';
import { formatDuration } from '../../utils/duration.js';

export interface GetAudioInfoParams {
  filePath: string;
}

export interface GetAudioInfoResult {
  filePath: string;
  duration: number;
  durationFormatted: string;
  sampleRate: number;
  channels: number;
  channelLayout: string;
  codec: string;
  bitrate: number;
  format: string;
  size: number;
  sizeFormatted: string;
}

export async function handleGetAudioInfo(
  params: GetAudioInfoParams,
  executor: FFmpegExecutor
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  // Validate input file exists
  await validateInputFile(params.filePath);

  // Probe the file
  const info = await executor.probe(params.filePath);

  // Get actual file size (probe might not have it)
  const actualSize = getFileSize(params.filePath) || info.size;

  // Format results
  const result: GetAudioInfoResult = {
    filePath: params.filePath,
    duration: info.duration,
    durationFormatted: formatDuration(info.duration),
    sampleRate: info.sampleRate,
    channels: info.channels,
    channelLayout: info.channels === 1 ? 'mono' : info.channels === 2 ? 'stereo' : `${info.channels} channels`,
    codec: info.codec,
    bitrate: info.bitrate,
    format: info.format,
    size: actualSize,
    sizeFormatted: formatFileSize(actualSize),
  };

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

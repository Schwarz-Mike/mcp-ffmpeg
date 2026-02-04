/**
 * Duration and time utilities for mcp-ffmpeg
 */

/**
 * Parse FFmpeg time format (HH:MM:SS.ms) to seconds
 */
export function parseFFmpegTime(timeStr: string): number {
  // Format: HH:MM:SS.ms or SS.ms
  const parts = timeStr.split(':');

  if (parts.length === 3) {
    // HH:MM:SS.ms
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parseFloat(parts[2]);
    return hours * 3600 + minutes * 60 + seconds;
  } else if (parts.length === 2) {
    // MM:SS.ms
    const minutes = parseInt(parts[0], 10);
    const seconds = parseFloat(parts[1]);
    return minutes * 60 + seconds;
  } else {
    // SS.ms or just seconds
    return parseFloat(timeStr);
  }
}

/**
 * Format seconds to FFmpeg time format (HH:MM:SS.ms)
 */
export function formatFFmpegTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = secs.toFixed(2).padStart(5, '0');

  return `${hh}:${mm}:${ss}`;
}

/**
 * Format seconds to human-readable duration
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }
  if (secs > 0 || parts.length === 0) {
    parts.push(`${secs}s`);
  }

  return parts.join(' ');
}

/**
 * Calculate number of loops needed to reach target duration
 */
export function calculateLoopCount(sourceDuration: number, targetDuration: number): number {
  return Math.ceil(targetDuration / sourceDuration);
}

/**
 * Calculate fade out start time based on duration
 */
export function calculateFadeOutStart(duration: number, fadeOutLength: number): number {
  return Math.max(0, duration - fadeOutLength);
}

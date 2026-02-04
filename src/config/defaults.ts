/**
 * Default configuration values for mcp-ffmpeg
 */

import type { AudioQualityConfig, MeditationDefaults, CompressionSettings, NormalizationSettings } from './types.js';

// Windows-specific paths
export const WINDOWS_FFMPEG_PATHS = [
  // User's specific path (hardcoded as requested)
  'C:\\Users\\ich\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.0.1-full_build\\bin\\ffmpeg.exe',
  // Common WinGet installation paths
  '%LOCALAPPDATA%\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-7.1-full_build\\bin\\ffmpeg.exe',
  '%LOCALAPPDATA%\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-7.0-full_build\\bin\\ffmpeg.exe',
  // Chocolatey
  'C:\\ProgramData\\chocolatey\\bin\\ffmpeg.exe',
  // Scoop
  '%USERPROFILE%\\scoop\\apps\\ffmpeg\\current\\bin\\ffmpeg.exe',
  // Manual install locations
  'C:\\ffmpeg\\bin\\ffmpeg.exe',
  'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
  'C:\\Program Files (x86)\\ffmpeg\\bin\\ffmpeg.exe',
];

export const WINDOWS_FFPROBE_PATHS = [
  'C:\\Users\\ich\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.0.1-full_build\\bin\\ffprobe.exe',
  '%LOCALAPPDATA%\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-7.1-full_build\\bin\\ffprobe.exe',
  '%LOCALAPPDATA%\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-7.0-full_build\\bin\\ffprobe.exe',
  'C:\\ProgramData\\chocolatey\\bin\\ffprobe.exe',
  '%USERPROFILE%\\scoop\\apps\\ffmpeg\\current\\bin\\ffprobe.exe',
  'C:\\ffmpeg\\bin\\ffprobe.exe',
  'C:\\Program Files\\ffmpeg\\bin\\ffprobe.exe',
  'C:\\Program Files (x86)\\ffmpeg\\bin\\ffprobe.exe',
];

export const DEFAULT_OUTPUT_DIR = 'C:\\Users\\ich\\Dropbox\\mike\\MCP Servers\\ffmpeg\\output';

export const AUDIO_QUALITY: AudioQualityConfig = {
  format: 'mp3',
  codec: 'libmp3lame',
  bitrate: '192k',
  sampleRate: 44100,
  channels: 2,
  quality: 2, // MP3 VBR quality (0-9, 2 = high quality)
};

export const DEFAULT_COMPRESSION: CompressionSettings = {
  threshold: '-20dB',
  ratio: 3,
  attack: 200,
  release: 800,
  makeupGain: 0,
};

export const DEFAULT_NORMALIZATION: NormalizationSettings = {
  targetLoudness: -16, // LUFS
  truePeak: -1.5,      // dBTP
  loudnessRange: 11,   // LU
};

export const MEDITATION_DEFAULTS: MeditationDefaults = {
  compression: DEFAULT_COMPRESSION,
  normalization: DEFAULT_NORMALIZATION,
  tempo: 0.9,           // Slightly slower for meditation
  musicVolume: 0.3,     // 30% volume
  soundsVolume: 0.2,    // 20% volume
  fadeInDuration: 3,    // seconds
  fadeOutDuration: 3,   // seconds
  finalBoost: 1.75,     // +75% final volume
};

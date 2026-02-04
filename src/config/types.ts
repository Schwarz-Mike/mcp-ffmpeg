/**
 * Configuration types for mcp-ffmpeg
 */

export interface FFmpegConfig {
  mode: 'local' | 'remote';
  local?: LocalConfig;
  remote?: RemoteConfig;
  quality: AudioQualityConfig;
  meditation: MeditationDefaults;
}

export interface LocalConfig {
  ffmpegPath: string;
  ffprobePath: string;
  outputDir: string;
  keepIntermediateFiles: boolean;
}

export interface RemoteConfig {
  apiUrl: string;
  apiKey?: string;
  timeout: number;
}

export interface AudioQualityConfig {
  format: 'mp3' | 'wav' | 'flac' | 'aac' | 'ogg';
  codec: string;
  bitrate: string;
  sampleRate: number;
  channels: number;
  quality: number;
}

export interface CompressionSettings {
  threshold: string;
  ratio: number;
  attack: number;
  release: number;
  makeupGain: number;
}

export interface NormalizationSettings {
  targetLoudness: number;
  truePeak: number;
  loudnessRange: number;
}

export interface MeditationDefaults {
  compression: CompressionSettings;
  normalization: NormalizationSettings;
  tempo: number;
  musicVolume: number;
  soundsVolume: number;
  fadeInDuration: number;
  fadeOutDuration: number;
  finalBoost: number;
}

export interface AudioInfo {
  duration: number;
  sampleRate: number;
  channels: number;
  codec: string;
  bitrate: number;
  format: string;
  size: number;
}

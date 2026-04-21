/**
 * Configuration loader for mcp-ffmpeg
 * Supports multiple config locations and FFmpeg auto-detection
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import type { FFmpegConfig, LocalConfig } from './types.js';
import {
  WINDOWS_FFMPEG_PATHS,
  WINDOWS_FFPROBE_PATHS,
  AUDIO_QUALITY,
  MEDITATION_DEFAULTS,
} from './defaults.js';

// Get the install directory of the MCP server
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const INSTALL_DIR = path.resolve(__dirname, '..', '..'); // Go up from dist/config to root

/**
 * Get the default output directory based on install location
 */
function getDefaultOutputDir(): string {
  const outputDir = path.join(INSTALL_DIR, 'output');
  return outputDir;
}

/**
 * Expand environment variables in a path
 */
function expandPath(inputPath: string): string {
  if (process.platform === 'win32') {
    return inputPath
      .replace(/%LOCALAPPDATA%/gi, process.env.LOCALAPPDATA || '')
      .replace(/%USERPROFILE%/gi, process.env.USERPROFILE || '')
      .replace(/%APPDATA%/gi, process.env.APPDATA || '')
      .replace(/%PROGRAMFILES%/gi, process.env.PROGRAMFILES || '')
      .replace(/%PROGRAMFILES\(X86\)%/gi, process.env['PROGRAMFILES(X86)'] || '');
  }
  return inputPath.replace(/~/g, os.homedir());
}

/**
 * Check if a file exists
 */
function fileExists(filePath: string): boolean {
  try {
    const expanded = expandPath(filePath);
    return fs.existsSync(expanded) && fs.statSync(expanded).isFile();
  } catch {
    return false;
  }
}

/**
 * Try to find FFmpeg in PATH
 */
function findInPath(executable: string): string | null {
  try {
    const command = process.platform === 'win32' ? 'where' : 'which';
    const result = execSync(`${command} ${executable}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();

    // 'where' on Windows returns multiple lines, get the first one
    const firstResult = result.split('\n')[0].trim();
    if (fileExists(firstResult)) {
      return firstResult;
    }
  } catch {
    // Not found in PATH
  }
  return null;
}

/**
 * Scan common installation locations for FFmpeg
 */
function scanForFFmpeg(): { ffmpegPath: string | null; ffprobePath: string | null } {
  let ffmpegPath: string | null = null;
  let ffprobePath: string | null = null;

  // First try PATH
  ffmpegPath = findInPath('ffmpeg');
  ffprobePath = findInPath('ffprobe');

  if (ffmpegPath && ffprobePath) {
    return { ffmpegPath, ffprobePath };
  }

  // On Windows, scan common locations
  if (process.platform === 'win32') {
    if (!ffmpegPath) {
      for (const searchPath of WINDOWS_FFMPEG_PATHS) {
        const expanded = expandPath(searchPath);
        if (fileExists(expanded)) {
          ffmpegPath = expanded;
          break;
        }
      }
    }

    if (!ffprobePath) {
      for (const searchPath of WINDOWS_FFPROBE_PATHS) {
        const expanded = expandPath(searchPath);
        if (fileExists(expanded)) {
          ffprobePath = expanded;
          break;
        }
      }
    }

    // If we found ffmpeg but not ffprobe, try same directory
    if (ffmpegPath && !ffprobePath) {
      const ffprobeInSameDir = path.join(path.dirname(ffmpegPath), 'ffprobe.exe');
      if (fileExists(ffprobeInSameDir)) {
        ffprobePath = ffprobeInSameDir;
      }
    }
  }

  return { ffmpegPath, ffprobePath };
}

/**
 * Get config file paths to check
 */
function getConfigPaths(): string[] {
  const paths: string[] = [];

  // 1. Current working directory
  paths.push(path.join(process.cwd(), 'mcp-ffmpeg-config.json'));

  // 2. User's home .mcp-ffmpeg directory
  paths.push(path.join(os.homedir(), '.mcp-ffmpeg', 'config.json'));

  // 3. Windows AppData (for Claude Desktop)
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA;
    if (appData) {
      paths.push(path.join(appData, 'mcp-ffmpeg', 'config.json'));
    }
  }

  // 4. XDG config on Linux/Mac
  if (process.platform !== 'win32') {
    const xdgConfig = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
    paths.push(path.join(xdgConfig, 'mcp-ffmpeg', 'config.json'));
  }

  return paths;
}

/**
 * Load configuration from file
 */
function loadConfigFile(configPath: string): Partial<FFmpegConfig> | null {
  try {
    if (fileExists(configPath)) {
      const content = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error(`Error loading config from ${configPath}:`, error);
  }
  return null;
}

/**
 * Merge loaded config with defaults
 */
function mergeConfig(loaded: Partial<FFmpegConfig>): FFmpegConfig {
  const { ffmpegPath, ffprobePath } = scanForFFmpeg();

  const defaultLocal: LocalConfig = {
    ffmpegPath: ffmpegPath || 'ffmpeg',
    ffprobePath: ffprobePath || 'ffprobe',
    outputDir: getDefaultOutputDir(),
    keepIntermediateFiles: false,
  };

  return {
    mode: loaded.mode || 'local',
    local: {
      ...defaultLocal,
      ...loaded.local,
    },
    remote: loaded.remote || {
      apiUrl: '',
      timeout: 300000,
    },
    quality: {
      ...AUDIO_QUALITY,
      ...loaded.quality,
    },
    meditation: {
      ...MEDITATION_DEFAULTS,
      ...loaded.meditation,
    },
  };
}

/**
 * Build configuration from environment variables
 */
function buildFromEnvironment(): Partial<FFmpegConfig> {
  const config: Partial<FFmpegConfig> = {};

  if (process.env.MCP_FFMPEG_MODE) {
    config.mode = process.env.MCP_FFMPEG_MODE as 'local' | 'remote';
  }

  const localConfig: Partial<LocalConfig> = {};

  if (process.env.MCP_FFMPEG_PATH) {
    localConfig.ffmpegPath = process.env.MCP_FFMPEG_PATH;
  }
  if (process.env.MCP_FFPROBE_PATH) {
    localConfig.ffprobePath = process.env.MCP_FFPROBE_PATH;
  }
  if (process.env.MCP_FFMPEG_OUTPUT_DIR) {
    localConfig.outputDir = process.env.MCP_FFMPEG_OUTPUT_DIR;
  }

  if (Object.keys(localConfig).length > 0) {
    config.local = localConfig as LocalConfig;
  }

  return config;
}

/**
 * Main configuration loader
 */
export async function loadConfig(): Promise<FFmpegConfig> {
  // Try each config file location
  const configPaths = getConfigPaths();
  let loadedConfig: Partial<FFmpegConfig> = {};

  for (const configPath of configPaths) {
    const config = loadConfigFile(configPath);
    if (config) {
      loadedConfig = config;
      console.error(`Loaded config from: ${configPath}`);
      break;
    }
  }

  // Merge with environment variables (env takes precedence)
  const envConfig = buildFromEnvironment();
  loadedConfig = {
    ...loadedConfig,
    ...envConfig,
    local: {
      ...loadedConfig.local,
      ...envConfig.local,
    } as LocalConfig,
  };

  // Merge with defaults and return
  return mergeConfig(loadedConfig);
}

/**
 * Validate that FFmpeg is available and working
 */
export async function validateFFmpegInstallation(config: FFmpegConfig): Promise<{
  valid: boolean;
  ffmpegVersion?: string;
  ffprobeVersion?: string;
  error?: string;
}> {
  if (config.mode !== 'local' || !config.local) {
    return { valid: true }; // Remote mode doesn't need local FFmpeg
  }

  const { ffmpegPath, ffprobePath } = config.local;

  // Check if paths exist
  if (!fileExists(ffmpegPath)) {
    return {
      valid: false,
      error: `FFmpeg not found at: ${ffmpegPath}\n\nPlease install FFmpeg:\n- Windows: winget install Gyan.FFmpeg\n- Mac: brew install ffmpeg\n- Linux: sudo apt install ffmpeg\n\nOr specify the path in your config file or MCP_FFMPEG_PATH environment variable.`,
    };
  }

  if (!fileExists(ffprobePath)) {
    return {
      valid: false,
      error: `FFprobe not found at: ${ffprobePath}\n\nFFprobe is usually installed with FFmpeg. Please ensure you have a complete FFmpeg installation.`,
    };
  }

  // Try to get versions
  try {
    const ffmpegVersion = execSync(`"${ffmpegPath}" -version`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).split('\n')[0];

    const ffprobeVersion = execSync(`"${ffprobePath}" -version`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).split('\n')[0];

    return {
      valid: true,
      ffmpegVersion,
      ffprobeVersion,
    };
  } catch (error) {
    return {
      valid: false,
      error: `FFmpeg found but failed to execute. Please check the installation.\nError: ${error}`,
    };
  }
}

export type { FFmpegConfig, LocalConfig, AudioQualityConfig, MeditationDefaults } from './types.js';

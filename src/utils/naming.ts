/**
 * Output file naming utilities for mcp-ffmpeg
 */

import * as path from 'path';

export interface OutputNamingOptions {
  prefix?: string;
  timestamp?: boolean;
  version?: number;
  suffix?: string;
}

/**
 * Generate a timestamp string for filenames
 */
function generateTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}_${hour}-${minute}-${second}`;
}

/**
 * Generate output filename based on input and operation
 */
export function generateOutputFilename(
  inputPath: string,
  operation: string,
  extension?: string,
  options: OutputNamingOptions = {}
): string {
  const parsed = path.parse(inputPath);
  const ext = extension || parsed.ext;

  const parts: string[] = [];

  // Prefix
  if (options.prefix) {
    parts.push(options.prefix);
  }

  // Base name
  parts.push(parsed.name);

  // Operation
  parts.push(operation);

  // Timestamp (default: true)
  if (options.timestamp !== false) {
    parts.push(generateTimestamp());
  }

  // Version
  if (options.version !== undefined) {
    parts.push(`v${options.version}`);
  }

  // Suffix
  if (options.suffix) {
    parts.push(options.suffix);
  }

  return parts.join('_') + ext;
}

/**
 * Generate full output path
 */
export function generateOutputPath(
  inputPath: string,
  outputDir: string,
  operation: string,
  extension?: string,
  options: OutputNamingOptions = {}
): string {
  const filename = generateOutputFilename(inputPath, operation, extension, options);
  return path.join(outputDir, filename);
}

/**
 * Generate output path for meditation files
 * Example: meditation_selbstliebe_2024-02-04_16-45-30_v1.mp3
 */
export function generateMeditationOutputPath(
  name: string,
  outputDir: string,
  version: number = 1
): string {
  const timestamp = generateTimestamp();
  const filename = `meditation_${sanitizeFilename(name)}_${timestamp}_v${version}.mp3`;
  return path.join(outputDir, filename);
}

/**
 * Sanitize a string for use in filenames
 */
export function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[äÄ]/g, 'ae')
    .replace(/[öÖ]/g, 'oe')
    .replace(/[üÜ]/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 50);
}

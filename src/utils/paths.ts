/**
 * Path handling utilities for cross-platform FFmpeg operations
 */

import * as path from 'path';
import * as fs from 'fs';
import { FFmpegError, FFmpegErrorType } from '../errors/index.js';

/**
 * Normalize path for FFmpeg command line
 * FFmpeg on Windows accepts forward slashes and handles them better
 * than backslashes in filter expressions
 */
export function normalizeForFFmpeg(inputPath: string): string {
  // Resolve to absolute path first
  const absolute = path.resolve(inputPath);

  if (process.platform === 'win32') {
    // Replace backslashes with forward slashes for FFmpeg
    return absolute.replace(/\\/g, '/');
  }
  return absolute;
}

/**
 * Escape path for use in FFmpeg filter expressions
 * Special characters need escaping in filter syntax
 */
export function escapeForFilter(inputPath: string): string {
  const normalized = normalizeForFFmpeg(inputPath);
  // Escape characters that have special meaning in FFmpeg filters
  return normalized
    .replace(/'/g, "'\\''")
    .replace(/:/g, '\\:')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/;/g, '\\;');
}

/**
 * Validate that input file exists and is readable
 */
export async function validateInputFile(filePath: string): Promise<void> {
  const resolvedPath = path.resolve(filePath);

  if (!fs.existsSync(resolvedPath)) {
    throw new FFmpegError(
      FFmpegErrorType.FILE_NOT_FOUND,
      `Input file not found: ${filePath}`
    );
  }

  try {
    fs.accessSync(resolvedPath, fs.constants.R_OK);
  } catch {
    throw new FFmpegError(
      FFmpegErrorType.PERMISSION_DENIED,
      `Cannot read input file (permission denied): ${filePath}`
    );
  }
}

/**
 * Validate multiple input files
 */
export async function validateInputFiles(filePaths: string[]): Promise<void> {
  for (const filePath of filePaths) {
    await validateInputFile(filePath);
  }
}

/**
 * Ensure output directory exists, create if needed
 */
export async function ensureOutputDir(outputPath: string): Promise<void> {
  const dir = path.dirname(path.resolve(outputPath));

  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (error) {
    throw new FFmpegError(
      FFmpegErrorType.OUTPUT_DIR_ERROR,
      `Failed to create output directory: ${dir}`,
      String(error)
    );
  }
}

/**
 * Get file extension (including the dot)
 */
export function getExtension(filePath: string): string {
  return path.extname(filePath).toLowerCase();
}

/**
 * Get filename without extension
 */
export function getBasename(filePath: string): string {
  return path.basename(filePath, path.extname(filePath));
}

/**
 * Check if path is absolute
 */
export function isAbsolutePath(inputPath: string): boolean {
  return path.isAbsolute(inputPath);
}

/**
 * Resolve path relative to a base directory
 */
export function resolvePath(inputPath: string, baseDir?: string): string {
  if (path.isAbsolute(inputPath)) {
    return inputPath;
  }
  return path.resolve(baseDir || process.cwd(), inputPath);
}

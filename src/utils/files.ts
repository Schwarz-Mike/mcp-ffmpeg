/**
 * File management utilities for mcp-ffmpeg
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Create a temporary directory for intermediate files
 */
export function createTempDir(prefix: string = 'mcp-ffmpeg-'): string {
  const tempBase = os.tmpdir();
  const tempDir = fs.mkdtempSync(path.join(tempBase, prefix));
  return tempDir;
}

/**
 * Create a temporary file path (doesn't create the file)
 */
export function getTempFilePath(extension: string, prefix: string = 'mcp-ffmpeg-'): string {
  const tempDir = os.tmpdir();
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const filename = `${prefix}${timestamp}-${random}${extension}`;
  return path.join(tempDir, filename);
}

/**
 * Clean up a temporary file
 */
export function cleanupTempFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Clean up multiple temporary files
 */
export function cleanupTempFiles(filePaths: string[]): void {
  for (const filePath of filePaths) {
    cleanupTempFile(filePath);
  }
}

/**
 * Clean up a temporary directory and its contents
 */
export function cleanupTempDir(dirPath: string): void {
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Get file size in bytes
 */
export function getFileSize(filePath: string): number {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch {
    return 0;
  }
}

/**
 * Check if file exists
 */
export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

/**
 * Create a concat list file for FFmpeg concat demuxer
 */
export function createConcatListFile(inputPaths: string[]): string {
  const listPath = getTempFilePath('.txt', 'concat-list-');
  const content = inputPaths
    .map((p) => `file '${p.replace(/'/g, "'\\''")}'`)
    .join('\n');
  fs.writeFileSync(listPath, content, 'utf-8');
  return listPath;
}

/**
 * Read file contents as string
 */
export function readFileContent(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Write content to file
 */
export function writeFileContent(filePath: string, content: string): void {
  fs.writeFileSync(filePath, content, 'utf-8');
}

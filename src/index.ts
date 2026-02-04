#!/usr/bin/env node

/**
 * mcp-ffmpeg - MCP Server for professional audio processing with FFmpeg
 *
 * A Model Context Protocol server providing 13+ audio processing tools
 * for meditation production and general audio manipulation.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig, validateFFmpegInstallation } from './config/index.js';
import { LocalFFmpegExecutor } from './ffmpeg/local-executor.js';
import { RemoteFFmpegExecutor } from './ffmpeg/remote-executor.js';
import { registerAllTools } from './tools/index.js';
import type { FFmpegExecutor } from './ffmpeg/types.js';

async function main() {
  // Load configuration
  const config = await loadConfig();

  // Create executor based on mode
  let executor: FFmpegExecutor;

  if (config.mode === 'local') {
    if (!config.local) {
      console.error('Local mode requires local configuration');
      process.exit(1);
    }
    executor = new LocalFFmpegExecutor(config.local);
  } else {
    if (!config.remote) {
      console.error('Remote mode requires remote configuration');
      process.exit(1);
    }
    executor = new RemoteFFmpegExecutor(config.remote);
  }

  // Validate FFmpeg installation
  const validation = await validateFFmpegInstallation(config);
  if (!validation.valid) {
    console.error('FFmpeg validation failed:');
    console.error(validation.error);
    process.exit(1);
  }

  // Log FFmpeg version info (to stderr so it doesn't interfere with MCP)
  if (validation.ffmpegVersion) {
    console.error(`FFmpeg: ${validation.ffmpegVersion}`);
  }
  if (validation.ffprobeVersion) {
    console.error(`FFprobe: ${validation.ffprobeVersion}`);
  }

  // Create MCP server
  const server = new McpServer({
    name: 'mcp-ffmpeg',
    version: '1.0.0',
  });

  // Register all tools
  registerAllTools(server, executor, config);

  // Connect to stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('mcp-ffmpeg server started successfully');
  console.error(`Mode: ${config.mode}`);
  console.error(`Output directory: ${config.local?.outputDir || 'N/A'}`);
}

// Run the server
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

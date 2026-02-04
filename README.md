# mcp-ffmpeg

Professional audio processing MCP server for meditation production and general audio manipulation.

## Features

- **13 audio processing tools** accessible via Model Context Protocol
- **Meditation-optimized defaults** for voice processing
- **EBU R128 loudness normalization** with automatic dual-pass
- **Cross-platform support** (Windows, Mac, Linux)
- **FFmpeg auto-detection** from PATH and common install locations

## Installation

### Prerequisites

1. **Node.js 18+**
2. **FFmpeg** installed on your system:
   - Windows: `winget install Gyan.FFmpeg`
   - Mac: `brew install ffmpeg`
   - Linux: `sudo apt install ffmpeg`

### Setup

```bash
# Clone the repository
git clone https://github.com/Schwarz-Mike/mcp-ffmpeg.git
cd mcp-ffmpeg

# Install dependencies
npm install

# Build the project
npm run build
```

## Claude Desktop Configuration

Add the following to your Claude Desktop MCP configuration (`%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "mcp-ffmpeg": {
      "command": "node",
      "args": ["C:\\Users\\ich\\Dropbox\\mike\\MCP Servers\\mcp-ffmepg\\dist\\index.js"],
      "env": {}
    }
  }
}
```

Or if you have FFmpeg in a custom location, set environment variables:

```json
{
  "mcpServers": {
    "mcp-ffmpeg": {
      "command": "node",
      "args": ["C:\\Users\\ich\\Dropbox\\mike\\MCP Servers\\mcp-ffmepg\\dist\\index.js"],
      "env": {
        "MCP_FFMPEG_PATH": "C:\\path\\to\\ffmpeg.exe",
        "MCP_FFPROBE_PATH": "C:\\path\\to\\ffprobe.exe",
        "MCP_FFMPEG_OUTPUT_DIR": "C:\\path\\to\\output"
      }
    }
  }
}
```

## Available Tools

### Phase 1: Core Tools

| Tool | Description |
|------|-------------|
| `ffmpeg_get_audio_info` | Get detailed audio file information (duration, codec, bitrate, etc.) |
| `ffmpeg_convert_format` | Convert audio between formats (mp3, wav, flac, aac, ogg) |
| `ffmpeg_adjust_volume` | Adjust volume level (factor or dB) |
| `ffmpeg_generate_silence` | Generate silent audio for pauses |
| `ffmpeg_concat_audio` | Concatenate audio files with optional crossfade |

### Phase 2: Professional Audio Processing

| Tool | Description |
|------|-------------|
| `ffmpeg_compress_audio` | Apply dynamic range compression for consistent loudness |
| `ffmpeg_normalize_audio` | EBU R128 loudness normalization (automatic dual-pass) |
| `ffmpeg_adjust_tempo` | Change speed without pitch shift (0.9 = meditation pace) |
| `ffmpeg_apply_fade` | Apply fade-in and/or fade-out effects |

### Phase 3: Advanced Features

| Tool | Description |
|------|-------------|
| `ffmpeg_mix_audio` | Mix multiple tracks with volume, delay, and fades |
| `ffmpeg_loop_audio` | Loop audio to target duration with optional crossfade |

### Phase 4: Meditation Workflows

| Tool | Description |
|------|-------------|
| `ffmpeg_process_meditation_voice` | All-in-one voice processing (compress + normalize + tempo) |
| `ffmpeg_mix_meditation` | Complete meditation production (voice + music + sounds) |

## Usage Examples

### Basic Voice Compression

```
Use ffmpeg_compress_audio with inputPath "voice.mp3"
```

### Complete Meditation Production

```
1. Process the voice recording:
   Use ffmpeg_process_meditation_voice with inputPath "raw_voice.mp3", tempo 0.9

2. Mix with background music:
   Use ffmpeg_mix_meditation with:
   - voiceTrack: "voice_processed.mp3"
   - musicTrack: "ambient_music.mp3"
   - outputPath: "meditation_final.mp3"
   - intro: { duration: 20, fadeIn: 3 }
   - outro: { duration: 30, fadeOut: 3 }
```

## Configuration

The server loads configuration from these locations (in order):

1. `./mcp-ffmpeg-config.json` (project directory)
2. `~/.mcp-ffmpeg/config.json` (user home)
3. `%APPDATA%/mcp-ffmpeg/config.json` (Windows AppData)
4. Environment variables
5. Built-in defaults with FFmpeg auto-detection

### Configuration File

```json
{
  "mode": "local",
  "local": {
    "ffmpegPath": "ffmpeg",
    "ffprobePath": "ffprobe",
    "outputDir": "~/mcp-ffmpeg-output",
    "keepIntermediateFiles": false
  },
  "quality": {
    "format": "mp3",
    "codec": "libmp3lame",
    "bitrate": "192k",
    "sampleRate": 44100,
    "channels": 2
  },
  "meditation": {
    "compression": {
      "threshold": "-20dB",
      "ratio": 3,
      "attack": 200,
      "release": 800
    },
    "normalization": {
      "targetLoudness": -16,
      "truePeak": -1.5,
      "loudnessRange": 11
    },
    "tempo": 0.9,
    "musicVolume": 0.3,
    "soundsVolume": 0.2,
    "fadeInDuration": 3,
    "fadeOutDuration": 3,
    "finalBoost": 1.75
  }
}
```

## Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Watch mode during development
npm run watch
```

## License

GPL-3.0 - See [LICENSE](LICENSE) for details.

## Author

Schwarz-Mike

## Links

- [GitHub Repository](https://github.com/Schwarz-Mike/mcp-ffmpeg)
- [MCP Specification](https://modelcontextprotocol.io/)

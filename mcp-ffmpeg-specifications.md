# FFmpeg MCP Server - Programming Specifications

## Project Overview

**Project Name:** `mcp-ffmpeg`  
**Type:** Model Context Protocol (MCP) Server  
**Purpose:** Professional audio processing for meditation production and general audio manipulation  
**Target Use:** Local and remote execution (server-ready architecture)  
**Primary Client:** Claude Desktop / Claude Code  
**Language:** TypeScript/Node.js (consistent with elevenlabs MCP)

## Architecture Requirements

### Dual-Mode Operation

**Local Mode (Phase 1):**
- Direct FFmpeg binary execution on local machine
- File system access for input/output
- Default mode for development and personal use

**Remote Mode (Phase 2 - Future):**
- HTTP API client to remote FFmpeg service
- Upload/download audio files
- Same interface as local mode
- Fallback to local if remote unavailable

### Configuration

```typescript
interface FFmpegConfig {
  mode: 'local' | 'remote';
  local?: {
    ffmpegPath: string;  // Path to FFmpeg binary
    ffprobePath?: string; // Path to FFprobe binary
    outputDir: string;    // Default output directory
  };
  remote?: {
    apiUrl: string;       // Remote FFmpeg API endpoint
    apiKey?: string;      // Optional authentication
    timeout?: number;     // Request timeout in ms
  };
}
```

**Default Local Paths:**
- Windows: `C:\Users\ich\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.0.1-full_build\bin\ffmpeg.exe`
- Mac/Linux: Auto-detect from PATH

**Default Output Directory:**
- `C:\Users\ich\Dropbox\mike\MCP Servers\ffmpeg\output`

## Core Tools (MCP Functions)

### 1. Audio Compression & Dynamics

**Tool:** `ffmpeg_compress_audio`

**Purpose:** Apply professional audio compression to voice recordings for consistent loudness

**Parameters:**
```typescript
{
  inputPath: string;           // Input audio file path
  outputPath?: string;         // Output path (auto-generated if not provided)
  threshold?: string;          // Compression threshold (default: "-20dB")
  ratio?: number;             // Compression ratio (default: 3)
  attack?: number;            // Attack time in ms (default: 200)
  release?: number;           // Release time in ms (default: 800)
  makeupGain?: number;        // Post-compression gain in dB (default: 0)
}
```

**FFmpeg Filter:**
```
acompressor=threshold=-20dB:ratio=3:attack=200:release=800:makeup=0
```

**Use Case:** Meditation voice processing - ensures consistent volume throughout spoken parts

---

### 2. Audio Normalization

**Tool:** `ffmpeg_normalize_audio`

**Purpose:** Normalize audio to broadcast standards (EBU R128 loudnorm)

**Parameters:**
```typescript
{
  inputPath: string;
  outputPath?: string;
  targetLoudness?: number;    // LUFS target (default: -16)
  truePeak?: number;          // True peak in dBTP (default: -1.5)
  loudnessRange?: number;     // LRA in LU (default: 11)
  mode?: 'single' | 'dual';   // Single or dual-pass (default: 'dual')
}
```

**FFmpeg Filter (Dual-Pass):**
```
# Pass 1: Analyze
loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json

# Pass 2: Normalize with measured values
loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=X:measured_TP=Y:measured_LRA=Z:measured_thresh=W:offset=O
```

**Use Case:** Professional loudness normalization for final meditation output

---

### 3. Tempo/Speed Adjustment

**Tool:** `ffmpeg_adjust_tempo`

**Purpose:** Change playback speed without affecting pitch

**Parameters:**
```typescript
{
  inputPath: string;
  outputPath?: string;
  speed: number;              // Speed factor: 0.5-2.0 (default: 1.0)
                              // 0.5 = half speed, 2.0 = double speed
                              // 0.9 = meditation standard
}
```

**FFmpeg Filter:**
```
atempo=0.9
```

**Note:** For speed changes >2x or <0.5x, chain multiple atempo filters

**Use Case:** Slow down meditation voice to 0.9x for natural, calming pace

---

### 4. Volume Adjustment

**Tool:** `ffmpeg_adjust_volume`

**Purpose:** Adjust volume level of audio

**Parameters:**
```typescript
{
  inputPath: string;
  outputPath?: string;
  volume: number;             // Volume factor (default: 1.0)
                              // 0.3 = 30%, 1.75 = +75%
  volumeDb?: number;          // Alternative: volume in dB
}
```

**FFmpeg Filter:**
```
volume=1.75
# or
volume=5dB
```

**Use Case:** Final volume boost (+75% = 1.75) for meditation output

---

### 5. Fade Effects

**Tool:** `ffmpeg_apply_fade`

**Purpose:** Apply fade-in and/or fade-out effects

**Parameters:**
```typescript
{
  inputPath: string;
  outputPath?: string;
  fadeIn?: {
    duration: number;         // Fade-in duration in seconds
    startTime?: number;       // Start time in seconds (default: 0)
    curve?: string;           // Fade curve: tri|qsin|esin|hsin|log|ipar|qua|cub|squ|cbr|par|exp|iqsin|ihsin|dese|desi|losi|sinc|nofade
  };
  fadeOut?: {
    duration: number;         // Fade-out duration in seconds  
    startTime?: number;       // Start time (if not provided, calculated from duration)
    curve?: string;
  };
}
```

**FFmpeg Filter:**
```
afade=t=in:st=0:d=3,afade=t=out:st=END-3:d=3
```

**Use Case:** Smooth 3-second fade-in/out for background music

---

### 6. Audio Mixing

**Tool:** `ffmpeg_mix_audio`

**Purpose:** Mix multiple audio tracks with volume control and delays

**Parameters:**
```typescript
{
  inputs: Array<{
    path: string;             // Input file path
    volume?: number;          // Volume factor (default: 1.0)
    delay?: number;           // Delay in milliseconds (default: 0)
    fadeIn?: number;          // Fade-in duration in seconds
    fadeOut?: number;         // Fade-out duration in seconds
    loop?: boolean;           // Loop input to match longest track
  }>;
  outputPath: string;
  outputDuration?: 'longest' | 'shortest' | 'first';  // default: 'first'
  normalization?: boolean;    // Apply normalization after mix (default: false)
}
```

**FFmpeg Filter Complex Example:**
```
[0:a]volume=1.0[voice];
[1:a]afade=t=in:d=3,afade=t=out:st=END-3:d=3,volume=0.3[music];
[2:a]afade=t=in:d=3,afade=t=out:st=END-3:d=3,volume=0.2[sounds];
[voice][music][sounds]amix=inputs=3:duration=first[out]
```

**Use Case:** Mix voice + background music + sound effects for meditation

---

### 7. Silence/Pause Generation

**Tool:** `ffmpeg_generate_silence`

**Purpose:** Generate silent audio files for pauses

**Parameters:**
```typescript
{
  duration: number;           // Duration in seconds
  outputPath?: string;
  sampleRate?: number;        // Sample rate (default: 44100)
  channels?: number;          // Number of channels (default: 2)
}
```

**FFmpeg Command:**
```
ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo -t 5 -q:a 9 -acodec libmp3lame pause_5s.mp3
```

**Use Case:** Generate meditation pauses (5-15 seconds)

---

### 8. Audio Concatenation

**Tool:** `ffmpeg_concat_audio`

**Purpose:** Concatenate multiple audio files in sequence

**Parameters:**
```typescript
{
  inputs: string[];           // Array of input file paths in order
  outputPath: string;
  crossfade?: number;         // Optional crossfade duration in seconds
}
```

**Methods:**
1. **Concat demuxer** (same format/codec):
```
# Create concat list file
file 'teil1.mp3'
file 'pause_5s.mp3'
file 'teil2.mp3'

ffmpeg -f concat -safe 0 -i concat_list.txt -c copy output.mp3
```

2. **Concat filter** (re-encoding, allows crossfade):
```
[0:a][1:a][2:a]concat=n=3:v=0:a=1[out]
```

**Use Case:** Combine meditation voice parts with pauses

---

### 9. Audio Looping

**Tool:** `ffmpeg_loop_audio`

**Purpose:** Loop audio file to target duration

**Parameters:**
```typescript
{
  inputPath: string;
  outputPath?: string;
  targetDuration: number;     // Target duration in seconds
  fadeLoops?: boolean;        // Crossfade between loops (default: true)
  fadeDuration?: number;      // Crossfade duration in seconds (default: 2)
}
```

**FFmpeg Methods:**

**Method 1: Stream Loop (no re-encoding):**
```
ffmpeg -stream_loop 5 -i input.mp3 -c copy output.mp3
```

**Method 2: Filter Loop with Crossfade:**
```
# Calculate loops needed
aloop=loop=-1:size=SAMPLES,atrim=duration=TARGET_DURATION
```

**Use Case:** Loop 60-second background music to full meditation duration

---

### 10. Audio Information/Probe

**Tool:** `ffmpeg_get_audio_info`

**Purpose:** Get detailed audio file information (duration, sample rate, codec, etc.)

**Parameters:**
```typescript
{
  filePath: string;
}
```

**Uses:** FFprobe

**Returns:**
```typescript
{
  duration: number;           // Duration in seconds
  sampleRate: number;         // Sample rate in Hz
  channels: number;           // Number of audio channels
  codec: string;              // Audio codec name
  bitrate: number;            // Bitrate in kbps
  format: string;             // Container format
  size: number;               // File size in bytes
}
```

**Use Case:** Verify audio properties before processing, calculate loop counts

---

### 11. Format Conversion

**Tool:** `ffmpeg_convert_format`

**Purpose:** Convert audio between formats

**Parameters:**
```typescript
{
  inputPath: string;
  outputPath: string;
  outputFormat: 'mp3' | 'wav' | 'flac' | 'aac' | 'ogg';
  quality?: number;           // Quality/bitrate (format-specific)
  sampleRate?: number;        // Resample to specific rate
  channels?: number;          // Convert to mono/stereo
}
```

**Quality Defaults:**
- MP3: 192kbps (quality: 2)
- WAV: lossless
- FLAC: lossless
- AAC: 192kbps
- OGG: quality 6

**Use Case:** Convert to standard MP3 192kbps for meditation output

---

### 12. Combined Voice Processing Pipeline

**Tool:** `ffmpeg_process_meditation_voice`

**Purpose:** All-in-one voice processing for meditation (compression + normalization + tempo)

**Parameters:**
```typescript
{
  inputPath: string;
  outputPath?: string;
  compression?: {
    threshold?: string;
    ratio?: number;
    attack?: number;
    release?: number;
  };
  normalization?: {
    targetLoudness?: number;
    truePeak?: number;
  };
  tempo?: number;             // Speed adjustment (default: 0.9)
}
```

**FFmpeg Filter Chain:**
```
acompressor=threshold=-20dB:ratio=3:attack=200:release=800,
loudnorm=I=-16:TP=-1.5:LRA=11,
atempo=0.9
```

**Use Case:** One-step voice processing for meditation production

---

### 13. Complete Meditation Mix

**Tool:** `ffmpeg_mix_meditation`

**Purpose:** Complete meditation production in one step

**Parameters:**
```typescript
{
  voiceTrack: string;         // Processed voice track path
  musicTrack?: string;        // Background music path
  soundEffects?: string;      // Sound effects path
  outputPath: string;
  
  intro: {
    duration: number;         // Intro music duration in seconds
    fadeIn: number;          // Fade-in duration (default: 3)
  };
  
  outro: {
    duration: number;         // Outro music duration in seconds
    fadeOut: number;         // Fade-out duration (default: 3)
  };
  
  volumes: {
    voice?: number;          // Voice volume (default: 1.0)
    music?: number;          // Music volume (default: 0.3)
    sounds?: number;         // Sound effects volume (default: 0.2)
  };
  
  finalBoost?: number;       // Final volume boost (default: 1.75)
}
```

**Processing Steps:**
1. Loop music to full duration
2. Loop sound effects to full duration (if present)
3. Apply fades to music (in at start, out at end)
4. Apply fades to sounds (in at start, out at end)
5. Delay voice by intro duration
6. Mix all tracks with specified volumes
7. Apply final volume boost

**Use Case:** Complete meditation production workflow

---

## Error Handling

### Error Types
```typescript
enum FFmpegErrorType {
  FILE_NOT_FOUND = 'file_not_found',
  INVALID_INPUT = 'invalid_input',
  INVALID_PARAMETERS = 'invalid_parameters',
  FFMPEG_NOT_FOUND = 'ffmpeg_not_found',
  PROCESSING_ERROR = 'processing_error',
  REMOTE_API_ERROR = 'remote_api_error',
  TIMEOUT = 'timeout',
}

interface FFmpegError {
  type: FFmpegErrorType;
  message: string;
  details?: string;
  ffmpegOutput?: string;      // Actual FFmpeg stderr output
}
```

### Error Handling Strategy
- Validate all input files exist before processing
- Check FFmpeg binary availability at startup
- Capture and parse FFmpeg stderr for meaningful errors
- Provide helpful error messages with suggestions
- Clean up temporary files on error
- Retry logic for remote API calls

---

## Audio Quality Standards

### Default Output Settings
```typescript
const AUDIO_QUALITY = {
  format: 'mp3',
  codec: 'libmp3lame',
  bitrate: '192k',
  sampleRate: 44100,
  channels: 2,
  quality: 2,                 // MP3 VBR quality (0-9, 2 = high quality)
};
```

### Meditation-Specific Settings
```typescript
const MEDITATION_DEFAULTS = {
  compression: {
    threshold: '-20dB',
    ratio: 3,
    attack: 200,
    release: 800,
  },
  normalization: {
    targetLoudness: -16,      // LUFS
    truePeak: -1.5,           // dBTP
    loudnessRange: 11,        // LU
  },
  tempo: 0.9,                 // Slightly slower for meditation
  musicVolume: 0.3,           // 30% volume
  soundsVolume: 0.2,          // 20% volume
  fadeInDuration: 3,          // seconds
  fadeOutDuration: 3,         // seconds
  finalBoost: 1.75,           // +75% final volume
};
```

---

## File Management

### Output File Naming
```typescript
interface OutputNaming {
  prefix?: string;            // Optional prefix (e.g., "meditation_")
  timestamp?: boolean;        // Add timestamp (default: true)
  version?: number;           // Version number (e.g., _v1, _v2)
  suffix?: string;            // Custom suffix
}

// Example outputs:
// meditation_selbstliebe_2024-02-04_16-45-30_v1.mp3
// voice_compressed_v2.mp3
// FINAL_Meditation_Selbstliebe_LOUDER.mp3
```

### Temporary File Management
- Create temp directory for intermediate files
- Auto-cleanup after successful processing
- Option to keep intermediate files for debugging
- Temp directory: `{outputDir}/temp`

---

## Remote API Specification (Future)

### API Endpoints

**POST /api/v1/process**
```typescript
{
  tool: string;               // Tool name (e.g., "compress_audio")
  parameters: object;         // Tool-specific parameters
  inputFiles: Array<{
    name: string;
    data: string;             // Base64 encoded or URL
  }>;
}

Response: {
  jobId: string;              // Job ID for polling
  status: 'queued' | 'processing';
}
```

**GET /api/v1/job/:jobId**
```typescript
Response: {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;          // 0-100
  result?: {
    outputUrl: string;        // Download URL
    metadata: object;         // Processing metadata
  };
  error?: string;
}
```

**GET /api/v1/download/:fileId**
- Returns processed audio file

### Authentication
- API Key in header: `X-API-Key: xxx`
- Rate limiting per API key
- File size limits

---

## Testing Requirements

### Unit Tests
- Test each tool with valid inputs
- Test error conditions (missing files, invalid parameters)
- Test edge cases (0 duration, extreme values)

### Integration Tests
- Test complete meditation workflow
- Test local vs remote mode switching
- Test file cleanup

### Sample Test Files
Include test audio files:
- `test_voice.mp3` - 10s voice recording
- `test_music.mp3` - 30s music loop
- `test_sound.mp3` - 15s nature sounds

---

## Dependencies

### Required
- `@modelcontextprotocol/sdk` - MCP SDK
- `fluent-ffmpeg` - FFmpeg Node.js wrapper (or direct process spawning)
- `node-fetch` - For remote API calls (if needed)

### Optional
- `@ffmpeg-installer/ffmpeg` - Auto-install FFmpeg binary
- `@ffprobe-installer/ffprobe` - Auto-install FFprobe binary

---

## Configuration File

**`mcp-ffmpeg-config.json`**
```json
{
  "mode": "local",
  "local": {
    "ffmpegPath": "C:\\Users\\ich\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.0.1-full_build\\bin\\ffmpeg.exe",
    "ffprobePath": "C:\\Users\\ich\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.0.1-full_build\\bin\\ffprobe.exe",
    "outputDir": "C:\\Users\\ich\\Dropbox\\mike\\MCP Servers\\ffmpeg\\output",
    "keepIntermediateFiles": false
  },
  "remote": {
    "apiUrl": "https://api.example.com/ffmpeg",
    "apiKey": "your-api-key",
    "timeout": 300000
  },
  "quality": {
    "format": "mp3",
    "bitrate": "192k",
    "sampleRate": 44100
  }
}
```

---

## Development Phases

### Phase 1: Core Local Tools
1. Audio information/probe
2. Format conversion
3. Volume adjustment
4. Silence generation
5. Basic concatenation

### Phase 2: Professional Audio Processing
6. Compression
7. Normalization
8. Tempo adjustment
9. Fade effects

### Phase 3: Advanced Features
10. Audio mixing
11. Audio looping with crossfade
12. Combined processing pipelines

### Phase 4: Meditation Workflows
13. Voice processing pipeline
14. Complete meditation mix

### Phase 5: Remote Support
15. Remote API client
16. Mode switching
17. File upload/download

---

## Success Criteria

### Functional Requirements
- ✅ All 13+ tools working in local mode
- ✅ Meditation production workflow functional
- ✅ Error handling and validation
- ✅ Auto-generated output filenames
- ✅ Temp file cleanup

### Quality Requirements
- ✅ Professional audio quality (192kbps MP3)
- ✅ EBU R128 loudness compliance
- ✅ Smooth fades and transitions
- ✅ No audio artifacts or clipping

### Performance Requirements
- ✅ Process 10-minute meditation in <2 minutes
- ✅ Responsive error messages
- ✅ Progress reporting for long operations

---

## Example Usage (MCP Client)

### Simple Voice Compression
```typescript
await mcp.call('ffmpeg_compress_audio', {
  inputPath: 'voice.mp3',
  outputPath: 'voice_compressed.mp3',
});
```

### Complete Meditation Production
```typescript
// Step 1: Process voice
await mcp.call('ffmpeg_process_meditation_voice', {
  inputPath: 'voice_raw.mp3',
  outputPath: 'voice_processed.mp3',
});

// Step 2: Mix everything
await mcp.call('ffmpeg_mix_meditation', {
  voiceTrack: 'voice_processed.mp3',
  musicTrack: 'music_60s.mp3',
  soundEffects: 'rain_30s.mp3',
  outputPath: 'meditation_final.mp3',
  intro: { duration: 20, fadeIn: 3 },
  outro: { duration: 30, fadeOut: 3 },
  volumes: { voice: 1.0, music: 0.3, sounds: 0.2 },
  finalBoost: 1.75,
});
```

---

## Documentation Requirements

### README.md
- Installation instructions
- Quick start guide
- Configuration examples
- Tool reference

### API Documentation
- Each tool with parameters
- Code examples
- Error codes
- Best practices

### Migration Guide
- From Python scripts to MCP
- Configuration setup
- Workflow examples

---

## Notes for Claude Code

**Implementation Priorities:**
1. Start with core audio processing tools (compress, normalize, tempo, volume, fade)
2. Implement file management and error handling early
3. Build meditation-specific workflows on top of core tools
4. Keep remote API support as separate module for future

**Code Structure:**
```
mcp-ffmpeg/
├── src/
│   ├── tools/
│   │   ├── compress.ts
│   │   ├── normalize.ts
│   │   ├── tempo.ts
│   │   ├── volume.ts
│   │   ├── fade.ts
│   │   ├── mix.ts
│   │   ├── loop.ts
│   │   ├── concat.ts
│   │   ├── silence.ts
│   │   ├── probe.ts
│   │   ├── convert.ts
│   │   └── meditation.ts (workflow tools)
│   ├── ffmpeg/
│   │   ├── local.ts (local FFmpeg execution)
│   │   └── remote.ts (future API client)
│   ├── utils/
│   │   ├── validation.ts
│   │   ├── files.ts
│   │   └── errors.ts
│   ├── config.ts
│   └── index.ts (MCP server setup)
├── tests/
├── examples/
└── docs/
```

**Similar to elevenlabs MCP:**
- TypeScript project structure
- MCP SDK integration
- Configuration management
- Error handling patterns
- Tool parameter validation

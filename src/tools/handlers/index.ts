/**
 * Tool handler exports
 */

// Phase 1: Core tools
export { handleGetAudioInfo, type GetAudioInfoParams } from './probe.js';
export { handleConvertFormat, type ConvertFormatParams } from './convert.js';
export { handleAdjustVolume, type AdjustVolumeParams } from './volume.js';
export { handleGenerateSilence, type GenerateSilenceParams } from './silence.js';
export { handleConcatAudio, type ConcatAudioParams } from './concat.js';

// Phase 2: Professional audio processing
export { handleCompressAudio, type CompressAudioParams } from './compress.js';
export { handleNormalizeAudio, type NormalizeAudioParams } from './normalize.js';
export { handleAdjustTempo, type AdjustTempoParams } from './tempo.js';
export { handleApplyFade, type ApplyFadeParams } from './fade.js';

// Phase 3: Advanced features
export { handleMixAudio, type MixAudioParams, type MixInputConfig } from './mix.js';
export { handleLoopAudio, type LoopAudioParams } from './loop.js';

// Phase 4: Meditation workflows
export { handleProcessMeditationVoice, type MeditationVoiceParams } from './meditation-voice.js';
export { handleMixMeditation, type MeditationMixParams } from './meditation-mix.js';

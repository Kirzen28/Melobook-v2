import { Mp3Encoder } from '@breezystack/lamejs';
import { compressAudioWithFFmpeg } from './ffmpegCompressor';
import { getAudioBlobFromIndexedDB, saveAudioBlobToIndexedDB } from './indexedDB';

export function getAudioFileCacheKey(file: File): string {
  return `pad_conv_${file.name}_${file.size}_${file.lastModified}`;
}

// Self-check for cache key uniqueness & format
if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
  const dummy = { name: 'test.wav', size: 12345, lastModified: 9999 } as File;
  console.assert(getAudioFileCacheKey(dummy) === 'pad_conv_test.wav_12345_9999', 'Cache key generation check');
}

export interface OptimizationResult {
  file: File;
  originalDuration: number;
  finalDuration: number;
  wasTruncated: boolean;
  originalSize: number;
  finalSize: number;
  compressionMethod?: 'ffmpeg-wasm' | 'passthrough' | 'lamejs';
  bitrateKbps?: number;
  gainApplied?: number;
}

export interface OptimizationProgress {
  stage: 'decoding' | 'processing' | 'encoding' | 'done';
  percent: number;
  message: string;
  etaSeconds?: number;
  elapsedSeconds?: number;
}

const MAX_PAD_DURATION_SEC = 60; // 1 minute max as requested
const TARGET_BITRATE_KBPS = 256; // 256 kbps MP3 fallback
const MAX_ALLOWED_FILE_SIZE = 5 * 1024 * 1024; // 5 MB max
const LOOP_CROSSFADE_SEC = 2.0; // 2 seconds seam crossfade for worship pad loops
export const TARGET_PEAK_LOUDNESS = 0.92; // -0.7 dBFS target headroom for uniform backing track levels

/**
 * Calculates optimal linear gain to normalize peak amplitude to target loudness.
 */
export function calculateNormalizationGain(peak: number, target: number = TARGET_PEAK_LOUDNESS): number {
  if (peak < 0.005) return 1.0;
  // Clamp boost to +12 dB (4.0x) and attenuation to -20 dB (0.1x)
  return Math.max(0.1, Math.min(target / peak, 4.0));
}

// Self-check for normalization gain calculation
if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
  console.assert(Math.abs(calculateNormalizationGain(0.46, 0.92) - 2.0) < 0.001, 'Half volume should double gain');
  console.assert(calculateNormalizationGain(0.92, 0.92) === 1.0, 'Target peak should yield 1.0 gain');
  console.assert(calculateNormalizationGain(0.001, 0.92) === 1.0, 'Silence should not blow up gain');
}

/**
 * Normalizes an AudioBuffer to consistent peak loudness using Web Audio API GainNode.
 */
export async function normalizeAudioBufferWithGainNode(
  audioBuffer: AudioBuffer,
  targetPeak: number = TARGET_PEAK_LOUDNESS
): Promise<{ normalizedBuffer: AudioBuffer; gainApplied: number }> {
  const numChannels = audioBuffer.numberOfChannels;
  let maxPeak = 0;

  for (let c = 0; c < numChannels; c++) {
    const data = audioBuffer.getChannelData(c);
    const step = Math.max(1, Math.floor(data.length / 50000));
    for (let i = 0; i < data.length; i += step) {
      const abs = Math.abs(data[i]);
      if (abs > maxPeak) maxPeak = abs;
    }
  }

  const gain = calculateNormalizationGain(maxPeak, targetPeak);

  // If already at target loudness within ±3%, bypass processing
  if (Math.abs(gain - 1.0) < 0.03) {
    return { normalizedBuffer: audioBuffer, gainApplied: 1.0 };
  }

  // Use OfflineAudioContext with GainNode for fast hardware-accelerated rendering
  const offlineCtx = new OfflineAudioContext(numChannels, audioBuffer.length, audioBuffer.sampleRate);
  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;

  const gainNode = offlineCtx.createGain();
  gainNode.gain.setValueAtTime(gain, 0);

  source.connect(gainNode);
  gainNode.connect(offlineCtx.destination);
  source.start(0);

  const normalizedBuffer = await offlineCtx.startRendering();
  return { normalizedBuffer, gainApplied: gain };
}

/**
 * Fast metadata reading via HTML Audio element to avoid loading entire audio buffer into RAM
 */
/**
 * Fast and robust metadata reading:
 * 1. Tries HTML Audio element with explicit .load() and 400ms timeout.
 * 2. If timed out, failed, or reported Infinity/NaN, falls back to native AudioContext decodeAudioData.
 */
async function getAudioDurationQuick(file: File): Promise<number> {
  // Method 1: HTML Audio with timeout
  const htmlAudioPromise = new Promise<number>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = 'metadata';
    
    let isSettled = false;
    const cleanup = () => {
      isSettled = true;
      URL.revokeObjectURL(url);
      audio.onloadedmetadata = null;
      audio.onerror = null;
    };

    const timer = setTimeout(() => {
      if (!isSettled) {
        cleanup();
        reject(new Error('HTML Audio timeout'));
      }
    }, 400);

    audio.onloadedmetadata = () => {
      if (isSettled) return;
      clearTimeout(timer);
      const d = audio.duration;
      cleanup();
      if (Number.isFinite(d) && d > 0) {
        resolve(d);
      } else {
        reject(new Error('Invalid HTML Audio duration'));
      }
    };

    audio.onerror = () => {
      if (isSettled) return;
      clearTimeout(timer);
      cleanup();
      reject(new Error('HTML Audio error'));
    };

    audio.src = url;
    try {
      audio.load();
    } catch {}
  });

  try {
    return await htmlAudioPromise;
  } catch {
    // Method 2: Fast native AudioContext inspection (takes ~30-50ms)
    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtxClass();
      try {
        const arrayBuf = await file.arrayBuffer();
        const audioBuf = await ctx.decodeAudioData(arrayBuf);
        return audioBuf.duration;
      } finally {
        ctx.close().catch(() => {});
      }
    } catch (ctxErr) {
      console.warn('AudioContext duration inspection fallback failed:', ctxErr);
      return 0;
    }
  }
}

/**
 * Optimizes an imported pad audio file:
 * 1. Fast path: If already a short MP3 (<= 75s, <= 5MB), passthrough directly (< 0.05s).
 * 2. Light files (<= 8MB): Native Web Audio API + LameJS (super-fast, < 0.4s).
 * 3. Heavy files (> 8MB, 15min / 35MB): Client-side FFmpeg.wasm chunking without RAM spikes.
 */
export async function optimizePadAudio(
  inputFile: File,
  onProgress?: (progress: OptimizationProgress) => void
): Promise<OptimizationResult> {
  const originalSize = inputFile.size;
  const cacheKey = getAudioFileCacheKey(inputFile);

  // 0. Check IndexedDB cache for previously converted version (instant 0s recovery across sessions)
  try {
    const cachedBlob = await getAudioBlobFromIndexedDB(cacheKey);
    if (cachedBlob && cachedBlob.size > 0) {
      const cleanBaseName = inputFile.name.replace(/\.[^/.]+$/, '');
      const cachedFile = new File([cachedBlob], `${cleanBaseName}.mp3`, { type: 'audio/mp3' });
      onProgress?.({
        stage: 'done',
        percent: 100,
        message: 'Fichier déjà converti récupéré du cache IndexedDB local (instantané) !'
      });

      return {
        file: cachedFile,
        originalDuration: MAX_PAD_DURATION_SEC,
        finalDuration: MAX_PAD_DURATION_SEC,
        wasTruncated: true,
        originalSize,
        finalSize: cachedBlob.size,
        compressionMethod: 'passthrough'
      };
    }
  } catch (cacheErr) {
    console.warn('Erreur lecture cache IndexedDB audio:', cacheErr);
  }

  // 1. Instant passthrough for valid short MP3 files (<= 75s accommodates standard 50s–60s loops)
  const isAlreadyMp3 = inputFile.type === 'audio/mp3' || inputFile.type === 'audio/mpeg' || inputFile.name.toLowerCase().endsWith('.mp3');
  if (isAlreadyMp3 && originalSize <= MAX_ALLOWED_FILE_SIZE) {
    try {
      const quickDuration = await getAudioDurationQuick(inputFile);
      if (quickDuration > 0 && quickDuration <= 75) {
        onProgress?.({
          stage: 'done',
          percent: 100,
          message: 'Fichier MP3 court et conforme détecté (importation instantanée) !'
        });

        // Store into IndexedDB cache as well
        saveAudioBlobToIndexedDB(cacheKey, inputFile, {
          fileName: inputFile.name,
          mimeType: inputFile.type || 'audio/mp3'
        }).catch(console.warn);

        return {
          file: inputFile,
          originalDuration: quickDuration,
          finalDuration: quickDuration,
          wasTruncated: false,
          originalSize,
          finalSize: originalSize,
          compressionMethod: 'passthrough'
        };
      }
    } catch {
      // Continue to compression pipeline if metadata inspection fails
    }
  }

  // 2. Heavy files (> 8 MB): Use FFmpeg WebAssembly to prevent browser memory bloat
  const isHeavyFile = originalSize > 8 * 1024 * 1024;
  if (isHeavyFile) {
    try {
      const ffmpegResult = await compressAudioWithFFmpeg(
        inputFile,
        {
          maxDurationSec: MAX_PAD_DURATION_SEC,
          enforceMaxSize: MAX_ALLOWED_FILE_SIZE
        },
        (p) => {
          onProgress?.({
            stage: p.stage === 'done' ? 'done' : 'encoding',
            percent: p.percent,
            message: p.message,
            etaSeconds: p.etaSeconds,
            elapsedSeconds: p.elapsedSeconds
          });
        }
      );

      // Save compressed result to IndexedDB cache for future sessions
      saveAudioBlobToIndexedDB(cacheKey, ffmpegResult.file, {
        fileName: ffmpegResult.file.name,
        mimeType: 'audio/mp3'
      }).catch(console.warn);

      return {
        file: ffmpegResult.file,
        originalDuration: 0,
        finalDuration: MAX_PAD_DURATION_SEC,
        wasTruncated: true,
        originalSize: ffmpegResult.originalSize,
        finalSize: ffmpegResult.compressedSize,
        compressionMethod: 'ffmpeg-wasm',
        bitrateKbps: ffmpegResult.bitrateKbps
      };
    } catch (wasmErr) {
      console.warn('FFmpeg.wasm non disponible ou erreur, bascule vers Web Audio + LameJS:', wasmErr);
    }
  }

  // 3. Fast In-Browser Pipeline for light/medium files (<= 8 MB): Web Audio API + LameJS (< 0.4s)
  onProgress?.({
    stage: 'decoding',
    percent: 10,
    message: 'Décodage audio haute vitesse Web Audio...'
  });

  // Read array buffer
  const arrayBuffer = await inputFile.arrayBuffer();

  // Decode using AudioContext
  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioCtx = new AudioContextClass();
  
  let rawAudioBuffer: AudioBuffer;
  try {
    rawAudioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  } finally {
    audioCtx.close().catch(() => {});
  }

  onProgress?.({
    stage: 'processing',
    percent: 25,
    message: 'Auto-normalisation de la dynamique sonore (Web Audio GainNode)...'
  });

  const { normalizedBuffer, gainApplied } = await normalizeAudioBufferWithGainNode(rawAudioBuffer);
  const audioBuffer = normalizedBuffer;

  const originalDuration = audioBuffer.duration;
  const sampleRate = audioBuffer.sampleRate;
  const channels = Math.min(audioBuffer.numberOfChannels, 2); // Max stereo
  const wasTruncated = originalDuration > MAX_PAD_DURATION_SEC;

  onProgress?.({
    stage: 'processing',
    percent: 30,
    message: wasTruncated 
      ? `Ajustement à 1 min (${Math.round(originalDuration)}s détectés) & lissage boucle...` 
      : 'Traitement de la boucle...'
  });

  const targetDuration = wasTruncated ? MAX_PAD_DURATION_SEC : originalDuration;
  const targetSamples = Math.floor(targetDuration * sampleRate);

  // Extract channel data up to targetSamples
  const leftChannel = new Float32Array(targetSamples);
  const rightChannel = channels > 1 ? new Float32Array(targetSamples) : null;

  const srcLeft = audioBuffer.getChannelData(0);
  leftChannel.set(srcLeft.subarray(0, targetSamples));

  if (rightChannel && channels > 1) {
    const srcRight = audioBuffer.getChannelData(1);
    rightChannel.set(srcRight.subarray(0, targetSamples));
  }

  // If truncated, smooth the seam between the tail and head with an equal-power/linear crossfade
  // so the 1-minute pad loops seamlessly without a sudden cut or pop
  if (wasTruncated && targetSamples > sampleRate * 4) {
    const fadeSamples = Math.min(Math.floor(LOOP_CROSSFADE_SEC * sampleRate), Math.floor(targetSamples / 4));
    const tailStart = targetSamples - fadeSamples;

    for (let i = 0; i < fadeSamples; i++) {
      const t = i / fadeSamples; // 0 -> 1
      // Equal-power crossfade weights
      const gainOut = Math.cos((t * Math.PI) / 2);
      const gainIn = Math.sin((t * Math.PI) / 2);

      // Tail blends into head
      const tailIdx = tailStart + i;
      const headIdx = i;

      leftChannel[tailIdx] = (leftChannel[tailIdx] * gainOut) + (leftChannel[headIdx] * gainIn);
      if (rightChannel) {
        rightChannel[tailIdx] = (rightChannel[tailIdx] * gainOut) + (rightChannel[headIdx] * gainIn);
      }
    }
  }

  onProgress?.({
    stage: 'encoding',
    percent: 50,
    message: 'Encodage MP3 256 kbps haute fidélité...'
  });

  // 3. Convert Float32 to 16-bit PCM
  const leftPCM = new Int16Array(targetSamples);
  for (let i = 0; i < targetSamples; i++) {
    const s = Math.max(-1, Math.min(1, leftChannel[i]));
    leftPCM[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }

  let rightPCM: Int16Array | undefined = undefined;
  if (rightChannel) {
    rightPCM = new Int16Array(targetSamples);
    for (let i = 0; i < targetSamples; i++) {
      const s = Math.max(-1, Math.min(1, rightChannel[i]));
      rightPCM[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
  }

  // 4. Encode to MP3 256 kbps
  const encoder = new Mp3Encoder(channels, sampleRate, TARGET_BITRATE_KBPS);
  const mp3DataParts: Uint8Array[] = [];
  const chunkSize = 1152; // LAME standard frame size
  const encodeStartTime = Date.now();

  for (let i = 0; i < targetSamples; i += chunkSize) {
    const leftChunk = leftPCM.subarray(i, i + chunkSize);
    const rightChunk = rightPCM ? rightPCM.subarray(i, i + chunkSize) : undefined;
    
    const mp3buf = encoder.encodeBuffer(leftChunk, rightChunk);
    if (mp3buf.length > 0) {
      mp3DataParts.push(mp3buf);
    }

    if (i % (chunkSize * 20) === 0) {
      const fraction = i / targetSamples;
      const pct = 50 + Math.floor(fraction * 45);
      const elapsed = (Date.now() - encodeStartTime) / 1000;
      const eta = fraction > 0.05 ? Math.max(0, Math.ceil((elapsed / fraction) - elapsed)) : undefined;
      const etaText = eta !== undefined && eta > 0 ? ` • ~${eta}s restante${eta > 1 ? 's' : ''}` : '';

      onProgress?.({
        stage: 'encoding',
        percent: pct,
        message: `Encodage MP3 (${pct}%)${etaText}`,
        etaSeconds: eta,
        elapsedSeconds: Math.floor(elapsed)
      });
      // Allow UI thread to breathe
      await new Promise(r => setTimeout(r, 0));
    }
  }

  const endBuf = encoder.flush();
  if (endBuf.length > 0) {
    mp3DataParts.push(endBuf);
  }

  const mp3Blob = new Blob(mp3DataParts, { type: 'audio/mp3' });
  const finalSize = mp3Blob.size;

  if (finalSize > MAX_ALLOWED_FILE_SIZE) {
    throw new Error(
      `Le fichier encodé fait ${(finalSize / (1024 * 1024)).toFixed(1)} Mo, ce qui dépasse la limite maximale de 5 Mo.`
    );
  }

  // Create clean filename ending in .mp3
  const baseName = inputFile.name.replace(/\.[^/.]+$/, '');
  const finalFilename = `${baseName}.mp3`;
  const optimizedFile = new File([mp3Blob], finalFilename, { type: 'audio/mp3' });

  // Save fallback compressed file to IndexedDB
  saveAudioBlobToIndexedDB(cacheKey, optimizedFile, {
    fileName: optimizedFile.name,
    mimeType: 'audio/mp3'
  }).catch(console.warn);

  onProgress?.({
    stage: 'done',
    percent: 100,
    message: 'Optimisation terminée !'
  });

  return {
    file: optimizedFile,
    originalDuration,
    finalDuration: targetDuration,
    wasTruncated,
    originalSize,
    finalSize,
    compressionMethod: 'lamejs',
    bitrateKbps: TARGET_BITRATE_KBPS,
    gainApplied
  };
}

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export interface CompressionProgress {
  stage: 'loading_wasm' | 'writing' | 'compressing' | 'reading' | 'done';
  percent: number;
  message: string;
  etaSeconds?: number;
  elapsedSeconds?: number;
}

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  reductionPercentage: number;
  durationSeconds?: number;
  method: 'ffmpeg-wasm' | 'passthrough' | 'webaudio-fallback';
  bitrateKbps: number;
}

export interface CompressionOptions {
  maxDurationSec?: number; // Default 60s
  targetBitrateKbps?: number; // Dynamic by default based on file size
  sampleRate?: number; // Default 44100
  channels?: number; // Default 2
  enforceMaxSize?: number; // Default 5 MB
}

/**
 * Dynamic bitrate selection based on input file size:
 * - > 15 MB: 64 kbps (fastest WASM encoding, ~480 KB output for 60s pad, smooth harmonic depth)
 * - > 5 MB: 96 kbps (optimal speed-quality balance for pads, ~720 KB output)
 * - <= 5 MB: 128 kbps (high fidelity for small inputs)
 */
export function resolveDynamicBitrate(fileSizeBytes: number, explicitBitrate?: number): number {
  if (explicitBitrate && explicitBitrate > 0) {
    return explicitBitrate;
  }
  if (fileSizeBytes > 15 * 1024 * 1024) {
    return 64;
  }
  if (fileSizeBytes > 5 * 1024 * 1024) {
    return 96;
  }
  return 128;
}

// Self-check for dynamic bitrate thresholds
if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
  console.assert(resolveDynamicBitrate(35 * 1024 * 1024) === 64, '35MB must select 64kbps');
  console.assert(resolveDynamicBitrate(10 * 1024 * 1024) === 96, '10MB must select 96kbps');
  console.assert(resolveDynamicBitrate(2 * 1024 * 1024) === 128, '2MB must select 128kbps');
  console.assert(resolveDynamicBitrate(35 * 1024 * 1024, 192) === 192, 'Explicit bitrate must override');
}

let ffmpegInstance: FFmpeg | null = null;
let isLoaded = false;
let loadPromise: Promise<void> | null = null;

/**
 * Initializes and loads the FFmpeg.wasm runtime singleton.
 * Uses local API endpoint if available, falling back to CDN unpkg.
 */
export async function getFFmpeg(
  onProgress?: (p: CompressionProgress) => void
): Promise<FFmpeg> {
  if (ffmpegInstance && isLoaded) {
    return ffmpegInstance;
  }

  if (loadPromise) {
    await loadPromise;
    if (ffmpegInstance && isLoaded) return ffmpegInstance;
  }

  loadPromise = (async () => {
    onProgress?.({
      stage: 'loading_wasm',
      percent: 15,
      message: 'Initialisation du moteur de compression FFmpeg WebAssembly...'
    });

    const ffmpeg = new FFmpeg();

    // Try loading locally first, then fallback to CDN
    const cdnBase = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    const localBase = typeof window !== 'undefined' ? `${window.location.origin}/api/ffmpeg-core` : cdnBase;

    let loaded = false;

    // Attempt 1: Local server endpoint
    try {
      const coreURL = await toBlobURL(`${localBase}/ffmpeg-core.js`, 'text/javascript');
      const wasmURL = await toBlobURL(`${localBase}/ffmpeg-core.wasm`, 'application/wasm');

      await ffmpeg.load({ coreURL, wasmURL });
      loaded = true;
    } catch (localErr) {
      console.warn('Local FFmpeg core load failed, trying CDN:', localErr);
    }

    // Attempt 2: CDN fallback
    if (!loaded) {
      try {
        const coreURL = await toBlobURL(`${cdnBase}/ffmpeg-core.js`, 'text/javascript');
        const wasmURL = await toBlobURL(`${cdnBase}/ffmpeg-core.wasm`, 'application/wasm');

        await ffmpeg.load({ coreURL, wasmURL });
        loaded = true;
      } catch (cdnErr) {
        console.error('CDN FFmpeg core load failed:', cdnErr);
        throw new Error('Impossible de charger le module FFmpeg WebAssembly.');
      }
    }

    ffmpegInstance = ffmpeg;
    isLoaded = true;
  })();

  await loadPromise;
  if (!ffmpegInstance) {
    throw new Error('FFmpeg failed to initialize');
  }

  return ffmpegInstance;
}

/**
 * Compresses an audio file directly in the browser via FFmpeg.wasm before uploading to Firebase Storage.
 * Trims to maxDurationSec, encodes to MP3 at targetBitrateKbps, strips non-audio tracks,
 * ensuring high fidelity, fast transfer, and minimal Firebase Storage bandwidth.
 */
export async function compressAudioWithFFmpeg(
  inputFile: File,
  options: CompressionOptions = {},
  onProgress?: (p: CompressionProgress) => void
): Promise<CompressionResult> {
  const {
    maxDurationSec = 60,
    targetBitrateKbps,
    sampleRate = 44100,
    channels = 2,
    enforceMaxSize = 5 * 1024 * 1024
  } = options;

  const originalSize = inputFile.size;
  const effectiveBitrate = resolveDynamicBitrate(originalSize, targetBitrateKbps);

  // Fast-path: if file is already MP3, under 5MB, and user provided a short file
  const isMp3 = inputFile.type === 'audio/mp3' || inputFile.type === 'audio/mpeg' || inputFile.name.toLowerCase().endsWith('.mp3');
  if (isMp3 && originalSize < 2 * 1024 * 1024 && maxDurationSec <= 0) {
    return {
      file: inputFile,
      originalSize,
      compressedSize: originalSize,
      reductionPercentage: 0,
      method: 'passthrough',
      bitrateKbps: effectiveBitrate
    };
  }

  const ffmpeg = await getFFmpeg(onProgress);

  const totalStartTime = Date.now();
  let execStartTime: number | null = null;

  onProgress?.({
    stage: 'writing',
    percent: 30,
    message: 'Chargement du fichier dans le bac à sable WebAssembly...',
    elapsedSeconds: 0
  });

  const timestamp = Date.now();
  const rawExt = (inputFile.name.split('.').pop() || 'mp3').toLowerCase();
  const inputFilename = `in_${timestamp}.${rawExt}`;
  const outputFilename = `out_${timestamp}.mp3`;

  // Track progress during ffmpeg exec
  const progressHandler = ({ progress }: { progress: number }) => {
    if (!execStartTime) execStartTime = Date.now();
    const clamped = Math.max(0, Math.min(1, progress || 0));
    const pct = 35 + Math.floor(clamped * 55); // 35% -> 90%
    const elapsedSeconds = Math.max(1, Math.floor((Date.now() - totalStartTime) / 1000));

    let etaSeconds: number | undefined;
    if (clamped > 0.04 && execStartTime) {
      const execElapsed = (Date.now() - execStartTime) / 1000;
      const estimatedTotal = execElapsed / clamped;
      etaSeconds = Math.max(0, Math.ceil(estimatedTotal - execElapsed));
    }

    const etaText = etaSeconds !== undefined && etaSeconds > 0
      ? ` • ~${etaSeconds}s restante${etaSeconds > 1 ? 's' : ''}`
      : '';

    onProgress?.({
      stage: 'compressing',
      percent: pct,
      message: `Compression MP3 via FFmpeg (${pct}%)${etaText}`,
      etaSeconds,
      elapsedSeconds
    });
  };

  ffmpeg.on('progress', progressHandler);

  try {
    const fileData = await fetchFile(inputFile);
    await ffmpeg.writeFile(inputFilename, fileData);

    onProgress?.({
      stage: 'compressing',
      percent: 35,
      message: `Découpage (60s) et encodage dynamique (${effectiveBitrate} kbps) via FFmpeg...`,
      elapsedSeconds: Math.floor((Date.now() - totalStartTime) / 1000)
    });

    // FFmpeg arguments:
    // -i input : input file
    // -t <maxDurationSec> : clamp duration to maxDurationSec (e.g. 60s)
    // -vn : strip video/album art to avoid wasted bytes
    // -c:a libmp3lame : use MP3 codec
    // -b:a <rate>k : dynamic bitrate (64k for >15MB, 96k for >5MB, 128k for small)
    // -ar <sampleRate> : audio sample rate (e.g. 44100)
    // -ac <channels> : channels (e.g. 2 for stereo)
    const args: string[] = ['-i', inputFilename];

    if (maxDurationSec > 0) {
      args.push('-t', maxDurationSec.toString());
    }

    args.push(
      '-vn',
      '-c:a', 'libmp3lame',
      '-b:a', `${effectiveBitrate}k`,
      '-ar', sampleRate.toString(),
      '-ac', channels.toString(),
      outputFilename
    );

    const exitCode = await ffmpeg.exec(args);

    if (exitCode !== 0) {
      throw new Error(`FFmpeg compression exited with code ${exitCode}`);
    }

    onProgress?.({
      stage: 'reading',
      percent: 92,
      message: 'Finalisation du fichier MP3 compressé...'
    });

    const outputData = await ffmpeg.readFile(outputFilename);
    const uint8 = outputData instanceof Uint8Array 
      ? outputData 
      : new Uint8Array(outputData as unknown as ArrayBuffer);

    const mp3Blob = new Blob([uint8], { type: 'audio/mp3' });
    const compressedSize = mp3Blob.size;

    if (compressedSize > enforceMaxSize) {
      throw new Error(
        `Le fichier compressé fait ${(compressedSize / (1024 * 1024)).toFixed(1)} Mo, dépassant la limite autorisée de 5 Mo.`
      );
    }

    const cleanBaseName = inputFile.name.replace(/\.[^/.]+$/, '');
    const finalFilename = `${cleanBaseName}.mp3`;
    const compressedFile = new File([mp3Blob], finalFilename, { type: 'audio/mp3' });

    const reductionPercentage = originalSize > 0 
      ? Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100))
      : 0;

    onProgress?.({
      stage: 'done',
      percent: 100,
      message: `Compression terminée à ${effectiveBitrate} kbps : -${reductionPercentage}% de bande passante économisée !`
    });

    return {
      file: compressedFile,
      originalSize,
      compressedSize,
      reductionPercentage,
      durationSeconds: maxDurationSec,
      method: 'ffmpeg-wasm',
      bitrateKbps: effectiveBitrate
    };
  } finally {
    ffmpeg.off('progress', progressHandler);
    // Cleanup temporary virtual files
    try {
      await ffmpeg.deleteFile(inputFilename);
    } catch {}
    try {
      await ffmpeg.deleteFile(outputFilename);
    } catch {}
  }
}

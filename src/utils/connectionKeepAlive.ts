/**
 * Persistent WebSocket & Background Keep-Alive Engine (Native App Grade)
 * ---------------------------------------------------------------------
 * Guarantees continuous Socket.IO connectivity when:
 * 1. Screen is locked / phone goes to sleep
 * 2. User switches to other apps (WhatsApp, calls, etc.)
 * 3. Uploading large videos (via dedicated HTTP binary pipeline)
 *
 * Strategy:
 * - Dual-layer Hidden MediaStream (AudioContext -> MediaStreamAudioDestinationNode -> <audio>)
 *   with 60s silent PCM WAV fallback, integrated cleanly with UnifiedMediaSessionManager
 * - Dedicated Background Web Worker Heartbeat (unthrottled OS thread)
 * - Zombie-Socket Pong Watchdog (detects silent half-open mobile carrier TCP drops within ~18s)
 * - Smart Presence Lifecycle (green -> yellow after 2 mins in background, real-time events uninterrupted)
 */

import { Socket } from 'socket.io-client';
import { mediaSessionManager } from './mediaSessionManager';

const KEEPALIVE_MEDIA_ID = 'chat-keepalive';
const SILENT_AUDIO_URI =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

let silentAudioEl: HTMLAudioElement | null = null;
let streamAudioEl: HTMLAudioElement | null = null;
let mediaStreamDest: MediaStreamAudioDestinationNode | null = null;
let silentOscillator: OscillatorNode | null = null;
let silentGainNode: GainNode | null = null;

let wakeLockSentinel: any = null;
let heartbeatWorker: Worker | null = null;
let fallbackTimer: any = null;
let activeSocket: Socket | null = null;
let cachedSilentBlobUrl: string | null = null;

let isKeepAliveActive = false;
let isManuallyPaused = false;
let lastServerActivityAt = Date.now();
let lastZombieReconnectAt = 0;

export interface MediaSessionInfo {
  title?: string;
  artist?: string;
  album?: string;
  artworkUrl?: string;
}

let currentMediaInfo: MediaSessionInfo = {
  title: 'شات حسان برو الصوتي | للجوال',
  artist: 'اتصال مباشر ونشط في الخلفية 🟢 • انقر للعودة',
  album:
    typeof window !== 'undefined' ? window.location.hostname || 'chathassan2031' : 'chathassan2031',
  artworkUrl: '/favicon.svg'
};

/**
 * Generates a valid 60-second silent PCM WAV audio Blob URL as fallback when
 * MediaStreamDestination is unavailable.
 */
function getOrCreateSilentWavBlobUrl(): string {
  if (cachedSilentBlobUrl) return cachedSilentBlobUrl;
  try {
    const sampleRate = 8000;
    const durationSeconds = 60;
    const numChannels = 1;
    const bytesPerSample = 2;
    const totalSamples = sampleRate * durationSeconds;
    const dataSize = totalSamples * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    view.setUint8(0, 0x52); view.setUint8(1, 0x49); view.setUint8(2, 0x46); view.setUint8(3, 0x46);
    view.setUint32(4, 36 + dataSize, true);
    view.setUint8(8, 0x57); view.setUint8(9, 0x41); view.setUint8(10, 0x56); view.setUint8(11, 0x45);
    view.setUint8(12, 0x66); view.setUint8(13, 0x6d); view.setUint8(14, 0x74); view.setUint8(15, 0x20);
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
    view.setUint16(32, numChannels * bytesPerSample, true);
    view.setUint16(34, 16, true);
    view.setUint8(36, 0x64); view.setUint8(37, 0x61); view.setUint8(38, 0x74); view.setUint8(39, 0x61);
    view.setUint32(40, dataSize, true);

    const blob = new Blob([buffer], { type: 'audio/wav' });
    cachedSilentBlobUrl = URL.createObjectURL(blob);
    return cachedSilentBlobUrl;
  } catch {
    return SILENT_AUDIO_URI;
  }
}

/**
 * Starts the Hidden MediaStream (AudioContext -> MediaStreamDestination -> <audio>)
 * so mobile OSes maintain an active background media pipeline & detect phone call interruptions.
 */
function ensureHiddenMediaStreamStarted(): boolean {
  try {
    const ctx = mediaSessionManager.ensureAudioContext();
    if (!ctx || typeof ctx.createMediaStreamDestination !== 'function') {
      return false;
    }

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    if (!mediaStreamDest) {
      mediaStreamDest = ctx.createMediaStreamDestination();
      silentOscillator = ctx.createOscillator();
      silentGainNode = ctx.createGain();
      silentOscillator.type = 'sine';
      silentOscillator.frequency.value = 1; // Sub-audible 1Hz carrier
      silentGainNode.gain.value = 0.0001; // Virtually 0 amplitude (pure silence)
      silentOscillator.connect(silentGainNode);
      silentGainNode.connect(mediaStreamDest);
      silentOscillator.start();
    }

    if (!streamAudioEl) {
      streamAudioEl = document.createElement('audio');
      streamAudioEl.setAttribute('playsinline', 'true');
      streamAudioEl.setAttribute('webkit-playsinline', 'true');
      streamAudioEl.loop = true;
      streamAudioEl.volume = 0.01;
      streamAudioEl.srcObject = mediaStreamDest.stream;

      streamAudioEl.addEventListener('pause', () => {
        if (!isKeepAliveActive || isManuallyPaused) return;
        const activeKind = mediaSessionManager.getActiveMediaKind();
        if (activeKind === 'keepalive' || activeKind === 'wall-youtube') {
          mediaSessionManager.notifyUnexpectedElementPause(
            activeKind === 'keepalive' ? KEEPALIVE_MEDIA_ID : mediaSessionManager.getActiveMediaId() || KEEPALIVE_MEDIA_ID
          );
        }
      });
    }

    if (streamAudioEl.paused) {
      streamAudioEl.play().catch(() => {});
    }
    return true;
  } catch {
    return false;
  }
}

function ensureSilentWavElementStarted(): void {
  const blobUrl = getOrCreateSilentWavBlobUrl();
  if (!silentAudioEl) {
    silentAudioEl = new Audio(blobUrl);
    silentAudioEl.loop = true;
    silentAudioEl.volume = 0.01;
    (silentAudioEl as any).playsInline = true;
    silentAudioEl.setAttribute('playsinline', 'true');
    silentAudioEl.setAttribute('webkit-playsinline', 'true');
    silentAudioEl.setAttribute('x-webkit-airplay', 'allow');

    silentAudioEl.addEventListener('timeupdate', () => {
      if (mediaSessionManager.getActiveMediaKind() === 'keepalive' && silentAudioEl) {
        mediaSessionManager.updateMediaState(KEEPALIVE_MEDIA_ID, {
          duration: 60,
          currentTime: silentAudioEl.currentTime || 0,
          playbackRate: 1
        });
      }
    });

    silentAudioEl.addEventListener('ended', () => {
      if (isKeepAliveActive && !isManuallyPaused) {
        silentAudioEl?.play().catch(() => {});
      }
    });

    silentAudioEl.addEventListener('pause', () => {
      if (!isKeepAliveActive || isManuallyPaused) return;
      if (mediaSessionManager.getActiveMediaKind() === 'keepalive') {
        mediaSessionManager.notifyUnexpectedElementPause(KEEPALIVE_MEDIA_ID);
      }
    });
  } else if (silentAudioEl.src !== blobUrl) {
    silentAudioEl.src = blobUrl;
  }

  if (silentAudioEl.paused) {
    silentAudioEl.play().catch(() => {
      const playOnGesture = () => {
        if (isKeepAliveActive && !isManuallyPaused) {
          ensureHiddenMediaStreamStarted();
          silentAudioEl?.play().catch(() => {});
        }
        window.removeEventListener('click', playOnGesture);
        window.removeEventListener('touchstart', playOnGesture);
        window.removeEventListener('pointerdown', playOnGesture);
      };
      window.addEventListener('click', playOnGesture, { once: true });
      window.addEventListener('touchstart', playOnGesture, { once: true });
      window.addEventListener('pointerdown', playOnGesture, { once: true });
    });
  }
}

function playUnderlyingKeepAliveElements(): void {
  ensureHiddenMediaStreamStarted();
  ensureSilentWavElementStarted();
}

function pauseUnderlyingKeepAliveElements(): void {
  if (silentAudioEl && !silentAudioEl.paused) {
    try {
      silentAudioEl.pause();
    } catch {}
  }
  if (streamAudioEl && !streamAudioEl.paused) {
    try {
      streamAudioEl.pause();
    } catch {}
  }
}

/**
 * 1. Request Screen WakeLock to prevent automatic screen sleeping while visible
 */
export async function requestScreenWakeLock(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
    try {
      if (wakeLockSentinel) return true;
      wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
      wakeLockSentinel.addEventListener('release', () => {
        wakeLockSentinel = null;
      });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Update Keep-Alive MediaSession metadata without overriding higher-priority media
 * (such as an active Wall Video, YouTube clip, or Voice Note).
 */
export function updateMediaSessionMetadata(info?: Partial<MediaSessionInfo>): void {
  if (info) {
    currentMediaInfo = { ...currentMediaInfo, ...info };
  }
  const siteHost =
    typeof window !== 'undefined' ? window.location.hostname || 'chathassan2031' : 'chathassan2031';

  const title = currentMediaInfo.title || 'شات حسان برو الصوتي | للجوال';
  const artist = currentMediaInfo.artist || 'اتصال مباشر ونشط في الخلفية 🟢 • انقر للعودة';
  const album = currentMediaInfo.album || siteHost;
  const artworkUrl = currentMediaInfo.artworkUrl || '/favicon.svg';

  if (isKeepAliveActive) {
    mediaSessionManager.setKeepAliveDescriptor({
      id: KEEPALIVE_MEDIA_ID,
      kind: 'keepalive',
      title,
      artist,
      album,
      artworkUrl,
      duration: 60,
      currentTime: silentAudioEl?.currentTime || 0,
      playbackRate: 1,
      isPlaying: !isManuallyPaused,
      onPlay: () => {
        isManuallyPaused = false;
        playUnderlyingKeepAliveElements();
      },
      onPause: () => {
        isManuallyPaused = true;
        pauseUnderlyingKeepAliveElements();
      },
      onStop: () => {
        stopSilentAudioKeepAlive();
      },
      onInterruptPause: () => {
        pauseUnderlyingKeepAliveElements();
      },
      onInterruptResume: () => {
        if (isKeepAliveActive && !isManuallyPaused) {
          playUnderlyingKeepAliveElements();
        }
      }
    });
  }
}

/**
 * 2. Start Persistent Background Keep-Alive Audio/MediaStream Loop
 * Keeps WebSocket un-throttled in mobile background while cleanly yielding
 * to phone calls, Wall Videos, and Voice Notes via UnifiedMediaSessionManager.
 */
export function startSilentAudioKeepAlive(info?: Partial<MediaSessionInfo>): void {
  try {
    isKeepAliveActive = true;
    isManuallyPaused = false;
    if (info) {
      currentMediaInfo = { ...currentMediaInfo, ...info };
    }
    updateMediaSessionMetadata();
    playUnderlyingKeepAliveElements();
  } catch {}
}

/**
 * Ensures the hidden silent MediaStream stays running underneath a cross-origin
 * YouTube iframe in the background without stealing MediaSession metadata.
 */
export function ensureBackgroundStreamForYouTube(): void {
  isManuallyPaused = false;
  ensureHiddenMediaStreamStarted();
  ensureSilentWavElementStarted();
}

export function pauseKeepAliveAudio(): void {
  isManuallyPaused = true;
  pauseUnderlyingKeepAliveElements();
  mediaSessionManager.updateMediaState(KEEPALIVE_MEDIA_ID, { isPlaying: false });
}

export function resumeKeepAliveAudio(): void {
  if (!isKeepAliveActive) {
    startSilentAudioKeepAlive();
    return;
  }
  isManuallyPaused = false;
  playUnderlyingKeepAliveElements();
  mediaSessionManager.updateMediaState(KEEPALIVE_MEDIA_ID, { isPlaying: true });
}

export function isKeepAliveAudioPlaying(): boolean {
  return (
    (!!streamAudioEl && !streamAudioEl.paused) ||
    (!!silentAudioEl && !silentAudioEl.paused)
  );
}

export function stopSilentAudioKeepAlive(): void {
  isKeepAliveActive = false;
  isManuallyPaused = false;
  mediaSessionManager.setKeepAliveDescriptor(null);

  if (silentAudioEl) {
    try {
      silentAudioEl.pause();
      silentAudioEl.src = '';
    } catch {}
    silentAudioEl = null;
  }

  if (streamAudioEl) {
    try {
      streamAudioEl.pause();
      streamAudioEl.srcObject = null;
    } catch {}
    streamAudioEl = null;
  }

  if (silentOscillator) {
    try {
      silentOscillator.stop();
      silentOscillator.disconnect();
    } catch {}
    silentOscillator = null;
  }

  if (silentGainNode) {
    try {
      silentGainNode.disconnect();
    } catch {}
    silentGainNode = null;
  }
  mediaStreamDest = null;
}

export let PRESENCE_AWAY_DELAY_MS = 2 * 60 * 1000;
export function setPresenceAwayDelayMs(ms: number): void {
  if (typeof ms === 'number' && ms >= 5000) {
    PRESENCE_AWAY_DELAY_MS = ms;
  }
}
export function getPresenceAwayDelayMs(): number {
  return PRESENCE_AWAY_DELAY_MS;
}

let backgroundStartTime: number | null = null;
let hasEmittedAway = false;
let awayTimer: any = null;

/**
 * Call whenever any Socket.IO packet/pong arrives from the server so the
 * Zombie-Socket Watchdog knows the TCP connection is genuinely alive.
 */
export function notifySocketActivity(): void {
  lastServerActivityAt = Date.now();
}

/**
 * 3. Background Web Worker Heartbeat + Zombie-Socket Watchdog
 * Runs on an independent OS thread so mobile browsers don't throttle it.
 */
export function startHeartbeatWorker(socket: Socket): void {
  activeSocket = socket;
  lastServerActivityAt = Date.now();
  if (heartbeatWorker) return;

  const workerCode = `
    let timer = null;
    self.onmessage = function(e) {
      if (e.data === 'start') {
        if (!timer) {
          timer = setInterval(function() {
            self.postMessage('tick');
            try {
              fetch('/api/keepalive', { cache: 'no-store', keepalive: true }).catch(function(){});
            } catch(e){}
          }, 4500);
        }
      } else if (e.data === 'stop') {
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
      }
    };
  `;

  const runTick = () => {
    if (!activeSocket) return;
    const now = Date.now();

    if (activeSocket.connected) {
      activeSocket.emit('keepAlivePing', { timestamp: now });

      // Zombie TCP socket detection: if no pong/event arrived for > 20s while "connected",
      // the OS carrier silently dropped the socket — force clean immediate reconnect.
      if (
        now - lastServerActivityAt > 20000 &&
        now - lastZombieReconnectAt > 12000 &&
        (typeof navigator === 'undefined' || navigator.onLine !== false)
      ) {
        lastZombieReconnectAt = now;
        try {
          activeSocket.disconnect();
          activeSocket.connect();
        } catch {}
      }
    } else if (activeSocket.disconnected) {
      if (typeof navigator === 'undefined' || navigator.onLine !== false) {
        activeSocket.connect();
      }
    }

    // Maintain background MediaStream if keep-alive is enabled and not manually paused or interrupted
    if (
      isKeepAliveActive &&
      !isManuallyPaused &&
      mediaSessionManager.getActiveMediaKind() === 'keepalive' &&
      mediaSessionManager.getAudioContextState() === 'running' &&
      !isKeepAliveAudioPlaying()
    ) {
      playUnderlyingKeepAliveElements();
    }

    // Check background elapsed time for presence dot transition (green -> yellow)
    if (
      typeof document !== 'undefined' &&
      document.hidden &&
      backgroundStartTime !== null &&
      !hasEmittedAway
    ) {
      const elapsed = now - backgroundStartTime;
      if (elapsed >= PRESENCE_AWAY_DELAY_MS) {
        hasEmittedAway = true;
        if (activeSocket.connected) {
          activeSocket.emit('userPresenceChange', { state: 'away' });
        }
      }
    }
  };

  try {
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const blobUrl = URL.createObjectURL(blob);
    heartbeatWorker = new Worker(blobUrl);
    URL.revokeObjectURL(blobUrl);

    heartbeatWorker.onmessage = (e) => {
      if (e.data === 'tick') {
        runTick();
      }
    };
    heartbeatWorker.postMessage('start');
  } catch {
    if (fallbackTimer) clearInterval(fallbackTimer);
    fallbackTimer = setInterval(runTick, 5000);
  }
}

export function stopHeartbeatWorker(): void {
  if (heartbeatWorker) {
    try {
      heartbeatWorker.postMessage('stop');
      heartbeatWorker.terminate();
    } catch {}
    heartbeatWorker = null;
  }
  if (fallbackTimer) {
    clearInterval(fallbackTimer);
    fallbackTimer = null;
  }
}

/**
 * 4. Visibility & Screen Unlock Handlers
 * - Keeps WebSocket live & receiving real-time events in background.
 * - Marks presence green -> yellow after PRESENCE_AWAY_DELAY_MS, and back to green immediately on return.
 * - Avoids redundant history reloads if socket never disconnected.
 */
export function setupVisibilityResync(
  socket: Socket,
  onWake?: (wasDisconnected: boolean, elapsedBgSeconds: number) => void
): () => void {
  activeSocket = socket;
  let lastWakeSyncAt = 0;
  let hadDisconnectInBg = false;

  const onSocketDisconnect = () => {
    hadDisconnectInBg = true;
  };
  socket.on('disconnect', onSocketDisconnect);

  const triggerOnlineForeground = () => {
    if (awayTimer) {
      clearTimeout(awayTimer);
      awayTimer = null;
    }
    const elapsedBgSeconds =
      backgroundStartTime !== null
        ? Math.max(0, Math.floor((Date.now() - backgroundStartTime) / 1000))
        : 0;
    backgroundStartTime = null;
    hasEmittedAway = false;

    requestScreenWakeLock().catch(() => {});

    // Keep keep-alive audio context healthy upon foreground return
    if (isKeepAliveActive && !isManuallyPaused) {
      const ctx = mediaSessionManager.ensureAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    }

    if (activeSocket) {
      const wasDisconnected = !activeSocket.connected || hadDisconnectInBg;
      hadDisconnectInBg = false;

      if (!activeSocket.connected) {
        if (activeSocket.disconnected) {
          activeSocket.connect();
        }
      } else {
        activeSocket.emit('keepAlivePing', { timestamp: Date.now() });
        activeSocket.emit('userPresenceChange', { state: 'online' });
      }

      const now = Date.now();
      if (onWake && now - lastWakeSyncAt > 2500) {
        lastWakeSyncAt = now;
        onWake(wasDisconnected, elapsedBgSeconds);
      }
    }
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      triggerOnlineForeground();
    } else if (document.visibilityState === 'hidden') {
      if (awayTimer) clearTimeout(awayTimer);
      backgroundStartTime = Date.now();
      hasEmittedAway = false;

      awayTimer = setTimeout(() => {
        if (document.hidden && activeSocket?.connected && !hasEmittedAway) {
          hasEmittedAway = true;
          activeSocket.emit('userPresenceChange', { state: 'away' });
        }
      }, PRESENCE_AWAY_DELAY_MS);
    }
  };

  const handleFocus = () => {
    if (document.visibilityState === 'visible') {
      triggerOnlineForeground();
    }
  };

  const handlePageShow = () => {
    triggerOnlineForeground();
  };

  const handleOnline = () => {
    hadDisconnectInBg = true;
    triggerOnlineForeground();
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('focus', handleFocus);
  window.addEventListener('pageshow', handlePageShow);
  window.addEventListener('online', handleOnline);

  return () => {
    if (awayTimer) {
      clearTimeout(awayTimer);
      awayTimer = null;
    }
    socket.off('disconnect', onSocketDisconnect);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('focus', handleFocus);
    window.removeEventListener('pageshow', handlePageShow);
    window.removeEventListener('online', handleOnline);
  };
}

/**
 * 5. Robust Media Upload Pipeline (HTTP Binary Progress Pipeline)
 * Completely bypasses WebSocket frames so Socket.IO heartbeats NEVER stall.
 */
export async function uploadMediaWithProgress(
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ url: string; mediaType: 'image' | 'video' | 'audio'; originalName: string; size: number }> {
  const isVideo = file.type.startsWith('video');
  const isAudio = file.type.startsWith('audio');
  const mediaType: 'image' | 'video' | 'audio' = isVideo ? 'video' : isAudio ? 'audio' : 'image';

  const apiBase = ((import.meta.env.VITE_SERVER_URL as string) || '').replace(/\/$/, '');

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${apiBase}/api/upload-media-binary`, true);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.setRequestHeader('x-filename', encodeURIComponent(file.name));
    xhr.setRequestHeader('x-mediatype', mediaType);

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && e.total > 0) {
          const percent = Math.min(99, Math.round((e.loaded / e.total) * 100));
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          if (res.success && res.url) {
            if (onProgress) onProgress(100);
            let finalUrl = res.url;
            if (finalUrl && finalUrl.startsWith('/') && apiBase) {
              finalUrl = `${apiBase}${finalUrl}`;
            }
            resolve({
              url: finalUrl,
              mediaType: res.mediaType || mediaType,
              originalName: file.name,
              size: res.size || file.size
            });
            return;
          }
        } catch {}
      }
      fallbackUpload(file, mediaType, onProgress, resolve, reject, apiBase);
    };

    xhr.onerror = () => {
      fallbackUpload(file, mediaType, onProgress, resolve, reject, apiBase);
    };

    xhr.send(file);
  });
}

function fallbackUpload(
  file: File,
  mediaType: 'image' | 'video' | 'audio',
  onProgress?: (percent: number) => void,
  resolve?: (val: any) => void,
  reject?: (err: any) => void,
  apiBase: string = ''
) {
  const reader = new FileReader();
  reader.onerror = () => reject && reject(new Error('فشل قراءة ملف الوسائط'));
  reader.onload = () => {
    const dataUrl = reader.result as string;
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${apiBase}/api/upload-media`, true);
    xhr.setRequestHeader('Content-Type', 'application/json');

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.min(99, Math.round((e.loaded / e.total) * 100));
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          if (res.success && res.url) {
            if (onProgress) onProgress(100);
            let finalUrl = res.url;
            if (finalUrl && finalUrl.startsWith('/') && apiBase) {
              finalUrl = `${apiBase}${finalUrl}`;
            }
            resolve &&
              resolve({
                url: finalUrl,
                mediaType: res.mediaType || mediaType,
                originalName: file.name,
                size: res.size || file.size
              });
            return;
          }
        } catch {}
      }
      reject && reject(new Error('فشل رفع الملف على الخادم'));
    };

    xhr.onerror = () => reject && reject(new Error('انقطع الاتصال أثناء رفع الوسائط'));

    xhr.send(JSON.stringify({ dataUrl, filename: file.name, mediaType }));
  };
  reader.readAsDataURL(file);
}

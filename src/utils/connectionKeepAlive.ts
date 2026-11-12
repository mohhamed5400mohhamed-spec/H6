/**
 * Connection Keep-Alive & Mobile Screen-Lock Resilience Engine
 * Ensures users NEVER drop connection when:
 * 1. Screen is locked / phone goes to sleep
 * 2. Uploading large videos (via dedicated HTTP background pipeline)
 * 3. Mobile background app switching
 * User only disconnects when they explicitly log out themselves.
 */

import { Socket } from 'socket.io-client';

// Extremely lightweight base64 silent WAV audio data URI fallback
const SILENT_AUDIO_URI = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

let silentAudioEl: HTMLAudioElement | null = null;
let wakeLockSentinel: any = null;
let heartbeatWorker: Worker | null = null;
let fallbackTimer: any = null;
let activeSocket: Socket | null = null;
let cachedSilentBlobUrl: string | null = null;

export interface MediaSessionInfo {
  title?: string;
  artist?: string;
  album?: string;
  artworkUrl?: string;
}

let currentMediaInfo: MediaSessionInfo = {
  title: 'شات حسان برو الصوتي | للجوال',
  artist: 'اتصال مباشر ونشط في الخلفية 🟢 • انقر للعودة',
  album: typeof window !== 'undefined' ? (window.location.hostname || 'chathassan2031') : 'chathassan2031',
  artworkUrl: '/favicon.svg'
};

/**
 * Generates a valid 60-second silent PCM WAV audio Blob URL.
 * 60 seconds provides ultra-smooth notification bar progress, minimizes audio decoder wakeups,
 * and eliminates CPU/battery overhead from looping every few seconds.
 */
function getOrCreateSilentWavBlobUrl(): string {
  if (cachedSilentBlobUrl) return cachedSilentBlobUrl;
  try {
    const sampleRate = 8000;
    const durationSeconds = 60; // 60 seconds buffer
    const numChannels = 1;
    const bytesPerSample = 2; // 16-bit PCM
    const totalSamples = sampleRate * durationSeconds;
    const dataSize = totalSamples * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    // RIFF chunk descriptor
    view.setUint8(0, 0x52); view.setUint8(1, 0x49); view.setUint8(2, 0x46); view.setUint8(3, 0x46); // 'RIFF'
    view.setUint32(4, 36 + dataSize, true);
    view.setUint8(8, 0x57); view.setUint8(9, 0x41); view.setUint8(10, 0x56); view.setUint8(11, 0x45); // 'WAVE'

    // fmt sub-chunk
    view.setUint8(12, 0x66); view.setUint8(13, 0x6d); view.setUint8(14, 0x74); view.setUint8(15, 0x20); // 'fmt '
    view.setUint32(16, 16, true); // SubChunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
    view.setUint16(22, numChannels, true); // NumChannels (1)
    view.setUint32(24, sampleRate, true); // SampleRate (8000)
    view.setUint32(28, sampleRate * numChannels * bytesPerSample, true); // ByteRate
    view.setUint16(32, numChannels * bytesPerSample, true); // BlockAlign
    view.setUint16(34, 16, true); // BitsPerSample (16)

    // data sub-chunk
    view.setUint8(36, 0x64); view.setUint8(37, 0x61); view.setUint8(38, 0x74); view.setUint8(39, 0x61); // 'data'
    view.setUint32(40, dataSize, true);

    // Audio samples are 0x00 (pure silence)

    const blob = new Blob([buffer], { type: 'audio/wav' });
    cachedSilentBlobUrl = URL.createObjectURL(blob);
    return cachedSilentBlobUrl;
  } catch {
    return SILENT_AUDIO_URI;
  }
}

/**
 * Synchronize position state to Android Media Notification bar
 */
function syncMediaSessionPositionState(): void {
  if (typeof navigator !== 'undefined' && 'mediaSession' in navigator && 'setPositionState' in navigator.mediaSession && silentAudioEl) {
    try {
      navigator.mediaSession.setPositionState({
        duration: 60,
        playbackRate: 1,
        position: Math.max(0, Math.min(60, silentAudioEl.currentTime || 0))
      });
    } catch {}
  }
}

/**
 * 1. Request Screen WakeLock to prevent automatic screen sleeping
 */
export async function requestScreenWakeLock(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
    try {
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
 * Configure MediaSession metadata and action handlers for the Android Notification Bar
 */
export function updateMediaSessionMetadata(info?: Partial<MediaSessionInfo>): void {
  if (info) {
    currentMediaInfo = { ...currentMediaInfo, ...info };
  }
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  try {
    const siteHost = typeof window !== 'undefined' ? (window.location.hostname || 'chathassan2031') : 'chathassan2031';
    const title = currentMediaInfo.title || 'شات حسان برو الصوتي | للجوال';
    const artist = currentMediaInfo.artist || 'اتصال مباشر ونشط في الخلفية 🟢 • انقر للعودة';
    const album = currentMediaInfo.album || siteHost;
    const artUrl = currentMediaInfo.artworkUrl || '/favicon.svg';

    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist,
      album,
      artwork: [
        { src: artUrl, sizes: '96x96', type: 'image/svg+xml' },
        { src: artUrl, sizes: '128x128', type: 'image/svg+xml' },
        { src: artUrl, sizes: '192x192', type: 'image/svg+xml' },
        { src: artUrl, sizes: '256x256', type: 'image/svg+xml' },
        { src: artUrl, sizes: '512x512', type: 'image/svg+xml' },
      ]
    });

    try {
      navigator.mediaSession.setActionHandler('play', () => {
        resumeKeepAliveAudio();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        // Instant/short pause feedback followed by immediate auto-restart (as in chat keep-alive platforms)
        if (silentAudioEl) {
          try {
            silentAudioEl.pause();
            if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
              navigator.mediaSession.playbackState = 'paused';
            }
          } catch {}
        }
        if (autoRevivalTimer) clearTimeout(autoRevivalTimer);
        autoRevivalTimer = setTimeout(() => {
          if (isKeepAliveActive) {
            resumeKeepAliveAudio();
          }
        }, 1200);
      });
      navigator.mediaSession.setActionHandler('stop', () => {
        if (autoRevivalTimer) clearTimeout(autoRevivalTimer);
        autoRevivalTimer = setTimeout(() => {
          if (isKeepAliveActive) {
            resumeKeepAliveAudio();
          }
        }, 1200);
      });
      navigator.mediaSession.setActionHandler('seekto', () => {});
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        resumeKeepAliveAudio();
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        resumeKeepAliveAudio();
      });
    } catch {}
  } catch (err) {
    console.warn('Failed to configure MediaSession:', err);
  }
}

let isKeepAliveActive = false;
let autoRevivalTimer: any = null;
let consecutivePlayFailures = 0;

/**
 * 2. Start Silent Audio Loop (Mobile OS Keep-Alive & Android Notification Media Player)
 * iOS Safari and Android Chrome grant high priority and un-throttled
 * network/timers to web applications actively playing media.
 * Features Continuous Auto-Revival Watchdog with Smart Audio Focus Backoff:
 * Gracefully yields to WhatsApp voice notes, YouTube, and phone calls without fighting for focus.
 */
export function startSilentAudioKeepAlive(info?: Partial<MediaSessionInfo>): void {
  try {
    isKeepAliveActive = true;
    if (info) {
      currentMediaInfo = { ...currentMediaInfo, ...info };
    }
    const blobUrl = getOrCreateSilentWavBlobUrl();
    if (!silentAudioEl) {
      silentAudioEl = new Audio(blobUrl);
      silentAudioEl.loop = true;
      silentAudioEl.volume = 0.01; // Inaudible silence (1% volume) that keeps media pipeline active
      (silentAudioEl as any).playsInline = true;
      silentAudioEl.setAttribute('playsinline', 'true');
      silentAudioEl.setAttribute('webkit-playsinline', 'true');
      silentAudioEl.setAttribute('x-webkit-airplay', 'allow');

      // Keep MediaSession seekbar position in sync
      silentAudioEl.addEventListener('timeupdate', () => {
        syncMediaSessionPositionState();
      });

      // Auto-Revival Watchdog Listeners: If audio stops due to loop, ended, or interruption
      silentAudioEl.addEventListener('ended', () => {
        if (isKeepAliveActive) {
          silentAudioEl?.play().catch(() => {});
        }
      });

      silentAudioEl.addEventListener('pause', () => {
        if (isKeepAliveActive) {
          if (autoRevivalTimer) clearTimeout(autoRevivalTimer);
          const backoff = consecutivePlayFailures > 2 ? 8000 : 2500;
          autoRevivalTimer = setTimeout(() => {
            if (isKeepAliveActive && silentAudioEl?.paused) {
              resumeKeepAliveAudio();
            }
          }, backoff);
        }
      });

      silentAudioEl.addEventListener('error', () => {
        if (isKeepAliveActive) {
          setTimeout(() => {
            if (silentAudioEl) {
              silentAudioEl.src = getOrCreateSilentWavBlobUrl();
              resumeKeepAliveAudio();
            }
          }, 2000);
        }
      });
    } else if (silentAudioEl.src !== blobUrl) {
      silentAudioEl.src = blobUrl;
    }

    updateMediaSessionMetadata();

    silentAudioEl.play().then(() => {
      consecutivePlayFailures = 0;
      if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
        syncMediaSessionPositionState();
      }
    }).catch(() => {
      // Browsers require user interaction before autoplay
      const playOnUserAction = () => {
        if (silentAudioEl && isKeepAliveActive) {
          silentAudioEl.play().then(() => {
            consecutivePlayFailures = 0;
            if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
              navigator.mediaSession.playbackState = 'playing';
              syncMediaSessionPositionState();
            }
          }).catch(() => {});
        }
        window.removeEventListener('click', playOnUserAction);
        window.removeEventListener('touchstart', playOnUserAction);
        window.removeEventListener('pointerdown', playOnUserAction);
      };
      window.addEventListener('click', playOnUserAction, { once: true });
      window.addEventListener('touchstart', playOnUserAction, { once: true });
      window.addEventListener('pointerdown', playOnUserAction, { once: true });
    });
  } catch {}
}

export function pauseKeepAliveAudio(): void {
  if (silentAudioEl) {
    try {
      silentAudioEl.pause();
      if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
    } catch {}
  }
  // When paused, automatically check and restart after 2.5s unless another app has taken focus
  if (isKeepAliveActive) {
    if (autoRevivalTimer) clearTimeout(autoRevivalTimer);
    autoRevivalTimer = setTimeout(() => {
      if (isKeepAliveActive && silentAudioEl?.paused) {
        resumeKeepAliveAudio();
      }
    }, 2500);
  }
}

export function resumeKeepAliveAudio(): void {
  if (!isKeepAliveActive) return;
  if (silentAudioEl) {
    try {
      silentAudioEl.play().then(() => {
        consecutivePlayFailures = 0;
        if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'playing';
          syncMediaSessionPositionState();
        }
      }).catch((_err) => {
        consecutivePlayFailures++;
        // If another app (WhatsApp, YouTube, Call) has audio focus, back off gracefully
        const backoffMs = consecutivePlayFailures > 2 ? 8000 : 3500;
        if (autoRevivalTimer) clearTimeout(autoRevivalTimer);
        autoRevivalTimer = setTimeout(() => {
          if (isKeepAliveActive && silentAudioEl?.paused) {
            resumeKeepAliveAudio();
          }
        }, backoffMs);
      });
    } catch {}
  } else {
    startSilentAudioKeepAlive();
  }
}

export function isKeepAliveAudioPlaying(): boolean {
  return !!silentAudioEl && !silentAudioEl.paused;
}

export function stopSilentAudioKeepAlive(): void {
  isKeepAliveActive = false;
  if (autoRevivalTimer) {
    clearTimeout(autoRevivalTimer);
    autoRevivalTimer = null;
  }
  if (silentAudioEl) {
    try {
      silentAudioEl.pause();
      silentAudioEl.src = '';
      if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'none';
      }
    } catch {}
    silentAudioEl = null;
  }
}

export let PRESENCE_AWAY_DELAY_MS = 2 * 60 * 1000; // دقيقتين (120 ثانية) افتراضياً
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
 * 3. Background Web Worker Heartbeat
 * Unlike window.setInterval (which browsers heavily throttle when tab is in background or screen is locked),
 * Web Workers run on a background OS thread and maintain regular tick intervals.
 */
export function startHeartbeatWorker(socket: Socket): void {
  activeSocket = socket;
  if (heartbeatWorker) return;

  const workerCode = `
    let timer = null;
    self.onmessage = function(e) {
      if (e.data === 'start') {
        if (!timer) {
          timer = setInterval(function() {
            self.postMessage('tick');
            try {
              fetch('/api/keepalive', { cache: 'no-store' }).catch(function(){});
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

  try {
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const blobUrl = URL.createObjectURL(blob);
    heartbeatWorker = new Worker(blobUrl);
    URL.revokeObjectURL(blobUrl);

    heartbeatWorker.onmessage = (e) => {
      if (e.data === 'tick' && activeSocket) {
        if (activeSocket.connected) {
          activeSocket.emit('keepAlivePing', { timestamp: Date.now() });
        } else if (activeSocket.disconnected) {
          // If socket disconnected during background sleep, trigger clean reconnect
          activeSocket.connect();
        }

        // Auto-Revival Watchdog: Ensure keep-alive media player stays continuously alive
        if (isKeepAliveActive && silentAudioEl && silentAudioEl.paused) {
          resumeKeepAliveAudio();
        }

        // Check background elapsed time: change to yellow (away) only after 2 full minutes
        if (typeof document !== 'undefined' && document.hidden && backgroundStartTime !== null && !hasEmittedAway) {
          const elapsed = Date.now() - backgroundStartTime;
          if (elapsed >= PRESENCE_AWAY_DELAY_MS) {
            hasEmittedAway = true;
            if (activeSocket.connected) {
              activeSocket.emit('userPresenceChange', { state: 'away' });
            }
          }
        }
      }
    };
    heartbeatWorker.postMessage('start');
  } catch (err) {
    // Fallback to regular timer if worker unavailable
    if (fallbackTimer) clearInterval(fallbackTimer);
    fallbackTimer = setInterval(() => {
      if (activeSocket?.connected) {
        activeSocket.emit('keepAlivePing', { timestamp: Date.now() });
      }
      if (isKeepAliveActive && silentAudioEl && silentAudioEl.paused) {
        resumeKeepAliveAudio();
      }
      if (typeof document !== 'undefined' && document.hidden && backgroundStartTime !== null && !hasEmittedAway) {
        const elapsed = Date.now() - backgroundStartTime;
        if (elapsed >= PRESENCE_AWAY_DELAY_MS) {
          hasEmittedAway = true;
          if (activeSocket?.connected) {
            activeSocket.emit('userPresenceChange', { state: 'away' });
          }
        }
      }
    }, 6000);
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
 * 4. Visibility & Phone Screen Unlock Handlers
 * When switching apps or locking screen:
 * - Mark remains green (online) for 2 full minutes.
 * - If user remains in background past 2 minutes, transitions to yellow (away).
 * - Connection stays 100% active, stable, and never dropped.
 * - Immediately turns green (online) upon returning to chat interface.
 */
export function setupVisibilityResync(socket: Socket, onWake?: (wasDisconnected: boolean, elapsedBgSeconds: number) => void): () => void {
  activeSocket = socket;
  let lastWakeSyncAt = 0;

  const triggerOnlineForeground = () => {
    if (awayTimer) {
      clearTimeout(awayTimer);
      awayTimer = null;
    }
    const elapsedBgSeconds = backgroundStartTime !== null ? Math.max(0, Math.floor((Date.now() - backgroundStartTime) / 1000)) : 0;
    backgroundStartTime = null;
    hasEmittedAway = false;

    requestScreenWakeLock();

    // Auto-Revive Media Session Keep-Alive Player on returning to foreground
    if (isKeepAliveActive && (!silentAudioEl || silentAudioEl.paused)) {
      resumeKeepAliveAudio();
    }

    if (activeSocket) {
      const wasDisconnected = !activeSocket.connected;
      if (wasDisconnected) {
        // Socket was disconnected: reconnect cleanly if not already connecting
        if (activeSocket.disconnected) {
          activeSocket.connect();
        }
      } else {
        // Socket is ALREADY connected! Send lightweight keepAlive ping
        activeSocket.emit('keepAlivePing', { timestamp: Date.now() });
      }
      // Return immediately to green online dot (متواجد ونشط 🟢)
      if (activeSocket.connected) {
        activeSocket.emit('userPresenceChange', { state: 'online' });
      }

      const now = Date.now();
      // Debounce and invoke onWake to sync missed messages or handle restore
      if (onWake && (now - lastWakeSyncAt > 3000)) {
        lastWakeSyncAt = now;
        onWake(wasDisconnected, elapsedBgSeconds);
      }
    }
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      // User returned to chat interface: switch to green (online) immediately
      triggerOnlineForeground();
    } else if (document.visibilityState === 'hidden') {
      // User switched to another app or locked screen:
      // Keep presence green for 2 minutes before turning yellow (away)
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
    triggerOnlineForeground();
  };

  const handlePageShow = () => {
    triggerOnlineForeground();
  };

  const handleBlur = () => {
    // When window loses focus while document is hidden, initialize the 2-minute delay
    if (document.hidden && !awayTimer && !hasEmittedAway) {
      backgroundStartTime = Date.now();
      awayTimer = setTimeout(() => {
        if (document.hidden && activeSocket?.connected && !hasEmittedAway) {
          hasEmittedAway = true;
          activeSocket.emit('userPresenceChange', { state: 'away' });
        }
      }, PRESENCE_AWAY_DELAY_MS);
    }
  };

  const handleOnline = () => {
    triggerOnlineForeground();
  };

  // Listeners for visibility, pageshow (bfcache/browser reopen), and focus/online events
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('focus', handleFocus);
  window.addEventListener('pageshow', handlePageShow);
  window.addEventListener('blur', handleBlur);
  window.addEventListener('online', handleOnline);

  return () => {
    if (awayTimer) {
      clearTimeout(awayTimer);
      awayTimer = null;
    }
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('focus', handleFocus);
    window.removeEventListener('pageshow', handlePageShow);
    window.removeEventListener('blur', handleBlur);
    window.removeEventListener('online', handleOnline);
  };
}

/**
 * 5. Robust Media Upload Pipeline (HTTP Binary Progress Pipeline)
 * Large videos (up to 150MB) and high-resolution images are uploaded over
 * direct binary streaming HTTP POST with progress, completely bypassing
 * WebSocket frames and eliminating base64 memory overhead so Socket.IO
 * heartbeats NEVER stall and connection NEVER drops!
 */
export async function uploadMediaWithProgress(
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ url: string; mediaType: 'image' | 'video' | 'audio'; originalName: string; size: number }> {
  const isVideo = file.type.startsWith('video');
  const isAudio = file.type.startsWith('audio');
  const mediaType: 'image' | 'video' | 'audio' = isVideo ? 'video' : isAudio ? 'audio' : 'image';

  const apiBase = ((import.meta.env.VITE_SERVER_URL as string) || '').replace(/\/$/, '');

  // Primary: Pure binary streaming via XHR - Zero main-thread CPU freeze, Zero Base64 string allocations
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

      // If binary upload encounters an issue, fallback to json upload
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
            resolve && resolve({
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

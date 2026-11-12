// Client-side automatic country & flag detection based on Timezone & Locale

export interface DetectedCountry {
  flag: string;
  name: string;
  code: string;
}

export function detectRealCountry(): DetectedCountry {
  try {
    const tz = (Intl.DateTimeFormat().resolvedOptions().timeZone || '').toLowerCase();
    const lang = (navigator.language || '').toLowerCase();

    // 1. Timezone-based exact detection
    if (tz.includes('riyadh')) return { flag: '🇸🇦', name: 'المملكة العربية السعودية', code: 'SA' };
    if (tz.includes('cairo')) return { flag: '🇪🇬', name: 'جمهورية مصر العربية', code: 'EG' };
    if (tz.includes('baghdad')) return { flag: '🇮🇶', name: 'جمهورية العراق', code: 'IQ' };
    if (tz.includes('damascus')) return { flag: '🇸🇾', name: 'الجمهورية العربية السورية', code: 'SY' };
    if (tz.includes('aden') || tz.includes('sanaa')) return { flag: '🇾🇪', name: 'الجمهورية اليمنية', code: 'YE' };
    if (tz.includes('kuwait')) return { flag: '🇰🇼', name: 'دولة الكويت', code: 'KW' };
    if (tz.includes('dubai') || tz.includes('abu_dhabi')) return { flag: '🇦🇪', name: 'الإمارات العربية المتحدة', code: 'AE' };
    if (tz.includes('algiers')) return { flag: '🇩🇿', name: 'الجمهورية الجزائرية', code: 'DZ' };
    if (tz.includes('casablanca')) return { flag: '🇲🇦', name: 'المملكة المغربية', code: 'MA' };
    if (tz.includes('amman')) return { flag: '🇯🇴', name: 'المملكة الأردنية الهاشمية', code: 'JO' };
    if (tz.includes('muscat')) return { flag: '🇴🇲', name: 'سلطنة عمان', code: 'OM' };
    if (tz.includes('qatar')) return { flag: '🇶🇦', name: 'دولة قطر', code: 'QA' };
    if (tz.includes('bahrain')) return { flag: '🇧🇭', name: 'مملكة البحرين', code: 'BH' };
    if (tz.includes('tunis')) return { flag: '🇹🇳', name: 'الجمهورية التونسية', code: 'TN' };
    if (tz.includes('tripoli')) return { flag: '🇱🇾', name: 'دولة ليبيا', code: 'LY' };
    if (tz.includes('khartoum')) return { flag: '🇸🇩', name: 'جمهورية السودان', code: 'SD' };
    if (tz.includes('beirut')) return { flag: '🇱🇧', name: 'الجمهورية اللبنانية', code: 'LB' };
    if (tz.includes('gaza') || tz.includes('hebron') || tz.includes('jerusalem')) return { flag: '🇵🇸', name: 'دولة فلسطين', code: 'PS' };
    if (tz.includes('london')) return { flag: '🇬🇧', name: 'المملكة المتحدة', code: 'GB' };
    if (tz.includes('new_york') || tz.includes('chicago') || tz.includes('los_angeles')) return { flag: '🇺🇸', name: 'الولايات المتحدة الأمريكية', code: 'US' };
    if (tz.includes('toronto') || tz.includes('vancouver')) return { flag: '🇨🇦', name: 'كندا', code: 'CA' };
    if (tz.includes('istanbul')) return { flag: '🇹🇷', name: 'تركيا', code: 'TR' };
    if (tz.includes('berlin')) return { flag: '🇩🇪', name: 'ألمانيا', code: 'DE' };
    if (tz.includes('paris')) return { flag: '🇫🇷', name: 'فرنسا', code: 'FR' };

    // 2. Language/Locale match
    if (lang.includes('sa')) return { flag: '🇸🇦', name: 'المملكة العربية السعودية', code: 'SA' };
    if (lang.includes('eg')) return { flag: '🇪🇬', name: 'مصر', code: 'EG' };
    if (lang.includes('iq')) return { flag: '🇮🇶', name: 'العراق', code: 'IQ' };
    if (lang.includes('sy')) return { flag: '🇸🇾', name: 'سوريا', code: 'SY' };
    if (lang.includes('ye')) return { flag: '🇾🇪', name: 'اليمن', code: 'YE' };
    if (lang.includes('kw')) return { flag: '🇰🇼', name: 'الكويت', code: 'KW' };
    if (lang.includes('ae')) return { flag: '🇦🇪', name: 'الإمارات', code: 'AE' };
    if (lang.includes('dz')) return { flag: '🇩🇿', name: 'الجزائر', code: 'DZ' };
    if (lang.includes('ma')) return { flag: '🇲🇦', name: 'المغرب', code: 'MA' };
    if (lang.includes('jo')) return { flag: '🇯🇴', name: 'الأردن', code: 'JO' };
    if (lang.includes('om')) return { flag: '🇴🇲', name: 'عمان', code: 'OM' };
    if (lang.includes('qa')) return { flag: '🇶🇦', name: 'قطر', code: 'QA' };
    if (lang.includes('bh')) return { flag: '🇧🇭', name: 'البحرين', code: 'BH' };
    if (lang.includes('tn')) return { flag: '🇹🇳', name: 'تونس', code: 'TN' };
    if (lang.includes('ly')) return { flag: '🇱🇾', name: 'ليبيا', code: 'LY' };
    if (lang.includes('sd')) return { flag: '🇸🇩', name: 'السودان', code: 'SD' };
    if (lang.includes('lb')) return { flag: '🇱🇧', name: 'لبنان', code: 'LB' };

    return { flag: '🇸🇦', name: 'المملكة العربية السعودية', code: 'SA' };
  } catch {
    return { flag: '🇸🇦', name: 'المملكة العربية السعودية', code: 'SA' };
  }
}

// Arabic country name resolver from flag
export function getCountryNameFromFlag(flag?: string): string {
  if (!flag) return '';
  const clean = flag.trim();
  const map: Record<string, string> = {
    '🇸🇦': 'السعودية',
    '🇪🇬': 'مصر',
    '🇾🇪': 'اليمن',
    '🇮🇶': 'العراق',
    '🇸🇾': 'سوريا',
    '🇩🇿': 'الجزائر',
    '🇲🇦': 'المغرب',
    '🇦🇪': 'الإمارات',
    '🇰🇼': 'الكويت',
    '🇯🇴': 'الأردن',
    '🇴🇲': 'عمان',
    '🇶🇦': 'قطر',
    '🇧🇭': 'البحرين',
    '🇹🇳': 'تونس',
    '🇱🇾': 'ليبيا',
    '🇸🇩': 'السودان',
    '🇱🇧': 'لبنان',
    '🇵🇸': 'فلسطين',
    '🇹🇷': 'تركيا',
    '🇬🇧': 'بريطانيا',
    '🇺🇸': 'أمريكا',
    '🇩🇪': 'ألمانيا',
    '🇫🇷': 'فرنسا',
    '🇨🇦': 'كندا',
    '👑': 'الإدارة',
    '🦅': 'الصقور',
    '⭐': 'VIP'
  };
  return map[clean] || '';
}

// Helper: 32-bit FNV-1a hash encoded in base36 (compact alphanumeric like 6wcphf)
function hashBase36(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

function getCanvasFingerprintHash(): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 60;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'nocnv';
    ctx.textBaseline = 'top';
    ctx.font = '14px "Arial", "Cairo", sans-serif';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('HassanPro🦅2026!@#', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('HassanPro🦅2026!@#', 4, 17);
    ctx.beginPath();
    ctx.arc(50, 40, 12, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill();
    return hashBase36(canvas.toDataURL());
  } catch {
    return 'cnverr';
  }
}

function getWebGLFingerprintHash(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) return 'nowgl';
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
    const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const maxVp = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
    const exts = (gl.getSupportedExtensions() || []).slice(0, 12).join(',');
    return hashBase36(`${vendor}|${renderer}|${maxTex}|${maxVp}|${exts}`);
  } catch {
    return 'wglerr';
  }
}

function getAudioHardwareHash(): string {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return 'noaud';
    const ctx = new AudioCtx();
    const props = `${ctx.sampleRate}|${ctx.destination?.maxChannelCount || 2}|${ctx.baseLatency || 0}`;
    try {
      ctx.close();
    } catch {}
    return hashBase36(props);
  } catch {
    return 'auderr';
  }
}

// Probe OS-level installed system fonts (identical across Chrome, Firefox, Edge, Samsung, Opera on the same device)
function getInstalledSystemFontsHash(): string {
  try {
    if (typeof document === 'undefined' || !document.body) return 'nofonts';
    const baseFonts = ['monospace', 'sans-serif', 'serif'];
    const testFonts = [
      'Roboto', 'Noto Sans Arabic', 'Droid Sans', 'SamsungOne', 'MIUI',
      'San Francisco', 'Helvetica Neue', 'Segoe UI', 'Tahoma', 'Arial',
      'Courier New', 'Georgia', 'Times New Roman', 'Verdana', 'Trebuchet MS',
      'Impact', 'Comic Sans MS', 'Palatino', 'Garamond', 'Bookman',
      'Apple Color Emoji', 'Noto Color Emoji', 'Segoe UI Emoji', 'DejaVu Sans'
    ];
    const span = document.createElement('span');
    span.style.position = 'absolute';
    span.style.left = '-9999px';
    span.style.top = '-9999px';
    span.style.fontSize = '72px';
    span.style.lineHeight = 'normal';
    span.textContent = 'mmmmmmmmmmlli1234567890ابجدهوز';
    document.body.appendChild(span);

    const defaultWidths: Record<string, number> = {};
    for (const base of baseFonts) {
      span.style.fontFamily = base;
      defaultWidths[base] = span.offsetWidth;
    }

    let detectedMask = '';
    for (const font of testFonts) {
      let matched = false;
      for (const base of baseFonts) {
        span.style.fontFamily = `'${font}', ${base}`;
        if (span.offsetWidth !== defaultWidths[base]) {
          matched = true;
          break;
        }
      }
      detectedMask += matched ? '1' : '0';
    }
    document.body.removeChild(span);
    return hashBase36(detectedMask);
  } catch {
    return 'fonterr';
  }
}

// Pure Cross-Browser Hardware & OS Signature (GPU Chip + WebGL Limits + Screen + CPU + Timezone + OS Fonts)
function getCrossBrowserHardwareHash(): string {
  try {
    let gpuInfo = 'nogpu';
    try {
      const canvas = document.createElement('canvas');
      const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
      if (gl) {
        const dbg = gl.getExtension('WEBGL_debug_renderer_info');
        const vendor = dbg ? String(gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) || '') : String(gl.getParameter(gl.VENDOR) || '');
        const renderer = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '') : String(gl.getParameter(gl.RENDERER) || '');
        const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 0;
        const maxRb = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) || 0;
        const maxVa = gl.getParameter(gl.MAX_VERTEX_ATTRIBS) || 0;
        const maxComb = gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS) || 0;
        gpuInfo = `${vendor.trim()}|${renderer.trim()}|${maxTex}|${maxRb}|${maxVa}|${maxComb}`;
      }
    } catch {}

    const screenGeom = `${window.screen?.width || 0}x${window.screen?.height || 0}x${window.screen?.colorDepth || 24}@${window.devicePixelRatio || 1}|${navigator.maxTouchPoints || 0}`;
    const cpuCores = navigator.hardwareConcurrency || 4;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const fontsHash = getInstalledSystemFontsHash();

    return hashBase36(`${gpuInfo}||${screenGeom}||${cpuCores}||${tz}||${fontsHash}`);
  } catch {
    return 'hwerr';
  }
}

function getOrCreatePersistentDeviceId(): string {
  const STORAGE_KEY = 'soqoor_dev_uid';
  let uid = '';
  try {
    uid = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY) || '';
  } catch {}

  if (!uid) {
    try {
      const match = document.cookie.match(new RegExp('(?:^|; )' + STORAGE_KEY + '=([^;]*)'));
      if (match && match[1]) uid = decodeURIComponent(match[1]);
    } catch {}
  }

  if (!uid) {
    const rand = Math.floor(0x10000000 + Math.random() * 0xefffffff).toString(16);
    const timePart = (Date.now() & 0xffff).toString(16).padStart(4, '0');
    uid = `${rand.slice(0, 4)}${timePart}`.toLowerCase();
  }

  try {
    localStorage.setItem(STORAGE_KEY, uid);
    sessionStorage.setItem(STORAGE_KEY, uid);
  } catch {}
  try {
    document.cookie = `${STORAGE_KEY}=${encodeURIComponent(uid)}; max-age=315360000; path=/; SameSite=Lax`;
  } catch {}
  try {
    if (typeof indexedDB !== 'undefined') {
      const req = indexedDB.open('soqoor_fp_db', 1);
      req.onupgradeneeded = () => {
        try {
          req.result.createObjectStore('fp');
        } catch {}
      };
      req.onsuccess = () => {
        try {
          const db = req.result;
          const tx = db.transaction('fp', 'readwrite');
          const store = tx.objectStore('fp');
          const getReq = store.get(STORAGE_KEY);
          getReq.onsuccess = () => {
            if (getReq.result && typeof getReq.result === 'string' && getReq.result !== uid) {
              try {
                localStorage.setItem(STORAGE_KEY, getReq.result);
                sessionStorage.setItem(STORAGE_KEY, getReq.result);
              } catch {}
            } else {
              store.put(uid, STORAGE_KEY);
            }
          };
        } catch {}
      };
    }
  } catch {}

  return uid;
}

let cachedFingerprintResult: {
  fingerprintId: string;
  hardwareString: string;
  osType: string;
} | null = null;

// Generate unique device/phone hardware fingerprint (بصمة الهاتف والجهاز)
export function generateDeviceFingerprint(): {
  fingerprintId: string;
  hardwareString: string;
  osType: string;
} {
  if (cachedFingerprintResult) return cachedFingerprintResult;
  try {
    const ua = navigator.userAgent || '';
    const lowerUa = ua.toLowerCase();
    const screenRes = `${window.screen?.width || 360}x${window.screen?.height || 640}@${window.screen?.colorDepth || 24}`;
    const touchPoints = navigator.maxTouchPoints || 0;
    const memory = (navigator as any).deviceMemory || 'auto';
    const cores = navigator.hardwareConcurrency || 4;
    const platform = navigator.platform || 'Linux';
    const lang = navigator.language || 'ar';
    const langs = (navigator.languages || [lang]).join(',');
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Riyadh';

    let osShort = 'Linux';
    let osType = 'هاتف ذكي';
    if (lowerUa.includes('iphone')) {
      osShort = 'iOS';
      osType = 'iPhone (iOS)';
    } else if (lowerUa.includes('ipad')) {
      osShort = 'iPadOS';
      osType = 'iPad (iPadOS)';
    } else if (lowerUa.includes('samsung')) {
      osShort = 'Android';
      osType = 'Samsung Galaxy (Android)';
    } else if (lowerUa.includes('xiaomi') || lowerUa.includes('redmi')) {
      osShort = 'Android';
      osType = 'Xiaomi (Android)';
    } else if (lowerUa.includes('huawei') || lowerUa.includes('honor')) {
      osShort = 'Android';
      osType = 'Huawei (Android)';
    } else if (lowerUa.includes('android')) {
      osShort = 'Android';
      osType = 'هاتف أندرويد (Android)';
    } else if (lowerUa.includes('windows')) {
      osShort = 'Windows';
      osType = 'كمبيوتر (Windows)';
    } else if (lowerUa.includes('mac')) {
      osShort = 'MacOS';
      osType = 'ماك (Macintosh)';
    } else if (lowerUa.includes('linux')) {
      osShort = 'Linux';
      osType = 'لينكس (Linux)';
    }

    let browserShort = 'Chrome';
    if (lowerUa.includes('edg/')) browserShort = 'Edge';
    else if (lowerUa.includes('opr/') || lowerUa.includes('opera')) browserShort = 'Opera';
    else if (lowerUa.includes('samsungbrowser')) browserShort = 'Samsung';
    else if (lowerUa.includes('firefox') || lowerUa.includes('fxios')) browserShort = 'Firefox';
    else if (lowerUa.includes('safari') && !lowerUa.includes('chrome') && !lowerUa.includes('crios')) browserShort = 'Safari';

    const canvasHash = getCanvasFingerprintHash();
    const webglHash = getWebGLFingerprintHash();
    const audioHash = getAudioHardwareHash();
    const localeFontsHash = hashBase36(`${tz}|${langs}|${platform}|${memory}`);
    const screenHash = hashBase36(`${screenRes}|${window.devicePixelRatio || 1}|${touchPoints}`);
    const crossBrowserHwHash = getCrossBrowserHardwareHash();
    const persistentUid = getOrCreatePersistentDeviceId();

    const fingerprintId = `${osShort}|${cores}||${canvasHash}|${webglHash}|${audioHash}|${localeFontsHash}|${screenHash}|${crossBrowserHwHash}|${persistentUid}.${browserShort}`;
    try {
      localStorage.setItem('soqoor_phone_fp_id', fingerprintId);
    } catch {}

    const hardwareString = `${osType} • الشاشة: ${screenRes} • اللمس: ${touchPoints > 0 ? 'نعم' : 'لا'} • معالج: ${cores} نوى`;
    cachedFingerprintResult = {
      fingerprintId,
      hardwareString,
      osType
    };
    return cachedFingerprintResult;
  } catch {
    const fallback = 'Linux|4||000000|000000|000000|000000|000000|' + Math.random().toString(36).substring(2, 10) + '.Chrome';
    return {
      fingerprintId: fallback,
      hardwareString: 'هاتف ذكي',
      osType: 'هاتف ذكي'
    };
  }
}

// Detect incognito / private browsing mode (كشف وضع التصفح المتخفي عتادياً)
export async function detectIncognitoMode(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    // 1. Chrome / Chromium storage quota check (in incognito, quota is capped to <= 120MB or < 300MB)
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const { quota } = await navigator.storage.estimate();
      if (quota && quota < 300 * 1024 * 1024) {
        return true;
      }
    }
  } catch {}

  try {
    // 2. Safari private browsing
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    if (isSafari && typeof (window as any).openDatabase === 'function') {
      try {
        (window as any).openDatabase(null, null, null, null);
      } catch {
        return true;
      }
    }
  } catch {}

  try {
    // 3. Firefox private browsing
    const isFirefox = /Firefox/.test(navigator.userAgent);
    if (isFirefox && typeof indexedDB !== 'undefined') {
      const db = indexedDB.open('__test_incognito_probe__');
      return new Promise<boolean>((resolve) => {
        db.onerror = () => resolve(true);
        db.onsuccess = () => {
          try {
            db.result.close();
            indexedDB.deleteDatabase('__test_incognito_probe__');
          } catch {}
          resolve(false);
        };
      });
    }
  } catch {}

  return false;
}

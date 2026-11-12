import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { dataManager } from './server/data/dataAdapter.ts';
import { storageManager } from './server/storage/storageAdapter.ts';
import {
  DEFAULT_EMBLEMS,
  DEFAULT_FALCON_CHAT_BANNER,
  DEFAULT_FALCON_AVATAR_ICON
} from './src/utils/emblemsSystem.ts';
import type {
  EmblemItem,
  EmblemType,
  EmblemsConfig,
  EmojiSizeSetting
} from './src/utils/emblemsSystem.ts';
import { extractYouTubeVideoId } from './src/utils/youtube.ts';
import { socketFloodGuard } from './server/security/floodGuard.ts';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', 1);

// Production, Security, and Cross-Origin Headers
const allowedOrigins = new Set(
  [process.env.CORS_ORIGIN, process.env.FRONTEND_URL, process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined]
    .filter((origin): origin is string => Boolean(origin))
    .map((origin) => origin.replace(/\/$/, ''))
);

app.use((req, res, next) => {
  const requestOrigin = req.headers.origin;
  if (requestOrigin) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-filename, x-mime-type, x-mediatype');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

const httpServer = createServer(app);

// Keep-Alive connection tuning for reverse proxy and WebSocket persistence (up to 5+ minutes continuous persistence)
httpServer.keepAliveTimeout = 310000;
httpServer.headersTimeout = 320000;

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: (origin, callback) => {
      // In production and dev, allow all legitimate browser origins (including Cloud Run, local, preview domains)
      return callback(null, true);
    },
    methods: ['GET', 'POST'],
    credentials: true
  },
  maxHttpBufferSize: 50 * 1024 * 1024, // 50MB buffer
  pingTimeout: 60000, // 60s keep-alive timeout tolerance
  pingInterval: 8000, // 8s fast heartbeat to prevent mobile carrier NAT / Render proxy drops
  connectTimeout: 45000,
  upgradeTimeout: 30000,
  allowUpgrades: true,
  perMessageDeflate: false, // Low latency and minimal CPU overhead for high concurrency
  httpCompression: true,
  allowEIO3: true,
  transports: ['websocket', 'polling']
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // Serve media from the same persistent directory used by StorageManager.
  const uploadsDir = process.env.UPLOADS_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH
    || path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir, { maxAge: '7d', etag: true }));

function toPublicMediaUrl(url: string, req?: express.Request): string {
  if (!url) return url;
  if (url.includes('localhost:3000') || url.includes('127.0.0.1:3000')) {
    url = url.replace(/^https?:\/\/(localhost|127\.0\.0\.1):3000/i, '');
  }
  if (/^https?:\/\//i.test(url)) return url;
  const configuredOrigin = process.env.PUBLIC_SERVER_URL || process.env.SERVER_PUBLIC_URL || process.env.STORAGE_PUBLIC_URL_PREFIX;
  if (configuredOrigin) {
    const origin = configuredOrigin.replace(/\/$/, '');
    return `${origin}${url.startsWith('/') ? url : `/${url}`}`;
  }
  return url.startsWith('/') ? url : `/${url}`;
}

// Ultra-lightweight keepalive endpoint for background Web Worker to keep mobile TCP radio alive
app.get('/api/keepalive', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Connection', 'keep-alive');
  res.status(200).json({ ok: true, ts: Date.now() });
});

// Storage & Database Health / Status Endpoint
app.get('/api/system/storage-status', (_req, res) => {
  res.json({
    success: true,
    data: dataManager.getStatus(),
    storage: {
      provider: storageManager.getProviderName(),
      isExternal: storageManager.isExternal(),
      endpoint: storageManager.getConfig().endpoint || 'local filesystem',
      bucket: storageManager.getConfig().bucket || 'uploads'
    }
  });
});

// YouTube Search API Endpoint (البحث المباشر في يوتيوب عبر واجهة InnerTube الرسمية بدون أخطاء الترويسات)
app.get('/api/youtube-search', async (req, res) => {
  const query = (req.query.q as string)?.trim();
  if (!query) {
    return res.status(400).json({ success: false, results: [], error: 'يرجى إدخال كلمة البحث' });
  }

  try {
    // Primary Engine: YouTube InnerTube API (JSON-only, no cookie header overflow, high speed)
    const ytResponse = await fetch('https://www.youtube.com/youtubei/v1/search?prettyPrint=false', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'WEB',
            clientVersion: '2.20240201.00.00',
            hl: 'ar',
            gl: 'SA'
          }
        },
        query
      })
    });

    if (ytResponse.ok) {
      const data = (await ytResponse.json()) as any;
      const sections = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
      const formatted: Array<{
        id: string;
        title: string;
        thumbnail: string;
        duration: string;
        channelTitle: string;
        views: string;
        uploadedAt: string;
        url: string;
      }> = [];

      for (const sec of sections) {
        const items = sec.itemSectionRenderer?.contents || [];
        for (const item of items) {
          if (item.videoRenderer) {
            const v = item.videoRenderer;
            const videoId = v.videoId;
            if (videoId && typeof videoId === 'string') {
              const title =
                v.title?.runs?.map((r: any) => r.text).join('') ||
                v.title?.simpleText ||
                query;
              const thumbnail =
                v.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
                `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
              const duration = v.lengthText?.simpleText || '';
              const channelTitle =
                v.ownerText?.runs?.map((r: any) => r.text).join('') ||
                'قناة يوتيوب';
              const views =
                v.viewCountText?.simpleText ||
                (v.viewCountText?.runs ? v.viewCountText.runs.map((r: any) => r.text).join('') : '');
              const uploadedAt = v.publishedTimeText?.simpleText || '';

              formatted.push({
                id: videoId,
                title,
                thumbnail,
                duration,
                channelTitle,
                views,
                uploadedAt,
                url: `https://www.youtube.com/watch?v=${videoId}`
              });
            }
          }
        }
      }

      if (formatted.length > 0) {
        return res.json({ success: true, results: formatted.slice(0, 25) });
      }
    }

    // Fallback Engine: Invidious public mirror
    const invidiousRes = await fetch(`https://inv.tux.pizza/api/v1/search?q=${encodeURIComponent(query)}&type=video`, {
      headers: { 'Accept': 'application/json' }
    });
    if (invidiousRes.ok) {
      const invData = (await invidiousRes.json()) as any[];
      if (Array.isArray(invData) && invData.length > 0) {
        const invResults = invData.slice(0, 20).map((v) => ({
          id: v.videoId || '',
          title: v.title || query,
          thumbnail: v.videoThumbnails?.[0]?.url || `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`,
          duration: v.lengthSeconds ? `${Math.floor(v.lengthSeconds / 60)}:${String(v.lengthSeconds % 60).padStart(2, '0')}` : '',
          channelTitle: v.author || 'قناة يوتيوب',
          views: v.viewCount ? `${v.viewCount.toLocaleString()} مشاهدة` : '',
          uploadedAt: v.publishedText || '',
          url: `https://www.youtube.com/watch?v=${v.videoId}`
        })).filter(v => Boolean(v.id));

        if (invResults.length > 0) {
          return res.json({ success: true, results: invResults });
        }
      }
    }

    return res.json({ success: true, results: [] });
  } catch (err: any) {
    console.error('[YouTube Search] Search error handled safely:', err?.message);
    return res.json({
      success: true,
      results: [],
      warning: 'تعذر الاتصال بخدمة البحث مؤقتاً، يمكنك لصق رابط الفيديو مباشرة في الحائط.'
    });
  }
});

// HTTP Media Upload Endpoint: Bypasses WebSocket frames to prevent socket freeze/disconnect
app.post('/api/upload-media-binary', async (req, res) => {
  try {
    const rawFilename = req.headers['x-filename'] ? decodeURIComponent(req.headers['x-filename'] as string) : 'file';
    const mediaTypeHeader = (req.headers['x-mediatype'] as string) || '';
    const mime = (req.headers['content-type'] || '').toLowerCase();

    const uploadResult = await storageManager.saveStream(req, rawFilename, mime);

    return res.json({
      success: uploadResult.success,
      url: toPublicMediaUrl(uploadResult.url, req),
      mediaType: uploadResult.mediaType,
      size: uploadResult.size,
      filename: uploadResult.filename,
      provider: uploadResult.provider
    });
  } catch (err: any) {
    console.error('Error in binary upload:', err);
    return res.status(500).json({ success: false, error: 'فشل حفظ الملف على الخادم أو التخزين السحابي' });
  }
});

app.post('/api/upload-media', async (req, res) => {
  try {
    const { dataUrl, filename, mediaType } = req.body;
    if (!dataUrl) {
      return res.status(400).json({ success: false, error: 'بيانات الملف مفقودة' });
    }

    const matches = dataUrl.match(/^data:([A-Za-z0-9-+\/]+);base64,(.+)$/);
    let buffer: Buffer;
    let mime = '';

    if (matches && matches.length === 3) {
      mime = matches[1].toLowerCase();
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(dataUrl, 'base64');
    }

    const originalFilename = filename || `file_${Date.now()}`;
    const uploadResult = await storageManager.saveBuffer(buffer, originalFilename, mime);

    return res.json({
      success: uploadResult.success,
      url: toPublicMediaUrl(uploadResult.url, req),
      mediaType: mediaType || uploadResult.mediaType,
      size: uploadResult.size,
      filename: uploadResult.filename,
      provider: uploadResult.provider
    });
  } catch (err: any) {
    console.error('Error saving uploaded media:', err);
    return res.status(500).json({ success: false, error: 'فشل حفظ الملف على الخادم أو التخزين السحابي' });
  }
});

/**
 * Server-side security & payload minimization:
 * Automatically decodes and converts any incoming data: URL / Base64 into a local /uploads file,
 * strictly guaranteeing that Socket.IO message payloads contain only tiny URL strings (<1KB).
 */
export async function ensureMediaUrlNotBase64(url: string | undefined): Promise<string | undefined> {
  if (!url || typeof url !== 'string') return url;
  if (!url.startsWith('data:')) return url;

  try {
    const matches = url.match(/^data:([A-Za-z0-9-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return url;

    const mime = matches[1].toLowerCase();
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    let ext = 'bin';
    if (mime.includes('png')) ext = 'png';
    else if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
    else if (mime.includes('gif')) ext = 'gif';
    else if (mime.includes('webp')) ext = 'webp';
    else if (mime.includes('webm')) ext = 'webm';
    else if (mime.includes('mp4')) ext = 'mp4';
    else if (mime.includes('ogg') || mime.includes('audio') || mime.includes('wav')) ext = 'wav';

    const filename = `media_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.${ext}`;

    // Upload via storageManager (which uses Cloudinary when configured)
    const uploadResult = await storageManager.saveBuffer(buffer, filename, mime);
    if (uploadResult && uploadResult.success && uploadResult.url) {
      return uploadResult.url;
    }

    // Fallback: only if external cloud storage failed or unconfigured, write locally
    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, buffer);
    return `/uploads/${filename}`;
  } catch (err) {
    console.warn('Failed to sanitize base64 media to storage:', err);
    return url;
  }
}

// XSS Sanitizer helper
function sanitizeText(str?: string | null): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .trim();
}

/**
 * URL Sanitizer to prevent malicious URI execution (javascript:, vbscript:, data:text/html)
 */
export function sanitizeUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (/^(javascript|vbscript|data:\s*text\/html)/i.test(trimmed)) {
    return '';
  }
  return trimmed;
}

/**
 * Robust Password Hashing and Verification using bcrypt (10 salt rounds)
 * With zero-downtime backwards compatibility and automated migration for legacy plain text passwords.
 */
export function hashPassword(plainPassword: string): string {
  if (!plainPassword) return '';
  // Avoid re-hashing if already a bcrypt hash
  if (plainPassword.startsWith('$2a$') || plainPassword.startsWith('$2b$')) {
    return plainPassword;
  }
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(plainPassword, salt);
}

export function verifyPassword(plainPassword: string, storedHashOrPlain: string): boolean {
  if (!plainPassword || !storedHashOrPlain) return false;
  // If stored credential is a standard bcrypt hash
  if (storedHashOrPlain.startsWith('$2a$') || storedHashOrPlain.startsWith('$2b$')) {
    try {
      return bcrypt.compareSync(plainPassword, storedHashOrPlain);
    } catch {
      return false;
    }
  }
  // Graceful fallback for legacy passwords (e.g. initial '123')
  return plainPassword === storedHashOrPlain;
}

export interface StoredMessage {
  id: string;
  room: string;
  username: string;
  avatarUrl?: string;
  nameBannerUrl?: string;
  flag?: string;
  badge?: string;
  badgeColor?: string;
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'sticker' | 'audio';
  voiceNote?: {
    audioUrl: string;
    duration: number;
  };
  replyTo?: {
    id: string;
    username: string;
    text: string;
    mediaUrl?: string;
  };
  time: string;
  timestamp: number;
  reactions?: Record<string, number>;
  nameColor?: string;
  textColor?: string;
  nameGradient?: string;
  giftBadges?: string[];
  isGiftAnnouncement?: boolean;
  giftInfo?: {
    fromUsername: string;
    toUsername: string;
    giftTitle: string;
    giftUrl: string;
    giftMessage?: string;
  };
  isEdited?: boolean;
  isDeleted?: boolean;
  deletedBy?: string;
  deletedByRole?: string;
}

export interface ConnectedUser {
  id: string;
  username: string;
  room: string;
  avatarSeed: string;
  avatarUrl?: string;
  statusQuote: string;
  flag: string;
  role: 'hassan' | 'admin' | 'super' | 'member' | 'guest' | string;
  likes: number;
  points: number;
  isVoice: boolean;
  micSlot: number | null; // 1 to 5, or null
  isMuted: boolean;
  isTextMuted: boolean;
  isSpeaking: boolean;
  presenceState?: 'online' | 'away' | 'offline'; // Green dot (online), Yellow dot (away/background), Gray dot (offline)
  ipAddress?: string;
  ip?: string;
  deviceInfo?: string;
  deviceFingerprint?: string;
  honorBadge?: string;
  nameColor?: string;
  textColor?: string;
  nameGradient?: string;
  profileBg?: string;
  theme?: string;
  fontFamily?: string;
  wallpaper?: string;
  bubbleStyle?: string;
  fontSize?: string;
  nameBannerUrl?: string; // رابط البنر / السوابر المصور للعضو بمقاس 500x50 كبديل لاسمه
  giftBadges?: string[]; // قائمة أيقونات الهدايا والأوسمة التكريمية بجانب الاسم
  isPmDisabled?: boolean;
  isGhost?: boolean; // حالة الدخول المخفي / المتخفي
  isIncognito?: boolean; // وضع التصفح المتخفي
  isJailed?: boolean;
  joinedAt: number;
  sessionToken?: string;
  lastActiveTime?: number;
  engagement?: MemberEngagement;
}

export interface MemberEngagement {
  activeTimeMinutes: number;
  messagesSent: number;
  wallPostsCount: number;
  micTimeMinutes: number;
  starsLevel: number; // 0 to 5
  progressPercent: number; // 0 to 100
}

export function getDefaultEngagement(): MemberEngagement {
  return {
    activeTimeMinutes: 0,
    messagesSent: 0,
    wallPostsCount: 0,
    micTimeMinutes: 0,
    starsLevel: 0,
    progressPercent: 0
  };
}

export function calculateEngagementStars(eng: MemberEngagement): { starsLevel: number; progressPercent: number } {
  const score = (eng.activeTimeMinutes * 0.5) + (eng.messagesSent * 2) + (eng.wallPostsCount * 8) + (eng.micTimeMinutes * 3);
  let level = 0;
  let progress = 0;
  if (score < 30) {
    level = score / 30;
    progress = Math.min(100, Math.round((score / 30) * 100));
  } else if (score < 100) {
    level = 1 + (score - 30) / 70;
    progress = Math.min(100, Math.round(((score - 30) / 70) * 100));
  } else if (score < 250) {
    level = 2 + (score - 100) / 150;
    progress = Math.min(100, Math.round(((score - 100) / 150) * 100));
  } else if (score < 500) {
    level = 3 + (score - 250) / 250;
    progress = Math.min(100, Math.round(((score - 250) / 250) * 100));
  } else if (score < 1000) {
    level = 4 + (score - 500) / 500;
    progress = Math.min(100, Math.round(((score - 500) / 500) * 100));
  } else {
    level = 5;
    progress = 100;
  }
  return {
    starsLevel: Math.min(5, Math.max(0, Math.round(level * 10) / 10)),
    progressPercent: progress
  };
}

export interface StoryComment {
  id: string;
  username: string;
  avatarUrl?: string;
  nameBannerUrl?: string;
  text: string;
  time: string;
  timestamp: number;
}

export interface StoryItem {
  id: string;
  username: string;
  avatarUrl?: string;
  nameBannerUrl?: string;
  flag?: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
  createdAt: number;
  time: string;
  likes: number;
  likedUsers?: string[];
  comments?: StoryComment[];
}

export interface UserSession {
  sessionToken: string;
  user: ConnectedUser;
  currentSocketId: string;
  lastActiveTime: number;
  isExplicitlyLoggedOut: boolean;
}

export interface RecentLoginEntry {
  username: string;
  avatarUrl?: string;
  avatar?: string;
  nameBannerUrl?: string;
  statusQuote?: string;
  flag: string;
  room: string;
  role: string;
  timestamp: number;
  time: string;
}

let recentLogins: RecentLoginEntry[] = [];

function saveRecentLogins() {
  try {
    dataManager.saveRecentLogins(recentLogins);
  } catch (err) {
    console.error('[Data Layer] Error saving recent logins:', err);
  }
}

function loadRecentLogins() {
  try {
    const data = dataManager.loadRecentLoginsSync<RecentLoginEntry[]>([]);
    if (Array.isArray(data) && data.length > 0) {
      recentLogins = data.slice(0, 10);
    }
  } catch (err) {
    console.error('[Data Layer] Error loading recent logins:', err);
  }
}
loadRecentLogins();

function getDefaultStatusByRole(role?: string): string {
  const r = (role || '').toLowerCase();
  if (r === 'hassan') return '🦅 إدارة عليا • شات حسان برو';
  if (r === 'admin') return '👑 مدير النظام • الإدارة العامة';
  if (r === 'super') return '🛡️ مشرف سوبر • طاقم الإشراف';
  if (r === 'member') return '🎖️ عضو معتمد في حسان برو';
  return '👤 زائر في شات حسان برو';
}

function recordRecentLogin(entry: RecentLoginEntry) {
  const member = getRegisteredMember(entry.username)?.member;
  const user = users.find((u) => u.username.toLowerCase() === entry.username.toLowerCase());
  const resolvedRole = entry.role || user?.role || member?.role || 'member';
  const rawQuote = entry.statusQuote || user?.statusQuote || member?.statusQuote;
  const resolvedQuote = (rawQuote && rawQuote.trim() && rawQuote.trim() !== 'عضو جديد' && rawQuote.trim() !== '..')
    ? rawQuote.trim()
    : getDefaultStatusByRole(resolvedRole);

  const enrichedEntry: RecentLoginEntry = {
    ...entry,
    avatarUrl: entry.avatarUrl || entry.avatar || user?.avatarUrl || member?.avatarUrl,
    avatar: entry.avatar || entry.avatarUrl || user?.avatarUrl || member?.avatarUrl,
    nameBannerUrl: entry.nameBannerUrl || user?.nameBannerUrl || member?.nameBannerUrl,
    statusQuote: resolvedQuote,
    flag: entry.flag || user?.flag || member?.flag || '🇾🇪',
    role: resolvedRole
  };
  recentLogins = [
    enrichedEntry,
    ...recentLogins.filter((e) => e.username.toLowerCase() !== entry.username.toLowerCase())
  ].slice(0, 10);
  saveRecentLogins();
  io.emit('recentLoginsUpdated', getRecentLogins());
}

function getRecentLogins(): RecentLoginEntry[] {
  if (recentLogins.length > 0) {
    return recentLogins.map((e) => {
      const onlineUser = users.find((u) => u.username.toLowerCase() === e.username.toLowerCase());
      const member = getRegisteredMember(e.username)?.member;
      const resolvedRole = onlineUser?.role || member?.role || e.role || 'member';
      const rawQuote = onlineUser?.statusQuote || member?.statusQuote || e.statusQuote;
      const resolvedQuote = (rawQuote && rawQuote.trim() && rawQuote.trim() !== 'عضو جديد' && rawQuote.trim() !== '..')
        ? rawQuote.trim()
        : getDefaultStatusByRole(resolvedRole);
      return {
        ...e,
        avatarUrl: onlineUser?.avatarUrl || member?.avatarUrl || e.avatarUrl || e.avatar,
        avatar: onlineUser?.avatarUrl || member?.avatarUrl || e.avatar || e.avatarUrl,
        nameBannerUrl: onlineUser?.nameBannerUrl ?? member?.nameBannerUrl ?? e.nameBannerUrl,
        statusQuote: resolvedQuote,
        role: resolvedRole
      };
    });
  }
  const entries: RecentLoginEntry[] = [];
  const sortedSessions = Array.from(activeSessions.values())
    .filter((s) => s.user && !s.isExplicitlyLoggedOut)
    .sort((a, b) => (b.lastActiveTime || 0) - (a.lastActiveTime || 0));
  for (const session of sortedSessions) {
    const member = getRegisteredMember(session.user.username)?.member;
    const resolvedRole = session.user.role || member?.role || 'member';
    const rawQuote = session.user.statusQuote || member?.statusQuote;
    const resolvedQuote = (rawQuote && rawQuote.trim() && rawQuote.trim() !== 'عضو جديد' && rawQuote.trim() !== '..')
      ? rawQuote.trim()
      : getDefaultStatusByRole(resolvedRole);
    entries.push({
      username: session.user.username,
      avatarUrl: session.user.avatarUrl || member?.avatarUrl,
      avatar: session.user.avatarUrl || member?.avatarUrl,
      nameBannerUrl: session.user.nameBannerUrl || member?.nameBannerUrl,
      statusQuote: resolvedQuote,
      flag: session.user.flag || '🇾🇪',
      room: session.user.room || 'الغرفة العامة',
      role: resolvedRole,
      timestamp: session.lastActiveTime || Date.now(),
      time: getCurrentTimeString()
    });
    if (entries.length >= 10) break;
  }
  return entries;
}

const activeSessions = new Map<string, UserSession>(); // key: sessionToken
const usernameToSessionMap = new Map<string, string>(); // key: username.toLowerCase() -> sessionToken
const pendingAwayTimers = new Map<string, NodeJS.Timeout>(); // key: username.toLowerCase() -> 2-min presence away timer

// Hydrate existing sessions from Data Layer
try {
  const loadedSessions = dataManager.loadSessionsSync<Record<string, UserSession>>({});
  if (loadedSessions && typeof loadedSessions === 'object') {
    (Object.values(loadedSessions) as UserSession[]).forEach((sess) => {
      if (sess && sess.sessionToken && sess.user && !sess.isExplicitlyLoggedOut) {
        activeSessions.set(sess.sessionToken, sess);
        usernameToSessionMap.set(sess.user.username.toLowerCase(), sess.sessionToken);
      }
    });
  }
} catch (err) {
  console.error('[Data Layer] Error hydrating active sessions:', err);
}

function persistActiveSessions() {
  try {
    const obj: Record<string, UserSession> = {};
    for (const [token, sess] of activeSessions.entries()) {
      if (!sess.isExplicitlyLoggedOut) {
        obj[token] = sess;
      }
    }
    dataManager.saveSessions(obj);
  } catch (err) {
    console.error('[Data Layer] Error persisting active sessions:', err);
  }
}

export interface WallComment {
  id: string;
  username: string;
  avatarUrl?: string;
  nameBannerUrl?: string;
  text: string;
  time: string;
  timestamp: number;
}

export interface WallPost {
  id: string;
  username: string;
  avatarUrl?: string;
  nameBannerUrl?: string;
  flag?: string;
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  category?: 'posts' | 'quick'; // تبويب الحائط: المنشورات أو الدردشة السريعة
  youtubeVideo?: {
    id: string;
    title: string;
    thumbnail?: string;
    channelTitle?: string;
    duration?: string;
    views?: string;
    uploadedAt?: string;
    url?: string;
  };
  time: string;
  likes: number;
  likedUsers?: string[];
  commentsCount: number;
  comments?: WallComment[];
  timestamp: number;
  isEdited?: boolean;
}

export interface PrivateMessage {
  id: string;
  fromId: string;
  fromUsername: string;
  fromAvatar?: string;
  fromNameBannerUrl?: string;
  toId: string;
  toUsername: string;
  toNameBannerUrl?: string;
  text: string;
  mediaUrl?: string;
  voiceNote?: {
    audioUrl: string;
    duration: number;
  };
  replyTo?: {
    id: string;
    username: string;
    text: string;
  };
  isCallNotification?: boolean;
  time: string;
  timestamp: number;
  isEdited?: boolean;
  // Read Receipts:
  status?: 'sent' | 'delivered' | 'read';
  readAt?: number;
  // Self-Destructing:
  selfDestructSeconds?: number;
  selfDestructAt?: number;
}

export interface ChatRoom {
  id: string;
  name: string;
  desc: string;
  isPasswordProtected: boolean;
  password?: string;
  bannerUrl?: string;
  voiceLimit: number;
  activeVoiceCount: number;
}

export interface MonitorEvent {
  id: string;
  type: 'join' | 'leave' | 'mic_take' | 'mic_drop' | 'mic_pull' | 'warn' | 'kick' | 'ban' | 'mute' | 'likes' | 'role' | 'word_filter' | 'security' | 'room' | 'siren' | 'jail';
  description: string;
  actor: string;
  target?: string;
  time: string;
  timestamp: number;
}

// User Role Definition & Hierarchy
export type UserRole = 'admin' | 'super' | 'member' | 'guest' | string;

export interface RoleDefinition {
  id: string;
  name: string;
  level: number;
  badgeColor?: string;
  isSystem?: boolean;
}

export const DEFAULT_ROLES_CONFIG: RoleDefinition[] = [
  { id: 'hassan', name: '🦅 إدارة عليا (hassan)', level: 100000, badgeColor: 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-black font-black shadow-lg', isSystem: true },
  { id: 'admin', name: '👑 مدير النظام (Admin)', level: 100, badgeColor: 'bg-red-600 text-white', isSystem: true },
  { id: 'super', name: '🛡️ سوبر إداري (Super)', level: 75, badgeColor: 'bg-amber-600 text-white', isSystem: true },
  { id: 'member', name: '🎖️ عضو معتمد (Member)', level: 50, badgeColor: 'bg-indigo-600 text-white', isSystem: true },
  { id: 'guest', name: '👤 زائر (Guest)', level: 10, badgeColor: 'bg-slate-600 text-white', isSystem: true }
];

export let rolesConfig: RoleDefinition[] = [...DEFAULT_ROLES_CONFIG];

export function getRoleLevel(roleId?: string): number {
  if (!roleId) return 0;
  const clean = roleId.trim().toLowerCase();
  const found = rolesConfig.find((r) => r.id.toLowerCase() === clean);
  if (found) return found.level;
  if (clean === 'hassan') return 100000;
  if (clean === 'admin') return 100;
  if (clean === 'super') return 75;
  if (clean === 'member') return 50;
  if (clean === 'guest') return 10;
  return 20;
}

export function isSupremeHassan(userOrRole?: { role?: string } | string | null): boolean {
  if (!userOrRole) return false;
  const r = typeof userOrRole === 'string' ? userOrRole : userOrRole.role;
  return typeof r === 'string' && r.trim().toLowerCase() === 'hassan';
}

export function getRoleDefinition(roleId?: string): RoleDefinition {
  const clean = (roleId || '').trim().toLowerCase();
  const found = rolesConfig.find((r) => r.id.toLowerCase() === clean);
  if (found) return found;
  return { id: roleId || 'guest', name: roleId || 'عضو', level: 10, badgeColor: 'bg-slate-600 text-white' };
}

export function saveRolesConfig() {
  try {
    const mergedMap = new Map<string, RoleDefinition>();
    DEFAULT_ROLES_CONFIG.forEach((r) => mergedMap.set(r.id.toLowerCase(), { ...r }));
    rolesConfig.forEach((r) => {
      if (r && r.id) mergedMap.set(r.id.toLowerCase(), r);
    });
    rolesConfig = Array.from(mergedMap.values()).sort((a, b) => b.level - a.level);

    dataManager.saveRolesConfig(rolesConfig);
    dataManager.save('roles_config', rolesConfig);
    const localDir = process.env.DATA_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname);
    const localFile = path.join(localDir, 'roles_config.json');
    fs.writeFileSync(localFile, JSON.stringify(rolesConfig, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving roles config:', err);
  }
}

export function loadRolesConfig() {
  try {
    const parsed = dataManager.loadRolesConfigSync<RoleDefinition[]>([]);
    let sourceList: RoleDefinition[] = [];
    if (Array.isArray(parsed) && parsed.length > 0) {
      sourceList = parsed;
    } else {
      const localDir = process.env.DATA_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname);
      const localFile = path.join(localDir, 'roles_config.json');
      if (fs.existsSync(localFile)) {
        const raw = fs.readFileSync(localFile, 'utf8');
        const data = JSON.parse(raw);
        if (Array.isArray(data) && data.length > 0) {
          sourceList = data;
        }
      }
    }

    const mergedMap = new Map<string, RoleDefinition>();
    DEFAULT_ROLES_CONFIG.forEach((r) => mergedMap.set(r.id.toLowerCase(), { ...r }));
    sourceList.forEach((r) => {
      if (r && r.id) {
        const cleanId = r.id.toLowerCase();
        const existingDefault = mergedMap.get(cleanId);
        if (existingDefault && existingDefault.isSystem) {
          mergedMap.set(cleanId, {
            ...existingDefault,
            ...r,
            id: cleanId,
            isSystem: true
          });
        } else {
          mergedMap.set(cleanId, {
            ...r,
            id: cleanId,
            level: typeof r.level === 'number' ? r.level : parseInt(String(r.level)) || 20
          });
        }
      }
    });

    rolesConfig = Array.from(mergedMap.values()).sort((a, b) => b.level - a.level);
  } catch (err) {
    console.error('Error loading roles config:', err);
  }
}

function canPerformModeration(
  actor: ConnectedUser,
  target: { id?: string; username: string; role: string } | undefined,
  action: string
): { allowed: boolean; reason?: string } {
  if (isSupremeHassan(actor)) {
    return { allowed: true };
  }
  const actorLevel = getRoleLevel(actor.role);

  // 1. Self-penalty & Strict Numeric Hierarchy checks (الأعلى رقماً يتحكم في كل من تحته حتى لو كان admin)
  if (target) {
    if (target.id && target.id === actor.id && (action === 'kick' || action === 'ban' || action === 'mute' || action === 'deleteAvatar' || action === 'jailUser' || action === 'deleteAccount')) {
      return { allowed: false, reason: 'لا يمكنك تطبيق العقوبات على نفسك.' };
    }
    if (target.username.toLowerCase() === actor.username.toLowerCase() && (action === 'kick' || action === 'ban' || action === 'jailUser' || action === 'deleteAccount')) {
      return { allowed: false, reason: 'لا يمكنك تطبيق هذا الإجراء على حسابك الشخصي.' };
    }

    const targetLevel = getRoleLevel(target.role);

    // Rule: Strict hierarchy protection (لا يمكن التحكم أو تطبيق إجراء على رتبة مساوية أو أعلى منك)
    if (targetLevel >= actorLevel) {
      return {
        allowed: false,
        reason: `لا تملك صلاحية التحكم برتبة مساوية أو أعلى منك (رقم رتبتك: ${actorLevel}، ورقم رتبة المستهدف: ${targetLevel}). يستطيع العضو فقط التحكم بمن هم أقل منه رقماً.`
      };
    }
  }

  // 2. Action-specific permission mapping (Granular permissions system)
  const actionPermissionMap: Record<string, string> = {
    ban: 'canBan',
    unban: 'canUnban',
    kick: 'canKick',
    mute: 'canMute',
    unmuteText: 'canMute',
    unmuteVoice: 'canMuteVoice',
    pullMic: 'canPullMic',
    warn: 'canWarn',
    jailUser: 'canJail',
    unjailUser: 'canUnjail',
    deleteAvatar: 'canDeleteAvatar',
    updateAvatar: 'canEditMemberProfile',
    updateQuote: 'canEditMemberProfile',
    updateUsername: 'canEditMemberProfile',
    updateLikes: 'canEditLikes',
    updatePoints: 'canEditPoints',
    updateRole: 'canChangeRoles',
    updatePassword: 'canChangeMemberPassword',
    moveRoom: 'canMoveUsers',
    pullAllUsers: 'canMoveUsers',
    lockRoomChat: 'canLockRoom',
    setSlowMode: 'canSetSlowMode',
    lockRoomVoice: 'canLockVoice',
    setRoomPassword: 'canLockRoom',
    editRoom: 'canChangeRoomSettings',
    deleteRoom: 'canChangeRoomSettings',
    globalClearChat: 'canClearRoomChat',
    globalBroadcast: 'canBroadcast',
    adminSiren: 'canBroadcast',
    deleteAccount: 'canDeleteAccounts',
    revealNicks: 'canRevealNicks',
    resetName: 'canEditMemberProfile'
  };

  const requiredPerm = actionPermissionMap[action];
  if (requiredPerm) {
    if (!hasPermission(actor.role, requiredPerm)) {
      return {
        allowed: false,
        reason: `عفواً، رتبتك لا تملك الصلاحية المطلوبة (${requiredPerm}) لتنفيذ هذا الإجراء.`
      };
    }
  } else if (actorLevel < 50 && !hasPermission(actor.role, 'canKick') && !hasPermission(actor.role, 'canMute')) {
    return { allowed: false, reason: 'عفواً، ليست لديك أي صلاحيات إدارية لتنفيذ هذا الإجراء.' };
  }

  return { allowed: true };
}

// Banned record structure
export interface BannedRecord {
  username: string;
  ip?: string;
  deviceFingerprint?: string;
  deviceFingerprints?: string[];
  reason: string;
  bannedBy: string;
  timestamp: number;
  expiresAt?: number;
  banDurationMinutes?: number;
  banType?: 'auto_filter' | 'manual';
}

// Country flag to ISO alpha-2 mapping for geo-restriction checks
const flagToCodeMap: Record<string, string> = {
  '🇸🇦': 'SA', '🇪🇬': 'EG', '🇾🇪': 'YE', '🇮🇶': 'IQ', '🇸🇾': 'SY',
  '🇩🇿': 'DZ', '🇲🇦': 'MA', '🇦🇪': 'AE', '🇰🇼': 'KW', '🇯🇴': 'JO',
  '🇴🇲': 'OM', '🇶🇦': 'QA', '🇧🇭': 'BH', '🇹🇳': 'TN', '🇱🇾': 'LY',
  '🇸🇩': 'SD', '🇱🇧': 'LB', '🇵🇸': 'PS', '🇹🇷': 'TR', '🇬🇧': 'GB',
  '🇺🇸': 'US', '🇩🇪': 'DE', '🇫🇷': 'FR', '🇨🇦': 'CA'
};

// Filter violations entry and IP tracking map for automated IP bans
interface FilterViolationEntry {
  timestamp: number;
  word: string;
  username: string;
}
const ipFilterViolationsMap = new Map<string, FilterViolationEntry[]>();

// Jailed record structure
export interface JailedRecord {
  username: string;
  ip?: string;
  reason: string;
  jailedBy: string;
  timestamp: number;
}

// Banned usernames, IPs, device fingerprints and structured records
const bannedUsers = new Set<string>();
const bannedIps = new Set<string>();
const bannedDeviceFingerprints = new Set<string>();
const bannedRecords: Map<string, BannedRecord> = new Map();

// Extract persistent UID from fingerprint (e.g. '332b64ac' from '...1l301n7|332b64ac.Chrome')
// Remains identical when a user switches between Mobile Browser and Desktop Site on the same device.
export function getPersistentUid(fp?: string): string {
  if (!fp) return '';
  const trimmed = fp.trim();
  if (!trimmed || trimmed === 'FP-DEV-STANDARD' || !trimmed.includes('||')) return '';
  const lastPipe = trimmed.lastIndexOf('|');
  if (lastPipe === -1) return '';
  const tail = trimmed.slice(lastPipe + 1);
  const dotIdx = tail.indexOf('.');
  const uid = dotIdx !== -1 ? tail.slice(0, dotIdx) : tail;
  return uid.length >= 6 ? uid : '';
}

// Extract hardware-only core prefix from a device fingerprint (everything before the last '|')
export function getHardwareCore(fp?: string): string {
  if (!fp) return '';
  const trimmed = fp.trim();
  if (!trimmed || trimmed === 'FP-DEV-STANDARD') return '';
  if (trimmed.includes('||')) {
    const lastPipe = trimmed.lastIndexOf('|');
    if (lastPipe > 0) {
      return trimmed.slice(0, lastPipe);
    }
  }
  return trimmed;
}

// Extract pure Cross-Browser Hardware & OS Signature (GPU + WebGL Limits + Screen + CPU + Timezone + OS Fonts)
export function getCrossBrowserHwId(fp?: string): string {
  if (!fp) return '';
  const trimmed = fp.trim();
  const dblPipe = trimmed.indexOf('||');
  if (dblPipe === -1) return '';
  const after = trimmed.slice(dblPipe + 2);
  const parts = after.split('|');
  // Format A: canvas|webgl|audio|localeFonts|screen|crossBrowserHw|uid.browser -> parts.length >= 7
  if (parts.length >= 7 && parts[5] && parts[5].length >= 5 && parts[5] !== 'hwerr') {
    return parts[5];
  }
  // Format B: standard 5-hash format from other chats (canvas|webgl|audio|localeFonts|screen|uid.browser)
  if (parts.length >= 6 && parts[1] && parts[4] && parts[1] !== 'wglerr') {
    return `${parts[1]}_${parts[4]}`;
  }
  return '';
}

export interface FingerprintComponents {
  os: string;
  cores: string;
  canvasHash: string;
  webglHash: string;
  audioHash: string;
  localeFontsHash: string;
  screenHash: string;
  crossBrowserHw: string;
  uid: string;
  browser: string;
}

export function parseFingerprintComponents(fp?: string): FingerprintComponents | null {
  if (!fp) return null;
  const trimmed = fp.trim();
  if (!trimmed || trimmed === 'FP-DEV-STANDARD') return null;
  const dblPipe = trimmed.indexOf('||');
  if (dblPipe === -1) return null;

  const prefix = trimmed.slice(0, dblPipe);
  const prefixParts = prefix.split('|');
  const os = prefixParts[0] || 'Unknown';
  const cores = prefixParts[1] || '4';

  const after = trimmed.slice(dblPipe + 2);
  const parts = after.split('|');
  if (parts.length < 5) return null;

  const canvasHash = parts[0] || '';
  const webglHash = parts[1] || '';
  const audioHash = parts[2] || '';
  let localeFontsHash = '';
  let screenHash = '';
  let crossBrowserHw = '';
  let lastPart = '';

  if (parts.length >= 7) {
    localeFontsHash = parts[3] || '';
    screenHash = parts[4] || '';
    crossBrowserHw = parts[5] || '';
    lastPart = parts[6] || '';
  } else if (parts.length === 6) {
    screenHash = parts[3] || '';
    crossBrowserHw = parts[4] || '';
    lastPart = parts[5] || '';
  } else {
    lastPart = parts[parts.length - 1] || '';
  }

  const dotIdx = lastPart.indexOf('.');
  const uid = dotIdx !== -1 ? lastPart.slice(0, dotIdx) : lastPart;
  const browser = dotIdx !== -1 ? lastPart.slice(dotIdx + 1) : '';

  return {
    os,
    cores,
    canvasHash,
    webglHash,
    audioHash,
    localeFontsHash,
    screenHash,
    crossBrowserHw,
    uid,
    browser
  };
}

export function areFingerprintsFromSameDevice(fpA?: string, fpB?: string): { match: boolean; confidence: number; reason: string } {
  if (!fpA || !fpB) return { match: false, confidence: 0, reason: '' };
  const a = fpA.trim();
  const b = fpB.trim();
  if (a === 'FP-DEV-STANDARD' || b === 'FP-DEV-STANDARD' || !a || !b) {
    return { match: false, confidence: 0, reason: '' };
  }
  if (a === b) {
    return { match: true, confidence: 100, reason: 'بصمة الجهاز والعتاد متطابقة 100%' };
  }

  const uidA = getPersistentUid(a);
  const uidB = getPersistentUid(b);
  if (uidA && uidB && uidA === uidB) {
    return { match: true, confidence: 100, reason: 'المعرف المادي للهاتف (Device UID) متطابق 100%' };
  }

  const coreA = getHardwareCore(a);
  const coreB = getHardwareCore(b);
  if (coreA && coreB && coreA === coreB) {
    return { match: true, confidence: 100, reason: 'عتاد الهاتف الداخلي متطابق بالكامل (Hardware Core)' };
  }

  const hwA = getCrossBrowserHwId(a);
  const hwB = getCrossBrowserHwId(b);
  if (hwA && hwB && hwA === hwB && hwA !== 'hwerr') {
    return { match: true, confidence: 99, reason: 'بصمة العتاد العابرة للمتصفحات (Cross-Browser HW) متطابقة' };
  }

  const compA = parseFingerprintComponents(a);
  const compB = parseFingerprintComponents(b);
  if (compA && compB) {
    const sameOs = compA.os.toLowerCase() === compB.os.toLowerCase();
    const sameCores = compA.cores === compB.cores;

    if (sameOs && sameCores) {
      const sameGpu = Boolean(compA.webglHash && compB.webglHash && compA.webglHash === compB.webglHash && compA.webglHash !== 'wglerr' && compA.webglHash !== 'nowgl');
      const sameAudio = Boolean(compA.audioHash && compB.audioHash && compA.audioHash === compB.audioHash && compA.audioHash !== 'auderr' && compA.audioHash !== 'noaud');
      const sameScreen = Boolean(compA.screenHash && compB.screenHash && compA.screenHash === compB.screenHash);
      const sameCanvas = Boolean(compA.canvasHash && compB.canvasHash && compA.canvasHash === compB.canvasHash && compA.canvasHash !== 'cnverr');

      if (sameGpu && sameAudio) {
        return { match: true, confidence: 98, reason: 'تطابق كامل لمعالج الرسوميات (GPU) وبطاقة الصوت وعدد الأنوية' };
      }
      if (sameGpu && sameScreen) {
        return { match: true, confidence: 96, reason: 'تطابق كامل لمعالج الرسوميات (GPU) وأبعاد شاشة الهاتف' };
      }
      if (sameAudio && sameScreen) {
        return { match: true, confidence: 95, reason: 'تطابق بطاقة الصوت وشاشة الهاتف ونظام التشغيل' };
      }
      if (sameCanvas && sameGpu) {
        return { match: true, confidence: 97, reason: 'تطابق محرك الرسوميات (Canvas & WebGL GPU)' };
      }
    }
  }

  return { match: false, confidence: 0, reason: '' };
}

function addFingerprintToBanSet(fp?: string) {
  if (!fp) return;
  const trimmed = fp.trim();
  if (!trimmed || trimmed === 'FP-DEV-STANDARD') return;
  bannedDeviceFingerprints.add(trimmed);
  const uid = getPersistentUid(trimmed);
  if (uid) {
    bannedDeviceFingerprints.add(`UID:${uid}`);
  }
  const core = getHardwareCore(trimmed);
  if (core) {
    bannedDeviceFingerprints.add(core);
  }
  const crossHw = getCrossBrowserHwId(trimmed);
  if (crossHw) {
    bannedDeviceFingerprints.add(`HW:${crossHw}`);
  }
}

function getAllRecordFingerprints(r: BannedRecord): string[] {
  const list = new Set<string>();
  if (r.deviceFingerprint) list.add(r.deviceFingerprint);
  if (Array.isArray(r.deviceFingerprints)) {
    r.deviceFingerprints.forEach((f) => {
      if (f) list.add(f);
    });
  }
  return Array.from(list);
}

function removeFingerprintFromBanSet(fp?: string) {
  if (!fp) return;
  const trimmed = fp.trim();
  if (!trimmed) return;
  const uid = getPersistentUid(trimmed);
  const core = getHardwareCore(trimmed);
  const crossHw = getCrossBrowserHwId(trimmed);
  const allActiveFps = Array.from(bannedRecords.values()).flatMap((r) => getAllRecordFingerprints(r));
  if (!allActiveFps.includes(trimmed)) {
    bannedDeviceFingerprints.delete(trimmed);
  }
  if (uid && !allActiveFps.some((f) => getPersistentUid(f) === uid)) {
    bannedDeviceFingerprints.delete(`UID:${uid}`);
  }
  if (core && !allActiveFps.some((f) => getHardwareCore(f) === core)) {
    bannedDeviceFingerprints.delete(core);
  }
  if (crossHw && !allActiveFps.some((f) => getCrossBrowserHwId(f) === crossHw)) {
    bannedDeviceFingerprints.delete(`HW:${crossHw}`);
  }
}

// Helper to clean expired temporary bans
function cleanExpiredBans(): boolean {
  const now = Date.now();
  let changed = false;
  for (const [key, record] of bannedRecords.entries()) {
    if (record.expiresAt && record.expiresAt > 0 && record.expiresAt <= now) {
      bannedRecords.delete(key);
      bannedUsers.delete(record.username.toLowerCase());
      if (record.ip) {
        const otherUsesIp = Array.from(bannedRecords.values()).some((r) => r.ip === record.ip);
        if (!otherUsesIp) {
          bannedIps.delete(record.ip);
        }
      }
      if (record.deviceFingerprint) {
        removeFingerprintFromBanSet(record.deviceFingerprint);
      }
      changed = true;
      logMonitorEvent('ban', `انتهت مدة الحظر المؤقت تلقائياً للمستخدم [${record.username}] (${record.ip || 'بدون IP'})`, 'النظام الأمني');
    }
  }
  if (changed) {
    saveBans();
    io.emit('bannedListUpdated', Array.from(bannedRecords.values()));
  }
  return changed;
}

// Jailed usernames, IPs and structured records
const jailedUsernames = new Set<string>();
const jailedIps = new Set<string>();
const jailedRecords: Map<string, JailedRecord> = new Map();

// Save / Load Bans via Data Layer
function saveBans() {
  try {
    const data = {
      records: Array.from(bannedRecords.values()),
      ips: Array.from(bannedIps),
      deviceFingerprints: Array.from(bannedDeviceFingerprints)
    };
    dataManager.saveBans(data);
  } catch (err) {
    console.error('Error saving bans:', err);
  }
}

function loadBans() {
  try {
    const seed = {
      records: [
        {
          username: 'spammer_bot',
          ip: '192.168.1.105',
          reason: 'إرسال روابط دعائية مخالفة وإزعاج الأعضاء',
          bannedBy: 'admin',
          timestamp: Date.now() - 3600000
        },
        {
          username: 'bad_user_99',
          ip: '10.0.0.44',
          reason: 'تلفظ بكلمات خادشة للحياء والآداب العامة',
          bannedBy: 'Sajan',
          timestamp: Date.now() - 7200000
        }
      ],
      ips: ['192.168.1.105', '10.0.0.44'],
      deviceFingerprints: []
    };
    const parsed = dataManager.loadBansSync(seed);
    if (parsed && Array.isArray(parsed.records)) {
      parsed.records.forEach((r: BannedRecord) => {
        bannedRecords.set(r.username.toLowerCase(), r);
        bannedUsers.add(r.username.toLowerCase());
        if (r.ip) bannedIps.add(r.ip);
        if (r.deviceFingerprint) addFingerprintToBanSet(r.deviceFingerprint);
      });
    }
    if (parsed && Array.isArray(parsed.ips)) {
      parsed.ips.forEach((ip: string) => bannedIps.add(ip));
    }
    if (parsed && Array.isArray(parsed.deviceFingerprints)) {
      parsed.deviceFingerprints.forEach((fp: string) => addFingerprintToBanSet(fp));
    }
  } catch (err) {
    console.error('Error loading bans:', err);
  }
}
loadBans();

// Save / Load Jailed via Data Layer
function saveJailed() {
  try {
    const data = {
      records: Array.from(jailedRecords.values()),
      ips: Array.from(jailedIps)
    };
    dataManager.saveJailed(data);
  } catch (err) {
    console.error('Error saving jailed records:', err);
  }
}

function loadJailed() {
  try {
    const parsed = dataManager.loadJailedSync<{ records: JailedRecord[]; ips: string[] }>({ records: [], ips: [] });
    if (parsed && Array.isArray(parsed.records)) {
      parsed.records.forEach((r: JailedRecord) => {
        jailedRecords.set(r.username.toLowerCase(), r);
        jailedUsernames.add(r.username.toLowerCase());
        if (r.ip) jailedIps.add(r.ip);
      });
    }
    if (parsed && Array.isArray(parsed.ips)) {
      parsed.ips.forEach((ip: string) => jailedIps.add(ip));
    }
  } catch (err) {
    console.error('Error loading jailed records:', err);
  }
}
loadJailed();

// Chat Shortcuts Structure & Persistence (قائمة الاختصارات الذكية للشات)
export interface ChatShortcut {
  id: string;
  trigger: string;
  replacement: string;
  createdBy?: string;
  createdAt: number;
}

let chatShortcuts: ChatShortcut[] = [];

const DEFAULT_SEED_SHORTCUTS: ChatShortcut[] = [
  {
    id: 'sc-1',
    trigger: 'نورت',
    replacement: 'نورت الشات بطلتك الحلوه 🌹',
    createdBy: 'إدارة حسان برو',
    createdAt: Date.now() - 3600000
  },
  {
    id: 'sc-2',
    trigger: 'ن',
    replacement: 'نورتو يالي دخلتو 🌟',
    createdBy: 'إدارة حسان برو',
    createdAt: Date.now() - 3600000
  },
  {
    id: 'sc-3',
    trigger: 'سلام',
    replacement: 'السلام عليكم ورحمة الله وبركاته 🌹',
    createdBy: 'إدارة حصن برو',
    createdAt: Date.now() - 3600000
  },
  {
    id: 'sc-4',
    trigger: 'برب',
    replacement: 'برب دقائق وراجع بإذن الله ☕',
    createdBy: 'إدارة حسان برو',
    createdAt: Date.now() - 3600000
  },
  {
    id: 'sc-5',
    trigger: 'باك',
    replacement: 'باك أسعد الله أوقاتكم جميعاً 🤍',
    createdBy: 'إدارة حسان برو',
    createdAt: Date.now() - 3600000
  },
  {
    id: 'sc-6',
    trigger: 'منور',
    replacement: 'منور الدنيا كلها وحسان برو 🦅',
    createdBy: 'إدارة حسان برو',
    createdAt: Date.now() - 3600000
  }
];

function saveShortcuts() {
  try {
    dataManager.saveShortcuts(chatShortcuts);
  } catch (err) {
    console.error('Error saving shortcuts:', err);
  }
}

function loadShortcuts() {
  try {
    const parsed = dataManager.loadShortcutsSync<ChatShortcut[]>(DEFAULT_SEED_SHORTCUTS);
    if (Array.isArray(parsed) && parsed.length > 0) {
      chatShortcuts = parsed;
      return;
    }
  } catch (err) {
    console.error('Error loading shortcuts:', err);
  }
  chatShortcuts = DEFAULT_SEED_SHORTCUTS;
  saveShortcuts();
}
loadShortcuts();

// Function to expand chat shortcuts in any message
export function expandShortcuts(rawText: string): string {
  if (!rawText || chatShortcuts.length === 0) return rawText;
  let result = rawText;

  // Sort shortcuts by trigger length descending so longer words match first
  const sorted = [...chatShortcuts].sort((a, b) => b.trigger.length - a.trigger.length);

  for (const sc of sorted) {
    const trigger = sc.trigger.trim();
    if (!trigger || !sc.replacement) continue;

    // 1. Direct entire match (e.g. user just types "نورت" or "ن")
    if (result.trim() === trigger) {
      result = sc.replacement;
      continue;
    }

    // 2. Token / word boundary matching (surrounded by whitespace, punctuation or boundaries)
    try {
      const escaped = trigger.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(^|[\\s،,.:;!؟?\\-_"'\`()[\\]{}«»])(${escaped})($|[\\s،,.:;!؟?\\-_"'\`()[\\]{}«»])`, 'g');
      result = result.replace(regex, `$1${sc.replacement}$3`);
    } catch {
      if (result.includes(trigger)) {
        result = result.split(trigger).join(sc.replacement);
      }
    }
  }

  return result;
}

// Dynamic Room Settings (Chat lock, Slow mode, Voice lock, Room Pinned Topic, Welcome Message)
export interface RoomSettings {
  isChatLocked: boolean;
  slowModeSeconds: number; // 0 = off, 5, 10, 30
  isVoiceLocked: boolean;
  showDeletedNotice?: boolean;
  pinnedTopic?: string;
  welcomeMessage?: string;
  welcomeEnabled?: boolean;
  wallpaper?: string;
}
const roomSettingsMap: Record<string, RoomSettings> = {};
export function getRoomSettings(roomId: string): RoomSettings {
  if (!roomSettingsMap[roomId]) {
    roomSettingsMap[roomId] = {
      isChatLocked: false,
      slowModeSeconds: 0,
      isVoiceLocked: false,
      showDeletedNotice: false,
      pinnedTopic: '',
      welcomeMessage: '',
      welcomeEnabled: true,
      wallpaper: 'default'
    };
  }
  return roomSettingsMap[roomId];
}

// Rate limit tracker for slow mode
const userLastMessageTime: Record<string, number> = {};

// Pinned messages per room
const roomPinnedMessages: Record<string, { id: string; username: string; text: string } | null> = {};

// Dynamic Filter Monitored Words (الكلمات المراقبة في الفلتر)
let monitoredWords: string[] = [
  'سب', 'شتم', 'قذف', 'لعن', 'طرد', 'كود', 'هكر', 'اخترق', 'سكس', 'اباحي',
  'قحبة', 'منيوك', 'كس', 'طيز', 'كلب', 'حمار', 'وسخ', 'حقير', 'تفو'
];

// Likes Threshold Limits per Feature (شروط عدد اللايكات المطلوبة للإرسال)
export interface LikesThresholdSettings {
  roomTextLikes: number;    // لايكات إرسال نص بالغرفة
  roomMediaLikes: number;   // لايكات إرسال وسائط بالغرفة
  wallTextLikes: number;    // لايكات إرسال نص بالحائط
  wallMediaLikes: number;   // لايكات إرسال وسائط بالحائط
  pmTextLikes: number;      // لايكات إرسال نص بالخاص
  pmMediaLikes: number;     // لايكات إرسال وسائط بالخاص
  micLikes: number;         // لايكات الصعود للمايك
  callLikes: number;        // لايكات الاتصال في الخاص
}

let likesSettings: LikesThresholdSettings = {
  roomTextLikes: 0,
  roomMediaLikes: 0,
  wallTextLikes: 0,
  wallMediaLikes: 0,
  pmTextLikes: 0,
  pmMediaLikes: 0,
  micLikes: 0,
  callLikes: 0
};

// Message Retention Limits (سقف وحدود الرسائل مع الحذف التلقائي للأقدم)
export interface MessageRetentionLimits {
  roomMaxMessages: number;     // سقف رسائل الغرفة الواحدة (حذف تلقائي للأقدم)
  wallMaxPosts: number;        // سقف منشورات الحائط (حذف تلقائي للأقدم)
  privateMaxMessages: number;   // سقف رسائل المحادثة الخاصة الواحدة (حذف تلقائي للأقدم)
}

export let messageRetentionLimits: MessageRetentionLimits = {
  roomMaxMessages: 200,
  wallMaxPosts: 100,
  privateMaxMessages: 100
};

export function saveMessageRetentionLimits() {
  try {
    dataManager.save('message_retention_limits', messageRetentionLimits);
    if (!dataManager.isCloudConnected()) {
      const localDir = process.env.DATA_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname);
      const localFile = path.join(localDir, 'message_retention_limits.json');
      fs.writeFileSync(localFile, JSON.stringify(messageRetentionLimits, null, 2), 'utf8');
    }
  } catch (err) {
    console.error('Error saving message retention limits:', err);
  }
}

export function loadMessageRetentionLimits() {
  try {
    const parsed = dataManager.loadSync<Partial<MessageRetentionLimits>>('message_retention_limits', messageRetentionLimits);
    if (parsed && typeof parsed === 'object') {
      messageRetentionLimits = {
        roomMaxMessages: Number(parsed.roomMaxMessages) > 0 ? Number(parsed.roomMaxMessages) : 200,
        wallMaxPosts: Number(parsed.wallMaxPosts) > 0 ? Number(parsed.wallMaxPosts) : 100,
        privateMaxMessages: Number(parsed.privateMaxMessages) > 0 ? Number(parsed.privateMaxMessages) : 100
      };
    }
  } catch (err) {
    console.error('Error loading message retention limits:', err);
  }
}

// Dynamic Role Permissions Management (إدارة محتوى وصلاحيات كل رتبة بالـ Checkboxes)
export interface RolePermissions {
  // 1. Chat & Rooms (الدردشة العامة والغرف)
  canSendText?: boolean;
  canSendMedia?: boolean;
  canSendVoiceNotes?: boolean;
  canDeleteMessage?: boolean;
  canDeleteMessages?: boolean;
  canPinMessage?: boolean;
  canClearRoomChat?: boolean;
  canLockRoom?: boolean;
  canSetSlowMode?: boolean;
  canChangeRoomSettings?: boolean;

  // 2. Microphone & Audio (المايكروفون والصوتيات)
  canTakeMic?: boolean;
  canPullMic?: boolean;
  canMuteVoice?: boolean;
  canLockVoice?: boolean;
  canStartLive?: boolean;

  // 3. Moderation & Penalties (العقوبات والضبط الإداري)
  canWarn?: boolean;
  canMute?: boolean;
  canMuteText?: boolean;
  canKick?: boolean;
  canTempBan?: boolean;
  canBan?: boolean;
  canUnban?: boolean;
  canJail?: boolean;
  canUnjail?: boolean;

  // 4. Members & Profiles (إدارة الأعضاء والملفات الشخصية)
  canEditMemberProfile?: boolean;
  canEditMemberData?: boolean;
  canDeleteAvatar?: boolean;
  canEditLikes?: boolean;
  canEditPoints?: boolean;
  canAssignBanner?: boolean;
  canAssignBadge?: boolean;
  canChangeMemberPassword?: boolean;
  canMoveUsers?: boolean;
  canChangeRoles?: boolean;
  canManagePermissions?: boolean;

  // 5. Security, Filter & Logs (الرقابة والأمان ولوحة التحكم)
  canAccessControlPanel?: boolean;
  canFilter?: boolean;
  canManageFilterWords?: boolean;
  canRevealNicks?: boolean;
  canViewAuditLogs?: boolean;
  canClearAuditLogs?: boolean;

  // 6. Features, Wall & PM (الميزات العامة والحائط والخاص)
  canBroadcast?: boolean;
  canGhostLogin?: boolean;
  canManageShortcuts?: boolean;
  canChangeGlobalTheme?: boolean;
  canPostWall?: boolean;
  canDeleteWallPost?: boolean;
  canPrivateChat?: boolean;
  canPrivateCall?: boolean;

  [key: string]: boolean | undefined;
}

export let rolePermissions: Record<string, RolePermissions> = {
  hassan: {
    canSendText: true,
    canSendMedia: true,
    canSendVoiceNotes: true,
    canDeleteMessage: true,
    canDeleteMessages: true,
    canPinMessage: true,
    canClearRoomChat: true,
    canLockRoom: true,
    canSetSlowMode: true,
    canChangeRoomSettings: true,
    canTakeMic: true,
    canPullMic: true,
    canMuteVoice: true,
    canLockVoice: true,
    canStartLive: true,
    canWarn: true,
    canMute: true,
    canMuteText: true,
    canKick: true,
    canTempBan: true,
    canBan: true,
    canUnban: true,
    canJail: true,
    canUnjail: true,
    canEditMemberProfile: true,
    canEditMemberData: true,
    canDeleteAvatar: true,
    canEditLikes: true,
    canEditPoints: true,
    canAssignBanner: true,
    canAssignBadge: true,
    canChangeMemberPassword: true,
    canMoveUsers: true,
    canChangeRoles: true,
    canManagePermissions: true,
    canAccessControlPanel: true,
    canFilter: true,
    canManageFilterWords: true,
    canRevealNicks: true,
    canViewAuditLogs: true,
    canClearAuditLogs: true,
    canBroadcast: true,
    canGhostLogin: true,
    canManageShortcuts: true,
    canChangeGlobalTheme: true,
    canPostWall: true,
    canDeleteWallPost: true,
    canPrivateChat: true,
    canPrivateCall: true
  },
  admin: {
    canSendText: true,
    canSendMedia: true,
    canSendVoiceNotes: true,
    canDeleteMessage: true,
    canDeleteMessages: true,
    canPinMessage: true,
    canClearRoomChat: true,
    canLockRoom: true,
    canSetSlowMode: true,
    canChangeRoomSettings: true,
    canTakeMic: true,
    canPullMic: true,
    canMuteVoice: true,
    canLockVoice: true,
    canStartLive: true,
    canWarn: true,
    canMute: true,
    canMuteText: true,
    canKick: true,
    canTempBan: true,
    canBan: true,
    canUnban: true,
    canJail: true,
    canUnjail: true,
    canEditMemberProfile: true,
    canEditMemberData: true,
    canDeleteAvatar: true,
    canEditLikes: true,
    canEditPoints: true,
    canAssignBanner: true,
    canAssignBadge: true,
    canChangeMemberPassword: true,
    canMoveUsers: true,
    canChangeRoles: true,
    canManagePermissions: true,
    canAccessControlPanel: true,
    canFilter: true,
    canManageFilterWords: true,
    canRevealNicks: true,
    canViewAuditLogs: true,
    canClearAuditLogs: true,
    canBroadcast: true,
    canGhostLogin: true,
    canManageShortcuts: true,
    canChangeGlobalTheme: true,
    canPostWall: true,
    canDeleteWallPost: true,
    canPrivateChat: true,
    canPrivateCall: true
  },
  super: {
    canSendText: true,
    canSendMedia: true,
    canSendVoiceNotes: true,
    canDeleteMessage: true,
    canDeleteMessages: true,
    canPinMessage: true,
    canClearRoomChat: true,
    canLockRoom: true,
    canSetSlowMode: true,
    canChangeRoomSettings: true,
    canTakeMic: true,
    canPullMic: true,
    canMuteVoice: true,
    canLockVoice: true,
    canStartLive: true,
    canWarn: true,
    canMute: true,
    canMuteText: true,
    canKick: true,
    canTempBan: true,
    canBan: false,
    canUnban: false,
    canJail: true,
    canUnjail: true,
    canEditMemberProfile: true,
    canEditMemberData: false,
    canDeleteAvatar: true,
    canEditLikes: false,
    canEditPoints: false,
    canAssignBanner: true,
    canAssignBadge: true,
    canChangeMemberPassword: false,
    canMoveUsers: true,
    canChangeRoles: false,
    canManagePermissions: true,
    canAccessControlPanel: true,
    canFilter: true,
    canManageFilterWords: false,
    canRevealNicks: true,
    canViewAuditLogs: true,
    canClearAuditLogs: false,
    canBroadcast: true,
    canGhostLogin: true,
    canManageShortcuts: true,
    canChangeGlobalTheme: true,
    canPostWall: true,
    canDeleteWallPost: true,
    canPrivateChat: true,
    canPrivateCall: true
  },
  member: {
    canSendText: true,
    canSendMedia: true,
    canSendVoiceNotes: true,
    canDeleteMessage: false,
    canDeleteMessages: false,
    canPinMessage: false,
    canClearRoomChat: false,
    canLockRoom: false,
    canSetSlowMode: false,
    canChangeRoomSettings: false,
    canTakeMic: true,
    canPullMic: false,
    canMuteVoice: false,
    canLockVoice: false,
    canStartLive: false,
    canWarn: false,
    canMute: false,
    canMuteText: false,
    canKick: false,
    canTempBan: false,
    canBan: false,
    canUnban: false,
    canJail: false,
    canUnjail: false,
    canEditMemberProfile: false,
    canEditMemberData: false,
    canDeleteAvatar: false,
    canEditLikes: false,
    canEditPoints: false,
    canAssignBanner: false,
    canAssignBadge: false,
    canChangeMemberPassword: false,
    canMoveUsers: false,
    canChangeRoles: false,
    canManagePermissions: false,
    canAccessControlPanel: false,
    canFilter: false,
    canManageFilterWords: false,
    canRevealNicks: false,
    canViewAuditLogs: false,
    canClearAuditLogs: false,
    canBroadcast: false,
    canGhostLogin: false,
    canManageShortcuts: false,
    canChangeGlobalTheme: false,
    canPostWall: true,
    canDeleteWallPost: false,
    canPrivateChat: true,
    canPrivateCall: true
  },
  guest: {
    canSendText: true,
    canSendMedia: false,
    canSendVoiceNotes: false,
    canDeleteMessage: false,
    canDeleteMessages: false,
    canPinMessage: false,
    canClearRoomChat: false,
    canLockRoom: false,
    canSetSlowMode: false,
    canChangeRoomSettings: false,
    canTakeMic: false,
    canPullMic: false,
    canMuteVoice: false,
    canLockVoice: false,
    canStartLive: false,
    canWarn: false,
    canMute: false,
    canMuteText: false,
    canKick: false,
    canTempBan: false,
    canBan: false,
    canUnban: false,
    canJail: false,
    canUnjail: false,
    canEditMemberProfile: false,
    canEditMemberData: false,
    canDeleteAvatar: false,
    canEditLikes: false,
    canEditPoints: false,
    canAssignBanner: false,
    canAssignBadge: false,
    canChangeMemberPassword: false,
    canMoveUsers: false,
    canChangeRoles: false,
    canManagePermissions: false,
    canAccessControlPanel: false,
    canFilter: false,
    canManageFilterWords: false,
    canRevealNicks: false,
    canViewAuditLogs: false,
    canClearAuditLogs: false,
    canBroadcast: false,
    canGhostLogin: false,
    canManageShortcuts: false,
    canChangeGlobalTheme: false,
    canPostWall: false,
    canDeleteWallPost: false,
    canPrivateChat: false,
    canPrivateCall: false
  }
};

export function hasPermission(roleId?: string, permKey?: string): boolean {
  if (!roleId || !permKey) return false;
  const cleanRole = roleId.trim().toLowerCase();
  if (cleanRole === 'hassan' || cleanRole === 'admin' || getRoleLevel(cleanRole) >= getRoleLevel('admin')) return true;

  const perms = rolePermissions[cleanRole];
  if (perms) {
    if (perms[permKey] !== undefined) return Boolean(perms[permKey]);
    // Aliases
    if (permKey === 'canDeleteMessage' && perms.canDeleteMessages !== undefined) return Boolean(perms.canDeleteMessages);
    if (permKey === 'canDeleteMessages' && perms.canDeleteMessage !== undefined) return Boolean(perms.canDeleteMessage);
    if (permKey === 'canMute' && perms.canMuteText !== undefined) return Boolean(perms.canMuteText);
    if (permKey === 'canMuteText' && perms.canMute !== undefined) return Boolean(perms.canMute);
    if (permKey === 'canEditMemberProfile' && perms.canEditMemberData !== undefined) return Boolean(perms.canEditMemberData);
    if (permKey === 'canEditMemberData' && perms.canEditMemberProfile !== undefined) return Boolean(perms.canEditMemberProfile);
    if (permKey === 'canManagePermissions' && perms.canManageRoles !== undefined) return Boolean(perms.canManageRoles);
    if (permKey === 'canManageRoles' && perms.canManagePermissions !== undefined) return Boolean(perms.canManagePermissions);
    if (permKey === 'canDeleteAccounts' && perms.canDeleteAccount !== undefined) return Boolean(perms.canDeleteAccount);
    if (permKey === 'canDeleteAccount' && perms.canDeleteAccounts !== undefined) return Boolean(perms.canDeleteAccounts);
    if (permKey === 'canUnjail' && perms.canJail !== undefined) return Boolean(perms.canJail);
    if (permKey === 'canUnban' && perms.canBan !== undefined) return Boolean(perms.canBan);
    if (permKey === 'canLockVoice' && perms.canMuteVoice !== undefined) return Boolean(perms.canMuteVoice);
  }

  // Fallbacks for standard system roles
  if (cleanRole === 'super') {
    const superDefaults = new Set([
      'canSendText', 'canSendMedia', 'canSendVoiceNotes', 'canDeleteMessage', 'canDeleteMessages',
      'canPinMessage', 'canClearRoomChat', 'canLockRoom', 'canSetSlowMode', 'canChangeRoomSettings',
      'canTakeMic', 'canPullMic', 'canMuteVoice', 'canLockVoice', 'canStartLive',
      'canWarn', 'canMute', 'canMuteText', 'canKick', 'canTempBan', 'canBan', 'canUnban', 'canJail', 'canUnjail',
      'canEditMemberProfile', 'canEditMemberData', 'canDeleteAvatar', 'canAssignBanner', 'canAssignBadge',
      'canMoveUsers', 'canAccessControlPanel', 'canFilter', 'canRevealNicks', 'canViewAuditLogs',
      'canBroadcast', 'canGhostLogin', 'canManageShortcuts', 'canChangeGlobalTheme', 'canPostWall',
      'canDeleteWallPost', 'canPrivateChat', 'canPrivateCall', 'canDeleteAccounts', 'canDeleteAccount'
    ]);
    return superDefaults.has(permKey);
  }

  if (cleanRole === 'member') {
    const memberDefaults = new Set([
      'canSendText', 'canSendMedia', 'canSendVoiceNotes', 'canTakeMic', 'canPostWall', 'canPrivateChat', 'canPrivateCall'
    ]);
    return memberDefaults.has(permKey);
  }

  if (cleanRole === 'guest') {
    return permKey === 'canSendText';
  }

  return false;
}

export function saveRolePermissions() {
  try {
    dataManager.saveRolePermissions(rolePermissions);
  } catch (err) {
    console.error('Error saving role permissions:', err);
  }
}

export function loadRolePermissions() {
  try {
    const parsed = dataManager.loadRolePermissionsSync<Record<string, RolePermissions>>(rolePermissions);
    if (parsed && typeof parsed === 'object') {
      Object.assign(rolePermissions, parsed);
      for (const r of ['hassan', 'admin', 'super', 'member', 'guest']) {
        if (rolePermissions[r]) {
          if (rolePermissions[r].canGhostLogin === undefined) {
            rolePermissions[r].canGhostLogin = (r === 'hassan' || r === 'admin' || r === 'super');
          }
        }
      }
    }
  } catch (err) {
    console.error('Error loading role permissions:', err);
  }
}

// Initialize and hydrate role configs and permissions from database / local storage
loadRolesConfig();
loadRolePermissions();

export interface GlobalAppearance {
  theme: string;
  fontFamily: string;
  fontWeight?: 'thin' | 'normal' | 'default' | 'bold' | 'black';
  wallpaper: string;
  bubbleStyle: string;
  bannerUrl?: string;
  logoUrl?: string;
  customThemes?: Array<{
    id: string;
    name: string;
    colors: Record<string, string>;
    createdBy?: string;
    createdAt: number;
  }>;
}

export let globalAppearance: GlobalAppearance = {
  theme: 'pearl-gray-calm',
  fontFamily: 'Cairo',
  fontWeight: 'default',
  wallpaper: 'default',
  bubbleStyle: 'modern',
  bannerUrl: '',
  logoUrl: '',
  customThemes: []
};

export let emblemsConfig: EmblemsConfig = {
  items: DEFAULT_EMBLEMS,
  emojiSize: 'default',
  falconChatBanner: DEFAULT_FALCON_CHAT_BANNER,
  falconAvatarIcon: DEFAULT_FALCON_AVATAR_ICON
};

export async function saveEmblems(): Promise<void> {
  try {
    await dataManager.saveEmblems(emblemsConfig);
  } catch (err) {
    console.error('Error saving emblems:', err);
    throw err;
  }
}

export function loadEmblems() {
  try {
    const parsed = dataManager.loadEmblemsSync<EmblemsConfig>({
      items: DEFAULT_EMBLEMS,
      emojiSize: 'default',
      falconChatBanner: DEFAULT_FALCON_CHAT_BANNER,
      falconAvatarIcon: DEFAULT_FALCON_AVATAR_ICON
    });
    if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
      emblemsConfig = {
        items: parsed.items,
        emojiSize: parsed.emojiSize || 'default',
        falconChatBanner: parsed.falconChatBanner || DEFAULT_FALCON_CHAT_BANNER,
        falconAvatarIcon: parsed.falconAvatarIcon || DEFAULT_FALCON_AVATAR_ICON
      };
      if (emblemsConfig.falconChatBanner && !globalAppearance.bannerUrl) {
        globalAppearance.bannerUrl = emblemsConfig.falconChatBanner;
      }
      return;
    }
  } catch (err) {
    console.error('Error loading emblems:', err);
  }
  emblemsConfig = {
    items: DEFAULT_EMBLEMS,
    emojiSize: 'default',
    falconChatBanner: DEFAULT_FALCON_CHAT_BANNER,
    falconAvatarIcon: DEFAULT_FALCON_AVATAR_ICON
  };
  saveEmblems();
}

export interface GeneralWelcomeSettings {
  enabled: boolean;
  message: string;
  title: string;
}

export let generalWelcomeSettings: GeneralWelcomeSettings = {
  enabled: true,
  message: 'نحن سعداء بتشريفك فأهلاً بك عطراً فوّاحاً ينثرُ شذاه في كلّ الأرجاء .. نتمنى لك وقتاً ممتعاً 🌹',
  title: 'إدارة حسان برو'
};

export function saveGeneralWelcome() {
  try {
    dataManager.saveGeneralWelcome(generalWelcomeSettings);
  } catch (err) {
    console.error('Error saving general welcome:', err);
  }
}

export function loadGeneralWelcome() {
  try {
    const parsed = dataManager.loadGeneralWelcomeSync<Partial<GeneralWelcomeSettings>>(generalWelcomeSettings);
    if (parsed && typeof parsed === 'object') {
      generalWelcomeSettings = { ...generalWelcomeSettings, ...parsed };
    }
  } catch (err) {
    console.error('Error loading general welcome:', err);
  }
}


export async function saveGlobalAppearance(): Promise<void> {
  try {
    await dataManager.saveGlobalAppearance(globalAppearance);
  } catch (err) {
    console.error('Error saving global appearance:', err);
    throw err;
  }
}

export function loadGlobalAppearance() {
  try {
    const parsed = dataManager.loadGlobalAppearanceSync<Partial<GlobalAppearance>>(globalAppearance);
    if (parsed && typeof parsed === 'object') {
      globalAppearance = { ...globalAppearance, ...parsed };
      if (globalAppearance.bannerUrl && globalAppearance.bannerUrl.includes('localhost:3000')) {
        globalAppearance.bannerUrl = globalAppearance.bannerUrl.replace(/^https?:\/\/localhost:3000/i, '');
      }
    }
  } catch (err) {
    console.error('Error loading global appearance:', err);
  }
}

// Ultra-Fast Initial Appearance Endpoint: Delivers approved banner, logo, wallpaper and theme instantly on page boot
app.get('/api/initial-appearance', (_req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=15, stale-while-revalidate=60');
  const banner = globalAppearance.bannerUrl || emblemsConfig.falconChatBanner || DEFAULT_FALCON_CHAT_BANNER;
  const logo = globalAppearance.logoUrl || emblemsConfig.falconAvatarIcon || DEFAULT_FALCON_AVATAR_ICON;
  res.json({
    success: true,
    bannerUrl: banner,
    logoUrl: logo,
    theme: globalAppearance.theme || 'dark-gold',
    fontFamily: globalAppearance.fontFamily || 'Cairo',
    fontWeight: globalAppearance.fontWeight || 'default',
    wallpaper: globalAppearance.wallpaper || 'default',
    bubbleStyle: globalAppearance.bubbleStyle || 'modern',
    generalWelcome: generalWelcomeSettings,
    marqueeTicker: serverSecurity.marqueeTicker,
    rolesConfig: rolesConfig,
    rolePermissions: rolePermissions,
    likesSettings: likesSettings
  });
});

// Save / Load Functions
export function saveMonitoredWords() {
  try {
    dataManager.saveMonitoredWords(monitoredWords);
    if (!dataManager.isCloudConnected()) {
      const localDir = process.env.DATA_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname);
      const localFile = path.join(localDir, 'monitored_words.json');
      fs.writeFileSync(localFile, JSON.stringify(monitoredWords, null, 2), 'utf8');
    }
  } catch (err) {
    console.error('Error saving monitored words:', err);
  }
}

export function loadMonitoredWords() {
  try {
    const parsed = dataManager.loadMonitoredWordsSync<string[]>(monitoredWords);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Merge unique words while preserving custom admin additions
      const set = new Set([...monitoredWords, ...parsed]);
      monitoredWords = Array.from(set);
    }
  } catch (err) {
    console.error('Error loading monitored words:', err);
  }
}

export function saveServerSecurity() {
  try {
    dataManager.saveServerSecurity(serverSecurity);
  } catch (err) {
    console.error('Error saving server security:', err);
  }
}

export function loadServerSecurity() {
  try {
    const parsed = dataManager.loadServerSecuritySync<Partial<ServerSecuritySettings>>(serverSecurity);
    if (parsed && typeof parsed === 'object') {
      serverSecurity = { ...serverSecurity, ...parsed };
    }
  } catch (err) {
    console.error('Error loading server security:', err);
  }
}

export function saveLikesSettings() {
  try {
    dataManager.saveLikesSettings(likesSettings);
  } catch (err) {
    console.error('Error saving likes settings:', err);
  }
}

export function loadLikesSettings() {
  try {
    const parsed = dataManager.loadLikesSettingsSync<Partial<LikesThresholdSettings>>(likesSettings);
    if (parsed && typeof parsed === 'object') {
      likesSettings = { ...likesSettings, ...parsed };
    }
  } catch (err) {
    console.error('Error loading likes settings:', err);
  }
}

export function saveStaffMemos() {
  try {
    dataManager.saveStaffMemos(staffMemos);
  } catch (err) {
    console.error('Error saving staff memos:', err);
  }
}

export function loadStaffMemos() {
  try {
    const parsed = dataManager.loadStaffMemosSync<StaffMemo[]>(staffMemos);
    if (Array.isArray(parsed) && parsed.length > 0) {
      staffMemos = parsed;
    }
  } catch (err) {
    console.error('Error loading staff memos:', err);
  }
}

// Rooms list (Matching Screenshot 3 + Jail Room)
let chatRooms: ChatRoom[] = [
  { id: 'الغرفة العامة', name: 'الغرفة العامة Room (الرئيسية)', desc: 'ملتقى جميع الأعضاء والزوار', isPasswordProtected: false, voiceLimit: 33, activeVoiceCount: 0 },
  { id: 'السعودية', name: 'Room | السعودية', desc: 'فديتك ياااا السعودية 🇸🇦', isPasswordProtected: false, voiceLimit: 33, activeVoiceCount: 0 },
  { id: 'العراق', name: 'Room | العراق', desc: 'حياكم روم العراق 🇮🇶', isPasswordProtected: false, voiceLimit: 20, activeVoiceCount: 0 },
  { id: 'المسابقات', name: 'Room | المسابقات', desc: 'اكتب مسابقات وابدأ اللعب 🎯🔥', isPasswordProtected: false, voiceLimit: 40, activeVoiceCount: 0 },
  { id: 'خاص vip', name: 'غرفة VIP خاصة 🔒', desc: 'غرفة خاصة لكبار الشخصيات', isPasswordProtected: true, password: 'vip', voiceLimit: 10, activeVoiceCount: 0 },
  { id: 'صوت حسان برو', name: 'مجلس الصوت المباشر 🎙️', desc: 'صوت جماعي عالي النقاء', isPasswordProtected: false, voiceLimit: 30, activeVoiceCount: 0 },
  { id: 'سجن حسان برو', name: '🚔 سجن واحتجاز حسان برو', desc: 'غرفة توقيف المخالفين بقرار إداري صارم', isPasswordProtected: true, password: 'jail', voiceLimit: 50, activeVoiceCount: 0 }
];

export function saveChatRooms() {
  try {
    dataManager.saveChatRooms(chatRooms);
  } catch (err) {
    console.error('Error saving chat rooms:', err);
  }
}

export function loadChatRooms() {
  try {
    const parsed = dataManager.loadChatRoomsSync<ChatRoom[]>(chatRooms);
    if (Array.isArray(parsed) && parsed.length > 0) {
      chatRooms = parsed;
    }
  } catch (err) {
    console.error('Error loading chat rooms:', err);
  }
}

export function saveRoomSettings() {
  try {
    dataManager.saveRoomSettings(roomSettingsMap);
  } catch (err) {
    console.error('Error saving room settings:', err);
  }
}

export function loadRoomSettings() {
  try {
    const parsed = dataManager.loadRoomSettingsSync<Record<string, RoomSettings>>(roomSettingsMap);
    if (parsed && typeof parsed === 'object') {
      Object.assign(roomSettingsMap, parsed);
    }
  } catch (err) {
    console.error('Error loading room settings:', err);
  }
}

// Server Security & Anti-Raid System
export interface ServerSecuritySettings {
  emergencyLockdown: boolean;
  guestsAllowed: boolean;
  blockExternalLinks: boolean;
  floodControlRate: number; // Max messages per 5 seconds
  marqueeTicker: string;
  // Automated IP Ban based on Filter Violations
  autoIpBanEnabled: boolean;
  autoIpBanThreshold: number; // e.g. 3 violations
  autoIpBanWindowMinutes: number; // e.g. within 10 minutes
  autoIpBanDurationMinutes: number; // 0 = permanent, 15, 60, 360, 1440, 10080 minutes
  // Geographic Access Restrictions
  geoRestrictionEnabled: boolean;
  geoRestrictionMode: 'blacklist' | 'whitelist';
  geoRestrictedCountries: string[]; // List of ISO country codes (e.g. ['YE', 'EG', 'SA']) or flag emojis
  geoBlockedCustomMessage: string;
  // Configurable Timeouts & Grace Periods (إعدادات المهلات وأوقات الانتظار)
  offlineGraceSeconds?: number; // مهلة انقطاع النت قبل اعتبار العضو غير متصل (نقطة رمادية)
  micGraceSeconds?: number; // مهلة الاحتفاظ بمقعد المايك عند انقطاع الاتصال
  awayDelaySeconds?: number; // مهلة التحول للحالة الصفراء (غائب) عند التشغيل في الخلفية
  reconnectBannerDelaySeconds?: number; // مهلة الانتظار قبل إظهار شريط إعادة الاتصال
  likeCooldownSeconds?: number; // مهلة الانتظار بين الإعجابات للعضو الواحد
}

let serverSecurity: ServerSecuritySettings = {
  emergencyLockdown: false,
  guestsAllowed: true,
  blockExternalLinks: true,
  floodControlRate: 3,
  marqueeTicker: '🦅 مرحباً بكم في حسان برو | شات العرب الصوتي والكتابي الأرقى | أهلاً وسهلاً بجميع الإخوة والأخوات 🌹',
  autoIpBanEnabled: true,
  autoIpBanThreshold: 3,
  autoIpBanWindowMinutes: 10,
  autoIpBanDurationMinutes: 60,
  geoRestrictionEnabled: false,
  geoRestrictionMode: 'blacklist',
  geoRestrictedCountries: [],
  geoBlockedCustomMessage: '🚫 نعتذر، الدخول غير متاح حالياً من منطقتك الجغرافية وفقاً لسياسة الأمان المتبعة في الدردشة.',
  offlineGraceSeconds: 60,
  micGraceSeconds: 60,
  awayDelaySeconds: 120,
  reconnectBannerDelaySeconds: 10,
  likeCooldownSeconds: 60
};

// Staff Internal Memos & Notice Board
export interface StaffMemo {
  id: string;
  author: string;
  role: string;
  text: string;
  priority: 'low' | 'normal' | 'urgent';
  timestamp: number;
  timeFormatted: string;
}

let staffMemos: StaffMemo[] = [
  {
    id: 'memo-1',
    author: 'المدير العام',
    role: 'admin',
    text: 'الرجاء مراقبة غرفة المسابقات الليلة الساعة 9:00 مساءً لوجود فعاليات وتوزيع جوائز ومكافآت.',
    priority: 'urgent',
    timestamp: Date.now() - 3600000,
    timeFormatted: 'اليوم 08:30 م'
  },
  {
    id: 'memo-2',
    author: '★ ﺟﻨﺘﻞ ★',
    role: 'admin',
    text: 'تم حظر مستخدم كان يكرر نشر روابط إعلانات مخالفة على الخاص والتأكد من هدوء الغرف.',
    priority: 'normal',
    timestamp: Date.now() - 7200000,
    timeFormatted: 'اليوم 06:15 م'
  }
];

// Initialize all loaded configurations from Data Layer
loadMonitoredWords();
loadServerSecurity();
loadLikesSettings();
loadMessageRetentionLimits();
loadStaffMemos();
loadChatRooms();
loadRoomSettings();
loadRolePermissions();
loadGlobalAppearance();
loadGeneralWelcome();
loadEmblems();


// Note: Hydration of all collections is managed centrally via dataManager.onHydrated()


// Monitoring events buffer & persistent audit log via Data Layer (تظل محفوظة بشكل دائم حتى المسح اليدوي من الإدارة)
let monitorLogs: MonitorEvent[] = [];
let auditSaveTimer: NodeJS.Timeout | null = null;
function saveAuditLogs(immediate = false) {
  if (immediate) {
    if (auditSaveTimer) {
      clearTimeout(auditSaveTimer);
      auditSaveTimer = null;
    }
    try {
      dataManager.saveAuditLogs(monitorLogs.slice(0, 10000));
      if (!dataManager.isCloudConnected()) {
        const localDir = process.env.DATA_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname);
        const localFile = path.join(localDir, 'admin_audit_logs.json');
        fs.writeFileSync(localFile, JSON.stringify(monitorLogs.slice(0, 10000), null, 2), 'utf8');
      }
    } catch (err) {
      console.error('Error saving persistent audit logs immediately:', err);
    }
    return;
  }
  if (auditSaveTimer) return;
  auditSaveTimer = setTimeout(() => {
    auditSaveTimer = null;
    try {
      dataManager.saveAuditLogs(monitorLogs.slice(0, 10000));
      if (!dataManager.isCloudConnected()) {
        const localDir = process.env.DATA_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname);
        const localFile = path.join(localDir, 'admin_audit_logs.json');
        fs.writeFileSync(localFile, JSON.stringify(monitorLogs.slice(0, 10000), null, 2), 'utf8');
      }
    } catch (err) {
      console.error('Error saving persistent audit logs:', err);
    }
  }, 1000);
}

function loadAuditLogs() {
  try {
    const data = dataManager.loadAuditLogsSync<MonitorEvent[]>([]);
    if (Array.isArray(data)) {
      monitorLogs = data.slice(0, 10000);
      return;
    }
  } catch (err) {
    console.error('Error loading persistent audit logs:', err);
  }
  monitorLogs = [];
}
loadAuditLogs();

function logMonitorEvent(type: MonitorEvent['type'], description: string, actor: string, target?: string) {
  const event: MonitorEvent = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    type,
    description,
    actor,
    target,
    time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    timestamp: Date.now()
  };
  monitorLogs.unshift(event);
  if (monitorLogs.length > 10000) monitorLogs.pop();
  saveAuditLogs();

  // Optimized Socket Payload: Only stream live audit logs to active admin/super staff
  users.forEach((u) => {
    if (u.role === 'admin' || u.role === 'super') {
      io.to(u.id).emit('monitorEvent', event);
    }
  });
}

// Profile Visitor Record structure (من نقر على صورتي وشاهد ملفي الشخصي وعدد المرات)
export interface ProfileVisitorRecord {
  username: string;
  avatarUrl?: string;
  flag?: string;
  visitCount: number;
  lastVisitTime: number;
}

// Live Video Broadcast Session Structure (بث مباشر فيديو وصوت حقيقي للغرفة)
export interface RoomLiveBroadcast {
  broadcasterId: string;
  broadcasterUsername: string;
  broadcasterAvatar?: string;
  broadcasterFlag?: string;
  room: string;
  title: string;
  startedAt: number;
  viewers: string[];
}

// Global Active Live Broadcasts Map by room
const activeLiveBroadcasts: Map<string, RoomLiveBroadcast> = new Map();

// Registered members store structure
export interface RegisteredMemberInfo {
  password: string;
  role: 'hassan' | 'admin' | 'super' | 'member' | 'guest' | string;
  flag: string;
  statusQuote: string;
  avatarUrl?: string;
  likes: number;
  points: number;
  honorBadge?: string;
  ipAddress?: string;
  ipHistory?: string[]; // All real IPs this member has logged in with (سجل جميع الايبيهات الحقيقية)
  deviceInfo?: string;
  deviceHistory?: string[]; // All devices used by this member
  deviceFingerprint?: string;
  fingerprintHistory?: string[]; // All device fingerprints associated with this account (e.g. mobile + desktop mode)
  nameColor?: string;
  textColor?: string;
  nameGradient?: string;
  profileBg?: string;
  theme?: string;
  fontFamily?: string;
  wallpaper?: string;
  bubbleStyle?: string;
  nameBannerUrl?: string; // رابط البنر / السوابر المصور للعضو بمقاس 500x50
  giftBadges?: string[]; // قائمة أيقونات الهدايا والأوسمة التكريمية بجانب الاسم
  isPmDisabled?: boolean;
  isIncognito?: boolean;
  isJailed?: boolean;
  lastSeen?: number;
  visitors?: ProfileVisitorRecord[];
  engagement?: MemberEngagement;
  // Permanent user state synced with MongoDB
  ignoredUsers?: string[];
  starredMessages?: Array<{ id: string; username: string; text: string; time: string }>;
  friends?: string[];
}

const registeredMembers: Record<string, RegisteredMemberInfo> = {
  'admin': {
    password: hashPassword('123'),
    role: 'hassan',
    flag: '👑',
    statusQuote: 'مدير عام شات حسان برو 🦅',
    avatarUrl: '',
    likes: 10000,
    points: 2000000,
    honorBadge: '👑 المدير التنفيذي',
    nameBannerUrl: '',
    giftBadges: [],
    ipAddress: '127.0.0.1',
    deviceInfo: 'كمبيوتر / هاتف ذكي',
    deviceFingerprint: 'FP-ADMIN-ORIGIN',
    engagement: {
      activeTimeMinutes: 120,
      messagesSent: 50,
      wallPostsCount: 10,
      micTimeMinutes: 45,
      starsLevel: 5,
      progressPercent: 100
    }
  }
};

export function getRegisteredMember(username?: string): { key: string; member: RegisteredMemberInfo } | null {
  if (!username) return null;
  const clean = username.trim();
  if (registeredMembers[clean]) {
    return { key: clean, member: registeredMembers[clean] };
  }
  const lower = clean.toLowerCase();
  for (const k of Object.keys(registeredMembers)) {
    if (k.toLowerCase() === lower) {
      return { key: k, member: registeredMembers[k] };
    }
  }
  return null;
}

function getPresenceSnapshot(): ConnectedUser[] {
  const byUsername = new Map<string, ConnectedUser>();
  for (const user of users) {
    const key = user.username.trim().toLowerCase();
    const existing = byUsername.get(key);
    if (!existing || (user.lastActiveTime || 0) >= (existing.lastActiveTime || 0)) {
      byUsername.set(key, user);
    }
  }
  return Array.from(byUsername.values());
}

export function getAllRegisteredMembersPayload(viewerLevel: number = 0, viewerSocketId?: string) {
  const presenceSnapshot = getPresenceSnapshot();
  return Object.entries(registeredMembers).map(([username, m]) => {
    const onlineUser = presenceSnapshot.find((u) => u.username.toLowerCase() === username.toLowerCase());
    const isSelf = Boolean(onlineUser && viewerSocketId && onlineUser.id === viewerSocketId);
    const isGhostTarget = Boolean(onlineUser?.isGhost);
    const ghostLevel = onlineUser ? getRoleLevel(onlineUser.role) : getRoleLevel(m.role);
    const canSeeGhost = isSelf || viewerLevel >= ghostLevel;
    const isVisibleOnline = Boolean(onlineUser && (!isGhostTarget || canSeeGhost));

    const presenceState: 'online' | 'away' | 'offline' = isVisibleOnline ? (onlineUser!.presenceState || 'online') : 'offline';
    const allIps = Array.from(new Set([
      ...(onlineUser?.ipAddress && onlineUser.ipAddress !== '192.168.1.100' ? [onlineUser.ipAddress] : []),
      ...(m.ipAddress && m.ipAddress !== '192.168.1.100' ? [m.ipAddress] : []),
      ...(Array.isArray(m.ipHistory) ? m.ipHistory.filter((ip) => ip && ip !== '192.168.1.100') : [])
    ]));
    return {
      username,
      role: m.role,
      flag: m.flag,
      statusQuote: m.statusQuote || 'عضو في حسان برو',
      avatarUrl: m.avatarUrl,
      likes: m.likes || 0,
      points: m.points || 0,
      honorBadge: m.honorBadge,
      nameBannerUrl: onlineUser?.nameBannerUrl || m.nameBannerUrl || '',
      giftBadges: onlineUser?.giftBadges || m.giftBadges || [],
      ipAddress: onlineUser?.ipAddress || m.ipAddress || allIps[0] || 'غير متوفر',
      ipHistory: allIps,
      deviceInfo: onlineUser?.deviceInfo || m.deviceInfo || 'جهاز ذكي',
      deviceFingerprint: onlineUser?.deviceFingerprint || m.deviceFingerprint || 'FP-DEV-DEFAULT',
      isJailed: Boolean(m.isJailed || jailedUsernames.has(username.toLowerCase())),
      isPmDisabled: Boolean(onlineUser?.isPmDisabled ?? m.isPmDisabled),
      isOnline: Boolean(isVisibleOnline && presenceState !== 'offline'),
      isGhost: isVisibleOnline && isGhostTarget ? true : undefined,
      presenceState,
      currentRoom: isVisibleOnline ? onlineUser!.room : 'خارج الغرف',
      lastSeen: isVisibleOnline ? Date.now() : (m.lastSeen || Date.now() - 3600000),
      engagement: m.engagement || getDefaultEngagement()
    };
  });
}

// Connected live users store (الأعضاء الفعليون المتواجدون فقط بدون وهمي)
const users: ConnectedUser[] = [];

// Broadcast room users with Ghost login privacy filtering:
// الأعضاء الأقل رتبة لا يرون العضو المخفي نهائياً في القائمة، بينما من هم بنفس رتبته أو أعلى منها يرونه بنقطة زرقاء
export function broadcastRoomUsers(room: string) {
  if (!room) return;
  const roomUsersList = users.filter((u) => u.room === room);
  const socketsInRoom = io.sockets.adapter.rooms.get(room);
  if (!socketsInRoom) return;

  for (const socketId of socketsInRoom) {
    const s = io.sockets.sockets.get(socketId);
    if (!s) continue;
    const recipient = users.find((u) => u.id === socketId);
    const viewerLevel = recipient ? getRoleLevel(recipient.role) : 0;
    const filtered = roomUsersList.filter((u) => {
      if (!u.isGhost) return true;
      if (u.id === socketId) return true; // Self can always see themselves
      const targetGhostLevel = getRoleLevel(u.role);
      // Equal or higher level can see ghost member:
      return viewerLevel >= targetGhostLevel;
    });
    s.emit('roomUsers', {
      room,
      users: filtered
    });
  }
}

// Broadcast global presence snapshot with Ghost login privacy filtering
export function broadcastAllUsers() {
  const allPresence = getPresenceSnapshot();
  for (const [socketId, s] of io.sockets.sockets.entries()) {
    const recipient = users.find((u) => u.id === socketId);
    const viewerLevel = recipient ? getRoleLevel(recipient.role) : 0;
    const filtered = allPresence.filter((u) => {
      if (!u.isGhost) return true;
      if (u.id === socketId) return true; // Self can always see themselves
      const targetGhostLevel = getRoleLevel(u.role);
      return viewerLevel >= targetGhostLevel;
    });
    s.emit('allUsers', filtered);
    const onlineCount = filtered.filter((u) => u.presenceState !== 'offline').length;
    s.emit('onlineCountUpdated', onlineCount);
    s.emit('allRegisteredMembers', getAllRegisteredMembersPayload(viewerLevel, socketId));
  }
}

// IP Address & Device Fingerprint to accounts / nicknames mapping (كشف النكات والآي بي وبصمة الجهاز)
const ipToAccountsMap: Map<string, Set<string>> = new Map();
const ipToDeviceMap: Map<string, string> = new Map();
const ipToCountryMap: Map<string, string> = new Map();
const ipToFingerprintMap: Map<string, string> = new Map();
const fingerprintToAccountsMap: Map<string, Set<string>> = new Map();

function indexFingerprintAccount(fp: string | undefined, accountName: string) {
  if (!fp || fp === 'FP-DEV-STANDARD' || !accountName) return;
  const trimmed = fp.trim();
  if (!trimmed) return;
  const cleanName = accountName.trim();
  if (!cleanName) return;

  const addMapping = (key: string) => {
    if (!key || key.length < 3) return;
    if (!fingerprintToAccountsMap.has(key)) {
      fingerprintToAccountsMap.set(key, new Set<string>());
    }
    fingerprintToAccountsMap.get(key)!.add(cleanName);
  };

  addMapping(trimmed);

  const uid = getPersistentUid(trimmed);
  if (uid) {
    addMapping(`UID:${uid}`);
  }

  const core = getHardwareCore(trimmed);
  if (core) {
    addMapping(`CORE:${core}`);
    addMapping(core);
  }

  const crossHw = getCrossBrowserHwId(trimmed);
  if (crossHw && crossHw !== 'hwerr') {
    addMapping(`HW:${crossHw}`);
  }

  const comps = parseFingerprintComponents(trimmed);
  if (comps) {
    if (comps.webglHash && comps.audioHash && comps.webglHash !== 'wglerr' && comps.audioHash !== 'auderr') {
      addMapping(`HARDWARE:${comps.os}_${comps.cores}_${comps.webglHash}_${comps.audioHash}`);
    }
    if (comps.webglHash && comps.webglHash !== 'wglerr' && comps.webglHash !== 'nowgl') {
      addMapping(`GPU:${comps.os}_${comps.webglHash}`);
    }
  }
}

export function isBannableIp(ip?: string): boolean {
  if (!ip) return false;
  const clean = ip.trim().toLowerCase();
  if (!clean) return false;
  return (
    clean !== '127.0.0.1' &&
    clean !== '::1' &&
    clean !== 'localhost' &&
    clean !== '0.0.0.0' &&
    clean !== '192.168.1.100' &&
    clean !== '192.168.1.1'
  );
}

// Helper to extract true client IP across Cloudflare, reverse proxies, and standard sockets
export function getRealClientIp(socket: any): string {
  if (!socket) return '127.0.0.1';
  const headers = socket.handshake?.headers || {};
  const cfConnecting = (headers['cf-connecting-ip'] as string)?.trim();
  const xRealIp = (headers['x-real-ip'] as string)?.trim();
  const xForwardedFor = (headers['x-forwarded-for'] as string)?.split(',')[0]?.trim();
  let ip = cfConnecting || xForwardedFor || xRealIp || socket.handshake?.address || '127.0.0.1';
  if (ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }
  return ip.trim() || '127.0.0.1';
}

// Record and persist member connection audit details (IP, IP history, device, fingerprint)
export function recordMemberAuditConnection(username: string, clientIp: string, deviceInfo: string, flag: string, fingerprint?: string) {
  if (!username) return;
  const clean = username.trim();
  const lower = clean.toLowerCase();

  // Case-insensitive key lookup in registeredMembers
  const foundKey = Object.keys(registeredMembers).find((k) => k.toLowerCase() === lower) || clean;
  if (!registeredMembers[foundKey]) {
    registeredMembers[foundKey] = {
      password: hashPassword('123'),
      role: 'guest',
      flag: flag || '🇾🇪',
      statusQuote: 'زائر',
      likes: 100,
      points: 500,
      ipAddress: clientIp,
      ipHistory: (clientIp && clientIp !== '192.168.1.100') ? [clientIp] : [],
      deviceInfo,
      deviceHistory: deviceInfo ? [deviceInfo] : [],
      deviceFingerprint: fingerprint,
      fingerprintHistory: fingerprint ? [fingerprint] : [],
      lastSeen: Date.now()
    };
  } else {
    const m = registeredMembers[foundKey];
    if (clientIp && clientIp !== '192.168.1.100') {
      m.ipAddress = clientIp;
      if (!Array.isArray(m.ipHistory)) m.ipHistory = [];
      if (!m.ipHistory.includes(clientIp)) {
        m.ipHistory.push(clientIp);
        if (m.ipHistory.length > 30) m.ipHistory.shift();
      }
    }
    if (deviceInfo) {
      m.deviceInfo = deviceInfo;
      if (!Array.isArray(m.deviceHistory)) m.deviceHistory = [];
      if (!m.deviceHistory.includes(deviceInfo)) {
        m.deviceHistory.push(deviceInfo);
        if (m.deviceHistory.length > 10) m.deviceHistory.shift();
      }
    }
    if (fingerprint) {
      m.deviceFingerprint = fingerprint;
      if (!Array.isArray(m.fingerprintHistory)) m.fingerprintHistory = [];
      if (!m.fingerprintHistory.includes(fingerprint)) {
        m.fingerprintHistory.push(fingerprint);
        if (m.fingerprintHistory.length > 15) m.fingerprintHistory.shift();
      }
    }
    m.lastSeen = Date.now();
  }

  // Cross-reference index in memory
  if (isBannableIp(clientIp)) {
    if (!ipToAccountsMap.has(clientIp)) {
      ipToAccountsMap.set(clientIp, new Set<string>());
    }
    ipToAccountsMap.get(clientIp)!.add(foundKey);
    if (deviceInfo) ipToDeviceMap.set(clientIp, deviceInfo);
    if (flag) ipToCountryMap.set(clientIp, flag);
    if (fingerprint) ipToFingerprintMap.set(clientIp, fingerprint);
  }
  if (fingerprint) {
    indexFingerprintAccount(fingerprint, foundKey);
  }

  saveMembers();
}

// Helper to parse human-readable device name from User-Agent
export function parseDeviceInfo(ua?: string): string {
  if (!ua) return 'هاتف ذكي (Android/iOS)';
  const lower = ua.toLowerCase();
  if (lower.includes('iphone')) return 'iPhone (Apple iOS)';
  if (lower.includes('ipad')) return 'iPad (Apple iPadOS)';
  if (lower.includes('android')) {
    if (lower.includes('samsung')) return 'Samsung Galaxy (Android)';
    if (lower.includes('xiaomi') || lower.includes('redmi')) return 'Xiaomi (Android)';
    if (lower.includes('huawei') || lower.includes('honor')) return 'Huawei (Android)';
    if (lower.includes('pixel')) return 'Google Pixel (Android)';
    return 'هاتف أندرويد (Android)';
  }
  if (lower.includes('windows')) return 'كمبيوتر (Windows PC)';
  if (lower.includes('macintosh') || lower.includes('mac os')) return 'كمبيوتر (Apple Mac)';
  if (lower.includes('linux')) return 'جهاز لينكس (Linux)';
  return 'متصفح هاتف ذكي';
}

// Filter Alerts Log structure (سجل تنبيهات الفلتر مع الرسالة الكاملة واسم العضو ولماذا أرسلت ووقتها)
export interface FilterAlert {
  id: string;
  username: string;
  avatarUrl?: string;
  flag?: string;
  room: string;
  targetUser?: string; // لمن أرسلت (العضو المستلم في الخاص، أو الغرفة، أو الحائط)
  contextType?: 'room' | 'pm' | 'wall_post' | 'wall_comment';
  matchedWords: string[];
  fullMessage: string;
  timestamp: number;
  time: string;
}

const filterAlerts: FilterAlert[] = [];

// Rate limit cooldown map for liking member profiles (1 like per minute per target member)
const userLikeCooldownMap = new Map<string, number>();

// Brute-force protection for login credentials (max 5 failed attempts within 5 minutes)
const loginAttemptsMap = new Map<string, { count: number; lockedUntil: number }>();

// Temporary kick cooldown map (2-minute temporary room exit enforcement)
const kickedCooldownMap = new Map<string, number>();

// Persistent Queue for offline private messages (MongoDB backed)
const offlinePrivateMessages = new Map<string, PrivateMessage[]>();
// Persistent Archive for private conversations (MongoDB backed)
const privateChatHistory = new Map<string, PrivateMessage[]>();

export function getPmPairKey(u1: string, u2: string): string {
  return [u1.trim().toLowerCase(), u2.trim().toLowerCase()].sort().join(':::');
}

export function loadOfflinePrivateMessages() {
  try {
    const data = dataManager.loadOfflinePrivateMessagesSync<Record<string, PrivateMessage[]>>({});
    if (data && typeof data === 'object') {
      offlinePrivateMessages.clear();
      for (const [key, msgs] of Object.entries(data)) {
        if (Array.isArray(msgs)) {
          offlinePrivateMessages.set(key.toLowerCase(), msgs);
        }
      }
    }
  } catch (err) {
    console.error('Error loading offline private messages:', err);
  }
}

let saveOfflinePmTimer: NodeJS.Timeout | null = null;
export function saveOfflinePrivateMessages() {
  if (saveOfflinePmTimer) clearTimeout(saveOfflinePmTimer);
  saveOfflinePmTimer = setTimeout(() => {
    saveOfflinePmTimer = null;
    try {
      const obj: Record<string, PrivateMessage[]> = {};
      for (const [key, msgs] of offlinePrivateMessages.entries()) {
        if (msgs && msgs.length > 0) {
          obj[key] = msgs;
        }
      }
      dataManager.saveOfflinePrivateMessages(obj);
    } catch (err) {
      console.error('Error saving offline private messages:', err);
    }
  }, 300);
}

export function loadPrivateChatHistory() {
  try {
    const data = dataManager.loadPrivateChatHistorySync<Record<string, PrivateMessage[]>>({});
    if (data && typeof data === 'object') {
      privateChatHistory.clear();
      for (const [pairKey, msgs] of Object.entries(data)) {
        if (Array.isArray(msgs)) {
          privateChatHistory.set(pairKey, msgs);
        }
      }
    }
  } catch (err) {
    console.error('Error loading private chat history:', err);
  }
}

let savePrivateChatHistoryTimer: NodeJS.Timeout | null = null;
export function savePrivateChatHistory() {
  if (savePrivateChatHistoryTimer) clearTimeout(savePrivateChatHistoryTimer);
  savePrivateChatHistoryTimer = setTimeout(() => {
    savePrivateChatHistoryTimer = null;
    try {
      const obj: Record<string, PrivateMessage[]> = {};
      const maxRetention = messageRetentionLimits.privateMaxMessages || 100;
      for (const [pairKey, msgs] of privateChatHistory.entries()) {
        if (msgs && msgs.length > 0) {
          obj[pairKey] = msgs.slice(-maxRetention);
        }
      }
      dataManager.savePrivateChatHistory(obj);
    } catch (err) {
      console.error('Error saving private chat history:', err);
    }
  }, 400);
}

// Comprehensive Filter Detection across Room, Private Messages & Wall
function checkAndLogMonitoredWords(
  text: string | undefined | null,
  sender: ConnectedUser,
  context: {
    type: 'room' | 'pm' | 'wall_post' | 'wall_comment';
    targetName?: string;
  }
) {
  if (!text) return;
  const clean = sanitizeText(text);
  if (!clean) return;
  const lower = clean.toLowerCase();
  const detectedBadWords = monitoredWords.filter((w) => lower.includes(w.toLowerCase()));
  if (detectedBadWords.length > 0) {
    const alertObj: FilterAlert = {
      id: `fa-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      username: sender.username,
      avatarUrl: sender.avatarUrl,
      flag: sender.flag,
      room:
        context.type === 'pm'
          ? `الخاص (إلى: @${context.targetName || 'مستلم'})`
          : context.type === 'wall_post'
          ? 'منشور في الحائط'
          : context.type === 'wall_comment'
          ? `تعليق بالحائط (${context.targetName || 'منشور'})`
          : `غرفة: ${context.targetName || sender.room || 'العامة'}`,
      targetUser: context.targetName,
      contextType: context.type,
      matchedWords: detectedBadWords,
      fullMessage: clean,
      timestamp: Date.now(),
      time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };

    filterAlerts.unshift(alertObj);
    if (filterAlerts.length > 100) filterAlerts.pop();

    users.forEach((u) => {
      if (u.role === 'admin' || u.role === 'super') {
        io.to(u.id).emit('newFilterAlert', alertObj);
      }
    });

    // Note: Filter detections are recorded in filterAlerts (سجل تنبيهات الفلتر) and not in the main administrative events log
    // Automated IP Ban Trigger based on Filter Violations Frequency
    if (serverSecurity.autoIpBanEnabled && !isSupremeHassan(sender) && sender.role !== 'admin' && sender.role !== 'super') {
      const senderIp = sender.ipAddress || sender.ip;
      if (senderIp) {
        const now = Date.now();
        const windowMs = (serverSecurity.autoIpBanWindowMinutes || 10) * 60 * 1000;
        const currentViolations = ipFilterViolationsMap.get(senderIp) || [];
        // Keep only violations within the rolling time window
        const recentViolations = currentViolations.filter((v) => now - v.timestamp < windowMs);
        recentViolations.push({
          timestamp: now,
          word: detectedBadWords.join(', '),
          username: sender.username
        });
        ipFilterViolationsMap.set(senderIp, recentViolations);

        const threshold = serverSecurity.autoIpBanThreshold || 3;
        if (recentViolations.length >= threshold) {
          const durationMins = serverSecurity.autoIpBanDurationMinutes ?? 60;
          const isPermanent = durationMins <= 0;
          const expiresAt = isPermanent ? undefined : now + durationMins * 60 * 1000;
          const durationLabel = isPermanent
            ? 'باند نهائي'
            : `لمدة ${durationMins >= 60 ? Math.floor(durationMins / 60) + ' ساعة' : durationMins + ' دقيقة'}`;
          const banReason = `حظر IP تلقائي: تكرار مخالفة فلتر الكلمات (${recentViolations.length} مخالفات خلال ${serverSecurity.autoIpBanWindowMinutes} دقيقة) [${durationLabel}]`;

          // Add to banned sets & records (including device fingerprint)
          const senderFp = sender.deviceFingerprint || getRegisteredMember(sender.username)?.member.deviceFingerprint || ipToFingerprintMap.get(senderIp);
          if (isBannableIp(senderIp)) bannedIps.add(senderIp);
          bannedUsers.add(sender.username.toLowerCase());
          addFingerprintToBanSet(senderFp);
          bannedRecords.set(sender.username.toLowerCase(), {
            username: sender.username,
            ip: senderIp,
            deviceFingerprint: senderFp,
            reason: banReason,
            bannedBy: '🛡️ نظام الحظر التلقائي (Auto IP-Ban)',
            timestamp: now,
            expiresAt,
            banDurationMinutes: durationMins,
            banType: 'auto_filter'
          });
          saveBans();
          io.emit('bannedListUpdated', Array.from(bannedRecords.values()));

          logMonitorEvent(
            'ban',
            `🚨 حظر IP تلقائي: تم حظر [${sender.username}] وعنوان IP [${senderIp}] ${durationLabel} لتكرار مخالفات الفلتر`,
            'النظام الأمني',
            sender.username
          );

          // Alert admins in real-time
          users.forEach((u) => {
            if (u.role === 'admin' || u.role === 'super') {
              io.to(u.id).emit('systemAlert', `🚨 تم تطبيق حظر IP تلقائي على العضو [${sender.username}] (${durationLabel}) لتكرار مخالفات الفلتر.`);
            }
          });

          // Disconnect all sockets associated with this IP or user
          users.forEach((u) => {
            const userIp = u.ipAddress || u.ip;
            if ((userIp && userIp === senderIp) || u.username.toLowerCase() === sender.username.toLowerCase()) {
              const clientSocket = io.sockets.sockets.get(u.id);
              if (clientSocket) {
                clientSocket.emit('forceLogout', `🚫 تم حظر عنوان جهازك (IP) تلقائياً ${durationLabel} بسبب تكرار مخالفات فلتر الكلمات المحظورة.`);
                clientSocket.disconnect(true);
              }
            }
          });

          // Reset violations for this IP
          ipFilterViolationsMap.delete(senderIp);
        }
      }
    }
  }
}

// Helper to extract country flag from headers or country code
function getFlagFromCountryCode(code?: string): string {
  if (!code || code.length !== 2) return '';
  const codePoints = code
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

// Self-contained Geo Flag API (inspects cloud headers without forcing static country)
app.get('/api/geo-flag', (req, res) => {
  const cfCountry = ((req.headers['cf-ipcountry'] || req.headers['x-country-code'] || req.headers['x-appengine-country']) as string) || '';
  const flag = cfCountry ? getFlagFromCountryCode(cfCountry) : null;
  res.json({
    countryCode: cfCountry || null,
    flag: flag || null
  });
});

// Calculate real-time room statistics for pie chart based on real users
export function getRoomStatistics() {
  const total = users.length;
  return chatRooms.map((r) => {
    const roomUsers = users.filter((u) => u.room.trim().toLowerCase() === r.id.trim().toLowerCase());
    const count = roomUsers.length;
    const percentage = total > 0 ? Math.round((count / total) * 100) : (total === 0 && r.id === 'الغرفة العامة' ? 100 : 0);
    const voiceCount = roomUsers.filter((u) => u.micSlot !== null).length;
    return {
      id: r.id,
      roomId: r.id,
      name: r.name,
      roomName: r.name,
      desc: r.desc,
      isPasswordProtected: r.isPasswordProtected,
      voiceLimit: r.voiceLimit,
      count,
      percentage,
      voiceCount,
      users: roomUsers.map((u) => ({
        id: u.id,
        username: u.username,
        role: u.role,
        flag: u.flag,
        avatarUrl: u.avatarUrl,
        isVoice: u.isVoice,
        micSlot: u.micSlot
      }))
    };
  });
}

// Mic slots (5 slots per room: 1 to 5)
const roomMicSlots: Record<string, Array<{ slotNumber: number; user: ConnectedUser | null }>> = {};

function getMicSlotsForRoom(room: string) {
  if (!roomMicSlots[room]) {
    roomMicSlots[room] = [1, 2, 3, 4, 5].map((slotNumber) => ({
      slotNumber,
      user: null
    }));
  }
  return roomMicSlots[room];
}

export function getActiveVoiceCountForRoom(roomId: string): number {
  const slots = roomMicSlots[roomId];
  if (slots && Array.isArray(slots)) {
    return slots.filter((s) => s && s.user).length;
  }
  return users.filter((u) => (u.room.trim().toLowerCase() === roomId.trim().toLowerCase() || u.room === roomId) && (u.micSlot !== null && u.micSlot !== undefined)).length;
}

export function getChatRoomsWithLiveCounts(): ChatRoom[] {
  return chatRooms.map((r) => ({
    ...r,
    activeVoiceCount: getActiveVoiceCountForRoom(r.id)
  }));
}

export function broadcastRoomsUpdate() {
  io.emit('roomsUpdated', getChatRoomsWithLiveCounts());
  io.emit('roomStatsUpdated', getRoomStatistics());
}

// Chat History Database via Data Layer
let chatHistory: StoredMessage[] = [];

try {
  chatHistory = dataManager.loadChatHistorySync<StoredMessage[]>([]);
} catch (err) {
  console.error('[Data Layer] Error loading chat history:', err);
  chatHistory = [];
}

// Persistent members data via Data Layer
try {
  const loadedMembers = dataManager.loadMembersSync<Record<string, RegisteredMemberInfo>>(registeredMembers);
  if (loadedMembers && typeof loadedMembers === 'object') {
    Object.assign(registeredMembers, loadedMembers);
  }

  // Automated migration: transparently hash any plain text passwords loaded from storage
  let needsUpgrade = false;
  for (const m of Object.values(registeredMembers)) {
    if (m && m.password && !m.password.startsWith('$2a$') && !m.password.startsWith('$2b$')) {
      m.password = hashPassword(m.password);
      needsUpgrade = true;
    }
  }
  if (needsUpgrade) {
    saveMembers();
    console.log('[Security] ✅ Automated migration: Upgraded stored passwords to secure bcrypt hashes.');
  }

  // Re-hydrate in-memory IP, accounts and device mappings from persistent storage
  for (const [username, m] of Object.entries(registeredMembers)) {
    if (!m) continue;
    const allMemberIps = new Set<string>();
    if (m.ipAddress && m.ipAddress !== '127.0.0.1' && m.ipAddress !== '192.168.1.100') {
      allMemberIps.add(m.ipAddress);
    }
    if (Array.isArray(m.ipHistory)) {
      m.ipHistory.forEach((ip) => {
        if (ip && ip !== '127.0.0.1' && ip !== '192.168.1.100') allMemberIps.add(ip);
      });
    }
    allMemberIps.forEach((ip) => {
      if (!ipToAccountsMap.has(ip)) {
        ipToAccountsMap.set(ip, new Set<string>());
      }
      ipToAccountsMap.get(ip)!.add(username);
      if (m.deviceInfo) ipToDeviceMap.set(ip, m.deviceInfo);
      if (m.flag) ipToCountryMap.set(ip, m.flag);
      if (m.deviceFingerprint) ipToFingerprintMap.set(ip, m.deviceFingerprint);
    });
    if (m.deviceFingerprint) {
      indexFingerprintAccount(m.deviceFingerprint, username);
    }
    if (Array.isArray(m.fingerprintHistory)) {
      m.fingerprintHistory.forEach((fp) => indexFingerprintAccount(fp, username));
    }
  }
} catch (err) {
  console.error('[Data Layer] Error loading members from data layer:', err);
}

function getCurrentTimeString(): string {
  try {
    return new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return new Date().toLocaleTimeString();
  }
}

let saveMembersTimer: NodeJS.Timeout | null = null;
function saveMembers() {
  if (saveMembersTimer) return;
  saveMembersTimer = setTimeout(async () => {
    saveMembersTimer = null;
    try {
      await dataManager.saveMembers(registeredMembers);
    } catch (err) {
      console.error('[Data Layer] Error saving members:', err);
    }
  }, 1000);
}

// Handled centrally via dataManager.onHydrated() callback below

export function pruneRoomChatHistory(roomId?: string) {
  const limit = messageRetentionLimits.roomMaxMessages || 200;
  if (roomId) {
    const roomMsgs = chatHistory.filter((m) => m.room === roomId);
    if (roomMsgs.length > limit) {
      const excess = roomMsgs.length - limit;
      const idsToRemove = new Set(roomMsgs.slice(0, excess).map((m) => m.id));
      chatHistory = chatHistory.filter((m) => !idsToRemove.has(m.id));
    }
  } else {
    const countByRoom: Record<string, number> = {};
    const toRemove = new Set<string>();
    for (let i = chatHistory.length - 1; i >= 0; i--) {
      const r = chatHistory[i].room;
      countByRoom[r] = (countByRoom[r] || 0) + 1;
      if (countByRoom[r] > limit) {
        toRemove.add(chatHistory[i].id);
      }
    }
    if (toRemove.size > 0) {
      chatHistory = chatHistory.filter((m) => !toRemove.has(m.id));
    }
  }
}

export function pruneWallPosts() {
  const limit = messageRetentionLimits.wallMaxPosts || 100;
  if (wallPosts.length > limit) {
    wallPosts = wallPosts.slice(0, limit);
  }
}

let saveHistoryTimer: NodeJS.Timeout | null = null;
function saveHistory() {
  pruneRoomChatHistory();
  if (saveHistoryTimer) return;
  saveHistoryTimer = setTimeout(async () => {
    saveHistoryTimer = null;
    try {
      await dataManager.saveChatHistory(chatHistory);
    } catch (err) {
      console.error('[Data Layer] Error saving history:', err);
    }
  }, 800);
}

// Wall Posts Persistence via Data Layer (الحائط - حفظ دائم للمنشورات مع سقف الحذف التلقائي)
let wallPosts: WallPost[] = [];

function saveWallPosts() {
  pruneWallPosts();
  try {
    dataManager.saveWallPosts(wallPosts);
  } catch (err) {
    console.error('[Data Layer] Error saving wall posts:', err);
  }
}

function loadWallPosts() {
  try {
    const data = dataManager.loadWallPostsSync<WallPost[]>([]);
    if (Array.isArray(data)) {
      wallPosts = data.map((p) => {
        let ts = p.timestamp;
        if (!ts && p.id?.startsWith('post-')) {
          const parsed = Number(p.id.replace('post-', ''));
          if (parsed && !isNaN(parsed)) ts = parsed;
        }
        return {
          ...p,
          timestamp: ts || Date.now(),
          time: p.time && p.time !== 'الآن' ? p.time : getCurrentTimeString()
        };
      });
      return;
    }
  } catch (err) {
    console.error('[Data Layer] Error loading wall posts:', err);
  }
  wallPosts = [];
}
loadWallPosts();

// 24-Hour Stories / Khwater Persistence via Data Layer (نظام الخواطر والحالات - حذف تلقائي بعد 24 ساعة)
let storiesList: StoryItem[] = [];

function getActiveStories(): StoryItem[] {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  return storiesList.filter((s) => s.createdAt > cutoff);
}

function saveStories() {
  try {
    dataManager.saveStories(getActiveStories());
  } catch (err) {
    console.error('[Data Layer] Error saving stories:', err);
  }
}

function loadStories() {
  try {
    const data = dataManager.loadStoriesSync<StoryItem[]>([]);
    if (Array.isArray(data)) {
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      storiesList = data.filter((s: StoryItem) => s.createdAt > cutoff);
      return;
    }
  } catch (err) {
    console.error('[Data Layer] Error loading stories:', err);
  }
  storiesList = [];
}
loadStories();

/**
 * Comprehensive collection hydration from Data Layer / Cloud / MongoDB storage.
 * Ensures in-memory state matches persistent database state whenever connection
 * warms up or reconnects, without risk of wiping existing data with blank defaults.
 */
export function hydrateAllCollectionsFromStorage(isRehydration = false) {
  try {
    loadRolesConfig();
    loadRolePermissions();
    loadOfflinePrivateMessages();
    loadPrivateChatHistory();
    loadMonitoredWords();
    loadAuditLogs();
    loadMessageRetentionLimits();
    loadServerSecurity();
    loadLikesSettings();
    loadStaffMemos();
    loadChatRooms();
    loadRoomSettings();
    loadGlobalAppearance();
    loadGeneralWelcome();
    loadEmblems();
    loadShortcuts();
    loadWallPosts();
    loadStories();
    loadRecentLogins();

    // Rehydrate registered members
    const loadedMembers = dataManager.loadMembersSync<Record<string, RegisteredMemberInfo>>({});
    if (loadedMembers && typeof loadedMembers === 'object' && Object.keys(loadedMembers).length > 0) {
      Object.assign(registeredMembers, loadedMembers);
      for (const m of Object.values(registeredMembers)) {
        if (m && m.password && !m.password.startsWith('$2a$') && !m.password.startsWith('$2b$')) {
          m.password = hashPassword(m.password);
        }
      }
    }

    // Ensure primary admin account always possesses supreme role 'hassan'
    if (registeredMembers['admin']) {
      registeredMembers['admin'].role = 'hassan';
    }

    // Rehydrate active user sessions
    const loadedSessions = dataManager.loadSessionsSync<Record<string, UserSession>>({});
    if (loadedSessions && typeof loadedSessions === 'object') {
      (Object.values(loadedSessions) as UserSession[]).forEach((sess) => {
        if (sess && sess.sessionToken && sess.user && !sess.isExplicitlyLoggedOut) {
          if (sess.user.username.toLowerCase() === 'admin') {
            sess.user.role = 'hassan';
          }
          activeSessions.set(sess.sessionToken, sess);
          usernameToSessionMap.set(sess.user.username.toLowerCase(), sess.sessionToken);
        }
      });
    }

    // Rehydrate recent chat history
    const historyData = dataManager.loadChatHistorySync<StoredMessage[]>([]);
    if (Array.isArray(historyData) && historyData.length > 0) {
      chatHistory = historyData;
    }

    if (isRehydration) {
      console.log('🔄 [Data Layer] Re-hydrated all collections from persistent/cloud storage.');
      io.emit('rolesConfigUpdated', rolesConfig);
      io.emit('rolePermissionsUpdated', rolePermissions);
      io.emit('roomsUpdated', getChatRoomsWithLiveCounts());
      io.emit('roomStatsUpdated', getRoomStatistics());
      io.emit('wallPosts', wallPosts.slice(0, 100));
      io.emit('storiesUpdated', getActiveStories());
      io.emit('shortcutsUpdated', chatShortcuts);
      io.emit('emblemsUpdated', emblemsConfig);
      io.emit('falconAssetsUpdated', {
        falconChatBanner: emblemsConfig.falconChatBanner,
        falconAvatarIcon: emblemsConfig.falconAvatarIcon
      });
      io.emit('globalAppearanceUpdated', globalAppearance);
      io.emit('allRegisteredMembers', getAllRegisteredMembersPayload());
      io.emit('monitoredWordsUpdated', monitoredWords);
      io.emit('messageRetentionLimitsUpdated', messageRetentionLimits);
      io.emit('recentLoginsUpdated', getRecentLogins());
    }
  } catch (err) {
    console.error('Error during hydrateAllCollectionsFromStorage:', err);
  }
}

// Hook into DataManager hydration event whenever MongoDB / Cloud storage completes cache warmup
dataManager.onHydrated(() => {
  hydrateAllCollectionsFromStorage(true);
});

// 24-Hour Auto-cleanup Interval: deletes stories older than 24 hours automatically and unlinks local files
setInterval(() => {
  const prevCount = storiesList.length;
  const now = Date.now();
  const cutoff = now - 24 * 60 * 60 * 1000;
  
  // Unlink local media files for expired stories to keep disk storage lean
  storiesList.forEach((s) => {
    if (s.createdAt <= cutoff && s.mediaUrl && s.mediaUrl.startsWith('/uploads/')) {
      const filename = path.basename(s.mediaUrl);
      const filePath = path.join(uploadsDir, filename);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch {}
      }
    }
  });

  const cleaned = getActiveStories();
  if (cleaned.length !== prevCount) {
    storiesList = cleaned;
    saveStories();
    io.emit('storiesUpdated', storiesList);
  }
}, 5 * 60 * 1000);

// Active Engagement Ticker (حساب التفاعل تلقائياً كل دقيقة للتواجد والمايك)
setInterval(() => {
  let hasChanges = false;
  users.forEach((u) => {
    const reg = registeredMembers[u.username];
    if (reg) {
      if (!reg.engagement) {
        reg.engagement = getDefaultEngagement();
      }
      reg.engagement.activeTimeMinutes += 1;
      if (u.micSlot !== null || u.isSpeaking) {
        reg.engagement.micTimeMinutes += 1;
      }
      const updated = calculateEngagementStars(reg.engagement);
      reg.engagement.starsLevel = updated.starsLevel;
      reg.engagement.progressPercent = updated.progressPercent;
      u.engagement = reg.engagement;
      hasChanges = true;
    }
  });

  if (hasChanges) {
    saveMembers();
  }
}, 60000);

// Periodic Server Memory Cleanup & Rate Limiter Pruning (every 10 minutes)
setInterval(() => {
  try {
    const now = Date.now();
    // 1. Prune userLikeCooldownMap (entries older than 2 minutes)
    for (const [key, timestamp] of userLikeCooldownMap.entries()) {
      if (now - timestamp > 2 * 60 * 1000) {
        userLikeCooldownMap.delete(key);
      }
    }

    // 2. Prune userLastMessageTime (entries older than 5 minutes)
    for (const username of Object.keys(userLastMessageTime)) {
      if (now - userLastMessageTime[username] > 5 * 60 * 1000) {
        delete userLastMessageTime[username];
      }
    }

    // 3. Cap in-memory filterAlerts to latest 200 items to avoid swelling
    if (filterAlerts.length > 200) {
      filterAlerts.splice(0, filterAlerts.length - 200);
    }

    // 4. Preserve monitorLogs permanently until manually cleared by admin (cap only if exceeding 10,000)
    if (monitorLogs.length > 10000) {
      monitorLogs.splice(10000);
    }

    // 5. Cap ipToAccountsMap if it grows beyond 2000 entries
    if (ipToAccountsMap.size > 2000) {
      const keysToDelete = Array.from(ipToAccountsMap.keys()).slice(0, 500);
      keysToDelete.forEach((k) => {
        ipToAccountsMap.delete(k);
        ipToDeviceMap.delete(k);
        ipToCountryMap.delete(k);
        ipToFingerprintMap.delete(k);
      });
    }
  } catch (err) {
    console.warn('[Server Maintenance] Pruning warning:', err);
  }
}, 10 * 60 * 1000);

// Socket connection
io.on('connection', (socket) => {
  // High-performance socket anti-flood & rate limiter middleware
  socket.use(([event], next) => {
    // Whitelist heartbeats, latency pongs, background presence, and critical system hooks
    if (
      event === 'keepAlivePing' ||
      event === 'keepAlivePong' ||
      event === 'userPresenceChange' ||
      event === 'restoreSession' ||
      event === 'syncRoomMessages' ||
      event === 'disconnect'
    ) {
      return next();
    }
    const user = users.find((u) => u.id === socket.id);
    const isExempt = user && (isSupremeHassan(user) || user.role === 'admin' || user.role === 'super');
    if (!socketFloodGuard.isAllowed(socket.id, Boolean(isExempt))) {
      socket.emit('systemAlert', '⚠️ تم رصد إرسال فائق السرعة (Anti-Flood Guard). يرجى التمهل لثوانٍ قليلة.');
      return;
    }
    next();
  });

  // Determine real client IP and country flag across Cloudflare / proxies / direct
  const clientIp = getRealClientIp(socket);
  const cfCountry = (socket.handshake.headers['cf-ipcountry'] as string) || '';
  const detectedRealFlag = getFlagFromCountryCode(cfCountry);

  const onlineUsersSnapshot = getPresenceSnapshot().filter((u) => u.presenceState !== 'offline' && !u.isGhost);
  const currentConnectedCount = onlineUsersSnapshot.length;
  io.emit('onlineCountUpdated', currentConnectedCount);

  // Send initial configuration payload with currently connected users and recent logins
  socket.emit('initialRoster', {
    onlineCount: currentConnectedCount,
    users: onlineUsersSnapshot,
    rooms: getChatRoomsWithLiveCounts(),
    roomStats: getRoomStatistics(),
    shortcuts: chatShortcuts,
    likesSettings,
    marqueeTicker: serverSecurity.marqueeTicker,
    globalAppearance,
    generalWelcome: generalWelcomeSettings,
    emblemsConfig,
    rolesConfig,
    rolePermissions,
    stories: getActiveStories(),
    wallPosts: wallPosts.slice(0, 50),
    recentLogins: getRecentLogins(),
    serverSecurity: {
      marqueeTicker: serverSecurity.marqueeTicker,
      guestsAllowed: serverSecurity.guestsAllowed,
      emergencyLockdown: serverSecurity.emergencyLockdown,
      blockExternalLinks: serverSecurity.blockExternalLinks
    }
  });

  socket.emit('rolesConfigUpdated', rolesConfig);
  socket.emit('rolePermissionsUpdated', rolePermissions);
  socket.emit('allUsers', getPresenceSnapshot().filter((u) => !u.isGhost));
  socket.emit('allRegisteredMembers', getAllRegisteredMembersPayload(0, socket.id));

  socket.emit('recentLoginsUpdated', getRecentLogins());
  socket.emit('messageRetentionLimitsUpdated', messageRetentionLimits);

  socket.on('getRecentLogins', () => {
    socket.emit('recentLoginsUpdated', getRecentLogins());
  });

  socket.on('requestRecentLogins', () => {
    socket.emit('recentLoginsUpdated', getRecentLogins());
  });

  socket.on('getMessageRetentionLimits', () => {
    socket.emit('messageRetentionLimitsUpdated', messageRetentionLimits);
  });

  socket.on('syncChatConfig', ({ roomId }: { roomId?: string } = {}) => {
    const user = users.find((u) => u.id === socket.id);
    const targetRoomId = roomId || user?.room || 'الغرفة العامة';
    const currentRoomSettings = roomSettingsMap[targetRoomId] || { isChatLocked: false, slowModeSeconds: 0, isVoiceLocked: false };
    socket.emit('chatConfigSync', {
      rooms: getChatRoomsWithLiveCounts(),
      roomSettings: currentRoomSettings,
      globalAppearance,
      emblemsConfig,
      rolesConfig,
      rolePermissions,
      generalWelcome: generalWelcomeSettings,
      shortcuts: chatShortcuts,
      likesSettings,
      messageRetentionLimits,
      recentLogins: getRecentLogins(),
      serverSecurity: {
        marqueeTicker: serverSecurity.marqueeTicker,
        guestsAllowed: serverSecurity.guestsAllowed,
        emergencyLockdown: serverSecurity.emergencyLockdown,
        blockExternalLinks: serverSecurity.blockExternalLinks
      }
    });
  });

  // Admin Data on-demand (sent to authorized admin and staff roles with control panel permissions)
  socket.on('getAdminData', () => {
    const admin = users.find((u) => u.id === socket.id);
    if (admin && (admin.role === 'admin' || admin.role === 'super' || hasPermission(admin.role, 'canAccessControlPanel') || getRoleLevel(admin.role) >= 50)) {
      socket.emit('adminInitialData', {
        bannedList: Array.from(bannedRecords.values()),
        staffMemos,
        filterAlerts,
        monitoredWords,
        rolePermissions,
        serverSecurity
      });
      socket.emit('allRegisteredMembers', getAllRegisteredMembersPayload());
    }
  });

  socket.on('getRegisteredMembers', () => {
    const admin = users.find((u) => u.id === socket.id);
    if (admin && (admin.role === 'admin' || admin.role === 'super' || hasPermission(admin.role, 'canAccessControlPanel') || getRoleLevel(admin.role) >= 50)) {
      socket.emit('allRegisteredMembers', getAllRegisteredMembersPayload());
    }
  });

  // Emblems & Custom Emojis Listeners (إدارة وعرض الرموز، السوابر، الهدايا، الستيكرات والفيسات)
  socket.on('getEmblems', () => {
    socket.emit('emblemsUpdated', emblemsConfig);
  });

  socket.on('addEmblem', async ({
    type,
    title,
    imageUrl,
    targetMember,
    requiredRole
  }: {
    type: EmblemType;
    title: string;
    imageUrl: string;
    targetMember?: string;
    requiredRole?: string;
  }) => {
    const admin = users.find((u) => u.id === socket.id);
    if (!admin || (!isSupremeHassan(admin) && admin.role !== 'admin' && admin.role !== 'super')) {
      socket.emit('systemAlert', 'إدارة وإضافة الرموز والألقاب محصورة بطاقم الإدارة.');
      return;
    }
    if (!imageUrl || !type) {
      socket.emit('systemAlert', 'بيانات الرمز أو رابط الصورة مفقود.');
      return;
    }

    let shortcut: string | undefined = undefined;
    let codeNumber: number | undefined = undefined;

    if (type === 'emoji') {
      // الترقيم التسلسلي التلقائي للفيسات بدءاً من ف1 تصاعدياً
      let maxNum = 0;
      emblemsConfig.items.forEach((item) => {
        if (item.type === 'emoji' && item.shortcut) {
          const match = item.shortcut.match(/^ف(\d+)$/);
          if (match) {
            const n = parseInt(match[1], 10);
            if (!isNaN(n) && n > maxNum) maxNum = n;
          }
        }
      });
      const nextNum = maxNum + 1;
      shortcut = `ف${nextNum}`;
      codeNumber = nextNum;
    }

    const newItem: EmblemItem = {
      id: `emblem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type,
      title: sanitizeText(title) || (type === 'emoji' ? `فيس ${shortcut}` : type === 'banner' ? 'لقب مصور' : 'رمز'),
      imageUrl,
      shortcut,
      codeNumber,
      targetMember: targetMember ? sanitizeText(targetMember) : undefined,
      requiredRole: requiredRole || 'all',
      createdAt: Date.now(),
      createdBy: admin.username
    };

    emblemsConfig.items.unshift(newItem);
    try {
      await saveEmblems();
    } catch {
      emblemsConfig.items.shift();
      socket.emit('systemAlert', 'تعذر حفظ الرمز في قاعدة البيانات. لم يتم اعتماد التغيير.');
      return;
    }
    io.emit('emblemsUpdated', emblemsConfig);
    logMonitorEvent(
      'security',
      `إضافة أصل جديد في قسم الرموز [${type}] ${shortcut ? `(الكود: ${shortcut})` : ''} بواسطة [${admin.username}]`,
      admin.username
    );
    socket.emit('systemAlert', `تمت إضافة ${type === 'emoji' ? `الفيس بنجاح بالكود التلقائي (${shortcut})` : 'الرمز بنجاح'} ✅`);
  });

  socket.on('deleteEmblem', async ({ id }: { id: string }) => {
    const admin = users.find((u) => u.id === socket.id);
    if (!admin || (!isSupremeHassan(admin) && admin.role !== 'admin' && admin.role !== 'super')) {
      socket.emit('systemAlert', 'حذف الرموز محصور بطاقم الإدارة.');
      return;
    }
    const previousItems = emblemsConfig.items;
    emblemsConfig.items = previousItems.filter((item) => item.id !== id);
    if (emblemsConfig.items.length !== previousItems.length) {
      try {
        await saveEmblems();
      } catch {
        emblemsConfig.items = previousItems;
        socket.emit('systemAlert', 'تعذر حفظ حذف الرمز في قاعدة البيانات.');
        return;
      }
      io.emit('emblemsUpdated', emblemsConfig);
      logMonitorEvent('security', `حذف رمز بواسطة [${admin.username}]`, admin.username);
      socket.emit('systemAlert', 'تم حذف الرمز بنجاح 🗑️');
    }
  });

  socket.on('updateEmblemEmojiSize', async ({ emojiSize }: { emojiSize: EmojiSizeSetting }) => {
    const admin = users.find((u) => u.id === socket.id);
    if (!admin || (!isSupremeHassan(admin) && admin.role !== 'admin' && admin.role !== 'super')) {
      socket.emit('systemAlert', 'تعديل حجم الفيسات محصور بالإدارة.');
      return;
    }
    if (['small', 'default', 'large'].includes(emojiSize)) {
      const previousEmojiSize = emblemsConfig.emojiSize;
      emblemsConfig.emojiSize = emojiSize;
      try {
        await saveEmblems();
      } catch {
        emblemsConfig.emojiSize = previousEmojiSize;
        socket.emit('systemAlert', 'تعذر حفظ حجم الرموز في قاعدة البيانات.');
        return;
      }
      io.emit('emblemsUpdated', emblemsConfig);
      logMonitorEvent('security', `تعديل حجم عرض الفيسات إلى [${emojiSize}] بواسطة [${admin.username}]`, admin.username);
      socket.emit('systemAlert', `تم ضبط حجم الفيسات الافتراضي إلى (${emojiSize === 'small' ? 'صغير' : emojiSize === 'large' ? 'كبير' : 'افتراضي'}) بنجاح 📏`);
    }
  });

  // تحديث بنر الشات falcon_chat_banner وأيقونة الصقر falcon_avatar_icon
  socket.on(
    'updateFalconAssets',
    async ({
      falconChatBanner,
      falconAvatarIcon
    }: {
      falconChatBanner?: string;
      falconAvatarIcon?: string;
    }) => {
      const admin = users.find((u) => u.id === socket.id);
      if (!admin || (!isSupremeHassan(admin) && admin.role !== 'admin' && admin.role !== 'super')) {
        socket.emit('systemAlert', 'تعديل بنر الشات وأيقونة الصقر محصور بطاقم الإدارة.');
        return;
      }

      // Persist uploaded assets on the backend/storage provider, never as browser-only data URLs.
      const persistFalconAsset = async (value: string | undefined, fallback: string, filename: string) => {
        if (!value) return fallback;
        if (value.startsWith('data:')) {
          const match = value.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            const rawBuffer = Buffer.from(match[2], 'base64');

            // Railway's local filesystem is ephemeral. If no external media store is
            // configured, keep the small branding asset in MongoDB as a data URL so
            // every instance and every device can load the same image after restart.
            if (!storageManager.isExternal()) {
              return value;
            }

            const uploaded = await storageManager.saveBuffer(rawBuffer, filename, match[1], 'falcon-assets');
            const configuredOrigin = process.env.PUBLIC_SERVER_URL || process.env.SERVER_PUBLIC_URL || process.env.STORAGE_PUBLIC_URL_PREFIX;
            const socketOrigin = configuredOrigin || `https://${socket.handshake.headers.host || 'localhost'}`;
            return /^https?:\/\//i.test(uploaded.url)
              ? uploaded.url
              : `${socketOrigin.replace(/\/$/, '')}${uploaded.url.startsWith('/') ? uploaded.url : `/${uploaded.url}`}`;
          }
        }
        return value;
      };

      let changed = false;
      if (falconChatBanner !== undefined) {
        emblemsConfig.falconChatBanner = await persistFalconAsset(
          falconChatBanner,
          DEFAULT_FALCON_CHAT_BANNER,
          'falcon-chat-banner.png'
        );
        globalAppearance.bannerUrl = emblemsConfig.falconChatBanner;
        changed = true;
      }
      if (falconAvatarIcon !== undefined) {
        emblemsConfig.falconAvatarIcon = await persistFalconAsset(
          falconAvatarIcon,
          DEFAULT_FALCON_AVATAR_ICON,
          'falcon-avatar-icon.png'
        );
        globalAppearance.logoUrl = emblemsConfig.falconAvatarIcon;
        changed = true;
      }

      if (changed) {
        try {
          await Promise.all([saveEmblems(), saveGlobalAppearance()]);
        } catch {
          socket.emit('systemAlert', 'تعذر حفظ الصور وإعدادات المظهر في قاعدة البيانات. لم يتم اعتماد التغيير.');
          return;
        }
        io.emit('emblemsUpdated', emblemsConfig);
        io.emit('falconAssetsUpdated', {
          falconChatBanner: emblemsConfig.falconChatBanner,
          falconAvatarIcon: emblemsConfig.falconAvatarIcon
        });
        io.emit('globalAppearanceUpdated', globalAppearance);
        logMonitorEvent(
          'security',
          `تحديث بنر الشات أو أيقونة صقر حسان برو الرسمية بواسطة [${admin.username}]`,
          admin.username
        );
        socket.emit('systemAlert', 'تم حفظ وتطبيق بنر الشات وأيقونة الصقر بنجاح على كامل النظام 🦅✨');
      }
    }
  );

  // تعيين السوابر / البنر المصور للعضو
  socket.on('assignMemberBanner', ({ username, bannerUrl }: { username: string; bannerUrl?: string }) => {
    const actor = users.find((u) => u.id === socket.id);
    if (!actor) return;
    const cleanUser = sanitizeText(username)?.trim();
    if (!cleanUser) return;

    const isSelf = actor.username.toLowerCase() === cleanUser.toLowerCase();
    const canAssign = isSelf || actor.role === 'admin' || actor.role === 'super' || hasPermission(actor.role, 'canAssignBanner') || getRoleLevel(actor.role) >= 50;

    if (!canAssign) {
      socket.emit('systemAlert', 'تعيين البنر لعضو آخر محصور بطاقم الإدارة أو الرتب الممنوحة هذه الصلاحية.');
      return;
    }

    const cleanBannerUrl = bannerUrl?.trim() || undefined;

    users.forEach((u) => {
      if (u.username.toLowerCase() === cleanUser.toLowerCase()) {
        u.nameBannerUrl = cleanBannerUrl;
      }
    });

    if (registeredMembers[cleanUser]) {
      registeredMembers[cleanUser].nameBannerUrl = cleanBannerUrl;
      saveMembers();
    }

    // Update nameBannerUrl across historical messages in chat and wall posts
    chatHistory.forEach((msg) => {
      if (msg.username.toLowerCase() === cleanUser.toLowerCase()) {
        msg.nameBannerUrl = cleanBannerUrl;
      }
    });
    saveHistory();

    wallPosts.forEach((post) => {
      if (post.username.toLowerCase() === cleanUser.toLowerCase()) {
        post.nameBannerUrl = cleanBannerUrl;
      }
      if (post.comments) {
        post.comments.forEach((cm) => {
          if (cm.username.toLowerCase() === cleanUser.toLowerCase()) {
            cm.nameBannerUrl = cleanBannerUrl;
          }
        });
      }
    });

    io.emit('userStyleUpdated', {
      username: cleanUser,
      nameBannerUrl: cleanBannerUrl
    });

    const targetUser = users.find((u) => u.username.toLowerCase() === cleanUser.toLowerCase());
    if (targetUser?.room) {
      broadcastRoomUsers(targetUser.room);
    }

    logMonitorEvent(
      'role',
      `${cleanBannerUrl ? 'تثبيت بنر مصور' : 'إزالة البنر المصور'} لـ [${cleanUser}] بواسطة [${actor.username}]`,
      actor.username,
      cleanUser
    );
    socket.emit('systemAlert', cleanBannerUrl ? `تم تثبيت البنر المصور لـ [${cleanUser}] بنجاح 🌟` : `تمت إزالة البنر المصور لـ [${cleanUser}] والعودة للاسم النصي.`);
  });

  // منح أيقونة هدية أو وسام للعضو يظهر بجانب اسمه في المتواجدين
  socket.on('grantMemberGift', ({ username, giftUrl, giftTitle }: { username: string; giftUrl: string; giftTitle?: string }) => {
    const actor = users.find((u) => u.id === socket.id);
    if (!actor || (!hasPermission(actor.role, 'canAssignBadge') && actor.role !== 'admin' && actor.role !== 'super' && getRoleLevel(actor.role) < 50)) {
      socket.emit('systemAlert', 'منح الأوسمة والهدايا للأعضاء محصور بطاقم الإدارة أو الرتب الممنوحة هذه الصلاحية.');
      return;
    }
    const cleanUser = sanitizeText(username)?.trim();
    if (!cleanUser || !giftUrl) return;

    users.forEach((u) => {
      if (u.username.toLowerCase() === cleanUser.toLowerCase()) {
        if (!u.giftBadges) u.giftBadges = [];
        if (!u.giftBadges.includes(giftUrl)) {
          u.giftBadges.push(giftUrl);
        }
      }
    });

    if (!registeredMembers[cleanUser]) {
      registeredMembers[cleanUser] = {
        password: '123',
        role: 'member',
        flag: '🇾🇪',
        statusQuote: 'عضو في حسان برو',
        likes: 0,
        points: 0,
        giftBadges: [giftUrl]
      };
    } else {
      if (!registeredMembers[cleanUser].giftBadges) registeredMembers[cleanUser].giftBadges = [];
      if (!registeredMembers[cleanUser].giftBadges!.includes(giftUrl)) {
        registeredMembers[cleanUser].giftBadges!.push(giftUrl);
      }
    }
    saveMembers();

    io.emit('userStyleUpdated', {
      username: cleanUser,
      giftBadges: registeredMembers[cleanUser].giftBadges
    });
    const targetUser = users.find((u) => u.username.toLowerCase() === cleanUser.toLowerCase());
    if (targetUser?.room) {
      broadcastRoomUsers(targetUser.room);
    }

    logMonitorEvent('likes', `منح هدية/وسام شرفي [${giftTitle || 'وسام'}] لـ [${cleanUser}] بواسطة [${actor.username}]`, actor.username, cleanUser);
    socket.emit('systemAlert', `تم منح الوسام الشرفي لـ [${cleanUser}] بنجاح 🎖️`);
  });

  // إزالة أيقونة هدية أو وسام من العضو
  socket.on('removeMemberGift', ({ username, giftUrl }: { username: string; giftUrl: string }) => {
    const actor = users.find((u) => u.id === socket.id);
    if (!actor || (!isSupremeHassan(actor) && actor.role !== 'admin' && actor.role !== 'super')) {
      socket.emit('systemAlert', 'حذف أوسمة الأعضاء محصور بطاقم الإدارة.');
      return;
    }
    const cleanUser = sanitizeText(username)?.trim();
    if (!cleanUser || !giftUrl) return;

    users.forEach((u) => {
      if (u.username.toLowerCase() === cleanUser.toLowerCase() && u.giftBadges) {
        u.giftBadges = u.giftBadges.filter((g) => g !== giftUrl);
      }
    });

    if (registeredMembers[cleanUser] && registeredMembers[cleanUser].giftBadges) {
      registeredMembers[cleanUser].giftBadges = registeredMembers[cleanUser].giftBadges!.filter((g) => g !== giftUrl);
      saveMembers();
    }

    io.emit('userStyleUpdated', {
      username: cleanUser,
      giftBadges: registeredMembers[cleanUser]?.giftBadges || []
    });
    const targetUser = users.find((u) => u.username.toLowerCase() === cleanUser.toLowerCase());
    if (targetUser?.room) {
      broadcastRoomUsers(targetUser.room);
    }

    socket.emit('systemAlert', `تمت إزالة الوسام الشرفي من [${cleanUser}].`);
  });

  // إهداء هدية فاخرة من عضو لآخر مع حفظها والظهور الدائم بجانب اسمه والإشعار والاحتفال
  socket.on('sendMemberGift', ({
    targetUsername,
    giftUrl,
    giftTitle,
    giftMessage
  }: {
    targetUsername: string;
    giftUrl: string;
    giftTitle: string;
    giftMessage?: string;
  }) => {
    const actor = users.find((u) => u.id === socket.id);
    if (!actor) return;
    const cleanTarget = sanitizeText(targetUsername)?.trim();
    if (!cleanTarget || !giftUrl) return;

    // 1. Update online user records (تحديث العضو إذا كان متصلاً حالياً)
    users.forEach((u) => {
      if (u.username.toLowerCase() === cleanTarget.toLowerCase()) {
        if (!u.giftBadges) u.giftBadges = [];
        // Put newly gifted item at index 0 so it's the active companion gift beside avatar
        u.giftBadges = [giftUrl, ...u.giftBadges.filter((g) => g !== giftUrl)];
      }
    });

    // 2. Persist in registered members database (حفظ دائم بالسيرفر)
    if (!registeredMembers[cleanTarget]) {
      registeredMembers[cleanTarget] = {
        password: '123',
        role: 'member',
        flag: '🇾🇪',
        statusQuote: 'عضو في حسان برو',
        likes: 1,
        points: 10,
        giftBadges: [giftUrl]
      };
    } else {
      if (!registeredMembers[cleanTarget].giftBadges) registeredMembers[cleanTarget].giftBadges = [];
      registeredMembers[cleanTarget].giftBadges = [giftUrl, ...registeredMembers[cleanTarget].giftBadges!.filter((g) => g !== giftUrl)];
    }
    saveMembers();

    // 3. Broadcast updated giftBadges across all clients
    const finalGifts = registeredMembers[cleanTarget]?.giftBadges || [giftUrl];
    io.emit('userStyleUpdated', {
      username: cleanTarget,
      giftBadges: finalGifts
    });

    const targetOnline = users.find((u) => u.username.toLowerCase() === cleanTarget.toLowerCase());
    if (targetOnline?.room) {
      broadcastRoomUsers(targetOnline.room);
    }
    broadcastAllUsers();

    // 4. Send direct real-time alert to recipient socket
    for (const s of io.sockets.sockets.values()) {
      const sUser = users.find((u) => u.id === s.id);
      if (sUser && sUser.username.toLowerCase() === cleanTarget.toLowerCase()) {
        s.emit('giftReceivedAlert', {
          fromUsername: actor.username,
          fromAvatar: actor.avatarUrl,
          giftTitle: giftTitle || 'هدية فاخرة',
          giftUrl,
          giftMessage: giftMessage || 'مع خالص التقدير والمودة 🌹'
        });
      }
    }

    // 5. Broadcast celebratory announcement in the room
    const targetRoom = actor.room || targetOnline?.room || 'الغرفة العامة';
    const cleanMsg = giftMessage ? sanitizeText(giftMessage)?.trim() : '';
    const giftAnnouncementText = `🎁✨ أهدى [${actor.username}] هدية فاخرة [${giftTitle || 'وسام تقديري'}] إلى صاحب الحساب المحترم [${cleanTarget}]!${cleanMsg ? `\n💌 الإهداء: "${cleanMsg}"` : ''}`;

    const announcementMsg: StoredMessage = {
      id: `gift-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      room: targetRoom,
      username: 'نظام الهدايا 🎁',
      avatarUrl: giftUrl,
      text: giftAnnouncementText,
      time: getCurrentTimeString(),
      timestamp: Date.now(),
      badge: 'إهداء هدية 🎁',
      badgeColor: 'bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 text-white shadow-xs',
      nameColor: '#d97706',
      isGiftAnnouncement: true,
      giftBadges: [giftUrl],
      giftInfo: {
        fromUsername: actor.username,
        toUsername: cleanTarget,
        giftTitle: giftTitle || 'هدية فاخرة',
        giftUrl,
        giftMessage: cleanMsg
      }
    };

    chatHistory.push(announcementMsg);
    pruneRoomChatHistory(targetRoom);
    saveHistory();

    io.to(targetRoom).emit('message', announcementMsg);

    logMonitorEvent('likes', `أهدى [${actor.username}] هدية [${giftTitle || 'هدية'}] إلى [${cleanTarget}]`, actor.username, cleanTarget);
    socket.emit('systemAlert', `تم إهداء وتثبيت [${giftTitle || 'الهدية'}] لـ [${cleanTarget}] بنجاح 🎁✨`);
  });

  // تعيين الهدية النشطة المرافقة للاسم من قائمة الهدايا المستلمة
  socket.on('setActiveMemberGift', ({ username, giftUrl }: { username: string; giftUrl: string }) => {
    const actor = users.find((u) => u.id === socket.id);
    if (!actor) return;
    const cleanUser = sanitizeText(username)?.trim();
    if (!cleanUser || !giftUrl) return;
    if (actor.username.toLowerCase() !== cleanUser.toLowerCase() && actor.role !== 'admin' && actor.role !== 'super') {
      return;
    }

    users.forEach((u) => {
      if (u.username.toLowerCase() === cleanUser.toLowerCase()) {
        if (!u.giftBadges) u.giftBadges = [];
        u.giftBadges = [giftUrl, ...u.giftBadges.filter((g) => g !== giftUrl)];
      }
    });

    if (registeredMembers[cleanUser] && registeredMembers[cleanUser].giftBadges) {
      registeredMembers[cleanUser].giftBadges = [giftUrl, ...registeredMembers[cleanUser].giftBadges!.filter((g) => g !== giftUrl)];
      saveMembers();
    }

    io.emit('userStyleUpdated', {
      username: cleanUser,
      giftBadges: registeredMembers[cleanUser]?.giftBadges || [giftUrl]
    });
    broadcastAllUsers();
    socket.emit('systemAlert', 'تم تثبيت هديتك المرافقة لاسمك بنجاح 🎁✨');
  });

  // General Welcome Settings Listeners (إدارة الرسائل الترحيبية العامة للشات من لوحة التحكم)
  socket.on('getGeneralWelcome', () => {
    socket.emit('generalWelcomeUpdated', generalWelcomeSettings);
  });

  socket.on('updateGeneralWelcome', ({ enabled, message, title }: Partial<GeneralWelcomeSettings>) => {
    const admin = users.find((u) => u.id === socket.id);
    if (!admin || (!isSupremeHassan(admin) && admin.role !== 'admin' && admin.role !== 'super')) {
      socket.emit('systemAlert', 'تعديل رسائل الترحيب العامة محصور بطاقم الإدارة.');
      return;
    }
    if (enabled !== undefined) generalWelcomeSettings.enabled = Boolean(enabled);
    if (message !== undefined) generalWelcomeSettings.message = sanitizeText(message);
    if (title !== undefined) generalWelcomeSettings.title = sanitizeText(title);
    saveGeneralWelcome();
    io.emit('generalWelcomeUpdated', generalWelcomeSettings);
    logMonitorEvent('security', `تحديث رسالة الترحيب العامة للشات بواسطة ${admin.username}`, admin.username);
    socket.emit('systemAlert', 'تم حفظ وتحديث الرسالة الترحيبية العامة بنجاح ✅');
  });

  // Role Config & Permissions Listeners (إدارة وتعديل وإضافة الرتب والصلاحيات ديناميكياً)
  socket.on('getRolesConfig', () => {
    socket.emit('rolesConfigUpdated', rolesConfig);
    socket.emit('rolePermissionsUpdated', rolePermissions);
  });

  socket.on('saveRole', ({ role, permissions }: { role: RoleDefinition; permissions?: Partial<RolePermissions> }) => {
    const admin = users.find((u) => u.id === socket.id);
    if (!admin) {
      socket.emit('systemAlert', 'يجب تسجيل الدخول أولاً لإدارة الرتب.');
      return;
    }

    const actorLevel = getRoleLevel(admin.role);
    const adminBaseLevel = getRoleLevel('admin');
    const isTopAdminOrAbove = admin.role === 'admin' || admin.role === 'hassan' || actorLevel >= adminBaseLevel;

    if (!isTopAdminOrAbove && !hasPermission(admin.role, 'canManagePermissions') && !hasPermission(admin.role, 'canManageRoles')) {
      socket.emit('systemAlert', 'عفواً، ليست لديك صلاحية إدارة وتعديل الرتب.');
      return;
    }

    if (!role || !role.id || !role.name) {
      socket.emit('systemAlert', 'يرجى إدخال اسم الرتبة ورقمها كاملاً.');
      return;
    }

    const cleanId = role.id.trim().toLowerCase();
    const cleanName = sanitizeText(role.name.trim());
    const cleanLevel = typeof role.level === 'number' ? role.level : parseInt(String(role.level)) || 10;

    // Strict Hierarchy Check: Cannot edit own role or equal/higher roles (exempt for supreme 'hassan' role)
    const existing = rolesConfig.find((r) => r.id === cleanId);
    if (!isSupremeHassan(admin)) {
      if (cleanId === admin.role.toLowerCase()) {
        socket.emit('systemAlert', '🚫 حماية الرتب: لا يمكنك تعديل بيانات أو رقم رتبتك الخاصة! يستطيع ذلك فقط من هو أعلى منك رتبة.');
        return;
      }
      if (existing && existing.level >= actorLevel) {
        socket.emit('systemAlert', `🚫 حماية الرتب: لا يمكنك تعديل رتبة مساوية لك أو أعلى منك في المستوى (مستواها: ${existing.level}، مستواك: ${actorLevel})!`);
        return;
      }
      // Allow primary admin to create a brand-new higher role, otherwise enforce cleanLevel < actorLevel
      if (cleanLevel >= actorLevel && !(admin.role === 'admin' && !existing)) {
        socket.emit('systemAlert', `🚫 حماية الرتب: لا يمكنك تعيين رقم رتبة (${cleanLevel}) مساوٍ أو أعلى من رقم رتبتك (${actorLevel})! يجب أن يكون أقل منك.`);
        return;
      }
    }

    const existingIdx = rolesConfig.findIndex((r) => r.id === cleanId);
    if (existingIdx !== -1) {
      rolesConfig[existingIdx].name = cleanName;
      rolesConfig[existingIdx].level = cleanLevel;
      if (role.badgeColor) rolesConfig[existingIdx].badgeColor = role.badgeColor;
    } else {
      rolesConfig.push({
        id: cleanId,
        name: cleanName,
        level: cleanLevel,
        badgeColor: role.badgeColor || 'bg-amber-600 text-white',
        isSystem: false
      });
    }

    // Sort roles descending by level so higher numbers are always at top
    rolesConfig.sort((a, b) => b.level - a.level);
    saveRolesConfig();

    if (!rolePermissions[cleanId]) {
      rolePermissions[cleanId] = {
        canSendText: true,
        canSendMedia: true,
        canSendVoiceNotes: true,
        canTakeMic: true,
        canPostWall: true,
        canPrivateChat: true,
        canPrivateCall: true,
        canFilter: false,
        canDeleteMessage: false,
        canDeleteMessages: false,
        canPinMessage: false,
        canClearRoomChat: false,
        canLockRoom: false,
        canSetSlowMode: false,
        canChangeRoomSettings: false,
        canPullMic: false,
        canMuteVoice: false,
        canLockVoice: false,
        canStartLive: false,
        canWarn: false,
        canMute: false,
        canMuteText: false,
        canKick: false,
        canTempBan: false,
        canBan: false,
        canUnban: false,
        canJail: false,
        canUnjail: false,
        canEditMemberProfile: false,
        canEditMemberData: false,
        canDeleteAvatar: false,
        canEditLikes: false,
        canEditPoints: false,
        canAssignBanner: false,
        canAssignBadge: false,
        canChangeMemberPassword: false,
        canMoveUsers: false,
        canChangeRoles: false,
        canManagePermissions: false,
        canManageRoles: false,
        canDeleteAccounts: false,
        canDeleteAccount: false,
        canAccessControlPanel: false,
        canManageFilterWords: false,
        canRevealNicks: false,
        canViewAuditLogs: false,
        canClearAuditLogs: false,
        canBroadcast: false,
        canGhostLogin: false,
        canManageShortcuts: false,
        canChangeGlobalTheme: false,
        canDeleteWallPost: false
      };
    }

    if (permissions) {
      rolePermissions[cleanId] = {
        ...rolePermissions[cleanId],
        ...permissions
      };
      saveRolePermissions();
    }

    io.emit('rolesConfigUpdated', rolesConfig);
    io.emit('rolePermissionsUpdated', rolePermissions);
    logMonitorEvent('role', `تم حفظ وتعديل الرتبة [${cleanName}] (الرقم: ${cleanLevel}) بواسطة ${admin.username}`, admin.username);
    socket.emit('systemAlert', `تم حفظ وتحديث الرتبة [${cleanName}] بنجاح ✅`);
    broadcastAllUsers();
    for (const r of chatRooms) {
      broadcastRoomUsers(r.id);
    }
  });

  socket.on('deleteRole', ({ roleId }: { roleId: string }) => {
    const admin = users.find((u) => u.id === socket.id);
    if (!admin) {
      socket.emit('systemAlert', 'يجب تسجيل الدخول أولاً.');
      return;
    }
    const cleanId = (roleId || '').trim().toLowerCase();
    const targetRole = rolesConfig.find((r) => r.id === cleanId);
    if (!targetRole) {
      socket.emit('systemAlert', 'الرتبة غير موجودة.');
      return;
    }
    if (targetRole.isSystem || ['hassan', 'admin', 'super', 'member', 'guest'].includes(cleanId)) {
      socket.emit('systemAlert', 'لا يمكن حذف الرتب الأساسية للنظام.');
      return;
    }

    const actorLevel = getRoleLevel(admin.role);
    const isTopAdminOrAbove = admin.role === 'admin' || admin.role === 'hassan' || actorLevel >= getRoleLevel('admin');

    if (!isTopAdminOrAbove && !hasPermission(admin.role, 'canManagePermissions') && !hasPermission(admin.role, 'canManageRoles')) {
      socket.emit('systemAlert', 'عفواً، ليست لديك صلاحية حذف الرتب.');
      return;
    }
    if (!isSupremeHassan(admin) && (cleanId === admin.role.toLowerCase() || targetRole.level >= actorLevel)) {
      socket.emit('systemAlert', `🚫 حماية الرتب: لا يمكنك حذف رتبتك الخاصة أو رتبة مساوية أو أعلى منك (مستواها: ${targetRole.level}، مستواك: ${actorLevel})!`);
      return;
    }

    rolesConfig = rolesConfig.filter((r) => r.id !== cleanId);
    delete rolePermissions[cleanId];
    saveRolesConfig();
    saveRolePermissions();

    // Reassign all active and registered users with the deleted role to default 'member' role
    let membersReassigned = 0;
    for (const [uname, m] of Object.entries(registeredMembers)) {
      if (m.role?.toLowerCase() === cleanId) {
        m.role = 'member';
        membersReassigned++;
      }
    }
    if (membersReassigned > 0) saveMembers();

    for (const u of users) {
      if (u.role?.toLowerCase() === cleanId) {
        u.role = 'member';
        io.to(u.id).emit('userRoleUpdated', { role: 'member' });
      }
    }
    for (const sess of activeSessions.values()) {
      if (sess.user && sess.user.role?.toLowerCase() === cleanId) {
        sess.user.role = 'member';
      }
    }
    persistActiveSessions();

    io.emit('rolesConfigUpdated', rolesConfig);
    io.emit('rolePermissionsUpdated', rolePermissions);
    io.emit('allRegisteredMembers', getAllRegisteredMembersPayload());
    logMonitorEvent('role', `حذف الرتبة [${targetRole.name}] بواسطة ${admin.username}`, admin.username);
    socket.emit('systemAlert', `تم حذف الرتبة [${targetRole.name}] بنجاح 🗑️`);
    broadcastAllUsers();
    for (const r of chatRooms) {
      broadcastRoomUsers(r.id);
    }
  });

  socket.on('getRolePermissions', () => {
    socket.emit('rolesConfigUpdated', rolesConfig);
    socket.emit('rolePermissionsUpdated', rolePermissions);
  });

  socket.on('updateRolePermissions', ({ role, permissions }: { role: string; permissions: Partial<RolePermissions> }) => {
    const admin = users.find((u) => u.id === socket.id);
    if (!admin) {
      socket.emit('systemAlert', 'يجب تسجيل الدخول أولاً لتعديل الصلاحيات.');
      return;
    }

    const actorLevel = getRoleLevel(admin.role);
    const targetRoleLevel = getRoleLevel(role);
    const isTopAdminOrAbove = admin.role === 'admin' || admin.role === 'hassan' || actorLevel >= getRoleLevel('admin');

    // Strict Hierarchy Check
    if (!isTopAdminOrAbove && !hasPermission(admin.role, 'canManagePermissions') && !hasPermission(admin.role, 'canManageRoles')) {
      socket.emit('systemAlert', 'عفواً، ليست لديك صلاحية إدارة وتعديل جدول الصلاحيات.');
      return;
    }
    if (!isSupremeHassan(admin)) {
      if (role.toLowerCase() === admin.role.toLowerCase()) {
        socket.emit('systemAlert', '🚫 حماية الرتب الصارمة: لا يمكنك إطلاقاً تعديل أو منح أو سحب صلاحيات رتبتك الحالية! يستطيع ذلك فقط من هو أعلى منك رتبة.');
        return;
      }
      if (targetRoleLevel >= actorLevel) {
        socket.emit('systemAlert', `🚫 حماية الرتب الصارمة: لا تملك صلاحية تعديل صلاحيات رتبة مساوية لك أو أعلى منك في المستوى (مستواها: ${targetRoleLevel}، مستواك: ${actorLevel})! يستطيع ذلك فقط من هو أعلى منها رقماً.`);
        return;
      }
    }

    if (role) {
      if (!rolePermissions[role]) {
        rolePermissions[role] = {
          canSendText: true,
          canSendMedia: true,
          canSendVoiceNotes: true,
          canTakeMic: true,
          canPostWall: true,
          canPrivateChat: true,
          canPrivateCall: true,
          canFilter: false,
          canDeleteMessage: false,
          canDeleteMessages: false,
          canPinMessage: false,
          canClearRoomChat: false,
          canLockRoom: false,
          canSetSlowMode: false,
          canChangeRoomSettings: false,
          canPullMic: false,
          canMuteVoice: false,
          canLockVoice: false,
          canStartLive: false,
          canMute: false,
          canMuteText: false,
          canKick: false,
          canBan: false,
          canUnban: false,
          canJail: false,
          canUnjail: false,
          canBroadcast: false,
          canManageShortcuts: false,
          canChangeGlobalTheme: false,
          canRevealNicks: false,
          canEditMemberData: false,
          canEditMemberProfile: false,
          canGhostLogin: false,
          canAccessControlPanel: false,
          canManageRoles: false,
          canManagePermissions: false,
          canChangeMemberPassword: false,
          canEditLikes: false,
          canEditPoints: false,
          canChangeRoles: false,
          canMoveUsers: false,
          canDeleteAvatar: false,
          canWarn: false,
          canDeleteAccounts: false,
          canDeleteAccount: false,
          canManageRooms: false,
          canCreateRooms: false,
          canDeleteWallPost: false,
          canAssignBanner: false,
          canAssignBadge: false
        };
      }
      rolePermissions[role] = { ...rolePermissions[role], ...permissions };
      saveRolePermissions();
      io.emit('rolePermissionsUpdated', rolePermissions);
      logMonitorEvent('role', `تعديل جدول صلاحيات رتبة [${role.toUpperCase()}] بواسطة ${admin.username}`, admin.username);
      socket.emit('systemAlert', `تم حفظ وتثبيت صلاحيات رتبة [${role}] بنجاح ✅`);
    }
  });

  // Check Ghost Login Permission for login screen (فحص صلاحية الدخول المخفي للاسم قبل الدخول)
  socket.on('checkGhostPermission', ({ username }: { username: string }, callback?: (res: { allowed: boolean }) => void) => {
    const clean = sanitizeText(username || '').trim();
    if (!clean) {
      if (typeof callback === 'function') callback({ allowed: false });
      socket.emit('ghostPermissionResult', { username: '', allowed: false });
      return;
    }
    const reg = registeredMembers[clean] || registeredMembers[clean.toLowerCase()];
    let role = 'member';
    if (clean.toLowerCase() === 'sajan' || clean.toLowerCase() === 'admin') {
      role = 'admin';
    } else if (reg) {
      role = reg.role;
    }
    const allowed = Boolean(rolePermissions[role]?.canGhostLogin);
    if (typeof callback === 'function') callback({ allowed });
    socket.emit('ghostPermissionResult', { username: clean, allowed });
  });

  // Global Appearance Listeners (التطبيق العام للثيم والخط والخلفية)
  socket.on('getGlobalAppearance', () => {
    socket.emit('globalAppearanceUpdated', globalAppearance);
  });

  socket.on('updateGlobalAppearance', async ({ theme, fontFamily, fontWeight, wallpaper, bubbleStyle, bannerUrl, logoUrl }: Partial<GlobalAppearance>) => {
    const admin = users.find((u) => u.id === socket.id);
    if (!admin || (!isSupremeHassan(admin) && admin.role !== 'admin' && admin.role !== 'super')) {
      socket.emit('systemAlert', 'تعميم الثيم والخط للعام محصور بطاقم الإدارة.');
      return;
    }
    if (theme) globalAppearance.theme = theme;
    if (fontFamily) globalAppearance.fontFamily = fontFamily;
    if (fontWeight) globalAppearance.fontWeight = fontWeight;
    if (wallpaper) globalAppearance.wallpaper = wallpaper;
    if (bubbleStyle) globalAppearance.bubbleStyle = bubbleStyle;
    if (bannerUrl !== undefined) globalAppearance.bannerUrl = bannerUrl;
    if (logoUrl !== undefined) globalAppearance.logoUrl = logoUrl;
  try {
    await saveGlobalAppearance();
  } catch {
    socket.emit('systemAlert', 'تعذر حفظ إعدادات المظهر في قاعدة البيانات. لم يتم اعتماد التغيير.');
    return;
  }
    io.emit('globalAppearanceUpdated', globalAppearance);
    logMonitorEvent('role', `تعميم مظهر الشات (ثيم: ${globalAppearance.theme}، خط: ${globalAppearance.fontFamily}) بواسطة ${admin.username}`, admin.username);
    socket.emit('systemAlert', 'تم تعميم وتحديث مظهر الشات على كافة الأعضاء بنجاح 📢');
  });

  // Save / Update Custom Theme Preset (حفظ قالب ألوان مخصص وإضافته للثيمات)
  socket.on('saveCustomTheme', async (preset: { id?: string; name: string; colors: Record<string, string>; applyNow?: boolean }) => {
    const admin = users.find((u) => u.id === socket.id);
    if (!admin || (!isSupremeHassan(admin) && admin.role !== 'admin' && admin.role !== 'super')) {
      socket.emit('systemAlert', 'حفظ قوالب الألوان المخصصة محصور بطاقم الإدارة.');
      return;
    }
    const cleanName = sanitizeText(preset?.name || '').trim();
    if (!cleanName || !preset?.colors) {
      socket.emit('systemAlert', 'يرجى إدخال اسم صالح لقالب الألوان.');
      return;
    }
    if (!Array.isArray(globalAppearance.customThemes)) {
      globalAppearance.customThemes = [];
    }
    const themeId = preset.id && preset.id.trim() ? sanitizeText(preset.id).trim() : `custom-theme-${Date.now()}`;
    const newPreset = {
      id: themeId,
      name: cleanName,
      colors: preset.colors,
      createdBy: admin.username,
      createdAt: Date.now()
    };
    const existingIdx = globalAppearance.customThemes.findIndex((t) => t.id === themeId);
    if (existingIdx !== -1) {
      globalAppearance.customThemes[existingIdx] = newPreset;
    } else {
      globalAppearance.customThemes.unshift(newPreset);
      if (globalAppearance.customThemes.length > 30) {
        globalAppearance.customThemes.pop();
      }
    }
    if (preset.applyNow) {
      globalAppearance.theme = themeId;
    }
    try {
      await saveGlobalAppearance();
    } catch {
      socket.emit('systemAlert', 'تعذر حفظ القالب المخصص في قاعدة البيانات.');
      return;
    }
    io.emit('globalAppearanceUpdated', globalAppearance);
    logMonitorEvent('role', `حفظ قالب ألوان مخصص [${cleanName}] بواسطة ${admin.username}`, admin.username);
    socket.emit('systemAlert', `تم حفظ القالب [${cleanName}] وإضافته إلى قائمة الاستايل والثيمات بنجاح 🎨✨`);
  });

  // Delete Custom Theme Preset
  socket.on('deleteCustomTheme', async ({ themeId }: { themeId: string }) => {
    const admin = users.find((u) => u.id === socket.id);
    if (!admin || (!isSupremeHassan(admin) && admin.role !== 'admin' && admin.role !== 'super')) {
      socket.emit('systemAlert', 'حذف قوالب الألوان المخصصة محصور بطاقم الإدارة.');
      return;
    }
    if (!Array.isArray(globalAppearance.customThemes)) return;
    globalAppearance.customThemes = globalAppearance.customThemes.filter((t) => t.id !== themeId);
    if (globalAppearance.theme === themeId) {
      globalAppearance.theme = 'pearl-gray-calm';
    }
    try {
      await saveGlobalAppearance();
    } catch {}
    io.emit('globalAppearanceUpdated', globalAppearance);
    socket.emit('systemAlert', 'تم حذف القالب المخصص بنجاح.');
  });

  // User Style Updates (تحديث لون الاسم ولون خط الرسائل واستدامته فوراً للجميع)
  socket.on('updateUserStyle', ({
    nameColor,
    textColor,
    nameGradient,
    profileBg
  }: {
    nameColor?: string;
    textColor?: string;
    nameGradient?: string;
    profileBg?: string;
  }) => {
    const user = users.find((u) => u.id === socket.id);
    if (!user) return;
    if (nameColor !== undefined) user.nameColor = nameColor;
    if (textColor !== undefined) user.textColor = textColor;
    if (nameGradient !== undefined) user.nameGradient = nameGradient;
    if (profileBg !== undefined) user.profileBg = profileBg;

    if (registeredMembers[user.username]) {
      if (nameColor !== undefined) (registeredMembers[user.username] as any).nameColor = nameColor;
      if (textColor !== undefined) (registeredMembers[user.username] as any).textColor = textColor;
      if (nameGradient !== undefined) (registeredMembers[user.username] as any).nameGradient = nameGradient;
      if (profileBg !== undefined) (registeredMembers[user.username] as any).profileBg = profileBg;
      saveMembers();
    }

    io.emit('userStyleUpdated', {
      username: user.username,
      nameColor: user.nameColor,
          textColor: user.textColor,
          nameGradient: user.nameGradient,
          profileBg: user.profileBg
        });

    if (user.room) {
      broadcastRoomUsers(user.room);
    }
    socket.emit('systemAlert', 'تم حفظ وتحديث تنسيق اسمك ولون خطك للجميع بنجاح ✨');
  });

  // Personal User Appearance Preferences (تحديث وحفظ تفضيلات المظهر الشخصي للمستخدم فقط في حسابه بقاعدة البيانات)
  socket.on('updateUserPreferences', ({
    theme,
    fontFamily,
    wallpaper,
    bubbleStyle,
    fontSize,
    nameColor,
    textColor
  }: {
    theme?: string;
    fontFamily?: string;
    wallpaper?: string;
    bubbleStyle?: string;
    fontSize?: string;
    nameColor?: string;
    textColor?: string;
  }) => {
    const user = users.find((u) => u.id === socket.id);
    if (!user) return;

    // Global appearance is controlled exclusively by administrators. Never let
    // login/profile updates overwrite the server-wide appearance.
    if (fontSize) (user as any).fontSize = fontSize;
    if (nameColor) user.nameColor = nameColor;
    if (textColor) user.textColor = textColor;

    if (registeredMembers[user.username]) {
      if (fontSize) (registeredMembers[user.username] as any).fontSize = fontSize;
      if (nameColor) (registeredMembers[user.username] as any).nameColor = nameColor;
      if (textColor) (registeredMembers[user.username] as any).textColor = textColor;
      saveMembers();
    }

    const sessionToken = user.sessionToken;
    if (sessionToken && activeSessions.has(sessionToken)) {
      const sess = activeSessions.get(sessionToken)!;
      if (fontSize) (sess.user as any).fontSize = fontSize;
      if (nameColor) sess.user.nameColor = nameColor;
      if (textColor) sess.user.textColor = textColor;
    }

    // Acknowledge back to user only - does NOT broadcast to other members!
    socket.emit('preferencesSaved', { theme, fontFamily, wallpaper, bubbleStyle, fontSize, nameColor, textColor });
  });

  // Leave Room (الخروج من الغرفة الحالية فقط دون تسجيل الخروج من الشات)
  socket.on('leaveRoom', ({ room }: { room?: string } = {}) => {
    const user = users.find((u) => u.id === socket.id);
    if (!user) return;
    const currentRoom = room || user.room;
    if (user.micSlot !== null) {
      const slots = getMicSlotsForRoom(currentRoom);
      const slot = slots.find((s) => s.slotNumber === user.micSlot);
      if (slot) slot.user = null;
      user.micSlot = null;
      user.isVoice = false;
      io.to(currentRoom).emit('micSlotsUpdated', slots);
    }
    socket.leave(currentRoom);
    user.room = 'خارج الغرف';
    user.presenceState = user.presenceState || 'online';
    user.lastActiveTime = Date.now();
    for (const sess of activeSessions.values()) {
      if (sess.user && sess.user.username.toLowerCase() === user.username.toLowerCase()) {
        sess.user.room = 'خارج الغرف';
        sess.user.presenceState = user.presenceState;
        sess.user.micSlot = null;
        sess.user.isVoice = false;
        sess.lastActiveTime = Date.now();
      }
    }
    if (currentRoom && currentRoom !== 'خارج الغرف' && !user.isGhost) {
      const leaveNotice: StoredMessage = {
        id: `leave-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        room: currentRoom,
        username: user.username,
        avatarUrl: user.avatarUrl,
        nameBannerUrl: user.nameBannerUrl,
        flag: user.flag,
        badge: 'مغادرة 🚪',
        badgeColor: 'text-amber-400',
        text: `غادر ${user.username} وانتقل إلى بهو الدردشة 🚪`,
        time: getCurrentTimeString(),
        timestamp: Date.now()
      };
      chatHistory.push(leaveNotice);
      saveHistory();
      io.to(currentRoom).emit('message', leaveNotice);
    }
    io.to(currentRoom).emit('userTyping', {
      userId: user.id,
      username: user.username,
      room: currentRoom,
      isTyping: false,
      timestamp: Date.now()
    });
    broadcastRoomUsers(currentRoom);
    socket.emit('roomUsers', { room: 'خارج الغرف', users: [] });
    // Room membership is presence data: publish one authoritative snapshot after leaving.
    broadcastAllUsers();
    socket.emit('leftRoomSuccess', { room: currentRoom });
  });

  // Chat Shortcuts Listeners (إدارة واستعلام اختصارات الشات الذكية)
  socket.on('getShortcuts', () => {
    socket.emit('shortcutsUpdated', chatShortcuts);
  });

  socket.on('addShortcut', ({ trigger, replacement }: { trigger: string; replacement: string }) => {
    const admin = users.find((u) => u.id === socket.id);
    if (!admin || (!isSupremeHassan(admin) && admin.role !== 'admin' && admin.role !== 'super')) {
      socket.emit('systemAlert', 'إدارة وتعديل الاختصارات محصورة بطاقم الإدارة (Admin/Super).');
      return;
    }

    const cleanTrigger = sanitizeText(trigger)?.trim();
    const cleanReplacement = sanitizeText(replacement)?.trim();

    if (!cleanTrigger || !cleanReplacement) {
      socket.emit('systemAlert', 'يرجى إدخال رمز الاختصار والجملة البديلة كاملة.');
      return;
    }

    const existingIndex = chatShortcuts.findIndex(
      (s) => s.trigger.toLowerCase() === cleanTrigger.toLowerCase()
    );

    if (existingIndex !== -1) {
      chatShortcuts[existingIndex].replacement = cleanReplacement;
      chatShortcuts[existingIndex].createdBy = admin.username;
      chatShortcuts[existingIndex].createdAt = Date.now();
    } else {
      const newShortcut: ChatShortcut = {
        id: `sc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        trigger: cleanTrigger,
        replacement: cleanReplacement,
        createdBy: admin.username,
        createdAt: Date.now()
      };
      chatShortcuts.unshift(newShortcut);
    }

    saveShortcuts();
    io.emit('shortcutsUpdated', chatShortcuts);
    logMonitorEvent(
      'security',
      `أضاف المشرف [${admin.username}] اختصاراً جديداً: [${cleanTrigger}] ➔ "${cleanReplacement}"`,
      admin.username
    );
    socket.emit('systemAlert', `تم حفظ وتفعيل الاختصار [${cleanTrigger}] بنجاح ⚡`);
  });

  socket.on('deleteShortcut', ({ shortcutId }: { shortcutId: string }) => {
    const admin = users.find((u) => u.id === socket.id);
    if (!admin || (!isSupremeHassan(admin) && admin.role !== 'admin' && admin.role !== 'super')) {
      socket.emit('systemAlert', 'إدارة الاختصارات محصورة بطاقم الإدارة (Admin/Super).');
      return;
    }

    const item = chatShortcuts.find((s) => s.id === shortcutId);
    if (item) {
      chatShortcuts = chatShortcuts.filter((s) => s.id !== shortcutId);
      saveShortcuts();
      io.emit('shortcutsUpdated', chatShortcuts);
      logMonitorEvent('security', `حذف المشرف [${admin.username}] الاختصار: [${item.trigger}]`, admin.username);
      socket.emit('systemAlert', `تم حذف الاختصار [${item.trigger}] بنجاح.`);
    }
  });

  socket.on('updateShortcut', ({ id, trigger, replacement }: { id: string; trigger: string; replacement: string }) => {
    const admin = users.find((u) => u.id === socket.id);
    if (!admin || (!isSupremeHassan(admin) && admin.role !== 'admin' && admin.role !== 'super')) {
      socket.emit('systemAlert', 'إدارة وتعديل الاختصارات محصورة بطاقم الإدارة (Admin/Super).');
      return;
    }

    const cleanTrigger = sanitizeText(trigger)?.trim();
    const cleanReplacement = sanitizeText(replacement)?.trim();

    if (!cleanTrigger || !cleanReplacement) {
      socket.emit('systemAlert', 'يرجى إدخال رمز الاختصار والجملة البديلة كاملة.');
      return;
    }

    const item = chatShortcuts.find((s) => s.id === id);
    if (item) {
      item.trigger = cleanTrigger;
      item.replacement = cleanReplacement;
      item.createdBy = admin.username;
      item.createdAt = Date.now();
      saveShortcuts();
      io.emit('shortcutsUpdated', chatShortcuts);
      logMonitorEvent('security', `عدل المشرف [${admin.username}] الاختصار: [${cleanTrigger}] ➔ "${cleanReplacement}"`, admin.username);
      socket.emit('systemAlert', `تم تعديل الاختصار [${cleanTrigger}] بنجاح ⚡`);
    }
  });

  // Keep-Alive Heartbeat Responder (يضمن بقاء الاتصال حياً وحساب سرعة الاستجابة Ping)
  socket.on('keepAlivePing', (data?: { timestamp?: number }) => {
    for (const s of activeSessions.values()) {
      if (s.currentSocketId === socket.id) {
        s.lastActiveTime = Date.now();
        break;
      }
    }
    socket.emit('keepAlivePong', { timestamp: Date.now(), clientTimestamp: data?.timestamp });
  });

  // Restore Session without disconnect (استعادة الجلسة الفورية عند فتح قفل الشاشة أو عودة النت دون اعتباره دخول جديد)
  socket.on('restoreSession', ({ sessionToken, username, room, deviceFingerprint, isIncognito }: { sessionToken?: string; username?: string; room?: string; deviceFingerprint?: string; isIncognito?: boolean }) => {
    cleanExpiredBans();

    let session = sessionToken ? activeSessions.get(sessionToken) : undefined;
    if (!session && username) {
      const token = usernameToSessionMap.get(username.trim().toLowerCase());
      if (token) session = activeSessions.get(token);
    }

    // Seamless Recovery: If server rebooted/restarted and in-memory session was cleared,
    // automatically recreate valid session for recognized registered member instead of kicking them out.
    if (!session && username) {
      const regRes = getRegisteredMember(username);
      if (regRes) {
        const foundKey = regRes.key;
        const member = regRes.member;
        const restoredToken = sessionToken || `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const restoredUser: ConnectedUser = {
          id: socket.id,
          username: foundKey,
          room: room || 'الغرفة العامة',
          avatarSeed: foundKey,
          avatarUrl: member.avatarUrl,
          statusQuote: member.statusQuote || 'عضو في حسان برو',
          flag: member.flag || '🇾🇪',
          role: member.role || 'member',
          likes: member.likes || 0,
          points: member.points || 0,
          isVoice: false,
          micSlot: null,
          isMuted: false,
          isTextMuted: false,
          isSpeaking: false,
          presenceState: 'online',
          ipAddress: clientIp,
          deviceInfo: member.deviceInfo || parseDeviceInfo(socket.handshake.headers['user-agent'] as string),
          deviceFingerprint: deviceFingerprint || member.deviceFingerprint,
          honorBadge: member.honorBadge,
          nameColor: member.nameColor,
          textColor: member.textColor,
          nameGradient: member.nameGradient,
          profileBg: member.profileBg,
          nameBannerUrl: member.nameBannerUrl,
          giftBadges: member.giftBadges || [],
          isIncognito: typeof isIncognito === 'boolean' ? isIncognito : member.isIncognito,
          isJailed: member.isJailed,
          joinedAt: Date.now(),
          sessionToken: restoredToken,
          lastActiveTime: Date.now(),
          engagement: member.engagement
        };
        session = {
          sessionToken: restoredToken,
          user: restoredUser,
          currentSocketId: socket.id,
          lastActiveTime: Date.now(),
          isExplicitlyLoggedOut: false
        };
        activeSessions.set(restoredToken, session);
        usernameToSessionMap.set(foundKey.toLowerCase(), restoredToken);
        persistActiveSessions();
        console.log(`[Session Recovery] Seamlessly recovered member session for [${foundKey}] after container restart.`);
      }
    }

    // Security & Verification on session candidate
    if (session && !session.isExplicitlyLoggedOut) {
      const uName = session.user.username;
      const lowerUName = uName.toLowerCase();
      const currentClientIp = getRealClientIp(socket);
      const incomingFp = (deviceFingerprint || session.user.deviceFingerprint || getRegisteredMember(uName)?.member.deviceFingerprint || '').trim();
      const incomingUid = getPersistentUid(incomingFp);
      const incomingCore = getHardwareCore(incomingFp);
      const incomingCrossHw = getCrossBrowserHwId(incomingFp);
      const coreAccounts = incomingCore ? fingerprintToAccountsMap.get(incomingCore) : undefined;
      const isCoreSharedWithInnocent = coreAccounts
        ? Array.from(coreAccounts).some((acc) => !bannedUsers.has(acc.toLowerCase()))
        : false;
      const crossHwAccounts = incomingCrossHw ? fingerprintToAccountsMap.get(`HW:${incomingCrossHw}`) : undefined;
      const isCrossHwSharedWithInnocent = crossHwAccounts
        ? Array.from(crossHwAccounts).some((acc) => !bannedUsers.has(acc.toLowerCase()))
        : false;

      // 1. Strict Ban Check on Session Restore (IP + Username + Device Fingerprint / UID / Safe Hardware Core / Cross-Browser HW)
      const matchedRecord = Array.from(bannedRecords.values()).find((r) => {
        if ((r.ip && r.ip === currentClientIp) || r.username.toLowerCase() === lowerUName) return true;
        if (!incomingFp) return false;
        const recFps = getAllRecordFingerprints(r);
        return recFps.some(
          (rfp) =>
            rfp === incomingFp ||
            (incomingUid && getPersistentUid(rfp) === incomingUid) ||
            (!isCoreSharedWithInnocent && incomingCore && getHardwareCore(rfp) === incomingCore) ||
            (!isCrossHwSharedWithInnocent && incomingCrossHw && getCrossBrowserHwId(rfp) === incomingCrossHw) ||
            areFingerprintsFromSameDevice(incomingFp, rfp).match
        );
      });
      const isFpBanned = Boolean(
        (incomingFp && bannedDeviceFingerprints.has(incomingFp)) ||
        (incomingUid && bannedDeviceFingerprints.has(`UID:${incomingUid}`)) ||
        (!isCoreSharedWithInnocent && incomingCore && bannedDeviceFingerprints.has(incomingCore)) ||
        (!isCrossHwSharedWithInnocent && incomingCrossHw && bannedDeviceFingerprints.has(`HW:${incomingCrossHw}`))
      );
      const isBanned = Boolean(matchedRecord) || bannedUsers.has(lowerUName) || bannedIps.has(currentClientIp) || isFpBanned;

      if (isBanned) {
        if (!matchedRecord?.expiresAt) {
          if (isBannableIp(currentClientIp)) bannedIps.add(currentClientIp);
          bannedUsers.add(lowerUName);
          addFingerprintToBanSet(incomingFp);
          saveBans();
        }
        session.isExplicitlyLoggedOut = true;
        activeSessions.delete(session.sessionToken);
        usernameToSessionMap.delete(lowerUName);
        persistActiveSessions();
        socket.emit('sessionRestoreFailed', { reason: '🚫 تم حظر جهازك نهائياً من دخول حسان برو بقرار إداري صارم (تم التعرف على بصمة الجهاز حتى مع تغيير الـ IP أو استخدام VPN).' });
        return;
      }

      // 2. Strict Kick Cooldown Check
      const kickUntil = kickedCooldownMap.get(lowerUName) || kickedCooldownMap.get(currentClientIp);
      if (kickUntil && kickUntil > Date.now()) {
        const remainingSecs = Math.ceil((kickUntil - Date.now()) / 1000);
        socket.emit('sessionRestoreFailed', { reason: `⚠️ تم طردك مؤقتاً بقرار إداري. يرجى الانتظار ${remainingSecs} ثانية قبل إعادة الدخول.` });
        return;
      }

      // 3. Emergency Lockdown Check
      if (serverSecurity.emergencyLockdown) {
        if (!isSupremeHassan(session.user) && session.user.role !== 'admin' && session.user.role !== 'super') {
          socket.emit('sessionRestoreFailed', { reason: '🔒 وضع الطوارئ الإداري مفعل حالياً. الدخول محصور بالإدارة والمشرفين.' });
          return;
        }
      }

      // 4. Jail Enforcement
      const isUserJailed = jailedUsernames.has(lowerUName) || 
                           jailedIps.has(currentClientIp) || 
                           Boolean(session.user.isJailed || getRegisteredMember(uName)?.member.isJailed);

      const targetRoom = isUserJailed ? 'سجن حسان برو' : (room || session.user.room || 'الغرفة العامة');

      if (pendingAwayTimers.has(lowerUName)) {
        clearTimeout(pendingAwayTimers.get(lowerUName)!);
        pendingAwayTimers.delete(lowerUName);
      }

      const oldSocketId = session.currentSocketId;
      if (oldSocketId && oldSocketId !== socket.id) {
        const oldSock = io.sockets.sockets.get(oldSocketId);
        if (oldSock) {
          try {
            oldSock.disconnect(true);
          } catch {}
        }
      }

      session.currentSocketId = socket.id;
      session.lastActiveTime = Date.now();
      session.user.id = socket.id;
      session.user.presenceState = 'online';
      session.user.room = targetRoom;
      if (isUserJailed) {
        session.user.isJailed = true;
        session.user.isTextMuted = true;
        session.user.isMuted = true;
      }

      socket.join(targetRoom);

      const memberReg = getRegisteredMember(uName)?.member;
      if (memberReg) {
        session.user.nameBannerUrl = memberReg.nameBannerUrl;
        session.user.giftBadges = memberReg.giftBadges;
        session.user.role = memberReg.role || session.user.role;
      }

      const clientUserAgent = (socket.handshake.headers['user-agent'] as string) || '';
      const clientDevice = parseDeviceInfo(clientUserAgent);
      session.user.ipAddress = currentClientIp;
      session.user.deviceInfo = clientDevice;
      if (incomingFp) session.user.deviceFingerprint = incomingFp;
      if (typeof isIncognito === 'boolean') {
        session.user.isIncognito = isIncognito;
        if (memberReg) memberReg.isIncognito = isIncognito;
      }
      recordMemberAuditConnection(session.user.username, currentClientIp, clientDevice, session.user.flag || '🇾🇪', incomingFp || undefined);

      // Purge any duplicate records of this user across the users array
      let foundExisting = false;
      for (let i = users.length - 1; i >= 0; i--) {
        if (users[i].username.toLowerCase() === lowerUName) {
          if (!foundExisting) {
            users[i].id = socket.id;
            users[i].room = targetRoom;
            users[i].presenceState = 'online';
            users[i].ipAddress = currentClientIp;
            users[i].deviceInfo = clientDevice;
            if (incomingFp) users[i].deviceFingerprint = incomingFp;
            if (typeof isIncognito === 'boolean') users[i].isIncognito = isIncognito;
            users[i].nameBannerUrl = session.user.nameBannerUrl;
            users[i].giftBadges = session.user.giftBadges;
            users[i].role = session.user.role;
            if (isUserJailed) {
              users[i].isJailed = true;
              users[i].isTextMuted = true;
              users[i].isMuted = true;
            }
            session.user = users[i];
            foundExisting = true;
          } else {
            // Remove duplicate zombie entry
            users.splice(i, 1);
          }
        }
      }
      if (!foundExisting) {
        users.unshift(session.user);
      }

      if (session.user.micSlot !== null && !isUserJailed) {
        const slots = getMicSlotsForRoom(targetRoom);
        const slot = slots.find((s) => s.slotNumber === session!.user.micSlot);
        if (slot) {
          slot.user = session.user;
          io.to(targetRoom).emit('micSlotsUpdated', slots);
        }
      }

      socket.emit('sessionRestored', {
        user: session.user,
        sessionToken: session.sessionToken,
        room: targetRoom
      });

      const restoredRoomSettings = roomSettingsMap[targetRoom] || { isChatLocked: false, slowModeSeconds: 0, isVoiceLocked: false };
      socket.emit('chatConfigSync', {
        rooms: getChatRoomsWithLiveCounts(),
        roomSettings: restoredRoomSettings,
        globalAppearance,
        emblemsConfig,
        rolesConfig,
        rolePermissions,
        generalWelcome: generalWelcomeSettings,
        shortcuts: chatShortcuts,
        likesSettings,
        messageRetentionLimits,
        recentLogins: getRecentLogins(),
        serverSecurity: {
          marqueeTicker: serverSecurity.marqueeTicker,
          guestsAllowed: serverSecurity.guestsAllowed,
          emergencyLockdown: serverSecurity.emergencyLockdown,
          blockExternalLinks: serverSecurity.blockExternalLinks,
          offlineGraceSeconds: serverSecurity.offlineGraceSeconds ?? 45,
          micGraceSeconds: serverSecurity.micGraceSeconds ?? 45,
          awayDelaySeconds: serverSecurity.awayDelaySeconds ?? 120,
          reconnectBannerDelaySeconds: serverSecurity.reconnectBannerDelaySeconds ?? 4,
          likeCooldownSeconds: serverSecurity.likeCooldownSeconds ?? 60
        }
      });

      recordRecentLogin({
        username: session.user.username,
        avatarUrl: session.user.avatarUrl,
        flag: session.user.flag || '🇾🇪',
        room: targetRoom,
        role: session.user.role || 'member',
        timestamp: Date.now(),
        time: getCurrentTimeString()
      });

      // Deliver queued offline private messages if any (persisted in MongoDB)
      const pendingPmList = offlinePrivateMessages.get(lowerUName);
      if (pendingPmList && pendingPmList.length > 0) {
        socket.emit('offlinePrivateMessages', pendingPmList);
        offlinePrivateMessages.delete(lowerUName);
        saveOfflinePrivateMessages();
      }

      // Sync user personal member data (ignored users, starred messages, friends) from MongoDB
      const regMemberData = registeredMembers[session.user.username];
      if (regMemberData) {
        socket.emit('userMemberDataSync', {
          ignoredUsers: regMemberData.ignoredUsers || [],
          starredMessages: regMemberData.starredMessages || [],
          friends: regMemberData.friends || []
        });
      }

      io.emit('userPresenceUpdated', { userId: socket.id, username: session.user.username, state: 'online' });
      broadcastRoomUsers(targetRoom);
      broadcastAllUsers();
      socket.emit('micSlotsUpdated', getMicSlotsForRoom(targetRoom));

      const userRoleLevel = getRoleLevel(session.user.role);
      if (session.user.role === 'admin' || session.user.role === 'super' || hasPermission(session.user.role, 'canAccessControlPanel') || userRoleLevel >= 50) {
        socket.emit('adminInitialData', {
          bannedList: Array.from(bannedRecords.values()),
          staffMemos,
          filterAlerts,
          monitoredWords,
          rolePermissions,
          rolesConfig,
          serverSecurity,
          monitorLogs: monitorLogs.slice(0, 1000),
          messageRetentionLimits
        });
        socket.emit('monitorLogs', monitorLogs.slice(0, 1000));
        socket.emit('messageRetentionLimitsUpdated', messageRetentionLimits);
        socket.emit('monitoredWordsUpdated', monitoredWords);
        socket.emit('allRegisteredMembers', getAllRegisteredMembersPayload(userRoleLevel, socket.id));
      }
    } else {
      socket.emit('sessionRestoreFailed', { reason: 'انتهت صلاحية الجلسة أو تم تسجيل الدخول من جهاز آخر.' });
    }
  });

  // Explicit Logout by user himself (لا يفصل إلا إذا سجل خروج هو بنفسه)
  socket.on('explicitLogout', ({ sessionToken }: { sessionToken?: string } = {}) => {
    let session = sessionToken ? activeSessions.get(sessionToken) : undefined;
    if (!session) {
      for (const s of activeSessions.values()) {
        if (s.currentSocketId === socket.id) {
          session = s;
          break;
        }
      }
    }

    const uName = session?.user?.username || users.find((u) => u.id === socket.id)?.username;
    if (uName && pendingAwayTimers.has(uName.toLowerCase())) {
      clearTimeout(pendingAwayTimers.get(uName.toLowerCase())!);
      pendingAwayTimers.delete(uName.toLowerCase());
    }

    if (session) {
      session.isExplicitlyLoggedOut = true;
      activeSessions.delete(session.sessionToken);
      if (session.user?.username) {
        usernameToSessionMap.delete(session.user.username.toLowerCase());
      }
      persistActiveSessions();
    }

    const idx = users.findIndex((u) => u.id === socket.id || (uName && u.username.toLowerCase() === uName.toLowerCase()));
    if (idx !== -1) {
      const user = users.splice(idx, 1)[0];
      if (user.micSlot !== null) {
        const slots = getMicSlotsForRoom(user.room);
        const slot = slots.find((s) => s.slotNumber === user.micSlot);
        if (slot) slot.user = null;
        io.to(user.room).emit('micSlotsUpdated', slots);
      }
      logMonitorEvent('leave', `سجل ${user.username} خروجاً رسمياً من الدردشة${user.isGhost ? ' (دخول مخفي 👻)' : ''}`, user.username);
      if (user.room && user.room !== 'خارج الغرف') {
        if (!user.isGhost) {
          const farewellMessage: StoredMessage = {
            id: `logout-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            room: user.room,
            username: user.username,
            avatarUrl: user.avatarUrl,
            nameBannerUrl: user.nameBannerUrl,
            flag: user.flag,
            badge: 'تسجيل خروج 🌹',
            badgeColor: 'text-rose-400',
            text: `سجل ${user.username} خروجه من الدردشة، في أمان الله 🌹`,
            time: getCurrentTimeString(),
            timestamp: Date.now()
          };
          chatHistory.push(farewellMessage);
          saveHistory();
          io.to(user.room).emit('message', farewellMessage);
        }
        broadcastRoomUsers(user.room);
      }
      broadcastAllUsers();
    }

    socket.emit('loggedOutSuccess');
  });

  // Reveal Nicks & Account Discovery (كشف النكات والآي بي والعضويات للأعضاء المتصلين وغير المتصلين)
  socket.on('revealNicks', ({ targetUsername }: { targetUsername: string }) => {
    const admin = users.find((u) => u.id === socket.id);
    if (!admin || (!isSupremeHassan(admin) && admin.role !== 'admin' && admin.role !== 'super')) {
      socket.emit('systemAlert', 'كشف النكات محصور بمدير النظام والمشرفين (Admin/Super).');
      return;
    }

    const cleanTargetName = (targetUsername || '').trim();
    if (!cleanTargetName) return;
    const lowerTarget = cleanTargetName.toLowerCase();

    // 1. Check if user is currently online in memory
    const targetUser = users.find((u) => u.username.toLowerCase() === lowerTarget);

    // 2. Look up member in registeredMembers (case-insensitive)
    const regKey = Object.keys(registeredMembers).find((k) => k.toLowerCase() === lowerTarget);
    const regMember = regKey ? registeredMembers[regKey] : undefined;
    const finalDisplayName = regKey || targetUser?.username || cleanTargetName;

    // 3. Look up active session if present
    const sessionMatch = Array.from(activeSessions.values()).find(
      (s) => s.user?.username?.toLowerCase() === lowerTarget
    );

    // 4. Collect ALL real IPs this member has ever entered with
    const discoveredIps = new Set<string>();

    const addIpIfValid = (candidate?: string) => {
      if (!candidate) return;
      const trimmed = candidate.trim();
      if (!trimmed || trimmed === '192.168.1.100' || trimmed.toLowerCase() === 'unknown') return;
      discoveredIps.add(trimmed);
    };

    // Live socket/online IPs
    addIpIfValid(targetUser?.ipAddress);
    addIpIfValid(targetUser?.ip);

    // Persistent member real IP and full IP history
    addIpIfValid(regMember?.ipAddress);
    if (Array.isArray(regMember?.ipHistory)) {
      regMember.ipHistory.forEach((ip) => addIpIfValid(ip));
    }

    // Active session stored IP
    addIpIfValid(sessionMatch?.user?.ipAddress);
    addIpIfValid(sessionMatch?.user?.ip);

    // Cross-check ipToAccountsMap
    for (const [ip, nicks] of ipToAccountsMap.entries()) {
      if (Array.from(nicks).some((n) => n.toLowerCase() === lowerTarget)) {
        addIpIfValid(ip);
      }
    }

    // Cross-check ban/jail records
    for (const record of bannedRecords.values()) {
      if (record.username.toLowerCase() === lowerTarget && record.ip) {
        addIpIfValid(record.ip);
      }
    }
    for (const record of jailedRecords.values()) {
      if (record.username.toLowerCase() === lowerTarget && record.ip) {
        addIpIfValid(record.ip);
      }
    }

    const ipHistoryList = Array.from(discoveredIps);

    // Determine primary IP: prefer live online IP, then registered IP, then latest from history
    let primaryIp = targetUser?.ipAddress || regMember?.ipAddress || (ipHistoryList.length > 0 ? ipHistoryList[0] : '');
    if (!primaryIp || primaryIp === '192.168.1.100') {
      primaryIp = ipHistoryList.length > 0 ? ipHistoryList[0] : 'غير مسجل';
    }

    // 5. Correlate and discover ALL accounts sharing ANY of these real IPs or hardware fingerprints
    const accountsSet = new Set<string>();
    accountsSet.add(finalDisplayName);

    // Correlate by all discovered real IPs
    ipHistoryList.forEach((ip) => {
      // From in-memory map
      const mappedNicks = ipToAccountsMap.get(ip);
      if (mappedNicks) {
        mappedNicks.forEach((nick) => accountsSet.add(nick));
      }
      // From persistent registered members
      for (const [mName, mData] of Object.entries(registeredMembers)) {
        if (mData.ipAddress === ip || (Array.isArray(mData.ipHistory) && mData.ipHistory.includes(ip))) {
          accountsSet.add(mName);
        }
      }
      // From live users
      users.forEach((u) => {
        if (u.ipAddress === ip || u.ip === ip) {
          accountsSet.add(u.username);
        }
      });
    });

    // Correlate by Hardware Fingerprint, Persistent UID, GPU, and Hardware Core
    const candidateFps = new Set<string>();
    const addCandidateFp = (f?: string) => {
      if (!f) return;
      const t = f.trim();
      if (t && t !== 'FP-DEV-STANDARD') candidateFps.add(t);
    };

    addCandidateFp(targetUser?.deviceFingerprint);
    addCandidateFp(regMember?.deviceFingerprint);
    if (Array.isArray(regMember?.fingerprintHistory)) {
      regMember.fingerprintHistory.forEach((f) => addCandidateFp(f));
    }
    addCandidateFp(sessionMatch?.user?.deviceFingerprint);
    if (primaryIp && primaryIp !== 'غير مسجل') {
      addCandidateFp(ipToFingerprintMap.get(primaryIp));
    }

    const resolvedFingerprint =
      targetUser?.deviceFingerprint ||
      regMember?.deviceFingerprint ||
      Array.from(candidateFps)[0] ||
      (primaryIp && primaryIp !== 'غير مسجل' ? ipToFingerprintMap.get(primaryIp) : undefined) ||
      'FP-DEV-STANDARD';

    // Account match metadata: account -> reason
    const accountMatchReasons: Record<string, string> = {};

    if (candidateFps.size > 0) {
      candidateFps.forEach((fpItem) => {
        const targetUid = getPersistentUid(fpItem);
        const targetCore = getHardwareCore(fpItem);
        const targetCrossHw = getCrossBrowserHwId(fpItem);
        const comps = parseFingerprintComponents(fpItem);

        // 1. Direct and multi-key map lookup in fingerprintToAccountsMap
        const directMapped = fingerprintToAccountsMap.get(fpItem);
        if (directMapped) {
          directMapped.forEach((nick) => {
            accountsSet.add(nick);
            if (!accountMatchReasons[nick]) accountMatchReasons[nick] = 'بصمة الهاتف متطابقة 100%';
          });
        }
        if (targetUid) {
          const uidMapped = fingerprintToAccountsMap.get(`UID:${targetUid}`);
          if (uidMapped) {
            uidMapped.forEach((nick) => {
              accountsSet.add(nick);
              if (!accountMatchReasons[nick]) accountMatchReasons[nick] = 'معرف الجهاز المادي (Device UID) متطابق 100% (نفس الهاتف عبر VPN)';
            });
          }
        }
        if (targetCore) {
          const coreMapped = fingerprintToAccountsMap.get(`CORE:${targetCore}`) || fingerprintToAccountsMap.get(targetCore);
          if (coreMapped) {
            coreMapped.forEach((nick) => {
              accountsSet.add(nick);
              if (!accountMatchReasons[nick]) accountMatchReasons[nick] = 'تطابق عتاد الهاتف الداخلي (Hardware Core) حتى مع اختلاف IP';
            });
          }
        }
        if (targetCrossHw && targetCrossHw !== 'hwerr') {
          const hwMapped = fingerprintToAccountsMap.get(`HW:${targetCrossHw}`);
          if (hwMapped) {
            hwMapped.forEach((nick) => {
              accountsSet.add(nick);
              if (!accountMatchReasons[nick]) accountMatchReasons[nick] = 'تطابق بصمة العتاد العابرة للمتصفحات (Cross-Browser HW)';
            });
          }
        }
        if (comps) {
          if (comps.webglHash && comps.audioHash && comps.webglHash !== 'wglerr' && comps.audioHash !== 'auderr') {
            const hwFullMapped = fingerprintToAccountsMap.get(`HARDWARE:${comps.os}_${comps.cores}_${comps.webglHash}_${comps.audioHash}`);
            if (hwFullMapped) {
              hwFullMapped.forEach((nick) => {
                accountsSet.add(nick);
                if (!accountMatchReasons[nick]) accountMatchReasons[nick] = 'تطابق كامل لمعالج الرسوميات (GPU) والصوت والأنوية (نفس الجهاز عبر VPN)';
              });
            }
          }
        }

        // 2. Comprehensive deep comparison across ALL registered members
        for (const [mName, mData] of Object.entries(registeredMembers)) {
          const mFps = [mData.deviceFingerprint, ...(mData.fingerprintHistory || [])].filter(Boolean) as string[];
          for (const mf of mFps) {
            const result = areFingerprintsFromSameDevice(fpItem, mf);
            if (result.match) {
              accountsSet.add(mName);
              if (!accountMatchReasons[mName]) {
                accountMatchReasons[mName] = `${result.reason} (${result.confidence}%)`;
              }
              break;
            }
          }
        }

        // 3. Deep comparison across live online users
        users.forEach((u) => {
          if (u.deviceFingerprint) {
            const result = areFingerprintsFromSameDevice(fpItem, u.deviceFingerprint);
            if (result.match) {
              accountsSet.add(u.username);
              if (!accountMatchReasons[u.username]) {
                accountMatchReasons[u.username] = `${result.reason} (${result.confidence}%)`;
              }
            }
          }
        });
      });
    }

    const accounts = Array.from(accountsSet);

    // 6. Device, country, presence and last seen resolution
    const resolvedDevice =
      targetUser?.deviceInfo ||
      regMember?.deviceInfo ||
      (Array.isArray(regMember?.deviceHistory) && regMember.deviceHistory[regMember.deviceHistory.length - 1]) ||
      (primaryIp && primaryIp !== 'غير مسجل' ? ipToDeviceMap.get(primaryIp) : undefined) ||
      'هاتف ذكي / كمبيوتر';

    const resolvedCountry =
      targetUser?.flag ||
      regMember?.flag ||
      (primaryIp && primaryIp !== 'غير مسجل' ? ipToCountryMap.get(primaryIp) : undefined) ||
      '🇾🇪';

    const isUserOnline = !!targetUser && targetUser.presenceState !== 'offline';
    const resolvedRole = targetUser?.role || regMember?.role || 'member';
    const resolvedRoom = isUserOnline ? (targetUser?.room || 'الغرفة العامة') : 'غير متصل (أوفلاين)';
    const resolvedLastSeen = isUserOnline
      ? 'متصل الآن'
      : regMember?.lastSeen
      ? new Date(regMember.lastSeen).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })
      : 'غير متوفر';

    socket.emit('revealedNicksResult', {
      targetUsername: finalDisplayName,
      ip: primaryIp,
      ipHistory: ipHistoryList,
      device: resolvedDevice,
      deviceFingerprint: resolvedFingerprint,
      country: resolvedCountry,
      accountsCount: accounts.length,
      accounts: accounts,
      accountMatchReasons: accountMatchReasons,
      role: resolvedRole,
      room: resolvedRoom,
      flag: resolvedCountry,
      isOnline: isUserOnline,
      lastSeen: resolvedLastSeen,
      isIncognito: Boolean(targetUser?.isIncognito || regMember?.isIncognito)
    });

    logMonitorEvent(
      'security',
      `كشف نكات العضو [${finalDisplayName}] بواسطة ${admin.username} (IP: ${primaryIp}, عدد الآيبيهات: ${ipHistoryList.length}, عدد العضويات: ${accounts.length}, الحالة: ${isUserOnline ? 'متصل' : 'أوفلاين'})`,
      admin.username,
      finalDisplayName
    );
  });


  // Get Room Statistics for Control Panel Pie Chart
  socket.on('getRoomStats', () => {
    socket.emit('roomStats', getRoomStatistics());
  });

  // Get Banned List for Control Panel
  socket.on('getBannedList', () => {
    socket.emit('bannedListUpdated', Array.from(bannedRecords.values()));
  });

  // Get Room Settings (locks, slow mode)
  socket.on('getRoomSettings', ({ room }: { room: string }) => {
    socket.emit('roomSettingsUpdated', { room, settings: getRoomSettings(room) });
  });

  // Get Server Security Settings
  socket.on('getServerSecurity', () => {
    socket.emit('serverSecurityUpdated', serverSecurity);
  });

  // Update Server Security Settings (Admin Only)
  socket.on('updateServerSecurity', (newSettings: Partial<ServerSecuritySettings>) => {
    const admin = users.find((u) => u.id === socket.id);
    if (!admin || (!isSupremeHassan(admin) && admin.role !== 'admin' && getRoleLevel(admin.role) < getRoleLevel('admin'))) {
      socket.emit('systemAlert', 'إعدادات أمان السيرفر محصورة بمدير النظام والرتب العليا فقط.');
      return;
    }
    serverSecurity = { ...serverSecurity, ...newSettings };
    saveServerSecurity();
    io.emit('serverSecurityUpdated', serverSecurity);
    logMonitorEvent('security', `تحديث إعدادات أمان الدردشة بواسطة مدير النظام [${admin.username}]`, admin.username);
    socket.emit('systemAlert', 'تم حفظ وتطبيق إعدادات أمان الدردشة بنجاح 🛡️');
  });

  // Likes Threshold Limits (شروط عدد اللايكات المطلوبة للإرسال)
  socket.on('getLikesSettings', () => {
    socket.emit('likesSettingsUpdated', likesSettings);
  });

  socket.on('updateLikesSettings', (newSettings: Partial<LikesThresholdSettings>) => {
    const admin = users.find((u) => u.id === socket.id);
    if (!admin || (!isSupremeHassan(admin) && admin.role !== 'admin' && admin.role !== 'super')) {
      socket.emit('systemAlert', 'تعديل شروط اللايكات محصور بطاقم الإدارة.');
      return;
    }
    likesSettings = {
      roomTextLikes: Math.max(0, parseInt(String(newSettings.roomTextLikes ?? likesSettings.roomTextLikes), 10) || 0),
      roomMediaLikes: Math.max(0, parseInt(String(newSettings.roomMediaLikes ?? likesSettings.roomMediaLikes), 10) || 0),
      wallTextLikes: Math.max(0, parseInt(String(newSettings.wallTextLikes ?? likesSettings.wallTextLikes), 10) || 0),
      wallMediaLikes: Math.max(0, parseInt(String(newSettings.wallMediaLikes ?? likesSettings.wallMediaLikes), 10) || 0),
      pmTextLikes: Math.max(0, parseInt(String(newSettings.pmTextLikes ?? likesSettings.pmTextLikes), 10) || 0),
      pmMediaLikes: Math.max(0, parseInt(String(newSettings.pmMediaLikes ?? likesSettings.pmMediaLikes), 10) || 0),
      micLikes: Math.max(0, parseInt(String(newSettings.micLikes ?? likesSettings.micLikes), 10) || 0),
      callLikes: Math.max(0, parseInt(String(newSettings.callLikes ?? likesSettings.callLikes), 10) || 0)
    };
    saveLikesSettings();
    io.emit('likesSettingsUpdated', likesSettings);
    logMonitorEvent('security', `تحديث شروط اللايكات المطلوبة للرسائل والوسائط والمايك بواسطة [${admin.username}]`, admin.username);
    socket.emit('systemAlert', 'تم حفظ وتطبيق شروط اللايكات بنجاح 👍💾');
  });

  // User Presence State Change (Green dot: online, Yellow dot: away/background, Gray dot: offline)
  socket.on('userPresenceChange', ({ state }: { state: 'online' | 'away' | 'offline' }) => {
    const user = users.find((u) => u.id === socket.id);
    if (!user) return;

    if (pendingAwayTimers.has(user.username.toLowerCase())) {
      clearTimeout(pendingAwayTimers.get(user.username.toLowerCase())!);
      pendingAwayTimers.delete(user.username.toLowerCase());
    }

    user.presenceState = state;
    if (state === 'online') {
      user.lastActiveTime = Date.now();
    }
    if (state === 'offline' && user.micSlot !== null) {
      const slots = getMicSlotsForRoom(user.room);
      const slot = slots.find((s) => s.slotNumber === user.micSlot);
      if (slot) slot.user = null;
      user.micSlot = null;
      user.isVoice = false;
      io.to(user.room).emit('micSlotsUpdated', slots);
    }

    // Keep the authenticated user record in `users` while the socket/session
    // remains alive. Removing it here made a later online state impossible to
    // publish and caused members in other rooms to appear offline.
    io.emit('userPresenceUpdated', { userId: user.id, username: user.username, state });
    broadcastRoomUsers(user.room);
    broadcastAllUsers();
  });

  // Sync Room Messages: In Clean Room Mode, do not backfill past room history when entering/switching rooms
  socket.on('syncRoomMessages', ({ roomId, lastTimestamp }: { roomId: string; lastTimestamp?: number }, callback) => {
    // Clean Room Mode: If lastTimestamp is omitted or <= 0, do not restore past messages
    if (typeof lastTimestamp !== 'number' || lastTimestamp <= 0) {
      if (typeof callback === 'function') {
        callback({ messages: [] });
      } else {
        socket.emit('syncedRoomMessages', { roomId, messages: [] });
      }
      return;
    }

    const reqUser = users.find((u) => u.id === socket.id);
    const isAdminViewer = isSupremeHassan(reqUser) || reqUser?.role === 'admin' || reqUser?.role === 'super';
    const roomCfg = getRoomSettings(roomId || 'الغرفة العامة');
    const canSeeDeleted = isAdminViewer && Boolean(roomCfg.showDeletedNotice);
    const targetRoom = (roomId || 'الغرفة العامة').trim().toLowerCase();
    const roomMsgs = chatHistory.filter(
      (m) => m.room.trim().toLowerCase() === targetRoom && (!m.isDeleted || canSeeDeleted)
    );
    const roomLimit = messageRetentionLimits.roomMaxMessages || 200;
    const missed = roomMsgs.filter((m) => m.timestamp > lastTimestamp).slice(-roomLimit);
    if (typeof callback === 'function') {
      callback({ messages: missed });
    } else {
      socket.emit('syncedRoomMessages', { roomId, messages: missed });
    }
  });

  // Update Room Details from in-room settings
  socket.on('updateRoomDetails', (data: {
    roomId: string;
    name?: string;
    desc?: string;
    isPasswordProtected?: boolean;
    password?: string;
    isChatLocked?: boolean;
    slowModeSeconds?: number;
    isVoiceLocked?: boolean;
    showDeletedNotice?: boolean;
    pinnedTopic?: string;
    welcomeMessage?: string;
    welcomeEnabled?: boolean;
    wallpaper?: string;
  }) => {
    const admin = users.find((u) => u.id === socket.id);
    const isAuthorized = admin && (
      isSupremeHassan(admin) ||
      admin.role === 'admin' ||
      admin.role === 'super' ||
      hasPermission(admin.role, 'canChangeRoomSettings') ||
      hasPermission(admin.role, 'canAccessControlPanel') ||
      getRoleLevel(admin.role) >= 75
    );

    if (!isAuthorized) {
      socket.emit('systemAlert', 'عذراً، تعديل إعدادات الغرفة محصور بالإدارة وأصحاب الصلاحيات فقط 🔒');
      logMonitorEvent('security', `محاولة غير مصرح بها لتعديل إعدادات الغرفة [${data.roomId}] بواسطة [${admin?.username || 'مجهول'}] (الرتبة: ${admin?.role || 'غير معروف'})`, admin?.username || 'مجهول');
      return;
    }
    const room = chatRooms.find((r) => r.id === data.roomId);
    if (room) {
      if (data.name !== undefined) room.name = sanitizeText(data.name);
      if (data.desc !== undefined) room.desc = sanitizeText(data.desc);
      if (data.isPasswordProtected !== undefined) room.isPasswordProtected = data.isPasswordProtected;
      if (data.password !== undefined) room.password = data.password;
      saveChatRooms();
      broadcastRoomsUpdate();
    }
    const curSettings = getRoomSettings(data.roomId);
    if (data.isChatLocked !== undefined) curSettings.isChatLocked = data.isChatLocked;
    if (data.slowModeSeconds !== undefined) curSettings.slowModeSeconds = data.slowModeSeconds;
    if (data.isVoiceLocked !== undefined) curSettings.isVoiceLocked = data.isVoiceLocked;
    if (data.showDeletedNotice !== undefined && (isSupremeHassan(admin) || admin.role === 'admin' || admin.role === 'super')) {
      curSettings.showDeletedNotice = Boolean(data.showDeletedNotice);
    }
    if (data.pinnedTopic !== undefined) {
      curSettings.pinnedTopic = sanitizeText(data.pinnedTopic);
      io.to(data.roomId).emit('pinnedTopic', curSettings.pinnedTopic);
    }
    if (data.welcomeMessage !== undefined) curSettings.welcomeMessage = sanitizeText(data.welcomeMessage);
    if (data.welcomeEnabled !== undefined) curSettings.welcomeEnabled = Boolean(data.welcomeEnabled);
    if (data.wallpaper !== undefined) curSettings.wallpaper = data.wallpaper;
    saveRoomSettings();
    io.to(data.roomId).emit('roomSettingsUpdated', { room: data.roomId, settings: curSettings });
    logMonitorEvent('room', `عدل المشرف [${admin.username}] إعدادات غرفة [${data.roomId}]`, admin.username);
    socket.emit('systemAlert', `تم حفظ وتحديث إعدادات غرفة [${data.roomId}] بنجاح ⚙️`);
  });

  // Get Staff Memos
  socket.on('getStaffMemos', () => {
    socket.emit('staffMemosUpdated', staffMemos);
  });

  // Add Staff Memo
  socket.on('addStaffMemo', ({ text, priority }: { text: string; priority?: 'low' | 'normal' | 'urgent' }) => {
    const user = users.find((u) => u.id === socket.id);
    if (!user || (!isSupremeHassan(user) && user.role !== 'admin' && user.role !== 'super')) {
      socket.emit('systemAlert', 'كتابة الملاحظات الإدارية محصورة بطاقم الإدارة.');
      return;
    }
    const clean = sanitizeText(text);
    if (!clean) return;
    const newMemo: StaffMemo = {
      id: `memo-${Date.now()}`,
      author: user.username,
      role: user.role,
      text: clean,
      priority: priority || 'normal',
      timestamp: Date.now(),
      timeFormatted: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    };
    staffMemos.unshift(newMemo);
    if (staffMemos.length > 50) staffMemos.pop();
    saveStaffMemos();
    io.emit('staffMemosUpdated', staffMemos);
    socket.emit('systemAlert', 'تمت إضافة الملاحظة الإدارية بنجاح 📝');
  });

  // Delete Staff Memo
  socket.on('deleteStaffMemo', ({ memoId }: { memoId: string }) => {
    const user = users.find((u) => u.id === socket.id);
    if (!user || (!isSupremeHassan(user) && user.role !== 'admin' && user.role !== 'super')) return;
    staffMemos = staffMemos.filter((m) => m.id !== memoId);
    saveStaffMemos();
    io.emit('staffMemosUpdated', staffMemos);
  });

  // Manual Ban by IP or Username directly
  socket.on('manualBan', ({ username, ip, reason }: { username: string; ip?: string; reason?: string }) => {
    const admin = users.find((u) => u.id === socket.id);
    if (!admin || (!isSupremeHassan(admin) && admin.role !== 'admin' && !hasPermission(admin.role, 'canBan'))) {
      socket.emit('systemAlert', 'صلاحية الحظر والباند محصورة بمدير النظام وطاقم الإدارة المصرح لهم.');
      return;
    }
    const cleanName = sanitizeText(username?.trim());
    if (!cleanName) return;

    // Hierarchy check: cannot ban equal or higher rank
    const targetMember = getRegisteredMember(cleanName)?.member;
    const targetLive = users.find((u) => u.username.toLowerCase() === cleanName.toLowerCase());
    const targetRole = targetLive?.role || targetMember?.role || 'member';
    if (!isSupremeHassan(admin) && getRoleLevel(targetRole) >= getRoleLevel(admin.role)) {
      socket.emit('systemAlert', 'لا يمكنك حظر عضو ذو رتبة مساوية أو أعلى من رتبتك.');
      return;
    }

    const targetIp = ip?.trim() || targetLive?.ipAddress || targetMember?.ipAddress || '192.168.1.100';
    const allTargetFps = new Set<string>();
    if (targetLive?.deviceFingerprint) allTargetFps.add(targetLive.deviceFingerprint);
    if (targetMember?.deviceFingerprint) allTargetFps.add(targetMember.deviceFingerprint);
    if (Array.isArray(targetMember?.fingerprintHistory)) {
      targetMember.fingerprintHistory.forEach((f) => {
        if (f) allTargetFps.add(f);
      });
    }
    if (targetIp !== '192.168.1.100' && ipToFingerprintMap.has(targetIp)) {
      allTargetFps.add(ipToFingerprintMap.get(targetIp)!);
    }
    for (const sObj of activeSessions.values()) {
      if (sObj.user?.username?.toLowerCase() === cleanName.toLowerCase() && sObj.user?.deviceFingerprint) {
        allTargetFps.add(sObj.user.deviceFingerprint);
      }
    }
    const targetFingerprintsList = Array.from(allTargetFps);
    const targetFingerprint = targetFingerprintsList[0];
    const targetCore = getHardwareCore(targetFingerprint);

    bannedUsers.add(cleanName.toLowerCase());
    if (isBannableIp(targetIp)) {
      bannedIps.add(targetIp);
    }
    targetFingerprintsList.forEach((fpItem) => {
      addFingerprintToBanSet(fpItem);
      if (fingerprintToAccountsMap.has(fpItem)) {
        fingerprintToAccountsMap.get(fpItem)!.forEach((acc) => bannedUsers.add(acc.toLowerCase()));
      }
      const c = getHardwareCore(fpItem);
      if (c && fingerprintToAccountsMap.has(c)) {
        fingerprintToAccountsMap.get(c)!.forEach((acc) => bannedUsers.add(acc.toLowerCase()));
      }
    });

    bannedRecords.set(cleanName.toLowerCase(), {
      username: cleanName,
      ip: targetIp,
      deviceFingerprint: targetFingerprint,
      deviceFingerprints: targetFingerprintsList,
      reason: reason?.trim() || 'حظر إداري يدوي مباشر',
      bannedBy: admin.username,
      timestamp: Date.now()
    });
    saveBans();

    // Clean active sessions
    for (const [sTok, sObj] of activeSessions.entries()) {
      const sFp = sObj.user?.deviceFingerprint;
      if (
        sObj.user?.username?.toLowerCase() === cleanName.toLowerCase() ||
        (targetIp && targetIp !== '192.168.1.100' && sObj.user?.ipAddress === targetIp) ||
        (targetFingerprint && sFp && (sFp === targetFingerprint || (targetCore && getHardwareCore(sFp) === targetCore)))
      ) {
        activeSessions.delete(sTok);
      }
    }
    usernameToSessionMap.delete(cleanName.toLowerCase());
    persistActiveSessions();

    // Disconnect target & any matching device/IP if currently connected
    const liveMatches = users.filter(
      (u) =>
        u.username.toLowerCase() === cleanName.toLowerCase() ||
        (targetIp && targetIp !== '192.168.1.100' && u.ipAddress === targetIp) ||
        (targetFingerprint && u.deviceFingerprint && (u.deviceFingerprint === targetFingerprint || (targetCore && getHardwareCore(u.deviceFingerprint) === targetCore)))
    );
    liveMatches.forEach((target) => {
      io.to(target.id).emit('kickedByAdmin', { reason: 'تم حظرك نهائياً من دخول حسان برو بقرار إداري.', by: admin.username });
      const targetSock = io.sockets.sockets.get(target.id);
      if (targetSock) {
        try {
          targetSock.leave(target.room);
          targetSock.disconnect(true);
        } catch {}
      }
      const tIdx = users.findIndex((u) => u.id === target.id);
      if (tIdx !== -1) users.splice(tIdx, 1);
      broadcastRoomUsers(target.room);
    });
    io.emit('bannedListUpdated', Array.from(bannedRecords.values()));
    logMonitorEvent('ban', `حظر يدوي مباشر لـ [${cleanName}] بواسطة ${admin.username}`, admin.username, cleanName);
    socket.emit('systemAlert', `تم تطبيق الحظر اليدوي على [${cleanName}] وبصمة جهازه بنجاح.`);
  });

  // Critical Global Broadcast Alert Across All Rooms
  socket.on('globalBroadcast', ({ title, text }: { title?: string; text: string }) => {
    const admin = users.find((u) => u.id === socket.id);
    if (!admin || (!isSupremeHassan(admin) && admin.role !== 'admin' && admin.role !== 'super' && !hasPermission(admin.role, 'canBroadcast'))) {
      socket.emit('systemAlert', 'عفواً، إرسال الإشعار العام العاجل متاح للإدارة والمشرفين المصرح لهم فقط.');
      return;
    }
    const cleanText = sanitizeText(text);
    if (!cleanText) return;

    io.emit('criticalGlobalBroadcast', {
      id: `broadcast-${Date.now()}`,
      title: title || 'إعلان ملكي عاجل من إدارة حسان برو 🦅',
      text: cleanText,
      sender: admin.username,
      senderRole: admin.role,
      time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    });
    logMonitorEvent('warn', `إرسال بث أحمر عاجل لجميع الغرف بواسطة [${admin.role.toUpperCase()}] ${admin.username}: "${cleanText}"`, admin.username);
  });

  // Login / Join Room
  socket.on('joinRoom', ({
    username,
    room,
    loginType,
    password,
    flag,
    statusQuote,
    deviceFingerprint,
    isGhost,
    isIncognito
  }: {
    username: string;
    room?: string;
    loginType?: string;
    password?: string;
    flag?: string;
    statusQuote?: string;
    deviceFingerprint?: string;
    isGhost?: boolean;
    isIncognito?: boolean;
  }) => {
    const cleanUsername = sanitizeText(username);
    // Automatic default room: 'الغرفة العامة'
    const targetRoom = sanitizeText(room) || 'الغرفة العامة';

    if (!cleanUsername) {
      socket.emit('loginError', 'يرجى إدخال اسم مستخدم صالح.');
      return;
    }

    // Check Temporary Kick Cooldown (مهلة الطرد المؤقت لدقيقتين)
    const kickUntil = kickedCooldownMap.get(cleanUsername.toLowerCase()) || kickedCooldownMap.get(clientIp);
    if (kickUntil && kickUntil > Date.now()) {
      const remainingSecs = Math.ceil((kickUntil - Date.now()) / 1000);
      socket.emit('loginError', `⚠️ تم طردك مؤقتاً بقرار إداري. يرجى الانتظار ${remainingSecs} ثانية قبل إعادة الدخول.`);
      return;
    }

    // 1. STRICT IP, DEVICE FINGERPRINT, AND ACCOUNT BAN PROTECTION (حظر الآي بي وبصمة الجهاز حتى مع تغيير الـ IP عبر VPN)
    cleanExpiredBans();

    const incomingFp = (deviceFingerprint || '').trim();
    const incomingUid = getPersistentUid(incomingFp);
    const incomingCore = getHardwareCore(incomingFp);
    const incomingCrossHw = getCrossBrowserHwId(incomingFp);
    const coreAccounts = incomingCore ? fingerprintToAccountsMap.get(incomingCore) : undefined;
    const isCoreSharedWithInnocent = coreAccounts
      ? Array.from(coreAccounts).some((acc) => !bannedUsers.has(acc.toLowerCase()))
      : false;
    const crossHwAccounts = incomingCrossHw ? fingerprintToAccountsMap.get(`HW:${incomingCrossHw}`) : undefined;
    const isCrossHwSharedWithInnocent = crossHwAccounts
      ? Array.from(crossHwAccounts).some((acc) => !bannedUsers.has(acc.toLowerCase()))
      : false;

    const matchedRecord = Array.from(bannedRecords.values()).find((r) => {
      if ((r.ip && r.ip === clientIp) || r.username.toLowerCase() === cleanUsername.toLowerCase()) return true;
      if (!incomingFp) return false;
      const recFps = getAllRecordFingerprints(r);
      return recFps.some(
        (rfp) =>
          rfp === incomingFp ||
          (incomingUid && getPersistentUid(rfp) === incomingUid) ||
          (!isCoreSharedWithInnocent && incomingCore && getHardwareCore(rfp) === incomingCore) ||
          (!isCrossHwSharedWithInnocent && incomingCrossHw && getCrossBrowserHwId(rfp) === incomingCrossHw) ||
          areFingerprintsFromSameDevice(incomingFp, rfp).match
      );
    });

    if (!matchedRecord && incomingCrossHw && isCrossHwSharedWithInnocent) {
      const suspectedBanned = Array.from(bannedRecords.values()).find((r) =>
        getAllRecordFingerprints(r).some((rfp) => getCrossBrowserHwId(rfp) === incomingCrossHw)
      );
      if (suspectedBanned) {
        logMonitorEvent(
          'security',
          `⚠️ تنبيه تطابق عتاد عبر متصفح/IP مختلف: [${cleanUsername}] يطابق عتاد العضو المحظور [${suspectedBanned.username}]`,
          cleanUsername,
          suspectedBanned.username
        );
      }
    }

    if (matchedRecord) {
      if (matchedRecord.expiresAt && matchedRecord.expiresAt > Date.now()) {
        const remainingMinutes = Math.ceil((matchedRecord.expiresAt - Date.now()) / 60000);
        const timeLabel = remainingMinutes >= 60
          ? `${Math.floor(remainingMinutes / 60)} ساعة و ${remainingMinutes % 60} دقيقة`
          : `${remainingMinutes} دقيقة`;
        socket.emit('loginError', `🚫 تم حظر جهازك وشبكتك مؤقتاً لتكرار مخالفات الفلتر. يتبقى على انتهاء الحظر: ${timeLabel}.`);
        return;
      }
      if (!matchedRecord.expiresAt) {
        // If banned device tried to enter with a new VPN IP or new nickname, record the new IP & fingerprint too
        if (isBannableIp(clientIp)) bannedIps.add(clientIp);
        bannedUsers.add(cleanUsername.toLowerCase());
        addFingerprintToBanSet(incomingFp);
        saveBans();
        if (matchedRecord.ip && matchedRecord.ip !== clientIp) {
          logMonitorEvent(
            'ban',
            `🛡️ إحباط محاولة تخطي الحظر عبر VPN/تغيير IP: الجهاز المحظور [${matchedRecord.username}] حاول الدخول باسم [${cleanUsername}] من IP جديد [${clientIp}]`,
            'النظام الأمني',
            cleanUsername
          );
        }
        socket.emit('loginError', `🚫 تم حظر جهازك نهائياً من دخول حسان برو بقرار إداري صارم (تم التعرف على بصمة الجهاز حتى مع تغيير الـ IP أو استخدام VPN). (السبب: ${matchedRecord.reason})`);
        return;
      }
    }

    const isIpBanned = bannedIps.has(clientIp);
    const isNameBanned = bannedUsers.has(cleanUsername.toLowerCase());
    const accountsForIp = ipToAccountsMap.get(clientIp);
    const isIpAssociatedWithBanned = accountsForIp ? Array.from(accountsForIp).some((acc) => bannedUsers.has(acc.toLowerCase())) : false;
    const isFpBanned = Boolean(
      (incomingFp && bannedDeviceFingerprints.has(incomingFp)) ||
      (incomingUid && bannedDeviceFingerprints.has(`UID:${incomingUid}`)) ||
      (!isCoreSharedWithInnocent && incomingCore && bannedDeviceFingerprints.has(incomingCore))
    );
    const accountsForFp =
      (incomingFp ? fingerprintToAccountsMap.get(incomingFp) : undefined) ||
      (!isCoreSharedWithInnocent && incomingCore ? fingerprintToAccountsMap.get(incomingCore) : undefined);
    const isFpAssociatedWithBanned = accountsForFp ? Array.from(accountsForFp).some((acc) => bannedUsers.has(acc.toLowerCase())) : false;

    if (isIpBanned || isNameBanned || isIpAssociatedWithBanned || isFpBanned || isFpAssociatedWithBanned) {
      if (isBannableIp(clientIp)) bannedIps.add(clientIp);
      bannedUsers.add(cleanUsername.toLowerCase());
      addFingerprintToBanSet(incomingFp);
      if (!bannedRecords.has(cleanUsername.toLowerCase())) {
        bannedRecords.set(cleanUsername.toLowerCase(), {
          username: cleanUsername,
          ip: clientIp,
          deviceFingerprint: incomingFp || undefined,
          reason: isFpBanned || isFpAssociatedWithBanned
            ? 'حظر بصمة الجهاز: محاولة دخول من جهاز محظور مسبقاً (حتى مع تغيير الـ IP / VPN)'
            : 'حظر IP: محاولة دخول من جهاز/شبكة تم حظرها مسبقاً بقرار إداري',
          bannedBy: 'النظام الأمني',
          timestamp: Date.now()
        });
        saveBans();
        io.emit('bannedListUpdated', Array.from(bannedRecords.values()));
      }
      socket.emit('loginError', '🚫 تم حظر جهازك نهائياً من دخول حسان برو بقرار إداري صارم (تم التعرف على بصمة الجهاز حتى مع تغيير الـ IP أو استخدام VPN).');
      return;
    }

    // 1.5. GEOGRAPHIC ACCESS RESTRICTION ENFORCEMENT (تقييد وحظر الوصول الجغرافي لدول معينة)
    if (serverSecurity.geoRestrictionEnabled && Array.isArray(serverSecurity.geoRestrictedCountries) && serverSecurity.geoRestrictedCountries.length > 0) {
      const prospectiveRole = registeredMembers[cleanUsername]?.role || (loginType === 'member' ? 'member' : 'guest');
      // Admin and Super accounts are always exempt from geo-restrictions
      if (prospectiveRole !== 'admin' && prospectiveRole !== 'super') {
        const headerCountry = ((socket.handshake.headers['cf-ipcountry'] || socket.handshake.headers['x-country-code'] || socket.handshake.headers['x-appengine-country']) as string || '').toUpperCase();
        const flagCountry = flag ? (flagToCodeMap[flag] || '') : '';
        const detectedCountry = headerCountry || flagCountry || '';

        const normalizedRestricted = serverSecurity.geoRestrictedCountries.map((c) => c.toUpperCase());
        const isMatched = normalizedRestricted.includes(detectedCountry) || (flag && normalizedRestricted.includes(flag));

        let isBlocked = false;
        if (serverSecurity.geoRestrictionMode === 'blacklist') {
          // Blacklist mode: Block if country IS in list
          if (isMatched) isBlocked = true;
        } else if (serverSecurity.geoRestrictionMode === 'whitelist') {
          // Whitelist mode: Block if country IS NOT in list
          if (!isMatched) isBlocked = true;
        }

        if (isBlocked) {
          const blockedMsg = serverSecurity.geoBlockedCustomMessage || '🚫 نعتذر، الدخول غير متاح حالياً من منطقتك الجغرافية وفقاً لسياسة الأمان المتبعة في الدردشة.';
          socket.emit('loginError', blockedMsg);
          logMonitorEvent('security', `محاولة دخول مرفوضة بداعي التقييد الجغرافي [${cleanUsername}] من دولة [${detectedCountry || flag || 'غير معروفة'}]`, 'النظام الأمني');
          return;
        }
      }
    }

    // 2. JAIL ROOM ENFORCEMENT (سجن واحتجاز حسان برو - منع الخروج)
    const isUserJailed = jailedUsernames.has(cleanUsername.toLowerCase()) || 
                         jailedIps.has(clientIp) || 
                         Boolean(registeredMembers[cleanUsername]?.isJailed);

    // If an existing live user is in jail and trying to switch rooms:
    const liveSession = users.find((u) => u.id === socket.id);
    if (liveSession && (liveSession.isJailed || liveSession.room === 'سجن حسان برو' || isUserJailed)) {
      if (targetRoom !== 'سجن حسان برو') {
        socket.emit('systemAlert', '🚔 لا يمكنك مغادرة غرفة السجن! أنت محتجز وموقوف بقرار إداري ولا يمكنك الخروج إلا بإفراج رسمي من الإدارة.');
        return;
      }
    }

    let finalTargetRoom = targetRoom;
    if (isUserJailed) {
      finalTargetRoom = 'سجن حسان برو';
    }

    // Security Checks: Lockdown and Guest Restrictions
    if (serverSecurity.emergencyLockdown) {
      const prospectiveRole = registeredMembers[cleanUsername]?.role || (loginType === 'member' ? 'member' : 'guest');
      if (!isSupremeHassan(prospectiveRole) && prospectiveRole !== 'admin' && prospectiveRole !== 'super') {
        socket.emit('loginError', '🔒 وضع الطوارئ الإداري (Emergency Lockdown) مفعل حالياً. الدخول محصور بالإدارة والمشرفين.');
        return;
      }
    }

    if (!serverSecurity.guestsAllowed && loginType === 'guest') {
      socket.emit('loginError', 'عفواً، تم إيقاف دخول الزوار مؤقتاً بقرار إداري. يرجى تسجيل عضوية أو الدخول بحساب مسجل.');
      return;
    }

    // Check Member registration/login with Brute-force Protection
    if (loginType === 'member') {
      const regRes = getRegisteredMember(cleanUsername);
      if (!regRes) {
        socket.emit('loginError', 'اسم العضوية غير مسجل. يمكنك الدخول كزائر أو تسجيل عضوية جديدة.');
        return;
      }
      const member = regRes.member;
      const memberKey = regRes.key;

      const attemptKey = `${clientIp}_${memberKey.toLowerCase()}`;
      const attempt = loginAttemptsMap.get(attemptKey);
      if (attempt && attempt.lockedUntil > Date.now()) {
        const remainingSeconds = Math.ceil((attempt.lockedUntil - Date.now()) / 1000);
        socket.emit('loginError', `🔒 تم قفل محاولات الدخول مؤقتاً لحماية الحساب. يرجى الانتظار ${remainingSeconds} ثانية.`);
        return;
      }

      if (!verifyPassword(password || '', member.password)) {
        const currentCount = (attempt?.count || 0) + 1;
        if (currentCount >= 5) {
          loginAttemptsMap.set(attemptKey, { count: currentCount, lockedUntil: Date.now() + 2 * 60 * 1000 });
          socket.emit('loginError', '🔒 تم إدخال كلمة المرور بالخطأ 5 مرات متتالية. تم قفل الحساب مؤقتاً لمدة دقيقتين.');
        } else {
          loginAttemptsMap.set(attemptKey, { count: currentCount, lockedUntil: 0 });
          socket.emit('loginError', `كلمة المرور غير صحيحة. المحاولة (${currentCount} من 5).`);
        }
        return;
      }
      loginAttemptsMap.delete(attemptKey);

      // If member password was plain text, auto-upgrade to bcrypt hash on successful login
      if (!member.password.startsWith('$2a$') && !member.password.startsWith('$2b$')) {
        member.password = hashPassword(password || '123');
      }
      // Update persistent metadata for member
      member.ipAddress = clientIp;
      if (!Array.isArray(member.ipHistory)) member.ipHistory = [];
      if (isBannableIp(clientIp) && !member.ipHistory.includes(clientIp)) member.ipHistory.push(clientIp);
      if (incomingFp) {
        member.deviceFingerprint = incomingFp;
        if (!Array.isArray(member.fingerprintHistory)) member.fingerprintHistory = [];
        if (!member.fingerprintHistory.includes(incomingFp)) member.fingerprintHistory.push(incomingFp);
      }
      member.deviceInfo = parseDeviceInfo(socket.handshake.headers['user-agent'] as string);
      member.lastSeen = Date.now();
      if (isUserJailed) member.isJailed = true;
      saveMembers();
    } else if (loginType === 'register') {
      const existing = getRegisteredMember(cleanUsername);
      if (existing) {
        socket.emit('loginError', 'هذا الاسم مسجل مسبقاً، يرجى اختيار اسم عضوية آخر.');
        return;
      }
      registeredMembers[cleanUsername] = {
        password: hashPassword(password || '123'),
        role: 'member',
        flag: detectedRealFlag || flag || '🇾🇪',
        statusQuote: (statusQuote && statusQuote !== 'عضو جديد') ? statusQuote : 'عضو معتمد في حسان برو',
        likes: 500,
        points: 10000,
        ipAddress: clientIp,
        ipHistory: isBannableIp(clientIp) ? [clientIp] : [],
        deviceInfo: parseDeviceInfo(socket.handshake.headers['user-agent'] as string),
        deviceHistory: [parseDeviceInfo(socket.handshake.headers['user-agent'] as string)],
        deviceFingerprint: incomingFp || undefined,
        fingerprintHistory: incomingFp ? [incomingFp] : [],
        lastSeen: Date.now(),
        isJailed: isUserJailed
      };
      saveMembers();
    } else if (loginType === 'visitor') {
      const existingVisitor = getRegisteredMember(cleanUsername);
      if (existingVisitor && existingVisitor.member.role !== 'guest') {
        socket.emit('loginError', 'هذا الاسم مسجل لعضوية خاصة بكلمة مرور. يرجى تسجيل الدخول من تبويب [دخول الاعضاء].');
        return;
      }
      // Record visitor in registeredMembers so the admin sees their account and IP even offline!
      if (!existingVisitor) {
        registeredMembers[cleanUsername] = {
          password: hashPassword('123'),
          role: 'guest',
          flag: detectedRealFlag || flag || '🇾🇪',
          statusQuote: 'زائر',
          likes: 100,
          points: 500,
          ipAddress: clientIp,
          ipHistory: isBannableIp(clientIp) ? [clientIp] : [],
          deviceInfo: parseDeviceInfo(socket.handshake.headers['user-agent'] as string),
          deviceHistory: [parseDeviceInfo(socket.handshake.headers['user-agent'] as string)],
          deviceFingerprint: incomingFp || undefined,
          fingerprintHistory: incomingFp ? [incomingFp] : [],
          lastSeen: Date.now(),
          isJailed: isUserJailed
        };
        saveMembers();
      } else {
        existingVisitor.member.ipAddress = clientIp;
        if (!Array.isArray(existingVisitor.member.ipHistory)) existingVisitor.member.ipHistory = [];
        if (isBannableIp(clientIp) && !existingVisitor.member.ipHistory.includes(clientIp)) {
          existingVisitor.member.ipHistory.push(clientIp);
        }
        if (incomingFp) {
          existingVisitor.member.deviceFingerprint = incomingFp;
          if (!Array.isArray(existingVisitor.member.fingerprintHistory)) existingVisitor.member.fingerprintHistory = [];
          if (!existingVisitor.member.fingerprintHistory.includes(incomingFp)) {
            existingVisitor.member.fingerprintHistory.push(incomingFp);
          }
        }
        existingVisitor.member.lastSeen = Date.now();
        saveMembers();
      }
    }

    // =========================================================================
    // ENFORCE STRICT SINGLE-SESSION PER MEMBER / ACCOUNT
    // (يمنع تعدد الجلسات تماماً: عند تسجيل الدخول من جهاز أو متصفح أو صفحة أخرى،
    // يتم طرد وفصل الجلسة السابقة فوراً واعتماد الجلسة الجديدة فقط)
    // =========================================================================
    const oldSocketIds = new Set<string>();

    // 1. Collect sockets from live users list
    users.forEach((u) => {
      if (u.username.toLowerCase() === cleanUsername.toLowerCase() && u.id !== socket.id) {
        oldSocketIds.add(u.id);
      }
    });

    // 2. Collect sockets from activeSessions and invalidate previous sessions
    for (const [token, sess] of activeSessions.entries()) {
      if (
        sess.user?.username?.toLowerCase() === cleanUsername.toLowerCase() &&
        sess.currentSocketId !== socket.id
      ) {
        if (sess.currentSocketId) oldSocketIds.add(sess.currentSocketId);
        sess.isExplicitlyLoggedOut = true;
        activeSessions.delete(token);
      }
    }
    usernameToSessionMap.delete(cleanUsername.toLowerCase());

    // 3. Clear any pending away timer for this username
    if (pendingAwayTimers.has(cleanUsername.toLowerCase())) {
      clearTimeout(pendingAwayTimers.get(cleanUsername.toLowerCase())!);
      pendingAwayTimers.delete(cleanUsername.toLowerCase());
    }

    // 4. Force disconnect and notify all old sockets
    oldSocketIds.forEach((oldId) => {
      const oldSocket = io.sockets.sockets.get(oldId);
      if (oldSocket) {
        oldSocket.emit('forceLogout', {
          reason: 'duplicate_login',
          message: '⚠️ تم تسجيل الدخول إلى حسابك من متصفح أو جهاز آخر. تم إنهاء هذه الجلسة تلقائياً واعتماد الجلسة الجديدة.'
        });
        try {
          oldSocket.disconnect(true);
        } catch {}
      }
    });

    // 5. Free mic slots for all previous instances of this user in any room
    users.forEach((u) => {
      if (u.username.toLowerCase() === cleanUsername.toLowerCase() && u.micSlot !== null) {
        const slots = getMicSlotsForRoom(u.room);
        const slot = slots.find((s) => s.slotNumber === u.micSlot);
        if (slot) slot.user = null;
        io.to(u.room).emit('micSlotsUpdated', slots);
      }
    });

    // 6. Purge all previous instances from users array
    for (let i = users.length - 1; i >= 0; i--) {
      if (users[i].username.toLowerCase() === cleanUsername.toLowerCase() && users[i].id !== socket.id) {
        const removed = users.splice(i, 1)[0];
        broadcastRoomUsers(removed.room);
      }
    }

    // Remove old session if any and track previous room & ghost state
    let previousRoom: string | null = null;
    let previousIsGhost = false;
    const existingIndex = users.findIndex((u) => u.id === socket.id);
    if (existingIndex !== -1) {
      const old = users.splice(existingIndex, 1)[0];
      previousRoom = old.room;
      previousIsGhost = Boolean(old.isGhost);
      if (old.micSlot !== null) {
        const slots = getMicSlotsForRoom(old.room);
        const slot = slots.find((s) => s.slotNumber === old.micSlot);
        if (slot) slot.user = null;
        io.to(old.room).emit('micSlotsUpdated', slots);
      }
      socket.leave(old.room);
    }

    const regResult = getRegisteredMember(cleanUsername);
    const reg = regResult?.member;
    const resolvedUsername = regResult?.key || cleanUsername;
    const realFlag = detectedRealFlag || flag || reg?.flag || '🇾🇪';
    const clientUserAgent = (socket.handshake.headers['user-agent'] as string) || '';
    const clientDevice = parseDeviceInfo(clientUserAgent);

    // Track this username, device, and country under this IP address
    if (!ipToAccountsMap.has(clientIp)) {
      ipToAccountsMap.set(clientIp, new Set<string>());
    }
    ipToAccountsMap.get(clientIp)!.add(resolvedUsername);
    ipToDeviceMap.set(clientIp, clientDevice);
    ipToCountryMap.set(clientIp, realFlag);
    const clientFingerprint = deviceFingerprint || `FP-${clientIp.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase() || 'STD'}`;
    ipToFingerprintMap.set(clientIp, clientFingerprint);

    // Save audit connection details (IP history, device history, fingerprint, lastSeen) to persistent store
    recordMemberAuditConnection(resolvedUsername, clientIp, clientDevice, realFlag, clientFingerprint);

    if (reg) {
      reg.deviceFingerprint = clientFingerprint;
      if (typeof isIncognito === 'boolean') reg.isIncognito = isIncognito;
      saveMembers();
    }

    const userRole = reg?.role || (resolvedUsername.toLowerCase() === 'sajan' ? 'admin' : loginType === 'visitor' ? 'guest' : 'member');
    let userQuote = '';
    if (reg?.statusQuote && reg.statusQuote.trim() && reg.statusQuote.trim() !== 'عضو جديد' && reg.statusQuote.trim() !== '..') {
      userQuote = reg.statusQuote.trim();
    } else if (statusQuote && statusQuote.trim() && statusQuote.trim() !== 'عضو جديد' && statusQuote.trim() !== '..') {
      userQuote = sanitizeText(statusQuote.trim());
    } else {
      userQuote = getDefaultStatusByRole(userRole);
    }

    const userSessionToken = `token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const canGhost = Boolean(rolePermissions[userRole]?.canGhostLogin);
    const effectiveGhost = isGhost !== undefined ? Boolean(isGhost) : previousIsGhost;
    const isGhostUser = Boolean(effectiveGhost && canGhost);

    const newUser: ConnectedUser = {
      id: socket.id,
      username: resolvedUsername,
      room: finalTargetRoom,
      avatarSeed: resolvedUsername,
      avatarUrl: reg?.avatarUrl || undefined,
      statusQuote: userQuote,
      flag: realFlag,
      role: userRole,
      likes: reg ? reg.likes : 500,
      points: reg ? reg.points : 2500,
      honorBadge: reg?.honorBadge || undefined,
      isVoice: false,
      micSlot: null,
      isMuted: isUserJailed,
      isTextMuted: isUserJailed,
      isSpeaking: false,
      presenceState: 'online',
      ipAddress: clientIp,
      deviceInfo: clientDevice,
      deviceFingerprint: clientFingerprint,
      isJailed: isUserJailed,
      isGhost: isGhostUser,
      isIncognito: Boolean(isIncognito),
      joinedAt: Date.now(),
      sessionToken: userSessionToken,
      lastActiveTime: Date.now(),
      nameColor: (reg as any)?.nameColor || undefined,
      textColor: (reg as any)?.textColor || undefined,
      nameGradient: (reg as any)?.nameGradient || undefined,
      profileBg: (reg as any)?.profileBg || undefined,
      theme: (reg as any)?.theme || undefined,
      fontFamily: (reg as any)?.fontFamily || undefined,
      wallpaper: (reg as any)?.wallpaper || undefined,
      bubbleStyle: (reg as any)?.bubbleStyle || undefined,
      fontSize: (reg as any)?.fontSize || undefined,
      nameBannerUrl: reg?.nameBannerUrl || undefined,
      giftBadges: reg?.giftBadges || undefined,
      isPmDisabled: Boolean(reg?.isPmDisabled),
      engagement: reg?.engagement || getDefaultEngagement()
    };

    activeSessions.set(userSessionToken, {
      sessionToken: userSessionToken,
      user: newUser,
      currentSocketId: socket.id,
      lastActiveTime: Date.now(),
      isExplicitlyLoggedOut: false
    });
    usernameToSessionMap.set(resolvedUsername.toLowerCase(), userSessionToken);
    persistActiveSessions();

    users.unshift(newUser);
    socket.join(finalTargetRoom);

    if (isGhostUser) {
      logMonitorEvent('join', `دخل ${newUser.username} إلى ${newUser.room} متخفياً (دخول مخفي 👻) (العلم: ${realFlag} - IP: ${clientIp})`, newUser.username);
    } else {
      logMonitorEvent('join', `دخل ${newUser.username} إلى ${newUser.room} (العلم: ${realFlag} - IP: ${clientIp})`, newUser.username);
      recordRecentLogin({
        username: newUser.username,
        avatarUrl: newUser.avatarUrl,
        nameBannerUrl: newUser.nameBannerUrl,
        statusQuote: newUser.statusQuote,
        flag: newUser.flag,
        room: newUser.room,
        role: newUser.role,
        timestamp: Date.now(),
        time: getCurrentTimeString()
      });
    }

    // Always emit roomJoined so client updates room state
    socket.emit('roomJoined', { user: newUser });

    // If this is a new login session (not just changing rooms with the same socket), emit loginSuccess
    const isNewLogin = !previousRoom || Boolean(loginType);
    if (isNewLogin) {
      socket.emit('loginSuccess', { user: newUser, sessionToken: userSessionToken });
    }

    // Deliver roles configuration and permissions tables to client
    socket.emit('rolesConfigUpdated', rolesConfig);
    socket.emit('rolePermissionsUpdated', rolePermissions);

    if (isUserJailed) {
      socket.emit('systemAlert', '🚔 تنبيه: أنت قيد السجن والاحتجاز الإداري في (سجن حسان برو) بموجب قرار إداري صارم. لا يمكنك التحدث أو الكتابة أو مغادرة السجن إلا بقرار الإفراج.');
    }

    // Send mic slots for this room
    const currentSlots = getMicSlotsForRoom(targetRoom);
    socket.emit('micSlotsUpdated', currentSlots);

    // Send currently pinned message if any
    if (roomPinnedMessages[targetRoom]) {
      socket.emit('roomPinnedMessageUpdated', roomPinnedMessages[targetRoom]);
    }

    // Clean Room Mode: Always clear previous messages on room entrance/switch
    socket.emit('chatHistory', []);

    // Send profile visitors for the logged-in user
    socket.emit('profileVisitorsUpdated', registeredMembers[cleanUsername]?.visitors || []);

    // Deliver queued offline private messages if any (persisted in MongoDB)
    const pendingPmList = offlinePrivateMessages.get(cleanUsername.toLowerCase());
    if (pendingPmList && pendingPmList.length > 0) {
      socket.emit('offlinePrivateMessages', pendingPmList);
      offlinePrivateMessages.delete(cleanUsername.toLowerCase());
      saveOfflinePrivateMessages();
    }

    // Sync member personal data (ignored users, starred messages, friends) from MongoDB
    const regMember = registeredMembers[cleanUsername];
    if (regMember) {
      socket.emit('userMemberDataSync', {
        ignoredUsers: regMember.ignoredUsers || [],
        starredMessages: regMember.starredMessages || [],
        friends: regMember.friends || []
      });
    }

    // Broadcast entry message in chat stream with user name (مستثنى في حالة الدخول المخفي)
    if (!newUser.isGhost) {
      const entryMessage: StoredMessage = {
        id: `enter-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        room: finalTargetRoom,
        username: cleanUsername,
        avatarUrl: newUser.avatarUrl,
        nameBannerUrl: newUser.nameBannerUrl,
        flag: newUser.flag,
        badge: `${finalTargetRoom} Room | دخل الى`,
        badgeColor: 'text-amber-400',
        text: `دخل ${cleanUsername} إلى ${finalTargetRoom} أهلاً وسهلاً 🦅`,
        time: getCurrentTimeString(),
        timestamp: Date.now()
      };
      chatHistory.push(entryMessage);
      saveHistory();
      io.to(finalTargetRoom).emit('message', entryMessage);
    }

    // Send welcome greeting for this user
    const currentRoomObj = chatRooms.find((r) => r.id === finalTargetRoom);
    const roomTitle = currentRoomObj?.name || `${finalTargetRoom} Room`;
    const curRoomSettings = getRoomSettings(finalTargetRoom);

    // 1. Room Owner Custom Welcome Message
    if (curRoomSettings?.welcomeEnabled !== false && curRoomSettings?.welcomeMessage && curRoomSettings.welcomeMessage.trim()) {
      socket.emit('message', {
        id: `welcome-room-${Date.now()}`,
        room: finalTargetRoom,
        username: roomTitle,
        badge: 'ترحـيـب الغرفة',
        badgeColor: 'text-amber-500',
        text: curRoomSettings.welcomeMessage.trim(),
        time: getCurrentTimeString(),
        timestamp: Date.now()
      });
    }

    // 2. Chat General Welcome Message (managed in Control Panel - sent only on initial login, not on room switches)
    if (isNewLogin && generalWelcomeSettings.enabled && generalWelcomeSettings.message && generalWelcomeSettings.message.trim()) {
      socket.emit('message', {
        id: `welcome-gen-${Date.now()}`,
        room: finalTargetRoom,
        username: generalWelcomeSettings.title || 'إدارة حسان برو',
        badge: 'ترحـيـب عام',
        badgeColor: 'text-red-600',
        text: generalWelcomeSettings.message.trim(),
        time: getCurrentTimeString(),
        timestamp: Date.now() + 1
      });
    }

    // Broadcast roomUsers to the newly entered room (filtered for ghost mode)
    broadcastRoomUsers(finalTargetRoom);

    // If switching from another room, broadcast transfer departure to previous room and update users
    if (previousRoom && previousRoom !== finalTargetRoom && previousRoom !== 'خارج الغرف') {
      if (!newUser.isGhost) {
        const switchLeaveMessage: StoredMessage = {
          id: `leave-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          room: previousRoom,
          username: cleanUsername,
          avatarUrl: newUser.avatarUrl,
          nameBannerUrl: newUser.nameBannerUrl,
          flag: newUser.flag,
          badge: `${finalTargetRoom} | انتقل إلى`,
          badgeColor: 'text-amber-400',
          text: `غادر ${cleanUsername} وانتقل إلى غرفة [${finalTargetRoom}] 🚪`,
          time: getCurrentTimeString(),
          timestamp: Date.now()
        };
        chatHistory.push(switchLeaveMessage);
        pruneRoomChatHistory(previousRoom);
        saveHistory();
        io.to(previousRoom).emit('message', switchLeaveMessage);
      }

      broadcastRoomUsers(previousRoom);
    }

    // Authoritative global snapshot broadcast so every client sees updated rooms and presence
    broadcastAllUsers();
    io.emit('allRegisteredMembers', getAllRegisteredMembersPayload());

    // Send admin data to admin, super, or custom roles with control panel permissions / level >= 50
    const userRoleLevel = getRoleLevel(newUser.role);
    if (newUser.role === 'admin' || newUser.role === 'super' || hasPermission(newUser.role, 'canAccessControlPanel') || userRoleLevel >= 50) {
      socket.emit('adminInitialData', {
        bannedList: Array.from(bannedRecords.values()),
        staffMemos,
        filterAlerts,
        monitoredWords,
        rolePermissions,
        rolesConfig,
        serverSecurity,
        monitorLogs: monitorLogs.slice(0, 1000),
        messageRetentionLimits
      });
      socket.emit('monitorLogs', monitorLogs.slice(0, 1000));
      socket.emit('messageRetentionLimitsUpdated', messageRetentionLimits);
      socket.emit('monitoredWordsUpdated', monitoredWords);
      socket.emit('allRegisteredMembers', getAllRegisteredMembersPayload(userRoleLevel, socket.id));
    }
  });

  // User typing indicator event (بث حالة الكتابة الآن للأعضاء في نفس الغرفة مع وميض وتأثير بصري)
  socket.on('typing', ({ isTyping }: { isTyping?: boolean } = {}) => {
    const user = users.find((u) => u.id === socket.id);
    if (!user || !user.room || user.room === 'خارج الغرف') return;

    socket.to(user.room).emit('userTyping', {
      userId: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      flag: user.flag,
      role: user.role,
      nameColor: user.nameColor,
      nameGradient: user.nameGradient,
      room: user.room,
      isTyping: Boolean(isTyping),
      timestamp: Date.now()
    });
  });

  // Private message typing indicator event (بث حالة الكتابة الآن في الخاص للطرف الآخر)
  socket.on('pmTyping', ({ toId, toUsername, isTyping }: { toId?: string; toUsername?: string; isTyping: boolean }) => {
    const user = users.find((u) => u.id === socket.id);
    if (!user) return;

    let recipient = users.find((u) => u.id === toId);
    if (!recipient && toUsername) {
      recipient = users.find((u) => u.username.toLowerCase() === toUsername.trim().toLowerCase());
    }
    if (recipient) {
      io.to(recipient.id).emit('userPmTyping', {
        fromUserId: user.id,
        fromUsername: user.username,
        avatarUrl: user.avatarUrl,
        nameBannerUrl: user.nameBannerUrl,
        isTyping: Boolean(isTyping),
        timestamp: Date.now()
      });
    }
  });

  // Chat message event (Supports text + mediaUrl + voiceNote + replyTo)
  socket.on(
    'chatMessage',
    async ({
      text,
      mediaUrl,
      mediaType,
      voiceNote,
      replyTo
    }: {
      text?: string;
      mediaUrl?: string;
      mediaType?: 'image' | 'video' | 'sticker' | 'audio';
      voiceNote?: { audioUrl: string; duration: number };
      replyTo?: { id: string; username: string; text: string; mediaUrl?: string };
    }) => {
      const user = users.find((u) => u.id === socket.id);
      if (!user) return;

    if (user.isTextMuted) {
      socket.emit('systemAlert', 'أنت خاضع للإسكات حالياً من قبل الإدارة.');
      return;
    }

    // Emergency Lockdown Check
    if (serverSecurity.emergencyLockdown && !isSupremeHassan(user) && user.role !== 'admin' && user.role !== 'super') {
      socket.emit('systemAlert', '🔒 تم تفعيل وضع الطوارئ الإداري (Lockdown)، الإرسال محصور بطاقم الإدارة.');
      return;
    }

    const roomSettings = getRoomSettings(user.room);
    if (roomSettings.isChatLocked && !isSupremeHassan(user) && user.role !== 'admin' && user.role !== 'super') {
      socket.emit('systemAlert', 'الشات العام مقفل حالياً بقرار من إدارة حسان برو.');
      return;
    }

    if (roomSettings.slowModeSeconds > 0 && !isSupremeHassan(user) && user.role !== 'admin' && user.role !== 'super') {
      const lastSent = userLastMessageTime[socket.id] || 0;
      const elapsed = (Date.now() - lastSent) / 1000;
      if (elapsed < roomSettings.slowModeSeconds) {
        const remaining = Math.ceil(roomSettings.slowModeSeconds - elapsed);
        socket.emit('systemAlert', `وضع الدردشة البطيء مفعل: يرجى الانتظار ${remaining} ثواني قبل إرسال رسالتك القادمة.`);
        return;
      }
      userLastMessageTime[socket.id] = Date.now();
    }

    const cleanMsg = sanitizeText(text);
    if (!cleanMsg && !mediaUrl && !voiceNote) return;

    // Likes Requirement Check for Room Messages
    if (!isSupremeHassan(user) && user.role !== 'admin' && user.role !== 'super') {
      if (cleanMsg && likesSettings.roomTextLikes > 0 && user.likes < likesSettings.roomTextLikes) {
        socket.emit('systemAlert', `عفواً، يتطلب إرسال النص في الغرف ${likesSettings.roomTextLikes} لايك على الأقل. رصيدك الحالي: ${user.likes} 👍`);
        return;
      }
      if ((mediaUrl || voiceNote) && likesSettings.roomMediaLikes > 0 && user.likes < likesSettings.roomMediaLikes) {
        socket.emit('systemAlert', `عفواً، يتطلب إرسال الوسائط في الغرفة ${likesSettings.roomMediaLikes} لايك على الأقل. رصيدك الحالي: ${user.likes} 👍`);
        return;
      }
    }

    // External Link Blocker Check
    if (cleanMsg && serverSecurity.blockExternalLinks && !isSupremeHassan(user) && user.role !== 'admin' && user.role !== 'super') {
      const urlPattern = /(https?:\/\/|www\.|\.com|\.net|\.org|\.xyz|\.app|\.me|\.online|t\.me|wa\.me)/i;
      if (urlPattern.test(cleanMsg)) {
        logMonitorEvent('security', `محاولة نشر رابط محظور من [${user.username}]: "${cleanMsg}"`, user.username);
        socket.emit('systemAlert', '⚠️ نشر الروابط والإعلانات الخارجية ممنوع منعاً باتاً في شات حسان برو.');
        return;
      }
    }

    // Check if message matches any monitored filter words (الكلمات المراقبة عبر الفلتر)
    if (cleanMsg) {
      checkAndLogMonitoredWords(cleanMsg, user, { type: 'room', targetName: user.room });
    }

    // Automatic Chat Shortcut Expansion (توسيع واستبدال الاختصارات تلقائياً)
    const expandedMsg = cleanMsg ? expandShortcuts(cleanMsg) : '';

    // Guarantee short URLs (<1KB payload) by converting any client base64 to cloud/local storage
    const safeMediaUrl = await ensureMediaUrlNotBase64(mediaUrl);
    let safeVoiceNote = voiceNote;
    if (voiceNote?.audioUrl) {
      safeVoiceNote = {
        ...voiceNote,
        audioUrl: (await ensureMediaUrlNotBase64(voiceNote.audioUrl)) || voiceNote.audioUrl
      };
    }

    const messageObj: StoredMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      room: user.room,
      username: user.username,
      avatarUrl: user.avatarUrl,
      nameBannerUrl: user.nameBannerUrl,
      flag: user.flag,
      badge: user.role === 'admin' ? 'الإدارة' : user.role === 'super' ? 'سوبر' : undefined,
      badgeColor: user.role === 'admin' ? 'text-red-600' : 'text-amber-400',
      text: expandedMsg,
      mediaUrl: safeMediaUrl,
      mediaType,
      voiceNote: safeVoiceNote,
      replyTo,
      time: getCurrentTimeString(),
      timestamp: Date.now(),
      reactions: {},
      nameColor: user.nameColor,
      textColor: user.textColor,
      nameGradient: user.nameGradient,
      giftBadges: user.giftBadges
    };

    chatHistory.push(messageObj);
    pruneRoomChatHistory(user.room);
    saveHistory();

    // Increment engagement messages count & calculate progression
    const regMember = registeredMembers[user.username];
    if (regMember) {
      if (!regMember.engagement) regMember.engagement = getDefaultEngagement();
      regMember.engagement.messagesSent += 1;
      const engProg = calculateEngagementStars(regMember.engagement);
      regMember.engagement.starsLevel = engProg.starsLevel;
      regMember.engagement.progressPercent = engProg.progressPercent;
      user.engagement = regMember.engagement;
      saveMembers();
    }

    io.to(user.room).emit('message', messageObj);
    socket.to(user.room).emit('userTyping', {
      userId: user.id,
      username: user.username,
      room: user.room,
      isTyping: false,
      timestamp: Date.now()
    });
  });

  // General Broadcast Alert (إشعار عام للغرفة من الإدارة والمشرفين)
  socket.on('broadcastAlert', ({ text }: { text: string }) => {
    const user = users.find((u) => u.id === socket.id);
    if (!user) return;

    if (!isSupremeHassan(user) && user.role !== 'admin' && user.role !== 'super') {
      socket.emit('systemAlert', 'عفواً، إرسال الإشعار والتنبيه العام متاح للإدارة والمشرفين فقط.');
      return;
    }

    const clean = sanitizeText(text);
    if (!clean) return;

    const alertMessageObj: StoredMessage = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      room: user.room,
      username: user.username,
      avatarUrl: user.avatarUrl,
      nameBannerUrl: user.nameBannerUrl,
      flag: user.flag,
      badge: '📢 إشعار عام',
      badgeColor: 'text-amber-500 font-extrabold',
      text: clean,
      time: 'الآن',
      timestamp: Date.now(),
      reactions: {}
    };

    chatHistory.push(alertMessageObj);
    pruneRoomChatHistory(user.room);
    saveHistory();

    io.to(user.room).emit('generalAlert', {
      from: user.username,
      text: clean,
      messageObj: alertMessageObj
    });
    io.to(user.room).emit('message', alertMessageObj);
  });

  // Take Mic slot (1 to 5)
  socket.on('takeMic', ({ slotNumber }: { slotNumber: number }) => {
    const user = users.find((u) => u.id === socket.id);
    if (!user) return;

    if (user.isTextMuted) {
      socket.emit('micError', 'أنت خاضع للإسكات من قبل الإدارة، لا يمكنك الصعود إلى المايك.');
      return;
    }

    if (!isSupremeHassan(user) && user.role !== 'admin' && user.role !== 'super' && likesSettings.micLikes > 0 && user.likes < likesSettings.micLikes) {
      socket.emit('micError', `عفواً، يتطلب الصعود إلى المايك ${likesSettings.micLikes} لايك على الأقل. رصيدك الحالي: ${user.likes} 👍`);
      return;
    }

    const roomSettings = getRoomSettings(user.room);
    if (roomSettings.isVoiceLocked && !isSupremeHassan(user) && user.role !== 'admin' && user.role !== 'super') {
      socket.emit('micError', 'المايكات مقفلة ومحصورة حالياً على الإدارة والمشرفين فقط.');
      return;
    }

    const slots = getMicSlotsForRoom(user.room);
    const targetSlot = slots.find((s) => s.slotNumber === slotNumber);
    if (!targetSlot) return;

    if (targetSlot.user && targetSlot.user.id !== user.id) {
      socket.emit('micError', `المايك رقم ${slotNumber} مشغول حالياً.`);
      return;
    }

    slots.forEach((s) => {
      if (s.user && s.user.id === user.id) s.user = null;
    });

    user.micSlot = slotNumber;
    user.isVoice = true;
    user.isMuted = false;
    user.isSpeaking = false;
    targetSlot.user = user;

    logMonitorEvent('mic_take', `صعد ${user.username} إلى المايك (${slotNumber})`, user.username);
    io.to(user.room).emit('micSlotsUpdated', slots);
    broadcastRoomsUpdate();

    const micMsg: StoredMessage = {
      id: `mic-${Date.now()}`,
      room: user.room,
      username: 'نظام المايكات 🎙️',
      badge: `مايك ${slotNumber}`,
      badgeColor: 'text-emerald-500',
      text: `صعد ${user.username} إلى المايك رقم (${slotNumber}) 🎤`,
      time: getCurrentTimeString(),
      timestamp: Date.now()
    };
    io.to(user.room).emit('message', micMsg);

    const otherVoiceUsers = users.filter((u) => u.room === user.room && u.isVoice && u.id !== socket.id);
    socket.emit('voiceRoomUsers', otherVoiceUsers);
    socket.broadcast.to(user.room).emit('userJoinedVoice', user);
  });

  // Drop Mic slot
  socket.on('dropMic', () => {
    const user = users.find((u) => u.id === socket.id);
    if (!user) return;

    const slots = getMicSlotsForRoom(user.room);
    const slot = slots.find((s) => (user.micSlot !== null && s.slotNumber === user.micSlot) || (s.user && (s.user.id === socket.id || s.user.username.toLowerCase() === user.username.toLowerCase())));
    const releasedNumber = slot ? slot.slotNumber : (user.micSlot || 1);

    // Free any slot holding this user
    slots.forEach((s) => {
      if (s.user && (s.user.id === socket.id || s.user.username.toLowerCase() === user.username.toLowerCase())) {
        s.user = null;
      }
    });

    user.micSlot = null;
    user.isVoice = false;
    user.isSpeaking = false;

    logMonitorEvent('mic_drop', `نزل ${user.username} من المايك (${releasedNumber})`, user.username);
    io.to(user.room).emit('micSlotsUpdated', slots);
    broadcastRoomsUpdate();
    socket.broadcast.to(user.room).emit('userLeftVoice', { userId: socket.id, username: user.username });
  });

  // WebRTC Signaling
  socket.on('voiceSignal', ({ targetId, signal }: { targetId: string; signal: any }) => {
    const sender = users.find((u) => u.id === socket.id);
    if (!sender) return;

    io.to(targetId).emit('voiceSignal', {
      senderId: socket.id,
      senderUsername: sender.username,
      signal
    });
  });

  // Voice state
  socket.on('voiceStateUpdate', ({ isMuted, isSpeaking }: { isMuted?: boolean; isSpeaking?: boolean }) => {
    const user = users.find((u) => u.id === socket.id);
    if (!user) return;

    if (typeof isMuted === 'boolean') user.isMuted = isMuted;
    if (typeof isSpeaking === 'boolean') user.isSpeaking = isSpeaking;

    const slots = getMicSlotsForRoom(user.room);
    io.to(user.room).emit('micSlotsUpdated', slots);
    io.to(user.room).emit('userVoiceStateChanged', {
      userId: user.id,
      isMuted: user.isMuted,
      isSpeaking: user.isSpeaking
    });
  });

  // ================= ADMIN & MODERATION POWERS =================
  socket.on('adminAction', ({
    action,
    targetUsername,
    value,
    reason
  }: {
    action: string;
    targetUsername?: string;
    value?: any;
    reason?: string;
  }) => {
    const admin = users.find((u) => u.id === socket.id);
    if (!admin) {
      socket.emit('systemAlert', 'يجب تسجيل الدخول أولاً لتنفيذ الإجراءات.');
      return;
    }

    const target = users.find((u) => u.username.toLowerCase() === targetUsername?.toLowerCase());
    const regResult = targetUsername ? getRegisteredMember(targetUsername) : null;
    const offlineMember = regResult?.member;
    const resolvedTargetName = regResult?.key || target?.username || targetUsername;

    const readOnlyActions = ['getRoomStats', 'getBannedList', 'getMonitorLogs'];
    const actionsWithoutTarget = [
      'unban', 'globalBroadcast', 'globalClearChat', 'pullAllUsers', 'editRoom', 'deleteRoom', 
      'lockRoomChat', 'setSlowMode', 'lockRoomVoice', 'setRoomPassword', 'adminSiren',
      ...readOnlyActions
    ];

    if (!target && !offlineMember && !actionsWithoutTarget.includes(action) && action !== 'ban') {
      socket.emit('systemAlert', `المستخدم [${targetUsername}] غير موجود في قاعدة بيانات الأعضاء.`);
      return;
    }

    const targetProxy = target ? target : (offlineMember ? { username: resolvedTargetName!, role: offlineMember.role } : undefined);

    // Role Permission & Hierarchy Check: strictly check all non-read-only actions
    if (!readOnlyActions.includes(action)) {
      const perm = canPerformModeration(admin, targetProxy, action);
      if (!perm.allowed) {
        socket.emit('systemAlert', perm.reason || 'ليست لديك الصلاحية لتنفيذ هذا الإجراء.');
        return;
      }
    }

    switch (action) {
      case 'getRoomStats': {
        socket.emit('roomStats', getRoomStatistics());
        break;
      }
      case 'getBannedList': {
        socket.emit('bannedListUpdated', Array.from(bannedRecords.values()));
        break;
      }
      case 'getMonitorLogs': {
        socket.emit('monitorLogs', monitorLogs);
        socket.emit('monitoredWordsUpdated', monitoredWords);
        break;
      }
      // سحب المايك (Revoke Mic)
      case 'pullMic': {
        if (target && target.micSlot !== null) {
          const slots = getMicSlotsForRoom(target.room);
          const slot = slots.find((s) => s.slotNumber === target.micSlot);
          const slotNum = target.micSlot;
          if (slot) slot.user = null;
          target.micSlot = null;
          target.isVoice = false;
          target.isSpeaking = false;

          io.to(target.room).emit('micSlotsUpdated', slots);
          io.to(target.id).emit('micRevokedByAdmin', { adminName: admin.username });
          io.to(target.room).emit('userLeftVoice', { userId: target.id, username: target.username });
          broadcastRoomsUpdate();

          logMonitorEvent('mic_pull', `قام [${admin.role.toUpperCase()}] ${admin.username} بسحب المايك من ${target.username}`, admin.username, target.username);

          const alertMsg: StoredMessage = {
            id: `pull-${Date.now()}`,
            room: target.room,
            username: 'إدارة حسان برو',
            badge: 'سحب المايك',
            badgeColor: 'text-red-600',
            text: `تم سحب المايك (${slotNum}) من ${target.username} بواسطة ${admin.role === 'admin' ? 'مدير النظام' : 'المشرف'} (${admin.username}).`,
            time: getCurrentTimeString(),
            timestamp: Date.now()
          };
          io.to(target.room).emit('message', alertMsg);
          socket.emit('systemAlert', `تم سحب المايك من ${target.username} بنجاح.`);
        }
        break;
      }

      // إسكات (Mute / Unmute Text & Voice)
      case 'mute': {
        if (target) {
          target.isTextMuted = !target.isTextMuted;
          if (target.isTextMuted && target.micSlot !== null) {
            target.isMuted = true;
          }
          logMonitorEvent('mute', `${target.isTextMuted ? 'إسكات' : 'إلغاء إسكات'} ${target.username} بواسطة [${admin.role.toUpperCase()}] ${admin.username}`, admin.username, target.username);
          io.to(target.id).emit('systemAlert', target.isTextMuted ? `تم فرض الإسكات عليك بواسطة ${admin.username}.` : `تم رفع الإسكات عنك بواسطة ${admin.username}.`);
          broadcastRoomUsers(target.room);
          socket.emit('systemAlert', `تم ${target.isTextMuted ? 'إسكات' : 'إلغاء إسكات'} ${target.username} بنجاح.`);
        }
        break;
      }

      // طرد من الغرفة (Kick with 2-minute cooldown)
      case 'kick': {
        if (target) {
          const kickReason = reason || 'مخالفة قوانين وقواعد شات حسان برو';
          logMonitorEvent('kick', `طرد ${target.username} بواسطة [${admin.role.toUpperCase()}] ${admin.username} (السبب: ${kickReason})`, admin.username, target.username);
          
          // Apply 2-minute temporary cooldown on username and IP
          const cooldownExpiry = Date.now() + 2 * 60 * 1000;
          kickedCooldownMap.set(target.username.toLowerCase(), cooldownExpiry);
          if (target.ipAddress) {
            kickedCooldownMap.set(target.ipAddress, cooldownExpiry);
          }

          // Invalidate active session and persistent token
          if (target.sessionToken) {
            activeSessions.delete(target.sessionToken);
          }
          usernameToSessionMap.delete(target.username.toLowerCase());
          persistActiveSessions();

          io.to(target.id).emit('kickedByAdmin', { reason: kickReason, by: admin.username });
          
          if (target.micSlot !== null) {
            const slots = getMicSlotsForRoom(target.room);
            const slot = slots.find((s) => s.slotNumber === target.micSlot);
            if (slot) slot.user = null;
            io.to(target.room).emit('micSlotsUpdated', slots);
          }

          // Disconnect the target socket cleanly so they cannot immediately spam
          const targetSock = io.sockets.sockets.get(target.id);
          if (targetSock) {
            try {
              targetSock.leave(target.room);
              targetSock.disconnect(true);
            } catch {}
          }

          const tIdx = users.findIndex((u) => u.id === target.id);
          if (tIdx !== -1) users.splice(tIdx, 1);
          broadcastRoomUsers(target.room);
          broadcastAllUsers();
          io.emit('allRegisteredMembers', getAllRegisteredMembersPayload());
          io.emit('onlineCountUpdated', getPresenceSnapshot().filter((u) => u.presenceState !== 'offline').length);
          socket.emit('systemAlert', `تم طرد ${target.username} بنجاح (مع فرض مهلة دقيقتين لمنع الإزعاج).`);
        }
        break;
      }

      // باند وحظر دائم يشمل عنوان الـ IP وبصمة الجهاز والحسابات المرتبطة (Ban IP, Device Fingerprint & Username)
      case 'ban': {
        const uName = (targetUsername || target?.username || '').trim();
        if (!uName) break;
        const banReason = value || reason || 'مخالفة شروط وقوانين حسان برو';
        const regTarget = getRegisteredMember(uName)?.member;

        // 1. Resolve target IP & Device Fingerprint
        let targetIp = target?.ipAddress || regTarget?.ipAddress;
        if (!targetIp) {
          for (const [ip, nicks] of ipToAccountsMap.entries()) {
            if (Array.from(nicks).some((n) => n.toLowerCase() === uName.toLowerCase())) {
              targetIp = ip;
              break;
            }
          }
        }
        if (!targetIp) targetIp = clientIp || '192.168.1.1';

        const allTargetFps = new Set<string>();
        if (target?.deviceFingerprint) allTargetFps.add(target.deviceFingerprint);
        if (regTarget?.deviceFingerprint) allTargetFps.add(regTarget.deviceFingerprint);
        if (Array.isArray(regTarget?.fingerprintHistory)) {
          regTarget.fingerprintHistory.forEach((f) => {
            if (f) allTargetFps.add(f);
          });
        }
        if (targetIp && ipToFingerprintMap.has(targetIp)) {
          allTargetFps.add(ipToFingerprintMap.get(targetIp)!);
        }
        for (const sObj of activeSessions.values()) {
          if (sObj.user?.username?.toLowerCase() === uName.toLowerCase() && sObj.user?.deviceFingerprint) {
            allTargetFps.add(sObj.user.deviceFingerprint);
          }
        }
        const targetFingerprintsList = Array.from(allTargetFps);
        const targetFingerprint = targetFingerprintsList[0];
        const targetCore = getHardwareCore(targetFingerprint);

        // 2. Add to banned sets (username, IP, and all device fingerprints + UID + hardware core)
        bannedUsers.add(uName.toLowerCase());
        if (isBannableIp(targetIp)) bannedIps.add(targetIp);
        targetFingerprintsList.forEach((fpItem) => {
          addFingerprintToBanSet(fpItem);
          if (fingerprintToAccountsMap.has(fpItem)) {
            fingerprintToAccountsMap.get(fpItem)!.forEach((acc) => bannedUsers.add(acc.toLowerCase()));
          }
          const c = getHardwareCore(fpItem);
          if (c && fingerprintToAccountsMap.has(c)) {
            fingerprintToAccountsMap.get(c)!.forEach((acc) => bannedUsers.add(acc.toLowerCase()));
          }
        });

        // Ban all accounts associated with this IP
        if (targetIp && ipToAccountsMap.has(targetIp)) {
          ipToAccountsMap.get(targetIp)!.forEach((acc) => {
            bannedUsers.add(acc.toLowerCase());
          });
        }

        bannedRecords.set(uName.toLowerCase(), {
          username: uName,
          ip: targetIp,
          deviceFingerprint: targetFingerprint,
          deviceFingerprints: targetFingerprintsList,
          reason: banReason,
          bannedBy: admin.username,
          timestamp: Date.now()
        });
        saveBans();

        // Invalidate all active sessions for this username, IP, or device fingerprint
        for (const [sTok, sObj] of activeSessions.entries()) {
          const sFp = sObj.user?.deviceFingerprint;
          if (
            sObj.user?.username?.toLowerCase() === uName.toLowerCase() ||
            (targetIp && sObj.user?.ipAddress === targetIp) ||
            (sFp && targetFingerprintsList.some((tfp) => tfp === sFp || (targetCore && getHardwareCore(sFp) === targetCore)))
          ) {
            activeSessions.delete(sTok);
          }
        }
        usernameToSessionMap.delete(uName.toLowerCase());
        persistActiveSessions();

        // 3. Disconnect all live users from this IP, device fingerprint, or username
        const liveToKick = users.filter(
          (u) =>
            u.username.toLowerCase() === uName.toLowerCase() ||
            (targetIp && u.ipAddress === targetIp) ||
            (u.deviceFingerprint && targetFingerprintsList.some((tfp) => tfp === u.deviceFingerprint || (targetCore && getHardwareCore(u.deviceFingerprint) === targetCore)))
        );
        liveToKick.forEach((kUser) => {
          io.to(kUser.id).emit('kickedByAdmin', { reason: `تم حظرك نهائياً وحظر بصمة جهازك وعنوان الـ IP من دخول حسان برو بقرار إداري (${banReason}).`, by: admin.username });
          if (kUser.micSlot !== null) {
            const slots = getMicSlotsForRoom(kUser.room);
            const slot = slots.find((s) => s.slotNumber === kUser.micSlot);
            if (slot) slot.user = null;
            io.to(kUser.room).emit('micSlotsUpdated', slots);
          }
          const kSock = io.sockets.sockets.get(kUser.id);
          if (kSock) {
            try {
              kSock.leave(kUser.room);
              kSock.disconnect(true);
            } catch {}
          }
          const tIdx = users.findIndex((u) => u.id === kUser.id);
          if (tIdx !== -1) users.splice(tIdx, 1);
          broadcastRoomUsers(kUser.room);
        });

        io.emit('bannedListUpdated', Array.from(bannedRecords.values()));
        io.emit('allRegisteredMembers', getAllRegisteredMembersPayload());
        logMonitorEvent('ban', `حظر دائم لـ ${uName} وعنوان الـ IP [${targetIp}] وبصمة الجهاز [${targetFingerprint || 'غير مسجلة'}] بواسطة [${admin.role.toUpperCase()}] ${admin.username} (السبب: ${banReason})`, admin.username, uName);
        socket.emit('systemAlert', `تم تطبيق الباند والحظر النهائي على ${uName} وبصمة جهازه وعنوان الـ IP [${targetIp}] بنجاح.`);
        break;
      }


      // إلغاء الحظر وفك الباند (Unban by Username, IP, or Device Fingerprint - حتى لو كان الشخص غير متصل)
      case 'unban': {
        const uName = (targetUsername || '').trim();
        if (!uName) break;

        let rec = bannedRecords.get(uName.toLowerCase());
        if (!rec) {
          for (const [, v] of bannedRecords.entries()) {
            const vFps = getAllRecordFingerprints(v);
            if (v.ip === uName || vFps.includes(uName) || v.username.toLowerCase() === uName.toLowerCase()) {
              rec = v;
              break;
            }
          }
        }

        if (rec) {
          if (rec.ip) {
            const otherUsesIp = Array.from(bannedRecords.values()).some(
              (r) => r.username.toLowerCase() !== rec!.username.toLowerCase() && r.ip === rec!.ip
            );
            if (!otherUsesIp) bannedIps.delete(rec.ip);
            if (ipToAccountsMap.has(rec.ip)) {
              ipToAccountsMap.get(rec.ip)!.forEach((acc) => {
                if (!bannedRecords.has(acc.toLowerCase())) {
                  bannedUsers.delete(acc.toLowerCase());
                }
              });
            }
          }
          bannedUsers.delete(rec.username.toLowerCase());
          bannedRecords.delete(rec.username.toLowerCase());
          const recFps = getAllRecordFingerprints(rec);
          recFps.forEach((fpItem) => {
            removeFingerprintFromBanSet(fpItem);
            const fpAccs = fingerprintToAccountsMap.get(fpItem);
            if (fpAccs) {
              fpAccs.forEach((acc) => {
                if (!bannedRecords.has(acc.toLowerCase())) {
                  bannedUsers.delete(acc.toLowerCase());
                }
              });
            }
            const core = getHardwareCore(fpItem);
            const coreAccs = core ? fingerprintToAccountsMap.get(core) : undefined;
            if (coreAccs) {
              coreAccs.forEach((acc) => {
                if (!bannedRecords.has(acc.toLowerCase())) {
                  bannedUsers.delete(acc.toLowerCase());
                }
              });
            }
          });
        } else {
          bannedUsers.delete(uName.toLowerCase());
          bannedIps.delete(uName);
          bannedRecords.delete(uName.toLowerCase());
        }
        saveBans();

        io.emit('bannedListUpdated', Array.from(bannedRecords.values()));
        logMonitorEvent('role', `فك الحظر والباند عن [${uName}] بواسطة ${admin.username}`, admin.username, uName);
        socket.emit('systemAlert', `تم رفع الحظر وفك الباند عن ${uName} وجميع الحسابات المرتبطة بجهازه بنجاح 🔓.`);
        break;
      }

      // فك الإسكات الكتابي (Unmute Text)
      case 'unmuteText': {
        if (target) {
          target.isTextMuted = false;
          broadcastRoomUsers(target.room);
          io.to(target.id).emit('systemAlert', `تم فك الإسكات الكتابي عنك بواسطة الإدارة (${admin.username}).`);
          logMonitorEvent('mute', `فك الإسكات الكتابي عن ${target.username} بواسطة ${admin.username}`, admin.username, target.username);
          socket.emit('systemAlert', `تم فك الإسكات الكتابي عن ${target.username}.`);
        }
        break;
      }

      // فك الإسكات الصوتي (Unmute Voice)
      case 'unmuteVoice': {
        if (target) {
          target.isMuted = false;
          broadcastRoomUsers(target.room);
          io.to(target.id).emit('systemAlert', `تم فك الإسكات الصوتي عنك بواسطة الإدارة (${admin.username}).`);
          logMonitorEvent('mute', `فك الإسكات الصوتي عن ${target.username} بواسطة ${admin.username}`, admin.username, target.username);
          socket.emit('systemAlert', `تم فك الإسكات الصوتي عن ${target.username}.`);
        }
        break;
      }

      // تعديل النقاط (Update Points - Admin Only - للأعضاء المتصلين وغير المتصلين)
      case 'updatePoints': {
        const uName = (targetUsername || target?.username || '').trim();
        const pts = Number(value) || 0;
        if (target) {
          target.points = pts;
        }
        if (registeredMembers[uName]) {
          registeredMembers[uName].points = pts;
          saveMembers();
        }
        if (target) {
          broadcastRoomUsers(target.room);
        }
        io.emit('allRegisteredMembers', getAllRegisteredMembersPayload());
        logMonitorEvent('role', `تعديل رصيد نقاط ${uName} إلى (${pts}) بواسطة مدير النظام ${admin.username}`, admin.username, uName);
        socket.emit('systemAlert', `تم تعديل نقاط ${uName} إلى ${pts}.`);
        break;
      }

      // قفل أو فتح الشات العام للغرفة (Lock Room Chat)
      case 'lockRoomChat': {
        const room = admin.room;
        const settings = getRoomSettings(room);
        settings.isChatLocked = Boolean(value);
        io.to(room).emit('roomSettingsUpdated', { room, settings });
        logMonitorEvent('role', `${settings.isChatLocked ? 'قفل' : 'فتح'} الشات العام في [${room}] بواسطة ${admin.username}`, admin.username);
        io.to(room).emit('systemAlert', settings.isChatLocked ? '🔒 تم قفل الشات العام مؤقتاً بقرار إداري.' : '🔓 تم فتح الشات العام للجميع.');
        break;
      }

      // تحديد وضع الدردشة البطيء (Set Slow Mode)
      case 'setSlowMode': {
        const room = admin.room;
        const settings = getRoomSettings(room);
        settings.slowModeSeconds = Number(value) || 0;
        io.to(room).emit('roomSettingsUpdated', { room, settings });
        logMonitorEvent('role', `تعديل وضع الدردشة البطيء في [${room}] إلى (${settings.slowModeSeconds} ثواني) بواسطة ${admin.username}`, admin.username);
        io.to(room).emit('systemAlert', settings.slowModeSeconds > 0 ? `⏱️ تم تفعيل وضع الدردشة البطيء (${settings.slowModeSeconds} ثواني بين الرسائل).` : '⏱️ تم إيقاف وضع الدردشة البطيء.');
        break;
      }

      // قفل أو فتح المايكات الصوتية للإدارة فقط (Lock Room Voice)
      case 'lockRoomVoice': {
        const room = admin.room;
        const settings = getRoomSettings(room);
        settings.isVoiceLocked = Boolean(value);
        io.to(room).emit('roomSettingsUpdated', { room, settings });
        logMonitorEvent('role', `${settings.isVoiceLocked ? 'قفل' : 'فتح'} المايكات الصوتية في [${room}] بواسطة ${admin.username}`, admin.username);
        io.to(room).emit('systemAlert', settings.isVoiceLocked ? '🎙️🔒 تم قفل مقاعد الصوت وحصرها على الإدارة فقط.' : '🎙️🔓 تم فتح مقاعد الصوت لجميع الأعضاء.');
        break;
      }

      // تفعيل أو إيقاف إشعار الرسائل المحذوفة للإداريين فقط (Show Deleted Notice for Admins)
      case 'toggleDeletedNotice': {
        const room = admin.room;
        const settings = getRoomSettings(room);
        settings.showDeletedNotice = Boolean(value);
        saveRoomSettings();
        io.to(room).emit('roomSettingsUpdated', { room, settings });
        logMonitorEvent('role', `${settings.showDeletedNotice ? 'تفعيل' : 'إيقاف'} إشعار الرسائل المحذوفة للإداريين في [${room}] بواسطة ${admin.username}`, admin.username);
        io.to(room).emit('systemAlert', settings.showDeletedNotice ? '🗑️ تم تفعيل إظهار إشعار خفيف مكان الرسائل المحذوفة للإداريين فقط.' : '👻 تم إيقاف إشعار الرسائل المحذوفة (اختفاء تام).');
        break;
      }

      // مسح سجل محادثات الغرفة للجميع (Global Clear Chat)
      case 'globalClearChat': {
        const room = admin.room;
        chatHistory.length = 0;
        saveHistory();
        io.to(room).emit('chatHistory', []);
        io.to(room).emit('systemAlert', `🧹 قام المشرف ${admin.username} بمسح سجل محادثات الغرفة كاملاً للجميع.`);
        logMonitorEvent('role', `مسح سجل محادثات الغرفة [${room}] بواسطة ${admin.username}`, admin.username);
        break;
      }

      // سحب جميع المتواجدين في كافة الغرف لغرفة المشرف (Pull All Users)
      case 'pullAllUsers': {
        const targetRoom = admin.room;
        users.forEach((u) => {
          if (u.room !== targetRoom) {
            u.room = targetRoom;
            io.to(u.id).emit('forceMoveRoom', { room: targetRoom });
          }
        });
        chatRooms.forEach((r) => {
          broadcastRoomUsers(r.id);
        });
        io.emit('roomStatsUpdated', getRoomStatistics());
        logMonitorEvent('role', `قام ${admin.username} بسحب جميع الأعضاء إلى غرفة [${targetRoom}]`, admin.username);
        io.emit('systemAlert', `📢 قامت الإدارة بنقل جميع الأعضاء المتواجدين إلى [${targetRoom}]!`);
        break;
      }

      // تعيين أو تغيير كلمة مرور الغرفة (Set Room Password)
      case 'setRoomPassword': {
        const room = chatRooms.find((r) => r.id === admin.room);
        if (room) {
          const pass = sanitizeText(value);
          if (pass) {
            room.isPasswordProtected = true;
            room.password = pass;
            broadcastRoomsUpdate();
            socket.emit('systemAlert', `تم تعيين كلمة مرور للغرفة [${room.name}]: ${pass}`);
          } else {
            room.isPasswordProtected = false;
            delete room.password;
            broadcastRoomsUpdate();
            socket.emit('systemAlert', `تمت إزالة كلمة المرور وأصبحت الغرفة [${room.name}] عامة ومفتوحة.`);
          }
          logMonitorEvent('role', `تعديل حماية وكلمة سر الغرفة [${room.name}] بواسطة ${admin.username}`, admin.username);
        }
        break;
      }

      // إرسال تنبيه رسمي (Warn)
      case 'warn': {
        if (target) {
          const warnText = value || 'الرجاء الالتزام بقوانين حسان برو واحترام المتواجدين.';
          logMonitorEvent('warn', `إرسال تنبيه رسمي لـ ${target.username} بواسطة ${admin.username}`, admin.username, target.username);
          io.to(target.id).emit('officialWarning', { from: admin.username, text: warnText });
          socket.emit('systemAlert', `تم إرسال التنبيه الرسمي إلى ${target.username}.`);
        }
        break;
      }

      // حذف الصورة الشخصية (Delete Avatar - للأعضاء المتصلين وغير المتصلين)
      case 'deleteAvatar': {
        const uName = (targetUsername || target?.username || '').trim();
        if (target) {
          target.avatarUrl = undefined;
        }
        const regFound = getRegisteredMember(uName);
        if (regFound) {
          regFound.member.avatarUrl = undefined;
          saveMembers();
        }
        for (const sess of activeSessions.values()) {
          if (sess.user && sess.user.username.toLowerCase() === uName.toLowerCase()) {
            sess.user.avatarUrl = undefined;
          }
        }
        if (target) {
          broadcastRoomUsers(target.room);
          io.to(target.id).emit('systemAlert', `تم حذف صورتك الشخصية بواسطة الإدارة (${admin.username}) لمخالفتها الآداب العامة.`);
        }
        io.emit('allRegisteredMembers', getAllRegisteredMembersPayload());
        io.emit('userStyleUpdated', { username: regFound?.key || uName, avatarUrl: undefined });
        logMonitorEvent('role', `حذف صورة ${uName} بواسطة [${admin.role.toUpperCase()}] ${admin.username}`, admin.username, uName);
        socket.emit('systemAlert', `تم حذف صورة ${uName} بنجاح.`);
        break;
      }

      // تعيين وتحديث صورة شخصية للعضو (Update Avatar)
      case 'updateAvatar': {
        const uName = (targetUsername || target?.username || '').trim();
        if (value && typeof value === 'string') {
          if (target) {
            target.avatarUrl = value;
          }
          const regFound = getRegisteredMember(uName);
          if (regFound) {
            regFound.member.avatarUrl = value;
            saveMembers();
          }
          for (const sess of activeSessions.values()) {
            if (sess.user && sess.user.username.toLowerCase() === uName.toLowerCase()) {
              sess.user.avatarUrl = value;
            }
          }
          if (target) {
            broadcastRoomUsers(target.room);
            io.to(target.id).emit('systemAlert', `تم تحديث صورتك الشخصية بواسطة الإدارة (${admin.username}).`);
          }
          io.emit('allRegisteredMembers', getAllRegisteredMembersPayload());
          io.emit('userStyleUpdated', { username: regFound?.key || uName, avatarUrl: value });
          logMonitorEvent('role', `تحديث صورة ${uName} بواسطة [${admin.role.toUpperCase()}] ${admin.username}`, admin.username, uName);
          socket.emit('systemAlert', `تم تحديث صورة ${uName} بنجاح.`);
        }
        break;
      }

      // تعديل اللايكات (Update Likes - للأعضاء المتصلين وغير المتصلين)
      case 'updateLikes': {
        const uName = (targetUsername || target?.username || '').trim();
        const lks = Number(value) || 0;
        if (target) {
          target.likes = lks;
        }
        const regFound = getRegisteredMember(uName);
        if (regFound) {
          regFound.member.likes = lks;
          saveMembers();
        }
        for (const sess of activeSessions.values()) {
          if (sess.user && sess.user.username.toLowerCase() === uName.toLowerCase()) {
            sess.user.likes = lks;
          }
        }
        if (target) {
          broadcastRoomUsers(target.room);
        }
        io.emit('allRegisteredMembers', getAllRegisteredMembersPayload());
        logMonitorEvent('likes', `تعديل لايكات ${uName} إلى (${lks}) بواسطة ${admin.username}`, admin.username, uName);
        socket.emit('systemAlert', `تم تعديل لايكات ${uName} إلى ${lks}.`);
        break;
      }

      // تعديل الحالة (Update Quote - للأعضاء المتصلين وغير المتصلين)
      case 'updateQuote': {
        const uName = (targetUsername || target?.username || '').trim();
        const cleanQuote = sanitizeText(value) || '';
        if (target) {
          target.statusQuote = cleanQuote;
        }
        const regFound = getRegisteredMember(uName);
        if (regFound) {
          regFound.member.statusQuote = cleanQuote;
          saveMembers();
        }
        for (const sess of activeSessions.values()) {
          if (sess.user && sess.user.username.toLowerCase() === uName.toLowerCase()) {
            sess.user.statusQuote = cleanQuote;
          }
        }
        if (target) {
          broadcastRoomUsers(target.room);
        }
        io.emit('allRegisteredMembers', getAllRegisteredMembersPayload());
        socket.emit('systemAlert', `تم تحديث حالة ${uName} بنجاح.`);
        break;
      }

      // تعديل الاسم والزخرفة (Update Username)
      case 'updateUsername': {
        if (value && typeof value === 'string') {
          const oldName = (targetUsername || target?.username || '').trim();
          const newName = sanitizeText(value.trim());
          if (newName && newName.toLowerCase() !== oldName.toLowerCase()) {
            if (target) {
              target.username = newName;
            }
            const regFound = getRegisteredMember(oldName);
            if (regFound) {
              const data = regFound.member;
              delete registeredMembers[regFound.key];
              registeredMembers[newName] = data;
              saveMembers();
            }
            for (const sess of activeSessions.values()) {
              if (sess.user && sess.user.username.toLowerCase() === oldName.toLowerCase()) {
                sess.user.username = newName;
              }
            }
            if (usernameToSessionMap.has(oldName.toLowerCase())) {
              const tok = usernameToSessionMap.get(oldName.toLowerCase())!;
              usernameToSessionMap.delete(oldName.toLowerCase());
              usernameToSessionMap.set(newName.toLowerCase(), tok);
            }
            persistActiveSessions();

            if (target) {
              broadcastRoomUsers(target.room);
              io.to(target.id).emit('systemAlert', `تم تعديل اسمك/زخرفتك إلى [${newName}] بواسطة الإدارة.`);
            }
            io.emit('allRegisteredMembers', getAllRegisteredMembersPayload());
            logMonitorEvent('role', `تعديل اسم/زخرفة ${oldName} إلى [${newName}] بواسطة ${admin.username}`, admin.username, oldName);
            socket.emit('systemAlert', `تم تعديل اسم ${oldName} إلى ${newName} بنجاح.`);
          }
        }
        break;
      }

      // تغيير الرتبة والصلاحيات (Update Role - مع حماية هرمية الرتب ومنع التجاوز)
      case 'updateRole': {
        const uName = (targetUsername || target?.username || '').trim();
        const validRole = rolesConfig.find((r) => r.id === value) || (['admin', 'super', 'member', 'guest'].includes(value) ? { id: value, name: value } : null);
        if (validRole) {
          const roleId = validRole.id;
          const actorLevel = getRoleLevel(admin.role);
          const newRoleLevel = getRoleLevel(roleId);

          // Role hierarchy protection: Cannot grant a role equal to or higher than their own level (exempt for supreme 'hassan')
          if (!isSupremeHassan(admin) && newRoleLevel >= actorLevel) {
            socket.emit('systemAlert', 'لا يمكنك منح أو ترقية عضو إلى رتبة مساوية أو أعلى من رتبتك الحالية.');
            break;
          }

          if (target) {
            target.role = roleId;
          }
          const regFound = getRegisteredMember(uName);
          if (regFound) {
            regFound.member.role = roleId as any;
            saveMembers();
          }
          for (const sess of activeSessions.values()) {
            if (sess.user && sess.user.username.toLowerCase() === uName.toLowerCase()) {
              sess.user.role = roleId;
            }
          }
          persistActiveSessions();

          if (target) {
            broadcastRoomUsers(target.room);
            io.to(target.id).emit('userRoleUpdated', { role: roleId });
          }
          broadcastAllUsers();
          io.emit('allRegisteredMembers', getAllRegisteredMembersPayload());
          logMonitorEvent('role', `ترقية وتعيين رتبة ${uName} إلى [${validRole.name || roleId}] بواسطة ${admin.username}`, admin.username, uName);
          socket.emit('systemAlert', `تم تحديث رتبة ${uName} إلى [${validRole.name || roleId}] بنجاح.`);
        }
        break;
      }

      // تغيير كلمة مرور العضو بواسطة الإدارة عند النسيان (Change/Reset Member Password)
      case 'updatePassword': {
        const uName = (targetUsername || target?.username || '').trim();
        const newPassword = String(value || '').trim();
        if (!uName) {
          socket.emit('systemAlert', 'يرجى تحديد اسم العضو المراد تغيير كلمة مروره.');
          break;
        }
        if (!newPassword || newPassword.length < 3) {
          socket.emit('systemAlert', 'يجب أن تتكون كلمة المرور الجديدة من 3 أحرف أو أرقام على الأقل.');
          break;
        }
        const regFound = getRegisteredMember(uName);
        if (!regFound) {
          socket.emit('systemAlert', `العضو [${uName}] غير مسجل في قاعدة بيانات الأعضاء.`);
          break;
        }

        regFound.member.password = hashPassword(newPassword);
        saveMembers();

        if (target) {
          io.to(target.id).emit('systemAlert', `🔑 قامت الإدارة (${admin.username}) بتحديث وتعيين كلمة مرور جديدة لحسابك: [${newPassword}]. يرجى حفظها لاستخدامها عند تسجيل الدخول.`);
        }

        io.emit('allRegisteredMembers', getAllRegisteredMembersPayload());
        logMonitorEvent('role', `قام ${admin.username} بتغيير وتعيين كلمة مرور جديدة لحساب [${regFound.key}]`, admin.username, regFound.key);
        socket.emit('systemAlert', `✅ تم تغيير وتحديث كلمة مرور العضو [${regFound.key}] بنجاح إلى: ${newPassword}`);
        break;
      }

      // نقل العضو لغرفة أخرى
      case 'moveRoom': {
        if (target && value) {
          const oldRoom = target.room;
          target.room = value;
          io.to(target.id).emit('forceMoveRoom', { room: value });
          broadcastRoomUsers(oldRoom);
          broadcastRoomUsers(value);
          io.emit('roomStatsUpdated', getRoomStatistics());
          logMonitorEvent('role', `نقل ${target.username} إلى غرفة [${value}] بواسطة ${admin.username}`, admin.username, target.username);
          socket.emit('systemAlert', `تم نقل ${target.username} إلى ${value}.`);
        }
        break;
      }

      // سجن واحتجاز العضو (Jail User - محكم وشامل للمتصل وغير المتصل)
      case 'jailUser': {
        const uName = (targetUsername || target?.username || '').trim();
        if (!uName) break;
        const jailReason = reason || value || 'مخالفة قوانين وقواعد شات حسان برو';

        let targetIp = target?.ipAddress;
        if (!targetIp && registeredMembers[uName]?.ipAddress) {
          targetIp = registeredMembers[uName].ipAddress;
        }
        if (!targetIp) targetIp = '192.168.1.1';

        jailedUsernames.add(uName.toLowerCase());
        if (targetIp) jailedIps.add(targetIp);
        jailedRecords.set(uName.toLowerCase(), {
          username: uName,
          ip: targetIp,
          reason: jailReason,
          jailedBy: admin.username,
          timestamp: Date.now()
        });
        saveJailed();

        if (registeredMembers[uName]) {
          registeredMembers[uName].isJailed = true;
          saveMembers();
        }

        if (target) {
          const oldRoom = target.room;
          target.room = 'سجن حسان برو';
          target.isTextMuted = true;
          target.isMuted = true;
          target.isJailed = true;
          if (target.micSlot !== null) {
            const slots = getMicSlotsForRoom(oldRoom);
            const slot = slots.find((s) => s.slotNumber === target.micSlot);
            if (slot) slot.user = null;
            target.micSlot = null;
            io.to(oldRoom).emit('micSlotsUpdated', slots);
          }
          io.to(target.id).emit('forceMoveRoom', { room: 'سجن حسان برو' });
          io.to(target.id).emit('systemAlert', `🚔 تم إيداعك في غرفة السجن والتأديب بقرار من الإدارة (${admin.username}). السبب: ${jailReason}. لا يمكنك مغادرة السجن.`);
          broadcastRoomUsers(oldRoom);
          broadcastRoomUsers('سجن حسان برو');
        }

        io.emit('allRegisteredMembers', getAllRegisteredMembersPayload());
        io.emit('roomStatsUpdated', getRoomStatistics());
        logMonitorEvent('jail', `إيداع ${uName} في السجن بواسطة [${admin.role.toUpperCase()}] ${admin.username} (السبب: ${jailReason})`, admin.username, uName);
        socket.emit('systemAlert', `تم إيداع ${uName} في السجن وتثبيت حبسه بنجاح 🚔.`);
        break;
      }

      // فك السجن والإفراج عن العضو (Unjail User - للمتصل وغير المتصل)
      case 'unjailUser': {
        const uName = (targetUsername || target?.username || '').trim();
        if (!uName) break;

        const rec = jailedRecords.get(uName.toLowerCase());
        if (rec?.ip) jailedIps.delete(rec.ip);
        jailedUsernames.delete(uName.toLowerCase());
        jailedRecords.delete(uName.toLowerCase());
        saveJailed();

        const regFound = getRegisteredMember(uName);
        if (regFound) {
          regFound.member.isJailed = false;
          saveMembers();
        }

        for (const sess of activeSessions.values()) {
          if (sess.user && sess.user.username.toLowerCase() === uName.toLowerCase()) {
            sess.user.isJailed = false;
            sess.user.isTextMuted = false;
            sess.user.isMuted = false;
            if (sess.user.room === 'سجن حسان برو') {
              sess.user.room = 'الغرفة العامة';
            }
          }
        }
        persistActiveSessions();

        if (target) {
          const oldRoom = target.room;
          target.room = 'الغرفة العامة';
          target.isTextMuted = false;
          target.isMuted = false;
          target.isJailed = false;
          io.to(target.id).emit('forceMoveRoom', { room: 'الغرفة العامة' });
          io.to(target.id).emit('systemAlert', `🕊️ تم الإفراج عنك ورفع الحبس بواسطة الإدارة (${admin.username}). أهلاً بك مجدداً في الغرفة العامة.`);
          broadcastRoomUsers(oldRoom);
          broadcastRoomUsers('الغرفة العامة');
        }

        io.emit('allRegisteredMembers', getAllRegisteredMembersPayload());
        io.emit('roomStatsUpdated', getRoomStatistics());
        logMonitorEvent('jail', `الإفراج عن ${uName} من السجن بواسطة ${admin.username}`, admin.username, uName);
        socket.emit('systemAlert', `تم الإفراج عن ${uName} ونقله للغرفة العامة بنجاح 🕊️.`);
        break;
      }

      // حذف عضوية بالكامل من السيرفر (Delete Account - Admin Only)
      case 'deleteAccount': {
        const uName = (targetUsername || target?.username || '').trim();
        const regFound = getRegisteredMember(uName);
        if (regFound) {
          delete registeredMembers[regFound.key];
          saveMembers();
        }

        // Purge active sessions
        for (const [sTok, sObj] of activeSessions.entries()) {
          if (sObj.user?.username?.toLowerCase() === uName.toLowerCase()) {
            activeSessions.delete(sTok);
          }
        }
        usernameToSessionMap.delete(uName.toLowerCase());
        persistActiveSessions();

        if (target) {
          io.to(target.id).emit('kickedByAdmin', { reason: 'تم حذف عضويتك وحسابك بالكامل بقرار إداري.', by: admin.username });
          const targetSock = io.sockets.sockets.get(target.id);
          if (targetSock) {
            try {
              targetSock.leave(target.room);
              targetSock.disconnect(true);
            } catch {}
          }
          const tIdx = users.findIndex((u) => u.id === target.id);
          if (tIdx !== -1) users.splice(tIdx, 1);
          broadcastRoomUsers(target.room);
        }
        broadcastAllUsers();
        io.emit('allRegisteredMembers', getAllRegisteredMembersPayload());
        io.emit('onlineCountUpdated', getPresenceSnapshot().filter((u) => u.presenceState !== 'offline').length);
        logMonitorEvent('role', `حذف حساب وعضوية [${regFound?.key || uName}] نهائياً بواسطة ${admin.username}`, admin.username, regFound?.key || uName);
        socket.emit('systemAlert', `تم حذف حساب وعضوية [${regFound?.key || uName}] نهائياً.`);
        break;
      }

      // تغيير الاسم المخالف واستبداله باسم لائق (Reset Username)
      case 'resetName': {
        const oldName = (targetUsername || target?.username || '').trim();
        const cleanCustom = sanitizeText(value?.trim());
        const newName = cleanCustom || `عضو_محترم_${Math.floor(100 + Math.random() * 900)}`;
        if (target) {
          target.username = newName;
        }
        const regFound = getRegisteredMember(oldName);
        if (regFound) {
          const data = regFound.member;
          delete registeredMembers[regFound.key];
          registeredMembers[newName] = data;
          saveMembers();
        }
        for (const sess of activeSessions.values()) {
          if (sess.user && sess.user.username.toLowerCase() === oldName.toLowerCase()) {
            sess.user.username = newName;
          }
        }
        if (usernameToSessionMap.has(oldName.toLowerCase())) {
          const tok = usernameToSessionMap.get(oldName.toLowerCase())!;
          usernameToSessionMap.delete(oldName.toLowerCase());
          usernameToSessionMap.set(newName.toLowerCase(), tok);
        }
        persistActiveSessions();

        if (target) {
          broadcastRoomUsers(target.room);
          io.to(target.id).emit('systemAlert', `تم تعديل اسمك المخالف إلى [${newName}] بواسطة إدارة الشات.`);
        }
        io.emit('allRegisteredMembers', getAllRegisteredMembersPayload());
        logMonitorEvent('role', `تعديل اسم ${oldName} إلى [${newName}] بواسطة ${admin.username}`, admin.username, oldName);
        socket.emit('systemAlert', `تم تعديل اسم ${oldName} إلى [${newName}] بنجاح.`);
        break;
      }

      // منح وسام ولقب شرفي (Assign Honor Badge - للمتصل وغير المتصل)
      case 'assignHonorBadge': {
        const uName = (targetUsername || target?.username || '').trim();
        const badgeText = value ? sanitizeText(String(value).trim()) : undefined;
        if (target) {
          target.honorBadge = badgeText;
        }
        const regFound = getRegisteredMember(uName);
        if (regFound) {
          regFound.member.honorBadge = badgeText;
          saveMembers();
        }
        for (const sess of activeSessions.values()) {
          if (sess.user && sess.user.username.toLowerCase() === uName.toLowerCase()) {
            sess.user.honorBadge = badgeText;
          }
        }
        persistActiveSessions();

        if (target) {
          broadcastRoomUsers(target.room);
          io.to(target.id).emit('systemAlert', badgeText ? `🎉 تم منحك وساماً شرفياً جديداً من الإدارة: ${badgeText}` : 'تمت إزالة الوسام الشرفي.');
        }
        io.emit('allRegisteredMembers', getAllRegisteredMembersPayload());
        logMonitorEvent('role', `منح/تعديل الوسام الشرفي لـ ${uName} [${badgeText || 'إزالة'}] بواسطة ${admin.username}`, admin.username, uName);
        socket.emit('systemAlert', `تم تحديث الوسام الشرفي لـ ${uName} بنجاح.`);
        break;
      }


      // إطلاق صافرة الإنذار الإداري العاجل (Admin Siren)
      case 'adminSiren': {
        const sirenText = sanitizeText(value) || '🚨 صفارة إنذار وتنبيه عام من إدارة حسان برو! الرجاء الانتباه والالتزام بالقوانين.';
        io.emit('adminSirenAlert', { from: admin.username, message: sirenText, timestamp: Date.now() });
        logMonitorEvent('siren', `إطلاق صافرة الإنذار الإداري بواسطة ${admin.username}: "${sirenText}"`, admin.username);
        socket.emit('systemAlert', 'تم إطلاق صافرة الإنذار والتنبيه الإداري لجميع المتواجدين!');
        break;
      }

      // تعديل بيانات الغرفة (Edit Room - Admin Only)
      case 'editRoom': {
        if (value && typeof value === 'object') {
          const { roomId, name, desc, password, voiceLimit } = value;
          const room = chatRooms.find((r) => r.id === roomId);
          if (room) {
            if (name) room.name = sanitizeText(name);
            if (desc !== undefined) room.desc = sanitizeText(desc);
            if (voiceLimit) room.voiceLimit = Number(voiceLimit) || room.voiceLimit;
            if (password !== undefined) {
              if (password) {
                room.isPasswordProtected = true;
                room.password = sanitizeText(password);
              } else {
                room.isPasswordProtected = false;
                delete room.password;
              }
            }
            broadcastRoomsUpdate();
            saveChatRooms();
            logMonitorEvent('room', `تعديل إعدادات وبيانات الغرفة [${room.id}] بواسطة ${admin.username}`, admin.username);
            socket.emit('systemAlert', `تم تعديل بيانات وإعدادات الغرفة [${room.id}] بنجاح.`);
          }
        }
        break;
      }

      // حذف الغرفة ونقل الأعضاء للغرفة العامة (Delete Room - Admin Only)
      case 'deleteRoom': {
        const roomId = sanitizeText(value);
        if (roomId === 'الغرفة العامة' || roomId === 'سجن حسان برو') {
          socket.emit('systemAlert', 'لا يمكن حذف الغرف الأساسية للنظام.');
          break;
        }
        const idx = chatRooms.findIndex((r) => r.id === roomId);
        if (idx !== -1) {
          users.forEach((u) => {
            if (u.room === roomId) {
              u.room = 'الغرفة العامة';
              io.to(u.id).emit('forceMoveRoom', { room: 'الغرفة العامة' });
            }
          });
          chatRooms.splice(idx, 1);
          saveChatRooms();
          broadcastRoomsUpdate();
          chatRooms.forEach((r) => {
            broadcastRoomUsers(r.id);
          });
          logMonitorEvent('room', `حذف الغرفة [${roomId}] ونقل روادها إلى الغرفة العامة بواسطة ${admin.username}`, admin.username);
          socket.emit('systemAlert', `تم حذف الغرفة [${roomId}] بنجاح.`);
        }
        break;
      }
    }
  });

  // User Profile Settings Updates (حفظ وتعديل الملف الشخصي واستدامته)
  socket.on(
    'updateProfile',
    ({
      username,
      statusQuote,
      avatarUrl,
      nameBannerUrl,
      password,
      flag,
      nameColor,
      textColor,
      isPmDisabled
    }: {
      username?: string;
      statusQuote?: string;
      avatarUrl?: string;
      nameBannerUrl?: string;
      password?: string;
      flag?: string;
      nameColor?: string;
      textColor?: string;
      isPmDisabled?: boolean;
    }) => {
      const user = users.find((u) => u.id === socket.id);
      if (!user) return;

      const oldUsername = user.username;
      if (username && username.trim() && username.trim() !== oldUsername) {
        const cleanNew = sanitizeText(username.trim());
        const isTaken = users.some((u) => u.id !== user.id && u.username.toLowerCase() === cleanNew.toLowerCase());
        if (!isTaken) {
          user.username = cleanNew;
          user.avatarSeed = cleanNew;
          if (registeredMembers[oldUsername]) {
            const prev = registeredMembers[oldUsername];
            delete registeredMembers[oldUsername];
            registeredMembers[cleanNew] = prev;
          }
        }
      }

      // العلم الحقيقي مشفر تلقائيًا عند الدخول ومقفل لمنع اختيار أعلام وهمية
      // user.flag is preserved from real country IP detection
      if (statusQuote !== undefined) user.statusQuote = sanitizeText(statusQuote);
      if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
      if (nameBannerUrl !== undefined) user.nameBannerUrl = nameBannerUrl.trim() || undefined;
      if (nameColor !== undefined) user.nameColor = nameColor;
      if (textColor !== undefined) user.textColor = textColor;
      if (isPmDisabled !== undefined) user.isPmDisabled = Boolean(isPmDisabled);

      // Update registered members persistent store
      if (!registeredMembers[user.username]) {
        registeredMembers[user.username] = {
          password: hashPassword(password || '123'),
          role: user.role === 'admin' ? 'admin' : user.role === 'super' ? 'super' : 'member',
          flag: user.flag,
          statusQuote: user.statusQuote,
          avatarUrl: user.avatarUrl,
          nameBannerUrl: user.nameBannerUrl,
          isPmDisabled: user.isPmDisabled,
          likes: user.likes || 0,
          points: user.points || 100,
          nameColor: user.nameColor,
          textColor: user.textColor
        };
      } else {
        if (password) registeredMembers[user.username].password = hashPassword(password);
        registeredMembers[user.username].statusQuote = user.statusQuote;
        if (avatarUrl !== undefined) registeredMembers[user.username].avatarUrl = avatarUrl;
        if (nameBannerUrl !== undefined) registeredMembers[user.username].nameBannerUrl = user.nameBannerUrl;
        if (isPmDisabled !== undefined) registeredMembers[user.username].isPmDisabled = Boolean(isPmDisabled);
        if (user.flag) registeredMembers[user.username].flag = user.flag;
        if (nameColor !== undefined) (registeredMembers[user.username] as any).nameColor = nameColor;
        if (textColor !== undefined) (registeredMembers[user.username] as any).textColor = textColor;
      }
      saveMembers();
      if (statusQuote !== undefined) {
        io.emit('recentLoginsUpdated', getRecentLogins());
      }

      io.emit('userStyleUpdated', {
        username: user.username,
        statusQuote: user.statusQuote,
        avatarUrl: user.avatarUrl,
        nameBannerUrl: user.nameBannerUrl,
        nameColor: user.nameColor,
        textColor: user.textColor,
        nameGradient: user.nameGradient,
        profileBg: user.profileBg,
        isPmDisabled: user.isPmDisabled
      });
      io.emit('allRegisteredMembers', getAllRegisteredMembersPayload());

      // Broadcast update to all rooms and users
      chatRooms.forEach((r) => {
        broadcastRoomUsers(r.id);
      });
      broadcastAllUsers();
  socket.emit('profileUpdated', { user });
  socket.emit('systemAlert', 'تم حفظ وتحديث بيانات ملفك الشخصي بنجاح ✅');
    }
  );

  // Wall posts (الحائط - دعم التبويبين المنشورات والدردشة السريعة مع الحفظ التلقائي)
  socket.on('getWallPosts', () => {
    socket.emit('wallPosts', wallPosts);
  });

  socket.on(
    'newWallPost',
    async ({
      text,
      mediaUrl,
      mediaType,
      category,
      youtubeVideo
    }: {
      text: string;
      mediaUrl?: string;
      mediaType?: 'image' | 'video';
      category?: 'posts' | 'quick';
      youtubeVideo?: {
        id: string;
        title: string;
        thumbnail?: string;
        channelTitle?: string;
        duration?: string;
        url?: string;
      };
    }) => {
      const user = users.find((u) => u.id === socket.id);
      let resolvedYoutubeVideo = youtubeVideo;
      if (!resolvedYoutubeVideo && text) {
        const extractedId = extractYouTubeVideoId(text);
        if (extractedId) {
          resolvedYoutubeVideo = {
            id: extractedId,
            title: 'فيديو يوتيوب',
            thumbnail: `https://img.youtube.com/vi/${extractedId}/hqdefault.jpg`,
            channelTitle: 'YouTube',
            url: `https://www.youtube.com/watch?v=${extractedId}`
          };
        }
      }

      if (!user || (!text?.trim() && !mediaUrl && !resolvedYoutubeVideo)) return;

      if (!isSupremeHassan(user) && user.role !== 'admin' && user.role !== 'super') {
        if ((mediaUrl || resolvedYoutubeVideo) && likesSettings.wallMediaLikes > 0 && user.likes < likesSettings.wallMediaLikes) {
          socket.emit('systemAlert', `عفواً، يتطلب نشر وسائط في الحائط ${likesSettings.wallMediaLikes} لايك على الأقل. رصيدك الحالي: ${user.likes} 👍`);
          return;
        }
        if (!mediaUrl && !resolvedYoutubeVideo && text && likesSettings.wallTextLikes > 0 && user.likes < likesSettings.wallTextLikes) {
          socket.emit('systemAlert', `عفواً، يتطلب النشر في الحائط ${likesSettings.wallTextLikes} لايك على الأقل. رصيدك الحالي: ${user.likes} 👍`);
          return;
        }
      }

      if (text) {
        checkAndLogMonitoredWords(text, user, { type: 'wall_post', targetName: 'منشور في الحائط' });
      }

      let cleanMediaUrl = mediaUrl;
      let cleanMediaType: 'image' | 'video' = mediaType || 'image';

      // If client provided a base64 Data URI, convert and route through Storage Layer
      if (cleanMediaUrl && cleanMediaUrl.startsWith('data:')) {
        try {
          const matches = cleanMediaUrl.match(/^data:([A-Za-z0-9-+\/]+);base64,(.+)$/);
          let buffer: Buffer;
          let mime = 'image/jpeg';
          let ext = 'jpg';
          if (matches && matches.length === 3) {
            mime = matches[1].toLowerCase();
            if (mime.includes('mp4')) ext = 'mp4';
            else if (mime.includes('webm')) ext = 'webm';
            else if (mime.includes('mov') || mime.includes('quicktime')) ext = 'mov';
            else if (mime.includes('png')) ext = 'png';
            else if (mime.includes('webp')) ext = 'webp';
            else if (mime.includes('gif')) ext = 'gif';
            buffer = Buffer.from(matches[2], 'base64');
          } else {
            buffer = Buffer.from(cleanMediaUrl, 'base64');
          }
          const uploadRes = await storageManager.saveBuffer(buffer, `wall_${Date.now()}.${ext}`, mime);
          cleanMediaUrl = uploadRes.url;
          if (!mediaType) {
            cleanMediaType = uploadRes.mediaType === 'video' ? 'video' : 'image';
          }
        } catch (err) {
          console.error('[Storage Layer] Failed to convert base64 wall media:', err);
        }
      }

      if (cleanMediaUrl && !mediaType) {
        cleanMediaType = (cleanMediaUrl.endsWith('.mp4') || cleanMediaUrl.endsWith('.webm') || cleanMediaUrl.endsWith('.mov')) ? 'video' : 'image';
      }

      const assignedCategory: 'posts' | 'quick' = category || (cleanMediaUrl || resolvedYoutubeVideo ? 'posts' : 'quick');
      const expandedWallText = text ? expandShortcuts(sanitizeText(text)) : '';

      const newPost: WallPost = {
        id: `post-${Date.now()}`,
        username: user.username,
        avatarUrl: user.avatarUrl,
        nameBannerUrl: user.nameBannerUrl,
        flag: user.flag,
        text: expandedWallText,
        mediaUrl: cleanMediaUrl,
        mediaType: cleanMediaType,
        category: assignedCategory,
        youtubeVideo: resolvedYoutubeVideo,
        time: getCurrentTimeString(),
        likes: 0,
        commentsCount: 0,
        timestamp: Date.now()
      };

      wallPosts.unshift(newPost);
      const maxPosts = messageRetentionLimits.wallMaxPosts > 0 ? messageRetentionLimits.wallMaxPosts : 100;
      if (wallPosts.length > maxPosts) {
        wallPosts = wallPosts.slice(0, maxPosts);
      }
      saveWallPosts();

      // Increment engagement progression for wall posting
      const regMember = registeredMembers[user.username];
      if (regMember) {
        if (!regMember.engagement) regMember.engagement = getDefaultEngagement();
        regMember.engagement.wallPostsCount += 1;
        const engProg = calculateEngagementStars(regMember.engagement);
        regMember.engagement.starsLevel = engProg.starsLevel;
        regMember.engagement.progressPercent = engProg.progressPercent;
        user.engagement = regMember.engagement;
        saveMembers();
      }

      io.emit('wallPosts', wallPosts);
    }
  );

  socket.on('likeWallPost', ({ postId }: { postId: string }) => {
    const user = users.find((u) => u.id === socket.id);
    if (!user) return;
    const post = wallPosts.find((p) => p.id === postId);
    if (post) {
      if (!post.likedUsers) post.likedUsers = [];
      const userKey = user.username.toLowerCase();
      if (post.likedUsers.includes(userKey)) {
        socket.emit('systemAlert', 'لقد قمت بالإعجاب بهذا المنشور مسبقاً (مسموح بإعجاب واحد فقط لكل عضو) ❤️');
        return;
      }
      post.likedUsers.push(userKey);
      post.likes += 1;
      saveWallPosts();
      io.emit('wallPosts', wallPosts);
      socket.emit('systemAlert', 'تم تسجيل إعجابك بالمنشور بنجاح ❤️');
    }
  });

  // Add Comment on Wall Post (التعليق على منشورات الحائط مع توسيع الاختصارات)
  socket.on('addWallComment', ({ postId, text }: { postId: string; text: string }) => {
    const user = users.find((u) => u.id === socket.id);
    if (!user || !text.trim()) return;
    const post = wallPosts.find((p) => p.id === postId);
    if (post) {
      checkAndLogMonitoredWords(text, user, { type: 'wall_comment', targetName: `تعليق على منشور ${post.username}` });

      const expandedCommentText = text ? expandShortcuts(sanitizeText(text)) : '';
      if (!post.comments) post.comments = [];
      const newComment: WallComment = {
        id: `cm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        username: user.username,
        avatarUrl: user.avatarUrl,
        nameBannerUrl: user.nameBannerUrl,
        text: expandedCommentText,
        time: getCurrentTimeString(),
        timestamp: Date.now()
      };
      post.comments.push(newComment);
      if (post.comments.length > 50) {
        post.comments = post.comments.slice(-50);
      }
      post.commentsCount = post.comments.length;
      saveWallPosts();
      io.emit('wallPosts', wallPosts);
      socket.emit('systemAlert', 'تم نشر تعليقك على الحائط بنجاح 💬');
    }
  });

  // Delete Wall Post (حذف منشور الحائط)
  socket.on('deleteWallPost', ({ postId }: { postId: string }) => {
    const user = users.find((u) => u.id === socket.id);
    if (!user) return;
    const idx = wallPosts.findIndex((p) => p.id === postId);
    if (idx !== -1) {
      const post = wallPosts[idx];
      if (post.username.toLowerCase() === user.username.toLowerCase() || user.role === 'admin' || user.role === 'super' || hasPermission(user.role, 'canDeleteWallPost')) {
        wallPosts.splice(idx, 1);
        saveWallPosts();
        io.emit('wallPosts', wallPosts);
        socket.emit('systemAlert', 'تم حذف المنشور بنجاح 🗑️');
      }
    }
  });

  // Edit Wall Post (تعديل منشور الحائط مع توسيع الاختصارات)
  socket.on('editWallPost', ({ postId, newText }: { postId: string; newText: string }) => {
    const user = users.find((u) => u.id === socket.id);
    if (!user || !newText?.trim()) return;
    const post = wallPosts.find((p) => p.id === postId);
    if (post) {
      if (post.username.toLowerCase() === user.username.toLowerCase() || isSupremeHassan(user) || user.role === 'admin' || user.role === 'super') {
        const cleanText = newText ? expandShortcuts(sanitizeText(newText.trim())) : '';
        post.text = cleanText;
        post.isEdited = true;
        saveWallPosts();
        io.emit('wallPosts', wallPosts);
        socket.emit('systemAlert', 'تم تعديل المنشور بنجاح ✏️');
      }
    }
  });

  // Delete Wall Comment (حذف تعليق على منشور الحائط)
  socket.on('deleteWallComment', ({ postId, commentId }: { postId: string; commentId: string }) => {
    const user = users.find((u) => u.id === socket.id);
    if (!user) return;
    const post = wallPosts.find((p) => p.id === postId);
    if (!post || !post.comments) return;

    const cmIdx = post.comments.findIndex((c) => c.id === commentId);
    if (cmIdx !== -1) {
      const comment = post.comments[cmIdx];
      const isCommentAuthor = comment.username.toLowerCase() === user.username.toLowerCase();
      const isPostAuthor = post.username.toLowerCase() === user.username.toLowerCase();
      if (isCommentAuthor || isPostAuthor || user.role === 'admin' || user.role === 'super' || hasPermission(user.role, 'canDeleteWallPost')) {
        post.comments.splice(cmIdx, 1);
        post.commentsCount = post.comments.length;
        saveWallPosts();
        io.emit('wallPosts', wallPosts);
        socket.emit('systemAlert', 'تم حذف التعليق بنجاح 🗑️');
      }
    }
  });

  // =========================================================================
  // 24-HOUR STORIES / KHWATER SYSTEM (نظام الخواطر والحالات - حذف تلقائي بعد 24 ساعة)
  // =========================================================================
  socket.on('getStories', () => {
    socket.emit('storiesUpdated', getActiveStories());
  });

  socket.on(
    'newStory',
    async ({
      mediaUrl,
      mediaType,
      caption
    }: {
      mediaUrl: string;
      mediaType?: 'image' | 'video';
      caption?: string;
    }) => {
      const user = users.find((u) => u.id === socket.id);
      if (!user || !mediaUrl) {
        socket.emit('systemAlert', 'بيانات الخاطرة أو الوسائط مفقودة.');
        return;
      }

      let cleanMedia = mediaUrl;
      let cleanType: 'image' | 'video' = mediaType || 'image';

      if (cleanMedia.startsWith('data:')) {
        try {
          const matches = cleanMedia.match(/^data:([A-Za-z0-9-+\/]+);base64,(.+)$/);
          let buffer: Buffer;
          let mime = 'image/jpeg';
          let ext = 'jpg';
          if (matches && matches.length === 3) {
            mime = matches[1].toLowerCase();
            if (mime.includes('mp4')) ext = 'mp4';
            else if (mime.includes('webm')) ext = 'webm';
            else if (mime.includes('mov') || mime.includes('quicktime')) ext = 'mov';
            else if (mime.includes('png')) ext = 'png';
            else if (mime.includes('webp')) ext = 'webp';
            else if (mime.includes('gif')) ext = 'gif';
            buffer = Buffer.from(matches[2], 'base64');
          } else {
            buffer = Buffer.from(cleanMedia, 'base64');
          }
          const uploadRes = await storageManager.saveBuffer(buffer, `story_${Date.now()}.${ext}`, mime);
          cleanMedia = uploadRes.url;
          if (!mediaType) {
            cleanType = uploadRes.mediaType === 'video' ? 'video' : 'image';
          }
        } catch (err) {
          console.error('[Storage Layer] Failed to convert base64 story to file:', err);
        }
      }

      const newStoryItem: StoryItem = {
        id: `story-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        username: user.username,
        avatarUrl: user.avatarUrl,
        nameBannerUrl: user.nameBannerUrl,
        flag: user.flag,
        mediaUrl: cleanMedia,
        mediaType: cleanType,
        caption: sanitizeText(caption) || undefined,
        createdAt: Date.now(),
        time: getCurrentTimeString(),
        likes: 0,
        likedUsers: [],
        comments: []
      };

      storiesList.unshift(newStoryItem);
      saveStories();

      // Increment engagement for creating a story
      const regMember = registeredMembers[user.username];
      if (regMember) {
        if (!regMember.engagement) regMember.engagement = getDefaultEngagement();
        regMember.engagement.wallPostsCount += 1;
        const engProg = calculateEngagementStars(regMember.engagement);
        regMember.engagement.starsLevel = engProg.starsLevel;
        regMember.engagement.progressPercent = engProg.progressPercent;
        user.engagement = regMember.engagement;
        saveMembers();
      }

      io.emit('storiesUpdated', getActiveStories());
      socket.emit('systemAlert', 'تم نشر خاطرتك / حالتك بنجاح وستبقى ظاهرة لمدة 24 ساعة ⏳✨');
    }
  );

  socket.on('likeStory', ({ storyId }: { storyId: string }) => {
    const user = users.find((u) => u.id === socket.id);
    if (!user) return;
    const story = storiesList.find((s) => s.id === storyId);
    if (story) {
      if (!story.likedUsers) story.likedUsers = [];
      const userKey = user.username.toLowerCase();
      if (story.likedUsers.includes(userKey)) {
        socket.emit('systemAlert', 'لقد سجلت إعجابك بهذه الخاطرة مسبقاً ❤️');
        return;
      }
      story.likedUsers.push(userKey);
      story.likes += 1;
      saveStories();
      io.emit('storiesUpdated', getActiveStories());
      socket.emit('systemAlert', 'تم تسجيل إعجابك بالخاطرة ❤️');
    }
  });

  socket.on('addStoryComment', ({ storyId, text }: { storyId: string; text: string }) => {
    const user = users.find((u) => u.id === socket.id);
    if (!user || !text?.trim()) return;
    const story = storiesList.find((s) => s.id === storyId);
    if (story) {
      if (!story.comments) story.comments = [];
      const newCm: StoryComment = {
        id: `sc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        username: user.username,
        avatarUrl: user.avatarUrl,
        nameBannerUrl: user.nameBannerUrl,
        text: sanitizeText(text),
        time: getCurrentTimeString(),
        timestamp: Date.now()
      };
      story.comments.push(newCm);
      saveStories();
      io.emit('storiesUpdated', getActiveStories());
      socket.emit('systemAlert', 'تمت إضافة تعليقك على الخاطرة بنجاح 💬');
    }
  });

  socket.on('deleteStory', ({ storyId }: { storyId: string }) => {
    const user = users.find((u) => u.id === socket.id);
    if (!user) return;
    const idx = storiesList.findIndex((s) => s.id === storyId);
    if (idx !== -1) {
      const story = storiesList[idx];
      if (story.username.toLowerCase() === user.username.toLowerCase() || user.role === 'admin' || user.role === 'super' || hasPermission(user.role, 'canDeleteWallPost')) {
        storiesList.splice(idx, 1);
        saveStories();
        io.emit('storiesUpdated', getActiveStories());
        socket.emit('systemAlert', 'تم حذف الخاطرة بنجاح 🗑️');
      }
    }
  });

  // Delete Chat Message in Room (حذف رسالة من الغرفة)
  socket.on('deleteChatMessage', ({ messageId }: { messageId: string }) => {
    const user = users.find((u) => u.id === socket.id);
    if (!user) return;
    const msgIdx = chatHistory.findIndex((m) => m.id === messageId);
    if (msgIdx !== -1) {
      const msg = chatHistory[msgIdx];
      if (msg.username.toLowerCase() === user.username.toLowerCase() || user.role === 'admin' || user.role === 'super' || hasPermission(user.role, 'canDeleteMessage')) {
        const roomSettings = getRoomSettings(msg.room);
        if (roomSettings.showDeletedNotice) {
          msg.isDeleted = true;
          msg.deletedBy = user.username;
          msg.deletedByRole = user.role;
          msg.text = '';
          delete msg.mediaUrl;
          delete msg.mediaType;
          delete msg.voiceNote;
          delete msg.replyTo;
          delete msg.reactions;
          saveHistory();
          io.to(msg.room).emit('chatMessageDeleted', {
            messageId,
            showNotice: true,
            deletedBy: user.username,
            deletedByRole: user.role
          });
        } else {
          chatHistory.splice(msgIdx, 1);
          saveHistory();
          io.to(msg.room).emit('chatMessageDeleted', { messageId });
        }
        socket.emit('systemAlert', 'تم حذف الرسالة بنجاح 🗑️');
      }
    }
  });

  // Edit Chat Message in Room (تعديل رسالة من الغرفة)
  socket.on('editChatMessage', ({ messageId, newText }: { messageId: string; newText: string }) => {
    const user = users.find((u) => u.id === socket.id);
    if (!user || !newText?.trim()) return;
    const msg = chatHistory.find((m) => m.id === messageId);
    if (msg) {
      if (msg.username.toLowerCase() === user.username.toLowerCase() || isSupremeHassan(user) || user.role === 'admin' || user.role === 'super') {
        const cleanText = sanitizeText(newText.trim());
        msg.text = cleanText;
        msg.isEdited = true;
        saveHistory();
        io.to(msg.room).emit('chatMessageEdited', { messageId, newText: cleanText, isEdited: true });
        socket.emit('systemAlert', 'تم تعديل الرسالة بنجاح ✏️');
      }
    }
  });

  // Reaction to Chat Message (التفاعل بالإيموجي مع الرسائل)
  socket.on('reactChatMessage', ({ messageId, emoji }: { messageId: string; emoji: string }) => {
    const user = users.find((u) => u.id === socket.id);
    if (!user) return;
    const msg = chatHistory.find((m) => m.id === messageId);
    if (msg) {
      if (!msg.reactions) msg.reactions = {};
      msg.reactions[emoji] = (msg.reactions[emoji] || 0) + 1;
      saveHistory();
      io.to(msg.room).emit('chatMessageReactionUpdated', { messageId, reactions: msg.reactions });
    }
  });

  // Pin / Unpin Room Message (تثبيت وإلغاء تثبيت رسالة في الروم)
  socket.on('pinRoomMessage', ({ messageId, unpin }: { messageId?: string; unpin?: boolean }) => {
    const user = users.find((u) => u.id === socket.id);
    if (!user || (!isSupremeHassan(user) && user.role !== 'admin' && user.role !== 'super' && !hasPermission(user.role, 'canPinMessage'))) {
      socket.emit('systemAlert', 'تثبيت الرسائل محصور بالإشراف والإدارة المصرح لهم.');
      return;
    }
    if (unpin) {
      roomPinnedMessages[user.room] = null;
      io.to(user.room).emit('roomPinnedMessageUpdated', null);
      logMonitorEvent('room', `فك المشرف ${user.username} تثبيت الإعلان في [${user.room}]`, user.username);
    } else if (messageId) {
      const msg = chatHistory.find((m) => m.id === messageId);
      if (msg) {
        const pinned = { id: msg.id, username: msg.username, text: msg.text || 'مرفق وسائط' };
        roomPinnedMessages[user.room] = pinned;
        io.to(user.room).emit('roomPinnedMessageUpdated', pinned);
        logMonitorEvent('room', `تثبيت رسالة لـ [${msg.username}] في [${user.room}] بواسطة ${user.username}`, user.username);
      }
    }
  });

  // Get Active Sessions List (عرض ومراقبة الجلسات النشطة والأجهزة المتصلة)
  socket.on('getActiveSessions', () => {
    const admin = users.find((u) => u.id === socket.id);
    if (!admin || (!isSupremeHassan(admin) && admin.role !== 'admin' && admin.role !== 'super' && !hasPermission(admin.role, 'canAccessControlPanel'))) {
      socket.emit('systemAlert', 'عرض الجلسات النشطة محصور بطاقم الإدارة.');
      return;
    }
    const sessionList = Array.from(activeSessions.values()).map((s) => ({
      sessionToken: s.sessionToken,
      username: s.user.username,
      role: s.user.role,
      room: s.user.room,
      ip: s.user.ipAddress || s.user.ip || 'غير مسجل',
      device: s.user.deviceInfo || 'جهاز غير معروف',
      flag: s.user.flag || '🇾🇪',
      lastActive: s.lastActiveTime,
      currentSocketId: s.currentSocketId,
      isOnline: users.some((u) => u.id === s.currentSocketId)
    }));
    socket.emit('activeSessionsList', sessionList);
  });

  // Terminate Active Session (إنهاء وإسقاط جلسة نشطة لجهاز معين)
  socket.on('terminateSession', ({ sessionToken }: { sessionToken: string }) => {
    const admin = users.find((u) => u.id === socket.id);
    if (!admin || (!isSupremeHassan(admin) && admin.role !== 'admin' && admin.role !== 'super' && !hasPermission(admin.role, 'canAccessControlPanel'))) {
      socket.emit('systemAlert', 'إنهاء الجلسات محصور بطاقم الإدارة.');
      return;
    }
    const sess = activeSessions.get(sessionToken);
    if (sess) {
      const targetUser = sess.user;
      const targetRole = targetUser?.role || 'member';
      if (!isSupremeHassan(admin) && getRoleLevel(targetRole) >= getRoleLevel(admin.role)) {
        socket.emit('systemAlert', 'لا يمكنك إنهاء جلسة لمستخدم ذو رتبة مساوية أو أعلى منك.');
        return;
      }
      activeSessions.delete(sessionToken);
      if (targetUser?.username) {
        usernameToSessionMap.delete(targetUser.username.toLowerCase());
      }
      persistActiveSessions();

      if (sess.currentSocketId) {
        io.to(sess.currentSocketId).emit('kickedByAdmin', { reason: 'تم إنهاء جلستك من قبل الإدارة.', by: admin.username });
        const sock = io.sockets.sockets.get(sess.currentSocketId);
        if (sock) {
          try {
            sock.disconnect(true);
          } catch {}
        }
      }
      logMonitorEvent('security', `إنهاء وإسقاط جلسة [${targetUser?.username}] بواسطة [${admin.role.toUpperCase()}] ${admin.username}`, admin.username, targetUser?.username);
      socket.emit('systemAlert', `تم إنهاء وإسقاط جلسة [${targetUser?.username}] بنجاح.`);

      // Send updated list
      const sessionList = Array.from(activeSessions.values()).map((s) => ({
        sessionToken: s.sessionToken,
        username: s.user.username,
        role: s.user.role,
        room: s.user.room,
        ip: s.user.ipAddress || s.user.ip || 'غير مسجل',
        device: s.user.deviceInfo || 'جهاز غير معروف',
        flag: s.user.flag || '🇾🇪',
        lastActive: s.lastActiveTime,
        currentSocketId: s.currentSocketId,
        isOnline: users.some((u) => u.id === s.currentSocketId)
      }));
      socket.emit('activeSessionsList', sessionList);
    }
  });

  // Get Room Pinned Message
  socket.on('getRoomPinnedMessage', () => {
    const user = users.find((u) => u.id === socket.id);
    if (user && roomPinnedMessages[user.room]) {
      socket.emit('roomPinnedMessageUpdated', roomPinnedMessages[user.room]);
    }
  });

  // Report Chat Message (إبلاغ عن رسالة مخالفة للإدارة)
  socket.on('reportChatMessage', ({ messageId, reportedUser, text, reason }: { messageId: string; reportedUser: string; text?: string; reason?: string }) => {
    const user = users.find((u) => u.id === socket.id);
    const reporterName = user?.username || 'عضو';
    logMonitorEvent(
      'warn',
      `🚩 بلاغ عن رسالة: [${reporterName}] أبلغ عن [${reportedUser}] - السبب: ${reason || 'مخالفة'} - المحتوى: "${text?.substring(0, 80) || 'مرفق وسائط'}"`,
      reporterName,
      reportedUser
    );
    users.forEach((u) => {
      if (u.role === 'admin' || u.role === 'super') {
        io.to(u.id).emit('systemAlert', `🚩 بلاغ جديد: @${reporterName} أبلغ عن رسالة لـ @${reportedUser}`);
      }
    });
    socket.emit('systemAlert', 'تم استلام بلاغك بنجاح وسيقوم المشرفون بمراجعته فوراً 🛡️');
  });

  // Add Points Reward from Games & Activities
  socket.on('addPointsReward', ({ amount, reason }: { amount: number; reason: string }) => {
    const user = users.find((u) => u.id === socket.id);
    if (!user) return;
    const pointsToAdd = Math.min(Math.max(1, amount), 500);
    user.points = (user.points || 0) + pointsToAdd;
    if (registeredMembers[user.username]) {
      registeredMembers[user.username].points = user.points;
      saveMembers();
    }
    socket.emit('userPointsUpdated', { points: user.points, reason, added: pointsToAdd });
  });

  // Broadcast Mini-Game Win to Room
  socket.on('broadcastGameWin', ({ gameName, pointsWon }: { gameName: string; pointsWon: number }) => {
    const user = users.find((u) => u.id === socket.id);
    if (!user) return;
    const winMsg: StoredMessage = {
      id: `gamewin-${Date.now()}`,
      room: user.room,
      username: 'نظام الجوائز والمسابقات 🏆',
      badge: 'فوز مستحق',
      badgeColor: 'text-amber-500',
      text: `🎉 كفو! حقق الصقر [${user.username}] فوزاً في (${gameName}) وحصد [${pointsWon} نقطة] إضافية!`,
      time: getCurrentTimeString(),
      timestamp: Date.now()
    };
    chatHistory.push(winMsg);
    pruneRoomChatHistory(user.room);
    saveHistory();
    io.to(user.room).emit('message', winMsg);
  });

  // Delete Private Message (حذف رسالة من الخاص)
  socket.on('deletePrivateMessage', ({ messageId, partnerId, partnerUsername }: { messageId: string; partnerId?: string; partnerUsername?: string }) => {
    // Delete from persistent privateChatHistory
    for (const [pairKey, list] of privateChatHistory.entries()) {
      const idx = list.findIndex((m) => m.id === messageId);
      if (idx !== -1) {
        list.splice(idx, 1);
        savePrivateChatHistory();
        break;
      }
    }

    socket.emit('privateMessageDeleted', { messageId });
    if (partnerId) {
      io.to(partnerId).emit('privateMessageDeleted', { messageId });
    }
    if (partnerUsername) {
      const partner = users.find((u) => u.username.toLowerCase() === partnerUsername.toLowerCase());
      if (partner && partner.id !== partnerId) {
        io.to(partner.id).emit('privateMessageDeleted', { messageId });
      }
    }
    socket.emit('systemAlert', 'تم حذف الرسالة الخاصة 🗑️');
  });

  // Edit Private Message (تعديل رسالة من الخاص)
  socket.on('editPrivateMessage', ({ messageId, newText, partnerId, partnerUsername }: { messageId: string; newText: string; partnerId?: string; partnerUsername?: string }) => {
    const user = users.find((u) => u.id === socket.id);
    if (!user || !newText?.trim()) return;
    const cleanText = sanitizeText(newText.trim());

    // Update in persistent privateChatHistory
    for (const [pairKey, list] of privateChatHistory.entries()) {
      const target = list.find((m) => m.id === messageId);
      if (target) {
        target.text = cleanText;
        target.isEdited = true;
        savePrivateChatHistory();
        break;
      }
    }

    socket.emit('privateMessageEdited', { messageId, newText: cleanText, isEdited: true });
    if (partnerId) {
      io.to(partnerId).emit('privateMessageEdited', { messageId, newText: cleanText, isEdited: true });
    }
    if (partnerUsername) {
      const partner = users.find((u) => u.username.toLowerCase() === partnerUsername.toLowerCase());
      if (partner && partner.id !== partnerId) {
        io.to(partner.id).emit('privateMessageEdited', { messageId, newText: cleanText, isEdited: true });
      }
    }
    socket.emit('systemAlert', 'تم تعديل الرسالة الخاصة بنجاح ✏️');
  });

  // Reply to Admin Warning (الرد على التنبيه الإداري وكتابة يدوية)
  socket.on('replyToWarning', ({ toUsername, replyText }: { toUsername: string; replyText: string }) => {
    const sender = users.find((u) => u.id === socket.id);
    if (!sender || !replyText.trim()) return;

    logMonitorEvent(
      'security',
      `رد العضو [${sender.username}] على التنبيه الإداري من [${toUsername}]: "${replyText}"`,
      sender.username,
      toUsername
    );

    const adminUser = users.find((u) => u.username.toLowerCase() === toUsername.toLowerCase());
    if (adminUser) {
      io.to(adminUser.id).emit('warningReplyReceived', {
        from: sender.username,
        avatarUrl: sender.avatarUrl,
        flag: sender.flag,
        replyText: sanitizeText(replyText),
        time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
      });
    }
    socket.emit('systemAlert', 'تم إرسال ردك وتوضيحك للإدارة بنجاح ✔️');
  });

  // Phone-to-Phone Direct Audio Packet Relay (إرسال واستقبال بث الصوت المباشر بين الهواتف)
  socket.on('voiceDataChunk', ({ chunk }: { chunk: string }) => {
    const user = users.find((u) => u.id === socket.id);
    if (!user || user.micSlot === null || user.isMuted) return;

    // Relay audio chunk to all other users in this room
    socket.to(user.room).emit('remoteVoiceChunk', {
      userId: user.id,
      username: user.username,
      micSlot: user.micSlot,
      chunk
    });
  });

  // Private Messages (المحادثات الخاصة الصوتية والكتابية مع مؤشرات القراءة والرسائل ذاتية الاختفاء)
  socket.on(
    'privateMessage',
    async ({
      toId,
      toUsername,
      text,
      mediaUrl,
      voiceNote,
      replyTo,
      selfDestructSeconds
    }: {
      toId: string;
      toUsername?: string;
      text?: string;
      mediaUrl?: string;
      voiceNote?: { audioUrl: string; duration: number };
      replyTo?: { id: string; username: string; text: string };
      selfDestructSeconds?: number;
    }) => {
      const sender = users.find((u) => u.id === socket.id);
      let recipient = users.find((u) => u.id === toId);
      if (!recipient && toUsername) {
        recipient = users.find((u) => u.username.toLowerCase() === toUsername.trim().toLowerCase());
      }
      const clean = sanitizeText(text);

      if (sender && !isSupremeHassan(sender) && sender.role !== 'admin' && sender.role !== 'super') {
        if (clean && likesSettings.pmTextLikes > 0 && sender.likes < likesSettings.pmTextLikes) {
          socket.emit('systemAlert', `عفواً، يتطلب إرسال الرسائل الخاصة ${likesSettings.pmTextLikes} لايك على الأقل. رصيدك الحالي: ${sender.likes} 👍`);
          return;
        }
        if ((mediaUrl || voiceNote) && likesSettings.pmMediaLikes > 0 && sender.likes < likesSettings.pmMediaLikes) {
          socket.emit('systemAlert', `عفواً، يتطلب إرسال الوسائط في الخاص ${likesSettings.pmMediaLikes} لايك على الأقل. رصيدك الحالي: ${sender.likes} 👍`);
          return;
        }
      }

      if (sender && (clean || mediaUrl || voiceNote)) {
        const destUsername = recipient ? recipient.username : (toUsername ? toUsername.trim() : '');
        if (!destUsername) return;

        const targetMemberInfo = registeredMembers[destUsername];
        const isRecipientPmDisabled = recipient ? Boolean(recipient.isPmDisabled) : Boolean(targetMemberInfo?.isPmDisabled);
        if (isRecipientPmDisabled && sender && !isSupremeHassan(sender) && sender.role !== 'admin' && sender.role !== 'super') {
          socket.emit('systemAlert', `عفواً، قام [${destUsername}] بتعطيل استلام المحادثات الخاصة 🔒`);
          return;
        }

        if (clean) {
          checkAndLogMonitoredWords(clean, sender, { type: 'pm', targetName: destUsername });
        }

        const expandedPmText = clean ? expandShortcuts(clean) : '';
        const now = Date.now();
        const validSelfDestruct = typeof selfDestructSeconds === 'number' && selfDestructSeconds > 0 ? selfDestructSeconds : undefined;

        const safePmMediaUrl = await ensureMediaUrlNotBase64(mediaUrl);
        let safePmVoiceNote = voiceNote;
        if (voiceNote?.audioUrl) {
          safePmVoiceNote = {
            ...voiceNote,
            audioUrl: (await ensureMediaUrlNotBase64(voiceNote.audioUrl)) || voiceNote.audioUrl
          };
        }

        const destBanner = recipient?.nameBannerUrl || targetMemberInfo?.nameBannerUrl;

        const pm: PrivateMessage = {
          id: `pm-${now}-${Math.random().toString(36).substring(2, 6)}`,
          fromId: sender.id,
          fromUsername: sender.username,
          fromAvatar: sender.avatarUrl,
          fromNameBannerUrl: sender.nameBannerUrl,
          toId: recipient ? recipient.id : `offline-${destUsername}`,
          toUsername: destUsername,
          toNameBannerUrl: destBanner,
          text: expandedPmText,
          mediaUrl: safePmMediaUrl,
          voiceNote: safePmVoiceNote,
          replyTo,
          time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
          timestamp: now,
          status: recipient ? 'delivered' : 'sent',
          selfDestructSeconds: validSelfDestruct,
          selfDestructAt: validSelfDestruct ? now + (validSelfDestruct * 1000) : undefined
        };

        // Persist in persistent privateChatHistory (unless self-destruct)
        if (!validSelfDestruct) {
          const pairKey = getPmPairKey(sender.username, destUsername);
          if (!privateChatHistory.has(pairKey)) {
            privateChatHistory.set(pairKey, []);
          }
          privateChatHistory.get(pairKey)!.push(pm);
          savePrivateChatHistory();
        }

        socket.emit('newPrivateMessage', pm);

        if (recipient) {
          if (recipient.id !== socket.id) {
            io.to(recipient.id).emit('newPrivateMessage', pm);
          }
        } else {
          // Recipient is offline: queue in offlinePrivateMessages so they receive it upon login!
          const key = destUsername.toLowerCase();
          if (!offlinePrivateMessages.has(key)) {
            offlinePrivateMessages.set(key, []);
          }
          offlinePrivateMessages.get(key)!.push(pm);
          saveOfflinePrivateMessages();
          socket.emit('systemAlert', `تم حفظ رسالتك في صندوق الوارد السحابي، وستصل لـ [${destUsername}] فور دخوله 📬`);
        }

        // Automatic Server-Side Fail-safe Self-Destruct Timer
        if (validSelfDestruct) {
          setTimeout(() => {
            io.to(sender.id).emit('privateMessageDeleted', { messageId: pm.id });
            if (recipient && recipient.id !== sender.id) {
              io.to(recipient.id).emit('privateMessageDeleted', { messageId: pm.id });
            }
          }, validSelfDestruct * 1000);
        }
      }
    }
  );

  // Mark Private Messages as Read (مؤشرات القراءة بالصحين الأزرقين مع الحفظ الدائم)
  socket.on('markPrivateMessagesRead', ({ partnerUsername, partnerId }: { partnerUsername: string; partnerId?: string }) => {
    const user = users.find((u) => u.id === socket.id);
    if (!user) return;

    const partnerLower = (partnerUsername || '').trim().toLowerCase();
    const partnerSockets = users.filter(
      (u) =>
        (partnerLower && u.username.trim().toLowerCase() === partnerLower) ||
        (partnerId && u.id === partnerId)
    );

    const now = Date.now();
    partnerSockets.forEach((p) => {
      io.to(p.id).emit('privateMessagesRead', {
        byUsername: user.username,
        readAt: now
      });
    });

    // Also confirm read status back to the reading socket
    socket.emit('privateMessagesRead', {
      byUsername: user.username,
      readAt: now
    });

    // Update read state in persistent privateChatHistory
    if (partnerUsername) {
      const pairKey = getPmPairKey(user.username, partnerUsername);
      const list = privateChatHistory.get(pairKey);
      if (list) {
        let changed = false;
        list.forEach((m) => {
          if (m.toUsername.toLowerCase() === user.username.toLowerCase() && m.status !== 'read') {
            m.status = 'read';
            m.readAt = now;
            changed = true;
          }
        });
        if (changed) {
          savePrivateChatHistory();
        }
      }
    }
  });

  // Get Persistent Private Chat History between two members from MongoDB
  socket.on('getPrivateChatHistory', ({ partnerUsername }: { partnerUsername: string }) => {
    const user = users.find((u) => u.id === socket.id);
    if (!user || !partnerUsername) return;
    const pairKey = getPmPairKey(user.username, partnerUsername);
    const history = privateChatHistory.get(pairKey) || [];
    socket.emit('privateChatHistory', {
      partnerUsername,
      messages: history.slice(-100)
    });
  });

  // Persistent User State Synchronization (قائمة التجاهل، المفضلة، الأصدقاء في MongoDB)
  socket.on('updateIgnoredUsers', ({ ignoredUsers }: { ignoredUsers: string[] }) => {
    const user = users.find((u) => u.id === socket.id);
    if (!user) return;
    const reg = registeredMembers[user.username];
    if (reg && Array.isArray(ignoredUsers)) {
      reg.ignoredUsers = ignoredUsers.slice(0, 500);
      saveMembers();
    }
  });

  socket.on('updateStarredMessages', ({ starredMessages }: { starredMessages: any[] }) => {
    const user = users.find((u) => u.id === socket.id);
    if (!user) return;
    const reg = registeredMembers[user.username];
    if (reg && Array.isArray(starredMessages)) {
      reg.starredMessages = starredMessages.slice(0, 100);
      saveMembers();
    }
  });

  socket.on('updateFriendsList', ({ friends }: { friends: string[] }) => {
    const user = users.find((u) => u.id === socket.id);
    if (!user) return;
    const reg = registeredMembers[user.username];
    if (reg && Array.isArray(friends)) {
      reg.friends = friends.slice(0, 500);
      saveMembers();
    }
  });

  // Like User Profile (مرة واحدة بالدقيقة لكل عضو - يعطيه لايك واحد +1 مع إشعار عائم)
  socket.on('likeUserProfile', ({ targetUsername }: { targetUsername: string }) => {
    const sender = users.find((u) => u.id === socket.id);
    if (!sender) return;

    if (!targetUsername || sender.username === targetUsername) {
      socket.emit('systemAlert', 'لا يمكنك إعطاء لايك لملفك الشخصي 🙂');
      return;
    }

    const target = users.find((u) => u.username === targetUsername);
    if (!target) {
      socket.emit('systemAlert', 'المستخدم غير متواجد حالياً.');
      return;
    }

    const cooldownKey = `${sender.id}_${target.username}`;
    const now = Date.now();
    const lastLikeTime = userLikeCooldownMap.get(cooldownKey) || 0;
    const cooldownDuration = Math.max(5, Number(serverSecurity.likeCooldownSeconds ?? 60)) * 1000;

    if (now - lastLikeTime < cooldownDuration) {
      const remainingSec = Math.ceil((cooldownDuration - (now - lastLikeTime)) / 1000);
      socket.emit('systemAlert', `⏳ يمكنك إعطاء لايك لهذا العضو مرة واحدة كل دقيقة (متبقي ${remainingSec} ثانية).`);
      return;
    }

    // Record timestamp
    userLikeCooldownMap.set(cooldownKey, now);

    // Increment target user likes by exactly 1
    target.likes = (target.likes || 0) + 1;

    // Persist in registeredMembers if exists
    if (registeredMembers[target.username]) {
      registeredMembers[target.username].likes = target.likes;
      saveMembers();
    }

    // Broadcast updated likes count to everyone
    io.emit('userLikesUpdated', {
      username: target.username,
      likes: target.likes
    });

    // Notify sender of success
    socket.emit('systemAlert', `أهديت إعجاباً ❤️ لـ [${target.username}]. رصيده الآن: ${target.likes} لايك 👍`);

    // Emit live floating like alert with sender avatar and name to the recipient
    io.to(target.id).emit('receivedProfileLike', {
      fromUsername: sender.username,
      fromAvatar: sender.avatarUrl || '',
      flag: sender.flag,
      likes: target.likes,
      timestamp: Date.now()
    });

    logMonitorEvent('likes', `أهدى [${sender.username}] لايك للملف الشخصي لـ [${target.username}] (المجموع: ${target.likes})`, sender.username, target.username);
  });

  // Private 1-on-1 Call Signaling (اتصال صوت وفيديو خاص)
  socket.on(
    'pmCallOffer',
    ({ toId, callType }: { toId: string; callType: 'audio' | 'video' }) => {
      const caller = users.find((u) => u.id === socket.id);
      const callee = users.find((u) => u.id === toId);

      if (!caller || !callee) {
        socket.emit('systemAlert', 'المستخدم غير متصل حالياً للاتصال به.');
        return;
      }

      if (!isSupremeHassan(caller) && caller.role !== 'admin' && caller.role !== 'super' && likesSettings.callLikes > 0 && caller.likes < likesSettings.callLikes) {
        socket.emit('systemAlert', `عفواً، تتطلب ميزة الاتصال الخاص ${likesSettings.callLikes} لايك على الأقل. رصيدك الحالي: ${caller.likes} 👍`);
        return;
      }

      const callId = `call-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      io.to(toId).emit('pmIncomingCall', {
        callId,
        fromUser: {
          id: caller.id,
          username: caller.username,
          avatarUrl: caller.avatarUrl,
          flag: caller.flag
        },
        callType
      });
    }
  );

  socket.on(
    'pmCallAnswer',
    ({ callId, toId, accepted }: { callId: string; toId: string; accepted: boolean }) => {
      const responder = users.find((u) => u.id === socket.id);
      if (accepted) {
        io.to(toId).emit('pmCallAccepted', { callId, responderId: socket.id });
      } else {
        io.to(toId).emit('pmCallRejected', {
          callId,
          reason: `${responder?.username || 'المستخدم'} رفض أو لم يستطع الرد على المكالمة.`
        });
      }
    }
  );

  socket.on(
    'pmCallSignal',
    ({ toId, data }: { toId: string; data: any }) => {
      io.to(toId).emit('pmCallSignal', { fromId: socket.id, data });
    }
  );

  socket.on(
    'pmCallEnd',
    ({ toId, duration, callType }: { toId: string; duration?: number; callType?: 'audio' | 'video' }) => {
      const sender = users.find((u) => u.id === socket.id);
      const recipient = users.find((u) => u.id === toId);

      io.to(toId).emit('pmCallEnded', { fromId: socket.id });
      socket.emit('pmCallEnded', { fromId: socket.id });

      if (sender && recipient) {
        const durationFormatted = duration && duration > 0 
          ? `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}` 
          : 'أقل من دقيقة';
        const notice: PrivateMessage = {
          id: `call-log-${Date.now()}`,
          fromId: sender.id,
          fromUsername: sender.username,
          fromAvatar: sender.avatarUrl,
          toId: recipient.id,
          toUsername: recipient.username,
          text: `📞 انتهت مكالمة ${callType === 'video' ? 'فيديو' : 'صوتية'} خاصة (${durationFormatted})`,
          isCallNotification: true,
          time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
          timestamp: Date.now()
        };
        socket.emit('newPrivateMessage', notice);
        if (toId !== socket.id) {
          io.to(toId).emit('newPrivateMessage', notice);
        }
      }
    }
  );

  // Add Room
  socket.on('createRoom', ({ name, desc, password }: { name: string; desc?: string; password?: string }) => {
    const admin = users.find((u) => u.id === socket.id);
    if (!admin || (!isSupremeHassan(admin) && admin.role !== 'admin' && admin.role !== 'super')) return;

    const cleanName = sanitizeText(name);
    if (!cleanName) return;

    const newRoom: ChatRoom = {
      id: cleanName,
      name: `Room | ${cleanName}`,
      desc: sanitizeText(desc) || 'غرفة جديدة في حسان برو',
      isPasswordProtected: !!password,
      password: password || undefined,
      voiceLimit: 30,
      activeVoiceCount: 0
    };

    chatRooms.push(newRoom);
    saveChatRooms();
    broadcastRoomsUpdate();
    socket.emit('systemAlert', `تم إنشاء غرفة [${cleanName}] بنجاح!`);
  });

  // Monitor logs fetch & clear
  socket.on('getMonitorLogs', () => {
    const admin = users.find((u) => u.id === socket.id);
    socket.emit('monitorLogs', monitorLogs);
    socket.emit('monitoredWordsUpdated', monitoredWords);
    if (admin && (isSupremeHassan(admin) || admin.role === 'admin' || admin.role === 'super')) {
      socket.emit('filterAlertsList', filterAlerts);
    }
  });

  socket.on('getFilterAlerts', () => {
    const admin = users.find((u) => u.id === socket.id);
    if (!admin || (!isSupremeHassan(admin) && admin.role !== 'admin' && admin.role !== 'super')) return;
    socket.emit('filterAlertsList', filterAlerts);
  });

  socket.on('clearFilterAlerts', () => {
    const admin = users.find((u) => u.id === socket.id);
    if (!admin || (!isSupremeHassan(admin) && admin.role !== 'admin' && admin.role !== 'super')) {
      socket.emit('systemAlert', 'عفواً، صلاحية مسح سجل الفلتر محصورة بالإدارة فقط.');
      return;
    }
    filterAlerts.length = 0;
    io.emit('filterAlertsList', []);
    socket.emit('systemAlert', 'تم تفريغ ومسح سجل تنبيهات الفلتر بنجاح 🧹');
  });

  socket.on('getMonitoredWords', () => {
    socket.emit('monitoredWordsUpdated', monitoredWords);
  });

  socket.on('addMonitoredWord', ({ word }: { word: string }) => {
    const admin = users.find((u) => u.id === socket.id);
    if (!admin || (!isSupremeHassan(admin) && admin.role !== 'admin' && admin.role !== 'super')) {
      socket.emit('systemAlert', 'عفواً، التحكم بكلمات الفلتر متاح للإدارة فقط.');
      return;
    }
    const cleanWord = sanitizeText(word?.trim());
    if (cleanWord && !monitoredWords.includes(cleanWord)) {
      monitoredWords.push(cleanWord);
      saveMonitoredWords();
      io.emit('monitoredWordsUpdated', monitoredWords);
      logMonitorEvent('role', `أضاف [${admin.username}] الكلمة [${cleanWord}] إلى فلتر المراقبة`, admin.username);
      socket.emit('systemAlert', `تمت إضافة الكلمة [${cleanWord}] إلى فلتر المراقبة.`);
    }
  });

  socket.on('removeMonitoredWord', ({ word }: { word: string }) => {
    const admin = users.find((u) => u.id === socket.id);
    if (!admin || (!isSupremeHassan(admin) && admin.role !== 'admin' && admin.role !== 'super')) {
      socket.emit('systemAlert', 'عفواً، التحكم بكلمات الفلتر متاح للإدارة فقط.');
      return;
    }
    monitoredWords = monitoredWords.filter((w) => w !== word);
    saveMonitoredWords();
    io.emit('monitoredWordsUpdated', monitoredWords);
    logMonitorEvent('role', `حذف [${admin.username}] الكلمة [${word}] من فلتر المراقبة`, admin.username);
    socket.emit('systemAlert', `تم حذف الكلمة [${word}] من فلتر المراقبة.`);
  });

  socket.on('clearMonitorLogs', () => {
    const admin = users.find((u) => u.id === socket.id);
    if (!admin || (!isSupremeHassan(admin) && admin.role !== 'admin' && admin.role !== 'super')) {
      socket.emit('systemAlert', 'عفواً، صلاحية حذف وإفراغ السجل الإداري محصورة بمدير النظام (Admin/Super) فقط.');
      return;
    }
    monitorLogs = [];
    saveAuditLogs();
    io.emit('monitorLogs', monitorLogs);
    logMonitorEvent('role', `قام ${admin.username} بحذف وإفراغ سجل المراقبة كاملاً بطلب يدوي صريح`, admin.username);
    socket.emit('systemAlert', 'تم حذف وإفراغ السجل الإداري كاملاً من قاعدة البيانات بنجاح 🗑️');
  });

  // Message Retention Limits Updates (تعديل سقف وحدود الرسائل مع الحذف التلقائي للأقدم)
  socket.on('updateMessageRetentionLimits', (limits: Partial<MessageRetentionLimits>) => {
    const admin = users.find((u) => u.id === socket.id);
    if (!admin || (admin.role !== 'hassan' && admin.role !== 'admin' && admin.role !== 'super' && getRoleLevel(admin.role) < 75)) {
      socket.emit('systemAlert', 'تعديل سقف وحدود الرسائل محصور بطاقم الإدارة.');
      return;
    }
    if (limits && typeof limits === 'object') {
      if (typeof limits.roomMaxMessages === 'number' && limits.roomMaxMessages > 0) {
        messageRetentionLimits.roomMaxMessages = limits.roomMaxMessages;
      }
      if (typeof limits.wallMaxPosts === 'number' && limits.wallMaxPosts > 0) {
        messageRetentionLimits.wallMaxPosts = limits.wallMaxPosts;
      }
      if (typeof limits.privateMaxMessages === 'number' && limits.privateMaxMessages > 0) {
        messageRetentionLimits.privateMaxMessages = limits.privateMaxMessages;
      }
      saveMessageRetentionLimits();
      pruneRoomChatHistory();
      pruneWallPosts();
      saveHistory();
      saveWallPosts();
      io.emit('messageRetentionLimitsUpdated', messageRetentionLimits);
      logMonitorEvent('security', `تعديل سقف الرسائل والحذف التلقائي: غرف (${messageRetentionLimits.roomMaxMessages})، حائط (${messageRetentionLimits.wallMaxPosts})، خاص (${messageRetentionLimits.privateMaxMessages}) بواسطة ${admin.username}`, admin.username);
      socket.emit('systemAlert', 'تم حفظ سقف وحدود الرسائل وتطبيق الحذف التلقائي بنجاح ✅');
    }
  });

  // =========================================================================
  // PROFILE VISITORS SYSTEM (زائري ملفي الشخصي - يظهر الاسم والصورة وعدد المرات)
  // =========================================================================
  socket.on('recordProfileVisit', ({ targetUsername }: { targetUsername: string }) => {
    const visitor = users.find((u) => u.id === socket.id);
    if (!visitor || !targetUsername) return;
    if (visitor.username.toLowerCase() === targetUsername.toLowerCase()) return; // Don't count self visits

    const targetMember = registeredMembers[targetUsername];
    if (!targetMember) return;

    if (!Array.isArray(targetMember.visitors)) {
      targetMember.visitors = [];
    }

    const existingIndex = targetMember.visitors.findIndex(
      (v) => v.username.toLowerCase() === visitor.username.toLowerCase()
    );

    if (existingIndex !== -1) {
      targetMember.visitors[existingIndex].visitCount = (targetMember.visitors[existingIndex].visitCount || 0) + 1;
      targetMember.visitors[existingIndex].lastVisitTime = Date.now();
      targetMember.visitors[existingIndex].avatarUrl = visitor.avatarUrl;
      targetMember.visitors[existingIndex].flag = visitor.flag;
      // Move to top of visitors list
      const [item] = targetMember.visitors.splice(existingIndex, 1);
      targetMember.visitors.unshift(item);
    } else {
      targetMember.visitors.unshift({
        username: visitor.username,
        avatarUrl: visitor.avatarUrl,
        flag: visitor.flag,
        visitCount: 1,
        lastVisitTime: Date.now()
      });
    }

    if (targetMember.visitors.length > 50) {
      targetMember.visitors = targetMember.visitors.slice(0, 50);
    }

    saveMembers();

    // If target user is online, emit real-time update and gentle notification
    const targetUser = users.find((u) => u.username.toLowerCase() === targetUsername.toLowerCase());
    if (targetUser) {
      io.to(targetUser.id).emit('profileVisitorsUpdated', targetMember.visitors);
      io.to(targetUser.id).emit('profileVisitedAlert', {
        visitorUsername: visitor.username,
        visitorAvatar: visitor.avatarUrl,
        visitCount: targetMember.visitors[0].visitCount,
        time: Date.now()
      });
    }
  });

  socket.on('getProfileVisitors', () => {
    const user = users.find((u) => u.id === socket.id);
    if (!user) return;
    const visitors = registeredMembers[user.username]?.visitors || [];
    socket.emit('profileVisitorsUpdated', visitors);
  });

  // =========================================================================
  // LIVE VIDEO & AUDIO BROADCAST SYSTEM (بث مباشر فيديو وصوت حقيقي للغرفة)
  // =========================================================================
  socket.on('startLiveBroadcast', ({ room, title }: { room: string; title?: string }) => {
    const user = users.find((u) => u.id === socket.id);
    if (!user) return;

    const targetRoom = room || user.room || 'الغرفة العامة';
    const broadcast: RoomLiveBroadcast = {
      broadcasterId: socket.id,
      broadcasterUsername: user.username,
      broadcasterAvatar: user.avatarUrl,
      broadcasterFlag: user.flag,
      room: targetRoom,
      title: title || `بث مباشر 🔴 ${user.username}`,
      startedAt: Date.now(),
      viewers: []
    };

    activeLiveBroadcasts.set(targetRoom, broadcast);
    io.to(targetRoom).emit('liveBroadcastStarted', {
      broadcasterId: socket.id,
      broadcasterUsername: user.username,
      broadcasterAvatar: user.avatarUrl,
      broadcasterFlag: user.flag,
      room: targetRoom,
      title: broadcast.title,
      startedAt: broadcast.startedAt,
      viewersCount: 0
    });

    logMonitorEvent('role', `بدأ [${user.username}] بثاً لايف مباشر (فيديو وصوت) في غرفة [${targetRoom}]`, user.username);
  });

  socket.on('endLiveBroadcast', ({ room }: { room: string }) => {
    const user = users.find((u) => u.id === socket.id);
    const targetRoom = room || (user ? user.room : 'الغرفة العامة');
    const broadcast = activeLiveBroadcasts.get(targetRoom);
    if (broadcast && (broadcast.broadcasterId === socket.id || (user && (isSupremeHassan(user) || user.role === 'admin' || user.role === 'super')))) {
      activeLiveBroadcasts.delete(targetRoom);
      io.to(targetRoom).emit('liveBroadcastEnded', { room: targetRoom, broadcasterUsername: broadcast.broadcasterUsername });
    }
  });

  socket.on('getLiveBroadcast', ({ room }: { room: string }) => {
    const targetRoom = room || 'الغرفة العامة';
    const broadcast = activeLiveBroadcasts.get(targetRoom);
    if (broadcast) {
      socket.emit('currentLiveBroadcast', {
        broadcasterId: broadcast.broadcasterId,
        broadcasterUsername: broadcast.broadcasterUsername,
        broadcasterAvatar: broadcast.broadcasterAvatar,
        broadcasterFlag: broadcast.broadcasterFlag,
        room: broadcast.room,
        title: broadcast.title,
        startedAt: broadcast.startedAt,
        viewersCount: broadcast.viewers.length
      });
    } else {
      socket.emit('currentLiveBroadcast', null);
    }
  });

  socket.on('joinLiveViewer', ({ room }: { room: string }) => {
    const targetRoom = room || 'الغرفة العامة';
    const broadcast = activeLiveBroadcasts.get(targetRoom);
    if (broadcast) {
      if (!broadcast.viewers.includes(socket.id)) {
        broadcast.viewers.push(socket.id);
      }
      io.to(targetRoom).emit('liveViewerCountUpdated', { room: targetRoom, count: broadcast.viewers.length });
    }
  });

  socket.on('leaveLiveViewer', ({ room }: { room: string }) => {
    const targetRoom = room || 'الغرفة العامة';
    const broadcast = activeLiveBroadcasts.get(targetRoom);
    if (broadcast) {
      broadcast.viewers = broadcast.viewers.filter((id) => id !== socket.id);
      io.to(targetRoom).emit('liveViewerCountUpdated', { room: targetRoom, count: broadcast.viewers.length });
    }
  });

  socket.on('liveSignal', ({ targetId, signal }: { targetId: string; signal: any }) => {
    const sender = users.find((u) => u.id === socket.id);
    io.to(targetId).emit('liveSignal', { senderId: socket.id, senderUsername: sender?.username || 'المستخدم', signal });
  });

  socket.on('liveVideoFrame', ({ room, frameData }: { room: string; frameData: string }) => {
    const sender = users.find((u) => u.id === socket.id);
    if (!sender) return;
    socket.to(room).emit('liveVideoFrame', { broadcasterUsername: sender.username, frameData });
  });

  socket.on('liveReaction', ({ room, emoji }: { room: string; emoji: string }) => {
    const user = users.find((u) => u.id === socket.id);
    io.to(room).emit('liveReactionReceived', { emoji, username: user?.username || 'عضو' });
  });

  // Disconnect handler: Preserves presence across phone screen locks & background sleep
  socket.on('disconnect', () => {
    socketFloodGuard.reset(socket.id);
    const disconnectedUser = users.find((u) => u.id === socket.id);
    if (disconnectedUser && disconnectedUser.room && disconnectedUser.room !== 'خارج الغرف') {
      socket.to(disconnectedUser.room).emit('userTyping', {
        userId: disconnectedUser.id,
        username: disconnectedUser.username,
        room: disconnectedUser.room,
        isTyping: false,
        timestamp: Date.now()
      });
    }

    let session: UserSession | undefined;
    for (const s of activeSessions.values()) {
      if (s.currentSocketId === socket.id) {
        session = s;
        break;
      }
    }

    // Only purge user if they EXPLICITLY triggered logout
    if (session && session.isExplicitlyLoggedOut) {
      const index = users.findIndex((u) => u.id === socket.id || u.username.toLowerCase() === session!.user.username.toLowerCase());
      if (index !== -1) {
        const user = users.splice(index, 1)[0];

        if (user.micSlot !== null) {
          const slots = getMicSlotsForRoom(user.room);
          const slot = slots.find((s) => s.slotNumber === user.micSlot);
          if (slot) slot.user = null;
          io.to(user.room).emit('micSlotsUpdated', slots);
        }

        logMonitorEvent('leave', `سجل ${user.username} خروجاً رسمياً من الدردشة`, user.username);

        if (user.isVoice) {
          io.to(user.room).emit('userLeftVoice', { userId: socket.id, username: user.username });
        }

        chatRooms.forEach((r) => {
          broadcastRoomUsers(r.id);
        });
        broadcastAllUsers();
        io.emit('roomStatsUpdated', getRoomStatistics());
      }
      if (session?.user?.username) {
        const uLower = session.user.username.toLowerCase();
        if (pendingAwayTimers.has(uLower)) {
          clearTimeout(pendingAwayTimers.get(uLower)!);
          pendingAwayTimers.delete(uLower);
        }
      }
      activeSessions.delete(session.sessionToken);
      usernameToSessionMap.delete(session.user.username.toLowerCase());
      return;
    }

    // Temporary disconnect / background app switch / screen lock:
    // Keep user session 100% active and connected without disconnection.
    // The presence mark remains green (online) for 2 full minutes, then transitions to yellow (away).
    const user = users.find((u) => u.id === socket.id);
    if (user) {
      user.isSpeaking = false;
      user.lastActiveTime = Date.now();
      const uName = user.username;
      const disconnectedSocketId = socket.id;

      // Keep user as 'online' (green mark) for 5 minutes before marking 'away' (yellow mark)
      if (pendingAwayTimers.has(uName.toLowerCase())) {
        clearTimeout(pendingAwayTimers.get(uName.toLowerCase())!);
      }

      const offlineGraceMs = Math.max(5, Number(serverSecurity.offlineGraceSeconds ?? 300)) * 1000;
      const micGraceMs = Math.max(5, Number(serverSecurity.micGraceSeconds ?? 45)) * 1000;

      const awayTimer = setTimeout(() => {
        pendingAwayTimers.delete(uName.toLowerCase());
        const currentU = users.find((u) => u.username.toLowerCase() === uName.toLowerCase());
        // If socket is still disconnected after offlineGraceMs (internet lost / browser closed), mark as 'offline' (gray dot)
        // whereas 'away' (yellow dot) is reserved for users whose socket is still alive in the background.
        if (currentU && currentU.id === disconnectedSocketId) {
          currentU.presenceState = 'offline';
          io.emit('userPresenceUpdated', { userId: currentU.id, username: currentU.username, state: 'offline' });
          broadcastRoomUsers(currentU.room);
          broadcastAllUsers();
        }
      }, offlineGraceMs);

      pendingAwayTimers.set(uName.toLowerCase(), awayTimer);

      // Grace period for mic preservation on momentary disconnect / tab switch
      if (user.micSlot !== null) {
        const slotRoom = user.room;
        const slotNum = user.micSlot;

        setTimeout(() => {
          // Check if user reconnected with a new socket ID
          const currentU = users.find((u) => u.username.toLowerCase() === uName.toLowerCase());
          if (!currentU || currentU.id === disconnectedSocketId || currentU.presenceState === 'offline') {
            // Still not reconnected after micGraceMs: safely free the mic slot
            if (currentU) {
              currentU.micSlot = null;
              currentU.isVoice = false;
            }
            const slots = getMicSlotsForRoom(slotRoom);
            const slot = slots.find((s) => s.slotNumber === slotNum);
            if (slot && (!slot.user || slot.user.id === disconnectedSocketId)) {
              slot.user = null;
              io.to(slotRoom).emit('micSlotsUpdated', slots);
              io.to(slotRoom).emit('userLeftVoice', { userId: disconnectedSocketId, username: uName, slotNumber: slotNum });
            }
          }
        }, micGraceMs);
      }
    }

    if (session) {
      session.lastActiveTime = Date.now();
      session.user.isSpeaking = false;
    }

    // Clean up active live broadcast if this socket was broadcaster or viewer
    for (const [rId, live] of activeLiveBroadcasts.entries()) {
      if (live.broadcasterId === socket.id) {
        activeLiveBroadcasts.delete(rId);
        io.to(rId).emit('liveBroadcastEnded', { room: rId, broadcasterUsername: live.broadcasterUsername });
      } else if (live.viewers.includes(socket.id)) {
        live.viewers = live.viewers.filter((id) => id !== socket.id);
        io.to(rId).emit('liveViewerCountUpdated', { room: rId, count: live.viewers.length });
      }
    }

    // Real-time online count & presence update (ghost-filtered)
    broadcastAllUsers();
  });
});

// Periodic check: Removes sessions only after the 1-hour grace period has fully expired
setInterval(() => {
  const oneHourAgo = Date.now() - 3600 * 1000;
  let changed = false;

  for (const [token, session] of activeSessions.entries()) {
    const socketConnected = io.sockets.sockets.get(session.currentSocketId)?.connected;
    if (!socketConnected && session.lastActiveTime < oneHourAgo) {
      const uIdx = users.findIndex((u) => u.username.toLowerCase() === session.user.username.toLowerCase());
      if (uIdx !== -1) {
        const removed = users.splice(uIdx, 1)[0];
        if (removed.micSlot !== null) {
          const slots = getMicSlotsForRoom(removed.room);
          const slot = slots.find((s) => s.slotNumber === removed.micSlot);
          if (slot) slot.user = null;
          io.to(removed.room).emit('micSlotsUpdated', slots);
        }
        broadcastRoomUsers(removed.room);
        changed = true;
      }
      activeSessions.delete(token);
      usernameToSessionMap.delete(session.user.username.toLowerCase());
    }
  }

  // Also sweep users array directly for any disconnected or orphaned sockets inactive > 30 mins
  const thirtyMinsAgo = Date.now() - 30 * 60 * 1000;
  for (let i = users.length - 1; i >= 0; i--) {
    const u = users[i];
    const isSocketAlive = io.sockets.sockets.get(u.id)?.connected;
    const lastActive = u.lastActiveTime || u.joinedAt || 0;
    if (!isSocketAlive && lastActive < thirtyMinsAgo) {
      const removed = users.splice(i, 1)[0];
      if (removed.micSlot !== null) {
        const slots = getMicSlotsForRoom(removed.room);
        const slot = slots.find((s) => s.slotNumber === removed.micSlot);
        if (slot) slot.user = null;
        io.to(removed.room).emit('micSlotsUpdated', slots);
      }
      broadcastRoomUsers(removed.room);
      changed = true;
    }
  }

  if (changed) {
    broadcastAllUsers();
  }
}, 60000);

// REST API & Health Check Endpoints
app.get(['/health', '/api/health'], (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    uptime: Math.floor(process.uptime()),
    timestamp: Date.now(),
    onlineUsers: users.length,
    activeRooms: chatRooms.length,
    version: '1.0.0'
  });
});

app.get('/api/stats', (_req, res) => {
  res.json({
    onlineUsers: users.length,
    activeRooms: chatRooms.length,
    totalMessages: chatHistory.length
  });
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  let port = 3000;
  const portArgIndex = process.argv.findIndex((arg) => arg === '--port' || arg === '-p');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    port = parseInt(process.argv[portArgIndex + 1], 10) || 3000;
  } else if (process.env.PORT) {
    port = parseInt(process.env.PORT, 10) || 3000;
  }

  let host = '0.0.0.0';
  const hostArgIndex = process.argv.findIndex((arg) => arg === '--host' || arg === '-h');
  if (hostArgIndex !== -1 && process.argv[hostArgIndex + 1]) {
    host = process.argv[hostArgIndex + 1];
  } else if (process.env.HOST) {
    host = process.env.HOST;
  }

  const isHmrDisabled = process.env.DISABLE_HMR === 'true';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled
          ? false
          : {
              server: httpServer
            }
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(
        express.static(distPath, {
          maxAge: '1d',
          setHeaders: (res, filePath) => {
            if (filePath.endsWith('.html')) {
              res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
              res.setHeader('Pragma', 'no-cache');
              res.setHeader('Expires', '0');
            }
          }
        })
      );
      app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api/') || req.path.startsWith('/socket.io/')) {
          return next();
        }
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      console.warn('⚠️ [Production Warning] dist/ folder not found. Falling back to dynamic Vite dev server so the app runs smoothly!');
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: {
          middlewareMode: true,
          hmr: isHmrDisabled
            ? false
            : {
                server: httpServer
              }
        },
        appType: 'spa'
      });
      app.use(vite.middlewares);
    }
  }

  try {
    // Warm up and await storage adapter hydration so initial requests receive complete data
    await dataManager.whenReady(3000);
    console.log(`📦 Data storage ready (isCloudConnected: ${dataManager.isCloudConnected()})`);
  } catch (err) {
    console.warn('⚠️ Data storage warmup warning (proceeding with best effort):', err);
  }

  httpServer.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${port} is already in use by another process.`);
    } else {
      console.error('❌ HTTP server encountered an error:', err);
    }
  });

  httpServer.listen(port, host, () => {
    console.log(`🚀 ProChat Hassan Server running on http://${host}:${port}`);
  });

  const handleShutdown = async (signal?: string) => {
    try {
      console.log(`🛑 Server shutting down (${signal || 'manual'}), committing all pending database writes...`);
      saveAuditLogs(true);
      saveMonitoredWords();
      saveMessageRetentionLimits();
      await dataManager.flush();
      io.close();
      httpServer.close();
    } catch (e) {
      console.error('Error during shutdown flush:', e);
    }
    process.exit(0);
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

// Process-level resilience against crashes on hosting platforms
process.on('uncaughtException', (err) => {
  console.error('⚠️ Trapped Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ Trapped Unhandled Rejection at:', promise, 'reason:', reason);
});

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});

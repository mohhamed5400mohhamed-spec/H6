import React, { useState, useEffect, useRef, lazy, Suspense, useMemo, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  Users,
  Eye,
  EyeOff,
  RotateCw,
  LogOut,
  Settings,
  MessageCircle,
  Hash,
  Bell,
  Plus,
  Smile,
  Heart,
  Radio,
  Download,
  Maximize2,
  Minimize2,
  Shield,
  ShieldCheck,
  Sliders,
  Zap,
  Award,
  Crown,
  Palette,
  Activity,
  Video,
  X,
  Sparkles,
  Camera,
  Image as ImageIcon,
  Key,
  Trash2,
  AlertTriangle,
  AlertCircle,
  UserX,
  PhoneOff,
  Filter,
  Check,
  CheckCheck,
  Flame,
  Timer,
  ChevronDown,
  Lock,
  Unlock,
  BellOff,
  Search,
  Gift,
  Play,
  Pause,
  Volume1,
  BellRing,
  Megaphone,
  AtSign,
  Music,
  PieChart,
  Star,
  Pin,
  Copy,
  Gamepad2,
  FileText,
  Phone,
  PhoneCall,
  User as UserIcon,
  Reply,
  Edit3,
  MessageSquare
} from 'lucide-react';
import confetti from './utils/confetti';
import { AudioMeshManager, RemoteVoicePeer } from './utils/audioMesh';
import type { RoomStatData } from './components/RoomStatsPieChart';
import type { LikesThresholdSettings, ServerSecuritySettings, MessageRetentionLimits } from './components/AdminControlSuite';
import { VoiceRecorder, VoicePlayer, VoiceNoteData } from './components/VoiceNoteModule';

export interface RecentLoginEntry {
  username: string;
  avatar: string;
  avatarUrl?: string;
  nameBannerUrl?: string;
  statusQuote?: string;
  flag: string;
  room: string;
  role: string;
  loginTime: string;
  timestamp: number;
}
import { PrivateCallOverlay, IncomingCallData, CallPartner } from './components/PrivateCallOverlay';
import {
  sounds,
  MESSAGE_SOUND_OPTIONS,
  JOIN_SOUND_OPTIONS,
  PRIVATE_SOUND_OPTIONS,
  MENTION_SOUND_OPTIONS,
  ALERT_SOUND_OPTIONS,
  MessageSoundId,
  JoinSoundId,
  PrivateSoundId,
  MentionSoundId,
  AlertSoundId
} from './utils/soundEffects';
import { generateAndDownloadProjectZip } from './utils/zipExport';
import { DEFAULT_AVATAR_SVG } from './utils/avatarConstants';
const falconIcon = DEFAULT_AVATAR_SVG;

import type { ThemeDefinition } from './components/ThemeAndWallpaperCenter';
import { ChatPowerToolsBar } from './components/ChatPowerToolsBar';

// Helper for resilient dynamic imports with automatic retries on network drops / server reloads
function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  retries = 3,
  interval = 800
): React.LazyExoticComponent<T> {
  return lazy(() =>
    new Promise<{ default: T }>((resolve, reject) => {
      const attempt = (remaining: number) => {
        factory()
          .then(resolve)
          .catch((error) => {
            if (remaining <= 0) {
              reject(error);
            } else {
              setTimeout(() => attempt(remaining - 1), interval);
            }
          });
      };
      attempt(retries);
    })
  );
}

// Lazy-loaded modal suites for instant initial page loading & resilient network caching
const RoomStatsPieChart = lazyWithRetry(() => import('./components/RoomStatsPieChart').then(m => ({ default: m.RoomStatsPieChart })));
const FalconMegaSuite = lazyWithRetry(() => import('./components/FalconMegaSuite').then(m => ({ default: m.FalconMegaSuite })));
const AdminControlSuite = lazyWithRetry(() => import('./components/AdminControlSuite').then(m => ({ default: m.AdminControlSuite })));
const AudioEqualizerAndEffects = lazyWithRetry(() => import('./components/AudioEqualizerAndEffects').then(m => ({ default: m.AudioEqualizerAndEffects })));
const InteractiveGamesSuite = lazyWithRetry(() => import('./components/InteractiveGamesSuite').then(m => ({ default: m.InteractiveGamesSuite })));
const IdentityProfileStudio = lazyWithRetry(() => import('./components/IdentityProfileStudio').then(m => ({ default: m.IdentityProfileStudio })));
const ThemeAndWallpaperCenter = lazyWithRetry(() => import('./components/ThemeAndWallpaperCenter').then(m => ({ default: m.ThemeAndWallpaperCenter })));
const SystemDiagnosticsModal = lazyWithRetry(() => import('./components/SystemDiagnosticsModal').then(m => ({ default: m.SystemDiagnosticsModal })));
const UltimateMegaFeatures50 = lazyWithRetry(() => import('./components/UltimateMegaFeatures50').then(m => ({ default: m.UltimateMegaFeatures50 })));
import { ChatShortcut, expandClientShortcuts, findMatchingShortcut } from './utils/chatShortcuts';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  notifyPrivateMessage,
  notifyMention,
  sendBrowserNotification,
  sendTestNotification,
  listenToNotificationClicks,
  registerNotificationServiceWorker
} from './utils/browserNotifications';
import {
  requestScreenWakeLock,
  startSilentAudioKeepAlive,
  stopSilentAudioKeepAlive,
  pauseKeepAliveAudio,
  resumeKeepAliveAudio,
  isKeepAliveAudioPlaying,
  updateMediaSessionMetadata,
  ensureBackgroundStreamForYouTube,
  notifySocketActivity,
  startHeartbeatWorker,
  stopHeartbeatWorker,
  setupVisibilityResync,
  setPresenceAwayDelayMs,
  uploadMediaWithProgress
} from './utils/connectionKeepAlive';
import { mediaSessionManager } from './utils/mediaSessionManager';
import { getCountryNameFromFlag, generateDeviceFingerprint, detectIncognitoMode } from './utils/countryDetect';
import {
  EmblemItem,
  EmblemType,
  EmblemsConfig,
  EmojiSizeSetting,
  DEFAULT_EMBLEMS,
  DEFAULT_EMBLEMS_CONFIG,
  DEFAULT_FALCON_CHAT_BANNER,
  DEFAULT_FALCON_AVATAR_ICON,
  parseCustomEmojisInText,
  getEmojiSizeClass
} from './utils/emblemsSystem';

import type {
  User,
  MemberEngagement,
  StoryComment,
  StoryItem,
  Message,
  TypingUser,
  MicSlot,
  WallComment,
  ProfileVisitorRecord,
  RoomLiveBroadcastState,
  WallPost,
  PrivateMessage,
  ChatRoom,
  MonitorEvent,
  RoleDefinition
} from './types/chat';

export const DEFAULT_ROLES_CONFIG: RoleDefinition[] = [
  { id: 'hassan', name: '🦅 إدارة عليا (hassan)', level: 100000, badgeColor: 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-black font-black shadow-lg', isSystem: true },
  { id: 'admin', name: '👑 مدير النظام (Admin)', level: 100, badgeColor: 'bg-red-600 text-white', isSystem: true },
  { id: 'super', name: '🛡️ سوبر إداري (Super)', level: 75, badgeColor: 'bg-amber-600 text-white', isSystem: true },
  { id: 'member', name: '🎖️ عضو معتمد (Member)', level: 50, badgeColor: 'bg-indigo-600 text-white', isSystem: true },
  { id: 'guest', name: '👤 زائر (Guest)', level: 10, badgeColor: 'bg-slate-600 text-white', isSystem: true }
];

import {
  extractYouTubeVideoId,
  getYouTubeEmbedUrl,
  getYouTubeThumbnailUrl,
  getYouTubeWatchUrl,
  cleanYouTubeUrlFromText,
  type YouTubeVideoInfo
} from './utils/youtube';

export type {
  User,
  MemberEngagement,
  StoryComment,
  StoryItem,
  TypingUser,
  ProfileVisitorRecord,
  RoomLiveBroadcastState,
  ThemeFullStyle
};

import {
  THEME_STYLES,
  getFontFamilyStyle,
  VINTAGE_STICKERS,
  AVAILABLE_REACTIONS,
  FONTS_LIST,
  buildThemeFullStyleFromCustom,
  buildNightModeTheme,
  isColorDark,
  isColorLight,
  calculateColorLuminance,
  getContrastTextColor,
  getThemeLuminance,
  getBubbleEffectiveBgColor,
  getAutoContrastMessageTextColor,
  getSafeMessageTextColor,
  type CustomThemePreset,
  type ThemeId,
  type ThemeFullStyle
} from './constants/themeStyles';

// Global emblems config reference for text parsing
let globalEmblemsConfig: EmblemsConfig = DEFAULT_EMBLEMS_CONFIG;

// Formatted Arabic Text & Poetry & Custom Emoji Parser
function renderFormattedMessageText(
  text: string,
  customEmojis?: EmblemItem[],
  emojiSize?: EmojiSizeSetting
) {
  if (!text) return null;

  const activeEmojis = customEmojis || globalEmblemsConfig.items;
  const activeSize = emojiSize || globalEmblemsConfig.emojiSize;

  // Check if poetry verse: starts with 📜 and has |
  if (text.startsWith('📜') && text.includes('|')) {
    const parts = text.replace('📜', '').split('|');
    return (
      <div className="my-1.5 p-3 rounded-xl bg-gradient-to-r from-amber-950/20 via-slate-900/10 to-amber-950/20 border border-amber-500/30 text-center font-serif shadow-inner">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-amber-900 font-bold text-sm">
          <span>« {parseCustomEmojisInText(parts[0]?.trim() || '', activeEmojis, activeSize)} »</span>
          <span className="text-amber-500 font-mono text-xs">❈ ═══ ❈</span>
          <span>« {parseCustomEmojisInText(parts[1]?.trim() || '', activeEmojis, activeSize)} »</span>
        </div>
      </div>
    );
  }

  // Parse formatting tokens: **bold**, *italic*, ~~strike~~, `code`, ==mark==
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~|`[^`]+`|==[^=]+==)/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-extrabold">
          {parseCustomEmojisInText(part.slice(2, -2), activeEmojis, activeSize)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={index} className="italic opacity-90">
          {parseCustomEmojisInText(part.slice(1, -1), activeEmojis, activeSize)}
        </em>
      );
    }
    if (part.startsWith('~~') && part.endsWith('~~')) {
      return (
        <del key={index} className="line-through opacity-60">
          {parseCustomEmojisInText(part.slice(2, -2), activeEmojis, activeSize)}
        </del>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={index} className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-mono text-xs">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('==') && part.endsWith('==')) {
      return (
        <mark key={index} className="bg-yellow-200 text-slate-900 px-1 rounded font-semibold">
          {parseCustomEmojisInText(part.slice(2, -2), activeEmojis, activeSize)}
        </mark>
      );
    }
    return (
      <React.Fragment key={index}>
        {parseCustomEmojisInText(part, activeEmojis, activeSize)}
      </React.Fragment>
    );
  });
}

const clearLocalSessionState = (clearMessages = false) => {
  try {
    localStorage.removeItem('soqoor_session_token');
    localStorage.removeItem('soqoor_session_username');
    localStorage.removeItem('soqoor_current_user');
    sessionStorage.removeItem('soqoor_session_token');
    sessionStorage.removeItem('soqoor_session_username');
    sessionStorage.removeItem('soqoor_current_user');
    if (clearMessages) {
      sessionStorage.removeItem('soqoor_room_messages');
      sessionStorage.removeItem('soqoor_private_messages');
    }
  } catch {}
};

interface ModalErrorBoundaryProps {
  children: React.ReactNode;
}

interface ModalErrorBoundaryState {
  hasError: boolean;
}

class ModalErrorBoundary extends React.Component<ModalErrorBoundaryProps, ModalErrorBoundaryState> {
  constructor(props: ModalErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ModalErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    console.error('[ModalErrorBoundary] Error loading modal chunk:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs text-right" dir="rtl">
          <div className="bg-slate-900 border border-amber-500/50 rounded-2xl p-5 max-w-sm w-full text-center space-y-3 shadow-2xl">
            <p className="text-xs font-bold text-amber-200">تعذر تحميل النافذة المطلوبة بسبب ضعف اتصال الشبكة</p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => this.setState({ hasError: false })}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black rounded-xl text-xs cursor-pointer shadow-md active:scale-95 transition-all"
              >
                إعادة المحاولة 🔄
              </button>
              <button
                type="button"
                onClick={() => this.setState({ hasError: false })}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs cursor-pointer border border-slate-700 active:scale-95 transition-all"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const SelfDestructCountdown: React.FC<{ targetAt: number }> = ({ targetAt }) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(() =>
    Math.max(0, Math.ceil((targetAt - Date.now()) / 1000))
  );

  useEffect(() => {
    const update = () => {
      setSecondsLeft(Math.max(0, Math.ceil((targetAt - Date.now()) / 1000)));
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [targetAt]);

  return <span className="font-bold text-amber-300">{secondsLeft}ث</span>;
};

export default function App() {
  // Socket & Connection
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<'connected' | 'reconnecting' | 'disconnected'>('connected');
  const reconnectBannerDelaySecondsRef = useRef<number>(4);
  const reconnectBannerTimerRef = useRef<number | null>(null);
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  const isForcedLoggedOutRef = useRef<boolean>(false);
  const [forcedLogoutInfo, setForcedLogoutInfo] = useState<{ show: boolean; message: string; timestamp: number } | null>(null);
  const [showConnectionDetailsModal, setShowConnectionDetailsModal] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const currentUserRef = useRef<User | null>(null);
  const roomEntryTimestampRef = useRef<number>(Date.now());
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadStatusText, setUploadStatusText] = useState<string>('');

  // Login Screen State: Default to member login tab, with auto-fill from last username only
  const [activeTab, setActiveTab] = useState<'visitor' | 'member' | 'register'>('member');
  const [usernameInput, setUsernameInput] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('soqoor_last_member_username') || '';
    }
    return '';
  });
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [detectedFlag, setDetectedFlag] = useState<string>('🇾🇪');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ghost Login State (الدخول المخفي)
  const [isGhostLogin, setIsGhostLogin] = useState(false);
  const [canUseGhostLogin, setCanUseGhostLogin] = useState(false);

  // Check ghost login permission whenever username changes
  useEffect(() => {
    const clean = usernameInput.trim();
    if (!clean || activeTab === 'visitor') {
      setCanUseGhostLogin(false);
      setIsGhostLogin(false);
      return;
    }

    if (socket && socket.connected) {
      socket.emit('checkGhostPermission', { username: clean }, (res: { allowed: boolean }) => {
        if (res && typeof res.allowed === 'boolean') {
          setCanUseGhostLogin(res.allowed);
          if (!res.allowed) setIsGhostLogin(false);
        }
      });
    }
  }, [usernameInput, activeTab, socket]);

  useEffect(() => {
    if (!socket) return;
    const handleGhostResult = ({ username, allowed }: { username: string; allowed: boolean }) => {
      if (usernameInput.trim().toLowerCase() === (username || '').toLowerCase()) {
        setCanUseGhostLogin(Boolean(allowed));
        if (!allowed) setIsGhostLogin(false);
      }
    };
    socket.on('ghostPermissionResult', handleGhostResult);
    return () => {
      socket.off('ghostPermissionResult', handleGhostResult);
    };
  }, [socket, usernameInput]);

  // Last 10 Logins & Active list tab on login screen
  const [recentLogins, setRecentLogins] = useState<RecentLoginEntry[]>([]);
  const [loginListTab, setLoginListTab] = useState<'online' | 'members' | 'recent'>('online');

  // Message Ceilings & Auto-Pruning Retention Limits (الغرف، الحائط، والخاص)
  const [messageRetentionLimits, setMessageRetentionLimits] = useState<MessageRetentionLimits>({
    roomMaxMessages: 200,
    wallMaxPosts: 100,
    privateMaxMessages: 100
  });
  const messageRetentionLimitsRef = useRef<MessageRetentionLimits>(messageRetentionLimits);
  useEffect(() => {
    messageRetentionLimitsRef.current = messageRetentionLimits;
  }, [messageRetentionLimits]);

  const pruneMessagesByRoomLimit = useCallback((msgs: Message[], roomMax: number): Message[] => {
    const limit = Math.max(10, Number(roomMax) || 200);
    if (!Array.isArray(msgs) || msgs.length === 0) return msgs;
    const countByRoom: Record<string, number> = {};
    const keep = new Array<boolean>(msgs.length).fill(true);
    let removed = 0;
    for (let i = msgs.length - 1; i >= 0; i--) {
      const m = msgs[i];
      if (!m) {
        keep[i] = false;
        removed++;
        continue;
      }
      const r = (m.room || 'الغرفة العامة').trim().toLowerCase();
      countByRoom[r] = (countByRoom[r] || 0) + 1;
      if (countByRoom[r] > limit) {
        keep[i] = false;
        removed++;
      }
    }
    return removed > 0 ? msgs.filter((_, idx) => keep[idx]) : msgs;
  }, []);

  // Periodic 30s ticker to automatically update relative times ("الآن", "منذ 5 دقائق", "منذ ساعة", etc.) live without page reload
  const [, setRelativeTimeTicker] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setRelativeTimeTicker((t) => (t + 1) % 1000000);
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Keep the login screen hidden until the server's shared appearance has loaded.
  // This prevents the local default banner/theme from flashing before MongoDB data arrives.
  const [appearanceReady, setAppearanceReady] = useState(false);
  const [falconChatBanner, setFalconChatBanner] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('falcon_chat_banner') || DEFAULT_FALCON_CHAT_BANNER;
    }
    return DEFAULT_FALCON_CHAT_BANNER;
  });
  const [falconAvatarIcon, setFalconAvatarIcon] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('falcon_avatar_icon') || DEFAULT_FALCON_AVATAR_ICON;
    }
    return DEFAULT_FALCON_AVATAR_ICON;
  });

  // Fast pre-fetch of approved banner, logo, wallpaper and theme directly via HTTP (Zero Flash on First Load)
  useEffect(() => {
    let active = true;
    fetch('/api/initial-appearance')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data || !data.success) return;
        if (data.bannerUrl) {
          setFalconChatBanner(data.bannerUrl);
          try { localStorage.setItem('falcon_chat_banner', data.bannerUrl); } catch {}
        }
        if (data.logoUrl) {
          setFalconAvatarIcon(data.logoUrl);
          try { localStorage.setItem('falcon_avatar_icon', data.logoUrl); } catch {}
        }
        if (data.theme) {
          setActiveTheme(data.theme);
          try { localStorage.setItem('soqoor_theme', data.theme); } catch {}
        }
        if (data.wallpaper) {
          setActiveWallpaper(data.wallpaper);
          try { localStorage.setItem('soqoor_wallpaper', data.wallpaper); } catch {}
        }
        if (data.fontFamily) {
          setFontFamily(data.fontFamily);
          try { localStorage.setItem('soqoor_font_family', data.fontFamily); } catch {}
        }
        if (data.fontWeight) {
          setChatFontWeight(data.fontWeight);
          try { localStorage.setItem('soqoor_font_weight', data.fontWeight); } catch {}
        }
        if (data.bubbleStyle) {
          setBubbleStyle(data.bubbleStyle);
          try { localStorage.setItem('soqoor_bubble_style', data.bubbleStyle); } catch {}
        }
        setAppearanceReady(true);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (appearanceReady) {
      document.body.classList.remove('app-booting');
    }
  }, [appearanceReady]);

  // Clean Room Mode: Messages start clean and empty on room entry/switch (No past messages backfill)
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesRef = useRef<Message[]>(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  const [textInput, setTextInput] = useState('');

  // Typing Indicator State & Refs (حالة ومؤقتات الأعضاء الذين يكتبون الآن في نفس الغرفة)
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSelfTypingRef = useRef<boolean>(false);

  // Broadcast typing status to room (إرسال إشعار الكتابة للغرفة الحالية)
  const notifyTyping = (isTyping: boolean) => {
    if (!socket || !currentUser || !currentUser.room || currentUser.room === 'خارج الغرف') return;
    if (isTyping) {
      if (!isSelfTypingRef.current) {
        isSelfTypingRef.current = true;
        socket.emit('typing', { isTyping: true });
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        isSelfTypingRef.current = false;
        socket.emit('typing', { isTyping: false });
      }, 3000);
    } else {
      if (isSelfTypingRef.current) {
        isSelfTypingRef.current = false;
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = null;
        }
        socket.emit('typing', { isTyping: false });
      }
    }
  };

  // Auto prune stale typing indicators every 1s (مسح أي مؤشر كتابة قديم تلقائياً بعد 4 ثوانٍ)
  useEffect(() => {
    if (typingUsers.length === 0) return;
    const interval = setInterval(() => {
      const now = Date.now();
      setTypingUsers((prev) => prev.filter((u) => now - u.lastTypedAt < 4000));
    }, 1000);
    return () => clearInterval(interval);
  }, [typingUsers.length]);

  // Clean up typing timeout on component unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, []);

  // Private Message typing indicators map: username (lower) -> { username, avatarUrl, nameBannerUrl, lastTypedAt }
  const [pmTypingUsers, setPmTypingUsers] = useState<Record<string, { username: string; avatarUrl?: string; nameBannerUrl?: string; lastTypedAt: number }>>({});
  const pmTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSelfPmTypingRef = useRef<boolean>(false);

  // Broadcast typing status to current PM partner (إرسال إشعار جاري الكتابة في الخاص)
  const notifyPmTyping = (isTyping: boolean) => {
    if (!socket || !selectedPmUser) return;
    if (isTyping) {
      if (!isSelfPmTypingRef.current) {
        isSelfPmTypingRef.current = true;
        socket.emit('pmTyping', { toId: selectedPmUser.id, toUsername: selectedPmUser.username, isTyping: true });
      }
      if (pmTypingTimeoutRef.current) {
        clearTimeout(pmTypingTimeoutRef.current);
      }
      pmTypingTimeoutRef.current = setTimeout(() => {
        isSelfPmTypingRef.current = false;
        socket.emit('pmTyping', { toId: selectedPmUser.id, toUsername: selectedPmUser.username, isTyping: false });
      }, 3000);
    } else {
      if (isSelfPmTypingRef.current) {
        isSelfPmTypingRef.current = false;
        if (pmTypingTimeoutRef.current) {
          clearTimeout(pmTypingTimeoutRef.current);
          pmTypingTimeoutRef.current = null;
        }
        socket.emit('pmTyping', { toId: selectedPmUser.id, toUsername: selectedPmUser.username, isTyping: false });
      }
    }
  };

  // Auto prune stale PM typing indicators
  const pmTypingCount = Object.keys(pmTypingUsers).length;
  useEffect(() => {
    if (pmTypingCount === 0) return;
    const interval = setInterval(() => {
      const now = Date.now();
      setPmTypingUsers((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const k of Object.keys(next)) {
          if (now - next[k].lastTypedAt >= 4000) {
            delete next[k];
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [pmTypingCount]);

  // Mobile Back Button accidental exit prevention modal (تأكيد مغادرة الشات عند الضغط على زر رجوع الهاتف)
  const [showExitConfirmModal, setShowExitConfirmModal] = useState<boolean>(false);
  const showExitConfirmModalRef = useRef<boolean>(showExitConfirmModal);
  useEffect(() => {
    showExitConfirmModalRef.current = showExitConfirmModal;
  }, [showExitConfirmModal]);

  const [micSlots, setMicSlots] = useState<MicSlot[]>([
    { slotNumber: 1, user: null },
    { slotNumber: 2, user: null },
    { slotNumber: 3, user: null },
    { slotNumber: 4, user: null },
    { slotNumber: 5, user: null }
  ]);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const isSpeakerMutedRef = useRef<boolean>(false);
  useEffect(() => {
    isSpeakerMutedRef.current = isSpeakerMuted;
  }, [isSpeakerMuted]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  // Emblems & Custom Emojis State (إدارة الرموز، السوابر، الهدايا، الستيكرات والفيسات)
  const [emblemsConfig, setEmblemsConfig] = useState<EmblemsConfig>(DEFAULT_EMBLEMS_CONFIG);
  useEffect(() => {
    globalEmblemsConfig = emblemsConfig;
  }, [emblemsConfig]);
  const [showBannerPickerModal, setShowBannerPickerModal] = useState<boolean>(false);
  const [bannerPickerTargetUser, setBannerPickerTargetUser] = useState<User | null>(null);
  const [customBannerUrlInput, setCustomBannerUrlInput] = useState<string>('');
  const [emojiPickerTab, setEmojiPickerTab] = useState<'custom' | 'stickers' | 'vintage'>('custom');

  // Member Gifting System State (نظام إهداء الهدايا الفاخرة وتثبيتها كمرافقة للاسم بجانب الصورة)
  const [giftModalTarget, setGiftModalTarget] = useState<User | null>(null);
  const [selectedGiftId, setSelectedGiftId] = useState<string>('');
  const [giftDedicationMessage, setGiftDedicationMessage] = useState<string>('مع أطيب التحيات وخالص التقدير 🌹');
  const [giftReceivedAlert, setGiftReceivedAlert] = useState<{
    fromUsername: string;
    fromAvatar?: string;
    giftTitle: string;
    giftUrl: string;
    giftMessage?: string;
  } | null>(null);

  // SIDE MODALS / PANELS (Matches screenshots: they take ~78% width, leaving background chat visible!)
  const [activeDrawer, setActiveDrawer] = useState<'none' | 'users' | 'rooms' | 'pm' | 'wall' | 'settings' | 'monitor' | 'profile'>('none');
  const activeDrawerRef = useRef(activeDrawer);
  useEffect(() => {
    activeDrawerRef.current = activeDrawer;
  }, [activeDrawer]);
  const [adminInitialTab, setAdminInitialTab] = useState<
    'moderation' | 'roomControls' | 'security' | 'bans' | 'broadcast' | 'stats' | 'memos' | 'words' | 'shortcuts' | 'logs' | 'matrix' | 'welcome' | 'emblems' | 'colors'
  >('moderation');
  const [adminInitialThemeToEdit, setAdminInitialThemeToEdit] = useState<string | undefined>(undefined);

  const handleOpenColorStudioWithTheme = (themeId: string) => {
    setShowThemesModal(false);
    setAdminInitialTab('colors');
    setAdminInitialThemeToEdit(themeId);
    setActiveDrawer('monitor');
  };
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [rosterUsers, setRosterUsers] = useState<User[]>([]);
  const [allConnectedUsers, setAllConnectedUsers] = useState<User[]>([]);
  const rosterUsersRef = useRef<User[]>([]);
  const allConnectedUsersRef = useRef<User[]>([]);
  useEffect(() => {
    rosterUsersRef.current = rosterUsers;
  }, [rosterUsers]);
  useEffect(() => {
    allConnectedUsersRef.current = allConnectedUsers;
  }, [allConnectedUsers]);
  const [allRegisteredMembers, setAllRegisteredMembers] = useState<Array<{
    username: string;
    role: string;
    flag: string;
    statusQuote: string;
    avatarUrl?: string;
    nameBannerUrl?: string;
    giftBadges?: string[];
    likes?: number;
    points?: number;
    honorBadge?: string;
    isOnline: boolean;
    currentRoom?: string;
    lastSeen?: number;
    presenceState?: 'online' | 'away' | 'offline';
  }>>([]);
  const [rolesConfig, setRolesConfig] = useState<RoleDefinition[]>(DEFAULT_ROLES_CONFIG);
  const [onlineCount, setOnlineCount] = useState(1);
  const [roomsList, setRoomsList] = useState<ChatRoom[]>([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [newRoomPass, setNewRoomPass] = useState('');
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);

  // Revealed Nicks State (كشف النكات والآي بي واسم الجهاز وبصمة الهاتف وتعداد العضويات)
  const [revealedNicksData, setRevealedNicksData] = useState<{
    targetUsername: string;
    ip: string;
    ipHistory?: string[];
    device?: string;
    deviceFingerprint?: string;
    country?: string;
    accountsCount: number;
    accounts: string[];
    accountMatchReasons?: Record<string, string>;
    role: string;
    room: string;
    flag: string;
    isOnline: boolean;
    lastSeen?: string;
    isIncognito?: boolean;
  } | null>(null);
  const [showRevealedNicksModal, setShowRevealedNicksModal] = useState(false);

  // Client Incognito / Private Browsing mode detection probe
  const [isIncognitoClient, setIsIncognitoClient] = useState<boolean>(false);
  const isIncognitoClientRef = useRef<boolean>(false);
  useEffect(() => {
    isIncognitoClientRef.current = isIncognitoClient;
  }, [isIncognitoClient]);
  useEffect(() => {
    detectIncognitoMode().then((isIncog) => {
      if (isIncog) setIsIncognitoClient(true);
    });
  }, []);

  // Unread Wall Posts Counter State (عداد رسائل ومنشورات الحائط الجديدة)
  const [unreadWallCount, setUnreadWallCount] = useState<number>(0);
  const lastSeenWallTimeRef = useRef<number>(
    typeof window !== 'undefined'
      ? Number(localStorage.getItem('soqoor_last_seen_wall')) || Date.now()
      : Date.now()
  );

  // Automatically mark wall posts as seen and clear badge whenever wall is opened
  useEffect(() => {
    if (activeDrawer === 'wall') {
      const now = Date.now();
      lastSeenWallTimeRef.current = now;
      try {
        localStorage.setItem('soqoor_last_seen_wall', String(now));
      } catch {}
      setUnreadWallCount(0);
    }
  }, [activeDrawer]);

  // Announcement Bar Display Timing (يظهر لعدة ثوانٍ عند الدخول ثم يختفي تلقائياً)
  const [showAnnouncementBar, setShowAnnouncementBar] = useState<boolean>(true);
  const announcementTimerRef = useRef<NodeJS.Timeout | null>(null);
  const triggerAnnouncementDisplay = (durationMs = 8000) => {
    setShowAnnouncementBar(true);
    if (announcementTimerRef.current) clearTimeout(announcementTimerRef.current);
    announcementTimerRef.current = setTimeout(() => {
      setShowAnnouncementBar(false);
    }, durationMs);
  };

  // General Welcome Settings State (إدارة الرسائل الترحيبية العامة للشات من لوحة التحكم)
  const [generalWelcome, setGeneralWelcome] = useState<{
    enabled: boolean;
    message: string;
    title: string;
  }>({
    enabled: true,
    message: 'أهلاً وسهلاً بكم في شات حسان برو! نتمنى لكم أسعد الأوقات وأجمل المحادثات في غرفنا الصوتية والكتابية 🦅✨',
    title: 'إدارة حسان برو 🦅'
  });

  // Centered Media Lightbox Viewer (عرض وتكبير وتحميل الفيديوهات والصور المتحركة والصور)
  const [activeMediaViewer, setActiveMediaViewer] = useState<{
    url: string;
    type: 'image' | 'video';
    title?: string;
  } | null>(null);
  const [isFullscreenMedia, setIsFullscreenMedia] = useState(false);

  // Persistent Floating Mini-Player (Picture-in-Picture المشغل العائم المستمر لفيديوهات الحائط والشات سواء يوتيوب أو فيديو هاتف)
  const [floatingVideo, setFloatingVideo] = useState<{
    url: string;
    title: string;
    currentTime?: number;
    type?: 'video' | 'youtube';
    youtubeId?: string;
    author?: string;
    postId?: string;
  } | null>(null);
  const [isFloatingVideoMuted, setIsFloatingVideoMuted] = useState(false);
  const [isFloatingVideoPlaying, setIsFloatingVideoPlaying] = useState(true);
  const [isFloatingVideoMinimized, setIsFloatingVideoMinimized] = useState(false);
  const [floatingPos, setFloatingPos] = useState<{ x: number; y: number } | null>(null);
  const floatingVideoRef = useRef<HTMLVideoElement | null>(null);
  const floatingAudioRef = useRef<HTMLAudioElement | null>(null);
  const youtubeIframeRef = useRef<HTMLIFrameElement | null>(null);
  const floatingVideoStateRef = useRef(floatingVideo);
  useEffect(() => {
    floatingVideoStateRef.current = floatingVideo;
  }, [floatingVideo]);
  const isFloatingManualPauseRef = useRef<boolean>(false);
  const floatingDragRef = useRef<{
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    isDragging: boolean;
  }>({ startX: 0, startY: 0, initialX: 0, initialY: 0, isDragging: false });

  // Floating Drag Handlers (سحب المشغل العائم والكبسولة بحرية وسلاسة تامة في أي مكان على الشاشة)
  const handleFloatingDragStart = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('input')) return;

    const el = document.getElementById('persistent-floating-player-container');
    const rect = el?.getBoundingClientRect() || { left: 16, top: window.innerHeight - 200 };

    floatingDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: rect.left,
      initialY: rect.top,
      isDragging: true
    };

    const onPointerMove = (ev: PointerEvent) => {
      if (!floatingDragRef.current.isDragging) return;
      const dx = ev.clientX - floatingDragRef.current.startX;
      const dy = ev.clientY - floatingDragRef.current.startY;

      const playerEl = document.getElementById('persistent-floating-player-container');
      const width = playerEl?.offsetWidth || 260;
      const height = playerEl?.offsetHeight || 60;

      const maxX = Math.max(8, window.innerWidth - width - 8);
      const maxY = Math.max(8, window.innerHeight - height - 8);

      const newX = Math.max(8, Math.min(maxX, floatingDragRef.current.initialX + dx));
      const newY = Math.max(8, Math.min(maxY, floatingDragRef.current.initialY + dy));

      setFloatingPos({ x: newX, y: newY });
    };

    const onPointerUp = () => {
      floatingDragRef.current.isDragging = false;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  }, []);

  const handleFloatingDragMove = useCallback((_e: React.PointerEvent) => {}, []);
  const handleFloatingDragEnd = useCallback((_e: React.PointerEvent) => {
    floatingDragRef.current.isDragging = false;
  }, []);

  const [warningReplyInput, setWarningReplyInput] = useState('');
  const [expandedCommentsPostId, setExpandedCommentsPostId] = useState<string | null>(null);
  const [wallCommentInput, setWallCommentInput] = useState('');

  // Filter Alerts State (سجل تنبيهات الفلتر مع اسم العضو والرسالة الكاملة)
  const [filterAlertsList, setFilterAlertsList] = useState<Array<{
    id: string;
    username: string;
    avatarUrl?: string;
    flag?: string;
    room: string;
    targetUser?: string;
    contextType?: 'room' | 'pm' | 'wall_post' | 'wall_comment';
    matchedWords: string[];
    fullMessage: string;
    timestamp: number;
    time: string;
  }>>([]);

  // Active Reaction Popover State (لتفعيل نقر زر التفاعل على الهواتف والأجهزة اللمسية)
  const [activeReactionMsgId, setActiveReactionMsgId] = useState<string | null>(null);

  // Mic Slot Action Modal State (خيارات المايك: سحب المايك أو كتم المايك)
  const [micActionSlot, setMicActionSlot] = useState<{ slotNumber: number; slotUser: User | null } | null>(null);

  // Connection Stability & Background Queuing (طابور الرسائل المعلقة أثناء الانقطاع اللحظي أو بالخلفية)
  const pendingMessagesQueueRef = useRef<Array<{ event: string; payload: any }>>([]);

  // Message Single Action Menu State (قائمة الإجراءات المنسدلة للرسائل ⋮)
  const [activeMsgMenuId, setActiveMsgMenuId] = useState<string | null>(null);

  // 24-Hour Stories / Khwater States (نظام الخواطر والحالات 24 ساعة)
  const [storiesList, setStoriesList] = useState<StoryItem[]>([]);
  const [activeStoryViewer, setActiveStoryViewer] = useState<StoryItem | null>(null);
  const activeStoryViewerRef = useRef<StoryItem | null>(activeStoryViewer);
  useEffect(() => {
    activeStoryViewerRef.current = activeStoryViewer;
  }, [activeStoryViewer]);
  const [isCreatingStory, setIsCreatingStory] = useState(false);
  const [storyMediaUrl, setStoryMediaUrl] = useState('');
  const [storyMediaType, setStoryMediaType] = useState<'image' | 'video'>('image');
  const [storyCaption, setStoryCaption] = useState('');
  const [isStoryUploading, setIsStoryUploading] = useState(false);
  const [storyUploadProgress, setStoryUploadProgress] = useState(0);
  const [storyCommentInput, setStoryCommentInput] = useState('');
  const [showStoryComments, setShowStoryComments] = useState(false);

  // Wall State
  const [wallPosts, setWallPosts] = useState<WallPost[]>([]);
  const [wallTab, setWallTab] = useState<'posts' | 'quick'>('posts');
  const [wallTextInput, setWallTextInput] = useState('');
  const [wallMediaUrl, setWallMediaUrl] = useState('');
  const [isWallUploading, setIsWallUploading] = useState(false);
  const [wallUploadProgress, setWallUploadProgress] = useState<number | null>(null);

  // YouTube in Wall State (البحث والمشاركة والتشغيل المباشر لفيديوهات يوتيوب بالحائط)
  const [showYouTubeSearchModal, setShowYouTubeSearchModal] = useState(false);
  const [ytSearchQuery, setYtSearchQuery] = useState('');
  const [ytSearchResults, setYtSearchResults] = useState<YouTubeVideoInfo[]>([]);
  const [isYtSearching, setIsYtSearching] = useState(false);
  const [ytSearchError, setYtSearchError] = useState<string | null>(null);
  const [playingYouTubePostId, setPlayingYouTubePostId] = useState<string | null>(null);

  // Private Messages State - Clean start mode (no past messages backfilled on entrance)
  const [privateMessages, setPrivateMessages] = useState<PrivateMessage[]>([]);
  const privateMessagesRef = useRef<PrivateMessage[]>(privateMessages);
  useEffect(() => {
    privateMessagesRef.current = privateMessages;
  }, [privateMessages]);
  const [selectedPmUser, setSelectedPmUser] = useState<User | null>(null);
  const selectedPmUserRef = useRef<User | null>(null);
  const [pmWindowMode, setPmWindowMode] = useState<'split' | 'full'>('split');
  const [pmInput, setPmInput] = useState('');
  const [unreadPerUser, setUnreadPerUser] = useState<Record<string, number>>({});

  useEffect(() => {
    selectedPmUserRef.current = selectedPmUser;
    if (selectedPmUser?.username) {
      // Clean Start: Do not recall past message history from server, start fresh
      setUnreadPerUser((prev) => {
        if (!prev[selectedPmUser.username]) return prev;
        const updated = { ...prev };
        const cleared = updated[selectedPmUser.username] || 0;
        delete updated[selectedPmUser.username];
        setNotificationCount((c) => Math.max(0, c - cleared));
        return updated;
      });
    }
  }, [selectedPmUser]);
  const [pmReplyingTo, setPmReplyingTo] = useState<{ id: string; username: string; text: string } | null>(null);
  const [isPmRecordingVoice, setIsPmRecordingVoice] = useState(false);
  const [pmSelfDestructSeconds, setPmSelfDestructSeconds] = useState<number>(0);
  const [showPmSelfDestructMenu, setShowPmSelfDestructMenu] = useState(false);
  const [showPmEncryptionModal, setShowPmEncryptionModal] = useState(false);
  const [appDialog, setAppDialog] = useState<{
    type: 'confirm' | 'prompt';
    title: string;
    message: string;
    placeholder?: string;
    defaultValue?: string;
    inputType?: string;
    onConfirm: (val: string) => void;
  } | null>(null);
  const [appDialogInput, setAppDialogInput] = useState('');
  const openAppConfirm = (title: string, message: string, onConfirm: () => void) => {
    setAppDialogInput('');
    setAppDialog({ type: 'confirm', title, message, onConfirm: () => onConfirm() });
  };
  const openAppPrompt = (
    title: string,
    message: string,
    defaultValue: string,
    onConfirm: (val: string) => void,
    placeholder?: string,
    inputType = 'text'
  ) => {
    setAppDialogInput(defaultValue);
    setAppDialog({ type: 'prompt', title, message, defaultValue, placeholder, inputType, onConfirm });
  };

  const hasSelfDestructPm = useMemo(
    () => privateMessages.some((pm) => Boolean(pm?.selfDestructAt)),
    [privateMessages]
  );

  // Automatic client expiration for self-destruct messages (only runs interval when needed)
  useEffect(() => {
    if (!hasSelfDestructPm) return;
    const timer = window.setInterval(() => {
      const now = Date.now();
      setPrivateMessages((prev) => {
        if (!Array.isArray(prev)) return [];
        const hasExpired = prev.some((pm) => pm && pm.selfDestructAt && pm.selfDestructAt <= now);
        if (!hasExpired) return prev;
        return prev.filter((pm) => !(pm && pm.selfDestructAt && pm.selfDestructAt <= now));
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [hasSelfDestructPm]);

  // Mark incoming private messages as read when viewing PM conversation
  useEffect(() => {
    if (activeDrawer === 'pm' && selectedPmUser) {
      const partnerRaw = selectedPmUser.username || '';
      const partnerClean = partnerRaw.trim().toLowerCase();

      // Clear unread badge counter for this partner immediately
      setUnreadPerUser((prev) => {
        if (!prev[partnerRaw] && !prev[partnerClean]) return prev;
        const next = { ...prev };
        const count = (next[partnerRaw] || 0) + (next[partnerClean] || 0);
        delete next[partnerRaw];
        delete next[partnerClean];
        setNotificationCount((c) => Math.max(0, c - count));
        try {
          sessionStorage.setItem('soqoor_unread_pm', JSON.stringify(next));
        } catch {}
        return next;
      });

      if (socket) {
        socket.emit('markPrivateMessagesRead', {
          partnerUsername: selectedPmUser.username,
          partnerId: selectedPmUser.id
        });
      }

      setPrivateMessages((prev) => {
        if (!Array.isArray(prev)) return [];
        let changed = false;
        const now = Date.now();
        const updated = prev.map((pm) => {
          if (pm && pm.fromUsername.trim().toLowerCase() === partnerClean && pm.status !== 'read') {
            changed = true;
            return { ...pm, status: 'read' as const, readAt: pm.readAt || now };
          }
          return pm;
        });
        return changed ? updated : prev;
      });
    }
  }, [activeDrawer, selectedPmUser, socket, privateMessages.length]);

  // Fetch freshest administrative data (monitor logs, filter alerts, filter words, message ceilings) upon opening monitor drawer
  useEffect(() => {
    if (activeDrawer === 'monitor' && socket && currentUser && (currentUser.role === 'admin' || hasUserPermission(currentUser, 'canAccessControlPanel') || getRoleLevel(currentUser.role) >= 50)) {
      socket.emit('getMonitorLogs');
      socket.emit('getFilterAlerts');
      socket.emit('getMonitoredWords');
      socket.emit('getMessageRetentionLimits');
      socket.emit('getAdminData');
    }
  }, [activeDrawer, socket, currentUser]);

  // Message Reply & Voice Recording States
  const [replyingTo, setReplyingTo] = useState<{ id: string; username: string; text: string; mediaUrl?: string } | null>(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);

  // Message Editing States (تعديل الرسائل في الغرف، الحائط، والخاص)
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingMsgText, setEditingMsgText] = useState('');
  const [editingWallPostId, setEditingWallPostId] = useState<string | null>(null);
  const [editingWallPostText, setEditingWallPostText] = useState('');
  const [editingPmId, setEditingPmId] = useState<string | null>(null);
  const [editingPmText, setEditingPmText] = useState('');

  // Private 1-on-1 Call States (اتصال خاص صوت وفيديو)
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);
  const [activeCall, setActiveCall] = useState<{
    callId: string;
    partner: CallPartner;
    callType: 'audio' | 'video';
    isInitiator: boolean;
    acceptedByPeer?: boolean;
  } | null>(null);

  // Coordinate Private Call audio focus with MediaSessionManager
  useEffect(() => {
    if (activeCall || incomingCall) {
      mediaSessionManager.enterCallMode();
    } else if (!audioManagerRef.current?.isInVoice) {
      mediaSessionManager.exitCallMode();
    }
  }, [activeCall, incomingCall]);

  // Dynamic Monitored Filter Words State
  const [monitoredWordsList, setMonitoredWordsList] = useState<string[]>([
    'سب', 'شتم', 'قذف', 'لعن', 'طرد', 'كود', 'هكر', 'اخترق', 'سكس', 'اباحي',
    'قحبة', 'منيوك', 'كس', 'طيز', 'كلب', 'حمار', 'وسخ', 'حقير', 'تفو'
  ]);
  const [newFilterWordInput, setNewFilterWordInput] = useState('');

  // Live Broadcast Video & Audio (بث لايف فيديو وصوت حقيقي للغرفة)
  const [isBroadcastingLive, setIsBroadcastingLive] = useState(false);
  const [isWatchingLive, setIsWatchingLive] = useState(false);
  const [activeRoomLiveBroadcast, setActiveRoomLiveBroadcast] = useState<RoomLiveBroadcastState | null>(null);
  const [liveViewerCount, setLiveViewerCount] = useState(0);
  const [liveMediaStream, setLiveMediaStream] = useState<MediaStream | null>(null);
  const [isLiveCameraOff, setIsLiveCameraOff] = useState(false);
  const [isLiveMicMuted, setIsLiveMicMuted] = useState(false);
  const [liveFacingMode, setLiveFacingMode] = useState<'user' | 'environment'>('user');
  const [liveRemoteVideoFrame, setLiveRemoteVideoFrame] = useState<string | null>(null);
  const [liveFloatingReactions, setLiveFloatingReactions] = useState<Array<{ id: string; emoji: string; left: number }>>([]);
  const [isLiveMinimized, setIsLiveMinimized] = useState(false);
  const [showStartLiveConfirm, setShowStartLiveConfirm] = useState(false);

  // Profile Visitors System (زائري ملفي الشخصي)
  const [profileVisitorsList, setProfileVisitorsList] = useState<ProfileVisitorRecord[]>([]);
  const [showProfileVisitorsModal, setShowProfileVisitorsModal] = useState(false);

  const localLiveVideoRef = useRef<HTMLVideoElement | null>(null);
  const liveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const liveFrameIntervalRef = useRef<any>(null);

  // Chat Shortcuts State (الاختصارات الذكية للشات)
  const [shortcuts, setShortcuts] = useState<ChatShortcut[]>([]);


  const [warningModalTarget, setWarningModalTarget] = useState<User | null>(null);
  const [customWarningText, setCustomWarningText] = useState('');

  // Customizable Sound Effects State (Event-specific tones)
  const [selectedMsgSound, setSelectedMsgSound] = useState<MessageSoundId>(sounds.getMessageSound());
  const [selectedJoinSound, setSelectedJoinSound] = useState<JoinSoundId>(sounds.getJoinSound());
  const [selectedPrivateSound, setSelectedPrivateSound] = useState<PrivateSoundId>(sounds.getPrivateSound());
  const [selectedMentionSound, setSelectedMentionSound] = useState<MentionSoundId>(sounds.getMentionSound());
  const [selectedAlertSound, setSelectedAlertSound] = useState<AlertSoundId>(sounds.getAlertSound());
  const [soundsMuted, setSoundsMuted] = useState<boolean>(sounds.isMuted());

  // Settings: Member options for disabling PMs and Muting/Disabling all notifications
  const [isPmDisabled, setIsPmDisabled] = useState<boolean>(() => Boolean(currentUser?.isPmDisabled));
  const [allNotificationsDisabled, setAllNotificationsDisabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('soqoor_notifications_disabled') === 'true';
    } catch {
      return false;
    }
  });
  const allNotificationsDisabledRef = useRef(allNotificationsDisabled);
  useEffect(() => {
    allNotificationsDisabledRef.current = allNotificationsDisabled;
    if (allNotificationsDisabled) {
      sounds.setMuted(true);
      setSoundsMuted(true);
    }
  }, [allNotificationsDisabled]);

  useEffect(() => {
    if (currentUser?.isPmDisabled !== undefined) {
      setIsPmDisabled(Boolean(currentUser.isPmDisabled));
    }
  }, [currentUser?.isPmDisabled]);

  // Mobile Media Player Keep-Alive & Notification Bar Integration
  const [keepAlivePlayerEnabled, setKeepAlivePlayerEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('soqoor_keepalive_player') !== 'false';
    } catch {
      return true;
    }
  });
  const [isKeepAlivePlayingState, setIsKeepAlivePlayingState] = useState<boolean>(true);

  useEffect(() => {
    if (currentUser && keepAlivePlayerEnabled) {
      const info = {
        title: `شات حسان برو | ${currentUser.room || 'الغرفة العامة'} 💬`,
        artist: `${currentUser.username} • متصل ونشط في الخلفية 🟢 • انقر للعودة`,
        album: typeof window !== 'undefined' ? (window.location.hostname || 'شات حسان برو') : 'شات حسان برو'
      };
      if (isKeepAliveAudioPlaying()) {
        updateMediaSessionMetadata(info);
      } else {
        startSilentAudioKeepAlive(info);
      }
      setIsKeepAlivePlayingState(true);
    } else if (!keepAlivePlayerEnabled) {
      stopSilentAudioKeepAlive();
      setIsKeepAlivePlayingState(false);
    }
  }, [currentUser?.username, currentUser?.room, keepAlivePlayerEnabled]);

  // Dedicated Sound Center Modal & Test Sequencer (مركز التنبيهات الصوتية المخصصة)
  const [showSoundModal, setShowSoundModal] = useState<boolean>(false);
  const [testingSequence, setTestingSequence] = useState<boolean>(false);
  const [activePlayingSound, setActivePlayingSound] = useState<'alert' | 'private' | 'mention' | 'msg' | 'join' | null>(null);

  // Web Notifications API States (نظام تنبيهات المتصفح في الخلفية وعند إغلاق الشاشة)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(() => getNotificationPermission());
  const [showNotificationBanner, setShowNotificationBanner] = useState<boolean>(() => {
    try {
      if (sessionStorage.getItem('soqoor_notif_banner_dismissed') === 'true') return false;
    } catch {}
    return isNotificationSupported() && getNotificationPermission() === 'default';
  });

  // Broadcast Alert Modal (إشعار عام للغرفة)
  const [showBroadcastModal, setShowBroadcastModal] = useState<boolean>(false);
  const [broadcastAlertText, setBroadcastAlertText] = useState<string>('');

  // Mention Suggestions Dropdown State
  const [mentionSuggestions, setMentionSuggestions] = useState<User[]>([]);
  const [showMentionMenu, setShowMentionMenu] = useState<boolean>(false);

  // Consolidated Floating Quick Tools Menu (دمج الأزرار العائمة في أيقونة صغيرة واحدة للحفاظ على مساحة المراسلة)
  const [showCompactToolsMenu, setShowCompactToolsMenu] = useState<boolean>(false);
  // Dedicated In-Room Settings Modal (إعدادات الغرفة الحالية من الضبط)
  const [isRoomSettingsModalOpen, setIsRoomSettingsModalOpen] = useState<boolean>(false);
  // Filter Alerts Modal (عرض رسائل الفلتر الملتقطة عند النقر على أيقونة الجرس)
  const [showFilterAlertsModal, setShowFilterAlertsModal] = useState<boolean>(false);
  // Room Settings State for Current Room (إعدادات الغرفة ورسالة الترحيب لمالك الغرفة)
  const [currentRoomSettingsForm, setCurrentRoomSettingsForm] = useState<{
    name: string;
    desc: string;
    pinnedTopic: string;
    isChatLocked: boolean;
    slowModeSeconds: number;
    isVoiceLocked: boolean;
    showDeletedNotice?: boolean;
    password: string;
    isPasswordProtected?: boolean;
    clearPassword?: boolean;
    wallpaper: string;
    welcomeMessage: string;
    welcomeEnabled: boolean;
  }>({
    name: '',
    desc: '',
    pinnedTopic: '',
    isChatLocked: false,
    slowModeSeconds: 0,
    isVoiceLocked: false,
    showDeletedNotice: false,
    password: '',
    isPasswordProtected: false,
    clearPassword: false,
    wallpaper: 'default',
    welcomeMessage: '',
    welcomeEnabled: true
  });

  // Ignore / Block Users State (قائمة الأعضاء المتجاهلين)
  const [ignoredUsers, setIgnoredUsers] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('soqoor_ignored_users');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const ignoredUsersSet = useMemo(() => {
    return new Set(ignoredUsers.map((u) => u.toLowerCase().trim()));
  }, [ignoredUsers]);

  const isUserIgnored = (username?: string) => {
    if (!username) return false;
    return ignoredUsersSet.has(username.toLowerCase().trim());
  };

  // Friends List State (قائمة الأصدقاء المحفوظة سحابياً في MongoDB)
  const [userFriends, setUserFriends] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('user_friends_list');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const isUserFriend = (username?: string) => {
    if (!username) return false;
    return userFriends.some((f) => f.toLowerCase().trim() === username.toLowerCase().trim());
  };

  // Mega Suite & Creative Features State (ميزات حسان برو الإبداعية الـ 50+)
  const [isMegaSuiteOpen, setIsMegaSuiteOpen] = useState<boolean>(false);
  const [showUltimateFeatures50, setShowUltimateFeatures50] = useState<boolean>(false);
  const [chatFontSize, setChatFontSize] = useState<'sm' | 'base' | 'lg' | 'xl'>(() => {
    try {
      const saved = localStorage.getItem('soqoor_chat_font_size');
      if (saved === 'sm' || saved === 'base' || saved === 'lg' || saved === 'xl') return saved;
    } catch {}
    return 'base';
  });
  const [eyeComfort, setEyeComfort] = useState<boolean>(() => {
    try {
      return localStorage.getItem('soqoor_eye_comfort') === 'true';
    } catch {
      return false;
    }
  });
  const [isNightMode, setIsNightMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('soqoor_night_mode') === 'true';
    } catch {
      return false;
    }
  });
  const [isHighContrastMode, setIsHighContrastMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('soqoor_high_contrast') === 'true';
    } catch {
      return false;
    }
  });


  useEffect(() => {
    if (isNightMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme-mode', 'night');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.removeAttribute('data-theme-mode');
    }
  }, [isNightMode]);

  // These are only first-paint fallbacks. The persisted admin values arrive from
  // the server's globalAppearance payload and replace them before the app is shown.
  const [activeTheme, setActiveTheme] = useState<string>(() => {
    try {
      return localStorage.getItem('soqoor_theme') || 'pearl-gray-calm';
    } catch {
      return 'pearl-gray-calm';
    }
  });
  const [pinnedTopic, setPinnedTopic] = useState<string>('');
  const [userMood, setUserMood] = useState<string>(() => {
    try {
      return localStorage.getItem('soqoor_user_mood') || 'مروق ☕';
    } catch {
      return 'مروق ☕';
    }
  });
  const [userFrame, setUserFrame] = useState<string>(() => {
    try {
      return localStorage.getItem('soqoor_user_frame') || 'gold';
    } catch {
      return 'gold';
    }
  });
  const [filterOnlyMentions, setFilterOnlyMentions] = useState<boolean>(false);
  const [showFloatingFilterMenu, setShowFloatingFilterMenu] = useState<boolean>(false);
  const [showChatPowerTools, setShowChatPowerTools] = useState<boolean>(false);
  const userLikeCooldownsRef = useRef<Record<string, number>>({});
  const [floatingLikeAlert, setFloatingLikeAlert] = useState<{
    fromUsername: string;
    fromAvatar?: string;
    flag?: string;
    likes: number;
  } | null>(null);

  // Likes Threshold Requirements State (شروط عدد اللايكات المطلوبة للإرسال)
  const [likesSettings, setLikesSettings] = useState<LikesThresholdSettings>({
    roomTextLikes: 0,
    roomMediaLikes: 0,
    wallTextLikes: 0,
    wallMediaLikes: 0,
    pmTextLikes: 0,
    pmMediaLikes: 0,
    micLikes: 0,
    callLikes: 0
  });

  // 100+ Creative Features Suite States
  const [showAudioStudio, setShowAudioStudio] = useState<boolean>(false);
  const [showGamesSuite, setShowGamesSuite] = useState<boolean>(false);
  const [showIdentityStudio, setShowIdentityStudio] = useState<boolean>(false);
  const [showThemesModal, setShowThemesModal] = useState<boolean>(false);
  const [showDiagnosticsModal, setShowDiagnosticsModal] = useState<boolean>(false);
  const [activeWallpaper, setActiveWallpaper] = useState<string>(() => {
    try {
      return localStorage.getItem('soqoor_wallpaper') || 'default';
    } catch {
      return 'default';
    }
  });
  const [fontFamily, setFontFamily] = useState<string>(() => {
    try {
      return localStorage.getItem('soqoor_font_family') || localStorage.getItem('soqoor_font') || 'Cairo';
    } catch {
      return 'Cairo';
    }
  });
  const [chatFontWeight, setChatFontWeight] = useState<'thin' | 'normal' | 'default' | 'bold' | 'black'>(() => {
    try {
      const saved = localStorage.getItem('soqoor_chat_font_weight');
      if (saved === 'thin' || saved === 'normal' || saved === 'default' || saved === 'bold' || saved === 'black') {
        return saved;
      }
    } catch {}
    return 'default';
  });
  useEffect(() => {
    if (chatFontWeight && chatFontWeight !== 'default') {
      document.documentElement.setAttribute('data-chat-font-weight', chatFontWeight);
    } else {
      document.documentElement.removeAttribute('data-chat-font-weight');
    }
  }, [chatFontWeight]);
  const [bubbleStyle, setBubbleStyle] = useState<string>(() => {
    try {
      return localStorage.getItem('soqoor_bubble_style') || 'modern';
    } catch {
      return 'modern';
    }
  });
  const [customThemes, setCustomThemes] = useState<CustomThemePreset[]>(() => {
    try {
      const saved = localStorage.getItem('soqoor_custom_themes');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const activeCustomTheme = useMemo(
    () => customThemes.find((ct) => ct.id === activeTheme) || null,
    [customThemes, activeTheme]
  );
  const curTheme = useMemo(() => {
    const base = activeCustomTheme
      ? buildThemeFullStyleFromCustom(activeCustomTheme.colors)
      : THEME_STYLES[activeTheme] || THEME_STYLES['pearl-gray-calm'];
    return isNightMode ? buildNightModeTheme(base) : base;
  }, [activeCustomTheme, activeTheme, isNightMode]);

  useEffect(() => {
    const root = document.documentElement.style;
    const customVars = [
      '--ct-app-bg', '--ct-app-text', '--ct-chat-bg', '--ct-header-bg',
      '--ct-header-text', '--ct-header-border', '--ct-subheader-bg',
      '--ct-subheader-text', '--ct-bottom-bg', '--ct-bottom-text',
      '--ct-input-bg', '--ct-field-bg', '--ct-field-text', '--ct-field-border',
      '--ct-bubble-bg', '--ct-bubble-border', '--ct-accent-text',
      '--ct-btn-bg', '--ct-btn-text', '--ct-drawer-bg',
      '--ct-card-bg', '--ct-card-border'
    ];
    if (!activeCustomTheme) {
      customVars.forEach((v) => root.removeProperty(v));
      return;
    }
    const c = activeCustomTheme.colors;
    root.setProperty('--ct-app-bg', c.appBg);
    root.setProperty('--ct-app-text', c.appText);
    root.setProperty('--ct-chat-bg', c.chatBg);
    root.setProperty('--ct-header-bg', c.headerBg);
    root.setProperty('--ct-header-text', c.headerText);
    root.setProperty('--ct-header-border', c.headerBorder);
    root.setProperty('--ct-subheader-bg', c.subHeaderBg);
    root.setProperty('--ct-subheader-text', c.subHeaderText);
    root.setProperty('--ct-bottom-bg', c.bottomBarBg);
    root.setProperty('--ct-bottom-text', c.bottomBarText);
    root.setProperty('--ct-input-bg', c.inputBarBg);
    root.setProperty('--ct-field-bg', c.fieldBg);
    root.setProperty('--ct-field-text', c.fieldText);
    root.setProperty('--ct-field-border', c.fieldBorder);
    root.setProperty('--ct-bubble-bg', c.bubbleBg);
    root.setProperty('--ct-bubble-border', c.bubbleBorder);
    root.setProperty('--ct-accent-text', c.accentText);
    root.setProperty('--ct-btn-bg', c.primaryBtnBg);
    root.setProperty('--ct-btn-text', c.primaryBtnText);
    root.setProperty('--ct-drawer-bg', c.drawerBg);
    root.setProperty('--ct-card-bg', c.cardBg);
    root.setProperty('--ct-card-border', c.cardBorder);
  }, [activeCustomTheme]);
  const [nameGradient, setNameGradient] = useState<string>(() => {
    try {
      return localStorage.getItem('soqoor_name_gradient') || 'from-amber-400 to-yellow-200';
    } catch {
      return 'from-amber-400 to-yellow-200';
    }
  });
  const [isPoetryMode, setIsPoetryMode] = useState<boolean>(false);
  const [chatSearchQuery, setChatSearchQuery] = useState<string>('');

  // Memoized current room messages with performance windowing (prevents sluggish typing & input lag)
  const displayRoomMessages = useMemo(() => {
    const currentRoom = currentUser?.room ? currentUser.room.trim().toLowerCase() : null;
    const searchQ = chatSearchQuery.trim().toLowerCase();
    const currentUsername = currentUser?.username ? currentUser.username.toLowerCase() : null;

    const filtered = messages.filter((msg) => {
      if (!msg) return false;
      if (ignoredUsersSet.has(msg.username.toLowerCase().trim())) return false;
      if (currentRoom && msg.room && msg.room.trim().toLowerCase() !== currentRoom) {
        return false;
      }
      if (filterOnlyMentions && currentUsername) {
        const textLower = msg.text ? msg.text.toLowerCase() : '';
        if (!textLower.includes(`@${currentUsername}`)) return false;
      }
      if (searchQ) {
        const textMatch = msg.text && msg.text.toLowerCase().includes(searchQ);
        const userMatch = msg.username.toLowerCase().includes(searchQ);
        if (!textMatch && !userMatch) return false;
      }
      return true;
    });

    const roomLimit = Math.max(10, messageRetentionLimits.roomMaxMessages || 200);
    return filtered.length > roomLimit ? filtered.slice(filtered.length - roomLimit) : filtered;
  }, [messages, currentUser?.room, currentUser?.username, chatSearchQuery, filterOnlyMentions, ignoredUsersSet, messageRetentionLimits.roomMaxMessages]);
  const [pinnedChatMessage, setPinnedChatMessage] = useState<{ id: string; username: string; text: string } | null>(null);
  const [particlesEnabled, setParticlesEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('soqoor_particles') !== 'false';
    } catch {
      return true;
    }
  });
  const [soundVolume, setSoundVolume] = useState<number>(() => {
    try {
      const v = localStorage.getItem('soqoor_sound_volume');
      return v ? parseInt(v, 10) : 80;
    } catch {
      return 80;
    }
  });

  // Dynamic Role Permissions State (الصلاحيات المخصصة لكل رتبة)
  const [rolePermissions, setRolePermissions] = useState<Record<string, any>>(() => {
    try {
      const saved = localStorage.getItem('soqoor_role_permissions');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Dynamic Permission Evaluator for any user and permission key
  const hasUserPermission = useCallback(
    (user: User | null | undefined, permKey: string): boolean => {
      if (!user) return false;
      const cleanRole = (user.role || '').trim().toLowerCase();
      if (cleanRole === 'hassan' || cleanRole === 'admin') return true;

      const perms = rolePermissions?.[cleanRole] || rolePermissions?.[user.role];
      if (perms) {
        if (perms[permKey] !== undefined) return Boolean(perms[permKey]);
        // Handle aliases
        if ((permKey === 'canDeleteMessage' || permKey === 'canDeleteMessages') && (perms.canDeleteMessage !== undefined || perms.canDeleteMessages !== undefined)) {
          return Boolean(perms.canDeleteMessage ?? perms.canDeleteMessages);
        }
        if ((permKey === 'canMute' || permKey === 'canMuteText') && (perms.canMute !== undefined || perms.canMuteText !== undefined)) {
          return Boolean(perms.canMute ?? perms.canMuteText);
        }
        if ((permKey === 'canEditMemberProfile' || permKey === 'canEditMemberData') && (perms.canEditMemberProfile !== undefined || perms.canEditMemberData !== undefined)) {
          return Boolean(perms.canEditMemberProfile ?? perms.canEditMemberData);
        }
        if ((permKey === 'canManagePermissions' || permKey === 'canManageRoles') && (perms.canManagePermissions !== undefined || perms.canManageRoles !== undefined)) {
          return Boolean(perms.canManagePermissions ?? perms.canManageRoles);
        }
        if ((permKey === 'canDeleteAccounts' || permKey === 'canDeleteAccount') && (perms.canDeleteAccounts !== undefined || perms.canDeleteAccount !== undefined)) {
          return Boolean(perms.canDeleteAccounts ?? perms.canDeleteAccount);
        }
        if ((permKey === 'canUnjail' || permKey === 'canJail') && (perms.canUnjail !== undefined || perms.canJail !== undefined)) {
          return Boolean(perms.canUnjail ?? perms.canJail);
        }
        if ((permKey === 'canUnban' || permKey === 'canBan') && (perms.canUnban !== undefined || perms.canBan !== undefined)) {
          return Boolean(perms.canUnban ?? perms.canBan);
        }
        if ((permKey === 'canLockVoice' || permKey === 'canMuteVoice') && (perms.canLockVoice !== undefined || perms.canMuteVoice !== undefined)) {
          return Boolean(perms.canLockVoice ?? perms.canMuteVoice);
        }
        if ((permKey === 'canChangeRoomSettings' || permKey === 'canLockRoom') && (perms.canChangeRoomSettings !== undefined || perms.canLockRoom !== undefined)) {
          return Boolean(perms.canChangeRoomSettings ?? perms.canLockRoom);
        }
      }

      // Default fallbacks for system super role if not explicitly set in matrix
      if (cleanRole === 'super') {
        const superDefaults: Record<string, boolean> = {
          canFilter: true,
          canDeleteMessage: true,
          canDeleteMessages: true,
          canMute: true,
          canMuteText: true,
          canMuteVoice: true,
          canPullMic: true,
          canKick: true,
          canWarn: true,
          canDeleteAvatar: true,
          canRevealNicks: true,
          canAccessControlPanel: true,
          canManageShortcuts: true,
          canLockRoom: true,
          canLockVoice: true,
          canSetSlowMode: true,
          canBroadcast: true,
          canDeleteWallPost: true,
          canPrivateChat: true,
          canAssignBanner: true,
          canAssignBadge: true,
          canMoveUsers: true,
          canUnban: true,
          canBan: true,
          canJail: true,
          canUnjail: true
        };
        if (superDefaults[permKey] !== undefined) return superDefaults[permKey];
      }

      // Default fallbacks for member role
      if (cleanRole === 'member') {
        const memberDefaults: Record<string, boolean> = {
          canSendText: true,
          canSendMedia: true,
          canSendVoiceNotes: true,
          canTakeMic: true,
          canPostWall: true,
          canPrivateChat: true,
          canPrivateCall: true
        };
        if (memberDefaults[permKey] !== undefined) return memberDefaults[permKey];
      }

      return false;
    },
    [rolePermissions]
  );

  const userCanFilter = Boolean(hasUserPermission(currentUser, 'canFilter'));
  const userCanDeleteMessage = Boolean(hasUserPermission(currentUser, 'canDeleteMessage'));

  // Starred Messages (الرسائل المحفوظة في المفضلة)
  const [starredMessages, setStarredMessages] = useState<Array<{ id: string; username: string; text: string; time: string }>>(() => {
    try {
      const saved = localStorage.getItem('soqoor_starred_messages');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleStarMessage = (msg: { id: string; username: string; text: string; time: string }) => {
    setStarredMessages((prev) => {
      const exists = prev.some((m) => m.id === msg.id);
      const next = exists ? prev.filter((m) => m.id !== msg.id) : [msg, ...prev];
      try {
        localStorage.setItem('soqoor_starred_messages', JSON.stringify(next));
      } catch {}
      socket?.emit('updateStarredMessages', { starredMessages: next });
      showToast(exists ? 'تمت إزالة الرسالة من المفضلة ✕' : 'تم حفظ الرسالة في المفضلة سحابياً ⭐', 'info');
      return next;
    });
  };

  const isMessageStarred = (msgId: string) => {
    return starredMessages.some((m) => m.id === msgId);
  };

  // Text-To-Speech (نطق الرسائل صوتياً)
  const speakMessage = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ar-SA';
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
      showToast('🔊 جاري نطق الرسالة...', 'info');
    } else {
      showToast('خاصية نطق الصوت غير مدعومة في متصفحك', 'error');
    }
  };

  // Local Chat Clear
  const handleClearLocalChat = () => {
    setMessages([]);
    showToast('تم مسح شاشة الدردشة محلياً 🧹', 'info');
  };

  // Export Chat to Text File
  const handleExportChat = () => {
    if (messages.length === 0) {
      showToast('لا توجد رسائل لتصديرها حالياً', 'info');
      return;
    }
    const lines = messages.map(
      (m) => `[${m.time}] ${m.username}: ${m.text || ''}`
    );
    const roomName = currentUser ? currentUser.room : 'الغرفة العامة';
    const content = `سجل محادثات حسان برو - ${new Date().toLocaleDateString('ar-EG')}\nالغرفة: ${roomName}\n==============================\n\n` + lines.join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hassanpro-chat-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('تم تصدير سجل الشات بنجاح 📄', 'success');
  };

  const toggleIgnoreUser = (username: string) => {
    if (!username || !currentUser) return;
    if (username.toLowerCase() === currentUser.username.toLowerCase()) {
      showToast('لا يمكنك تجاهل نفسك!', 'error');
      return;
    }
    const target = username.toLowerCase().trim();
    setIgnoredUsers((prev) => {
      const exists = prev.includes(target);
      const next = exists ? prev.filter((u) => u !== target) : [...prev, target];
      try {
        localStorage.setItem('soqoor_ignored_users', JSON.stringify(next));
      } catch {}
      socket?.emit('updateIgnoredUsers', { ignoredUsers: next });
      if (exists) {
        showToast(`تم إلغاء تجاهل [${username}] بنجاح ✔️`, 'info');
      } else {
        showToast(`تم تجاهل [${username}] بنجاح 🚫 لن تظهر رسائله لك بعد الآن.`, 'success');
      }
      return next;
    });
  };

  // Selected Profile for Viewing / Moderation (Screenshots 10 & 11)
  const [profileTargetUser, setProfileTargetUser] = useState<User | null>(null);
  const profileTargetUserRef = useRef<User | null>(profileTargetUser);
  useEffect(() => {
    profileTargetUserRef.current = profileTargetUser;
  }, [profileTargetUser]);
  const [profileEditName, setProfileEditName] = useState('');
  const [profileEditLikes, setProfileEditLikes] = useState('');
  const [profileEditQuote, setProfileEditQuote] = useState('');
  const [profileEditPoints, setProfileEditPoints] = useState('');
  const [profileEditRole, setProfileEditRole] = useState<string>('member');
  const [profileMoveRoom, setProfileMoveRoom] = useState('الغرفة العامة');

  // Settings State (Screenshots 5 & 6)
  const [settingName, setSettingName] = useState('');
  const [settingQuote, setSettingQuote] = useState('');
  const [settingAvatar, setSettingAvatar] = useState('');
  const [settingPassword, setSettingPassword] = useState('');
  const [settingNameColor, setSettingNameColor] = useState<string>(() => {
    try {
      return localStorage.getItem('soqoor_name_color') || '#000000';
    } catch {
      return '#000000';
    }
  });
  const [settingTextColor, setSettingTextColor] = useState<string>(() => {
    try {
      return localStorage.getItem('soqoor_text_color') || '#000000';
    } catch {
      return '#000000';
    }
  });
  const [isChatInputFocused, setIsChatInputFocused] = useState<boolean>(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [monitorLogs, setMonitorLogs] = useState<MonitorEvent[]>([]);

  // WebRTC Audio Mesh
  const [audioManager, setAudioManager] = useState<AudioMeshManager | null>(null);
  const audioManagerRef = useRef<AudioMeshManager | null>(null);
  const [micVolume, setMicVolume] = useState(0);

  // Control Panel Tabs & Filter State
  const [controlPanelTab, setControlPanelTab] = useState<'moderation' | 'roomControls' | 'bans' | 'broadcast' | 'stats' | 'words' | 'matrix' | 'logs'>('moderation');
  const [roomStatsData, setRoomStatsData] = useState<RoomStatData[]>([]);
  const [bannedList, setBannedList] = useState<Array<{ username: string; ip?: string; reason: string; bannedBy: string; timestamp: number }>>([]);
  const [roomSettings, setRoomSettings] = useState<{ isChatLocked: boolean; slowModeSeconds: number; isVoiceLocked: boolean; showDeletedNotice?: boolean }>({
    isChatLocked: false,
    slowModeSeconds: 0,
    isVoiceLocked: false,
    showDeletedNotice: false
  });
  const [serverSecurity, setServerSecurity] = useState<ServerSecuritySettings>({
    emergencyLockdown: false,
    guestsAllowed: true,
    blockExternalLinks: true,
    floodControlRate: 3,
    marqueeTicker: '🦅 مرحباً بكم في شات حسان برو | شات العرب الصوتي والكتابي الأرقى | أهلاً وسهلاً بجميع الإخوة والأخوات 🌹',
    autoIpBanEnabled: true,
    autoIpBanThreshold: 3,
    autoIpBanWindowMinutes: 10,
    autoIpBanDurationMinutes: 60,
    geoRestrictionEnabled: false,
    geoRestrictionMode: 'blacklist',
    geoRestrictedCountries: [],
    geoBlockedCustomMessage: '🚫 نعتذر، الدخول غير متاح حالياً من منطقتك الجغرافية وفقاً لسياسة الأمان المتبعة في الدردشة.'
  });
  const [staffMemos, setStaffMemos] = useState<Array<{
    id: string;
    author: string;
    role: string;
    text: string;
    priority: 'low' | 'normal' | 'urgent';
    timestamp: number;
    timeFormatted: string;
  }>>([]);
  const [activeAdminSiren, setActiveAdminSiren] = useState<{ from: string; message: string; timestamp: number } | null>(null);
  const [receivedOfficialWarning, setReceivedOfficialWarning] = useState<{ from: string; text: string } | null>(null);
  const [criticalBroadcast, setCriticalBroadcast] = useState<{ id: string; title: string; text: string; sender: string; senderRole: string; time: string } | null>(null);
  const [broadcastTitleInput, setBroadcastTitleInput] = useState('تنبيه ملكي عاجل من إدارة حسان برو 🦅');
  const [passwordPromptRoom, setPasswordPromptRoom] = useState<ChatRoom | null>(null);
  const [roomPasswordInput, setRoomPasswordInput] = useState('');
  const [showRoomPasswordText, setShowRoomPasswordText] = useState(false);
  const [roomPasswordError, setRoomPasswordError] = useState<string | null>(null);
  const [controlRoleFilter, setControlRoleFilter] = useState<'all' | 'admin' | 'super' | 'member' | 'guest'>('all');
  const [controlSearchQuery, setControlSearchQuery] = useState('');
  const [logTypeFilter, setLogTypeFilter] = useState<'all' | 'kick_ban' | 'mute' | 'mic' | 'role'>('all');

  // Dynamic Role Hierarchy & Permissions
  const getRoleLevel = useCallback((roleId?: string): number => {
    if (!roleId) return 0;
    const clean = roleId.trim().toLowerCase();
    const found = rolesConfig.find((r) => r.id.toLowerCase() === clean);
    if (found) return found.level;
    if (clean === 'hassan') return 100000;
    if (clean === 'admin') return 100;
    if (clean === 'super') return 75;
    if (clean === 'member') return 50;
    if (clean === 'guest') return 10;
    return 10;
  }, [rolesConfig]);

  const userCanManageRoomSettings = Boolean(
    currentUser && (
      currentUser.role === 'hassan' ||
      currentUser.role === 'admin' ||
      currentUser.role === 'super' ||
      hasUserPermission(currentUser, 'canChangeRoomSettings') ||
      hasUserPermission(currentUser, 'canAccessControlPanel') ||
      getRoleLevel(currentUser.role) >= 75
    )
  );

  // Ghost visibility rule:
  // عندما يدخل العضو بوضع "مخفي"، فإن الأعضاء الأقل منه رتبة لا يرونه نهائياً في القائمة.
  // أما الأعضاء الذين هم في نفس رتبته أو أعلى منها فيرونه، وتكون النقطة التي على صورته زرقاء بدلاً من الخضراء.
  const canViewerSeeUser = useCallback((targetUser?: { username: string; role?: string; isGhost?: boolean } | null): boolean => {
    if (!targetUser) return false;
    if (!targetUser.isGhost) return true;
    if (currentUser && targetUser.username.trim().toLowerCase() === currentUser.username.trim().toLowerCase()) return true;
    const viewerLevel = currentUser ? getRoleLevel(currentUser.role) : 0;
    const targetGhostLevel = getRoleLevel(targetUser.role);
    return viewerLevel >= targetGhostLevel;
  }, [currentUser, getRoleLevel]);

  const ROLE_HIERARCHY = useMemo<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const r of rolesConfig) {
      map[r.id] = r.level;
    }
    if (!map.hassan) map.hassan = 100000;
    if (!map.admin) map.admin = 100;
    if (!map.super) map.super = 75;
    if (!map.member) map.member = 50;
    if (!map.guest) map.guest = 10;
    return map;
  }, [rolesConfig]);

  const getRoleBadge = (role: string) => {
    const clean = (role || '').trim().toLowerCase();
    const customRole = rolesConfig.find((r) => r.id.toLowerCase() === clean);
    if (customRole && !['admin', 'super', 'member', 'guest'].includes(customRole.id)) {
      return {
        title: `${customRole.name} (#${customRole.level})`,
        short: customRole.name,
        badgeClass: customRole.badgeColor || 'bg-amber-600 text-white',
        borderClass: 'border-amber-500',
        textClass: 'text-amber-400',
        description: `رتبة مخصصة بالمستوى #${customRole.level}`
      };
    }

    switch (clean) {
      case 'admin':
        return {
          title: customRole?.name || '👑 مدير النظام (Admin)',
          short: customRole?.name || 'مدير النظام',
          badgeClass: customRole?.badgeColor || 'bg-red-600 text-white',
          borderClass: 'border-red-600',
          textClass: 'text-red-600',
          description: 'كامل الصلاحيات (حذف صور، طرد، باند، إسكات، تعديل بيانات، وترقيات)'
        };
      case 'super':
        return {
          title: customRole?.name || '🛡️ سوبر إداري (Super)',
          short: customRole?.name || 'مشرف سوبر',
          badgeClass: customRole?.badgeColor || 'bg-amber-600 text-white',
          borderClass: 'border-amber-600',
          textClass: 'text-amber-600',
          description: 'صلاحيات إشرافية (حذف صور المخالفين، طرد، وإسكات الأعضاء والزوار)'
        };
      case 'member':
        return {
          title: customRole?.name || '🎖️ عضو معتمد (Member)',
          short: customRole?.name || 'عضو مسجل',
          badgeClass: customRole?.badgeColor || 'bg-indigo-600 text-white',
          borderClass: 'border-indigo-600',
          textClass: 'text-indigo-600',
          description: 'عضوية معتمدة وميزات تفاعلية واجتماعية'
        };
      default:
        return {
          title: customRole?.name || '👤 زائر (Guest)',
          short: customRole?.name || 'زائر',
          badgeClass: customRole?.badgeColor || 'bg-slate-600 text-white',
          borderClass: 'border-slate-400',
          textClass: 'text-slate-600',
          description: 'زائر عادي بدون صلاحيات إدارية'
        };
    }
  };

  const canActorModerate = (actor: User | null, target: User | null, action: string): { allowed: boolean; reason?: string } => {
    if (!actor) return { allowed: false, reason: 'يجب تسجيل الدخول أولاً' };
    const actorLevel = getRoleLevel(actor.role);

    if (target) {
      if (target.id === actor.id && ['kick', 'ban', 'mute', 'deleteAvatar', 'jailUser'].includes(action)) {
        return { allowed: false, reason: 'لا يمكنك تطبيق هذا الإجراء على نفسك.' };
      }
      if (target.username.toLowerCase() === actor.username.toLowerCase() && ['kick', 'ban', 'jailUser'].includes(action)) {
        return { allowed: false, reason: 'لا يمكنك تطبيق هذا الإجراء على حسابك الشخصي.' };
      }

      const targetLevel = getRoleLevel(target.role);

      // Strict Hierarchy rule: الأعلى رقماً يتحكم في كل من تحته حتى لو كان admin (مستثنى لرتبة hassan)
      if (actor.role !== 'hassan' && targetLevel >= actorLevel) {
        return {
          allowed: false,
          reason: `لا تملك صلاحية التحكم برتبة مساوية أو أعلى منك (رقم رتبتك: ${actorLevel} ورقم رتبة المستهدف: ${targetLevel}). التحكم متاح فقط لمن هم أقل منك رقماً.`
        };
      }
    }

    if (actor.role === 'hassan' || actor.role === 'admin' || actorLevel >= getRoleLevel('admin')) {
      return { allowed: true };
    }

    // Granular permission check
    const permMap: Record<string, string> = {
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
      resetName: 'canEditMemberProfile',
      updateLikes: 'canEditLikes',
      updatePoints: 'canEditPoints',
      updateRole: 'canChangeRoles',
      updatePassword: 'canChangeMemberPassword',
      moveRoom: 'canMoveUsers',
      pullAllUsers: 'canMoveUsers',
      deleteAccount: 'canDeleteAccounts',
      revealNicks: 'canRevealNicks',
      lockRoomChat: 'canLockRoom',
      setSlowMode: 'canSetSlowMode',
      lockRoomVoice: 'canLockVoice',
      setRoomPassword: 'canChangeRoomSettings',
      editRoom: 'canChangeRoomSettings',
      deleteRoom: 'canChangeRoomSettings',
      globalClearChat: 'canClearRoomChat',
      globalBroadcast: 'canBroadcast',
      adminSiren: 'canBroadcast'
    };

    const requiredPerm = permMap[action];
    if (requiredPerm) {
      if (!hasUserPermission(actor, requiredPerm)) {
        return { allowed: false, reason: `عفواً، رتبتك لا تملك الصلاحية المطلوبة (${requiredPerm}) لتنفيذ هذا الإجراء.` };
      }
    } else if (actorLevel < 50 && !hasUserPermission(actor, 'canKick') && !hasUserPermission(actor, 'canMute')) {
      return { allowed: false, reason: 'هذه الميزة مخصصة للإدارة أو الرتب الممنوحة صلاحيات.' };
    }

    return { allowed: true };
  };

  // Toast / System Alerts
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const pmMessagesEndRef = useRef<HTMLDivElement>(null);
  const pmChatContainerRef = useRef<HTMLDivElement>(null);
  const wallEndRef = useRef<HTMLDivElement>(null);
  const storyFileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);

  // visualViewport API for mobile virtual keyboard alignment & smooth chat scrolling
  const [viewportHeight, setViewportHeight] = useState<number>(() => {
    if (typeof window !== 'undefined' && window.visualViewport) {
      return Math.round(window.visualViewport.height);
    }
    return typeof window !== 'undefined' ? window.innerHeight : 800;
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  // 1. Unified Starting Method for Floating Video / YouTube with Native MediaSession & Call Interruption Support
  const handlePlayFloatingMedia = useCallback(() => {
    isFloatingManualPauseRef.current = false;
    const currentFloating = floatingVideoStateRef.current;
    if (currentFloating?.type === 'youtube') {
      ensureBackgroundStreamForYouTube();
      if (youtubeIframeRef.current) {
        youtubeIframeRef.current.contentWindow?.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
      }
    } else {
      if (floatingAudioRef.current) {
        floatingAudioRef.current.play().catch(() => {});
      }
      if (floatingVideoRef.current) {
        floatingVideoRef.current.play().catch(() => {});
      }
    }
    setIsFloatingVideoPlaying(true);
    if (currentFloating) {
      const mediaId = `floating-${currentFloating.postId || currentFloating.youtubeId || 'video'}`;
      mediaSessionManager.updateMediaState(mediaId, { isPlaying: true });
    }
  }, []);

  const handlePauseFloatingMedia = useCallback((isInterruption = false) => {
    isFloatingManualPauseRef.current = true;
    const currentFloating = floatingVideoStateRef.current;
    if (floatingAudioRef.current) {
      floatingAudioRef.current.pause();
    }
    if (floatingVideoRef.current) {
      floatingVideoRef.current.pause();
    }
    if (currentFloating?.type === 'youtube' && youtubeIframeRef.current) {
      youtubeIframeRef.current.contentWindow?.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
    }
    setIsFloatingVideoPlaying(false);
    if (currentFloating && !isInterruption) {
      const mediaId = `floating-${currentFloating.postId || currentFloating.youtubeId || 'video'}`;
      mediaSessionManager.updateMediaState(mediaId, { isPlaying: false });
    }
  }, []);

  // Native Picture-in-Picture for Videos (صورة داخل صورة فوق كل التطبيقات)
  const handleTogglePiP = useCallback(async () => {
    try {
      if (typeof document !== 'undefined' && 'pictureInPictureElement' in document && document.pictureInPictureElement) {
        await (document as any).exitPictureInPicture();
      } else if (floatingVideoRef.current && typeof document !== 'undefined' && 'pictureInPictureEnabled' in document && (document as any).pictureInPictureEnabled) {
        await (floatingVideoRef.current as any).requestPictureInPicture();
        showToast('تم تفعيل وضع صورة داخل صورة (PiP) يعمل فوق جميع التطبيقات! 🪟', 'info');
      }
    } catch (err) {
      console.warn('PiP error', err);
    }
  }, []);

  const handleStopFloatingVideo = useCallback(() => {
    const currentFloating = floatingVideoStateRef.current;
    isFloatingManualPauseRef.current = true;
    if (floatingAudioRef.current) {
      floatingAudioRef.current.pause();
      floatingAudioRef.current.src = '';
    }
    if (floatingVideoRef.current) {
      floatingVideoRef.current.pause();
      floatingVideoRef.current.src = '';
    }
    if (youtubeIframeRef.current) {
      youtubeIframeRef.current.contentWindow?.postMessage('{"event":"command","func":"stopVideo","args":""}', '*');
    }
    if (currentFloating) {
      const mediaId = `floating-${currentFloating.postId || currentFloating.youtubeId || 'video'}`;
      mediaSessionManager.deactivateMedia(mediaId);
    }
    setFloatingVideo(null);
    setPlayingYouTubePostId(null);
    setIsFloatingVideoPlaying(false);
    if (keepAlivePlayerEnabled) {
      startSilentAudioKeepAlive({
        title: `شات حسان برو | ${currentUserRef.current?.room || 'الغرفة العامة'} 💬`,
        artist: `${currentUserRef.current?.username || 'عضو'} • متصل ونشط 🟢`
      });
    }
    showToast('تم إيقاف تشغيل المقطع يدوياً ⏹️', 'info');
  }, [keepAlivePlayerEnabled]);

  const handleStartFloatingVideo = useCallback((videoData: {
    url: string;
    title: string;
    type?: 'video' | 'youtube';
    youtubeId?: string;
    author?: string;
    postId?: string;
    currentTime?: number;
  }) => {
    isFloatingManualPauseRef.current = false;
    const isVid = (videoData.type || 'video') === 'video';
    const mediaId = `floating-${videoData.postId || videoData.youtubeId || 'video'}`;

    if (isVid && floatingAudioRef.current) {
      try {
        floatingAudioRef.current.src = videoData.url;
        if (videoData.currentTime && videoData.currentTime > 0) {
          floatingAudioRef.current.currentTime = videoData.currentTime;
        }
        floatingAudioRef.current.muted = false;
        const playPromise = floatingAudioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn('Audio play error', err);
          });
        }
      } catch (err) {
        console.warn('Sync audio load error', err);
      }
    } else if (!isVid) {
      // Keep hidden silent MediaStream alive underneath cross-origin YouTube iframe so OS doesn't freeze background socket
      ensureBackgroundStreamForYouTube();
    }

    const nextFloating = {
      url: videoData.url,
      title: videoData.title,
      type: videoData.type || 'video',
      author: videoData.author,
      postId: videoData.postId,
      youtubeId: videoData.youtubeId,
      currentTime: videoData.currentTime || 0
    };
    floatingVideoStateRef.current = nextFloating;
    setFloatingVideo(nextFloating);
    setIsFloatingVideoPlaying(true);
    setIsFloatingVideoMinimized(false);
    setIsFloatingVideoMuted(false);

    requestScreenWakeLock().catch(() => {});

    const artwork = videoData.youtubeId ? getYouTubeThumbnailUrl(videoData.youtubeId) : '/favicon.svg';
    mediaSessionManager.activateMedia({
      id: mediaId,
      kind: isVid ? 'wall-video' : 'wall-youtube',
      title: videoData.title || 'فيديو الحائط المستمر',
      artist: videoData.author ? `@${videoData.author} • شات حسان برو` : 'حائط شات حسان برو',
      album: 'وسائط الحائط والدردشة',
      artworkUrl: artwork,
      currentTime: videoData.currentTime || 0,
      playbackRate: 1,
      isPlaying: true,
      onPlay: () => handlePlayFloatingMedia(),
      onPause: () => handlePauseFloatingMedia(false),
      onStop: () => handleStopFloatingVideo(),
      onSeekTo: (seekTime: number) => {
        if (floatingAudioRef.current) floatingAudioRef.current.currentTime = seekTime;
        if (floatingVideoRef.current) floatingVideoRef.current.currentTime = seekTime;
        mediaSessionManager.updateMediaState(mediaId, { currentTime: seekTime });
      },
      onInterruptPause: () => handlePauseFloatingMedia(true),
      onInterruptResume: () => handlePlayFloatingMedia()
    });
  }, [handlePlayFloatingMedia, handlePauseFloatingMedia, handleStopFloatingVideo]);

  // Keep visual <video> synchronized with background <audio> on foreground return without stopping Keep-Alive
  useEffect(() => {
    const handleVisibility = () => {
      const currentFloating = floatingVideoStateRef.current;
      if (!currentFloating) return;

      if (document.visibilityState === 'hidden') {
        if (currentFloating.type === 'youtube' && isFloatingVideoPlaying) {
          ensureBackgroundStreamForYouTube();
          if (youtubeIframeRef.current) {
            youtubeIframeRef.current.contentWindow?.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
          }
        }
        if (
          currentFloating.type === 'video' &&
          typeof document !== 'undefined' &&
          (document as any).pictureInPictureEnabled &&
          !(document as any).pictureInPictureElement
        ) {
          floatingVideoRef.current?.requestPictureInPicture?.().catch(() => {});
        }
      } else {
        if (currentFloating.type === 'video' && floatingAudioRef.current && floatingVideoRef.current) {
          const audioCur = floatingAudioRef.current.currentTime;
          if (Math.abs(floatingVideoRef.current.currentTime - audioCur) > 0.25) {
            floatingVideoRef.current.currentTime = audioCur;
          }
          if (isFloatingVideoPlaying) {
            if (floatingAudioRef.current.paused) floatingAudioRef.current.play().catch(() => {});
            if (floatingVideoRef.current.paused) floatingVideoRef.current.play().catch(() => {});
          }
        } else if (currentFloating.type === 'youtube' && isFloatingVideoPlaying && youtubeIframeRef.current) {
          youtubeIframeRef.current.contentWindow?.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isFloatingVideoPlaying]);

  const toggleNightMode = useCallback(() => {
    setIsNightMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('soqoor_night_mode', String(next));
      } catch {}
      if (next) {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme-mode', 'night');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.removeAttribute('data-theme-mode');
      }
      showToast(next ? 'تم تفعيل الوضع الليلي الهادئ 🌙' : 'تم تفعيل الوضع النهاري ☀️', 'info');
      return next;
    });
  }, []);

  const toggleHighContrastMode = useCallback(() => {
    setIsHighContrastMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('soqoor_high_contrast', String(next));
      } catch {}
      showToast(next ? 'تم تفعيل وضع التباين العالي (ضبط نصوص أبيض/أسود بحساب السطوع) ⚡' : 'تم العودة إلى وضع التباين الطبيعي 👁️', 'info');
      return next;
    });
  }, []);

  // Reusable Arabic relative time formatter for Room Messages, Wall, and Private Messages
  // (الآن، منذ دقيقة، منذ X دقائق، منذ ساعة، منذ 2 ساعات، منذ X ساعات، منذ يوم، إلخ)
  const formatAppRelativeTime = (timestamp?: number, fallbackTime?: string, id?: string): string => {
    let effectiveTs = timestamp;
    if (!effectiveTs && id) {
      if (id.startsWith('msg-')) {
        const parsed = Number(id.replace('msg-', ''));
        if (parsed && !isNaN(parsed)) effectiveTs = parsed;
      } else if (id.startsWith('pm-')) {
        const parts = id.split('-');
        const parsed = Number(parts[1]);
        if (parsed && !isNaN(parsed)) effectiveTs = parsed;
      } else if (id.startsWith('post-')) {
        const parsed = Number(id.replace('post-', ''));
        if (parsed && !isNaN(parsed)) effectiveTs = parsed;
      } else if (id.startsWith('cm-')) {
        const parts = id.split('-');
        const parsed = Number(parts[1]);
        if (parsed && !isNaN(parsed)) effectiveTs = parsed;
      }
    }

    if (!effectiveTs || isNaN(effectiveTs) || effectiveTs <= 0) {
      if (fallbackTime && fallbackTime !== '0د' && fallbackTime !== 'الآن') {
        return fallbackTime;
      }
      return 'الآن';
    }

    const now = Date.now();
    const diffSec = Math.max(0, Math.floor((now - effectiveTs) / 1000));

    // أقل من دقيقة
    if (diffSec < 60) {
      return 'الآن';
    }

    const diffMin = Math.floor(diffSec / 60);

    // إذا كان دقائق (أقل من ساعة)
    if (diffMin < 60) {
      if (diffMin === 1) return 'منذ دقيقة';
      if (diffMin === 2) return 'منذ دقيقتين';
      if (diffMin >= 3 && diffMin <= 10) return `منذ ${diffMin} دقائق`;
      return `منذ ${diffMin} دقيقة`;
    }

    const diffHours = Math.floor(diffMin / 60);

    // إذا كان ساعات (أقل من 24 ساعة)
    if (diffHours < 24) {
      if (diffHours === 1) return 'منذ ساعة';
      if (diffHours === 2) return 'منذ ساعتين';
      if (diffHours >= 3 && diffHours <= 10) return `منذ ${diffHours} ساعات`;
      return `منذ ${diffHours} ساعة`;
    }

    const diffDays = Math.floor(diffHours / 24);

    // إذا كان أيام
    if (diffDays === 1) return 'منذ يوم';
    if (diffDays === 2) return 'منذ يومين';
    if (diffDays <= 10) return `منذ ${diffDays} أيام`;
    if (diffDays < 30) return `منذ ${diffDays} يوماً`;

    // إذا كان شهور
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) {
      if (diffMonths === 1) return 'منذ شهر';
      if (diffMonths === 2) return 'منذ شهرين';
      if (diffMonths <= 10) return `منذ ${diffMonths} أشهر`;
      return `منذ ${diffMonths} شهراً`;
    }

    // إذا كان سنوات
    const diffYears = Math.floor(diffDays / 365);
    if (diffYears === 1) return 'منذ سنة';
    if (diffYears === 2) return 'منذ سنتين';
    return `منذ ${diffYears} سنوات`;
  };

  // Reliable helper to format room and private message time
  const formatMessageTime = (msg: { id?: string; time?: string; timestamp?: number }) => {
    return formatAppRelativeTime(msg.timestamp, msg.time, msg.id);
  };

  // Accurate time formatting for Wall posts & comments
  const formatWallTime = (timestamp?: number, fallbackTime?: string, id?: string) => {
    return formatAppRelativeTime(timestamp, fallbackTime, id);
  };

  // 100% Reliable Auto-Scroll to latest messages (Direct scrollTop without outer window jumping)
  const scrollToBottom = (instant = false) => {
    if (chatContainerRef.current) {
      const el = chatContainerRef.current;
      if (instant) {
        el.scrollTop = el.scrollHeight;
      } else {
        try {
          el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
        } catch {
          el.scrollTop = el.scrollHeight;
        }
      }
    }
  };

  const scrollPmToBottom = (instant = false) => {
    if (pmChatContainerRef.current) {
      const el = pmChatContainerRef.current;
      if (instant) {
        el.scrollTop = el.scrollHeight;
      } else {
        try {
          el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
        } catch {
          el.scrollTop = el.scrollHeight;
        }
      }
    }
  };

  const scrollWallToBottom = () => {
    wallEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleChatScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 140;
    setShowScrollBottomBtn(!isNearBottom);
  };

  // Automatically scroll down when new public room messages arrive
  useEffect(() => {
    scrollToBottom(true);
    const rId = requestAnimationFrame(() => scrollToBottom(false));
    return () => {
      cancelAnimationFrame(rId);
    };
  }, [messages]);

  useEffect(() => {
    scrollPmToBottom(true);
    const tId = setTimeout(() => scrollPmToBottom(false), 60);
    return () => clearTimeout(tId);
  }, [privateMessages]);

  useEffect(() => {
    scrollWallToBottom();
  }, [wallPosts]);

  // Handle click outside to close active message options menu
  useEffect(() => {
    if (!activeMsgMenuId) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && !target.closest('.msg-action-panel') && !target.closest('.msg-action-btn')) {
        setActiveMsgMenuId(null);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [activeMsgMenuId]);

  // Live Broadcast MediaStream attachment to local video element
  useEffect(() => {
    if (localLiveVideoRef.current && liveMediaStream) {
      localLiveVideoRef.current.srcObject = liveMediaStream;
      localLiveVideoRef.current.play().catch(() => {});
    }
  }, [liveMediaStream, isBroadcastingLive, isLiveMinimized]);

  // Handle window.visualViewport resize (when on-screen keyboard shows/hides on real mobile devices)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleViewportChange = () => {
      const vv = window.visualViewport;
      const height = vv ? Math.round(vv.height) : window.innerHeight;
      setViewportHeight(height);
      document.documentElement.style.setProperty('--app-height', `${height}px`);
      if (document.body) {
        document.body.style.setProperty('--app-height', `${height}px`);
      }

      // Always keep window scroll at (0,0) to prevent browser panning & gap below input
      window.scrollTo(0, 0);

      // Instantly scroll chat to latest messages on keyboard open/close
      scrollToBottom(true);
      setTimeout(() => scrollToBottom(true), 60);
      setTimeout(() => scrollToBottom(false), 200);
    };

    handleViewportChange();

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
      window.visualViewport.addEventListener('scroll', handleViewportChange);
    }
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('orientationchange', handleViewportChange);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange);
        window.visualViewport.removeEventListener('scroll', handleViewportChange);
      }
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('orientationchange', handleViewportChange);
    };
  }, []);

  // Mobile Back Button accidental exit interceptor (تأكيد مغادرة الشات وإغلاق النوافذ عند الضغط على زر الرجوع بالهاتف)
  useEffect(() => {
    if (!currentUser) return;

    try {
      if (!window.history.state || window.history.state.app !== 'chat') {
        window.history.pushState({ app: 'chat', screen: 'main' }, '');
      }
    } catch {}

    const handlePopState = () => {
      // 1. If the Exit Confirmation modal is open, back button simply dismisses it
      if (showExitConfirmModalRef.current) {
        setShowExitConfirmModal(false);
        try { window.history.pushState({ app: 'chat', screen: 'main' }, ''); } catch {}
        return;
      }

      // 2. If any side drawer (users, rooms, pm, wall, settings, monitor, profile) is open, close it first
      if (activeDrawerRef.current !== 'none') {
        setActiveDrawer('none');
        try { window.history.pushState({ app: 'chat', screen: 'main' }, ''); } catch {}
        return;
      }

      // 3. If member profile modal is open, close it
      if (profileTargetUserRef.current) {
        setProfileTargetUser(null);
        try { window.history.pushState({ app: 'chat', screen: 'main' }, ''); } catch {}
        return;
      }

      // 4. If story viewer is open, close it
      if (activeStoryViewerRef.current) {
        setActiveStoryViewer(null);
        try { window.history.pushState({ app: 'chat', screen: 'main' }, ''); } catch {}
        return;
      }

      // 5. User is at chat root: prevent accidental exit from the chat, maintain state, and ask confirmation!
      try { window.history.pushState({ app: 'chat', screen: 'main' }, ''); } catch {}
      setShowExitConfirmModal(true);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [currentUser]);

  // Browser/Tab close and reload protection (إشعار تأكيد المغادرة عند تحديث الصفحة أو إغلاق المتصفح)
  useEffect(() => {
    if (!currentUser) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'هل تريد مغادرة الشات؟';
      return 'هل تريد مغادرة الشات؟';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentUser]);

  // Detect Real Country Flag automatically based on IP geo / timezone
  useEffect(() => {
    let isCancelled = false;
    const detectRealFlag = async () => {
      // Clear any manual flag override so flag is strictly authoritative from real IP
      try {
        localStorage.removeItem('soqoor_user_flag');
      } catch {}

      // 1. Direct browser IP Geolocation (originates from user's actual phone / connection in Yemen)
      try {
        const geoRes = await fetch('https://api.country.is/');
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          if (!isCancelled && geoData.country && geoData.country.length === 2) {
            const codePoints = geoData.country
              .toUpperCase()
              .split('')
              .map((c: string) => 127397 + c.charCodeAt(0));
            const flagEmoji = String.fromCodePoint(...codePoints);
            if (flagEmoji) {
              setDetectedFlag(flagEmoji);
              return;
            }
          }
        }
      } catch {}

      // 3. Fallback client IP Geolocation
      try {
        const ipRes = await fetch('https://freeipapi.com/api/json');
        if (ipRes.ok) {
          const ipData = await ipRes.json();
          if (!isCancelled && ipData.countryCode && ipData.countryCode.length === 2) {
            const codePoints = ipData.countryCode
              .toUpperCase()
              .split('')
              .map((c: string) => 127397 + c.charCodeAt(0));
            const flagEmoji = String.fromCodePoint(...codePoints);
            if (flagEmoji) {
              setDetectedFlag(flagEmoji);
              return;
            }
          }
        }
      } catch {}

      // 4. Server cloud headers if available
      try {
        const res = await fetch('/api/geo-flag');
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled && data.flag) {
            setDetectedFlag(data.flag);
            return;
          }
        }
      } catch {}

      // 5. Browser Locale and Timezone signals
      try {
        const tz = (Intl.DateTimeFormat().resolvedOptions().timeZone || '').toLowerCase();
        const langs = (navigator.languages || [navigator.language]).map((l) => (l || '').toLowerCase());
        const isYemenLocale = langs.some((l) => l.includes('-ye') || l.includes('_ye'));

        if (isYemenLocale || tz.includes('aden') || tz.includes('sanaa') || tz.includes('yemen')) setDetectedFlag('🇾🇪');
        else if (tz.includes('riyadh')) setDetectedFlag('🇸🇦');
        else if (tz.includes('cairo') || tz.includes('egypt')) setDetectedFlag('🇪🇬');
        else if (tz.includes('baghdad') || tz.includes('iraq')) setDetectedFlag('🇮🇶');
        else if (tz.includes('damascus') || tz.includes('syria')) setDetectedFlag('🇸🇾');
        else if (tz.includes('algiers') || tz.includes('algeria')) setDetectedFlag('🇩🇿');
        else if (tz.includes('casablanca') || tz.includes('morocco')) setDetectedFlag('🇲🇦');
        else if (tz.includes('amman') || tz.includes('jordan')) setDetectedFlag('🇯🇴');
        else if (tz.includes('kuwait')) setDetectedFlag('🇰🇼');
        else if (tz.includes('dubai') || tz.includes('uae')) setDetectedFlag('🇦🇪');
        else if (tz.includes('qatar')) setDetectedFlag('🇶🇦');
        else if (tz.includes('bahrain')) setDetectedFlag('🇧🇭');
        else if (tz.includes('muscat') || tz.includes('oman')) setDetectedFlag('🇴🇲');
        else if (tz.includes('tunis') || tz.includes('tunisia')) setDetectedFlag('🇹🇳');
        else if (tz.includes('tripoli') || tz.includes('libya')) setDetectedFlag('🇱🇾');
        else if (tz.includes('khartoum') || tz.includes('sudan')) setDetectedFlag('🇸🇩');
        else if (tz.includes('beirut') || tz.includes('lebanon')) setDetectedFlag('🇱🇧');
        else if (tz.includes('gaza') || tz.includes('jerusalem') || tz.includes('hebron')) setDetectedFlag('🇵🇸');
        else setDetectedFlag('🇾🇪');
      } catch {
        setDetectedFlag('🇾🇪');
      }
    };
    detectRealFlag();
    return () => {
      isCancelled = true;
    };
  }, []);

  // Load persisted user profile edits from localStorage (حفظ واستعادة التعديلات على الملف الشخصي)
  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem('falcon_saved_profile');
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        if (parsed.statusQuote) setSettingQuote(parsed.statusQuote);
        if (parsed.avatarUrl) setSettingAvatar(parsed.avatarUrl);
      }
    } catch {}
  }, []);

  // Web Notifications Service Worker setup & incoming click dispatcher
  useEffect(() => {
    if (!isNotificationSupported()) return;
    registerNotificationServiceWorker().catch(() => {});
    setNotificationPermission(getNotificationPermission());

    const unsubscribe = listenToNotificationClicks((data) => {
      if (data.type === 'pm' && data.fromUsername) {
        const partner =
          rosterUsersRef.current.find((u) => u.username.toLowerCase() === data.fromUsername?.toLowerCase()) ||
          allConnectedUsersRef.current.find((u) => u.username.toLowerCase() === data.fromUsername?.toLowerCase()) || {
            id: `notif-${data.fromUsername}`,
            username: data.fromUsername,
            room: 'الغرفة العامة',
            avatarSeed: data.fromUsername,
            statusQuote: '',
            flag: '🇸🇦',
            role: 'member',
            likes: 0,
            points: 0,
            isVoice: false,
            micSlot: null,
            isMuted: false,
            isTextMuted: false,
            isSpeaking: false,
            joinedAt: Date.now()
          };
        setSelectedPmUser(partner as any);
        setActiveDrawer('pm');
      } else if (data.type === 'mention') {
        scrollToBottom(true);
      }
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Initialize Socket.io with infinite resilience and background keepalive
  useEffect(() => {
    // Clean up bulky or sensitive legacy localStorage keys
    try {
      localStorage.removeItem('soqoor_current_user');
      localStorage.removeItem('soqoor_role_permissions');
      localStorage.removeItem('soqoor_last_member_password');
    } catch {}

    // Connect to custom backend URL (e.g. Railway when hosted on Vercel) or current origin (when hosted on Railway)
    const remoteServerUrl =
      (import.meta.env.VITE_SERVER_URL as string)?.trim() ||
      (import.meta.env.VITE_API_URL as string)?.trim() ||
      undefined;
    const socketOptions = {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 400,
      reconnectionDelayMax: 1500,
      randomizationFactor: 0.1,
      timeout: 60000,
      transports: ['websocket', 'polling'],
      upgrade: true,
      rememberUpgrade: true,
      autoConnect: true
    };
    const s = remoteServerUrl ? io(remoteServerUrl, socketOptions) : io(socketOptions);
    // Feed Zombie-Socket Pong Watchdog on every incoming server event
    s.onAny(() => {
      notifySocketActivity();
    });

    // Safety fallback only if network/API is completely unresponsive after 3.5 seconds
    const appearanceFallbackTimer = window.setTimeout(() => setAppearanceReady(true), 3500);

    s.on('connect', () => {
      notifySocketActivity();
      if (reconnectBannerTimerRef.current) {
        window.clearTimeout(reconnectBannerTimerRef.current);
        reconnectBannerTimerRef.current = null;
      }
      setIsConnected(true);
      setConnectionState('connected');
      setLoginError(null);

      // Do NOT restore session if user was explicitly force-logged out due to another device login
      if (isForcedLoggedOutRef.current) {
        return;
      }

      // Only restore previous session if the user is ALREADY logged in during the active app session and socket reconnected
      if (currentUserRef.current) {
        const savedToken = localStorage.getItem('soqoor_session_token') || sessionStorage.getItem('soqoor_session_token');
        const savedUsername = currentUserRef.current.username;
        s.emit('restoreSession', {
          sessionToken: savedToken || undefined,
          username: savedUsername,
          room: currentUserRef.current?.room || 'الغرفة العامة',
          deviceFingerprint: generateDeviceFingerprint().fingerprintId,
          isIncognito: isIncognitoClientRef.current,
          presenceState: typeof document !== 'undefined' && document.hidden ? 'away' : 'online'
        });
      }

      // Flush any queued messages that were written during temporary network disconnect or in background
      if (pendingMessagesQueueRef.current.length > 0) {
        const queued = [...pendingMessagesQueueRef.current];
        pendingMessagesQueueRef.current = [];
        queued.forEach((item) => {
          s.emit(item.event, item.payload);
        });
        showToast('تمت استعادة الاتصال وإرسال جميع الرسائل المعلقة تلقائياً بنجاح 🚀', 'success');
      }

      // Initial ping latency measurement
      s.emit('keepAlivePing', { timestamp: Date.now() });
      s.emit('getStories');
      s.emit('getWallPosts');
      s.emit('requestRecentLogins');
      s.emit('getMessageRetentionLimits');
      s.emit('syncChatConfig', { roomId: currentUserRef.current?.room || 'الغرفة العامة' });
    });

    // Pong listener for live ping measurement (ms)
    s.on('keepAlivePong', (data: { timestamp: number; clientTimestamp?: number }) => {
      notifySocketActivity();
      if (data?.clientTimestamp) {
        const latency = Math.max(1, Date.now() - data.clientTimestamp);
        setPingLatency(latency);
      }
    });

    // Background Web Worker Heartbeat: Single authoritative keep-alive engine
    startHeartbeatWorker(s);

    const scheduleReconnectingBanner = () => {
      if (reconnectBannerTimerRef.current) return;
      // High-tolerance grace period (minimum 10s) so background app switching never flashes reconnecting alert
      const delayMs = Math.max(10, reconnectBannerDelaySecondsRef.current || 10) * 1000;
      reconnectBannerTimerRef.current = window.setTimeout(() => {
        reconnectBannerTimerRef.current = null;
        if (!s.connected && currentUserRef.current && !isForcedLoggedOutRef.current) {
          setConnectionState('reconnecting');
        }
      }, delayMs);
    };

    s.on('connect_error', () => {
      setIsConnected(false);
      setIsSubmitting(false);
      if (currentUserRef.current && !isForcedLoggedOutRef.current) {
        scheduleReconnectingBanner();
      } else {
        setConnectionState('disconnected');
      }
    });

    s.on('storiesUpdated', (stories: StoryItem[]) => {
      setStoriesList(stories || []);
    });

    s.on('disconnect', (reason) => {
      setIsConnected(false);
      if (currentUserRef.current && !isForcedLoggedOutRef.current) {
        scheduleReconnectingBanner();
      } else {
        setConnectionState('disconnected');
      }
      // Only manual reconnect if disconnected by server command and not forced out
      if (reason === 'io server disconnect' && !isForcedLoggedOutRef.current) {
        s.connect();
      }
    });

    s.on('initialRoster', (data: {
      onlineCount: number;
      users: User[];
      rooms: ChatRoom[];
      roomStats?: RoomStatData[];
      bannedList?: any[];
      serverSecurity?: any;
      staffMemos?: any[];
      filterAlerts?: any[];
      monitoredWords?: string[];
      shortcuts?: ChatShortcut[];
      likesSettings?: LikesThresholdSettings;
      marqueeTicker?: string;
    }) => {
      setOnlineCount(data.users ? data.users.length : (data.onlineCount || 0));
      setRosterUsers(data.users || []);
      setRoomsList(data.rooms || []);
      if (data.roomStats) {
        setRoomStatsData(data.roomStats);
      }
      if (data.bannedList) {
        setBannedList(data.bannedList);
      }
      if (data.serverSecurity) {
        setServerSecurity(data.serverSecurity);
        if (typeof data.serverSecurity.awayDelaySeconds === 'number') {
          setPresenceAwayDelayMs(data.serverSecurity.awayDelaySeconds * 1000);
        }
        if (typeof data.serverSecurity.reconnectBannerDelaySeconds === 'number') {
          reconnectBannerDelaySecondsRef.current = data.serverSecurity.reconnectBannerDelaySeconds;
        }
      }
      if (data.staffMemos) {
        setStaffMemos(data.staffMemos);
      }
      if (data.filterAlerts) {
        setFilterAlertsList(data.filterAlerts);
      }
      if (data.monitoredWords) {
        setMonitoredWordsList(data.monitoredWords);
      }
      if (data.shortcuts) {
        setShortcuts(data.shortcuts);
      }
      if (data.likesSettings) {
        setLikesSettings(data.likesSettings);
      }
      if ((data as any).rolePermissions) {
        setRolePermissions((data as any).rolePermissions);
      }
      if ((data as any).generalWelcome) {
        setGeneralWelcome((data as any).generalWelcome);
      }
      if (data.marqueeTicker || (data.serverSecurity && data.serverSecurity.marqueeTicker)) {
        triggerAnnouncementDisplay(8000);
      }
      if ((data as any).emblemsConfig) {
        const serverEmblems = (data as any).emblemsConfig as EmblemsConfig;
        setEmblemsConfig(serverEmblems);
        // The server is the source of truth so a new device never falls back to its old local cache.
        if (serverEmblems.falconChatBanner) {
          setFalconChatBanner(serverEmblems.falconChatBanner);
          try { localStorage.setItem('falcon_chat_banner', serverEmblems.falconChatBanner); } catch {}
        }
        if (serverEmblems.falconAvatarIcon) {
          setFalconAvatarIcon(serverEmblems.falconAvatarIcon);
          try { localStorage.setItem('falcon_avatar_icon', serverEmblems.falconAvatarIcon); } catch {}
        }
      }
      if ((data as any).stories) {
        setStoriesList((data as any).stories);
      }
      if ((data as any).wallPosts && Array.isArray((data as any).wallPosts)) {
        setWallPosts(((data as any).wallPosts).slice(0, 100));
      }
      if ((data as any).globalAppearance) {
        const ga = (data as any).globalAppearance;
        if (ga.theme) {
          setActiveTheme(ga.theme);
          try { localStorage.setItem('soqoor_theme', ga.theme); } catch {}
        }
        if (ga.fontFamily) {
          setFontFamily(ga.fontFamily);
          try { localStorage.setItem('soqoor_font_family', ga.fontFamily); } catch {}
        }
        if (ga.fontWeight) {
          setChatFontWeight(ga.fontWeight);
          try { localStorage.setItem('soqoor_font_weight', ga.fontWeight); } catch {}
        }
        if (ga.wallpaper) {
          setActiveWallpaper(ga.wallpaper);
          try { localStorage.setItem('soqoor_wallpaper', ga.wallpaper); } catch {}
        }
        if (ga.bubbleStyle) {
          setBubbleStyle(ga.bubbleStyle);
          try { localStorage.setItem('soqoor_bubble_style', ga.bubbleStyle); } catch {}
        }
        if (ga.bannerUrl) {
          setFalconChatBanner(ga.bannerUrl);
          try { localStorage.setItem('falcon_chat_banner', ga.bannerUrl); } catch {}
        }
        if (ga.logoUrl) {
          setFalconAvatarIcon(ga.logoUrl);
          try { localStorage.setItem('falcon_avatar_icon', ga.logoUrl); } catch {}
        }
      }
      if ((data as any).recentLogins && Array.isArray((data as any).recentLogins)) {
        const mapped: RecentLoginEntry[] = (data as any).recentLogins.map((e: any) => ({
          username: e.username,
          avatar: e.avatar || e.avatarUrl || falconIcon,
          avatarUrl: e.avatarUrl || e.avatar || falconIcon,
          nameBannerUrl: e.nameBannerUrl,
          statusQuote: e.statusQuote,
          flag: e.flag || '🇾🇪',
          room: e.room || 'الغرفة العامة',
          role: e.role || 'member',
          loginTime: e.loginTime || e.time || 'الآن',
          timestamp: e.timestamp || Date.now()
        }));
        setRecentLogins(mapped);
      }
      if ((data as any).rolesConfig && Array.isArray((data as any).rolesConfig)) {
        setRolesConfig((data as any).rolesConfig);
      }
      if ((data as any).rolePermissions) {
        setRolePermissions((data as any).rolePermissions);
      }
      if ((data as any).messageRetentionLimits) {
        setMessageRetentionLimits((data as any).messageRetentionLimits);
      }
      // The shared appearance has now been applied before any public screen is shown.
      setAppearanceReady(true);
    });

    // Full live chat configuration sync (on reconnect, session restore, or browser reopen/wake)
    s.on('chatConfigSync', (data: any) => {
      if (!data || typeof data !== 'object') return;
      if (Array.isArray(data.rooms)) setRoomsList(data.rooms);
      if (data.roomSettings) {
        setRoomSettings((prev) => ({ ...prev, ...data.roomSettings }));
        if (data.roomSettings.pinnedTopic !== undefined) {
          setPinnedTopic(data.roomSettings.pinnedTopic);
        }
      }
      if (data.globalAppearance) {
        const ga = data.globalAppearance;
        if (ga.theme) setActiveTheme(ga.theme);
        if (ga.fontFamily) setFontFamily(ga.fontFamily);
        if (ga.fontWeight) setChatFontWeight(ga.fontWeight);
        if (ga.wallpaper) setActiveWallpaper(ga.wallpaper);
        if (ga.bubbleStyle) setBubbleStyle(ga.bubbleStyle);
        if (ga.bannerUrl) setFalconChatBanner(ga.bannerUrl);
        if (ga.logoUrl) setFalconAvatarIcon(ga.logoUrl);
      }
      if (data.emblemsConfig) {
        setEmblemsConfig(data.emblemsConfig);
        if (data.emblemsConfig.falconChatBanner) setFalconChatBanner(data.emblemsConfig.falconChatBanner);
        if (data.emblemsConfig.falconAvatarIcon) setFalconAvatarIcon(data.emblemsConfig.falconAvatarIcon);
      }
      if (Array.isArray(data.rolesConfig)) setRolesConfig(data.rolesConfig);
      if (data.rolePermissions) setRolePermissions(data.rolePermissions);
      if (data.generalWelcome) setGeneralWelcome(data.generalWelcome);
      if (Array.isArray(data.shortcuts)) setShortcuts(data.shortcuts);
      if (data.likesSettings) setLikesSettings((prev) => ({ ...prev, ...data.likesSettings }));
      if (data.messageRetentionLimits) setMessageRetentionLimits(data.messageRetentionLimits);
      if (data.serverSecurity) {
        setServerSecurity((prev) => ({ ...prev, ...data.serverSecurity }));
        if (typeof data.serverSecurity.awayDelaySeconds === 'number') {
          setPresenceAwayDelayMs(data.serverSecurity.awayDelaySeconds * 1000);
        }
        if (typeof data.serverSecurity.reconnectBannerDelaySeconds === 'number') {
          reconnectBannerDelaySecondsRef.current = data.serverSecurity.reconnectBannerDelaySeconds;
        }
      }
      if (Array.isArray(data.recentLogins)) {
        const mapped: RecentLoginEntry[] = data.recentLogins.map((e: any) => ({
          username: e.username,
          avatar: e.avatar || e.avatarUrl || falconIcon,
          avatarUrl: e.avatarUrl || e.avatar || falconIcon,
          nameBannerUrl: e.nameBannerUrl,
          flag: e.flag || '🇾🇪',
          room: e.room || 'الغرفة العامة',
          role: e.role || 'member',
          loginTime: e.loginTime || e.time || 'الآن',
          timestamp: e.timestamp || Date.now()
        }));
        setRecentLogins(mapped);
      }
      setAppearanceReady(true);
    });

    // Real-time dynamic roles configuration listener (إضافة وتعديل الرتب)
    s.on('rolesConfigUpdated', (configs: RoleDefinition[]) => {
      if (Array.isArray(configs)) {
        setRolesConfig(configs);
      }
    });

    // Recent logins real-time listener (آخر 10 دخلوا الشات)
    s.on('recentLoginsUpdated', (list: RecentLoginEntry[]) => {
      if (Array.isArray(list)) {
        const mapped: RecentLoginEntry[] = list.map((e: any) => ({
          username: e.username,
          avatar: e.avatar || e.avatarUrl || falconIcon,
          avatarUrl: e.avatarUrl || e.avatar || falconIcon,
          nameBannerUrl: e.nameBannerUrl,
          statusQuote: e.statusQuote,
          flag: e.flag || '🇾🇪',
          room: e.room || 'الغرفة العامة',
          role: e.role || 'member',
          loginTime: e.loginTime || e.time || 'الآن',
          timestamp: e.timestamp || Date.now()
        }));
        setRecentLogins(mapped);
      }
    });

    // Message retention limits listener (سقف رسائل الغرف والحائط والخاص)
    s.on('messageRetentionLimitsUpdated', (limits: MessageRetentionLimits) => {
      if (limits) {
        setMessageRetentionLimits(limits);
        messageRetentionLimitsRef.current = limits;
        if (typeof limits.roomMaxMessages === 'number' && limits.roomMaxMessages > 0) {
          setMessages((prev) => pruneMessagesByRoomLimit(prev, limits.roomMaxMessages));
        }
      }
    });

    s.on('adminInitialData', (data: {
      bannedList?: any[];
      serverSecurity?: any;
      staffMemos?: any[];
      filterAlerts?: any[];
      monitoredWords?: string[];
      rolePermissions?: any;
      monitorLogs?: MonitorEvent[];
      messageRetentionLimits?: MessageRetentionLimits;
    }) => {
      if (data.bannedList) setBannedList(data.bannedList);
      if (data.serverSecurity) setServerSecurity(data.serverSecurity);
      if (data.staffMemos) setStaffMemos(data.staffMemos);
      if (data.filterAlerts) setFilterAlertsList(data.filterAlerts);
      if (data.monitoredWords) setMonitoredWordsList(data.monitoredWords);
      if (data.rolePermissions) setRolePermissions(data.rolePermissions);
      if (data.monitorLogs) setMonitorLogs(data.monitorLogs);
      if (data.messageRetentionLimits) {
        setMessageRetentionLimits(data.messageRetentionLimits);
        messageRetentionLimitsRef.current = data.messageRetentionLimits;
        if (typeof data.messageRetentionLimits.roomMaxMessages === 'number' && data.messageRetentionLimits.roomMaxMessages > 0) {
          setMessages((prev) => pruneMessagesByRoomLimit(prev, data.messageRetentionLimits!.roomMaxMessages));
        }
      }
    });

    // Emblems and Custom Emojis update listener
    s.on('emblemsUpdated', (config: EmblemsConfig) => {
      if (config) {
        setEmblemsConfig(config);
        if (config.falconChatBanner) {
          setFalconChatBanner(config.falconChatBanner);
          try {
            localStorage.setItem('falcon_chat_banner', config.falconChatBanner);
          } catch {}
        }
        if (config.falconAvatarIcon) {
          setFalconAvatarIcon(config.falconAvatarIcon);
          try {
            localStorage.setItem('falcon_avatar_icon', config.falconAvatarIcon);
          } catch {}
        }
      }
    });

    // Falcon Chat Official Branding Assets listener (falcon_chat_banner & falcon_avatar_icon)
    s.on(
      'falconAssetsUpdated',
      ({
        falconChatBanner: newBanner,
        falconAvatarIcon: newAvatar
      }: {
        falconChatBanner?: string;
        falconAvatarIcon?: string;
      }) => {
        if (newBanner) {
          setFalconChatBanner(newBanner);
          try {
            localStorage.setItem('falcon_chat_banner', newBanner);
          } catch {}
        }
        if (newAvatar) {
          setFalconAvatarIcon(newAvatar);
          try {
            localStorage.setItem('falcon_avatar_icon', newAvatar);
          } catch {}
        }
      }
    );

    // General Welcome Settings Updated listener (تحديثات الرسائل الترحيبية العامة للشات)
    s.on('generalWelcomeUpdated', (data: { enabled: boolean; message: string; title: string }) => {
      setGeneralWelcome(data);
    });

    // Global Appearance Updates for all users (التطبيق العام للثيم والخط لكافة المستخدمين)
    s.on('globalAppearanceUpdated', (data: { theme?: string; fontFamily?: string; fontWeight?: 'thin' | 'normal' | 'default' | 'bold' | 'black'; wallpaper?: string; bubbleStyle?: string; bannerUrl?: string; logoUrl?: string; customThemes?: CustomThemePreset[] }) => {
      if (Array.isArray(data.customThemes)) {
        setCustomThemes(data.customThemes);
        try {
          localStorage.setItem('soqoor_custom_themes', JSON.stringify(data.customThemes));
        } catch {}
      }
      if (data.theme) {
        setActiveTheme(data.theme);
        localStorage.setItem('soqoor_theme', data.theme);
      }
      if (data.fontFamily) {
        setFontFamily(data.fontFamily);
        localStorage.setItem('soqoor_font', data.fontFamily);
        localStorage.setItem('soqoor_font_family', data.fontFamily);
      }
      if (data.fontWeight) {
        setChatFontWeight(data.fontWeight);
        try {
          localStorage.setItem('soqoor_chat_font_weight', data.fontWeight);
        } catch {}
      }
      if (data.wallpaper) {
        setActiveWallpaper(data.wallpaper);
        localStorage.setItem('soqoor_wallpaper', data.wallpaper);
      }
      if (data.bubbleStyle) {
        setBubbleStyle(data.bubbleStyle);
        localStorage.setItem('soqoor_bubble_style', data.bubbleStyle);
      }
      if (data.bannerUrl !== undefined) {
        setFalconChatBanner(data.bannerUrl || DEFAULT_FALCON_CHAT_BANNER);
        try { localStorage.setItem('falcon_chat_banner', data.bannerUrl || DEFAULT_FALCON_CHAT_BANNER); } catch {}
      }
      if (data.logoUrl) {
        setFalconAvatarIcon(data.logoUrl);
        try { localStorage.setItem('falcon_avatar_icon', data.logoUrl); } catch {}
      }
    });

    // Role Permissions live listener
    s.on('rolePermissionsUpdated', (perms: Record<string, any>) => {
      if (perms) {
        setRolePermissions(perms);
      }
    });

    // User style immediate broadcast listener
    s.on('userStyleUpdated', (data: { userId?: string; username: string; statusQuote?: string; avatarUrl?: string; nameColor?: string; textColor?: string; nameGradient?: string; profileBg?: string; nameBannerUrl?: string; giftBadges?: string[] }) => {
      const matchName = (un?: string) => un && un.toLowerCase() === data.username.toLowerCase();

      setRosterUsers((prev) =>
        prev.map((u) => (matchName(u.username) ? { ...u, statusQuote: data.statusQuote !== undefined ? data.statusQuote : u.statusQuote, avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : u.avatarUrl, nameColor: data.nameColor, textColor: data.textColor, nameGradient: data.nameGradient, profileBg: data.profileBg, nameBannerUrl: data.nameBannerUrl !== undefined ? data.nameBannerUrl : u.nameBannerUrl, giftBadges: data.giftBadges !== undefined ? data.giftBadges : u.giftBadges } : u))
      );
      setAllConnectedUsers((prev) =>
        prev.map((u) => (matchName(u.username) ? { ...u, statusQuote: data.statusQuote !== undefined ? data.statusQuote : u.statusQuote, avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : u.avatarUrl, nameColor: data.nameColor, textColor: data.textColor, nameGradient: data.nameGradient, profileBg: data.profileBg, nameBannerUrl: data.nameBannerUrl !== undefined ? data.nameBannerUrl : u.nameBannerUrl, giftBadges: data.giftBadges !== undefined ? data.giftBadges : u.giftBadges } : u))
      );
      setAllRegisteredMembers((prev) =>
        prev.map((m) => (matchName(m.username) ? { ...m, statusQuote: data.statusQuote !== undefined ? data.statusQuote : m.statusQuote, nameBannerUrl: data.nameBannerUrl !== undefined ? data.nameBannerUrl : m.nameBannerUrl, giftBadges: data.giftBadges !== undefined ? data.giftBadges : m.giftBadges } : m))
      );
      setCurrentUser((prev) => (prev && matchName(prev.username) ? { ...prev, statusQuote: data.statusQuote !== undefined ? data.statusQuote : prev.statusQuote, nameColor: data.nameColor, textColor: data.textColor, nameGradient: data.nameGradient, profileBg: data.profileBg, nameBannerUrl: data.nameBannerUrl !== undefined ? data.nameBannerUrl : prev.nameBannerUrl, giftBadges: data.giftBadges !== undefined ? data.giftBadges : prev.giftBadges } : prev));
      setProfileTargetUser((prev) => (prev && matchName(prev.username) ? { ...prev, statusQuote: data.statusQuote !== undefined ? data.statusQuote : prev.statusQuote, nameBannerUrl: data.nameBannerUrl !== undefined ? data.nameBannerUrl : prev.nameBannerUrl, giftBadges: data.giftBadges !== undefined ? data.giftBadges : prev.giftBadges } : prev));
      if (data.statusQuote !== undefined && matchName(currentUserRef.current?.username)) {
        setSettingQuote(data.statusQuote);
      }
      if (data.nameColor) setSettingNameColor(data.nameColor);
      if (data.textColor) setSettingTextColor(data.textColor);

      setMessages((prev) =>
        prev.map((m) =>
          matchName(m.username)
            ? {
                ...m,
                nameColor: data.nameColor !== undefined ? data.nameColor : m.nameColor,
                textColor: data.textColor !== undefined ? data.textColor : m.textColor,
                nameGradient: data.nameGradient !== undefined ? data.nameGradient : m.nameGradient,
                nameBannerUrl: data.nameBannerUrl !== undefined ? data.nameBannerUrl : m.nameBannerUrl,
                giftBadges: data.giftBadges !== undefined ? data.giftBadges : m.giftBadges
              }
            : m
        )
      );

      if (data.nameBannerUrl !== undefined) {
        setWallPosts((prev) =>
          prev.map((p) => {
            const isAuthor = matchName(p.username);
            const updatedComments = p.comments?.map((c) =>
              matchName(c.username) ? { ...c, nameBannerUrl: data.nameBannerUrl || undefined } : c
            );
            return {
              ...p,
              nameBannerUrl: isAuthor ? data.nameBannerUrl || undefined : p.nameBannerUrl,
              comments: updatedComments
            };
          })
        );
        setPrivateMessages((prev) =>
          prev.map((pm) => ({
            ...pm,
            fromNameBannerUrl: matchName(pm.fromUsername) ? data.nameBannerUrl || undefined : pm.fromNameBannerUrl,
            toNameBannerUrl: matchName(pm.toUsername) ? data.nameBannerUrl || undefined : pm.toNameBannerUrl
          }))
        );
        setProfileVisitorsList((prev) =>
          prev.map((v) => (matchName(v.username) ? { ...v, nameBannerUrl: data.nameBannerUrl || undefined } : v))
        );
      }
    });

    // Likes Threshold limits listener (تحديث شروط اللايكات الحية)
    s.on('likesSettingsUpdated', (updatedLikes: LikesThresholdSettings) => {
      if (updatedLikes) {
        setLikesSettings(updatedLikes);
      }
    });

    // Profile Likes Real-Time Updates & Live Floating Alerts
    s.on('userLikesUpdated', ({ username, likes }: { username: string; likes: number }) => {
      setRosterUsers((prev) =>
        prev.map((u) => (u.username === username ? { ...u, likes } : u))
      );
      setAllConnectedUsers((prev) =>
        prev.map((u) => (u.username === username ? { ...u, likes } : u))
      );
      setCurrentUser((prev) => (prev && prev.username === username ? { ...prev, likes } : prev));
      setProfileTargetUser((prev) => (prev && prev.username === username ? { ...prev, likes } : prev));
    });

    s.on('receivedProfileLike', (data: { fromUsername: string; fromAvatar?: string; flag?: string; likes: number; timestamp?: number }) => {
      setFloatingLikeAlert(data);
      sounds.playCrownFanfare();
      confetti({ particleCount: 50, spread: 70 });
      setTimeout(() => {
        setFloatingLikeAlert((curr) => (curr?.fromUsername === data.fromUsername ? null : curr));
      }, 7000);
    });

    // Member Gifting Real-Time Direct Alert (استلام هدية تكريمية مباشرة)
    s.on('giftReceivedAlert', (data: {
      fromUsername: string;
      fromAvatar?: string;
      giftTitle: string;
      giftUrl: string;
      giftMessage?: string;
    }) => {
      setGiftReceivedAlert(data);
      sounds.playCrownFanfare();
      try {
        confetti({
          particleCount: 90,
          spread: 85,
          origin: { y: 0.55 }
        });
      } catch (e) {}
      showToast(`🎁✨ حصلت على هدية فاخرة من [${data.fromUsername}]: ${data.giftTitle}`, 'success');

      if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(`🎁 هدية جديدة من ${data.fromUsername}!`, {
            body: `أهداك [${data.giftTitle}]: ${data.giftMessage || 'مع أطيب التحيات وخالص التقدير 🌹'}`,
            icon: data.giftUrl || '/favicon.svg'
          });
        } catch (e) {}
      }
    });

    // Chat Shortcuts listener
    s.on('shortcutsUpdated', (list: ChatShortcut[]) => {
      setShortcuts(list || []);
    });

    // Nick Detection / Account revelation listener
    s.on('revealedNicksResult', (data: any) => {
      setRevealedNicksData(data);
      setShowRevealedNicksModal(true);
    });

    // Filter Alerts listeners (تنبيهات فلتر الكلمات المحظورة)
    s.on('filterAlertsList', (list: any[]) => {
      if (Array.isArray(list)) {
        setFilterAlertsList(list);
      }
    });

    s.on('newFilterAlert', (alert: any) => {
      if (!alert) return;
      setFilterAlertsList((prev) => [alert, ...prev.filter((a) => a.id !== alert.id)].slice(0, 150));
      const currentU = currentUserRef.current;
      if (currentU && (currentU.role === 'hassan' || currentU.role === 'admin' || currentU.role === 'super' || getRoleLevel(currentU.role) >= 75)) {
        sounds.playGeneralAlertPing();
        const matched = Array.isArray(alert.matchedWords) ? alert.matchedWords.join(', ') : alert.matchedWords || '';
        showToast(`🚨 تنبيه فلتر: كتب [${alert.username}] كلمة محظورة${matched ? `: "${matched}"` : ''}`, 'error');
      }
    });

    s.on('onlineCountUpdated', (count: number) => {
      setOnlineCount(count);
    });

    s.on('allUsers', (users: User[]) => {
      const uniqueUsers = new Map<string, User>();
      for (const user of users || []) {
        if (user && user.username) {
          uniqueUsers.set(user.username.trim().toLowerCase(), user);
        }
      }
      const userList = Array.from(uniqueUsers.values());
      setAllConnectedUsers(userList);
      const currentU = currentUserRef.current;
      if (currentU) {
        const myLatest = userList.find((u) => u.username.toLowerCase() === currentU.username.toLowerCase());
        if (myLatest && myLatest.room && myLatest.room !== currentU.room) {
          setCurrentUser((prev) => (prev ? { ...prev, room: myLatest.room } : null));
        }
      }
    });

    s.on('leftRoomSuccess', () => {
      setCurrentUser((prev) => (prev ? { ...prev, room: 'خارج الغرف', micSlot: null, isVoice: false } : null));
      setRosterUsers([]);
      setAllConnectedUsers((prev) => {
        const cUser = currentUserRef.current;
        if (!cUser) return prev;
        const lowerSelf = cUser.username.toLowerCase();
        const updatedUser: User = {
          ...cUser,
          room: 'خارج الغرف',
          micSlot: null,
          isVoice: false,
          presenceState: cUser.presenceState || 'online'
        };
        const exists = prev.some((u) => u.username.toLowerCase() === lowerSelf);
        if (exists) {
          return prev.map((u) => (u.username.toLowerCase() === lowerSelf ? updatedUser : u));
        }
        return [updatedUser, ...prev];
      });
    });

  s.on('allRegisteredMembers', (members: any[]) => {
  // The server snapshot is authoritative for online state and room membership.
  setAllRegisteredMembers(Array.isArray(members) ? members : []);
  });

    // User presence state listener (🟢 Green: online, 🟡 Yellow: away/background, ⚪ Gray: offline)
    s.on('userPresenceUpdated', ({ username, state }: { userId: string; username: string; state: 'online' | 'away' | 'offline' }) => {
      setRosterUsers((prev) =>
        state === 'offline'
          ? prev.filter((u) => u.username !== username)
          : prev.map((u) => (u.username === username ? { ...u, presenceState: state } : u))
      );
  setAllConnectedUsers((prev) =>
  state === 'offline'
  ? prev.filter((u) => u.username.toLowerCase() !== username.toLowerCase())
  : prev.map((u) => (u.username.toLowerCase() === username.toLowerCase() ? { ...u, presenceState: state } : u))
  );
  setAllRegisteredMembers((prev) => prev.map((member) =>
  member.username.toLowerCase() === username.toLowerCase()
  ? {
      ...member,
      isOnline: state !== 'offline',
      presenceState: state,
      currentRoom: state === 'offline'
        ? 'خارج الغرف'
        : allConnectedUsersRef.current.find((user) => user.username.toLowerCase() === username.toLowerCase())?.room || member.currentRoom
    }
  : member
  ));
  if (currentUserRef.current && currentUserRef.current.username.toLowerCase() === username.toLowerCase()) {
        setCurrentUser((prev) => (prev ? { ...prev, presenceState: state } : null));
      }
    });

    // Synced room messages (shows everything that happened while user had chat in background)
    s.on('syncedRoomMessages', ({ messages: newMsgs }: { roomId: string; messages: Message[] }) => {
      if (Array.isArray(newMsgs) && newMsgs.length > 0) {
        setMessages((prev) => {
          const ids = new Set(prev.map((m) => m.id));
          const additions = newMsgs.filter((m) => !ids.has(m.id));
          return additions.length > 0 ? [...prev, ...additions] : prev;
        });
      }
    });

    s.on('roomStats', (stats: RoomStatData[]) => {
      setRoomStatsData(stats);
    });

    s.on('roomStatsUpdated', (stats: RoomStatData[]) => {
      setRoomStatsData(stats);
    });

    s.on('bannedListUpdated', (list: any[]) => {
      setBannedList(list || []);
    });

    s.on('roomSettingsUpdated', (payload: any) => {
      const nextSettings = payload?.settings || payload;
      if (nextSettings && typeof nextSettings === 'object') {
        setRoomSettings((prev) => ({ ...prev, ...nextSettings }));
      }
    });

    s.on('roomPinnedMessageUpdated', (pinned: { id: string; username: string; text: string } | null) => {
      setPinnedChatMessage(pinned);
    });

    // Real-time typing indicator listener (استقبال وتحديث قائمة الأعضاء الذين يكتبون الآن في الغرفة)
    s.on('userTyping', (data: {
      userId: string;
      username: string;
      avatarUrl?: string;
      flag?: string;
      role?: string;
      nameColor?: string;
      nameGradient?: string;
      room: string;
      isTyping: boolean;
    }) => {
      if (!data || !data.username) return;
      const curU = currentUserRef.current;
      if (curU && (data.userId === curU.id || data.username.toLowerCase() === curU.username.toLowerCase())) {
        return;
      }
      if (curU && curU.room && data.room && data.room !== curU.room) {
        return;
      }

      setTypingUsers((prev) => {
        const withoutUser = prev.filter(
          (u) => u.userId !== data.userId && u.username.toLowerCase() !== data.username.toLowerCase()
        );
        if (!data.isTyping) {
          return withoutUser;
        }
        return [
          ...withoutUser,
          {
            userId: data.userId,
            username: data.username,
            avatarUrl: data.avatarUrl,
            flag: data.flag,
            role: data.role,
            nameColor: data.nameColor,
            nameGradient: data.nameGradient,
            room: data.room,
            lastTypedAt: Date.now()
          }
        ];
      });
    });

    // Real-time PM typing indicator listener (استقبال وتحديث حالة جاري الكتابة في المحادثات الخاصة)
    s.on('userPmTyping', (data: {
      fromUserId: string;
      fromUsername: string;
      avatarUrl?: string;
      nameBannerUrl?: string;
      isTyping: boolean;
    }) => {
      if (!data || !data.fromUsername) return;
      const key = data.fromUsername.trim().toLowerCase();
      setPmTypingUsers((prev) => {
        const next = { ...prev };
        if (data.isTyping) {
          next[key] = {
            username: data.fromUsername,
            avatarUrl: data.avatarUrl,
            nameBannerUrl: data.nameBannerUrl,
            lastTypedAt: Date.now()
          };
        } else {
          delete next[key];
        }
        return next;
      });
    });

    s.on('chatMessageReactionUpdated', ({ messageId, reactions }: { messageId: string; reactions: Record<string, number> }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, reactions } : m))
      );
    });

    s.on('userPointsUpdated', ({ points, reason, added }: { points: number; reason: string; added: number }) => {
      setCurrentUser((prev) => (prev ? { ...prev, points } : null));
      showToast(`+${added} نقطة: ${reason} ⭐`, 'success');
      confetti({ particleCount: 35, spread: 50 });
    });

    s.on('serverSecurityUpdated', (sec: any) => {
      setServerSecurity(sec);
      if (typeof sec?.awayDelaySeconds === 'number') {
        setPresenceAwayDelayMs(sec.awayDelaySeconds * 1000);
      }
      if (typeof sec?.reconnectBannerDelaySeconds === 'number') {
        reconnectBannerDelaySecondsRef.current = sec.reconnectBannerDelaySeconds;
      }
    });

    s.on('staffMemosUpdated', (memos: any[]) => {
      setStaffMemos(memos || []);
    });

    s.on('adminSirenAlert', (data: { from: string; message: string; timestamp: number }) => {
      setActiveAdminSiren(data);
      sounds.playGeneralAlertPing();
      setTimeout(() => {
        setActiveAdminSiren((prev) => (prev?.timestamp === data.timestamp ? null : prev));
      }, 10000);
    });

    s.on('officialWarning', (data: { from: string; text: string }) => {
      setReceivedOfficialWarning(data);
      sounds.playGeneralAlertPing();
    });

    s.on('warningReplyReceived', (data: { from: string; avatarUrl?: string; flag?: string; replyText: string; time: string }) => {
      sounds.playGeneralAlertPing();
      showToast(`📩 وصلك رد من العضو [${data.from}] بخصوص التنبيه: "${data.replyText}"`, 'info');
    });

    s.on('chatMessageDeleted', ({ messageId, showNotice, deletedBy, deletedByRole }: { messageId: string; showNotice?: boolean; deletedBy?: string; deletedByRole?: string }) => {
      const role = currentUserRef.current?.role;
      const isAdminUser = role === 'hassan' || role === 'admin' || role === 'super' || getRoleLevel(role) >= 75;
      if (showNotice && isAdminUser) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, isDeleted: true, deletedBy, deletedByRole, text: '', mediaUrl: undefined, voiceNote: undefined, replyTo: undefined, reactions: undefined }
              : m
          )
        );
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      }
    });

    s.on('chatMessageEdited', ({ messageId, newText }: { messageId: string; newText: string }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, text: newText, isEdited: true } : m))
      );
    });

    s.on('privateMessageDeleted', ({ messageId }: { messageId: string }) => {
      setPrivateMessages((prev) => prev.filter((pm) => pm.id !== messageId));
    });

    s.on('privateMessageEdited', ({ messageId, newText }: { messageId: string; newText: string }) => {
      setPrivateMessages((prev) =>
        prev.map((pm) => (pm.id === messageId ? { ...pm, text: newText, isEdited: true } : pm))
      );
    });

    s.on('privateMessagesRead', ({ byUsername, readAt }: { byUsername: string; readAt: number }) => {
      setPrivateMessages((prev) => {
        const safe = Array.isArray(prev) ? prev : [];
        const byLower = (byUsername || '').trim().toLowerCase();
        const myLower = (currentUserRef.current?.username || '').trim().toLowerCase();
        let changed = false;
        const now = readAt || Date.now();
        const updated = safe.map((pm) => {
          if (!pm) return pm;
          const fromL = (pm.fromUsername || '').trim().toLowerCase();
          const toL = (pm.toUsername || '').trim().toLowerCase();

          // Condition A: Partner read messages that I sent to them
          const partnerReadMyMsg = (fromL === myLower && toL === byLower);
          // Condition B: I read messages that partner sent to me
          const iReadPartnerMsg = (byLower === myLower && toL === myLower);

          if ((partnerReadMyMsg || iReadPartnerMsg) && pm.status !== 'read') {
            changed = true;
            return { ...pm, status: 'read' as const, readAt: now };
          }
          return pm;
        });
        return changed ? updated : safe;
      });
    });

    s.on('remoteVoiceChunk', (data: { userId: string; username: string; micSlot: number; chunk: string }) => {
      if (isSpeakerMutedRef.current) return;
      if (audioManagerRef.current?.hasConnectedPeer(data.userId)) {
        // Direct WebRTC peer connection is active and streaming track; skip fallback chunk to prevent echo
        return;
      }
      try {
        const audio = new Audio(data.chunk);
        audio.volume = 0.95;
        audio.play().catch(() => {});
      } catch {}
    });

    s.on('monitorEvent', (event: MonitorEvent) => {
      const safeEvent: MonitorEvent = { ...event, timestamp: event.timestamp || Date.now() };
      setMonitorLogs((prev) => [safeEvent, ...prev.slice(0, 199)]);
    });

    s.on('criticalGlobalBroadcast', (data: { id: string; title: string; text: string; sender: string; senderRole: string; time: string }) => {
      setCriticalBroadcast(data);
      sounds.playGeneralAlertPing();
      confetti({ particleCount: 60, spread: 80, origin: { y: 0.3 } });
    });

    s.on('roomJoined', ({ user }: { user: User }) => {
      setCurrentUser(user);
      currentUserRef.current = user;
      roomEntryTimestampRef.current = Date.now();
      // Clean Room Mode: Fresh start when entering any room
      setMessages([]);
    });

    s.on('profileUpdated', ({ user }: { user: User }) => {
      setCurrentUser(user);
      currentUserRef.current = user;
      setSettingName(user.username);
      setSettingQuote(user.statusQuote);
      setSettingAvatar(user.avatarUrl || '');
    });

    s.on('loginSuccess', ({ user, sessionToken }: { user: User; sessionToken?: string }) => {
      roomEntryTimestampRef.current = Date.now();
      setCurrentUser(user);
      setSettingName(user.username);
      setSettingQuote(user.statusQuote);
      setSettingAvatar(user.avatarUrl || '');

      // The account stored on the server is authoritative so one device cannot overwrite another user's profile.
      const persistentNameColor = user.nameColor || localStorage.getItem('soqoor_name_color') || '#d97706';
      const persistentTextColor = user.textColor || localStorage.getItem('soqoor_text_color') || '#0f172a';
      const persistentNameGradient = user.nameGradient || localStorage.getItem('soqoor_name_gradient') || 'from-amber-400 to-yellow-200';
      // Member colors are personal and persist with the account. Theme, font,
      // wallpaper, and bubble style are global admin settings and are managed
      // only by the globalAppearance events, never by login/session restoration.
      setSettingNameColor(persistentNameColor);
      setSettingTextColor(persistentTextColor);
      setNameGradient(persistentNameGradient);

      try {
        localStorage.setItem('soqoor_name_color', persistentNameColor);
        localStorage.setItem('soqoor_text_color', persistentTextColor);
        localStorage.setItem('soqoor_name_gradient', persistentNameGradient);
      } catch {}

      s.emit('updateUserStyle', {
        nameColor: persistentNameColor,
        textColor: persistentTextColor,
        nameGradient: persistentNameGradient
      });

      setIsSubmitting(false);
      setLoginError(null);
      setMessages([]);
      setPrivateMessages([]);
      setUnreadPerUser({});
      if (sessionToken) {
        localStorage.setItem('soqoor_session_token', sessionToken);
        localStorage.setItem('soqoor_session_username', user.username);
      }
      if (user.role !== 'guest') {
        try {
          localStorage.setItem('soqoor_last_member_username', user.username);
        } catch {}
      }
      requestScreenWakeLock();
      startSilentAudioKeepAlive();
      startHeartbeatWorker(s);
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
      triggerAnnouncementDisplay(8000);
      showToast(`أهلاً بك يا ${user.username} في شات حسان برو! 🦅`, 'success');
      confetti({ particleCount: 50, spread: 70, origin: { y: 0.8 } });
    });

    s.on('sessionRestored', ({ user, sessionToken }: { user: User; sessionToken?: string }) => {
      setCurrentUser(user);
      // NOTE: Do NOT clear messages or private messages here!
      // Chat history is safely retained across screen locks, background transitions, and reconnects.
      setSettingName(user.username);
      setSettingQuote(user.statusQuote);
      setSettingAvatar(user.avatarUrl || '');

      // Prefer the server profile; browser storage is only a fallback for legacy anonymous settings.
      const persistentNameColor = user.nameColor || localStorage.getItem('soqoor_name_color') || '#d97706';
      const persistentTextColor = user.textColor || localStorage.getItem('soqoor_text_color') || '#0f172a';
      const persistentNameGradient = user.nameGradient || localStorage.getItem('soqoor_name_gradient') || 'from-amber-400 to-yellow-200';
      // Session restoration must not reapply member or browser appearance defaults.
      // The admin-controlled appearance remains owned by globalAppearance events.
      setSettingNameColor(persistentNameColor);
      setSettingTextColor(persistentTextColor);
      setNameGradient(persistentNameGradient);

      try {
        localStorage.setItem('soqoor_name_color', persistentNameColor);
        localStorage.setItem('soqoor_text_color', persistentTextColor);
        localStorage.setItem('soqoor_name_gradient', persistentNameGradient);
      } catch {}

      setIsSubmitting(false);
      setLoginError(null);
      if (sessionToken) {
        localStorage.setItem('soqoor_session_token', sessionToken);
      }
      localStorage.setItem('soqoor_session_username', user.username);
      requestScreenWakeLock();
      if (keepAlivePlayerEnabled && !floatingVideoStateRef.current) {
        startSilentAudioKeepAlive();
      }
      startHeartbeatWorker(s);
      triggerAnnouncementDisplay(8000);

      // Sync ONLY missed room messages since last message or room entry (never re-fetch history on live connection)
      const lastMsg = messagesRef.current[messagesRef.current.length - 1];
      const sinceTs = lastMsg?.timestamp || roomEntryTimestampRef.current;
      if (sinceTs) {
        s.emit('syncRoomMessages', {
          roomId: user.room || 'الغرفة العامة',
          lastTimestamp: sinceTs
        });
      }
      if (typeof document === 'undefined' || !document.hidden) {
        s.emit('userPresenceChange', { state: 'online' });
      }
    });

    s.on('sessionRestoreFailed', (data?: { reason?: string }) => {
      try {
        localStorage.removeItem('soqoor_session_token');
        localStorage.removeItem('soqoor_session_username');
        localStorage.removeItem('soqoor_current_user');
        sessionStorage.removeItem('soqoor_session_token');
        sessionStorage.removeItem('soqoor_session_username');
        sessionStorage.removeItem('soqoor_current_user');
      } catch {}
      stopSilentAudioKeepAlive();
      stopHeartbeatWorker();
      if (currentUserRef.current) {
        setCurrentUser(null);
        const reasonMsg = data?.reason || 'انتهت صلاحية الجلسة أو تم تسجيل الدخول من جهاز آخر.';
        setLoginError(reasonMsg);
        showToast(reasonMsg, 'error');
      }
    });

    s.on('loginError', (msg: string) => {
      sounds.playError();
      setLoginError(msg);
      setIsSubmitting(false);
      showToast(msg, 'error');
    });

    s.on('chatHistory', (history: Message[]) => {
      const limit = messageRetentionLimitsRef.current?.roomMaxMessages || 200;
      setMessages((history || []).slice(-limit));
    });

    s.on('message', (msg: Message) => {
      if (!msg) return;
      // Immediately remove sender from typing indicators upon receiving their message
      setTypingUsers((prev) => prev.filter((u) => u.username.toLowerCase() !== msg.username.toLowerCase()));
      setMessages((prev) => {
        if (msg.id && prev.some((m) => m && m.id === msg.id)) {
          return prev;
        }
        const limit = messageRetentionLimitsRef.current?.roomMaxMessages || 200;
        const updated = [...prev, msg];
        return pruneMessagesByRoomLimit(updated, limit);
      });
      // Ensure automatic scroll down when new message is received
      setTimeout(() => scrollToBottom(true), 30);
      const currentU = currentUserRef.current;
      if (currentU && msg.username !== currentU.username) {
        // If message is from an ignored user, do not play sound or toast
        try {
          const rawIgnored = localStorage.getItem('soqoor_ignored_users');
          const currentIgnored: string[] = rawIgnored ? JSON.parse(rawIgnored) : [];
          if (currentIgnored.includes(msg.username.toLowerCase().trim())) {
            return;
          }
        } catch {}

        if (msg.badge && msg.badge.includes('دخل الى')) {
          sounds.playMemberJoin();
        } else {
          // Check if message contains an @mention of the current user
          const isMentioned = Boolean(
            msg.text && (
              msg.text.includes(`@${currentU.username}`) ||
              msg.text.toLowerCase().includes(`@${currentU.username.toLowerCase()}`) ||
              new RegExp(`@\\s*${currentU.username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=[\\s,.:;!?،؟]|$)`, 'i').test(msg.text)
            )
          );

          if (isMentioned) {
            sounds.playMentionPing();
            if (!allNotificationsDisabledRef.current) {
              showToast(`قام @${msg.username} بالإشارة إليك في الدردشة! 🔔`, 'info');
              // Web Notifications API: Trigger notification even when tab is in background or screen is locked
              notifyMention(msg.username, msg.text, currentU.room || 'الغرفة العامة', {
                avatarUrl: msg.avatarUrl
              }).catch(() => {});
            }
          } else if (msg.badge && (msg.badge.includes('إشعار عام') || msg.badge.includes('إدارة') || msg.badge.includes('إعلان') || msg.badge.includes('تنبيه'))) {
            sounds.playGeneralAlertPing();
            if (typeof document !== 'undefined' && document.hidden && !allNotificationsDisabledRef.current) {
              sendBrowserNotification({
                title: `📢 إشعار عام من ${msg.username}`,
                body: msg.text || 'إشعار جديد في الغرفة',
                icon: msg.avatarUrl || falconIcon,
                tag: `alert-${msg.id}`
              }).catch(() => {});
            }
          } else {
            sounds.playMessagePing();
            if (typeof document !== 'undefined' && document.hidden && !allNotificationsDisabledRef.current) {
              sendBrowserNotification({
                title: `💬 ${msg.username} (${msg.room || currentU.room})`,
                body: msg.text || (msg.voiceNote ? '🎙️ رسالة صوتية' : '📎 مرفق وسائط'),
                icon: msg.avatarUrl || falconIcon,
                tag: `room-msg-${msg.room || 'general'}`
              }).catch(() => {});
            }
          }
        }
      }
    });

    s.on('generalAlert', ({ from, text }: { from: string; text: string }) => {
      sounds.playGeneralAlertPing();
      showToast(`📢 إشعار عام من [${from}]: ${text}`, 'info');
    });

    s.on('micSlotsUpdated', (slots: MicSlot[]) => {
      setMicSlots(slots);
      if (currentUserRef.current) {
        const mySlot = slots.find((slotItem) => slotItem.user && (slotItem.user.id === s.id || slotItem.user.username === currentUserRef.current?.username));
        const newSlotNum = mySlot ? mySlot.slotNumber : null;
        setCurrentUser((prev) => (prev ? { ...prev, micSlot: newSlotNum, isVoice: newSlotNum !== null } : null));
      }
    });

    s.on('roomUsers', ({ users: updatedUsers }: { users: User[] }) => {
      setRosterUsers(updatedUsers);
      if (currentUserRef.current) {
        const me = updatedUsers.find((u) => u.id === s.id);
        if (me) setCurrentUser(me);
      }
    });

    s.on('roomsUpdated', (rooms: ChatRoom[]) => {
      setRoomsList(rooms);
    });

    s.on('offlinePrivateMessages', (messages: PrivateMessage[]) => {
      if (!Array.isArray(messages) || messages.length === 0) return;
      setPrivateMessages((prev) => {
        const safe = Array.isArray(prev) ? prev : [];
        const existingIds = new Set(safe.map((m) => m?.id));
        const newOnes = messages.filter((m) => m && !existingIds.has(m.id));
        const limit = messageRetentionLimitsRef.current?.privateMaxMessages || 100;
        const updated = [...safe, ...newOnes];
        return updated.length > limit ? updated.slice(-limit) : updated;
      });
      sounds.playPrivateMessagePing();
      try {
        navigator.vibrate?.([30, 60, 30]);
      } catch {}
      showToast(`📬 لديك ${messages.length} رسالة خاصة جديدة في صندوق الوارد!`, 'info');
    });

    // Synchronize member personal state (ignored users, starred messages, friends) from MongoDB
    s.on('userMemberDataSync', ({ ignoredUsers: serverIgnored, starredMessages: serverStarred, friends: serverFriends }: { ignoredUsers?: string[]; starredMessages?: any[]; friends?: string[]; }) => {
      if (Array.isArray(serverIgnored)) {
        setIgnoredUsers(serverIgnored);
        try { localStorage.setItem('soqoor_ignored_users', JSON.stringify(serverIgnored)); } catch {}
      }
      if (Array.isArray(serverStarred)) {
        setStarredMessages(serverStarred);
        try { localStorage.setItem('soqoor_starred_messages', JSON.stringify(serverStarred)); } catch {}
      }
      if (Array.isArray(serverFriends)) {
        setUserFriends(serverFriends);
        try { localStorage.setItem('user_friends_list', JSON.stringify(serverFriends)); } catch {}
      }
    });

    // Receive Persistent Private Chat History from MongoDB
    s.on('privateChatHistory', ({ messages: historyMsgs }: { partnerUsername: string; messages: PrivateMessage[] }) => {
      if (!Array.isArray(historyMsgs) || historyMsgs.length === 0) return;
      setPrivateMessages((prev) => {
        const safe = Array.isArray(prev) ? prev : [];
        const existingIds = new Set(safe.map((m) => m?.id));
        const newOnes = historyMsgs.filter((m) => m && !existingIds.has(m.id));
        if (newOnes.length === 0) return prev;
        const merged = [...safe, ...newOnes].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        const limit = messageRetentionLimitsRef.current?.privateMaxMessages || 100;
        const finalMsgs = merged.length > limit ? merged.slice(-limit) : merged;
        try {
          sessionStorage.setItem('soqoor_private_messages', JSON.stringify(finalMsgs.slice(-300)));
        } catch {}
        return finalMsgs;
      });
    });

    s.on('newPrivateMessage', (pm: PrivateMessage) => {
      if (!pm) return;
      setPrivateMessages((prev) => {
        const safe = Array.isArray(prev) ? prev : [];
        if (pm.id && safe.some((m) => m && m.id === pm.id)) {
          return safe;
        }
        const limit = messageRetentionLimitsRef.current?.privateMaxMessages || 100;
        const updated = [...safe, pm];
        return updated.length > limit ? updated.slice(-limit) : updated;
      });
      
      const currentU = currentUserRef.current;
      const myUsername = (currentU?.username || '').trim().toLowerCase();
      const isFromMe = (myUsername && pm.fromUsername.trim().toLowerCase() === myUsername) || (pm.fromId === s.id);

      // If the PM is an incoming message from another user
      if (!isFromMe) {
        try {
          const rawIgnored = localStorage.getItem('soqoor_ignored_users');
          const currentIgnored: string[] = rawIgnored ? JSON.parse(rawIgnored) : [];
          if (currentIgnored.includes(pm.fromUsername.toLowerCase().trim())) {
            return;
          }
        } catch {}

        sounds.playPrivateMessagePing();
        try {
          navigator.vibrate?.([20, 50, 20]);
        } catch {}
        const otherUsername = pm.fromUsername;

        // Check if user is currently looking at this exact private conversation and window is visible
        const isDocumentVisible = typeof document !== 'undefined' && document.visibilityState === 'visible';
        const isCurrentlyViewingThisChat =
          isDocumentVisible &&
          activeDrawerRef.current === 'pm' &&
          selectedPmUserRef.current &&
          selectedPmUserRef.current.username.trim().toLowerCase() === otherUsername.trim().toLowerCase();

        if (isCurrentlyViewingThisChat) {
          s.emit('markPrivateMessagesRead', {
            partnerUsername: pm.fromUsername,
            partnerId: pm.fromId
          });
          setPrivateMessages((prev) => {
            const safe = Array.isArray(prev) ? prev : [];
            return safe.map((m) => (m && m.id === pm.id ? { ...m, status: 'read' as const, readAt: Date.now() } : m));
          });
        } else {
          setUnreadPerUser((prev) => {
            const next = {
              ...prev,
              [otherUsername]: (prev[otherUsername] || 0) + 1
            };
            try {
              sessionStorage.setItem('soqoor_unread_pm', JSON.stringify(next));
            } catch {}
            return next;
          });
          setNotificationCount((c) => c + 1);

          // Web Notifications API: Trigger background/lockscreen push notification
          if (!allNotificationsDisabledRef.current) {
            notifyPrivateMessage(pm.fromUsername, pm.text, {
              avatarUrl: pm.fromAvatar,
              onOpenPm: () => {
              const partner =
                rosterUsersRef.current.find((u) => u.username.toLowerCase() === pm.fromUsername.toLowerCase()) ||
                allConnectedUsersRef.current.find((u) => u.username.toLowerCase() === pm.fromUsername.toLowerCase()) || {
                  id: pm.fromId || `user-${pm.fromUsername}`,
                  username: pm.fromUsername,
                  room: 'الغرفة العامة',
                  avatarSeed: pm.fromUsername,
                  statusQuote: '',
                  flag: '🇸🇦',
                  role: 'member',
                  likes: 0,
                  points: 0,
                  isVoice: false,
                  micSlot: null,
                  isMuted: false,
                  isTextMuted: false,
                  isSpeaking: false,
                  joinedAt: Date.now()
                };
              setSelectedPmUser(partner as any);
              setActiveDrawer('pm');
            }
          }).catch(() => {});
          showToast(`رسالة خاصة جديدة من ${pm.fromUsername} 🔒`, 'info');
        }
      }
    }
  });

    s.on('monitoredWordsUpdated', (words: string[]) => {
      setMonitoredWordsList(words);
    });

    s.on('wallPosts', (posts: WallPost[]) => {
      const safePosts = (posts || []).slice(0, 100);
      setWallPosts(safePosts);
      if (activeDrawerRef.current === 'wall') {
        const now = Date.now();
        lastSeenWallTimeRef.current = now;
        try {
          localStorage.setItem('soqoor_last_seen_wall', String(now));
        } catch {}
        setUnreadWallCount(0);
      } else {
        const unread = safePosts.filter((p) => (p.timestamp || 0) > lastSeenWallTimeRef.current).length;
        setUnreadWallCount(unread);
      }
    });

    // Profile Visitors Real-time Events (زائري ملفي الشخصي)
    s.on('profileVisitorsUpdated', (visitors: ProfileVisitorRecord[]) => {
      setProfileVisitorsList(visitors || []);
    });

    s.on('profileVisitedAlert', ({ visitorUsername, visitorAvatar, visitCount }: { visitorUsername: string; visitorAvatar?: string; visitCount: number }) => {
      sounds.playGeneralAlertPing();
      showToast(`👁️ قام [${visitorUsername}] بزيارة ملفك الشخصي (${visitCount} مرات)`, 'info');
    });

    // Live Broadcast Video & Audio Real-time Events (بث لايف فيديو وصوت)
    s.on('liveBroadcastStarted', (broadcast: RoomLiveBroadcastState) => {
      setActiveRoomLiveBroadcast(broadcast);
      setLiveViewerCount(broadcast.viewersCount || 0);
      sounds.playGeneralAlertPing();
      showToast(`🔴 بدأ [${broadcast.broadcasterUsername}] بثاً لايف مباشر (فيديو وصوت) في الغرفة!`, 'info');
    });

    s.on('liveBroadcastEnded', ({ room, broadcasterUsername }: { room: string; broadcasterUsername: string }) => {
      setActiveRoomLiveBroadcast(null);
      setIsWatchingLive(false);
      setIsBroadcastingLive(false);
      setLiveRemoteVideoFrame(null);
      showToast(`انتهى البث المباشر لـ [${broadcasterUsername}] ⏹️`, 'info');
    });

    s.on('currentLiveBroadcast', (broadcast: RoomLiveBroadcastState | null) => {
      setActiveRoomLiveBroadcast(broadcast);
      if (broadcast) {
        setLiveViewerCount(broadcast.viewersCount || 0);
      }
    });

    s.on('liveViewerCountUpdated', ({ count }: { count: number }) => {
      setLiveViewerCount(count || 0);
    });

    s.on('liveVideoFrame', ({ frameData }: { frameData: string }) => {
      setLiveRemoteVideoFrame(frameData);
    });

    s.on('liveReactionReceived', ({ emoji }: { emoji: string }) => {
      triggerFloatingReaction(emoji);
    });

    s.on('monitorLogs', (logs: MonitorEvent[]) => {
      const safeLogs = (logs || []).map((l) => ({
        ...l,
        timestamp: l.timestamp || Date.now()
      }));
      setMonitorLogs(safeLogs);
    });


    s.on('systemAlert', (msg: string) => {
      sounds.playGeneralAlertPing();
      showToast(msg, 'info');
    });

    s.on('micRevokedByAdmin', ({ adminName }: { adminName: string }) => {
      sounds.playVoiceLeave();
      showToast(`تم سحب المايك منك بواسطة الإداري (${adminName}).`, 'info');
    });

    s.on('kickedByAdmin', ({ reason }: { reason: string }) => {
      sounds.playError();
      showToast(`تم طردك بواسطة إدارة حسان برو! السبب: ${reason}`, 'error');
      isForcedLoggedOutRef.current = true;
      setCurrentUser(null);
      stopSilentAudioKeepAlive();
      stopHeartbeatWorker();
      clearLocalSessionState(false);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    });

    s.on('forceLogout', ({ reason, message }: { reason?: string; message?: string }) => {
      isForcedLoggedOutRef.current = true;
      setCurrentUser(null);
      stopSilentAudioKeepAlive();
      stopHeartbeatWorker();
      clearLocalSessionState(false);
      sounds.playError();
      const alertMsg =
        message ||
        '⚠️ تم تسجيل الدخول إلى حسابك من متصفح أو جهاز آخر. تم إنهاء هذه الجلسة القديمة تلقائياً واعتماد الجلسة الجديدة.';
      setLoginError(alertMsg);
      setForcedLogoutInfo({
        show: true,
        message: alertMsg,
        timestamp: Date.now()
      });
      showToast(alertMsg, 'error');
    });

    s.on('forceMoveRoom', ({ room }: { room: string }) => {
      showToast(`تم نقلك إلى غرفة [${room}] بواسطة الإدارة.`, 'info');
    });

    s.on('userRoleUpdated', ({ role }: { role: 'admin' | 'super' | 'member' | 'guest' }) => {
      setCurrentUser((prev) => (prev ? { ...prev, role } : null));
      sounds.playSuccess();
      showToast(`تم تحديث رتبتك وصلاحياتك في النظام إلى: [${getRoleBadge(role).short}] 🎖️`, 'success');
    });

    // Private 1-on-1 Call Listeners (إشارات الاتصال الخاص)
    s.on('pmIncomingCall', (data: IncomingCallData) => {
      setIncomingCall(data);
      sounds.playGeneralAlertPing();
    });

    s.on('pmCallAccepted', ({ callId, responderId }: { callId: string; responderId?: string }) => {
      setActiveCall((prev) =>
        prev
          ? {
              ...prev,
              callId,
              acceptedByPeer: true,
              partner: responderId ? { ...prev.partner, id: responderId } : prev.partner
            }
          : null
      );
      showToast('تم قبول المكالمة الخاصة 🟢', 'success');
    });

    s.on('pmCallRejected', ({ reason }: { reason: string }) => {
      setActiveCall(null);
      setIncomingCall(null);
      showToast(reason || 'تم رفض المكالمة الخاصة', 'info');
    });

    s.on('pmCallEnded', () => {
      setActiveCall(null);
      setIncomingCall(null);
      showToast('انتهت المكالمة الخاصة 📞', 'info');
    });

    s.on('micError', (errMsg: string) => {
      showToast(errMsg || 'تعذر الصعود إلى المايك', 'error');
      sounds.playGeneralAlertPing();
    });

    s.on('pinnedTopic', (newTopic: string) => {
      if (typeof newTopic === 'string') {
        setPinnedTopic(newTopic);
      }
    });

    s.on('preferencesSaved', () => {
      showToast('تم حفظ التفضيلات بنجاح', 'success');
    });

    setSocket(s);

    // Setup visibility & phone screen unlock keep-alive synchronization
    const cleanupVisibility = setupVisibilityResync(s, (wasDisconnected) => {
      if (!wasDisconnected) {
        // Socket stayed connected in background and received all events live; no redundant reload needed!
        return;
      }
      const currentRoom = currentUserRef.current?.room || 'الغرفة العامة';
      if (s.connected) {
        const roomMsgs = messagesRef.current.filter(
          (m) => m && m.room && m.room.trim().toLowerCase() === currentRoom.trim().toLowerCase()
        );
        const lastMsg = roomMsgs[roomMsgs.length - 1];
        const sinceTs = lastMsg?.timestamp || roomEntryTimestampRef.current;
        if (sinceTs) {
          s.emit('syncRoomMessages', {
            roomId: currentRoom,
            lastTimestamp: sinceTs
          });
        }
      } else if (s.disconnected) {
        s.connect();
      }
    });

    // Audio Mesh setup
    const manager = new AudioMeshManager(s);
    audioManagerRef.current = manager;
    manager.onVolumeChange = (vol) => setMicVolume(vol);
    manager.onError = (err) => {
      sounds.playError();
      showToast(err, 'error');
    };
    setAudioManager(manager);

    return () => {
      stopHeartbeatWorker();
      window.clearTimeout(appearanceFallbackTimer);
      cleanupVisibility();
      audioManagerRef.current = null;
      manager.destroy();
      s.removeAllListeners();
      s.disconnect();
    };
  }, []);

  // Sync activeStoryViewer when storiesList is updated
  useEffect(() => {
    if (activeStoryViewer) {
      const updated = storiesList.find((s) => s.id === activeStoryViewer.id);
      if (updated) {
        setActiveStoryViewer(updated);
      } else {
        setActiveStoryViewer(null);
      }
    }
  }, [storiesList]);

  // Automatic Login directly into "الغرفة العامة"
  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!socket) return;

    if (!usernameInput.trim()) {
      setLoginError('يرجى إدخال اسم المستخدم');
      return;
    }

    // Reset any previous force-logout state so user can reclaim or start session
    isForcedLoggedOutRef.current = false;
    setForcedLogoutInfo(null);

    // Request Web Notification permission upon user login gesture (Native browser dialog trigger)
    if (isNotificationSupported() && Notification.permission === 'default') {
      requestNotificationPermission().then((perm) => {
        setNotificationPermission(perm);
        if (perm === 'granted') {
          showToast('تم تفعيل إشعارات المتصفح بنجاح 🔔', 'success');
        }
      }).catch(() => {});
    }

    // Auto-Await Socket Connection:
    // If the socket is still establishing its connection, wait smoothly and proceed automatically
    const activeSocket = socket;
    if (!activeSocket || !activeSocket.connected) {
      if (activeSocket) {
        activeSocket.connect();
      }
      setIsSubmitting(true);
      setLoginError(null);

      const isConnectedNow = await new Promise<boolean>((resolve) => {
        if (activeSocket?.connected) {
          resolve(true);
          return;
        }
        const timer = setTimeout(() => {
          resolve(Boolean(activeSocket?.connected));
        }, 3500);

        if (activeSocket) {
          activeSocket.once('connect', () => {
            clearTimeout(timer);
            resolve(true);
          });
        }
      });

      if (!isConnectedNow && (!activeSocket || !activeSocket.connected)) {
        setLoginError('جاري الاتصال بسيرفر الدردشة... يرجى الانتظار ثوانٍ قليلة حتى يكتمل الاتصال ثم إعادة المحاولة.');
        setIsSubmitting(false);
        return;
      }
    }

    setIsSubmitting(true);
    setLoginError(null);

    // Timeout safety net (12 seconds): allows cloud servers (e.g. Railway) enough time to process on mobile networks
    const loginTimeoutTimer = setTimeout(() => {
      setIsSubmitting((prev) => {
        if (prev) {
          setLoginError('انتهت مهلة استجابة السيرفر. يرجى التحقق من اتصال الإنترنت وإعادة المحاولة.');
          return false;
        }
        return false;
      });
    }, 12000);

    const clearTimer = () => clearTimeout(loginTimeoutTimer);
    socket.once('loginSuccess', clearTimer);
    socket.once('loginError', clearTimer);
    socket.once('disconnect', () => {
      clearTimer();
      setIsSubmitting(false);
    });

    const defaultQuote = activeTab === 'visitor' ? 'زائر' : undefined;
    const clientFingerprint = generateDeviceFingerprint().fingerprintId;

    if (activeTab === 'member' || activeTab === 'register') {
      try {
        localStorage.setItem('soqoor_last_member_username', usernameInput.trim());
      } catch {}
    }

    socket.emit('joinRoom', {
      username: usernameInput.trim(),
      room: 'الغرفة العامة', // Direct automatic entry to default room
      loginType: activeTab,
      password: passwordInput,
      flag: detectedFlag,
      statusQuote: defaultQuote,
      deviceFingerprint: clientFingerprint,
      isGhost: Boolean(isGhostLogin && canUseGhostLogin),
      isIncognito: isIncognitoClient
    });
  };

  // Exit chat room and completely clear previous conversations session (Explicit Logout)
  const handleExitChat = () => {
    isForcedLoggedOutRef.current = false;
    setForcedLogoutInfo(null);
    if (audioManager) {
      audioManager.dropMicSlot();
      audioManager.leaveVoice();
    }
    handleStopLiveBroadcast();
    const token = localStorage.getItem('soqoor_session_token');
    socket?.emit('explicitLogout', { sessionToken: token || undefined });
    stopSilentAudioKeepAlive();
    stopHeartbeatWorker();
    clearLocalSessionState(true);
    setCurrentUser(null);
    notifyTyping(false);
    setTypingUsers([]);
    setMessages([]);
    setPrivateMessages([]);
    setUnreadPerUser({});
    setActiveDrawer('none');
    const savedLastUser = localStorage.getItem('soqoor_last_member_username') || '';
    setUsernameInput(savedLastUser);
    setPasswordInput('');
    setActiveTab('member');
    showToast('تم تسجيل الخروج بنجاح وإنهاء جلستك 🧹', 'info');
  };

  // Leave current room only without logging out of the chat app (الخروج من الغرفة الحالية فقط)
  const handleLeaveCurrentRoom = () => {
    if (audioManager) audioManager.dropMicSlot();
    handleStopLiveBroadcast();
    notifyTyping(false);
    setTypingUsers([]);
    const curRoom = currentUser?.room || 'الغرفة العامة';
    socket?.emit('leaveRoom', { room: curRoom });
    setCurrentUser((prev) => (prev ? { ...prev, room: 'خارج الغرف', micSlot: null, isVoice: false } : null));
    setRosterUsers([]);
    setAllConnectedUsers((prev) => {
      if (!currentUser) return prev;
      const lowerSelf = currentUser.username.toLowerCase();
      const updatedUser: User = {
        ...currentUser,
        room: 'خارج الغرف',
        micSlot: null,
        isVoice: false,
        presenceState: currentUser.presenceState || 'online'
      };
      const exists = prev.some((u) => u.username.toLowerCase() === lowerSelf);
      if (exists) {
        return prev.map((u) => (u.username.toLowerCase() === lowerSelf ? updatedUser : u));
      }
      return [updatedUser, ...prev];
    });
    setMessages([]);
    setActiveDrawer('rooms');
    showToast('تم الخروج من الغرفة والرجوع لقائمة الغرف', 'info');
  };

  // Delete message in public room
  const handleDeleteChatMessage = (messageId: string) => {
    socket?.emit('deleteChatMessage', { messageId });
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    showToast('تم حذف الرسالة 🗑️', 'info');
  };

  // Report message to room administration (إبلاغ عن رسالة مخالفة للإدارة)
  const handleReportChatMessage = (msg: Message) => {
    if (!currentUser) {
      showToast('يجب تسجيل الدخول للإبلاغ عن الرسائل', 'error');
      return;
    }
    openAppConfirm(
      'إبلاغ عن رسالة',
      `هل ترغب في رفع بلاغ لإدارة الروم بخصوص رسالة @${msg.username}؟\nالمحتوى: "${msg.text ? msg.text.substring(0, 50) : 'مرفق وسائط'}"`,
      () => {
        socket?.emit('reportChatMessage', {
          messageId: msg.id,
          reportedUser: msg.username,
          text: msg.text,
          reason: 'مخالفة لقواعد وآداب الشات'
        });
        showToast(`تم رفع البلاغ بنجاح إلى إدارة الروم لمراجعة رسالة @${msg.username} 🚩`, 'success');
      }
    );
  };

  // Edit message in public room
  const handleSaveEditChatMessage = (messageId: string, newText: string) => {
    if (!newText.trim()) return;
    socket?.emit('editChatMessage', { messageId, newText: newText.trim() });
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, text: newText.trim(), isEdited: true } : m))
    );
    setEditingMsgId(null);
    setEditingMsgText('');
    showToast('تم تعديل الرسالة بنجاح ✏️', 'info');
  };

  // Delete private message
  const handleDeletePrivateMessage = (messageId: string) => {
    if (selectedPmUser) {
      socket?.emit('deletePrivateMessage', {
        messageId,
        partnerId: selectedPmUser.id,
        partnerUsername: selectedPmUser.username
      });
    }
    setPrivateMessages((prev) => prev.filter((pm) => pm.id !== messageId));
    showToast('تم حذف الرسالة الخاصة 🗑️', 'info');
  };

  // Edit private message
  const handleSaveEditPrivateMessage = (messageId: string, newText: string) => {
    if (!newText.trim()) return;
    if (selectedPmUser) {
      socket?.emit('editPrivateMessage', {
        messageId,
        newText: newText.trim(),
        partnerId: selectedPmUser.id,
        partnerUsername: selectedPmUser.username
      });
    }
    setPrivateMessages((prev) =>
      prev.map((pm) => (pm.id === messageId ? { ...pm, text: newText.trim(), isEdited: true } : pm))
    );
    setEditingPmId(null);
    setEditingPmText('');
    showToast('تم تعديل الرسالة الخاصة بنجاح ✏️', 'info');
  };

  // Delete wall post
  const handleDeleteWallPost = (postId: string) => {
    socket?.emit('deleteWallPost', { postId });
    setWallPosts((prev) => prev.filter((p) => p.id !== postId));
    showToast('تم حذف المنشور من الحائط 🗑️', 'info');
  };

  // Edit wall post (تعديل منشور الحائط مع توسيع الاختصارات)
  const handleSaveEditWallPost = (postId: string, newText: string) => {
    if (!newText.trim()) return;
    const expanded = expandClientShortcuts(newText.trim(), shortcuts);
    socket?.emit('editWallPost', { postId, newText: expanded });
    setWallPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, text: expanded, isEdited: true } : p))
    );
    setEditingWallPostId(null);
    setEditingWallPostText('');
    showToast('تم تعديل المنشور بنجاح ✏️', 'info');
  };

  // Delete wall comment
  const handleDeleteWallComment = (postId: string, commentId: string) => {
    socket?.emit('deleteWallComment', { postId, commentId });
    setWallPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post;
        const updated = (post.comments || []).filter((c) => c.id !== commentId);
        return {
          ...post,
          comments: updated,
          commentsCount: updated.length
        };
      })
    );
    showToast('تم حذف التعليق بنجاح 🗑️', 'info');
  };

  // Add comment on wall post (التعليق على منشور الحائط مع توسيع الاختصارات)
  const handleAddWallComment = (postId: string, text: string) => {
    if (!text.trim()) return;
    const expanded = expandClientShortcuts(text.trim(), shortcuts);
    socket?.emit('addWallComment', { postId, text: expanded });
    setWallCommentInput('');
  };

  // Reply to admin warning with manual text
  const handleSendWarningReply = () => {
    if (!receivedOfficialWarning || !warningReplyInput.trim() || !socket) return;
    socket.emit('replyToWarning', {
      toUsername: receivedOfficialWarning.from,
      replyText: warningReplyInput.trim()
    });
    setWarningReplyInput('');
    setReceivedOfficialWarning(null);
    showToast('تم إرسال ردك وتوضيحك للإدارة بنجاح ✉️', 'success');
  };

  // Confirm password for protected room entry (verified server-side)
  const handleConfirmRoomPassword = () => {
    if (!passwordPromptRoom || !currentUser || !socket) return;
    const trimmed = roomPasswordInput.trim();
    if (!trimmed) {
      sounds.playError();
      setRoomPasswordError('يرجى إدخال كلمة مرور الغرفة');
      return;
    }
    socket.emit('verifyRoomPassword', { roomId: passwordPromptRoom.id, password: trimmed }, (res: { valid: boolean }) => {
      if (!res?.valid) {
        sounds.playError();
        setRoomPasswordError('كلمة المرور غير صحيحة، يرجى إعادة المحاولة');
        return;
      }
      sounds.playMemberJoin();
      setMessages([]);
      socket.emit('joinRoom', {
        username: currentUser.username,
        room: passwordPromptRoom.id,
        roomPassword: trimmed,
        flag: currentUser.flag,
        statusQuote: currentUser.statusQuote,
        isGhost: currentUser.isGhost
      });
      setPasswordPromptRoom(null);
      setRoomPasswordInput('');
      setRoomPasswordError(null);
      setActiveDrawer('none');
      showToast(`تم الدخول إلى [${passwordPromptRoom.name}] بنجاح 🚀`, 'success');
    });
  };

  // Direct media download helper
  const handleDownloadMedia = async (url: string, filename?: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename || `media-${Date.now()}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      showToast('تم بدء تحميل الوسائط بنجاح ⬇️', 'success');
    } catch {
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Send Public Message (Text, Media, Sticker, Voice Note, and Reply)
  const handleSendMessage = (
    e?: React.FormEvent,
    customMedia?: string,
    customType?: 'image' | 'video' | 'sticker' | 'audio',
    customVoiceNote?: VoiceNoteData
  ) => {
    if (e) e.preventDefault();
    if (!socket || !currentUser) return;

    let textToSend = textInput.trim();
    if (!textToSend && !customMedia && !customVoiceNote) return;

    if (isPoetryMode && textToSend.includes('|') && !textToSend.startsWith('📜')) {
      textToSend = '📜 ' + textToSend;
    }

    // Automatic Chat Shortcut Expansion (استبدال الاختصارات تلقائياً بالجملة المحددة)
    textToSend = expandClientShortcuts(textToSend, shortcuts);

    const messagePayload = {
      text: textToSend,
      mediaUrl: customMedia,
      mediaType: customType,
      voiceNote: customVoiceNote,
      replyTo: replyingTo || undefined
    };

    // If socket is momentarily disconnected or in background, enqueue message for immediate dispatch upon reconnection
    if (!socket || !isConnected || !socket.connected) {
      pendingMessagesQueueRef.current.push({
        event: 'chatMessage',
        payload: messagePayload
      });
      showToast('الشبكة منقطعة مؤقتاً، تم حفظ الرسالة وسيتم إرسالها فور عودة الاتصال ⏳', 'info');
      notifyTyping(false);
      setTextInput('');
      setReplyingTo(null);
      setIsRecordingVoice(false);
      setShowEmojiPicker(false);
      setShowMediaPicker(false);
      setShowPlusMenu(false);
      return;
    }

    socket.emit('chatMessage', messagePayload);
    try {
      navigator.vibrate?.(12);
    } catch {}

    notifyTyping(false);
    setTextInput('');
    setReplyingTo(null);
    setIsRecordingVoice(false);
    setShowEmojiPicker(false);
    setShowMediaPicker(false);
    setShowPlusMenu(false);
    inputRef.current?.focus();
    setTimeout(() => scrollToBottom(true), 40);
  };

  // Text Formatting Toolbar Helper
  const handleInsertFormat = (prefix: string, suffix: string = '') => {
    const input = inputRef.current;
    if (!input) {
      setTextInput((prev) => prev + prefix + 'نص' + suffix);
      return;
    }
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const current = textInput;
    const selected = current.substring(start, end);
    const replacement = prefix + (selected || 'نص') + suffix;
    const nextText = current.substring(0, start) + replacement + current.substring(end);
    setTextInput(nextText);
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + prefix.length, start + prefix.length + (selected || 'نص').length);
    }, 50);
  };

  // Chat Message Reaction Handler
  const handleReactToMessage = (messageId: string, emoji: string) => {
    if (!socket) return;
    socket.emit('reactChatMessage', { messageId, emoji });
  };

  // Profile Like Handler (مرة واحدة بالدقيقة لكل عضو - يعطيه لايك واحد +1)
  const handleLikeUserProfile = (targetUsername: string) => {
    if (!socket || !targetUsername) return;
    const now = Date.now();
    const lastTime = userLikeCooldownsRef.current[targetUsername] || 0;
    if (now - lastTime < 60000) {
      const remainingSec = Math.ceil((60000 - (now - lastTime)) / 1000);
      showToast(`⏳ يمكنك إعطاء لايك لهذا العضو مرة واحدة كل دقيقة (متبقي ${remainingSec} ثانية)`, 'info');
      return;
    }
    userLikeCooldownsRef.current[targetUsername] = now;
    socket.emit('likeUserProfile', { targetUsername });
    confetti({ particleCount: 40, spread: 60 });
    sounds.playCrownFanfare();
  };

  // Pin & Unpin Room Message
  const handlePinChatMessage = (messageId: string) => {
    if (!socket) return;
    socket.emit('pinRoomMessage', { messageId });
    showToast('تم إرسال طلب تثبيت الرسالة في الغرفة 📌', 'info');
  };

  const handleUnpinChatMessage = () => {
    if (!socket) return;
    socket.emit('pinRoomMessage', { unpin: true });
    showToast('تم فك تثبيت الرسالة ✕', 'info');
  };

  // Points Reward & Game Win Broadcast Handlers
  const handleAddPointsReward = (amount: number, reason: string) => {
    if (!socket || !currentUser) return;
    socket.emit('addPointsReward', { amount, reason });
  };

  const handleBroadcastGameWin = (gameName: string, pointsWon: number) => {
    if (!socket || !currentUser) return;
    socket.emit('broadcastGameWin', { gameName, pointsWon });
  };

  // Private 1-on-1 Call Handlers (مكالمات الخاص الصوتية والمرئية)
  const handleStartPmCall = (callType: 'audio' | 'video') => {
    if (!socket || !selectedPmUser || !currentUser) return;
    socket.emit('pmCallOffer', {
      toId: selectedPmUser.id,
      callType
    });
    setActiveCall({
      callId: `call-${Date.now()}`,
      partner: {
        id: selectedPmUser.id,
        username: selectedPmUser.username,
        avatarUrl: selectedPmUser.avatarUrl,
        flag: selectedPmUser.flag
      },
      callType,
      isInitiator: true
    });
    showToast(`جاري بدء اتصال مشفر (E2EE 🔒) بـ ${selectedPmUser.username} (${callType === 'video' ? 'فيديو' : 'صوت'})... 📞`, 'info');
  };

  const handleAcceptIncomingCall = () => {
    if (!socket || !incomingCall) return;
    socket.emit('pmCallAnswer', {
      callId: incomingCall.callId,
      toId: incomingCall.fromUser.id,
      accepted: true
    });
    setActiveCall({
      callId: incomingCall.callId,
      partner: incomingCall.fromUser,
      callType: incomingCall.callType,
      isInitiator: false,
      acceptedByPeer: true
    });
    showToast(`تم قبول المكالمة المشفرة طرف-إلى-طرف (E2EE 🔒) مع ${incomingCall.fromUser.username}... 📞`, 'success');
    setIncomingCall(null);
  };

  const handleRejectIncomingCall = () => {
    if (!socket || !incomingCall) return;
    socket.emit('pmCallAnswer', {
      callId: incomingCall.callId,
      toId: incomingCall.fromUser.id,
      accepted: false
    });
    setIncomingCall(null);
    showToast('تم رفض المكالمة الواردة', 'info');
  };

  const handleEndActiveCall = (duration: number) => {
    if (!socket || !activeCall) return;
    socket.emit('pmCallEnd', {
      toId: activeCall.partner.id,
      duration,
      callType: activeCall.callType
    });
    setActiveCall(null);
    showToast('تم إنهاء المكالمة الخاصة', 'info');
  };

  // Send Preset Sticker
  const handleSendSticker = (sticker: string) => {
    handleSendMessage(undefined, sticker, 'sticker');
  };

  // Broadcast General Alert (إرسال إشعار عام للغرفة)
  const handleSendBroadcastAlert = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!socket || !currentUser) return;
    const text = broadcastAlertText.trim();
    if (!text) return;

    socket.emit('broadcastAlert', { text });
    setBroadcastAlertText('');
    setShowBroadcastModal(false);
    showToast('تم إرسال الإشعار والتنبيه العام للغرفة 📢', 'success');
  };

  // Unified Appearance & Styling Preference Updaters (حفظ دائم واستمرارية أسبوعية حتى بعد الخروج والعودة)
  const handleUpdateTheme = (themeId: string) => {
    setActiveTheme(themeId);
    try {
      localStorage.setItem('soqoor_theme', themeId);
      localStorage.setItem('soqoor_theme_user_set', 'true');
    } catch {}

    setCurrentUser((prev) => (prev ? { ...prev, theme: themeId } : null));

    // Broadcast globally to all chat members if Supreme, Admin or Super
    const canBroadcast =
      currentUser?.role === 'hassan' ||
      currentUser?.role === 'admin' ||
      currentUser?.role === 'super' ||
      getRoleLevel(currentUser?.role) >= 75;

    if (canBroadcast) {
      socket?.emit('updateGlobalAppearance', { theme: themeId });
      showToast('تم تطبيق الثيم وتعميمه على كافة المتواجدين والغرف بنجاح! 🎨📢', 'success');
    } else {
      showToast('تم تطبيق الثيم الجديد بنجاح! 🎨', 'success');
    }
  };

  const handleUpdateFontFamily = (fontId: string) => {
    setFontFamily(fontId);
    try {
      localStorage.setItem('soqoor_font', fontId);
      localStorage.setItem('soqoor_font_family', fontId);
      localStorage.setItem('soqoor_font_user_set', 'true');
    } catch {}

    const canBroadcast =
      currentUser?.role === 'hassan' ||
      currentUser?.role === 'admin' ||
      currentUser?.role === 'super';

    if (canBroadcast) {
      socket?.emit('updateGlobalAppearance', { fontFamily: fontId });
      showToast('تم تعميم نوع الخط على كافة المتواجدين والغرف بنجاح! 🖋️📢', 'success');
    } else {
      showToast('تم تغيير نوع الخط بنجاح! 🖋️', 'success');
    }
  };

  const handleUpdateFontSize = (size: 'sm' | 'base' | 'lg' | 'xl') => {
    setChatFontSize(size);
    try {
      localStorage.setItem('soqoor_chat_font_size', size);
    } catch {}
    socket?.emit('updateUserPreferences', { fontSize: size });
  };

  const handleUpdateFontWeight = (weight: 'thin' | 'normal' | 'default' | 'bold' | 'black') => {
    setChatFontWeight(weight);
    try {
      localStorage.setItem('soqoor_chat_font_weight', weight);
    } catch {}
    if (currentUser?.role === 'hassan' || currentUser?.role === 'admin' || currentUser?.role === 'super') {
      socket?.emit('updateGlobalAppearance', { fontWeight: weight });
    }
  };

  const handleUpdateWallpaper = (wallpaperId: string) => {
    setActiveWallpaper(wallpaperId);
    try {
      localStorage.setItem('soqoor_wallpaper', wallpaperId);
      localStorage.setItem('soqoor_wallpaper_user_set', 'true');
    } catch {}

    const canBroadcast =
      currentUser?.role === 'hassan' ||
      currentUser?.role === 'admin' ||
      currentUser?.role === 'super';

    if (canBroadcast) {
      socket?.emit('updateGlobalAppearance', { wallpaper: wallpaperId });
      showToast('تم تعميم الخلفية على كافة المتواجدين والغرف بنجاح! 🖼️📢', 'success');
    } else {
      showToast('تم تغيير خلفية الشات بنجاح! 🖼️', 'success');
    }
  };

  const handleUpdateBubbleStyle = (styleId: string) => {
    setBubbleStyle(styleId);
    try {
      localStorage.setItem('soqoor_bubble_style', styleId);
      localStorage.setItem('soqoor_bubble_user_set', 'true');
    } catch {}

    const canBroadcast =
      currentUser?.role === 'hassan' ||
      currentUser?.role === 'admin' ||
      currentUser?.role === 'super';

    if (canBroadcast) {
      socket?.emit('updateGlobalAppearance', { bubbleStyle: styleId });
      showToast('تم تعميم شكل الفقاعات على كافة المتواجدين والغرف بنجاح! 💬📢', 'success');
    } else {
      showToast('تم تغيير شكل الفقاعات بنجاح! 💬', 'success');
    }
  };

  const handleUpdateNameColor = (color: string) => {
    setSettingNameColor(color);
    try {
      localStorage.setItem('soqoor_name_color', color);
    } catch {}
    if (currentUser) {
      setCurrentUser((prev) => (prev ? { ...prev, nameColor: color } : null));
    }
    socket?.emit('updateUserStyle', { nameColor: color });
    socket?.emit('updateUserPreferences', { nameColor: color });
  };

  const handleUpdateTextColor = (color: string) => {
    setSettingTextColor(color);
    try {
      localStorage.setItem('soqoor_text_color', color);
    } catch {}
    if (currentUser) {
      setCurrentUser((prev) => (prev ? { ...prev, textColor: color } : null));
    }
    socket?.emit('updateUserStyle', { textColor: color });
    socket?.emit('updateUserPreferences', { textColor: color });
  };

  const handleUpdateNameGradient = (grad: string) => {
    setNameGradient(grad);
    try {
      localStorage.setItem('soqoor_name_gradient', grad);
    } catch {}
    if (currentUser) {
      setCurrentUser((prev) => (prev ? { ...prev, nameGradient: grad } : null));
    }
    socket?.emit('updateUserStyle', { nameGradient: grad });
    socket?.emit('updateUserPreferences', { nameGradient: grad });
  };

  // Apply Global Appearance (تعميم الثيم والخط على كافة الأعضاء والشات)
  const handleApplyGlobalAppearance = ({
    theme,
    fontFamily: font,
    fontWeight: weight,
    wallpaper: wall,
    bubbleStyle: bubble
  }: {
    theme?: string;
    fontFamily?: string;
    fontWeight?: 'thin' | 'normal' | 'default' | 'bold' | 'black';
    wallpaper?: string;
    bubbleStyle?: string;
  }) => {
    const targetTheme = theme || activeTheme;
    const targetFont = font || fontFamily;
    const targetWeight = weight || chatFontWeight;
    const targetWall = wall || activeWallpaper;
    const targetBubble = bubble || bubbleStyle;

    setActiveTheme(targetTheme);
    setFontFamily(targetFont);
    setChatFontWeight(targetWeight);
    setActiveWallpaper(targetWall);
    setBubbleStyle(targetBubble);
    try {
      localStorage.setItem('soqoor_theme', targetTheme);
      localStorage.setItem('soqoor_font', targetFont);
      localStorage.setItem('soqoor_font_family', targetFont);
      localStorage.setItem('soqoor_chat_font_weight', targetWeight);
      localStorage.setItem('soqoor_wallpaper', targetWall);
      localStorage.setItem('soqoor_bubble_style', targetBubble);
    } catch {}
    if (socket) {
      socket.emit('updateGlobalAppearance', {
        theme: targetTheme,
        fontFamily: targetFont,
        fontWeight: targetWeight,
        wallpaper: targetWall,
        bubbleStyle: targetBubble
      });
    }
  };

  // Mention Suggestions handling for Chat Input & Real-time typing notification
  const handleTextInputChange = (val: string) => {
    setTextInput(val);
    if (val.trim().length > 0) {
      notifyTyping(true);
    } else {
      notifyTyping(false);
    }
    const cursor = inputRef.current?.selectionStart ?? val.length;
    const textBeforeCursor = val.slice(0, cursor);
    const atMatch = textBeforeCursor.match(/@([^\s]*)$/);
    if (atMatch) {
      const query = atMatch[1].toLowerCase();
      const filtered = rosterUsers.filter(
        (u) => u.username !== currentUser?.username && u.username.toLowerCase().includes(query)
      );
      setMentionSuggestions(filtered.slice(0, 6));
      setShowMentionMenu(filtered.length > 0);
    } else {
      setShowMentionMenu(false);
    }
  };

  const insertMention = (targetUsername: string) => {
    const cursor = inputRef.current?.selectionStart ?? textInput.length;
    const textBeforeCursor = textInput.slice(0, cursor);
    const textAfterCursor = textInput.slice(cursor);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    if (atIndex !== -1) {
      const newText = textBeforeCursor.slice(0, atIndex) + `@${targetUsername} ` + textAfterCursor;
      setTextInput(newText);
    } else {
      setTextInput((prev) => (prev ? `${prev} @${targetUsername} ` : `@${targetUsername} `));
    }
    setShowMentionMenu(false);
    inputRef.current?.focus();
  };

  // Sequential Tone Demo (General Alert -> Private Message -> Mention)
  const handlePlayToneSequence = () => {
    if (testingSequence) return;
    setTestingSequence(true);
    showToast('1. استماع لإشعار عام 📢', 'info');
    setActivePlayingSound('alert');
    sounds.previewAlertSound(selectedAlertSound);

    setTimeout(() => {
      showToast('2. استماع لرسالة خاصة 💬', 'info');
      setActivePlayingSound('private');
      sounds.previewPrivateSound(selectedPrivateSound);

      setTimeout(() => {
        showToast('3. استماع لمنشن وإشارة @ بالاسم 🔔', 'info');
        setActivePlayingSound('mention');
        sounds.previewMentionSound(selectedMentionSound);

        setTimeout(() => {
          setActivePlayingSound(null);
          setTestingSequence(false);
          showToast('اكتمل اختبار النغمات الثلاث بنجاح ✔️', 'success');
        }, 800);
      }, 850);
    }, 850);
  };

  // Take Mic slot (1 to 5)
  const handleTakeMic = async (slotNumber: number) => {
    if (!audioManager || !socket || !currentUser) return;

    const currentSlot = micSlots.find((s) => s.slotNumber === slotNumber);
    if (currentSlot?.user) {
      if (currentSlot.user.id === currentUser.id) {
        const isMuted = audioManager.toggleMute();
        sounds.playToggleMute(isMuted);
        showToast(isMuted ? 'تم كتم المايك الخاص بك 🔇' : 'تم تفعيل المايك 🎙️', 'info');
      } else {
        // If Admin/Super/Supreme clicks occupied mic: offer option to Pull Mic!
        if (currentUser.role === 'hassan' || currentUser.role === 'admin' || currentUser.role === 'super' || getRoleLevel(currentUser.role) >= 75) {
          const occupiedUsername = currentSlot.user.username;
          openAppConfirm(
            'سحب المايك',
            `المايك مأخوذ من قبل [${occupiedUsername}]. هل تريد سحب المايك منه كإداري؟`,
            () => {
              socket.emit('adminAction', {
                action: 'pullMic',
                targetUsername: occupiedUsername
              });
            }
          );
        } else {
          showToast(`المايك رقم ${slotNumber} مأخوذ من قبل ${currentSlot.user.username}`, 'info');
        }
      }
      return;
    }

    const ok = await audioManager.takeMicSlot(slotNumber);
    if (ok) {
      mediaSessionManager.enterCallMode();
      sounds.playVoiceJoin();
      showToast(`صعدت الآن إلى المايك رقم (${slotNumber}) 🎙️`, 'success');
      confetti({ particleCount: 30, spread: 50 });
    }
  };

  // Drop Mic
  const handleDropMic = () => {
    if (!socket || !currentUser) return;
    socket.emit('dropMic');
    if (audioManager) {
      audioManager.dropMicSlot();
    }
    mediaSessionManager.exitCallMode();
    setCurrentUser((prev) => (prev ? { ...prev, micSlot: null, isVoice: false } : null));
    sounds.playVoiceLeave();
    showToast('تم النزول من المايك بنجاح 👋', 'info');
  };

  // Toggle Room Speaker
  const handleToggleSpeaker = () => {
    if (!audioManager) return;
    const deaf = audioManager.toggleDeafen();
    setIsSpeakerMuted(deaf);
    sounds.playToggleMute(deaf);
    showToast(deaf ? 'تم كتم صوت الغرفة بالكامل 🔇' : 'تم تشغيل صوت الغرفة 🔊', 'info');
  };

  // Admin Actions Dispatcher with Permission Checks
  const handleAdminAction = (action: string, targetUsername: string, value?: any, reason?: string) => {
    if (!socket || !currentUser) return;

    const targetUser = rosterUsers.find((u) => u.username === targetUsername);
    const check = canActorModerate(currentUser, targetUser || null, action);
    if (!check.allowed) {
      sounds.playError();
      showToast(check.reason || 'ليست لديك الصلاحية لتنفيذ هذا الإجراء.', 'error');
      return;
    }

    socket.emit('adminAction', {
      action,
      targetUsername,
      value,
      reason
    });
  };

  // Open Profile Modal for any user (Screenshots 10 & 11)
  const openUserProfile = (user: User) => {
    const isMe = Boolean(currentUser && user.username.trim().toLowerCase() === currentUser.username.trim().toLowerCase());
    const liveConnected = allConnectedUsers.find((u) => u.username.trim().toLowerCase() === user.username.trim().toLowerCase());
    const baseUser = liveConnected ? { ...user, ...liveConnected } : user;
    const targetUser: User = isMe && currentUser ? { ...baseUser, ...currentUser, room: currentUser.room } : baseUser;
    setProfileTargetUser(targetUser);
    setProfileEditName(targetUser.username);
    setProfileEditLikes(String(targetUser.likes));
    setProfileEditQuote(targetUser.statusQuote || '');
    setProfileEditPoints(String(targetUser.points || 1000000));
    setProfileEditRole(targetUser.role || 'member');
    setProfileMoveRoom((targetUser.room && targetUser.room !== 'خارج الغرف') ? targetUser.room : (roomsList[0]?.id || 'الغرفة العامة'));
    setActiveDrawer('profile');
    if (currentUser && targetUser.username !== currentUser.username) {
      socket?.emit('recordProfileVisit', { targetUsername: targetUser.username });
    }
  };

  // High-performance O(1) indexed maps for instant avatar and banner lookups (prevents UI lagging & typing freezes)
  const userBannerMap = useMemo(() => {
    const map = new Map<string, string>();
    for (let i = 0; i < allRegisteredMembers.length; i++) {
      const m = allRegisteredMembers[i];
      if (m.nameBannerUrl) map.set(m.username.trim().toLowerCase(), m.nameBannerUrl);
    }
    for (let i = 0; i < allConnectedUsers.length; i++) {
      const u = allConnectedUsers[i];
      if (u.nameBannerUrl) map.set(u.username.trim().toLowerCase(), u.nameBannerUrl);
    }
    for (let i = 0; i < rosterUsers.length; i++) {
      const u = rosterUsers[i];
      if (u.nameBannerUrl) map.set(u.username.trim().toLowerCase(), u.nameBannerUrl);
    }
    if (currentUser?.nameBannerUrl) {
      map.set(currentUser.username.trim().toLowerCase(), currentUser.nameBannerUrl);
    }
    return map;
  }, [allRegisteredMembers, allConnectedUsers, rosterUsers, currentUser?.nameBannerUrl, currentUser?.username]);

  const userAvatarMap = useMemo(() => {
    const map = new Map<string, string>();
    for (let i = 0; i < allRegisteredMembers.length; i++) {
      const m = allRegisteredMembers[i];
      if (m.avatarUrl) map.set(m.username.trim().toLowerCase(), m.avatarUrl);
    }
    for (let i = 0; i < allConnectedUsers.length; i++) {
      const u = allConnectedUsers[i];
      if (u.avatarUrl) map.set(u.username.trim().toLowerCase(), u.avatarUrl);
    }
    for (let i = 0; i < rosterUsers.length; i++) {
      const u = rosterUsers[i];
      if (u.avatarUrl) map.set(u.username.trim().toLowerCase(), u.avatarUrl);
    }
    if (currentUser?.avatarUrl) {
      map.set(currentUser.username.trim().toLowerCase(), currentUser.avatarUrl);
    }
    return map;
  }, [allRegisteredMembers, allConnectedUsers, rosterUsers, currentUser?.avatarUrl, currentUser?.username]);

  // Helper to resolve a member's banner anywhere across the app (O(1) instant lookup)
  const getUserBanner = (username?: string, fallbackUrl?: string): string | undefined => {
    if (!username) return fallbackUrl;
    const clean = username.trim().toLowerCase();
    return userBannerMap.get(clean) || fallbackUrl || undefined;
  };

  // Helper to resolve a member's avatar photo anywhere across the app (O(1) instant lookup)
  const getUserAvatar = (username?: string, fallbackUrl?: string): string => {
    if (!username) return fallbackUrl || falconIcon;
    const clean = username.trim().toLowerCase();
    return userAvatarMap.get(clean) || fallbackUrl || falconIcon;
  };

  // Open profile modal by username directly
  const openUserProfileByName = (username: string) => {
    if (!username) return;
    const clean = username.trim().toLowerCase();
    if (currentUser && currentUser.username.trim().toLowerCase() === clean) {
      openUserProfile(currentUser);
      return;
    }
    const inRoster = rosterUsers.find((u) => u.username.trim().toLowerCase() === clean);
    if (inRoster) {
      openUserProfile(inRoster);
      return;
    }
    const inAll = allConnectedUsers.find((u) => u.username.trim().toLowerCase() === clean);
    if (inAll) {
      openUserProfile(inAll);
      return;
    }
    const inReg = allRegisteredMembers.find((m) => m.username.trim().toLowerCase() === clean);
    if (inReg) {
      const simUser: User = {
        id: `reg-${inReg.username}`,
        username: inReg.username,
        room: inReg.currentRoom || 'خارج الغرف',
        avatarSeed: inReg.username,
        avatarUrl: inReg.avatarUrl,
        nameBannerUrl: inReg.nameBannerUrl,
        statusQuote: inReg.statusQuote || '',
        flag: inReg.flag || '🇸🇦',
        role: (inReg.role as any) || 'member',
        likes: inReg.likes || 0,
        points: inReg.points || 0,
        giftBadges: inReg.giftBadges || [],
        isVoice: false,
        micSlot: null,
        isMuted: false,
        isTextMuted: false,
        isSpeaking: false,
        joinedAt: Date.now()
      };
      openUserProfile(simUser);
      return;
    }
    const fallbackUser: User = {
      id: `sim-${username}`,
      username: username,
      room: 'الغرفة العامة',
      avatarSeed: username,
      avatarUrl: undefined,
      nameBannerUrl: getUserBanner(username),
      statusQuote: '',
      flag: '🇸🇦',
      role: 'member',
      likes: 0,
      points: 0,
      isVoice: false,
      micSlot: null,
      isMuted: false,
      isTextMuted: false,
      isSpeaking: false,
      joinedAt: Date.now()
    };
    openUserProfile(fallbackUser);
  };

  // =========================================================================
  // LIVE VIDEO & AUDIO BROADCAST HANDLERS (بث مباشر فيديو وصوت حقيقي للغرفة)
  // =========================================================================
  const triggerFloatingReaction = (emoji: string) => {
    const id = `live-react-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const left = 15 + Math.random() * 70;
    setLiveFloatingReactions((prev) => [...prev.slice(-15), { id, emoji, left }]);
    setTimeout(() => {
      setLiveFloatingReactions((prev) => prev.filter((r) => r.id !== id));
    }, 2200);
  };

  const handleStartLiveBroadcast = async () => {
    if (!currentUser) return;
    try {
      setShowStartLiveConfirm(false);
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: liveFacingMode, width: { ideal: 640 }, height: { ideal: 480 } },
          audio: true
        });
      } catch {
        // Fallback to video only if audio permission fails
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: liveFacingMode, width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false
        });
      }
      setLiveMediaStream(stream);
      setIsBroadcastingLive(true);
      setIsWatchingLive(false);
      setIsLiveMinimized(false);
      setIsLiveCameraOff(false);
      setIsLiveMicMuted(false);

      if (localLiveVideoRef.current) {
        localLiveVideoRef.current.srcObject = stream;
        localLiveVideoRef.current.play().catch(() => {});
      }

      socket?.emit('startLiveBroadcast', {
        room: currentUser.room || 'الغرفة العامة',
        title: `بث مباشر 🔴 ${currentUser.username}`
      });

      // Frame broadcaster for viewers (smooth 12-14 fps canvas stream)
      if (liveFrameIntervalRef.current) clearInterval(liveFrameIntervalRef.current);
      liveFrameIntervalRef.current = setInterval(() => {
        if (!localLiveVideoRef.current || !stream.active) return;
        try {
          const video = localLiveVideoRef.current;
          if (video.videoWidth === 0 || video.videoHeight === 0) return;
          if (!liveCanvasRef.current) {
            liveCanvasRef.current = document.createElement('canvas');
            liveCanvasRef.current.width = 320;
            liveCanvasRef.current.height = 240;
          }
          const ctx = liveCanvasRef.current.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, 320, 240);
            const frameData = liveCanvasRef.current.toDataURL('image/jpeg', 0.58);
            socket?.emit('liveVideoFrame', {
              room: currentUser.room || 'الغرفة العامة',
              frameData
            });
          }
        } catch {}
      }, 85);

      showToast('بدأ البث المباشر (فيديو وصوت) بنجاح 🔴 بثك الآن مباشر لجميع أعضاء الغرفة!', 'success');
      sounds.playCrownFanfare();
      confetti({ particleCount: 40, spread: 60 });
    } catch (err: any) {
      showToast('تعذر فتح الكاميرا للبث: ' + (err?.message || 'تحقق من أذونات المتصفح'), 'error');
    }
  };

  const handleStopLiveBroadcast = () => {
    if (liveFrameIntervalRef.current) {
      clearInterval(liveFrameIntervalRef.current);
      liveFrameIntervalRef.current = null;
    }
    if (liveMediaStream) {
      liveMediaStream.getTracks().forEach((track) => track.stop());
      setLiveMediaStream(null);
    }
    setIsBroadcastingLive(false);
    setIsWatchingLive(false);
    socket?.emit('endLiveBroadcast', { room: currentUser?.room || 'الغرفة العامة' });
    showToast('تم إنهاء البث المباشر ⏹️', 'info');
  };

  const handleToggleLiveCamera = () => {
    if (liveMediaStream) {
      const vidTrack = liveMediaStream.getVideoTracks()[0];
      if (vidTrack) {
        vidTrack.enabled = !vidTrack.enabled;
        setIsLiveCameraOff(!vidTrack.enabled);
        showToast(vidTrack.enabled ? 'تم تفعيل الكاميرا 📷' : 'تم إيقاف الكاميرا مؤقتاً 🚫', 'info');
      }
    }
  };

  const handleToggleLiveMic = () => {
    if (liveMediaStream) {
      const audTrack = liveMediaStream.getAudioTracks()[0];
      if (audTrack) {
        audTrack.enabled = !audTrack.enabled;
        setIsLiveMicMuted(!audTrack.enabled);
        showToast(audTrack.enabled ? 'تم تفعيل صوت المايك 🎙️' : 'تم كتم المايك 🔇', 'info');
      }
    }
  };

  const handleFlipLiveCamera = async () => {
    const nextMode = liveFacingMode === 'user' ? 'environment' : 'user';
    setLiveFacingMode(nextMode);
    if (liveMediaStream) {
      liveMediaStream.getTracks().forEach((t) => t.stop());
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: nextMode, width: { ideal: 640 }, height: { ideal: 480 } },
          audio: !isLiveMicMuted
        });
        setLiveMediaStream(newStream);
        if (localLiveVideoRef.current) {
          localLiveVideoRef.current.srcObject = newStream;
          localLiveVideoRef.current.play().catch(() => {});
        }
      } catch {}
    }
  };

  const handleSendLiveReaction = (emoji: string) => {
    if (!currentUser) return;
    socket?.emit('liveReaction', { room: currentUser.room || 'الغرفة العامة', emoji });
    triggerFloatingReaction(emoji);
  };

  // Save Settings from Settings Modal (حفظ وتثبيت التعديلات على الملف الشخصي)
  const handleSaveSettings = () => {
    if (!socket || !currentUser) return;
    socket.emit('updateProfile', {
      username: settingName,
      statusQuote: settingQuote,
      avatarUrl: settingAvatar,
      password: settingPassword || undefined,
      flag: currentUser.flag,
      nameColor: settingNameColor,
      textColor: settingTextColor
    });
    socket.emit('updateUserStyle', {
      nameColor: settingNameColor,
      textColor: settingTextColor
    });
    try {
      localStorage.setItem('soqoor_name_color', settingNameColor);
      localStorage.setItem('soqoor_text_color', settingTextColor);
      localStorage.setItem(
        'falcon_saved_profile',
        JSON.stringify({
          username: settingName,
          statusQuote: settingQuote,
          avatarUrl: settingAvatar,
          flag: currentUser.flag,
          nameColor: settingNameColor,
          textColor: settingTextColor
        })
      );
    } catch {}
    setCurrentUser((prev) => (prev ? { ...prev, nameColor: settingNameColor, textColor: settingTextColor } : null));
    showToast('تم حفظ التعديلات ولون الاسم والخط بنجاح 💾', 'success');
    setActiveDrawer('none');
  };

  // Dedicated large media background upload pipeline with real-time progress
  // Handles videos up to 100MB over HTTP so WebSocket ping/pong NEVER stalls!
  const handleMediaUpload = async (file: File) => {
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      showToast('حجم الملف كبير جداً، الحد الأقصى المسموح 100 ميجابايت', 'error');
      return;
    }

    const isVideo = file.type.startsWith('video');
    const isAudio = file.type.startsWith('audio');
    const typeLabel = isVideo ? 'فيديو' : isAudio ? 'مقطع صوتي' : 'صورة';

    setUploadProgress(1);
    setUploadStatusText(`جاري رفع الـ${typeLabel} (${(file.size / (1024 * 1024)).toFixed(1)} ميجابايت)...`);

    try {
      const res = await uploadMediaWithProgress(file, (percent) => {
        setUploadProgress(percent);
        setUploadStatusText(`جارٍ رفع الـ${typeLabel}... ${percent}%`);
      });

      setUploadProgress(null);
      setUploadStatusText('');
      handleSendMessage(undefined, res.url, res.mediaType);
      showToast(`تم إرسال الـ${typeLabel} بنجاح دون انقطاع الاتصال 🚀`, 'success');
    } catch (err: any) {
      setUploadProgress(null);
      setUploadStatusText('');
      showToast(`فشل رفع ${typeLabel}: ` + (err?.message || 'خطأ في الشبكة'), 'error');
    }
  };

  // High-performance HTTP direct upload: Always stores images/media on server and returns short clean URL
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, callback: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      showToast('حجم الملف كبير جداً، الحد الأقصى المسموح 100 ميجابايت', 'error');
      e.target.value = '';
      return;
    }

    try {
      showToast('جاري رفع الملف إلى السيرفر... ⏳', 'info');
      const res = await uploadMediaWithProgress(file);
      if (res?.url) {
        callback(res.url);
        showToast('تم الرفع بنجاح ✅', 'success');
      } else {
        throw new Error('فشل استلام رابط صالح');
      }
    } catch (err: any) {
      showToast('فشل رفع الملف: ' + (err?.message || 'خطأ في الشبكة'), 'error');
    } finally {
      e.target.value = '';
    }
  };

  // Dedicated Wall Media Upload (Photos & Videos) with zero WebSocket freezing & HTTP progress
  const handleWallMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!currentUser) {
      showToast('يجب تسجيل الدخول أولاً للنشر على الحائط 🔐', 'error');
      e.target.value = '';
      return;
    }

    const isVideo = file.type.startsWith('video');
    const typeLabel = isVideo ? 'فيديو' : 'صورة';

    setIsWallUploading(true);
    setWallUploadProgress(1);

    try {
      const res = await uploadMediaWithProgress(file, (percent) => {
        setWallUploadProgress(percent);
      });

      setIsWallUploading(false);
      setWallUploadProgress(null);

      const defaultText = isVideo ? '🎥 مقطع فيديو جديد' : '📸 صورة جديدة';
      const rawText = wallTextInput.trim() || defaultText;
      const textToPost = expandClientShortcuts(rawText, shortcuts);

      socket?.emit('newWallPost', {
        text: textToPost,
        mediaUrl: res.url,
        mediaType: res.mediaType,
        category: wallTab
      });

      setWallTextInput('');
      showToast(`تم نشر الـ${typeLabel} على الحائط بنجاح دون انقطاع الاتصال ✨`, 'success');
    } catch (err: any) {
      setIsWallUploading(false);
      setWallUploadProgress(null);
      showToast(`فشل رفع ${typeLabel}: ` + (err?.message || 'خطأ في الشبكة'), 'error');
    } finally {
      e.target.value = '';
    }
  };

  // YouTube Search for Wall (البحث في يوتيوب ومشاركة الفيديو في الحائط)
  const handleSearchYouTube = async (queryToSearch?: string) => {
    const q = (typeof queryToSearch === 'string' ? queryToSearch : ytSearchQuery).trim();
    if (!q) {
      setYtSearchError('يرجى كتابة كلمة للبحث عنها في يوتيوب 🔍');
      return;
    }

    setIsYtSearching(true);
    setYtSearchError(null);

    try {
      const res = await fetch(`/api/youtube-search?q=${encodeURIComponent(q)}`);
      if (!res.ok) {
        throw new Error(`خطأ في استجابة الخادم (${res.status})`);
      }
      const data = await res.json();
      if (data.results && Array.isArray(data.results)) {
        setYtSearchResults(data.results);
        if (data.results.length === 0) {
          setYtSearchError('لم يتم العثور على أي نتائج، جرب كلمات بحث أخرى.');
        }
      } else {
        setYtSearchResults([]);
        setYtSearchError('لم يتم العثور على نتائج.');
      }
    } catch (err: any) {
      console.error('YouTube search error:', err);
      setYtSearchError('تعذر البحث في يوتيوب حالياً. تحقق من الاتصال أو أعد المحاولة.');
    } finally {
      setIsYtSearching(false);
    }
  };

  // Post YouTube Video directly to Wall
  const handlePostYouTubeVideo = (video: YouTubeVideoInfo) => {
    if (!currentUser) {
      showToast('يجب تسجيل الدخول أولاً للنشر على الحائط 🔐', 'error');
      return;
    }
    const note = wallTextInput.trim();
    socket?.emit('newWallPost', {
      text: note ? expandClientShortcuts(note, shortcuts) : video.title,
      category: wallTab,
      youtubeVideo: video
    });
    setWallTextInput('');
    setShowYouTubeSearchModal(false);
    showToast(`تم نشر فيديو يوتيوب "${video.title.slice(0, 30)}..." على الحائط 🎬✨`, 'success');
  };

  // General Wall Post Sender (Handles text, shortcuts, and auto-detects pasted YouTube links)
  const handleSendWallPost = () => {
    if (!wallTextInput.trim()) return;
    if (!currentUser) {
      showToast('يجب تسجيل الدخول أولاً للنشر على الحائط 🔐', 'error');
      return;
    }
    const expanded = expandClientShortcuts(wallTextInput.trim(), shortcuts);
    const ytId = extractYouTubeVideoId(expanded);
    const ytData: YouTubeVideoInfo | undefined = ytId
      ? {
          id: ytId,
          title: 'فيديو يوتيوب',
          thumbnail: getYouTubeThumbnailUrl(ytId),
          url: getYouTubeWatchUrl(ytId)
        }
      : undefined;

    socket?.emit('newWallPost', {
      text: expanded,
      category: wallTab,
      youtubeVideo: ytData
    });
    setWallTextInput('');
  };

  // 24-Hour Story File Selection & Upload (نظام حالات/خواطر الصور والفيديو)
  const handleStoryFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 80 * 1024 * 1024) {
      showToast('الحد الأقصى لحجم الفيديو أو الصورة هو 80 ميجابايت.', 'error');
      e.target.value = '';
      return;
    }

    const isVideo = file.type.startsWith('video');
    const typeLabel = isVideo ? 'فيديو' : 'صورة';

    setIsStoryUploading(true);
    setStoryUploadProgress(1);

    try {
      const res = await uploadMediaWithProgress(file, (percent) => {
        setStoryUploadProgress(percent);
      });

      setIsStoryUploading(false);
      setStoryUploadProgress(0);

      // Open creation preview dialog so user can enter caption and confirm post
      setStoryMediaUrl(res.url);
      setStoryMediaType(res.mediaType as 'image' | 'video');
      setIsCreatingStory(true);
      showToast(`تم رفع ملف الـ${typeLabel} بنجاح، يمكنك كتابة خاطرة ونشرها الآن ✨`, 'info');
    } catch (err: any) {
      setIsStoryUploading(false);
      setStoryUploadProgress(0);
      showToast(`فشل رفع ${typeLabel}: ` + (err?.message || 'خطأ في الشبكة'), 'error');
    } finally {
      e.target.value = '';
    }
  };

  const handlePublishStory = () => {
    if (!storyMediaUrl || !socket) return;
    socket.emit('newStory', {
      mediaUrl: storyMediaUrl,
      mediaType: storyMediaType,
      caption: storyCaption.trim()
    });
    setIsCreatingStory(false);
    setStoryMediaUrl('');
    setStoryCaption('');
    showToast('تم نشر الخاطرة / الحالة بنجاح (ستبقى 24 ساعة) ⏳✨', 'success');
  };

  // Download project ZIP
  const handleDownloadZip = async () => {
    try {
      showToast('جاري إنشاء ملف ZIP الكامل للمشروع...', 'info');
      await generateAndDownloadProjectZip();
      confetti({ particleCount: 60, spread: 70 });
      showToast('تم تحميل كود المشروع الكامل بصيغة ZIP! 📦', 'success');
    } catch (err: any) {
      showToast('فشل التحميل: ' + (err?.message || 'حدث خطأ أثناء إنشاء ملف ZIP'), 'error');
    }
  };

  // =========================================================================
  // VIEW 1: HOME LOGIN SCREEN (Matching Screenshot 1)
  // =========================================================================
  if (!appearanceReady) {
    return (
      <div className="flex h-full min-h-screen items-center justify-center bg-[#070b13] text-amber-300" dir="rtl">
        <div className="flex flex-col items-center gap-3" role="status" aria-live="polite">
          <div className="h-12 w-12 rounded-full border-4 border-amber-400/30 border-t-amber-400 animate-spin shadow-lg" aria-hidden="true" />
          <span className="text-sm font-semibold">جارٍ تحميل إعدادات الشات...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div
        style={{
          height: 'var(--app-height, 100dvh)',
          minHeight: 'var(--app-height, 100dvh)'
        }}
        className={`w-full ${curTheme.appBg || 'bg-[#070b13]'} ${curTheme.appText || 'text-[#e2e8f0]'} flex flex-col items-center justify-start antialiased font-sans select-none overflow-y-auto no-horizontal-overflow`}
      >
        {/* Strict Single Session Force-Logout Modal on Login Screen */}
        {forcedLogoutInfo?.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in" dir="rtl">
            <div className="bg-[#18110b] border-2 border-amber-500 rounded-2xl w-full max-w-sm p-4 text-center shadow-2xl space-y-3.5 text-white animate-in zoom-in-95">
              <div className="w-14 h-14 rounded-full bg-amber-500/20 text-amber-400 border-2 border-amber-500/50 flex items-center justify-center mx-auto animate-bounce">
                <AlertTriangle className="w-7 h-7 text-amber-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-amber-300">
                  ⚠️ تم إنهاء هذه الجلسة
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  {forcedLogoutInfo.message ||
                    'تم تسجيل الدخول إلى حسابك من متصفح أو جهاز آخر. وحرصاً على أمان العضوية ومنع التكرار، تم إنهاء هذه الجلسة القديمة فوراً واعتماد الجلسة الجديدة.'}
                </p>
              </div>
              <div className="p-2.5 bg-amber-950/50 border border-amber-500/30 rounded-xl text-[11px] text-amber-200/90 text-right space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-300">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>سياسة الحماية والجلسة الواحدة:</span>
                </div>
                <div>⚠ لا يُسمح بتواجد نفس العضو في أكثر من صفحة أو جهاز معاً.</div>
                <div>• إذا أردت استخدام هذا الجهاز مجدداً، يمكنك تسجيل الدخول وسيتم اعتماد هذه الجلسة وطرد الأخرى تلقائياً.</div>
              </div>
              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setForcedLogoutInfo(null);
                    isForcedLoggedOutRef.current = false;
                  }}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl text-xs shadow-lg transition-transform active:scale-95 cursor-pointer"
                >
                  حسنًا، فهمت ✔️
                </button>
              </div>
            </div>
          </div>
        )}

        {toast && (
          <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-emerald-900/90 border border-emerald-500 text-white rounded-lg shadow-xl text-xs font-bold animate-bounce">
            {toast.message}
          </div>
        )}

        {/* Mobile Device Frame Container */}
        <div className={`w-full max-w-md ${curTheme.cardBg || 'bg-[#0d131f]'} min-h-full border-x ${curTheme.cardBorder || 'border-[#1e293b]'} shadow-2xl flex flex-col no-horizontal-overflow`}>
          {/* Top Header */}
          <header className={`${curTheme.headerBg || 'bg-[#241a12]'} border-b ${curTheme.headerBorder || 'border-[#3e2c1c]'} px-3 py-2 flex items-center justify-between`}>
            <div className="flex items-center gap-2">
              <img
                src={falconAvatarIcon || falconIcon}
                alt="شات حسان برو"
                className="w-8 h-8 rounded-full border border-amber-500 shadow-sm object-cover"
              />
              <span className={`text-sm font-bold ${curTheme.headerAccent || 'text-amber-200'} tracking-wide`}>
                شات حسان برو | شات حسان برو للجوال
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => window.location.reload()}
                className="w-7 h-7 rounded-md bg-[#32ba51] hover:bg-emerald-600 text-white flex items-center justify-center shadow transition-all cursor-pointer"
                title="تحديث"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Banner (Dynamic uploaded falcon_chat_banner or pure CSS header) */}
          <div className="relative w-full aspect-[2.1/1] overflow-hidden border-b border-[#2e261d] bg-gradient-to-br from-[#241a12] via-[#362517] to-[#120d09] flex flex-col justify-end p-3 text-right">
  {falconChatBanner ? (
    <img
      src={falconChatBanner}
      alt="شات حسان برو"
      className="absolute inset-0 w-full h-full object-cover"
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).src = DEFAULT_FALCON_CHAT_BANNER;
      }}
    />
  ) : null}
            <div className="relative z-10 bg-gradient-to-t from-black/85 via-black/40 to-transparent -mx-3 -mb-3 p-3">
              <div className="text-amber-300 font-black text-lg drop-shadow-md flex items-center justify-between">
                <span>شات حسان برو 🦅</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-200 font-mono">
                  {onlineCount} متصل
                </span>
              </div>
              <div className="text-[11px] text-amber-100/90 font-medium flex items-center gap-2 mt-0.5">
                <span>🏆 مسابقات</span>
                <span>🛡️ ترقيات</span>
                <span>🎆 فعاليات</span>
              </div>
              <div className="text-[10px] text-slate-300 font-mono mt-0.5">hassan-pro.com</div>
            </div>
          </div>

          {/* 3 Entry Tabs (دخول الزوار | دخول الاعضاء | تسجيل عضويه) */}
          <div className="grid grid-cols-3 bg-[#111827] border-b border-[#1f2937] text-xs font-bold text-center">
            <button
              onClick={() => {
                setActiveTab('visitor');
                setUsernameInput('');
                setPasswordInput('');
                setLoginError(null);
              }}
              className={`py-3 flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'visitor'
                  ? 'bg-white text-indigo-700 border-b-2 border-indigo-600 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>دخول الزوار</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('member');
                const lastUser = localStorage.getItem('soqoor_last_member_username') || '';
                if (lastUser) setUsernameInput(lastUser);
                setLoginError(null);
              }}
              className={`py-3 flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'member'
                  ? 'bg-white text-indigo-700 border-b-2 border-indigo-600 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>دخول الاعضاء</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('register');
                setUsernameInput('');
                setPasswordInput('');
                setLoginError(null);
              }}
              className={`py-3 flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'register'
                  ? 'bg-white text-indigo-700 border-b-2 border-indigo-600 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>تسجيل عضويه</span>
            </button>
          </div>

          {/* Login Form (Direct auto-entry to الغرفة العامة) */}
          <div className="p-4 bg-white text-slate-900 border-b border-slate-300 shadow-inner">
            {loginError && (
              <div className="mb-3 p-2 bg-rose-100 border border-rose-300 text-rose-700 text-xs rounded font-bold">
                {loginError}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-2.5">
              <div>
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => {
                    setUsernameInput(e.target.value);
                    if (loginError) setLoginError(null);
                  }}
                  placeholder="اسم المستخدم..."
                  maxLength={30}
                  required
                  autoComplete="off"
                  className={`w-full px-3 py-2 border ${curTheme.fieldBorder || 'border-slate-400'} ${curTheme.fieldBg || 'bg-white'} rounded ${curTheme.fieldText || 'text-slate-900'} ${curTheme.fieldPlaceholder || 'placeholder-slate-400'} text-sm font-semibold outline-none ${curTheme.fieldFocus || 'focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600'} transition-all`}
                />
              </div>

              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      if (loginError) setLoginError(null);
                    }}
                    placeholder={activeTab === 'visitor' ? 'رمز أو كلمة مرور (اختياري)' : 'كلمة المرور...'}
                    autoComplete="current-password"
                    className={`w-full px-3 py-2 pr-8 border ${curTheme.fieldBorder || 'border-slate-400'} ${curTheme.fieldBg || 'bg-white'} rounded ${curTheme.fieldText || 'text-slate-900'} ${curTheme.fieldPlaceholder || 'placeholder-slate-400'} text-sm font-semibold outline-none ${curTheme.fieldFocus || 'focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600'} transition-all`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* زر مخفي - يظهر فقط إذا كان المستخدم يملك صلاحية الدخول المخفي */}
                {canUseGhostLogin && (
                  <button
                    type="button"
                    onClick={() => setIsGhostLogin(!isGhostLogin)}
                    className={`h-[38px] px-2.5 rounded border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer select-none shrink-0 ${
                      isGhostLogin
                        ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-600 shadow-sm ring-2 ring-amber-400/50'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                    }`}
                    title="تفعيل الدخول المخفي (الدخول دون إشعار ودون الظهور بالمتواجدين للعامة)"
                  >
                    <span
                      className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-black border transition-all ${
                        isGhostLogin
                          ? 'bg-slate-950 text-amber-400 border-slate-950'
                          : 'border-slate-400 bg-white text-transparent'
                      }`}
                    >
                      {isGhostLogin ? '✓' : ''}
                    </span>
                    <span>مخفي</span>
                  </button>
                )}

                {/* Styled [دخول] button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`h-[38px] px-5 ${curTheme.primaryBtn || 'bg-[#2d251f] hover:bg-[#1f1915] text-amber-200'} font-bold text-sm rounded shadow cursor-pointer active:scale-95 transition-all shrink-0`}
                >
                  {isSubmitting ? 'جاري...' : 'دخول'}
                </button>
              </div>

              {notificationPermission === 'default' && (
                <div className="flex items-center justify-between text-[11px] pt-1 px-2 py-1 text-slate-600 bg-slate-50/80 rounded border border-slate-200">
                  <span className="flex items-center gap-1 font-semibold text-slate-700">
                    <Bell className="w-3.5 h-3.5 text-amber-600" />
                    <span>تفعيل تنبيهات الرسائل:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      requestNotificationPermission().then((perm) => {
                        setNotificationPermission(perm);
                        if (perm === 'granted') {
                          showToast('تم تفعيل إشعارات المتصفح بنجاح! 🔔', 'success');
                          sendTestNotification().catch(() => {});
                        }
                      });
                    }}
                    className="text-amber-800 bg-amber-200/80 hover:bg-amber-300 px-2 py-0.5 rounded font-bold transition-colors cursor-pointer text-[10px] flex items-center gap-1 shadow-2xs"
                  >
                    <span>تفعيل الآن</span>
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Subheader: Switcher between "المتصلون الآن", "سجل الأعضاء", and "آخر 10 دخلوا" */}
          <div className="flex items-center justify-between bg-[#261f18] border-b border-[#4d4036] text-white px-2 py-1.5 text-xs font-bold gap-1.5 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1.5 w-full">
              <button
                type="button"
                onClick={() => setLoginListTab('online')}
                className={`flex-1 py-1 px-2 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  loginListTab === 'online'
                    ? 'bg-[#48a942] text-white shadow-xs font-black'
                    : 'bg-white/10 text-slate-300 hover:bg-white/20'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>المتصلون</span>
                <span className="bg-black/30 px-1.5 py-0.2 rounded-full text-[10px]">{onlineCount}</span>
              </button>

              <button
                type="button"
                onClick={() => setLoginListTab('members')}
                className={`flex-1 py-1 px-2 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  loginListTab === 'members'
                    ? 'bg-indigo-600 text-white shadow-xs font-black ring-1 ring-indigo-400'
                    : 'bg-white/10 text-slate-300 hover:bg-white/20'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>الأعضاء</span>
                <span className="bg-black/30 px-1.5 py-0.2 rounded-full text-[10px]">{allRegisteredMembers.length}</span>
              </button>

              <button
                type="button"
                onClick={() => setLoginListTab('recent')}
                className={`flex-1 py-1 px-2 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  loginListTab === 'recent'
                    ? 'bg-amber-600 text-white shadow-xs font-black ring-1 ring-amber-400'
                    : 'bg-white/10 text-slate-300 hover:bg-white/20'
                }`}
              >
                <Timer className="w-3.5 h-3.5" />
                <span>آخر 10</span>
                <span className="bg-black/30 px-1.5 py-0.2 rounded-full text-[10px]">{recentLogins.length}</span>
              </button>
            </div>
          </div>

          {/* Members List (Online, All Registered Members, or Last 10 Logins) */}
          <div className="flex-1 bg-white text-slate-800 divide-y divide-slate-200 overflow-y-auto modal-scroll-container overscroll-contain">
            {(() => {
              // Helper to resolve the true identity, role badge, and status quote of any user in login lists
              const getLoginMemberMeta = (username: string, rawRole?: string, rawQuote?: string) => {
                const cleanLower = (username || '').trim().toLowerCase();
                const regMember = allRegisteredMembers.find((m) => m.username.trim().toLowerCase() === cleanLower);
                const liveUser = allConnectedUsers.find((u) => u.username.trim().toLowerCase() === cleanLower);

                const effectiveRole = rawRole || liveUser?.role || regMember?.role || 'member';
                const roleBadge = getRoleBadge(effectiveRole);

                let realQuote = '';
                if (rawQuote && rawQuote.trim() && rawQuote.trim() !== 'عضو جديد' && rawQuote.trim() !== '..') {
                  realQuote = rawQuote.trim();
                } else if (regMember?.statusQuote && regMember.statusQuote.trim() && regMember.statusQuote.trim() !== 'عضو جديد' && regMember.statusQuote.trim() !== '..') {
                  realQuote = regMember.statusQuote.trim();
                } else if (liveUser?.statusQuote && liveUser.statusQuote.trim() && liveUser.statusQuote.trim() !== 'عضو جديد' && liveUser.statusQuote.trim() !== '..') {
                  realQuote = liveUser.statusQuote.trim();
                } else {
                  if (effectiveRole === 'hassan') realQuote = '🦅 إدارة عليا • شات حسان برو';
                  else if (effectiveRole === 'admin') realQuote = '👑 مدير عام شات حسان برو';
                  else if (effectiveRole === 'super') realQuote = '🛡️ مشرف سوبر • طاقم الإشراف';
                  else if (effectiveRole === 'member') realQuote = '🎖️ عضو معتمد في حسان برو';
                  else realQuote = '👤 زائر في شات حسان برو';
                }

                const isOnline = Boolean(liveUser && (!liveUser.isGhost || canViewerSeeUser(liveUser)) && liveUser.presenceState !== 'offline');
                const isAway = liveUser?.presenceState === 'away';
                const isGhost = Boolean(liveUser?.isGhost);

                return {
                  effectiveRole,
                  roleBadge,
                  realQuote,
                  isOnline,
                  isAway,
                  isGhost,
                  avatarUrl: liveUser?.avatarUrl || regMember?.avatarUrl,
                  nameBannerUrl: liveUser?.nameBannerUrl || regMember?.nameBannerUrl,
                  flag: liveUser?.flag || regMember?.flag,
                  currentRoom: liveUser?.room || regMember?.currentRoom || 'الغرفة العامة'
                };
              };

              if (loginListTab === 'online') {
                const baseOnline = allConnectedUsers.length > 0 ? allConnectedUsers : rosterUsers;
                const displayOnlineUsers = baseOnline.filter((u) => canViewerSeeUser(u));
                if (displayOnlineUsers.length === 0) {
                  return (
                    <div className="p-8 text-center text-slate-400 text-xs font-bold">
                      لا يوجد متواجدون حالياً .. كن أول من يدخل! 🦅
                    </div>
                  );
                }
                return displayOnlineUsers.map((user) => {
                  const meta = getLoginMemberMeta(user.username, user.role, user.statusQuote);
                  return (
                    <div
                      key={user.id}
                      onClick={() => {
                        setUsernameInput(user.username);
                        showToast(`تم اختيار: ${user.username} (${meta.roleBadge.short}) - اضغط دخول للتحدث معه مباشرة`, 'info');
                      }}
                      className="flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative flex-shrink-0">
                          <img
                            src={getUserAvatar(user.username, user.avatarUrl || meta.avatarUrl)}
                            alt={user.username}
                            className="w-11 h-11 rounded-lg object-cover border border-slate-300 shadow-2xs"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = falconIcon;
                            }}
                          />
                          {meta.isGhost ? (
                            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-2xs" title="دخول مخفي" />
                          ) : meta.isAway ? (
                            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 border-2 border-white shadow-2xs" title="بالخارج" />
                          ) : (
                            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-2xs animate-pulse" title="متصل الآن" />
                          )}
                        </div>

                        <div className="min-w-0 text-right">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {(() => {
                              const bannerUrl = getUserBanner(user.username, user.nameBannerUrl || meta.nameBannerUrl);
                              if (bannerUrl) {
                                return (
                                  <img
                                    src={bannerUrl}
                                    alt={user.username}
                                    title={user.username}
                                    className="h-5 max-h-[22px] max-w-[155px] object-contain rounded inline-block"
                                  />
                                );
                              }
                              return (
                                <span className="font-bold text-sm text-slate-900 truncate">
                                  {user.username}
                                </span>
                              );
                            })()}

                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-black shadow-2xs leading-tight inline-flex items-center ${meta.roleBadge.badgeClass}`}>
                              {meta.roleBadge.short}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-700 font-semibold mt-0.5 truncate max-w-[210px]" title={meta.realQuote}>
                            {meta.realQuote}
                          </div>

                          <div className="text-[10px] text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                            <span>متصل في {user.room || 'الغرفة العامة'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                        <span className="text-xl leading-none">{user.flag || meta.flag || '🇸🇦'}</span>
                        <span className="text-[10px] text-slate-500 font-medium leading-none">
                          {formatAppRelativeTime(user.joinedAt || user.lastActiveTime)}
                        </span>
                      </div>
                    </div>
                  );
                });
              }

              if (loginListTab === 'members') {
                if (allRegisteredMembers.length === 0) {
                  return (
                    <div className="p-8 text-center text-slate-400 text-xs font-bold">
                      لا يوجد أعضاء مسجلين بعد 📜
                    </div>
                  );
                }
                return allRegisteredMembers.map((member) => {
                  const meta = getLoginMemberMeta(member.username, member.role, member.statusQuote);
                  return (
                    <div
                      key={member.username}
                      onClick={() => {
                        setUsernameInput(member.username);
                        showToast(`تم اختيار العضو: ${member.username} (${meta.roleBadge.short}) 🦅`, 'info');
                      }}
                      className="flex items-center justify-between px-3 py-2.5 hover:bg-indigo-50/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative flex-shrink-0">
                          <img
                            src={getUserAvatar(member.username, member.avatarUrl || meta.avatarUrl)}
                            alt={member.username}
                            className="w-11 h-11 rounded-lg object-cover border border-indigo-200 shadow-2xs"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = falconIcon;
                            }}
                          />
                          {meta.isOnline ? (
                            meta.isAway ? (
                              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 border-2 border-white shadow-2xs" title="بالخارج" />
                            ) : (
                              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-2xs" title="متصل الآن" />
                            )
                          ) : (
                            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-slate-400 border-2 border-white" title="غير متصل" />
                          )}
                        </div>

                        <div className="min-w-0 text-right">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {(() => {
                              const bannerUrl = getUserBanner(member.username, member.nameBannerUrl || meta.nameBannerUrl);
                              if (bannerUrl) {
                                return (
                                  <img
                                    src={bannerUrl}
                                    alt={member.username}
                                    title={member.username}
                                    className="h-5 max-h-[22px] max-w-[155px] object-contain rounded inline-block"
                                  />
                                );
                              }
                              return (
                                <span className="font-bold text-sm text-slate-900 truncate">
                                  {member.username}
                                </span>
                              );
                            })()}

                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-black shadow-2xs leading-tight inline-flex items-center ${meta.roleBadge.badgeClass}`}>
                              {meta.roleBadge.short}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-700 font-semibold mt-0.5 truncate max-w-[210px]" title={meta.realQuote}>
                            {meta.realQuote}
                          </div>

                          <div className="mt-0.5">
                            {meta.isOnline ? (
                              <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                                <span>متصل الآن • {meta.currentRoom}</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-medium">
                                عضو مسجل • غير متصل
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                        <span className="text-xl leading-none">{member.flag || meta.flag || '🇸🇦'}</span>
                        <span className="text-[10px] text-slate-500 font-medium leading-none">
                          {meta.isOnline ? 'الآن' : formatAppRelativeTime(member.lastSeen)}
                        </span>
                      </div>
                    </div>
                  );
                });
              }

              // loginListTab === 'recent'
              if (recentLogins.length === 0) {
                return (
                  <div className="p-8 text-center text-slate-500 text-xs font-bold">
                    لا يوجد سجل دخول سابق بعد 📜
                  </div>
                );
              }

              return recentLogins.map((entry, idx) => {
                const meta = getLoginMemberMeta(entry.username, entry.role, entry.statusQuote);
                return (
                  <div
                    key={`${entry.username}-${entry.timestamp}-${idx}`}
                    onClick={() => {
                      setUsernameInput(entry.username);
                      showToast(`تم اختيار: ${entry.username} (${meta.roleBadge.short}) من آخر المسجلين 🦅`, 'info');
                    }}
                    className="flex items-center justify-between px-3 py-2.5 hover:bg-amber-50/60 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative flex-shrink-0">
                        <img
                          src={getUserAvatar(entry.username, entry.avatar || entry.avatarUrl || meta.avatarUrl)}
                          alt={entry.username}
                          className="w-11 h-11 rounded-lg object-cover border border-amber-300 shadow-2xs"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = falconIcon;
                          }}
                        />
                        {meta.isOnline ? (
                          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-2xs" title="متصل الآن" />
                        ) : (
                          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-slate-400 border-2 border-white" title="غير متصل" />
                        )}
                      </div>

                      <div className="min-w-0 text-right">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {(() => {
                            const bannerUrl = getUserBanner(entry.username, entry.nameBannerUrl || meta.nameBannerUrl);
                            if (bannerUrl) {
                              return (
                                <img
                                  src={bannerUrl}
                                  alt={entry.username}
                                  title={entry.username}
                                  className="h-5 max-h-[22px] max-w-[155px] object-contain rounded inline-block"
                                />
                              );
                            }
                            return (
                              <span className="font-bold text-sm text-slate-900 truncate">
                                {entry.username}
                              </span>
                            );
                          })()}

                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-black shadow-2xs leading-tight inline-flex items-center ${meta.roleBadge.badgeClass}`}>
                            {meta.roleBadge.short}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-700 font-semibold mt-0.5 truncate max-w-[210px]" title={meta.realQuote}>
                          {meta.realQuote}
                        </div>

                        <div className="mt-0.5">
                          {meta.isOnline ? (
                            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                              <span>متصل الآن • {meta.currentRoom || entry.room || 'الغرفة العامة'}</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium">
                              عضو مسجل • غير متصل
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                      <span className="text-xl leading-none">{entry.flag || meta.flag || '🇾🇪'}</span>
                      <span className="text-[10px] text-slate-500 font-medium leading-none">
                        {meta.isOnline ? 'الآن' : formatAppRelativeTime(entry.timestamp)}
                      </span>
                    </div>
                  </div>
                );
              });
            })()}
          </div>

          {/* Footer */}
          <div className="p-3 bg-[#111827] text-slate-400 border-t border-[#1f2937] flex items-center justify-center text-xs">
            <span className="text-[11px] text-slate-400 font-semibold">
              Copyright © 2026 شات حسان برو للجوال • جميع الحقوق محفوظة
            </span>
          </div>
        </div>

      </div>
    );
  }

  // Helper to render individual active PM conversation (Used for Top-Docked Split Screen 45% and Full Drawer)
  const renderActivePmThreadContent = (isSplit: boolean) => {
    if (!selectedPmUser) return null;
    return (
      <div className={`flex-1 min-h-0 flex flex-col overflow-hidden ${curTheme.drawerBg || 'bg-slate-900'} text-slate-100`}>
        {/* Partner Top Bar - Ultra Compact */}
        <div className={`px-2 py-1 ${curTheme.drawerHeaderBg || curTheme.headerBg} border-b ${curTheme.headerBorder} flex items-center justify-between shadow-xs shrink-0 gap-1`}>
          <div className="flex items-center gap-1 min-w-0">
            <div className="relative shrink-0">
              <img
                src={selectedPmUser.avatarUrl || falconIcon}
                alt={selectedPmUser.username}
                className="w-6 h-6 rounded-full object-cover border border-amber-500/50 shadow-2xs"
              />
              {(() => {
                const matched = allConnectedUsers.find((u) => u.username.toLowerCase() === selectedPmUser.username.toLowerCase()) || rosterUsers.find((u) => u.username.toLowerCase() === selectedPmUser.username.toLowerCase());
                const targetCandidate = matched || selectedPmUser;
                const isGhostUser = Boolean(matched?.isGhost || selectedPmUser.isGhost);
                const canSeeGhost = canViewerSeeUser(targetCandidate);
                if (isGhostUser && !canSeeGhost) {
                  return <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-slate-400 border border-slate-900" title="غير متصل ⚪" />;
                }
                if (isGhostUser) {
                  return <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-blue-500 border border-slate-900 shadow-xs" title="متواجد بوضع مخفي 🔵" />;
                }
                const state = matched?.presenceState || selectedPmUser.presenceState || (matched ? 'online' : 'offline');
                return state === 'away' ? (
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 border border-slate-900 shadow-xs animate-pulse" title="في الانتظار 🟡" />
                ) : state === 'offline' ? (
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-slate-400 border border-slate-900" title="أوفلاين ⚪" />
                ) : (
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-slate-900 shadow-xs" title="نشط 🟢" />
                );
              })()}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs flex items-center gap-1 leading-tight">
                {(() => {
                  const partnerGifts = selectedPmUser.giftBadges || rosterUsers.find((u) => u.username.toLowerCase() === selectedPmUser.username.toLowerCase())?.giftBadges || allRegisteredMembers.find((m) => m.username.toLowerCase() === selectedPmUser.username.toLowerCase())?.giftBadges;
                  if (partnerGifts && partnerGifts.length > 0) {
                    return (
                      <img
                        src={partnerGifts[0]}
                        alt="هدية"
                        title="هدية تكريمية مرافقة للاسم"
                        className="w-4 h-4 object-contain inline-block shrink-0 drop-shadow-xs"
                      />
                    );
                  }
                  return null;
                })()}
                {(() => {
                  const bannerUrl = getUserBanner(selectedPmUser.username, selectedPmUser.nameBannerUrl);
                  if (bannerUrl) {
                    return (
                      <img
                        src={bannerUrl}
                        alt={selectedPmUser.username}
                        title={selectedPmUser.username}
                        onClick={() => openUserProfile(selectedPmUser)}
                        className="h-4 max-h-[17px] max-w-[100px] sm:max-w-[140px] object-contain rounded inline-block cursor-pointer hover:opacity-90"
                      />
                    );
                  }
                  return <span className="truncate max-w-[90px] sm:max-w-[130px]">{selectedPmUser.username}</span>;
                })()}
                <span className="text-[10px] shrink-0">{selectedPmUser.flag}</span>
              </div>
              <div className="text-[9px] text-slate-400 flex items-center gap-1 leading-none">
                {(() => {
                  const matched = allConnectedUsers.find((u) => u.username.toLowerCase() === selectedPmUser.username.toLowerCase()) || rosterUsers.find((u) => u.username.toLowerCase() === selectedPmUser.username.toLowerCase());
                  const state = matched?.presenceState || selectedPmUser.presenceState || (matched ? 'online' : 'offline');
                  return state === 'away' ? (
                    <span className="text-amber-400 font-bold">انتظار 🟡</span>
                  ) : state === 'offline' ? (
                    <span className="text-slate-400">أوفلاين ⚪</span>
                  ) : (
                    <span className="text-emerald-400 font-bold">متصل 🟢</span>
                  );
                })()}
                {selectedPmUser.statusQuote && <span className="truncate max-w-[60px] sm:max-w-[90px] text-slate-400">• {selectedPmUser.statusQuote}</span>}
              </div>
            </div>
          </div>

          {/* User's Active Mic Controls if on mic slot */}
          {currentUser.micSlot !== null && (
            <div className="flex items-center gap-1 bg-emerald-900/90 text-emerald-200 border border-emerald-500/60 px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>مايك ({currentUser.micSlot})</span>
              <button
                type="button"
                onClick={() => {
                  const muted = audioManager?.toggleMute() ?? false;
                  sounds.playToggleMute(muted);
                  showToast(muted ? 'تم كتم المايك 🔇' : 'تم تفعيل المايك 🎙️', 'info');
                }}
                className="hover:text-amber-300 text-[9px] cursor-pointer"
              >
                {currentUser.isMuted ? 'تفعيل' : 'كتم'}
              </button>
              <button
                type="button"
                onClick={handleDropMic}
                className="text-rose-300 hover:text-white text-[9px] cursor-pointer"
              >
                ترك
              </button>
            </div>
          )}

          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            {/* E2EE Badge button */}
            <button
              type="button"
              onClick={() => setShowPmEncryptionModal(true)}
              className="p-1 bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 text-[9px] font-bold rounded flex items-center gap-0.5 transition-colors cursor-pointer shadow-2xs active:scale-95"
              title="محادثة مشفرة E2EE 🔒"
            >
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span className="hidden sm:inline">E2EE</span>
            </button>

            {/* Audio Call button */}
            <button
              type="button"
              onClick={() => handleStartPmCall('audio')}
              className="w-6 h-6 sm:w-auto sm:px-1.5 sm:py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-bold rounded flex items-center justify-center gap-0.5 transition-colors cursor-pointer shadow-2xs"
              title="مكالمة صوتية خاصة"
            >
              <Phone className="w-3 h-3" />
              <span className="hidden sm:inline">صوت</span>
            </button>

            {/* Video Call button */}
            <button
              type="button"
              onClick={() => handleStartPmCall('video')}
              className="w-6 h-6 sm:w-auto sm:px-1.5 sm:py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-bold rounded flex items-center justify-center gap-0.5 transition-colors cursor-pointer shadow-2xs"
              title="مكالمة فيديو خاصة"
            >
              <Video className="w-3 h-3" />
              <span className="hidden sm:inline">فيديو</span>
            </button>

            {/* Maximize / Minimize Mode Toggle */}
            {isSplit ? (
              <button
                type="button"
                onClick={() => setPmWindowMode('full')}
                className="w-6 h-6 flex items-center justify-center rounded bg-white/10 hover:bg-white/20 text-white cursor-pointer shadow-2xs transition-all"
                title="تكبير للشاشة الكاملة 🗖"
              >
                <Maximize2 className="w-3 h-3" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setPmWindowMode('split')}
                className="w-6 h-6 flex items-center justify-center rounded bg-white/10 hover:bg-white/20 text-white cursor-pointer shadow-2xs transition-all"
                title="تصغير لنصف الشاشة العلوي 🗗"
              >
                <Minimize2 className="w-3 h-3" />
              </button>
            )}

            {/* Back to Conversations List */}
            <button
              type="button"
              onClick={() => setSelectedPmUser(null)}
              className="px-1.5 py-0.5 bg-white/10 hover:bg-white/20 text-white text-[9px] font-bold rounded cursor-pointer transition-colors"
              title="الرجوع لقائمة المحادثات الخاصة"
            >
              قائمة
            </button>

            {/* Close Button - Stays pinned until user clicks this X */}
            <button
              type="button"
              onClick={() => {
                setSelectedPmUser(null);
                setActiveDrawer('none');
              }}
              className="w-6 h-6 bg-red-600 hover:bg-red-700 active:scale-95 text-white flex items-center justify-center rounded font-bold shadow-md cursor-pointer transition-all"
              title="إغلاق نافذة الخاص والعودة للروم كاملاً"
            >
              <X className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          </div>
        </div>

        {/* Messages Stream for this partner exclusively - Wallpaper & BubbleStyle Enabled */}
        <div
          ref={pmChatContainerRef}
          className={`flex-1 min-h-0 p-1 sm:p-1.5 space-y-0.5 sm:space-y-1 overflow-y-auto modal-scroll-container overscroll-contain transition-all relative ${
            activeWallpaper === 'light-pure'
              ? 'bg-gradient-to-b from-slate-100 via-white to-slate-200 text-slate-800'
              : activeWallpaper === 'light-paper'
              ? 'bg-[#faf6ee] bg-[radial-gradient(#d6cbb5_1px,transparent_1px)] [background-size:14px_14px] text-stone-900'
              : activeWallpaper === 'light-clouds'
              ? 'bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100 text-slate-800'
              : activeWallpaper === 'light-sand'
              ? 'bg-gradient-to-tr from-amber-100 via-orange-50 to-yellow-100 text-amber-950'
              : activeWallpaper === 'light-mint'
              ? 'bg-gradient-to-b from-emerald-100 via-teal-50 to-green-100 text-emerald-950'
              : activeWallpaper === 'light-lavender'
              ? 'bg-gradient-to-tr from-purple-100 via-pink-50 to-indigo-100 text-purple-950'
              : activeWallpaper === 'light-geometric'
              ? 'bg-slate-100 bg-[linear-gradient(to_right,#cbd5e1_1px,transparent_1px),linear-gradient(to_bottom,#cbd5e1_1px,transparent_1px)] bg-[size:16px_16px] text-slate-800'
              : activeWallpaper === 'light-rose'
              ? 'bg-gradient-to-b from-rose-100 via-pink-50 to-stone-100 text-rose-950'
              : activeWallpaper === 'stars'
              ? 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950 via-slate-900 to-black text-slate-100'
              : activeWallpaper === 'desert'
              ? 'bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-amber-950/40 via-stone-900 to-slate-950 text-slate-100'
              : activeWallpaper === 'arabesque'
              ? 'bg-slate-950 bg-[radial-gradient(#475569_1px,transparent_1px)] [background-size:16px_16px] text-slate-100'
              : activeWallpaper === 'luxury-wood'
              ? 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-stone-900 via-stone-950 to-black text-slate-100'
              : activeWallpaper === 'cyber-grid'
              ? 'bg-slate-950 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:24px_24px] text-slate-100'
              : activeWallpaper === 'dark-obsidian'
              ? 'bg-[#09080d] bg-[radial-gradient(ellipse_at_top,_#451a03_0%,transparent_70%)] text-slate-100'
              : activeWallpaper === 'dark-emerald'
              ? 'bg-[#02150d] bg-[radial-gradient(ellipse_at_bottom,_#064e3b_0%,transparent_70%)] text-slate-100'
              : activeWallpaper === 'dark-sapphire'
              ? 'bg-[#030c18] bg-[radial-gradient(ellipse_at_center,_#1e3a8a_0%,transparent_70%)] text-slate-100'
              : activeWallpaper === 'dark-dam-ghazal'
              ? 'bg-[#180309] bg-[radial-gradient(ellipse_at_top,_#881337_0%,transparent_70%)] text-slate-100'
              : `${curTheme.chatBg || 'bg-slate-950/40'} ${curTheme.appText || 'text-slate-100'}`
          }`}
        >
          {(Array.isArray(privateMessages) ? privateMessages : [])
            .filter((pm) => {
              if (!pm || !pm.fromUsername || !pm.toUsername) return false;
              const pLower = (selectedPmUser.username || '').trim().toLowerCase();
              return pm.fromUsername.trim().toLowerCase() === pLower || pm.toUsername.trim().toLowerCase() === pLower;
            })
            .map((pm, idx) => {
              if (pm.isCallNotification) {
                return (
                  <div key={pm.id ? `call-${pm.id}-${idx}` : `pm-call-${idx}`} className="flex justify-center my-1">
                    <div className="px-2.5 py-0.5 bg-slate-800/90 text-slate-200 rounded-full text-[10px] font-bold flex items-center gap-1.5 shadow-2xs border border-slate-700">
                      <PhoneCall className="w-3 h-3 text-emerald-400" />
                      <span>{pm.text}</span>
                      <span className="text-[9px] text-slate-400 font-mono">({formatMessageTime(pm)})</span>
                    </div>
                  </div>
                );
              }

              const isMe = pm.fromUsername.toLowerCase() === currentUser.username.toLowerCase();
              return (
                <div
                  key={pm.id ? `msg-${pm.id}-${idx}` : `pm-${idx}`}
                  id={`pm-msg-${pm.id}`}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} my-0.2 sm:my-0.5`}
                >
                  <div
                    className={`px-2 py-0.5 sm:px-2.5 sm:py-1 w-fit max-w-[90%] text-[11px] sm:text-xs leading-snug shadow-2xs [overflow-wrap:anywhere] break-words transition-all ${
                      bubbleStyle === 'transparent'
                        ? isMe
                          ? 'bg-transparent border-b-2 border-amber-500/50 text-amber-200 shadow-none px-1.5 py-0.5'
                          : isNightMode
                          ? 'bg-transparent border-b-2 border-slate-700/70 text-slate-100 shadow-none px-1.5 py-0.5'
                          : 'bg-transparent border-b-2 border-slate-300 text-slate-800 shadow-none px-1.5 py-0.5'
                        : bubbleStyle === 'pill'
                        ? isMe
                          ? isNightMode
                            ? 'rounded-full px-3 py-1 bg-[#241a12] text-amber-100 border border-amber-600/50 shadow-xs'
                            : 'rounded-full px-3 py-1 bg-amber-50 text-slate-900 border border-amber-300 shadow-2xs'
                          : isNightMode
                          ? 'rounded-full px-3 py-1 bg-[#161f33] text-slate-100 border border-slate-700/80 shadow-xs'
                          : 'rounded-full px-3 py-1 bg-white text-slate-900 border border-slate-200 shadow-2xs'
                        : bubbleStyle === 'classic' || bubbleStyle === 'vintage'
                        ? isMe
                          ? isNightMode
                            ? 'rounded-xs border-2 border-amber-500/70 bg-[#241a12] text-amber-100 shadow-xs font-medium'
                            : 'rounded-xs border-2 border-amber-300 bg-amber-50/90 text-slate-900 shadow-2xs font-medium'
                          : isNightMode
                          ? 'rounded-xs border-2 border-slate-700 bg-[#161f33] text-slate-100 shadow-xs font-medium'
                          : 'rounded-xs border-2 border-slate-300 bg-white text-slate-900 shadow-2xs font-medium'
                        : bubbleStyle === 'glass'
                        ? isMe
                          ? isNightMode
                            ? 'rounded-xl backdrop-blur-md bg-amber-950/60 border border-amber-500/50 text-amber-100 shadow-md'
                            : 'rounded-xl backdrop-blur-md bg-amber-100/80 border border-amber-300/70 text-slate-900 shadow-xs'
                          : isNightMode
                          ? 'rounded-xl backdrop-blur-md bg-slate-900/80 border border-slate-700/60 text-slate-100 shadow-md'
                          : 'rounded-xl backdrop-blur-md bg-white/80 border border-white/60 text-slate-900 shadow-xs'
                        : bubbleStyle === 'sharp'
                        ? isMe
                          ? isNightMode
                            ? 'rounded-tl-xl rounded-br-xl rounded-tr-xs rounded-bl-xs border-r-3 border-amber-500 bg-[#241a12] text-amber-100 shadow-xs'
                            : 'rounded-tl-xl rounded-br-xl rounded-tr-xs rounded-bl-xs border-r-3 border-amber-400 bg-amber-50/90 text-slate-900 shadow-2xs'
                          : isNightMode
                          ? 'rounded-tl-xl rounded-br-xl rounded-tr-xs rounded-bl-xs border-r-3 border-slate-500 bg-[#161f33] text-slate-100 shadow-xs'
                          : 'rounded-tl-xl rounded-br-xl rounded-tr-xs rounded-bl-xs border-r-3 border-slate-400 bg-white text-slate-900 shadow-2xs'
                        : bubbleStyle === 'speech'
                        ? isMe
                          ? isNightMode
                            ? 'rounded-xl rounded-tr-xs bg-[#241a12] text-amber-100 border border-amber-600/50 shadow-xs'
                            : 'rounded-xl rounded-tr-xs bg-amber-50/90 text-slate-900 border border-amber-200/90 shadow-2xs'
                          : isNightMode
                          ? 'rounded-xl rounded-tl-xs bg-[#161f33] text-slate-100 border border-slate-700/80 shadow-xs'
                          : 'rounded-xl rounded-tl-xs bg-white text-slate-900 border border-slate-200/90 shadow-2xs'
                        : bubbleStyle === 'neon'
                        ? isMe
                          ? 'rounded-xl shadow-xs shadow-amber-500/30 border-2 border-amber-500 bg-[#241a12] text-amber-100'
                          : 'rounded-xl shadow-xs shadow-indigo-500/25 border-2 border-indigo-400/70 bg-[#161f33] text-slate-100'
                        : bubbleStyle === 'compact'
                        ? isMe
                          ? isNightMode
                            ? 'rounded-md py-0.5 px-2 text-xs border border-amber-600/50 bg-[#241a12] text-amber-100 shadow-xs'
                            : 'rounded-md py-0.5 px-2 text-xs border border-amber-200 bg-amber-50/90 text-slate-900 shadow-2xs'
                          : isNightMode
                          ? 'rounded-md py-0.5 px-2 text-xs border border-slate-700 bg-[#161f33] text-slate-100 shadow-xs'
                          : 'rounded-md py-0.5 px-2 text-xs border border-slate-200 bg-white text-slate-900 shadow-2xs'
                        : bubbleStyle === 'royal-gold'
                        ? isMe
                          ? 'rounded-xl border-2 border-amber-400 bg-gradient-to-r from-amber-950/90 to-yellow-950/80 text-amber-100 font-medium shadow-sm'
                          : 'rounded-xl border border-amber-500/40 bg-gradient-to-r from-slate-900 via-[#1e1710] to-slate-900 text-slate-100 shadow-sm'
                        : isMe
                        ? isNightMode
                          ? 'bg-[#241a12] text-amber-200 text-right rounded-tr-xs rounded-xl border border-amber-900/60 shadow-xs'
                          : 'bg-amber-50 text-slate-900 text-right rounded-tr-xs rounded-xl border border-amber-200 shadow-2xs'
                        : isNightMode
                        ? 'bg-[#182338] border border-slate-700/80 text-slate-100 text-right rounded-tl-xs rounded-xl shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-900 text-right rounded-tl-xs rounded-xl shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5 text-[9px] mb-0">
                      <div className="flex items-center gap-1">
                        {(() => {
                          const senderBanner = getUserBanner(pm.fromUsername, pm.fromNameBannerUrl);
                          if (senderBanner) {
                            return (
                              <img
                                src={senderBanner}
                                alt={pm.fromUsername}
                                title={pm.fromUsername}
                                onClick={() => openUserProfileByName(pm.fromUsername)}
                                className="h-3.5 max-h-[16px] max-w-[100px] sm:max-w-[130px] object-contain rounded inline-block cursor-pointer hover:opacity-90"
                              />
                            );
                          }
                          return (
                            <span
                              onClick={() => openUserProfileByName(pm.fromUsername)}
                              className={`font-bold cursor-pointer hover:underline text-[10px] sm:text-[11px] ${isMe ? 'text-amber-400' : 'text-indigo-600'}`}
                            >
                              {isMe ? 'أنت' : pm.fromUsername}
                            </span>
                          );
                        })()}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setPmReplyingTo({
                              id: pm.id,
                              username: pm.fromUsername,
                              text: pm.text || (pm.voiceNote ? 'تسجيل صوتي 🎙️' : 'وسائط مرفقة 📸')
                            });
                          }}
                          className="text-slate-400 hover:text-amber-500 cursor-pointer flex items-center gap-0.5 text-[8px] font-bold"
                          title="رد على هذه الرسالة"
                        >
                          <Reply className="w-2.5 h-2.5 rotate-180" />
                          <span>رد</span>
                        </button>
                        {isMe && !pm.voiceNote && !pm.mediaUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPmId(editingPmId === pm.id ? null : pm.id);
                              setEditingPmText(pm.text);
                            }}
                            className="text-slate-400 hover:text-blue-500 p-0.5 transition-colors cursor-pointer"
                            title="تعديل الرسالة ✏️"
                          >
                            <Edit3 className="w-2.5 h-2.5 text-blue-400" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeletePrivateMessage(pm.id)}
                          className="text-slate-400 hover:text-rose-600 p-0.5 transition-colors cursor-pointer"
                          title="حذف الرسالة 🗑️"
                        >
                          <Trash2 className="w-2.5 h-2.5 text-rose-500" />
                        </button>
                      </div>
                    </div>

                    {/* Quoted Reply Banner if pm.replyTo */}
                    {pm.replyTo && (
                      <div
                        onClick={() => {
                          const el = document.getElementById(`pm-msg-${pm.replyTo?.id}`);
                          if (el) {
                            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            el.classList.add('ring-2', 'ring-amber-500');
                            setTimeout(() => el.classList.remove('ring-2', 'ring-amber-500'), 2000);
                          }
                        }}
                        className={`mb-0.5 px-1.5 py-0.2 rounded text-[8px] cursor-pointer ${
                          isMe
                            ? 'bg-amber-950/60 text-amber-300 border-r-2 border-amber-400'
                            : 'bg-slate-100 text-slate-700 border-r-2 border-indigo-500'
                        }`}
                      >
                        <div className="font-bold flex items-center gap-0.5 text-[8px]">
                          <Reply className="w-2 h-2 rotate-180" />
                          <span>رد على:</span>
                          <span>@{pm.replyTo.username}</span>
                        </div>
                        <div className="truncate max-w-[180px]">{pm.replyTo.text}</div>
                      </div>
                    )}

                    {/* Voice Note Player */}
                    {pm.voiceNote && (
                      <div className="my-0.5">
                        <VoicePlayer
                          audioUrl={pm.voiceNote.audioUrl}
                          duration={pm.voiceNote.duration}
                          isMe={isMe}
                          senderName={pm.fromUsername}
                        />
                      </div>
                    )}

                    {/* Text message or Inline Editor */}
                    {editingPmId === pm.id ? (
                      <div className="my-1 p-1.5 bg-white/95 text-slate-800 rounded-xl space-y-1 shadow-sm text-right">
                        <input
                          type="text"
                          value={editingPmText}
                          onChange={(e) => setEditingPmText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEditPrivateMessage(pm.id, editingPmText);
                            if (e.key === 'Escape') setEditingPmId(null);
                          }}
                          className="w-full p-1 text-xs bg-slate-50 border border-blue-400 rounded-lg outline-none font-medium"
                          autoFocus
                        />
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleSaveEditPrivateMessage(pm.id, editingPmText)}
                            className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[9px] font-bold cursor-pointer"
                          >
                            حفظ
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingPmId(null)}
                            className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[9px] font-bold cursor-pointer"
                          >
                            إلغاء
                          </button>
                        </div>
                      </div>
                    ) : (
                      pm.text && (
                        <div
                          style={{
                            color: getAutoContrastMessageTextColor({
                              isMe,
                              isNight: isNightMode,
                              forceHighContrast: isHighContrastMode
                            })
                          }}
                          className="whitespace-pre-wrap [overflow-wrap:anywhere] break-words text-xs font-medium"
                          dir="auto"
                        >
                          {renderFormattedMessageText(pm.text)}
                          {pm.isEdited && (
                            <span className="text-[9px] text-amber-400/90 font-normal mr-1 select-none">(معدلة ✏️)</span>
                          )}
                        </div>
                      )
                    )}

                    {/* Media in PM */}
                    {pm.mediaUrl && (
                      <div
                        onClick={() => {
                          const url = pm.mediaUrl;
                          if (!url) return;
                          const isVid = url.startsWith('data:video') || url.endsWith('.mp4') || url.endsWith('.webm');
                          setActiveMediaViewer({
                            url,
                            type: isVid ? 'video' : 'image',
                            title: `وسائط من @${pm.fromUsername}`
                          });
                        }}
                        className="mt-1 cursor-pointer relative group rounded-lg overflow-hidden border border-slate-300 max-h-36"
                        title="انقر لعرض وتكبير الوسائط"
                      >
                        {pm.mediaUrl.startsWith('data:video') || pm.mediaUrl.endsWith('.mp4') || pm.mediaUrl.endsWith('.webm') ? (
                          <div className="relative bg-black max-h-36 w-full flex items-center justify-center">
                            <video src={pm.mediaUrl} className="max-h-36 object-cover w-full" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/20">
                              <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white shadow-lg">
                                <Play className="w-4 h-4 fill-white ml-0.5" />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <img src={pm.mediaUrl} alt="media" className="rounded-lg max-h-36 object-cover border group-hover:opacity-90 transition-opacity" />
                        )}
                      </div>
                    )}

                    {/* Self-Destructing Indicator if active */}
                    {pm.selfDestructAt && (
                      <div className="mt-0.5 flex items-center gap-1 px-1.5 py-0.2 rounded bg-rose-950/80 border border-rose-500/40 text-rose-300 text-[9px] font-mono shadow-xs animate-pulse w-fit">
                        <Flame className="w-3 h-3 text-rose-400 animate-bounce" />
                        <span>تختفي خلال:</span>
                        <SelfDestructCountdown targetAt={pm.selfDestructAt} />
                      </div>
                    )}

                    <div className={`text-[9px] font-mono mt-0.5 flex items-center gap-1 ${isMe ? 'text-amber-300/70 justify-end' : 'text-slate-400 justify-start'}`}>
                      <span title={pm.timestamp ? new Date(pm.timestamp).toLocaleString('ar-EG') : undefined}>{formatMessageTime(pm)}</span>
                      {isMe && (
                        <span className="inline-flex items-center gap-0.5 select-none">
                          {pm.status === 'read' ? (
                            <span className="inline-flex items-center gap-0.5 text-sky-400 font-bold" title="تمت القراءة">
                              <CheckCheck className="w-3 h-3 text-sky-400" />
                              <span className="text-[8px] font-sans">مقروءة</span>
                            </span>
                          ) : pm.status === 'delivered' ? (
                            <span className="inline-flex items-center gap-0.5 text-slate-400" title="مستلمة">
                              <CheckCheck className="w-3 h-3 text-slate-400" />
                              <span className="text-[8px] font-sans">مستلمة</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 text-slate-400" title="أُرسلت">
                              <Check className="w-2.5 h-2.5 text-slate-400" />
                              <span className="text-[8px] font-sans">أُرسلت</span>
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          {(Array.isArray(privateMessages) ? privateMessages : []).filter((pm) => {
            if (!pm || !pm.fromUsername || !pm.toUsername) return false;
            const pLower = (selectedPmUser.username || '').trim().toLowerCase();
            return pm.fromUsername.trim().toLowerCase() === pLower || pm.toUsername.trim().toLowerCase() === pLower;
          }).length === 0 && (
            <div className="text-center text-slate-400 py-6 text-xs">
              لا توجد رسائل بينك وبين {selectedPmUser.username} بعد.<br />
              اكتب رسالتك أو سجل مقطعاً صوتياً لبدء المحادثة المنفردة.
            </div>
          )}
          <div ref={pmMessagesEndRef} />
        </div>

        {/* Bottom PM Input Bar - Ultra Compact */}
        <div className={`p-1 sm:p-1.5 border-t ${curTheme.cardBorder || 'border-slate-800'} ${curTheme.cardBg || 'bg-[#19130d]'} flex flex-col gap-0.5 shadow-sm shrink-0`}>
          {/* PM Replying Banner */}
          {pmReplyingTo && (
            <div className="px-1.5 py-0.2 bg-amber-950/60 border border-amber-500/40 rounded flex items-center justify-between text-[10px] text-amber-200">
              <div className="flex items-center gap-1 min-w-0">
                <Reply className="w-2.5 h-2.5 text-amber-400 rotate-180 flex-shrink-0" />
                <span className="font-bold text-[9px]">رد على: @{pmReplyingTo.username}</span>
                <span className="truncate text-slate-400 text-[9px] max-w-[160px]">"{pmReplyingTo.text}"</span>
              </div>
              <button
                type="button"
                onClick={() => setPmReplyingTo(null)}
                className="p-0.5 text-slate-400 hover:text-red-400 rounded-full cursor-pointer"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          )}

          {/* Active Self-Destruct Banner Indicator */}
          {pmSelfDestructSeconds > 0 && (
            <div className="flex items-center justify-between px-1.5 py-0.2 bg-rose-950/80 border border-rose-500/50 rounded text-rose-200 text-[9px]">
              <div className="flex items-center gap-1 font-bold">
                <Flame className="w-2.5 h-2.5 text-rose-400 animate-bounce" />
                <span>رسالة ذاتية الاختفاء:</span>
                <span className="text-amber-300 font-mono">
                  {pmSelfDestructSeconds < 60 ? `${pmSelfDestructSeconds}ث` : `${Math.floor(pmSelfDestructSeconds / 60)}د`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPmSelfDestructSeconds(0)}
                className="px-1 text-rose-300 hover:text-white rounded text-[9px] font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Real-time PM Typing Indicator */}
          {selectedPmUser && Boolean(pmTypingUsers[selectedPmUser.username.trim().toLowerCase()]) && (
            <div className="flex items-center gap-1 px-1.5 py-0.2 bg-amber-500/10 border border-amber-500/30 rounded text-amber-300 text-[9px] font-bold animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              <span>{selectedPmUser.username} يكتب الآن... ✍️</span>
            </div>
          )}

          {selectedPmUser?.isPmDisabled && currentUser?.role !== 'hassan' && currentUser?.role !== 'admin' && currentUser?.role !== 'super' ? (
            <div className="p-1.5 bg-rose-950/80 border border-rose-500/50 rounded-lg text-center text-[10px] text-rose-200 font-bold flex items-center justify-center gap-1.5">
              <Lock className="w-3 h-3 text-rose-400 shrink-0" />
              <span>قام {selectedPmUser.username} بتعطيل استلام المحادثات الخاصة (الخاص مقفل 🔒)</span>
            </div>
          ) : isPmRecordingVoice ? (
            <div className="flex items-center justify-center py-0.5">
              <VoiceRecorder
                onSendVoice={(voiceData) => {
                  socket?.emit('privateMessage', {
                    toId: selectedPmUser.id,
                    toUsername: selectedPmUser.username,
                    text: '',
                    voiceNote: voiceData,
                    replyTo: pmReplyingTo || undefined,
                    selfDestructSeconds: pmSelfDestructSeconds > 0 ? pmSelfDestructSeconds : undefined
                  });
                  setPmReplyingTo(null);
                  setIsPmRecordingVoice(false);
                  showToast('تم إرسال التسجيل الصوتي في الخاص 🎙️', 'success');
                }}
                onCancel={() => setIsPmRecordingVoice(false)}
              />
            </div>
          ) : (
            <div className="flex items-center gap-1">
              {/* Media button */}
              <label className="p-1 text-slate-400 hover:text-indigo-400 cursor-pointer rounded hover:bg-slate-800 flex-shrink-0" title="إرسال صورة أو فيديو">
                <ImageIcon className="w-3.5 h-3.5 text-rose-500" />
                <input
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) =>
                    handleFileUpload(e, (dataUrl) => {
                      socket?.emit('privateMessage', {
                        toId: selectedPmUser.id,
                        toUsername: selectedPmUser.username,
                        text: '',
                        mediaUrl: dataUrl,
                        replyTo: pmReplyingTo || undefined,
                        selfDestructSeconds: pmSelfDestructSeconds > 0 ? pmSelfDestructSeconds : undefined
                      });
                      setPmReplyingTo(null);
                      showToast('تم إرسال الوسائط في الخاص 🎥📸', 'success');
                    })
                  }
                />
              </label>

              {/* Voice button */}
              <button
                type="button"
                onClick={() => setIsPmRecordingVoice(true)}
                className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded cursor-pointer transition-colors flex-shrink-0"
                title="تسجيل صوتي 🎙️"
              >
                <Mic className="w-3.5 h-3.5 text-rose-600" />
              </button>

              {/* Self-Destruct Timer Selector */}
              <div className="relative flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setShowPmSelfDestructMenu((v) => !v)}
                  className={`p-1 rounded cursor-pointer transition-all flex items-center gap-0.5 ${
                    pmSelfDestructSeconds > 0
                      ? 'bg-rose-950/90 text-rose-400 border border-rose-500/60 shadow-xs'
                      : 'text-slate-400 hover:text-rose-400 hover:bg-slate-800'
                  }`}
                  title="مؤقت التدمير الذاتي 🔥"
                >
                  <Flame className={`w-3 h-3 ${pmSelfDestructSeconds > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-400'}`} />
                  {pmSelfDestructSeconds > 0 && (
                    <span className="text-[8px] font-bold font-mono text-amber-300">
                      {pmSelfDestructSeconds < 60 ? `${pmSelfDestructSeconds}ث` : `${Math.floor(pmSelfDestructSeconds / 60)}د`}
                    </span>
                  )}
                </button>

                {showPmSelfDestructMenu && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute bottom-full mb-1 right-0 sm:right-auto sm:left-0 z-50 w-44 bg-[#19130d] border border-rose-500/40 rounded-lg p-1.5 shadow-2xl space-y-0.5 text-right animate-in fade-in zoom-in-95 duration-100 backdrop-blur-md"
                  >
                    <div className="flex items-center justify-between pb-0.5 border-b border-rose-500/20 text-rose-300 text-[9px] font-bold">
                      <span className="flex items-center gap-1">
                        <Flame className="w-2.5 h-2.5 text-rose-400" />
                        <span>مؤقت التدمير الذاتي</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowPmSelfDestructMenu(false)}
                        className="text-slate-400 hover:text-white p-0.5 cursor-pointer text-[9px]"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-0.5 pt-0.5">
                      {[
                        { sec: 0, label: 'إيقاف (رسالة عادية)', icon: '💬' },
                        { sec: 10, label: '10 ثوانٍ (سريعة)', icon: '⚡' },
                        { sec: 30, label: '30 ثانية (موصى بها)', icon: '⏱️' },
                        { sec: 60, label: '1 دقيقة واحدة', icon: '⏳' },
                        { sec: 300, label: '5 دقائق', icon: '⌛' }
                      ].map((opt) => (
                        <button
                          key={opt.sec}
                          type="button"
                          onClick={() => {
                            setPmSelfDestructSeconds(opt.sec);
                            setShowPmSelfDestructMenu(false);
                            if (opt.sec > 0) {
                              showToast(`تم تفعيل التدمير الذاتي: ${opt.sec < 60 ? `${opt.sec} ثانية` : `${Math.floor(opt.sec / 60)} دقيقة`} 🔥`, 'info');
                            } else {
                              showToast('تم إيقاف مؤقت التدمير الذاتي', 'info');
                            }
                          }}
                          className={`w-full flex items-center justify-between px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                            pmSelfDestructSeconds === opt.sec
                              ? 'bg-rose-900/70 text-amber-300 border border-rose-500/50'
                              : 'text-slate-300 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <span className="flex items-center gap-1">
                            <span>{opt.icon}</span>
                            <span>{opt.label}</span>
                          </span>
                          {pmSelfDestructSeconds === opt.sec && <Check className="w-2.5 h-2.5 text-amber-400" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Textarea */}
              <textarea
                rows={1}
                name="chat_pm_text_freeform"
                id="chat_pm_text_freeform"
                inputMode="text"
                enterKeyHint="send"
                autoComplete="off"
                placeholder={`رسالة خاصة إلى ${selectedPmUser.username}...`}
                value={pmInput}
                style={{ color: settingTextColor || curTheme.recommendedTextColor || '#fef3c7' }}
                onChange={(e) => {
                  setPmInput(e.target.value);
                  notifyPmTyping(e.target.value.trim().length > 0);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && pmInput.trim()) {
                    e.preventDefault();
                    notifyPmTyping(false);
                    const expandedText = expandClientShortcuts(pmInput.trim(), shortcuts);
                    socket?.emit('privateMessage', {
                      toId: selectedPmUser.id,
                      toUsername: selectedPmUser.username,
                      text: expandedText,
                      replyTo: pmReplyingTo || undefined,
                      selfDestructSeconds: pmSelfDestructSeconds > 0 ? pmSelfDestructSeconds : undefined
                    });
                    setPmInput('');
                    setPmReplyingTo(null);
                  }
                }}
                className={`flex-1 px-2 py-1 text-xs border ${curTheme.fieldBorder || 'border-slate-700'} rounded-lg ${curTheme.fieldBg || 'bg-slate-900 focus:bg-black'} ${curTheme.fieldText || 'text-slate-100'} ${curTheme.fieldPlaceholder || 'placeholder-slate-500'} outline-none ${curTheme.fieldFocus || 'focus:border-amber-500'} resize-none h-7 min-h-[28px] max-h-16 leading-tight font-medium overflow-hidden transition-all shadow-inner`}
              />

              {/* Send Button */}
              <button
                type="button"
                onClick={() => {
                  if (pmInput.trim()) {
                    notifyPmTyping(false);
                    const expandedText = expandClientShortcuts(pmInput.trim(), shortcuts);
                    socket?.emit('privateMessage', {
                      toId: selectedPmUser.id,
                      toUsername: selectedPmUser.username,
                      text: expandedText,
                      replyTo: pmReplyingTo || undefined,
                      selfDestructSeconds: pmSelfDestructSeconds > 0 ? pmSelfDestructSeconds : undefined
                    });
                    setPmInput('');
                    setPmReplyingTo(null);
                  }
                }}
                className={`px-2 py-0.5 h-7 ${curTheme.primaryBtn || 'bg-amber-500 hover:bg-amber-600 text-black'} rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap shadow-xs flex items-center gap-1`}
              >
                <span>إرسال</span>
                <Send className="w-2.5 h-2.5 rotate-180" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // =========================================================================
  // VIEW 2: INSIDE CHAT ROOM (Screenshots 2 - 13)
  // =========================================================================
  return (
    <div
      style={{
        height: 'var(--app-height, 100dvh)',
        maxHeight: 'var(--app-height, 100dvh)',
        top: 0,
        left: 0,
        right: 0,
        bottom: 'auto'
      }}
      className="fixed inset-x-0 top-0 z-10 w-full bg-[#070b13] text-[#e2e8f0] flex flex-col items-center justify-start antialiased font-sans select-none overflow-hidden"
    >
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-[#2d251f] border border-amber-500 text-amber-200 rounded-lg shadow-xl text-xs font-bold animate-pulse">
          {toast.message}
        </div>
      )}

      {/* Realtime Floating Like Alert (إشعار عائم فوري يظهر عند استلام لايك بالاسم والصورة) */}
      {floatingLikeAlert && (
        <div
          onClick={() => setFloatingLikeAlert(null)}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-55 max-w-sm w-[92%] sm:w-auto bg-gradient-to-r from-amber-950 via-[#231812] to-rose-950 border-2 border-amber-400 rounded-2xl shadow-2xl p-3 flex items-center gap-3 animate-in slide-in-from-top duration-300 cursor-pointer text-right"
          dir="rtl"
          title="انقر لإغلاق التنبيه"
        >
          <div className="relative shrink-0">
            <img
              src={floatingLikeAlert.fromAvatar || falconIcon}
              alt={floatingLikeAlert.fromUsername}
              className="w-11 h-11 rounded-full object-cover border-2 border-amber-400 shadow-md"
            />
            <span className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] shadow">
              ❤️
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-amber-300">إعجاب جديد لملفك الشخصي! ✨</span>
            </div>
            <div className="text-xs text-white font-bold truncate">
              أهدى لك <span className="text-amber-400 underline decoration-amber-500 font-black">[{floatingLikeAlert.fromUsername}]</span> لايك للملف الشخصي ❤️
            </div>
            <div className="text-[10px] text-amber-200/80 font-mono mt-0.5">
              رصيدك الحالي: {floatingLikeAlert.likes} إعجاب 👍
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setFloatingLikeAlert(null);
            }}
            className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center text-xs shrink-0 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 🎬 PERSISTENT FLOATING MINI-PLAYER & DRAGGABLE CAPSULE (مشغل الفيديو العائم والكبسولة القابلة للسحب بحرية) */}
      {floatingVideo && (
        <div
          id="persistent-floating-player-container"
          style={
            floatingPos
              ? { left: `${floatingPos.x}px`, top: `${floatingPos.y}px`, bottom: 'auto', right: 'auto' }
              : { left: '16px', bottom: '64px' }
          }
          className="fixed z-55 select-none"
          dir="rtl"
        >
          {/* 1. MINIMIZED DRAGGABLE CAPSULE (الكبسولة المصغرة جداً القابلة للسحب في أي مكان) */}
          {isFloatingVideoMinimized && (
            <div
              onPointerDown={handleFloatingDragStart}
              onPointerMove={handleFloatingDragMove}
              onPointerUp={handleFloatingDragEnd}
              onPointerCancel={handleFloatingDragEnd}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-950/95 border-2 border-amber-400 rounded-full shadow-2xl text-white backdrop-blur-md cursor-grab active:cursor-grabbing touch-none select-none max-w-[290px] animate-in fade-in zoom-in-95 duration-150"
              title="انقر واسحب لتحريك الكبسولة في أي مكان بحرية ⠿"
            >
              <span className="text-amber-400 font-mono text-xs cursor-grab select-none px-0.5">⠿</span>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <div className="flex items-center gap-1.5 min-w-0">
                {floatingVideo.type === 'youtube' ? (
                  <span className="px-1 py-0.2 bg-red-600 text-white rounded text-[8px] font-black shrink-0">
                    YouTube
                  </span>
                ) : (
                  <Video className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                )}
                <span className="text-[11px] font-bold truncate max-w-[95px] sm:max-w-[130px]">
                  {floatingVideo.title}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {/* Play / Pause Toggle inside Capsule */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isFloatingVideoPlaying) {
                      handlePauseFloatingMedia();
                    } else {
                      handlePlayFloatingMedia();
                    }
                  }}
                  className="p-1 hover:text-amber-400 text-amber-300 transition-colors cursor-pointer"
                  title={isFloatingVideoPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
                >
                  {isFloatingVideoPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                </button>
                {/* Native Picture-in-Picture Button */}
                {floatingVideo.type === 'video' && typeof document !== 'undefined' && 'pictureInPictureEnabled' in document && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTogglePiP();
                    }}
                    className="p-1 hover:text-amber-300 text-slate-300 transition-colors cursor-pointer"
                    title="تشغيل صورة داخل صورة (PiP) فوق التطبيقات الأخرى"
                  >
                    <Minimize2 className="w-3.5 h-3.5 text-amber-300" />
                  </button>
                )}
                {/* Restore / Expand to floating window */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFloatingVideoMinimized(false);
                    if (floatingVideoRef.current && floatingAudioRef.current) {
                      floatingVideoRef.current.currentTime = floatingAudioRef.current.currentTime;
                      if (!floatingAudioRef.current.paused) {
                        floatingVideoRef.current.play().catch(() => {});
                      }
                    }
                  }}
                  className="p-1 hover:text-amber-400 text-slate-300 transition-colors cursor-pointer"
                  title="تكبير المشغل العائم"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
                {/* Stop manually */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStopFloatingVideo();
                  }}
                  className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-colors cursor-pointer"
                  title="إيقاف الفيديو يدوياً ✕"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* 2. EXPANDED DRAGGABLE PLAYER */}
          <div
            className={`w-64 sm:w-72 bg-slate-950/95 border-2 border-amber-400 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-white backdrop-blur-md transition-all duration-200 ${
              isFloatingVideoMinimized ? 'hidden' : 'flex'
            }`}
          >
            {/* Draggable Header */}
            <div
              onPointerDown={handleFloatingDragStart}
              onPointerMove={handleFloatingDragMove}
              onPointerUp={handleFloatingDragEnd}
              onPointerCancel={handleFloatingDragEnd}
              className="p-1.5 bg-gradient-to-r from-amber-600 via-rose-600 to-amber-700 flex items-center justify-between text-[11px] font-bold shadow-xs cursor-grab active:cursor-grabbing touch-none select-none"
              title="انقر واسحب من هنا لتحريك المشغل في أي مكان على الشاشة ⠿"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-yellow-200 font-mono text-xs cursor-grab select-none px-0.5">⠿</span>
                {floatingVideo.type === 'youtube' ? (
                  <div className="px-1.5 py-0.2 bg-red-600 text-white rounded text-[9px] font-black shrink-0">
                    YouTube
                  </div>
                ) : (
                  <Video className="w-3.5 h-3.5 text-yellow-300 shrink-0" />
                )}
                <span className="truncate max-w-[100px] sm:max-w-[130px]" title={floatingVideo.title}>
                  {floatingVideo.title}
                </span>
                {floatingVideo.author && (
                  <span className="text-[9px] text-amber-200/80 truncate hidden sm:inline">
                    (@{floatingVideo.author})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {/* Native Picture-in-Picture Button */}
                {floatingVideo.type === 'video' && typeof document !== 'undefined' && 'pictureInPictureEnabled' in document && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTogglePiP();
                    }}
                    className="w-5 h-5 rounded hover:bg-black/30 flex items-center justify-center cursor-pointer transition-colors"
                    title="تشغيل صورة داخل صورة (PiP) فوق التطبيقات الأخرى"
                  >
                    <Minimize2 className="w-3 h-3 text-yellow-300" />
                  </button>
                )}
                {/* Minimize to capsule pill */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFloatingVideoMinimized(true);
                  }}
                  className="w-5 h-5 rounded hover:bg-black/30 flex items-center justify-center cursor-pointer transition-colors"
                  title="تصغير إلى كبسولة صوتية عائمة قابلة للسحب"
                >
                  <Minimize2 className="w-3 h-3 text-white" />
                </button>
                {/* Expand / Maximize to full lightbox / wall */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (floatingVideo.type === 'video') {
                      const currTime = floatingVideoRef.current ? floatingVideoRef.current.currentTime : 0;
                      setActiveMediaViewer({
                        url: floatingVideo.url,
                        type: 'video',
                        title: floatingVideo.title
                      });
                      setFloatingVideo(null);
                    } else {
                      setActiveDrawer('wall');
                    }
                  }}
                  className="w-5 h-5 rounded hover:bg-black/30 flex items-center justify-center cursor-pointer transition-colors"
                  title={floatingVideo.type === 'video' ? 'تكبير إلى الشاشة الكاملة' : 'فتح الحائط لمشاهدة المنشور'}
                >
                  <Maximize2 className="w-3 h-3 text-white" />
                </button>
                {/* Close / Stop manually */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStopFloatingVideo();
                  }}
                  className="w-5 h-5 rounded hover:bg-red-700 bg-red-600/60 flex items-center justify-center cursor-pointer transition-colors"
                  title="إيقاف الفيديو يدوياً ✕"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            </div>

            {/* Video or YouTube Viewport */}
            {floatingVideo.type === 'youtube' && floatingVideo.youtubeId ? (
              <div className="relative w-full aspect-video bg-black flex flex-col items-center justify-center overflow-hidden">
                <iframe
                  ref={youtubeIframeRef}
                  src={getYouTubeEmbedUrl(floatingVideo.youtubeId, true)}
                  title={floatingVideo.title}
                  className="w-full flex-1 border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
                <div className="w-full px-2 py-1 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-[10px]">
                  <span className="text-amber-300 font-bold truncate max-w-[140px]">
                    يوتيوب يعمل بالخلفية
                  </span>
                  <a
                    href={getYouTubeWatchUrl(floatingVideo.youtubeId)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[9px] bg-red-600 hover:bg-red-700 text-white px-2 py-0.5 rounded font-bold flex items-center gap-1 transition-colors"
                    title="فتح في تطبيق يوتيوب للتشغيل مع قفل الشاشة"
                  >
                    <span>تطبيق يوتيوب</span>
                    <span>↗</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="relative w-full h-32 sm:h-36 bg-black flex items-center justify-center overflow-hidden group">
                {/* Visual Video (muted so it only renders visual frames without double audio) */}
                <video
                  ref={floatingVideoRef}
                  src={floatingVideo.url}
                  autoPlay
                  playsInline
                  {...({ autoPictureInPicture: 'true' } as any)}
                  muted={true}
                  onTimeUpdate={() => {
                    if (floatingAudioRef.current && floatingVideoRef.current) {
                      const diff = Math.abs(floatingVideoRef.current.currentTime - floatingAudioRef.current.currentTime);
                      if (diff > 0.4) {
                        floatingAudioRef.current.currentTime = floatingVideoRef.current.currentTime;
                      }
                    }
                  }}
                  className="w-full h-full object-contain"
                />
                {/* Quick Hover Controls Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (isFloatingVideoPlaying) {
                        handlePauseFloatingMedia();
                      } else {
                        handlePlayFloatingMedia();
                      }
                    }}
                    className="w-8 h-8 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center shadow-md cursor-pointer transition-transform active:scale-90"
                    title={isFloatingVideoPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
                  >
                    {isFloatingVideoPlaying ? <Volume2 className="w-4 h-4 fill-slate-950" /> : <Play className="w-4 h-4 fill-slate-950 ml-0.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const nextMuted = !isFloatingVideoMuted;
                      setIsFloatingVideoMuted(nextMuted);
                      if (floatingAudioRef.current) {
                        floatingAudioRef.current.muted = nextMuted;
                      }
                    }}
                    className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center shadow-md cursor-pointer transition-colors"
                    title={isFloatingVideoMuted ? 'تفعيل الصوت' : 'كتم الصوت'}
                  >
                    {isFloatingVideoMuted ? <VolumeX className="w-4 h-4 text-rose-300" /> : <Volume2 className="w-4 h-4 text-amber-300" />}
                  </button>
                </div>
              </div>
            )}

            {/* Persistent Sub-bar indicator with Drag hint */}
            <div
              onPointerDown={handleFloatingDragStart}
              onPointerMove={handleFloatingDragMove}
              onPointerUp={handleFloatingDragEnd}
              onPointerCancel={handleFloatingDragEnd}
              className="px-2 py-0.5 bg-slate-900 border-t border-slate-800 text-[10px] text-amber-300 flex items-center justify-between select-none cursor-grab active:cursor-grabbing touch-none"
            >
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>مشغل عائم حر (اسحب للتحريك) ⠿</span>
              </span>
              <span className="text-slate-400 text-[9px]">انقر ✕ للإيقاف يدوياً</span>
            </div>
          </div>
        </div>
      )}



      {/* Admin/Supervisor Warning Dispatch Modal */}
      {warningModalTarget && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setWarningModalTarget(null);
              setCustomWarningText('');
            }
          }}
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs text-right animate-in fade-in duration-200"
        >
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border-2 border-amber-500 overflow-hidden text-slate-900">
            <div className="bg-[#241a12] text-amber-200 p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <span>إرسال تنبيه إداري لـ [{warningModalTarget.username}]</span>
              </div>
              <button
                onClick={() => {
                  setWarningModalTarget(null);
                  setCustomWarningText('');
                }}
                className="w-7 h-7 bg-red-600 hover:bg-red-700 text-white rounded font-bold flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3 text-xs">
              <div className="text-slate-600 font-bold">اختر نص تنبيه رسمي معتمد أو اكتب نصك الخاص:</div>
              <div className="space-y-1.5">
                {[
                  'يرجى احترام المتواجدين والالتزام بآداب الحديث.',
                  'ممنوع نشر الروابط والإعلانات أو الترويج في الشات.',
                  'يمنع استخدام الألفاظ غير اللائقة أو السب والقذف.',
                  'تنبيه إداري أخير: الالتزام بقواعد الشات تجنباً لتطبيق عقوبة الطرد أو الباند.'
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCustomWarningText(preset)}
                    className="w-full text-right p-2 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-950 text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    ⚠️ {preset}
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">نص التنبيه:</label>
                <textarea
                  value={customWarningText}
                  onChange={(e) => setCustomWarningText(e.target.value)}
                  placeholder="اكتب نص التنبيه المخصص هنا..."
                  rows={2}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-amber-500 font-medium"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const textToSend = customWarningText.trim() || 'يرجى الالتزام بقوانين حسان برو واحترام المتواجدين.';
                    handleAdminAction('warn', warningModalTarget.username, textToSend);
                    setWarningModalTarget(null);
                    setCustomWarningText('');
                    showToast(`تم إرسال التنبيه الرسمي إلى ${warningModalTarget.username} ✉️`, 'success');
                  }}
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow transition-all cursor-pointer text-xs"
                >
                  إرسال التنبيه الآن ⚠️
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWarningModalTarget(null);
                    setCustomWarningText('');
                  }}
                  className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🎵 CUSTOM AUDIO ALERTS CENTER MODAL (مركز التنبيهات الصوتية المخصصة) */}
      {showSoundModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSoundModal(false);
          }}
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-3 backdrop-blur-xs text-right animate-in fade-in duration-200"
        >
          <div className="w-full max-w-md max-h-[92vh] bg-white rounded-2xl shadow-2xl border-2 border-amber-500 overflow-hidden text-slate-900 flex flex-col">
            
            {/* Modal Header */}
            <div className="bg-[#241a12] text-amber-200 p-3.5 flex items-center justify-between border-b border-[#3e2c1c] flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                  <Volume2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-amber-200 leading-tight">مركز التنبيهات الصوتية المخصصة</h3>
                  <p className="text-[10px] text-amber-300/80">نغمات فريدة تختلف تلقائياً باختلاف نوع كل حدث</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSoundModal(false)}
                className="w-7 h-7 bg-red-600/90 hover:bg-red-700 text-white rounded-lg flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-3.5 space-y-3.5 overflow-y-auto flex-1 text-xs">
              
              {/* Master Mute & Sequential Test Bar */}
              <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs text-amber-950 flex items-center gap-1.5">
                    <span>🔔 حالة الصوت العامة:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !soundsMuted;
                      setSoundsMuted(next);
                      sounds.setMuted(next);
                      showToast(next ? 'تم كتم جميع التنبيهات 🔇' : 'تم تفعيل جميع الأصوات 🔔', 'info');
                    }}
                    className={`px-3 py-1 rounded-full font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                      soundsMuted ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                  >
                    {soundsMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    <span>{soundsMuted ? 'كتم الأصوات' : 'الأصوات مفعّلة'}</span>
                  </button>
                </div>

                {/* Sequence Test Button */}
                <button
                  type="button"
                  disabled={testingSequence}
                  onClick={handlePlayToneSequence}
                  className="w-full py-2 bg-gradient-to-l from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 disabled:opacity-60 text-white font-black text-xs rounded-xl shadow flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>
                    {testingSequence
                      ? 'جارٍ الاستماع المتتابع (عام 📢 ➔ خاص 💬 ➔ منشن 🔔)...'
                      : '🎵 اختبار النغمات الثلاث بالتتابع للمقارنة'}
                  </span>
                </button>
              </div>

              {/* EVENT 1: General Notification / Alert (إشعار عام) */}
              <div
                className={`p-3 rounded-xl border-2 transition-all ${
                  activePlayingSound === 'alert'
                    ? 'border-amber-500 bg-amber-100/60 ring-2 ring-amber-400 shadow-md'
                    : 'border-amber-200 bg-amber-50/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-amber-500 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                      📢
                    </span>
                    <div>
                      <div className="font-black text-xs text-amber-950">1. إشعار وتنبيه عام (General Alert)</div>
                      <div className="text-[10px] text-amber-800/80">للإعلانات الرسمية والتعميمات الإدارية بالغرفة</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActivePlayingSound('alert');
                      sounds.previewAlertSound(selectedAlertSound);
                      setTimeout(() => setActivePlayingSound(null), 600);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>تجربة</span>
                  </button>
                </div>
                <select
                  value={selectedAlertSound}
                  onChange={(e) => {
                    const id = e.target.value as AlertSoundId;
                    setSelectedAlertSound(id);
                    sounds.setAlertSound(id);
                    sounds.previewAlertSound(id);
                    showToast('تم ضبط نغمة الإشعار العام بنجاح 📢', 'success');
                  }}
                  className="w-full p-2 border border-amber-300 rounded-lg text-xs bg-white text-slate-800 font-semibold outline-none focus:border-amber-600"
                >
                  {ALERT_SOUND_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.icon} {opt.label} — {opt.desc}
                    </option>
                  ))}
                </select>
              </div>

              {/* EVENT 2: Private Message (رسالة خاصة) */}
              <div
                className={`p-3 rounded-xl border-2 transition-all ${
                  activePlayingSound === 'private'
                    ? 'border-indigo-500 bg-indigo-100/60 ring-2 ring-indigo-400 shadow-md'
                    : 'border-indigo-200 bg-indigo-50/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                      💬
                    </span>
                    <div>
                      <div className="font-black text-xs text-indigo-950">2. رسالة خاصة (Private Message)</div>
                      <div className="text-[10px] text-indigo-800/80">تصدر فور ورود رسالة بمحادثة خاصة وسرية</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActivePlayingSound('private');
                      sounds.previewPrivateSound(selectedPrivateSound);
                      setTimeout(() => setActivePlayingSound(null), 600);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>تجربة</span>
                  </button>
                </div>
                <select
                  value={selectedPrivateSound}
                  onChange={(e) => {
                    const id = e.target.value as PrivateSoundId;
                    setSelectedPrivateSound(id);
                    sounds.setPrivateSound(id);
                    sounds.previewPrivateSound(id);
                    showToast('تم ضبط نغمة الرسائل الخاصة بنجاح 💬', 'success');
                  }}
                  className="w-full p-2 border border-indigo-300 rounded-lg text-xs bg-white text-slate-800 font-semibold outline-none focus:border-indigo-600"
                >
                  {PRIVATE_SOUND_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.icon} {opt.label} — {opt.desc}
                    </option>
                  ))}
                </select>
              </div>

              {/* EVENT 3: Mention / @Username (إشارة @ باسم المستخدم) */}
              <div
                className={`p-3 rounded-xl border-2 transition-all ${
                  activePlayingSound === 'mention'
                    ? 'border-rose-500 bg-rose-100/60 ring-2 ring-rose-400 shadow-md'
                    : 'border-rose-200 bg-rose-50/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-rose-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                      🔔
                    </span>
                    <div>
                      <div className="font-black text-xs text-rose-950">3. إشارة @ بالاسم (Mention @)</div>
                      <div className="text-[10px] text-rose-800/80">عندما يقوم شخص بمناداتك وكتابة @اسمك بالدردشة</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActivePlayingSound('mention');
                      sounds.previewMentionSound(selectedMentionSound);
                      setTimeout(() => setActivePlayingSound(null), 600);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>تجربة</span>
                  </button>
                </div>
                <select
                  value={selectedMentionSound}
                  onChange={(e) => {
                    const id = e.target.value as MentionSoundId;
                    setSelectedMentionSound(id);
                    sounds.setMentionSound(id);
                    sounds.previewMentionSound(id);
                    showToast('تم ضبط نغمة الإشارة والمنشن بنجاح 🔔', 'success');
                  }}
                  className="w-full p-2 border border-rose-300 rounded-lg text-xs bg-white text-slate-800 font-semibold outline-none focus:border-rose-600"
                >
                  {MENTION_SOUND_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.icon} {opt.label} — {opt.desc}
                    </option>
                  ))}
                </select>
              </div>

              {/* Additional General Sounds (Collapsible / Compact) */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="text-xs font-bold text-slate-800 border-b pb-1">نغمات عامة إضافية للغرفة:</div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <div className="flex items-center justify-between mb-1 font-semibold text-slate-700">
                      <span>رسائل الغرفة:</span>
                      <button
                        type="button"
                        onClick={() => sounds.previewMessageSound(selectedMsgSound)}
                        className="text-indigo-600 hover:underline cursor-pointer"
                      >
                        تجربة
                      </button>
                    </div>
                    <select
                      value={selectedMsgSound}
                      onChange={(e) => {
                        const id = e.target.value as MessageSoundId;
                        setSelectedMsgSound(id);
                        sounds.setMessageSound(id);
                        sounds.previewMessageSound(id);
                      }}
                      className="w-full p-1.5 border border-slate-300 rounded-md text-xs bg-white text-slate-800"
                    >
                      {MESSAGE_SOUND_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.icon} {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1 font-semibold text-slate-700">
                      <span>دخول الأعضاء:</span>
                      <button
                        type="button"
                        onClick={() => sounds.previewJoinSound(selectedJoinSound)}
                        className="text-indigo-600 hover:underline cursor-pointer"
                      >
                        تجربة
                      </button>
                    </div>
                    <select
                      value={selectedJoinSound}
                      onChange={(e) => {
                        const id = e.target.value as JoinSoundId;
                        setSelectedJoinSound(id);
                        sounds.setJoinSound(id);
                        sounds.previewJoinSound(id);
                      }}
                      className="w-full p-1.5 border border-slate-300 rounded-md text-xs bg-white text-slate-800"
                    >
                      {JOIN_SOUND_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.icon} {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 🔔 WEB NOTIFICATIONS API PANEL (تنبيهات المتصفح في الخلفية والشاشة مغلقة) */}
              <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-black text-xs text-amber-950">
                    <BellRing className="w-4 h-4 text-amber-600 animate-pulse" />
                    <span>تنبيهات للمتصفح بالخلفية (Web Notifications API)</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    notificationPermission === 'granted'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : notificationPermission === 'denied'
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}>
                    {notificationPermission === 'granted'
                      ? '✓ مفعّلة بنجاح'
                      : notificationPermission === 'denied'
                      ? '✕ محظورة بالمتصفح'
                      : '⏳ بانتظار الإذن'}
                  </span>
                </div>
                <p className="text-[10px] text-amber-900 leading-relaxed">
                  نظام التنبيهات يعمل حتى لو كان المتصفح مصغراً أو شاشة الهاتف مقفلة، لتنبيهك فوراً بصوت واهتزاز عند وصول <strong>رسالة خاصة جديدة</strong> أو <strong>منشن (@)</strong>.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  {notificationPermission !== 'granted' && (
                    <button
                      type="button"
                      onClick={() => {
                        requestNotificationPermission().then((perm) => {
                          setNotificationPermission(perm);
                          if (perm === 'granted') {
                            showToast('تم تفعيل إشعارات المتصفح بنجاح! 🔔', 'success');
                            sendTestNotification().catch(() => {});
                          } else if (perm === 'denied') {
                            showToast('تم حظر الإشعارات في إعدادات المتصفح', 'error');
                          }
                        });
                      }}
                      className="flex-1 py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow-xs flex items-center justify-center gap-1 cursor-pointer transition-all"
                    >
                      <Bell className="w-3.5 h-3.5" />
                      <span>طلب الإذن والتفعيل الآن 🔔</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (notificationPermission !== 'granted') {
                        requestNotificationPermission().then((perm) => {
                          setNotificationPermission(perm);
                          if (perm === 'granted') {
                            sendTestNotification().catch(() => {});
                            showToast('تم إرسال إشعار تجريبي للمتصفح 🧪', 'success');
                          } else {
                            showToast('يرجى السماح بالإشعارات في المتصفح أولاً', 'info');
                          }
                        });
                      } else {
                        sendTestNotification().then((sent) => {
                          if (sent) {
                            showToast('تم إرسال إشعار تجريبي للمتصفح 🧪', 'success');
                          } else {
                            showToast('تعذر إرسال الإشعار، تأكد من إعدادات النظام', 'error');
                          }
                        });
                      }
                    }}
                    className={`py-1.5 px-3 font-bold text-xs rounded-lg border shadow-xs flex items-center justify-center gap-1 cursor-pointer transition-all ${
                      notificationPermission === 'granted'
                        ? 'flex-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-400'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>تجربة إشعار فوري 🧪</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
              <span className="text-[11px] text-slate-500 font-medium">يتم حفظ خياراتك تلقائياً في المتصفح</span>
              <button
                type="button"
                onClick={() => setShowSoundModal(false)}
                className="px-5 py-2 bg-[#241a12] hover:bg-black text-amber-300 font-bold rounded-xl text-xs shadow transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>حفظ وإغلاق</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 📢 BROADCAST GENERAL ALERT MODAL (إرسال إشعار عام للغرفة) */}
      {showBroadcastModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowBroadcastModal(false);
              setBroadcastAlertText('');
            }
          }}
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-xs text-right animate-in fade-in duration-200"
        >
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border-2 border-amber-500 overflow-hidden text-slate-900">
            <div className="bg-[#241a12] text-amber-200 p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Megaphone className="w-5 h-5 text-amber-400" />
                <span>إرسال إشعار عام للغرفة 📢</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowBroadcastModal(false);
                  setBroadcastAlertText('');
                }}
                className="w-7 h-7 bg-red-600 hover:bg-red-700 text-white rounded font-bold flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSendBroadcastAlert} className="p-4 space-y-3 text-xs">
              <div className="text-slate-600 font-medium">
                سيتم بث هذا الإشعار لجميع المتواجدين في الغرفة، وتشغيل نغمة <strong className="text-amber-700">الإشعار العام</strong> على أجهزتهم:
              </div>
              <textarea
                name="chat_broadcast_alert"
                id="chat_broadcast_alert"
                autoComplete="off"
                autoCorrect="on"
                autoCapitalize="sentences"
                spellCheck={true}
                data-form-type="other"
                data-lpignore="true"
                data-1p-ignore="true"
                value={broadcastAlertText}
                onChange={(e) => setBroadcastAlertText(e.target.value)}
                placeholder="اكتب نص الإشعار أو التعميم العام هنا..."
                rows={3}
                required
                className="w-full p-2.5 border border-slate-300 rounded-lg text-xs outline-none focus:border-amber-500 font-medium"
              />
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={!broadcastAlertText.trim()}
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold rounded-xl shadow transition-all cursor-pointer text-xs flex items-center justify-center gap-1.5"
                >
                  <Megaphone className="w-3.5 h-3.5" />
                  <span>بث الإشعار للجميع 📢</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowBroadcastModal(false);
                    setBroadcastAlertText('');
                  }}
                  className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🔍 MODAL: REVEAL NICKS, IP, & ACCOUNT COUNT (كشف النكات والآي بي والعضويات) */}
      {showRevealedNicksModal && revealedNicksData && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowRevealedNicksModal(false);
          }}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 backdrop-blur-xs text-right animate-in fade-in duration-200"
        >
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border-2 border-amber-500 overflow-hidden text-slate-900 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-[#241a12] text-amber-200 p-3 flex items-center justify-between border-b border-[#3e2c1c]">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-amber-400" />
                <span className="font-black text-sm">كشف النكات وتفاصيل العضويات 🔍</span>
              </div>
              <button
                type="button"
                onClick={() => setShowRevealedNicksModal(false)}
                className="w-7 h-7 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3.5 overflow-y-auto text-xs">
              {/* User Identity Card */}
              <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-300 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <img
                      src={falconIcon}
                      alt={revealedNicksData.targetUsername}
                      className="w-11 h-11 rounded-xl object-cover border-2 border-amber-500 shadow-xs"
                    />
                    {revealedNicksData.isOnline && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
                    )}
                  </div>
                  <div>
                    <div className="font-black text-sm text-slate-900 flex items-center gap-1.5">
                      <span>{revealedNicksData.targetUsername}</span>
                      <span>{revealedNicksData.flag}</span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      الغرفة: {revealedNicksData.room} • الرتبة: {revealedNicksData.role}
                    </div>
                  </div>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  revealedNicksData.isOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                }`}>
                  {revealedNicksData.isOnline
                    ? '● متصل الآن'
                    : `● غير متصل ${revealedNicksData.lastSeen ? `(آخر ظهور: ${revealedNicksData.lastSeen})` : ''}`}
                </span>
              </div>

              {/* IP Address Card with Copy Button */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-300 space-y-2">
                <div className="text-[10px] font-bold text-slate-500 flex items-center justify-between">
                  <span>عنوان الآي بي المكتشف (Real IP Address):</span>
                  <span className="text-emerald-700 font-mono">حقيقي ومتحقق منه ✔️</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-900 text-amber-300 rounded-lg font-mono text-sm font-bold shadow-inner">
                  <span className="tracking-wider">{revealedNicksData.ip || 'غير مسجل'}</span>
                  {revealedNicksData.ip && revealedNicksData.ip !== 'غير مسجل' && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(revealedNicksData.ip);
                        showToast(`تم نسخ الآي بي: ${revealedNicksData.ip} 📋`, 'success');
                      }}
                      className="px-2 py-0.5 bg-amber-500 hover:bg-amber-600 text-black text-[10px] font-black rounded cursor-pointer transition-colors"
                    >
                      نسخ الـ IP
                    </button>
                  )}
                </div>

                {/* All historical real IPs used by this member (سجل جميع الآيبيهات الحقيقية التي دخل بها العضو أوفلاين وأونلاين) */}
                {revealedNicksData.ipHistory && revealedNicksData.ipHistory.length > 0 && (
                  <div className="pt-1.5 border-t border-slate-200">
                    <div className="text-[10px] font-bold text-slate-600 mb-1 flex items-center justify-between">
                      <span>سجل الآيبيهات الحقيقية التي دخل بها ({revealedNicksData.ipHistory.length}):</span>
                      <span className="text-[9px] text-slate-500 font-normal">شامل أوفلاين وأونلاين</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                      {revealedNicksData.ipHistory.map((histIp, hIdx) => (
                        <div
                          key={hIdx}
                          className="flex items-center gap-1.5 px-2 py-0.5 bg-white border border-slate-300 rounded text-[11px] font-mono text-slate-800 shadow-2xs"
                        >
                          <span className={histIp === revealedNicksData.ip ? 'font-black text-amber-600' : ''}>
                            {histIp}
                          </span>
                          <button
                            type="button"
                            title="نسخ هذا الـ IP"
                            onClick={() => {
                              navigator.clipboard.writeText(histIp);
                              showToast(`تم نسخ الآي بي: ${histIp} 📋`, 'success');
                            }}
                            className="text-[9px] px-1 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded cursor-pointer transition-colors"
                          >
                            نسخ
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Device and Country Cards (اسم الجهاز والدولة والعلم) */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-300">
                  <div className="text-[10px] font-bold text-slate-500 mb-0.5">اسم الجهاز (Device):</div>
                  <div className="font-bold text-xs text-slate-900 truncate" title={revealedNicksData.device}>
                    📱 {revealedNicksData.device || 'هاتف ذكي / Mobile'}
                  </div>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-300">
                  <div className="text-[10px] font-bold text-slate-500 mb-0.5">الدولة والعلم:</div>
                  <div className="font-bold text-xs text-slate-900 flex items-center gap-1">
                    <span>{revealedNicksData.country || revealedNicksData.flag || '🇸🇦'}</span>
                    <span className="truncate">{revealedNicksData.country || getCountryNameFromFlag(revealedNicksData.flag) || 'المملكة العربية السعودية'}</span>
                  </div>
                </div>
              </div>

              {/* Incognito / Privacy Detection Badge */}
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-300 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-600">نوع جلسة التصفح:</span>
                {revealedNicksData.isIncognito ? (
                  <span className="px-2 py-0.5 rounded-full bg-purple-100 border border-purple-300 text-purple-900 font-black text-[11px] flex items-center gap-1 shadow-xs">
                    <span>🕵️</span>
                    <span>وضع التصفح المتخفي (Incognito Mode)</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-[11px] flex items-center gap-1">
                    <span>🌐</span>
                    <span>تصفح عادي / قياسي</span>
                  </span>
                )}
              </div>

              {/* Phone / Hardware Fingerprint Card (بصمة الهاتف والجهاز المادية) */}
              <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-300 space-y-1.5">
                <div className="text-[10px] font-bold text-amber-900 flex items-center justify-between">
                  <span className="flex items-center gap-1 font-black">
                    <Zap className="w-3.5 h-3.5 text-amber-600" />
                    <span>بصمة الهاتف والجهاز (Hardware Fingerprint):</span>
                  </span>
                  <span className="text-[9px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-mono font-bold">بصمة ثابتة</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-900 text-emerald-400 rounded-lg font-mono text-xs font-bold shadow-inner">
                  <span className="tracking-widest truncate">{revealedNicksData.deviceFingerprint || 'FP-DEV-STANDARD'}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(revealedNicksData.deviceFingerprint || '');
                      showToast(`تم نسخ بصمة الهاتف: ${revealedNicksData.deviceFingerprint} 📋`, 'success');
                    }}
                    className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black rounded cursor-pointer transition-colors mr-2 shrink-0"
                  >
                    نسخ البصمة
                  </button>
                </div>
                <p className="text-[10px] text-amber-800">
                  معرف دقيق وثابت يستخرج من خصائص معالج هاتف العضو ودقة الشاشة واللمس، ويكشف العضو حتى لو بدل اسمه أو متصفحه.
                </p>
              </div>

              {/* Total Memberships / Accounts entered by this IP & Device */}
              <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs text-indigo-950">
                    العضويات المرتبطة بهذا الحساب (نفس الهاتف / الـ IP):
                  </span>
                  <span className="px-2.5 py-0.5 bg-indigo-600 text-white font-black rounded-full text-xs shadow-xs">
                    {revealedNicksData.accountsCount} {revealedNicksData.accountsCount === 1 ? 'عضوية' : 'عضويات'}
                  </span>
                </div>
                <p className="text-[10px] text-indigo-800/80">
                  جميع الأسماء والنكات التي دخل بها هذا الجهاز وسجلت عبر نفس الهاتف (بصمة المعالج وكرت الشاشة) أو نفس الـ IP:
                </p>

                {/* Nicknames list */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {revealedNicksData.accounts.map((nick, idx) => {
                    const isTarget = nick.toLowerCase() === revealedNicksData.targetUsername.toLowerCase();
                    const reason = revealedNicksData.accountMatchReasons?.[nick];
                    return (
                      <span
                        key={idx}
                        title={reason || undefined}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border shadow-2xs transition-all ${
                          isTarget
                            ? 'bg-amber-400 text-black border-amber-500 ring-2 ring-amber-300 font-black'
                            : 'bg-white text-slate-800 border-slate-300 hover:border-indigo-400'
                        }`}
                      >
                        <span>👤 {nick}</span>
                        {isTarget && (
                          <span className="text-[9px] bg-black text-amber-300 px-1 rounded font-normal">الحالي</span>
                        )}
                        {!isTarget && reason && (
                          <span className="text-[9px] bg-indigo-100 text-indigo-800 px-1 rounded font-medium border border-indigo-200">
                            📱 نفس الهاتف
                          </span>
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    handleAdminAction('kick', revealedNicksData.targetUsername, undefined, 'طرد إداري بعد كشف النكات');
                    setShowRevealedNicksModal(false);
                  }}
                  className="py-2 bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span>طرد العضو</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleAdminAction('ban', revealedNicksData.targetUsername, `حظر شامل للآي بي: ${revealedNicksData.ip}`);
                    setShowRevealedNicksModal(false);
                  }}
                  className="py-2 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-xs"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>حظر الآي بي (باند)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🎙️ MODAL: MIC MANAGEMENT (سحب المايك أو كتم المايك أو إفلات المايك) */}
      {micActionSlot && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setMicActionSlot(null);
          }}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 backdrop-blur-xs text-right animate-in fade-in duration-150"
        >
          <div className="w-full max-w-xs bg-white rounded-2xl shadow-2xl border-2 border-amber-500 overflow-hidden text-slate-900 flex flex-col">
            <div className="bg-[#241a12] text-amber-200 p-3 flex items-center justify-between border-b border-[#3e2c1c]">
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <Mic className="w-4 h-4 text-amber-400" />
                <span>إدارة المايك رقم ({micActionSlot.slotNumber})</span>
              </div>
              <button
                type="button"
                onClick={() => setMicActionSlot(null)}
                className="w-6 h-6 bg-red-600 hover:bg-red-700 text-white rounded flex items-center justify-center cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-3.5 space-y-3 text-xs">
              {micActionSlot.slotUser && (
                <div className="flex items-center gap-2.5 p-2 bg-slate-50 border rounded-xl">
                  <img
                    src={micActionSlot.slotUser.avatarUrl || falconIcon}
                    alt={micActionSlot.slotUser.username}
                    className="w-10 h-10 rounded-full object-cover border-2 border-amber-500"
                  />
                  <div>
                    <div className="font-bold text-xs text-slate-900 flex items-center gap-1">
                      <span>{micActionSlot.slotUser.username}</span>
                      <span>{micActionSlot.slotUser.flag}</span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {(micActionSlot.slotUser.id === currentUser.id || micActionSlot.slotUser.username === currentUser.username) ? 'أنت على هذا المايك' : 'عضو متصل بالمايك'}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {/* OPTION 1: Drop or Pull Mic (إفلات المايك / سحب المايك) */}
                {(micActionSlot.slotUser?.id === currentUser.id || micActionSlot.slotUser?.username === currentUser.username) ? (
                  <button
                    type="button"
                    onClick={() => {
                      handleDropMic();
                      setMicActionSlot(null);
                    }}
                    className="w-full py-2.5 px-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>إفلات المايك (النزول الآن) 👋</span>
                  </button>
                ) : (currentUser.role === 'hassan' || currentUser.role === 'admin' || currentUser.role === 'super' || getRoleLevel(currentUser.role) >= 75) ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (micActionSlot.slotUser) {
                        socket?.emit('adminAction', {
                          action: 'pullMic',
                          targetUsername: micActionSlot.slotUser.username
                        });
                        showToast(`تم سحب المايك من [${micActionSlot.slotUser.username}] 🚨`, 'info');
                      }
                      setMicActionSlot(null);
                    }}
                    className="w-full py-2.5 px-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all"
                  >
                    <VolumeX className="w-4 h-4" />
                    <span>سحب المايك من العضو 🚨</span>
                  </button>
                ) : null}

                {/* OPTION 2: Mute or Unmute Mic (كتم المايك / إلغاء الكتم) */}
                {(micActionSlot.slotUser?.id === currentUser.id || micActionSlot.slotUser?.username === currentUser.username) ? (
                  <button
                    type="button"
                    onClick={() => {
                      const isMuted = audioManager?.toggleMute() ?? false;
                      sounds.playToggleMute(isMuted);
                      showToast(isMuted ? 'تم كتم صوت الميكروفون 🔇' : 'تم تشغيل المايك 🎙️', 'info');
                      setMicActionSlot(null);
                    }}
                    className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl flex items-center justify-center gap-2 border cursor-pointer transition-colors"
                  >
                    {audioManager?.isMuted ? (
                      <>
                        <Mic className="w-4 h-4 text-emerald-600" />
                        <span>إلغاء كتم المايك 🎙️</span>
                      </>
                    ) : (
                      <>
                        <VolumeX className="w-4 h-4 text-rose-600" />
                        <span>كتم صوت المايك 🔇</span>
                      </>
                    )}
                  </button>
                ) : (currentUser.role === 'hassan' || currentUser.role === 'admin' || currentUser.role === 'super' || getRoleLevel(currentUser.role) >= 75) ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (micActionSlot.slotUser) {
                        handleAdminAction('mute', micActionSlot.slotUser.username);
                      }
                      setMicActionSlot(null);
                    }}
                    className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl flex items-center justify-center gap-2 border cursor-pointer transition-colors"
                  >
                    <VolumeX className="w-4 h-4 text-rose-600" />
                    <span>كتم المايك عن هذا العضو 🔇</span>
                  </button>
                ) : null}

                {/* OPTION 3: Open Profile if other member */}
                {micActionSlot.slotUser && micActionSlot.slotUser.id !== currentUser.id && (
                  <button
                    type="button"
                    onClick={() => {
                      openUserProfile(micActionSlot.slotUser!);
                      setMicActionSlot(null);
                    }}
                    className="w-full py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <UserIcon className="w-4 h-4" />
                    <span>عرض الملف الشخصي للعضو 👤</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🎬 CENTERED MEDIA LIGHTBOX VIEWER (فتح الفيديو أو الصورة وسط المكان مع زر توسيع وزر تحميل) */}
      {activeMediaViewer && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              if (activeMediaViewer.type === 'video') {
                const vidEl = document.getElementById('active-lightbox-video') as HTMLVideoElement | null;
                const cTime = vidEl ? vidEl.currentTime : 0;
                handleStartFloatingVideo({
                  url: activeMediaViewer.url,
                  title: activeMediaViewer.title || 'فيديو الحائط / الدردشة',
                  currentTime: cTime,
                  type: 'video'
                });
                showToast('يستمر الفيديو في العمل في المشغل العائم، انقر ✕ لإيقافه يدوياً 🎬', 'info');
              }
              setActiveMediaViewer(null);
            }
          }}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-2 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div className={`relative bg-[#17110c] rounded-2xl shadow-2xl border-2 border-amber-500 overflow-hidden flex flex-col text-slate-100 transition-all ${
            isFullscreenMedia ? 'w-full h-full max-w-none max-h-none rounded-none' : 'w-full max-w-md max-h-[85vh]'
          }`}>
            {/* Lightbox Header */}
            <div className="bg-[#241a12] text-amber-200 p-2.5 flex items-center justify-between border-b border-[#3e2c1c] flex-shrink-0">
              <div className="flex items-center gap-2">
                {activeMediaViewer.type === 'video' ? (
                  <Video className="w-4 h-4 text-amber-400" />
                ) : (
                  <ImageIcon className="w-4 h-4 text-amber-400" />
                )}
                <span className="font-bold text-xs truncate max-w-[170px]">
                  {activeMediaViewer.title || (activeMediaViewer.type === 'video' ? 'مشغل الفيديو' : 'عرض الوسائط')}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {/* Float / Picture-in-Picture button for videos (زر المشغل العائم) */}
                {activeMediaViewer.type === 'video' && (
                  <button
                    type="button"
                    onClick={() => {
                      const vidEl = document.getElementById('active-lightbox-video') as HTMLVideoElement | null;
                      const cTime = vidEl ? vidEl.currentTime : 0;
                      handleStartFloatingVideo({
                        url: activeMediaViewer.url,
                        title: activeMediaViewer.title || 'فيديو الحائط / الدردشة',
                        currentTime: cTime,
                        type: 'video'
                      });
                      setActiveMediaViewer(null);
                      setIsFullscreenMedia(false);
                      showToast('تم تصغير الفيديو إلى المشغل العائم، استمتع بالتصفح 🗗', 'info');
                    }}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                    title="متابعة تشغيل الفيديو في مشغل عائم أثناء تصفح الشات والرومات"
                  >
                    <Minimize2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">مشغل عائم</span>
                  </button>
                )}
                {/* Maximize / Expand button (زر توسيع / تكبير) */}
                <button
                  type="button"
                  onClick={() => setIsFullscreenMedia(!isFullscreenMedia)}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                  title={isFullscreenMedia ? 'تصغير' : 'توسيع / تكبير'}
                >
                  {isFullscreenMedia ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  <span>{isFullscreenMedia ? 'استعادة' : 'توسيع'}</span>
                </button>
                {/* Download button (زر تحميل) */}
                <button
                  type="button"
                  onClick={() => handleDownloadMedia(activeMediaViewer.url, `sqour-media-${Date.now()}`)}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                  title="تحميل إلى جهازك"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تحميل</span>
                </button>
            {/* Close button */}
            <button
              type="button"
              onClick={() => {
                if (activeMediaViewer.type === 'video') {
                  const vidEl = document.getElementById('active-lightbox-video') as HTMLVideoElement | null;
                  const cTime = vidEl ? vidEl.currentTime : 0;
                  handleStartFloatingVideo({
                    url: activeMediaViewer.url,
                    title: activeMediaViewer.title || 'فيديو الحائط / الدردشة',
                    currentTime: cTime,
                    type: 'video'
                  });
                  showToast('يستمر الفيديو في العمل في المشغل العائم، انقر ✕ لإيقافه يدوياً 🎬', 'info');
                }
                setActiveMediaViewer(null);
                setIsFullscreenMedia(false);
              }}
              className="w-7 h-7 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center justify-center cursor-pointer transition-colors"
              title="إغلاق والتصغير للمشغل العائم"
            >
              <X className="w-4 h-4" />
            </button>
              </div>
            </div>

            {/* Media Content - Centered */}
            <div className="flex-1 flex items-center justify-center p-2 overflow-hidden bg-black/60">
              {activeMediaViewer.type === 'video' ? (
                <video
                  id="active-lightbox-video"
                  src={activeMediaViewer.url}
                  controls
                  autoPlay
                  playsInline
                  className="max-w-full max-h-full rounded-xl object-contain shadow-2xl"
                />
              ) : (
                <img
                  src={activeMediaViewer.url}
                  alt="وسائط مكبرة"
                  className="max-w-full max-h-full rounded-xl object-contain shadow-2xl"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Mobile Shell (Strict Mobile Phone Dimensions & Locked Viewport with visualViewport API) */}
      <div
        style={{
          height: 'var(--app-height, 100dvh)',
          maxHeight: 'var(--app-height, 100dvh)',
          fontFamily: FONTS_LIST.find((f) => f.id === fontFamily)?.family || getFontFamilyStyle(fontFamily),
          '--theme-accent': curTheme.accentColor || '#d97706',
          '--theme-bg': curTheme.bgColorHex || '#140c06'
        } as any}
        className={`w-full max-w-md mx-auto ${curTheme.appBg} ${curTheme.appText || 'text-slate-100'} flex flex-col relative shadow-2xl border-x ${curTheme.headerBorder} overflow-hidden h-full`}
      >
        
        {/* 1. TOP-DOCKED SPLIT PM WINDOW (Docks from the very top, covering mics/header for maximum space!) */}
        {activeDrawer === 'pm' && selectedPmUser && pmWindowMode === 'split' ? (
          <div className={`h-[50%] flex-shrink-0 ${curTheme.drawerBg || 'bg-slate-900'} border-b-2 ${curTheme.headerBorder || 'border-amber-500'} shadow-2xl flex flex-col min-h-0 overflow-hidden relative z-30 text-right animate-in slide-in-from-top duration-150`}>
            {renderActivePmThreadContent(true)}
          </div>
        ) : (
          <>
            {/* TOP BAR: FIXED - Green Speaker + Sound Alerts Button + The 5 Mic Slots + LIVE Button */}
            <header className={`flex-shrink-0 z-20 ${curTheme?.headerBg || 'bg-[#1f1811]'} text-white px-1.5 py-1 border-b ${curTheme?.headerBorder || 'border-[#3e2c1c]'} flex items-center justify-between gap-1 shadow-md`}>
          {/* Green Speaker Toggle */}
          <button
            onClick={handleToggleSpeaker}
            className={`w-7 h-7 rounded-md flex items-center justify-center shadow transition-all cursor-pointer flex-shrink-0 ${
              isSpeakerMuted ? 'bg-rose-600 text-white' : 'bg-[#32ba51] text-white hover:bg-emerald-600'
            }`}
            title={isSpeakerMuted ? 'تفعيل الصوت' : 'كتم الصوت'}
          >
            {isSpeakerMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Quick Sound Center Modal Button */}
          <button
            type="button"
            onClick={() => setShowSoundModal(true)}
            className="w-7 h-7 rounded-md flex items-center justify-center shadow transition-all cursor-pointer flex-shrink-0 bg-[#2d241c] hover:bg-[#3d3228] text-amber-300 border border-amber-600/40"
            title="تخصيص نغمات التنبيهات (عام، خاص، منشن)"
          >
            <BellRing className="w-3.5 h-3.5 text-amber-400" />
          </button>

          {/* Quick Night Mode Toggle Button 🌙 / ☀️ */}
          <button
            type="button"
            onClick={toggleNightMode}
            className={`w-7 h-7 rounded-md flex items-center justify-center shadow transition-all cursor-pointer flex-shrink-0 ${
              isNightMode
                ? 'bg-indigo-950 hover:bg-indigo-900 text-yellow-300 border border-yellow-400/50 shadow-yellow-500/20'
                : 'bg-[#2d241c] hover:bg-[#3d3228] text-amber-300 border border-amber-600/40'
            }`}
            title={isNightMode ? 'الوضع الليلي مفعّل 🌙 - انقر للتبديل للوضع النهاري ☀️' : 'الوضع النهاري ☀️ - انقر لتفعيل الوضع الليلي 🌙'}
          >
            <span className="text-xs">{isNightMode ? '🌙' : '☀️'}</span>
          </button>

          {/* THE 5 MICROPHONE SLOTS (مع صورة العضو المتحدث وخيارات سحب/كتم/إفلات المايك) */}
          <div className="flex-1 grid grid-cols-5 gap-1 px-0.5">
            {micSlots.map((slot) => {
              const isOccupied = !!slot.user;
              const isMe = isOccupied && (slot.user?.id === currentUser.id || slot.user?.username === currentUser.username);
              const isSpeaking = isMe ? micVolume > 12 && !slot.user?.isMuted : slot.user?.isSpeaking;

              return (
                <button
                  key={slot.slotNumber}
                  onClick={() => {
                    if (isOccupied) {
                      setMicActionSlot({ slotNumber: slot.slotNumber, slotUser: slot.user });
                    } else {
                      handleTakeMic(slot.slotNumber);
                    }
                  }}
                  title={
                    isMe
                      ? 'مايكك الخاص - اضغط لكتم/تفعيل الصوت أو إفلات المايك'
                      : isOccupied
                      ? `مايك ${slot.slotNumber}: ${slot.user?.username} - انقر للخيارات (سحب/كتم المايك)`
                      : `مايك ${slot.slotNumber} فارغ - اضغط للصعود`
                  }
                  className={`h-8 rounded-md border flex flex-col items-center justify-center relative transition-all cursor-pointer overflow-hidden ${
                    isMe
                      ? 'bg-emerald-700 border-emerald-400 text-white shadow-sm'
                      : isOccupied
                      ? isSpeaking
                        ? 'bg-amber-600 border-amber-300 text-white ring-1 ring-emerald-400 animate-pulse'
                        : 'bg-[#2a241e] border-amber-600/60 text-amber-200'
                      : 'bg-[#151b24] border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {isOccupied ? (
                    <div className="relative w-full h-full flex flex-col items-center justify-center">
                      <div className="flex items-center gap-0.5 justify-center">
                        <img
                          src={slot.user?.avatarUrl || falconIcon}
                          alt={slot.user?.username}
                          className={`w-3.5 h-3.5 rounded-full object-cover border transition-all ${
                            isSpeaking
                              ? 'border-amber-300 ring-1 ring-emerald-400 animate-pulse scale-105'
                              : isMe
                              ? 'border-emerald-300'
                              : 'border-slate-400'
                          }`}
                        />
                        {slot.user?.giftBadges && slot.user.giftBadges.length > 0 && (
                          <img
                            src={slot.user.giftBadges[0]}
                            alt="هدية"
                            title="هدية مرافقة"
                            className="w-3 h-3 object-contain shrink-0 drop-shadow-xs"
                          />
                        )}
                      </div>
                      {(() => {
                        const slotBanner = slot.user ? getUserBanner(slot.user.username, slot.user.nameBannerUrl) : undefined;
                        if (slotBanner) {
                          return (
                            <img
                              src={slotBanner}
                              alt={slot.user?.username}
                              className="h-2 max-w-[44px] object-contain rounded"
                            />
                          );
                        }
                        return (
                          <span className="text-[7px] font-bold truncate max-w-full px-0.5 leading-none text-white">
                            {isMe ? 'مايكك' : slot.user?.username.slice(0, 5)}
                          </span>
                        );
                      })()}
                      {isSpeaking && (
                        <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      )}
                      <div className="absolute bottom-0 right-0 p-0.5 rounded-full bg-black/75">
                        {slot.user?.isMuted ? (
                          <VolumeX className="w-2 h-2 text-rose-400" />
                        ) : (
                          <Mic className={`w-2 h-2 ${isSpeaking ? 'text-amber-300' : 'text-emerald-400'}`} />
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-0.5">
                      <Mic className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-[9px] font-bold leading-none">
                        {slot.slotNumber}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Real LIVE Video Button (بث مباشر فيديو وصوت حقيقي) */}
          <button
            onClick={() => {
              if (isBroadcastingLive) {
                setIsLiveMinimized(false);
              } else if (activeRoomLiveBroadcast) {
                setIsWatchingLive(true);
                socket?.emit('joinLiveViewer', { room: currentUser.room || 'الغرفة العامة' });
              } else {
                setShowStartLiveConfirm(true);
              }
            }}
            className={`h-7 px-1.5 rounded-md text-white text-[10px] font-black flex items-center gap-1 shadow cursor-pointer flex-shrink-0 transition-all ${
              isBroadcastingLive
                ? 'bg-red-600 hover:bg-red-700 animate-pulse ring-1 ring-red-400'
                : activeRoomLiveBroadcast
                ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 animate-pulse ring-1 ring-rose-400'
                : 'bg-[#6d28d9] hover:bg-purple-700'
            }`}
            title={
              isBroadcastingLive
                ? 'أنت في بث مباشر الآن - انقر للتحكم بالبث'
                : activeRoomLiveBroadcast
                ? `مشاهدة بث [${activeRoomLiveBroadcast.broadcasterUsername}] المباشر 🔴`
                : 'بدء بث فيديو مباشر (لايف)'
            }
          >
            <Video className="w-3 h-3" />
            <span>
              {isBroadcastingLive
                ? 'بثي 🔴'
                : activeRoomLiveBroadcast
                ? '🔴 LIVE'
                : 'LIVE'}
            </span>
          </button>

          {/* Ghost Mode Indicator for Current User */}
          {currentUser?.isGhost && (
            <span
              className="h-7 px-1.5 rounded-md bg-purple-900/90 text-purple-200 border border-purple-500/70 text-[10px] font-black flex items-center gap-0.5 shadow flex-shrink-0 animate-pulse"
              title="أنت متصل بالوضع المخفي (لا تظهر للمستخدمين العاديين ولا ترسل إشعار دخول)"
            >
              👻
            </span>
          )}
        </header>

        {/* Real-time Connection Suspension & Auto-Recovery Banner (شريط استعادة الاتصال وحفظ الجلسة) */}
        {connectionState === 'reconnecting' && currentUser && !isForcedLoggedOutRef.current && (
          <div className="bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 text-white px-3 py-1.5 flex items-center justify-between text-xs font-bold border-b border-amber-300 shadow-lg flex-shrink-0 z-30 animate-in fade-in">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping flex-shrink-0" />
              <div className="min-w-0">
                <span className="font-black text-amber-100 block text-[11px] leading-tight">
                  جاري استعادة جلستك الحالية...
                </span>
                <span className="text-[10px] text-amber-100/90 truncate block">
                  جلستك محفوظة تلقائياً دون انقطاع أو تسجيل دخول جديد
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (socket) {
                  if (!socket.connected) socket.connect();
                  const savedToken = localStorage.getItem('soqoor_session_token');
                  if (savedToken) {
                    socket.emit('restoreSession', {
                      sessionToken: savedToken,
                      room: currentUser?.room || 'الغرفة العامة',
                      deviceFingerprint: generateDeviceFingerprint().fingerprintId
                    });
                  }
                }
              }}
              className="px-2.5 py-1 bg-black/40 hover:bg-black/60 text-white rounded text-[10px] font-black border border-white/30 cursor-pointer flex-shrink-0 transition-all flex items-center gap-1 mr-2"
            >
              <RotateCw className="w-3 h-3 animate-spin" />
              <span>استعادة الآن</span>
            </button>
          </div>
        )}

        {/* Web Notifications Permission Prompt Banner */}
        {showNotificationBanner && notificationPermission === 'default' && (
          <div className="bg-gradient-to-r from-amber-900 via-yellow-900 to-amber-900 text-amber-100 px-3 py-1.5 flex items-center justify-between text-xs font-bold border-b border-yellow-500/50 shadow-sm flex-shrink-0 animate-in fade-in z-20">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <BellRing className="w-4 h-4 text-amber-300 flex-shrink-0 animate-bounce" />
              <span className="truncate text-[11px] text-amber-200">
                تفعيل إشعارات المتصفح للرسائل الخاصة والمنشن (@) حتى عند قفل الشاشة
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0 mr-2">
              <button
                type="button"
                onClick={() => {
                  requestNotificationPermission().then((perm) => {
                    setNotificationPermission(perm);
                    setShowNotificationBanner(false);
                    if (perm === 'granted') {
                      showToast('تم تفعيل إشعارات المتصفح بنجاح! 🔔', 'success');
                      sendTestNotification().catch(() => {});
                    } else if (perm === 'denied') {
                      showToast('تم رفض إذن الإشعارات بالمتصفح', 'info');
                    }
                  });
                }}
                className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-amber-950 rounded font-black text-[11px] cursor-pointer shadow-xs active:scale-95 transition-all"
              >
                تفعيل الآن 🔔
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNotificationBanner(false);
                  try {
                    sessionStorage.setItem('soqoor_notif_banner_dismissed', 'true');
                  } catch {}
                }}
                className="p-1 text-amber-300/80 hover:text-white cursor-pointer"
                title="إخفاء"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Active Room Live Broadcast Banner (شريط إشعار البث المباشر النشط في الغرفة) */}
        {activeRoomLiveBroadcast && !isBroadcastingLive && (
          <div
            onClick={() => {
              setIsWatchingLive(true);
              socket?.emit('joinLiveViewer', { room: currentUser.room || 'الغرفة العامة' });
            }}
            className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white px-3 py-1.5 flex items-center justify-between cursor-pointer shadow-md text-xs font-bold animate-in fade-in z-25 hover:opacity-95 transition-opacity flex-shrink-0"
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
              <span className="font-black text-amber-200">🔴 بث مباشر:</span>
              <span className="truncate max-w-[170px] sm:max-w-xs">
                [{activeRoomLiveBroadcast.broadcasterUsername}] يبث الآن فيديو وصوت
              </span>
            </div>
            <div className="flex items-center gap-1 bg-black/30 px-2 py-0.5 rounded-full text-[10px] text-amber-300 font-black">
              <Eye className="w-3 h-3" />
              <span>{liveViewerCount}</span>
              <span className="mr-0.5">مشاهدة ▶</span>
            </div>
          </div>
        )}

        {/* Scrolling News Ticker Marquee (يظهر لعدة ثوانٍ للعضو الجديد ثم يختفي تلقائياً) */}
        {serverSecurity?.marqueeTicker && showAnnouncementBar && (
          <div className={`transition-all duration-700 ${curTheme.subHeaderBg} ${curTheme.subHeaderText || curTheme.accentText} py-1.5 px-3 border-b ${curTheme.subHeaderBorder} text-[11px] font-bold overflow-hidden flex items-center gap-2 flex-shrink-0 shadow-inner animate-in fade-in`}>
            <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/40 px-1.5 py-0.2 rounded font-black flex-shrink-0 animate-pulse">
              🦅 إعلان
            </span>
            <div className="overflow-hidden whitespace-nowrap flex-1">
              <span className="inline-block">{serverSecurity.marqueeTicker}</span>
            </div>
            <button
              type="button"
              onClick={() => setShowAnnouncementBar(false)}
              className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
              title="إخفاء الإعلان"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Floating Upload Progress Banner (Never Congests Socket) */}
        {uploadProgress !== null && (
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-3 py-2 border-b border-indigo-500/50 shadow-lg flex-shrink-0 animate-in fade-in">
            <div className="flex items-center justify-between text-xs font-bold mb-1">
              <span className="flex items-center gap-1.5 text-indigo-300">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                <span>{uploadStatusText || 'جاري رفع الملف...'}</span>
              </span>
              <span className="font-mono text-amber-300 font-black">{uploadProgress}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-500 transition-all duration-150"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <div className="text-[9px] text-slate-400 mt-0.5 text-center">
              ⚡ الاتصال والمايك مستمران بنسبة 100% دون انقطاع أثناء الرفع
            </div>
          </div>
        )}

        {/* Urgent Emergency Siren Banner */}
        {activeAdminSiren && (
          <div className="bg-red-600 text-white p-2.5 flex items-center justify-between text-xs font-black shadow-lg animate-pulse z-30 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xl animate-bounce">🚨</span>
              <div>
                <span className="text-yellow-200 block text-[10px]">تنبيه وإنذار إداري عاجل من {activeAdminSiren.from}:</span>
                <span className="text-xs">{activeAdminSiren.message}</span>
              </div>
            </div>
            <button
              onClick={() => setActiveAdminSiren(null)}
              className="text-white hover:text-yellow-200 text-sm font-bold px-2 py-0.5 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* If user is holding a mic slot: quick control bar */}
        {currentUser.micSlot !== null && (
          <div className="bg-emerald-700 text-white px-3 py-1.5 flex items-center justify-between text-xs font-bold shadow">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
              أنت على المايك رقم ({currentUser.micSlot})
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const muted = audioManager?.toggleMute() ?? false;
                  sounds.playToggleMute(muted);
                  showToast(muted ? 'تم كتم المايك 🔇' : 'تم تفعيل المايك 🎙️', 'info');
                }}
                className="px-2 py-0.5 bg-emerald-900 rounded text-[11px] hover:bg-black"
              >
                {currentUser.isMuted ? 'تفعيل المايك' : 'كتم'}
              </button>
              <button
                onClick={handleDropMic}
                className="px-2 py-0.5 bg-rose-600 rounded text-[11px] hover:bg-rose-700"
              >
                ترك المايك
              </button>
            </div>
          </div>
        )}
          </>
        )}

        {/* PUBLIC ROOM MESSAGES CONTAINER (takes remaining 50% in split mode, full height in normal mode) */}
        <div className="flex-1 flex flex-col min-h-0 relative">

          {/* TOP RIGHT FLOATING CONTROLS: أدوات وميزات حسان برو ⚡ (تحتوي ترسانة الميزات الـ 50 بداخلها) */}
          <div className="absolute top-2.5 right-3 flex items-center pointer-events-auto z-30">
            {/* CONSOLIDATED COMPACT TOOLS TRIGGER (أيقونة أدوات حسان برو ⚡) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowCompactToolsMenu(!showCompactToolsMenu)}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#241a12]/95 hover:bg-black text-amber-300 border border-amber-500/70 shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer group"
                title="أدوات وميزات حسان برو الشاملة ⚡"
              >
                <Zap className="w-4 h-4 text-amber-400 group-hover:rotate-12 transition-transform" />
              </button>

              {/* Click-outside backdrop overlay */}
              {showCompactToolsMenu && (
                <div
                  className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]"
                  onClick={() => setShowCompactToolsMenu(false)}
                />
              )}

              {/* Compact Tools Dropdown Menu (الشامل لجميع الميزات والأدوات والفلترة) */}
              {showCompactToolsMenu && (
                <div
                  className="absolute top-10 right-0 w-[275px] sm:w-72 max-h-[calc(var(--app-height,100dvh)-250px)] min-h-[160px] overflow-y-auto modal-scroll-container overscroll-contain bg-[#1a140f] border-2 border-amber-500/80 rounded-2xl shadow-2xl p-2.5 pb-4 space-y-2 text-right text-xs z-50 animate-in fade-in zoom-in-95 duration-150 compact-tools-scroll"
                  style={{
                    WebkitOverflowScrolling: 'touch',
                    touchAction: 'pan-y'
                  }}
                >
                  <div className="px-1.5 py-1 border-b border-[#3e2c1c] text-[11px] font-black text-amber-400 flex items-center justify-between sticky top-0 bg-[#1a140f]/95 backdrop-blur-xs z-10 -mx-1 -mt-1 rounded-t-xl mb-1">
                    <span className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>أدوات وميزات حسان برو ⚡</span>
                    </span>
                    <button onClick={() => setShowCompactToolsMenu(false)} className="text-slate-400 hover:text-white p-0.5 cursor-pointer">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* القسم 1: فلترة الدردشة والإشارات */}
                  <div className="space-y-1">
                    <div className="text-[10px] text-amber-300/70 font-bold px-1">💬 تصفية وعرض الرسائل:</div>
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setFilterOnlyMentions(false);
                          setShowCompactToolsMenu(false);
                        }}
                        className={`p-1.5 rounded-lg text-center font-bold text-[11px] transition-colors cursor-pointer ${
                          !filterOnlyMentions ? 'bg-amber-500 text-slate-950 font-black' : 'bg-white/5 hover:bg-white/10 text-slate-300'
                        }`}
                      >
                        الكل 💬
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFilterOnlyMentions(true);
                          setShowCompactToolsMenu(false);
                        }}
                        className={`p-1.5 rounded-lg text-center font-bold text-[11px] transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                          filterOnlyMentions ? 'bg-rose-600 text-white font-black' : 'bg-rose-950/40 hover:bg-rose-900/40 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        <span>@ إشاراتي</span>
                        {currentUser && (
                          <span className="w-3.5 h-3.5 rounded-full bg-rose-200 text-rose-900 text-[8px] font-black flex items-center justify-center">
                            {messages.filter((m) => m.text && m.text.includes(`@${currentUser.username}`)).length}
                          </span>
                        )}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowCompactToolsMenu(false);
                        setIsMegaSuiteOpen(true);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-amber-950/50 hover:bg-amber-900/50 border border-amber-500/30 text-amber-200 font-bold flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        <span>الرسائل المفضلة</span>
                      </span>
                      <span className="text-[10px] font-mono text-amber-300 font-black">({starredMessages.length})</span>
                    </button>

                    {/* زر تبديل الوضع الليلي والنهاري */}
                    <button
                      type="button"
                      onClick={() => {
                        toggleNightMode();
                        setShowCompactToolsMenu(false);
                      }}
                      className={`w-full px-2.5 py-1.5 rounded-lg border font-bold flex items-center justify-between transition-colors cursor-pointer ${
                        isNightMode
                          ? 'bg-indigo-950/70 hover:bg-indigo-900/70 border-indigo-500/50 text-indigo-200'
                          : 'bg-slate-800/60 hover:bg-slate-700/60 border-slate-700 text-slate-200'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="text-sm">{isNightMode ? '🌙' : '☀️'}</span>
                        <span>الوضع الليلي (Night Mode)</span>
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${isNightMode ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-300'}`}>
                        {isNightMode ? 'مفعّل 🌙' : 'موقف ☀️'}
                      </span>
                    </button>

                    {/* زر وضع التباين العالي بحساب درجة السطوع */}
                    <button
                      type="button"
                      onClick={() => {
                        toggleHighContrastMode();
                        setShowCompactToolsMenu(false);
                      }}
                      className={`w-full px-2.5 py-1.5 rounded-lg border font-bold flex items-center justify-between transition-colors cursor-pointer ${
                        isHighContrastMode
                          ? 'bg-amber-950/70 hover:bg-amber-900/70 border-amber-500/50 text-amber-200'
                          : 'bg-slate-800/60 hover:bg-slate-700/60 border-slate-700 text-slate-200'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="text-sm">⚡</span>
                        <span>وضع التباين العالي (Luminance)</span>
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${isHighContrastMode ? 'bg-amber-500 text-slate-950' : 'bg-slate-700 text-slate-300'}`}>
                        {isHighContrastMode ? 'مفعّل ⚡' : 'تلقائي 👁️'}
                      </span>
                    </button>
                  </div>

                  {/* القسم 2: الأجنحة الإبداعية وميزات حسان برو */}
                  <div className="space-y-1 pt-1 border-t border-[#3e2c1c]">
                    <div className="text-[10px] text-amber-300/70 font-bold px-1">🦅 الأجنحة الإبداعية والميزات:</div>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setShowCompactToolsMenu(false);
                        setShowUltimateFeatures50(true);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-slate-950 font-black flex items-center justify-between transition-all shadow-md cursor-pointer animate-pulse"
                    >
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                        <span>ترسانة الميزات الـ 50 الشاملة (Mega Suite 50+)</span>
                      </span>
                      <span className="text-[9px] bg-slate-950 text-amber-400 px-1.5 py-0.5 rounded-full font-bold">جديد 50+</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowCompactToolsMenu(false);
                        setIsMegaSuiteOpen(true);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white font-black flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-yellow-200" />
                      <span>جناح حسان برو الشامل (حسان برو سويت 50+)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowCompactToolsMenu(false);
                        setShowAudioStudio(true);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-slate-200 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Mic className="w-3.5 h-3.5 text-indigo-400" />
                      <span>استوديو هندسة الصوت والمايك</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowCompactToolsMenu(false);
                        setShowGamesSuite(true);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-slate-200 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Gamepad2 className="w-3.5 h-3.5 text-amber-400" />
                      <span>ميدان الألعاب والمسابقات</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowCompactToolsMenu(false);
                        setShowIdentityStudio(true);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-slate-200 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Crown className="w-3.5 h-3.5 text-purple-400" />
                      <span>استوديو الهوية، الإطارات والأوسمة</span>
                    </button>

                    {(currentUser.role === 'hassan' || currentUser.role === 'admin' || currentUser.role === 'super' || getRoleLevel(currentUser.role) >= 75) && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowCompactToolsMenu(false);
                          setShowThemesModal(true);
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-amber-200 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Palette className="w-3.5 h-3.5 text-amber-400" />
                        <span>تعميم الاستايل والثيم للشات (خاص بالإدارة) 🎨</span>
                      </button>
                    )}
                  </div>

                  {/* القسم 3: أدوات النظام والغرفة والإدارة */}
                  <div className="space-y-1 pt-1 border-t border-[#3e2c1c]">
                    <div className="text-[10px] text-amber-300/70 font-bold px-1">⚡ أدوات النظام والغرفة:</div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowCompactToolsMenu(false);
                        setShowDiagnosticsModal(true);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-slate-200 font-bold flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-emerald-400" />
                        <span>فحص جودة الاتصال</span>
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowCompactToolsMenu(false);
                        setShowSoundModal(true);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-slate-200 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                      <span>مركز نغمات التنبيهات</span>
                    </button>

                    {userCanManageRoomSettings && currentUser.room && currentUser.room !== 'خارج الغرف' && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowCompactToolsMenu(false);
                          const curRoom = roomsList.find((r) => r.name === currentUser.room || r.id === currentUser.room);
                          setCurrentRoomSettingsForm({
                            name: curRoom?.name || currentUser.room,
                            desc: curRoom?.desc || '',
                            pinnedTopic: pinnedTopic || '',
                            isChatLocked: roomSettings?.isChatLocked || false,
                            slowModeSeconds: roomSettings?.slowModeSeconds || 0,
                            isVoiceLocked: roomSettings?.isVoiceLocked || false,
                            showDeletedNotice: Boolean(roomSettings?.showDeletedNotice),
                            password: '',
                            isPasswordProtected: Boolean(curRoom?.isPasswordProtected),
                            clearPassword: false,
                            wallpaper: activeWallpaper || 'default',
                            welcomeMessage: (roomSettings as any)?.welcomeMessage || '',
                            welcomeEnabled: (roomSettings as any)?.welcomeEnabled !== false
                          });
                          setIsRoomSettingsModalOpen(true);
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-slate-200 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Settings className="w-3.5 h-3.5 text-emerald-400" />
                        <span>إعدادات الغرفة الحالية</span>
                      </button>
                    )}

                    {(currentUser.role === 'hassan' || currentUser.role === 'admin' || currentUser.role === 'super' || hasUserPermission(currentUser, 'canAccessControlPanel') || hasUserPermission(currentUser, 'canLockRoom') || hasUserPermission(currentUser, 'canLockVoice') || hasUserPermission(currentUser, 'canClearRoomChat') || getRoleLevel(currentUser.role) > 50) && (
                      <div className="p-2 rounded-xl bg-gradient-to-r from-red-950/60 via-slate-900 to-amber-950/60 border border-red-500/40 text-amber-200 space-y-1.5 shadow-md">
                        <div className="flex items-center justify-between">
                          <span className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[9px] font-mono font-black">STAFF</span>
                          <span className="text-[10px] text-amber-300 font-bold">إجراءات سريعة للإدارة:</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-[10px]">
                          <button
                            type="button"
                            onClick={() => {
                              setShowCompactToolsMenu(false);
                              openAppConfirm(
                                'مسح شات الغرفة',
                                'مسح شات الغرفة كاملاً لجميع المتواجدين؟',
                                () => {
                                  handleAdminAction('globalClearChat', '');
                                }
                              );
                            }}
                            className="px-2 py-1.5 rounded bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-700/50 flex items-center justify-center gap-1 cursor-pointer font-bold"
                            title="مسح شات الغرفة"
                          >
                            <Trash2 className="w-3 h-3 text-red-400" />
                            <span>مسح شات</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowCompactToolsMenu(false);
                              handleAdminAction('lockRoomChat', '', !roomSettings.isChatLocked);
                            }}
                            className={`px-2 py-1.5 rounded border flex items-center justify-center gap-1 cursor-pointer font-bold ${
                              roomSettings.isChatLocked ? 'bg-rose-600 text-white border-rose-500' : 'bg-slate-800 text-slate-200 border-slate-700'
                            }`}
                            title={roomSettings.isChatLocked ? 'فتح الشات' : 'قفل الشات'}
                          >
                            <Lock className="w-3 h-3" />
                            <span>{roomSettings.isChatLocked ? 'فتح' : 'قفل'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowCompactToolsMenu(false);
                              handleAdminAction('lockRoomVoice', '', !roomSettings.isVoiceLocked);
                            }}
                            className={`px-2 py-1.5 rounded border flex items-center justify-center gap-1 cursor-pointer font-bold ${
                              roomSettings.isVoiceLocked ? 'bg-amber-600 text-white border-amber-500' : 'bg-slate-800 text-slate-200 border-slate-700'
                            }`}
                            title="قفل أو فك المايكات"
                          >
                            <Mic className="w-3 h-3" />
                            <span>{roomSettings.isVoiceLocked ? 'فك مايك' : 'سد مايك'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowCompactToolsMenu(false);
                              socket?.emit('getMonitorLogs');
                              socket?.emit('getRoomStats');
                              setActiveDrawer('monitor');
                            }}
                            className="px-2 py-1.5 rounded bg-amber-500 hover:bg-amber-600 text-slate-950 font-black flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                            title="لوحة التحكم والمراقبة"
                          >
                            <Shield className="w-3 h-3" />
                            <span>لوحة التحكم</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* FILTER BELL BUTTON (تحت أيقونة أدوات حسان برو مباشرة - محصور بصلاحيات المستخدم فقط ولا يظهر للعامة) */}
            {userCanFilter && (
              <button
                type="button"
                onClick={() => setShowFilterAlertsModal(true)}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#241a12]/95 hover:bg-black text-amber-300 border border-amber-500/70 shadow-xl flex items-center justify-center relative hover:scale-105 active:scale-95 transition-all cursor-pointer"
                title="تنبيهات فلتر الكلمات المحظورة (جرس الفلتر)"
              >
                <Bell className="w-4 h-4 text-amber-300" />
                {filterAlertsList.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-red-600 text-white text-[9px] font-black flex items-center justify-center border border-white shadow-md animate-pulse">
                    {filterAlertsList.length > 99 ? '99+' : filterAlertsList.length}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* 🔴 LIVE BROADCASTER STUDIO COMPONENT */}
          {isBroadcastingLive && (
            !isLiveMinimized ? (
              <div className="mx-2 mt-2 z-30 bg-slate-950/95 border-2 border-red-500 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-white animate-in slide-in-from-top-3 duration-200">
                {/* Broadcaster Header */}
                <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 px-3 py-2 flex items-center justify-between shadow-md">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                    <span className="font-black text-xs">🔴 بثك مباشر الآن للغرفة</span>
                    <span className="bg-black/40 px-2 py-0.5 rounded-full text-[10px] font-mono text-amber-300 flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      <span>{liveViewerCount}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsLiveMinimized(true)}
                      className="p-1 rounded-lg bg-black/30 hover:bg-black/50 text-white cursor-pointer transition-colors"
                      title="تصغير إلى نافذة عائمة ومتابعة الدردشة"
                    >
                      <Minimize2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleStopLiveBroadcast}
                      className="px-2 py-0.5 bg-black/40 hover:bg-black/60 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors flex items-center gap-1"
                      title="إنهاء البث"
                    >
                      <span>إنهاء ⏹️</span>
                    </button>
                  </div>
                </div>

                {/* Video Viewport with Floating Reactions Overlay */}
                <div className="relative w-full h-48 sm:h-56 bg-black flex items-center justify-center overflow-hidden">
                  <video
                    ref={localLiveVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${isLiveCameraOff ? 'hidden' : 'block'}`}
                  />
                  {isLiveCameraOff && (
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-400 p-4 text-center">
                      <Camera className="w-10 h-10 text-slate-500" />
                      <span className="text-xs font-bold">الكاميرا مغلقة مؤقتاً</span>
                    </div>
                  )}

                  {/* Floating live reactions animated on screen */}
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {liveFloatingReactions.map((r) => (
                      <div
                        key={r.id}
                        style={{ left: `${r.left}%` }}
                        className="absolute bottom-2 text-2xl animate-float-up pointer-events-none drop-shadow-lg"
                      >
                        {r.emoji}
                      </div>
                    ))}
                  </div>

                  <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-full text-[10px] text-amber-300 font-bold border border-amber-500/40">
                    مباشر 🔴 {currentUser.username}
                  </div>
                </div>

                {/* Broadcaster Controls Bar */}
                <div className="p-2 bg-slate-900 border-t border-slate-800 flex items-center justify-around gap-2 text-xs">
                  <button
                    type="button"
                    onClick={handleFlipLiveCamera}
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold flex flex-col items-center gap-0.5 flex-1 cursor-pointer transition-colors"
                    title="تبديل الكاميرا (أمامية / خلفية)"
                  >
                    <Camera className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[9px]">تبديل</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleLiveCamera}
                    className={`p-1.5 rounded-xl font-bold flex flex-col items-center gap-0.5 flex-1 cursor-pointer transition-colors ${
                      isLiveCameraOff ? 'bg-red-950 text-red-300 border border-red-700' : 'bg-slate-800 hover:bg-slate-700 text-white'
                    }`}
                    title="إيقاف / تشغيل الكاميرا"
                  >
                    {isLiveCameraOff ? <EyeOff className="w-3.5 h-3.5 text-red-400" /> : <Eye className="w-3.5 h-3.5 text-emerald-400" />}
                    <span className="text-[9px]">{isLiveCameraOff ? 'فتح الكاميرا' : 'كتم الكاميرا'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleLiveMic}
                    className={`p-1.5 rounded-xl font-bold flex flex-col items-center gap-0.5 flex-1 cursor-pointer transition-colors ${
                      isLiveMicMuted ? 'bg-red-950 text-red-300 border border-red-700' : 'bg-slate-800 hover:bg-slate-700 text-white'
                    }`}
                    title="كتم / تشغيل المايك"
                  >
                    {isLiveMicMuted ? <MicOff className="w-3.5 h-3.5 text-red-400" /> : <Mic className="w-3.5 h-3.5 text-emerald-400" />}
                    <span className="text-[9px]">{isLiveMicMuted ? 'تفعيل الصوت' : 'كتم المايك'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleStopLiveBroadcast}
                    className="p-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black flex flex-col items-center gap-0.5 flex-1 cursor-pointer transition-colors"
                    title="إنهاء البث"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="text-[9px]">إنهاء</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Minimized Floating Broadcaster PiP */
              <div
                onClick={() => setIsLiveMinimized(false)}
                className="fixed bottom-16 right-4 z-40 w-24 h-32 bg-black rounded-2xl border-2 border-red-500 shadow-2xl overflow-hidden cursor-pointer flex flex-col animate-in zoom-in-95 group hover:scale-105 transition-transform"
                title="انقر لتوسيع البث المباشر"
              >
                <video
                  ref={localLiveVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-1 right-1 bg-red-600 text-white px-1.5 py-0.2 rounded-full text-[9px] font-black animate-pulse flex items-center gap-0.5">
                  <span>🔴</span>
                  <span>بثي</span>
                </div>
                <div className="absolute bottom-1 inset-x-1 bg-black/75 text-center text-[9px] text-amber-300 font-bold rounded py-0.5">
                  👁️ {liveViewerCount}
                </div>
              </div>
            )
          )}

          {/* 📺 LIVE VIEWER PLAYER COMPONENT (مشاهدة البث المباشر للغرفة) */}
          {isWatchingLive && activeRoomLiveBroadcast && (
            <div className="mx-2 mt-2 z-30 bg-slate-950/95 border-2 border-amber-500 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-white animate-in slide-in-from-top-3 duration-200">
              {/* Viewer Header */}
              <div className="bg-gradient-to-r from-red-700 via-rose-700 to-amber-700 px-3 py-2 flex items-center justify-between shadow-md">
                <div className="flex items-center gap-2">
                  <img
                    src={activeRoomLiveBroadcast.broadcasterAvatar || falconIcon}
                    alt={activeRoomLiveBroadcast.broadcasterUsername}
                    className="w-7 h-7 rounded-full object-cover border border-amber-400"
                  />
                  <div>
                    <div className="font-bold text-xs flex items-center gap-1">
                      {(() => {
                        const bBanner = getUserBanner(activeRoomLiveBroadcast.broadcasterUsername);
                        if (bBanner) {
                          return (
                            <img
                              src={bBanner}
                              alt={activeRoomLiveBroadcast.broadcasterUsername}
                              className="h-5 max-h-[22px] max-w-[130px] object-contain rounded inline-block"
                            />
                          );
                        }
                        return <span>{activeRoomLiveBroadcast.broadcasterUsername}</span>;
                      })()}
                      {activeRoomLiveBroadcast.broadcasterFlag && <span>{activeRoomLiveBroadcast.broadcasterFlag}</span>}
                      <span className="bg-red-600 text-white text-[9px] px-1 rounded font-black animate-pulse">🔴 مباشر</span>
                    </div>
                    <div className="text-[10px] text-amber-200/80 flex items-center gap-1 font-mono">
                      <Eye className="w-3 h-3 text-amber-400" />
                      <span>{liveViewerCount} يشاهدون</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsWatchingLive(false);
                    socket?.emit('leaveLiveViewer', { room: currentUser.room || 'الغرفة العامة' });
                  }}
                  className="w-7 h-7 rounded-lg bg-black/40 hover:bg-black/60 text-white flex items-center justify-center cursor-pointer transition-colors"
                  title="إغلاق شاشة البث"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Live Video Feed Image/Stream */}
              <div className="relative w-full h-52 sm:h-60 bg-black flex items-center justify-center overflow-hidden">
                {liveRemoteVideoFrame ? (
                  <img
                    src={liveRemoteVideoFrame}
                    alt="بث مباشر"
                    className="w-full h-full object-contain bg-black"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 text-amber-200/70 p-4 text-center">
                    <div className="w-8 h-8 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
                    <span className="text-xs font-bold">جاري استقبال إشارة البث المباشر 🔴...</span>
                  </div>
                )}

                {/* Floating Reactions Overlay */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  {liveFloatingReactions.map((r) => (
                    <div
                      key={r.id}
                      style={{ left: `${r.left}%` }}
                      className="absolute bottom-2 text-2xl animate-float-up pointer-events-none drop-shadow-lg"
                    >
                      {r.emoji}
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Reactions Bar */}
              <div className="p-2 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-1.5 overflow-x-auto">
                <span className="text-[10px] text-amber-300 font-bold shrink-0">تفاعل:</span>
                <div className="flex items-center gap-1.5 flex-1 justify-around">
                  {['❤️', '🔥', '👏', '🦅', '👑', '🌹', '😍', '🎉'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleSendLiveReaction(emoji)}
                      className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 active:scale-125 transition-transform flex items-center justify-center text-base cursor-pointer shadow-xs"
                      title={`إرسال ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* CHAT MESSAGES STREAM - Ultra Compact Layout */}
          <div
            ref={chatContainerRef}
            onScroll={handleChatScroll}
            className={`flex-1 overflow-y-auto ${
              activeDrawer === 'pm' && selectedPmUser && pmWindowMode === 'split' ? 'pt-6 sm:pt-7' : 'pt-8 sm:pt-9'
            } p-1 sm:p-1.5 space-y-0.5 sm:space-y-1 relative transition-all ${
              // Light Wallpapers (خلفيات فاتحة مريحة)
              activeWallpaper === 'light-pure'
                ? 'bg-gradient-to-b from-slate-100 via-white to-slate-200 text-slate-800'
                : activeWallpaper === 'light-paper'
                ? 'bg-[#faf6ee] bg-[radial-gradient(#d6cbb5_1px,transparent_1px)] [background-size:14px_14px] text-stone-900'
                : activeWallpaper === 'light-clouds'
                ? 'bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100 text-slate-800'
                : activeWallpaper === 'light-sand'
                ? 'bg-gradient-to-tr from-amber-100 via-orange-50 to-yellow-100 text-amber-950'
                : activeWallpaper === 'light-mint'
                ? 'bg-gradient-to-b from-emerald-100 via-teal-50 to-green-100 text-emerald-950'
                : activeWallpaper === 'light-lavender'
                ? 'bg-gradient-to-tr from-purple-100 via-pink-50 to-indigo-100 text-purple-950'
                : activeWallpaper === 'light-geometric'
                ? 'bg-slate-100 bg-[linear-gradient(to_right,#cbd5e1_1px,transparent_1px),linear-gradient(to_bottom,#cbd5e1_1px,transparent_1px)] bg-[size:16px_16px] text-slate-800'
                : activeWallpaper === 'light-rose'
                ? 'bg-gradient-to-b from-rose-100 via-pink-50 to-stone-100 text-rose-950'
                // Dark Wallpapers (خلفيات غامقة وملكية)
                : activeWallpaper === 'stars'
                ? 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950 via-slate-900 to-black text-slate-100'
                : activeWallpaper === 'desert'
                ? 'bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-amber-950/40 via-stone-900 to-slate-950 text-slate-100'
                : activeWallpaper === 'arabesque'
                ? 'bg-slate-950 bg-[radial-gradient(#475569_1px,transparent_1px)] [background-size:16px_16px] text-slate-100'
                : activeWallpaper === 'luxury-wood'
                ? 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-stone-900 via-stone-950 to-black text-slate-100'
                : activeWallpaper === 'cyber-grid'
                ? 'bg-slate-950 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:24px_24px] text-slate-100'
                : activeWallpaper === 'dark-obsidian'
                ? 'bg-[#09080d] bg-[radial-gradient(ellipse_at_top,_#451a03_0%,transparent_70%)] text-slate-100'
                : activeWallpaper === 'dark-emerald'
                ? 'bg-[#02150d] bg-[radial-gradient(ellipse_at_bottom,_#064e3b_0%,transparent_70%)] text-slate-100'
                : activeWallpaper === 'dark-sapphire'
                ? 'bg-[#030c18] bg-[radial-gradient(ellipse_at_center,_#1e3a8a_0%,transparent_70%)] text-slate-100'
                : activeWallpaper === 'dark-dam-ghazal'
                ? 'bg-[#180309] bg-[radial-gradient(ellipse_at_top,_#881337_0%,transparent_70%)] text-slate-100'
                : `${curTheme.chatBg} ${curTheme.appText || 'text-slate-100'}`
            } ${eyeComfort ? 'eye-comfort-filter' : ''}`}
            style={{ fontFamily: FONTS_LIST.find((f) => f.id === fontFamily)?.family || 'Cairo, sans-serif' }}
          >
          {/* Message Stream */}
          {displayRoomMessages.map((msg, idx) => {
            if (msg.isDeleted) {
              const isAdminViewer = currentUser?.role === 'admin' || currentUser?.role === 'super';
              if (!isAdminViewer) return null;
              const deleterLabel =
                msg.deletedByRole === 'super'
                  ? 'مدير النظام'
                  : msg.deletedByRole === 'admin'
                  ? 'المشرف'
                  : msg.deletedBy === msg.username
                  ? 'صاحب الرسالة'
                  : 'المشرف';
              return (
                <div
                  id={`msg-${msg.id}`}
                  key={msg.id ? `msg-${msg.id}` : `msg-idx-${idx}`}
                  className={`flex items-center justify-between gap-1.5 py-1 px-2.5 rounded-lg text-[10px] italic select-none transition-all ${
                    activeWallpaper.startsWith('light-')
                      ? 'bg-slate-200/60 text-slate-600 border border-slate-300/70'
                      : 'bg-slate-800/45 text-slate-400 border border-slate-700/50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Trash2 className="w-3 h-3 text-rose-400/80 flex-shrink-0" />
                    <span className="truncate">
                      تم حذف هذه الرسالة من قبل {deleterLabel}
                      {msg.deletedBy ? ` (${msg.deletedBy})` : ''}
                      {msg.username ? ` — كانت لـ @${msg.username}` : ''}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono opacity-70 flex-shrink-0">
                    {formatMessageTime(msg)}
                  </span>
                </div>
              );
            }

            const isAlertMessage = Boolean(msg.badge && (msg.badge.includes('إشعار عام') || msg.badge.includes('إعلان')));
            const isMentioned = Boolean(
              currentUser &&
              msg.username !== currentUser.username &&
              msg.text &&
              (
                msg.text.includes(`@${currentUser.username}`) ||
                msg.text.toLowerCase().includes(`@${currentUser.username.toLowerCase()}`)
              )
            );

            return (
              <div
                id={`msg-${msg.id}`}
                key={msg.id ? `msg-${msg.id}` : `msg-idx-${idx}`}
                className={`chat-message-row relative flex items-start gap-1 sm:gap-1.5 text-right py-0.5 sm:py-1 px-1 sm:px-1.5 rounded-lg transition-all max-w-full min-w-0 ${
                  activeMsgMenuId === msg.id ? 'z-50' : 'z-0'
                } ${
                  isAlertMessage
                    ? 'bg-amber-50/90 border-r-4 border-amber-500 shadow-xs my-0.5'
                    : isMentioned
                    ? 'mention-pink-flash border-r-4 border-rose-500 ring-2 ring-pink-300/80 shadow-md my-0.5'
                    : activeWallpaper.startsWith('light-')
                    ? 'border-b border-slate-200/70 last:border-b-0 hover:bg-black/5'
                    : 'border-b border-slate-800/40 last:border-b-0 hover:bg-white/5'
                }`}
              >
                <img
                  src={msg.avatarUrl || falconIcon}
                  alt={msg.username}
                  onClick={() => {
                    const target = rosterUsers.find((u) => u.username === msg.username);
                    if (target) openUserProfile(target);
                  }}
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-md object-cover border border-slate-300 shadow-2xs flex-shrink-0 mt-0.5 cursor-pointer hover:opacity-80"
                />

                <div className={`flex-1 min-w-0 relative ${activeMsgMenuId === msg.id ? 'z-50' : ''}`}>
                  <div className="flex items-center justify-between text-[11px] mb-0.5 gap-1 leading-tight">
                    <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap min-w-0">
                      {msg.badge && (
                        <span className={`px-1 py-0.2 rounded text-[9px] font-bold ${msg.badgeColor || 'bg-red-600 text-white'}`}>
                          {msg.badge}
                        </span>
                      )}
                      {/* Companion Gift Badge - positioned right beside the avatar on the same line as the name/banner */}
                      {(() => {
                        const companionGift = (msg.giftBadges && msg.giftBadges.length > 0)
                          ? msg.giftBadges[0]
                          : rosterUsers.find((u) => u.username.toLowerCase() === msg.username.toLowerCase())?.giftBadges?.[0]
                            || allConnectedUsers.find((u) => u.username.toLowerCase() === msg.username.toLowerCase())?.giftBadges?.[0]
                            || allRegisteredMembers.find((m) => m.username.toLowerCase() === msg.username.toLowerCase())?.giftBadges?.[0];
                        if (!companionGift) return null;
                        return (
                          <img
                            src={companionGift}
                            alt="هدية"
                            title="هدية تكريمية مرافقة للاسم"
                            onClick={() => openUserProfileByName(msg.username)}
                            className="w-4 h-4 sm:w-5 sm:h-5 max-w-[20px] max-h-[20px] object-contain inline-block drop-shadow-sm select-none shrink-0 align-middle hover:scale-125 transition-transform cursor-pointer"
                          />
                        );
                      })()}
                      {(() => {
                        const bannerUrl = getUserBanner(msg.username, msg.nameBannerUrl);
                        if (bannerUrl) {
                          return (
                            <span
                              onClick={() => openUserProfileByName(msg.username)}
                              title={msg.username}
                              className="inline-flex items-center cursor-pointer select-none"
                            >
                              <img
                                src={bannerUrl}
                                alt={msg.username}
                                title={msg.username}
                                className="h-5 max-h-[22px] max-w-[140px] sm:max-w-[180px] object-contain drop-shadow-xs rounded inline-block align-middle hover:opacity-90 transition-opacity"
                                loading="lazy"
                              />
                            </span>
                          );
                        }
                        return (
                          <span
                            onClick={() => openUserProfileByName(msg.username)}
                            style={{ color: msg.nameColor || '#000000' }}
                            className={`font-bold cursor-pointer hover:underline text-[11px] sm:text-xs ${!msg.nameColor ? 'text-black' : ''}`}
                          >
                            {msg.username}
                          </span>
                        );
                      })()}
                      {isMentioned && (
                        <span className="px-1.5 py-0.2 rounded-full bg-rose-200/90 text-rose-800 text-[9px] font-black flex items-center gap-1 shadow-2xs border border-rose-300 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
                          <span>@ إشارة خاصة بك</span>
                        </span>
                      )}
                    </div>

                    {/* Consolidated Actions: Time + Single Dropdown Menu (⋮) */}
                    <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0 relative">
                      <span
                        className="text-[10px] text-slate-400 font-mono font-medium select-none"
                        title={msg.timestamp ? new Date(msg.timestamp).toLocaleString('ar-EG') : undefined}
                      >
                        {formatMessageTime(msg)}
                      </span>

                      {/* Single Elegant Action Trigger Button (⋮) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMsgMenuId(activeMsgMenuId === msg.id ? null : msg.id);
                        }}
                        className={`msg-action-btn relative z-20 w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95 border ${
                          activeMsgMenuId === msg.id
                            ? 'bg-amber-500 text-slate-950 border-amber-400 font-black scale-105 ring-2 ring-amber-400/50'
                            : activeWallpaper.startsWith('light-')
                            ? 'bg-white/90 hover:bg-slate-200 text-slate-700 border-slate-300'
                            : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border-slate-700/80'
                        }`}
                        title="خيارات وإجراءات الرسالة (رد، نسخ، نطق، تفاعل، تعديل، تثبيت، حذف، إبلاغ)"
                      >
                        ⋮
                      </button>

                      {/* Message Action Menu (يظهر مباشرة بجوار وأمام زر الثلاث نقاط مع منع إغلاقها عند النقر بالداخل) */}
                      {activeMsgMenuId === msg.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          onTouchStart={(e) => e.stopPropagation()}
                          className="msg-action-panel absolute top-full mt-2 left-0 z-50 p-2 bg-slate-900/95 text-slate-100 border-2 border-amber-500/80 rounded-2xl shadow-2xl backdrop-blur-md w-[86vw] max-w-[340px] sm:max-w-[380px] overflow-hidden transition-all duration-200 ease-out transform opacity-100 scale-100 animate-in fade-in zoom-in-95 slide-in-from-top-2 ring-2 ring-amber-500/30"
                        >
                      {/* Upper Row: Quick Emojis + Close Button */}
                      <div className="flex items-center justify-between gap-1 pb-1.5 mb-1.5 border-b border-slate-800/90">
                        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                          <span className="text-[11px] text-amber-400 font-bold ml-1 select-none flex-shrink-0">
                            تفاعل:
                          </span>
                          {AVAILABLE_REACTIONS.map((em) => (
                            <button
                              key={em}
                              type="button"
                              onClick={() => {
                                setActiveMsgMenuId(null);
                                handleReactToMessage(msg.id, em);
                              }}
                              className="w-7 h-7 rounded-full flex items-center justify-center text-sm hover:scale-130 transition-transform hover:bg-slate-800 active:scale-95 cursor-pointer flex-shrink-0"
                              title={`تفاعل بـ ${em}`}
                            >
                              {em}
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveMsgMenuId(null)}
                          className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 flex-shrink-0 transition-colors cursor-pointer"
                          title="إغلاق خيارات الرسالة"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Lower Row: Action Buttons */}
                      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs">
                        {/* 1. Reply (رد) */}
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMsgMenuId(null);
                            setReplyingTo({
                              id: msg.id,
                              username: msg.username,
                              text: msg.text || (msg.voiceNote ? 'تسجيل مقطع صوتي 🎙️' : 'مرفق وسائط 📸'),
                              mediaUrl: msg.mediaUrl
                            });
                            inputRef.current?.focus();
                            showToast(`الرد على @${msg.username} ↩️`, 'info');
                          }}
                          className="px-2 py-1 rounded-lg bg-slate-800/90 hover:bg-amber-600/30 hover:text-amber-300 text-slate-200 border border-slate-700/80 flex items-center gap-1.5 font-medium transition-all active:scale-95 cursor-pointer flex-shrink-0"
                          title="رد على الرسالة"
                        >
                          <Reply className="w-3.5 h-3.5 rotate-180 text-amber-400" />
                          <span>رد</span>
                        </button>

                        {/* 2. Copy (نسخ) */}
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMsgMenuId(null);
                            const textToCopy = msg.text || msg.mediaUrl || '';
                            navigator.clipboard.writeText(textToCopy);
                            showToast('تم نسخ المحتوى بنجاح ✔️', 'info');
                          }}
                          className="px-2 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 hover:text-white text-slate-200 border border-slate-700/80 flex items-center gap-1.5 font-medium transition-all active:scale-95 cursor-pointer flex-shrink-0"
                          title="نسخ النص أو الرابط"
                        >
                          <Copy className="w-3.5 h-3.5 text-slate-300" />
                          <span>نسخ</span>
                        </button>

                        {/* 3. Text to Speech (نطق) */}
                        {msg.text && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMsgMenuId(null);
                              speakMessage(msg.text);
                            }}
                            className="px-2 py-1 rounded-lg bg-slate-800/90 hover:bg-indigo-600/30 hover:text-indigo-300 text-slate-200 border border-slate-700/80 flex items-center gap-1.5 font-medium transition-all active:scale-95 cursor-pointer flex-shrink-0"
                            title="قراءة صوتية (نطق)"
                          >
                            <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                            <span>نطق</span>
                          </button>
                        )}

                        {/* 4. Star (مفضلة) */}
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMsgMenuId(null);
                            toggleStarMessage(msg);
                          }}
                          className="px-2 py-1 rounded-lg bg-slate-800/90 hover:bg-amber-600/30 hover:text-amber-300 text-slate-200 border border-slate-700/80 flex items-center gap-1.5 font-medium transition-all active:scale-95 cursor-pointer flex-shrink-0"
                          title={isMessageStarred(msg.id) ? 'إزالة من المفضلة' : 'حفظ في المفضلة'}
                        >
                          <Star className={`w-3.5 h-3.5 ${isMessageStarred(msg.id) ? 'fill-amber-400 text-amber-400' : 'text-slate-400'}`} />
                          <span>{isMessageStarred(msg.id) ? 'إلغاء المفضلة' : 'مفضلة'}</span>
                        </button>

                        {/* 5. Whisper / PM (خاص) */}
                        {currentUser && msg.username.toLowerCase() !== currentUser.username.toLowerCase() && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMsgMenuId(null);
                              const target = rosterUsers.find((u) => u.username === msg.username);
                              if (target) {
                                setSelectedPmUser(target);
                                setActiveDrawer('pm');
                              } else {
                                setSelectedPmUser({
                                  id: msg.username,
                                  username: msg.username,
                                  room: currentUser.room,
                                  avatarSeed: msg.username,
                                  avatarUrl: msg.avatarUrl,
                                  statusQuote: '',
                                  flag: msg.flag || '🇸🇦',
                                  role: 'member',
                                  likes: 0,
                                  points: 0,
                                  isVoice: false,
                                  micSlot: null,
                                  isMuted: false,
                                  isTextMuted: false,
                                  isSpeaking: false
                                });
                                setActiveDrawer('pm');
                              }
                            }}
                            className="px-2 py-1 rounded-lg bg-slate-800/90 hover:bg-emerald-600/30 hover:text-emerald-300 text-slate-200 border border-slate-700/80 flex items-center gap-1.5 font-medium transition-all active:scale-95 cursor-pointer flex-shrink-0"
                            title="محادثة خاصة مع العضو"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                            <span>خاص</span>
                          </button>
                        )}

                        {/* 6. Profile (بروفايل) */}
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMsgMenuId(null);
                            openUserProfileByName(msg.username);
                          }}
                          className="px-2 py-1 rounded-lg bg-slate-800/90 hover:bg-sky-600/30 hover:text-sky-300 text-slate-200 border border-slate-700/80 flex items-center gap-1.5 font-medium transition-all active:scale-95 cursor-pointer flex-shrink-0"
                          title="عرض الملف الشخصي"
                        >
                          <UserIcon className="w-3.5 h-3.5 text-sky-400" />
                          <span>بروفايل</span>
                        </button>

                        {/* 7. Edit (تعديل) */}
                        {(msg.username.toLowerCase() === currentUser?.username.toLowerCase() || currentUser?.role === 'admin' || currentUser?.role === 'super') && !msg.voiceNote && !msg.mediaUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMsgMenuId(null);
                              setEditingMsgId(editingMsgId === msg.id ? null : msg.id);
                              setEditingMsgText(msg.text);
                            }}
                            className="px-2 py-1 rounded-lg bg-slate-800/90 hover:bg-sky-600/30 hover:text-sky-300 text-slate-200 border border-slate-700/80 flex items-center gap-1.5 font-medium transition-all active:scale-95 cursor-pointer flex-shrink-0"
                            title="تعديل الرسالة"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-sky-400" />
                            <span>تعديل</span>
                          </button>
                        )}

                        {/* 8. Pin (تثبيت) */}
                        {(currentUser?.role === 'admin' || currentUser?.role === 'super') && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMsgMenuId(null);
                              handlePinChatMessage(msg.id);
                            }}
                            className="px-2 py-1 rounded-lg bg-slate-800/90 hover:bg-amber-600/30 hover:text-amber-300 text-slate-200 border border-slate-700/80 flex items-center gap-1.5 font-medium transition-all active:scale-95 cursor-pointer flex-shrink-0"
                            title="تثبيت في الروم"
                          >
                            <Pin className="w-3.5 h-3.5 text-amber-400" />
                            <span>تثبيت</span>
                          </button>
                        )}

                        {/* 9. Delete (حذف) */}
                        {(msg.username.toLowerCase() === currentUser?.username.toLowerCase() || currentUser?.role === 'admin' || currentUser?.role === 'super' || userCanDeleteMessage) && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMsgMenuId(null);
                              handleDeleteChatMessage(msg.id);
                            }}
                            className="px-2 py-1 rounded-lg bg-slate-800/90 hover:bg-rose-600/30 hover:text-rose-300 text-slate-200 border border-slate-700/80 flex items-center gap-1.5 font-medium transition-all active:scale-95 cursor-pointer flex-shrink-0"
                            title="حذف الرسالة"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                            <span>حذف</span>
                          </button>
                        )}

                        {/* 10. Report (إبلاغ) */}
                        {currentUser && msg.username.toLowerCase() !== currentUser.username.toLowerCase() && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMsgMenuId(null);
                              handleReportChatMessage(msg);
                            }}
                            className="px-2 py-1 rounded-lg bg-slate-800/90 hover:bg-orange-600/30 hover:text-orange-300 text-slate-200 border border-slate-700/80 flex items-center gap-1.5 font-medium transition-all active:scale-95 cursor-pointer flex-shrink-0"
                            title="إبلاغ عن مخالفة"
                          >
                            <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
                            <span>إبلاغ</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                    </div>
                  </div>

                  {/* Snug Message Bubble (تمتد بكامل العرض لمقابلة زر الثلاث نقاط بالأعلى) */}
                  <div className={`block w-full max-w-full text-right px-2 py-0.5 sm:px-2.5 sm:py-1 transition-all [overflow-wrap:anywhere] break-words shadow-2xs ${
                    isAlertMessage
                      ? isNightMode
                        ? 'rounded-xl bg-amber-950/80 text-amber-200 border border-amber-600/70 shadow-xs'
                        : 'rounded-xl bg-amber-100/95 text-amber-950 border border-amber-300 shadow-2xs'
                      : isMentioned
                      ? isNightMode
                        ? 'rounded-xl bg-rose-950/80 text-rose-200 border border-rose-500/60 ring-1 ring-rose-500/30 shadow-xs'
                        : 'rounded-xl bg-rose-50 text-rose-950 border border-rose-300 ring-1 ring-rose-200 shadow-2xs'
                      : bubbleStyle === 'transparent'
                      ? 'bg-transparent border-0 border-transparent shadow-none px-1 py-0.5'
                      : bubbleStyle === 'pill'
                      ? currentUser && msg.username === currentUser.username
                        ? isNightMode
                          ? 'rounded-xl sm:rounded-2xl shadow-xs px-3 py-1 sm:px-3.5 sm:py-1.5 bg-[#241a12] text-amber-100 border border-amber-600/50'
                          : 'rounded-xl sm:rounded-2xl shadow-2xs px-3 py-1 sm:px-3.5 sm:py-1.5 bg-amber-50/95 text-slate-900 border border-amber-300/80'
                        : isNightMode
                          ? 'rounded-xl sm:rounded-2xl shadow-xs px-3 py-1 sm:px-3.5 sm:py-1.5 bg-[#161f33] text-slate-100 border border-slate-700/80'
                          : 'rounded-xl sm:rounded-2xl shadow-2xs px-3 py-1 sm:px-3.5 sm:py-1.5 bg-white text-slate-900 border border-slate-200/90'
                      : bubbleStyle === 'classic'
                      ? currentUser && msg.username === currentUser.username
                        ? isNightMode
                          ? 'rounded-xs border-2 border-amber-500/70 shadow-xs font-medium bg-[#241a12] text-amber-100'
                          : 'rounded-xs border-2 border-amber-300 shadow-2xs font-medium bg-amber-50/90 text-slate-900'
                        : isNightMode
                          ? 'rounded-xs border-2 border-slate-700 shadow-xs font-medium bg-[#161f33] text-slate-100'
                          : 'rounded-xs border-2 border-slate-300 shadow-2xs font-medium bg-white text-slate-900'
                      : bubbleStyle === 'glass'
                      ? currentUser && msg.username === currentUser.username
                        ? isNightMode
                          ? 'rounded-xl backdrop-blur-md bg-amber-950/50 border border-amber-500/50 text-amber-100 shadow-xs'
                          : 'rounded-xl backdrop-blur-md bg-amber-100/80 border border-amber-300/70 text-slate-900 shadow-xs'
                        : isNightMode
                          ? 'rounded-xl backdrop-blur-md bg-slate-900/80 border border-slate-700/60 text-slate-100 shadow-xs'
                          : 'rounded-xl backdrop-blur-md bg-white/80 border border-white/60 text-slate-900 shadow-xs'
                      : bubbleStyle === 'sharp'
                      ? currentUser && msg.username === currentUser.username
                        ? isNightMode
                          ? 'rounded-tl-xl rounded-br-xl rounded-tr-xs rounded-bl-xs border-r-3 border-amber-500 bg-[#241a12] text-amber-100 shadow-xs'
                          : 'rounded-tl-xl rounded-br-xl rounded-tr-xs rounded-bl-xs border-r-3 border-amber-400 bg-amber-50/90 text-slate-900 shadow-2xs'
                        : isNightMode
                          ? 'rounded-tl-xl rounded-br-xl rounded-tr-xs rounded-bl-xs border-r-3 border-slate-600 bg-[#161f33] text-slate-100 shadow-xs'
                          : 'rounded-tl-xl rounded-br-xl rounded-tr-xs rounded-bl-xs border-r-3 border-slate-400 bg-white text-slate-900 shadow-2xs'
                      : bubbleStyle === 'speech'
                      ? currentUser && msg.username === currentUser.username
                        ? isNightMode
                          ? 'rounded-xl rounded-tr-xs shadow-xs bg-[#241a12] text-amber-100 border border-amber-600/50'
                          : 'rounded-xl rounded-tr-xs shadow-2xs bg-amber-50/90 text-slate-900 border border-amber-200/90'
                        : isNightMode
                          ? 'rounded-xl rounded-tl-xs shadow-xs bg-[#161f33] text-slate-100 border border-slate-700/80'
                          : 'rounded-xl rounded-tl-xs shadow-2xs bg-white text-slate-900 border border-slate-200/90'
                      : bubbleStyle === 'neon'
                      ? currentUser && msg.username === currentUser.username
                        ? 'rounded-xl shadow-xs shadow-amber-500/25 border-2 border-amber-500/80 bg-[#241a12] text-amber-100'
                        : 'rounded-xl shadow-xs shadow-indigo-500/20 border-2 border-indigo-400/70 bg-[#161f33] text-slate-100'
                      : bubbleStyle === 'compact'
                      ? currentUser && msg.username === currentUser.username
                        ? isNightMode
                          ? 'rounded-md shadow-xs py-0.5 px-1.5 text-xs border border-amber-600/50 bg-[#241a12] text-amber-100'
                          : 'rounded-md shadow-2xs py-0.5 px-1.5 text-xs border border-amber-200 bg-amber-50/90 text-slate-900'
                        : isNightMode
                          ? 'rounded-md shadow-xs py-0.5 px-1.5 text-xs border border-slate-700 bg-[#161f33] text-slate-100'
                          : 'rounded-md shadow-2xs py-0.5 px-1.5 text-xs border border-slate-200 bg-white text-slate-900'
                      : bubbleStyle === 'royal-gold'
                      ? currentUser && msg.username === currentUser.username
                        ? 'rounded-xl shadow-xs border-2 border-amber-400 bg-gradient-to-r from-amber-950/80 to-yellow-950/70 text-amber-100 font-medium'
                        : 'rounded-xl shadow-xs border-2 border-amber-500/60 bg-gradient-to-r from-slate-900/90 to-amber-950/60 text-amber-100 font-medium'
                      : currentUser && msg.username === currentUser.username
                      ? isNightMode
                        ? 'rounded-xl rounded-tr-xs shadow-xs bg-[#241a12] text-amber-100 border border-amber-600/50'
                        : 'rounded-xl rounded-tr-xs shadow-2xs bg-amber-50/85 text-slate-900 border border-amber-200/90'
                      : isNightMode
                        ? 'rounded-xl rounded-tl-xs shadow-xs bg-[#161f33] text-slate-100 border border-slate-700/80'
                        : 'rounded-xl rounded-tl-xs shadow-2xs bg-white text-slate-900 border border-slate-200/90'
                  }`}>
                    {/* Quoted Reply Banner if msg.replyTo (ميزة الرد بكل مكان) */}
                    {msg.replyTo && (
                      <div
                        onClick={() => {
                          const targetEl = document.getElementById(`msg-${msg.replyTo?.id}`);
                          if (targetEl) {
                            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            targetEl.classList.add('ring-2', 'ring-amber-500');
                            setTimeout(() => targetEl.classList.remove('ring-2', 'ring-amber-500'), 2200);
                          }
                        }}
                        className="mb-1 px-2 py-0.5 bg-amber-100/80 border-r-3 border-amber-500 rounded-md text-[10px] cursor-pointer hover:bg-amber-200/70 transition-colors flex flex-col gap-0.5 shadow-2xs"
                        title="انقر للذهاب إلى الرسالة الأصلية المردود عليها"
                      >
                        <div className="font-bold text-amber-900 flex items-center gap-1 text-[10px]">
                          <Reply className="w-3 h-3 rotate-180 text-amber-700" />
                          <span>رد على:</span>
                          {(() => {
                            const replyBanner = getUserBanner(msg.replyTo.username);
                            if (replyBanner) {
                              return (
                                <img
                                  src={replyBanner}
                                  alt={msg.replyTo.username}
                                  title={msg.replyTo.username}
                                  className="h-4 max-h-[18px] max-w-[120px] object-contain rounded inline-block"
                                />
                              );
                            }
                            return <span>@{msg.replyTo.username}</span>;
                          })()}
                        </div>
                        <div className="text-slate-600 truncate max-w-full sm:max-w-md text-[10px]">
                          {msg.replyTo.text || 'مرفق وسائط / صوت 📎'}
                        </div>
                      </div>
                    )}

                    {/* Voice Note Player (تسجيل مقطع صوتي) */}
                    {msg.voiceNote && (
                      <div className="my-0.5">
                        <VoicePlayer
                          audioUrl={msg.voiceNote.audioUrl}
                          duration={msg.voiceNote.duration}
                          isMe={Boolean(currentUser && msg.username === currentUser.username)}
                          senderName={msg.username}
                        />
                      </div>
                    )}

                    {/* Text Message or Inline Editor */}
                    {editingMsgId === msg.id ? (
                      <div className="my-1.5 p-2 bg-white/95 border border-blue-400 rounded-xl space-y-2 shadow-sm text-right">
                        <textarea
                          rows={2}
                          value={editingMsgText}
                          onChange={(e) => setEditingMsgText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSaveEditChatMessage(msg.id, editingMsgText);
                            } else if (e.key === 'Escape') {
                              setEditingMsgId(null);
                            }
                          }}
                          className="w-full p-2 text-xs text-slate-800 bg-slate-50 border border-slate-300 rounded-lg outline-none focus:border-blue-500 resize-none font-medium"
                          autoFocus
                        />
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSaveEditChatMessage(msg.id, editingMsgText)}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[10px] font-bold cursor-pointer shadow-xs"
                          >
                            حفظ التعديل
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingMsgId(null)}
                            className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md text-[10px] font-bold cursor-pointer"
                          >
                            إلغاء
                          </button>
                        </div>
                      </div>
                    ) : msg.isGiftAnnouncement && msg.giftInfo ? (
                      <div className="my-1.5 p-2 sm:p-2.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-amber-600/20 border-2 border-amber-400 shadow-md text-right">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="relative shrink-0">
                            <img
                              src={msg.giftInfo.giftUrl}
                              alt="هدية"
                              className="w-10 h-10 sm:w-12 sm:h-12 object-contain drop-shadow-md select-none animate-bounce duration-1000"
                            />
                            <span className="absolute -top-1 -right-1 text-xs">✨</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-black text-xs sm:text-sm text-amber-900 dark:text-amber-200 flex items-center gap-1.5 flex-wrap">
                              <span>🎁 أهدى [{msg.giftInfo.fromUsername}]</span>
                              <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 text-[10px] sm:text-[11px] font-black shadow-xs">
                                {msg.giftInfo.giftTitle}
                              </span>
                              <span>إلى [{msg.giftInfo.toUsername}] 💎</span>
                            </div>
                            {msg.giftInfo.giftMessage && (
                              <div className="text-[11px] sm:text-xs text-slate-700 dark:text-slate-300 mt-1 italic font-medium bg-black/5 dark:bg-white/5 px-2 py-1 rounded-lg border border-amber-400/30">
                                💌 "{msg.giftInfo.giftMessage}"
                              </div>
                            )}
                            <div className="text-[9px] sm:text-[10px] text-emerald-700 dark:text-emerald-300 font-bold mt-1 flex items-center gap-1">
                              <span>✓</span>
                              <span>تم تثبيت الهدية كمرافقة لاسم العضو بجانب صورته الشخصية في كل مكان بالشات ✨</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      msg.text && (
                        <div
                          style={{
                            color: getAutoContrastMessageTextColor({
                              textColor: msg.textColor,
                              isMe: Boolean(currentUser && msg.username === currentUser.username),
                              isNight: isNightMode,
                              bubbleStyle,
                              curTheme,
                              isMentioned,
                              isAlert: isAlertMessage,
                              forceHighContrast: isHighContrastMode
                            })
                          }}
                          dir="auto"
                          className={`${
                            chatFontSize === 'sm' ? 'text-xs' : chatFontSize === 'lg' ? 'text-base' : chatFontSize === 'xl' ? 'text-lg' : 'text-sm'
                          } leading-snug font-normal break-words [overflow-wrap:anywhere] whitespace-pre-wrap`}
                        >
                          {renderFormattedMessageText(msg.text)}
                          {msg.isEdited && (
                            <span className="text-[10px] text-slate-400 font-normal mr-1.5 select-none">(معدلة ✏️)</span>
                          )}
                        </div>
                      )
                    )}

                    {/* Media Attachment or Sticker with Click to Open in Lightbox */}
                    {msg.mediaUrl && (
                      <div className="mt-1.5">
                        {msg.mediaType === 'sticker' ? (
                          <span className="text-3xl sm:text-4xl">{msg.mediaUrl}</span>
                        ) : msg.mediaType === 'video' || msg.mediaUrl.startsWith('data:video') || msg.mediaUrl.endsWith('.mp4') || msg.mediaUrl.endsWith('.webm') ? (
                          <div
                            onClick={() =>
                              setActiveMediaViewer({
                                url: msg.mediaUrl!,
                                type: 'video',
                                title: `فيديو من @${msg.username}`
                              })
                            }
                            className="relative rounded-xl overflow-hidden border border-slate-300 bg-black cursor-pointer group max-h-56 max-w-xs shadow-md"
                            title="انقر لفتح الفيديو في الوسط وتكبيره وتحميله"
                          >
                            <video src={msg.mediaUrl} className="max-h-56 w-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                              <div className="w-12 h-12 rounded-full bg-amber-500/90 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                                <Play className="w-6 h-6 fill-white ml-0.5" />
                              </div>
                            </div>
                            <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/75 text-[10px] text-white font-mono flex items-center gap-1">
                              <Video className="w-3 h-3 text-amber-400" />
                              <span>فيديو (انقر للعرض)</span>
                            </div>
                          </div>
                        ) : (
                          <div
                            onClick={() =>
                              setActiveMediaViewer({
                                url: msg.mediaUrl!,
                                type: 'image',
                                title: `صورة من @${msg.username}`
                              })
                            }
                            className="relative cursor-pointer group rounded-xl overflow-hidden"
                            title="انقر لفتح الصورة في الوسط وتكبيرها وتحميلها"
                          >
                            <img
                              src={msg.mediaUrl}
                              alt="وسائط"
                              className="max-h-56 max-w-full rounded-xl border border-slate-300 object-cover shadow-sm group-hover:scale-[1.02] transition-transform"
                            />
                            <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/60 text-[9px] text-white opacity-0 group-hover:opacity-100 transition-opacity">
                              🔍 تكبير وتحميل
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Interactive Reactions Display (الرموز المتفاعل بها فقط) */}
                    {msg.reactions && Object.entries(msg.reactions).length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 mt-1.5 pt-1 border-t border-slate-100/60">
                        {Object.entries(msg.reactions).map(([emoji, count]) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleReactToMessage(msg.id, emoji)}
                            className="px-1.5 py-0.5 rounded-full bg-slate-100/80 hover:bg-amber-100/80 text-[10px] font-bold flex items-center gap-0.5 border border-slate-200/80 transition-colors cursor-pointer"
                          >
                            <span>{emoji}</span>
                            <span className="font-mono text-slate-700">{count}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
        {/* Floating Jump to Latest Messages Button */}
        {showScrollBottomBtn && (
          <button
            type="button"
            onClick={() => scrollToBottom(true)}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 z-25 bg-[#241a12]/95 hover:bg-black text-amber-300 border border-amber-500/80 px-3.5 py-1.5 rounded-full shadow-2xl flex items-center gap-1.5 text-xs font-black cursor-pointer animate-bounce backdrop-blur-xs transition-all"
          >
            <span>الانتقال لآخر الرسائل</span>
            <span>↓</span>
          </button>
        )}
      </div>

        {/* BOTTOM INPUT BAR (Screenshot 2: [⮑] [😊] [اكتب رسالتك، واستخدم @ للمنشن] [+] [إرسال ✈]) */}
        <div className={`flex-shrink-0 z-20 ${curTheme.inputBarBg || curTheme.bottomBarBg} border-t ${curTheme.inputBarBorder || curTheme.bottomBarBorder} px-1.5 py-1 relative`}>
          
          {/* Multi-Tab Emoji & Sticker Picker (الفيسات المخصصة ف1 ف2، الستيكرات، والابتسامات) */}
          {showEmojiPicker && (
            <>
              <div className="fixed inset-0 z-25" onClick={() => setShowEmojiPicker(false)} />
              <div className="absolute bottom-16 right-3 p-3 bg-slate-900 border-2 border-amber-500/70 rounded-2xl shadow-2xl z-30 w-80 sm:w-96 text-right text-slate-100 backdrop-blur-md animate-in zoom-in-95">
                {/* Header with Title and Close Button */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-700/80 mb-2">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-amber-300">
                    <Smile className="w-4 h-4 text-amber-400" />
                    <span>الرموز التعبيرية والفيسات والملصقات</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(false)}
                    className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Tabs Switcher */}
                <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950/80 rounded-xl mb-3 border border-slate-800 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setEmojiPickerTab('custom')}
                    className={`py-1.5 px-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      emojiPickerTab === 'custom'
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>🎨</span>
                    <span>فيسات (ف1)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmojiPickerTab('stickers')}
                    className={`py-1.5 px-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      emojiPickerTab === 'stickers'
                        ? 'bg-amber-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>🖼️</span>
                    <span>ستيكرات</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmojiPickerTab('vintage')}
                    className={`py-1.5 px-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      emojiPickerTab === 'vintage'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>😊</span>
                    <span>شعبية</span>
                  </button>
                </div>

                {/* TAB 1: CUSTOM EMOJIS (الفيسات المخصصة ذات الأكواد ف1، ف2...) */}
                {emojiPickerTab === 'custom' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                      <span>انقر على الفيس لإدراج كوده بالرسالة تلقائياً:</span>
                      <span className="font-mono text-purple-300 font-bold">
                        {emblemsConfig.items.filter((i) => i.type === 'emoji').length} فيس متاح
                      </span>
                    </div>

                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-60 overflow-y-auto p-1">
                      {emblemsConfig.items
                        .filter((i) => i.type === 'emoji')
                        .sort((a, b) => (a.codeNumber || 0) - (b.codeNumber || 0))
                        .map((emoji) => (
                          <button
                            key={emoji.id}
                            type="button"
                            onClick={() => {
                              if (emoji.shortcut) {
                                setTextInput((prev) => (prev ? `${prev} ${emoji.shortcut} ` : `${emoji.shortcut} `));
                                inputRef.current?.focus();
                                showToast(`تم إدراج كود الفيس [${emoji.shortcut}] ⚡`, 'info');
                              }
                            }}
                            className="p-1.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-purple-400 hover:bg-purple-950/30 flex flex-col items-center justify-center gap-1 transition-all group cursor-pointer hover:scale-105"
                            title={`${emoji.title} (${emoji.shortcut})`}
                          >
                            <img
                              src={emoji.imageUrl}
                              alt={emoji.shortcut || emoji.title}
                              className="w-8 h-8 object-contain drop-shadow-sm group-hover:scale-110 transition-transform"
                              loading="lazy"
                            />
                            <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[9px] font-black border border-amber-500/40">
                              {emoji.shortcut}
                            </span>
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {/* TAB 2: STICKERS (الملصقات التعبيرية بالشات) */}
                {emojiPickerTab === 'stickers' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                      <span>انقر لإرسال الستيكر كصورة تعبيرية فوراً:</span>
                      <span className="font-mono text-amber-300 font-bold">
                        {emblemsConfig.items.filter((i) => i.type === 'sticker').length} ستيكر
                      </span>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-60 overflow-y-auto p-1">
                      {emblemsConfig.items
                        .filter((i) => i.type === 'sticker')
                        .map((stk) => (
                          <button
                            key={stk.id}
                            type="button"
                            onClick={() => {
                              handleSendMessage(undefined, stk.imageUrl, 'image');
                              setShowEmojiPicker(false);
                            }}
                            className="p-2 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-amber-400 hover:bg-amber-950/30 flex flex-col items-center justify-center gap-1.5 transition-all group cursor-pointer hover:scale-105"
                            title={stk.title}
                          >
                            <img
                              src={stk.imageUrl}
                              alt={stk.title}
                              className="w-12 h-12 object-contain drop-shadow-md group-hover:scale-110 transition-transform"
                              loading="lazy"
                            />
                            <span className="text-[10px] text-slate-300 font-bold truncate max-w-full">
                              {stk.title}
                            </span>
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {/* TAB 3: VINTAGE STICKERS & POPULAR EMOJIS */}
                {emojiPickerTab === 'vintage' && (
                  <div className="space-y-2">
                    <div className="text-[10px] text-slate-400 px-1">
                      الابتسامات الشعبية الكلاسيكية:
                    </div>
                    <div className="grid grid-cols-6 gap-2 text-2xl max-h-60 overflow-y-auto p-1">
                      {VINTAGE_STICKERS.map((stk) => (
                        <button
                          key={stk}
                          type="button"
                          onClick={() => handleSendSticker(stk)}
                          className="p-1 hover:bg-slate-800 rounded-lg text-center cursor-pointer hover:scale-125 transition-transform"
                        >
                          {stk}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Media / Photo Upload Picker (Screenshot 7) */}
          {showMediaPicker && (
            <>
              <div className="fixed inset-0 z-25" onClick={() => setShowMediaPicker(false)} />
              <div className="absolute bottom-16 right-16 p-3 bg-white border border-slate-300 rounded-xl shadow-2xl z-30 w-72 text-right">
                <div className="text-xs font-bold text-slate-800 pb-2 border-b mb-2 flex items-center justify-between">
                  <span>إرسال فيديو أو صورة متحركة أو صورة 🎥📸</span>
                  <button onClick={() => setShowMediaPicker(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Device Photo / Video / Camera Upload */}
                <label className="mb-2 py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded flex items-center justify-center gap-1.5 cursor-pointer font-bold text-xs transition-colors">
                  <Camera className="w-3.5 h-3.5" />
                  <span>رفع فيديو أو صورة من جهازك 📁</span>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      const isVid = (file?.type || '').startsWith('video');
                      handleFileUpload(e, (dataUrl) => {
                        handleSendMessage(undefined, dataUrl, isVid ? 'video' : 'image');
                        setShowMediaPicker(false);
                      });
                    }}
                  />
                </label>

                {/* Media Upload Guidance */}
                <div className="p-2 mb-2 bg-slate-50 border border-slate-200 rounded-lg text-center text-xs text-slate-600">
                  <div className="font-bold text-slate-800 mb-0.5">رفع وسائط حية ومباشرة 📁</div>
                  <div className="text-[11px] text-slate-500">اختر صورة أو فيديو من جهازك بالزر أعلاه أو أدخل رابطه المباشر بالأسفل</div>
                </div>

                {/* Custom Image or Video URL */}
                <input
                  type="text"
                  placeholder="أو الصق رابط فيديو أو صورة متحركة أو صورة..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value) {
                      const val = e.currentTarget.value.trim();
                      const isVid = val.endsWith('.mp4') || val.endsWith('.webm') || val.includes('youtube') || val.includes('video');
                      handleSendMessage(undefined, val, isVid ? 'video' : 'image');
                      e.currentTarget.value = '';
                      setShowMediaPicker(false);
                    }
                  }}
                  className="w-full text-xs p-1.5 border border-slate-300 rounded outline-none"
                />
              </div>
            </>
          )}

          {/* Plus Menu */}
          {showPlusMenu && (
            <>
              <div className="fixed inset-0 z-25" onClick={() => setShowPlusMenu(false)} />
              <div className="absolute bottom-16 left-12 p-3 bg-white border border-slate-300 rounded-xl shadow-2xl z-30 space-y-2 text-xs font-bold text-slate-800 w-52 animate-in fade-in zoom-in-95 duration-150">
                {/* Advanced Formatting Bar Toggle (نقل الشريط الأسود إلى علامة الزائد) */}
                <button
                  type="button"
                  onClick={() => {
                    setShowChatPowerTools(!showChatPowerTools);
                    setShowPlusMenu(false);
                  }}
                  className="w-full text-right p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded flex items-center justify-between font-black"
                >
                  <span className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-amber-600" />
                    <span>شريط التنسيق والشعر ⚡</span>
                  </span>
                  <span className="text-[9px] bg-amber-500 text-white px-1.5 py-0.2 rounded">
                    {showChatPowerTools ? 'إخفاء' : 'إظهار'}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setShowMediaPicker(true);
                    setShowPlusMenu(false);
                  }}
                  className="w-full text-right p-1.5 hover:bg-slate-100 rounded flex items-center gap-2 text-indigo-700"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>إرسال صورة / وسائط</span>
                </button>
                <button
                  onClick={() => {
                    setTextInput((prev) => prev + ' [وردة لك 🌹] ');
                    setShowPlusMenu(false);
                  }}
                  className="w-full text-right p-1.5 hover:bg-slate-100 rounded flex items-center gap-2"
                >
                  <span>🌹 إرسال باقة ورد</span>
                </button>
                <button
                  onClick={() => {
                    setTextInput((prev) => prev + ' [ألف لايك وهدية 🎁] ');
                    setShowPlusMenu(false);
                  }}
                  className="w-full text-right p-1.5 hover:bg-slate-100 rounded flex items-center gap-2"
                >
                  <span>🎁 إرسال هدية</span>
                </button>


                <button
                  type="button"
                  onClick={() => {
                    setShowSoundModal(true);
                    setShowPlusMenu(false);
                  }}
                  className="w-full text-right p-1.5 hover:bg-slate-100 rounded flex items-center gap-2 text-amber-800"
                >
                  <Volume2 className="w-4 h-4 text-amber-600" />
                  <span>نغمات التنبيهات المخصصة 🎵</span>
                </button>

                {(currentUser.role === 'hassan' || currentUser.role === 'admin' || currentUser.role === 'super' || getRoleLevel(currentUser.role) >= 75) && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowBroadcastModal(true);
                      setShowPlusMenu(false);
                    }}
                    className="w-full text-right p-1.5 hover:bg-slate-100 rounded flex items-center gap-2 text-rose-700 font-bold"
                  >
                    <Megaphone className="w-4 h-4 text-rose-600" />
                    <span>إرسال إشعار عام للغرفة 📢</span>
                  </button>
                )}
              </div>
            </>
          )}

          {/* Mention Autocomplete Suggestions Popup */}
          {showMentionMenu && mentionSuggestions.length > 0 && (
            <>
              <div className="fixed inset-0 z-25" onClick={() => setShowMentionMenu(false)} />
              <div className="absolute bottom-16 right-10 w-52 max-h-48 overflow-y-auto bg-white border border-slate-300 rounded-xl shadow-2xl z-30 divide-y divide-slate-100 animate-in fade-in duration-150">
                <div className="p-1.5 bg-amber-50 text-[10px] font-bold text-amber-900 flex items-center justify-between">
                  <span>منشن سريع للأعضاء (@):</span>
                  <button type="button" onClick={() => setShowMentionMenu(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </div>
                {mentionSuggestions.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => insertMention(u.username)}
                    className="w-full p-2 text-right hover:bg-amber-100/60 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <img src={u.avatarUrl || falconIcon} alt={u.username} className="w-6 h-6 rounded-full object-cover border border-slate-300" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-800 truncate">{u.username}</div>
                      <div className="text-[9px] text-slate-500 font-mono">{u.role === 'admin' ? 'إداري' : u.role === 'super' ? 'مشرف' : 'عضو'}</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Chat Power Tools Toolbar (يظهر فقط عند اختياره من علامة الزائد +) */}
          {showChatPowerTools && (
            <div className="mb-2 relative animate-in fade-in duration-150">
              <div className="flex items-center justify-between px-2 py-0.5 bg-slate-950 text-slate-400 text-[10px] rounded-t-lg border-x border-t border-slate-800">
                <span className="text-amber-400 font-bold flex items-center gap-1">
                  <Sliders className="w-3 h-3" />
                  <span>شريط أدوات الكتابة والتنسيق والشعر</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowChatPowerTools(false)}
                  className="hover:text-white p-0.5 cursor-pointer"
                  title="إخفاء الشريط"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <ChatPowerToolsBar
                onInsertFormat={handleInsertFormat}
                onSendQuickGreeting={(greeting) => {
                  setTextInput(greeting);
                  handleSendMessage();
                }}
                searchQuery={chatSearchQuery}
                onSearchChange={setChatSearchQuery}
                pinnedMessage={pinnedChatMessage}
                onUnpinMessage={currentUser?.role === 'admin' || currentUser?.role === 'super' ? handleUnpinChatMessage : undefined}
                isPoetryMode={isPoetryMode}
                onTogglePoetryMode={() => {
                  setIsPoetryMode(!isPoetryMode);
                  showToast(!isPoetryMode ? 'تم تفعيل وضع القصائد: اكتب الشطر الأول ثم | ثم الشطر الثاني' : 'تم تعطيل وضع القصائد', 'info');
                }}
                onShowToast={showToast}
              />
            </div>
          )}

          {/* Universal Reply Banner (ميزة الرد بكل مكان) */}
          {replyingTo && (
            <div className="mb-2 px-3 py-1.5 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between text-xs text-amber-950 shadow-xs animate-in fade-in">
              <div className="flex items-center gap-2 min-w-0">
                <Reply className="w-4 h-4 text-amber-700 flex-shrink-0 rotate-180" />
                <div className="font-bold text-amber-900 text-xs flex items-center gap-1">
                  <span>الرد على:</span>
                  {(() => {
                    const banner = getUserBanner(replyingTo.username);
                    if (banner) {
                      return (
                        <img
                          src={banner}
                          alt={replyingTo.username}
                          title={replyingTo.username}
                          className="h-4 max-h-[20px] max-w-[130px] object-contain rounded inline-block"
                        />
                      );
                    }
                    return <span>@{replyingTo.username}</span>;
                  })()}
                </div>
                <span className="truncate text-slate-600 max-w-[200px] sm:max-w-md text-xs">{replyingTo.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="p-1 text-slate-400 hover:text-red-600 rounded-full hover:bg-white cursor-pointer transition-colors"
                title="إلغاء الرد"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Active Shortcut Preview Banner (معاينة الاختصار المكتوب فوراً قبل الإرسال) */}
          {(() => {
            const matchedSc = findMatchingShortcut(textInput, shortcuts);
            if (!matchedSc) return null;
            return (
              <div className="mb-2 px-3 py-1.5 bg-gradient-to-r from-amber-500/15 via-amber-50 to-amber-500/15 border border-amber-400 rounded-xl flex items-center justify-between text-xs text-amber-950 shadow-xs animate-in fade-in">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white font-mono font-black text-[10px] shrink-0">
                    ⚡ اختصار [{matchedSc.trigger}]
                  </span>
                  <span className="text-amber-700 font-bold shrink-0">➔</span>
                  <span className="truncate text-slate-800 font-bold text-xs max-w-[180px] sm:max-w-sm">
                    "{matchedSc.replacement}"
                  </span>
                </div>
                <span className="text-[10px] text-amber-800 font-bold bg-amber-200/80 px-2 py-0.5 rounded-full shrink-0">
                  يُستبدل تلقائياً عند الإرسال ⚡
                </span>
              </div>
            );
          })()}

          {/* Typing Indicator Animated Bubble / Pulse Effect فوق خانة الرسائل */}
          {typingUsers.length > 0 && (
            <div
              role="status"
              aria-live="polite"
              className="mb-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500/15 via-amber-100/90 to-amber-500/15 dark:from-amber-950/70 dark:via-slate-900/85 dark:to-amber-950/70 border border-amber-400/50 dark:border-amber-500/40 rounded-2xl flex items-center justify-between text-xs text-amber-950 dark:text-amber-200 shadow-sm backdrop-blur-md animate-typing-bubble transition-all select-none"
            >
              <div className="flex items-center gap-2 min-w-0">
                {/* Glowing pulsating typing icon */}
                <div className="relative flex items-center justify-center shrink-0">
                  <span className="absolute -inset-1 rounded-full bg-amber-400/40 animate-ping opacity-60 pointer-events-none" />
                  <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-300 flex items-center justify-center border border-amber-400/50">
                    <Edit3 className="w-2.5 h-2.5 animate-pulse" />
                  </div>
                </div>

                {/* Overlapping member avatars */}
                <div className="flex items-center -space-x-1.5 rtl:space-x-reverse shrink-0">
                  {typingUsers.slice(0, 3).map((u) => (
                    <img
                      key={u.userId}
                      src={u.avatarUrl || falconIcon}
                      alt={u.username}
                      className="w-4.5 h-4.5 rounded-full object-cover border border-amber-300/80 shadow-2xs"
                    />
                  ))}
                </div>

                {/* Member names + text */}
                <div className="truncate text-xs font-semibold text-slate-800 dark:text-amber-100 flex items-center gap-1">
                  {typingUsers.length === 1 ? (
                    <>
                      <span className="shrink-0">{typingUsers[0].flag || '🇸🇦'}</span>
                      {(() => {
                        const tBanner = getUserBanner(typingUsers[0].username);
                        if (tBanner) {
                          return (
                            <img
                              src={tBanner}
                              alt={typingUsers[0].username}
                              className="h-4 max-h-[18px] max-w-[120px] object-contain rounded inline-block"
                            />
                          );
                        }
                        return (
                          <span
                            className="font-bold text-amber-900 dark:text-amber-300 truncate max-w-[130px] sm:max-w-[200px]"
                            style={{ color: typingUsers[0].nameColor || undefined }}
                          >
                            {typingUsers[0].username}
                          </span>
                        );
                      })()}
                      <span className="text-slate-600 dark:text-slate-300 font-normal text-[11px] sm:text-xs">
                        يكتب الآن
                      </span>
                    </>
                  ) : typingUsers.length === 2 ? (
                    <>
                      {(() => {
                        const b1 = getUserBanner(typingUsers[0].username);
                        return b1 ? (
                          <img src={b1} alt={typingUsers[0].username} className="h-3.5 max-h-[16px] max-w-[80px] object-contain rounded inline-block" />
                        ) : (
                          <span className="font-bold text-amber-900 dark:text-amber-300 truncate max-w-[90px]" style={{ color: typingUsers[0].nameColor || undefined }}>
                            {typingUsers[0].username}
                          </span>
                        );
                      })()}
                      <span className="text-slate-500 dark:text-slate-400 text-[11px]">و</span>
                      {(() => {
                        const b2 = getUserBanner(typingUsers[1].username);
                        return b2 ? (
                          <img src={b2} alt={typingUsers[1].username} className="h-3.5 max-h-[16px] max-w-[80px] object-contain rounded inline-block" />
                        ) : (
                          <span className="font-bold text-amber-900 dark:text-amber-300 truncate max-w-[90px]" style={{ color: typingUsers[1].nameColor || undefined }}>
                            {typingUsers[1].username}
                          </span>
                        );
                      })()}
                      <span className="text-slate-600 dark:text-slate-300 font-normal text-[11px] sm:text-xs">
                        يكتبان الآن
                      </span>
                    </>
                  ) : (
                    <>
                      {(() => {
                        const b1 = getUserBanner(typingUsers[0].username);
                        return b1 ? (
                          <img src={b1} alt={typingUsers[0].username} className="h-3.5 max-h-[16px] max-w-[80px] object-contain rounded inline-block" />
                        ) : (
                          <span className="font-bold text-amber-900 dark:text-amber-300 truncate max-w-[80px]" style={{ color: typingUsers[0].nameColor || undefined }}>
                            {typingUsers[0].username}
                          </span>
                        );
                      })()}
                      <span className="text-slate-500 dark:text-slate-400 text-[11px]">و</span>
                      <span className="text-slate-600 dark:text-slate-300 font-normal text-[11px] sm:text-xs">
                        {typingUsers.length - 1} آخرون يكتبون الآن
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* 3 bouncing wave dots */}
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 dark:bg-amber-400/10 border border-amber-400/40 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-400 typing-dot-1" />
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-400 typing-dot-2" />
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-400 typing-dot-3" />
              </div>
            </div>
          )}

          {isRecordingVoice ? (
            <div className="flex items-center justify-center py-0.5">
              <VoiceRecorder
                onSendVoice={(voiceData) => handleSendMessage(undefined, undefined, undefined, voiceData)}
                onCancel={() => setIsRecordingVoice(false)}
              />
            </div>
          ) : (
            <div className="flex items-center gap-1 sm:gap-1.5 w-full max-w-full">
              {/* Exit Room Button (زر خروج من الغرفة الحالية فقط بجانب الإيموجي) */}
              <button
                type="button"
                onClick={handleLeaveCurrentRoom}
                className="w-8 h-8 rounded-lg text-rose-500 hover:text-white hover:bg-rose-600 border border-rose-300 flex items-center justify-center transition-all cursor-pointer flex-shrink-0 shadow-2xs"
                title="الخروج من الغرفة الحالية فقط والعودة لقائمة الغرف"
              >
                <LogOut className="w-4 h-4" />
              </button>

              {/* Emoji yellow smiley 😊 */}
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="w-8 h-8 rounded-lg text-lg flex items-center justify-center hover:bg-slate-200 transition-all cursor-pointer flex-shrink-0"
                title="الرموز التعبيرية"
              >
                😊
              </button>

              {/* Media Image Button (Screenshot 7) */}
              <button
                type="button"
                onClick={() => setShowMediaPicker(!showMediaPicker)}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-slate-600 hover:text-indigo-600 flex items-center justify-center transition-all cursor-pointer flex-shrink-0 hover:bg-slate-200"
                title="إرسال صورة"
              >
                <ImageIcon className="w-4 h-4 text-rose-500" />
              </button>

              {/* Voice Recording Button (تسجيل مقطع صوتي) */}
              <button
                type="button"
                onClick={() => setIsRecordingVoice(true)}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-slate-600 hover:text-rose-600 flex items-center justify-center transition-all cursor-pointer flex-shrink-0 hover:bg-slate-200"
                title="تسجيل مقطع صوتي 🎙️"
              >
                <Mic className="w-4 h-4 text-rose-600" />
              </button>

              {/* Textarea Input - مخصص حصرياً للدردشة ولا يقبل كلمات المرور أو الملء التلقائي مطلقاً */}
              <textarea
                ref={inputRef}
                rows={1}
                name="chat_room_text_freeform"
                id="chat_room_text_freeform"
                inputMode="text"
                enterKeyHint="send"
                autoComplete="off"
                autoCorrect="on"
                autoCapitalize="sentences"
                spellCheck={true}
                data-form-type="other"
                data-lpignore="true"
                data-1p-ignore="true"
                data-bwignore="true"
                data-protonpass-ignore="true"
                data-keeper-ignore="true"
                aria-autocomplete="none"
                role="textbox"
                value={textInput}
                onChange={(e) => handleTextInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                onFocus={() => {
                  setIsChatInputFocused(true);
                  window.scrollTo(0, 0);
                  document.body.scrollTop = 0;
                  scrollToBottom(true);
                  setTimeout(() => {
                    window.scrollTo(0, 0);
                    scrollToBottom(true);
                  }, 50);
                  setTimeout(() => {
                    window.scrollTo(0, 0);
                    scrollToBottom(true);
                  }, 200);
                }}
                onBlur={() => {
                  setTimeout(() => setIsChatInputFocused(false), 200);
                }}
                style={{ color: settingTextColor || curTheme.recommendedTextColor || '#fef3c7' }}
                placeholder="اكتب رسالتك، واستخدم @ للمنشن"
                maxLength={400}
                className={`flex-1 min-w-0 px-2.5 py-1.5 ${curTheme.fieldBg || 'bg-white'} border ${curTheme.fieldBorder || 'border-slate-300'} rounded-lg ${curTheme.fieldText || 'text-slate-900'} ${curTheme.fieldPlaceholder || 'placeholder-slate-400'} text-xs sm:text-sm font-medium outline-none ${curTheme.fieldFocus || 'focus:border-amber-600 focus:ring-1 focus:ring-amber-600'} resize-none h-8 leading-tight overflow-hidden transition-all shadow-inner`}
              />

              {/* [+] Button */}
              <button
                type="button"
                onClick={() => setShowPlusMenu(!showPlusMenu)}
                className={`w-7 h-7 rounded-lg ${curTheme.cardBg || 'bg-[#2a241e]'} ${curTheme.accentText || 'text-amber-200'} border ${curTheme.cardBorder || 'border-amber-800/60'} font-bold text-base flex items-center justify-center hover:opacity-90 transition-all cursor-pointer flex-shrink-0 shadow-xs`}
                title="خيارات إضافية"
              >
                +
              </button>

              {/* [إرسال ✈] button - Prominently visible and fixed on screen */}
              <button
                type="button"
                onClick={handleSendMessage}
                disabled={!textInput.trim()}
                className={`px-2.5 py-1.5 rounded-lg ${curTheme.primaryBtn || 'bg-amber-500 hover:bg-amber-600 text-black'} disabled:opacity-40 font-black text-xs flex items-center gap-1 transition-all cursor-pointer flex-shrink-0 shadow-sm whitespace-nowrap z-10`}
                title="إرسال الرسالة للغرفة"
              >
                <span>إرسال</span>
                <Send className="w-3.5 h-3.5 rotate-180" />
              </button>
            </div>
          )}
        </div>

        {/* BOTTOM TAB BAR: FIXED (Screenshot 2: [⚙ الضبط] [🧱 الحائط] [👥 الغرف] [💬 خاص] [👤 77]) */}
        <nav
          className={`flex-shrink-0 z-20 ${curTheme.bottomBarBg} ${curTheme.bottomBarText} border-t ${curTheme.bottomBarBorder} text-center text-[10px] leading-tight font-bold py-0.5 grid grid-cols-5 shadow-2xl`}
        >
          <button
            onClick={() => setActiveDrawer(activeDrawer === 'settings' ? 'none' : 'settings')}
            className={`flex flex-col items-center justify-center gap-0.5 hover:text-white transition-colors cursor-pointer ${
              activeDrawer === 'settings' ? 'text-amber-400 font-black' : ''
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>الضبط</span>
          </button>

          <button
            onClick={() => {
              socket?.emit('getWallPosts');
              const next = activeDrawer === 'wall' ? 'none' : 'wall';
              setActiveDrawer(next);
              if (next === 'wall') {
                lastSeenWallTimeRef.current = Date.now();
                setUnreadWallCount(0);
              }
            }}
            className={`flex flex-col items-center justify-center gap-0.5 relative hover:text-white transition-all cursor-pointer ${
              activeDrawer === 'wall' ? 'text-amber-400 font-black' : ''
            }`}
          >
            <div className="relative">
              {unreadWallCount > 0 && (
                <span className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-emerald-400 via-amber-500 to-emerald-400 opacity-80 blur-xs animate-pulse" />
              )}
              <MessageCircle
                className={`w-4 h-4 relative z-10 transition-transform ${
                  unreadWallCount > 0
                    ? 'text-emerald-300 drop-shadow-[0_0_8px_rgba(16,185,129,0.95)] animate-pulse scale-110'
                    : ''
                }`}
              />
              {unreadWallCount > 0 && (
                <span
                  title={`منشورات ورسائل حائط جديدة: ${unreadWallCount}`}
                  className="absolute -top-2.5 -right-3.5 z-20 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center border-2 border-emerald-300 shadow-[0_0_12px_rgba(5,150,105,0.9)] animate-bounce"
                >
                  {unreadWallCount > 99 ? '99+' : unreadWallCount}
                </span>
              )}
            </div>
            <span className={`relative z-10 flex items-center gap-0.5 ${unreadWallCount > 0 ? 'text-emerald-300 font-black' : ''}`}>
              {unreadWallCount > 0 && <Sparkles className="w-2.5 h-2.5 text-emerald-300 animate-spin" />}
              <span>الحائط</span>
            </span>
          </button>

          <button
            onClick={() => setActiveDrawer(activeDrawer === 'rooms' ? 'none' : 'rooms')}
            className={`flex flex-col items-center justify-center gap-0.5 hover:text-white transition-colors cursor-pointer ${
              activeDrawer === 'rooms' ? 'text-amber-400 font-black' : ''
            }`}
          >
            <Hash className="w-4 h-4" />
            <span>الغرف</span>
          </button>

          <button
            onClick={() => {
              if (activeDrawer === 'pm') {
                setActiveDrawer('none');
              } else {
                setSelectedPmUser(null);
                setActiveDrawer('pm');
              }
            }}
            className={`flex flex-col items-center justify-center gap-0.5 relative hover:text-white transition-all cursor-pointer ${
              activeDrawer === 'pm' ? 'text-amber-400 font-black' : ''
            }`}
          >
            {(() => {
              // عداد رسائل الخاص غير المقروءة: يظهر فيه إجمالي عدد الرسائل غير المقروءة
              const totalUnreadPmCount = Object.values(unreadPerUser).reduce((acc, count) => acc + (count || 0), 0);
              const unreadSendersCount = Object.keys(unreadPerUser).filter((userKey) => (unreadPerUser[userKey] || 0) > 0).length;
              const hasUnread = totalUnreadPmCount > 0;
              return (
                <>
                  <div className="relative">
                    {/* Magical glowing pulse background */}
                    {hasUnread && (
                      <span className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-rose-500 via-amber-400 to-rose-500 opacity-90 blur-xs animate-pulse" />
                    )}
                    <MessageCircle
                      className={`w-4 h-4 relative z-10 transition-transform ${
                        hasUnread
                          ? 'text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.95)] animate-pulse scale-110'
                          : ''
                      }`}
                    />
                    {hasUnread && (
                      <span
                        title={`رسائل خاصة غير مقروءة: ${totalUnreadPmCount} (من ${unreadSendersCount} شخص)`}
                        className="absolute -top-2.5 -right-3.5 z-20 min-w-[19px] h-[19px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center border-2 border-amber-300 shadow-[0_0_12px_rgba(225,29,72,0.95)] animate-bounce"
                      >
                        {totalUnreadPmCount > 99 ? '99+' : totalUnreadPmCount}
                      </span>
                    )}
                  </div>
                  <span className={`relative z-10 flex items-center justify-center gap-1 ${hasUnread ? 'text-rose-300 font-black' : ''}`}>
                    {hasUnread && <Sparkles className="w-2.5 h-2.5 text-amber-300 animate-spin" />}
                    <span>خاص</span>
                    {hasUnread && (
                      <span className="bg-rose-600 text-white text-[9px] font-extrabold px-1 rounded-full border border-amber-300 shadow-xs leading-tight">
                        {totalUnreadPmCount > 99 ? '+99' : totalUnreadPmCount}
                      </span>
                    )}
                  </span>
                </>
              );
            })()}
          </button>

          {(() => {
            // Count unique online connected members across all rooms
            const uniqueOnlineNames = new Set<string>();
            if (Array.isArray(allConnectedUsers)) {
              allConnectedUsers.forEach((u) => {
                if (u?.username && u.presenceState !== 'offline') uniqueOnlineNames.add(u.username.toLowerCase());
              });
            }
            if (Array.isArray(rosterUsers)) {
              rosterUsers.forEach((u) => {
                if (u?.username && u.presenceState !== 'offline') uniqueOnlineNames.add(u.username.toLowerCase());
              });
            }
            if (currentUser?.username) {
              uniqueOnlineNames.add(currentUser.username.toLowerCase());
            }
            const realOnlineCount = uniqueOnlineNames.size > 0 ? uniqueOnlineNames.size : (onlineCount || 1);
            return (
              <button
                onClick={() => setActiveDrawer(activeDrawer === 'users' ? 'none' : 'users')}
                className={`flex flex-col items-center justify-center gap-0.5 hover:text-white transition-colors cursor-pointer ${
                  activeDrawer === 'users' ? 'text-amber-400 font-black' : ''
                }`}
                title={`المتصلون حالياً: ${realOnlineCount} عضو`}
              >
                <Users className="w-4 h-4" />
                <span>{realOnlineCount}</span>
              </button>
            );
          })()}
        </nav>

        {/* =========================================================================
            SIDE MODALS & PANELS (DO NOT COVER FULL SCREEN! TAKES ~84% WIDTH)
            As shown in Screenshots 1, 2, 3, 4, 5, 6, 8, 10, 11, 12, 13
           ========================================================================= */}

        {/* Semi-transparent backdrop overlay: reveals the chat underneath and closes on click */}
        {activeDrawer !== 'none' && !(activeDrawer === 'pm' && selectedPmUser && pmWindowMode === 'split') && (
          <div
            onClick={() => setActiveDrawer('none')}
            className="absolute inset-0 bg-black/45 z-30 transition-opacity backdrop-blur-[0.5px] cursor-pointer"
            title="انقر هنا لإغلاق النافذة والعودة للشات"
          />
        )}

        {/* 1. ROOMS DRAWER (Screenshot 3: غرف الدردشه : 39) */}
        {activeDrawer === 'rooms' && (
          <div className={`absolute inset-y-0 right-0 w-[84%] ${curTheme.drawerBg} text-slate-100 z-40 shadow-2xl border-l ${curTheme.cardBorder} flex flex-col animate-in slide-in-from-right duration-200`}>
            {/* Header */}
            <div className={`${curTheme.drawerHeaderBg || curTheme.headerBg} ${curTheme.accentText} p-2.5 flex items-center justify-between border-b ${curTheme.headerBorder}`}>
              <div className="flex items-center gap-2 font-bold text-sm">
                <span>غرف الدردشه : {roomsList.length}</span>
                {(currentUser.role === 'hassan' || currentUser.role === 'admin' || currentUser.role === 'super' || getRoleLevel(currentUser.role) >= 75) && (
                  <button
                    onClick={() => setShowCreateRoomModal(true)}
                    className="px-2 py-0.5 bg-[#48a942] hover:bg-emerald-600 text-white rounded text-[11px] font-bold cursor-pointer"
                  >
                    ➕ غرفه جديدة
                  </button>
                )}
              </div>
              <button
                onClick={() => setActiveDrawer('none')}
                className="w-7 h-7 bg-red-600 hover:bg-red-700 text-white flex items-center justify-center rounded font-bold cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Create Room Sub-modal */}
            {showCreateRoomModal && (
              <div className={`p-3 ${curTheme.cardBg} border-b ${curTheme.cardBorder} text-xs space-y-2`}>
                <div className={`font-bold ${curTheme.accentText}`}>إنشاء غرفة جديدة:</div>
                <input
                  type="text"
                  placeholder="اسم الغرفة..."
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className={`w-full p-1.5 border ${curTheme.cardBorder} rounded ${curTheme.drawerBg} text-white outline-none`}
                />
                <input
                  type="text"
                  placeholder="الوصف..."
                  value={newRoomDesc}
                  onChange={(e) => setNewRoomDesc(e.target.value)}
                  className={`w-full p-1.5 border ${curTheme.cardBorder} rounded ${curTheme.drawerBg} text-white outline-none`}
                />
                <input
                  type="password"
                  autoComplete="off"
                  data-form-type="other"
                  data-lpignore="true"
                  placeholder="كلمة المرور (اختياري)..."
                  value={newRoomPass}
                  onChange={(e) => setNewRoomPass(e.target.value)}
                  className={`w-full p-1.5 border ${curTheme.cardBorder} rounded ${curTheme.drawerBg} text-white outline-none`}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (newRoomName) {
                        socket?.emit('createRoom', { name: newRoomName, desc: newRoomDesc, password: newRoomPass });
                        setNewRoomName('');
                        setNewRoomDesc('');
                        setNewRoomPass('');
                        setShowCreateRoomModal(false);
                      }
                    }}
                    className="flex-1 py-1 bg-[#48a942] hover:bg-emerald-600 text-white rounded font-bold cursor-pointer"
                  >
                    حفظ الغرفة
                  </button>
                  <button
                    onClick={() => setShowCreateRoomModal(false)}
                    className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded font-bold cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            )}

            {/* Rooms List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
              {roomsList.map((r) => {
                const getRoomActiveVoiceCount = () => {
                  if (currentUser && (currentUser.room === r.id || currentUser.room === r.name)) {
                    return micSlots.filter((s) => Boolean(s.user)).length;
                  }
                  const stat = roomStatsData.find((s) => s.id === r.id || s.name === r.name);
                  if (stat && typeof stat.voiceCount === 'number') {
                    return stat.voiceCount;
                  }
                  const liveCount = allConnectedUsers.filter((u) =>
                    (u.room === r.id || u.room === r.name) && (u.isVoice || (u.micSlot !== null && u.micSlot !== undefined))
                  ).length;
                  if (liveCount > 0) return liveCount;
                  return r.activeVoiceCount || 0;
                };

                const activeVoices = getRoomActiveVoiceCount();
                const totalInRoom = roomStatsData.find((s) => s.id === r.id || s.name === r.name)?.count ?? allConnectedUsers.filter((u) => u.room === r.id || u.room === r.name).length;

                return (
                  <div
                    key={r.id}
                    onClick={() => {
                      if (r.isPasswordProtected && currentUser.role !== 'hassan' && currentUser.role !== 'admin' && currentUser.room !== r.id) {
                        setPasswordPromptRoom(r);
                        setRoomPasswordInput('');
                        setShowRoomPasswordText(false);
                        setRoomPasswordError(null);
                        return;
                      }
                      setMessages([]);
                      socket?.emit('joinRoom', {
                        username: currentUser.username,
                        room: r.id,
                        flag: currentUser.flag,
                        statusQuote: currentUser.statusQuote,
                        isGhost: currentUser.isGhost
                      });
                      setActiveDrawer('none');
                    }}
                    className={`p-3 hover:bg-white/5 transition-colors cursor-pointer flex items-center justify-between ${
                      currentUser.room === r.id ? 'bg-amber-500/15 border-r-4 border-amber-500' : ''
                    }`}
                  >
                    <div className="min-w-0 text-right">
                      <div className={`font-bold text-sm ${curTheme.accentText} flex items-center gap-1.5`}>
                        <span>{r.name}</span>
                        {r.isPasswordProtected && <Lock className="w-3.5 h-3.5 text-amber-400" />}
                      </div>
                      <div className="text-xs text-slate-400 truncate max-w-[190px]">{r.desc}</div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {totalInRoom > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-medium flex items-center gap-0.5" title="عدد المتواجدين في هذه الغرفة">
                          👥 {totalInRoom}
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded text-white text-[10px] font-bold flex items-center gap-1 shadow-sm transition-colors ${
                          activeVoices > 0 ? 'bg-emerald-600' : 'bg-rose-600'
                        }`}
                        title={`المتحدثون على المايك: ${activeVoices} من أصل ${r.voiceLimit || 5}`}
                      >
                        <Mic className="w-2.5 h-2.5" />
                        {activeVoices}/{r.voiceLimit || 5}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. USERS DRAWER (Screenshot 1: المتواجدون) */}
        {activeDrawer === 'users' && (
          <div className={`absolute inset-y-0 right-0 w-[84%] ${curTheme.drawerBg} text-slate-100 z-40 shadow-2xl border-l ${curTheme.cardBorder} flex flex-col animate-in slide-in-from-right duration-200`}>
            <div className={`${curTheme.drawerHeaderBg || curTheme.headerBg} ${curTheme.accentText} p-2.5 flex items-center justify-between border-b ${curTheme.headerBorder}`}>
              <span className="font-bold text-sm">المتواجدين</span>
              <button
                onClick={() => setActiveDrawer('none')}
                className="w-7 h-7 bg-red-600 hover:bg-red-700 text-white flex items-center justify-center rounded font-bold cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Box (Screenshot 1: البحث ..) */}
            <div className={`p-2 ${curTheme.subHeaderBg} border-b ${curTheme.subHeaderBorder}`}>
              <div className="relative">
                <input
                  type="text"
                  placeholder="البحث .."
                  value={searchUserQuery}
                  onChange={(e) => setSearchUserQuery(e.target.value)}
                  className={`w-full px-3 py-1.5 ${curTheme.cardBg} text-white border ${curTheme.cardBorder} rounded text-xs outline-none`}
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Section 1: المتواجدين في نفس الغرفة الحالية أو بهو الشات العام */}
            {(() => {
              const sortByRole = <T extends { role?: string; username: string }>(users: T[]) =>
                [...users].sort((a, b) => {
                  const roleDifference = getRoleLevel(b.role) - getRoleLevel(a.role);
                  return roleDifference || a.username.localeCompare(b.username, 'ar');
                });

              const isCurrentUserOutside = !currentUser.room || currentUser.room === 'خارج الغرف' || currentUser.room.trim() === '';

              const currentRoomUsers = isCurrentUserOutside
                ? []
                : sortByRole(rosterUsers.filter((u) =>
                    canViewerSeeUser(u) &&
                    u.username.toLowerCase().includes(searchUserQuery.toLowerCase())
                  ));

              // Build comprehensive list of online users ensuring current user is always included
              const baseAllConnected: User[] = [...allConnectedUsers];
              if (currentUser && !baseAllConnected.some((u) => u.username.trim().toLowerCase() === currentUser.username.trim().toLowerCase())) {
                baseAllConnected.unshift({
                  ...currentUser,
                  room: currentUser.room || 'خارج الغرف',
                  presenceState: currentUser.presenceState || 'online'
                });
              }

              // Deduplicate otherConnectedUsers / online users
              const seenOtherUsernames = new Set<string>();
              const otherConnectedUsers = sortByRole(baseAllConnected.filter((u) => {
                const lowerName = u.username.trim().toLowerCase();
                if (!canViewerSeeUser(u)) return false;
                // When viewer is inside a room, exclude users already shown in current room (including currentUser)
                if (!isCurrentUserOutside && currentRoomUsers.some((cr) => cr.username.trim().toLowerCase() === lowerName)) {
                  return false;
                }
                if (u.presenceState === 'offline') return false;
                if (seenOtherUsernames.has(lowerName)) return false;
                seenOtherUsernames.add(lowerName);
                return lowerName.includes(searchUserQuery.toLowerCase());
              })).sort((a, b) => {
                // If user is outside rooms, pin their own account to the very top so it's unmistakably visible
                if (isCurrentUserOutside && currentUser) {
                  const isASelf = a.username.trim().toLowerCase() === currentUser.username.trim().toLowerCase();
                  const isBSelf = b.username.trim().toLowerCase() === currentUser.username.trim().toLowerCase();
                  if (isASelf && !isBSelf) return -1;
                  if (!isASelf && isBSelf) return 1;
                }
                const presenceRank = (presence?: User['presenceState']) =>
                  presence === 'online' ? 2 : presence === 'away' ? 1 : 0;
                return presenceRank(b.presenceState) - presenceRank(a.presenceState)
                  || (getRoleLevel(b.role) - getRoleLevel(a.role))
                  || a.username.localeCompare(b.username, 'ar');
              });

              const offlineMembers = sortByRole(allRegisteredMembers.filter(
                (m) =>
                  !m.isOnline &&
                  canViewerSeeUser(m) &&
                  m.username.trim().toLowerCase() !== currentUser.username.trim().toLowerCase() &&
                  !currentRoomUsers.some((u) => u.username.trim().toLowerCase() === m.username.trim().toLowerCase()) &&
                  !otherConnectedUsers.some((u) => u.username.trim().toLowerCase() === m.username.trim().toLowerCase()) &&
                  m.username.toLowerCase().includes(searchUserQuery.toLowerCase())
              ));

              return (
                <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
                  {/* Header: متواجدون بالغرفة الحالية أو ببهو الشات */}
                  <div className={`${curTheme.subHeaderBg} ${curTheme.accentText} text-xs font-bold px-3 py-1.5 flex items-center justify-between border-b ${curTheme.subHeaderBorder}`}>
                    <span>
                      {!isCurrentUserOutside
                        ? `المتواجدون معك في الغرفة (${currentUser.room}) (${currentRoomUsers.length})`
                        : `المتواجدون الآن في الشات والبهو (${otherConnectedUsers.length})`}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-normal">● متصلون الآن</span>
                  </div>

                  {/* List of current room users (if inside a room) */}
                  {!isCurrentUserOutside && currentRoomUsers.map((u, idx) => (
                    <div
                      key={u.id}
                      onClick={() => openUserProfile(u)}
                      className="p-2.5 hover:bg-white/5 transition-colors cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative">
                          <img
                            src={u.avatarUrl || falconIcon}
                            alt={u.username}
                            className="w-12 h-12 rounded-lg object-cover border border-amber-500/50 shadow-sm"
                          />
                          {/* Presence Dot: 🔵 Ghost (blue dot), 🟢 Online, 🟡 Away (in background), ⚪ Offline */}
                          {u.isGhost ? (
                            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-blue-500 border-2 border-slate-900 shadow-xs ring-1 ring-blue-400" title="متواجد ولكن بوضع مخفي 🔵" />
                          ) : u.presenceState === 'away' ? (
                            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 border-2 border-slate-900 shadow-xs animate-pulse" title="في الخلفية (بالانتظار) 🟡" />
                          ) : u.presenceState === 'offline' ? (
                            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-slate-400 border-2 border-slate-900" title="غير متصل ⚪" />
                          ) : (
                            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900 shadow-xs" title="متواجد ونشط 🟢" />
                          )}
                        </div>
                        <div className="min-w-0 text-right">
                          <div className={`font-bold text-xs ${curTheme.accentText} flex items-center gap-1 flex-wrap`}>
                            {/* Companion Gift Badge - right beside avatar on same line as banner/username */}
                            {u.giftBadges && u.giftBadges.length > 0 && (
                              <img
                                src={u.giftBadges[0]}
                                alt="هدية"
                                title="هدية تكريمية مرافقة للاسم"
                                className="w-4 h-4 sm:w-5 sm:h-5 object-contain inline-block drop-shadow-xs shrink-0 select-none align-middle animate-pulse"
                              />
                            )}
                            {(() => {
                              const banner = getUserBanner(u.username, u.nameBannerUrl);
                              if (banner) {
                                return (
                                  <img
                                    src={banner}
                                    alt={u.username}
                                    title={u.username}
                                    className="h-6 max-h-[26px] max-w-[170px] sm:max-w-[210px] object-contain drop-shadow-sm select-none inline-block align-middle rounded"
                                  />
                                );
                              }
                              return <span>{u.username}</span>;
                            })()}
                            {u.giftBadges && u.giftBadges.length > 1 && (
                              <span className="inline-flex items-center gap-0.5 mx-0.5 align-middle">
                                {u.giftBadges.slice(1).map((badgeUrl, bIdx) => (
                                  <img
                                    key={bIdx}
                                    src={badgeUrl}
                                    alt="وسام"
                                    title="وسام شرفي وهدية تكريمية"
                                    className="w-3.5 h-3.5 object-contain inline-block drop-shadow-xs opacity-90"
                                  />
                                ))}
                              </span>
                            )}
                            {u.isGhost && <span className="text-[10px] text-purple-400 font-bold bg-purple-950/70 px-1.5 py-0.2 rounded border border-purple-500/50">👻 مخفي</span>}
                            {isUserIgnored(u.username) && (
                              <span className="px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 text-[9px] font-black">
                                🚫 متجاهل
                              </span>
                            )}
                          </div>
                          {u.statusQuote && u.statusQuote.trim() !== '..' && u.statusQuote.trim() !== '' && (
                            <div className="text-[11px] text-slate-400 truncate max-w-[200px] sm:max-w-[260px] mt-0.5">
                              {u.statusQuote}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {(currentUser.role === 'hassan' || currentUser.role === 'admin' || currentUser.role === 'super' || getRoleLevel(currentUser.role) >= 75) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              socket?.emit('revealNicks', { targetUsername: u.username });
                            }}
                            className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-black text-[10px] font-black rounded shadow-xs transition-colors cursor-pointer"
                            title="كشف النكات والآي بي"
                          >
                            كشف
                          </button>
                        )}
                        <span
                          className="text-lg leading-none select-none"
                          title={getCountryNameFromFlag(u.flag) || undefined}
                        >
                          {u.flag}
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* If outside rooms: render all online users right here under Header 1 */}
                  {isCurrentUserOutside && otherConnectedUsers.map((u, idx) => {
                    const isOtherOutside = !u.room || u.room === 'خارج الغرف' || u.room.trim() === '';
                    const isSelf = u.username.trim().toLowerCase() === currentUser.username.trim().toLowerCase();
                    return (
                      <div
                        key={u.id || u.username}
                        onClick={() => openUserProfile(u)}
                        className={`p-2.5 transition-colors cursor-pointer flex items-center justify-between ${
                          isSelf
                            ? 'bg-amber-500/10 hover:bg-amber-500/15 border-r-2 border-amber-500'
                            : 'hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative">
                            <img
                              src={u.avatarUrl || falconIcon}
                              alt={u.username}
                              className={`w-11 h-11 rounded-lg object-cover ${
                                isSelf ? 'border-2 border-amber-500 shadow-md' : 'border border-slate-700'
                              }`}
                            />
                            {/* Presence Dot: 🔵 Ghost (blue dot), 🟢 Online, 🟡 Away (in background), ⚪ Offline */}
                            {u.isGhost ? (
                              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-blue-500 border-2 border-slate-900 shadow-xs ring-1 ring-blue-400" title="متواجد ولكن بوضع مخفي 🔵" />
                            ) : u.presenceState === 'away' ? (
                              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 border-2 border-slate-900 shadow-xs animate-pulse" title="في الخلفية (بالانتظار) 🟡" />
                            ) : u.presenceState === 'offline' ? (
                              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-slate-400 border-2 border-slate-900" title="غير متصل ⚪" />
                            ) : (
                              <span
                                className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900 shadow-xs"
                                title={isOtherOutside ? "متواجد في بهو الشات (خارج الغرف) 🟢" : `متصل بغرفة (${u.room}) 🟢`}
                              />
                            )}
                          </div>
                          <div className="min-w-0 text-right">
                            <div className={`font-bold text-xs ${curTheme.accentText} flex items-center gap-1 flex-wrap`}>
                              {/* Companion Gift Badge - right beside avatar on same line as banner/username */}
                              {u.giftBadges && u.giftBadges.length > 0 && (
                                <img
                                  src={u.giftBadges[0]}
                                  alt="هدية"
                                  title="هدية تكريمية مرافقة للاسم"
                                  className="w-4 h-4 sm:w-5 sm:h-5 object-contain inline-block drop-shadow-xs shrink-0 select-none align-middle animate-pulse"
                                />
                              )}
                              {(() => {
                                const banner = getUserBanner(u.username, u.nameBannerUrl);
                                if (banner) {
                                  return (
                                    <img
                                      src={banner}
                                      alt={u.username}
                                      title={u.username}
                                      className="h-5 max-h-[24px] max-w-[150px] object-contain drop-shadow-sm select-none inline-block align-middle rounded"
                                    />
                                  );
                                }
                                return <span>{u.username}</span>;
                              })()}
                              {u.giftBadges && u.giftBadges.length > 1 && (
                                <span className="inline-flex items-center gap-0.5 mx-0.5 align-middle">
                                  {u.giftBadges.slice(1).map((badgeUrl, bIdx) => (
                                    <img
                                      key={bIdx}
                                      src={badgeUrl}
                                      alt="وسام"
                                      title="وسام شرفي"
                                      className="w-3.5 h-3.5 object-contain inline-block drop-shadow-xs opacity-90"
                                    />
                                  ))}
                                </span>
                              )}
                              {u.isGhost && <span className="text-[10px] text-purple-400 font-bold bg-purple-950/70 px-1.5 py-0.2 rounded border border-purple-500/50">👻 مخفي</span>}
                              {isSelf && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/25 text-amber-300 font-bold border border-amber-500/50">
                                  أنت
                                </span>
                              )}
                              {isOtherOutside ? (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950/70 text-emerald-300 font-semibold border border-emerald-500/40">
                                  البهو
                                </span>
                              ) : (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-950/70 text-indigo-300 font-semibold border border-indigo-500/40">
                                  {u.room}
                                </span>
                              )}
                            </div>
                            {u.statusQuote && u.statusQuote.trim() !== '..' && u.statusQuote.trim() !== '' && (
                              <div className="text-[10px] text-slate-400 truncate max-w-[200px] sm:max-w-[260px] mt-0.5">
                                {u.statusQuote}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {!isSelf && (currentUser.role === 'hassan' || currentUser.role === 'admin' || currentUser.role === 'super' || getRoleLevel(currentUser.role) >= 75) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                socket?.emit('revealNicks', { targetUsername: u.username });
                              }}
                              className="px-2 py-0.5 bg-amber-500 hover:bg-amber-600 text-black text-[10px] font-black rounded cursor-pointer"
                            >
                              كشف
                            </button>
                          )}
                          <span
                            className="text-base leading-none select-none"
                            title={getCountryNameFromFlag(u.flag) || undefined}
                          >
                            {u.flag}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* DIVIDER LINE (خط فاصل يظهر المتواجدين خارج الغرفة أو الأعضاء غير المتصلين) */}
                  <div className={`flex items-center gap-2 px-3 py-2 ${curTheme.subHeaderBg} ${curTheme.accentText} text-xs font-bold border-y ${curTheme.subHeaderBorder}`}>
                    <span className="flex-1 h-px bg-slate-700" />
                    <span>
                      {!isCurrentUserOutside
                        ? `المتواجدون في غرف أخرى أو بهو الشات (${otherConnectedUsers.length})`
                        : `الأعضاء غير المتصلين (${offlineMembers.length})`}
                    </span>
                    <span className="flex-1 h-px bg-slate-700" />
                  </div>

                  {/* If INSIDE a room: Users in other rooms or in the lobby (Connected: Green Dot) */}
                  {!isCurrentUserOutside && otherConnectedUsers.map((u) => {
                    const isOtherOutside = !u.room || u.room === 'خارج الغرف' || u.room.trim() === '';
                    return (
                      <div
                        key={u.id}
                        onClick={() => openUserProfile(u)}
                        className="p-2.5 hover:bg-white/5 transition-colors cursor-pointer flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative">
                            <img
                              src={u.avatarUrl || falconIcon}
                              alt={u.username}
                              className="w-11 h-11 rounded-lg object-cover border border-slate-700"
                            />
                            {/* Presence Dot: 🔵 Ghost (blue dot), 🟢 Online, 🟡 Away (in background), ⚪ Offline */}
                            {u.isGhost ? (
                              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-blue-500 border-2 border-slate-900 shadow-xs ring-1 ring-blue-400" title="متواجد ولكن بوضع مخفي 🔵" />
                            ) : u.presenceState === 'away' ? (
                              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 border-2 border-slate-900 shadow-xs animate-pulse" title="في الخلفية (بالانتظار) 🟡" />
                            ) : u.presenceState === 'offline' ? (
                              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-slate-400 border-2 border-slate-900" title="غير متصل ⚪" />
                            ) : (
                              <span
                                className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900 shadow-xs"
                                title={isOtherOutside ? "متواجد في بهو الشات (خارج الغرف) 🟢" : `متصل بغرفة (${u.room}) 🟢`}
                              />
                            )}
                          </div>
                          <div className="min-w-0 text-right">
                            <div className={`font-bold text-xs ${curTheme.accentText} flex items-center gap-1 flex-wrap`}>
                              {/* Companion Gift Badge - right beside avatar on same line as banner/username */}
                              {u.giftBadges && u.giftBadges.length > 0 && (
                                <img
                                  src={u.giftBadges[0]}
                                  alt="هدية"
                                  title="هدية تكريمية مرافقة للاسم"
                                  className="w-4 h-4 sm:w-5 sm:h-5 object-contain inline-block drop-shadow-xs shrink-0 select-none align-middle animate-pulse"
                                />
                              )}
                              {(() => {
                                const banner = getUserBanner(u.username, u.nameBannerUrl);
                                if (banner) {
                                  return (
                                    <img
                                      src={banner}
                                      alt={u.username}
                                      title={u.username}
                                      className="h-5 max-h-[24px] max-w-[150px] object-contain drop-shadow-sm select-none inline-block align-middle rounded"
                                    />
                                  );
                                }
                                return <span>{u.username}</span>;
                              })()}
                              {u.giftBadges && u.giftBadges.length > 1 && (
                                <span className="inline-flex items-center gap-0.5 mx-0.5 align-middle">
                                  {u.giftBadges.slice(1).map((badgeUrl, bIdx) => (
                                    <img
                                      key={bIdx}
                                      src={badgeUrl}
                                      alt="وسام"
                                      title="وسام شرفي"
                                      className="w-3.5 h-3.5 object-contain inline-block drop-shadow-xs opacity-90"
                                    />
                                  ))}
                                </span>
                              )}
                              {isOtherOutside ? (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950/70 text-emerald-300 font-semibold border border-emerald-500/40">
                                  البهو
                                </span>
                              ) : (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-950/70 text-indigo-300 font-semibold border border-indigo-500/40">
                                  {u.room}
                                </span>
                              )}
                            </div>
                            {u.statusQuote && u.statusQuote.trim() !== '..' && u.statusQuote.trim() !== '' && (
                              <div className="text-[10px] text-slate-400 truncate max-w-[200px] sm:max-w-[260px] mt-0.5">
                                {u.statusQuote}
                              </div>
                            )}
                          </div>
                        </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {(currentUser.role === 'hassan' || currentUser.role === 'admin' || currentUser.role === 'super' || getRoleLevel(currentUser.role) >= 75) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              socket?.emit('revealNicks', { targetUsername: u.username });
                            }}
                            className="px-2 py-0.5 bg-amber-500 hover:bg-amber-600 text-black text-[10px] font-black rounded"
                          >
                            كشف
                          </button>
                        )}
                        <span
                          className="text-base leading-none select-none"
                          title={getCountryNameFromFlag(u.flag) || undefined}
                        >
                          {u.flag}
                        </span>
                      </div>
                    </div>
                  );
                })}

                  {/* Additional divider for offline members when user is inside a room */}
                  {!isCurrentUserOutside && offlineMembers.length > 0 && (
                    <div className={`flex items-center gap-2 px-3 py-2 ${curTheme.subHeaderBg} ${curTheme.accentText} text-xs font-bold border-y ${curTheme.subHeaderBorder}`}>
                      <span className="flex-1 h-px bg-slate-700" />
                      <span>الأعضاء غير المتصلين ({offlineMembers.length})</span>
                      <span className="flex-1 h-px bg-slate-700" />
                    </div>
                  )}

                  {/* Disconnected Members (Outside rooms: Gray Dot) */}
                  {offlineMembers.map((m) => (
                    <div
                      key={m.username}
                      onClick={() => {
                        const simulatedUser: User = {
                          id: `offline-${m.username}`,
                          username: m.username,
                          avatarSeed: m.username,
                          role: m.role as any,
                          flag: m.flag,
                          statusQuote: m.statusQuote,
                          avatarUrl: m.avatarUrl,
                          nameBannerUrl: m.nameBannerUrl,
                          giftBadges: m.giftBadges,
                          likes: m.likes || 100,
                          points: 500,
                          isVoice: false,
                          isSpeaking: false,
                          micSlot: null,
                          isMuted: false,
                          isTextMuted: false,
                          room: 'خارج الغرف'
                        };
                        openUserProfile(simulatedUser);
                      }}
                      className="p-2.5 hover:bg-white/5 transition-colors cursor-pointer flex items-center justify-between opacity-80"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative">
                          <img
                            src={m.avatarUrl || falconIcon}
                            alt={m.username}
                            className="w-10 h-10 rounded-lg object-cover border border-slate-700 grayscale"
                          />
                          {/* Gray dot for disconnected/offline member outside rooms */}
                          <span
                            className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-slate-400 border-2 border-slate-900"
                            title="عضوية غير متصلة (خارج الغرف)"
                          />
                        </div>
                        <div className="min-w-0 text-right">
                          <div className="font-bold text-xs text-slate-300 flex items-center gap-1 flex-wrap">
                            {/* Companion Gift Badge - right beside avatar on same line as banner/username */}
                            {m.giftBadges && m.giftBadges.length > 0 && (
                              <img
                                src={m.giftBadges[0]}
                                alt="هدية"
                                title="هدية تكريمية مرافقة للاسم"
                                className="w-4 h-4 sm:w-5 sm:h-5 object-contain inline-block drop-shadow-xs shrink-0 select-none align-middle animate-pulse"
                              />
                            )}
                            {(() => {
                              const banner = getUserBanner(m.username, m.nameBannerUrl);
                              if (banner) {
                                return (
                                  <img
                                    src={banner}
                                    alt={m.username}
                                    title={m.username}
                                    className="h-5 max-h-[24px] max-w-[140px] object-contain drop-shadow-sm select-none inline-block align-middle rounded opacity-85"
                                  />
                                );
                              }
                              return <span>{m.username}</span>;
                            })()}
                            {m.giftBadges && m.giftBadges.length > 1 && (
                              <span className="inline-flex items-center gap-0.5 mx-0.5 align-middle">
                                {m.giftBadges.slice(1).map((badgeUrl, bIdx) => (
                                  <img
                                    key={bIdx}
                                    src={badgeUrl}
                                    alt="وسام"
                                    title="وسام شرفي"
                                    className="w-3.5 h-3.5 object-contain inline-block drop-shadow-xs opacity-90"
                                  />
                                ))}
                              </span>
                            )}
                            <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                              خارج الغرف
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[150px]">
                            {m.statusQuote || 'عضو مسجل • غير متصل'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {(currentUser.role === 'hassan' || currentUser.role === 'admin' || currentUser.role === 'super' || getRoleLevel(currentUser.role) >= 75) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              socket?.emit('revealNicks', { targetUsername: m.username });
                            }}
                            className="px-2 py-0.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-[10px] font-bold rounded cursor-pointer"
                          >
                            كشف
                          </button>
                        )}
                        <div className="flex items-center gap-1 opacity-70">
                          <span className="text-base">{m.flag}</span>
                          {getCountryNameFromFlag(m.flag) && (
                            <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap">
                              {getCountryNameFromFlag(m.flag)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* 3. WALL / الحائط DRAWER (Screenshots 4 & 13) */}
        {activeDrawer === 'wall' && (
          <div className="absolute inset-y-0 right-0 w-[84%] bg-white z-40 shadow-2xl border-l border-slate-300 flex flex-col animate-in slide-in-from-right duration-200">
            <div className="bg-[#241a12] text-amber-200 p-2.5 flex items-center justify-between">
              <span className="font-bold text-sm">الحائط</span>
              <button
                onClick={() => setActiveDrawer('none')}
                className="w-7 h-7 bg-red-600 hover:bg-red-700 text-white flex items-center justify-center rounded font-bold"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Hidden file input for 24-Hour Stories (صور وفيديو) */}
            <input
              type="file"
              ref={storyFileInputRef}
              accept="image/*,video/*"
              onChange={handleStoryFileSelect}
              className="hidden"
            />

            {/* 24-Hour Stories / Khwater Header & Avatars Carousel */}
            <div className="p-2.5 bg-gradient-to-r from-slate-50 via-amber-50/50 to-slate-50 border-b border-amber-200/60 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-800">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                  <span>خواطر وحالات الـ 24 ساعة 📸🎥</span>
                </span>
                <span className="text-[10px] text-amber-800 font-bold bg-amber-100/90 px-2 py-0.2 rounded-full border border-amber-300">
                  حذف تلقائي بعد 24 ساعة
                </span>
              </div>

              {/* Horizontal Stories Carousel */}
              <div className="flex items-center gap-3 overflow-x-auto py-1 touch-pan-x scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent overscroll-contain">
                {/* Current User Story (+) Slot */}
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="relative group">
                    <img
                      src={currentUser.avatarUrl || falconIcon}
                      alt={currentUser.username}
                      onClick={() => {
                        const myStory = storiesList.find((s) => s.username === currentUser.username);
                        if (myStory) {
                          setActiveStoryViewer(myStory);
                        } else {
                          storyFileInputRef.current?.click();
                        }
                      }}
                      className={`w-11 h-11 rounded-full object-cover cursor-pointer hover:opacity-90 transition-all ${
                        storiesList.some((s) => s.username === currentUser.username)
                          ? 'p-0.5 border-2 border-amber-500 shadow-md story-active-ring'
                          : 'border-2 border-slate-300'
                      }`}
                      title={storiesList.some((s) => s.username === currentUser.username) ? 'عرض خاطرتك الحالية / اضغط + لإضافة أخرى' : 'انقر لاختيار صورة أو فيديو من المعرض ونشر حالة'}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        storyFileInputRef.current?.click();
                      }}
                      className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-600 hover:bg-red-700 text-white rounded-full text-xs font-bold flex items-center justify-center shadow cursor-pointer border-2 border-white"
                      title="اختيار صورة أو فيديو من المعرض (+)"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-700 font-bold mt-1">خاطرتي</span>
                </div>

                {/* Other Members Stories */}
                {storiesList
                  .filter((s) => s.username !== currentUser.username)
                  .map((story) => (
                    <div
                      key={story.id}
                      onClick={() => setActiveStoryViewer(story)}
                      className="flex flex-col items-center flex-shrink-0 cursor-pointer group"
                      title={`عرض خاطرة ${story.username}`}
                    >
                      <div className="relative p-0.5 rounded-full story-active-ring bg-gradient-to-tr from-amber-400 via-rose-500 to-yellow-400">
                        <img
                          src={story.avatarUrl || falconIcon}
                          alt={story.username}
                          className="w-11 h-11 rounded-full object-cover border border-white"
                        />
                        {story.mediaType === 'video' && (
                          <span className="absolute bottom-0 right-0 bg-black/80 text-amber-300 text-[8px] rounded-full px-1 border border-amber-400">
                            ▶️
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-700 font-bold mt-1 max-w-[55px] truncate">
                        {story.username}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Tabs: المنشورات | الدردشة السريعة */}
            <div className="grid grid-cols-2 bg-slate-200 text-xs font-bold text-center border-b border-slate-300">
              <button
                type="button"
                onClick={() => setWallTab('posts')}
                className={`py-2 flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  wallTab === 'posts' ? 'bg-[#2a241e] text-amber-200 shadow-inner' : 'text-slate-700 hover:bg-slate-300'
                }`}
              >
                <span>المنشورات</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20">
                  {wallPosts.filter((p) => !p.category || p.category === 'posts').length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setWallTab('quick')}
                className={`py-2 flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  wallTab === 'quick' ? 'bg-[#2a241e] text-amber-200 shadow-inner' : 'text-slate-700 hover:bg-slate-300'
                }`}
              >
                <span>الدردشة السريعة</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20">
                  {wallPosts.filter((p) => p.category === 'quick').length}
                </span>
              </button>
            </div>

            {/* Posts Stream Filtered by Tab */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {(() => {
                const filteredPosts = wallPosts.filter((post) => {
                  if (wallTab === 'posts') {
                    return !post.category || post.category === 'posts';
                  }
                  return post.category === 'quick';
                });

                if (filteredPosts.length === 0) {
                  return (
                    <div className="text-center py-12 text-slate-400 space-y-2 select-none">
                      <div className="text-3xl">📝</div>
                      <div className="text-xs font-bold text-slate-600">
                        {wallTab === 'posts'
                          ? 'لا توجد منشورات حتى الآن في هذا القسم.'
                          : 'لا توجد مشاركات في قسم الدردشة السريعة حالياً.'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        اكتب وشارك أول منشور أو دردشة سريعة مع الجميع!
                      </div>
                    </div>
                  );
                }

                return filteredPosts.map((post) => {
                const isPostVideo = Boolean(
                  (post as any).mediaType === 'video' ||
                  (post.mediaUrl &&
                    (post.mediaUrl.startsWith('data:video') ||
                      post.mediaUrl.endsWith('.mp4') ||
                      post.mediaUrl.endsWith('.webm') ||
                      post.mediaUrl.endsWith('.mov') ||
                      post.mediaUrl.endsWith('.ogg')))
                );

                return (
                  <div key={post.id} className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm text-right">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <img
                          src={post.avatarUrl || falconIcon}
                          alt={post.username}
                          onClick={() => openUserProfileByName(post.username)}
                          className="w-8 h-8 rounded-full object-cover border cursor-pointer hover:opacity-80"
                        />
                        {(() => {
                          const bannerUrl = getUserBanner(post.username, post.nameBannerUrl);
                          if (bannerUrl) {
                            return (
                              <img
                                src={bannerUrl}
                                alt={post.username}
                                title={post.username}
                                onClick={() => openUserProfileByName(post.username)}
                                className="h-6 max-h-[26px] max-w-[170px] sm:max-w-[200px] object-contain drop-shadow-sm rounded inline-block cursor-pointer hover:opacity-90"
                              />
                            );
                          }
                          return (
                            <span
                              onClick={() => openUserProfileByName(post.username)}
                              className="font-bold text-xs text-slate-900 cursor-pointer hover:underline"
                            >
                              {post.username}
                            </span>
                          );
                        })()}
                        {post.flag && <span className="text-xs">{post.flag}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400 font-mono" title={post.timestamp ? new Date(post.timestamp).toLocaleString('ar-EG') : undefined}>
                          {formatWallTime(post.timestamp, post.time, post.id)}
                        </span>
                        {currentUser && (post.username.toLowerCase() === currentUser.username.toLowerCase() || currentUser.role === 'hassan' || currentUser.role === 'admin' || currentUser.role === 'super') && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingWallPostId(editingWallPostId === post.id ? null : post.id);
                                setEditingWallPostText(post.text);
                              }}
                              className="text-slate-300 hover:text-blue-500 p-0.5 transition-colors cursor-pointer"
                              title="تعديل المنشور ✏️"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-blue-500" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteWallPost(post.id)}
                              className="text-slate-300 hover:text-rose-600 p-0.5 transition-colors cursor-pointer"
                              title="حذف المنشور 🗑️"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {editingWallPostId === post.id ? (
                      <div className="my-2 p-2 bg-slate-50 border border-blue-400 rounded-xl space-y-2">
                        <textarea
                          rows={3}
                          value={editingWallPostText}
                          onChange={(e) => setEditingWallPostText(e.target.value)}
                          className="w-full p-2 text-xs bg-white text-slate-800 border border-slate-300 rounded-lg outline-none focus:border-blue-500 resize-none font-medium"
                          autoFocus
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleSaveEditWallPost(post.id, editingWallPostText)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                          >
                            حفظ التعديل
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingWallPostId(null)}
                            className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
                          >
                            إلغاء
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere] break-words" dir="auto">
                        {renderFormattedMessageText(
                          (post.youtubeVideo || extractYouTubeVideoId(post.text))
                            ? (cleanYouTubeUrlFromText(post.text) || post.youtubeVideo?.title || '')
                            : post.text
                        )}
                        {post.isEdited && (
                          <span className="text-[10px] text-blue-600 bg-blue-50 px-1 py-0.5 rounded font-bold mr-1.5 select-none">(معدل ✏️)</span>
                        )}
                      </div>
                    )}

                    {/* YouTube Video Player / Embed or Interactive Card */}
                    {(() => {
                      const ytId = post.youtubeVideo?.id || extractYouTubeVideoId(post.text);
                      if (!ytId) return null;
                      const ytData: YouTubeVideoInfo = post.youtubeVideo || {
                        id: ytId,
                        title: 'فيديو يوتيوب',
                        thumbnail: getYouTubeThumbnailUrl(ytId),
                        url: getYouTubeWatchUrl(ytId)
                      };
                      const isCurrentActive = floatingVideo?.postId === post.id && floatingVideo?.type === 'youtube';
                      const isPlaying = isCurrentActive || playingYouTubePostId === post.id;

                      return (
                        <div className="mt-2.5 rounded-xl overflow-hidden border border-red-500/40 bg-slate-950 shadow-md text-right">
                          {isPlaying ? (
                            <div className="relative w-full aspect-video bg-black flex flex-col">
                              <iframe
                                src={getYouTubeEmbedUrl(ytId, true)}
                                title={ytData.title || 'YouTube video player'}
                                className="w-full flex-1 border-0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                              />
                              <div className="p-2 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-200">
                                <div className="truncate font-bold text-amber-300 max-w-[170px] sm:max-w-[260px] flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                                  <span className="truncate">{ytData.title}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-[10px] text-emerald-400 font-bold hidden sm:inline">
                                    مستمر بالعمل خارج الحائط ⚡
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleStopFloatingVideo();
                                    }}
                                    className="text-[11px] bg-red-600 hover:bg-red-700 text-white px-2 py-0.5 rounded font-bold cursor-pointer transition-colors"
                                    title="إيقاف المشغل يدوياً"
                                  >
                                    إيقاف ✕
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div
                              onClick={() => {
                                setPlayingYouTubePostId(post.id);
                                handleStartFloatingVideo({
                                  url: ytData.url || getYouTubeWatchUrl(ytId),
                                  title: ytData.title || 'فيديو يوتيوب',
                                  type: 'youtube',
                                  youtubeId: ytId,
                                  author: post.username,
                                  postId: post.id
                                });
                                showToast('تم تشغيل فيديو يوتيوب 🎬 - سيبقى شغالاً حتى عند إغلاق الحائط حتى توقفه يدوياً', 'info');
                              }}
                              className="relative group cursor-pointer overflow-hidden"
                              title="انقر لتشغيل الفيديو فوراً (يستمر بالعمل حتى بعد إغلاق الحائط) ▶"
                            >
                              <div className="relative aspect-video w-full bg-slate-900 flex items-center justify-center overflow-hidden">
                                <img
                                  src={ytData.thumbnail || getYouTubeThumbnailUrl(ytId)}
                                  alt={ytData.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  loading="lazy"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/35 group-hover:from-black/70 transition-colors flex items-center justify-center">
                                  {/* Red YouTube Play Button with hover pulse */}
                                  <div className="w-14 h-14 rounded-full bg-red-600/90 group-hover:bg-red-600 flex items-center justify-center text-white shadow-2xl group-hover:scale-115 transition-all duration-200 border-2 border-white/50">
                                    <Play className="w-7 h-7 fill-white ml-1" />
                                  </div>
                                </div>
                                {/* Top YouTube Branding Badge */}
                                <div className="absolute top-2 right-2 bg-red-600/95 text-white font-bold text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 shadow-md">
                                  <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                  </svg>
                                  <span>YouTube • تشغيل مستمر</span>
                                </div>
                                {/* Duration badge */}
                                {ytData.duration && (
                                  <div className="absolute bottom-2 left-2 bg-black/85 text-white text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-white/20">
                                    {ytData.duration}
                                  </div>
                                )}
                              </div>
                              {/* Bottom Video Details */}
                              <div className="p-2.5 bg-slate-900 border-t border-slate-800 text-white">
                                <div className="font-bold text-xs line-clamp-2 text-slate-100 group-hover:text-red-400 transition-colors">
                                  {ytData.title}
                                </div>
                                <div className="flex items-center justify-between mt-1.5 text-[11px] text-slate-400">
                                  <span className="truncate max-w-[160px] sm:max-w-[220px]">{ytData.channelTitle || 'قناة يوتيوب'}</span>
                                  <span className="text-red-400 font-bold flex items-center gap-1 group-hover:translate-x-[-3px] transition-transform shrink-0">
                                    <span>تشغيل مستمر</span>
                                    <span>▶</span>
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Media in Wall Post with click to Lightbox or direct persistent playback */}
                    {post.mediaUrl && (
                      isPostVideo ? (
                        <div className="mt-2 rounded-xl overflow-hidden border border-amber-500/40 bg-slate-950 shadow-md text-right">
                          {floatingVideo?.postId === post.id && floatingVideo?.type === 'video' ? (
                            <div className="p-2.5 bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 border border-amber-500/50 rounded-xl flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                                <span className="font-bold text-amber-300">
                                  الفيديو يعمل حالياً في المشغل المستمر 🎥 (مستمر بالعمل خارج الحائط)
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMediaViewer({
                                      url: post.mediaUrl!,
                                      type: 'video',
                                      title: `فيديو @${post.username}`
                                    });
                                  }}
                                  className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-bold cursor-pointer"
                                  title="تكبير المشغل"
                                >
                                  تكبير ⛶
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleStopFloatingVideo();
                                  }}
                                  className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold cursor-pointer"
                                  title="إيقاف المشغل يدوياً"
                                >
                                  إيقاف ✕
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div
                              onClick={() => {
                                handleStartFloatingVideo({
                                  url: post.mediaUrl!,
                                  title: `فيديو @${post.username}`,
                                  type: 'video',
                                  author: post.username,
                                  postId: post.id
                                });
                                showToast('تم تشغيل الفيديو 🎬 - سيبقى شغالاً حتى عند إغلاق الحائط حتى توقفه يدوياً', 'info');
                              }}
                              className="relative group cursor-pointer overflow-hidden max-h-52 w-full flex items-center justify-center bg-black"
                              title="انقر لتشغيل الفيديو فوراً ومتابعة تشغيله حتى بعد إغلاق الحائط ▶"
                            >
                              <video src={post.mediaUrl} className="max-h-52 w-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/20 transition-colors">
                                <div className="w-12 h-12 rounded-full bg-amber-500/90 group-hover:bg-amber-500 group-hover:scale-110 flex items-center justify-center text-white shadow-xl transition-all">
                                  <Play className="w-6 h-6 fill-white ml-0.5" />
                                </div>
                              </div>
                              <div className="absolute top-2 right-2 bg-black/80 text-amber-300 font-bold text-[10px] px-2 py-0.5 rounded flex items-center gap-1 border border-amber-500/40">
                                <Video className="w-3 h-3 text-amber-400" />
                                <span>فيديو هاتف • تشغيل مستمر</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div
                          onClick={() =>
                            setActiveMediaViewer({
                              url: post.mediaUrl!,
                              type: 'image',
                              title: `صورة من @${post.username}`
                            })
                          }
                          className="mt-2 relative group cursor-pointer rounded-lg overflow-hidden border border-slate-200"
                          title="انقر لتكبير وتحميل الصورة"
                        >
                          <img
                            src={post.mediaUrl}
                            alt="post media"
                            className="max-h-52 w-full object-cover group-hover:scale-[1.01] transition-transform"
                          />
                        </div>
                      )
                    )}

                    {/* Actions (Like, Comment) */}
                    <div className="mt-2.5 pt-2 border-t flex items-center justify-between text-xs text-slate-600">
                      {(() => {
                        const hasLiked = Boolean(
                          currentUser && post.likedUsers && post.likedUsers.includes(currentUser.username.toLowerCase())
                        );
                        return (
                          <button
                            type="button"
                            onClick={() => {
                              if (hasLiked) {
                                showToast('لقد سجلت إعجابك بهذا المنشور مسبقاً (إعجاب واحد فقط لكل عضو) ❤️', 'info');
                                return;
                              }
                              socket?.emit('likeWallPost', { postId: post.id });
                            }}
                            className={`flex items-center gap-1.5 transition-all cursor-pointer font-bold ${
                              hasLiked ? 'text-rose-600 scale-105' : 'text-slate-600 hover:text-rose-500 hover:scale-105'
                            }`}
                            title={hasLiked ? 'أعجبك هذا المنشور مسبقاً (إعجاب واحد فقط)' : 'إعجاب بالمنشور (مرة واحدة)'}
                          >
                            <Heart className={`w-4 h-4 ${hasLiked ? 'fill-rose-500 text-rose-500' : 'text-rose-500'}`} />
                            <span>{post.likes}</span>
                            {hasLiked && <span className="text-[10px] text-rose-500 font-normal">تم الإعجاب</span>}
                          </button>
                        );
                      })()}

                      <button
                        type="button"
                        onClick={() => setExpandedCommentsPostId(expandedCommentsPostId === post.id ? null : post.id)}
                        className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 cursor-pointer font-bold text-xs"
                        title="عرض التعليقات وإضافة تعليق"
                      >
                        <span>💬 {post.commentsCount || (post.comments ? post.comments.length : 0)} تعليق</span>
                      </button>
                    </div>

                    {/* Expandable Comments Drawer/Section (ميزة التعليق على منشورات الحائط) */}
                    {expandedCommentsPostId === post.id && (
                      <div className="mt-2 pt-2 border-t border-slate-100 bg-slate-50 p-2.5 rounded-xl space-y-2 text-right">
                        <div className="font-bold text-[11px] text-slate-800">التعليقات على المنشور:</div>
                        {post.comments && post.comments.length > 0 ? (
                          <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                            {post.comments.map((cm) => (
                              <div key={cm.id} className="p-2 bg-white border border-slate-200 rounded-lg text-xs shadow-2xs">
                                <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                                  <div className="flex items-center gap-1.5">
                                    {(() => {
                                      const cmBanner = getUserBanner(cm.username, cm.nameBannerUrl);
                                      if (cmBanner) {
                                        return (
                                          <img
                                            src={cmBanner}
                                            alt={cm.username}
                                            title={cm.username}
                                            onClick={() => openUserProfileByName(cm.username)}
                                            className="h-5 max-h-[22px] max-w-[130px] object-contain rounded inline-block cursor-pointer hover:opacity-90"
                                          />
                                        );
                                      }
                                      return (
                                        <span
                                          onClick={() => openUserProfileByName(cm.username)}
                                          className="font-bold text-slate-900 cursor-pointer hover:underline"
                                        >
                                          {cm.username}
                                        </span>
                                      );
                                    })()}
                                    {currentUser && (
                                      cm.username.toLowerCase() === currentUser.username.toLowerCase() ||
                                      post.username.toLowerCase() === currentUser.username.toLowerCase() ||
                                      currentUser.role === 'hassan' ||
                                      currentUser.role === 'admin' ||
                                      currentUser.role === 'super'
                                    ) && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteWallComment(post.id, cm.id)}
                                        className="text-slate-400 hover:text-rose-600 p-0.5 transition-colors cursor-pointer"
                                        title="حذف هذا التعليق 🗑️"
                                      >
                                        <Trash2 className="w-3 h-3 text-rose-500" />
                                      </button>
                                    )}
                                  </div>
                                  <span className="font-mono text-[10px] text-slate-400" title={cm.timestamp ? new Date(cm.timestamp).toLocaleString('ar-EG') : undefined}>
                                    {formatWallTime(cm.timestamp, cm.time, cm.id)}
                                  </span>
                                </div>
                                <div className="text-slate-700 leading-snug [overflow-wrap:anywhere] break-words" dir="auto">
                                  {renderFormattedMessageText(cm.text)}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 py-1 text-center">لا توجد تعليقات بعد .. كن أول من يعلق!</div>
                        )}

                        {/* Comment Shortcut Preview Indicator */}
                        {(() => {
                          const matched = findMatchingShortcut(wallCommentInput, shortcuts);
                          if (!matched) return null;
                          return (
                            <div className="px-2 py-0.5 bg-amber-50 text-[10px] text-amber-900 rounded flex items-center justify-between mb-1 border border-amber-200">
                              <span className="font-bold flex items-center gap-1">
                                <span>⚡ اختصار التعليق:</span>
                                <span className="font-mono bg-amber-200 px-1 rounded">{matched.trigger}</span>
                                <span>⬅️</span>
                                <span className="truncate max-w-[140px]">{matched.replacement}</span>
                              </span>
                            </div>
                          );
                        })()}

                        {/* Add Comment Input */}
                        <div className="flex items-center gap-1.5 pt-1">
                          <textarea
                            rows={1}
                            name="chat_wall_comment_freeform"
                            id="chat_wall_comment_freeform"
                            inputMode="text"
                            enterKeyHint="send"
                            autoComplete="off"
                            autoCorrect="on"
                            autoCapitalize="sentences"
                            spellCheck={true}
                            data-form-type="other"
                            data-lpignore="true"
                            data-1p-ignore="true"
                            data-bwignore="true"
                            data-protonpass-ignore="true"
                            data-keeper-ignore="true"
                            aria-autocomplete="none"
                            role="textbox"
                            placeholder="اكتب تعليقك هنا..."
                            value={wallCommentInput}
                            style={{ color: settingTextColor }}
                            onChange={(e) => setWallCommentInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey && wallCommentInput.trim()) {
                                e.preventDefault();
                                handleAddWallComment(post.id, wallCommentInput);
                              }
                            }}
                            className="flex-1 p-2 text-xs bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-600 resize-none h-9 leading-tight font-medium overflow-hidden"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddWallComment(post.id, wallCommentInput)}
                            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs cursor-pointer shadow-xs"
                          >
                            تعليق
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              });
            })()}
            </div>

            {/* Wall upload progress indicator */}
            {isWallUploading && (
              <div className="p-2 bg-amber-50 border-t border-amber-200 text-amber-900 text-xs flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-2">
                  <RotateCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
                  <span className="font-bold">جاري رفع ونشر الوسائط على الحائط... {wallUploadProgress}%</span>
                </div>
                <div className="w-24 bg-amber-200 rounded-full h-2 overflow-hidden">
                  <div className="bg-amber-600 h-full transition-all duration-150" style={{ width: `${wallUploadProgress || 1}%` }} />
                </div>
              </div>
            )}

            {/* Wall Shortcut Preview Indicator */}
            {(() => {
              const matched = findMatchingShortcut(wallTextInput, shortcuts);
              if (!matched) return null;
              return (
                <div className="px-3 py-1 bg-amber-50 border-t border-amber-200 text-[11px] text-amber-900 flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1">
                    <span>⚡ اختصار مكتشف:</span>
                    <span className="font-mono bg-amber-200/80 px-1.5 py-0.2 rounded text-[10px]">{matched.trigger}</span>
                    <span>⬅️</span>
                    <span className="text-amber-800 truncate max-w-[170px]">{matched.replacement}</span>
                  </span>
                  <span className="text-[10px] text-amber-600 font-semibold">(يُستبدل تلقائياً عند النشر)</span>
                </div>
              );
            })()}

            {/* Quick reply bar at bottom with Video / Photo upload */}
            <div className="p-2 border-t bg-slate-50 flex items-center gap-1.5">
              <label className={`p-2 text-slate-500 hover:text-indigo-600 cursor-pointer rounded hover:bg-slate-100 flex-shrink-0 ${isWallUploading ? 'opacity-50 pointer-events-none' : ''}`} title="إرفاق فيديو أو صورة للمنشور">
                <ImageIcon className="w-4 h-4 text-rose-500" />
                <input
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  disabled={isWallUploading}
                  onChange={handleWallMediaUpload}
                />
              </label>

              <textarea
                rows={1}
                name="chat_wall_post_freeform"
                id="chat_wall_post_freeform"
                inputMode="text"
                enterKeyHint="send"
                autoComplete="off"
                autoCorrect="on"
                autoCapitalize="sentences"
                spellCheck={true}
                data-form-type="other"
                data-lpignore="true"
                data-1p-ignore="true"
                data-bwignore="true"
                data-protonpass-ignore="true"
                data-keeper-ignore="true"
                aria-autocomplete="none"
                role="textbox"
                placeholder="...اكتب خاطرة أو منشوراً مع صورة"
                value={wallTextInput}
                style={{ color: settingTextColor }}
                onChange={(e) => setWallTextInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && wallTextInput.trim()) {
                    e.preventDefault();
                    handleSendWallPost();
                  }
                }}
                className="flex-1 p-2 text-xs border rounded bg-white outline-none resize-none h-9 leading-tight font-medium overflow-hidden"
              />
              <button
                type="button"
                onClick={() => {
                  setShowYouTubeSearchModal(true);
                  setYtSearchError(null);
                  if (ytSearchResults.length === 0) {
                    handleSearchYouTube('شيلات');
                  }
                }}
                className="px-2.5 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded text-xs font-bold cursor-pointer flex items-center gap-1 shadow-sm transition-all active:scale-95 shrink-0"
                title="بحث ومشاركة فيديو من يوتيوب على الحائط 🎬"
              >
                <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                <span className="hidden sm:inline">يوتيوب</span>
              </button>
              <button
                type="button"
                onClick={handleSendWallPost}
                className="px-3.5 py-2 bg-[#2a241e] text-amber-200 rounded text-xs font-bold cursor-pointer transition-colors hover:bg-black shrink-0"
              >
                إرسال
              </button>
            </div>

            {/* YouTube Search Modal for Wall (نافذة البحث في يوتيوب واختيار فيديو للنشر بالحائط) */}
            {showYouTubeSearchModal && (
              <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 text-right animate-in fade-in duration-200" dir="rtl">
                <div
                  className="bg-slate-900 border border-red-500/30 text-white rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Modal Header */}
                  <div className="px-4 py-3 bg-gradient-to-r from-red-950 via-slate-900 to-slate-900 border-b border-red-900/50 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white shadow-md">
                        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-black text-sm text-slate-100 flex items-center gap-1.5">
                          <span>بحث فيديوهات يوتيوب</span>
                          <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.2 rounded-full font-mono">YouTube</span>
                        </h3>
                        <p className="text-[11px] text-slate-400">ابحث عن أي مقطع أو شيلة وانشرها مباشرة على الحائط</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowYouTubeSearchModal(false)}
                      className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Search Input Bar */}
                  <div className="p-3 border-b border-slate-800 bg-slate-900/80 space-y-2 shrink-0">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSearchYouTube();
                      }}
                      className="flex items-center gap-2"
                    >
                      <div className="relative flex-1">
                        <input
                          type="text"
                          placeholder="اكتب اسم الفيديو، الشيلة، الأغنية، أو القناة..."
                          value={ytSearchQuery}
                          onChange={(e) => setYtSearchQuery(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-700 focus:border-red-500 text-xs text-white rounded-xl outline-none placeholder:text-slate-500 font-medium"
                          autoFocus
                        />
                        {ytSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setYtSearchQuery('')}
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      <button
                        type="submit"
                        disabled={isYtSearching}
                        className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:opacity-60 text-white font-bold text-xs rounded-xl shadow cursor-pointer flex items-center gap-1.5 transition-all shrink-0"
                      >
                        {isYtSearching ? (
                          <>
                            <RotateCw className="w-3.5 h-3.5 animate-spin" />
                            <span>جارٍ البحث...</span>
                          </>
                        ) : (
                          <>
                            <Search className="w-3.5 h-3.5" />
                            <span>بحث</span>
                          </>
                        )}
                      </button>
                    </form>

                    {/* Quick suggested search tags */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] text-slate-300">
                      <span className="text-[10px] text-slate-400 shrink-0">مقترحات:</span>
                      {[
                        'شيلات حماسية',
                        'أغاني طرب',
                        'تلاوة خاشعة',
                        'قصائد شعرية',
                        'بودكاست',
                        'طبيعة واسترخاء'
                      ].map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            setYtSearchQuery(tag);
                            handleSearchYouTube(tag);
                          }}
                          className="px-2 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white shrink-0 cursor-pointer text-[10px] transition-colors"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Results List or Loading/Error State */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-[220px]">
                    {isYtSearching ? (
                      <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                        <RotateCw className="w-8 h-8 animate-spin text-red-500" />
                        <span className="text-xs font-bold text-slate-300">جارٍ البحث في يوتيوب... ⏳</span>
                      </div>
                    ) : ytSearchError ? (
                      <div className="py-8 px-4 text-center space-y-2 bg-red-950/20 border border-red-900/40 rounded-xl my-4">
                        <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
                        <div className="text-xs text-red-300 font-bold">{ytSearchError}</div>
                      </div>
                    ) : ytSearchResults.length === 0 ? (
                      <div className="py-12 text-center text-slate-400 space-y-2">
                        <div className="text-3xl">🔍</div>
                        <div className="text-xs font-bold text-slate-300">ابحث عن أي فيديو في يوتيوب للبدء</div>
                        <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                          ستظهر النتائج هنا مع إمكانية نشر الفيديو مباشرة على الحائط لجميع الأعضاء
                        </p>
                      </div>
                    ) : (
                      ytSearchResults.map((video) => (
                        <div
                          key={video.id}
                          className="p-2.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl flex flex-col sm:flex-row items-start sm:items-center gap-3 transition-colors shadow-xs"
                        >
                          {/* Thumbnail with duration */}
                          <div className="relative w-full sm:w-36 aspect-video rounded-lg overflow-hidden bg-black shrink-0 border border-slate-700">
                            <img
                              src={video.thumbnail || getYouTubeThumbnailUrl(video.id)}
                              alt={video.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                            {video.duration && (
                              <span className="absolute bottom-1 left-1 bg-black/85 text-white text-[9px] font-mono px-1 rounded">
                                {video.duration}
                              </span>
                            )}
                          </div>

                          {/* Info & Title */}
                          <div className="flex-1 min-w-0 w-full">
                            <h4 className="text-xs font-bold text-slate-100 line-clamp-2 leading-relaxed" title={video.title}>
                              {video.title}
                            </h4>
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                              <span className="truncate max-w-[150px]">{video.channelTitle || 'قناة يوتيوب'}</span>
                              {video.views && <span>• {video.views}</span>}
                              {video.uploadedAt && <span>• {video.uploadedAt}</span>}
                            </div>

                            {/* Actions bar for each video */}
                            <div className="mt-2.5 flex items-center justify-between sm:justify-end gap-2">
                              <a
                                href={video.url || getYouTubeWatchUrl(video.id)}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 text-[11px] text-slate-300 hover:text-white bg-slate-700/60 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1 font-medium"
                              >
                                <span>معاينة</span>
                                <span>↗</span>
                              </a>
                              <button
                                type="button"
                                onClick={() => handlePostYouTubeVideo(video)}
                                className="px-3.5 py-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                              >
                                <span>نشر على الحائط</span>
                                <span>🚀</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Direct Paste Tip Footer */}
                  <div className="p-2.5 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between shrink-0">
                    <span className="flex items-center gap-1.5">
                      <span>💡</span>
                      <span>يمكنك أيضاً نسخ رابط أي فيديو ولصقه مباشرة في خانة المنشور وسيتحول لفيديو تلقائياً!</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowYouTubeSearchModal(false)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold cursor-pointer transition-colors"
                    >
                      إغلاق
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. PRIVATE MESSAGES / المحادثات الخاصة (محادثات منفرده لكل شخص مع عداد غير المقروء) */}
        {activeDrawer === 'pm' && !(selectedPmUser && pmWindowMode === 'split') && (
          <div className={`absolute inset-y-0 right-0 w-[92%] sm:w-[86%] max-w-md h-full ${curTheme.drawerBg} text-slate-100 z-40 shadow-2xl border-l ${curTheme.cardBorder} flex flex-col min-h-0 overflow-hidden animate-in slide-in-from-right duration-200 text-right`}>
            {!selectedPmUser ? (
              <>
                {/* Header */}
                <div className={`shrink-0 ${curTheme.drawerHeaderBg || curTheme.headerBg} ${curTheme.accentText} pt-[max(0.625rem,env(safe-area-inset-top))] px-3 py-2.5 flex items-center justify-between shadow-md border-b ${curTheme.headerBorder}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <MessageCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="font-bold text-sm truncate max-w-[170px] sm:max-w-[220px]">
                      المحادثات الخاصة
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {Object.values(unreadPerUser).some((c) => c > 0) && (
                      <button
                        onClick={() => {
                          setUnreadPerUser({});
                          try {
                            sessionStorage.removeItem('soqoor_unread_pm');
                          } catch {}
                          setNotificationCount(0);
                          showToast('تم تحديد جميع المحادثات كمقروءة ✨', 'success');
                        }}
                        className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded text-[10px] font-bold transition-colors cursor-pointer"
                        title="تصفير وتحديد جميع الرسائل الخاصة كمقروءة"
                      >
                        تحديد الكل كمقروء
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPmUser(null);
                        setActiveDrawer('none');
                      }}
                      className="w-8 h-8 shrink-0 bg-red-600 hover:bg-red-700 active:scale-95 text-white flex items-center justify-center rounded-lg font-bold shadow-md cursor-pointer transition-all"
                      title="إغلاق نافذة الخاص"
                    >
                      <X className="w-4 h-4 stroke-[3]" />
                    </button>
                  </div>
                </div>
              // CONVERSATIONS LIST: All users you interacted with or can message
              <div className={`flex-1 min-h-0 flex flex-col overflow-hidden ${curTheme.drawerBg}`}>
                <div className={`p-2 border-b ${curTheme.cardBorder} ${curTheme.cardBg} flex items-center justify-between shrink-0`}>
                  <span className={`font-bold text-xs ${curTheme.accentText}`}>صندوق الرسائل الخاصة المنفردة:</span>
                  <button
                    onClick={() => setActiveDrawer('users')}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-bold cursor-pointer"
                  >
                    + جميع المتواجدين ({rosterUsers.length})
                  </button>
                </div>

                {/* Quick Start PM with any online user */}
                <div className={`p-2 ${curTheme.subHeaderBg} border-b ${curTheme.subHeaderBorder} flex-shrink-0`}>
                  <div className="text-[11px] font-bold text-amber-300 mb-1.5 flex items-center justify-between">
                    <span>بدء محادثة خاصة فورية مع متواجد:</span>
                    <span className="text-[10px] text-emerald-400 font-semibold">{rosterUsers.filter(u => u.id !== currentUser.id).length} متاح</span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {rosterUsers
                      .filter((u) => u.id !== currentUser.id && !isUserIgnored(u.username))
                      .map((user) => (
                        <button
                          key={user.id}
                          onClick={() => {
                            setSelectedPmUser(user);
                            setUnreadPerUser((prev) => {
                              const updated = { ...prev };
                              const count = updated[user.username] || 0;
                              delete updated[user.username];
                              setNotificationCount((c) => Math.max(0, c - count));
                              return updated;
                            });
                          }}
                          className={`flex flex-col items-center gap-1 p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer flex-shrink-0 w-14`}
                        >
                          <div className="relative">
                            <img
                              src={user.avatarUrl || falconIcon}
                              alt={user.username}
                              className="w-10 h-10 rounded-full object-cover border border-indigo-300"
                            />
                            {user.isVoice && (
                              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white" />
                            )}
                          </div>
                          {(() => {
                            const banner = getUserBanner(user.username, user.nameBannerUrl);
                            if (banner) {
                              return (
                                <img
                                  src={banner}
                                  alt={user.username}
                                  className="h-3 max-w-[52px] object-contain rounded mx-auto"
                                />
                              );
                            }
                            return (
                              <span className="text-[10px] font-bold text-slate-800 truncate w-full text-center">
                                {user.username}
                              </span>
                            );
                          })()}
                        </button>
                      ))}
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto modal-scroll-container overscroll-contain divide-y divide-slate-100">
                  {/* Collect list of unique conversation partners */}
                  {(() => {
                    const partnersMap: Record<string, { user?: User; lastMsg?: PrivateMessage; unread: number }> = {};
                    const safePrivateMessages = Array.isArray(privateMessages) ? privateMessages : [];

                    // Extract from existing privateMessages safely
                    safePrivateMessages.forEach((pm) => {
                      if (!pm) return;
                      const otherUsername = pm.fromUsername === currentUser.username ? pm.toUsername : pm.fromUsername;
                      if (isUserIgnored(otherUsername)) return;
                      if (!partnersMap[otherUsername]) {
                        const matchedUser = rosterUsers.find((u) => u.username === otherUsername);
                        partnersMap[otherUsername] = {
                          user: matchedUser || {
                            id: pm.fromUsername === currentUser.username ? pm.toId : pm.fromId,
                            username: otherUsername,
                            room: 'الغرفة العامة',
                            avatarSeed: otherUsername,
                            statusQuote: '',
                            flag: '🇸🇦',
                            role: 'member',
                            likes: 0,
                            points: 0,
                            isVoice: false,
                            micSlot: null,
                            isMuted: false,
                            isTextMuted: false,
                            isSpeaking: false,
                            joinedAt: pm.timestamp
                          },
                          lastMsg: pm,
                          unread: unreadPerUser[otherUsername] || 0
                        };
                      } else {
                        partnersMap[otherUsername].lastMsg = pm;
                        partnersMap[otherUsername].unread = unreadPerUser[otherUsername] || 0;
                      }
                    });

                    const partnersList = Object.entries(partnersMap);

                    if (partnersList.length === 0) {
                      return (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                          <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 mb-3 shadow-inner">
                            <span className="text-3xl">💬</span>
                          </div>
                          <h3 className="font-bold text-sm text-slate-800 mb-1">لا توجد محادثات خاصة بعد</h3>
                          <p className="text-xs text-slate-500 mb-4">اختر عضواً لبدء محادثة منفردة خاصة بينكما</p>
                          <button
                            onClick={() => setActiveDrawer('users')}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow transition-colors cursor-pointer"
                          >
                            اختيار عضو من المتواجدين ({rosterUsers.length})
                          </button>
                        </div>
                      );
                    }

                    return partnersList.map(([username, info]) => {
                      const userObj = info.user!;
                      const unread = info.unread;
                      const lastMsg = info.lastMsg;

                      return (
                        <div
                          key={username}
                          onClick={() => {
                            setSelectedPmUser(userObj);
                            // Clear unread for this user
                            setUnreadPerUser((prev) => {
                              const updated = { ...prev };
                              const count = updated[username] || 0;
                              delete updated[username];
                              setNotificationCount((c) => Math.max(0, c - count));
                              return updated;
                            });
                          }}
                          className="p-3 bg-white hover:bg-slate-100 flex items-center justify-between cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="relative">
                              <img
                                src={userObj.avatarUrl || falconIcon}
                                alt={username}
                                className="w-10 h-10 rounded-full object-cover border border-slate-300"
                              />
                              {/* Presence dot: 🔵 Ghost (blue dot), 🟢 Online, 🟡 Away, ⚪ Offline */}
                              {(() => {
                                const matched = allConnectedUsers.find((u) => u.username.toLowerCase() === username.toLowerCase()) || rosterUsers.find((u) => u.username.toLowerCase() === username.toLowerCase());
                                const targetCandidate = matched || userObj;
                                const isGhostUser = Boolean(matched?.isGhost || userObj.isGhost);
                                const canSeeGhost = canViewerSeeUser(targetCandidate);
                                if (isGhostUser && !canSeeGhost) {
                                  return <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-slate-400 border-2 border-white" title="غير متصل ⚪" />;
                                }
                                if (isGhostUser) {
                                  return <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-xs ring-1 ring-blue-400" title="متواجد ولكن بوضع مخفي 🔵" />;
                                }
                                const state = matched?.presenceState || userObj.presenceState || (matched ? 'online' : 'offline');
                                return state === 'away' ? (
                                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-amber-400 border-2 border-white shadow-xs animate-pulse" title="في الخلفية (بالانتظار) 🟡" />
                                ) : state === 'offline' ? (
                                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-slate-400 border-2 border-white" title="غير متصل ⚪" />
                                ) : (
                                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-xs" title="متواجد ونشط 🟢" />
                                );
                              })()}
                              {unread > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-600 text-white font-black text-[10px] flex items-center justify-center shadow-md animate-bounce border-2 border-white">
                                  {unread}
                                </span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-xs text-slate-900 flex items-center gap-1">
                                {(() => {
                                  const partnerBanner = getUserBanner(username, userObj.nameBannerUrl);
                                  if (partnerBanner) {
                                    return (
                                      <img
                                        src={partnerBanner}
                                        alt={username}
                                        title={username}
                                        className="h-5 max-h-[22px] max-w-[140px] object-contain rounded inline-block"
                                      />
                                    );
                                  }
                                  return <span>{username}</span>;
                                })()}
                                <span>{userObj.flag}</span>
                              </div>
                              <div className="text-[11px] text-slate-500 truncate max-w-[170px] mt-0.5">
                                {lastMsg ? (
                                  <span>{lastMsg.mediaUrl ? '📸 [صورة مرفقة]' : lastMsg.text}</span>
                                ) : (
                                  <span>محادثة خاصة منفرده</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1 flex-shrink-0 text-left">
                            <span className="text-[10px] text-slate-400 font-mono" title={lastMsg?.timestamp ? new Date(lastMsg.timestamp).toLocaleString('ar-EG') : undefined}>
                              {lastMsg ? formatMessageTime(lastMsg) : ''}
                            </span>
                            {unread > 0 ? (
                              <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black animate-pulse shadow-xs">
                                {unread} غير مقروءة
                              </span>
                            ) : (
                              <span className="text-[10px] text-indigo-600 font-bold">عرض المحادثة ←</span>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </>
          ) : (
            renderActivePmThreadContent(false)
          )}
          </div>
        )}

        {/* 5. CONTROL & PERMISSIONS PANEL / لوحة التحكم والصلاحيات (Screenshot 8 & Admin Suite) */}
        {/* 5. CONTROL & PERMISSIONS PANEL / لوحة التحكم والصلاحيات الشاملة */}
        {activeDrawer === "monitor" && currentUser && (
          <div className="absolute inset-y-0 right-0 w-[92%] sm:w-[86%] max-w-xl bg-[#17110c] z-40 shadow-2xl border-l border-[#4d3722] flex flex-col animate-in slide-in-from-right duration-200 text-right">
            <ModalErrorBoundary>
              <Suspense fallback={<div className="p-8 text-center text-amber-400 font-bold">جاري فتح لوحة الإدارة...</div>}><AdminControlSuite
              currentUser={currentUser}
              initialTab={adminInitialTab}
              initialThemeToEdit={adminInitialThemeToEdit}
              rosterUsers={rosterUsers}
              allRegisteredMembers={allRegisteredMembers}
              roomsList={roomsList}
              roomStatsData={roomStatsData}
              bannedList={bannedList}
              roomSettings={roomSettings}
              serverSecurity={serverSecurity}
              likesSettings={likesSettings}
              staffMemos={staffMemos}
              monitorLogs={monitorLogs}
              monitoredWordsList={monitoredWordsList}
              filterAlerts={filterAlertsList}
              shortcuts={shortcuts}
              onUpdateLikesSettings={(newLikes) => {
                setLikesSettings((prev) => ({ ...prev, ...newLikes }));
                socket?.emit('updateLikesSettings', newLikes);
              }}
              onAdminAction={(action, targetUsername, value, reason) => {
                handleAdminAction(action, targetUsername || "", value, reason);
              }}
              onManualBan={(username, ip, reason) => {
                socket?.emit("manualBan", { username, ip, reason });
              }}
              onUpdateSecurity={(newSettings) => {
                socket?.emit("updateServerSecurity", newSettings);
              }}
              onAddStaffMemo={(text, priority) => {
                socket?.emit("addStaffMemo", { text, priority });
              }}
              onDeleteStaffMemo={(memoId) => {
                socket?.emit("deleteStaffMemo", { memoId });
              }}
              onAddMonitoredWord={(word) => {
                socket?.emit("addMonitoredWord", { word });
              }}
              onRemoveMonitoredWord={(word) => {
                socket?.emit("removeMonitoredWord", { word });
              }}
              onAddShortcut={(trigger, replacement) => {
                socket?.emit("addShortcut", { trigger, replacement });
              }}
              onDeleteShortcut={(shortcutId) => {
                socket?.emit("deleteShortcut", { shortcutId });
              }}
              onUpdateShortcut={(id, trigger, replacement) => {
                socket?.emit("updateShortcut", { id, trigger, replacement });
              }}
              onClearMonitorLogs={() => {
                socket?.emit("clearMonitorLogs");
              }}
              onClearFilterAlerts={() => {
                socket?.emit("clearFilterAlerts");
                setFilterAlertsList([]);
              }}
              onOpenUserProfile={(user) => {
                openUserProfile(user);
              }}
              onSwitchRoom={(roomId) => {
                setMessages([]);
                socket?.emit("joinRoom", {
                  username: currentUser.username,
                  room: roomId,
                  flag: currentUser.flag,
                  statusQuote: currentUser.statusQuote,
                  isGhost: currentUser.isGhost
                });
                showToast(`جاري الانتقال إلى [${roomId}]...`, "info");
              }}
              customThemes={customThemes}
              chatFontWeight={chatFontWeight}
              onChangeFontWeight={handleUpdateFontWeight}
              onSaveCustomTheme={(preset) => {
                socket?.emit('saveCustomTheme', preset);
              }}
              onDeleteCustomTheme={(themeId) => {
                socket?.emit('deleteCustomTheme', { themeId });
              }}
              rolesConfig={rolesConfig}
              onSaveRole={(role, permissions) => {
                socket?.emit('saveRole', { role, permissions });
                setRolesConfig((prev) => {
                  const cleanId = role.id.trim().toLowerCase();
                  const idx = prev.findIndex((r) => r.id.toLowerCase() === cleanId);
                  let next: RoleDefinition[];
                  if (idx !== -1) {
                    next = [...prev];
                    next[idx] = { ...next[idx], ...role };
                  } else {
                    next = [...prev, role];
                  }
                  return next.sort((a, b) => b.level - a.level);
                });
              }}
              onDeleteRole={(roleId) => {
                socket?.emit('deleteRole', { roleId });
                setRolesConfig((prev) => prev.filter((r) => r.id.toLowerCase() !== roleId.toLowerCase()));
              }}
              rolePermissions={rolePermissions}
              onUpdateRolePermissions={(role, permissions) => {
                setRolePermissions((prev) => {
                  const next = {
                    ...prev,
                    [role]: {
                      ...(prev?.[role] || {}),
                      ...permissions
                    }
                  };
                  try {
                    localStorage.setItem('soqoor_role_permissions', JSON.stringify(next));
                  } catch {}
                  return next;
                });
                socket?.emit('updateRolePermissions', { role, permissions });
              }}
              generalWelcome={generalWelcome}
              onUpdateGeneralWelcome={(settings) => {
                setGeneralWelcome((prev) => ({ ...prev, ...settings }));
                socket?.emit('updateGeneralWelcome', settings);
              }}
              emblemsConfig={emblemsConfig}
              messageLimits={messageRetentionLimits}
              onUpdateMessageLimits={(limits) => {
                setMessageRetentionLimits((prev) => {
                  const next = { ...prev, ...limits };
                  messageRetentionLimitsRef.current = next;
                  return next;
                });
                if (typeof limits.roomMaxMessages === 'number' && limits.roomMaxMessages > 0) {
                  setMessages((prev) => pruneMessagesByRoomLimit(prev, limits.roomMaxMessages!));
                }
                socket?.emit('updateMessageRetentionLimits', limits);
              }}
              falconChatBanner={falconChatBanner}
              falconAvatarIcon={falconAvatarIcon}
              onUpdateFalconAssets={(assets) => socket?.emit('updateFalconAssets', assets)}
              onAddEmblem={(data) => socket?.emit('addEmblem', data)}
              onDeleteEmblem={(id) => socket?.emit('deleteEmblem', { id })}
              onUpdateEmojiSize={(emojiSize) => socket?.emit('updateEmblemEmojiSize', { emojiSize })}
              onAssignMemberBanner={(username, bannerUrl) => socket?.emit('assignMemberBanner', { username, bannerUrl })}
              onGrantMemberGift={(username, giftUrl, giftTitle) => socket?.emit('grantMemberGift', { username, giftUrl, giftTitle })}
              onRemoveMemberGift={(username, giftUrl) => socket?.emit('removeMemberGift', { username, giftUrl })}
              socket={socket}
              onClose={() => {
                setActiveDrawer("none");
                setAdminInitialThemeToEdit(undefined);
              }}
              showToast={showToast}
            />
            </Suspense>
            </ModalErrorBoundary>
          </div>
        )}
        {/* 6. SETTINGS DRAWER / الإعدادات (Screenshots 5 & 6) */}
        {activeDrawer === 'settings' && (
          <div className={`absolute inset-y-0 right-0 w-[84%] ${curTheme.drawerBg} text-slate-100 z-40 shadow-2xl border-l ${curTheme.cardBorder} flex flex-col animate-in slide-in-from-right duration-200`}>
            <div className={`${curTheme.drawerHeaderBg || curTheme.headerBg} ${curTheme.accentText} p-2.5 flex items-center justify-between`}>
              <span className="font-bold text-sm">الإعدادات</span>
              <button
                onClick={() => setActiveDrawer('none')}
                className="w-7 h-7 bg-red-600 hover:bg-red-700 text-white flex items-center justify-center rounded font-bold cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs text-right">
              {/* Profile Visitors Button (زر زوار ملفي الشخصي - يظهر الاسم والصورة وعدد المرات) */}
              <button
                type="button"
                onClick={() => {
                  socket?.emit('getProfileVisitors');
                  setShowProfileVisitorsModal(true);
                }}
                className="w-full py-2.5 px-3 bg-gradient-to-r from-amber-900/70 via-amber-800/80 to-amber-900/70 hover:from-amber-800 hover:to-amber-700 text-amber-200 border-2 border-amber-500/80 rounded-xl font-bold flex items-center justify-between shadow-md cursor-pointer transition-all hover:scale-[1.01]"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-amber-500/25 flex items-center justify-center text-amber-400 border border-amber-400/40">
                    <Eye className="w-4 h-4" />
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                      <span>زوار ملفي الشخصي 👁️</span>
                      {profileVisitorsList.length > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[9px] font-mono animate-pulse">
                          نشط
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-amber-200/70">من نقر على صورتي وتصفح بروفايلي</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-xs font-mono shadow-xs">
                    {profileVisitorsList.length} زائر
                  </span>
                  <span className="text-xs text-amber-400 font-bold">عرض ←</span>
                </div>
              </button>

              {/* إعدادات الغرفة الحالية عند التواجد بالغرفة (مطلوبة بالضبط أسفل يمين الشاشة) */}
              {userCanManageRoomSettings && currentUser.room && currentUser.room !== 'خارج الغرف' && (
                <div className="p-3 bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/80 rounded-xl border-2 border-amber-500/70 shadow-md space-y-2 text-right">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-amber-300 font-bold text-xs">
                      <Settings className="w-4 h-4 text-amber-400" />
                      <span>إعدادات الغرفة: [{currentUser.room}]</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const curRoom = roomsList.find(r => r.name === currentUser.room || r.id === currentUser.room);
                        setCurrentRoomSettingsForm({
                          name: curRoom?.name || currentUser.room,
                          desc: curRoom?.desc || '',
                          pinnedTopic: pinnedTopic || '',
                          isChatLocked: roomSettings?.isChatLocked || false,
                          slowModeSeconds: roomSettings?.slowModeSeconds || 0,
                          isVoiceLocked: roomSettings?.isVoiceLocked || false,
                          showDeletedNotice: Boolean(roomSettings?.showDeletedNotice),
                          password: '',
                          isPasswordProtected: Boolean(curRoom?.isPasswordProtected),
                          clearPassword: false,
                          wallpaper: activeWallpaper || 'default',
                          welcomeMessage: (roomSettings as any)?.welcomeMessage || '',
                          welcomeEnabled: (roomSettings as any)?.welcomeEnabled !== false
                        });
                        setIsRoomSettingsModalOpen(true);
                      }}
                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-black font-black text-[10px] rounded-lg shadow-xs transition-transform hover:scale-105 cursor-pointer flex items-center gap-1"
                    >
                      <Sliders className="w-3 h-3" />
                      <span>تعديل الغرفة ⚙️</span>
                    </button>
                  </div>
                  <div className="text-[11px] text-amber-200/80 leading-relaxed">
                    تحكم بالاسم، الإعلان المثبت، قفل الشات والمايكات، والوضع البطيء للغرفة.
                  </div>
                </div>
              )}

              {/* الزخرفة واسم العرض */}
              <div className="rounded-xl border-2 border-amber-500/70 overflow-hidden shadow-sm">
                <div className="bg-[#241a12] text-amber-300 px-3 py-1.5 font-bold text-xs flex items-center justify-between border-b border-amber-500/40">
                  <span>الزخرفة واسم العرض ✍️</span>
                  <span className="text-[10px] text-amber-200/70">يظهر لجميع الأعضاء</span>
                </div>
                <input
                  type="text"
                  value={settingName}
                  onChange={(e) => setSettingName(e.target.value)}
                  placeholder="اكتب اسمك أو زخرفتك..."
                  className="w-full p-2.5 outline-none font-black text-sm bg-white text-slate-950 placeholder-slate-400 focus:bg-amber-50/30"
                />
              </div>

              {/* الحاله والعبارة */}
              <div className="rounded-xl border-2 border-amber-500/70 overflow-hidden shadow-sm">
                <div className="bg-[#241a12] text-amber-300 px-3 py-1.5 font-bold text-xs flex items-center justify-between border-b border-amber-500/40">
                  <span>الحالة والعبارة الشخصية 💬</span>
                  <span className="text-[10px] text-amber-200/70">تظهر أسفل اسمك</span>
                </div>
                <input
                  type="text"
                  value={settingQuote}
                  onChange={(e) => setSettingQuote(e.target.value)}
                  placeholder="اكتب حالتك أو عبارتك التعبيرية..."
                  className="w-full p-2.5 outline-none font-bold text-sm bg-white text-slate-950 placeholder-slate-400 focus:bg-amber-50/30"
                />
              </div>

              {/* Color rows (لون الإسم ولون الخط مع المعاينة الفورية) */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-slate-50 border border-slate-300 rounded-lg p-2 space-y-1.5 shadow-2xs">
                  <div className="p-1 bg-[#2a241e] text-amber-200 font-bold text-center rounded text-[11px]">
                    لون الإسم
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settingNameColor}
                      onChange={(e) => {
                        const col = e.target.value;
                        setSettingNameColor(col);
                        if (currentUser) {
                          setCurrentUser((prev) => (prev ? { ...prev, nameColor: col } : null));
                        }
                        socket?.emit('updateUserStyle', { nameColor: col });
                      }}
                      className="w-9 h-8 cursor-pointer rounded border border-slate-400 p-0.5 bg-white shadow-xs"
                    />
                    <span className="font-bold text-xs truncate flex-1" style={{ color: settingNameColor }}>
                      {settingName || currentUser.username}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-300 rounded-lg p-2 space-y-1.5 shadow-2xs">
                  <div className="p-1 bg-[#2a241e] text-amber-200 font-bold text-center rounded text-[11px]">
                    لون الخط
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settingTextColor}
                      onChange={(e) => {
                        const col = e.target.value;
                        setSettingTextColor(col);
                        if (currentUser) {
                          setCurrentUser((prev) => (prev ? { ...prev, textColor: col } : null));
                        }
                        socket?.emit('updateUserStyle', { textColor: col });
                      }}
                      className="w-9 h-8 cursor-pointer rounded border border-slate-400 p-0.5 bg-white shadow-xs"
                    />
                    <span className="font-bold text-xs truncate flex-1" style={{ color: settingTextColor }}>
                      معاينة الخط ✍️
                    </span>
                  </div>
                </div>
              </div>

              {/* Green Save Button (Screenshot 5: [✎ حفظ]) */}
              <button
                onClick={handleSaveSettings}
                className="w-full py-2.5 bg-[#48a942] hover:bg-emerald-600 text-white font-bold rounded shadow flex items-center justify-center gap-1.5 text-sm"
              >
                <span>✎ حفظ الإعدادات</span>
              </button>

              {/* Change Avatar Section (Screenshot 5: تغيير الصورة الشخصية) */}
              <div className="p-2.5 border rounded-lg bg-slate-50 space-y-2">
                <div className="font-bold text-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-indigo-600" />
                    <span>تغير الصوره الشخصية</span>
                  </div>
                  {settingAvatar && (
                    <img
                      src={settingAvatar}
                      alt="preview"
                      className="w-7 h-7 rounded-full object-cover border border-amber-500"
                    />
                  )}
                </div>

                {/* Upload from Device / Phone */}
                <label className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all">
                  <Camera className="w-3.5 h-3.5" />
                  <span>اختيار صورة من هاتفك أو جهازك 🖼️</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      handleFileUpload(e, (dataUrl) => {
                        setSettingAvatar(dataUrl);
                        showToast('تم تحميل صورتك بنجاح! اضغط ✎ حفظ لتثبيتها', 'success');
                      })
                    }
                  />
                </label>

                {/* Custom Avatar Guide */}
                <div className="pt-1 text-[11px] text-slate-500 font-medium text-center">
                  يمكنك رفع صورتك الشخصية الخاصة مباشرة من جهازك بالزر أعلاه، أو إدخال رابط صورتك بالأسفل.
                </div>

                {/* Custom Image URL */}
                <input
                  type="text"
                  placeholder="أو الصق رابط صورة مباشرة..."
                  value={settingAvatar}
                  onChange={(e) => setSettingAvatar(e.target.value)}
                  className="w-full p-1.5 border rounded text-xs bg-white outline-none"
                />

                <button
                  type="button"
                  onClick={() => {
                    setSettingAvatar('');
                    socket?.emit('updateProfile', { avatarUrl: '' });
                    showToast('تم حذف صورتك الشخصية والعودة للصورة الافتراضية بنجاح 🗑️', 'info');
                  }}
                  className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded flex items-center justify-center gap-1.5 text-xs shadow-xs cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف صورتي الشخصية</span>
                </button>
              </div>

              {/* 1. خيار تعطيل / تفعيل المحادثات الخاصة (قفل الخاص) */}
              <div className="p-3 rounded-xl border-2 border-amber-500/70 bg-gradient-to-b from-[#1c150f] to-[#120d09] text-right space-y-2 shadow-md">
                <div className="flex items-center justify-between border-b border-amber-500/30 pb-2">
                  <div className="flex items-center gap-1.5 font-bold text-amber-300 text-xs">
                    {isPmDisabled ? <Lock className="w-4 h-4 text-rose-400" /> : <Unlock className="w-4 h-4 text-emerald-400" />}
                    <span>المحادثات الخاصة (الخاص)</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1 ${
                    isPmDisabled ? 'bg-rose-950 text-rose-300 border border-rose-500/50' : 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                  }`}>
                    {isPmDisabled ? '🔒 معطل ومقفل' : '🔓 مفعّل ومتاح'}
                  </span>
                </div>
                <p className="text-[11px] text-amber-100/80 leading-relaxed">
                  {isPmDisabled
                    ? 'المحادثات الخاصة لديك مقفلة حالياً. لن يتمكن أي عضو من إرسال رسائل خاصة إليك أو فتح محادثة جديدة معك.'
                    : 'المحادثات الخاصة مفعّلة. يمكن لجميع الأعضاء التواصل معك ومراسلتك على الخاص بحرية.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const nextState = !isPmDisabled;
                    setIsPmDisabled(nextState);
                    if (currentUser) {
                      setCurrentUser({ ...currentUser, isPmDisabled: nextState });
                    }
                    socket?.emit('updateProfile', { isPmDisabled: nextState });
                    showToast(
                      nextState
                        ? '🔒 تم تعطيل وقفل استلام المحادثات الخاصة بنجاح.'
                        : '🔓 تم تفعيل استلام المحادثات الخاصة بنجاح.',
                      nextState ? 'info' : 'success'
                    );
                  }}
                  className={`w-full py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md active:scale-98 ${
                    isPmDisabled
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white'
                      : 'bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 text-white'
                  }`}
                >
                  {isPmDisabled ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  <span>{isPmDisabled ? 'تفعيل وفتح المحادثات الخاصة 🔓' : 'تعطيل وقفل المحادثات الخاصة 🔒'}</span>
                </button>
              </div>

              {/* 2. خيار تعطيل التنبيهات بالكامل (كتم كافة الأصوات والإشعارات) */}
              <div className="p-3 rounded-xl border-2 border-amber-500/70 bg-gradient-to-b from-[#1c150f] to-[#120d09] text-right space-y-2 shadow-md">
                <div className="flex items-center justify-between border-b border-amber-500/30 pb-2">
                  <div className="flex items-center gap-1.5 font-bold text-amber-300 text-xs">
                    {allNotificationsDisabled ? <BellOff className="w-4 h-4 text-rose-400" /> : <Bell className="w-4 h-4 text-amber-400" />}
                    <span>التنبيهات والإشعارات العامة</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1 ${
                    allNotificationsDisabled ? 'bg-rose-950 text-rose-300 border border-rose-500/50' : 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                  }`}>
                    {allNotificationsDisabled ? '🔕 معطلة بالكامل' : '🔔 مفعلة'}
                  </span>
                </div>
                <p className="text-[11px] text-amber-100/80 leading-relaxed">
                  {allNotificationsDisabled
                    ? 'كافة التنبيهات معطلة حالياً (كتم تام لأصوات الدردشة، إشعارات المتصفح المنبثقة، وتنبيهات المنشن والخاص).'
                    : 'التنبيهات مفعلة وستصلك الأصوات وإشعارات المتصفح عند وصول رسائل أو منشن لك.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const nextState = !allNotificationsDisabled;
                    setAllNotificationsDisabled(nextState);
                    allNotificationsDisabledRef.current = nextState;
                    try {
                      if (nextState) {
                        localStorage.setItem('soqoor_notifications_disabled', 'true');
                      } else {
                        localStorage.removeItem('soqoor_notifications_disabled');
                      }
                    } catch {}
                    sounds.setMuted(nextState);
                    setSoundsMuted(nextState);
                    showToast(
                      nextState
                        ? '🔕 تم تعطيل كافة التنبيهات والأصوات والإشعارات بالكامل (صامت تام).'
                        : '🔔 تم تفعيل التنبيهات والأصوات والإشعارات بنجاح.',
                      nextState ? 'info' : 'success'
                    );
                  }}
                  className={`w-full py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md active:scale-98 ${
                    allNotificationsDisabled
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black'
                      : 'bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white'
                  }`}
                >
                  {allNotificationsDisabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                  <span>{allNotificationsDisabled ? 'تفعيل وتشغيل التنبيهات 🔔' : 'تعطيل وإيقاف التنبيهات بالكامل 🔕'}</span>
                </button>
              </div>

              {/* 3. Mobile Notification Media Player & Keep-Alive (مشغل الشات في شريط إشعارات الهاتف لمنع التجميد) */}
              <div className="p-3.5 rounded-xl border-2 border-amber-500/80 bg-gradient-to-b from-[#221810] to-[#140e09] text-right space-y-2.5 shadow-md">
                <div className="flex items-center justify-between border-b border-amber-500/30 pb-2">
                  <div className="flex items-center gap-1.5 font-bold text-amber-300 text-xs">
                    <Radio className="w-4 h-4 text-amber-400 animate-pulse" />
                    <span>مشغل الشات في شريط إشعارات الهاتف 📱🎵</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1 ${
                    keepAlivePlayerEnabled && isKeepAlivePlayingState
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                      : 'bg-slate-800 text-slate-300 border border-slate-600'
                  }`}>
                    {keepAlivePlayerEnabled && isKeepAlivePlayingState ? '🟢 نشط في الإشعارات' : '⚪ متوقف'}
                  </span>
                </div>

                <p className="text-[11px] text-amber-100/85 leading-relaxed">
                  يُظهر مشغلاً صوتياً باسم الشات والمتصفح في شريط إشعارات الهاتف وشاشة القفل، مما يمنع متصفح Chrome ونظام الهاتف من تجميد الشات أو قطع اتصالك عند قفل الشاشة أو الانتقال إلى تطبيقات أخرى (مثل واتساب).
                </p>

                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 text-[10px] text-amber-200/90 flex items-start gap-1.5 font-medium leading-relaxed">
                  <span className="text-amber-400 text-xs">⚡</span>
                  <span><strong>إعادة التشغيل التلقائي الذاتي (Auto-Revival):</strong> شغال تلقائياً؛ إذا توقف المشغل بسبب ورود مكالمة هاتفية، أو تشغيل فيديو آخر، أو إغلاق الشاشة، يعيد تشغيل نفسه تلقائياً لضمان بقائك أونلاين وعدم قطع الاتصال أبداً!</span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const nextState = !keepAlivePlayerEnabled;
                      setKeepAlivePlayerEnabled(nextState);
                      try {
                        localStorage.setItem('soqoor_keepalive_player', String(nextState));
                      } catch {}
                      if (nextState) {
                        startSilentAudioKeepAlive({
                          title: `شات حسان برو | ${currentUser?.room || 'الغرفة العامة'} 💬`,
                          artist: `${currentUser?.username || 'ضيف'} • متصل ونشط 🟢`
                        });
                        setIsKeepAlivePlayingState(true);
                        showToast('تم تفعيل مشغل الشات وإبقاء الاتصال حياً في شريط الإشعارات 📱🟢', 'success');
                      } else {
                        stopSilentAudioKeepAlive();
                        setIsKeepAlivePlayingState(false);
                        showToast('تم إيقاف مشغل الشات في شريط الإشعارات ⏹️', 'info');
                      }
                    }}
                    className={`flex-1 py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md active:scale-98 ${
                      keepAlivePlayerEnabled
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white'
                        : 'bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-white'
                    }`}
                  >
                    <Radio className="w-4 h-4" />
                    <span>{keepAlivePlayerEnabled ? 'المشغل مفعّل في الإشعارات ✔️' : 'تفعيل المشغل في شريط الإشعارات 📱'}</span>
                  </button>

                  {keepAlivePlayerEnabled && (
                    <button
                      type="button"
                      onClick={() => {
                        if (isKeepAlivePlayingState) {
                          pauseKeepAliveAudio();
                          setIsKeepAlivePlayingState(false);
                          showToast('تم إيقاف المشغل مؤقتاً ⏸️', 'info');
                        } else {
                          resumeKeepAliveAudio();
                          setIsKeepAlivePlayingState(true);
                          showToast('تم استئناف المشغل في شريط الإشعارات ▶️', 'success');
                        }
                      }}
                      className="px-3 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-all"
                      title={isKeepAlivePlayingState ? 'إيقاف مؤقت' : 'تشغيل الآن'}
                    >
                      {isKeepAlivePlayingState ? <VolumeX className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      <span>{isKeepAlivePlayingState ? 'إيقاف مؤقت ⏸️' : 'تشغيل ▶️'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Notification Sounds Customization (تخصيص نغمات التنبيهات حسب نوع الحدث) */}
              <div className="p-3 border rounded-xl bg-slate-50 space-y-3.5">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                    <Volume2 className="w-4 h-4 text-amber-600" />
                    <span>تخصيص أصوات التنبيهات حسب نوع الحدث</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const nextMute = !soundsMuted;
                      setSoundsMuted(nextMute);
                      sounds.setMuted(nextMute);
                      showToast(nextMute ? 'تم كتم جميع التنبيهات الصوتية 🔇' : 'تم تفعيل الأصوات 🔔', 'info');
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                      soundsMuted ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {soundsMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                    <span>{soundsMuted ? 'الأصوات مكتومة' : 'الأصوات مفعلة'}</span>
                  </button>
                </div>

                {/* Master Sequence Test Button in Settings */}
                <button
                  type="button"
                  disabled={testingSequence}
                  onClick={handlePlayToneSequence}
                  className="w-full py-1.5 bg-gradient-to-l from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 disabled:opacity-60 text-white font-bold text-xs rounded-lg shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>
                    {testingSequence
                      ? 'جارٍ الاستماع المتتابع (عام 📢 ➔ خاص 💬 ➔ منشن 🔔)...'
                      : '🎵 اختبار النغمات الثلاث بالتتابع (عام، خاص، منشن)'}
                  </span>
                </button>

                {/* 1. Public / System Announcement Sound */}
                <div className="space-y-1.5 p-2 bg-amber-50/70 border border-amber-200 rounded-lg">
                  <div className="flex items-center justify-between text-[11px] font-bold text-amber-950">
                    <span className="flex items-center gap-1">
                      <span>📢</span>
                      <span>نغمة الإشعار والتنبيه العام:</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => sounds.previewAlertSound(selectedAlertSound)}
                      className="px-2 py-0.5 rounded bg-amber-200 hover:bg-amber-300 text-amber-900 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      title="تجربة نغمة الإشعار العام"
                    >
                      <Play className="w-2.5 h-2.5 fill-current" />
                      <span>استماع</span>
                    </button>
                  </div>
                  <select
                    value={selectedAlertSound}
                    onChange={(e) => {
                      const sId = e.target.value as AlertSoundId;
                      setSelectedAlertSound(sId);
                      sounds.setAlertSound(sId);
                      sounds.previewAlertSound(sId);
                      showToast('تم حفظ نغمة الإشعار العام 📢', 'success');
                    }}
                    className="w-full p-2 border border-amber-300 rounded-lg text-xs bg-white text-slate-800 font-semibold outline-none focus:border-amber-600"
                  >
                    {ALERT_SOUND_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.icon} {opt.label} - {opt.desc}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Private Message Sound */}
                <div className="space-y-1.5 p-2 bg-indigo-50/70 border border-indigo-200 rounded-lg">
                  <div className="flex items-center justify-between text-[11px] font-bold text-indigo-950">
                    <span className="flex items-center gap-1">
                      <span>💬</span>
                      <span>نغمة الرسائل الخاصة (الخاص):</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => sounds.previewPrivateSound(selectedPrivateSound)}
                      className="px-2 py-0.5 rounded bg-indigo-200 hover:bg-indigo-300 text-indigo-900 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      title="تجربة نغمة الرسائل الخاصة"
                    >
                      <Play className="w-2.5 h-2.5 fill-current" />
                      <span>استماع</span>
                    </button>
                  </div>
                  <select
                    value={selectedPrivateSound}
                    onChange={(e) => {
                      const sId = e.target.value as PrivateSoundId;
                      setSelectedPrivateSound(sId);
                      sounds.setPrivateSound(sId);
                      sounds.previewPrivateSound(sId);
                      showToast('تم حفظ نغمة الرسائل الخاصة 💬', 'success');
                    }}
                    className="w-full p-2 border border-indigo-300 rounded-lg text-xs bg-white text-slate-800 font-semibold outline-none focus:border-indigo-600"
                  >
                    {PRIVATE_SOUND_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.icon} {opt.label} - {opt.desc}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Mention / @username Sound */}
                <div className="space-y-1.5 p-2 bg-rose-50/70 border border-rose-200 rounded-lg">
                  <div className="flex items-center justify-between text-[11px] font-bold text-rose-950">
                    <span className="flex items-center gap-1">
                      <span>🔔</span>
                      <span>نغمة الإشارة والمنشن (@اسمك):</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => sounds.previewMentionSound(selectedMentionSound)}
                      className="px-2 py-0.5 rounded bg-rose-200 hover:bg-rose-300 text-rose-900 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      title="تجربة نغمة الإشارة بالاسم"
                    >
                      <Play className="w-2.5 h-2.5 fill-current" />
                      <span>استماع</span>
                    </button>
                  </div>
                  <select
                    value={selectedMentionSound}
                    onChange={(e) => {
                      const sId = e.target.value as MentionSoundId;
                      setSelectedMentionSound(sId);
                      sounds.setMentionSound(sId);
                      sounds.previewMentionSound(sId);
                      showToast('تم حفظ نغمة الإشارة @ بالاسم 🔔', 'success');
                    }}
                    className="w-full p-2 border border-rose-300 rounded-lg text-xs bg-white text-slate-800 font-semibold outline-none focus:border-rose-600"
                  >
                    {MENTION_SOUND_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.icon} {opt.label} - {opt.desc}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Room General Message Sound */}
                <div className="space-y-1.5 pt-1 border-t border-slate-200">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                    <span>رسائل الغرفة العامة:</span>
                    <button
                      type="button"
                      onClick={() => sounds.previewMessageSound(selectedMsgSound)}
                      className="px-2 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      title="تجربة النغمة المختارة"
                    >
                      <Play className="w-2.5 h-2.5 fill-current" />
                      <span>استماع</span>
                    </button>
                  </div>
                  <select
                    value={selectedMsgSound}
                    onChange={(e) => {
                      const sId = e.target.value as MessageSoundId;
                      setSelectedMsgSound(sId);
                      sounds.setMessageSound(sId);
                      sounds.previewMessageSound(sId);
                      showToast('تم حفظ نغمة رسائل الغرفة 🔔', 'success');
                    }}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 font-semibold outline-none focus:border-amber-600"
                  >
                    {MESSAGE_SOUND_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.icon} {opt.label} - {opt.desc}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 5. Member Entry Sound */}
                <div className="space-y-1.5 pt-1 border-t border-slate-200">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                    <span>صوت دخول الأعضاء إلى الغرفة:</span>
                    <button
                      type="button"
                      onClick={() => sounds.previewJoinSound(selectedJoinSound)}
                      className="px-2 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      title="تجربة نغمة الدخول"
                    >
                      <Play className="w-2.5 h-2.5 fill-current" />
                      <span>استماع</span>
                    </button>
                  </div>
                  <select
                    value={selectedJoinSound}
                    onChange={(e) => {
                      const sId = e.target.value as JoinSoundId;
                      setSelectedJoinSound(sId);
                      sounds.setJoinSound(sId);
                      sounds.previewJoinSound(sId);
                      showToast('تم حفظ نغمة دخول الأعضاء بنجاح', 'success');
                    }}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 font-semibold outline-none focus:border-amber-600"
                  >
                    {JOIN_SOUND_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.icon} {opt.label} - {opt.desc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Ignored Users Management List (إدارة قائمة الأعضاء المتجاهلين) */}
              <div className="p-3 border rounded-xl bg-slate-50 space-y-2.5">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                    <UserX className="w-4 h-4 text-rose-600" />
                    <span>قائمة الأعضاء المتجاهلين ({ignoredUsers.length})</span>
                  </div>
                  {ignoredUsers.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setIgnoredUsers([]);
                        try { localStorage.removeItem('soqoor_ignored_users'); } catch {}
                        showToast('تم إفراغ قائمة التجاهل بالكامل ✔️', 'info');
                      }}
                      className="text-[10px] text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
                    >
                      إلغاء تجاهل الكل
                    </button>
                  )}
                </div>

                {ignoredUsers.length === 0 ? (
                  <div className="text-[11px] text-slate-500 py-1 text-center">
                    لا يوجد أعضاء متجاهلون حالياً. لتجاهل أي شخص اضغط على اسمه في الدردشة ثم اختر <strong>🚫 تجاهل</strong>.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-0.5">
                    {ignoredUsers.map((username) => (
                      <div
                        key={username}
                        className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-xs"
                      >
                        <span className="font-bold text-slate-800 truncate">{username}</span>
                        <button
                          type="button"
                          onClick={() => toggleIgnoreUser(username)}
                          className="px-2 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold transition-colors cursor-pointer"
                        >
                          إلغاء التجاهل ✔️
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Change Password Form (Screenshot 5: تغيير كلمة المرور) */}
              <button
                onClick={() => {
                  openAppPrompt(
                    'تغيير كلمة المرور',
                    'أدخل كلمة المرور الجديدة لحسابك (3 أحرف على الأقل):',
                    '',
                    (newP) => {
                      if (newP && newP.trim().length >= 3) {
                        setSettingPassword(newP.trim());
                        socket?.emit('updateProfile', { password: newP.trim() });
                        showToast('تم تغيير كلمة المرور بنجاح 🔒', 'success');
                      } else if (newP.trim().length > 0) {
                        showToast('يجب أن تتكون كلمة المرور من 3 أحرف على الأقل', 'error');
                      }
                    },
                    'كلمة المرور الجديدة',
                    'password'
                  );
                }}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded border flex items-center justify-center gap-1.5"
              >
                <Key className="w-3.5 h-3.5" />
                <span>تغيير كلمة المرور</span>
              </button>

              {/* Current Role Badge & Tester */}
              <div className="p-2.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs">رتبتك وصلاحياتك:</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getRoleBadge(currentUser.role).badgeClass}`}>
                    {getRoleBadge(currentUser.role).short}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 leading-tight">
                  {getRoleBadge(currentUser.role).description}
                </div>
                {/* Switcher to test all roles */}
                <div className="pt-1.5 border-t border-amber-200/60">
                  <div className="text-[10px] font-bold text-amber-900 mb-1">تبديل الرتبة للاختبار والتجربة الفورية:</div>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      type="button"
                      onClick={() => handleAdminAction('updateRole', currentUser.username, 'admin')}
                      className={`py-1 rounded font-bold text-[10px] transition-all cursor-pointer ${
                        currentUser.role === 'admin'
                          ? 'bg-red-600 text-white shadow-xs'
                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-red-50'
                      }`}
                    >
                      👑 Admin
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAdminAction('updateRole', currentUser.username, 'super')}
                      className={`py-1 rounded font-bold text-[10px] transition-all cursor-pointer ${
                        currentUser.role === 'super'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-amber-50'
                      }`}
                    >
                      🛡️ Super
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAdminAction('updateRole', currentUser.username, 'member')}
                      className={`py-1 rounded font-bold text-[10px] transition-all cursor-pointer ${
                        currentUser.role === 'member'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-indigo-50'
                      }`}
                    >
                      🎖️ Member
                    </button>
                  </div>
                </div>
              </div>

              {/* Control Panel Button (For Admin/Super/Delegated Staff) */}
              {(currentUser.role === 'admin' || currentUser.role === 'super' || hasUserPermission(currentUser, 'canAccessControlPanel') || getRoleLevel(currentUser.role) >= 75) && (
                <button
                  onClick={() => {
                    socket?.emit('getMonitorLogs');
                    setActiveDrawer('monitor');
                  }}
                  className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-black rounded shadow flex items-center justify-center gap-1.5"
                >
                  <Shield className="w-4 h-4" />
                  <span>★ لوحة التحكم وفلتر المراقبة</span>
                </button>
              )}

              {/* Logout Button (Screenshot 6: تسجيل خروج) */}
              <button
                onClick={handleExitChat}
                className="w-full py-2.5 bg-[#dc2626] hover:bg-red-700 text-white font-black rounded-xl shadow flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>تسجيل خروج ومسح المحادثات</span>
              </button>
            </div>
          </div>
        )}

        {/* 7. MEMBER PROFILE MODAL (Matching Screenshots 10 & 11) */}
        {activeDrawer === 'profile' && profileTargetUser && (
          <div className={`fixed sm:absolute inset-y-0 right-0 w-full sm:w-[86%] sm:max-w-md h-full ${curTheme.drawerBg} text-slate-100 z-40 shadow-2xl border-l ${curTheme.cardBorder} flex flex-col min-h-0 overflow-hidden animate-in slide-in-from-right duration-200 text-right box-border`}>
            {/* Header bar with user's name decoration and Close button [ ✖ ] */}
            <div className={`shrink-0 ${curTheme.drawerHeaderBg || curTheme.headerBg} ${curTheme.accentText} pt-[max(0.625rem,env(safe-area-inset-top))] px-3 py-2.5 flex items-center justify-between border-b ${curTheme.headerBorder}`}>
              <span className="font-bold text-sm truncate max-w-[200px]">{profileTargetUser.username}</span>
              <button
                type="button"
                onClick={() => setActiveDrawer('none')}
                className="w-8 h-8 shrink-0 bg-red-600 hover:bg-red-700 active:scale-95 text-white flex items-center justify-center rounded-lg font-bold shadow-md cursor-pointer transition-all"
                title="إغلاق الملف الشخصي"
              >
                <X className="w-4 h-4 stroke-[3]" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden modal-scroll-container overscroll-contain max-w-full box-border">
              {/* Cover with Rose Pattern Background (Screenshots 10 & 11) */}
              <div className="relative bg-gradient-to-b from-slate-200 to-white p-3 sm:p-4 border-b text-center max-w-full overflow-hidden">
                <div className="relative inline-block mb-2">
                  <img
                    src={profileTargetUser.avatarUrl || falconIcon}
                    alt={profileTargetUser.username}
                    className="w-20 h-20 rounded-full border-2 border-amber-500 shadow-md object-cover"
                  />
                  {profileTargetUser.isVoice && (
                    <span className="absolute bottom-0 left-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white" />
                  )}
                </div>

                <div className="font-bold text-base text-slate-900 flex flex-col items-center justify-center gap-1.5 max-w-full px-1">
                  {profileTargetUser.nameBannerUrl ? (
                    <div className="flex flex-col items-center gap-1 max-w-full">
                      <img
                        src={profileTargetUser.nameBannerUrl}
                        alt={profileTargetUser.username}
                        title={profileTargetUser.username}
                        className="h-8 max-h-[38px] max-w-[240px] sm:max-w-[260px] w-auto object-contain drop-shadow-md rounded"
                      />
                      <span className="text-[11px] text-slate-600 font-bold">({profileTargetUser.username})</span>
                    </div>
                  ) : (
                    <span className="text-slate-900 font-black truncate max-w-full">{profileTargetUser.username}</span>
                  )}

                  <div className="flex items-center justify-center gap-1.5 flex-wrap max-w-full">
                    {profileTargetUser.giftBadges && profileTargetUser.giftBadges.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 rounded-full border border-amber-300 shadow-2xs">
                        {profileTargetUser.giftBadges.map((badgeUrl, bIdx) => (
                          <img
                            key={bIdx}
                            src={badgeUrl}
                            alt="وسام"
                            title="وسام شرفي وهدية تكريمية"
                            className="w-5 h-5 object-contain inline-block drop-shadow-xs"
                          />
                        ))}
                      </span>
                    )}

                    <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                      <span>{profileTargetUser.flag}</span>
                      {getCountryNameFromFlag(profileTargetUser.flag) && (
                        <span className="font-bold">{getCountryNameFromFlag(profileTargetUser.flag)}</span>
                      )}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-slate-600 mt-0.5 line-clamp-2 px-2">{profileTargetUser.statusQuote}</div>

                {/* Target Role Badge */}
                <div className="flex items-center justify-center gap-1.5 my-1.5">
                  <span className={`px-2.5 py-0.5 rounded text-xs font-bold shadow-xs ${getRoleBadge(profileTargetUser.role).badgeClass}`}>
                    {getRoleBadge(profileTargetUser.role).title}
                  </span>
                </div>

                {/* 4. Golden Stars Engagement Progression System (نظام التفاعل والنجوم الذهبية) */}
                {(() => {
                  const eng = profileTargetUser.engagement || {
                    activeTimeMinutes: Math.floor((profileTargetUser.likes || 0) / 10),
                    messagesSent: Math.floor((profileTargetUser.points || 0) / 50),
                    wallPostsCount: 2,
                    micTimeMinutes: 5,
                    starsLevel: Math.min(5, Math.max(0.5, ((profileTargetUser.likes || 0) + (profileTargetUser.points || 0) / 100) / 300)),
                    progressPercent: 65
                  };
                  const currentLevel = typeof eng.starsLevel === 'number' ? eng.starsLevel : 0;
                  const progressPct = typeof eng.progressPercent === 'number' ? eng.progressPercent : 50;

                  return (
                    <div className="my-2 p-2.5 bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-xl space-y-1.5 shadow-xs max-w-full">
                      <div className="flex items-center justify-between text-[11px] font-bold text-amber-900">
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                          <span>رتبة التفاعل والنشاط:</span>
                        </span>
                        <span className="bg-amber-500 text-slate-950 px-2 py-0.2 rounded-full text-[10px] font-black">
                          {currentLevel.toFixed(1)} / 5.0 ⭐
                        </span>
                      </div>

                      {/* 5 Golden Stars Bar: Gray at start, fills gradually with shimmering gold */}
                      <div className="flex items-center justify-center gap-1.5 py-1">
                        {[1, 2, 3, 4, 5].map((starIdx) => {
                          const isFullyFilled = currentLevel >= starIdx;
                          const isPartiallyFilled = !isFullyFilled && currentLevel > starIdx - 1;
                          const fillRatio = isPartiallyFilled ? Math.round((currentLevel - (starIdx - 1)) * 100) : isFullyFilled ? 100 : 0;

                          return (
                            <div key={starIdx} className="relative flex items-center justify-center group" title={`نجمة التفاعل ${starIdx} (${fillRatio}%)`}>
                              {/* Background empty gray star */}
                              <Star className="w-5 h-5 text-slate-300 fill-slate-200/60" />

                              {/* Foreground gold filled star with clip-path or overlay */}
                              {fillRatio > 0 && (
                                <div
                                  className="absolute inset-0 overflow-hidden"
                                  style={{ width: `${fillRatio}%` }}
                                >
                                  <Star className="w-5 h-5 text-amber-500 fill-amber-400 drop-shadow-xs gold-star-glow" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Progress Bar to next star */}
                      <div className="space-y-1">
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden shadow-inner">
                          <div
                            className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, Math.max(5, progressPct))}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[9px] text-slate-500 font-medium px-0.5">
                          <span>التقدم نحو النجمة التالية: {progressPct}%</span>
                          <span>المستوى {Math.min(5, Math.floor(currentLevel) + 1)}</span>
                        </div>
                      </div>

                      {/* Engagement Metrics Chips */}
                      <div className="grid grid-cols-2 gap-1 pt-1 text-[10px] text-slate-600 font-semibold text-center w-full">
                        <span className="bg-white/80 border border-slate-200 rounded px-1 py-0.5 truncate" title="دقائق التواجد النشط في الشات">
                          ⏱️ التواجد: {eng.activeTimeMinutes || 0} د
                        </span>
                        <span className="bg-white/80 border border-slate-200 rounded px-1 py-0.5 truncate" title="عدد الرسائل المرسلة">
                          💬 الرسائل: {eng.messagesSent || 0}
                        </span>
                        <span className="bg-white/80 border border-slate-200 rounded px-1 py-0.5 truncate" title="المنشورات والخواطر على الحائط">
                          📝 الحائط: {eng.wallPostsCount || 0}
                        </span>
                        <span className="bg-white/80 border border-slate-200 rounded px-1 py-0.5 truncate" title="دقائق التحدث أو الصعود على المايك">
                          🎙️ المايك: {eng.micTimeMinutes || 0} د
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Points & Stats Banner */}
                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs font-bold text-slate-700 max-w-full px-1">
                  <span className="text-rose-600 flex items-center gap-1 shrink-0">
                    <Heart className="w-3.5 h-3.5 fill-rose-600" />
                    {profileTargetUser.likes} لايك
                  </span>
                  {(!profileTargetUser.room || profileTargetUser.room === 'خارج الغرف' || profileTargetUser.room.trim() === '') ? (
                    <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs shrink-0">
                      <span>التواجد:</span>
                      <span>في بهو الشات 📋</span>
                    </span>
                  ) : (
                    <span className="text-slate-700 font-bold bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs max-w-[170px] truncate shrink-0">
                      <span>الغرفة:</span>
                      <span className="text-indigo-700 font-black truncate">{profileTargetUser.room}</span>
                    </span>
                  )}
                  <span className="text-indigo-600 font-mono shrink-0">{(profileTargetUser.points ?? 0).toLocaleString('en-US')} نقطة</span>
                </div>
              </div>

              {/* Universal Like Profile Button */}
              {currentUser && currentUser.username !== profileTargetUser.username && (
                <div className="px-3 pt-3">
                  <button
                    type="button"
                    onClick={() => handleLikeUserProfile(profileTargetUser.username)}
                    className="w-full py-2.5 px-3 bg-gradient-to-r from-rose-500 via-pink-600 to-rose-500 hover:from-rose-600 hover:to-pink-700 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 group"
                  >
                    <Heart className="w-4 h-4 fill-white animate-pulse group-hover:scale-125 transition-transform" />
                    <span>إعجاب بالملف الشخصي ❤️ (+1 لايك • مرة بالدقيقة)</span>
                  </button>
                </div>
              )}

              {/* ACTION BUTTONS & FORMS GOVERNED BY ROLE PERMISSIONS */}
              <div className="p-3 space-y-3 max-w-full box-border">
                
                {/* DYNAMIC ROLE PERMISSIONS & STRICT HIERARCHY PROFILE SUITE */}
                {(() => {
                  const isSelf = profileTargetUser.username.trim().toLowerCase() === currentUser.username.trim().toLowerCase();
                  const actorLevel = getRoleLevel(currentUser.role);
                  const targetLevel = getRoleLevel(profileTargetUser.role);
                  const isViewerAdmin = currentUser.role === 'hassan' || currentUser.role === 'admin' || actorLevel >= getRoleLevel('admin');
                  const isTargetProtected = currentUser.role !== 'hassan' && !isSelf && targetLevel >= actorLevel;

                  // Permissions held by viewer
                  const canKick = isViewerAdmin || Boolean(hasUserPermission(currentUser, 'canKick'));
                  const canMute = isViewerAdmin || Boolean(hasUserPermission(currentUser, 'canMute') || hasUserPermission(currentUser, 'canMuteText'));
                  const canBan = isViewerAdmin || Boolean(hasUserPermission(currentUser, 'canBan'));
                  const canWarn = isViewerAdmin || Boolean(hasUserPermission(currentUser, 'canWarn'));
                  const canDeleteAvatar = isViewerAdmin || Boolean(hasUserPermission(currentUser, 'canDeleteAvatar'));
                  const canJail = isViewerAdmin || Boolean(hasUserPermission(currentUser, 'canJail'));
                  const canPullMic = isViewerAdmin || Boolean(hasUserPermission(currentUser, 'canPullMic'));
                  const canRevealNicks = isViewerAdmin || Boolean(hasUserPermission(currentUser, 'canRevealNicks'));
                  const canEditProfile = isViewerAdmin || Boolean(hasUserPermission(currentUser, 'canEditMemberProfile'));
                  const canEditLikes = isViewerAdmin || Boolean(hasUserPermission(currentUser, 'canEditLikes'));
                  const canEditPoints = isViewerAdmin || Boolean(hasUserPermission(currentUser, 'canEditPoints'));
                  const canChangeRoles = isViewerAdmin || Boolean(hasUserPermission(currentUser, 'canChangeRoles'));
                  const canChangePassword = isViewerAdmin || Boolean(hasUserPermission(currentUser, 'canChangeMemberPassword'));
                  const canMoveUsers = isViewerAdmin || Boolean(hasUserPermission(currentUser, 'canMoveUsers'));
                  const canAssignBanner = isViewerAdmin || Boolean(hasUserPermission(currentUser, 'canAssignBanner') || hasUserPermission(currentUser, 'canAssignBanners'));

                  const hasAnyModPower = canKick || canMute || canBan || canWarn || canDeleteAvatar || canJail || canPullMic || canEditProfile || canEditLikes || canEditPoints || canChangeRoles || canChangePassword || canMoveUsers;

                  return (
                    <div className="space-y-3">
                      {/* Received Gifts & Companion Badge Selection (معرض الهدايا التكريمية واختيار الهدية المرافقة للاسم) */}
                      {profileTargetUser.giftBadges && profileTargetUser.giftBadges.length > 0 && (
                        <div className="p-2.5 sm:p-3 bg-gradient-to-b from-amber-500/10 to-amber-500/5 border border-amber-400/40 rounded-xl space-y-2 text-right">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-amber-900 flex items-center gap-1.5">
                              <Gift className="w-4 h-4 text-amber-600" />
                              <span>الهدايا التكريمية المستلمة ({profileTargetUser.giftBadges.length}):</span>
                            </span>
                            <span className="text-[10px] text-amber-700 font-medium">
                              {isSelf ? 'انقر على أي هدية لتثبيتها كمرافقة لاسمك ✨' : 'هدايا تم إهداؤها لهذا العضو 🎁'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                            {profileTargetUser.giftBadges.map((badgeUrl, bIdx) => {
                              const isActiveCompanion = bIdx === 0;
                              return (
                                <div
                                  key={bIdx}
                                  onClick={() => {
                                    if (isSelf || isViewerAdmin) {
                                      socket?.emit('setActiveMemberGift', {
                                        username: profileTargetUser.username,
                                        giftUrl: badgeUrl
                                      });
                                      showToast('تم تحديد وتثبيت الهدية المرافقة لاسمك بنجاح ✨', 'success');
                                    }
                                  }}
                                  className={`relative p-1.5 rounded-xl border flex flex-col items-center justify-center shrink-0 cursor-pointer transition-all ${
                                    isActiveCompanion
                                      ? 'bg-amber-100 border-amber-500 ring-2 ring-amber-400/60 shadow-sm scale-105'
                                      : 'bg-white/80 border-slate-200 hover:border-amber-300 hover:bg-amber-50/50'
                                  }`}
                                  title={isActiveCompanion ? 'الهدية النشطة المرافقة للاسم حالياً' : (isSelf || isViewerAdmin ? 'انقر لتفعيل هذه الهدية كمرافقة للاسم' : 'هدية تكريمية')}
                                >
                                  <img
                                    src={badgeUrl}
                                    alt="هدية"
                                    className="w-8 h-8 object-contain drop-shadow-xs"
                                  />
                                  {isActiveCompanion && (
                                    <span className="mt-1 text-[8px] font-black text-amber-900 bg-amber-300 px-1 rounded-full">
                                      مرافقة للاسم ✓
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Social Actions (Available for all members) */}
                      <div className="space-y-1.5">
                        <div className="text-xs font-bold text-slate-700">تفاعل اجتماعي:</div>
                        <div className="grid grid-cols-3 gap-1.5 text-[10.5px] sm:text-xs font-bold text-center w-full min-w-0">
                          <button
                            onClick={() => {
                              setSelectedPmUser(profileTargetUser);
                              setActiveDrawer('pm');
                            }}
                            className="p-2 sm:p-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 border flex items-center justify-center gap-1 text-slate-800 cursor-pointer min-w-0 truncate"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span className="truncate">💬 خاص</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              insertMention(profileTargetUser.username);
                              setActiveDrawer('none');
                              showToast(`تمت إضافة منشن @${profileTargetUser.username} لحقل الكتابة 🔔`, 'info');
                            }}
                            className="p-2 sm:p-2.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 flex items-center justify-center gap-1 text-amber-900 font-bold cursor-pointer min-w-0 truncate"
                          >
                            <AtSign className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span className="truncate">🔔 منشن</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleLikeUserProfile(profileTargetUser.username)}
                            className="p-2 sm:p-2.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center justify-center gap-1 text-rose-600 font-black cursor-pointer min-w-0 truncate"
                          >
                            <Heart className="w-3.5 h-3.5 fill-rose-600 shrink-0" />
                            <span className="truncate">❤️ لايك</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setGiftModalTarget(profileTargetUser);
                              const gifts = emblemsConfig.items.filter((i) => i.type === 'gift');
                              const fallback = DEFAULT_EMBLEMS.filter((i) => i.type === 'gift');
                              const firstGift = gifts[0] || fallback[0];
                              if (firstGift) setSelectedGiftId(firstGift.id);
                            }}
                            className="p-2 sm:p-2.5 rounded-lg bg-gradient-to-r from-amber-500/15 via-yellow-500/20 to-amber-500/15 hover:from-amber-500/25 hover:to-amber-500/25 border-2 border-amber-400 flex items-center justify-center gap-1 text-amber-900 font-black cursor-pointer min-w-0 truncate shadow-2xs active:scale-95 transition-all"
                            title="إهداء هدية فاخرة وتثبيتها مرافقة للاسم"
                          >
                            <Gift className="w-3.5 h-3.5 shrink-0 text-amber-600 animate-bounce" />
                            <span className="truncate">💎 إهداء هدية</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const targetUName = profileTargetUser.username;
                              setUserFriends((prev) => {
                                const exists = prev.some((f) => f.toLowerCase() === targetUName.toLowerCase());
                                const next = exists ? prev.filter((f) => f.toLowerCase() !== targetUName.toLowerCase()) : [...prev, targetUName];
                                try {
                                  localStorage.setItem('user_friends_list', JSON.stringify(next));
                                } catch (e) {}
                                socket?.emit('updateFriendsList', { friends: next });
                                showToast(exists ? `تمت إزالة [${targetUName}] من قائمة أصدقائك.` : `تمت إضافة [${targetUName}] لقائمة أصدقائك المقربين VIP ⭐`, 'success');
                                return next;
                              });
                            }}
                            className={`p-2 sm:p-2.5 rounded-lg border flex items-center justify-center gap-1 cursor-pointer min-w-0 truncate font-bold text-xs ${
                              isUserFriend(profileTargetUser.username)
                                ? 'bg-amber-500 text-black border-amber-400 shadow-sm'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                            }`}
                          >
                            <span className="truncate">{isUserFriend(profileTargetUser.username) ? '⭐ صديق VIP' : '⭐ إضافة صديق'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              socket?.emit('chatMessage', { text: `💌 أرسل [${currentUser.username}] بطاقة تحية ومودة إلى [${profileTargetUser.username}] 🌹` });
                              showToast(`تم إرسال بطاقة تحية ومودة إلى ${profileTargetUser.username} 💌`, 'success');
                            }}
                            className="p-2 sm:p-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 border flex items-center justify-center gap-1 text-slate-800 cursor-pointer min-w-0 truncate"
                          >
                            <span className="truncate">✉ تحية</span>
                          </button>

                          {/* Reveal Nicks */}
                          {canRevealNicks ? (
                            <button
                              type="button"
                              onClick={() => {
                                socket?.emit('revealNicks', { targetUsername: profileTargetUser.username });
                              }}
                              className="p-2 sm:p-2.5 rounded-lg bg-amber-100 hover:bg-amber-200 border border-amber-400 font-bold flex items-center justify-center gap-1 text-amber-950 cursor-pointer min-w-0 truncate"
                              title="كشف النكات وعنوان الآي بي والجهاز"
                            >
                              <span className="truncate">🔍 كشف النكات</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => showToast(`المعلومات: مسجل بحسان برو • الدولة: ${profileTargetUser.flag} • الحالة: ${profileTargetUser.statusQuote || 'عضو مميز'}`, 'info')}
                              className="p-2 sm:p-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 border flex items-center justify-center gap-1 text-slate-800 cursor-pointer min-w-0 truncate"
                            >
                              <span className="truncate">🔍 معلومات</span>
                            </button>
                          )}

                          {/* Ignore / Unignore */}
                          {!isSelf && (
                            <button
                              type="button"
                              onClick={() => toggleIgnoreUser(profileTargetUser.username)}
                              className={`p-2 sm:p-2.5 rounded-lg border flex items-center justify-center gap-1 font-bold transition-all cursor-pointer min-w-0 truncate ${
                                isUserIgnored(profileTargetUser.username)
                                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300'
                              }`}
                              title={isUserIgnored(profileTargetUser.username) ? 'إلغاء تجاهل العضو' : 'تجاهل العضو ومنع ظهور رسائله'}
                            >
                              <UserX className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{isUserIgnored(profileTargetUser.username) ? 'إلغاء التجاهل' : '🚫 تجاهل'}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Hierarchy Protection Banner */}
                      {isTargetProtected && (
                        <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-950 text-xs flex items-start gap-2 shadow-xs">
                          <Shield className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <strong className="block mb-0.5 font-bold">
                              رتبة محمية بنظام التدرج الإداري ({getRoleBadge(profileTargetUser.role).title}):
                            </strong>
                            لا تملك صلاحية تعديل بيانات أو معاقبة رتبة مساوية أو أعلى منك (مستوى رتبتك: #{actorLevel} • مستوى المستهدف: #{targetLevel}). الإجراءات متاحة فقط لمن هم أقل منك رتبة.
                          </div>
                        </div>
                      )}

                      {/* Moderation Actions Grid (Shown only if actor has permissions AND target is NOT protected by hierarchy) */}
                      {hasAnyModPower && !isTargetProtected && (
                        <div className="space-y-3 pt-2 border-t">
                          <div className="font-bold text-xs text-slate-800 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <ShieldCheck className="w-4 h-4 text-indigo-600" />
                              <span>إجراءات الإشراف والضبط (وفق صلاحيات رتبتك):</span>
                            </span>
                            <span className="text-[10px] text-indigo-700 font-bold bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                              {getRoleBadge(currentUser.role).short} (#{actorLevel})
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-1.5 text-[10.5px] sm:text-xs font-bold text-center w-full min-w-0">
                            {/* Warn */}
                            {canWarn && (
                              <button
                                type="button"
                                onClick={() => {
                                  setWarningModalTarget(profileTargetUser);
                                  setCustomWarningText('');
                                }}
                                className="p-2 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 flex items-center justify-center gap-1 font-bold cursor-pointer min-w-0 truncate"
                              >
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span className="truncate">✉ تنبيه</span>
                              </button>
                            )}

                            {/* Delete Avatar */}
                            {canDeleteAvatar && (
                              <button
                                type="button"
                                onClick={() => {
                                  handleAdminAction('deleteAvatar', profileTargetUser.username);
                                  setProfileTargetUser((prev) => prev ? { ...prev, avatarUrl: undefined } : null);
                                }}
                                className="p-2 rounded-lg bg-slate-100 hover:bg-rose-50 border text-rose-600 flex items-center justify-center gap-1 font-bold cursor-pointer min-w-0 truncate"
                              >
                                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">🚫 حذف الصورة</span>
                              </button>
                            )}

                            {/* Mute / Unmute */}
                            {canMute && (
                              <button
                                type="button"
                                onClick={() => handleAdminAction('mute', profileTargetUser.username)}
                                className={`p-2 rounded-lg border flex items-center justify-center gap-1 min-w-0 truncate ${
                                  profileTargetUser.isTextMuted
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                    : 'bg-slate-100 hover:bg-slate-200 text-rose-600'
                                }`}
                              >
                                <VolumeX className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">{profileTargetUser.isTextMuted ? 'إلغاء الإسكات' : '🚫 إسكات'}</span>
                              </button>
                            )}

                            {/* Kick */}
                            {canKick && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const targetName = profileTargetUser.username;
                                    openAppPrompt(
                                      'طرد من الشات',
                                      `أدخل سبب طرد [${targetName}] من الشات:`,
                                      '',
                                      (r) => {
                                        handleAdminAction('kick', targetName, undefined, r.trim() || 'مخالفة القوانين');
                                      },
                                      'سبب الطرد...'
                                    );
                                  }}
                                  className="p-2 rounded-lg bg-rose-100 hover:bg-rose-200 border border-rose-300 text-rose-700 flex items-center justify-center gap-1 min-w-0 truncate"
                                >
                                  <UserX className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate">🚫 طرد</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    const targetName = profileTargetUser.username;
                                    openAppPrompt(
                                      'طرد مؤقت',
                                      `مدة الطرد المؤقت بالدقائق للعضو [${targetName}] (مثال: 15):`,
                                      '15',
                                      (mins) => {
                                        if (mins && mins.trim()) {
                                          handleAdminAction('kick', targetName, undefined, `طرد مؤقت ${mins.trim()} دقيقة`);
                                        }
                                      },
                                      '15',
                                      'number'
                                    );
                                  }}
                                  className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 border text-slate-800 flex items-center justify-center gap-1 min-w-0 truncate"
                                >
                                  <span className="truncate">⏰ طرد مؤقت</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleAdminAction('kick', profileTargetUser.username, undefined, 'طرد من الغرفة')}
                                  className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center gap-1 cursor-pointer min-w-0 truncate"
                                >
                                  <span className="truncate">👤 طرد من الغرفة</span>
                                </button>
                              </>
                            )}

                            {/* Jail User */}
                            {canJail && (
                              <button
                                type="button"
                                onClick={() => {
                                  const targetName = profileTargetUser.username;
                                  openAppPrompt(
                                    'سجن العضو',
                                    `سبب سجن [${targetName}] وحجزه:`,
                                    '',
                                    (reason) => {
                                      handleAdminAction('jailUser', targetName, undefined, reason.trim() || 'سجن إداري');
                                    },
                                    'سبب السجن...'
                                  );
                                }}
                                className="p-2 rounded-lg bg-amber-900/10 hover:bg-amber-900/20 border border-amber-800/30 text-amber-950 flex items-center justify-center gap-1 font-bold cursor-pointer min-w-0 truncate"
                              >
                                <Lock className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">🔒 سجن العضو</span>
                              </button>
                            )}

                            {/* Ban & Temp Ban */}
                            {canBan && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const targetName = profileTargetUser.username;
                                    openAppPrompt(
                                      'باند مؤقت',
                                      `مدة الباند المؤقت بالدقائق للعضو [${targetName}] (مثال: 30):`,
                                      '30',
                                      (mins) => {
                                        if (mins && mins.trim()) {
                                          handleAdminAction('kick', targetName, undefined, `باند مؤقت ${mins.trim()} دقيقة`);
                                        }
                                      },
                                      '30',
                                      'number'
                                    );
                                  }}
                                  className="p-2 rounded-lg bg-slate-100 border text-slate-800 flex items-center justify-center gap-1 min-w-0 truncate"
                                >
                                  <span className="truncate">⏰ باند مؤقت</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    const targetName = profileTargetUser.username;
                                    openAppConfirm(
                                      'فرض باند دائم',
                                      `هل أنت متأكد من فرض باند دائم على [${targetName}]؟`,
                                      () => {
                                        handleAdminAction('ban', targetName);
                                      }
                                    );
                                  }}
                                  className="p-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold flex items-center justify-center gap-1 min-w-0 truncate"
                                >
                                  <span className="truncate">🚫 باند دائم</span>
                                </button>
                              </>
                            )}

                            {/* Banner Button */}
                            {canAssignBanner && (
                              <button
                                type="button"
                                onClick={() => {
                                  setBannerPickerTargetUser(profileTargetUser);
                                  setCustomBannerUrlInput(profileTargetUser.nameBannerUrl || '');
                                  setShowBannerPickerModal(true);
                                }}
                                className="p-2 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-bold flex items-center justify-center gap-1 cursor-pointer min-w-0 truncate"
                                title="تعيين وتثبيت البنر المصور للعضو (500x50)"
                              >
                                <Palette className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span className="truncate">★ البنر</span>
                              </button>
                            )}

                            {/* Pull Mic */}
                            {canPullMic && profileTargetUser.micSlot !== null && (
                              <button
                                type="button"
                                onClick={() => handleAdminAction('pullMic', profileTargetUser.username)}
                                className="col-span-3 p-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-black flex items-center justify-center gap-1 shadow-xs"
                              >
                                <MicOff className="w-4 h-4 shrink-0" />
                                <span className="truncate">🎙️ سحب المايك من {profileTargetUser.username} فوراً</span>
                              </button>
                            )}
                          </div>

                          {/* Data Editing Section */}
                          <div className="pt-2 border-t space-y-2.5 text-xs w-full min-w-0">
                            <div className="font-bold text-slate-800 text-xs">تعديل بيانات وملف العضو:</div>

                            {/* تعديل الزخرفة / الاسم */}
                            {canEditProfile && (
                              <div className="flex flex-wrap sm:flex-nowrap gap-1.5 items-center w-full min-w-0">
                                <span className="w-14 shrink-0 font-black text-slate-800 text-xs">الزخرفة:</span>
                                <input
                                  type="text"
                                  value={profileEditName}
                                  onChange={(e) => setProfileEditName(e.target.value)}
                                  className="flex-1 min-w-0 p-2 border-2 border-slate-300 rounded-lg text-xs font-bold text-slate-950 bg-white placeholder-slate-400 outline-none focus:border-amber-500"
                                  placeholder="اسم / زخرفة العضو"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleAdminAction('updateUsername', profileTargetUser.username, profileEditName)}
                                  className="shrink-0 px-3 py-2 bg-[#2a241e] text-amber-200 font-bold rounded-lg cursor-pointer"
                                >
                                  تغيير
                                </button>
                              </div>
                            )}

                            {/* تعديل الحالة / الاقتباس */}
                            {canEditProfile && (
                              <div className="flex flex-wrap sm:flex-nowrap gap-1.5 items-center w-full min-w-0">
                                <span className="w-14 shrink-0 font-black text-slate-800 text-xs">الحالة:</span>
                                <input
                                  type="text"
                                  value={profileEditQuote}
                                  onChange={(e) => setProfileEditQuote(e.target.value)}
                                  className="flex-1 min-w-0 p-2 border-2 border-slate-300 rounded-lg text-xs font-bold text-slate-950 bg-white placeholder-slate-400 outline-none focus:border-amber-500"
                                  placeholder="حالة العضو..."
                                />
                                <button
                                  type="button"
                                  onClick={() => handleAdminAction('updateQuote', profileTargetUser.username, profileEditQuote)}
                                  className="shrink-0 px-3 py-2 bg-[#48a942] text-white font-bold rounded-lg cursor-pointer"
                                >
                                  ✔ حفظ
                                </button>
                              </div>
                            )}

                            {/* تعديل الصورة الشخصية */}
                            {canEditProfile && (
                              <div className="flex flex-wrap sm:flex-nowrap gap-1.5 items-center w-full min-w-0">
                                <span className="w-14 shrink-0 font-black text-slate-800 text-xs">الصورة📷:</span>
                                <input
                                  type="text"
                                  value={profileTargetUser.avatarUrl || ''}
                                  onChange={(e) => setProfileTargetUser({ ...profileTargetUser, avatarUrl: e.target.value })}
                                  className="flex-1 min-w-0 p-2 border-2 border-slate-300 rounded-lg text-xs font-bold text-slate-950 bg-white truncate outline-none focus:border-amber-500"
                                  placeholder="رابط الصورة أو اختر ملف"
                                />
                                <div className="flex items-center gap-1 shrink-0">
                                  <label className="px-2.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg cursor-pointer text-xs">
                                    رفع
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) =>
                                        handleFileUpload(e, (dataUrl) => {
                                          handleAdminAction('updateAvatar', profileTargetUser.username, dataUrl);
                                          setProfileTargetUser({ ...profileTargetUser, avatarUrl: dataUrl });
                                        })
                                      }
                                    />
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => handleAdminAction('updateAvatar', profileTargetUser.username, profileTargetUser.avatarUrl)}
                                    className="px-3 py-2 bg-[#48a942] text-white font-bold rounded-lg cursor-pointer"
                                  >
                                    ✔ حفظ
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* تعديل رصيد اللايكات */}
                            {canEditLikes && (
                              <div className="flex flex-wrap sm:flex-nowrap gap-1.5 items-center w-full min-w-0">
                                <span className="w-14 shrink-0 font-black text-rose-600 text-xs">اللايكات❤️:</span>
                                <input
                                  type="number"
                                  value={profileEditLikes}
                                  onChange={(e) => setProfileEditLikes(e.target.value)}
                                  className="flex-1 min-w-0 p-2 border-2 border-slate-300 rounded-lg text-xs font-black text-slate-950 bg-white font-mono outline-none focus:border-amber-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleAdminAction('updateLikes', profileTargetUser.username, profileEditLikes)}
                                  className="shrink-0 px-3 py-2 bg-[#48a942] text-white font-bold rounded-lg cursor-pointer"
                                >
                                  ✔ حفظ
                                </button>
                              </div>
                            )}

                            {/* تعديل رصيد النقاط */}
                            {canEditPoints && (
                              <div className="flex flex-wrap sm:flex-nowrap gap-1.5 items-center w-full min-w-0">
                                <span className="w-14 shrink-0 font-black text-amber-600 text-xs">النقاط🪙:</span>
                                <input
                                  type="number"
                                  value={profileEditPoints}
                                  onChange={(e) => setProfileEditPoints(e.target.value)}
                                  className="flex-1 min-w-0 p-2 border-2 border-slate-300 rounded-lg text-xs font-black text-slate-950 bg-white font-mono outline-none focus:border-amber-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleAdminAction('updatePoints', profileTargetUser.username, profileEditPoints)}
                                  className="shrink-0 px-3 py-2 bg-[#48a942] text-white font-bold rounded-lg cursor-pointer"
                                >
                                  ✔ حفظ
                                </button>
                              </div>
                            )}

                            {/* نقل العضو لغرفة أخرى */}
                            {canMoveUsers && (
                              <div className="flex flex-wrap sm:flex-nowrap gap-1.5 items-center w-full min-w-0">
                                <span className="w-14 shrink-0 font-black text-slate-800 text-xs">نقل لغرفة:</span>
                                <select
                                  value={profileMoveRoom}
                                  onChange={(e) => setProfileMoveRoom(e.target.value)}
                                  className="flex-1 min-w-0 p-2 border-2 border-amber-500/80 rounded-lg bg-white text-slate-950 font-black text-xs outline-none focus:border-amber-600 truncate"
                                >
                                  {roomsList.map((r) => (
                                    <option key={r.id} value={r.id} className="bg-white text-slate-950 font-bold py-1">
                                      {r.name}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => handleAdminAction('moveRoom', profileTargetUser.username, profileMoveRoom)}
                                  className="shrink-0 px-3 py-2 bg-[#2a241e] text-amber-200 font-bold rounded-lg cursor-pointer"
                                >
                                  ✔ نقل
                                </button>
                              </div>
                            )}

                            {/* ترقية الرتبة والمجموعة (Governed by canChangeRoles & Strict Hierarchy) */}
                            {canChangeRoles && (
                              <div className="p-3 bg-white border-2 border-indigo-200 rounded-xl space-y-2 shadow-xs w-full min-w-0">
                                <div className="font-black text-slate-900 text-xs flex items-center justify-between">
                                  <span>المجموعة والرتبة:</span>
                                  <span className="text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded font-bold">
                                    {isViewerAdmin ? 'صلاحية كاملة' : `أقل من رتبتك (#${actorLevel})`}
                                  </span>
                                </div>
                                <select
                                  value={profileEditRole}
                                  onChange={(e: any) => setProfileEditRole(e.target.value)}
                                  className="w-full min-w-0 p-2.5 border-2 border-indigo-500 rounded-lg bg-white text-slate-950 font-black text-xs outline-none focus:border-indigo-600 shadow-xs cursor-pointer truncate"
                                >
                                  {[...rolesConfig]
                                    .filter((r) => isViewerAdmin || r.level < actorLevel)
                                    .sort((a, b) => b.level - a.level)
                                    .map((r) => (
                                      <option key={r.id} value={r.id} className="bg-white text-slate-950 font-bold py-1">
                                        {r.name} (#{r.level})
                                      </option>
                                    ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => handleAdminAction('updateRole', profileTargetUser.username, profileEditRole)}
                                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-lg shadow-xs cursor-pointer"
                                >
                                  ✔ حفظ الرتبة والترقية
                                </button>
                              </div>
                            )}

                            {/* تغيير كلمة المرور عند النسيان */}
                            {canChangePassword && (
                              <div className="p-2.5 bg-amber-50/90 border border-amber-300 rounded-xl space-y-1.5 shadow-xs w-full min-w-0">
                                <div className="font-bold text-amber-950 flex items-center justify-between text-xs">
                                  <span className="flex items-center gap-1.5">
                                    <Key className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                                    <span>تغيير كلمة المرور للعضو (عند النسيان):</span>
                                  </span>
                                </div>
                                <div className="flex flex-wrap sm:flex-nowrap gap-1.5 items-center w-full min-w-0">
                                  <input
                                    type="text"
                                    id={`admin_user_pass_${profileTargetUser.username}`}
                                    placeholder="كلمة المرور الجديدة..."
                                    className="flex-1 min-w-0 p-1.5 border border-amber-300 rounded text-xs bg-white text-slate-900 font-mono font-bold"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const el = document.getElementById(`admin_user_pass_${profileTargetUser.username}`) as HTMLInputElement;
                                      const p = el ? el.value.trim() : '';
                                      if (!p || p.length < 3) {
                                        showToast('يجب أن تتكون كلمة المرور من 3 خانات على الأقل', 'error');
                                        return;
                                      }
                                      handleAdminAction('updatePassword', profileTargetUser.username, p);
                                      showToast(`تم تغيير وتعيين كلمة المرور لـ [${profileTargetUser.username}] بنجاح 🔑`, 'success');
                                      if (el) el.value = '';
                                    }}
                                    className="shrink-0 px-3 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold rounded text-xs cursor-pointer shadow-xs flex items-center gap-1"
                                  >
                                    <Key className="w-3 h-3" />
                                    <span>تعيين 🔑</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Regular Member Info Notice if actor has no mod powers and isn't self */}
                      {!hasAnyModPower && !isSelf && (
                        <div className="p-2.5 bg-slate-50 border rounded-lg text-slate-600 text-[11px] leading-relaxed flex items-start gap-2 max-w-full">
                          <Lock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                          <div>
                            الخصائص الإشرافية والإدارية (مثل الطرد والإسكات وتعديل البيانات) تُمنح حسب صلاحيات الرتب المعتمدة من قبل إدارة الدردشة.
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

              </div>
            </div>
          </div>
        )}

        {/* Falcon Mega Suite (50+ Creative Features: Games, Gifts, DJ, Calligraphy, Culture) */}
        {isMegaSuiteOpen && (
          <ModalErrorBoundary>
            <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs text-amber-300 text-xs font-bold animate-in fade-in" dir="rtl">جاري تحميل باقة الصقور... ✨</div>}>
              <FalconMegaSuite
                isOpen={isMegaSuiteOpen}
                onClose={() => setIsMegaSuiteOpen(false)}
                currentUser={currentUser || { username: 'زائر', role: 'guest', points: 0, likes: 0, room: 'الغرفة العامة' }}
                onlineUsers={rosterUsers}
                onSendChatMessage={(text) => {
                  if (socket) {
                    socket.emit('chatMessage', { text });
                  }
                }}
                onShowToast={(msg, type) => showToast(msg, type || 'info')}
                starredMessages={starredMessages}
                onToggleStarMessage={toggleStarMessage}
                chatFontSize={chatFontSize}
                onChangeFontSize={handleUpdateFontSize}
                eyeComfort={eyeComfort}
                onToggleEyeComfort={() => {
                  const next = !eyeComfort;
                  setEyeComfort(next);
                  try {
                    localStorage.setItem('soqoor_eye_comfort', String(next));
                  } catch {}
                  showToast(!eyeComfort ? 'تم تفعيل فلتر راحة العين الدافئ 🌙' : 'تم تعطيل فلتر راحة العين ☀️', 'info');
                }}
                activeTheme={activeTheme}
                onChangeTheme={handleUpdateTheme}
                pinnedTopic={pinnedTopic}
                onUpdatePinnedTopic={(topic) => {
                  setPinnedTopic(topic);
                  showToast('تم تحديث الإعلان المثبت في الروم 📌', 'success');
                }}
                userMood={userMood}
                onChangeMood={(mood) => {
                  setUserMood(mood);
                  showToast(`تم تعيين حالتك المزاجية: ${mood}`, 'info');
                }}
                userFrame={userFrame}
                onChangeFrame={(frame) => {
                  setUserFrame(frame);
                  showToast(`تم تطبيق الإطار الملكي بنجاح 🖼️`, 'success');
                }}
                onClearLocalChat={handleClearLocalChat}
                onExportChat={handleExportChat}
              />
            </Suspense>
          </ModalErrorBoundary>
        )}

        {/* 50+ Ultimate Mega Features Arsenal (ترسانة الميزات الـ 50 الشاملة) */}
        {showUltimateFeatures50 && (
          <ModalErrorBoundary>
            <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs text-amber-300 text-xs font-bold animate-in fade-in" dir="rtl">جاري تحميل ترسانة الميزات... ⚡</div>}>
              <UltimateMegaFeatures50
                isOpen={showUltimateFeatures50}
                onClose={() => setShowUltimateFeatures50(false)}
                currentUser={currentUser || { username: 'زائر', role: 'guest', points: 0, likes: 0, room: 'الغرفة العامة' }}
                onlineUsers={rosterUsers}
                onSendChatMessage={(text) => {
                  if (socket) {
                    socket.emit('chatMessage', { text });
                  }
                }}
                onShowToast={(msg, type) => showToast(msg, type || 'info')}
                onAddPoints={handleAddPointsReward}
                onApplyTheme={handleUpdateTheme}
                onApplyFont={handleUpdateFontFamily}
                onToggleMic={() => {
                  if (currentUser?.micSlot !== null) {
                    handleDropMic();
                  } else {
                    handleTakeMic(1);
                  }
                }}
                socket={socket}
              />
            </Suspense>
          </ModalErrorBoundary>
        )}

        {/* Urgent Critical Broadcast Popup Modal (لجميع الغرف) */}
        {criticalBroadcast && (
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setCriticalBroadcast(null);
            }}
            className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 animate-in fade-in"
          >
            <div className="bg-gradient-to-b from-[#2a1313] via-[#1a0c0c] to-[#2a1313] border-2 border-red-500 rounded-3xl w-full max-w-sm p-5 text-center space-y-4 shadow-2xl text-slate-100">
              <div className="w-16 h-16 rounded-full bg-red-600/30 border-2 border-red-500 flex items-center justify-center mx-auto text-red-400">
                <Megaphone className="w-9 h-9 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-black text-red-300 flex items-center justify-center gap-1.5">
                  <span>📢 {criticalBroadcast.title}</span>
                </h3>
                <p className="text-[11px] text-amber-300 font-bold mt-1">
                  مرسل من [{criticalBroadcast.senderRole.toUpperCase()}]: {criticalBroadcast.sender} • {criticalBroadcast.time}
                </p>
              </div>
              <div className="p-3.5 bg-red-950/50 border border-red-700/60 rounded-2xl text-xs text-white leading-relaxed font-bold shadow-inner">
                {criticalBroadcast.text}
              </div>
              <button
                type="button"
                onClick={() => setCriticalBroadcast(null)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-700 hover:to-rose-700 text-white font-black text-xs shadow-lg cursor-pointer"
              >
                حسناً، فهمت التوجيه الإداري 🦅
              </button>
            </div>
          </div>
        )}

        {/* Private 1-on-1 Audio/Video Call Overlay (شاشة ومودال الاتصال الخاص) */}
        <PrivateCallOverlay
          socket={socket}
          incomingCall={incomingCall}
          activeCall={activeCall}
          onAcceptIncoming={handleAcceptIncomingCall}
          onRejectIncoming={handleRejectIncomingCall}
          onEndActiveCall={handleEndActiveCall}
        />

        {/* Received Official Warning Modal with Manual Written Reply */}
        {receivedOfficialWarning && (
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setReceivedOfficialWarning(null);
            }}
            className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 animate-in fade-in"
          >
            <div className="bg-[#241a12] border-2 border-red-500 rounded-3xl w-full max-w-sm p-5 text-center space-y-3.5 shadow-2xl text-slate-100">
              <div className="w-16 h-16 rounded-full bg-red-600/20 border-2 border-red-500 flex items-center justify-center mx-auto text-red-500">
                <AlertTriangle className="w-10 h-10 animate-bounce" />
              </div>
              <div>
                <h3 className="text-base font-black text-red-400">⚠️ إنذار وتنبيه إداري رسمي</h3>
                <p className="text-xs text-slate-300 mt-1">صادر من المشرف: {receivedOfficialWarning.from}</p>
              </div>
              <div className="p-3 bg-red-950/40 border border-red-700/60 rounded-xl text-xs text-red-200 leading-relaxed font-bold">
                {receivedOfficialWarning.text}
              </div>

              {/* Manual Written Reply Input (الرد على التنبيه بكتابة يدوية) */}
              <div className="space-y-2 text-right">
                <label className="text-xs font-bold text-amber-300 block">
                  الرد والتوضيح للإدارة (كتابة يدوية):
                </label>
                <textarea
                  name="official_warning_reply"
                  id="official_warning_reply"
                  autoComplete="off"
                  autoCorrect="on"
                  autoCapitalize="sentences"
                  spellCheck={true}
                  data-form-type="other"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  value={warningReplyInput}
                  onChange={(e) => setWarningReplyInput(e.target.value)}
                  placeholder="اكتب ردك وتوضيحك هنا ليتم إرساله فوراً للمشرف..."
                  rows={2}
                  className="w-full p-2 text-xs bg-black/60 border border-amber-600/50 rounded-xl text-white outline-none focus:border-amber-400 resize-none font-medium"
                />
                <button
                  type="button"
                  disabled={!warningReplyInput.trim()}
                  onClick={handleSendWarningReply}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>إرسال ردك وتوضيحك للإدارة ✉️</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setReceivedOfficialWarning(null)}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer border border-slate-700"
              >
                إغلاق والتعهد بالالتزام 🤝
              </button>
            </div>
          </div>
        )}

        {/* Password Protected Room Entry Modal */}
        {passwordPromptRoom && (
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setPasswordPromptRoom(null);
                setRoomPasswordInput('');
                setRoomPasswordError(null);
              }
            }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in"
          >
            <div className="w-full max-w-sm bg-slate-900 border border-amber-500/50 rounded-2xl p-5 shadow-2xl text-right space-y-4 text-slate-100">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-amber-300">غرفة محمية برمز سري</h3>
                    <p className="text-[11px] text-slate-400 font-bold">{passwordPromptRoom.name}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPasswordPromptRoom(null);
                    setRoomPasswordInput('');
                    setRoomPasswordError(null);
                  }}
                  className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">
                  أدخل كلمة المرور لدخول الغرفة:
                </label>
                <div className="relative">
                  <input
                    type={showRoomPasswordText ? 'text' : 'password'}
                    autoFocus
                    value={roomPasswordInput}
                    onChange={(e) => {
                      setRoomPasswordInput(e.target.value);
                      if (roomPasswordError) setRoomPasswordError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleConfirmRoomPassword();
                    }}
                    placeholder="كلمة المرور..."
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none pl-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRoomPasswordText(!showRoomPasswordText)}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showRoomPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {roomPasswordError && (
                  <p className="text-[11px] text-rose-400 font-bold flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{roomPasswordError}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleConfirmRoomPassword}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>دخول الغرفة 🚀</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPasswordPromptRoom(null);
                    setRoomPasswordInput('');
                    setRoomPasswordError(null);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 1. HQ Audio Equalizer, Modulators & Voice Studio */}
        {showAudioStudio && (
          <ModalErrorBoundary>
            <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs text-amber-300 text-xs font-bold animate-in fade-in" dir="rtl">جاري فتح استوديو الصوت... 🎙️</div>}>
              <AudioEqualizerAndEffects
                isOpen={showAudioStudio}
                onClose={() => setShowAudioStudio(false)}
                isVoiceActive={currentUser?.micSlot !== null}
                onToggleVoice={() => {
                  if (currentUser?.micSlot !== null) {
                    handleDropMic();
                  } else {
                    handleTakeMic(1);
                  }
                }}
                onShowToast={showToast}
              />
            </Suspense>
          </ModalErrorBoundary>
        )}

        {/* 2. Interactive Games, Contests & Challenges Suite */}
        {showGamesSuite && (
          <ModalErrorBoundary>
            <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs text-amber-300 text-xs font-bold animate-in fade-in" dir="rtl">جاري تحميل مركز الألعاب... 🎮</div>}>
              <InteractiveGamesSuite
                isOpen={showGamesSuite}
                onClose={() => setShowGamesSuite(false)}
                currentUserPoints={currentUser?.points || 0}
                onAddPoints={handleAddPointsReward}
                onBroadcastGameWin={handleBroadcastGameWin}
                onShowToast={showToast}
              />
            </Suspense>
          </ModalErrorBoundary>
        )}

        {/* 3. Identity, Profile, Frames, Badges & Streaks Studio */}
        {showIdentityStudio && (
          <ModalErrorBoundary>
            <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs text-amber-300 text-xs font-bold animate-in fade-in" dir="rtl">جاري فتح استوديو الملف الشخصي... 🖼️</div>}>
              <IdentityProfileStudio
                isOpen={showIdentityStudio}
                onClose={() => setShowIdentityStudio(false)}
                currentUser={currentUser || { id: '', username: 'زائر', role: 'guest', likes: 0, points: 0, statusQuote: '', flag: '🇸🇦' }}
                activeFrame={userFrame}
                onChangeFrame={setUserFrame}
                userMood={userMood}
                onChangeMood={setUserMood}
                nameGradient={nameGradient}
                onChangeNameGradient={handleUpdateNameGradient}
                onUpdateStatusQuote={(q) => {
                  setSettingQuote(q);
                  if (socket) socket.emit('updateProfile', { statusQuote: q });
                }}
                onAddPoints={handleAddPointsReward}
                onShowToast={showToast}
              />
            </Suspense>
          </ModalErrorBoundary>
        )}

        {/* 4. Themes, Wallpapers & Typography Center */}
        {showThemesModal && (
          <ModalErrorBoundary>
            <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs text-amber-300 text-xs font-bold animate-in fade-in" dir="rtl">جاري فتح الثيمات والخلفيات... 🎨</div>}>
              <ThemeAndWallpaperCenter
                isOpen={showThemesModal}
                onClose={() => setShowThemesModal(false)}
                activeTheme={activeTheme}
                customThemes={customThemes}
                onChangeTheme={handleUpdateTheme}
                activeWallpaper={activeWallpaper}
                onChangeWallpaper={handleUpdateWallpaper}
                fontFamily={fontFamily}
                onChangeFontFamily={handleUpdateFontFamily}
                chatFontSize={chatFontSize}
                onChangeFontSize={handleUpdateFontSize}
                chatFontWeight={chatFontWeight}
                onChangeFontWeight={handleUpdateFontWeight}
                bubbleStyle={bubbleStyle}
                onChangeBubbleStyle={handleUpdateBubbleStyle}
                nameColor={settingNameColor}
                onChangeNameColor={handleUpdateNameColor}
                textColor={settingTextColor}
                onChangeTextColor={handleUpdateTextColor}
                eyeComfort={eyeComfort}
                onToggleEyeComfort={() => {
                  const next = !eyeComfort;
                  setEyeComfort(next);
                  try {
                    localStorage.setItem('soqoor_eye_comfort', String(next));
                  } catch {}
                }}
                isNightMode={isNightMode}
                onToggleNightMode={toggleNightMode}
                isHighContrastMode={isHighContrastMode}
                onToggleHighContrastMode={toggleHighContrastMode}
                soundVolume={soundVolume}
                onChangeSoundVolume={(v) => {
                  setSoundVolume(v);
                  sounds.setMasterVolume(v / 100);
                  try {
                    localStorage.setItem('soqoor_sound_volume', String(v));
                  } catch {}
                }}
                particlesEnabled={particlesEnabled}
                onToggleParticles={() => {
                  const next = !particlesEnabled;
                  setParticlesEnabled(next);
                  try {
                    localStorage.setItem('soqoor_particles', String(next));
                  } catch {}
                }}
                currentUserRole={currentUser?.role}
                onEditThemeInStudio={handleOpenColorStudioWithTheme}
                onApplyGlobalAppearance={handleApplyGlobalAppearance}
                onShowToast={showToast}
              />
            </Suspense>
          </ModalErrorBoundary>
        )}

        {/* 5. System Diagnostics & Realtime Latency Monitor */}
        {showDiagnosticsModal && (
          <ModalErrorBoundary>
            <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs text-amber-300 text-xs font-bold animate-in fade-in" dir="rtl">جاري فحص مؤشرات النظام... 📊</div>}>
              <SystemDiagnosticsModal
                isOpen={showDiagnosticsModal}
                onClose={() => setShowDiagnosticsModal(false)}
                onlineCount={onlineCount}
                currentRoom={currentUser?.room || 'الغرفة العامة'}
                socketConnected={isConnected}
                pingLatency={pingLatency}
                onShowToast={showToast}
              />
            </Suspense>
          </ModalErrorBoundary>
        )}

        {/* 6. Filter Alerts Modal (يفتح عند النقر على أيقونة الجرس للمصرح لهم فقط) */}
        {showFilterAlertsModal && (
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowFilterAlertsModal(false);
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fade-in"
            dir="rtl"
          >
            <div className="bg-[#1a140f] border-2 border-amber-500/70 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-right">
              <div className="p-3 bg-[#241a12] border-b border-[#3e2c1c] flex items-center justify-between text-amber-200">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-rose-600/30 text-rose-400 border border-rose-500/40 flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                      <span>تنبيهات الفلتر والكلمات المراقبة</span>
                      <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-mono">
                        {filterAlertsList.length}
                      </span>
                    </h3>
                    <p className="text-[10px] text-amber-300/70">رصد تلقائي لأي رسائل تضمنت كلمات ممنوعة في الشات</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {filterAlertsList.length > 0 && (
                    <button
                      onClick={() => {
                        socket?.emit('clearFilterAlerts');
                        setFilterAlertsList([]);
                        showToast('تم مسح جميع تنبيهات الفلتر 🧹', 'info');
                      }}
                      className="px-2.5 py-1 bg-rose-600/80 hover:bg-rose-600 text-white text-[10px] font-bold rounded-lg cursor-pointer transition-colors"
                    >
                      مسح الكل
                    </button>
                  )}
                  <button
                    onClick={() => setShowFilterAlertsModal(false)}
                    className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                {filterAlertsList.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 space-y-2">
                    <div className="text-3xl">🛡️✨</div>
                    <div className="text-sm font-bold text-slate-300">سجل الفلتر نظيف تماماً!</div>
                    <div className="text-xs text-slate-500">لم يتم التقاط أي كلمات مخالفة حالياً.</div>
                  </div>
                ) : (
                  filterAlertsList.map((alert, idx) => (
                    <div key={alert.id || idx} className="p-3 bg-slate-900/95 border border-slate-700/80 rounded-xl space-y-2 shadow-sm">
                      <div className="flex items-center justify-between text-xs gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <img src={alert.avatarUrl || falconIcon} alt="avatar" className="w-8 h-8 rounded-full object-cover border border-amber-500/60 shrink-0" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-amber-300">{alert.username}</span>
                              {alert.flag && <span>{alert.flag}</span>}
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-black ${
                                alert.contextType === 'pm'
                                  ? 'bg-purple-900/70 text-purple-200 border border-purple-500/40'
                                  : alert.contextType === 'wall_post' || alert.contextType === 'wall_comment'
                                  ? 'bg-blue-900/70 text-blue-200 border border-blue-500/40'
                                  : 'bg-emerald-900/70 text-emerald-200 border border-emerald-500/40'
                              }`}>
                                {alert.contextType === 'pm' ? '💬 بالخاص' : alert.contextType === 'wall_post' ? '📰 منشور حائط' : alert.contextType === 'wall_comment' ? '💬 تعليق حائط' : '👥 بالغرفة'}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                              <span className="text-amber-200/80 font-semibold">
                                {alert.targetUser ? `أرسلت إلى: @${alert.targetUser}` : `المكان: ${alert.room}`}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-left shrink-0">
                          <span className="text-[10px] text-slate-400 font-mono bg-black/40 px-2 py-0.5 rounded border border-slate-800">
                            🕒 {alert.time}
                          </span>
                        </div>
                      </div>
                      <div className="p-2.5 bg-black/60 rounded-lg text-slate-200 text-xs border border-rose-950/40 leading-relaxed font-medium">
                        "{alert.fullMessage}"
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-[10px] text-rose-400 font-bold">الكلمات الملتقطة:</span>
                          {alert.matchedWords?.map((w: string, i: number) => (
                            <span key={i} className="px-1.5 py-0.2 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded text-[9px] font-bold">
                              {w}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              socket?.emit('adminAction', {
                                action: 'mute',
                                targetUsername: alert.username,
                                value: true,
                                reason: `فلتر الكلمات: ${alert.matchedWords?.join(', ')}`
                              });
                              showToast(`تم كتم [${alert.username}] بنجاح 🔇`, 'success');
                            }}
                            className="px-2 py-0.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-[10px] font-bold cursor-pointer"
                          >
                            كتم
                          </button>
                          <button
                            onClick={() => {
                              socket?.emit('adminAction', {
                                action: 'kick',
                                targetUsername: alert.username,
                                reason: `فلتر الكلمات: ${alert.matchedWords?.join(', ')}`
                              });
                              showToast(`تم طرد [${alert.username}] بنجاح 🚪`, 'info');
                            }}
                            className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold cursor-pointer"
                          >
                            طرد
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* 7. Dedicated In-Room Settings Modal (تعديل إعدادات الغرفة الحالية بالكامل) */}
        {isRoomSettingsModalOpen && userCanManageRoomSettings && (
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsRoomSettingsModalOpen(false);
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fade-in"
            dir="rtl"
          >
            <div className="bg-[#1a140f] border-2 border-amber-500/70 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-right">
              <div className="p-3 bg-[#241a12] border-b border-[#3e2c1c] flex items-center justify-between text-amber-200">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center">
                    <Settings className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">إعدادات الغرفة: [{currentUser?.room}]</h3>
                    <p className="text-[10px] text-amber-300/70">تعديل كافة خيارات الغرفة وتطبيقها فوراً</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsRoomSettingsModalOpen(false)}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs">
                {/* Room Name */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-amber-200">اسم الغرفة:</label>
                  <input
                    type="text"
                    value={currentRoomSettingsForm.name}
                    onChange={(e) => setCurrentRoomSettingsForm({ ...currentRoomSettingsForm, name: e.target.value })}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold outline-none focus:border-amber-500"
                  />
                </div>

                {/* Pinned Topic */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-amber-200">الإعلان المثبت أعلى الغرفة (الموضوع):</label>
                  <textarea
                    rows={2}
                    value={currentRoomSettingsForm.pinnedTopic}
                    onChange={(e) => setCurrentRoomSettingsForm({ ...currentRoomSettingsForm, pinnedTopic: e.target.value })}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs outline-none focus:border-amber-500 resize-none"
                    placeholder="اكتب إعلان الغرفة هنا..."
                  />
                </div>

                {/* Lock Controls */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-slate-900 border border-slate-700 rounded-xl space-y-1.5 flex flex-col justify-between">
                    <div className="font-bold text-slate-200 text-[11px]">قفل الشات الكتابي:</div>
                    <button
                      type="button"
                      onClick={() => setCurrentRoomSettingsForm({ ...currentRoomSettingsForm, isChatLocked: !currentRoomSettingsForm.isChatLocked })}
                      className={`w-full py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        currentRoomSettingsForm.isChatLocked ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {currentRoomSettingsForm.isChatLocked ? '🔒 الشات مقفل' : '🔓 الشات مفتوح'}
                    </button>
                  </div>

                  <div className="p-2.5 bg-slate-900 border border-slate-700 rounded-xl space-y-1.5 flex flex-col justify-between">
                    <div className="font-bold text-slate-200 text-[11px]">قفل الصعود للمايك:</div>
                    <button
                      type="button"
                      onClick={() => setCurrentRoomSettingsForm({ ...currentRoomSettingsForm, isVoiceLocked: !currentRoomSettingsForm.isVoiceLocked })}
                      className={`w-full py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        currentRoomSettingsForm.isVoiceLocked ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {currentRoomSettingsForm.isVoiceLocked ? '🎙️ المايكات مقفلة' : '🎙️ المايكات مفتوحة'}
                    </button>
                  </div>
                </div>

                {/* Slow mode */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-amber-200">الوضع البطيء (Slow Mode):</label>
                  <select
                    value={currentRoomSettingsForm.slowModeSeconds}
                    onChange={(e) => setCurrentRoomSettingsForm({ ...currentRoomSettingsForm, slowModeSeconds: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold outline-none"
                  >
                    <option value={0}>معطل (إرسال فوري دون انتظار)</option>
                    <option value={5}>5 ثوانٍ بين كل رسالة</option>
                    <option value={10}>10 ثوانٍ بين كل رسالة</option>
                    <option value={30}>30 ثانية (تهدئة حادة)</option>
                  </select>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-amber-200 block">
                    {currentRoomSettingsForm.isPasswordProtected
                      ? 'تغيير كلمة مرور الغرفة (اتركه فارغاً للإبقاء على الكلمة الحالية):'
                      : 'كلمة مرور الغرفة (اتركه فارغاً لغرفة مفتوحة للجميع):'}
                  </label>
                  <input
                    type="password"
                    autoComplete="off"
                    data-form-type="other"
                    data-lpignore="true"
                    placeholder={
                      currentRoomSettingsForm.isPasswordProtected
                        ? 'محمية حالياً — أدخل كلمة جديدة للتغيير فقط'
                        : 'اتركه فارغاً لغرفة مفتوحة للجميع'
                    }
                    value={currentRoomSettingsForm.password}
                    onChange={(e) =>
                      setCurrentRoomSettingsForm({
                        ...currentRoomSettingsForm,
                        password: e.target.value,
                        clearPassword: false
                      })
                    }
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs outline-none focus:border-amber-500 font-mono"
                  />
                  {currentRoomSettingsForm.isPasswordProtected && (
                    <label className="flex items-center gap-2 text-[11px] text-rose-300 font-bold cursor-pointer select-none pt-0.5">
                      <input
                        type="checkbox"
                        checked={Boolean(currentRoomSettingsForm.clearPassword)}
                        onChange={(e) =>
                          setCurrentRoomSettingsForm({
                            ...currentRoomSettingsForm,
                            clearPassword: e.target.checked,
                            password: e.target.checked ? '' : currentRoomSettingsForm.password
                          })
                        }
                        className="accent-rose-500"
                      />
                      <span>إزالة الحماية بكلمة المرور وجعل الغرفة مفتوحة للجميع</span>
                    </label>
                  )}
                </div>

                {/* Room Welcome Message Section (الرسالة الترحيبية للغرفة لمالك الغرفة) */}
                <div className="p-3 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-amber-950/40 border border-emerald-500/40 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-emerald-300 block text-xs">رسالة ترحيب الغرفة (Welcome Message):</span>
                      <span className="text-[10px] text-slate-400">تظهر تلقائياً للعضو فور دخوله إلى هذه الغرفة</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentRoomSettingsForm({ ...currentRoomSettingsForm, welcomeEnabled: !currentRoomSettingsForm.welcomeEnabled })}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
                        currentRoomSettingsForm.welcomeEnabled ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {currentRoomSettingsForm.welcomeEnabled ? 'مفعلة ✔️' : 'معطلة ✕'}
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={currentRoomSettingsForm.welcomeMessage}
                    onChange={(e) => setCurrentRoomSettingsForm({ ...currentRoomSettingsForm, welcomeMessage: e.target.value })}
                    className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs outline-none focus:border-emerald-500 resize-none font-medium"
                    placeholder="مثال: أهلاً بكم في غرفتنا.. نتمنى لكم أسعد الأوقات والالتزام بالاحترام المتبادل 🌹"
                  />
                </div>

                {/* Deleted Message Notice (Admins Only) */}
                {(currentUser?.role === 'hassan' || currentUser?.role === 'admin' || currentUser?.role === 'super') && (
                  <div className="p-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl flex items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-amber-200 block text-xs">إشعار الرسائل المحذوفة (للإداريين فقط):</span>
                      <span className="text-[10px] text-slate-400">إظهار إشعار خفيف مكان الرسالة المحذوفة للإداريين بدلاً من اختفائها تماماً</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentRoomSettingsForm({ ...currentRoomSettingsForm, showDeletedNotice: !currentRoomSettingsForm.showDeletedNotice })}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer border flex-shrink-0 ${
                        currentRoomSettingsForm.showDeletedNotice ? 'bg-amber-600 text-white border-amber-500' : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {currentRoomSettingsForm.showDeletedNotice ? 'مفعل ✔️' : 'معطل ✕'}
                    </button>
                  </div>
                )}

                {/* Save Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (!userCanManageRoomSettings) {
                      showToast('عذراً، تعديل إعدادات الغرفة محصور بالإدارة وأصحاب الصلاحيات فقط 🔒', 'error');
                      setIsRoomSettingsModalOpen(false);
                      return;
                    }
                    const roomName = currentUser?.room || 'الغرفة العامة';
                    const currentRoomObj = roomsList.find(r => r.name === roomName || r.id === roomName);
                    const roomId = currentRoomObj?.id || roomName;
                    const trimmedPass = currentRoomSettingsForm.password.trim();
                    const updatePayload: Record<string, any> = {
                      roomId,
                      name: currentRoomSettingsForm.name,
                      desc: currentRoomSettingsForm.desc,
                      pinnedTopic: currentRoomSettingsForm.pinnedTopic,
                      isChatLocked: currentRoomSettingsForm.isChatLocked,
                      slowModeSeconds: currentRoomSettingsForm.slowModeSeconds,
                      isVoiceLocked: currentRoomSettingsForm.isVoiceLocked,
                      showDeletedNotice: currentRoomSettingsForm.showDeletedNotice,
                      welcomeMessage: currentRoomSettingsForm.welcomeMessage,
                      welcomeEnabled: currentRoomSettingsForm.welcomeEnabled
                    };
                    if (currentRoomSettingsForm.clearPassword) {
                      updatePayload.isPasswordProtected = false;
                      updatePayload.password = '';
                    } else if (trimmedPass) {
                      updatePayload.isPasswordProtected = true;
                      updatePayload.password = trimmedPass;
                    }
                    socket?.emit('updateRoomDetails', updatePayload);
                    if (currentRoomSettingsForm.pinnedTopic !== undefined) {
                      setPinnedTopic(currentRoomSettingsForm.pinnedTopic);
                    }
                    setIsRoomSettingsModalOpen(false);
                    showToast('تم حفظ وتطبيق إعدادات الغرفة بنجاح 💾⚙️', 'success');
                  }}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-black rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>حفظ وتطبيق إعدادات الغرفة الآن 💾</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            PROFILE VISITORS MODAL (نافذة زوار ملفي الشخصي - الاسم والصورة وعدد المرات)
           ========================================================================= */}
        {showProfileVisitorsModal && (
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowProfileVisitorsModal(false);
            }}
            className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 backdrop-blur-md animate-in fade-in"
            dir="rtl"
          >
            <div className={`w-full max-w-sm ${curTheme.drawerBg} border-2 border-amber-500 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 text-slate-100`}>
              {/* Header */}
              <div className={`p-3.5 ${curTheme.drawerHeaderBg || curTheme.headerBg} border-b ${curTheme.headerBorder} flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-400/30">
                    <Eye className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-amber-300 flex items-center gap-1.5">
                      <span>زوار ملفي الشخصي 👁️</span>
                      <span className="px-2 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[10px] font-mono font-black">
                        {profileVisitorsList.length}
                      </span>
                    </h3>
                    <p className="text-[10px] text-amber-200/70">من نقر على صورتك وتصفح بروفايلك وعدد المرات</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowProfileVisitorsModal(false)}
                  className="w-7 h-7 rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2 divide-y divide-slate-800/40">
                {profileVisitorsList.length === 0 ? (
                  <div className="py-10 text-center flex flex-col items-center justify-center gap-3 text-slate-400">
                    <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                      <Eye className="w-7 h-7" />
                    </div>
                    <p className="text-xs font-bold text-amber-200">لا يوجد زوار لملفك الشخصي حتى الآن</p>
                    <p className="text-[11px] text-slate-400 max-w-[220px]">
                      عندما ينقر أي عضو على صورتك الشخصية لعرض ملفك سيظهر هنا فوراً مع عدد مرات الزيارة!
                    </p>
                  </div>
                ) : (
                  profileVisitorsList.map((v, i) => {
                    const visitorUser = allConnectedUsers.find((u) => u.username.toLowerCase() === v.username.toLowerCase()) ||
                      rosterUsers.find((u) => u.username.toLowerCase() === v.username.toLowerCase());
                    return (
                      <div
                        key={v.username + '-' + i}
                        className={`pt-2 first:pt-0 p-2.5 rounded-xl ${curTheme.cardBg} border ${curTheme.cardBorder} flex items-center justify-between gap-2 transition-all hover:border-amber-400/60`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={v.avatarUrl || falconIcon}
                            alt={v.username}
                            onClick={() => {
                              if (visitorUser) {
                                openUserProfile(visitorUser);
                                setShowProfileVisitorsModal(false);
                              }
                            }}
                            className="w-11 h-11 rounded-xl object-cover border-2 border-amber-500/50 shadow-md cursor-pointer hover:opacity-85 flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="font-black text-xs text-amber-200 flex items-center gap-1.5 truncate">
                              {(() => {
                                const banner = getUserBanner(v.username, v.nameBannerUrl);
                                if (banner) {
                                  return (
                                    <img
                                      src={banner}
                                      alt={v.username}
                                      title={v.username}
                                      onClick={() => {
                                        if (visitorUser) {
                                          openUserProfile(visitorUser);
                                          setShowProfileVisitorsModal(false);
                                        }
                                      }}
                                      className="h-5 max-h-[24px] max-w-[140px] object-contain rounded inline-block cursor-pointer hover:opacity-90"
                                    />
                                  );
                                }
                                return <span>{v.username}</span>;
                              })()}
                              {v.flag && <span className="text-sm">{v.flag}</span>}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <span>آخر زيارة:</span>
                              <span className="font-mono text-amber-400">
                                {v.lastVisitTime ? new Date(v.lastVisitTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : 'مؤخراً'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                          <span className="px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs font-mono shadow-xs flex items-center gap-1">
                            <span>👁️</span>
                            <span>{v.visitCount || 1} مرات</span>
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (visitorUser) {
                                  openUserProfile(visitorUser);
                                  setShowProfileVisitorsModal(false);
                                } else {
                                  showToast(`العضو [${v.username}] غير متصل حالياً`, 'info');
                                }
                              }}
                              className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded text-[10px] font-bold cursor-pointer transition-colors"
                            >
                              الملف
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (visitorUser) {
                                  setSelectedPmUser(visitorUser);
                                  setActiveDrawer('pm');
                                  setShowProfileVisitorsModal(false);
                                } else {
                                  showToast(`العضو [${v.username}] غير متصل حالياً للمحادثة الخاصة`, 'info');
                                }
                              }}
                              className="px-2 py-0.5 bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 rounded text-[10px] font-bold cursor-pointer transition-colors"
                            >
                              خاص
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className={`p-2.5 ${curTheme.drawerHeaderBg || curTheme.headerBg} border-t ${curTheme.headerBorder} flex items-center justify-between text-xs`}>
                <button
                  type="button"
                  onClick={() => {
                    socket?.emit('getProfileVisitors');
                    showToast('تم تحديث قائمة زوار الملف الشخصي 🔄', 'info');
                  }}
                  className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>تحديث</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowProfileVisitorsModal(false)}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold cursor-pointer transition-colors"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            START LIVE BROADCAST CONFIRMATION MODAL (بدء البث المباشر - فيديو وصوت)
           ========================================================================= */}
        {showStartLiveConfirm && (
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowStartLiveConfirm(false);
            }}
            className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 backdrop-blur-md animate-in fade-in"
            dir="rtl"
          >
            <div className={`w-full max-w-sm ${curTheme.drawerBg} border-2 border-red-500 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 text-slate-100`}>
              {/* Header */}
              <div className="p-3.5 bg-gradient-to-r from-red-700 via-rose-700 to-red-800 text-white flex items-center justify-between shadow-md">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <Video className="w-4 h-4 text-white animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-white flex items-center gap-1.5">
                      <span>بدء بث مباشر (LIVE) 🔴</span>
                    </h3>
                    <p className="text-[10px] text-rose-100/80">فيديو وصوت حقيقي لجميع أعضاء الغرفة</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowStartLiveConfirm(false)}
                  className="w-7 h-7 rounded-lg bg-black/30 hover:bg-black/50 text-white flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-4 space-y-3.5 text-xs">
                <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-xl space-y-1.5">
                  <div className="font-bold text-red-200 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                    <span>الغرفة المستهدفة: [{currentUser?.room || 'الغرفة العامة'}]</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    سيتم فتح الكاميرا والمايكروفون لبث الفيديو بجودة عالية لجميع المتواجدين في الغرفة، مع إمكانية التفاعل بالرموز التعبيرية والتعليقات الحية!
                  </p>
                </div>

                {/* Camera Selector */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-amber-200 block">اختيار الكاميرا:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setLiveFacingMode('user')}
                      className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 font-bold cursor-pointer transition-all ${
                        liveFacingMode === 'user'
                          ? 'bg-red-600 text-white border-red-400 shadow-md ring-2 ring-red-400/50'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      <Camera className="w-4 h-4" />
                      <span>كاميرا أمامية 🤳</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLiveFacingMode('environment')}
                      className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 font-bold cursor-pointer transition-all ${
                        liveFacingMode === 'environment'
                          ? 'bg-red-600 text-white border-red-400 shadow-md ring-2 ring-red-400/50'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      <Camera className="w-4 h-4" />
                      <span>كاميرا خلفية 📸</span>
                    </button>
                  </div>
                </div>

                {/* Buttons */}
                <div className="pt-2 space-y-2">
                  <button
                    type="button"
                    onClick={handleStartLiveBroadcast}
                    className="w-full py-3 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-600 text-white font-black rounded-xl shadow-lg cursor-pointer transition-all flex items-center justify-center gap-2 text-sm animate-pulse active:scale-[0.98]"
                  >
                    <Video className="w-4 h-4" />
                    <span>ابدأ البث المباشر الآن 🔴</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowStartLiveConfirm(false)}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl cursor-pointer transition-colors text-xs"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            BANNER / NAME LOGO SELECTION MODAL (تعيين وتثبيت البنر والسوابر المصور 500x50)
           ========================================================================= */}
        {showBannerPickerModal && bannerPickerTargetUser && (
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowBannerPickerModal(false);
            }}
            className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-4 backdrop-blur-md animate-in fade-in"
            dir="rtl"
          >
            <div className={`w-full max-w-lg ${curTheme.drawerBg} border-2 border-amber-500 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 text-slate-100 text-right`}>
              {/* Header */}
              <div className="p-3.5 bg-gradient-to-r from-purple-900 via-slate-900 to-amber-900 border-b border-amber-500/40 flex items-center justify-between shadow-md">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-400/40 flex items-center justify-center">
                    <Palette className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-amber-200 flex items-center gap-1.5">
                      <span>تعيين وتثبيت البنر / السوابر المصور للعضو 🎨</span>
                    </h3>
                    <p className="text-[10px] text-slate-300">
                      استبدال الاسم النصي لـ [{bannerPickerTargetUser.username}] بلقب مصور مخصص (500x50 PNG/GIF)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBannerPickerModal(false)}
                  className="w-7 h-7 rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Current Assigned Banner Status */}
              <div className="p-3.5 bg-slate-950/60 border-b border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300">البنر المثبت حالياً للعضو:</span>
                  {bannerPickerTargetUser.nameBannerUrl ? (
                    <button
                      type="button"
                      onClick={() => {
                        socket?.emit('assignMemberBanner', {
                          username: bannerPickerTargetUser.username,
                          bannerUrl: undefined
                        });
                        setBannerPickerTargetUser((prev) => prev ? { ...prev, nameBannerUrl: undefined } : null);
                        setProfileTargetUser((prev) => prev ? { ...prev, nameBannerUrl: undefined } : null);
                        showToast(`تمت إزالة البنر المصور لـ [${bannerPickerTargetUser.username}] والعودة للاسم النصي ✕`, 'info');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-500/50 text-[11px] font-bold cursor-pointer transition-colors"
                    >
                      إزالة البنر والعودة للاسم النصي ✕
                    </button>
                  ) : (
                    <span className="text-[11px] text-amber-400 font-medium">اسم نصي عادي (لا يوجد بنر)</span>
                  )}
                </div>
                {bannerPickerTargetUser.nameBannerUrl && (
                  <div className="p-2 bg-black/40 rounded-xl border border-amber-500/30 flex items-center justify-center">
                    <img
                      src={bannerPickerTargetUser.nameBannerUrl}
                      alt="البنر المثبت"
                      className="max-h-12 w-auto max-w-full object-contain rounded drop-shadow-md"
                    />
                  </div>
                )}
              </div>

              {/* Scrollable List of Pre-Uploaded Banners */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-amber-300">
                    اختر من قائمة البنرات المرفوعة مسبقاً ({emblemsConfig.items.filter((i) => i.type === 'banner').length}):
                  </span>
                  <span className="text-[10px] text-slate-400">مقاس قياسي 500x50</span>
                </div>

                {emblemsConfig.items.filter((i) => i.type === 'banner').length === 0 ? (
                  <div className="py-8 text-center text-slate-400 space-y-2">
                    <p className="text-xs">لا توجد بنرات مرفوعة حالياً في النظام.</p>
                    <p className="text-[11px] text-slate-500">
                      يمكنك رفع بنرات جديدة من تبويب (الرموز) في لوحة التحكم الإدارية.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {emblemsConfig.items
                      .filter((item) => item.type === 'banner')
                      .map((banner) => {
                        const isCurrentlySelected = bannerPickerTargetUser.nameBannerUrl === banner.imageUrl;
                        return (
                          <div
                            key={banner.id}
                            className={`p-2.5 rounded-xl border transition-all ${
                              isCurrentlySelected
                                ? 'bg-amber-950/40 border-amber-400 shadow-md ring-1 ring-amber-400'
                                : 'bg-slate-900/80 border-slate-800 hover:border-amber-500/50 hover:bg-slate-850'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-bold text-xs text-amber-200 truncate max-w-[250px]">
                                {banner.title}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  socket?.emit('assignMemberBanner', {
                                    username: bannerPickerTargetUser.username,
                                    bannerUrl: banner.imageUrl
                                  });
                                  setBannerPickerTargetUser((prev) => prev ? { ...prev, nameBannerUrl: banner.imageUrl } : null);
                                  setProfileTargetUser((prev) => prev ? { ...prev, nameBannerUrl: banner.imageUrl } : null);
                                  setShowBannerPickerModal(false);
                                  showToast(`تم تثبيت البنر [${banner.title}] لـ [${bannerPickerTargetUser.username}] بنجاح 🌟`, 'success');
                                }}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  isCurrentlySelected
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'bg-amber-500 hover:bg-amber-400 text-black shadow'
                                }`}
                              >
                                {isCurrentlySelected ? 'مثبت حالياً ✔️' : 'تثبيت كائم العضو 📌'}
                              </button>
                            </div>
                            {/* Standard 500x50 preview box */}
                            <div className="w-full h-11 bg-black/50 rounded-lg p-1 flex items-center justify-center border border-slate-700/60 overflow-hidden">
                              <img
                                src={banner.imageUrl}
                                alt={banner.title}
                                className="h-full w-auto max-w-full object-contain"
                                loading="lazy"
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}

                {/* Direct Custom URL / File Upload for Quick Assignment */}
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <label className="text-[11px] font-bold text-slate-300 block">
                    أو رفع وتثبيت بنر خاص مباشرة (PNG / GIF مقاس 500x50):
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="رابط صورة البنر أو GIF مباشرة..."
                      value={customBannerUrlInput}
                      onChange={(e) => setCustomBannerUrlInput(e.target.value)}
                      className="flex-1 p-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none focus:border-amber-500 font-mono"
                    />
                    <label className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold text-amber-300 flex items-center gap-1.5 cursor-pointer shrink-0">
                      <Download className="w-3.5 h-3.5" />
                      <span>رفع 📁</span>
                      <input
                        type="file"
                        accept="image/png,image/gif,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          handleFileUpload(e, (dataUrl) => {
                            setCustomBannerUrlInput(dataUrl);
                            showToast('تم تحميل الصورة بنجاح! انقر تثبيت لحفظها', 'info');
                          });
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      disabled={!customBannerUrlInput.trim()}
                      onClick={() => {
                        if (!customBannerUrlInput.trim()) return;
                        socket?.emit('assignMemberBanner', {
                          username: bannerPickerTargetUser.username,
                          bannerUrl: customBannerUrlInput.trim()
                        });
                        setBannerPickerTargetUser((prev) => prev ? { ...prev, nameBannerUrl: customBannerUrlInput.trim() } : null);
                        setProfileTargetUser((prev) => prev ? { ...prev, nameBannerUrl: customBannerUrlInput.trim() } : null);
                        setShowBannerPickerModal(false);
                        showToast(`تم تثبيت البنر المخصص لـ [${bannerPickerTargetUser.username}] بنجاح 🌟`, 'success');
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 disabled:opacity-40 text-black font-black rounded-xl text-xs cursor-pointer shadow-md shrink-0"
                    >
                      تثبيت ✔️
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowBannerPickerModal(false)}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            MEMBER GIFT SELECTION MODAL (نافذة إهداء الهدايا الفاخرة وتثبيتها مرافقة للاسم)
           ========================================================================= */}
        {giftModalTarget && (
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setGiftModalTarget(null);
            }}
            className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-4 backdrop-blur-md animate-in fade-in"
            dir="rtl"
          >
            <div className={`w-full max-w-lg ${curTheme.drawerBg || 'bg-slate-900'} border-2 border-amber-500 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 text-slate-100 text-right`}>
              {/* Header */}
              <div className="p-3.5 bg-gradient-to-r from-amber-600 via-rose-600 to-amber-700 border-b border-amber-400/40 flex items-center justify-between shadow-md">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-white/20 text-amber-200 border border-white/30 flex items-center justify-center shrink-0 shadow-xs">
                    <Gift className="w-6 h-6 text-yellow-300 animate-bounce" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm sm:text-base text-white flex items-center gap-1.5">
                      <span>إهداء هدية تكريمية فاخرة 🎁✨</span>
                    </h3>
                    <p className="text-[11px] text-amber-100 font-medium">
                      إلى صاحب الحساب المحترم: <strong className="text-yellow-300">[{giftModalTarget.username}]</strong>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setGiftModalTarget(null)}
                  className="w-8 h-8 rounded-lg bg-black/40 hover:bg-black/60 text-white flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              {/* Body */}
              <div className="p-3 sm:p-4 overflow-y-auto modal-scroll-container space-y-3.5 flex-1">
                {/* Note */}
                <div className="p-2.5 bg-amber-500/10 border border-amber-400/30 rounded-xl text-xs text-amber-200 flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    عند إرسال الهدية، ستظهر فوراً كمرافقة لاسم العضو بجانب صورته الشخصية في جميع أرجاء الشات (الرسائل، قائمة المتواجدين، المايك، البروفايل) وستصله في تنبيه خاص.
                  </div>
                </div>

                {/* Gifts Grid */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                      <span>اختر الهدية من قائمة الرموز التكريمية:</span>
                    </label>
                    <span className="text-[10px] text-slate-400">
                      (تدار الأيقونات من لوحة التحكم - الرموز)
                    </span>
                  </div>

                  {(() => {
                    const customGifts = emblemsConfig.items.filter((i) => i.type === 'gift');
                    const defaultGifts = DEFAULT_EMBLEMS.filter((i) => i.type === 'gift');
                    // Combine and deduplicate
                    const allGiftsMap = new Map<string, EmblemItem>();
                    [...customGifts, ...defaultGifts].forEach((g) => {
                      if (!allGiftsMap.has(g.id)) allGiftsMap.set(g.id, g);
                    });
                    const availableGifts = Array.from(allGiftsMap.values());

                    if (availableGifts.length === 0) {
                      return (
                        <div className="p-6 text-center text-slate-400 text-xs bg-black/30 rounded-xl border border-slate-800">
                          لا توجد هدايا متاحة حالياً. يمكنك رفع وإضافة رموز هدايا جديدة من لوحة التحكم.
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {availableGifts.map((gift) => {
                          const isSelected = selectedGiftId === gift.id || (!selectedGiftId && gift === availableGifts[0]);
                          return (
                            <div
                              key={gift.id}
                              onClick={() => setSelectedGiftId(gift.id)}
                              className={`p-2.5 rounded-xl border-2 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 relative group ${
                                isSelected
                                  ? 'bg-gradient-to-b from-amber-500/25 to-yellow-500/10 border-amber-400 ring-2 ring-amber-400/50 shadow-lg scale-102'
                                  : 'bg-black/30 border-slate-700/80 hover:border-slate-500 hover:bg-black/50'
                              }`}
                            >
                              <div className="relative w-12 h-12 flex items-center justify-center my-1">
                                <img
                                  src={gift.imageUrl}
                                  alt={gift.title}
                                  className={`w-11 h-11 object-contain drop-shadow-md transition-transform duration-200 group-hover:scale-110 ${
                                    isSelected ? 'scale-110 animate-pulse' : ''
                                  }`}
                                />
                                {isSelected && (
                                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[10px] font-black shadow-xs">
                                    ✓
                                  </span>
                                )}
                              </div>
                              <span className={`text-[11px] font-bold line-clamp-1 mt-1 ${isSelected ? 'text-amber-200 font-black' : 'text-slate-300'}`}>
                                {gift.title}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                {/* Dedication Message */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-bold text-slate-300 block">
                    💌 كلمة أو إهداء لطيف مع الهدية:
                  </label>
                  <input
                    type="text"
                    value={giftDedicationMessage}
                    onChange={(e) => setGiftDedicationMessage(e.target.value)}
                    placeholder="اكتب عبارة إهداء خاصة تظهر للجميع..."
                    maxLength={100}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white outline-none focus:border-amber-400"
                  />
                  {/* Preset Suggestions */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    {[
                      'مع أطيب التحيات وخالص التقدير 🌹',
                      'ألف مبروك التميز والتألق 🌟',
                      'تستاهل كل خير وتقدير يا غالي 👑',
                      'هدية متواضعة من القلب 💎',
                      'صداقة دائمة ومحبة متبادلة ✨'
                    ].map((preset, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        onClick={() => setGiftDedicationMessage(preset)}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 hover:bg-amber-600/30 hover:text-amber-300 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-3 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setGiftModalTarget(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs cursor-pointer"
                >
                  إلغاء ✖
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const customGifts = emblemsConfig.items.filter((i) => i.type === 'gift');
                    const defaultGifts = DEFAULT_EMBLEMS.filter((i) => i.type === 'gift');
                    const allGifts = [...customGifts, ...defaultGifts];
                    const chosen = allGifts.find((g) => g.id === selectedGiftId) || allGifts[0];

                    if (!chosen) {
                      showToast('يرجى اختيار هدية من القائمة أولاً', 'error');
                      return;
                    }

                    socket?.emit('sendMemberGift', {
                      targetUsername: giftModalTarget.username,
                      giftUrl: chosen.imageUrl,
                      giftTitle: chosen.title,
                      giftMessage: giftDedicationMessage.trim()
                    });

                    try {
                      confetti({
                        particleCount: 60,
                        spread: 70,
                        origin: { y: 0.6 }
                      });
                    } catch (e) {}

                    showToast(`تم إهداء وتثبيت [${chosen.title}] لـ [${giftModalTarget.username}] بنجاح 🎁✨`, 'success');
                    setGiftModalTarget(null);
                  }}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:opacity-95 active:scale-95 text-slate-950 font-black rounded-xl text-xs sm:text-sm shadow-md flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Gift className="w-4 h-4 fill-slate-950" />
                  <span>إرسال وتثبيت الهدية الآن 🎁</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            GIFT RECEIVED POPUP CELEBRATION (تنبيه احتفالي فوري عند استلام هدية)
           ========================================================================= */}
        {giftReceivedAlert && (
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setGiftReceivedAlert(null);
            }}
            className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in"
            dir="rtl"
          >
            <div className="w-full max-w-sm bg-gradient-to-b from-slate-900 via-slate-900 to-[#1e130c] border-2 border-amber-400 rounded-2xl shadow-2xl overflow-hidden p-5 text-center text-slate-100 relative animate-in zoom-in-95 space-y-4">
              {/* Confetti / Sparkle Crown */}
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 p-1 shadow-lg shadow-amber-500/30 flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center">
                  <img
                    src={giftReceivedAlert.giftUrl}
                    alt={giftReceivedAlert.giftTitle}
                    className="w-10 h-10 object-contain drop-shadow-md animate-bounce duration-1000"
                  />
                </div>
              </div>

              <div>
                <span className="text-[11px] font-black text-amber-400 uppercase tracking-widest block mb-1">
                  🎉 مبارك! لقد استلمت هدية جديدة 🎉
                </span>
                <h3 className="text-lg font-black text-white">
                  {giftReceivedAlert.giftTitle}
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  أهداها لك صاحب الحساب المحترم: <strong className="text-amber-300 font-black">[{giftReceivedAlert.fromUsername}]</strong>
                </p>
              </div>

              {giftReceivedAlert.giftMessage && (
                <div className="p-3 rounded-xl bg-white/5 border border-amber-400/30 text-xs italic text-amber-100 font-medium">
                  💌 "{giftReceivedAlert.giftMessage}"
                </div>
              )}

              <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-[11px] text-emerald-300 font-bold">
                ✓ تم تثبيت هذه الهدية فوراً كمرافقة لاسمك بجانب صورتك الشخصية في جميع أرجاء الشات ✨
              </div>

              <button
                type="button"
                onClick={() => setGiftReceivedAlert(null)}
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black rounded-xl text-sm shadow-md cursor-pointer transition-all active:scale-95"
              >
                شكراً جزيلاً 💖 (إغلاق)
              </button>
            </div>
          </div>
        )}

        {/* Story Upload Progress Overlay */}
        {isStoryUploading && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-white p-4">
            <div className="bg-slate-900 border border-amber-500/60 p-5 rounded-2xl max-w-xs w-full text-center space-y-3 shadow-2xl">
              <Sparkles className="w-8 h-8 text-amber-400 mx-auto animate-spin" />
              <div className="font-bold text-sm text-amber-300">جاري رفع ونشر الخاطرة / الحالة...</div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700">
                <div
                  className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full transition-all duration-200"
                  style={{ width: `${storyUploadProgress}%` }}
                />
              </div>
              <div className="text-xs text-slate-400 font-mono">{storyUploadProgress}%</div>
              <div className="text-[10px] text-amber-200/80">ستبقى معروضة لجميع الأعضاء لمدة 24 ساعة ⏳</div>
            </div>
          </div>
        )}

        {/* Story Creation / Preview Modal */}
        {isCreatingStory && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 text-right">
            <div className="bg-slate-900 border border-amber-500/60 rounded-2xl max-w-sm w-full p-4 space-y-3 shadow-2xl text-white animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="font-bold text-sm text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>نشر خاطرة / حالة جديدة (24 ساعة)</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingStory(false);
                    setStoryMediaUrl('');
                    setStoryCaption('');
                  }}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Media Preview */}
              <div className="rounded-xl overflow-hidden bg-black max-h-[45vh] flex items-center justify-center border border-slate-800">
                {storyMediaType === 'video' ? (
                  <video src={storyMediaUrl} controls autoPlay muted playsInline className="max-h-[45vh] w-full object-contain" />
                ) : (
                  <img src={storyMediaUrl} alt="معاينة الخاطرة" className="max-h-[45vh] w-full object-contain" />
                )}
              </div>

              {/* Caption Input */}
              <div className="space-y-1">
                <label className="text-xs text-amber-200/90 font-bold block">اكتب خاطرة أو وصفاً مع الحالة (اختياري):</label>
                <textarea
                  rows={2}
                  value={storyCaption}
                  onChange={(e) => setStoryCaption(e.target.value)}
                  placeholder="...ماذا يدور في خاطرك اليوم؟"
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 outline-none focus:border-amber-500 resize-none font-medium"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingStory(false);
                    setStoryMediaUrl('');
                    setStoryCaption('');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handlePublishStory}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 text-xs font-black shadow-lg cursor-pointer flex items-center gap-1.5"
                >
                  <span>نشر للجميع ✨</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 24-Hour Story Viewer Modal: الأزرار المطلوبة [خروج، إعجاب، تعليق، تحميل] */}
        {activeStoryViewer && (
          <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-3 select-none text-white animate-in fade-in duration-150">
            {/* Top Bar: Author Info, Time, & Caption */}
            <div className="flex items-center justify-between pb-2 border-b border-white/10 z-10">
              <div className="flex items-center gap-2.5">
                <img
                  src={activeStoryViewer.avatarUrl || falconIcon}
                  alt={activeStoryViewer.username}
                  className="w-10 h-10 rounded-full border-2 border-amber-400 object-cover shadow-md"
                />
                <div className="text-right">
                  <div className="text-xs font-bold text-amber-300 flex items-center gap-1">
                    <span>{activeStoryViewer.username}</span>
                    {activeStoryViewer.flag && <span>{activeStoryViewer.flag}</span>}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {activeStoryViewer.time} • ⏳ حالة 24 ساعة
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {currentUser && (activeStoryViewer.username === currentUser.username || currentUser.role === 'hassan' || currentUser.role === 'admin' || currentUser.role === 'super') && (
                  <button
                    type="button"
                    onClick={() => {
                      const storyId = activeStoryViewer.id;
                      openAppConfirm(
                        'حذف الخاطرة',
                        'هل أنت متأكد من حذف هذه الخاطرة نهائياً؟',
                        () => {
                          socket?.emit('deleteStory', { storyId });
                          setActiveStoryViewer(null);
                          showToast('تم حذف الخاطرة بنجاح 🗑️', 'info');
                        }
                      );
                    }}
                    className="p-1.5 rounded-lg bg-rose-900/60 hover:bg-rose-800 text-rose-300 text-xs font-bold transition-all"
                    title="حذف الخاطرة"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                {/* زر خروج العلوي */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveStoryViewer(null);
                    setShowStoryComments(false);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                  title="خروج من عرض الخاطرة"
                >
                  <X className="w-4 h-4" />
                  <span>خروج</span>
                </button>
              </div>
            </div>

            {/* Main Media Container */}
            <div className="flex-1 flex flex-col items-center justify-center p-2 min-h-0 relative">
              {activeStoryViewer.mediaType === 'video' ? (
                <video
                  src={activeStoryViewer.mediaUrl}
                  controls
                  autoPlay
                  playsInline
                  className="max-h-[60vh] max-w-full rounded-2xl object-contain shadow-2xl border border-white/10"
                />
              ) : (
                <img
                  src={activeStoryViewer.mediaUrl}
                  alt="خاطرة"
                  className="max-h-[60vh] max-w-full rounded-2xl object-contain shadow-2xl border border-white/10"
                />
              )}

              {/* Caption Overlay */}
              {activeStoryViewer.caption && (
                <div className="mt-3 max-w-md w-full bg-black/60 backdrop-blur-sm border border-white/15 px-3 py-2 rounded-xl text-center text-xs text-amber-100 font-medium leading-relaxed">
                  {activeStoryViewer.caption}
                </div>
              )}
            </div>

            {/* Comments Drawer / Box when toggled */}
            {showStoryComments && (
              <div className="bg-slate-900/95 border border-white/15 rounded-2xl p-3 max-h-48 overflow-y-auto mb-2 text-right space-y-2 backdrop-blur-md shadow-2xl">
                <div className="text-xs font-bold text-amber-300 border-b border-slate-800 pb-1 flex items-center justify-between">
                  <span>التعليقات على الخاطرة ({activeStoryViewer.comments?.length || 0}):</span>
                  <button
                    type="button"
                    onClick={() => setShowStoryComments(false)}
                    className="text-slate-400 hover:text-white text-xs"
                  >
                    إغلاق التعليقات
                  </button>
                </div>
                <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                  {(!activeStoryViewer.comments || activeStoryViewer.comments.length === 0) ? (
                    <div className="text-[11px] text-slate-400 text-center py-2">لا توجد تعليقات بعد، كن أول من يعلق!</div>
                  ) : (
                    activeStoryViewer.comments.map((cm) => (
                      <div key={cm.id} className="text-xs bg-slate-800/80 p-1.5 rounded-lg border border-slate-700/60">
                        <div className="flex items-center justify-between text-[10px] text-amber-400 font-bold mb-0.5">
                          <span>{cm.username}</span>
                          <span className="text-slate-400 font-mono">{cm.time}</span>
                        </div>
                        <div className="text-slate-200">{cm.text}</div>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-1.5 pt-1 border-t border-slate-800">
                  <input
                    type="text"
                    value={storyCommentInput}
                    onChange={(e) => setStoryCommentInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && storyCommentInput.trim()) {
                        e.preventDefault();
                        socket?.emit('addStoryComment', {
                          storyId: activeStoryViewer.id,
                          text: storyCommentInput.trim()
                        });
                        setStoryCommentInput('');
                      }
                    }}
                    placeholder="اكتب تعليقك هنا..."
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-400 outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (storyCommentInput.trim()) {
                        socket?.emit('addStoryComment', {
                          storyId: activeStoryViewer.id,
                          text: storyCommentInput.trim()
                        });
                        setStoryCommentInput('');
                      }
                    }}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-lg cursor-pointer"
                  >
                    إرسال
                  </button>
                </div>
              </div>
            )}

            {/* Bottom 4 Explicit Action Buttons: [خروج، إعجاب، تعليق، تحميل] */}
            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-white/10 z-10">
              {/* 1. زر خروج */}
              <button
                type="button"
                onClick={() => {
                  setActiveStoryViewer(null);
                  setShowStoryComments(false);
                }}
                className="py-2.5 px-2 bg-slate-800/90 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1 border border-white/10 transition-all active:scale-95 cursor-pointer shadow-md"
              >
                <X className="w-4 h-4 text-rose-400" />
                <span>خروج</span>
              </button>

              {/* 2. زر إعجاب */}
              <button
                type="button"
                onClick={() => {
                  socket?.emit('likeStory', { storyId: activeStoryViewer.id });
                }}
                className={`py-2.5 px-2 rounded-xl text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1 border transition-all active:scale-95 cursor-pointer shadow-md ${
                  currentUser && activeStoryViewer.likedUsers?.includes(currentUser.username.toLowerCase())
                    ? 'bg-rose-950/80 text-rose-300 border-rose-600/80'
                    : 'bg-slate-800/90 hover:bg-slate-700 text-rose-400 border-white/10'
                }`}
              >
                <Heart className={`w-4 h-4 ${currentUser && activeStoryViewer.likedUsers?.includes(currentUser.username.toLowerCase()) ? 'fill-rose-500 text-rose-500' : 'text-rose-400'}`} />
                <span>إعجاب ({activeStoryViewer.likes || 0})</span>
              </button>

              {/* 3. زر تعليق */}
              <button
                type="button"
                onClick={() => setShowStoryComments(!showStoryComments)}
                className={`py-2.5 px-2 rounded-xl text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1 border transition-all active:scale-95 cursor-pointer shadow-md ${
                  showStoryComments
                    ? 'bg-amber-950/80 text-amber-300 border-amber-600/80'
                    : 'bg-slate-800/90 hover:bg-slate-700 text-amber-400 border-white/10'
                }`}
              >
                <MessageSquare className="w-4 h-4 text-amber-400" />
                <span>تعليق ({activeStoryViewer.comments?.length || 0})</span>
              </button>

              {/* 4. زر تحميل */}
              <button
                type="button"
                onClick={() => {
                  handleDownloadMedia(
                    activeStoryViewer.mediaUrl,
                    `story-${activeStoryViewer.username}-${activeStoryViewer.mediaType === 'video' ? 'video.mp4' : 'image.jpg'}`
                  );
                }}
                className="py-2.5 px-2 bg-slate-800/90 hover:bg-slate-700 text-emerald-400 rounded-xl text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1 border border-white/10 transition-all active:scale-95 cursor-pointer shadow-md"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>تحميل</span>
              </button>
            </div>
          </div>
        )}

        {/* 8. Connection & Session Diagnostics Modal (مركز فحص وتشخيص الاتصال والجلسة) */}
        {showConnectionDetailsModal && (
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowConnectionDetailsModal(false);
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fade-in"
            dir="rtl"
          >
            <div className="bg-[#18110b] border-2 border-amber-500/80 rounded-2xl w-full max-w-sm flex flex-col shadow-2xl overflow-hidden text-right text-white">
              {/* Header */}
              <div className="p-3 bg-[#241a12] border-b border-[#3e2c1c] flex items-center justify-between text-amber-200">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">حالة الاتصال والجلسة</h3>
                    <p className="text-[10px] text-amber-300/70">مراقبة الجلسة اللحظية وسرعة الخادم</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowConnectionDetailsModal(false)}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-3.5 space-y-3 text-xs overflow-y-auto max-h-[75vh]">
                {/* 1. Status Card */}
                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-bold">حالة الاتصال المباشر:</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-black flex items-center gap-1.5 ${
                        connectionState === 'disconnected'
                          ? 'bg-rose-950 text-rose-300 border border-rose-500/50'
                          : connectionState === 'reconnecting'
                          ? 'bg-amber-950 text-amber-300 border border-amber-500/50 animate-pulse'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          connectionState === 'disconnected'
                            ? 'bg-rose-500'
                            : connectionState === 'reconnecting'
                            ? 'bg-amber-400 animate-ping'
                            : 'bg-emerald-400'
                        }`}
                      />
                      <span>
                        {connectionState === 'disconnected'
                          ? 'منقطع الاتصال'
                          : connectionState === 'reconnecting'
                          ? 'جاري استعادة الجلسة'
                          : 'متصل ومستقر'}
                      </span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-800 pt-2">
                    <span className="text-[11px] text-slate-400 font-bold">سرعة الاستجابة (Ping):</span>
                    <span className="font-mono font-black text-xs flex items-center gap-1 text-amber-300">
                      <span>{pingLatency !== null ? `${pingLatency} ms` : 'قياس...'}</span>
                      <span className="text-[10px] text-slate-400">
                        {pingLatency !== null && pingLatency < 75
                          ? '(ممتاز 🟢)'
                          : pingLatency !== null && pingLatency < 180
                          ? '(جيد 🟡)'
                          : '(ضعيف 🔴)'}
                      </span>
                    </span>
                  </div>
                </div>

                {/* 2. Single Session Policy Status Card */}
                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 space-y-2 text-right">
                  <div className="flex items-center gap-1.5 text-amber-300 font-bold text-xs">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    <span>نظام الجلسة الواحدة المحمية:</span>
                  </div>
                  <p className="text-[11px] text-amber-100/80 leading-relaxed">
                    • مفعل بنجاح: حسابك مربوط بجلسة واحدة نشطة حالياً.<br />
                    • عند انقطاع النت أو ضعف الشبكة: يتم تعليق الاتصال واستعادة نفس الجلسة دون تكرار أو تسجيل دخول جديد.<br />
                    • عند فتح حسابك من جهاز أو متصفح آخر: يتم إنهاء هذه الجلسة فوراً واعتماد الجلسة الجديدة فقط.
                  </p>
                </div>

                {/* 3. Tech Info Grid */}
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[10px] text-slate-400 space-y-1.5 font-mono">
                  <div className="flex justify-between">
                    <span>الغرفة الحالية:</span>
                    <span className="text-white font-sans font-bold">{currentUser?.room || 'الغرفة العامة'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>العضو المسجل:</span>
                    <span className="text-amber-300 font-sans font-bold">{currentUser?.username || 'زائر'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>معرف الاتصال (Socket):</span>
                    <span className="text-slate-300 truncate max-w-[170px]">{socket?.id || 'غير متصل'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>حالة التواجد (Presence):</span>
                    <span className="text-emerald-400 font-bold font-sans">
                      {currentUser?.presenceState === 'away' ? 'في الخلفية 🟡' : 'نشط متصل 🟢'}
                    </span>
                  </div>
                </div>

                {/* 4. Action Buttons */}
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (socket && socket.connected) {
                        socket.emit('keepAlivePing', { timestamp: Date.now() });
                        showToast('تم إرسال إشارة فحص سرعة الاستجابة ⚡', 'info');
                      } else {
                        showToast('الخادم غير متصل حالياً', 'error');
                      }
                    }}
                    className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>فحص سرعة الاتصال الآن (Ping Test)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (socket) {
                        if (!socket.connected) socket.connect();
                        const savedToken = localStorage.getItem('soqoor_session_token');
                        if (savedToken) {
                          socket.emit('restoreSession', {
                            sessionToken: savedToken,
                            room: currentUser?.room || 'الغرفة العامة',
                            deviceFingerprint: generateDeviceFingerprint().fingerprintId
                          });
                        }
                        showToast('جاري استعادة ومزامنة الجلسة مع الخادم 🔄', 'info');
                      }
                    }}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-amber-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>إعادة مزامنة واستعادة الجلسة</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowConnectionDetailsModal(false);
                      handleExitChat();
                    }}
                    className="w-full py-2 bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-800/60 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>تسجيل الخروج الرسمي وإنهاء الجلسة</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Back Button Accidentally Pressed / Exit Confirmation Modal (إشعار تأكيد مغادرة الشات) */}
        {showExitConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in" dir="rtl">
            <div className="bg-[#18110b] border-2 border-amber-500/80 rounded-2xl w-full max-w-sm p-5 text-center shadow-2xl space-y-4 text-white animate-in zoom-in-95 duration-150">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500/20 via-rose-500/20 to-amber-500/30 text-amber-400 border-2 border-amber-500/60 flex items-center justify-center mx-auto shadow-lg animate-bounce">
                <AlertTriangle className="w-8 h-8 text-amber-400" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-black text-amber-300">
                  هل تريد مغادرة الشات؟
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  لقد ضغطت على زر الرجوع. هل تود البقاء في الدردشة أم تأكيد الخروج وإنهاء جلستك الحالية؟
                </p>
              </div>
              <div className="p-3 bg-amber-950/40 border border-amber-500/30 rounded-xl text-[11px] text-amber-200/90 text-right space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>تنبيه الحماية من الخروج غير المقصود:</span>
                </div>
                <div>• يمكنك الضغط على "البقاء في الشات" للاستمرار في محادثاتك دون انقطاع.</div>
              </div>
              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowExitConfirmModal(false)}
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-black rounded-xl text-xs shadow-lg transition-transform active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>🦅</span>
                  <span>البقاء في الشات (إلغاء الخروج)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowExitConfirmModal(false);
                    handleExitChat();
                  }}
                  className="w-full py-2.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-700/60 text-rose-300 hover:text-white font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-400" />
                  <span>نعم، تأكيد الخروج من الشات 🚪</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 🎵 ULTRA-RESILIENT BACKGROUND AUDIO ENGINE (مشغل الصوت بالخلفية دائم التثبيت في الـ DOM ومربوط بـ MediaSessionManager) */}
        <audio
          ref={floatingAudioRef}
          id="persistent-wall-audio"
          playsInline
          preload="auto"
          muted={isFloatingVideoMuted}
          onLoadedMetadata={(e) => {
            const el = e.currentTarget;
            const cur = floatingVideoStateRef.current;
            if (cur && el.duration && isFinite(el.duration)) {
              const mediaId = `floating-${cur.postId || cur.youtubeId || 'video'}`;
              mediaSessionManager.updateMediaState(mediaId, { duration: el.duration });
            }
          }}
          onTimeUpdate={(e) => {
            const el = e.currentTarget;
            const cur = floatingVideoStateRef.current;
            if (cur && el.duration && isFinite(el.duration)) {
              const mediaId = `floating-${cur.postId || cur.youtubeId || 'video'}`;
              mediaSessionManager.updateMediaState(mediaId, {
                currentTime: el.currentTime,
                duration: el.duration,
                playbackRate: el.playbackRate || 1
              });
            }
          }}
          onPlay={() => {
            isFloatingManualPauseRef.current = false;
            setIsFloatingVideoPlaying(true);
            const cur = floatingVideoStateRef.current;
            if (cur) {
              const mediaId = `floating-${cur.postId || cur.youtubeId || 'video'}`;
              mediaSessionManager.updateMediaState(mediaId, { isPlaying: true });
            }
          }}
          onPause={(e) => {
            const el = e.currentTarget;
            setIsFloatingVideoPlaying(false);
            const cur = floatingVideoStateRef.current;
            if (cur && !isFloatingManualPauseRef.current && !el.ended) {
              const mediaId = `floating-${cur.postId || cur.youtubeId || 'video'}`;
              mediaSessionManager.notifyUnexpectedElementPause(mediaId);
            }
            isFloatingManualPauseRef.current = false;
          }}
          onEnded={() => {
            showToast('انتهى تشغيل الفيديو 🎬', 'info');
            handleStopFloatingVideo();
          }}
          style={{
            position: 'fixed',
            width: '2px',
            height: '2px',
            bottom: '0px',
            right: '0px',
            opacity: 0.01,
            pointerEvents: 'none',
            zIndex: -1
          }}
        />

        {appDialog && (
          <div
            className="fixed inset-0 z-[10060] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setAppDialog(null)}
          >
            <div
              className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-right"
              dir="rtl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <h4 className="font-black text-sm text-white">{appDialog.title}</h4>
                <button
                  type="button"
                  onClick={() => setAppDialog(null)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <p className="text-xs text-slate-200 whitespace-pre-line leading-relaxed">{appDialog.message}</p>
                {appDialog.type === 'prompt' && (
                  <input
                    type={appDialog.inputType || 'text'}
                    value={appDialogInput}
                    onChange={(e) => setAppDialogInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = appDialogInput;
                        const cb = appDialog.onConfirm;
                        setAppDialog(null);
                        cb(val);
                      }
                    }}
                    placeholder={appDialog.placeholder || ''}
                    autoFocus
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs outline-none focus:border-amber-500"
                  />
                )}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setAppDialog(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const val = appDialogInput;
                      const cb = appDialog.onConfirm;
                      setAppDialog(null);
                      cb(val);
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black cursor-pointer"
                  >
                    تأكيد
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

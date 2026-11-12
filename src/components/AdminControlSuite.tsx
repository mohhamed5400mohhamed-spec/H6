import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  ShieldAlert,
  UserX,
  Megaphone,
  PieChart,
  FileText,
  Filter,
  Award,
  Lock,
  Unlock,
  Key,
  Trash2,
  Mic,
  MicOff,
  VolumeX,
  Volume2,
  Clock,
  Search,
  PlusCircle,
  AlertTriangle,
  Siren,
  Globe,
  Radio,
  Star,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  Flame,
  Sparkles,
  Edit3,
  HelpCircle,
  Heart,
  Zap,
  Copy,
  Palette,
  Image,
  X
} from 'lucide-react';
import { RoomStatsPieChart, RoomStatData } from './RoomStatsPieChart';
import { ChatShortcut, DEFAULT_PRESET_SHORTCUTS, expandClientShortcuts } from '../utils/chatShortcuts';
import { THEMES_LIST, FONTS_LIST, WALLPAPERS_LIST, BUBBLE_STYLES } from './ThemeAndWallpaperCenter';
import {
  CustomThemeColors,
  CustomThemePreset,
  DEFAULT_CUSTOM_THEME_COLORS,
  getBuiltInThemeColors,
  BUILT_IN_THEMES_FOR_EDITING,
  THEME_STYLES
} from '../constants/themeStyles';
import { getCountryNameFromFlag } from '../utils/countryDetect';
import {
  EmblemItem,
  EmblemType,
  EmblemsConfig,
  EmojiSizeSetting,
  createBannerSvgDataUri,
  createCustomEmojiSvgDataUri,
  createGiftBadgeSvgDataUri,
  createStickerSvgDataUri,
  createFalconChatBannerSvg,
  createFalconAvatarSvg,
  DEFAULT_FALCON_CHAT_BANNER,
  DEFAULT_FALCON_AVATAR_ICON,
  DEFAULT_EMBLEMS_CONFIG
} from '../utils/emblemsSystem';
import { DEFAULT_AVATAR_SVG } from '../utils/avatarConstants';
import { uploadMediaWithProgress } from '../utils/connectionKeepAlive';

export interface RoleDefinition {
  id: string;
  name: string;
  level: number;
  badgeColor?: string;
  isSystem?: boolean;
}

export interface User {
  id: string;
  username: string;
  room: string;
  avatarSeed: string;
  avatarUrl?: string;
  statusQuote: string;
  flag: string;
  role: 'admin' | 'super' | 'member' | 'guest' | string;
  likes: number;
  points: number;
  isVoice: boolean;
  micSlot: number | null;
  isMuted: boolean;
  isTextMuted: boolean;
  isSpeaking: boolean;
  presenceState?: 'online' | 'away' | 'offline';
  ipAddress?: string;
  deviceInfo?: string;
  deviceFingerprint?: string;
  honorBadge?: string;
  nameBannerUrl?: string;
  isPmDisabled?: boolean;
  isIncognito?: boolean;
  isJailed?: boolean;
  joinedAt?: number;
}

export interface LikesThresholdSettings {
  roomTextLikes: number;
  roomMediaLikes: number;
  wallTextLikes: number;
  wallMediaLikes: number;
  pmTextLikes: number;
  pmMediaLikes: number;
  micLikes: number;
  callLikes: number;
}

export interface MessageRetentionLimits {
  roomMaxMessages: number;
  wallMaxPosts: number;
  privateMaxMessages: number;
}

export interface ChatRoom {
  id: string;
  name: string;
  desc: string;
  isPasswordProtected: boolean;
  password?: string;
  voiceLimit: number;
  activeVoiceCount: number;
}

export interface MonitorEvent {
  id: string;
  type: string;
  description: string;
  actor: string;
  target?: string;
  time: string;
  timestamp?: number;
}

export interface ServerSecuritySettings {
  emergencyLockdown: boolean;
  guestsAllowed: boolean;
  blockExternalLinks: boolean;
  floodControlRate: number;
  marqueeTicker: string;
  autoIpBanEnabled?: boolean;
  autoIpBanThreshold?: number;
  autoIpBanWindowMinutes?: number;
  autoIpBanDurationMinutes?: number;
  geoRestrictionEnabled?: boolean;
  geoRestrictionMode?: 'blacklist' | 'whitelist';
  geoRestrictedCountries?: string[];
  geoBlockedCustomMessage?: string;
  offlineGraceSeconds?: number;
  micGraceSeconds?: number;
  awayDelaySeconds?: number;
  reconnectBannerDelaySeconds?: number;
  likeCooldownSeconds?: number;
}

export interface StaffMemo {
  id: string;
  author: string;
  role: string;
  text: string;
  priority: 'low' | 'normal' | 'urgent';
  timestamp: number;
  timeFormatted: string;
}

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

export interface FilterAlertItem {
  id: string;
  username: string;
  avatarUrl?: string;
  flag?: string;
  room: string;
  matchedWords: string[];
  fullMessage: string;
  timestamp: number;
  time: string;
}

export interface RegisteredMemberItem {
  username: string;
  role: 'admin' | 'super' | 'member' | 'guest' | string;
  flag: string;
  statusQuote: string;
  avatarUrl?: string;
  nameBannerUrl?: string;
  likes?: number;
  points?: number;
  honorBadge?: string;
  ipAddress?: string;
  deviceInfo?: string;
  deviceFingerprint?: string;
  isJailed?: boolean;
  isOnline: boolean;
  presenceState?: 'online' | 'away' | 'offline';
  currentRoom?: string;
  lastSeen?: number;
}

interface AdminControlSuiteProps {
  currentUser: User;
  rosterUsers: User[];
  allRegisteredMembers?: RegisteredMemberItem[];
  roomsList: ChatRoom[];
  roomStatsData: RoomStatData[];
  bannedList: BannedRecord[];
  roomSettings: { isChatLocked: boolean; slowModeSeconds: number; isVoiceLocked: boolean; showDeletedNotice?: boolean };
  serverSecurity: ServerSecuritySettings;
  staffMemos: StaffMemo[];
  monitorLogs: MonitorEvent[];
  monitoredWordsList: string[];
  filterAlerts?: FilterAlertItem[];
  likesSettings?: LikesThresholdSettings;
  messageLimits?: MessageRetentionLimits;
  onUpdateMessageLimits?: (limits: Partial<MessageRetentionLimits>) => void;
  generalWelcome?: { enabled: boolean; message: string; title: string };
  onUpdateGeneralWelcome?: (data: Partial<{ enabled: boolean; message: string; title: string }>) => void;
  onAdminAction: (action: string, targetUsername?: string, value?: any, reason?: string) => void;
  onManualBan: (username: string, ip: string, reason: string) => void;
  onUpdateSecurity: (newSettings: Partial<ServerSecuritySettings>) => void;
  onUpdateLikesSettings?: (newSettings: Partial<LikesThresholdSettings>) => void;
  onUpdateRoomDetails?: (data: any) => void;
  onAddStaffMemo: (text: string, priority: 'low' | 'normal' | 'urgent') => void;
  onDeleteStaffMemo: (memoId: string) => void;
  onAddMonitoredWord: (word: string) => void;
  onRemoveMonitoredWord: (word: string) => void;
  onClearMonitorLogs: () => void;
  onClearFilterAlerts?: () => void;
  onRevealNicks?: (username: string) => void;
  onOpenUserProfile: (user: User) => void;
  onSwitchRoom: (roomId: string) => void;
  onRefreshRoomStats?: () => void;
  shortcuts?: ChatShortcut[];
  onAddShortcut?: (trigger: string, replacement: string) => void;
  onDeleteShortcut?: (shortcutId: string) => void;
  onUpdateShortcut?: (id: string, trigger: string, replacement: string) => void;
  rolePermissions?: Record<string, any>;
  onUpdateRolePermissions?: (role: string, permissions: any) => void;
  rolesConfig?: RoleDefinition[];
  onSaveRole?: (role: RoleDefinition, permissions?: any) => void;
  onDeleteRole?: (roleId: string) => void;
  onApplyGlobalAppearance?: (themeId: string, fontId: string, wallpaperId: string, bubbleStyle?: string) => void;
  customThemes?: CustomThemePreset[];
  onSaveCustomTheme?: (preset: { id?: string; name: string; colors: CustomThemeColors; applyNow?: boolean }) => void;
  onDeleteCustomTheme?: (themeId: string) => void;
  chatFontWeight?: 'thin' | 'normal' | 'default' | 'bold' | 'black';
  onChangeFontWeight?: (weight: 'thin' | 'normal' | 'default' | 'bold' | 'black') => void;
  emblemsConfig?: EmblemsConfig;
  falconChatBanner?: string;
  falconAvatarIcon?: string;
  onUpdateFalconAssets?: (assets: { falconChatBanner?: string; falconAvatarIcon?: string }) => void;
  onAddEmblem?: (data: { type: EmblemType; title: string; imageUrl: string; targetMember?: string; requiredRole?: string }) => void;
  onDeleteEmblem?: (id: string) => void;
  onUpdateEmojiSize?: (size: EmojiSizeSetting) => void;
  onAssignMemberBanner?: (username: string, bannerUrl?: string) => void;
  onGrantMemberGift?: (username: string, giftUrl: string, giftTitle?: string) => void;
  onRemoveMemberGift?: (username: string, giftUrl: string) => void;
  initialTab?: 'moderation' | 'roomControls' | 'security' | 'bans' | 'broadcast' | 'stats' | 'memos' | 'words' | 'shortcuts' | 'logs' | 'matrix' | 'welcome' | 'emblems' | 'colors';
  initialThemeToEdit?: string;
  socket?: any;
  onClose: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const ALL_COUNTRIES_DATA: Array<{ code: string; name: string; flag: string; isArab: boolean; isGulf: boolean }> = [
  { code: 'SA', name: 'المملكة العربية السعودية', flag: '🇸🇦', isArab: true, isGulf: true },
  { code: 'EG', name: 'جمهورية مصر العربية', flag: '🇪🇬', isArab: true, isGulf: false },
  { code: 'YE', name: 'الجمهورية اليمنية', flag: '🇾🇪', isArab: true, isGulf: false },
  { code: 'IQ', name: 'جمهورية العراق', flag: '🇮🇶', isArab: true, isGulf: false },
  { code: 'SY', name: 'الجمهورية العربية السورية', flag: '🇸🇾', isArab: true, isGulf: false },
  { code: 'AE', name: 'الإمارات العربية المتحدة', flag: '🇦🇪', isArab: true, isGulf: true },
  { code: 'KW', name: 'دولة الكويت', flag: '🇰🇼', isArab: true, isGulf: true },
  { code: 'QA', name: 'دولة قطر', flag: '🇶🇦', isArab: true, isGulf: true },
  { code: 'BH', name: 'مملكة البحرين', flag: '🇧🇭', isArab: true, isGulf: true },
  { code: 'OM', name: 'سلطنة عمان', flag: '🇴🇲', isArab: true, isGulf: true },
  { code: 'JO', name: 'المملكة الأردنية الهاشمية', flag: '🇯🇴', isArab: true, isGulf: false },
  { code: 'LB', name: 'الجمهورية اللبنانية', flag: '🇱🇧', isArab: true, isGulf: false },
  { code: 'PS', name: 'دولة فلسطين', flag: '🇵🇸', isArab: true, isGulf: false },
  { code: 'DZ', name: 'الجمهورية الجزائرية', flag: '🇩🇿', isArab: true, isGulf: false },
  { code: 'MA', name: 'المملكة المغربية', flag: '🇲🇦', isArab: true, isGulf: false },
  { code: 'TN', name: 'الجمهورية التونسية', flag: '🇹🇳', isArab: true, isGulf: false },
  { code: 'LY', name: 'دولة ليبيا', flag: '🇱🇾', isArab: true, isGulf: false },
  { code: 'SD', name: 'جمهورية السودان', flag: '🇸🇩', isArab: true, isGulf: false },
  { code: 'TR', name: 'تركيا', flag: '🇹🇷', isArab: false, isGulf: false },
  { code: 'GB', name: 'المملكة المتحدة', flag: '🇬🇧', isArab: false, isGulf: false },
  { code: 'US', name: 'الولايات المتحدة الأمريكية', flag: '🇺🇸', isArab: false, isGulf: false },
  { code: 'DE', name: 'ألمانيا', flag: '🇩🇪', isArab: false, isGulf: false },
  { code: 'FR', name: 'فرنسا', flag: '🇫🇷', isArab: false, isGulf: false },
  { code: 'CA', name: 'كندا', flag: '🇨🇦', isArab: false, isGulf: false }
];

export const AdminControlSuite: React.FC<AdminControlSuiteProps> = ({
  currentUser,
  rosterUsers,
  allRegisteredMembers = [],
  roomsList,
  roomStatsData,
  bannedList,
  roomSettings,
  serverSecurity,
  staffMemos,
  monitorLogs,
  monitoredWordsList,
  filterAlerts = [],
  shortcuts = [],
  likesSettings,
  messageLimits,
  onUpdateMessageLimits,
  generalWelcome,
  onUpdateGeneralWelcome,
  rolePermissions,
  onUpdateRolePermissions,
  rolesConfig = [
    { id: 'hassan', name: '🦅 إدارة عليا (hassan)', level: 100000, badgeColor: 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-black font-black shadow-lg', isSystem: true },
    { id: 'admin', name: '👑 مدير النظام (Admin)', level: 100, badgeColor: 'bg-red-600 text-white', isSystem: true },
    { id: 'super', name: '🛡️ سوبر إداري (Super)', level: 75, badgeColor: 'bg-amber-600 text-white', isSystem: true },
    { id: 'member', name: '🎖️ عضو معتمد (Member)', level: 50, badgeColor: 'bg-indigo-600 text-white', isSystem: true },
    { id: 'guest', name: '👤 زائر (Guest)', level: 10, badgeColor: 'bg-slate-600 text-white', isSystem: true }
  ],
  onSaveRole,
  onDeleteRole,
  onApplyGlobalAppearance,
  emblemsConfig = DEFAULT_EMBLEMS_CONFIG,
  falconChatBanner,
  falconAvatarIcon,
  onUpdateFalconAssets,
  onAddEmblem,
  onDeleteEmblem,
  onUpdateEmojiSize,
  onAssignMemberBanner,
  onGrantMemberGift,
  onRemoveMemberGift,
  socket,
  customThemes = [],
  onSaveCustomTheme,
  onDeleteCustomTheme,
  chatFontWeight = 'default',
  onChangeFontWeight,
  onAdminAction,
  onManualBan,
  onUpdateSecurity,
  onUpdateLikesSettings,
  onUpdateRoomDetails,
  onAddStaffMemo,
  onDeleteStaffMemo,
  onAddMonitoredWord,
  onRemoveMonitoredWord,
  onClearMonitorLogs,
  onClearFilterAlerts,
  onRevealNicks,
  onOpenUserProfile,
  onSwitchRoom,
  onRefreshRoomStats,
  onAddShortcut,
  onDeleteShortcut,
  onUpdateShortcut,
  initialTab,
  initialThemeToEdit,
  onClose,
  showToast
}) => {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<
    'moderation' | 'roomControls' | 'security' | 'bans' | 'broadcast' | 'stats' | 'memos' | 'words' | 'shortcuts' | 'logs' | 'matrix' | 'welcome' | 'emblems' | 'colors'
  >(initialTab || 'moderation');

  // Configurable Timeouts & Grace Periods State
  const [timeoutForm, setTimeoutForm] = useState({
    offlineGraceSeconds: serverSecurity.offlineGraceSeconds ?? 45,
    micGraceSeconds: serverSecurity.micGraceSeconds ?? 45,
    awayDelaySeconds: serverSecurity.awayDelaySeconds ?? 120,
    reconnectBannerDelaySeconds: serverSecurity.reconnectBannerDelaySeconds ?? 4,
    likeCooldownSeconds: serverSecurity.likeCooldownSeconds ?? 60,
  });

  useEffect(() => {
    setTimeoutForm({
      offlineGraceSeconds: serverSecurity.offlineGraceSeconds ?? 45,
      micGraceSeconds: serverSecurity.micGraceSeconds ?? 45,
      awayDelaySeconds: serverSecurity.awayDelaySeconds ?? 120,
      reconnectBannerDelaySeconds: serverSecurity.reconnectBannerDelaySeconds ?? 4,
      likeCooldownSeconds: serverSecurity.likeCooldownSeconds ?? 60,
    });
  }, [
    serverSecurity.offlineGraceSeconds,
    serverSecurity.micGraceSeconds,
    serverSecurity.awayDelaySeconds,
    serverSecurity.reconnectBannerDelaySeconds,
    serverSecurity.likeCooldownSeconds,
  ]);

  // Expanded Color & Style Studio State
  const [customThemeName, setCustomThemeName] = useState<string>('');
  const [editingCustomThemeId, setEditingCustomThemeId] = useState<string | undefined>(undefined);
  const [customColorsForm, setCustomColorsForm] = useState<CustomThemeColors>({ ...DEFAULT_CUSTOM_THEME_COLORS });
  const [selectedBuiltInThemeToEdit, setSelectedBuiltInThemeToEdit] = useState<string>('pearl-gray-calm');
  const [themeEditMode, setThemeEditMode] = useState<'create' | 'editBuiltIn' | 'editCustom'>('create');

  const handleLoadBuiltInThemeForEditing = (themeId: string) => {
    const meta = BUILT_IN_THEMES_FOR_EDITING.find((t) => t.id === themeId);
    const colors = getBuiltInThemeColors(themeId);
    setCustomColorsForm(colors);
    setEditingCustomThemeId(themeId);
    setCustomThemeName(meta ? `${meta.name} (نسخة معدلة)` : `ثيم ${themeId} معدل`);
    setThemeEditMode('editBuiltIn');
    setSelectedBuiltInThemeToEdit(themeId);
    showToast(`تم استدعاء ألوان ثيم [${meta?.name || themeId}] في لوحة التعديل بنجاح! 🎨`, 'success');
  };

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (initialThemeToEdit) {
      setActiveTab('colors');
      handleLoadBuiltInThemeForEditing(initialThemeToEdit);
    }
  }, [initialThemeToEdit]);

  // General Welcome Settings State
  const [generalWelcomeEnabled, setGeneralWelcomeEnabled] = useState<boolean>(generalWelcome?.enabled ?? true);
  const [generalWelcomeTitle, setGeneralWelcomeTitle] = useState<string>(generalWelcome?.title || 'إدارة حسان برو 🦅');
  const [generalWelcomeText, setGeneralWelcomeText] = useState<string>(
    generalWelcome?.message || 'نحن سعداء بتشريفك فأهلاً بك عطراً فوّاحاً ينثرُ شذاه في كلّ الأرجاء .. نتمنى لك وقتاً ممتعاً 🌹'
  );

  useEffect(() => {
    if (generalWelcome) {
      setGeneralWelcomeEnabled(generalWelcome.enabled ?? true);
      setGeneralWelcomeTitle(generalWelcome.title || 'إدارة حسان برو 🦅');
      setGeneralWelcomeText(generalWelcome.message || '');
    }
  }, [generalWelcome]);

  // Appearance Global broadcast state
  const [globalThemeChoice, setGlobalThemeChoice] = useState('pearl-gray-calm');
  const [globalFontChoice, setGlobalFontChoice] = useState('Cairo');
  const [globalWallpaperChoice, setGlobalWallpaperChoice] = useState('default');
  const [globalBubbleChoice, setGlobalBubbleChoice] = useState('modern');

  // Dynamic Role Permissions Management Tab State
  const [selectedRoleForPerms, setSelectedRoleForPerms] = useState<string>('super');
  const [isAddingRole, setIsAddingRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleLevel, setNewRoleLevel] = useState<number>(60);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editRoleName, setEditRoleName] = useState('');
  const [editRoleLevel, setEditRoleLevel] = useState<number>(60);

  // Member View Mode: Live in current room vs All registered/login accounts vs Active Sessions
  const [memberViewMode, setMemberViewMode] = useState<'roomLive' | 'registeredAll' | 'activeSessions'>('roomLive');
  const [activeSessions, setActiveSessions] = useState<Array<{
    sessionToken: string;
    username: string;
    role: string;
    room: string;
    ip: string;
    device: string;
    flag: string;
    lastActive: number;
    currentSocketId?: string;
    isOnline: boolean;
  }>>([]);

  useEffect(() => {
    if (!socket) return;
    const handleSessionsList = (list: any[]) => {
      if (Array.isArray(list)) {
        setActiveSessions(list);
      }
    };
    socket.on('activeSessionsList', handleSessionsList);
    return () => {
      socket.off('activeSessionsList', handleSessionsList);
    };
  }, [socket]);

  // Filter Sub-tab: alerts log vs word list
  const [filterSubTab, setFilterSubTab] = useState<'alerts' | 'words'>('alerts');

  // Shortcuts Sub-tab: list vs test
  const [shortcutSubTab, setShortcutSubTab] = useState<'manage' | 'tester'>('manage');

  // Filters & Search
  const [memberRoleFilter, setMemberRoleFilter] = useState<'all' | 'admin' | 'super' | 'member' | 'guest' | 'jailed'>('all');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [logTypeFilter, setLogTypeFilter] = useState<'all' | 'kick_ban' | 'mute' | 'mic' | 'role' | 'security' | 'jail'>('all');
  const [logSearchQuery, setLogSearchQuery] = useState('');

  // Form States
  const [roomPasswordInput, setRoomPasswordInput] = useState('');
  const [broadcastTitleInput, setBroadcastTitleInput] = useState('تنبيه ملكي عاجل من إدارة حسان برو 🦅');
  const [broadcastTextInput, setBroadcastTextInput] = useState('');
  const [newWordInput, setNewWordInput] = useState('');
  const [marqueeInput, setMarqueeInput] = useState(serverSecurity.marqueeTicker || '');
  const [sirenTextInput, setSirenTextInput] = useState('🚨 تنبيه إداري عاجل من إدارة حسان برو! الرجاء الانتباه والالتزام بالقوانين.');

  // Chat Shortcuts Form States (إدارة اختصارات الشات الذكية)
  const [shortcutTriggerInput, setShortcutTriggerInput] = useState('');
  const [shortcutReplacementInput, setShortcutReplacementInput] = useState('');
  const [shortcutSearchQuery, setShortcutSearchQuery] = useState('');
  const [editingShortcut, setEditingShortcut] = useState<ChatShortcut | null>(null);
  const [editTriggerInput, setEditTriggerInput] = useState('');
  const [editReplacementInput, setEditReplacementInput] = useState('');
  const [testShortcutText, setTestShortcutText] = useState('نورت');

  // Emblems & Custom Emojis Sub-tabs & Form States (قسم الرموز، السوابر، الهدايا، الستيكرات والفيسات)
  const [emblemSubTab, setEmblemSubTab] = useState<'branding' | 'banners' | 'gifts' | 'stickers' | 'emojis'>('branding');
  // 0. Falcon Chat Official Branding Assets (بنر الشات falcon_chat_banner وأيقونة الصقر falcon_avatar_icon)
  const [falconChatBannerInput, setFalconChatBannerInput] = useState<string>(
    falconChatBanner || emblemsConfig?.falconChatBanner || DEFAULT_FALCON_CHAT_BANNER
  );
  const [falconAvatarIconInput, setFalconAvatarIconInput] = useState<string>(
    falconAvatarIcon || emblemsConfig?.falconAvatarIcon || DEFAULT_FALCON_AVATAR_ICON
  );
  const [isUploadingBanner, setIsUploadingBanner] = useState<boolean>(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState<boolean>(false);

  useEffect(() => {
    if (falconChatBanner !== undefined) {
      setFalconChatBannerInput(falconChatBanner || DEFAULT_FALCON_CHAT_BANNER);
    }
  }, [falconChatBanner]);

  useEffect(() => {
    if (falconAvatarIcon !== undefined) {
      setFalconAvatarIconInput(falconAvatarIcon || DEFAULT_FALCON_AVATAR_ICON);
    }
  }, [falconAvatarIcon]);

  // 1. Name Logos / Banners form
  const [bannerTitleInput, setBannerTitleInput] = useState('');
  const [bannerUrlInput, setBannerUrlInput] = useState('');
  const [bannerTargetMemberInput, setBannerTargetMemberInput] = useState('');
  const [bannerRoleInput, setBannerRoleInput] = useState('all');
  const [bannerSearchQuery, setBannerSearchQuery] = useState('');
  // 2. Gifts & Honors form
  const [giftTitleInput, setGiftTitleInput] = useState('');
  const [giftUrlInput, setGiftUrlInput] = useState('');
  const [giftTargetMemberInput, setGiftTargetMemberInput] = useState('');
  const [grantSelectedGiftUrl, setGrantSelectedGiftUrl] = useState('');
  const [grantTargetMember, setGrantTargetMember] = useState('');
  // 3. Stickers form
  const [stickerTitleInput, setStickerTitleInput] = useState('');
  const [stickerUrlInput, setStickerUrlInput] = useState('');
  // 4. Custom Emojis form & size
  const [emojiTitleInput, setEmojiTitleInput] = useState('');
  const [emojiUrlInput, setEmojiUrlInput] = useState('');
  const [emojiSearchQuery, setEmojiSearchQuery] = useState('');

  // Likes Threshold Requirements State (شروط عدد اللايكات المطلوبة للإرسال)
  const [likesForm, setLikesForm] = useState<LikesThresholdSettings>({
    roomTextLikes: likesSettings?.roomTextLikes || 0,
    roomMediaLikes: likesSettings?.roomMediaLikes || 0,
    wallTextLikes: likesSettings?.wallTextLikes || 0,
    wallMediaLikes: likesSettings?.wallMediaLikes || 0,
    pmTextLikes: likesSettings?.pmTextLikes || 0,
    pmMediaLikes: likesSettings?.pmMediaLikes || 0,
    micLikes: likesSettings?.micLikes || 0,
    callLikes: likesSettings?.callLikes || 0
  });

  useEffect(() => {
    if (likesSettings) {
      setLikesForm({
        roomTextLikes: likesSettings.roomTextLikes || 0,
        roomMediaLikes: likesSettings.roomMediaLikes || 0,
        wallTextLikes: likesSettings.wallTextLikes || 0,
        wallMediaLikes: likesSettings.wallMediaLikes || 0,
        pmTextLikes: likesSettings.pmTextLikes || 0,
        pmMediaLikes: likesSettings.pmMediaLikes || 0,
        micLikes: likesSettings.micLikes || 0,
        callLikes: likesSettings.callLikes || 0
      });
    }
  }, [likesSettings]);

  // Message Retention Form State (سقف وحدود الرسائل مع الحذف التلقائي للأقدم)
  const [retentionForm, setRetentionForm] = useState<MessageRetentionLimits>({
    roomMaxMessages: messageLimits?.roomMaxMessages || 200,
    wallMaxPosts: messageLimits?.wallMaxPosts || 100,
    privateMaxMessages: messageLimits?.privateMaxMessages || 100
  });

  useEffect(() => {
    if (messageLimits) {
      setRetentionForm({
        roomMaxMessages: messageLimits.roomMaxMessages || 200,
        wallMaxPosts: messageLimits.wallMaxPosts || 100,
        privateMaxMessages: messageLimits.privateMaxMessages || 100
      });
    }
  }, [messageLimits]);

  // Staff Memo State
  const [memoText, setMemoText] = useState('');
  const [memoPriority, setMemoPriority] = useState<'low' | 'normal' | 'urgent'>('normal');

  // Manual Ban Modal Inputs
  const [manualBanName, setManualBanName] = useState('');
  const [manualBanIp, setManualBanIp] = useState('');
  const [manualBanReason, setManualBanReason] = useState('مخالفة قوانين حسان برو والآداب العامة');

  // Advanced Security Settings State (Auto IP-Ban & Geo-Restrictions)
  const [showAdvancedSecurityModal, setShowAdvancedSecurityModal] = useState<boolean>(false);
  const [advSecurityTab, setAdvSecurityTab] = useState<'auto_ban' | 'geo_restrictions'>('auto_ban');
  const [countrySearchQuery, setCountrySearchQuery] = useState<string>('');

  const [advSecForm, setAdvSecForm] = useState<{
    autoIpBanEnabled: boolean;
    autoIpBanThreshold: number;
    autoIpBanWindowMinutes: number;
    autoIpBanDurationMinutes: number;
    geoRestrictionEnabled: boolean;
    geoRestrictionMode: 'blacklist' | 'whitelist';
    geoRestrictedCountries: string[];
    geoBlockedCustomMessage: string;
  }>({
    autoIpBanEnabled: serverSecurity?.autoIpBanEnabled ?? true,
    autoIpBanThreshold: serverSecurity?.autoIpBanThreshold ?? 3,
    autoIpBanWindowMinutes: serverSecurity?.autoIpBanWindowMinutes ?? 10,
    autoIpBanDurationMinutes: serverSecurity?.autoIpBanDurationMinutes ?? 60,
    geoRestrictionEnabled: serverSecurity?.geoRestrictionEnabled ?? false,
    geoRestrictionMode: serverSecurity?.geoRestrictionMode ?? 'blacklist',
    geoRestrictedCountries: serverSecurity?.geoRestrictedCountries ?? [],
    geoBlockedCustomMessage: serverSecurity?.geoBlockedCustomMessage || '🚫 نعتذر، الدخول غير متاح حالياً من منطقتك الجغرافية وفقاً لسياسة الأمان المتبعة في الدردشة.'
  });

  useEffect(() => {
    if (serverSecurity) {
      setAdvSecForm({
        autoIpBanEnabled: serverSecurity.autoIpBanEnabled ?? true,
        autoIpBanThreshold: serverSecurity.autoIpBanThreshold ?? 3,
        autoIpBanWindowMinutes: serverSecurity.autoIpBanWindowMinutes ?? 10,
        autoIpBanDurationMinutes: serverSecurity.autoIpBanDurationMinutes ?? 60,
        geoRestrictionEnabled: serverSecurity.geoRestrictionEnabled ?? false,
        geoRestrictionMode: serverSecurity.geoRestrictionMode ?? 'blacklist',
        geoRestrictedCountries: serverSecurity.geoRestrictedCountries ?? [],
        geoBlockedCustomMessage: serverSecurity.geoBlockedCustomMessage || '🚫 نعتذر، الدخول غير متاح حالياً من منطقتك الجغرافية وفقاً لسياسة الأمان المتبعة في الدردشة.'
      });
    }
  }, [serverSecurity]);

  // Room Creation / Edit Inputs
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [newRoomId, setNewRoomId] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [newRoomPass, setNewRoomPass] = useState('');
  const [newRoomVoiceCap, setNewRoomVoiceCap] = useState(30);

  // Edit Room Modal
  const [editingRoom, setEditingRoom] = useState<ChatRoom | null>(null);
  const [editRoomName, setEditRoomName] = useState('');
  const [editRoomDesc, setEditRoomDesc] = useState('');
  const [editRoomPass, setEditRoomPass] = useState('');
  const [editRoomVoiceCap, setEditRoomVoiceCap] = useState(30);

  // Quick Action User Dialog (Modal)
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userActionType, setUserActionType] = useState<'kick' | 'ban' | 'warn' | 'jail' | 'resetName' | 'badge' | 'role' | 'move' | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [actionValue, setActionValue] = useState('');

  const getRoleLevel = (roleId?: string): number => {
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
  };

  const isSupremeHassan = (currentUser?.role || '').trim().toLowerCase() === 'hassan';

  const canModerateUser = (target: User | { username: string; role: string; id?: string }) => {
    if (!target) return false;
    if (target.id && target.id === currentUser.id) return false;
    if (target.username.toLowerCase() === currentUser.username.toLowerCase()) return false;
    if (isSupremeHassan) return true;
    const actorLevel = getRoleLevel(currentUser.role);
    const targetLevel = getRoleLevel(target.role);
    return actorLevel > targetLevel;
  };

  const hasPerm = (permKey: string): boolean => {
    const cleanRole = (currentUser?.role || '').trim().toLowerCase();
    if (cleanRole === 'hassan' || cleanRole === 'admin' || getRoleLevel(cleanRole) > getRoleLevel('admin')) return true;
    const perms = rolePermissions?.[cleanRole] || rolePermissions?.[currentUser?.role];
    if (perms) {
      if (perms[permKey] !== undefined) return Boolean(perms[permKey]);
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
      if ((permKey === 'canEditMemberProfile' || permKey === 'canEditMemberData') && (perms.canEditMemberProfile !== undefined || perms.canEditMemberData !== undefined)) {
        return Boolean(perms.canEditMemberProfile ?? perms.canEditMemberData);
      }
      if ((permKey === 'canMute' || permKey === 'canMuteText') && (perms.canMute !== undefined || perms.canMuteText !== undefined)) {
        return Boolean(perms.canMute ?? perms.canMuteText);
      }
    }
    if (cleanRole === 'super') {
      const superDefaults: Record<string, boolean> = {
        canFilter: true,
        canDeleteMessage: true,
        canMute: true,
        canMuteVoice: true,
        canPullMic: true,
        canKick: true,
        canBan: true,
        canUnban: true,
        canJail: true,
        canUnjail: true,
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
        canMoveUsers: true
      };
      if (superDefaults[permKey] !== undefined) return superDefaults[permKey];
    }
    return false;
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return { short: '👑 مدير عام', badgeClass: 'bg-red-600 text-white' };
      case 'super':
        return { short: '🛡️ سوبر', badgeClass: 'bg-amber-600 text-white' };
      case 'member':
        return { short: '🎖️ عضو', badgeClass: 'bg-indigo-600 text-white' };
      default:
        return { short: '👤 زائر', badgeClass: 'bg-slate-600 text-white' };
    }
  };

  // Filtered members list
  const filteredUsers = rosterUsers.filter((u) => {
    if (memberRoleFilter === 'jailed') {
      if (!u.isJailed && u.room !== 'سجن حسان برو') return false;
    } else if (memberRoleFilter !== 'all' && u.role !== memberRoleFilter) {
      return false;
    }
    if (memberSearchQuery.trim()) {
      const q = memberSearchQuery.toLowerCase();
      return u.username.toLowerCase().includes(q) || u.statusQuote.toLowerCase().includes(q) || (u.ipAddress && u.ipAddress.includes(q));
    }
    return true;
  });

  // Filtered registered members (all saved memberships online and offline)
  const filteredRegisteredMembers = allRegisteredMembers.filter((m) => {
    if (memberRoleFilter === 'jailed') {
      if (!m.isJailed) return false;
    } else if (memberRoleFilter !== 'all' && m.role !== memberRoleFilter) {
      return false;
    }
    if (memberSearchQuery.trim()) {
      const q = memberSearchQuery.toLowerCase();
      return (
        m.username.toLowerCase().includes(q) ||
        (m.statusQuote && m.statusQuote.toLowerCase().includes(q)) ||
        (m.ipAddress && m.ipAddress.includes(q)) ||
        (m.deviceInfo && m.deviceInfo.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Live periodic ticker (updates relative times like "منذ دقيقة", "منذ 5 دقائق" live every 30s)
  const [, setLogTimeTicker] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setLogTimeTicker((prev) => prev + 1);
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Format log relative time in accurate Arabic (الآن، منذ دقيقة، منذ دقيقتين، منذ X دقائق، منذ ساعة، إلخ)
  const formatLogRelativeTime = (timestamp?: number, fallbackTime?: string, id?: string): string => {
    let effectiveTs = timestamp;
    if (!effectiveTs && id && id.startsWith('log-')) {
      const parts = id.split('-');
      const parsed = Number(parts[1]);
      if (parsed && !isNaN(parsed)) effectiveTs = parsed;
    }

    if (!effectiveTs && fallbackTime) {
      try {
        const parts = fallbackTime.replace(/[^\d:صمAPMapm]/g, '').trim().split(':');
        if (parts.length >= 2) {
          const d = new Date();
          let hours = parseInt(parts[0], 10);
          const minutes = parseInt(parts[1], 10);
          const seconds = parts[2] ? parseInt(parts[2], 10) : 0;
          if (fallbackTime.includes('م') || fallbackTime.toLowerCase().includes('pm')) {
            if (hours < 12) hours += 12;
          } else if (fallbackTime.includes('ص') || fallbackTime.toLowerCase().includes('am')) {
            if (hours === 12) hours = 0;
          }
          d.setHours(hours, minutes, seconds, 0);
          if (d.getTime() > Date.now() + 60000) {
            d.setDate(d.getDate() - 1);
          }
          effectiveTs = d.getTime();
        }
      } catch {}
    }

    if (!effectiveTs || isNaN(effectiveTs) || effectiveTs <= 0) {
      return 'منذ لحظات';
    }

    const now = Date.now();
    const diffSec = Math.max(0, Math.floor((now - effectiveTs) / 1000));

    // أقل من دقيقة
    if (diffSec < 60) {
      return 'منذ ثوانٍ';
    }

    const diffMin = Math.floor(diffSec / 60);

    // أقل من ساعة
    if (diffMin < 60) {
      if (diffMin === 1) return 'منذ دقيقة';
      if (diffMin === 2) return 'منذ دقيقتين';
      if (diffMin >= 3 && diffMin <= 10) return `منذ ${diffMin} دقائق`;
      return `منذ ${diffMin} دقيقة`;
    }

    const diffHours = Math.floor(diffMin / 60);

    // أقل من 24 ساعة
    if (diffHours < 24) {
      if (diffHours === 1) return 'منذ ساعة';
      if (diffHours === 2) return 'منذ ساعتين';
      if (diffHours >= 3 && diffHours <= 10) return `منذ ${diffHours} ساعات`;
      return `منذ ${diffHours} ساعة`;
    }

    const diffDays = Math.floor(diffHours / 24);

    // أيام
    if (diffDays === 1) return 'منذ يوم';
    if (diffDays === 2) return 'منذ يومين';
    if (diffDays >= 3 && diffDays <= 10) return `منذ ${diffDays} أيام`;
    return `منذ ${diffDays} يوماً`;
  };

  // Filtered logs (word_filter events belong exclusively to the dedicated filterAlerts tab)
  const filteredLogs = monitorLogs.filter((log) => {
    if (log.type === 'word_filter') return false;
    if (logTypeFilter === 'kick_ban' && !['kick', 'ban'].includes(log.type)) return false;
    if (logTypeFilter === 'mute' && log.type !== 'mute') return false;
    if (logTypeFilter === 'mic' && !['mic_take', 'mic_drop', 'mic_pull'].includes(log.type)) return false;
    if (logTypeFilter === 'role' && log.type !== 'role') return false;
    if (logTypeFilter === 'security' && log.type !== 'security') return false;
    if (logTypeFilter === 'jail' && log.type !== 'jail') return false;
    if (logSearchQuery.trim()) {
      const q = logSearchQuery.toLowerCase();
      return (
        log.description.toLowerCase().includes(q) ||
        log.actor.toLowerCase().includes(q) ||
        (log.target && log.target.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Export audit logs
  const handleExportLogs = () => {
    if (monitorLogs.length === 0) {
      showToast('لا توجد سجلات لتصديرها حالياً', 'info');
      return;
    }
    const textContent =
      `سجل الرقابة الإدارية - شات حسان برو\nتاريخ التصدير: ${new Date().toLocaleString('ar-EG')}\n==============================\n\n` +
      monitorLogs.map((l) => `[${l.time}] (${formatLogRelativeTime(l.timestamp, l.time, l.id)}) (${l.type.toUpperCase()}) ${l.description}`).join('\n');
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hassanpro-audit-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('تم تصدير سجل المراقبة بنجاح 📄', 'success');
  };

  // Staff members currently online
  const onlineStaff = rosterUsers.filter((u) => u.role === 'admin' || u.role === 'super');

  return (
    <div className="flex flex-col h-full bg-[#17110c] text-slate-100 overflow-hidden select-none font-sans">
      {/* Top Header */}
      <div className="bg-gradient-to-r from-[#2a1d12] via-[#3a2819] to-[#2a1d12] p-3 border-b border-[#4d3722] flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-sm text-amber-200 flex items-center gap-1.5">
              <span>لوحة التحكم والصلاحيات الإدارية الشاملة</span>
              <span className="text-[10px] bg-red-600 text-white font-mono px-1.5 py-0.2 rounded-full">PRO</span>
            </h3>
            <p className="text-[10px] text-amber-300/80">
              أهلاً بك [{currentUser.role.toUpperCase()}] {currentUser.username} • {onlineStaff.length} مشرف متواجد الآن
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg bg-black/30 hover:bg-black/60 text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="إغلاق لوحة التحكم"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Top Navigation Tabs - 2 Organized Rows of Buttons */}
      <div className="grid grid-cols-7 bg-[#241a12] text-[9px] font-bold border-b border-[#3e2c1c]">
        <button
          onClick={() => setActiveTab('moderation')}
          className={`py-2 px-0.5 text-center transition-colors border-b-2 flex items-center justify-center gap-1 cursor-pointer ${
            activeTab === 'moderation'
              ? 'border-amber-400 text-amber-300 bg-white/5 font-black'
              : 'border-transparent text-slate-300 hover:text-white'
          }`}
          title="إدارة الأعضاء والزوار والعقوبات"
        >
          <Users className="w-3.5 h-3.5 text-amber-400" />
          <span>الأعضاء</span>
        </button>

        <button
          onClick={() => setActiveTab('roomControls')}
          className={`py-2 px-0.5 text-center transition-colors border-b-2 flex items-center justify-center gap-1 cursor-pointer ${
            activeTab === 'roomControls'
              ? 'border-amber-400 text-amber-300 bg-white/5 font-black'
              : 'border-transparent text-slate-300 hover:text-white'
          }`}
          title="إدارة الغرف وقفل الشات والميكروفونات"
        >
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span>إدارة الروم</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`py-2 px-0.5 text-center transition-colors border-b-2 flex items-center justify-center gap-1 cursor-pointer ${
            activeTab === 'security'
              ? 'border-red-400 text-red-300 bg-red-950/30 font-black'
              : 'border-transparent text-slate-300 hover:text-white'
          }`}
          title="الأمان، قفل الطوارئ، وحظر الروابط"
        >
          <ShieldAlert className="w-3.5 h-3.5 text-red-400 animate-pulse" />
          <span>الأمان</span>
        </button>

        <button
          onClick={() => setActiveTab('bans')}
          className={`py-2 px-0.5 text-center transition-colors border-b-2 flex items-center justify-center gap-1 cursor-pointer ${
            activeTab === 'bans'
              ? 'border-amber-400 text-amber-300 bg-white/5 font-black'
              : 'border-transparent text-slate-300 hover:text-white'
          }`}
          title="سجل المحظورين وإضافة حظر يدوي"
        >
          <UserX className="w-3.5 h-3.5 text-rose-400" />
          <span>المحظورون</span>
        </button>

        <button
          onClick={() => setActiveTab('broadcast')}
          className={`py-2 px-0.5 text-center transition-colors border-b-2 flex items-center justify-center gap-1 cursor-pointer ${
            activeTab === 'broadcast'
              ? 'border-amber-400 text-amber-300 bg-white/5 font-black'
              : 'border-transparent text-slate-300 hover:text-white'
          }`}
          title="بث إشعار عام منبثق لكافة الغرف"
        >
          <Megaphone className="w-3.5 h-3.5 text-amber-400" />
          <span>بث عاجل</span>
        </button>

        <button
          onClick={() => setActiveTab('emblems')}
          className={`py-2 px-0.5 text-center transition-colors border-b-2 flex items-center justify-center gap-1 cursor-pointer ${
            activeTab === 'emblems'
              ? 'border-purple-400 text-purple-300 bg-purple-950/40 font-black'
              : 'border-transparent text-slate-300 hover:text-white'
          }`}
          title="إدارة الرموز، السوابر، الهدايا، الستيكرات والفيسات"
        >
          <Palette className="w-3.5 h-3.5 text-purple-400" />
          <span>الرموز 🎨</span>
          {emblemsConfig?.items && emblemsConfig.items.length > 0 && (
            <span className="text-[8.5px] bg-purple-500/30 text-purple-200 px-1 rounded-full font-mono">
              {emblemsConfig.items.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('welcome')}
          className={`py-2 px-0.5 text-center transition-colors border-b-2 flex items-center justify-center gap-1 cursor-pointer ${
            activeTab === 'welcome'
              ? 'border-emerald-400 text-emerald-300 bg-emerald-950/40 font-black'
              : 'border-transparent text-slate-300 hover:text-white'
          }`}
          title="إدارة الرسائل الترحيبية العامة للشات"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>الترحيب 💬</span>
        </button>
      </div>

      <div className="grid grid-cols-6 bg-[#1a140f] text-[9.5px] font-bold border-b border-[#3e2c1c]">
        <button
          onClick={() => setActiveTab('shortcuts')}
          className={`py-2 px-0.5 text-center transition-colors border-b-2 flex items-center justify-center gap-1 cursor-pointer ${
            activeTab === 'shortcuts'
              ? 'border-amber-400 text-amber-300 bg-amber-950/40 font-black'
              : 'border-transparent text-slate-300 hover:text-white'
          }`}
          title="قائمة الاختصارات الذكية للشات"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>الاختصارات ⚡</span>
          {shortcuts && shortcuts.length > 0 && (
            <span className="text-[9px] bg-amber-500/30 text-amber-300 px-1 rounded-full font-mono">
              {shortcuts.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('stats')}
          className={`py-2 px-0.5 text-center transition-colors border-b-2 flex items-center justify-center gap-1 cursor-pointer ${
            activeTab === 'stats'
              ? 'border-amber-400 text-amber-300 bg-white/5 font-black'
              : 'border-transparent text-slate-300 hover:text-white'
          }`}
          title="المخطط البياني الدائري للغرف"
        >
          <PieChart className="w-3.5 h-3.5 text-indigo-400" />
          <span>الإحصائيات</span>
        </button>

        <button
          onClick={() => setActiveTab('memos')}
          className={`py-2 px-0.5 text-center transition-colors border-b-2 flex items-center justify-center gap-1 cursor-pointer ${
            activeTab === 'memos'
              ? 'border-amber-400 text-amber-300 bg-white/5 font-black'
              : 'border-transparent text-slate-300 hover:text-white'
          }`}
          title="طاقم الإدارة ومذكرات المشرفين السرية"
        >
          <Award className="w-3.5 h-3.5 text-amber-400" />
          <span>طاقم الإدارة</span>
        </button>

        <button
          onClick={() => setActiveTab('words')}
          className={`py-2 px-0.5 text-center transition-colors border-b-2 flex items-center justify-center gap-1 cursor-pointer ${
            activeTab === 'words'
              ? 'border-amber-400 text-amber-300 bg-white/5 font-black'
              : 'border-transparent text-slate-300 hover:text-white'
          }`}
          title="إدارة الكلمات المحظورة بالفلتر"
        >
          <Filter className="w-3.5 h-3.5 text-amber-400" />
          <span>الفلتر</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`py-2 px-0.5 text-center transition-colors border-b-2 flex items-center justify-center gap-1 cursor-pointer ${
            activeTab === 'logs'
              ? 'border-amber-400 text-amber-300 bg-white/5 font-black'
              : 'border-transparent text-slate-300 hover:text-white'
          }`}
          title="سجل المراقبة والعمليات الإدارية"
        >
          <FileText className="w-3.5 h-3.5 text-cyan-400" />
          <span>السجل</span>
        </button>

        <button
          onClick={() => setActiveTab('matrix')}
          className={`py-2 px-0.5 text-center transition-colors border-b-2 flex items-center justify-center gap-1 cursor-pointer ${
            activeTab === 'matrix'
              ? 'border-amber-400 text-amber-300 bg-white/5 font-black'
              : 'border-transparent text-slate-300 hover:text-white'
          }`}
          title="مصفوفة وقواعد الصلاحيات الهرمية"
        >
          <Key className="w-3.5 h-3.5 text-yellow-400" />
          <span>الصلاحيات</span>
        </button>

        <button
          onClick={() => setActiveTab('colors')}
          className={`py-2 px-0.5 text-center transition-colors border-b-2 flex items-center justify-center gap-1 cursor-pointer ${
            activeTab === 'colors'
              ? 'border-amber-400 text-amber-300 bg-white/5 font-black'
              : 'border-transparent text-slate-300 hover:text-white'
          }`}
          title="استوديو الألوان والقوالب المخصصة"
        >
          <Palette className="w-3.5 h-3.5 text-pink-400" />
          <span>الألوان</span>
        </button>
      </div>

      {/* TAB 1: MEMBERS MODERATION */}
      {activeTab === 'moderation' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs bg-slate-900/60">
          {/* Sub-Switch: المتواجدون بالروم vs جميع العضويات المسجلة vs الجلسات النشطة */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-800 rounded-xl border border-slate-700 shadow-sm">
            <button
              type="button"
              onClick={() => setMemberViewMode('roomLive')}
              className={`py-2 px-1 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                memberViewMode === 'roomLive'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">بالروم ({rosterUsers.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setMemberViewMode('registeredAll')}
              className={`py-2 px-1 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                memberViewMode === 'registeredAll'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Award className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">العضويات ({allRegisteredMembers.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMemberViewMode('activeSessions');
                socket?.emit('getActiveSessions');
              }}
              className={`py-2 px-1 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                memberViewMode === 'activeSessions'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">الجلسات ({activeSessions.length}) 🔐</span>
            </button>
          </div>

          {/* Search & Filter Bar */}
          <div className="space-y-1.5">
            <div className="relative">
              <input
                type="text"
                placeholder={memberViewMode === 'roomLive' ? "بحث في المتواجدين بالاسم أو الحالة أو الـ IP..." : "بحث في قاعدة العضويات والأوفلاين بالاسم أو الـ IP أو الجهاز..."}
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                className="w-full p-2 pr-8 pl-3 rounded-xl text-xs bg-slate-800 border border-slate-700 focus:border-amber-500 focus:bg-slate-700 outline-none text-white placeholder-slate-400"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5" />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] font-bold">
              {(['all', 'admin', 'super', 'member', 'guest', 'jailed'] as const).map((r) => {
                const sourceList = memberViewMode === 'roomLive' ? rosterUsers : allRegisteredMembers;
                const count = r === 'all' 
                  ? sourceList.length 
                  : r === 'jailed' 
                  ? sourceList.filter((u: any) => u.isJailed || u.room === 'سجن حسان برو' || u.currentRoom === 'سجن حسان برو').length
                  : sourceList.filter((u: any) => u.role === r).length;
                return (
                  <button
                    key={r}
                    onClick={() => setMemberRoleFilter(r)}
                    className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                      memberRoleFilter === r
                        ? 'bg-amber-500 text-black font-black shadow-xs'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {r === 'all' && `الكل (${count})`}
                    {r === 'admin' && `الإدارة (${count})`}
                    {r === 'super' && `المشرفين (${count})`}
                    {r === 'member' && `الأعضاء (${count})`}
                    {r === 'guest' && `الزوار (${count})`}
                    {r === 'jailed' && `المسجونين (${count}) 🚔`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Members List View */}
          {memberViewMode === 'activeSessions' ? (
            /* ACTIVE SESSIONS & CONNECTED DEVICES */
            <div className="space-y-2">
              <div className="p-2.5 bg-indigo-950/50 border border-indigo-700/60 rounded-xl text-indigo-200 flex items-center justify-between gap-2">
                <span className="font-bold text-xs">
                  الجلسات النشطة والأجهزة المتصلة: يمكنك مراقبة الجلسات وإنهاء أي جلسة مخالفة فوراً
                </span>
                <button
                  type="button"
                  onClick={() => socket?.emit('getActiveSessions')}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-black shrink-0 cursor-pointer"
                >
                  تحديث 🔄
                </button>
              </div>

              {activeSessions.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs bg-slate-800/40 rounded-xl border border-dashed border-slate-700">
                  لا توجد جلسات نشطة مسجلة حالياً.
                </div>
              ) : (
                activeSessions.map((sess) => {
                  const canTerminate = canModerateUser({ username: sess.username, role: sess.role });
                  const roleBadge = getRoleBadge(sess.role);
                  return (
                    <div
                      key={sess.sessionToken}
                      className="p-3 rounded-xl border bg-slate-800/90 border-slate-700 hover:border-indigo-500/60 transition-all space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${sess.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                          <span className="font-black text-white text-xs truncate">{sess.username}</span>
                          <span>{sess.flag}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${roleBadge.badgeClass}`}>
                            {roleBadge.short}
                          </span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sess.isOnline ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-amber-950 text-amber-300 border border-amber-700'}`}>
                          {sess.isOnline ? 'متصل الآن 🟢' : 'معلق بالخلفية 🟡'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-300 bg-slate-900/80 p-2 rounded-lg border border-slate-700/70 font-mono">
                        <div className="truncate">🌐 IP: {sess.ip}</div>
                        <div className="truncate font-sans">🏠 الغرفة: {sess.room}</div>
                        <div className="col-span-2 truncate font-sans text-slate-400">📱 الجهاز: {sess.device}</div>
                      </div>

                      {canTerminate && (
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`هل أنت متأكد من إنهاء وإسقاط جلسة [${sess.username}] وطرده فوراً؟`)) {
                                socket?.emit('terminateSession', { sessionToken: sess.sessionToken });
                              }
                            }}
                            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-black text-[11px] flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <UserX className="w-3.5 h-3.5" />
                            <span>إنهاء وإسقاط الجلسة 🚪</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : memberViewMode === 'registeredAll' ? (
            /* ALL REGISTERED & HISTORICAL LOGINS (ONLINE & OFFLINE) */
            <div className="space-y-2">
              <div className="p-2.5 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-200 flex items-center justify-between">
                <span className="font-bold text-xs">
                  قاعدة العضويات المحفوظة: تحكم كامل بكل عضوية مسجلة وسجل دخول حتى لو كان العضو غير متصل (أوفلاين)
                </span>
                <span className="text-[10px] font-mono bg-emerald-900/80 px-2 py-0.5 rounded font-bold">
                  {filteredRegisteredMembers.length} عضوية
                </span>
              </div>

              {filteredRegisteredMembers.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs bg-slate-800/40 rounded-xl border border-dashed border-slate-700">
                  لا توجد عضويات مسجلة تطابق البحث.
                </div>
              ) : (
                filteredRegisteredMembers.map((m) => {
                  const isBanned = bannedList.some(
                    (b) => b.username.toLowerCase() === m.username.toLowerCase() || (m.ipAddress && b.ip === m.ipAddress)
                  );
                  const isJailed = m.isJailed;
                  const isOnline = m.isOnline;

                  return (
                    <div
                      key={m.username}
                      className={`p-3 rounded-xl border transition-all ${
                        isBanned
                          ? 'bg-rose-950/40 border-rose-800/80 shadow-xs'
                          : isJailed
                          ? 'bg-red-950/40 border-red-800/80 shadow-xs'
                          : isOnline
                          ? 'bg-slate-800/90 border-slate-700 hover:border-slate-600'
                          : 'bg-slate-900/80 border-slate-800 opacity-90'
                      }`}
                    >
                      {/* Member Meta Row */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative">
                            <img
                              src={m.avatarUrl || DEFAULT_AVATAR_SVG}
                              alt={m.username}
                              className={`w-10 h-10 rounded-xl object-cover border-2 flex-shrink-0 ${
                                isOnline ? 'border-emerald-500' : 'border-slate-600 grayscale'
                              }`}
                            />
                            <span
                              className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-slate-900 ${
                                isOnline ? 'bg-emerald-500' : 'bg-slate-500'
                              }`}
                              title={isOnline ? 'متصل الآن' : 'غير متصل (أوفلاين)'}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-white text-xs truncate flex items-center gap-1.5">
                              {m.nameBannerUrl ? (
                                <img
                                  src={m.nameBannerUrl}
                                  alt={m.username}
                                  title={m.username}
                                  className="h-5 max-h-[22px] max-w-[140px] object-contain rounded inline-block drop-shadow-xs"
                                />
                              ) : (
                                <span>{m.username}</span>
                              )}
                              <span>{m.flag}</span>
                              {m.honorBadge && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 font-bold truncate">
                                  {m.honorBadge}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[200px]">
                              {m.statusQuote || 'عضو في حسان برو'}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 text-[9px] text-slate-400 mt-0.5 font-mono">
                              <span>🌐 {m.ipAddress || '192.168.1.1'}</span>
                              <span>•</span>
                              <span>📱 {m.deviceInfo || 'جهاز ذكي'}</span>
                              <span>•</span>
                              <span>💎 {m.points || 0} نقطة</span>
                              <span>•</span>
                              <span>❤️ {m.likes || 0}</span>
                            </div>
                          </div>
                        </div>

                        {/* Status Badges */}
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getRoleBadge(m.role).badgeClass}`}>
                            {getRoleBadge(m.role).short}
                          </span>
                          {isOnline ? (
                            <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded text-[9px] font-bold">
                              متصل ({m.currentRoom || 'غرفة'})
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 bg-slate-800 text-slate-400 border border-slate-700 rounded text-[9px]">
                              أوفلاين
                            </span>
                          )}
                          {isBanned && (
                            <span className="px-1.5 py-0.2 bg-rose-600 text-white rounded text-[9px] font-black animate-pulse">
                              محظور ⛔
                            </span>
                          )}
                          {isJailed && (
                            <span className="px-1.5 py-0.2 bg-red-600 text-white rounded text-[9px] font-bold">
                              مسجون 🚔
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Management Actions for Offline & Online Members */}
                      <div className="pt-2 border-t border-slate-700/80 flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                        {/* رفع الحظر / Unban (متاح حتى لو كان العضو غير متصل) */}
                        {isBanned ? (
                          <button
                            type="button"
                            onClick={() => {
                              onAdminAction('unban', m.username);
                              showToast(`تم رفع الحظر وفك الباند عن [${m.username}] بنجاح 🔓`, 'success');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black flex items-center gap-1 cursor-pointer shadow-xs transition-colors"
                            title="رفع الحظر فوراً عن الاسم والـ IP"
                          >
                            <span>🔓 رفع الحظر</span>
                          </button>
                        ) : (
                          /* باند وحظر IP شامل */
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`هل أنت متأكد من حظر [${m.username}] وعنوان الـ IP [${m.ipAddress || ''}] نهائياً؟`)) {
                                onAdminAction('ban', m.username, 'حظر إداري دائم يشمل عنوان الـ IP والحسابات');
                                showToast(`تم تطبيق الباند وحظر الـ IP لـ [${m.username}]`, 'success');
                              }
                            }}
                            className="px-2 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                            title="حظر العضوية والـ IP نهائياً ومنع الدخول كزائر أو تسجيل جديد"
                          >
                            <Shield className="w-3 h-3" />
                            <span>باند IP</span>
                          </button>
                        )}

                        {/* سجن / إفراج (Jail / Unjail) */}
                        {isJailed ? (
                          <button
                            type="button"
                            onClick={() => {
                              onAdminAction('unjailUser', m.username);
                              showToast(`تم الإفراج عن [${m.username}] ونقله للغرفة العامة`, 'success');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 cursor-pointer"
                            title="فك السجن والإفراج"
                          >
                            <span>🕊️ إفراج</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              onAdminAction('jailUser', m.username, 'إيداع بالسجن بقرار إداري صارم');
                              showToast(`تم إيداع [${m.username}] في سجن حسان برو`, 'info');
                            }}
                            className="px-2 py-1 rounded-lg bg-slate-700 hover:bg-black text-amber-300 border border-slate-600 flex items-center gap-1 cursor-pointer"
                            title="إيداع وتثبيت في غرفة السجن"
                          >
                            <span>🚔 سجن</span>
                          </button>
                        )}

                        {/* ترقية الرتبة */}
                        {(currentUser.role === 'admin' || hasPerm('canChangeRoles')) && canModerateUser(m) && (
                          <button
                            type="button"
                            onClick={() => {
                              const actorLvl = getRoleLevel(currentUser.role);
                              const roleListStr = [...rolesConfig]
                                .filter((r) => isSupremeHassan || r.level < actorLvl)
                                .sort((a, b) => b.level - a.level)
                                .map((r) => `${r.id} (${r.name} - #${r.level})`)
                                .join('\n');
                              const r = prompt(`اختر معرف الرتبة الجديدة:\n${roleListStr}`, m.role);
                              if (r && r.trim()) {
                                const clean = r.trim().toLowerCase();
                                const found = rolesConfig.find((x) => x.id.toLowerCase() === clean);
                                if (found || ['hassan', 'admin', 'super', 'member', 'guest'].includes(clean)) {
                                  if (!isSupremeHassan && getRoleLevel(clean) >= actorLvl) {
                                    showToast('⛔ لا يمكنك ترقية عضو لرتبة مساوية أو أعلى من رتبتك!', 'error');
                                    return;
                                  }
                                  onAdminAction('updateRole', m.username, clean);
                                  showToast(`تمت ترقية رتبة [${m.username}] إلى ${found?.name || clean}`, 'success');
                                } else {
                                  showToast('الرتبة غير موجودة، يرجى كتابة معرف صحيح من القائمة', 'error');
                                }
                              }
                            }}
                            className="px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-emerald-300 border border-slate-600 flex items-center gap-1 cursor-pointer"
                            title="ترقية أو تغيير الرتبة"
                          >
                            <Award className="w-3 h-3 text-emerald-400" />
                            <span>الرتبة</span>
                          </button>
                        )}

                        {/* تعديل النقاط */}
                        {(currentUser.role === 'admin' || hasPerm('canEditPoints')) && canModerateUser(m) && (
                          <button
                            type="button"
                            onClick={() => {
                              const pts = prompt(`أدخل رصيد النقاط الجديد لـ [${m.username}]:`, String(m.points || 0));
                              if (pts !== null && !isNaN(Number(pts))) {
                                onAdminAction('updatePoints', m.username, Number(pts));
                                showToast(`تم تعديل نقاط [${m.username}] إلى ${pts}`, 'success');
                              }
                            }}
                            className="px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-amber-300 border border-slate-600 flex items-center gap-1 cursor-pointer"
                            title="تعديل رصيد النقاط"
                          >
                            <span>💎 نقاط</span>
                          </button>
                        )}

                        {/* تعديل اللايكات */}
                        {(currentUser.role === 'admin' || hasPerm('canEditLikes')) && canModerateUser(m) && (
                          <button
                            type="button"
                            onClick={() => {
                              const lks = prompt(`أدخل عدد اللايكات الجديد لـ [${m.username}]:`, String(m.likes || 0));
                              if (lks !== null && !isNaN(Number(lks))) {
                                onAdminAction('updateLikes', m.username, Number(lks));
                                showToast(`تم تعديل لايكات [${m.username}] إلى ${lks}`, 'success');
                              }
                            }}
                            className="px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-rose-300 border border-slate-600 flex items-center gap-1 cursor-pointer"
                            title="تعديل اللايكات"
                          >
                            <Heart className="w-3 h-3 text-rose-400" />
                            <span>لايكات</span>
                          </button>
                        )}

                        {/* تعديل الاسم والزخرفة */}
                        <button
                          type="button"
                          onClick={() => {
                            const newN = prompt(`أدخل الاسم أو الزخرفة الجديدة لـ [${m.username}]:`, m.username);
                            if (newN && newN.trim() && newN.trim() !== m.username) {
                              onAdminAction('updateUsername', m.username, newN.trim());
                              showToast(`تم تعديل اسم العضوية إلى [${newN.trim()}]`, 'success');
                            }
                          }}
                          className="px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600 flex items-center gap-1 cursor-pointer"
                          title="تعديل الاسم والزخرفة في قاعدة البيانات"
                        >
                          <Edit3 className="w-3 h-3 text-cyan-400" />
                          <span>تعديل الاسم</span>
                        </button>

                        {/* بنر الاسم المصور 500x50 */}
                        <button
                          type="button"
                          onClick={() => {
                            const bUrl = prompt(`أدخل رابط البنر المصور 500x50 لـ [${m.username}] (أو اتركه فارغاً لإلغاء البنر):`, m.nameBannerUrl || '');
                            if (bUrl !== null) {
                              if (onAssignMemberBanner) {
                                onAssignMemberBanner(m.username, bUrl.trim());
                              }
                              showToast(bUrl.trim() ? `تم حفظ بنر الاسم لـ [${m.username}] 🖼️` : `تم حذف بنر [${m.username}]`, 'success');
                            }
                          }}
                          className="px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-amber-300 border border-slate-600 flex items-center gap-1 cursor-pointer"
                          title="تحديد أو تغيير بنر الاسم المصور 500x50 لهذا العضو"
                        >
                          <Image className="w-3 h-3 text-amber-400" />
                          <span>{m.nameBannerUrl ? 'تعديل البنر 🖼️' : 'إسناد بنر 🖼️'}</span>
                        </button>

                        {/* تغيير كلمة المرور عند النسيان */}
                        {(currentUser.role === 'admin' || hasPerm('canChangeMemberPassword')) && canModerateUser(m) && (
                          <button
                            type="button"
                            onClick={() => {
                              const newPass = prompt(`أدخل كلمة المرور الجديدة للعضو [${m.username}] عند النسيان:`, '123456');
                              if (newPass && newPass.trim().length >= 3) {
                                onAdminAction('updatePassword', m.username, newPass.trim());
                                showToast(`تم تعيين كلمة مرور جديدة للعضو [${m.username}] بنجاح 🔑`, 'success');
                              } else if (newPass !== null) {
                                showToast('يجب أن تتكون كلمة المرور من 3 خانات على الأقل', 'error');
                              }
                            }}
                            className="px-2 py-1 rounded-lg bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-500/40 flex items-center gap-1 cursor-pointer"
                            title="تغيير كلمة المرور للعضو عند نسيانها"
                          >
                            <Key className="w-3 h-3 text-amber-400" />
                            <span>تغيير كلمة المرور 🔑</span>
                          </button>
                        )}

                        {/* منح وسام شرفي */}
                        <button
                          type="button"
                          onClick={() => {
                            const b = prompt(`أدخل الوسام أو اللقب الشرفي لـ [${m.username}] (اتركه فارغاً للإزالة):`, m.honorBadge || '👑 صقر ذهبي');
                            if (b !== null) {
                              onAdminAction('assignHonorBadge', m.username, b.trim() || undefined);
                              showToast(`تم تحديث الوسام الشرفي لـ [${m.username}]`, 'success');
                            }
                          }}
                          className="px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-amber-300 border border-slate-600 flex items-center gap-1 cursor-pointer"
                          title="منح أو تعديل وسام شرفي"
                        >
                          <Star className="w-3 h-3 text-amber-400" />
                          <span>وسام</span>
                        </button>

                        {/* كشف النكات والعضويات المرتبطة بالـ IP */}
                        <button
                          type="button"
                          onClick={() => {
                            if (onRevealNicks) {
                              onRevealNicks(m.username);
                            } else {
                              onAdminAction('revealNicks', m.username);
                            }
                          }}
                          className="px-2 py-1 rounded-lg bg-indigo-950/70 hover:bg-indigo-900 text-indigo-200 border border-indigo-700/60 flex items-center gap-1 cursor-pointer transition-colors"
                          title="كشف النكات والعضويات المسجلة من هذا الجهاز والـ IP"
                        >
                          <Search className="w-3 h-3 text-indigo-400" />
                          <span>🔍 كشف نكات</span>
                        </button>

                        {/* حذف العضوية بالكامل من السيرفر */}
                        {(currentUser.role === 'admin' || hasPerm('canDeleteAccounts')) && canModerateUser(m) && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`هل أنت متأكد من حذف عضوية [${m.username}] نهائياً من قاعدة البيانات؟`)) {
                                onAdminAction('deleteAccount', m.username);
                                showToast(`تم حذف عضوية [${m.username}] نهائياً`, 'info');
                              }
                            }}
                            className="px-2 py-1 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 flex items-center gap-1 cursor-pointer"
                            title="حذف الحساب نهائياً من قاعدة البيانات"
                          >
                            <Trash2 className="w-3 h-3 text-rose-400" />
                            <span>حذف العضوية</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* LIVE USERS IN CURRENT ROOM */
            <div className="space-y-2">
            {filteredUsers.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs bg-slate-800/40 rounded-xl border border-dashed border-slate-700">
                لا يوجد أعضاء يطابقون خيارات البحث والفلتر.
              </div>
            ) : (
              filteredUsers.map((user) => {
                const isSelf = user.id === currentUser.id;
                const canMod = canModerateUser(user);
                const roleBadge = getRoleBadge(user.role);

                return (
                  <div
                    key={user.id}
                    className={`p-3 rounded-xl border transition-all ${
                      user.isJailed || user.room === 'سجن حسان برو'
                        ? 'bg-red-950/40 border-red-800/80 shadow-xs'
                        : 'bg-slate-800/80 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    {/* User Meta Row */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={user.avatarUrl || DEFAULT_AVATAR_SVG}
                          alt={user.username}
                          onClick={() => onOpenUserProfile(user)}
                          className="w-10 h-10 rounded-xl object-cover border-2 border-amber-500/60 cursor-pointer flex-shrink-0 hover:scale-105 transition-transform"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-white text-xs truncate flex items-center gap-1.5">
                            {user.nameBannerUrl ? (
                              <img
                                src={user.nameBannerUrl}
                                alt={user.username}
                                title={user.username}
                                className="h-5 max-h-[22px] max-w-[140px] object-contain rounded inline-block drop-shadow-xs"
                              />
                            ) : (
                              <span>{user.username}</span>
                            )}
                            <span>{user.flag}</span>
                            {user.honorBadge && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 font-bold truncate">
                                {user.honorBadge}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[200px]">
                            {user.statusQuote || 'عضو في حسان برو'}
                          </div>
                          <div className="flex items-center gap-2 text-[9px] text-slate-400 mt-0.5 font-mono">
                            <span>🌐 {user.ipAddress || '192.168.1.1'}</span>
                            <span>•</span>
                            <span>غرفة: {user.room}</span>
                          </div>
                        </div>
                      </div>

                      {/* Status Badges */}
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${roleBadge.badgeClass}`}>
                          {roleBadge.short}
                        </span>
                        {user.micSlot !== null && (
                          <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded text-[9px] font-bold flex items-center gap-0.5">
                            <Mic className="w-2.5 h-2.5 text-emerald-400" />
                            <span>مايك {user.micSlot}</span>
                          </span>
                        )}
                        {user.isTextMuted && (
                          <span className="px-1.5 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded text-[9px] font-bold">
                            مسكت 🔇
                          </span>
                        )}
                        {(user.isJailed || user.room === 'سجن حسان برو') && (
                          <span className="px-1.5 py-0.5 bg-red-600 text-white rounded text-[9px] font-bold animate-pulse">
                            مسجون 🚔
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Toolbar */}
                    <div className="pt-2 border-t border-slate-700/80 flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                      {isSelf ? (
                        <span className="text-[10px] text-slate-400 font-semibold px-2 py-0.5 bg-slate-700/50 rounded">
                          (حسابك الحالي)
                        </span>
                      ) : canMod ? (
                        <>
                          {/* إسكات / فك إسكات */}
                          <button
                            onClick={() => onAdminAction(user.isTextMuted ? 'unmuteText' : 'mute', user.username)}
                            className={`px-2 py-1 rounded-lg border flex items-center gap-1 transition-colors cursor-pointer ${
                              user.isTextMuted
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500 font-bold'
                                : 'bg-rose-950/50 text-rose-300 border-rose-700/60 hover:bg-rose-900/60'
                            }`}
                            title={user.isTextMuted ? 'فك الإسكات' : 'إسكات كتابي وصوتي'}
                          >
                            <VolumeX className="w-3 h-3" />
                            <span>{user.isTextMuted ? 'فك الإسكات' : 'إسكات'}</span>
                          </button>

                          {/* طرد */}
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setUserActionType('kick');
                              setActionReason('مخالفة قوانين الشات والآداب العامة');
                            }}
                            className="px-2 py-1 rounded-lg bg-slate-700 hover:bg-rose-900/60 text-rose-300 border border-slate-600 hover:border-rose-500 flex items-center gap-1 transition-colors cursor-pointer"
                            title="طرد العضو من الروم"
                          >
                            <UserX className="w-3 h-3" />
                            <span>طرد</span>
                          </button>

                          {/* باند وحظر دائم */}
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setUserActionType('ban');
                              setActionReason('مخالفة شروط وقوانين حسان برو');
                            }}
                            className="px-2 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-1 transition-colors shadow-xs cursor-pointer"
                            title="حظر دائم وباند"
                          >
                            <Shield className="w-3 h-3" />
                            <span>باند</span>
                          </button>

                          {/* سجن / إفراج */}
                          {user.isJailed || user.room === 'سجن حسان برو' ? (
                            <button
                              onClick={() => onAdminAction('unjailUser', user.username)}
                              className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 transition-colors cursor-pointer"
                              title="فك السجن والإفراج"
                            >
                              <span>🕊️ إفراج</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setUserActionType('jail');
                                setActionReason('توقيف وتأديب لمخالفة القوانين');
                              }}
                              className="px-2 py-1 rounded-lg bg-slate-700 hover:bg-black text-amber-300 border border-slate-600 flex items-center gap-1 transition-colors cursor-pointer"
                              title="إيداع في غرفة السجن"
                            >
                              <span>🚔 سجن</span>
                            </button>
                          )}

                          {/* سحب المايك */}
                          {user.micSlot !== null && (
                            <button
                              onClick={() => onAdminAction('pullMic', user.username)}
                              className="px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-bold flex items-center gap-1 transition-colors shadow-xs cursor-pointer"
                              title="سحب المايك من العضو"
                            >
                              <MicOff className="w-3 h-3" />
                              <span>سحب المايك</span>
                            </button>
                          )}

                          {/* تغيير الاسم المخالف */}
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setUserActionType('resetName');
                              setActionValue(`عضو_محترم_${Math.floor(100 + Math.random() * 900)}`);
                            }}
                            className="px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600 flex items-center gap-1 transition-colors cursor-pointer"
                            title="استبدال الاسم المخالف"
                          >
                            <Edit3 className="w-3 h-3 text-cyan-400" />
                            <span>تعديل الاسم</span>
                          </button>

                          {/* بنر الاسم المصور 500x50 */}
                          <button
                            type="button"
                            onClick={() => {
                              const bUrl = prompt(`أدخل رابط البنر المصور 500x50 لـ [${user.username}] (أو اتركه فارغاً لإلغاء البنر):`, user.nameBannerUrl || '');
                              if (bUrl !== null) {
                                if (onAssignMemberBanner) {
                                  onAssignMemberBanner(user.username, bUrl.trim());
                                }
                                showToast(bUrl.trim() ? `تم حفظ بنر الاسم لـ [${user.username}] 🖼️` : `تم حذف بنر [${user.username}]`, 'success');
                              }
                            }}
                            className="px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-amber-300 border border-slate-600 flex items-center gap-1 transition-colors cursor-pointer"
                            title="تحديد أو تغيير بنر الاسم المصور 500x50 لهذا العضو"
                          >
                            <Image className="w-3 h-3 text-amber-400" />
                            <span>{user.nameBannerUrl ? 'تعديل البنر 🖼️' : 'إسناد بنر 🖼️'}</span>
                          </button>

                          {/* منح وسام شرفي */}
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setUserActionType('badge');
                              setActionValue(user.honorBadge || '👑 صقر ذهبي');
                            }}
                            className="px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-amber-300 border border-slate-600 flex items-center gap-1 transition-colors cursor-pointer"
                            title="منح أو تعديل وسام شرفي"
                          >
                            <Star className="w-3 h-3 text-amber-400" />
                            <span>وسام</span>
                          </button>

                          {/* ترقية الرتبة */}
                          {(currentUser.role === 'admin' || hasPerm('canChangeRoles')) && (
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setUserActionType('role');
                                setActionValue(user.role);
                              }}
                              className="px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-emerald-300 border border-slate-600 flex items-center gap-1 transition-colors cursor-pointer"
                              title="ترقية أو تغيير الرتبة"
                            >
                              <Award className="w-3 h-3 text-emerald-400" />
                              <span>الرتبة</span>
                            </button>
                          )}

                          {/* تغيير كلمة المرور عند النسيان */}
                          {(currentUser.role === 'admin' || hasPerm('canChangeMemberPassword')) && (
                            <button
                              type="button"
                              onClick={() => {
                                const newPass = prompt(`أدخل كلمة المرور الجديدة للعضو [${user.username}] عند النسيان:`, '123456');
                                if (newPass && newPass.trim().length >= 3) {
                                  onAdminAction('updatePassword', user.username, newPass.trim());
                                  showToast(`تم تعيين كلمة مرور جديدة للعضو [${user.username}] بنجاح 🔑`, 'success');
                                } else if (newPass !== null) {
                                  showToast('يجب أن تتكون كلمة المرور من 3 خانات على الأقل', 'error');
                                }
                              }}
                              className="px-2 py-1 rounded-lg bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-500/40 flex items-center gap-1 transition-colors cursor-pointer"
                              title="تغيير كلمة المرور للعضو عند نسيانها"
                            >
                              <Key className="w-3 h-3 text-amber-400" />
                              <span>تغيير كلمة المرور 🔑</span>
                            </button>
                          )}

                          {/* نقل لغرفة أخرى */}
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setUserActionType('move');
                              setActionValue(roomsList[0]?.id || 'الغرفة العامة');
                            }}
                            className="px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600 flex items-center gap-1 transition-colors cursor-pointer"
                            title="نقل لغرفة أخرى"
                          >
                            <span>🚪 نقل</span>
                          </button>

                          {/* حذف الصورة الشخصية */}
                          {user.avatarUrl && (
                            <button
                              onClick={() => {
                                if (confirm(`هل أنت متأكد من حذف صورة ${user.username} المخالفة؟`)) {
                                  onAdminAction('deleteAvatar', user.username);
                                }
                              }}
                              className="px-2 py-1 rounded-lg bg-slate-700 hover:bg-rose-900/60 text-rose-300 border border-slate-600 flex items-center gap-1 transition-colors cursor-pointer"
                              title="حذف الصورة المخالفة"
                            >
                              <Trash2 className="w-3 h-3 text-rose-400" />
                              <span>الصورة</span>
                            </button>
                          )}

                          {/* كشف النكات والعضويات */}
                          <button
                            onClick={() => {
                              if (onRevealNicks) {
                                onRevealNicks(user.username);
                              } else {
                                onAdminAction('revealNicks', user.username);
                              }
                            }}
                            className="px-2 py-1 rounded-lg bg-indigo-950/70 hover:bg-indigo-900 text-indigo-200 border border-indigo-700/60 flex items-center gap-1 transition-colors cursor-pointer"
                            title="كشف الآي بي والأسماء والعضويات التي دخل بها هذا العضو"
                          >
                            <Search className="w-3 h-3 text-indigo-400" />
                            <span>🔍 كشف نكات</span>
                          </button>

                          {/* فتح البروفايل للتعديل الكامل */}
                          <button
                            onClick={() => onOpenUserProfile(user)}
                            className="px-2 py-1 rounded-lg bg-[#2a241e] hover:bg-black text-amber-200 border border-amber-600/40 flex items-center gap-1 transition-colors cursor-pointer"
                            title="فتح الملف الشخصي الكامل"
                          >
                            <span>✏️ البروفايل</span>
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-800 px-2 py-1 rounded border border-slate-700">
                          <Lock className="w-3 h-3 text-slate-400" />
                          <span>محمي بنظام الصلاحيات الهرمية ({roleBadge.short})</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          )}
        </div>
      )}

      {/* TAB 2: ROOM MANAGEMENT & CONTROLS */}
      {activeTab === 'roomControls' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs bg-slate-900/60">
          {/* Current Room Status Card */}
          <div className="p-3 rounded-2xl bg-gradient-to-r from-[#241a12] to-[#3a291b] text-amber-200 border border-amber-500/40 shadow-md flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-sm text-amber-100">{currentUser.room}</span>
              </div>
              <p className="text-[10px] text-amber-300/80">
                لوحة الرقابة والتحكم اللحظي في إعدادات الغرفة الحالية وكافة الغرف
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[10px] font-bold">
              {rosterUsers.filter((u) => u.room === currentUser.room).length} عضو متواجد
            </span>
          </div>

          {/* Quick Room Switches */}
          <div className="grid grid-cols-2 gap-2">
            {/* 1. Lock/Unlock Chat */}
            <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 flex flex-col justify-between">
              <div>
                <h5 className="font-bold text-white text-xs flex items-center gap-1.5 mb-1">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>قفل الشات العام مؤقتاً</span>
                </h5>
                <p className="text-[10px] text-slate-400 mb-2">منع غير المشرفين من إرسال رسائل نصية</p>
              </div>
              <button
                type="button"
                onClick={() => onAdminAction('lockRoomChat', '', !roomSettings.isChatLocked)}
                className={`w-full py-1.5 rounded-lg font-black text-[11px] transition-all cursor-pointer ${
                  roomSettings.isChatLocked
                    ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {roomSettings.isChatLocked ? '🔒 مقفل (اضغط للفتح)' : '🔓 مفتوح (اضغط للقفل)'}
              </button>
            </div>

            {/* 2. Lock Voice Mics */}
            <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 flex flex-col justify-between">
              <div>
                <h5 className="font-bold text-white text-xs flex items-center gap-1.5 mb-1">
                  <Mic className="w-3.5 h-3.5 text-rose-400" />
                  <span>حصر المايكات للإدارة</span>
                </h5>
                <p className="text-[10px] text-slate-400 mb-2">قفل مقاعد الصوت ومنع صعود الأعضاء</p>
              </div>
              <button
                type="button"
                onClick={() => onAdminAction('lockRoomVoice', '', !roomSettings.isVoiceLocked)}
                className={`w-full py-1.5 rounded-lg font-black text-[11px] transition-all cursor-pointer ${
                  roomSettings.isVoiceLocked
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-slate-700 hover:bg-slate-600 text-amber-300'
                }`}
              >
                {roomSettings.isVoiceLocked ? '🎙️🔒 مقفل للإدارة' : '🎙️🔓 متاح للجميع'}
              </button>
            </div>
          </div>

          {/* 2.5. Show Deleted Message Notice (Admins Only) */}
          <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h5 className="font-bold text-white text-xs flex items-center gap-1.5 mb-0.5">
                <Trash2 className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                <span>إشعار الرسائل المحذوفة (للإداريين فقط)</span>
              </h5>
              <p className="text-[10px] text-slate-400">
                إظهار إشعار خفيف مكان الرسالة المحذوفة للإداريين بدلاً من اختفائها تماماً
              </p>
            </div>
            <button
              type="button"
              onClick={() => onAdminAction('toggleDeletedNotice', '', !roomSettings.showDeletedNotice)}
              className={`px-3 py-1.5 rounded-lg font-black text-[11px] transition-all cursor-pointer flex-shrink-0 ${
                roomSettings.showDeletedNotice
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
              }`}
            >
              {roomSettings.showDeletedNotice ? '🗑️ مفعل للإداريين' : '👻 معطل (اختفاء تام)'}
            </button>
          </div>

          {/* 3. Slow Mode */}
          <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <h5 className="font-bold text-white text-xs flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>وضع الدردشة البطيء (Slow Mode)</span>
              </h5>
              <span className="text-[10px] font-mono font-bold text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-700/50">
                {roomSettings.slowModeSeconds > 0 ? `${roomSettings.slowModeSeconds} ثواني` : 'معطل'}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: 'إيقاف ✕', sec: 0 },
                { label: '5 ثواني', sec: 5 },
                { label: '10 ثواني', sec: 10 },
                { label: '30 ثانية', sec: 30 }
              ].map((opt) => (
                <button
                  key={opt.sec}
                  type="button"
                  onClick={() => onAdminAction('setSlowMode', '', opt.sec)}
                  className={`py-1.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                    roomSettings.slowModeSeconds === opt.sec
                      ? 'bg-indigo-600 text-white border-indigo-500'
                      : 'bg-slate-700/60 text-slate-300 border-slate-600 hover:bg-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Global Clear Chat & Pull All */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                if (confirm('هل أنت متأكد من مسح شات الغرفة كاملاً لجميع المتواجدين؟')) {
                  onAdminAction('globalClearChat', '');
                }
              }}
              className="p-3 bg-red-950/50 hover:bg-red-900/60 text-red-200 border border-red-700/60 rounded-xl flex items-center justify-center gap-2 font-bold cursor-pointer transition-colors shadow-xs"
            >
              <Trash2 className="w-4 h-4 text-red-400" />
              <span>مسح شات الغرفة للجميع 🧹</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (confirm(`هل أنت متأكد من سحب جميع الأعضاء المتواجدين بالسيرفر إلى [${currentUser.room}]؟`)) {
                  onAdminAction('pullAllUsers', '');
                }
              }}
              className="p-3 bg-amber-950/50 hover:bg-amber-900/60 text-amber-200 border border-amber-700/60 rounded-xl flex items-center justify-center gap-2 font-bold cursor-pointer transition-colors shadow-xs"
            >
              <Users className="w-4 h-4 text-amber-400" />
              <span>سحب جميع الأعضاء لغرفتي 🚀</span>
            </button>
          </div>

          {/* 5. Room Password Manager */}
          <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 space-y-2">
            <h5 className="font-bold text-white text-xs flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>إدارة كلمة مرور الغرفة الحالية</span>
            </h5>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                placeholder="اكتب كلمة مرور أو اترك فارغاً لإلغاء القفل..."
                value={roomPasswordInput}
                onChange={(e) => setRoomPasswordInput(e.target.value)}
                className="flex-1 p-2 rounded-xl text-xs bg-slate-900 border border-slate-700 focus:border-amber-500 outline-none text-white"
              />
              <button
                type="button"
                onClick={() => {
                  onAdminAction('setRoomPassword', '', roomPasswordInput);
                  setRoomPasswordInput('');
                }}
                className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] cursor-pointer"
              >
                تطبيق
              </button>
            </div>
          </div>

          {/* 6. Rooms Directory & Create New Room (Admin Only) */}
          <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-700 pb-2">
              <h5 className="font-bold text-white text-xs flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span>دليل الغرف وإضافة غرف جديدة ({roomsList.length})</span>
              </h5>
              {(isSupremeHassan || currentUser.role === 'admin' || getRoleLevel(currentUser.role) >= 100) && (
                <button
                  onClick={() => setIsCreatingRoom(!isCreatingRoom)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>غرفة جديدة</span>
                </button>
              )}
            </div>

            {/* Create Room Form */}
            {isCreatingRoom && (
              <div className="p-3 bg-slate-900 rounded-xl border border-emerald-500/40 space-y-2">
                <h6 className="font-bold text-emerald-300 text-xs">إنشاء غرفة دردشة وصوت جديدة:</h6>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="اسم الغرفة (مثال: الكويت 🇰🇼)"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    className="p-2 rounded-lg text-xs bg-slate-800 border border-slate-700 text-white outline-none"
                  />
                  <input
                    type="text"
                    placeholder="كلمة مرور (اختياري)"
                    value={newRoomPass}
                    onChange={(e) => setNewRoomPass(e.target.value)}
                    className="p-2 rounded-lg text-xs bg-slate-800 border border-slate-700 text-white outline-none"
                  />
                </div>
                <input
                  type="text"
                  placeholder="وصف وتوبيك الغرفة..."
                  value={newRoomDesc}
                  onChange={(e) => setNewRoomDesc(e.target.value)}
                  className="w-full p-2 rounded-lg text-xs bg-slate-800 border border-slate-700 text-white outline-none"
                />
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">سعة الصوت:</span>
                    <input
                      type="number"
                      min={5}
                      max={100}
                      value={newRoomVoiceCap}
                      onChange={(e) => setNewRoomVoiceCap(Number(e.target.value))}
                      className="w-16 p-1 rounded bg-slate-800 text-white text-xs border border-slate-700"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setIsCreatingRoom(false)}
                      className="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-xs cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={() => {
                        if (!newRoomName.trim()) {
                          showToast('يرجى كتابة اسم الغرفة', 'error');
                          return;
                        }
                        onAdminAction('createRoom', undefined, {
                          name: newRoomName.trim(),
                          desc: newRoomDesc.trim(),
                          password: newRoomPass.trim() || undefined,
                          voiceLimit: newRoomVoiceCap
                        });
                        setNewRoomName('');
                        setNewRoomDesc('');
                        setNewRoomPass('');
                        setIsCreatingRoom(false);
                      }}
                      className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                    >
                      إنشاء الغرفة ✅
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Rooms List Cards */}
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {roomsList.map((room) => {
                const occupants = rosterUsers.filter((u) => u.room === room.id).length;
                const isCurrent = currentUser.room === room.id;
                const isProtectedCore = room.id === 'الغرفة العامة' || room.id === 'سجن حسان برو';

                return (
                  <div
                    key={room.id}
                    className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-white text-xs flex items-center gap-1.5">
                        <span>{room.name}</span>
                        {room.isPasswordProtected && <Lock className="w-3 h-3 text-amber-400" />}
                        {isCurrent && (
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.2 rounded font-bold">
                            غرفتك الحالية
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[220px]">
                        {room.desc}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded font-mono">
                        {occupants} عضو
                      </span>
                      {!isCurrent && (
                        <button
                          onClick={() => onSwitchRoom(room.id)}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] font-bold cursor-pointer"
                        >
                          دخول
                        </button>
                      )}
                      {(isSupremeHassan || currentUser.role === 'admin' || getRoleLevel(currentUser.role) >= 100) && !isProtectedCore && (
                        <button
                          onClick={() => {
                            if (confirm(`هل أنت متأكد من حذف الغرفة [${room.name}]؟ سيتم نقل روادها إلى الغرفة العامة.`)) {
                              onAdminAction('deleteRoom', undefined, room.id);
                            }
                          }}
                          className="p-1 rounded bg-slate-800 hover:bg-red-900/60 text-red-400 cursor-pointer"
                          title="حذف الغرفة"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SERVER SECURITY & ANTI-RAID */}
      {activeTab === 'security' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs bg-slate-900/60">
          <div className="p-3 rounded-2xl bg-gradient-to-r from-red-950 via-rose-950 to-red-950 text-white border border-red-600/50 shadow-md">
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="w-5 h-5 text-red-400 animate-pulse" />
              <h5 className="font-bold text-sm text-red-100">منظومة الأمان والرقابة وحماية السيرفر من السبام والهجمات</h5>
            </div>
            <p className="text-[10px] text-red-200/90 leading-relaxed">
              تحكم فوري بحماية الدردشة ضد الهجمات العشوائية والإعلانات المشبوهة وقفل الطوارئ العام وإطلاق صافرات التنبيه.
            </p>
          </div>

          {/* ADVANCED SECURITY & AUTO IP-BAN MODAL LAUNCH CARD */}
          <div className="p-3.5 bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 rounded-2xl border-2 border-amber-500/70 shadow-lg space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-black text-xs text-amber-200">إعدادات الأمان المتقدمة والحظر التلقائي (Advanced Security Suite) ⚙️</h5>
                  <p className="text-[10px] text-slate-300">ضبط فترات حظر الآي بي التلقائي لمخالفي الفلتر وتقييد وحجب الوصول الجغرافي لدول معينة</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 self-start sm:self-center">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${serverSecurity.autoIpBanEnabled ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                  {serverSecurity.autoIpBanEnabled ? '⚡ حظر الآي بي نشط' : 'حظر الآي بي معطل'}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${serverSecurity.geoRestrictionEnabled ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                  {serverSecurity.geoRestrictionEnabled ? `🌍 تقييد الدول (${serverSecurity.geoRestrictedCountries?.length || 0})` : 'الدول مفتوحة'}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-amber-500/20">
              <div className="text-[10px] text-amber-300/90 font-medium">
                {serverSecurity.autoIpBanEnabled
                  ? `حظر IP عند ${serverSecurity.autoIpBanThreshold || 3} مخالفات خلال ${serverSecurity.autoIpBanWindowMinutes || 10} دقيقة (المدة: ${serverSecurity.autoIpBanDurationMinutes === 0 ? 'باند نهائي' : (serverSecurity.autoIpBanDurationMinutes || 60) + ' دقيقة'})`
                  : 'الحظر التلقائي معطل حالياً، الفلتر يسجل التنبيهات دون حظر تلقائي'}
              </div>
              <button
                type="button"
                onClick={() => setShowAdvancedSecurityModal(true)}
                className="px-3.5 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>فتح نافذة إعدادات الأمان المتقدمة ⚙️</span>
              </button>
            </div>
          </div>

          {/* 1. Emergency Lockdown Toggle */}
          <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 flex items-center justify-between">
            <div>
              <h5 className="font-bold text-white text-xs flex items-center gap-1.5 mb-1">
                <Lock className="w-4 h-4 text-red-400" />
                <span>قفل الطوارئ العام للدردشة (Emergency Lockdown)</span>
              </h5>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                تجميد الإرسال العام ومنع دخول الزوار أو الأعضاء غير الإداريين عند حدوث سبام أو فوضى
              </p>
            </div>
            <button
              onClick={() => onUpdateSecurity({ emergencyLockdown: !serverSecurity.emergencyLockdown })}
              className={`px-3 py-2 rounded-xl font-black text-xs transition-all cursor-pointer ${
                serverSecurity.emergencyLockdown
                  ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse shadow-md'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
              }`}
            >
              {serverSecurity.emergencyLockdown ? '🛑 وضع الطوارئ مفعل' : '🟢 معطل (الوضع طبيعي)'}
            </button>
          </div>

          {/* 2. Guest Access Control */}
          <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 flex items-center justify-between">
            <div>
              <h5 className="font-bold text-white text-xs flex items-center gap-1.5 mb-1">
                <Users className="w-4 h-4 text-amber-400" />
                <span>دخول ومشاركة الزوار (Guest Access)</span>
              </h5>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                السماح أو منع دخول الزوار بدون تسجيل عضوية للحد من الحسابات الوهمية
              </p>
            </div>
            <button
              onClick={() => onUpdateSecurity({ guestsAllowed: !serverSecurity.guestsAllowed })}
              className={`px-3 py-2 rounded-xl font-black text-xs transition-all cursor-pointer ${
                serverSecurity.guestsAllowed
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-rose-600 hover:bg-rose-700 text-white'
              }`}
            >
              {serverSecurity.guestsAllowed ? '✔️ متاح للزوار' : '⛔ محظور على الزوار'}
            </button>
          </div>

          {/* 2.5. Configurable Timeouts & Grace Periods (إعدادات المهلات وأوقات الانتظار) */}
          <div className="p-3.5 bg-slate-800/95 rounded-xl border border-amber-500/40 space-y-3">
            <div>
              <h5 className="font-bold text-amber-300 text-xs flex items-center gap-1.5 mb-0.5">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>إعدادات المهلات وأوقات الانتظار (بالثواني)</span>
              </h5>
              <p className="text-[10px] text-slate-400">
                تحديد الوقت الذي يحتسبه الشات عند انقطاع الإنترنت عن العضو، أو التشغيل في الخلفية، أو الاحتفاظ بالمايك، أو التهدئة
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-2.5 bg-slate-900/90 rounded-lg border border-slate-700/80 space-y-1">
                <label className="block text-[11px] font-bold text-slate-200">
                  مهلة انقطاع النت قبل اعتبار العضو غير متصل (ثانية):
                </label>
                <p className="text-[10px] text-slate-400">المدة قبل تحول نقطة العضو إلى رمادي (Offline) عند انقطاع الشبكة</p>
                <input
                  type="number"
                  min={5}
                  max={600}
                  value={timeoutForm.offlineGraceSeconds}
                  onChange={(e) => setTimeoutForm({ ...timeoutForm, offlineGraceSeconds: Math.max(5, parseInt(e.target.value, 10) || 45) })}
                  className="w-full p-1.5 rounded-lg bg-slate-950 border border-slate-700 text-amber-300 font-mono font-bold text-xs outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-2.5 bg-slate-900/90 rounded-lg border border-slate-700/80 space-y-1">
                <label className="block text-[11px] font-bold text-slate-200">
                  مهلة الاحتفاظ بمقعد المايك عند انقطاع النت (ثانية):
                </label>
                <p className="text-[10px] text-slate-400">المدة التي ينتظرها السيرفر قبل إخلاء المايك تلقائياً</p>
                <input
                  type="number"
                  min={5}
                  max={300}
                  value={timeoutForm.micGraceSeconds}
                  onChange={(e) => setTimeoutForm({ ...timeoutForm, micGraceSeconds: Math.max(5, parseInt(e.target.value, 10) || 45) })}
                  className="w-full p-1.5 rounded-lg bg-slate-950 border border-slate-700 text-amber-300 font-mono font-bold text-xs outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-2.5 bg-slate-900/90 rounded-lg border border-slate-700/80 space-y-1">
                <label className="block text-[11px] font-bold text-slate-200">
                  مهلة التحول للحالة الصفراء بالخلفية (ثانية):
                </label>
                <p className="text-[10px] text-slate-400">المدة بعد تصغير التطبيق قبل ظهور النقطة الصفراء (غائب)</p>
                <input
                  type="number"
                  min={10}
                  max={900}
                  value={timeoutForm.awayDelaySeconds}
                  onChange={(e) => setTimeoutForm({ ...timeoutForm, awayDelaySeconds: Math.max(10, parseInt(e.target.value, 10) || 120) })}
                  className="w-full p-1.5 rounded-lg bg-slate-950 border border-slate-700 text-amber-300 font-mono font-bold text-xs outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-2.5 bg-slate-900/90 rounded-lg border border-slate-700/80 space-y-1">
                <label className="block text-[11px] font-bold text-slate-200">
                  مهلة الانتظار قبل إظهار شريط إعادة الاتصال (ثانية):
                </label>
                <p className="text-[10px] text-slate-400">تأخير إظهار تنبيه إعادة الاتصال عند تذبذب الشبكة السريع</p>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={timeoutForm.reconnectBannerDelaySeconds}
                  onChange={(e) => setTimeoutForm({ ...timeoutForm, reconnectBannerDelaySeconds: Math.max(1, parseInt(e.target.value, 10) || 4) })}
                  className="w-full p-1.5 rounded-lg bg-slate-950 border border-slate-700 text-amber-300 font-mono font-bold text-xs outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-2.5 bg-slate-900/90 rounded-lg border border-slate-700/80 space-y-1 sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-200">
                  مهلة الانتظار بين الإعجابات للعضو الواحد (ثانية):
                </label>
                <p className="text-[10px] text-slate-400">المدة المطلوبة قبل إمكانية إرسال لايك جديد لنفس العضو</p>
                <input
                  type="number"
                  min={5}
                  max={600}
                  value={timeoutForm.likeCooldownSeconds}
                  onChange={(e) => setTimeoutForm({ ...timeoutForm, likeCooldownSeconds: Math.max(5, parseInt(e.target.value, 10) || 60) })}
                  className="w-full p-1.5 rounded-lg bg-slate-950 border border-slate-700 text-amber-300 font-mono font-bold text-xs outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onUpdateSecurity({
                  offlineGraceSeconds: timeoutForm.offlineGraceSeconds,
                  micGraceSeconds: timeoutForm.micGraceSeconds,
                  awayDelaySeconds: timeoutForm.awayDelaySeconds,
                  reconnectBannerDelaySeconds: timeoutForm.reconnectBannerDelaySeconds,
                  likeCooldownSeconds: timeoutForm.likeCooldownSeconds,
                });
                showToast?.('تم حفظ وتطبيق إعدادات المهلات وأوقات الانتظار بنجاح ⏱️', 'success');
              }}
              className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-xl transition-colors cursor-pointer shadow-sm"
            >
              حفظ وتطبيق إعدادات المهلات ⏱️
            </button>
          </div>

          {/* 3. External Links Blocker */}
          <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 flex items-center justify-between">
            <div>
              <h5 className="font-bold text-white text-xs flex items-center gap-1.5 mb-1">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span>مانع نشر الروابط والإعلانات الخارجية (Block External Links)</span>
              </h5>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                حظر الرسائل التي تحتوي على روابط (http, www, .com, wa.me, t.me) وحفظها بسجل المراقبة
              </p>
            </div>
            <button
              onClick={() => onUpdateSecurity({ blockExternalLinks: !serverSecurity.blockExternalLinks })}
              className={`px-3 py-2 rounded-xl font-black text-xs transition-all cursor-pointer ${
                serverSecurity.blockExternalLinks
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
              }`}
            >
              {serverSecurity.blockExternalLinks ? '🛡️ الحماية مفعلة' : '⚠️ معطلة'}
            </button>
          </div>

          {/* 4. Marquee News Ticker Banner Editor */}
          <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 space-y-2">
            <h5 className="font-bold text-white text-xs flex items-center gap-1.5">
              <Megaphone className="w-4 h-4 text-amber-400" />
              <span>شريط الأخبار التفاعلي العلوي (Marquee Ticker Banner)</span>
            </h5>
            <p className="text-[10px] text-slate-400">النص المتحرك الترحيبي الذي يظهر أعلى شاشة الدردشة لكافة المتواجدين:</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={marqueeInput}
                onChange={(e) => setMarqueeInput(e.target.value)}
                placeholder="اكتب الترحيب أو التوجيه الإداري..."
                className="flex-1 p-2 rounded-xl text-xs bg-slate-900 border border-slate-700 focus:border-amber-500 text-white outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  if (!marqueeInput.trim()) return;
                  onUpdateSecurity({ marqueeTicker: marqueeInput.trim() });
                  showToast('تم تحديث شريط الأخبار العلوي بنجاح 📢', 'success');
                }}
                className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer"
              >
                تحديث
              </button>
            </div>
          </div>

          {/* 5. Administrative Emergency Siren Alert */}
          <div className="p-3 bg-slate-800 rounded-xl border border-red-700/60 space-y-2">
            <h5 className="font-bold text-red-300 text-xs flex items-center gap-1.5">
              <Siren className="w-4 h-4 text-red-400 animate-bounce" />
              <span>إطلاق صافرة الإنذار الإداري العاجل (Admin Siren Alert)</span>
            </h5>
            <p className="text-[10px] text-slate-400">
              إطلاق صوت صافرة إنذار رسمية وظهور وميض أحمر تحذيري مع رسالة تنبيهية على كامل شاشات جميع المتواجدين بالسيرفر:
            </p>
            <textarea
              rows={2}
              value={sirenTextInput}
              onChange={(e) => setSirenTextInput(e.target.value)}
              className="w-full p-2 rounded-xl text-xs bg-slate-900 border border-slate-700 text-white outline-none resize-none"
            />
            <button
              onClick={() => {
                if (confirm('هل أنت متأكد من إطلاق صافرة الإنذار لجميع المتواجدين؟')) {
                  onAdminAction('adminSiren', undefined, sirenTextInput);
                }
              }}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-700 hover:to-rose-700 text-white font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
            >
              <Siren className="w-4 h-4" />
              <span>إطلاق صافرة الإنذار والتنبيه الإداري الآن 🚨</span>
            </button>
          </div>

          {/* 6. Likes Threshold Settings (شروط عدد اللايكات المطلوبة للإرسال) */}
          <div className="p-3.5 bg-gradient-to-br from-slate-800 via-amber-950/20 to-slate-800 rounded-2xl border border-amber-500/40 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-2">
              <h5 className="font-black text-amber-300 text-xs flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span>شروط عدد اللايكات اللازمة لكل نوع رسالة وإجراء 👍</span>
              </h5>
              <span className="text-[10px] text-amber-300/80 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                0 = متاح للجميع بدون قيود
              </span>
            </div>

            <p className="text-[10px] text-slate-300 leading-relaxed">
              حدد الحد الأدنى من اللايكات الذي يجب أن يمتلكه العضو ليتمكن من الإرسال لكل نوع مراسلة على حدة. (طاقم الإدارة معفي تلقائياً).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-right">
              {/* 1. نص بالغرفة */}
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 space-y-1">
                <label className="text-[11px] font-bold text-slate-200 block">💬 لايكات إرسال نص بالغرفة:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={likesForm.roomTextLikes}
                    onChange={(e) => setLikesForm({ ...likesForm, roomTextLikes: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="w-full p-1.5 rounded-lg bg-slate-800 border border-slate-600 text-amber-300 font-bold text-center text-xs outline-none"
                  />
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">لايك</span>
                </div>
              </div>

              {/* 2. وسائط بالغرفة */}
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 space-y-1">
                <label className="text-[11px] font-bold text-slate-200 block">📸 لايكات إرسال وسائط بالغرفة:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={likesForm.roomMediaLikes}
                    onChange={(e) => setLikesForm({ ...likesForm, roomMediaLikes: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="w-full p-1.5 rounded-lg bg-slate-800 border border-slate-600 text-amber-300 font-bold text-center text-xs outline-none"
                  />
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">لايك</span>
                </div>
              </div>

              {/* 3. نص بالحائط */}
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 space-y-1">
                <label className="text-[11px] font-bold text-slate-200 block">📝 لايكات إرسال نص بالحائط:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={likesForm.wallTextLikes}
                    onChange={(e) => setLikesForm({ ...likesForm, wallTextLikes: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="w-full p-1.5 rounded-lg bg-slate-800 border border-slate-600 text-amber-300 font-bold text-center text-xs outline-none"
                  />
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">لايك</span>
                </div>
              </div>

              {/* 4. وسائط بالحائط */}
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 space-y-1">
                <label className="text-[11px] font-bold text-slate-200 block">🖼️ لايكات إرسال وسائط بالحائط:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={likesForm.wallMediaLikes}
                    onChange={(e) => setLikesForm({ ...likesForm, wallMediaLikes: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="w-full p-1.5 rounded-lg bg-slate-800 border border-slate-600 text-amber-300 font-bold text-center text-xs outline-none"
                  />
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">لايك</span>
                </div>
              </div>

              {/* 5. نص بالخاص */}
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 space-y-1">
                <label className="text-[11px] font-bold text-slate-200 block">🔒 لايكات إرسال نص بالخاص:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={likesForm.pmTextLikes}
                    onChange={(e) => setLikesForm({ ...likesForm, pmTextLikes: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="w-full p-1.5 rounded-lg bg-slate-800 border border-slate-600 text-amber-300 font-bold text-center text-xs outline-none"
                  />
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">لايك</span>
                </div>
              </div>

              {/* 6. وسائط بالخاص */}
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 space-y-1">
                <label className="text-[11px] font-bold text-slate-200 block">📁 لايكات إرسال وسائط بالخاص:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={likesForm.pmMediaLikes}
                    onChange={(e) => setLikesForm({ ...likesForm, pmMediaLikes: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="w-full p-1.5 rounded-lg bg-slate-800 border border-slate-600 text-amber-300 font-bold text-center text-xs outline-none"
                  />
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">لايك</span>
                </div>
              </div>

              {/* 7. الصعود للمايك */}
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 space-y-1">
                <label className="text-[11px] font-bold text-slate-200 block">🎙️ لايكات الصعود للمايك:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={likesForm.micLikes}
                    onChange={(e) => setLikesForm({ ...likesForm, micLikes: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="w-full p-1.5 rounded-lg bg-slate-800 border border-slate-600 text-amber-300 font-bold text-center text-xs outline-none"
                  />
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">لايك</span>
                </div>
              </div>

              {/* 8. الاتصال بالخاص */}
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 space-y-1">
                <label className="text-[11px] font-bold text-slate-200 block">📞 لايكات الاتصال في الخاص:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={likesForm.callLikes}
                    onChange={(e) => setLikesForm({ ...likesForm, callLikes: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="w-full p-1.5 rounded-lg bg-slate-800 border border-slate-600 text-amber-300 font-bold text-center text-xs outline-none"
                  />
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">لايك</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const cleaned: LikesThresholdSettings = {
                  roomTextLikes: Math.max(0, Number(likesForm.roomTextLikes) || 0),
                  roomMediaLikes: Math.max(0, Number(likesForm.roomMediaLikes) || 0),
                  wallTextLikes: Math.max(0, Number(likesForm.wallTextLikes) || 0),
                  wallMediaLikes: Math.max(0, Number(likesForm.wallMediaLikes) || 0),
                  pmTextLikes: Math.max(0, Number(likesForm.pmTextLikes) || 0),
                  pmMediaLikes: Math.max(0, Number(likesForm.pmMediaLikes) || 0),
                  micLikes: Math.max(0, Number(likesForm.micLikes) || 0),
                  callLikes: Math.max(0, Number(likesForm.callLikes) || 0)
                };
                setLikesForm(cleaned);
                if (onUpdateLikesSettings) {
                  onUpdateLikesSettings(cleaned);
                  showToast('تم حفظ وتطبيق شروط اللايكات بنجاح في السيرفر 👍💾', 'success');
                }
              }}
              className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>حفظ وتطبيق شروط اللايكات في السيرفر 💾</span>
            </button>
          </div>

          {/* 7. Message Retention Limits & Auto-Pruning (سقف الرسائل والحذف التلقائي للأقدم) */}
          <div className="p-3.5 bg-gradient-to-br from-slate-800 via-indigo-950/25 to-slate-800 rounded-2xl border border-indigo-500/40 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-2">
              <h5 className="font-black text-indigo-300 text-xs flex items-center gap-1.5">
                <Trash2 className="w-4 h-4 text-indigo-400" />
                <span>سقف وحدود الرسائل والحذف التلقائي للأقدم (الغرف / الحائط / الخاص) 🧹</span>
              </h5>
              <span className="text-[10px] text-indigo-300/90 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/30 font-bold">
                توفير المساحة وتخفيف السيرفر
              </span>
            </div>

            <p className="text-[10px] text-slate-300 leading-relaxed">
              عند تجاوز عدد الرسائل أو المنشورات هذا السقف، يقوم النظام تلقائياً بحذف الرسائل الأقدم تدريجياً للحفاظ على سرعة الدردشة وخفة استهلاك الذاكرة.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-right">
              {/* 1. سقف رسائل الغرف */}
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 space-y-1.5">
                <label className="text-[11px] font-bold text-slate-200 block">💬 سقف رسائل الغرفة الواحدة:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={10}
                    max={2000}
                    value={retentionForm.roomMaxMessages}
                    onChange={(e) => setRetentionForm({ ...retentionForm, roomMaxMessages: Math.max(10, parseInt(e.target.value) || 50) })}
                    className="w-full p-1.5 rounded-lg bg-slate-800 border border-slate-600 text-indigo-300 font-bold text-center text-xs outline-none"
                  />
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">رسالة</span>
                </div>
                <div className="flex items-center justify-center gap-1 pt-1">
                  {[50, 100, 200, 500].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRetentionForm({ ...retentionForm, roomMaxMessages: preset })}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer transition-colors ${
                        retentionForm.roomMaxMessages === preset
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. سقف منشورات الحائط */}
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 space-y-1.5">
                <label className="text-[11px] font-bold text-slate-200 block">🧱 سقف منشورات الحائط:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={10}
                    max={1000}
                    value={retentionForm.wallMaxPosts}
                    onChange={(e) => setRetentionForm({ ...retentionForm, wallMaxPosts: Math.max(10, parseInt(e.target.value) || 50) })}
                    className="w-full p-1.5 rounded-lg bg-slate-800 border border-slate-600 text-indigo-300 font-bold text-center text-xs outline-none"
                  />
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">منشور</span>
                </div>
                <div className="flex items-center justify-center gap-1 pt-1">
                  {[30, 50, 100, 200].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRetentionForm({ ...retentionForm, wallMaxPosts: preset })}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer transition-colors ${
                        retentionForm.wallMaxPosts === preset
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. سقف رسائل الخاص */}
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 space-y-1.5">
                <label className="text-[11px] font-bold text-slate-200 block">🔒 سقف رسائل المحادثة الخاصة:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={10}
                    max={1000}
                    value={retentionForm.privateMaxMessages}
                    onChange={(e) => setRetentionForm({ ...retentionForm, privateMaxMessages: Math.max(10, parseInt(e.target.value) || 50) })}
                    className="w-full p-1.5 rounded-lg bg-slate-800 border border-slate-600 text-indigo-300 font-bold text-center text-xs outline-none"
                  />
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">رسالة</span>
                </div>
                <div className="flex items-center justify-center gap-1 pt-1">
                  {[30, 50, 100, 200].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRetentionForm({ ...retentionForm, privateMaxMessages: preset })}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer transition-colors ${
                        retentionForm.privateMaxMessages === preset
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const cleaned: MessageRetentionLimits = {
                  roomMaxMessages: Math.max(10, Number(retentionForm.roomMaxMessages) || 200),
                  wallMaxPosts: Math.max(10, Number(retentionForm.wallMaxPosts) || 100),
                  privateMaxMessages: Math.max(10, Number(retentionForm.privateMaxMessages) || 100)
                };
                setRetentionForm(cleaned);
                if (onUpdateMessageLimits) {
                  onUpdateMessageLimits(cleaned);
                  showToast('تم حفظ وتطبيق سقف الرسائل وتفعيل الحذف التلقائي للأقدم بنجاح 🧹', 'success');
                }
              }}
              className="w-full py-2.5 bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>حفظ وتطبيق سقف الرسائل والحذف التلقائي 💾</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: BANS & MANUAL BLACKLIST */}
      {activeTab === 'bans' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs bg-slate-900/60">
          {/* Manual Ban Direct Form */}
          <div className="p-3 bg-slate-800 rounded-xl border border-rose-500/40 space-y-2">
            <h5 className="font-bold text-rose-300 text-xs flex items-center gap-1.5">
              <UserX className="w-4 h-4 text-rose-400" />
              <span>إضافة حظر يدوي مباشر (حظر اسم أو IP)</span>
            </h5>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="اسم المستخدم المراد حظره..."
                value={manualBanName}
                onChange={(e) => setManualBanName(e.target.value)}
                className="p-2 rounded-xl text-xs bg-slate-900 border border-slate-700 text-white outline-none"
              />
              <input
                type="text"
                placeholder="عنوان IP (اختياري)..."
                value={manualBanIp}
                onChange={(e) => setManualBanIp(e.target.value)}
                className="p-2 rounded-xl text-xs bg-slate-900 border border-slate-700 text-white outline-none"
              />
            </div>
            <input
              type="text"
              placeholder="سبب الحظر..."
              value={manualBanReason}
              onChange={(e) => setManualBanReason(e.target.value)}
              className="w-full p-2 rounded-xl text-xs bg-slate-900 border border-slate-700 text-white outline-none"
            />
            <button
              onClick={() => {
                if (!manualBanName.trim()) {
                  showToast('يرجى إدخال اسم المستخدم', 'error');
                  return;
                }
                onManualBan(manualBanName.trim(), manualBanIp.trim(), manualBanReason.trim());
                setManualBanName('');
                setManualBanIp('');
                showToast(`تم تطبيق الحظر اليدوي على [${manualBanName}] بنجاح`, 'success');
              }}
              className="w-full py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-1 cursor-pointer shadow-xs"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>تنفيذ الحظر والباند الفوري</span>
            </button>
          </div>

          {/* Banned Users List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-slate-700 pb-1.5">
              <h5 className="font-bold text-white text-xs flex items-center gap-1.5">
                <UserX className="w-4 h-4 text-rose-500" />
                <span>قائمة المحظورين نهائياً ({bannedList.length}):</span>
              </h5>
            </div>

            {bannedList.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs bg-slate-800/40 rounded-xl border border-dashed border-slate-700">
                لا يوجد أي مستخدم محظور حالياً.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {bannedList.map((item) => (
                  <div
                    key={item.username}
                    className="p-2.5 rounded-xl bg-slate-800 border border-rose-900/60 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-rose-300 flex items-center gap-1.5 text-xs">
                        <span className="truncate">{item.username}</span>
                        <span className="text-[9px] text-slate-400 font-mono">({item.ip || 'IP غير مسجل'})</span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        سبب: {item.reason}
                      </div>

                      {/* حقل بصمة الجهاز المحظورة */}
                      <div className="mt-1.5 flex items-center gap-1.5 bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-700/70">
                        <span className="text-[9px] text-amber-400 font-bold shrink-0">📱 بصمة الجهاز:</span>
                        <span
                          className="font-mono text-[9px] text-emerald-400 truncate tracking-tight select-all"
                          title={item.deviceFingerprint || 'غير متوفرة'}
                        >
                          {item.deviceFingerprint || 'غير متوفرة في السجل القديم'}
                        </span>
                        {item.deviceFingerprint && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(item.deviceFingerprint || '');
                              alert('تم نسخ بصمة الجهاز المحظور 📋');
                            }}
                            className="mr-auto px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[8px] font-mono shrink-0 cursor-pointer transition-colors border border-slate-600/60"
                            title="نسخ بصمة الجهاز"
                          >
                            نسخ
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${item.expiresAt ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'}`}>
                          {item.expiresAt
                            ? (item.expiresAt > Date.now()
                              ? `مؤقت: يتبقى ${Math.ceil((item.expiresAt - Date.now()) / 60000)} دقيقة`
                              : 'منتهي الصلاحية')
                            : 'حظر نهائي دائم'}
                        </span>
                        <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.2 rounded border border-purple-500/30 font-bold">
                          بصمة الجهاز محظورة 🛡️
                        </span>
                        {item.banType === 'auto_filter' && (
                          <span className="text-[9px] bg-rose-500/20 text-rose-300 px-1.5 py-0.2 rounded border border-rose-500/30 font-bold">
                            رصد آلي من الفلتر ⚡
                          </span>
                        )}
                        <span className="text-[9px] text-slate-500">
                          بواسطة: {item.bannedBy} • {new Date(item.timestamp).toLocaleDateString('ar-EG')}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`هل أنت متأكد من فك الحظر عن [${item.username}]؟`)) {
                          onAdminAction('unban', item.username);
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] transition-colors cursor-pointer whitespace-nowrap shadow-xs"
                    >
                      فك الحظر 🔓
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: CRITICAL GLOBAL BROADCAST */}
      {activeTab === 'broadcast' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs bg-slate-900/60">
          <div className="p-3 rounded-2xl bg-gradient-to-r from-red-950 via-rose-900 to-red-950 text-white border border-red-500/50 shadow-md">
            <div className="flex items-center gap-2 mb-1">
              <Megaphone className="w-4 h-4 text-red-300 animate-pulse" />
              <h5 className="font-bold text-sm text-red-100">بث إشعار عام عاجل لجميع الغرف</h5>
            </div>
            <p className="text-[10px] text-red-200/90 leading-relaxed">
              هذا البث يظهر فوراً كإشعار ملكي أحمر منبثق على كامل شاشات جميع المتواجدين في كافة الغرف مع نغمة إنذار إداري.
            </p>
          </div>

          {/* Quick Templates */}
          <div className="p-2.5 bg-slate-800 rounded-xl border border-slate-700 space-y-1.5">
            <span className="text-[10px] font-bold text-slate-300">نماذج سريعة للإشعار:</span>
            <div className="flex flex-wrap gap-1.5">
              {[
                'انطلاق مسابقة حسان برو الكبرى الآن في غرفة المسابقات! 🔥',
                'حان الآن موعد أذان الصلاة حسب توقيت مكة المكرمة 🕌',
                'نرجو من جميع الإخوة والأخوات الالتزام بآداب الحوار واحترام المتواجدين 🌹',
                'ترحب إدارة حسان برو بجميع الزوار والأعضاء الكرام ونتمنى لكم أطيب الأوقات 🦅'
              ].map((tmpl, idx) => (
                <button
                  key={idx}
                  onClick={() => setBroadcastTextInput(tmpl)}
                  className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-[10px] text-amber-200 border border-slate-600 truncate max-w-full text-right cursor-pointer"
                >
                  {tmpl}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 bg-slate-800 rounded-2xl border border-slate-700 space-y-2.5">
            <div>
              <label className="font-bold text-slate-200 text-[11px] block mb-1">عنوان الإشعار:</label>
              <input
                type="text"
                value={broadcastTitleInput}
                onChange={(e) => setBroadcastTitleInput(e.target.value)}
                className="w-full p-2 border border-slate-700 rounded-xl text-xs bg-slate-900 text-white outline-none font-bold"
              />
            </div>

            <div>
              <label className="font-bold text-slate-200 text-[11px] block mb-1">نص الرسالة والتوجيه الإداري:</label>
              <textarea
                rows={4}
                placeholder="اكتب التوجيه أو الإعلان الإداري العاجل هنا..."
                value={broadcastTextInput}
                onChange={(e) => setBroadcastTextInput(e.target.value)}
                className="w-full p-2 border border-slate-700 rounded-xl text-xs bg-slate-900 text-white outline-none resize-none leading-relaxed"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                if (!broadcastTextInput.trim()) {
                  showToast('يرجى كتابة نص الإشعار العام', 'error');
                  return;
                }
                onAdminAction('globalBroadcast', undefined, {
                  title: broadcastTitleInput,
                  text: broadcastTextInput
                });
                setBroadcastTextInput('');
                showToast('تم إرسال البث الملكي لجميع الغرف بنجاح 📢', 'success');
              }}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-700 hover:to-rose-700 text-white font-black text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Megaphone className="w-4 h-4" />
              <span>إرسال البث الملكي لجميع الغرف فوراً 📢</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 6: ROOM STATISTICS PIE CHART */}
      {activeTab === 'stats' && (
        <RoomStatsPieChart
          stats={roomStatsData}
          currentRoomId={currentUser.room}
          onRefresh={() => {
            if (onRefreshRoomStats) {
              onRefreshRoomStats();
            } else {
              onAdminAction('getRoomStats');
            }
            showToast('تم تحديث إحصائيات الغرف فورياً 🔄', 'info');
          }}
          onSwitchRoom={(roomId) => onSwitchRoom(roomId)}
          onOpenUserProfile={(targetUsername) => {
            const target = rosterUsers.find((u) => u.username === targetUsername);
            if (target) {
              onOpenUserProfile(target);
            } else {
              showToast(`المستخدم [${targetUsername}] متواجد بروم آخر`, 'info');
            }
          }}
        />
      )}

      {/* TAB 7: STAFF ROSTER & CONFIDENTIAL MEMOS */}
      {activeTab === 'memos' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs bg-slate-900/60">
          {/* Active Staff Attendance */}
          <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 space-y-2">
            <h5 className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" />
              <span>كشف حضور وتواجد طاقم الإدارة حالياً ({onlineStaff.length})</span>
            </h5>
            <div className="grid grid-cols-2 gap-2">
              {onlineStaff.map((staff) => (
                <div
                  key={staff.id}
                  className="p-2 rounded-lg bg-slate-900 border border-slate-700 flex items-center gap-2"
                >
                  <img
                    src={staff.avatarUrl || DEFAULT_AVATAR_SVG}
                    alt={staff.username}
                    className="w-8 h-8 rounded-lg object-cover border border-amber-500/50"
                  />
                  <div className="min-w-0">
                    <div className="font-bold text-white text-[11px] truncate flex items-center gap-1">
                      <span>{staff.username}</span>
                      <span>{staff.flag}</span>
                    </div>
                    <div className="text-[9px] text-amber-300 font-bold truncate">
                      {staff.role === 'admin' ? '👑 مدير عام' : '🛡️ مشرف سوبر'} • {staff.room}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add Secret Memo */}
          <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 space-y-2">
            <h5 className="font-bold text-white text-xs flex items-center gap-1.5">
              <Edit3 className="w-4 h-4 text-cyan-400" />
              <span>سبورة الملاحظات والتوجيهات الإدارية السرية (Staff Memo Board)</span>
            </h5>
            <textarea
              rows={2}
              placeholder="اكتب ملاحظة أو توجيه خاص لطاقم الإدارة..."
              value={memoText}
              onChange={(e) => setMemoText(e.target.value)}
              className="w-full p-2 rounded-xl text-xs bg-slate-900 border border-slate-700 text-white outline-none resize-none"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400">الأولوية:</span>
                {(['low', 'normal', 'urgent'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setMemoPriority(p)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                      memoPriority === p
                        ? p === 'urgent'
                          ? 'bg-red-600 text-white'
                          : p === 'normal'
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-600 text-white'
                        : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    {p === 'urgent' ? '🔴 عاجل' : p === 'normal' ? '🟡 عادي' : '⚪ توجيه'}
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  if (!memoText.trim()) return;
                  onAddStaffMemo(memoText.trim(), memoPriority);
                  setMemoText('');
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer"
              >
                نشر الملاحظة 📝
              </button>
            </div>
          </div>

          {/* Memos List */}
          <div className="space-y-2">
            <h6 className="font-bold text-slate-300 text-xs">الملاحظات النشطة:</h6>
            {staffMemos.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs bg-slate-800/40 rounded-xl border border-dashed border-slate-700">
                لا توجد ملاحظات إدارية حالياً.
              </div>
            ) : (
              staffMemos.map((memo) => (
                <div
                  key={memo.id}
                  className={`p-3 rounded-xl border space-y-1 ${
                    memo.priority === 'urgent'
                      ? 'bg-red-950/40 border-red-700/60 text-red-100'
                      : memo.priority === 'normal'
                      ? 'bg-slate-800 border-amber-500/40 text-amber-100'
                      : 'bg-slate-800 border-slate-700 text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1.5 font-bold">
                      <span className={memo.role === 'admin' ? 'text-red-400' : 'text-amber-400'}>
                        [{memo.role.toUpperCase()}] {memo.author}
                      </span>
                      <span>•</span>
                      <span className="text-slate-400">{memo.timeFormatted}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          memo.priority === 'urgent'
                            ? 'bg-red-600 text-white'
                            : memo.priority === 'normal'
                            ? 'bg-amber-600 text-white'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {memo.priority === 'urgent' ? 'عاجل' : memo.priority === 'normal' ? 'عادي' : 'توجيه'}
                      </span>
                      <button
                        onClick={() => onDeleteStaffMemo(memo.id)}
                        className="text-slate-400 hover:text-red-400 cursor-pointer"
                        title="حذف الملاحظة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed">{memo.text}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 8: BAD WORDS FILTER & FILTER ALERTS LOG */}
      {activeTab === 'words' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs bg-slate-900/60">
          {/* Sub-tabs: Alerts Log vs Word Management */}
          <div className="flex rounded-xl bg-slate-800 p-1 border border-slate-700">
            <button
              onClick={() => setFilterSubTab('alerts')}
              className={`flex-1 py-1.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                filterSubTab === 'alerts'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
              <span>سجل تنبيهات الفلتر 🚨 ({filterAlerts.length})</span>
            </button>
            <button
              onClick={() => setFilterSubTab('words')}
              className={`flex-1 py-1.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                filterSubTab === 'words'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Filter className="w-3.5 h-3.5 text-amber-200" />
              <span>إدارة الكلمات المحظورة 📝 ({monitoredWordsList.length})</span>
            </button>
          </div>

          {filterSubTab === 'alerts' ? (
            /* SUB-TAB 1: FILTER ALERTS LOG (سجل تنبيهات الفلتر مع اسم العضو والرسالة الكاملة) */
            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-2.5 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-200">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse" />
                  <span className="font-bold text-xs">
                    سجل الرقابة الحية: يعرض اسم العضو والرسالة الكاملة التي وردت فيها الكلمة المفلترة
                  </span>
                </div>
                {filterAlerts.length > 0 && onClearFilterAlerts && (
                  <button
                    onClick={() => {
                      if (confirm('تفريغ سجل تنبيهات الفلتر بالكامل؟')) {
                        onClearFilterAlerts();
                      }
                    }}
                    className="px-2 py-1 bg-red-900/80 hover:bg-red-800 text-white rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>مسح السجل</span>
                  </button>
                )}
              </div>

              {filterAlerts.length === 0 ? (
                <div className="py-12 text-center text-slate-400 bg-slate-800/40 rounded-xl border border-dashed border-slate-700">
                  <Check className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                  <p className="font-bold text-slate-300">لا توجد تنبيهات فلتر مسجلة حالياً</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    الدردشة نظيفة ولم يتم رصد أي كلمات مخالفة حتى الآن
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {filterAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="p-3 bg-slate-800/90 border border-red-800/70 hover:border-red-600 rounded-xl space-y-2 transition-all shadow-xs"
                    >
                      {/* Author row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <img
                            src={alert.avatarUrl || DEFAULT_AVATAR_SVG}
                            alt={alert.username}
                            className="w-7 h-7 rounded-lg object-cover border border-amber-500/60"
                          />
                          <div>
                            <div className="font-black text-white text-xs flex items-center gap-1.5">
                              <span>{alert.username}</span>
                              <span>{alert.flag || '🇸🇦'}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 flex-wrap">
                              <span>غرفة: {alert.room}</span>
                              <span>•</span>
                              <span
                                title={alert.time ? `التوقيت الفعلي: ${alert.time}` : undefined}
                                className="text-rose-300 font-sans font-bold bg-rose-500/15 border border-rose-500/30 px-1.5 py-0.2 rounded-md flex items-center gap-1"
                              >
                                <Clock className="w-3 h-3 text-rose-400 shrink-0" />
                                <span>({formatLogRelativeTime(alert.timestamp, alert.time)})</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Matched Bad Word Badge */}
                        <div className="px-2 py-0.5 bg-rose-600 text-white font-black rounded-lg text-[10px] flex items-center gap-1">
                          <span>الكلمة المكتشفة:</span>
                          <span className="underline">{alert.matchedWords.join(', ')}</span>
                        </div>
                      </div>

                      {/* Full Message containing the filtered word */}
                      <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-700 text-slate-100 text-xs leading-relaxed break-words whitespace-pre-wrap">
                        <span className="text-amber-400 font-bold block mb-1 text-[10px]">
                          💬 نص الرسالة الكاملة:
                        </span>
                        <div className="font-sans">
                          {alert.fullMessage}
                        </div>
                      </div>

                      {/* Quick Moderation Actions Toolbar */}
                      <div className="flex items-center gap-1.5 pt-1 border-t border-slate-700 text-[11px] font-bold">
                        <button
                          onClick={() => onAdminAction('kick', alert.username, undefined, `كتابة كلمة محظورة: ${alert.matchedWords.join(', ')}`)}
                          className="px-2 py-1 rounded bg-slate-700 hover:bg-rose-900/80 text-rose-300 border border-slate-600 flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <UserX className="w-3 h-3" />
                          <span>طرد</span>
                        </button>
                        <button
                          onClick={() => onAdminAction('mute', alert.username)}
                          className="px-2 py-1 rounded bg-slate-700 hover:bg-rose-900/80 text-rose-300 border border-slate-600 flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <VolumeX className="w-3 h-3" />
                          <span>إسكات</span>
                        </button>
                        <button
                          onClick={() => onAdminAction('jailUser', alert.username, undefined, `مخالفة الفلتر: ${alert.matchedWords.join(', ')}`)}
                          className="px-2 py-1 rounded bg-slate-700 hover:bg-amber-900/80 text-amber-300 border border-slate-600 flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <span>🚔 سجن</span>
                        </button>
                        <button
                          onClick={() => onAdminAction('ban', alert.username, `مخالفة الفلتر: ${alert.matchedWords.join(', ')}`)}
                          className="px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Shield className="w-3 h-3" />
                          <span>باند</span>
                        </button>
                        <button
                          onClick={() => {
                            if (onRevealNicks) {
                              onRevealNicks(alert.username);
                            } else {
                              onAdminAction('revealNicks', alert.username);
                            }
                          }}
                          className="px-2 py-1 rounded bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/60 flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Search className="w-3 h-3 text-indigo-400" />
                          <span>🔍 كشف نكات</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* SUB-TAB 2: BAD WORDS FILTER MANAGEMENT (إدارة كلمات الفلتر) */
            <div className="space-y-3">
              <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 space-y-1">
                <div className="font-bold text-amber-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Filter className="w-4 h-4 text-amber-400" />
                    <span>فلتر الكلمات والعبارات المحظورة ({monitoredWordsList.length})</span>
                  </span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded font-black">
                    مراقبة حية
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  الكلمات المدرجة هنا يتم حجبها وتسجيلها فوراً مع اسم العضو والرسالة الكاملة في سجل تنبيهات الفلتر.
                </p>
              </div>

              {/* Add Word Input */}
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="اكتب الكلمة أو العبارة المحظورة الجديدة..."
                  value={newWordInput}
                  onChange={(e) => setNewWordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newWordInput.trim()) {
                      onAddMonitoredWord(newWordInput.trim());
                      setNewWordInput('');
                    }
                  }}
                  className="flex-1 p-2 rounded-xl text-xs bg-slate-800 border border-slate-700 focus:border-amber-500 text-white outline-none"
                />
                <button
                  onClick={() => {
                    if (newWordInput.trim()) {
                      onAddMonitoredWord(newWordInput.trim());
                      setNewWordInput('');
                    }
                  }}
                  className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>إضافة للفلتر</span>
                </button>
              </div>

              {/* Words Chips List */}
              <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-300 text-xs">قائمة الكلمات النشطة بالفلتر:</span>
                  <span className="text-[10px] text-slate-400">انقر على ✕ لحذف أي كلمة</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {monitoredWordsList.map((word) => (
                    <span
                      key={word}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 text-rose-300 border border-rose-900/60 font-mono text-[11px]"
                    >
                      <span>{word}</span>
                      <button
                        type="button"
                        onClick={() => onRemoveMonitoredWord(word)}
                        className="text-slate-400 hover:text-white cursor-pointer"
                        title={`حذف [${word}] من الفلتر`}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: CHAT SHORTCUTS MANAGEMENT (قائمة الاختصارات الذكية للشات) */}
      {activeTab === 'shortcuts' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs bg-slate-900/60">
          {/* Header Banner */}
          <div className="p-3 bg-gradient-to-r from-amber-950/60 via-slate-800 to-amber-950/60 rounded-2xl border border-amber-500/40 shadow-md space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-400">
                  <Zap className="w-4 h-4 fill-amber-400" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-amber-200">قائمة اختصارات الشات الذكية ⚡</h4>
                  <p className="text-[10px] text-amber-300/80">استبدال تلقائي فوري للكلمات والرموز بالجمل الكاملة</p>
                </div>
              </div>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full font-bold">
                {shortcuts.length} اختصار نشط
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed pt-1">
              أضف اختصاراتك يدوياً هنا؛ بمجرد كتابة رمز الاختصار (مثال: <strong className="text-amber-300">نورت</strong> أو <strong className="text-amber-300">ن</strong>) في أي مكان بالشات يتم استبداله فوراً بالجملة البديلة المحددة (مثال: <strong className="text-amber-300">نورت الشات بطلتك الحلوه</strong> أو <strong className="text-amber-300">نورتو يالي دخلتو</strong>).
            </p>
          </div>

          {/* Sub-Switch: إدارة الاختصارات vs مختبر التجربة الفوري */}
          <div className="flex rounded-xl bg-slate-800 p-1 border border-slate-700">
            <button
              onClick={() => setShortcutSubTab('manage')}
              className={`flex-1 py-1.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                shortcutSubTab === 'manage'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>إدارة وإضافة الاختصارات ({shortcuts.length})</span>
            </button>
            <button
              onClick={() => setShortcutSubTab('tester')}
              className={`flex-1 py-1.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                shortcutSubTab === 'tester'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-indigo-300" />
              <span>مختبر التجربة الحية 🧪</span>
            </button>
          </div>

          {shortcutSubTab === 'manage' ? (
            <div className="space-y-3">
              {/* Form: Add New Shortcut Manually */}
              <div className="p-3 bg-slate-800/90 rounded-2xl border border-slate-700 space-y-2.5 shadow-sm">
                <div className="font-bold text-xs text-amber-300 flex items-center gap-1.5">
                  <PlusCircle className="w-4 h-4 text-amber-400" />
                  <span>إضافة اختصار جديد يدوياً:</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-300 block">اسم / رمز الاختصار:</label>
                    <input
                      type="text"
                      placeholder="مثال: نورت  أو  ن"
                      value={shortcutTriggerInput}
                      onChange={(e) => setShortcutTriggerInput(e.target.value)}
                      className="w-full p-2 rounded-xl text-xs bg-slate-900 border border-slate-700 focus:border-amber-400 text-amber-300 font-bold outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-300 block">الجملة أو النص البديل الكامل:</label>
                    <input
                      type="text"
                      placeholder="مثال: نورت الشات بطلتك الحلوه 🌹  أو  نورتو يالي دخلتو 🌟"
                      value={shortcutReplacementInput}
                      onChange={(e) => setShortcutReplacementInput(e.target.value)}
                      className="w-full p-2 rounded-xl text-xs bg-slate-900 border border-slate-700 focus:border-amber-400 text-white outline-none"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const cleanTrig = shortcutTriggerInput.trim();
                    const cleanRepl = shortcutReplacementInput.trim();
                    if (!cleanTrig || !cleanRepl) {
                      showToast('يرجى كتابة رمز الاختصار والجملة البديلة كاملة', 'error');
                      return;
                    }
                    if (onAddShortcut) {
                      onAddShortcut(cleanTrig, cleanRepl);
                      setShortcutTriggerInput('');
                      setShortcutReplacementInput('');
                      showToast(`تم حفظ وتفعيل الاختصار [${cleanTrig}] ⚡`, 'success');
                    }
                  }}
                  disabled={!shortcutTriggerInput.trim() || !shortcutReplacementInput.trim()}
                  className="w-full py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>حفظ وتفعيل الاختصار في الشات الآن ⚡</span>
                </button>

                {/* Fast Clickable Presets Bar */}
                <div className="pt-2 border-t border-slate-700/60 space-y-1.5">
                  <span className="text-[10px] text-slate-400 font-bold block">
                    ⚡ اقتراحات واختصارات جاهزة للإضافة السريعة بضغطة واحدة:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {DEFAULT_PRESET_SHORTCUTS.map((preset) => (
                      <button
                        key={preset.trigger}
                        type="button"
                        onClick={() => {
                          setShortcutTriggerInput(preset.trigger);
                          setShortcutReplacementInput(preset.replacement);
                          showToast(`تم نسخ الاقتراح [${preset.trigger}] للحقول 📝`, 'info');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-amber-950/80 border border-slate-700 hover:border-amber-500/60 text-[11px] text-amber-200 transition-colors flex items-center gap-1 cursor-pointer"
                        title={preset.label}
                      >
                        <span className="font-black text-amber-400">[{preset.trigger}]</span>
                        <span className="text-slate-400">➔</span>
                        <span className="truncate max-w-[130px] text-[10px]">{preset.replacement}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Search Bar for Shortcuts */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="بحث في الاختصارات أو الجمل البديلة..."
                    value={shortcutSearchQuery}
                    onChange={(e) => setShortcutSearchQuery(e.target.value)}
                    className="w-full p-2 pr-7 rounded-xl text-xs bg-slate-800 border border-slate-700 text-white outline-none"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
                </div>
                {shortcutSearchQuery && (
                  <button
                    onClick={() => setShortcutSearchQuery('')}
                    className="px-2 py-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white text-xs"
                  >
                    إلغاء
                  </button>
                )}
              </div>

              {/* Active Shortcuts Cards List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-300 font-bold px-1">
                  <span>الاختصارات المسجلة والنشطة ({shortcuts.length}):</span>
                  <span className="text-[10px] text-slate-400">تُستبدل تلقائياً في الشات العام والخاص</span>
                </div>

                {shortcuts.length === 0 ? (
                  <div className="p-6 bg-slate-800/60 rounded-2xl border border-slate-700 text-center text-slate-400 space-y-2">
                    <Sparkles className="w-8 h-8 text-amber-400 mx-auto opacity-40" />
                    <p className="text-xs">لا توجد اختصارات مضافة بعد.</p>
                    <p className="text-[10px] text-slate-500">أضف اختصارات مخصصة من الحقول بالأعلى أو اضغط على الاقتراحات السريعة.</p>
                  </div>
                ) : (
                  shortcuts
                    .filter((sc) => {
                      if (!shortcutSearchQuery.trim()) return true;
                      const q = shortcutSearchQuery.toLowerCase();
                      return sc.trigger.toLowerCase().includes(q) || sc.replacement.toLowerCase().includes(q);
                    })
                    .map((sc) => (
                      <div
                        key={sc.id}
                        className="p-3 bg-slate-800 rounded-xl border border-slate-700 hover:border-amber-500/50 transition-colors space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-400/40 font-mono font-black text-xs shadow-xs flex items-center gap-1">
                              <Zap className="w-3 h-3 fill-amber-400" />
                              <span>{sc.trigger}</span>
                            </span>
                            <span className="text-amber-500 font-bold">➔</span>
                            <span className="text-slate-100 font-bold text-xs select-text">
                              {sc.replacement}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingShortcut(sc);
                                setEditTriggerInput(sc.trigger);
                                setEditReplacementInput(sc.replacement);
                              }}
                              className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-amber-300 text-xs transition-colors cursor-pointer"
                              title="تعديل هذا الاختصار"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`هل أنت متأكد من حذف الاختصار [${sc.trigger}]؟`)) {
                                  if (onDeleteShortcut) {
                                    onDeleteShortcut(sc.id);
                                    showToast(`تم حذف الاختصار [${sc.trigger}]`, 'info');
                                  }
                                }
                              }}
                              className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 text-xs transition-colors cursor-pointer"
                              title="حذف هذا الاختصار"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-700/60">
                          <span>بواسطة: {sc.createdBy || 'الإدارة'}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setTestShortcutText(sc.trigger);
                              setShortcutSubTab('tester');
                              showToast(`تم إرسال [${sc.trigger}] لمختبر التجربة 🧪`, 'info');
                            }}
                            className="text-amber-400 hover:underline cursor-pointer flex items-center gap-1"
                          >
                            <span>تجربة الاختصار ➔</span>
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          ) : (
            /* SUB-TAB 2: INTERACTIVE LIVE SHORTCUT TESTER */
            <div className="space-y-3">
              <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 space-y-1">
                <div className="font-bold text-indigo-300 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 fill-indigo-400" />
                  <span>مختبر التجربة الحية الفورية للاختصارات:</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  اكتب أي نص أو كلمة اختصار في الحقل أدناه (مثل: <strong className="text-amber-300">نورت</strong> أو <strong className="text-amber-300">ن</strong> أو <strong className="text-amber-300">يا هلا نورت المجلس</strong>) وشاهد كيف يستبدلها النظام تلقائياً وبدقة!
                </p>
              </div>

              <div className="p-3 bg-slate-800/90 rounded-2xl border border-slate-700 space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-300 block">النص المكتوب (كما يكتبه العضو):</label>
                  <input
                    type="text"
                    value={testShortcutText}
                    onChange={(e) => setTestShortcutText(e.target.value)}
                    placeholder="اكتب هنا لتجربة الاستبدال (مثال: نورت أو ن)..."
                    className="w-full p-2.5 rounded-xl text-xs bg-slate-900 border border-indigo-500/50 text-white outline-none focus:border-indigo-400"
                  />
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] text-slate-400 self-center">أمثلة سريعة للتجربة:</span>
                  {['نورت', 'ن', 'سلام', 'برب', 'باك', 'يا هلا نورت الشات', 'ن تفضلوا'].map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => setTestShortcutText(ex)}
                      className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] text-amber-300 hover:border-amber-400 cursor-pointer"
                    >
                      {ex}
                    </button>
                  ))}
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-indigo-500/30 space-y-1.5">
                  <div className="text-[10px] font-bold text-indigo-400 flex items-center justify-between">
                    <span>كيف ستظهر الرسالة في الشات بعد الإرسال:</span>
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono">
                      معاينة حية
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 text-amber-200 font-bold text-xs border border-slate-800 select-text leading-relaxed">
                    {expandClientShortcuts(testShortcutText, shortcuts) || <span className="text-slate-600 font-normal">اكتب نصاً للمعاينة...</span>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Edit Shortcut Modal */}
          {editingShortcut && (
            <div
              onClick={(e) => {
                if (e.target === e.currentTarget) setEditingShortcut(null);
              }}
              className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 backdrop-blur-xs text-right"
            >
              <div className="w-full max-w-sm bg-[#1e1712] rounded-2xl border-2 border-amber-500 p-4 text-slate-100 space-y-3 shadow-2xl">
                <div className="flex items-center justify-between border-b border-[#3e2c1c] pb-2">
                  <div className="font-bold text-sm text-amber-300 flex items-center gap-1.5">
                    <Edit3 className="w-4 h-4 text-amber-400" />
                    <span>تعديل الاختصار [{editingShortcut.trigger}]</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingShortcut(null)}
                    className="w-6 h-6 rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-300 block mb-1">اسم / رمز الاختصار:</label>
                    <input
                      type="text"
                      value={editTriggerInput}
                      onChange={(e) => setEditTriggerInput(e.target.value)}
                      className="w-full p-2 bg-black/50 border border-slate-700 rounded-xl text-xs text-amber-300 font-bold outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-300 block mb-1">الجملة البديلة الكاملة:</label>
                    <textarea
                      value={editReplacementInput}
                      onChange={(e) => setEditReplacementInput(e.target.value)}
                      rows={3}
                      className="w-full p-2 bg-black/50 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (!editTriggerInput.trim() || !editReplacementInput.trim()) {
                        showToast('يرجى ملء جميع الحقول', 'error');
                        return;
                      }
                      if (onUpdateShortcut) {
                        onUpdateShortcut(editingShortcut.id, editTriggerInput.trim(), editReplacementInput.trim());
                      } else if (onAddShortcut) {
                        onAddShortcut(editTriggerInput.trim(), editReplacementInput.trim());
                      }
                      setEditingShortcut(null);
                      showToast('تم حفظ تعديلات الاختصار بنجاح ⚡', 'success');
                    }}
                    className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow cursor-pointer"
                  >
                    حفظ التعديل ✔️
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingShortcut(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 9: AUDIT LOGS */}
      {activeTab === 'logs' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs bg-slate-900/60">
          {/* Persistent Log Banner */}
          <div className="p-2.5 bg-slate-800/90 border border-amber-500/30 rounded-xl text-slate-300 flex items-center justify-between text-[11px] font-medium shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-bold text-sm">🛡️</span>
              <div>
                <div className="font-bold text-amber-200">سجل الأحداث والنشاطات الإدارية الدائم (Persistent Log)</div>
                <div className="text-[10px] text-slate-400">محفوظ في قاعدة البيانات باستمرار ولا يُحذف بالخروج، ليتسنى لك مراجعة كل ما حدث أثناء غيابك.</div>
              </div>
            </div>
            <span className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
              {monitorLogs.length} حدث مسجل
            </span>
          </div>

          {/* Filter Bar & Export & Clear Log Button */}
          <div className="flex items-center justify-between gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="بحث في السجل..."
                value={logSearchQuery}
                onChange={(e) => setLogSearchQuery(e.target.value)}
                className="w-full p-2 pr-7 rounded-xl text-xs bg-slate-800 border border-slate-700 text-white outline-none"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
            </div>

            <button
              onClick={handleExportLogs}
              className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-[10px] font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
              title="تصدير السجل لملف نصي"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تصدير</span>
            </button>

            {(currentUser.role === 'admin' || currentUser.role === 'super') && (
              <button
                onClick={() => {
                  if (confirm('تنبيه هام: هل أنت متأكد من رغبتك في حذف السجل الإداري ومسح جميع الأحداث والنشاطات نهائياً من قاعدة البيانات؟')) {
                    onClearMonitorLogs();
                  }
                }}
                className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white border border-red-500 text-[11px] font-black flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-md active:scale-95 transition-all"
                title="حذف السجل الإداري بالكامل من قاعدة البيانات"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>حذف السجل</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px] font-bold">
            {(['all', 'kick_ban', 'mute', 'jail', 'mic', 'role', 'security'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setLogTypeFilter(t)}
                className={`px-2.5 py-1 rounded-lg whitespace-nowrap cursor-pointer transition-colors ${
                  logTypeFilter === t
                    ? 'bg-amber-500 text-black font-black'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {t === 'all' && 'الكل'}
                {t === 'kick_ban' && 'طرد وباند'}
                {t === 'mute' && 'إسكات'}
                {t === 'jail' && 'سجن'}
                {t === 'mic' && 'المايكات'}
                {t === 'role' && 'الرتب والأسماء'}
                {t === 'security' && 'الأمان'}
              </button>
            ))}
          </div>

          {/* Logs List */}
          <div className="space-y-1.5 max-h-96 overflow-y-auto font-mono text-[11px]">
            {filteredLogs.length === 0 ? (
              <div className="py-8 text-center text-slate-400 bg-slate-800/40 rounded-xl border border-dashed border-slate-700">
                لا توجد سجلات مطابقة حالياً.
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 rounded-xl bg-slate-800/90 border border-slate-700/80 hover:border-amber-500/40 flex items-start justify-between gap-2.5 transition-colors shadow-xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <span
                        title={log.time ? `التوقيت الفعلي: ${log.time}` : undefined}
                        className="text-[10px] font-sans font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 rounded-md flex items-center gap-1"
                      >
                        <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>({formatLogRelativeTime(log.timestamp, log.time, log.id)})</span>
                      </span>
                    </div>
                    <span className="text-slate-200 leading-relaxed font-sans text-xs break-words">{log.description}</span>
                  </div>
                  <span className="text-[9px] px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-amber-400 flex-shrink-0 font-bold font-mono uppercase">
                    {log.type}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 10: PERMISSIONS HIERARCHY MATRIX & DYNAMIC PERMISSIONS MANAGER */}
      {activeTab === 'matrix' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs bg-slate-900/60">
          {/* Dynamic Role Permissions Management Box (إدارة محتوى وصلاحيات كل رتبة بالـ Checkboxes) */}
          <div className="bg-slate-800/90 border border-amber-500/50 rounded-2xl p-3.5 space-y-3 shadow-md">
            <div className="flex flex-wrap items-center justify-between border-b border-slate-700 pb-2.5 gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-amber-200">إدارة محتوى وصلاحيات الرتب ديناميكياً ⚙️</h4>
                  <p className="text-[10px] text-amber-300/80">
                    التحكم التفصيلي بمنح (✓) أو منع الصلاحيات بدقة متناهية مع حماية هرمية صارمة
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const actorLvl = (isSupremeHassan || currentUser?.role === 'admin') ? 999999 : getRoleLevel(currentUser?.role);
                    if (!isSupremeHassan && currentUser?.role !== 'admin' && actorLvl <= 10) {
                      showToast('ليست لديك صلاحية إنشاء رتب جديدة.', 'error');
                      return;
                    }
                    setIsAddingRole(!isAddingRole);
                    setEditingRoleId(null);
                    setNewRoleLevel(isSupremeHassan ? 100 : Math.max(1, actorLvl - 5));
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>إضافة رتبة جديدة</span>
                </button>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full font-bold">
                  حفظ فوري ومباشر بالسيرفر
                </span>
              </div>
            </div>

            {/* Add New Role Form */}
            {isAddingRole && (
              <div className="p-3 bg-slate-900/90 border border-amber-500/60 rounded-xl space-y-2.5 animate-fadeIn">
                <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                  <span className="flex items-center gap-1">
                    <PlusCircle className="w-4 h-4 text-amber-400" />
                    إضافة رتبة جديدة وتحديد مستواها الهرمي
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAddingRole(false)}
                    className="text-slate-400 hover:text-white p-1 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">اسم الرتبة (مثال: مستشار، مراقب عام):</label>
                    <input
                      type="text"
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                      placeholder="أدخل اسم الرتبة..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white placeholder-slate-500 text-xs focus:outline-hidden focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">
                      رقم الرتبة (المستوى: الأكبر = أعلى سلطة):
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="999"
                      value={newRoleLevel}
                      onChange={(e) => setNewRoleLevel(Number(e.target.value) || 0)}
                      placeholder="مثال: 60 أو 85"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white placeholder-slate-500 text-xs focus:outline-hidden focus:border-amber-500"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingRole(false)}
                    className="px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!newRoleName.trim()) {
                        showToast('يرجى كتابة اسم الرتبة', 'error');
                        return;
                      }
                      const actorLvl = (isSupremeHassan || currentUser?.role === 'admin') ? 999999 : getRoleLevel(currentUser?.role);
                      const requestedLvl = Number(newRoleLevel) || 50;
                      if (!isSupremeHassan && currentUser?.role !== 'admin' && requestedLvl >= actorLvl) {
                        showToast(`⛔ لا يمكنك إنشاء رتبة برقم (${requestedLvl}) مساوٍ أو أعلى من رقم رتبتك (${actorLvl}). يجب أن تكون أقل منها!`, 'error');
                        return;
                      }
                      const newRoleId = 'role_' + Date.now().toString(36);
                      if (onSaveRole) {
                        onSaveRole({
                          id: newRoleId,
                          name: newRoleName.trim(),
                          level: requestedLvl,
                          badgeColor: 'bg-indigo-600 text-white',
                          isSystem: false
                        });
                        setSelectedRoleForPerms(newRoleId);
                        setNewRoleName('');
                        setNewRoleLevel(60);
                        setIsAddingRole(false);
                        showToast(`تمت إضافة الرتبة [${newRoleName.trim()}] برقم [${requestedLvl}] بنجاح ✓`, 'success');
                      }
                    }}
                    className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>حفظ الرتبة</span>
                  </button>
                </div>
              </div>
            )}

            {/* Edit Role Modal / Form */}
            {editingRoleId && (
              <div className="p-3 bg-slate-900/90 border border-sky-500/60 rounded-xl space-y-2.5 animate-fadeIn">
                <div className="flex items-center justify-between text-xs font-bold text-sky-300">
                  <span className="flex items-center gap-1">
                    <Edit3 className="w-4 h-4 text-sky-400" />
                    تعديل الرتبة (الاسم والرقم الهرمي)
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditingRoleId(null)}
                    className="text-slate-400 hover:text-white p-1 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">اسم الرتبة:</label>
                    <input
                      type="text"
                      value={editRoleName}
                      onChange={(e) => setEditRoleName(e.target.value)}
                      placeholder="اسم الرتبة..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white placeholder-slate-500 text-xs focus:outline-hidden focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">
                      رقم الرتبة (كلما كان أكبر كان أعلى سلطة):
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="999"
                      value={editRoleLevel}
                      onChange={(e) => setEditRoleLevel(Number(e.target.value) || 0)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white placeholder-slate-500 text-xs focus:outline-hidden focus:border-sky-500"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setEditingRoleId(null)}
                    className="px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!editRoleName.trim()) {
                        showToast('يرجى إدخال اسم للرتبة', 'error');
                        return;
                      }
                      const actorLvl = (isSupremeHassan || currentUser?.role === 'admin') ? 999999 : getRoleLevel(currentUser?.role);
                      const requestedLvl = Number(editRoleLevel) || 50;
                      const existingRole = rolesConfig.find((r) => r.id === editingRoleId);
                      if (!isSupremeHassan && currentUser?.role !== 'admin') {
                        if (editingRoleId === currentUser?.role || (existingRole && existingRole.level >= actorLvl)) {
                          showToast('⛔ غير مسموح: لا يمكنك تعديل رتبتك الشخصية أو رتبة مساوية أو أعلى منك رقماً!', 'error');
                          return;
                        }
                        if (requestedLvl >= actorLvl) {
                          showToast(`⛔ لا يمكنك رفع رقم الرتبة (${requestedLvl}) ليكون مساوياً أو أعلى من رقم رتبتك (${actorLvl}).`, 'error');
                          return;
                        }
                      }
                      if (onSaveRole && existingRole) {
                        onSaveRole({
                          ...existingRole,
                          name: editRoleName.trim(),
                          level: requestedLvl
                        });
                        setEditingRoleId(null);
                        showToast(`تم تحديث الرتبة [${editRoleName.trim()}] برقم [${requestedLvl}] بنجاح ✓`, 'success');
                      }
                    }}
                    className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>حفظ التعديلات</span>
                  </button>
                </div>
              </div>
            )}

            {/* Dynamic Role Selector Tabs (Sorted by level descending) */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                <span>اختر الرتبة لعرض وتعديل صلاحياتها:</span>
                <span className="text-[10px] text-amber-400">مرتبة تنازلياً حسب المستوى الهرمي</span>
              </div>
              <div className="flex flex-wrap gap-1.5 p-1.5 bg-slate-900 rounded-xl border border-slate-700">
                {[...rolesConfig]
                  .sort((a, b) => b.level - a.level)
                  .map((r) => {
                    const isSelected = selectedRoleForPerms === r.id;
                    const actorLvl = getRoleLevel(currentUser?.role);
                    const canEditThisRole = isSupremeHassan || (r.id !== currentUser?.role && r.level < actorLvl);
                    return (
                      <div
                        key={r.id}
                        className={`flex items-center rounded-lg transition-all text-xs font-bold ${
                          isSelected
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedRoleForPerms(r.id)}
                          className="px-3 py-1.5 text-right flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>{r.name}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                              isSelected ? 'bg-amber-800 text-amber-200' : 'bg-slate-700 text-amber-400'
                            }`}
                            title="رقم الرتبة ومستواها الهرمي"
                          >
                            #{r.level}
                          </span>
                        </button>
                        {isSelected && canEditThisRole && (
                          <div className="flex items-center pl-1.5 gap-1 border-r border-amber-500/50 pr-1 mr-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingRoleId(r.id);
                                setEditRoleName(r.name);
                                setEditRoleLevel(r.level);
                                setIsAddingRole(false);
                              }}
                              title="تعديل اسم ورقم الرتبة"
                              className="p-1 hover:bg-amber-700/60 rounded text-amber-200 hover:text-white cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            {!r.isSystem && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm(`هل أنت متأكد من حذف الرتبة [${r.name}]؟`)) {
                                    if (onDeleteRole) {
                                      onDeleteRole(r.id);
                                      setSelectedRoleForPerms('super');
                                      showToast(`تم حذف الرتبة بنجاح`, 'info');
                                    }
                                  }
                                }}
                                title="حذف الرتبة المخصصة"
                                className="p-1 hover:bg-rose-700/60 rounded text-rose-200 hover:text-white cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Permissions Granular Manager with Hierarchy Protection */}
            {(() => {
              const actorLevel = (isSupremeHassan || currentUser?.role === 'admin') ? 999999 : getRoleLevel(currentUser?.role);
              const targetRoleDef = rolesConfig.find((x) => x.id === selectedRoleForPerms);
              const targetLevel = targetRoleDef ? targetRoleDef.level : getRoleLevel(selectedRoleForPerms);
              const isOwnRole = currentUser?.role?.toLowerCase() === selectedRoleForPerms?.toLowerCase();
              const isTargetProtected = !isSupremeHassan && currentUser?.role !== 'admin' && (targetLevel >= actorLevel || isOwnRole);
              const permsForRole = rolePermissions?.[selectedRoleForPerms] || {};

              const GRANULAR_PERMISSION_GROUPS = [
                {
                  id: 'chat_rooms',
                  title: '💬 الدردشة العامة والغرف',
                  badge: '9 صلاحيات',
                  items: [
                    { key: 'canSendText', label: 'إرسال الرسائل النصية', desc: 'إمكانية إرسال الرسائل والكتابة في الشات العام' },
                    { key: 'canSendMedia', label: 'إرسال الصور والوسائط', desc: 'إمكانية إرسال الصور والفيديوهات والملصقات بالعام' },
                    { key: 'canSendVoiceNotes', label: 'إرسال البصمات الصوتية', desc: 'تسجيل وبث الرسائل الصوتية (Voice Notes) بالغرفة' },
                    { key: 'canDeleteMessage', label: 'حذف رسائل الشات العام', desc: 'إمكانية إزالة وحذف أي رسالة مخالفة لجميع المتواجدين' },
                    { key: 'canPinMessage', label: 'تثبيت رسائل الشات', desc: 'تثبيت رسالة مهمة في أعلى شريط الدردشة لجميع الأعضاء' },
                    { key: 'canClearRoomChat', label: 'مسح شات الغرفة كاملاً', desc: 'تفريغ ومسح سجل محادثات الغرفة فوراً للجميع' },
                    { key: 'canLockRoom', label: 'قفل وفتح الشات العام', desc: 'إغلاق أو فتح إرسال الرسائل في الغرفة بقرار إداري' },
                    { key: 'canSetSlowMode', label: 'وضع التباطؤ (Slow Mode)', desc: 'تحديد مهلة زمنية بالثواني بين كل رسالة وأخرى' },
                    { key: 'canChangeRoomSettings', label: 'تعديل إعدادات الغرفة', desc: 'تغيير اسم ووصف وخلفية ورسالة ترحيب الغرفة الحالية' }
                  ]
                },
                {
                  id: 'mic_audio',
                  title: '🎙️ المايكروفون والبث الصوتي',
                  badge: '5 صلاحيات',
                  items: [
                    { key: 'canTakeMic', label: 'الصعود للمايك والتحدث', desc: 'حجز مقعد مايك صوتي والتحدث مباشرة مع المتواجدين' },
                    { key: 'canPullMic', label: 'سحب المايك من المتحدثين', desc: 'تنزيل وسحب المايك قسراً من أي متحدث مخالف' },
                    { key: 'canMuteVoice', label: 'كتم المايك الصوتي', desc: 'كتم صوت مايك العضو ومنعه من التحدث' },
                    { key: 'canLockVoice', label: 'قفل المايكات للإدارة', desc: 'حصر مقاعد المايكات على الإدارة والمشرفين فقط' },
                    { key: 'canStartLive', label: 'بدء البث المباشر (Live)', desc: 'فتح كاميرا وصوت وبدء بث مرئي مباشر للغرفة' }
                  ]
                },
                {
                  id: 'moderation',
                  title: '⚖️ العقوبات والضبط الإداري',
                  badge: '8 صلاحيات',
                  items: [
                    { key: 'canWarn', label: 'إرسال تنبيه رسمي للعضو', desc: 'إشعار تحذيري رسمي أحمر يصل لشاشة العضو بالسبب' },
                    { key: 'canMute', label: 'الإسكات الكتابي (كتم الشات)', desc: 'فرض الكتم المؤقت على المخالفين ومنعهم من الكتابة' },
                    { key: 'canKick', label: 'طرد المستخدمين من الغرفة', desc: 'طرد المخالف من الغرفة وإشعاره بالسبب مع مهلة دقيقتين' },
                    { key: 'canTempBan', label: 'الباند المؤقت بالدقائق', desc: 'حظر مؤقت للعضو لفترة محددة بالدقائق' },
                    { key: 'canBan', label: 'الباند والحظر النهائي بالـ IP', desc: 'حظر شامل للحساب وعنوان الـ IP وشبكة الجهاز نهائياً' },
                    { key: 'canUnban', label: 'رفع الحظر وفك الباند', desc: 'إلغاء الحظر وفك الباند عن الأعضاء والآيبيهات المحظورة' },
                    { key: 'canJail', label: 'سجن واحتجاز المخالفين', desc: 'إيداع العضو بسجن حسان برو وعزله عن الغرف' },
                    { key: 'canUnjail', label: 'فك السجن وإطلاق السراح', desc: 'إخراج العضو من السجن وإعادته للغرف العامة' }
                  ]
                },
                {
                  id: 'members',
                  title: '👤 إدارة الأعضاء والملفات',
                  badge: '11 صلاحيات',
                  items: [
                    { key: 'canEditMemberProfile', label: 'تعديل اسم وحالة العضو', desc: 'تعديل زخرفة الاسم والرسالة الشخصية للعضو' },
                    { key: 'canDeleteAvatar', label: 'حذف الصورة الشخصية المخالفة', desc: 'إزالة الصورة الرمزية للعضو فوراً لمخالفتها الآداب' },
                    { key: 'canEditLikes', label: 'تعديل رصيد لايكات الأعضاء', desc: 'زيادة أو إنقاص وتعيين رصيد القلوب واللايكات للعضو' },
                    { key: 'canEditPoints', label: 'تعديل رصيد النقاط', desc: 'تعديل نقاط العضو التفاعلية في حسابه' },
                    { key: 'canAssignBanner', label: 'تثبيت البنر المصور (500x50)', desc: 'تعيين وحفظ لقب البنر المصور للعضو بجانب اسمه' },
                    { key: 'canAssignBadge', label: 'منح الهدايا والأوسمة الشرفية', desc: 'إضافة وسام شرفي أو هدية تظهر بجانب اسم العضو' },
                    { key: 'canChangeMemberPassword', label: 'تغيير كلمة المرور عند النسيان', desc: 'تعيين باسورد جديد للعضو عند نسيان كلمة المرور' },
                    { key: 'canMoveUsers', label: 'نقل الأعضاء بين الغرف', desc: 'نقل وسحب الأعضاء قسراً من غرفة إلى غرفة أخرى' },
                    { key: 'canChangeRoles', label: 'ترقية وتعيين رتب الأعضاء', desc: 'تغيير رتبة ومجموعة العضو وترقيته في النظام' },
                    { key: 'canManagePermissions', label: 'إدارة الرتب والصلاحيات', desc: 'إضافة وتعديل الرتب وتحديد الصلاحيات الهرمية' },
                    { key: 'canDeleteAccounts', label: 'حذف العضويات والحسابات نهائياً', desc: 'حذف حساب العضو نهائياً من قاعدة البيانات' }
                  ]
                },
                {
                  id: 'security_filter',
                  title: '🛡️ الرقابة والأمان ولوحة التحكم',
                  badge: '6 صلاحيات',
                  items: [
                    { key: 'canAccessControlPanel', label: 'دخول لوحة التحكم الشاملة', desc: 'إمكانية فتح واستخدام لوحة التحكم والإدارة' },
                    { key: 'canFilter', label: 'جرس وتنبيهات الفلتر الأمني', desc: 'الاطلاع على جرس الكلمات المحظورة والرسائل الملتقطة' },
                    { key: 'canManageFilterWords', label: 'إدارة كلمات الفلتر المحظورة', desc: 'إضافة وتعديل وحذف الكلمات من قائمة الحظر التلقائي' },
                    { key: 'canRevealNicks', label: 'كشف النكات والآي بي وبصمة الجهاز', desc: 'كشف العضويات والآي بي الحقيقي واسم الهاتف والبصمة' },
                    { key: 'canViewAuditLogs', label: 'الاطلاع على سجل المراقبة', desc: 'مشاهدة سجل الإجراءات الإدارية والعقوبات بالتوقيت' },
                    { key: 'canClearAuditLogs', label: 'مسح سجل المراقبة', desc: 'تفريغ ومسح سجل الرقابة الأمنية بالكامل' }
                  ]
                },
                {
                  id: 'features_wall',
                  title: '🌐 الميزات العامة والحائط والخاص',
                  badge: '8 صلاحيات',
                  items: [
                    { key: 'canBroadcast', label: 'إرسال إشعار عام ملكي', desc: 'إرسال تنبيه ملكي عائم وإطلاق صافرة الإدارة للغرفة' },
                    { key: 'canGhostLogin', label: 'صلاحية الدخول المخفي (Ghost)', desc: 'الدخول المتخفي دون إشعار دخول وبنقطة زرقاء للإدارة' },
                    { key: 'canManageShortcuts', label: 'إدارة الاختصارات الذكية', desc: 'إضافة وتعديل اختصارات الشات واستبدال الكلمات التلقائي' },
                    { key: 'canChangeGlobalTheme', label: 'تعميم الثيم والخط العام', desc: 'تطبيق الثيم والخط والخلفية على كافة المتواجدين بالشات' },
                    { key: 'canPostWall', label: 'النشر على حائط الدردشة', desc: 'كتابة ونشر المنشورات والخواطر على حائط الشات' },
                    { key: 'canDeleteWallPost', label: 'حذف منشورات الحائط المخالفة', desc: 'إمكانية إزالة أي منشور أو تعليق مخالف بالحائط' },
                    { key: 'canPrivateChat', label: 'المحادثات الخاصة (PM)', desc: 'فتح وإرسال الرسائل في الخاص بين الأعضاء' },
                    { key: 'canPrivateCall', label: 'المكالمات الخاصة (صوت وفيديو)', desc: 'إجراء واستقبال المكالمات الصوتية والمرئية في الخاص' }
                  ]
                }
              ];

              const totalPermsCount = GRANULAR_PERMISSION_GROUPS.reduce((acc, g) => acc + g.items.length, 0);
              const grantedCount = GRANULAR_PERMISSION_GROUPS.reduce(
                (acc, g) => acc + g.items.filter((item) => Boolean(permsForRole[item.key])).length,
                0
              );

              return (
                <div className="space-y-3 pt-1">
                  {/* HIERARCHY PROTECTION LOCK BANNER */}
                  {isTargetProtected && (
                    <div className="p-3 bg-red-950/80 border-2 border-red-500 rounded-2xl text-red-100 flex items-start gap-3 shadow-lg animate-in fade-in">
                      <div className="w-9 h-9 rounded-xl bg-red-600/30 border border-red-500/60 flex items-center justify-center shrink-0 text-red-400">
                        <Lock className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="font-black text-sm text-red-300 flex items-center gap-2 flex-wrap">
                          <span>🔒 رتبة محمية هرمياً (ممنوع التعديل)</span>
                          <span className="text-[10px] bg-red-900 text-red-200 border border-red-700 px-2 py-0.5 rounded font-mono font-bold">
                            رتبتك: #{actorLevel} vs الرتبة: #{targetLevel}
                          </span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-red-200/90 font-medium">
                          {isOwnRole
                            ? `أنت تشغل حالياً رتبة [${targetRoleDef?.name || selectedRoleForPerms}]. وفقاً لقواعد الأمان الهرمي الصارمة، يُمنع تماماً أن يقوم أي عضو بتعديل أو منح أو سحب صلاحيات رتبته الشخصية، ويحق فقط لمن هو أعلى منك رتبة ومستوى القيام بذلك.`
                            : `هذه الرتبة مساوية أو أعلى منك في الهرم الإداري (#${targetLevel} مقابل رتبتك #${actorLevel}). لا يملك صلاحية تعديلها أو منحها أو سحب صلاحياتها سوى من هم أعلى منها في الرقم الهرمي.`}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Header info bar with stats & bulk toggle */}
                  <div className="flex flex-wrap items-center justify-between p-2.5 bg-slate-900 rounded-xl border border-slate-700 gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-amber-200">
                        صلاحيات [{targetRoleDef?.name || selectedRoleForPerms}] (#{targetLevel}):
                      </span>
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full font-bold font-mono">
                        {grantedCount} / {totalPermsCount} ممنوحة
                      </span>
                    </div>

                    {!isTargetProtected && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (onUpdateRolePermissions) {
                              const allGranted: Record<string, boolean> = {};
                              GRANULAR_PERMISSION_GROUPS.forEach((g) => {
                                g.items.forEach((item) => {
                                  allGranted[item.key] = true;
                                });
                              });
                              onUpdateRolePermissions(selectedRoleForPerms, allGranted);
                              showToast(`تم منح جميع الصلاحيات الـ (${totalPermsCount}) للرتبة بنجاح ✓`, 'success');
                            }
                          }}
                          className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                          <span>منح الكل ({totalPermsCount})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (onUpdateRolePermissions) {
                              const allRevoked: Record<string, boolean> = {};
                              GRANULAR_PERMISSION_GROUPS.forEach((g) => {
                                g.items.forEach((item) => {
                                  allRevoked[item.key] = false;
                                });
                              });
                              onUpdateRolePermissions(selectedRoleForPerms, allRevoked);
                              showToast(`تم سحب جميع الصلاحيات من الرتبة ✗`, 'info');
                            }
                          }}
                          className="px-2.5 py-1 bg-rose-800 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                          <span>سحب الكل</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Grouped Category Sections */}
                  <div className="space-y-3">
                    {GRANULAR_PERMISSION_GROUPS.map((group) => {
                      const groupGrantedCount = group.items.filter((item) => Boolean(permsForRole[item.key])).length;
                      return (
                        <div key={group.id} className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-2.5 space-y-2">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 px-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-xs text-amber-300">{group.title}</span>
                              <span className="text-[10px] bg-slate-800 text-amber-400 border border-slate-700 px-2 py-0.2 rounded-full font-bold">
                                {groupGrantedCount} / {group.items.length} مفعلة
                              </span>
                            </div>

                            {!isTargetProtected && (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (onUpdateRolePermissions) {
                                      const updates: Record<string, boolean> = {};
                                      group.items.forEach((item) => {
                                        updates[item.key] = true;
                                      });
                                      onUpdateRolePermissions(selectedRoleForPerms, updates);
                                      showToast(`تم منح صلاحيات [${group.title}] بنجاح ✓`, 'success');
                                    }
                                  }}
                                  className="text-[9px] px-1.5 py-0.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700 rounded font-bold cursor-pointer"
                                  title="منح كل صلاحيات هذا القسم"
                                >
                                  منح القسم
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (onUpdateRolePermissions) {
                                      const updates: Record<string, boolean> = {};
                                      group.items.forEach((item) => {
                                        updates[item.key] = false;
                                      });
                                      onUpdateRolePermissions(selectedRoleForPerms, updates);
                                      showToast(`تم سحب صلاحيات [${group.title}] ✗`, 'info');
                                    }
                                  }}
                                  className="text-[9px] px-1.5 py-0.5 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded font-bold cursor-pointer"
                                  title="سحب كل صلاحيات هذا القسم"
                                >
                                  سحب القسم
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {group.items.map((p) => {
                              const isChecked = Boolean(permsForRole[p.key]);
                              return (
                                <label
                                  key={p.key}
                                  className={`p-2 rounded-xl border flex items-start gap-2.5 transition-all ${
                                    isTargetProtected ? 'opacity-65 cursor-not-allowed' : 'cursor-pointer hover:border-slate-600'
                                  } ${
                                    isChecked
                                      ? 'bg-amber-950/40 border-amber-500/70 text-amber-100 shadow-2xs'
                                      : 'bg-slate-900/80 border-slate-700/80 text-slate-400'
                                  }`}
                                  onClick={(e) => {
                                    if (isTargetProtected) {
                                      e.preventDefault();
                                      showToast('⛔ غير مسموح: لا يمكنك تعديل صلاحيات رتبتك أو رتبة مساوية أو أعلى منك رقماً!', 'error');
                                    }
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    disabled={isTargetProtected}
                                    onChange={(e) => {
                                      if (isTargetProtected) return;
                                      const checked = e.target.checked;
                                      if (onUpdateRolePermissions) {
                                        onUpdateRolePermissions(selectedRoleForPerms, { [p.key]: checked });
                                        showToast(
                                          checked
                                            ? `تم منح صلاحية [${p.label}] بنجاح ✓`
                                            : `تم سحب صلاحية [${p.label}] ✗`,
                                          'success'
                                        );
                                      }
                                    }}
                                    className={`mt-0.5 w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-600 accent-amber-500 shrink-0 ${
                                      isTargetProtected ? 'cursor-not-allowed' : 'cursor-pointer'
                                    }`}
                                  />
                                  <div className="min-w-0">
                                    <div className="font-bold text-xs flex items-center gap-1.5">
                                      <span>{p.label}</span>
                                      {isChecked ? (
                                        <span className="text-[10px] text-emerald-400 font-bold">✓ ممنوحة</span>
                                      ) : (
                                        <span className="text-[10px] text-slate-500">فارغة (ممنوعة)</span>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-slate-400 line-clamp-1">{p.desc}</div>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="bg-amber-950/40 border border-amber-600/50 p-3 rounded-xl text-amber-200 leading-relaxed space-y-1.5">
            <div className="font-bold text-sm flex items-center gap-1.5 text-amber-300">
              <Award className="w-4 h-4 text-amber-400" />
              <span>نظام وقواعد الحماية الهرمية الصارمة والدخول المخفي</span>
            </div>
            <div className="text-[11px] text-amber-200/90 space-y-1">
              <p>
                👑 <strong>قاعدة التحكم الهرمي:</strong> كلما كان رقم الرتبة أكبر، كان صاحبها أعلى مكانة ويستطيع التحكم بمن هم يساوونه بالرقم أو أقل منه رقماً. ولا يمكن لأي رتبة معاقبة أو التحكم برتبة رقمها أعلى منها.
              </p>
              <p>
                🔵 <strong>قاعدة الدخول المخفي:</strong> عندما يدخل العضو بوضع &quot;مخفي&quot;، فإن الأعضاء الأقل منه رتبة لا يرونه نهائياً في القائمة. أما الأعضاء الذين هم في نفس رتبته أو أعلى منها فيرونه، وتكون النقطة التي على صورته زرقاء 🔵 بدلاً من الخضراء 🟢 ليدركوا أنه متواجد ولكن بوضع مخفي.
              </p>
            </div>
          </div>

          <div className="border border-slate-700 rounded-xl overflow-hidden shadow-xs bg-slate-800">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#241a12] text-amber-300 text-[11px]">
                <tr>
                  <th className="p-2.5 text-right">الخاصية / الإجراء الإداري</th>
                  <th className="p-2.5 text-center text-red-400">👑 المدير (Admin)</th>
                  <th className="p-2.5 text-center text-amber-400">🛡️ السوبر (Super)</th>
                  <th className="p-2.5 text-center text-indigo-300">🎖️ العضو (Member)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700 text-[11px]">
                <tr>
                  <td className="p-2.5 font-bold text-white">قفل الطوارئ العام وإيقاف الدردشة</td>
                  <td className="p-2.5 text-center text-emerald-400 font-black">✔️ كامل</td>
                  <td className="p-2.5 text-center text-rose-400 font-bold">❌ محصور</td>
                  <td className="p-2.5 text-center text-rose-400 font-bold">❌ غير متاح</td>
                </tr>
                <tr className="bg-slate-800/50">
                  <td className="p-2.5 font-bold text-white">الباند والحظر الدائم بالـ IP</td>
                  <td className="p-2.5 text-center text-emerald-400 font-black">✔️ كامل</td>
                  <td className="p-2.5 text-center text-rose-400 font-bold">❌ محصور</td>
                  <td className="p-2.5 text-center text-rose-400 font-bold">❌ غير متاح</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold text-white">سجن واحتجاز المخالفين</td>
                  <td className="p-2.5 text-center text-emerald-400 font-black">✔️ كامل</td>
                  <td className="p-2.5 text-center text-emerald-400 font-bold">✔️ للأعضاء والزوار</td>
                  <td className="p-2.5 text-center text-rose-400 font-bold">❌ غير متاح</td>
                </tr>
                <tr className="bg-slate-800/50">
                  <td className="p-2.5 font-bold text-white">طرد وإسكات المستخدمين (نصي وصوتي)</td>
                  <td className="p-2.5 text-center text-emerald-400 font-black">✔️ كامل</td>
                  <td className="p-2.5 text-center text-emerald-400 font-bold">✔️ للأعضاء والزوار</td>
                  <td className="p-2.5 text-center text-rose-400 font-bold">❌ غير متاح</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold text-white">إنشاء وحذف الغرف الأساسية</td>
                  <td className="p-2.5 text-center text-emerald-400 font-black">✔️ كامل</td>
                  <td className="p-2.5 text-center text-rose-400 font-bold">❌ محصور</td>
                  <td className="p-2.5 text-center text-rose-400 font-bold">❌ غير متاح</td>
                </tr>
                <tr className="bg-slate-800/50">
                  <td className="p-2.5 font-bold text-white">ترقية وتعيين الرتب والألقاب</td>
                  <td className="p-2.5 text-center text-emerald-400 font-black">✔️ كامل</td>
                  <td className="p-2.5 text-center text-rose-400 font-bold">❌ محصور</td>
                  <td className="p-2.5 text-center text-rose-400 font-bold">❌ غير متاح</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold text-white">إطلاق صافرات الإنذار الإداري</td>
                  <td className="p-2.5 text-center text-emerald-400 font-black">✔️ كامل</td>
                  <td className="p-2.5 text-center text-emerald-400 font-bold">✔️ متاح</td>
                  <td className="p-2.5 text-center text-rose-400 font-bold">❌ غير متاح</td>
                </tr>
                <tr className="bg-slate-800/50">
                  <td className="p-2.5 font-bold text-white">إفراغ سجل المراقبة كاملاً</td>
                  <td className="p-2.5 text-center text-emerald-400 font-black">✔️ كامل</td>
                  <td className="p-2.5 text-center text-rose-400 font-bold">❌ محصور</td>
                  <td className="p-2.5 text-center text-rose-400 font-bold">❌ غير متاح</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: GENERAL WELCOME MESSAGES MANAGEMENT (إدارة الرسائل الترحيبية العامة للشات) */}
      {activeTab === 'welcome' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs bg-slate-900/80">
          <div className="bg-gradient-to-r from-emerald-950/60 via-slate-800 to-amber-950/60 border border-emerald-500/40 rounded-2xl p-4 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-emerald-200">إدارة الرسائل الترحيبية العامة للشات 💬</h4>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    التحكم بالرسالة الترحيبية الرسمية التي تظهر تلقائياً للزوار والأعضاء فور دخولهم إلى الشات
                  </p>
                </div>
              </div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                لوحة تحكم الأدمن
              </span>
            </div>

            {/* Toggle Status */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div>
                <span className="font-bold text-slate-200 block text-xs">تفعيل رسالة الترحيب العامة:</span>
                <span className="text-[10px] text-slate-400">
                  عند التفعيل، سيرسل النظام رسالة ترحيب منسقة للأعضاء والزوار عند دخولهم
                </span>
              </div>
              <button
                type="button"
                onClick={() => setGeneralWelcomeEnabled(!generalWelcomeEnabled)}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer border ${
                  generalWelcomeEnabled
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {generalWelcomeEnabled ? 'مفعلة ✔️' : 'معطلة ✕'}
              </button>
            </div>

            {/* Sender / Badge Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-amber-300 block">
                عنوان ولقب مرسل الترحيب (اسم الجهة أو الإدارة):
              </label>
              <input
                type="text"
                value={generalWelcomeTitle}
                onChange={(e) => setGeneralWelcomeTitle(e.target.value)}
                placeholder="مثال: إدارة حسان برو 🦅"
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:border-emerald-500 outline-none"
              />
            </div>

            {/* Message Text */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-emerald-300 block">
                نص رسالة الترحيب العامة:
              </label>
              <textarea
                rows={4}
                value={generalWelcomeText}
                onChange={(e) => setGeneralWelcomeText(e.target.value)}
                placeholder="اكتب نص الترحيب العام الذي يظهر للجميع..."
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:border-emerald-500 outline-none resize-none leading-relaxed"
              />
            </div>

            {/* Quick Template Presets */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 block">
                قوالب ترحيبية جاهزة وفخمة (انقر لاختيارها):
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setGeneralWelcomeTitle('إدارة حسان برو 🦅');
                    setGeneralWelcomeText('نحن سعداء بتشريفك فأهلاً بك عطراً فوّاحاً ينثرُ شذاه في كلّ الأرجاء .. نتمنى لك وقتاً ممتعاً 🌹');
                  }}
                  className="p-2 text-right rounded-xl bg-slate-950/70 hover:bg-slate-900 border border-slate-800 text-[10px] text-amber-200 cursor-pointer"
                >
                  <span className="font-bold block text-amber-300 mb-0.5">👑 ترحيب ملكي أصيل</span>
                  <span className="line-clamp-1 opacity-80">أهلاً بك عطراً فوّاحاً ينثرُ شذاه...</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGeneralWelcomeTitle('مجلس حسان برو 🦅');
                    setGeneralWelcomeText('مرحباً بعضونا الغالي في مجلس حسان برو .. حياك الله وبياك في ملتقى الأصالة والشهامة 🦅✨');
                  }}
                  className="p-2 text-right rounded-xl bg-slate-950/70 hover:bg-slate-900 border border-slate-800 text-[10px] text-amber-200 cursor-pointer"
                >
                  <span className="font-bold block text-amber-300 mb-0.5">🦅 ترحيب مجلس حسان</span>
                  <span className="line-clamp-1 opacity-80">مرحباً بعضونا الغالي في مجلس حسان برو...</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGeneralWelcomeTitle('أسرة حسان برو 🤍');
                    setGeneralWelcomeText('يا هلا والله ومسهلا بنور العين .. حللت أهلاً ووطئت سهلاً في بيتك الثاني بين إخوتك وأحبتك 🤍☕');
                  }}
                  className="p-2 text-right rounded-xl bg-slate-950/70 hover:bg-slate-900 border border-slate-800 text-[10px] text-amber-200 cursor-pointer"
                >
                  <span className="font-bold block text-amber-300 mb-0.5">☕ ترحيب العائلة الدافئ</span>
                  <span className="line-clamp-1 opacity-80">يا هلا والله ومسهلا بنور العين...</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGeneralWelcomeTitle('إدارة حسان برو 🌟');
                    setGeneralWelcomeText('يسعدنا ويشرفنا تواجدك العاطر معنا .. نتمنى لك أمتع اللحظات وأجمل الذكريات في شات حسان برو 🌟🌹');
                  }}
                  className="p-2 text-right rounded-xl bg-slate-950/70 hover:bg-slate-900 border border-slate-800 text-[10px] text-amber-200 cursor-pointer"
                >
                  <span className="font-bold block text-amber-300 mb-0.5">🌟 ترحيب التميز والتألق</span>
                  <span className="line-clamp-1 opacity-80">يسعدنا ويشرفنا تواجدك العاطر معنا...</span>
                </button>
              </div>
            </div>

            {/* Live Preview Card */}
            <div className="p-3 bg-white/95 text-slate-900 rounded-xl border border-amber-400 shadow-md space-y-1">
              <div className="text-[10px] font-bold text-slate-500 mb-1">معاينة حية لرسالة الترحيب كما ستظهر في الغرفة:</div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-red-700">
                <span>[ {generalWelcomeTitle || 'إدارة حسان برو'} ]</span>
                <span className="px-1.5 py-0.2 bg-red-100 text-red-700 border border-red-300 rounded text-[9px]">ترحـيـب عام</span>
              </div>
              <div className="text-xs text-slate-800 leading-relaxed font-medium">
                {generalWelcomeText || 'نص رسالة الترحيب...'}
              </div>
            </div>

            {/* Action Save Button */}
            <div className="pt-2 border-t border-slate-700 flex items-center justify-end">
              <button
                type="button"
                onClick={() => {
                  if (onUpdateGeneralWelcome) {
                    onUpdateGeneralWelcome({
                      enabled: generalWelcomeEnabled,
                      title: generalWelcomeTitle.trim(),
                      message: generalWelcomeText.trim()
                    });
                    showToast('تم حفظ وتثبيت الرسالة الترحيبية العامة للشات بنجاح 💾', 'success');
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-amber-600 hover:from-emerald-500 hover:to-amber-500 text-white font-black text-xs flex items-center gap-1.5 shadow-lg cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>حفظ وتثبيت الرسالة الترحيبية العامة 💾</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB: EMBLEMS & CUSTOM EMOJIS MANAGEMENT (نظام إدارة وعرض الرموز الألقاب المصورة والوجوه التعبيرية) */}
      {activeTab === 'emblems' && (
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 text-xs bg-slate-900/90 text-right">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-purple-950/70 via-slate-900 to-amber-950/70 border border-purple-500/40 rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300">
                  <Palette className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-purple-200">
                    نظام إدارة وعرض الرموز، الألقاب المصورة والوجوه التعبيرية 🎨
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    التحكم الشامل ببنرات الأسوابر (500x50)، أيقونات الهدايا، الستيكرات، والفيسات المخصصة ذات الأكواد التسلسلية (ف1..ف10)
                  </p>
                </div>
              </div>
              <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-full font-bold">
                إجمالي الأصول: {emblemsConfig.items.length}
              </span>
            </div>

            {/* Sub-tabs selector for the 5 sections */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEmblemSubTab('branding')}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 col-span-2 sm:col-span-1 ${
                  emblemSubTab === 'branding'
                    ? 'bg-amber-500/30 border-amber-400 text-amber-200 font-black shadow-lg ring-2 ring-amber-400'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-1 text-xs">
                  <span>🦅</span>
                  <span>هوية الصقر وبنر الشات</span>
                </div>
                <span className="text-[10px] text-amber-400 font-mono">
                  (Falcon Branding)
                </span>
              </button>

              <button
                type="button"
                onClick={() => setEmblemSubTab('banners')}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                  emblemSubTab === 'banners'
                    ? 'bg-amber-600/30 border-amber-400 text-amber-200 font-black shadow-md ring-1 ring-amber-400'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-1 text-xs">
                  <span>🖼️</span>
                  <span>أيقونات السوابر</span>
                </div>
                <span className="text-[10px] text-amber-400 font-mono">
                  (500x50 Banners) [
                  {emblemsConfig.items.filter((i) => i.type === 'banner').length}]
                </span>
              </button>

              <button
                type="button"
                onClick={() => setEmblemSubTab('gifts')}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                  emblemSubTab === 'gifts'
                    ? 'bg-rose-600/30 border-rose-400 text-rose-200 font-black shadow-md ring-1 ring-rose-400'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-1 text-xs">
                  <span>🎖️</span>
                  <span>أيقونات الهدايا</span>
                </div>
                <span className="text-[10px] text-rose-400 font-mono">
                  (Gift Icons) [
                  {emblemsConfig.items.filter((i) => i.type === 'gift').length}]
                </span>
              </button>

              <button
                type="button"
                onClick={() => setEmblemSubTab('stickers')}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                  emblemSubTab === 'stickers'
                    ? 'bg-indigo-600/30 border-indigo-400 text-indigo-200 font-black shadow-md ring-1 ring-indigo-400'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-1 text-xs">
                  <span>🎭</span>
                  <span>الستيكرات</span>
                </div>
                <span className="text-[10px] text-indigo-400 font-mono">
                  (Stickers) [
                  {emblemsConfig.items.filter((i) => i.type === 'sticker').length}]
                </span>
              </button>

              <button
                type="button"
                onClick={() => setEmblemSubTab('emojis')}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                  emblemSubTab === 'emojis'
                    ? 'bg-purple-600/30 border-purple-400 text-purple-200 font-black shadow-md ring-1 ring-purple-400'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-1 text-xs">
                  <span>😊</span>
                  <span>الفيسات المخصصة</span>
                </div>
                <span className="text-[10px] text-purple-400 font-mono">
                  (ف1، ف2...) [
                  {emblemsConfig.items.filter((i) => i.type === 'emoji').length}]
                </span>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 0. أصول وهوية الصقر الرسمية: falcon_chat_banner و falcon_avatar_icon */}
          {/* ========================================================================= */}
          {emblemSubTab === 'branding' && (
            <div className="space-y-4">
              {/* Notice */}
              <div className="p-3 bg-gradient-to-r from-amber-950/50 via-slate-900 to-amber-950/50 border border-amber-500/50 rounded-xl space-y-1.5 shadow-md">
                <div className="font-black text-amber-300 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2">
                    <span className="text-base">🦅</span>
                    <span>إدارة هوية شات حسان برو: بنر الشات وأيقونة الصقر</span>
                  </span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-200 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">
                    أصول عامة للنظام 🌐
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  من هنا يمكنك رفع وتخصيص <strong className="text-amber-300 font-bold">بنر الشات الرئيسي (falcon_chat_banner)</strong> المعروض في هيدر الشات وأعلى الغرف، وكذلك <strong className="text-amber-300 font-bold">أيقونة وشعار الصقر الرسمية (falcon_avatar_icon)</strong> التي تظهر كشعار للهيدر وصورة رمزية رسمية للمنصة.
                </p>
              </div>

              {/* 1. SECTION: falcon_chat_banner Upload & Management */}
              <div className="p-4 bg-slate-950/90 border border-amber-500/40 rounded-2xl space-y-3.5 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 font-bold">
                      🖼️
                    </div>
                    <div>
                      <h5 className="font-bold text-xs text-amber-200">
                        خاصية رفع بنر الشات الرئيسي (falcon_chat_banner)
                      </h5>
                      <span className="text-[10px] text-slate-400">
                        المقاس الموصى به: 1200x570 بكسل (نسبة 2.1:1 تقريباً) - يدعم PNG, JPG, WebP, GIF
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 font-mono">
                    chat_banner
                  </span>
                </div>

                {/* Input & Upload */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-300 block">
                    رابط بنر الشات المباشر أو الرفع من جهازك:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="رابط صورة البنر أو اضغط زر الرفع..."
                      value={falconChatBannerInput}
                      onChange={(e) => setFalconChatBannerInput(e.target.value)}
                      className="flex-1 p-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none focus:border-amber-500 font-mono"
                    />
                    <label className="px-3 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-all shadow-md">
                      <Download className="w-3.5 h-3.5" />
                      <span>{isUploadingBanner ? 'جاري الرفع... ⏳' : 'رفع بنر 📁'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isUploadingBanner}
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setIsUploadingBanner(true);
                            showToast('جاري رفع بنر الشات falcon_chat_banner... ⏳', 'info');
                            uploadMediaWithProgress(file)
                              .then((res) => {
                                if (res?.url) {
                                  setFalconChatBannerInput(res.url);
                                  showToast('تم رفع بنر الشات بنجاح! اضغط حفظ للتطبيق ✅', 'success');
                                }
                              })
                              .catch((err) => {
                                showToast('فشل رفع بنر الشات: ' + (err?.message || 'خطأ'), 'error');
                              })
                              .finally(() => {
                                setIsUploadingBanner(false);
                              });
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                {/* Live Banner Preview (Replicating the real chat header view) */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-amber-300 flex items-center justify-between">
                    <span>معاينة حية لبنر الشات (falcon_chat_banner):</span>
                    <span className="text-[10px] text-slate-400">محاكاة واجهة الجوال للهيدر</span>
                  </div>
                  <div className="relative w-full aspect-[2.1/1] max-w-md mx-auto rounded-xl overflow-hidden border border-amber-500/50 shadow-inner bg-gradient-to-br from-[#241a12] via-[#362517] to-[#120d09] flex flex-col justify-end p-3 text-right">
                    {falconChatBannerInput ? (
                      <img
                        src={falconChatBannerInput}
                        alt="falcon_chat_banner"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-xs">
                        لا يوجد بنر محدد حالياً
                      </div>
                    )}
                    <div className="relative z-10 bg-gradient-to-t from-black/85 via-black/40 to-transparent -mx-3 -mb-3 p-3">
                      <div className="text-amber-300 font-black text-sm drop-shadow-md flex items-center justify-between">
                        <span>شات حسان برو 🦅</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-200 font-mono">
                          2027 Pro
                        </span>
                      </div>
                      <div className="text-white text-[10px] drop-shadow-sm font-semibold truncate mt-0.5">
                        معاينة حية للبنر كما يراه الزوار والأعضاء
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preset Banner Templates */}
                <div className="space-y-1.5 pt-1">
                  <div className="text-[10px] font-bold text-slate-400">
                    أو اختر قالباً فخماً مصمماً لشات حسان برو للتطبيق الفوري:
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const uri = createFalconChatBannerSvg(
                          'شات حسان برو 🦅',
                          'العرش الملكي للأصالة والفخامة 2027',
                          '#451a03',
                          '#1e1b4b',
                          '#f59e0b'
                        );
                        setFalconChatBannerInput(uri);
                      }}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-amber-600/50 text-[10px] text-amber-300 font-bold cursor-pointer text-center"
                    >
                      👑 بنر العرش الملكي
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const uri = createFalconChatBannerSvg(
                          'صقر حسان برو الأصيل 🦅',
                          'ملتقى الأحبة والأصدقاء في الوطن العربي',
                          '#064e3b',
                          '#022c22',
                          '#34d399'
                        );
                        setFalconChatBannerInput(uri);
                      }}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-emerald-600/50 text-[10px] text-emerald-300 font-bold cursor-pointer text-center"
                    >
                      🦅 صقر الجزيرة الأخضر
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const uri = createFalconChatBannerSvg(
                          'ليالي حسان برو الماسية ✨',
                          'أرقى الغرف الصوتية والمحادثات الممتعة',
                          '#0f172a',
                          '#1e1b4b',
                          '#38bdf8'
                        );
                        setFalconChatBannerInput(uri);
                      }}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-cyan-600/50 text-[10px] text-cyan-300 font-bold cursor-pointer text-center"
                    >
                      🌌 الصقر الليلي الماسي
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const uri = createFalconChatBannerSvg(
                          'سفير القلوب والمحبة ❤️',
                          'حيث تجتمع القلوب الطيبة وأجمل الأوقات',
                          '#881337',
                          '#4c0519',
                          '#fb7185'
                        );
                        setFalconChatBannerInput(uri);
                      }}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-rose-600/50 text-[10px] text-rose-300 font-bold cursor-pointer text-center"
                    >
                      🌹 سفير القلوب الياقوتي
                    </button>
                  </div>
                </div>

                {/* Banner Actions */}
                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => {
                      setFalconChatBannerInput(DEFAULT_FALCON_CHAT_BANNER);
                      if (onUpdateFalconAssets) {
                        onUpdateFalconAssets({ falconChatBanner: DEFAULT_FALCON_CHAT_BANNER });
                      }
                      showToast('تمت استعادة بنر الشات الافتراضي بنجاح 🔄', 'info');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    استعادة الافتراضي 🔄
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!falconChatBannerInput.trim()) {
                        showToast('يرجى إدخال رابط البنر أو رفع صورة أولاً', 'error');
                        return;
                      }
                      if (onUpdateFalconAssets) {
                        onUpdateFalconAssets({ falconChatBanner: falconChatBannerInput.trim() });
                      }
                      showToast('تم حفظ وتطبيق بنر الشات falcon_chat_banner بنجاح 🦅🎉', 'success');
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Check className="w-4 h-4" />
                    <span>حفظ وتطبيق بنر الشات الآن 💾</span>
                  </button>
                </div>
              </div>

              {/* 2. SECTION: falcon_avatar_icon Upload & Management */}
              <div className="p-4 bg-slate-950/90 border border-amber-500/40 rounded-2xl space-y-3.5 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 font-bold">
                      🦅
                    </div>
                    <div>
                      <h5 className="font-bold text-xs text-amber-200">
                        خاصية رفع أيقونة وشعار الصقر الرسمية (falcon_avatar_icon)
                      </h5>
                      <span className="text-[10px] text-slate-400">
                        المقاس الموصى به: دائري أو مربع 200x200 (PNG شفاف، SVG، WebP، أو GIF متحرك)
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 font-mono">
                    avatar_icon
                  </span>
                </div>

                {/* Input & Upload */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-300 block">
                    رابط أيقونة وشعار الصقر المباشر أو الرفع من جهازك:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="رابط أيقونة الصقر أو اضغط زر الرفع..."
                      value={falconAvatarIconInput}
                      onChange={(e) => setFalconAvatarIconInput(e.target.value)}
                      className="flex-1 p-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none focus:border-amber-500 font-mono"
                    />
                    <label className="px-3 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-all shadow-md">
                      <Download className="w-3.5 h-3.5" />
                      <span>{isUploadingAvatar ? 'جاري الرفع... ⏳' : 'رفع أيقونة 📁'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isUploadingAvatar}
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setIsUploadingAvatar(true);
                            showToast('جاري رفع أيقونة الصقر falcon_avatar_icon... ⏳', 'info');
                            uploadMediaWithProgress(file)
                              .then((res) => {
                                if (res?.url) {
                                  setFalconAvatarIconInput(res.url);
                                  showToast('تم رفع أيقونة الصقر بنجاح! اضغط حفظ للتطبيق ✅', 'success');
                                }
                              })
                              .catch((err) => {
                                showToast('فشل رفع أيقونة الصقر: ' + (err?.message || 'خطأ'), 'error');
                              })
                              .finally(() => {
                                setIsUploadingAvatar(false);
                              });
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                {/* Live Avatar Preview */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-amber-300 flex items-center justify-between">
                    <span>معاينة حية لشعار وأيقونة الصقر (falcon_avatar_icon):</span>
                    <span className="text-[10px] text-slate-400">تظهر في الهيدر، الملفات، والصورة الافتراضية</span>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-center gap-6">
                    {/* Header Mockup Preview */}
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-12 h-12 rounded-full border-2 border-amber-400 shadow-md p-0.5 bg-black/40 overflow-hidden">
                        <img
                          src={falconAvatarIconInput || DEFAULT_FALCON_AVATAR_ICON}
                          alt="falcon_avatar_icon"
                          className="w-full h-full object-cover rounded-full"
                        />
                      </div>
                      <span className="text-[9px] text-slate-400 font-bold">شعار الهيدر (48px)</span>
                    </div>

                    {/* Profile Large Mockup */}
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-20 h-20 rounded-full border-3 border-amber-500 shadow-xl p-1 bg-black/50 overflow-hidden ring-2 ring-amber-500/30">
                        <img
                          src={falconAvatarIconInput || DEFAULT_FALCON_AVATAR_ICON}
                          alt="falcon_avatar_icon"
                          className="w-full h-full object-cover rounded-full"
                        />
                      </div>
                      <span className="text-[9px] text-amber-300 font-bold">الأيقونة الكبيرة (80px)</span>
                    </div>

                    {/* Chat Bubble Mockup */}
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-8 h-8 rounded-full border border-amber-400/80 shadow-xs p-0.5 bg-black/30 overflow-hidden">
                        <img
                          src={falconAvatarIconInput || DEFAULT_FALCON_AVATAR_ICON}
                          alt="falcon_avatar_icon"
                          className="w-full h-full object-cover rounded-full"
                        />
                      </div>
                      <span className="text-[9px] text-slate-400 font-bold">فقاعة الشات (32px)</span>
                    </div>
                  </div>
                </div>

                {/* Preset Avatar Templates */}
                <div className="space-y-1.5 pt-1">
                  <div className="text-[10px] font-bold text-slate-400">
                    أو اختر قالباً فخماً مصمماً لشعار وأيقونة الصقر:
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const uri = createFalconAvatarSvg('🦅', '#78350f', '#0f172a', '#fbbf24');
                        setFalconAvatarIconInput(uri);
                      }}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-amber-600/50 text-[10px] text-amber-300 font-bold cursor-pointer text-center"
                    >
                      🦅 صقر الذهب الملكي
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const uri = createFalconAvatarSvg('👑', '#854d0e', '#1e1b4b', '#facc15');
                        setFalconAvatarIconInput(uri);
                      }}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-yellow-600/50 text-[10px] text-yellow-300 font-bold cursor-pointer text-center"
                    >
                      👑 تاج الصقر الإمبراطوري
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const uri = createFalconAvatarSvg('💎', '#164e63', '#083344', '#38bdf8');
                        setFalconAvatarIconInput(uri);
                      }}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-cyan-600/50 text-[10px] text-cyan-300 font-bold cursor-pointer text-center"
                    >
                      💎 صقر الألماس السماوي
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const uri = createFalconAvatarSvg('🌙', '#581c87', '#1e1b4b', '#c084fc');
                        setFalconAvatarIconInput(uri);
                      }}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-purple-600/50 text-[10px] text-purple-300 font-bold cursor-pointer text-center"
                    >
                      🌙 صقر الهلال والنور
                    </button>
                  </div>
                </div>

                {/* Avatar Actions */}
                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => {
                      setFalconAvatarIconInput(DEFAULT_FALCON_AVATAR_ICON);
                      if (onUpdateFalconAssets) {
                        onUpdateFalconAssets({ falconAvatarIcon: DEFAULT_FALCON_AVATAR_ICON });
                      }
                      showToast('تمت استعادة أيقونة الصقر الافتراضية بنجاح 🔄', 'info');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    استعادة الافتراضي 🔄
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!falconAvatarIconInput.trim()) {
                        showToast('يرجى إدخال رابط الأيقونة أو رفع صورة أولاً', 'error');
                        return;
                      }
                      if (onUpdateFalconAssets) {
                        onUpdateFalconAssets({ falconAvatarIcon: falconAvatarIconInput.trim() });
                      }
                      showToast('تم حفظ وتطبيق أيقونة الصقر falcon_avatar_icon بنجاح 🦅🎉', 'success');
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Check className="w-4 h-4" />
                    <span>حفظ وتطبيق أيقونة الصقر الآن 💾</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 1. أيقونات السوابر (Name Logos / Banners: 500x50 PNG/GIF) */}
          {/* ========================================================================= */}
          {emblemSubTab === 'banners' && (
            <div className="space-y-4">
              {/* Notice & Standards */}
              <div className="p-3 bg-amber-950/30 border border-amber-500/40 rounded-xl space-y-1">
                <div className="font-bold text-amber-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span>🖼️</span>
                    <span>معايير سوابر وبنرات الأسماء المصورة (500x50)</span>
                  </span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded font-mono font-bold">
                    PNG شفاف / GIF متحرك
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  هذه البطاقات المصورة بمقاس <strong className="text-amber-200 font-mono font-bold">500x50 بكسل</strong> تحل محل الاسم النصي للعضو في قائمة المتواجدين بالكامل، وتظهر في الملف الشخصي لاختيار أحدها وتثبيته.
                </p>
              </div>

              {/* Add New Banner Form */}
              <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
                <div className="font-bold text-amber-300 flex items-center gap-1.5 text-xs">
                  <PlusCircle className="w-4 h-4 text-amber-400" />
                  <span>إضافة وتخزين بنر / سوابر جديد (500x50)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      اسم / عنوان البنر (لتمييزه في القائمة):
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: سوابر المدير العام الذهبي"
                      value={bannerTitleInput}
                      onChange={(e) => setBannerTitleInput(e.target.value)}
                      className="w-full p-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      تقييد العضو أو الرتبة (اختياري):
                    </label>
                    <select
                      value={bannerRoleInput}
                      onChange={(e) => setBannerRoleInput(e.target.value)}
                      className="w-full p-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none focus:border-amber-500"
                    >
                      <option value="all">متاح للجميع</option>
                      <option value="admin">مدير النظام (Admin) فقط</option>
                      <option value="super">مشرف سوبر (Super) فما فوق</option>
                      <option value="member">الأعضاء المسجلين فقط</option>
                    </select>
                  </div>
                </div>

                {/* Banner Image URL or File Upload */}
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    رابط الصورة المباشر أو الرفع من الجهاز (PNG شفاف أو GIF متحرك):
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="https://example.com/banner_500x50.png أو data:image/..."
                      value={bannerUrlInput}
                      onChange={(e) => setBannerUrlInput(e.target.value)}
                      className="flex-1 p-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none focus:border-amber-500 font-mono"
                    />
                    <label className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold text-amber-300 flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors">
                      <Download className="w-3.5 h-3.5" />
                      <span>رفع ملف 📁</span>
                      <input
                        type="file"
                        accept="image/png,image/gif,image/jpeg,image/webp,image/svg+xml"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            showToast('جاري رفع البنر... ⏳', 'info');
                            uploadMediaWithProgress(file)
                              .then((res) => {
                                if (res?.url) {
                                  setBannerUrlInput(res.url);
                                  if (!bannerTitleInput) {
                                    setBannerTitleInput(file.name.replace(/\.[^/.]+$/, ''));
                                  }
                                  showToast('تم تحميل تصميم البنر بنجاح جاهز للحفظ ✅', 'success');
                                }
                              })
                              .catch((err) => {
                                showToast('فشل رفع البنر: ' + (err?.message || 'خطأ'), 'error');
                              });
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                {/* Live Preview of Input Banner */}
                {bannerUrlInput && (
                  <div className="p-2.5 bg-slate-900 rounded-xl border border-amber-500/40 space-y-1">
                    <div className="text-[10px] text-amber-400 font-bold">معاينة البنر الحالية (عرض كامل بمقاس 500x50):</div>
                    <div className="w-full max-w-[500px] h-[50px] mx-auto bg-black/50 border border-slate-800 rounded-lg flex items-center justify-center overflow-hidden">
                      <img
                        src={bannerUrlInput}
                        alt="Preview"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                )}

                {/* Fast Preset SVG Generators for Instant Banners */}
                <div className="pt-1">
                  <div className="text-[10px] font-bold text-slate-400 mb-1.5">
                    أو اختر نموذجاً جاهزاً فخماً لتوليده فوراً بمقاس (500x50):
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const uri = createBannerSvgDataUri('المدير التنفيذي 🦅', '#1c1917', '#451a03', '#f59e0b', '👑');
                        setBannerTitleInput('المدير التنفيذي الملكي');
                        setBannerUrlInput(uri);
                      }}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-amber-600/50 text-[10px] text-amber-300 font-bold cursor-pointer text-center"
                    >
                      👑 المدير التنفيذي الملكي
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const uri = createBannerSvgDataUri('صقر الجزيرة 🦅', '#052e16', '#14532d', '#22c55e', '🦅');
                        setBannerTitleInput('صقر الجزيرة الأخضر');
                        setBannerUrlInput(uri);
                      }}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-emerald-600/50 text-[10px] text-emerald-300 font-bold cursor-pointer text-center"
                    >
                      🦅 صقر الجزيرة الأخضر
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const uri = createBannerSvgDataUri('أمير القلوب ❤️', '#4c0519', '#881337', '#f43f5e', '💎');
                        setBannerTitleInput('أمير القلوب الياقوتي');
                        setBannerUrlInput(uri);
                      }}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-rose-600/50 text-[10px] text-rose-300 font-bold cursor-pointer text-center"
                    >
                      💎 أمير القلوب الياقوتي
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const uri = createBannerSvgDataUri('أسطورة حسان برو ✨', '#3b0764', '#581c87', '#a855f7', '⭐');
                        setBannerTitleInput('أسطورة حسان برو الماسي');
                        setBannerUrlInput(uri);
                      }}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-purple-600/50 text-[10px] text-purple-300 font-bold cursor-pointer text-center"
                    >
                      ⭐ أسطورة حسان برو الماسي
                    </button>
                  </div>
                </div>

                {/* Save Banner Button */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (!bannerUrlInput.trim()) {
                        showToast('يرجى إدخال رابط البنر أو رفع ملف الصورة أولاً', 'error');
                        return;
                      }
                      if (onAddEmblem) {
                        onAddEmblem({
                          type: 'banner',
                          title: bannerTitleInput.trim() || 'سوابر مصور 500x50',
                          imageUrl: bannerUrlInput.trim(),
                          requiredRole: bannerRoleInput
                        });
                        setBannerTitleInput('');
                        setBannerUrlInput('');
                        showToast('تمت إضافة البنر/السوابر إلى النظام بنجاح 🖼️', 'success');
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>حفظ البنر في مكتبة السوابر 💾</span>
                  </button>
                </div>
              </div>

              {/* Banners Gallery */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-amber-300 text-xs">
                    مكتبة السوابر والبنرات الجاهزة للاختيار ({emblemsConfig.items.filter((i) => i.type === 'banner').length}):
                  </div>
                  <input
                    type="text"
                    placeholder="بحث في البنرات..."
                    value={bannerSearchQuery}
                    onChange={(e) => setBannerSearchQuery(e.target.value)}
                    className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white outline-none w-44"
                  />
                </div>

                <div className="space-y-2.5">
                  {emblemsConfig.items
                    .filter((item) => item.type === 'banner')
                    .filter((item) =>
                      bannerSearchQuery
                        ? item.title.toLowerCase().includes(bannerSearchQuery.toLowerCase())
                        : true
                    )
                    .map((banner) => (
                      <div
                        key={banner.id}
                        className="p-3 bg-slate-950/70 border border-slate-800 hover:border-amber-500/60 rounded-xl space-y-2 transition-all shadow-sm"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-amber-200">{banner.title}</span>
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono border border-amber-500/30">
                              500x50
                            </span>
                            {banner.requiredRole && banner.requiredRole !== 'all' && (
                              <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[10px]">
                                {banner.requiredRole}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const target = prompt(`أدخل اسم العضو المراد إسناد بنر [${banner.title}] له:`);
                                if (target && target.trim()) {
                                  if (onAssignMemberBanner) {
                                    onAssignMemberBanner(target.trim(), banner.imageUrl);
                                  }
                                  showToast(`تم إسناد البنر بنجاح للعضو [${target.trim()}] 🎯`, 'success');
                                }
                              }}
                              className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                              title="إسناد هذا البنر لعضو محدد فوراً"
                            >
                              <span>إسناد لعضو 🎯</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(banner.imageUrl);
                                showToast('تم نسخ مسار البنر بنجاح 📋', 'info');
                              }}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                              title="نسخ مسار الصورة"
                            >
                              <Copy className="w-3 h-3" />
                              <span>نسخ الرابط</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (onDeleteEmblem) {
                                  onDeleteEmblem(banner.id);
                                }
                              }}
                              className="px-2 py-1 rounded bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                              title="حذف هذا البنر"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>حذف</span>
                            </button>
                          </div>
                        </div>

                        {/* Visual 500x50 Container Preview */}
                        <div className="w-full max-w-[500px] h-[50px] bg-black/40 rounded-lg border border-slate-800 flex items-center justify-center overflow-hidden p-0.5">
                          <img
                            src={banner.imageUrl}
                            alt={banner.title}
                            className="w-full h-full object-contain"
                            loading="lazy"
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 2. أيقونات الهدايا والأوسمة (Gift Icons) */}
          {/* ========================================================================= */}
          {emblemSubTab === 'gifts' && (
            <div className="space-y-4">
              {/* Notice */}
              <div className="p-3 bg-rose-950/30 border border-rose-500/40 rounded-xl space-y-1">
                <div className="font-bold text-rose-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span>🎖️</span>
                    <span>أيقونات الهدايا والأوسمة الشرفية</span>
                  </span>
                  <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded font-bold">
                    تكريم وتمييز الأعضاء
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  تظهر هذه الأيقونات المصغرة بجانب اسم العضو أو لقبه المصور في <strong className="text-rose-200 font-bold">قائمة المتواجدين</strong> للتكريم والتمييز الإداري.
                </p>
              </div>

              {/* Direct Grant Gift to Member Tool */}
              <div className="p-3.5 bg-gradient-to-r from-rose-950/50 via-slate-900 to-amber-950/50 border border-rose-500/30 rounded-xl space-y-3">
                <div className="font-bold text-rose-300 flex items-center gap-1.5 text-xs">
                  <Award className="w-4 h-4 text-rose-400" />
                  <span>منح وتثبيت وسام / هدية تكريمية لعضو مباشرة</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      اختر العضو المراد تكريمه:
                    </label>
                    <select
                      value={grantTargetMember}
                      onChange={(e) => setGrantTargetMember(e.target.value)}
                      className="w-full p-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none focus:border-rose-500"
                    >
                      <option value="">-- اختر العضو من القائمة --</option>
                      {allRegisteredMembers.map((m) => (
                        <option key={m.username} value={m.username}>
                          {m.username} ({m.role}) {m.flag}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      اختر أيقونة الهدية / الوسام:
                    </label>
                    <select
                      value={grantSelectedGiftUrl}
                      onChange={(e) => setGrantSelectedGiftUrl(e.target.value)}
                      className="w-full p-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none focus:border-rose-500"
                    >
                      <option value="">-- اختر الهدية من المكتبة --</option>
                      {emblemsConfig.items
                        .filter((i) => i.type === 'gift')
                        .map((g) => (
                          <option key={g.id} value={g.imageUrl}>
                            {g.title}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="pt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (!grantTargetMember) {
                        showToast('يرجى اختيار العضو المراد تكريمه', 'error');
                        return;
                      }
                      if (!grantSelectedGiftUrl) {
                        showToast('يرجى اختيار الهدية أو الوسام', 'error');
                        return;
                      }
                      if (onGrantMemberGift) {
                        const giftObj = emblemsConfig.items.find((i) => i.imageUrl === grantSelectedGiftUrl);
                        onGrantMemberGift(grantTargetMember, grantSelectedGiftUrl, giftObj?.title || 'وسام');
                        showToast(`تم منح الوسام التكريمي لـ [${grantTargetMember}] بنجاح 🎖️`, 'success');
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Award className="w-4 h-4" />
                    <span>منح الوسام الآن بجانب اسم العضو 🎖️</span>
                  </button>
                </div>
              </div>

              {/* Add New Gift Form */}
              <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
                <div className="font-bold text-rose-300 flex items-center gap-1.5 text-xs">
                  <PlusCircle className="w-4 h-4 text-rose-400" />
                  <span>رفع وتخزين أيقونة هدية أو وسام جديد</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      اسم / مسمى الوسام:
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: وسام الصقر الذهبي"
                      value={giftTitleInput}
                      onChange={(e) => setGiftTitleInput(e.target.value)}
                      className="w-full p-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      رابط الصورة المباشر أو الرفع من الجهاز:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="رابط الصورة المباشر..."
                        value={giftUrlInput}
                        onChange={(e) => setGiftUrlInput(e.target.value)}
                        className="flex-1 p-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none focus:border-rose-500 font-mono"
                      />
                      <label className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold text-rose-300 flex items-center gap-1.5 cursor-pointer shrink-0">
                        <Download className="w-3.5 h-3.5" />
                        <span>رفع 📁</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              showToast('جاري رفع الهدية/الوسام... ⏳', 'info');
                              uploadMediaWithProgress(file)
                                .then((res) => {
                                  if (res?.url) {
                                    setGiftUrlInput(res.url);
                                    if (!giftTitleInput) {
                                      setGiftTitleInput(file.name.replace(/\.[^/.]+$/, ''));
                                    }
                                    showToast('تم تحميل الهدية بنجاح ✅', 'success');
                                  }
                                })
                                .catch((err) => {
                                  showToast('فشل رفع الهدية: ' + (err?.message || 'خطأ'), 'error');
                                });
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Instant Gift Presets */}
                <div>
                  <div className="text-[10px] font-bold text-slate-400 mb-1.5">
                    أو اختر قالباً فخماً لتوليد أيقونة هدية ووسام فوراً:
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setGiftTitleInput('تاج الملك الفاخر');
                        setGiftUrlInput(createGiftBadgeSvgDataUri('👑', '#f59e0b', '#78350f'));
                      }}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-[10px] text-amber-300 font-bold cursor-pointer"
                    >
                      👑 تاج الملك
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setGiftTitleInput('كأس البطولة الذهبي');
                        setGiftUrlInput(createGiftBadgeSvgDataUri('🏆', '#eab308', '#713f12'));
                      }}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-yellow-500/40 text-[10px] text-yellow-300 font-bold cursor-pointer"
                    >
                      🏆 كأس البطولة
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setGiftTitleInput('وسام الشرف والأصالة');
                        setGiftUrlInput(createGiftBadgeSvgDataUri('🎖️', '#ef4444', '#7f1d1d'));
                      }}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-rose-500/40 text-[10px] text-rose-300 font-bold cursor-pointer"
                    >
                      🎖️ وسام الشرف
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setGiftTitleInput('الماسة التميز الملكية');
                        setGiftUrlInput(createGiftBadgeSvgDataUri('💎', '#06b6d4', '#164e63'));
                      }}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-cyan-500/40 text-[10px] text-cyan-300 font-bold cursor-pointer"
                    >
                      💎 الماسة التميز
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (!giftUrlInput.trim()) {
                        showToast('يرجى إدخال رابط الهدية أو اختيار نموذج', 'error');
                        return;
                      }
                      if (onAddEmblem) {
                        onAddEmblem({
                          type: 'gift',
                          title: giftTitleInput.trim() || 'هدية تكريمية',
                          imageUrl: giftUrlInput.trim()
                        });
                        setGiftTitleInput('');
                        setGiftUrlInput('');
                        showToast('تمت إضافة الهدية إلى مكتبة الأوسمة بنجاح 🎖️', 'success');
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>حفظ في مكتبة الهدايا 💾</span>
                  </button>
                </div>
              </div>

              {/* Gifts Gallery */}
              <div className="space-y-2">
                <div className="font-bold text-rose-300 text-xs">
                  مكتبة أيقونات الهدايا والأوسمة المتاحة ({emblemsConfig.items.filter((i) => i.type === 'gift').length}):
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {emblemsConfig.items
                    .filter((item) => item.type === 'gift')
                    .map((gift) => (
                      <div
                        key={gift.id}
                        className="p-2.5 bg-slate-950/70 border border-slate-800 hover:border-rose-500/50 rounded-xl flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={gift.imageUrl}
                            alt={gift.title}
                            className="w-8 h-8 rounded-lg object-contain bg-black/40 border border-slate-700 p-0.5"
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-slate-100 text-xs truncate">
                              {gift.title}
                            </div>
                            <div className="text-[10px] text-slate-400">وسام شرفي</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setGrantSelectedGiftUrl(gift.imageUrl);
                              showToast(`تم اختيار [${gift.title}] لمنحه لعضو من أعلى الصفحة 🎖️`, 'info');
                            }}
                            className="px-2 py-1 rounded bg-rose-600/30 hover:bg-rose-600 text-rose-200 text-[10px] font-bold cursor-pointer transition-colors"
                            title="اختيار لمنحه لعضو"
                          >
                            منح
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (onDeleteEmblem) onDeleteEmblem(gift.id);
                            }}
                            className="p-1 rounded bg-slate-800 hover:bg-rose-900 text-slate-400 hover:text-rose-200 cursor-pointer"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 3. الستيكرات (Stickers) */}
          {/* ========================================================================= */}
          {emblemSubTab === 'stickers' && (
            <div className="space-y-4">
              {/* Notice */}
              <div className="p-3 bg-indigo-950/30 border border-indigo-500/40 rounded-xl space-y-1">
                <div className="font-bold text-indigo-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span>🎭</span>
                    <span>حزم الملصقات التعبيرية (Stickers) للشات</span>
                  </span>
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded font-bold">
                    إرسال فوري بالمحادثة
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  تظهر هذه الملصقات في شريط ملصقات المحادثة، ويمكن للأعضاء النقر عليها لإرسالها فوراً كصور تعبيرية مبهجة داخل شاشات المحادثة (العامة، الحائط، والخاص).
                </p>
              </div>

              {/* Add New Sticker Form */}
              <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
                <div className="font-bold text-indigo-300 flex items-center gap-1.5 text-xs">
                  <PlusCircle className="w-4 h-4 text-indigo-400" />
                  <span>إضافة وتخزين ملصق شات جديد (Sticker)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      اسم / عبارة الملصق:
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: يا هلا ومسهلا"
                      value={stickerTitleInput}
                      onChange={(e) => setStickerTitleInput(e.target.value)}
                      className="w-full p-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      رابط الملصق أو الرفع من الجهاز:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="رابط الصورة أو GIF..."
                        value={stickerUrlInput}
                        onChange={(e) => setStickerUrlInput(e.target.value)}
                        className="flex-1 p-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none focus:border-indigo-500 font-mono"
                      />
                      <label className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold text-indigo-300 flex items-center gap-1.5 cursor-pointer shrink-0">
                        <Download className="w-3.5 h-3.5" />
                        <span>رفع 📁</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              showToast('جاري رفع الملصق... ⏳', 'info');
                              uploadMediaWithProgress(file)
                                .then((res) => {
                                  if (res?.url) {
                                    setStickerUrlInput(res.url);
                                    if (!stickerTitleInput) {
                                      setStickerTitleInput(file.name.replace(/\.[^/.]+$/, ''));
                                    }
                                    showToast('تم تحميل الملصق بنجاح ✅', 'success');
                                  }
                                })
                                .catch((err) => {
                                  showToast('فشل رفع الملصق: ' + (err?.message || 'خطأ'), 'error');
                                });
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (!stickerUrlInput.trim()) {
                        showToast('يرجى إدخال رابط الملصق أو رفع صورة', 'error');
                        return;
                      }
                      if (onAddEmblem) {
                        onAddEmblem({
                          type: 'sticker',
                          title: stickerTitleInput.trim() || 'ملصق شات',
                          imageUrl: stickerUrlInput.trim()
                        });
                        setStickerTitleInput('');
                        setStickerUrlInput('');
                        showToast('تمت إضافة الملصق بنجاح إلى حزم الشات 🎭', 'success');
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>حفظ الملصق في المكتبة 💾</span>
                  </button>
                </div>
              </div>

              {/* Stickers Gallery */}
              <div className="space-y-2">
                <div className="font-bold text-indigo-300 text-xs">
                  حزم الملصقات المتوفرة للشات ({emblemsConfig.items.filter((i) => i.type === 'sticker').length}):
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {emblemsConfig.items
                    .filter((item) => item.type === 'sticker')
                    .map((sticker) => (
                      <div
                        key={sticker.id}
                        className="p-3 bg-slate-950/70 border border-slate-800 hover:border-indigo-500/50 rounded-xl flex flex-col items-center justify-between gap-2 text-center"
                      >
                        <div className="w-20 h-20 flex items-center justify-center bg-black/30 rounded-lg p-1">
                          <img
                            src={sticker.imageUrl}
                            alt={sticker.title}
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>

                        <div className="font-bold text-slate-200 text-xs truncate max-w-full">
                          {sticker.title}
                        </div>

                        <div className="flex items-center gap-2 w-full pt-1 border-t border-slate-800">
                          <button
                            type="button"
                            onClick={() => {
                              onAdminAction('broadcastMessage', undefined, `[ملصق]: ${sticker.title}`);
                              showToast(`تم إرسال الملصق [${sticker.title}] تجريبياً للشات 🎭`, 'success');
                            }}
                            className="flex-1 py-1 rounded bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 text-[10px] font-bold cursor-pointer transition-colors"
                          >
                            إرسال للشات
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (onDeleteEmblem) onDeleteEmblem(sticker.id);
                            }}
                            className="p-1 rounded bg-slate-800 hover:bg-rose-900 text-slate-400 hover:text-rose-200 cursor-pointer"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 4. الفيسات (Custom Emojis: Auto Codes ف1..ف10 + Emoji Size Settings) */}
          {/* ========================================================================= */}
          {emblemSubTab === 'emojis' && (
            <div className="space-y-4">
              {/* Notice & Rule */}
              <div className="p-3 bg-purple-950/30 border border-purple-500/40 rounded-xl space-y-1">
                <div className="font-bold text-purple-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span>😊</span>
                    <span>نظام الفيسات المخصصة والاستبدال الآلي (Emoji Parser)</span>
                  </span>
                  <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded font-mono font-bold">
                    ترقيم تسلسلي تصاعدي
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  عند رفع أي صورة في هذا القسم، <strong className="text-purple-200 font-bold">يولد النظام تلقائياً رقماً تسلسلياً واختصاراً نصياً لها يبدأ تصاعدياً من "ف1"</strong>. عند كتابة الكود داخل أي رسالة يتم استبداله فوراً بصورة الفيس مع الحفاظ على سلامة النص.
                </p>
              </div>

              {/* Emoji Display Size Setting Control */}
              <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>ضبط الحجم الافتراضي لعرض الفيسات داخل الرسائل:</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    الحجم الحالي: {emblemsConfig.emojiSize === 'small' ? 'صغير (24px)' : emblemsConfig.emojiSize === 'large' ? 'كبير (44px)' : 'افتراضي (32px)'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (onUpdateEmojiSize) onUpdateEmojiSize('small');
                      showToast('تم ضبط حجم الفيسات داخل الرسائل إلى صغير (24px) 📏', 'info');
                    }}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      emblemsConfig.emojiSize === 'small'
                        ? 'bg-amber-600/30 border-amber-400 text-amber-200 font-black shadow-md ring-1 ring-amber-400'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                    }`}
                  >
                    <span className="text-xs font-bold">صغير (Small)</span>
                    <span className="text-[10px] text-slate-400 font-mono">24x24 بكسل</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (onUpdateEmojiSize) onUpdateEmojiSize('default');
                      showToast('تم ضبط حجم الفيسات داخل الرسائل إلى افتراضي (32px) 📏', 'info');
                    }}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      emblemsConfig.emojiSize === 'default'
                        ? 'bg-amber-600/30 border-amber-400 text-amber-200 font-black shadow-md ring-1 ring-amber-400'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                    }`}
                  >
                    <span className="text-xs font-bold">افتراضي (Default)</span>
                    <span className="text-[10px] text-slate-400 font-mono">32x32 بكسل</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (onUpdateEmojiSize) onUpdateEmojiSize('large');
                      showToast('تم ضبط حجم الفيسات داخل الرسائل إلى كبير (44px) 📏', 'info');
                    }}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      emblemsConfig.emojiSize === 'large'
                        ? 'bg-amber-600/30 border-amber-400 text-amber-200 font-black shadow-md ring-1 ring-amber-400'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                    }`}
                  >
                    <span className="text-xs font-bold">كبير (Large)</span>
                    <span className="text-[10px] text-slate-400 font-mono">44x44 بكسل</span>
                  </button>
                </div>
              </div>

              {/* Add New Custom Emoji Form */}
              {(() => {
                // Calculate next automatic sequential shortcut
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
                const nextShortcut = `ف${maxNum + 1}`;

                return (
                  <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-purple-300 flex items-center gap-1.5 text-xs">
                        <PlusCircle className="w-4 h-4 text-purple-400" />
                        <span>إضافة فيس مخصص جديد (Custom Emoji)</span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-200 font-mono text-xs font-black border border-purple-400/40 animate-pulse">
                        الكود التلقائي القادم: {nextShortcut}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[11px] font-bold text-slate-300 block mb-1">
                          اسم / وصف الفيس:
                        </label>
                        <input
                          type="text"
                          placeholder={`مثال: فيس ${nextShortcut} السعيد`}
                          value={emojiTitleInput}
                          onChange={(e) => setEmojiTitleInput(e.target.value)}
                          className="w-full p-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none focus:border-purple-500"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-300 block mb-1">
                          رابط صورة الفيس أو الرفع من الجهاز (PNG / GIF):
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="رابط الصورة أو GIF..."
                            value={emojiUrlInput}
                            onChange={(e) => setEmojiUrlInput(e.target.value)}
                            className="flex-1 p-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none focus:border-purple-500 font-mono"
                          />
                          <label className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold text-purple-300 flex items-center gap-1.5 cursor-pointer shrink-0">
                            <Download className="w-3.5 h-3.5" />
                            <span>رفع 📁</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  showToast('جاري رفع الفيس... ⏳', 'info');
                                  uploadMediaWithProgress(file)
                                    .then((res) => {
                                      if (res?.url) {
                                        setEmojiUrlInput(res.url);
                                        if (!emojiTitleInput) {
                                          setEmojiTitleInput(file.name.replace(/\.[^/.]+$/, ''));
                                        }
                                        showToast('تم تحميل الفيس بنجاح ✅', 'success');
                                      }
                                    })
                                    .catch((err) => {
                                      showToast('فشل رفع الفيس: ' + (err?.message || 'خطأ'), 'error');
                                    });
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Quick Preset SVG Emojis */}
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 mb-1.5">
                        أو اختر قالباً سريعاً لتوليد الفيس القادم بالكود ({nextShortcut}):
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEmojiTitleInput('صقر حسان برو الفاخر');
                            setEmojiUrlInput(createCustomEmojiSvgDataUri('🦅', '#f59e0b', '#78350f'));
                          }}
                          className="p-1 rounded-lg bg-slate-900 hover:bg-slate-850 border border-amber-500/40 text-[10px] text-amber-300 font-bold cursor-pointer"
                        >
                          🦅 صقر برو
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEmojiTitleInput('فيس الابتسامة المشرقة');
                            setEmojiUrlInput(createCustomEmojiSvgDataUri('😄', '#fbbf24', '#b45309'));
                          }}
                          className="p-1 rounded-lg bg-slate-900 hover:bg-slate-850 border border-yellow-500/40 text-[10px] text-yellow-300 font-bold cursor-pointer"
                        >
                          😄 ابتسامة
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEmojiTitleInput('فيس النار والحماس');
                            setEmojiUrlInput(createCustomEmojiSvgDataUri('🔥', '#f97316', '#c2410c'));
                          }}
                          className="p-1 rounded-lg bg-slate-900 hover:bg-slate-850 border border-orange-500/40 text-[10px] text-orange-300 font-bold cursor-pointer"
                        >
                          🔥 حماس
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEmojiTitleInput('فيس الحب والتقدير');
                            setEmojiUrlInput(createCustomEmojiSvgDataUri('❤️', '#ef4444', '#b91c1c'));
                          }}
                          className="p-1 rounded-lg bg-slate-900 hover:bg-slate-850 border border-rose-500/40 text-[10px] text-rose-300 font-bold cursor-pointer"
                        >
                          ❤️ محبة
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEmojiTitleInput('فيس القهوة والمزاج');
                            setEmojiUrlInput(createCustomEmojiSvgDataUri('☕', '#a16207', '#451a03'));
                          }}
                          className="p-1 rounded-lg bg-slate-900 hover:bg-slate-850 border border-amber-700/40 text-[10px] text-amber-400 font-bold cursor-pointer"
                        >
                          ☕ مزاج
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEmojiTitleInput('فيس القمر الساهر');
                            setEmojiUrlInput(createCustomEmojiSvgDataUri('🌙', '#c084fc', '#6b21a8'));
                          }}
                          className="p-1 rounded-lg bg-slate-900 hover:bg-slate-850 border border-purple-500/40 text-[10px] text-purple-300 font-bold cursor-pointer"
                        >
                          🌙 سهرة
                        </button>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          if (!emojiUrlInput.trim()) {
                            showToast('يرجى إدخال رابط الفيس أو رفع صورة أولاً', 'error');
                            return;
                          }
                          if (onAddEmblem) {
                            onAddEmblem({
                              type: 'emoji',
                              title: emojiTitleInput.trim() || `فيس ${nextShortcut}`,
                              imageUrl: emojiUrlInput.trim()
                            });
                            setEmojiTitleInput('');
                            setEmojiUrlInput('');
                            showToast(`تم حفظ الفيس بنجاح بالكود التسلسلي (${nextShortcut}) ⚡`, 'success');
                          }
                        }}
                        className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                      >
                        <PlusCircle className="w-4 h-4" />
                        <span>تأكيد الإضافة بالكود التلقائي ({nextShortcut}) 💾</span>
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Custom Emojis Gallery */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-purple-300 text-xs">
                    مكتبة الفيسات المخصصة ({emblemsConfig.items.filter((i) => i.type === 'emoji').length}):
                  </div>
                  <input
                    type="text"
                    placeholder="بحث بالكود (مثل ف1) أو الاسم..."
                    value={emojiSearchQuery}
                    onChange={(e) => setEmojiSearchQuery(e.target.value)}
                    className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white outline-none w-48 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                  {emblemsConfig.items
                    .filter((item) => item.type === 'emoji')
                    .filter((item) => {
                      if (!emojiSearchQuery) return true;
                      const q = emojiSearchQuery.toLowerCase();
                      return (
                        (item.shortcut && item.shortcut.toLowerCase().includes(q)) ||
                        item.title.toLowerCase().includes(q)
                      );
                    })
                    .sort((a, b) => (a.codeNumber || 0) - (b.codeNumber || 0))
                    .map((emoji) => (
                      <div
                        key={emoji.id}
                        className="p-2.5 bg-slate-950/70 border border-slate-800 hover:border-purple-500/60 rounded-xl flex flex-col items-center justify-between gap-1.5 text-center transition-all group"
                      >
                        {/* Shortcut Code Badge in bold gold font */}
                        <div className="flex items-center justify-between w-full">
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-mono font-black border border-amber-500/40">
                            {emoji.shortcut}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (emoji.shortcut) {
                                navigator.clipboard.writeText(emoji.shortcut);
                                showToast(`تم نسخ الكود [${emoji.shortcut}] للحافظة! الصقه بالمحادثة ⚡`, 'info');
                              }
                            }}
                            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-amber-300 rounded cursor-pointer"
                            title="نسخ الكود"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Image Preview */}
                        <div className="w-12 h-12 flex items-center justify-center p-1 bg-black/30 rounded-lg">
                          <img
                            src={emoji.imageUrl}
                            alt={emoji.shortcut || emoji.title}
                            className="w-10 h-10 object-contain hover:scale-125 transition-transform"
                            loading="lazy"
                          />
                        </div>

                        {/* Title */}
                        <div className="font-bold text-slate-200 text-[11px] truncate max-w-full">
                          {emoji.title}
                        </div>

                        {/* Delete action */}
                        <div className="pt-1 border-t border-slate-850 w-full flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => {
                              if (emoji.shortcut) {
                                onAdminAction('broadcastMessage', undefined, `تجربة الفيس: ${emoji.shortcut}`);
                                showToast(`تمت تجربة الفيس [${emoji.shortcut}] بالشات 💬`, 'success');
                              }
                            }}
                            className="text-[9px] text-purple-300 hover:underline cursor-pointer"
                          >
                            تجربة بالشات
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (onDeleteEmblem) onDeleteEmblem(emoji.id);
                            }}
                            className="text-slate-500 hover:text-rose-400 p-0.5 cursor-pointer"
                            title="حذف هذا الفيس"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: EXPANDED COLOR & STYLE STUDIO */}
      {activeTab === 'colors' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs bg-slate-900/70">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-slate-800/90 to-slate-900 border border-amber-500/40 shadow-lg space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-amber-400" />
                <h3 className="font-black text-sm text-amber-300">استوديو الألوان وتصميم القوالب المخصصة 🎨</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCustomColorsForm({ ...DEFAULT_CUSTOM_THEME_COLORS });
                  setEditingCustomThemeId(undefined);
                  setCustomThemeName('');
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px] font-bold cursor-pointer"
              >
                إعادة الافتراضي ↺
              </button>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              نسّق ألوان الخطوط وخلفيات الخطوط والأزرار والقوائم بحرية، ثم احفظ التنسيق كقالب ليُضاف مباشرة إلى قائمة الاستايل والثيمات.
              <span className="block text-amber-300/90 font-bold mt-0.5">
                ملاحظة: لون اسم العضو ولون خط رسائله يبقيان باللون الأسود الافتراضي (#000000) تلقائياً ما لم يقم العضو بتغييرهما بنفسه.
              </span>
            </p>
          </div>

          {/* قسم استدعاء وتعديل ألوان الثيمات السابقة والمثبتة */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-950/70 via-slate-800/90 to-slate-900 border border-indigo-500/50 shadow-xl space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-amber-400" />
                <h4 className="font-black text-xs sm:text-sm text-white flex items-center gap-1.5">
                  <span>تعديل وتحرير ألوان الثيمات السابقة</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                    متاح بالكامل ✨
                  </span>
                </h4>
              </div>
              {themeEditMode === 'editBuiltIn' && editingCustomThemeId && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold truncate max-w-[150px]">
                    قيد التعديل: {BUILT_IN_THEMES_FOR_EDITING.find((b) => b.id === editingCustomThemeId)?.name || editingCustomThemeId} ✏️
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomColorsForm(getBuiltInThemeColors(editingCustomThemeId));
                      showToast('تمت إعادة تحميل ألوان الثيم الأصلية ↺', 'info');
                    }}
                    className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-[10px] font-bold text-slate-200 cursor-pointer"
                    title="إعادة ضبط ألوان هذا الثيم للأصل"
                  >
                    الأصل ↺
                  </button>
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              اختر أي ثيم من الثيمات السابقة في الشات لتفكيك ألوانه بالكامل واستدعائها إلى لوحة التحكم، مما يتيح لك تعديل ألوان الخطوط، الهيدر، الفوتر، حقول الكتابة، وخلفيات الفقاعات بحرية تامة:
            </p>

            {/* Built-in Theme Selector & Quick Load Button */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-0.5">
              <select
                value={selectedBuiltInThemeToEdit}
                onChange={(e) => setSelectedBuiltInThemeToEdit(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-indigo-500/50 text-xs text-white font-bold outline-none focus:border-amber-400 cursor-pointer shadow-inner"
              >
                {BUILT_IN_THEMES_FOR_EDITING.map((bt) => (
                  <option key={bt.id} value={bt.id} className="bg-slate-900 text-white py-1">
                    {bt.name} ({bt.category === 'calm' ? 'هادئ مريح' : bt.category === 'gold' ? 'ذهبي ملكي' : bt.category === 'nature' ? 'طبيعي' : 'رسمي'})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleLoadBuiltInThemeForEditing(selectedBuiltInThemeToEdit)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs cursor-pointer shadow-md flex items-center justify-center gap-1.5 transition-all shrink-0 active:scale-95"
              >
                <Palette className="w-3.5 h-3.5 text-slate-950" />
                <span>تحميل ألوان هذا الثيم للتعديل 🎨</span>
              </button>
            </div>

            {/* Quick Chips for Top Built-in Themes */}
            <div className="pt-1">
              <div className="text-[10px] text-slate-400 font-bold mb-1.5 flex items-center gap-1">
                <span>ثيمات سريعة بنقرة واحدة لتحميلها وتعديلها:</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {BUILT_IN_THEMES_FOR_EDITING.slice(0, 9).map((th) => {
                  const isCurrent = editingCustomThemeId === th.id;
                  return (
                    <button
                      key={th.id}
                      type="button"
                      onClick={() => handleLoadBuiltInThemeForEditing(th.id)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm ring-1 ring-amber-400'
                          : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700'
                      }`}
                    >
                      <span className="flex items-center gap-0.5">
                        {th.previewColors.slice(0, 3).map((col, ci) => (
                          <span
                            key={ci}
                            className="w-2 h-2 rounded-full inline-block border border-white/20"
                            style={{ backgroundColor: col }}
                          />
                        ))}
                      </span>
                      <span>{th.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Live Mini-Preview */}
          <div
            className="rounded-2xl overflow-hidden border shadow-xl transition-all"
            style={{
              backgroundColor: customColorsForm.appBg,
              borderColor: customColorsForm.headerBorder
            }}
          >
            <div
              className="px-3 py-2 flex items-center justify-between border-b text-xs font-black"
              style={{
                backgroundColor: customColorsForm.headerBg,
                color: customColorsForm.headerText,
                borderColor: customColorsForm.headerBorder
              }}
            >
              <span>معاينة حية للقالب 🦅</span>
              <span
                className="px-2 py-0.5 rounded text-[10px]"
                style={{
                  backgroundColor: customColorsForm.primaryBtnBg,
                  color: customColorsForm.primaryBtnText
                }}
              >
                زر رئيسي
              </span>
            </div>
            <div
              className="px-3 py-1 text-[10px] font-bold border-b"
              style={{
                backgroundColor: customColorsForm.subHeaderBg,
                color: customColorsForm.subHeaderText,
                borderColor: customColorsForm.headerBorder
              }}
            >
              الشريط الفرعي • <span style={{ color: customColorsForm.accentText }}>لون العناوين والشارات</span>
            </div>
            <div
              className="p-3 space-y-2"
              style={{
                backgroundColor: customColorsForm.chatBg,
                color: customColorsForm.appText
              }}
            >
              <div
                className="p-2.5 rounded-xl border shadow-xs"
                style={{
                  backgroundColor: customColorsForm.bubbleBg,
                  borderColor: customColorsForm.bubbleBorder
                }}
              >
                <div className="font-bold text-[11px]" style={{ color: '#000000' }}>
                  اسم العضو (الافتراضي أسود)
                </div>
                <div className="text-xs mt-0.5" style={{ color: '#000000' }}>
                  مرحباً بكم! هذا نص رسالة العضو باللون الأسود الافتراضي فوق خلفية الفقاعة المختارة.
                </div>
              </div>
              <div className="text-[11px] font-semibold" style={{ color: customColorsForm.appText }}>
                نموذج للنص العام في التطبيق
              </div>
            </div>
            <div
              className="p-2 flex items-center gap-2 border-t"
              style={{
                backgroundColor: customColorsForm.inputBarBg,
                borderColor: customColorsForm.headerBorder
              }}
            >
              <div
                className="flex-1 px-2.5 py-1.5 rounded-lg border text-[11px]"
                style={{
                  backgroundColor: customColorsForm.fieldBg,
                  color: customColorsForm.fieldText,
                  borderColor: customColorsForm.fieldBorder
                }}
              >
                حقل كتابة الرسالة...
              </div>
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg font-black text-[11px]"
                style={{
                  backgroundColor: customColorsForm.primaryBtnBg,
                  color: customColorsForm.primaryBtnText
                }}
              >
                إرسال
              </button>
            </div>
          </div>

          {/* Global Font Weight / Boldness Control */}
          <div className="p-3 rounded-2xl bg-slate-800/70 border border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-xs text-amber-300">بروز وسماكة الخطوط في الشات كامل 🖋️</h4>
              <span className="text-[10px] text-slate-400">نحيف / عادي / بارز</span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {[
                { id: 'thin', label: 'نحيف' },
                { id: 'normal', label: 'متوسط' },
                { id: 'default', label: 'افتراضي' },
                { id: 'bold', label: 'بارز' },
                { id: 'black', label: 'بارز جداً' }
              ].map((wt) => (
                <button
                  key={wt.id}
                  type="button"
                  onClick={() => {
                    const val = wt.id as 'thin' | 'normal' | 'default' | 'bold' | 'black';
                    onChangeFontWeight?.(val);
                    showToast(`تم تعميم سماكة الخط: ${wt.label} على الشات كامل 🖋️`, 'success');
                  }}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    chatFontWeight === wt.id
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                      : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  {wt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Color Pickers Grid */}
          {[
            {
              title: '1. ألوان الخطوط والنصوص ✍️',
              items: [
                { key: 'appText', label: 'لون الخط العام' },
                { key: 'headerText', label: 'لون خط الهيدر العلوي' },
                { key: 'subHeaderText', label: 'لون خط الشريط الفرعي' },
                { key: 'bottomBarText', label: 'لون خط الفوتر السفلي' },
                { key: 'accentText', label: 'لون العناوين والشارات' },
                { key: 'fieldText', label: 'لون خط حقول الكتابة' }
              ]
            },
            {
              title: '2. خلفيات الخطوط والفقاعات والشات 🖼️',
              items: [
                { key: 'bubbleBg', label: 'خلفية فقاعات/خطوط الرسائل' },
                { key: 'chatBg', label: 'خلفية ساحة الدردشة' },
                { key: 'appBg', label: 'خلفية التطبيق العامة' },
                { key: 'headerBg', label: 'خلفية الهيدر العلوي' },
                { key: 'subHeaderBg', label: 'خلفية الشريط الفرعي' },
                { key: 'bottomBarBg', label: 'خلفية الفوتر السفلي' },
                { key: 'inputBarBg', label: 'خلفية شريط الإدخال' },
                { key: 'fieldBg', label: 'خلفية حقول الكتابة' },
                { key: 'drawerBg', label: 'خلفية القوائم الجانبية' },
                { key: 'cardBg', label: 'خلفية البطاقات والنوافذ' }
              ]
            },
            {
              title: '3. ألوان الأزرار والحدود 🔘',
              items: [
                { key: 'primaryBtnBg', label: 'خلفية الأزرار الرئيسية' },
                { key: 'primaryBtnText', label: 'لون نص الأزرار الرئيسية' },
                { key: 'headerBorder', label: 'لون حدود الهيدر والأشرطة' },
                { key: 'bubbleBorder', label: 'لون حدود فقاعات الرسائل' },
                { key: 'fieldBorder', label: 'لون حدود حقول الكتابة' },
                { key: 'cardBorder', label: 'لون حدود البطاقات' }
              ]
            }
          ].map((group) => (
            <div key={group.title} className="p-3 rounded-2xl bg-slate-800/70 border border-slate-700 space-y-2.5">
              <h4 className="font-black text-xs text-amber-300">{group.title}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {group.items.map((item) => {
                  const k = item.key as keyof CustomThemeColors;
                  const val = customColorsForm[k];
                  return (
                    <div key={item.key} className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-900/80 border border-slate-700/80">
                      <span className="text-[11px] font-bold text-slate-200 truncate">{item.label}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <input
                          type="text"
                          value={val}
                          onChange={(e) => setCustomColorsForm((prev) => ({ ...prev, [k]: e.target.value }))}
                          className="w-16 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-600 text-[10px] font-mono text-slate-200 text-center outline-none"
                          dir="ltr"
                        />
                        <input
                          type="color"
                          value={val.startsWith('#') && (val.length === 7 || val.length === 4) ? val : '#000000'}
                          onChange={(e) => setCustomColorsForm((prev) => ({ ...prev, [k]: e.target.value }))}
                          className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent p-0"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Save Template Box */}
          <div className="p-3.5 rounded-2xl bg-slate-800/90 border border-emerald-500/40 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="font-black text-xs text-emerald-300 flex items-center gap-1.5">
                <span>
                  {themeEditMode === 'editBuiltIn' && editingCustomThemeId
                    ? `تحديث ألوان الثيم [${customThemeName}] ✏️`
                    : editingCustomThemeId
                    ? 'تحديث القالب المخصص ✏️'
                    : 'حفظ القالب وإضافته إلى قائمة الثيمات 💾'}
                </span>
              </h4>
              {themeEditMode === 'editBuiltIn' && editingCustomThemeId && (
                <span className="text-[10px] text-amber-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/30">
                  تعديل على ثيم سابق ({editingCustomThemeId})
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={customThemeName}
                onChange={(e) => setCustomThemeName(e.target.value)}
                placeholder="اكتب اسم القالب أو اسم الثيم المعدل..."
                className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none focus:border-amber-400 font-bold"
              />

              {/* زر 1: حفظ كتحديث مباشر للثيم الأصلي */}
              {themeEditMode === 'editBuiltIn' && editingCustomThemeId && (
                <button
                  type="button"
                  onClick={() => {
                    if (!customThemeName.trim()) {
                      showToast('يرجى كتابة اسم للقالب قبل الحفظ', 'error');
                      return;
                    }
                    onSaveCustomTheme?.({
                      id: editingCustomThemeId,
                      name: customThemeName.trim(),
                      colors: customColorsForm,
                      applyNow: false
                    });
                    showToast(`تم حفظ وتحديث ألوان ثيم [${customThemeName}] بنجاح! 🎨`, 'success');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer shadow-sm transition-all shrink-0"
                  title="حفظ الألوان الجديدة لنفس هذا الثيم السابق بحيث يعمل بالألوان الجديدة"
                >
                  حفظ كتحديث للثيم الأصلي نفسه 💾
                </button>
              )}

              {/* زر 2: حفظ كقالب جديد منفصل */}
              <button
                type="button"
                onClick={() => {
                  if (!customThemeName.trim()) {
                    showToast('يرجى كتابة اسم للقالب قبل الحفظ', 'error');
                    return;
                  }
                  onSaveCustomTheme?.({
                    id: themeEditMode === 'editBuiltIn' ? `custom-theme-${Date.now()}` : editingCustomThemeId,
                    name: themeEditMode === 'editBuiltIn' && !customThemeName.includes('معدل') ? `${customThemeName.trim()} (نسخة معدلة)` : customThemeName.trim(),
                    colors: customColorsForm,
                    applyNow: false
                  });
                  setEditingCustomThemeId(undefined);
                  setThemeEditMode('create');
                  setCustomThemeName('');
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs cursor-pointer shadow-sm transition-all shrink-0"
              >
                {themeEditMode === 'editBuiltIn' ? 'حفظ كقالب جديد منفصل 📋' : 'حفظ في القائمة فقط'}
              </button>

              {/* زر 3: حفظ وتعميم على الشات فوراً */}
              <button
                type="button"
                onClick={() => {
                  if (!customThemeName.trim()) {
                    showToast('يرجى كتابة اسم للقالب قبل الحفظ', 'error');
                    return;
                  }
                  onSaveCustomTheme?.({
                    id: editingCustomThemeId || `custom-theme-${Date.now()}`,
                    name: customThemeName.trim(),
                    colors: customColorsForm,
                    applyNow: true
                  });
                  setEditingCustomThemeId(undefined);
                  setThemeEditMode('create');
                  setCustomThemeName('');
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs cursor-pointer shadow-md transition-all shrink-0"
              >
                حفظ وتعميم على الشات فوراً 🚀
              </button>
            </div>
          </div>

          {/* Saved Custom Themes List */}
          <div className="p-3.5 rounded-2xl bg-slate-800/70 border border-slate-700 space-y-2.5">
            <h4 className="font-black text-xs text-amber-300">
              القوالب المخصصة والثيمات المعدلة المحفوظة ({customThemes?.length || 0}) ✨
            </h4>
            {(!customThemes || customThemes.length === 0) ? (
              <div className="text-[11px] text-slate-400 py-3 text-center">
                لا توجد قوالب مخصصة محفوظة بعد. قم بتعديل أي ثيم سابق أو إنشاء ألوان جديدة أعلاه واضغط حفظ.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {customThemes.map((ct) => {
                  const isBuiltInOverride = Boolean(THEME_STYLES[ct.id]);
                  return (
                    <div
                      key={ct.id}
                      className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-700 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-black text-xs text-white truncate">{ct.name} 🎨</span>
                          {isBuiltInOverride && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                              ثيم سابق معدل 💎
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          {[ct.colors.headerBg, ct.colors.chatBg, ct.colors.bubbleBg, ct.colors.primaryBtnBg].map((cHex, i) => (
                            <span
                              key={i}
                              className="w-3.5 h-3.5 rounded-full border border-white/20"
                              style={{ backgroundColor: cHex }}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => onApplyGlobalAppearance?.(ct.id, 'Cairo', 'default', 'modern')}
                          className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] cursor-pointer"
                        >
                          تطبيق
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCustomThemeId(ct.id);
                            setCustomThemeName(ct.name);
                            setCustomColorsForm({ ...DEFAULT_CUSTOM_THEME_COLORS, ...ct.colors });
                            setThemeEditMode(isBuiltInOverride ? 'editBuiltIn' : 'editCustom');
                          }}
                          className="px-2 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] cursor-pointer"
                        >
                          تعديل
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteCustomTheme?.(ct.id);
                            if (isBuiltInOverride) {
                              showToast(`تمت استعادة الألوان الأصلية لثيم [${ct.name}] ↺`, 'info');
                            }
                          }}
                          className="px-2 py-1 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white font-bold text-[10px] cursor-pointer"
                          title={isBuiltInOverride ? 'استعادة الألوان الأصلية الافتراضية لهذا الثيم' : 'حذف القالب المخصص'}
                        >
                          {isBuiltInOverride ? 'استعادة الأصل ↺' : 'حذف'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: ACTION DIALOG FOR KICK, BAN, JAIL, RESET NAME, BADGE, ROLE */}
      {selectedUser && userActionType && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedUser(null);
              setUserActionType(null);
            }
          }}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 animate-in fade-in"
        >
          <div className="bg-[#241a12] border border-amber-500/50 rounded-2xl w-full max-w-sm p-4 space-y-3 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#3e2c1c] pb-2">
              <h4 className="font-black text-sm text-amber-300 flex items-center gap-1.5">
                {userActionType === 'kick' && '🚫 تأكيد طرد المستخدم'}
                {userActionType === 'ban' && '⛔ تأكيد الباند والحظر الدائم'}
                {userActionType === 'jail' && '🚔 إيداع العضو في السجن والتأديب'}
                {userActionType === 'resetName' && '✏️ تغيير وتعديل الاسم المخالف'}
                {userActionType === 'badge' && '🎖️ منح وتعديل الوسام الشرفي'}
                {userActionType === 'role' && '👑 ترقية وتعيين رتبة العضو'}
                {userActionType === 'move' && '🚪 نقل العضو لغرفة أخرى'}
              </h4>
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setUserActionType(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-300">
              العضو المستهدف: <strong className="text-white font-black">{selectedUser.username}</strong> ({selectedUser.role})
            </div>

            {/* Kick / Ban / Jail Reason Inputs */}
            {(userActionType === 'kick' || userActionType === 'ban' || userActionType === 'jail') && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300">سبب الإجراء:</label>
                <input
                  type="text"
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  className="w-full p-2 rounded-xl text-xs bg-slate-900 border border-slate-700 text-white outline-none"
                />
                <div className="flex flex-wrap gap-1 pt-1">
                  {['سب وقذف', 'روابط إعلانية', 'مضايقة الأعضاء', 'إساءة استخدام المايك'].map((quickReason) => (
                    <button
                      key={quickReason}
                      onClick={() => setActionReason(quickReason)}
                      className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 hover:bg-slate-700"
                    >
                      {quickReason}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Reset Name Input */}
            {userActionType === 'resetName' && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300">الاسم الجديد البديل:</label>
                <input
                  type="text"
                  value={actionValue}
                  onChange={(e) => setActionValue(e.target.value)}
                  className="w-full p-2 rounded-xl text-xs bg-slate-900 border border-slate-700 text-white outline-none"
                />
              </div>
            )}

            {/* Badge Input */}
            {userActionType === 'badge' && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300">الوسام أو اللقب الشرفي:</label>
                <input
                  type="text"
                  value={actionValue}
                  onChange={(e) => setActionValue(e.target.value)}
                  placeholder="مثال: 👑 صقر ذهبي أو 💎 عضو VIP"
                  className="w-full p-2 rounded-xl text-xs bg-slate-900 border border-slate-700 text-white outline-none"
                />
                <div className="flex flex-wrap gap-1 pt-1">
                  {['👑 صقر ذهبي', '💎 كبار الشخصيات VIP', '⭐ نجم الأسبوع', '🏆 بطل المسابقات', '🛡️ مشرف شرفي'].map((b) => (
                    <button
                      key={b}
                      onClick={() => setActionValue(b)}
                      className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-amber-300 hover:bg-slate-700"
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Role Select */}
            {userActionType === 'role' && (
              <div className="space-y-1.5 bg-black/40 p-2.5 rounded-xl border border-indigo-500/50">
                <label className="text-xs font-bold text-indigo-300">اختر الرتبة الجديدة:</label>
                <select
                  value={actionValue}
                  onChange={(e) => setActionValue(e.target.value)}
                  className="w-full p-2.5 rounded-xl text-xs bg-slate-900 border-2 border-indigo-400 text-white font-black outline-none focus:border-indigo-300 shadow-inner"
                >
                  {[...rolesConfig]
                    .filter((r) => isSupremeHassan || currentUser.role === 'admin' || r.level < getRoleLevel(currentUser.role))
                    .sort((a, b) => b.level - a.level)
                    .map((r) => (
                      <option key={r.id} value={r.id} className="bg-slate-900 text-white font-bold py-1">
                        {r.name} (#{r.level})
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* Move Room Select */}
            {userActionType === 'move' && (
              <div className="space-y-1.5 bg-black/40 p-2.5 rounded-xl border border-amber-500/50">
                <label className="text-xs font-bold text-amber-300">اختر الغرفة المراد النقل إليها:</label>
                <select
                  value={actionValue}
                  onChange={(e) => setActionValue(e.target.value)}
                  className="w-full p-2.5 rounded-xl text-xs bg-slate-900 border-2 border-amber-400 text-amber-200 font-black outline-none focus:border-amber-300 shadow-inner"
                >
                  {roomsList.map((r) => (
                    <option key={r.id} value={r.id} className="bg-slate-900 text-amber-200 font-bold py-1">
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#3e2c1c]">
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setUserActionType(null);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  if (userActionType === 'kick') {
                    onAdminAction('kick', selectedUser.username, undefined, actionReason);
                  } else if (userActionType === 'ban') {
                    onAdminAction('ban', selectedUser.username, actionReason, actionReason);
                  } else if (userActionType === 'jail') {
                    onAdminAction('jailUser', selectedUser.username, actionReason, actionReason);
                  } else if (userActionType === 'resetName') {
                    onAdminAction('resetName', selectedUser.username, actionValue);
                  } else if (userActionType === 'badge') {
                    onAdminAction('assignHonorBadge', selectedUser.username, actionValue);
                  } else if (userActionType === 'role') {
                    onAdminAction('updateRole', selectedUser.username, actionValue);
                  } else if (userActionType === 'move') {
                    onAdminAction('moveRoom', selectedUser.username, actionValue);
                  }
                  setSelectedUser(null);
                  setUserActionType(null);
                }}
                className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer"
              >
                تأكيد وتنفيذ ✅
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADVANCED SECURITY & GEO-RESTRICTIONS MODAL */}
      {showAdvancedSecurityModal && (
        <div
          dir="rtl"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAdvancedSecurityModal(false);
          }}
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm text-right"
        >
          <div className="w-full max-w-2xl bg-[#14110e] rounded-3xl border-2 border-amber-500/80 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-100">
            {/* Modal Header */}
            <div className="p-3.5 sm:p-4 bg-gradient-to-r from-[#241a12] via-[#2d2015] to-[#241a12] border-b border-amber-500/40 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-400">
                  <ShieldAlert className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-amber-200">نافذة إعدادات الأمان المتقدمة (Advanced Security Settings) 🛡️</h4>
                  <p className="text-[10px] text-amber-300/80">ضبط فترات حظر الآي بي التلقائي لمخالفي الفلتر وتقييد وحجب الوصول الجغرافي لدول معينة</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAdvancedSecurityModal(false)}
                className="w-7 h-7 rounded-xl bg-red-600 hover:bg-red-700 text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Navigation Sub-Tabs */}
            <div className="flex items-center p-2 bg-slate-950/80 border-b border-amber-500/20 gap-2">
              <button
                type="button"
                onClick={() => setAdvSecurityTab('auto_ban')}
                className={`flex-1 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  advSecurityTab === 'auto_ban'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>حظر الآي بي التلقائي (Auto IP-Ban)</span>
                {advSecForm.autoIpBanEnabled && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setAdvSecurityTab('geo_restrictions')}
                className={`flex-1 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  advSecurityTab === 'geo_restrictions'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>تقييد وحجب الوصول الجغرافي (Geo-Restrictions)</span>
                {advSecForm.geoRestrictionEnabled && (
                  <span className="text-[10px] bg-indigo-500/30 text-indigo-200 px-1.5 py-0.2 rounded font-bold">
                    {advSecForm.geoRestrictedCountries.length} دولة
                  </span>
                )}
              </button>
            </div>

            {/* Modal Body Content */}
            <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-4 text-xs">
              {/* SUB-TAB 1: AUTO IP BAN */}
              {advSecurityTab === 'auto_ban' && (
                <div className="space-y-3.5">
                  {/* Master Toggle */}
                  <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-700 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white text-xs flex items-center gap-1.5 mb-0.5">
                        <ShieldAlert className="w-4 h-4 text-amber-400" />
                        <span>تفعيل نظام حظر الآي بي التلقائي لمخالفي الفلتر:</span>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        فرض حظر تلقائي فوري على عنوان IP الخاص بالمستخدم عند تكرار كتابة الكلمات المحظورة
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAdvSecForm((prev) => ({ ...prev, autoIpBanEnabled: !prev.autoIpBanEnabled }))}
                      className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
                        advSecForm.autoIpBanEnabled
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                      }`}
                    >
                      {advSecForm.autoIpBanEnabled ? '✔️ مفعل ونشط' : '⛔ معطل'}
                    </button>
                  </div>

                  {/* Settings Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Violation Threshold */}
                    <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-700 space-y-2">
                      <label className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                        <Filter className="w-3.5 h-3.5 text-amber-400" />
                        <span>عدد المخالفات قبل فرض الحظر التلقائي:</span>
                      </label>
                      <p className="text-[10px] text-slate-400">
                        كم مرة يُسمح للعضو بتجاوز الفلتر قبل تطبيق الحظر الفوري:
                      </p>
                      <div className="grid grid-cols-5 gap-1 pt-1">
                        {[2, 3, 5, 7, 10].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setAdvSecForm((prev) => ({ ...prev, autoIpBanThreshold: num }))}
                            className={`py-1.5 rounded-lg font-black text-xs cursor-pointer transition-colors ${
                              advSecForm.autoIpBanThreshold === num
                                ? 'bg-amber-600 text-white ring-2 ring-amber-400'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Rolling Time Window */}
                    <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-700 space-y-2">
                      <label className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>النافذة الزمنية لاحتساب المخالفات:</span>
                      </label>
                      <p className="text-[10px] text-slate-400">
                        تحسب المخالفات إذا وقعت خلال هذه الفترة الزمنية المتتالية:
                      </p>
                      <div className="grid grid-cols-4 gap-1 pt-1">
                        {[
                          { min: 5, label: '5 د' },
                          { min: 10, label: '10 د' },
                          { min: 30, label: '30 د' },
                          { min: 60, label: 'ساعة' }
                        ].map((win) => (
                          <button
                            key={win.min}
                            type="button"
                            onClick={() => setAdvSecForm((prev) => ({ ...prev, autoIpBanWindowMinutes: win.min }))}
                            className={`py-1.5 rounded-lg font-black text-xs cursor-pointer transition-colors ${
                              advSecForm.autoIpBanWindowMinutes === win.min
                                ? 'bg-amber-600 text-white ring-2 ring-amber-400'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            {win.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Ban Duration Selector */}
                  <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-700 space-y-2.5">
                    <label className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>مدة حظر الآي بي (IP Ban Duration):</span>
                    </label>
                    <p className="text-[10px] text-slate-400">
                      اختر فترة الحظر التي ستُفرض على عنوان IP تلقائياً عند تجاوز عدد المخالفات:
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { mins: 15, label: '15 دقيقة', desc: 'حظر مؤقت سريع' },
                        { mins: 60, label: '1 ساعة (60 دقيقة)', desc: 'تأديبي معتدل' },
                        { mins: 360, label: '6 ساعات', desc: 'تأديبي مشدد' },
                        { mins: 1440, label: '24 ساعة (يوم)', desc: 'حظر كامل اليوم' },
                        { mins: 10080, label: '7 أيام (أسبوع)', desc: 'حظر أسبوعي' },
                        { mins: 0, label: 'حظر نهائي دائم 🚫', desc: 'باند دائم لا ينتهي' }
                      ].map((dur) => (
                        <button
                          key={dur.mins}
                          type="button"
                          onClick={() => setAdvSecForm((prev) => ({ ...prev, autoIpBanDurationMinutes: dur.mins }))}
                          className={`p-2.5 rounded-xl border text-right cursor-pointer transition-all ${
                            advSecForm.autoIpBanDurationMinutes === dur.mins
                              ? 'bg-amber-600/30 border-amber-400 text-white shadow-md ring-1 ring-amber-400'
                              : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-600'
                          }`}
                        >
                          <div className="font-black text-xs text-amber-200">{dur.label}</div>
                          <div className="text-[10px] text-slate-400">{dur.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dynamic Simulation Preview Card */}
                  <div className="p-3 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-amber-500/30 space-y-1">
                    <div className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>ملخص آلية الحظر التلقائي الحالية:</span>
                    </div>
                    <p className="text-[11px] text-slate-200 leading-relaxed font-sans">
                      {advSecForm.autoIpBanEnabled ? (
                        <>
                          أي عضو أو زائر (من غير طاقم الإدارة) يقوم بكتابة كلمات محظورة{' '}
                          <span className="text-amber-400 font-bold underline">{advSecForm.autoIpBanThreshold} مرات</span> خلال{' '}
                          <span className="text-amber-400 font-bold underline">{advSecForm.autoIpBanWindowMinutes} دقيقة</span>، سيقوم
                          السيرفر تلقائياً بحظر عنوان IP الخاص به{' '}
                          <span className="text-rose-400 font-bold underline">
                            {advSecForm.autoIpBanDurationMinutes === 0
                              ? 'نهائياً'
                              : `لمدة ${advSecForm.autoIpBanDurationMinutes >= 60 ? advSecForm.autoIpBanDurationMinutes / 60 + ' ساعة' : advSecForm.autoIpBanDurationMinutes + ' دقيقة'}`}
                          </span>
                          ، وقطع اتصاله فورياً، وإشعار طاقم الإدارة بالسجل الأمني.
                        </>
                      ) : (
                        <span className="text-slate-400">
                          نظام الحظر التلقائي معطل حالياً. يتم تسجيل تنبيهات الفلتر في السجل الإداري فقط دون اتخاذ إجراء حظر آلي.
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* SUB-TAB 2: GEO-RESTRICTIONS */}
              {advSecurityTab === 'geo_restrictions' && (
                <div className="space-y-3.5">
                  {/* Master Toggle */}
                  <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-700 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white text-xs flex items-center gap-1.5 mb-0.5">
                        <Globe className="w-4 h-4 text-indigo-400" />
                        <span>تفعيل تقييد وحجب الوصول الجغرافي:</span>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        تقييد الدخول إلى الدردشة بناءً على الدولة الجغرافية للزائر أو العضو (مع إعفاء تلقائي لحسابات الإدارة)
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAdvSecForm((prev) => ({ ...prev, geoRestrictionEnabled: !prev.geoRestrictionEnabled }))}
                      className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
                        advSecForm.geoRestrictionEnabled
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                      }`}
                    >
                      {advSecForm.geoRestrictionEnabled ? '✔️ مفعل ونشط' : '⛔ معطل'}
                    </button>
                  </div>

                  {/* Restriction Mode Selector */}
                  <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-700 space-y-2">
                    <label className="font-bold text-indigo-300 text-xs block">
                      نمط التقييد الجغرافي (Mode):
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setAdvSecForm((prev) => ({ ...prev, geoRestrictionMode: 'blacklist' }))}
                        className={`p-2.5 rounded-xl border text-right cursor-pointer transition-all ${
                          advSecForm.geoRestrictionMode === 'blacklist'
                            ? 'bg-rose-950/70 border-rose-500 text-white shadow-md ring-1 ring-rose-400'
                            : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        <div className="font-black text-xs text-rose-300 flex items-center gap-1.5">
                          <span>🚫 قائمة الحظر (Blacklist)</span>
                          {advSecForm.geoRestrictionMode === 'blacklist' && <span>(مفعل)</span>}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          حظر ومنع دخول الدول المحددة فقط، والسماح لكافة دول العالم الأخرى بالدخول.
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAdvSecForm((prev) => ({ ...prev, geoRestrictionMode: 'whitelist' }))}
                        className={`p-2.5 rounded-xl border text-right cursor-pointer transition-all ${
                          advSecForm.geoRestrictionMode === 'whitelist'
                            ? 'bg-emerald-950/70 border-emerald-500 text-white shadow-md ring-1 ring-emerald-400'
                            : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        <div className="font-black text-xs text-emerald-300 flex items-center gap-1.5">
                          <span>✅ قائمة السماح (Whitelist)</span>
                          {advSecForm.geoRestrictionMode === 'whitelist' && <span>(مفعل)</span>}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          حصر الدخول بالدول المحددة فقط، وحجب ومنع باقي دول العالم بالكامل.
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Fast Action Presets Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/60 p-2.5 rounded-2xl border border-slate-700">
                    <span className="text-[10px] font-bold text-slate-400">تحديدات سريعة:</span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const arabCodes = ALL_COUNTRIES_DATA.filter((c) => c.isArab).map((c) => c.code);
                          setAdvSecForm((prev) => ({
                            ...prev,
                            geoRestrictedCountries: Array.from(new Set([...prev.geoRestrictedCountries, ...arabCodes]))
                          }));
                          showToast('تم تحديد كافة الدول العربية بنجاح 🇸🇦', 'info');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-[10px] font-bold cursor-pointer"
                      >
                        🇸🇦 كافة الدول العربية ({ALL_COUNTRIES_DATA.filter((c) => c.isArab).length})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const gulfCodes = ALL_COUNTRIES_DATA.filter((c) => c.isGulf).map((c) => c.code);
                          setAdvSecForm((prev) => ({
                            ...prev,
                            geoRestrictedCountries: Array.from(new Set([...prev.geoRestrictedCountries, ...gulfCodes]))
                          }));
                          showToast('تم تحديد دول الخليج العربي بنجاح 👑', 'info');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-[10px] font-bold cursor-pointer"
                      >
                        👑 دول الخليج ({ALL_COUNTRIES_DATA.filter((c) => c.isGulf).length})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAdvSecForm((prev) => ({ ...prev, geoRestrictedCountries: [] }));
                          showToast('تم مسح وتفريغ تحديد الدول', 'info');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800/50 text-[10px] font-bold cursor-pointer"
                      >
                        مسح التحديد ✕
                      </button>
                    </div>
                  </div>

                  {/* Country Search Bar */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="بحث عن دولة بالاسم العربي أو الرمز (مثال: السعودية، مصر، اليمن)..."
                      value={countrySearchQuery}
                      onChange={(e) => setCountrySearchQuery(e.target.value)}
                      className="w-full p-2.5 pr-8 rounded-xl text-xs bg-slate-900 border border-slate-700 text-white outline-none focus:border-indigo-400"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute right-2.5 top-3" />
                  </div>

                  {/* Interactive Countries Grid */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-300 font-bold px-1">
                      <span>
                        قائمة الدول (تم تحديد {advSecForm.geoRestrictedCountries.length} دولة):
                      </span>
                      <span className="text-[10px] text-slate-400">انقر على الدولة لتحديدها أو إلغائها</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto p-1 bg-slate-950/60 rounded-2xl border border-slate-800">
                      {ALL_COUNTRIES_DATA.filter(
                        (c) =>
                          c.name.toLowerCase().includes(countrySearchQuery.trim().toLowerCase()) ||
                          c.code.toLowerCase().includes(countrySearchQuery.trim().toLowerCase())
                      ).map((country) => {
                        const isSelected = advSecForm.geoRestrictedCountries.includes(country.code);
                        return (
                          <button
                            key={country.code}
                            type="button"
                            onClick={() => {
                              setAdvSecForm((prev) => {
                                const exists = prev.geoRestrictedCountries.includes(country.code);
                                const next = exists
                                  ? prev.geoRestrictedCountries.filter((c) => c !== country.code)
                                  : [...prev.geoRestrictedCountries, country.code];
                                return { ...prev, geoRestrictedCountries: next };
                              });
                            }}
                            className={`p-2 rounded-xl border flex items-center justify-between gap-1.5 text-right transition-all cursor-pointer ${
                              isSelected
                                ? advSecForm.geoRestrictionMode === 'blacklist'
                                  ? 'bg-rose-950/70 border-rose-500 text-white ring-1 ring-rose-400'
                                  : 'bg-emerald-950/70 border-emerald-500 text-white ring-1 ring-emerald-400'
                                : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-base flex-shrink-0">{country.flag}</span>
                              <div className="min-w-0">
                                <div className="font-bold text-[11px] truncate text-white">{country.name}</div>
                                <div className="text-[9px] text-slate-400 font-mono">{country.code}</div>
                              </div>
                            </div>
                            <div className="flex-shrink-0">
                              {isSelected ? (
                                <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[10px] font-black">
                                  ✓
                                </span>
                              ) : (
                                <span className="w-5 h-5 rounded-full border border-slate-700 flex items-center justify-center text-[9px] text-slate-600">
                                  +
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Blocked Custom Message Input */}
                  <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-700 space-y-1.5">
                    <label className="font-bold text-indigo-300 text-xs block">
                      رسالة الحجب المخصصة (Custom Blocked Message):
                    </label>
                    <p className="text-[10px] text-slate-400">
                      الرسالة التحذيرية التي ستظهر للمستخدم المحجوب جغرافياً عند محاولة فتح الدردشة:
                    </p>
                    <textarea
                      rows={2}
                      value={advSecForm.geoBlockedCustomMessage}
                      onChange={(e) => setAdvSecForm((prev) => ({ ...prev, geoBlockedCustomMessage: e.target.value }))}
                      className="w-full p-2.5 rounded-xl text-xs bg-slate-950 border border-slate-700 text-white outline-none focus:border-indigo-400 resize-none leading-relaxed"
                    />
                  </div>

                  {/* Administrative Immunity Notice */}
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-200 leading-relaxed flex items-center gap-2">
                    <Shield className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span>
                      <strong>حصانة إدارية تلقائية:</strong> حسابات المدراء (Admin) والسوبر (Super) مستثناة تلقائياً من أي حظر جغرافي لضمان قدرة طاقم الإدارة على الدخول في كافة الأوقات ومن أي دولة.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="p-3 sm:p-4 bg-slate-950 border-t border-amber-500/30 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowAdvancedSecurityModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer transition-colors"
              >
                إغلاق
              </button>

              <button
                type="button"
                onClick={() => {
                  onUpdateSecurity(advSecForm);
                  showToast('تم حفظ وتطبيق إعدادات الأمان المتقدمة وحظر الآي بي بنجاح 🛡️⚡', 'success');
                  setShowAdvancedSecurityModal(false);
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-700 hover:to-amber-600 text-white font-black text-xs shadow-lg transition-all cursor-pointer flex items-center gap-2 active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>حفظ وتطبيق إعدادات الأمان المتقدمة فورياً 💾</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

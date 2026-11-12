import type { VoiceNoteData } from '../components/VoiceNoteModule';

export interface RoleDefinition {
  id: string;
  name: string;
  level: number;
  badgeColor?: string;
  isSystem?: boolean;
}

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
  canManageRoles?: boolean;
  canDeleteAccounts?: boolean;
  canDeleteAccount?: boolean;

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

export interface PermissionDefinitionItem {
  key: keyof RolePermissions;
  label: string;
  desc: string;
}

export interface PermissionCategoryGroup {
  id: string;
  title: string;
  iconName: string;
  badge: string;
  permissions: PermissionDefinitionItem[];
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
  presenceState?: 'online' | 'away' | 'offline'; // Green dot (online), Yellow dot (away/background), Gray dot (offline)
  ipAddress?: string;
  honorBadge?: string;
  nameBannerUrl?: string; // رابط البنر / السوابر المصور للعضو بمقاس 500x50
  giftBadges?: string[]; // قائمة أيقونات الهدايا والأوسمة التكريمية بجانب الاسم
  isJailed?: boolean;
  joinedAt?: number;
  sessionToken?: string;
  lastActiveTime?: number;
  nameColor?: string;
  textColor?: string;
  nameGradient?: string;
  profileBg?: string;
  theme?: string;
  fontFamily?: string;
  wallpaper?: string;
  bubbleStyle?: string;
  isPmDisabled?: boolean;
  isGhost?: boolean; // حالة الدخول المخفي / المتخفي
  isIncognito?: boolean; // كشف وضع التصفح المتخفي في المتصفح
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

export interface Message {
  id: string;
  room: string;
  username: string;
  avatarUrl?: string;
  nameBannerUrl?: string;
  giftBadges?: string[];
  isGiftAnnouncement?: boolean;
  giftInfo?: {
    fromUsername: string;
    toUsername: string;
    giftTitle: string;
    giftUrl: string;
    giftMessage?: string;
  };
  flag?: string;
  badge?: string;
  badgeColor?: string;
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'sticker' | 'audio';
  voiceNote?: VoiceNoteData;
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
  isEdited?: boolean;
  isDeleted?: boolean;
  deletedBy?: string;
  deletedByRole?: string;
}

export interface TypingUser {
  userId: string;
  username: string;
  avatarUrl?: string;
  flag?: string;
  role?: string;
  nameColor?: string;
  nameGradient?: string;
  room: string;
  lastTypedAt: number;
}

export interface MicSlot {
  slotNumber: number;
  user: User | null;
}

export interface WallComment {
  id: string;
  username: string;
  avatarUrl?: string;
  nameBannerUrl?: string;
  text: string;
  time: string;
  timestamp?: number;
}

export interface ProfileVisitorRecord {
  username: string;
  avatarUrl?: string;
  nameBannerUrl?: string;
  flag?: string;
  visitCount: number;
  lastVisitTime: number;
}

export interface RoomLiveBroadcastState {
  broadcasterId: string;
  broadcasterUsername: string;
  broadcasterAvatar?: string;
  broadcasterFlag?: string;
  room: string;
  title: string;
  startedAt: number;
  viewersCount: number;
}

export interface YouTubeVideoInfo {
  id: string;
  title: string;
  thumbnail?: string;
  channelTitle?: string;
  duration?: string;
  views?: string;
  uploadedAt?: string;
  url?: string;
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
  category?: 'posts' | 'quick';
  youtubeVideo?: YouTubeVideoInfo;
  time: string;
  likes: number;
  commentsCount: number;
  comments?: WallComment[];
  likedUsers?: string[];
  timestamp?: number;
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
  mediaType?: 'image' | 'video' | 'sticker' | 'audio';
  voiceNote?: VoiceNoteData;
  replyTo?: {
    id: string;
    username: string;
    text: string;
  };
  isCallNotification?: boolean;
  time: string;
  timestamp?: number;
  isEdited?: boolean;
  status?: 'sent' | 'delivered' | 'read';
  readAt?: number;
  selfDestructSeconds?: number;
  selfDestructAt?: number;
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

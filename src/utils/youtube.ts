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

/**
 * Extracts a YouTube Video ID from any text, URL, short, or share link
 */
export function extractYouTubeVideoId(input?: string): string | null {
  if (!input || typeof input !== 'string') return null;

  const trimmed = input.trim();

  // Pattern 1: standard watch URL with v parameter
  const watchMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/watch\?(?:[^&]+&)*v=([a-zA-Z0-9_-]{11})(?:&.*)?/i);
  if (watchMatch && watchMatch[1]) return watchMatch[1];

  // Pattern 2: youtu.be short URL
  const shortMatch = trimmed.match(/(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})(?:\?.*)?/i);
  if (shortMatch && shortMatch[1]) return shortMatch[1];

  // Pattern 3: shorts URL
  const shortsMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})(?:\?.*)?/i);
  if (shortsMatch && shortsMatch[1]) return shortsMatch[1];

  // Pattern 4: embed URL
  const embedMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})(?:\?.*)?/i);
  if (embedMatch && embedMatch[1]) return embedMatch[1];

  // Pattern 5: live URL
  const liveMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/live\/([a-zA-Z0-9_-]{11})(?:\?.*)?/i);
  if (liveMatch && liveMatch[1]) return liveMatch[1];

  return null;
}

/**
 * Clean text by stripping out the raw YouTube URL if it's the only thing in the post,
 * or leaving surrounding commentary text intact.
 */
export function cleanYouTubeUrlFromText(text: string): string {
  if (!text) return '';
  const urlRegex = /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?[^\s]+|shorts\/[^\s]+|embed\/[^\s]+|live\/[^\s]+)|youtu\.be\/[a-zA-Z0-9_-]+)(?:[^\s]*)/gi;
  const cleaned = text.replace(urlRegex, '').trim();
  return cleaned;
}

export function getYouTubeEmbedUrl(videoId: string, autoplay = true): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=${autoplay ? '1' : '0'}&rel=0&modestbranding=1&enablejsapi=1&playsinline=1&controls=1`;
}

export function getYouTubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export function getYouTubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

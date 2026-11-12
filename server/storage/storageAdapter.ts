import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cloudinaryPkg, { type UploadApiResponse } from 'cloudinary';

const cloudinary = cloudinaryPkg.v2 || cloudinaryPkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type StorageProviderType = 'local' | 's3_compatible' | 'cloudinary' | 'supabase' | 'firebase' | 'custom_http';

export interface StorageConfig {
  provider: StorageProviderType;
  endpoint?: string;
  bucket?: string;
  region?: string;
  accessKey?: string;
  secretKey?: string;
  apiKey?: string;
  apiSecret?: string;
  authToken?: string;
  publicUrlPrefix?: string;
  localUploadsDir: string;
}

export interface MediaUploadResult {
  success: boolean;
  url: string;
  mediaType: 'image' | 'video' | 'audio' | 'file';
  size: number;
  filename: string;
  key: string;
  provider: StorageProviderType;
  error?: string;
}

export interface IStorageAdapter {
  providerName: StorageProviderType;
  saveBuffer(buffer: Buffer, originalFilename: string, mimeType?: string, folder?: string): Promise<MediaUploadResult>;
  saveStream(stream: NodeJS.ReadableStream, originalFilename: string, mimeType?: string, folder?: string): Promise<MediaUploadResult>;
  deleteFile(keyOrUrl: string): Promise<boolean>;
  isExternal(): boolean;
}

/**
 * Automatically detects and reads Storage configuration from process.env
 */
export function getStorageConfigFromEnv(): StorageConfig {
  // Prefer Railway or Render persistent volume when configured.
  const configuredUploadsDir = process.env.UPLOADS_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH;
  const rootUploadsDir = configuredUploadsDir
    ? path.resolve(configuredUploadsDir)
    : path.resolve(__dirname, '../../uploads');
  if (!fs.existsSync(rootUploadsDir)) {
    try {
      fs.mkdirSync(rootUploadsDir, { recursive: true });
    } catch {}
  }

  // 1. Automatic Cloudinary Detection (CLOUDINARY_URL, separate keys, or Cloudinary endpoint)
  const hasCloudinaryUrl = !!process.env.CLOUDINARY_URL;
  const hasCloudinaryKeys = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
  const endpointIsCloudinary = !!(process.env.STORAGE_ENDPOINT && process.env.STORAGE_ENDPOINT.toLowerCase().includes('cloudinary'));
  const providerIsCloudinary = (process.env.STORAGE_PROVIDER || '').toLowerCase() === 'cloudinary';

  if (hasCloudinaryUrl || hasCloudinaryKeys || endpointIsCloudinary || providerIsCloudinary) {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.STORAGE_BUCKET || (process.env.STORAGE_ENDPOINT ? process.env.STORAGE_ENDPOINT.split('/').pop() : '');
    return {
      provider: 'cloudinary',
      endpoint: process.env.STORAGE_ENDPOINT || (cloudName ? `https://api.cloudinary.com/v1_1/${cloudName}` : 'cloudinary'),
      bucket: cloudName,
      apiKey: process.env.CLOUDINARY_API_KEY || process.env.STORAGE_API_KEY,
      apiSecret: process.env.CLOUDINARY_API_SECRET || process.env.STORAGE_AUTH_TOKEN,
      authToken: process.env.CLOUDINARY_API_SECRET || process.env.STORAGE_AUTH_TOKEN,
      localUploadsDir: rootUploadsDir
    };
  }

  const endpoint = process.env.STORAGE_ENDPOINT;
  if (endpoint && (endpoint.startsWith('http://') || endpoint.startsWith('https://'))) {
    return {
      provider: (process.env.STORAGE_PROVIDER as StorageProviderType) || 'custom_http',
      endpoint,
      bucket: process.env.STORAGE_BUCKET,
      region: process.env.STORAGE_REGION,
      apiKey: process.env.STORAGE_API_KEY,
      authToken: process.env.STORAGE_AUTH_TOKEN,
      publicUrlPrefix: process.env.STORAGE_PUBLIC_URL_PREFIX,
      localUploadsDir: rootUploadsDir
    };
  }

  if (process.env.NODE_ENV === 'production' && !configuredUploadsDir) {
    console.warn('[Storage Layer] No remote persistent media storage configured. Using local uploads directory.');
  }

  return {
    provider: 'local',
    localUploadsDir: rootUploadsDir
  };
}

/**
 * Standard Local File System Storage Adapter (High performance, streaming & static serving)
 */
export class LocalStorageAdapter implements IStorageAdapter {
  providerName: StorageProviderType = 'local';
  private uploadsDir: string;

  constructor(uploadsDir: string) {
    this.uploadsDir = uploadsDir;
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  isExternal(): boolean {
    return false;
  }

  private detectExtensionAndType(filename: string, mimeType?: string): { extension: string; mediaType: 'image' | 'video' | 'audio' | 'file' } {
    let extension = path.extname(filename).replace('.', '').toLowerCase();
    const mime = (mimeType || '').toLowerCase();

    if (!extension || extension === 'bin') {
      if (mime.includes('mp4')) extension = 'mp4';
      else if (mime.includes('webm')) extension = 'webm';
      else if (mime.includes('ogg')) extension = 'ogg';
      else if (mime.includes('mov') || mime.includes('quicktime')) extension = 'mov';
      else if (mime.includes('jpeg') || mime.includes('jpg')) extension = 'jpg';
      else if (mime.includes('png')) extension = 'png';
      else if (mime.includes('webp')) extension = 'webp';
      else if (mime.includes('gif')) extension = 'gif';
      else if (mime.includes('mp3') || mime.includes('mpeg')) extension = 'mp3';
      else if (mime.includes('wav')) extension = 'wav';
      else if (mime.includes('audio')) extension = 'mp3';
      else if (mime.includes('video')) extension = 'mp4';
      else extension = 'jpg';
    }

    const isVideo = ['mp4', 'webm', 'mov', 'ogg', 'mkv'].includes(extension) || mime.startsWith('video');
    const isAudio = ['mp3', 'wav', 'ogg', 'aac', 'm4a'].includes(extension) || mime.startsWith('audio');
    const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(extension) || mime.startsWith('image');

    const mediaType = isVideo ? 'video' : isAudio ? 'audio' : isImage ? 'image' : 'file';
    return { extension, mediaType };
  }

  async saveBuffer(buffer: Buffer, originalFilename: string, mimeType?: string, folder = ''): Promise<MediaUploadResult> {
    const { extension, mediaType } = this.detectExtensionAndType(originalFilename, mimeType);
    const safeFilename = `soqoor_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${extension}`;
    const targetDir = folder ? path.join(this.uploadsDir, folder) : this.uploadsDir;

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const targetFilePath = path.join(targetDir, safeFilename);
    await fs.promises.writeFile(targetFilePath, buffer);

    const publicUrl = folder ? `/uploads/${folder}/${safeFilename}` : `/uploads/${safeFilename}`;

    return {
      success: true,
      url: publicUrl,
      mediaType,
      size: buffer.length,
      filename: safeFilename,
      key: safeFilename,
      provider: 'local'
    };
  }

  async saveStream(stream: NodeJS.ReadableStream, originalFilename: string, mimeType?: string, folder = ''): Promise<MediaUploadResult> {
    const { extension, mediaType } = this.detectExtensionAndType(originalFilename, mimeType);
    const safeFilename = `soqoor_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${extension}`;
    const targetDir = folder ? path.join(this.uploadsDir, folder) : this.uploadsDir;

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const targetFilePath = path.join(targetDir, safeFilename);
    const writeStream = fs.createWriteStream(targetFilePath);

    return new Promise((resolve, reject) => {
      let bytesReceived = 0;
      stream.on('data', (chunk: Buffer) => {
        bytesReceived += chunk.length;
      });

      stream.pipe(writeStream);

      writeStream.on('finish', () => {
        const publicUrl = folder ? `/uploads/${folder}/${safeFilename}` : `/uploads/${safeFilename}`;
        resolve({
          success: true,
          url: publicUrl,
          mediaType,
          size: bytesReceived,
          filename: safeFilename,
          key: safeFilename,
          provider: 'local'
        });
      });

      writeStream.on('error', (err) => {
        reject(err);
      });
    });
  }

  async deleteFile(keyOrUrl: string): Promise<boolean> {
    try {
      const filename = path.basename(keyOrUrl);
      const filePath = path.join(this.uploadsDir, filename);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }
}

/**
 * Universal External Cloud Storage Adapter
 * Compatible with any external HTTP endpoint, S3/R2 presigned or direct REST API, Supabase Storage, or custom CDN.
 */
export class ExternalCloudStorageAdapter implements IStorageAdapter {
  providerName: StorageProviderType;
  private config: StorageConfig;
  private localFallback: LocalStorageAdapter;

  constructor(config: StorageConfig) {
    this.config = config;
    this.providerName = config.provider;
    this.localFallback = new LocalStorageAdapter(config.localUploadsDir);
  }

  isExternal(): boolean {
    return true;
  }

  async saveBuffer(buffer: Buffer, originalFilename: string, mimeType?: string, folder = ''): Promise<MediaUploadResult> {
    // If endpoint is set, attempt cloud upload via HTTP POST
    if (this.config.endpoint) {
      try {
        const headers: Record<string, string> = {
          'Content-Type': mimeType || 'application/octet-stream',
          'X-Filename': encodeURIComponent(originalFilename)
        };
        if (this.config.authToken) {
          headers['Authorization'] = `Bearer ${this.config.authToken}`;
        }
        if (this.config.apiKey) {
          headers['X-API-Key'] = this.config.apiKey;
        }

        const response = await fetch(this.config.endpoint, {
          method: 'POST',
          headers,
          body: new Uint8Array(buffer)
        });

        if (response.ok) {
          const data = await response.json().catch(() => ({}));
          const remoteUrl = data.url || data.secure_url || data.link || (this.config.publicUrlPrefix ? `${this.config.publicUrlPrefix}/${originalFilename}` : null);
          if (remoteUrl) {
            const isVideo = (mimeType || '').startsWith('video') || ['mp4', 'webm', 'mov'].some((ext) => originalFilename.endsWith(ext));
            const isAudio = (mimeType || '').startsWith('audio') || ['mp3', 'wav', 'ogg'].some((ext) => originalFilename.endsWith(ext));
            return {
              success: true,
              url: remoteUrl,
              mediaType: isVideo ? 'video' : isAudio ? 'audio' : 'image',
              size: buffer.length,
              filename: originalFilename,
              key: data.key || originalFilename,
              provider: this.providerName
            };
          }
        }
      } catch (err) {
        console.error(`[Storage Layer] External upload failed:`, err);
        const { mediaType } = this.localFallback['detectExtensionAndType'](originalFilename, mimeType);
        return {
          success: false,
          url: '',
          mediaType,
          size: buffer.length,
          filename: originalFilename,
          key: '',
          provider: this.providerName,
          error: 'تعذر حفظ الملف في التخزين الخارجي'
        };
      }
    }

    return {
      success: false,
      url: '',
      mediaType: 'file',
      size: buffer.length,
      filename: originalFilename,
      key: '',
      provider: this.providerName,
      error: 'لم يتم إعداد نقطة تخزين خارجية'
    };
  }

  async saveStream(stream: NodeJS.ReadableStream, originalFilename: string, mimeType?: string, folder = ''): Promise<MediaUploadResult> {
    // Collect stream into buffer if external upload is enabled
    if (this.config.endpoint) {
      try {
        const chunks: Buffer[] = [];
        for await (const chunk of stream) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        const fullBuffer = Buffer.concat(chunks);
        return this.saveBuffer(fullBuffer, originalFilename, mimeType, folder);
      } catch (err) {
        console.error(`[Storage Layer] Stream upload failed:`, err);
        return {
          success: false,
          url: '',
          mediaType: 'file',
          size: 0,
          filename: originalFilename,
          key: '',
          provider: this.providerName,
          error: 'تعذر حفظ الملف في التخزين الخارجي'
        };
      }
    }

    return {
      success: false,
      url: '',
      mediaType: 'file',
      size: 0,
      filename: originalFilename,
      key: '',
      provider: this.providerName,
      error: 'لم يتم إعداد نقطة تخزين خارجية'
    };
  }

  async deleteFile(keyOrUrl: string): Promise<boolean> {
    return this.localFallback.deleteFile(keyOrUrl);
  }
}

/**
 * Official Cloudinary Storage Adapter
 * Uploads media assets (Images, Voice notes, Videos) directly to Cloudinary CDN
 * with secure HTTPS URLs and resilient local fallback.
 */
export class CloudinaryStorageAdapter implements IStorageAdapter {
  providerName: StorageProviderType = 'cloudinary';
  private localFallback: LocalStorageAdapter;
  private isConfigured: boolean = false;
  private cloudName: string = '';

  constructor(config: StorageConfig) {
    this.localFallback = new LocalStorageAdapter(config.localUploadsDir);
    this.initCloudinary(config);
  }

  private initCloudinary(config: StorageConfig) {
    try {
      if (process.env.CLOUDINARY_URL) {
        cloudinary.config();
        this.isConfigured = true;
        const match = process.env.CLOUDINARY_URL.match(/@([a-zA-Z0-9_-]+)/);
        this.cloudName = match ? match[1] : (process.env.CLOUDINARY_CLOUD_NAME || config.bucket || '');
      } else {
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME || config.bucket || (config.endpoint ? config.endpoint.split('/').pop() : '');
        const apiKey = process.env.CLOUDINARY_API_KEY || config.apiKey;
        const apiSecret = process.env.CLOUDINARY_API_SECRET || config.apiSecret || config.authToken;

        if (cloudName && apiKey && apiSecret) {
          cloudinary.config({
            cloud_name: cloudName,
            api_key: apiKey,
            api_secret: apiSecret,
            secure: true
          });
          this.isConfigured = true;
          this.cloudName = cloudName;
        }
      }

      if (this.isConfigured) {
        console.log(`[Storage Layer] Initialized official Cloudinary adapter (Cloud: ${this.cloudName || 'configured'})`);
      } else {
        console.warn('[Storage Layer] Cloudinary credentials incomplete, falling back to local replica.');
      }
    } catch (err) {
      console.error('[Storage Layer] Error initializing Cloudinary:', err);
    }
  }

  isExternal(): boolean {
    return true;
  }

  private detectMediaType(filename: string, mimeType?: string): 'image' | 'video' | 'audio' | 'file' {
    const ext = path.extname(filename).replace('.', '').toLowerCase();
    const mime = (mimeType || '').toLowerCase();

    if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext)) {
      return 'image';
    }
    if (mime.startsWith('video/') || ['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) {
      return 'video';
    }
    if (mime.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(ext)) {
      return 'audio';
    }
    return 'file';
  }

  async saveBuffer(buffer: Buffer, originalFilename: string, mimeType?: string, folder = 'hassanpro_chat'): Promise<MediaUploadResult> {
    if (!this.isConfigured) {
      return this.localFallback.saveBuffer(buffer, originalFilename, mimeType, folder);
    }

    const mediaType = this.detectMediaType(originalFilename, mimeType);
    const resourceType: 'image' | 'video' | 'raw' | 'auto' = mediaType === 'video' || mediaType === 'audio' ? 'video' : mediaType === 'image' ? 'image' : 'auto';
    const safeBaseName = path.parse(originalFilename).name.replace(/[^a-zA-Z0-9_\u0600-\u06FF-]/g, '_') || 'upload';
    const publicId = `${Date.now()}_${safeBaseName}`;

    try {
      const result = await new Promise<UploadApiResponse>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder,
            public_id: publicId,
            resource_type: resourceType,
            overwrite: true
          },
          (error, res) => {
            if (error || !res) {
              reject(error || new Error('Upload to Cloudinary returned empty response'));
            } else {
              resolve(res);
            }
          }
        );
        uploadStream.end(buffer);
      });

      return {
        success: true,
        url: result.secure_url || result.url,
        mediaType,
        size: result.bytes || buffer.length,
        filename: originalFilename,
        key: result.public_id,
        provider: 'cloudinary'
      };
    } catch (err: any) {
      console.error('[Storage Layer] Cloudinary buffer upload failed, attempting local replica fallback:', err?.message || err);
      return this.localFallback.saveBuffer(buffer, originalFilename, mimeType, folder);
    }
  }

  async saveStream(stream: NodeJS.ReadableStream, originalFilename: string, mimeType?: string, folder = 'hassanpro_chat'): Promise<MediaUploadResult> {
    if (!this.isConfigured) {
      return this.localFallback.saveStream(stream, originalFilename, mimeType, folder);
    }

    const mediaType = this.detectMediaType(originalFilename, mimeType);
    const resourceType: 'image' | 'video' | 'raw' | 'auto' = mediaType === 'video' || mediaType === 'audio' ? 'video' : mediaType === 'image' ? 'image' : 'auto';
    const safeBaseName = path.parse(originalFilename).name.replace(/[^a-zA-Z0-9_\u0600-\u06FF-]/g, '_') || 'upload';
    const publicId = `${Date.now()}_${safeBaseName}`;

    try {
      const result = await new Promise<UploadApiResponse>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder,
            public_id: publicId,
            resource_type: resourceType,
            overwrite: true
          },
          (error, res) => {
            if (error || !res) {
              reject(error || new Error('Stream upload to Cloudinary returned empty response'));
            } else {
              resolve(res);
            }
          }
        );
        stream.pipe(uploadStream);
      });

      return {
        success: true,
        url: result.secure_url || result.url,
        mediaType,
        size: result.bytes || 0,
        filename: originalFilename,
        key: result.public_id,
        provider: 'cloudinary'
      };
    } catch (err: any) {
      console.error('[Storage Layer] Cloudinary stream upload failed:', err?.message || err);
      return {
        success: false,
        url: '',
        mediaType,
        size: 0,
        filename: originalFilename,
        key: '',
        provider: 'cloudinary',
        error: `تعذر رفع الملف إلى Cloudinary: ${err?.message || 'خطأ غير معروف'}`
      };
    }
  }

  async deleteFile(keyOrUrl: string): Promise<boolean> {
    try {
      let publicId = keyOrUrl;
      if (keyOrUrl.includes('cloudinary.com')) {
        const parts = keyOrUrl.split('/');
        const fileWithExt = parts.slice(-2).join('/');
        publicId = fileWithExt.replace(/\.[^/.]+$/, '');
      }
      await cloudinary.uploader.destroy(publicId);
      return true;
    } catch (err) {
      console.warn('[Storage Layer] Cloudinary delete warning:', err);
      return false;
    }
  }
}

/**
 * Singleton Storage Manager providing unified, provider-agnostic media uploads
 */
export class StorageManager {
  private static instance: StorageManager;
  private adapter: IStorageAdapter;
  private config: StorageConfig;

  private constructor() {
    this.config = getStorageConfigFromEnv();
    if (this.config.provider === 'cloudinary') {
      this.adapter = new CloudinaryStorageAdapter(this.config);
      console.log(`[Storage Layer] Initialized official Cloudinary adapter (Bucket/Cloud: ${this.config.bucket || 'default'})`);
    } else if (this.config.provider !== 'local' && (this.config.endpoint || this.config.bucket)) {
      this.adapter = new ExternalCloudStorageAdapter(this.config);
      console.log(`[Storage Layer] Initialized external cloud storage adapter (${this.config.provider}) with endpoint: ${this.config.endpoint || 'configured bucket'}`);
    } else {
      this.adapter = new LocalStorageAdapter(this.config.localUploadsDir);
      console.log(`[Storage Layer] Initialized local storage adapter (Uploads directory: ${this.config.localUploadsDir})`);
    }
  }

  public static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  public getAdapter(): IStorageAdapter {
    return this.adapter;
  }

  public getConfig(): StorageConfig {
    return this.config;
  }

  public isExternal(): boolean {
    return this.adapter.isExternal();
  }

  public getProviderName(): StorageProviderType {
    return this.adapter.providerName;
  }

  public async saveBuffer(buffer: Buffer, originalFilename: string, mimeType?: string, folder?: string): Promise<MediaUploadResult> {
    return this.adapter.saveBuffer(buffer, originalFilename, mimeType, folder);
  }

  public async saveStream(stream: NodeJS.ReadableStream, originalFilename: string, mimeType?: string, folder?: string): Promise<MediaUploadResult> {
    return this.adapter.saveStream(stream, originalFilename, mimeType, folder);
  }

  public async deleteFile(keyOrUrl: string): Promise<boolean> {
    return this.adapter.deleteFile(keyOrUrl);
  }
}

export const storageManager = StorageManager.getInstance();

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient, Db } from 'mongodb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type DatabaseDriverType = 'local_json' | 'cloud_rest' | 'memory' | 'database_url' | 'mongodb';

export interface DatabaseConfig {
  driverType: DatabaseDriverType;
  databaseUrl?: string;
  apiKey?: string;
  authToken?: string;
  syncIntervalMs?: number;
  localFallbackDir: string;
}

export interface IDataDriver {
  name: DatabaseDriverType;
  isCloudConnected(): boolean;
  isReady(): boolean;
  whenReady(timeoutMs?: number): Promise<boolean>;
  onHydrated(cb: () => void): void;
  flush(): Promise<void>;
  loadSync<T>(collection: string, defaultValue: T): T;
  load<T>(collection: string, defaultValue: T): Promise<T>;
  save<T>(collection: string, data: T): Promise<void>;
  delete(collection: string): Promise<void>;
}

/**
 * Detect database configuration from environment:
 * 1. MONGODB_URI or MONGO_URL (Native MongoDB driver - Railway / Atlas)
 * 2. CLOUD_REST_URL or DATABASE_URL (REST Cloud sync)
 * 3. local_json (Local resilient file-based storage)
 */
export function getDatabaseConfigFromEnv(): DatabaseConfig {
  const rootDir = path.resolve(__dirname, '../../');
  const mongoUri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URL ||
    process.env.MONGODB_URL ||
    process.env.MONGO_URI ||
    (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('mongodb') ? process.env.DATABASE_URL : undefined);

  if (mongoUri) {
    return {
      driverType: 'mongodb',
      databaseUrl: mongoUri,
      localFallbackDir: rootDir
    };
  }
  const cloudUrl = process.env.CLOUD_REST_URL;
  if (cloudUrl && (cloudUrl.startsWith('http://') || cloudUrl.startsWith('https://'))) {
    return {
      driverType: 'cloud_rest',
      databaseUrl: cloudUrl,
      apiKey: process.env.DATABASE_API_KEY,
      authToken: process.env.DATABASE_AUTH_TOKEN,
      localFallbackDir: rootDir
    };
  }
  if (process.env.NODE_ENV === 'production') {
    console.warn('[Data Layer] No remote persistent database configured. Falling back to local resilient storage.');
  }

  return {
    driverType: 'local_json',
    localFallbackDir: rootDir
  };
}

/**
 * Local JSON file-based driver (Ultra-reliable default fallback for local dev)
 */
export class LocalJsonDataDriver implements IDataDriver {
  name: DatabaseDriverType = 'local_json';
  private baseDir: string;
  private writeTimers = new Map<string, NodeJS.Timeout>();
  private pendingData = new Map<string, any>();

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  isCloudConnected(): boolean {
    return false;
  }

  isReady(): boolean {
    return true;
  }

  async whenReady(_timeoutMs?: number): Promise<boolean> {
    return true;
  }

  onHydrated(cb: () => void): void {
    try {
      cb();
    } catch (e) {
      console.error('[Data Layer] LocalJson onHydrated error:', e);
    }
  }

  async flush(): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const [collection, timer] of this.writeTimers.entries()) {
      clearTimeout(timer);
      this.writeTimers.delete(collection);
      if (this.pendingData.has(collection)) {
        const data = this.pendingData.get(collection);
        this.pendingData.delete(collection);
        const filePath = this.getFilePath(collection);
        promises.push(
          fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8').catch((err) => {
            console.error(`[Data Layer] Error flushing local file for "${collection}":`, err);
          })
        );
      }
    }
    await Promise.all(promises);
  }

  private getFilePath(collection: string): string {
    const safeName = collection.endsWith('.json') ? collection : `${collection}.json`;
    return path.join(this.baseDir, safeName);
  }

  loadSync<T>(collection: string, defaultValue: T): T {
    try {
      const filePath = this.getFilePath(collection);
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(raw) as T;
      }
    } catch (err) {
      console.warn(`[Data Layer] Error synchronously reading local file for "${collection}", returning default:`, err);
    }
    return defaultValue;
  }

  async load<T>(collection: string, defaultValue: T): Promise<T> {
    try {
      const filePath = this.getFilePath(collection);
      if (fs.existsSync(filePath)) {
        const raw = await fs.promises.readFile(filePath, 'utf8');
        return JSON.parse(raw) as T;
      }
    } catch (err) {
      console.warn(`[Data Layer] Error reading local file for "${collection}", returning default:`, err);
    }
    return defaultValue;
  }

  async save<T>(collection: string, data: T): Promise<void> {
    const filePath = this.getFilePath(collection);
    this.pendingData.set(collection, data);
    // Debounce rapid continuous writes
    return new Promise((resolve) => {
      const existingTimer = this.writeTimers.get(collection);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const timer = setTimeout(async () => {
        this.writeTimers.delete(collection);
        this.pendingData.delete(collection);
        try {
          const serialized = JSON.stringify(data, null, 2);
          await fs.promises.writeFile(filePath, serialized, 'utf8');
        } catch (err) {
          console.error(`[Data Layer] Error writing local file for "${collection}":`, err);
        }
        resolve();
      }, 500);

      this.writeTimers.set(collection, timer);
    });
  }

  async delete(collection: string): Promise<void> {
    this.pendingData.delete(collection);
    try {
      const filePath = this.getFilePath(collection);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch (err) {
      console.error(`[Data Layer] Error deleting local file for "${collection}":`, err);
    }
  }
}

/**
 * Cloud Remote REST / Database URL Driver
 * Syncs seamlessly with any external cloud database via standard REST/JSON API,
 * while maintaining a local fallback cache for instant speed and offline resiliency.
 */
export class CloudRemoteDataDriver implements IDataDriver {
  name: DatabaseDriverType;
  private config: DatabaseConfig;
  private localFallback: LocalJsonDataDriver;
  private cloudHealthy: boolean = false;

  constructor(config: DatabaseConfig) {
    this.config = config;
    this.name = config.driverType;
    this.localFallback = new LocalJsonDataDriver(config.localFallbackDir);
  }

  isCloudConnected(): boolean {
    return this.cloudHealthy;
  }

  isReady(): boolean {
    return true;
  }

  async whenReady(_timeoutMs?: number): Promise<boolean> {
    return true;
  }

  onHydrated(cb: () => void): void {
    try {
      cb();
    } catch {}
  }

  async flush(): Promise<void> {
    await this.localFallback.flush();
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    if (this.config.authToken) {
      headers['Authorization'] = `Bearer ${this.config.authToken}`;
    }
    if (this.config.apiKey) {
      headers['x-api-key'] = this.config.apiKey;
    }
    return headers;
  }

  loadSync<T>(collection: string, defaultValue: T): T {
    return this.localFallback.loadSync(collection, defaultValue);
  }

  async load<T>(collection: string, defaultValue: T): Promise<T> {
    if (this.config.databaseUrl && (this.config.databaseUrl.startsWith('http://') || this.config.databaseUrl.startsWith('https://'))) {
      try {
        const url = `${this.config.databaseUrl.replace(/\/$/, '')}/${collection}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const response = await fetch(url, {
          method: 'GET',
          headers: this.getHeaders(),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const remoteData = (await response.json()) as T;
          this.cloudHealthy = true;
          // Synchronize local fallback cache silently
          this.localFallback.save(collection, remoteData).catch(() => {});
          return remoteData;
        }
      } catch (err) {
        console.warn(`[Data Layer] Cloud load failed for "${collection}", falling back to local replica:`, err);
        this.cloudHealthy = false;
      }
    }

    // Fallback to local storage replica
    return this.localFallback.load(collection, defaultValue);
  }

  async save<T>(collection: string, data: T): Promise<void> {
    // 1. Immediately persist to local replica for instant durability
    await this.localFallback.save(collection, data);

    // 2. Asynchronously sync to external cloud database
    if (this.config.databaseUrl && (this.config.databaseUrl.startsWith('http://') || this.config.databaseUrl.startsWith('https://'))) {
      try {
        const url = `${this.config.databaseUrl.replace(/\/$/, '')}/${collection}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(url, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(data),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          this.cloudHealthy = true;
        } else {
          console.warn(`[Data Layer] Cloud save for "${collection}" returned status: ${response.status}`);
        }
      } catch (err) {
        this.cloudHealthy = false;
        console.warn(`[Data Layer] Cloud save to external DB failed for "${collection}", queued locally:`, err);
      }
    }
  }

  async delete(collection: string): Promise<void> {
    await this.localFallback.delete(collection);
    if (this.config.databaseUrl && (this.config.databaseUrl.startsWith('http://') || this.config.databaseUrl.startsWith('https://'))) {
      try {
        const url = `${this.config.databaseUrl.replace(/\/$/, '')}/${collection}`;
        await fetch(url, {
          method: 'DELETE',
          headers: this.getHeaders()
        });
      } catch {}
    }
  }
}

/**
 * Native MongoDB Driver
 * Connects directly to MongoDB (MongoDB Atlas, Railway MongoDB, or local MongoDB instance).
 * Uses robust connection pooling, automatic failover, and local cache sync for maximum reliability.
 */
export class MongoDbDataDriver implements IDataDriver {
  name: DatabaseDriverType = 'mongodb';
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private uri: string;
  private dbName: string;
  private localFallback: LocalJsonDataDriver;
  private isConnected: boolean = false;
  private isHydrated: boolean = false;
  private memoryCache = new Map<string, any>();
  private pendingSaves = new Map<string, NodeJS.Timeout>();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private readyPromise: Promise<boolean>;
  private readyResolve: ((val: boolean) => void) | null = null;
  private hydrationListeners: Array<() => void> = [];

  constructor(uri: string, localDir: string, defaultDbName = 'hassanpro_chat') {
    this.uri = uri;
    this.dbName = process.env.MONGODB_DB_NAME || defaultDbName;
    this.localFallback = new LocalJsonDataDriver(localDir);
    this.readyPromise = new Promise<boolean>((resolve) => {
      this.readyResolve = resolve;
    });
    this.initConnection();
  }

  isCloudConnected(): boolean {
    return this.isConnected;
  }

  isReady(): boolean {
    return this.isHydrated;
  }

  async whenReady(timeoutMs = 6000): Promise<boolean> {
    if (this.isHydrated) return true;
    return Promise.race([
      this.readyPromise,
      new Promise<boolean>((resolve) => setTimeout(() => resolve(this.isHydrated), timeoutMs))
    ]);
  }

  onHydrated(cb: () => void): void {
    if (this.isHydrated) {
      try {
        cb();
      } catch (e) {
        console.error('[Data Layer - MongoDB] Error in immediate onHydrated callback:', e);
      }
    }
    this.hydrationListeners.push(cb);
  }

  async flush(): Promise<void> {
    const promises: Promise<any>[] = [];
    for (const [collection, timer] of this.pendingSaves.entries()) {
      clearTimeout(timer);
      this.pendingSaves.delete(collection);
      if (this.isConnected && this.db && this.memoryCache.has(collection)) {
        const data = this.memoryCache.get(collection);
        const col = this.db.collection('app_collections');
        promises.push(
          col.updateOne(
            { _id: collection as any },
            { $set: { data, updatedAt: new Date() } },
            { upsert: true }
          ).catch((err) => console.error(`[Data Layer - MongoDB] Error flushing "${collection}":`, err))
        );
      }
    }
    await Promise.all(promises);
    if (!this.isConnected) {
      await this.localFallback.flush();
    }
  }

  private async initConnection() {
    try {
      this.client = new MongoClient(this.uri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 8000
      });
      await this.client.connect();
      this.db = this.client.db(this.dbName);
      this.isConnected = true;
      const maskedUri = this.uri.replace(/:[^:]*@/, ':***@');
      console.log(`[Data Layer - MongoDB] ✅ Successfully connected to MongoDB: ${maskedUri} (Database: "${this.dbName}")`);

      // Warm up and hydrate in-memory cache from MongoDB
      await this.warmupCache();
    } catch (err: any) {
      this.isConnected = false;
      console.warn(`[Data Layer - MongoDB] ⚠️ MongoDB connection delayed or failed: ${err.message || err}. Falling back to resilient local cache.`);
      if (this.readyResolve) {
        this.readyResolve(false);
        this.readyResolve = null;
      }
      if (!this.reconnectTimer) {
        this.reconnectTimer = setTimeout(() => {
          this.reconnectTimer = null;
          this.initConnection();
        }, 15000);
      }
    }
  }

  private async warmupCache() {
    if (!this.db) return;
    try {
      const col = this.db.collection('app_collections');
      const docs = await col.find({}).toArray();
      let count = 0;
      for (const doc of docs) {
        if (doc && doc._id && doc.data !== undefined) {
          const key = String(doc._id);
          this.memoryCache.set(key, doc.data);
          count++;
        }
      }
      this.isHydrated = true;
      if (this.readyResolve) {
        this.readyResolve(true);
        this.readyResolve = null;
      }
      if (count > 0) {
        console.log(`[Data Layer - MongoDB] 📦 Hydrated ${count} collections directly from MongoDB into active memory.`);
      }

      // Notify any registered listeners that cloud hydration has completed
      for (const listener of this.hydrationListeners) {
        try {
          listener();
        } catch (e) {
          console.error('[Data Layer - MongoDB] Error calling hydration listener:', e);
        }
      }
    } catch (err) {
      console.warn('[Data Layer - MongoDB] Error during cache warmup:', err);
      if (this.readyResolve) {
        this.readyResolve(false);
        this.readyResolve = null;
      }
    }
  }

  loadSync<T>(collection: string, defaultValue: T): T {
    if (this.memoryCache.has(collection)) {
      return this.memoryCache.get(collection) as T;
    }
    const val = this.localFallback.loadSync(collection, defaultValue);
    this.memoryCache.set(collection, val);
    return val;
  }

  async load<T>(collection: string, defaultValue: T): Promise<T> {
    if (!this.isHydrated) {
      await this.whenReady(3000);
    }
    if (this.isConnected && this.db) {
      try {
        const col = this.db.collection('app_collections');
        const doc = await col.findOne({ _id: collection as any });
        if (doc && doc.data !== undefined) {
          this.memoryCache.set(collection, doc.data);
          return doc.data as T;
        }
      } catch (err) {
        console.warn(`[Data Layer - MongoDB] Error querying "${collection}", using fallback:`, err);
        return this.localFallback.load(collection, defaultValue);
      }
    }
    return this.loadSync<T>(collection, defaultValue);
  }

  async save<T>(collection: string, data: T): Promise<void> {
    // 1. Instantly update active memory cache
    this.memoryCache.set(collection, data);

    // 2. If MongoDB is connected, save directly and exclusively to MongoDB
    if (this.isConnected && this.db) {
      if (this.pendingSaves.has(collection)) {
        clearTimeout(this.pendingSaves.get(collection)!);
      }

      const timer = setTimeout(async () => {
        this.pendingSaves.delete(collection);
        if (this.isConnected && this.db) {
          try {
            const col = this.db.collection('app_collections');
            await col.updateOne(
              { _id: collection as any },
              { $set: { data, updatedAt: new Date() } },
              { upsert: true }
            );
          } catch (err: any) {
            console.error(`[Data Layer - MongoDB] Failed to write collection "${collection}" to MongoDB, falling back to local replica:`, err.message || err);
            // Fall back to local storage only if MongoDB write failed
            await this.localFallback.save(collection, data);
          }
        } else {
          // If MongoDB disconnected in the interim, fall back to local
          await this.localFallback.save(collection, data);
        }
      }, 300);

      this.pendingSaves.set(collection, timer);
      return;
    }

    // 3. Fallback: ONLY when MongoDB is disconnected, stopped, or unavailable, persist locally
    await this.localFallback.save(collection, data);
  }

  async delete(collection: string): Promise<void> {
    this.memoryCache.delete(collection);
    await this.localFallback.delete(collection);
    if (this.isConnected && this.db) {
      try {
        const col = this.db.collection('app_collections');
        await col.deleteOne({ _id: collection as any });
      } catch (err) {
        console.error(`[Data Layer - MongoDB] Failed to delete collection "${collection}":`, err);
      }
    }
  }
}

/**
 * Central Data Manager Facade
 * Provides strongly-typed CRUD for members, sessions, chat history, rooms, settings, etc.
 */
export class DataManager {
  private static instance: DataManager;
  private driver: IDataDriver;
  private config: DatabaseConfig;

  private constructor() {
    this.config = getDatabaseConfigFromEnv();
    if (this.config.driverType === 'mongodb' && this.config.databaseUrl) {
      this.driver = new MongoDbDataDriver(this.config.databaseUrl, this.config.localFallbackDir);
      console.log(`[Data Layer] Initialized Native MongoDB Driver: ${this.config.databaseUrl.replace(/:[^:]*@/, ':***@')}`);
    } else if (this.config.databaseUrl) {
      this.driver = new CloudRemoteDataDriver(this.config);
      console.log(`[Data Layer] Initialized Database Layer with external configuration: ${this.config.driverType} (${this.config.databaseUrl})`);
    } else {
      this.driver = new LocalJsonDataDriver(this.config.localFallbackDir);
      console.log(`[Data Layer] Initialized Local JSON Database driver with fallback dir: ${this.config.localFallbackDir}`);
    }
  }

  public static getInstance(): DataManager {
    if (!DataManager.instance) {
      DataManager.instance = new DataManager();
    }
    return DataManager.instance;
  }

  public getDriver(): IDataDriver {
    return this.driver;
  }

  public getConfig(): DatabaseConfig {
    return this.config;
  }

  public isCloudConnected(): boolean {
    return this.driver.isCloudConnected();
  }

  public isReady(): boolean {
    return this.driver.isReady();
  }

  public async whenReady(timeoutMs = 6000): Promise<boolean> {
    return this.driver.whenReady(timeoutMs);
  }

  public onHydrated(cb: () => void): void {
    this.driver.onHydrated(cb);
  }

  public async flush(): Promise<void> {
    return this.driver.flush();
  }

  public getStatus() {
    return {
      driver: this.driver.name,
      hasDatabaseUrl: Boolean(this.config.databaseUrl),
      isCloudConnected: this.driver.isCloudConnected(),
      databaseUrl: this.config.databaseUrl ? this.config.databaseUrl.replace(/:[^:]*@/, ':***@') : undefined
    };
  }

  // Generic methods
  public loadSync<T>(collection: string, defaultValue: T): T {
    return this.driver.loadSync<T>(collection, defaultValue);
  }

  public async load<T>(collection: string, defaultValue: T): Promise<T> {
    return this.driver.load<T>(collection, defaultValue);
  }

  public async save<T>(collection: string, data: T): Promise<void> {
    return this.driver.save<T>(collection, data);
  }

  public async delete(collection: string): Promise<void> {
    return this.driver.delete(collection);
  }

  // Domain-specific helpers with both Sync (for boot) and Async (for runtime)
  public loadSessionsSync<T>(defaultValue: T): T {
    return this.loadSync<T>('active_sessions', defaultValue);
  }

  public loadMembersSync<T>(defaultValue: T): T {
    return this.loadSync<T>('members', defaultValue);
  }

  public loadChatHistorySync<T>(defaultValue: T): T {
    return this.loadSync<T>('chat_history', defaultValue);
  }

  public loadBansSync<T>(defaultValue: T): T {
    return this.loadSync<T>('banned_records', defaultValue);
  }

  public loadJailedSync<T>(defaultValue: T): T {
    return this.loadSync<T>('jailed_records', defaultValue);
  }

  public loadShortcutsSync<T>(defaultValue: T): T {
    return this.loadSync<T>('shortcuts', defaultValue);
  }

  public loadEmblemsSync<T>(defaultValue: T): T {
    return this.loadSync<T>('emblems', defaultValue);
  }

  public loadRolePermissionsSync<T>(defaultValue: T): T {
    return this.loadSync<T>('role_permissions', defaultValue);
  }

  public loadGlobalAppearanceSync<T>(defaultValue: T): T {
    return this.loadSync<T>('global_appearance', defaultValue);
  }

  public loadGeneralWelcomeSync<T>(defaultValue: T): T {
    return this.loadSync<T>('general_welcome', defaultValue);
  }

  public loadServerSecuritySync<T>(defaultValue: T): T {
    return this.loadSync<T>('server_security', defaultValue);
  }

  public loadLikesSettingsSync<T>(defaultValue: T): T {
    return this.loadSync<T>('likes_settings', defaultValue);
  }

  public loadStaffMemosSync<T>(defaultValue: T): T {
    return this.loadSync<T>('staff_memos', defaultValue);
  }

  public loadChatRoomsSync<T>(defaultValue: T): T {
    return this.loadSync<T>('chat_rooms', defaultValue);
  }

  public loadRoomSettingsSync<T>(defaultValue: T): T {
    return this.loadSync<T>('room_settings', defaultValue);
  }

  public loadMonitoredWordsSync<T>(defaultValue: T): T {
    return this.loadSync<T>('monitored_words', defaultValue);
  }

  public loadAuditLogsSync<T>(defaultValue: T): T {
    return this.loadSync<T>('admin_audit_logs', defaultValue);
  }

  public loadWallPostsSync<T>(defaultValue: T): T {
    return this.loadSync<T>('wall_posts', defaultValue);
  }

  public loadStoriesSync<T>(defaultValue: T): T {
    return this.loadSync<T>('stories', defaultValue);
  }

  // Domain-specific helpers
  public async loadMembers<T>(defaultValue: T): Promise<T> {
    return this.load<T>('members', defaultValue);
  }

  public async saveMembers<T>(data: T): Promise<void> {
    return this.save<T>('members', data);
  }

  public async loadSessions<T>(defaultValue: T): Promise<T> {
    return this.load<T>('active_sessions', defaultValue);
  }

  public async saveSessions<T>(data: T): Promise<void> {
    return this.save<T>('active_sessions', data);
  }

  public async loadChatHistory<T>(defaultValue: T): Promise<T> {
    return this.load<T>('chat_history', defaultValue);
  }

  public async saveChatHistory<T>(data: T): Promise<void> {
    return this.save<T>('chat_history', data);
  }

  public async loadWallPosts<T>(defaultValue: T): Promise<T> {
    return this.load<T>('wall_posts', defaultValue);
  }

  public async saveWallPosts<T>(data: T): Promise<void> {
    return this.save<T>('wall_posts', data);
  }

  public async loadStories<T>(defaultValue: T): Promise<T> {
    return this.load<T>('stories', defaultValue);
  }

  public async saveStories<T>(data: T): Promise<void> {
    return this.save<T>('stories', data);
  }

  public async loadShortcuts<T>(defaultValue: T): Promise<T> {
    return this.load<T>('shortcuts', defaultValue);
  }

  public async saveShortcuts<T>(data: T): Promise<void> {
    return this.save<T>('shortcuts', data);
  }

  public async loadEmblems<T>(defaultValue: T): Promise<T> {
    return this.load<T>('emblems', defaultValue);
  }

  public async saveEmblems<T>(data: T): Promise<void> {
    return this.save<T>('emblems', data);
  }

  public async loadRolePermissions<T>(defaultValue: T): Promise<T> {
    return this.load<T>('role_permissions', defaultValue);
  }

  public async saveRolePermissions<T>(data: T): Promise<void> {
    return this.save<T>('role_permissions', data);
  }

  public async loadGlobalAppearance<T>(defaultValue: T): Promise<T> {
    return this.load<T>('global_appearance', defaultValue);
  }

  public async saveGlobalAppearance<T>(data: T): Promise<void> {
    return this.save<T>('global_appearance', data);
  }

  public async loadGeneralWelcome<T>(defaultValue: T): Promise<T> {
    return this.load<T>('general_welcome', defaultValue);
  }

  public async saveGeneralWelcome<T>(data: T): Promise<void> {
    return this.save<T>('general_welcome', data);
  }

  public async loadServerSecurity<T>(defaultValue: T): Promise<T> {
    return this.load<T>('server_security', defaultValue);
  }

  public async saveServerSecurity<T>(data: T): Promise<void> {
    return this.save<T>('server_security', data);
  }

  public async loadLikesSettings<T>(defaultValue: T): Promise<T> {
    return this.load<T>('likes_settings', defaultValue);
  }

  public async saveLikesSettings<T>(data: T): Promise<void> {
    return this.save<T>('likes_settings', data);
  }

  public async loadStaffMemos<T>(defaultValue: T): Promise<T> {
    return this.load<T>('staff_memos', defaultValue);
  }

  public async saveStaffMemos<T>(data: T): Promise<void> {
    return this.save<T>('staff_memos', data);
  }

  public async loadChatRooms<T>(defaultValue: T): Promise<T> {
    return this.load<T>('chat_rooms', defaultValue);
  }

  public async saveChatRooms<T>(data: T): Promise<void> {
    return this.save<T>('chat_rooms', data);
  }

  public async loadRoomSettings<T>(defaultValue: T): Promise<T> {
    return this.load<T>('room_settings', defaultValue);
  }

  public async saveRoomSettings<T>(data: T): Promise<void> {
    return this.save<T>('room_settings', data);
  }

  public async loadMonitoredWords<T>(defaultValue: T): Promise<T> {
    return this.load<T>('monitored_words', defaultValue);
  }

  public async saveMonitoredWords<T>(data: T): Promise<void> {
    return this.save<T>('monitored_words', data);
  }

  public async loadAuditLogs<T>(defaultValue: T): Promise<T> {
    return this.load<T>('admin_audit_logs', defaultValue);
  }

  public async saveAuditLogs<T>(data: T): Promise<void> {
    return this.save<T>('admin_audit_logs', data);
  }

  public async loadBans<T>(defaultValue: T): Promise<T> {
    return this.load<T>('banned_records', defaultValue);
  }

  public async saveBans<T>(data: T): Promise<void> {
    return this.save<T>('banned_records', data);
  }

  public async loadJailed<T>(defaultValue: T): Promise<T> {
    return this.load<T>('jailed_records', defaultValue);
  }

  public async saveJailed<T>(data: T): Promise<void> {
    return this.save<T>('jailed_records', data);
  }

  public loadRecentLoginsSync<T>(defaultValue: T): T {
    return this.loadSync<T>('recent_logins', defaultValue);
  }

  public async loadRecentLogins<T>(defaultValue: T): Promise<T> {
    return this.load<T>('recent_logins', defaultValue);
  }

  public async saveRecentLogins<T>(data: T): Promise<void> {
    return this.save<T>('recent_logins', data);
  }

  public loadRolesConfigSync<T>(defaultValue: T): T {
    return this.loadSync<T>('roles_config', defaultValue);
  }

  public async loadRolesConfig<T>(defaultValue: T): Promise<T> {
    return this.load<T>('roles_config', defaultValue);
  }

  public async saveRolesConfig<T>(data: T): Promise<void> {
    return this.save<T>('roles_config', data);
  }

  public loadOfflinePrivateMessagesSync<T>(defaultValue: T): T {
    return this.loadSync<T>('offline_private_messages', defaultValue);
  }

  public async loadOfflinePrivateMessages<T>(defaultValue: T): Promise<T> {
    return this.load<T>('offline_private_messages', defaultValue);
  }

  public async saveOfflinePrivateMessages<T>(data: T): Promise<void> {
    return this.save<T>('offline_private_messages', data);
  }

  public loadPrivateChatHistorySync<T>(defaultValue: T): T {
    return this.loadSync<T>('private_chat_history', defaultValue);
  }

  public async loadPrivateChatHistory<T>(defaultValue: T): Promise<T> {
    return this.load<T>('private_chat_history', defaultValue);
  }

  public async savePrivateChatHistory<T>(data: T): Promise<void> {
    return this.save<T>('private_chat_history', data);
  }
}

export const dataManager = DataManager.getInstance();

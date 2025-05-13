import CryptoJS from 'crypto-js';

/**
 * WebStorage 配置选项接口
 */
interface WebStorageOptions {
  /** 存储方式 */
  storage?: 'local' | 'session';
  /** 数据版本号 */
  version?: string;
  /** key 前缀 */
  prefix?: string;
  /** 是否加密 */
  encrypt?: boolean;
  /** 默认过期时间（毫秒），0 = 永不过期 */
  expire?: number;
  /** 错误回调 */
  onError?: (err: Error) => void;
  /** 是否打印调试信息 */
  debug?: boolean;
}

/**
 * 存储数据的配置选项
 */
interface SetOptions {
  /** 过期时间（毫秒），覆盖默认设置 */
  expire?: number;
  /** 是否加密，覆盖默认设置 */
  encrypt?: boolean;
}

/**
 * 存储数据结构
 */
interface StorageItem<T = any> {
  /** 存储的值 */
  value: T;
  /** 存储时间戳 */
  timestamp: number;
  /** 过期时间（毫秒），0 表示永不过期 */
  expire: number;
  /** 是否已加密 */
  encrypted: boolean;
  /** 数据版本 */
  version: string;
}

/**
 * WebStorage 类 - 提供增强的浏览器存储功能
 */
export default class WebStorage {
  /** 存储类型 */
  private readonly storage: Storage;
  /** 数据版本号 */
  private readonly version: string;
  /** key 前缀 */
  private readonly prefix: string;
  /** 是否加密 */
  private readonly encrypt: boolean;
  /** 默认过期时间 */
  private readonly expire: number;
  /** 错误回调 */
  private readonly onError: ((err: Error) => void) | undefined;
  /** 调试模式 */
  private readonly debug: boolean;

  /**
   * 构造函数
   * @param options - 配置选项
   */
  constructor(options: WebStorageOptions = {}) {
    const {
      storage = 'local',
      version = '1.0.0',
      prefix = '',
      encrypt = false,
      expire = 0,
      onError,
      debug = false,
    } = options;

    // 初始化存储类型
    this.storage =
      storage === 'session' ? window.sessionStorage : window.localStorage;

    // 验证并设置版本号
    if (version && typeof version !== 'string') {
      throw new Error('version must be a string');
    }
    this.version = version;

    // 验证并设置前缀
    if (prefix && typeof prefix !== 'string') {
      throw new Error('prefix must be a string');
    }
    this.prefix = prefix;

    // 设置加密选项
    this.encrypt = encrypt;

    // 验证并设置过期时间
    if (expire != null && (typeof expire !== 'number' || expire < 0)) {
      throw new Error('expire must be a non-negative number');
    }
    this.expire = expire;

    // 设置错误回调
    if (onError && typeof onError !== 'function') {
      throw new Error('onError must be a function');
    }
    this.onError = onError;

    // 设置调试模式
    this.debug = debug;

    // 调试信息
    if (this.debug) {
      console.log(
        '%c🚀 WebStorage Initialized',
        'color: #4CAF50; font-size: 12px; font-family: monospace;',
        {
          storage,
          version: this.version,
          prefix: this.prefix,
          encrypt: this.encrypt,
          expire: this.expire === 0 ? 'Never' : `${this.expire}ms`,
          debug: this.debug,
        }
      );
    }
  }

  /**
   * 获取完整的存储键名
   * @param key - 原始键名
   * @returns 完整键名
   * @private
   */
  private getFullKey(key: string): string {
    return this.prefix ? `${this.prefix}:${key}` : key;
  }

  /**
   * 处理错误
   * @param error - 错误对象
   * @private
   */
  private handleError(error: Error): void {
    if (this.onError) {
      this.onError(error);
    } else if (this.debug) {
      console.error(
        '%c💥 WebStorage Error',
        'color: #F44336; font-size: 12px; font-family: monospace;',
        error
      );
    }
  }

  /**
   * 验证存储键名
   * @param key - 存储键名
   * @throws {Error} 当键名无效时抛出错误
   */
  private validateKey(key: string): void {
    if (!key || typeof key !== 'string' || key.trim() === '') {
      throw new Error('Key must be a non-empty string');
    }
  }

  /**
   * 验证过期时间
   * @param expire - 过期时间
   * @throws {Error} 当过期时间无效时抛出错误
   */
  private validateExpire(expire: number | undefined): void {
    if (expire != null && (typeof expire !== 'number' || expire < 0)) {
      throw new Error('expire must be a non-negative number');
    }
  }

  /**
   * 创建存储项
   * @param value - 存储值
   * @param expire - 过期时间
   * @param encrypt - 是否加密
   * @returns 存储项对象
   */
  private createStorageItem<T = any>(
    value: T,
    expire: number,
    encrypt: boolean
  ): StorageItem<T> {
    return {
      value,
      timestamp: Date.now(),
      expire: expire || 0,
      encrypted: encrypt,
      version: this.version,
    };
  }

  /**
   * 序列化和加密数据
   * @param storageItem - 存储项
   * @param encrypt - 是否加密
   * @returns 最终的存储数据
   * @throws {Error} 序列化或加密失败时抛出错误
   */
  private serializeAndEncrypt<T = any>(
    storageItem: StorageItem<T>,
    encrypt: boolean
  ): string {
    let serializedData: string;
    try {
      serializedData = JSON.stringify(storageItem);
    } catch (error) {
      throw new Error(
        `Serialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    if (encrypt) {
      try {
        return this.encryptData(serializedData);
      } catch (error) {
        throw new Error(
          `Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return serializedData;
  }

  /**
   * 生成加密密钥
   * @param passphrase - 密码短语
   * @returns 生成的密钥
   * @private
   */
  private generateKey(passphrase: string): string {
    // 使用版本号作为盐值，生成一致的密钥
    return CryptoJS.PBKDF2(passphrase, this.version, {
      keySize: 256 / 32,
      iterations: 1000,
    }).toString();
  }

  /**
   * 加密数据
   * @param data - 要加密的数据
   * @returns 加密后的数据
   * @private
   */
  private encryptData(data: string): string {
    try {
      // 生成随机密码短语
      const passphrase = CryptoJS.lib.WordArray.random(128 / 8).toString();

      // 生成密钥
      const key = this.generateKey(passphrase);

      // 使用 AES 加密
      const encrypted = CryptoJS.AES.encrypt(data, key).toString();

      // 将密码短语和加密数据组合
      const combined = `${passphrase}|${encrypted}`;

      // Base64 编码
      return btoa(combined);
    } catch (error) {
      throw new Error(
        `Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * 解密数据
   * @param encryptedData - 加密的数据
   * @returns 解密后的数据
   * @private
   */
  private decryptData(encryptedData: string): string {
    try {
      // Base64 解码
      const decoded = atob(encryptedData);

      // 分离密码短语和加密数据
      const parts = decoded.split('|');
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted data format');
      }

      const passphrase = parts[0];
      const encrypted = parts[1];

      if (!(passphrase && encrypted)) {
        throw new Error('Invalid encrypted data format');
      }

      // 使用相同的密码短语生成密钥
      const key = this.generateKey(passphrase);

      // 使用 AES 解密
      const decryptedBytes = CryptoJS.AES.decrypt(encrypted, key);
      const decrypted = decryptedBytes.toString(CryptoJS.enc.Utf8);

      if (!decrypted) {
        throw new Error('Decryption failed - invalid key or corrupted data');
      }

      return decrypted;
    } catch (error) {
      throw new Error(
        `Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * 尝试解密存储数据
   * @param rawData - 原始数据
   * @param key - 键名（用于调试）
   * @returns 解密后的数据或原始数据
   */
  private tryDecryptStorageData(rawData: string, key: string): string {
    try {
      const decryptedData = this.decryptData(rawData);
      if (this.debug) {
        console.log(
          `%c🔓 GET %c${key} %c- decrypted`,
          'color: #9C27B0; font-size: 12px; font-family: monospace;',
          'color: #FF9800; font-size: 12px; font-family: monospace;',
          'color: #4CAF50; font-size: 12px; font-family: monospace;'
        );
      }
      return decryptedData;
    } catch {
      if (this.debug) {
        console.log(
          `%c📖 GET %c${key} %c- not encrypted`,
          'color: #607D8B; font-size: 12px; font-family: monospace;',
          'color: #FF9800; font-size: 12px; font-family: monospace;',
          'color: #757575; font-size: 12px; font-family: monospace;'
        );
      }
      return rawData;
    }
  }

  /**
   * 解析存储项数据
   * @param serializedData - 序列化的数据
   * @param key - 键名（用于调试）
   * @param fullKey - 完整键名（用于删除）
   * @returns 存储项或 null
   */
  private parseStorageItem(
    serializedData: string,
    key: string,
    fullKey: string
  ): StorageItem | null {
    try {
      return JSON.parse(serializedData) as StorageItem;
    } catch (error) {
      if (this.debug) {
        console.error(
          `%c💥 GET %c${key} %c- deserialization failed`,
          'color: #F44336; font-size: 12px; font-family: monospace;',
          'color: #FF9800; font-size: 12px; font-family: monospace;',
          'color: #F44336; font-size: 12px; font-family: monospace;',
          error
        );
      }
      this.storage.removeItem(fullKey);
      return null;
    }
  }

  /**
   * 验证存储项结构
   * @param storageItem - 存储项
   * @param key - 键名（用于调试）
   * @param fullKey - 完整键名（用于删除）
   * @returns 是否有效
   */
  private validateStorageItem(
    storageItem: any,
    key: string,
    fullKey: string
  ): boolean {
    if (
      !storageItem ||
      typeof storageItem !== 'object' ||
      !('value' in storageItem)
    ) {
      if (this.debug) {
        console.warn(
          `%c⚠️ GET %c${key} %c- invalid data structure`,
          'color: #FF9800; font-size: 12px; font-family: monospace;',
          'color: #FF9800; font-size: 12px; font-family: monospace;',
          'color: #FF9800; font-size: 12px; font-family: monospace;'
        );
      }
      this.storage.removeItem(fullKey);
      return false;
    }
    return true;
  }

  /**
   * 检查数据版本
   * @param storageItem - 存储项
   * @param key - 键名（用于调试）
   * @param fullKey - 完整键名（用于删除）
   * @returns 是否版本匹配
   */
  private checkVersion(
    storageItem: StorageItem,
    key: string,
    fullKey: string
  ): boolean {
    if (storageItem.version && storageItem.version !== this.version) {
      if (this.debug) {
        console.log(
          `%c🔄 GET %c${key} %c- version mismatch: %c${storageItem.version} %cvs %c${this.version}`,
          'color: #FF9800; font-size: 12px; font-family: monospace;',
          'color: #FF9800; font-size: 12px; font-family: monospace;',
          'color: #757575; font-size: 12px; font-family: monospace;',
          'color: #F44336; font-size: 12px; font-family: monospace;',
          'color: #757575; font-size: 12px; font-family: monospace;',
          'color: #4CAF50; font-size: 12px; font-family: monospace;'
        );
      }
      this.storage.removeItem(fullKey);
      return false;
    }
    return true;
  }

  /**
   * 检查数据是否过期
   * @param storageItem - 存储项
   * @param key - 键名（用于调试）
   * @param fullKey - 完整键名（用于删除）
   * @returns 是否未过期
   */
  private checkExpiration(
    storageItem: StorageItem,
    key: string,
    fullKey: string
  ): boolean {
    if (storageItem.expire && storageItem.expire > 0) {
      const now = Date.now();
      const elapsed = now - storageItem.timestamp;

      if (elapsed >= storageItem.expire) {
        if (this.debug) {
          console.log(
            `%c⏰ GET %c${key} %c- expired (%c${elapsed}ms %c>= %c${storageItem.expire}ms%c)`,
            'color: #FF9800; font-size: 12px; font-family: monospace;',
            'color: #FF9800; font-size: 12px; font-family: monospace;',
            'color: #757575; font-size: 12px; font-family: monospace;',
            'color: #F44336; font-size: 12px; font-family: monospace;',
            'color: #757575; font-size: 12px; font-family: monospace;',
            'color: #F44336; font-size: 12px; font-family: monospace;',
            'color: #757575; font-size: 12px; font-family: monospace;'
          );
        }
        this.storage.removeItem(fullKey);
        return false;
      }
    }
    return true;
  }

  /**
   * 记录成功获取的调试信息
   * @param key - 键名
   * @param fullKey - 完整键名
   * @param storageItem - 存储项
   */
  private logGetSuccess(
    key: string,
    fullKey: string,
    storageItem: StorageItem
  ): void {
    if (this.debug) {
      console.log(
        `%c✅ GET %c${key} %c- success`,
        'color: #4CAF50; font-size: 12px; font-family: monospace;',
        'color: #FF9800; font-size: 12px; font-family: monospace;',
        'color: #4CAF50; font-size: 12px; font-family: monospace;',
        {
          fullKey,
          encrypted: storageItem.encrypted,
          expire: storageItem.expire ? `${storageItem.expire}ms` : 'Never',
          version: storageItem.version,
          timestamp: new Date().toLocaleTimeString(),
        }
      );
    }
  }

  /**
   * 存储数据
   * @param key - 存储键名
   * @param value - 存储值
   * @param options - 配置选项
   */
  set<T = any>(key: string, value: T, options: SetOptions = {}): void {
    try {
      this.validateKey(key);

      const { expire = this.expire, encrypt = this.encrypt } = options;
      this.validateExpire(expire);

      const fullKey = this.getFullKey(key);
      const storageItem = this.createStorageItem<T>(value, expire, encrypt);
      const finalData = this.serializeAndEncrypt(storageItem, encrypt);

      // 存储到浏览器
      this.storage.setItem(fullKey, finalData);

      if (this.debug) {
        console.log(
          `%c💾 SET %c${key}`,
          'color: #2196F3; font-size: 12px; font-family: monospace;',
          'color: #FF9800; font-size: 12px; font-family: monospace;',
          {
            fullKey,
            encrypted: encrypt,
            expire: expire ? `${expire}ms` : 'Never',
            size: `${finalData.length} chars`,
            timestamp: new Date().toLocaleTimeString(),
          }
        );
      }
    } catch (error) {
      const err =
        error instanceof Error ? error : new Error('Set operation failed');
      this.handleError(err);
      throw err;
    }
  }

  /**
   * 获取存储的数据
   * @param key - 存储键名
   * @returns 存储的值或 null
   */
  get<T = any>(key: string): T | null {
    try {
      this.validateKey(key);

      const fullKey = this.getFullKey(key);
      const rawData = this.storage.getItem(fullKey);

      if (rawData === null) {
        if (this.debug) {
          console.log(
            `%c❌ GET %c${key} %c- not found`,
            'color: #F44336; font-size: 12px; font-family: monospace;',
            'color: #FF9800; font-size: 12px; font-family: monospace;',
            'color: #757575; font-size: 12px; font-family: monospace;'
          );
        }
        return null;
      }
      // 尝试解密存储数据
      const serializedData = this.tryDecryptStorageData(rawData, key);
      // 解析存储项数据
      const storageItem = this.parseStorageItem(serializedData, key, fullKey);
      // 解析存储项数据
      if (!storageItem) {
        return null;
      }

      // 验证存储项结构
      if (!this.validateStorageItem(storageItem, key, fullKey)) {
        return null;
      }

      // 检查数据版本
      if (!this.checkVersion(storageItem, key, fullKey)) {
        return null;
      }

      // 检查数据是否过期
      if (!this.checkExpiration(storageItem, key, fullKey)) {
        return null;
      }

      // 记录成功获取的调试信息
      this.logGetSuccess(key, fullKey, storageItem);
      return storageItem.value as T;
    } catch (error) {
      const err =
        error instanceof Error ? error : new Error('Get operation failed');
      this.handleError(err);
      return null;
    }
  }

  /**
   * 清空所有相关存储数据
   */
  clearAll(): void {
    try {
      const keysToRemove: string[] = [];
      const prefixPattern = this.prefix ? `${this.prefix}:` : '';

      // 收集所有相关的键
      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i);
        if (key && (key.startsWith(prefixPattern) || !this.prefix)) {
          keysToRemove.push(key);
        }
      }

      // 删除所有相关的键
      for (const key of keysToRemove) {
        this.storage.removeItem(key);
      }

      if (this.debug) {
        console.log(
          `%c🗑️ CLEAR ALL %c- removed ${keysToRemove.length} items`,
          'color: #F44336; font-size: 12px; font-family: monospace;',
          'color: #4CAF50; font-size: 12px; font-family: monospace;',
          {
            removedKeys: keysToRemove,
            timestamp: new Date().toLocaleTimeString(),
          }
        );
      }
    } catch (error) {
      const err =
        error instanceof Error ? error : new Error('ClearAll operation failed');
      this.handleError(err);
      throw err;
    }
  }
}

import CryptoJS from 'crypto-js';

/**
 * WebCookie 配置选项接口
 */
interface WebCookieOptions {
  /** 数据版本号 */
  version?: string;
  /** key 前缀 */
  prefix?: string;
  /** 是否加密 */
  encrypt?: boolean;
  /** 默认过期时间（秒），0 = 永不过期 */
  maxAge?: number;
  /** 默认路径 */
  path?: string;
  /** 默认域名 */
  domain?: string;
  /** 是否只在 HTTPS 连接中发送 */
  secure?: boolean;
  /** 是否启用 SameSite 属性 */
  sameSite?: 'strict' | 'lax' | 'none';
  /** 错误回调 */
  onError?: (err: Error) => void;
  /** 是否打印调试信息 */
  debug?: boolean;
}

/**
 * 设置 Cookie 的配置选项
 */
interface SetCookieOptions {
  /** 过期时间（秒），覆盖默认设置 */
  maxAge?: number;
  /** 过期时间（UTC 字符串） */
  expires?: string;
  /** 路径，覆盖默认设置 */
  path?: string;
  /** 域名，覆盖默认设置 */
  domain?: string;
  /** 是否只在 HTTPS 连接中发送，覆盖默认设置 */
  secure?: boolean;
  /** SameSite 属性，覆盖默认设置 */
  sameSite?: 'strict' | 'lax' | 'none';
  /** 是否加密，覆盖默认设置 */
  encrypt?: boolean;
}

/**
 * Cookie 数据结构
 */
interface CookieItem<T = any> {
  /** 存储的值 */
  value: T;
  /** 存储时间戳 */
  timestamp: number;
  /** 是否已加密 */
  encrypted: boolean;
  /** 数据版本 */
  version: string;
}

/**
 * WebCookie 类 - 提供增强的浏览器 Cookie 功能
 */
export default class WebCookie {
  /** 数据版本号 */
  private readonly version: string;
  /** key 前缀 */
  private readonly prefix: string;
  /** 是否加密 */
  private readonly encrypt: boolean;
  /** 默认过期时间 */
  private readonly maxAge: number;
  /** 默认路径 */
  private readonly path: string;
  /** 默认域名 */
  private readonly domain: string | undefined;
  /** 是否只在 HTTPS 连接中发送 */
  private readonly secure: boolean;
  /** SameSite 属性 */
  private readonly sameSite: 'strict' | 'lax' | 'none' | undefined;
  /** 错误回调 */
  private readonly onError: ((err: Error) => void) | undefined;
  /** 调试模式 */
  private readonly debug: boolean;

  /**
   * 构造函数
   * @param options - 配置选项
   */
  constructor(options: WebCookieOptions = {}) {
    const {
      version = '1.0.0',
      prefix = '',
      encrypt = false,
      maxAge = 0,
      path = '/',
      domain,
      secure = false,
      sameSite,
      onError,
      debug = false,
    } = options;

    // 验证配置选项
    this.validateConstructorOptions({
      version,
      prefix,
      maxAge,
      ...(domain !== undefined && { domain }),
      ...(sameSite !== undefined && { sameSite }),
      ...(onError !== undefined && { onError }),
    });

    // 设置属性
    this.version = version;
    this.prefix = prefix;
    this.encrypt = encrypt;
    this.maxAge = maxAge;
    this.path = path;
    this.domain = domain;
    this.secure = secure;
    this.sameSite = sameSite;
    this.onError = onError;
    this.debug = debug;

    // 调试信息
    this.logInitialization();
  }

  /**
   * 验证构造函数选项
   * @param options - 需要验证的选项
   * @private
   */
  private validateConstructorOptions(options: {
    version: string;
    prefix: string;
    maxAge: number;
    domain?: string;
    sameSite?: 'strict' | 'lax' | 'none';
    onError?: (err: Error) => void;
  }): void {
    const { version, prefix, maxAge, domain, sameSite, onError } = options;

    if (version && typeof version !== 'string') {
      throw new Error('version must be a string');
    }

    if (prefix && typeof prefix !== 'string') {
      throw new Error('prefix must be a string');
    }

    if (maxAge != null && (typeof maxAge !== 'number' || maxAge < 0)) {
      throw new Error('maxAge must be a non-negative number');
    }

    if (domain && typeof domain !== 'string') {
      throw new Error('domain must be a string');
    }

    if (sameSite && !['strict', 'lax', 'none'].includes(sameSite)) {
      throw new Error("sameSite must be 'strict', 'lax', or 'none'");
    }

    if (onError && typeof onError !== 'function') {
      throw new Error('onError must be a function');
    }
  }

  /**
   * 记录初始化信息
   * @private
   */
  private logInitialization(): void {
    if (this.debug) {
      console.log(
        '%c🍪 WebCookie Initialized',
        'color: #4CAF50; font-size: 12px; font-family: monospace;',
        {
          version: this.version,
          prefix: this.prefix,
          encrypt: this.encrypt,
          maxAge: this.maxAge === 0 ? 'Never' : `${this.maxAge}s`,
          path: this.path,
          domain: this.domain || 'Current domain',
          secure: this.secure,
          sameSite: this.sameSite || 'Default',
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
        '%c💥 WebCookie Error',
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
   * @param maxAge - 过期时间
   * @throws {Error} 当过期时间无效时抛出错误
   */
  private validateMaxAge(maxAge: number | undefined): void {
    if (maxAge != null && (typeof maxAge !== 'number' || maxAge < 0)) {
      throw new Error('maxAge must be a non-negative number');
    }
  }

  /**
   * 生成加密密钥
   * @param passphrase - 密码短语
   * @returns 生成的密钥
   * @private
   */
  private generateKey(passphrase: string): string {
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
      const passphrase = CryptoJS.lib.WordArray.random(128 / 8).toString();
      const key = this.generateKey(passphrase);
      const encrypted = CryptoJS.AES.encrypt(data, key).toString();
      const combined = `${passphrase}|${encrypted}`;
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
      const decoded = atob(encryptedData);
      const parts = decoded.split('|');
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted data format');
      }

      const passphrase = parts[0];
      const encrypted = parts[1];

      if (!(passphrase && encrypted)) {
        throw new Error('Invalid encrypted data format');
      }

      const key = this.generateKey(passphrase);
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
   * 创建 Cookie 项
   * @param value - 存储值
   * @param encrypt - 是否加密
   * @returns Cookie 项对象
   */
  private createCookieItem<T = any>(value: T, encrypt: boolean): CookieItem<T> {
    return {
      value,
      timestamp: Date.now(),
      encrypted: encrypt,
      version: this.version,
    };
  }

  /**
   * 序列化和加密数据
   * @param cookieItem - Cookie 项
   * @param encrypt - 是否加密
   * @returns 最终的存储数据
   * @throws {Error} 序列化或加密失败时抛出错误
   */
  private serializeAndEncrypt<T = any>(
    cookieItem: CookieItem<T>,
    encrypt: boolean
  ): string {
    let serializedData: string;
    try {
      serializedData = JSON.stringify(cookieItem);
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
   * 构建 Cookie 字符串
   * @param key - Cookie 键名
   * @param value - Cookie 值
   * @param options - 配置选项
   * @returns Cookie 字符串
   */
  private buildCookieString(
    key: string,
    value: string,
    options: SetCookieOptions = {}
  ): string {
    const {
      maxAge = this.maxAge,
      expires,
      path = this.path,
      domain = this.domain,
      secure = this.secure,
      sameSite = this.sameSite,
    } = options;

    let cookieStr = `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;

    if (expires) {
      const expiresDate = new Date(expires);
      if (!Number.isNaN(expiresDate.getTime())) {
        cookieStr += `;expires=${expiresDate.toUTCString()}`;
      }
    } else if (maxAge && maxAge > 0) {
      cookieStr += `;max-age=${maxAge}`;
    }

    if (path) {
      cookieStr += `;path=${path}`;
    }

    if (domain) {
      cookieStr += `;domain=${domain}`;
    }

    if (secure) {
      cookieStr += ';secure';
    }

    if (sameSite) {
      cookieStr += `;samesite=${sameSite}`;
    }

    return cookieStr;
  }

  /**
   * 从 Cookie 字符串中查找指定键的值
   * @param key - Cookie 键名
   * @returns 原始 Cookie 值或 null
   */
  private findCookieValue(key: string): string | null {
    const cookies = document.cookie.split('; ');
    for (const cookie of cookies) {
      const [cookieKey, cookieValue] = cookie.split('=');
      if (cookieKey && decodeURIComponent(cookieKey) === key) {
        return decodeURIComponent(cookieValue || '');
      }
    }
    return null;
  }

  /**
   * 尝试解密 Cookie 数据
   * @param rawData - 原始数据
   * @param key - 键名（用于调试）
   * @returns 解密后的数据或原始数据
   */
  private tryDecryptCookieData(rawData: string, key: string): string {
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
   * 解析 Cookie 项数据
   * @param serializedData - 序列化的数据
   * @param key - 键名（用于调试）
   * @param fullKey - 完整键名（用于删除）
   * @returns Cookie 项或 null
   */
  private parseCookieItem(
    serializedData: string,
    key: string,
    _fullKey: string
  ): CookieItem | null {
    try {
      return JSON.parse(serializedData) as CookieItem;
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
      this.remove(key);
      return null;
    }
  }

  /**
   * 验证 Cookie 项结构
   * @param cookieItem - Cookie 项
   * @param key - 键名（用于调试）
   * @param fullKey - 完整键名（用于删除）
   * @returns 是否有效
   */
  private validateCookieItem(
    cookieItem: any,
    key: string,
    _fullKey: string
  ): boolean {
    if (
      !cookieItem ||
      typeof cookieItem !== 'object' ||
      !('value' in cookieItem)
    ) {
      if (this.debug) {
        console.warn(
          `%c⚠️ GET %c${key} %c- invalid data structure`,
          'color: #FF9800; font-size: 12px; font-family: monospace;',
          'color: #FF9800; font-size: 12px; font-family: monospace;',
          'color: #FF9800; font-size: 12px; font-family: monospace;'
        );
      }
      this.remove(key);
      return false;
    }
    return true;
  }

  /**
   * 检查数据版本
   * @param cookieItem - Cookie 项
   * @param key - 键名（用于调试）
   * @param fullKey - 完整键名（用于删除）
   * @returns 是否版本匹配
   */
  private checkVersion(cookieItem: CookieItem, key: string): boolean {
    if (cookieItem.version && cookieItem.version !== this.version) {
      if (this.debug) {
        console.log(
          `%c🔄 GET %c${key} %c- version mismatch: %c${cookieItem.version} %cvs %c${this.version}`,
          'color: #FF9800; font-size: 12px; font-family: monospace;',
          'color: #FF9800; font-size: 12px; font-family: monospace;',
          'color: #757575; font-size: 12px; font-family: monospace;',
          'color: #F44336; font-size: 12px; font-family: monospace;',
          'color: #757575; font-size: 12px; font-family: monospace;',
          'color: #4CAF50; font-size: 12px; font-family: monospace;'
        );
      }
      this.remove(key);
      return false;
    }
    return true;
  }

  /**
   * 记录成功获取的调试信息
   * @param key - 键名
   * @param fullKey - 完整键名
   * @param cookieItem - Cookie 项
   */
  private logGetSuccess(
    key: string,
    fullKey: string,
    cookieItem: CookieItem
  ): void {
    if (this.debug) {
      console.log(
        `%c✅ GET %c${key} %c- success`,
        'color: #4CAF50; font-size: 12px; font-family: monospace;',
        'color: #FF9800; font-size: 12px; font-family: monospace;',
        'color: #4CAF50; font-size: 12px; font-family: monospace;',
        {
          fullKey,
          encrypted: cookieItem.encrypted,
          version: cookieItem.version,
          timestamp: new Date().toLocaleTimeString(),
        }
      );
    }
  }

  /**
   * 设置 Cookie
   * @param key - Cookie 键名
   * @param value - Cookie 值
   * @param options - 配置选项
   */
  set<T = any>(key: string, value: T, options: SetCookieOptions = {}): void {
    try {
      this.validateKey(key);

      const { encrypt = this.encrypt, maxAge } = options;
      this.validateMaxAge(maxAge);

      const fullKey = this.getFullKey(key);
      const cookieItem = this.createCookieItem<T>(value, encrypt);
      const finalData = this.serializeAndEncrypt(cookieItem, encrypt);
      const cookieString = this.buildCookieString(fullKey, finalData, options);

      // 设置到浏览器
      document.cookie = cookieString;

      if (this.debug) {
        console.log(
          `%c🍪 SET %c${key}`,
          'color: #2196F3; font-size: 12px; font-family: monospace;',
          'color: #FF9800; font-size: 12px; font-family: monospace;',
          {
            fullKey,
            encrypted: encrypt,
            maxAge:
              maxAge || this.maxAge ? `${maxAge || this.maxAge}s` : 'Session',
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
   * 获取 Cookie 值
   * @param key - Cookie 键名
   * @returns Cookie 值或 null
   */
  get<T = any>(key: string): T | null {
    try {
      this.validateKey(key);

      const fullKey = this.getFullKey(key);
      const rawData = this.findCookieValue(fullKey);

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

      // 尝试解密 Cookie 数据
      const serializedData = this.tryDecryptCookieData(rawData, key);

      // 解析 Cookie 项数据
      const cookieItem = this.parseCookieItem(serializedData, key, fullKey);
      if (!cookieItem) {
        return null;
      }

      // 验证 Cookie 项结构
      if (!this.validateCookieItem(cookieItem, key, fullKey)) {
        return null;
      }

      // 检查数据版本
      if (!this.checkVersion(cookieItem, key)) {
        return null;
      }

      // 记录成功获取的调试信息
      this.logGetSuccess(key, fullKey, cookieItem);
      return cookieItem.value as T;
    } catch (error) {
      const err =
        error instanceof Error ? error : new Error('Get operation failed');
      this.handleError(err);
      return null;
    }
  }

  /**
   * 删除 Cookie
   * @param key - Cookie 键名
   * @param options - 删除选项
   */
  remove(
    key: string,
    options: Omit<SetCookieOptions, 'maxAge' | 'encrypt'> = {}
  ): void {
    try {
      this.validateKey(key);

      const fullKey = this.getFullKey(key);
      const { path = this.path, domain = this.domain } = options;

      // 设置过期的 Cookie 来删除它
      let cookieStr = `${encodeURIComponent(fullKey)}=;expires=${new Date(0).toUTCString()}`;

      if (path) {
        cookieStr += `;path=${path}`;
      }

      if (domain) {
        cookieStr += `;domain=${domain}`;
      }

      document.cookie = cookieStr;

      if (this.debug) {
        console.log(
          `%c🗑️ REMOVE %c${key}`,
          'color: #F44336; font-size: 12px; font-family: monospace;',
          'color: #FF9800; font-size: 12px; font-family: monospace;',
          {
            fullKey,
            path,
            domain,
            timestamp: new Date().toLocaleTimeString(),
          }
        );
      }
    } catch (error) {
      const err =
        error instanceof Error ? error : new Error('Remove operation failed');
      this.handleError(err);
      throw err;
    }
  }

  /**
   * 检查 Cookie 是否存在
   * @param key - Cookie 键名
   * @returns 是否存在
   */
  has(key: string): boolean {
    try {
      this.validateKey(key);
      return this.get(key) !== null;
    } catch {
      return false;
    }
  }

  /**
   * 获取所有相关 Cookie 的键名
   * @returns Cookie 键名数组
   */
  getAllKeys(): string[] {
    try {
      const keys: string[] = [];
      const cookies = document.cookie.split('; ');
      const prefixPattern = this.prefix ? `${this.prefix}:` : '';

      for (const cookie of cookies) {
        const [key] = cookie.split('=');
        if (key) {
          const decodedKey = decodeURIComponent(key);
          if (!this.prefix || decodedKey.startsWith(prefixPattern)) {
            const originalKey = this.prefix
              ? decodedKey.slice(prefixPattern.length)
              : decodedKey;
            keys.push(originalKey);
          }
        }
      }

      return keys;
    } catch (error) {
      const err =
        error instanceof Error
          ? error
          : new Error('GetAllKeys operation failed');
      this.handleError(err);
      return [];
    }
  }

  /**
   * 获取所有相关 Cookie 的键值对
   * @returns Cookie 键值对对象
   */
  getAll<T = any>(): Record<string, T> {
    try {
      const result: Record<string, T> = {};
      const keys = this.getAllKeys();

      for (const key of keys) {
        const value = this.get<T>(key);
        if (value !== null) {
          result[key] = value;
        }
      }

      return result;
    } catch (error) {
      const err =
        error instanceof Error ? error : new Error('GetAll operation failed');
      this.handleError(err);
      return {};
    }
  }

  /**
   * 清空所有相关 Cookie
   */
  clearAll(): void {
    try {
      const keys = this.getAllKeys();

      for (const key of keys) {
        this.remove(key);
      }

      if (this.debug) {
        console.log(
          `%c🗑️ CLEAR ALL %c- removed ${keys.length} cookies`,
          'color: #F44336; font-size: 12px; font-family: monospace;',
          'color: #4CAF50; font-size: 12px; font-family: monospace;',
          {
            removedKeys: keys,
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

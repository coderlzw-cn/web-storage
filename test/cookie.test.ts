import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WebCookie from '../src/cookie';

// Mock document.cookie
let mockCookieValue = '';
Object.defineProperty(document, 'cookie', {
  get: () => mockCookieValue,
  set: (value: string) => {
    // 模拟设置 cookie 的行为
    if (value.includes('expires=Thu, 01 Jan 1970')) {
      // 删除 cookie
      const key = value.split('=')[0];
      if (!key) {
        return;
      }
      mockCookieValue = mockCookieValue
        .split('; ')
        .filter((cookie) => cookie && !cookie.startsWith(key))
        .join('; ');
    } else {
      // 添加或更新 cookie
      const [keyValue] = value.split(';');
      if (!keyValue) {
        return;
      }
      const [key] = keyValue.split('=');
      if (!key) {
        return;
      }
      const existingCookies = mockCookieValue
        .split('; ')
        .filter((cookie) => cookie && !cookie.startsWith(key));
      existingCookies.push(keyValue);
      mockCookieValue = existingCookies.join('; ');
    }
  },
  configurable: true,
});

describe('WebCookie 类', () => {
  let cookie: WebCookie;

  beforeEach(() => {
    mockCookieValue = '';
    cookie = new WebCookie();
  });

  afterEach(() => {
    mockCookieValue = '';
  });

  describe('构造函数', () => {
    it('应该能够使用默认配置创建实例', () => {
      const instance = new WebCookie();
      expect(instance).toBeInstanceOf(WebCookie);
    });

    it('应该能够使用自定义配置创建实例', () => {
      const instance = new WebCookie({
        prefix: 'test',
        encrypt: true,
        version: '2.0.0',
        maxAge: 3600,
        path: '/app',
        domain: 'example.com',
        secure: true,
        sameSite: 'strict',
        debug: true,
      });
      expect(instance).toBeInstanceOf(WebCookie);
    });

    it('应该验证无效的配置参数', () => {
      expect(() => new WebCookie({ version: 123 as any })).toThrow(
        'version must be a string'
      );
      expect(() => new WebCookie({ prefix: 123 as any })).toThrow(
        'prefix must be a string'
      );
      expect(() => new WebCookie({ maxAge: -1 })).toThrow(
        'maxAge must be a non-negative number'
      );
      expect(() => new WebCookie({ domain: 123 as any })).toThrow(
        'domain must be a string'
      );
      expect(() => new WebCookie({ sameSite: 'invalid' as any })).toThrow(
        "sameSite must be 'strict', 'lax', or 'none'"
      );
      expect(() => new WebCookie({ onError: 'not-function' as any })).toThrow(
        'onError must be a function'
      );
    });
  });

  describe('set 方法', () => {
    it('应该能够设置基本的 Cookie', () => {
      cookie.set('testKey', 'testValue');
      expect(mockCookieValue).toContain('testKey=');
    });

    it('应该能够设置复杂对象', () => {
      const testObj = { name: '张三', age: 25 };
      cookie.set('user', testObj);
      expect(mockCookieValue).toContain('user=');
    });

    it('应该能够设置带自定义选项的 Cookie', () => {
      cookie.set('testKey', 'testValue', {
        maxAge: 3600,
        path: '/test',
        domain: 'test.com',
        secure: true,
        sameSite: 'lax',
      });
      expect(mockCookieValue).toContain('testKey=');
    });

    it('应该能够设置加密的 Cookie', () => {
      const encryptedCookie = new WebCookie({ encrypt: true });
      encryptedCookie.set('secret', 'sensitive-data');
      expect(mockCookieValue).toContain('secret=');
    });

    it('应该验证无效的键名', () => {
      expect(() => cookie.set('', 'value')).toThrow(
        'Key must be a non-empty string'
      );
      expect(() => cookie.set('   ', 'value')).toThrow(
        'Key must be a non-empty string'
      );
      expect(() => cookie.set(null as any, 'value')).toThrow(
        'Key must be a non-empty string'
      );
    });

    it('应该验证无效的 maxAge', () => {
      expect(() => cookie.set('key', 'value', { maxAge: -1 })).toThrow(
        'maxAge must be a non-negative number'
      );
      expect(() =>
        cookie.set('key', 'value', { maxAge: 'invalid' as any })
      ).toThrow('maxAge must be a non-negative number');
    });

    it('应该使用前缀', () => {
      const prefixedCookie = new WebCookie({ prefix: 'app' });
      prefixedCookie.set('testKey', 'testValue');
      expect(mockCookieValue).toContain('app%3AtestKey=');
    });
  });

  describe('get 方法', () => {
    beforeEach(() => {
      cookie.set('testKey', 'testValue');
      cookie.set('user', { name: '张三', age: 25 });
    });

    it('应该能够获取存在的 Cookie', () => {
      const value = cookie.get('testKey');
      expect(value).toBe('testValue');
    });

    it('应该能够获取复杂对象', () => {
      const user = cookie.get<{ name: string; age: number }>('user');
      expect(user).toEqual({ name: '张三', age: 25 });
    });

    it('应该返回 null 对于不存在的 Cookie', () => {
      const value = cookie.get('nonExistent');
      expect(value).toBeNull();
    });

    it('应该能够处理加密的 Cookie', () => {
      const encryptedCookie = new WebCookie({ encrypt: true });
      encryptedCookie.set('secret', 'sensitive-data');
      const value = encryptedCookie.get('secret');
      expect(value).toBe('sensitive-data');
    });

    it('应该对无效的键名返回 null', () => {
      const result1 = cookie.get('');
      const result2 = cookie.get('   ');
      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });

    it('应该处理版本不匹配的数据', () => {
      const oldVersionCookie = new WebCookie({ version: '1.0.0' });
      oldVersionCookie.set('testKey', 'testValue');

      const newVersionCookie = new WebCookie({ version: '2.0.0' });
      const value = newVersionCookie.get('testKey');
      expect(value).toBeNull();
    });
  });

  describe('remove 方法', () => {
    beforeEach(() => {
      cookie.set('testKey', 'testValue');
    });

    it('应该能够删除存在的 Cookie', () => {
      cookie.remove('testKey');
      expect(mockCookieValue).not.toContain('testKey=');
    });

    it('应该能够删除带自定义选项的 Cookie', () => {
      cookie.remove('testKey', {
        path: '/test',
        domain: 'test.com',
      });
      expect(mockCookieValue).not.toContain('testKey=');
    });

    it('应该验证无效的键名', () => {
      expect(() => cookie.remove('')).toThrow('Key must be a non-empty string');
      expect(() => cookie.remove('   ')).toThrow(
        'Key must be a non-empty string'
      );
    });
  });

  describe('has 方法', () => {
    beforeEach(() => {
      cookie.set('testKey', 'testValue');
    });

    it('应该对存在的 Cookie 返回 true', () => {
      expect(cookie.has('testKey')).toBe(true);
    });

    it('应该对不存在的 Cookie 返回 false', () => {
      expect(cookie.has('nonExistent')).toBe(false);
    });

    it('应该对无效键名返回 false', () => {
      expect(cookie.has('')).toBe(false);
      expect(cookie.has('   ')).toBe(false);
    });
  });

  describe('getAllKeys 方法', () => {
    beforeEach(() => {
      cookie.set('key1', 'value1');
      cookie.set('key2', 'value2');
      cookie.set('key3', 'value3');
    });

    it('应该返回所有相关的键名', () => {
      const keys = cookie.getAllKeys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
    });

    it('应该只返回带前缀的键名', () => {
      const prefixedCookie = new WebCookie({ prefix: 'app' });
      prefixedCookie.set('testKey', 'testValue');

      // 设置一个不带前缀的 Cookie
      mockCookieValue += '; otherKey=otherValue';

      const keys = prefixedCookie.getAllKeys();
      expect(keys).toContain('testKey');
      expect(keys).not.toContain('otherKey');
    });
  });

  describe('getAll 方法', () => {
    beforeEach(() => {
      cookie.set('key1', 'value1');
      cookie.set('key2', { name: '张三' });
      cookie.set('key3', 123);
    });

    it('应该返回所有相关的键值对', () => {
      const allCookies = cookie.getAll();
      expect(allCookies.key1).toBe('value1');
      expect(allCookies.key2).toEqual({ name: '张三' });
      expect(allCookies.key3).toBe(123);
    });

    it('应该只返回带前缀的 Cookie', () => {
      const prefixedCookie = new WebCookie({ prefix: 'app' });
      prefixedCookie.set('testKey', 'testValue');

      // 设置一个不带前缀的 Cookie
      mockCookieValue += '; otherKey=otherValue';

      const allCookies = prefixedCookie.getAll();
      expect(allCookies.testKey).toBe('testValue');
      expect(allCookies.otherKey).toBeUndefined();
    });
  });

  describe('clearAll 方法', () => {
    beforeEach(() => {
      cookie.set('key1', 'value1');
      cookie.set('key2', 'value2');
      cookie.set('key3', 'value3');
    });

    it('应该清空所有相关的 Cookie', () => {
      cookie.clearAll();
      expect(cookie.getAllKeys()).toHaveLength(0);
    });

    it('应该只清空带前缀的 Cookie', () => {
      const prefixedCookie = new WebCookie({ prefix: 'app' });
      prefixedCookie.set('testKey', 'testValue');

      // 设置一个不带前缀的 Cookie
      mockCookieValue += '; otherKey=otherValue';

      prefixedCookie.clearAll();
      expect(prefixedCookie.getAllKeys()).toHaveLength(0);
      expect(mockCookieValue).toContain('otherKey=otherValue');
    });
  });

  describe('错误处理', () => {
    it('应该调用错误回调', () => {
      const onError = vi.fn();
      const errorCookie = new WebCookie({ onError });

      expect(() => errorCookie.set('', 'value')).toThrow();
      expect(onError).toHaveBeenCalled();
    });

    it('应该在 get 方法中优雅处理错误', () => {
      const onError = vi.fn();
      const errorCookie = new WebCookie({ onError });

      const result = errorCookie.get('');
      expect(result).toBeNull();
      expect(onError).toHaveBeenCalled();
    });
  });

  describe('调试模式', () => {
    it('应该在调试模式下输出日志', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const debugCookie = new WebCookie({ debug: true });
      debugCookie.set('testKey', 'testValue');
      debugCookie.get('testKey');
      debugCookie.remove('testKey');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});

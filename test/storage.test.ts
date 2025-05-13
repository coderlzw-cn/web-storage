import { beforeEach, describe, expect, it, vi } from 'vitest';
import WebStorage from '../src/storage.js';

describe('WebStorage', () => {
  let storage: WebStorage;

  beforeEach(() => {
    // 清空所有存储
    localStorage.clear();
    sessionStorage.clear();
    // 创建默认实例
    storage = new WebStorage();
  });

  describe('构造函数和初始化', () => {
    it('应该使用默认配置创建实例', () => {
      const defaultStorage = new WebStorage();
      expect(defaultStorage).toBeInstanceOf(WebStorage);
    });

    it('应该使用自定义配置创建实例', () => {
      const customStorage = new WebStorage({
        storage: 'session',
        version: '2.0.0',
        prefix: 'test',
        encrypt: true,
        expire: 3_600_000,
        debug: true,
      });
      expect(customStorage).toBeInstanceOf(WebStorage);
    });

    it('应该验证无效的版本号', () => {
      expect(() => {
        new WebStorage({ version: 123 as any });
      }).toThrow('version must be a string');
    });

    it('应该验证无效的前缀', () => {
      expect(() => {
        new WebStorage({ prefix: 123 as any });
      }).toThrow('prefix must be a string');
    });

    it('应该验证无效的过期时间', () => {
      expect(() => {
        new WebStorage({ expire: -1 });
      }).toThrow('expire must be a non-negative number');
    });

    it('应该验证无效的错误回调', () => {
      expect(() => {
        new WebStorage({ onError: 'invalid' as any });
      }).toThrow('onError must be a function');
    });
  });

  describe('基本存储操作', () => {
    it('应该能够存储和获取字符串', () => {
      storage.set('testKey', 'testValue');
      expect(storage.get('testKey')).toBe('testValue');
    });

    it('应该能够存储和获取对象', () => {
      const testObj = { name: 'test', value: 123 };
      storage.set('testObj', testObj);
      expect(storage.get('testObj')).toEqual(testObj);
    });

    it('应该能够存储和获取数组', () => {
      const testArray = [1, 2, 3, 'test'];
      storage.set('testArray', testArray);
      expect(storage.get('testArray')).toEqual(testArray);
    });

    it('应该能够存储和获取布尔值', () => {
      storage.set('testBool', true);
      expect(storage.get('testBool')).toBe(true);
    });

    it('应该能够存储和获取null值', () => {
      storage.set('testNull', null);
      expect(storage.get('testNull')).toBeNull();
    });

    it('应该返回null当键不存在时', () => {
      expect(storage.get('nonExistentKey')).toBeNull();
    });

    it('应该验证无效的键名', () => {
      expect(() => {
        storage.set('', 'value');
      }).toThrow('Key must be a non-empty string');

      expect(() => {
        storage.set(null as any, 'value');
      }).toThrow('Key must be a non-empty string');

      // get方法对于无效key会返回null而不是抛出错误（因为有try-catch处理）
      expect(storage.get('')).toBeNull();
      expect(storage.get(null as any)).toBeNull();
    });
  });

  describe('前缀功能', () => {
    it('应该使用前缀存储数据', () => {
      const prefixStorage = new WebStorage({ prefix: 'myApp' });
      prefixStorage.set('testKey', 'testValue');

      // 直接检查localStorage中的键名
      expect(localStorage.getItem('myApp:testKey')).toBeTruthy();
      expect(prefixStorage.get('testKey')).toBe('testValue');
    });

    it('不同前缀的存储应该互不干扰', () => {
      const storage1 = new WebStorage({ prefix: 'app1' });
      const storage2 = new WebStorage({ prefix: 'app2' });

      storage1.set('key', 'value1');
      storage2.set('key', 'value2');

      expect(storage1.get('key')).toBe('value1');
      expect(storage2.get('key')).toBe('value2');
    });
  });

  describe('存储类型', () => {
    it('应该使用localStorage作为默认存储', () => {
      const localStorageInstance = new WebStorage();
      localStorageInstance.set('testKey', 'testValue');
      expect(window.localStorage.getItem('testKey')).toBeTruthy();
    });

    it('应该能够使用sessionStorage', () => {
      const sessionStorageInstance = new WebStorage({ storage: 'session' });
      sessionStorageInstance.set('testKey', 'testValue');
      expect(sessionStorage.getItem('testKey')).toBeTruthy();
    });
  });

  describe('过期时间功能', () => {
    it('应该在过期前返回数据', () => {
      storage.set('testKey', 'testValue', { expire: 1000 }); // 1秒后过期
      expect(storage.get('testKey')).toBe('testValue');
    });

    it('应该在过期后返回null', async () => {
      storage.set('testKey', 'testValue', { expire: 10 }); // 10毫秒后过期

      // 等待过期
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(storage.get('testKey')).toBeNull();
    });

    it('应该使用默认过期时间', () => {
      const storageWithExpire = new WebStorage({ expire: 1000 });
      storageWithExpire.set('testKey', 'testValue');
      expect(storageWithExpire.get('testKey')).toBe('testValue');
    });

    it('应该验证无效的过期时间', () => {
      expect(() => {
        storage.set('testKey', 'testValue', { expire: -1 });
      }).toThrow('expire must be a non-negative number');
    });

    it('过期时间为0应该表示永不过期', () => {
      storage.set('testKey', 'testValue', { expire: 0 });
      expect(storage.get('testKey')).toBe('testValue');
    });
  });

  describe('加密功能', () => {
    it('应该能够加密存储数据', () => {
      const encryptStorage = new WebStorage({ encrypt: true });
      encryptStorage.set('testKey', 'testValue');

      // 检查存储的数据是否被加密（不等于原始值）
      const rawData = localStorage.getItem('testKey');
      expect(rawData).toBeTruthy();
      expect(rawData).not.toContain('testValue');

      // 但是能正确解密获取
      expect(encryptStorage.get('testKey')).toBe('testValue');
    });

    it('应该能够通过选项覆盖默认加密设置', () => {
      const noEncryptStorage = new WebStorage({ encrypt: false });
      noEncryptStorage.set('testKey', 'testValue', { encrypt: true });

      const rawData = localStorage.getItem('testKey');
      expect(rawData).toBeTruthy();
      expect(rawData).not.toContain('testValue');

      expect(noEncryptStorage.get('testKey')).toBe('testValue');
    });

    it('应该能够处理未加密的旧数据', () => {
      // 先存储未加密的数据
      const noEncryptStorage = new WebStorage({ encrypt: false });
      noEncryptStorage.set('testKey', 'testValue');

      // 然后用加密存储读取
      const encryptStorage = new WebStorage({ encrypt: true });
      expect(encryptStorage.get('testKey')).toBe('testValue');
    });
  });

  describe('版本处理', () => {
    it('应该忽略版本不匹配的数据', () => {
      const storage1 = new WebStorage({ version: '1.0.0' });
      storage1.set('testKey', 'testValue');

      const storage2 = new WebStorage({ version: '2.0.0' });
      expect(storage2.get('testKey')).toBeNull();
    });

    it('相同版本应该能正常读取数据', () => {
      const storage1 = new WebStorage({ version: '1.0.0' });
      storage1.set('testKey', 'testValue');

      const storage2 = new WebStorage({ version: '1.0.0' });
      expect(storage2.get('testKey')).toBe('testValue');
    });
  });

  describe('clearAll功能', () => {
    it('应该清空所有相关数据', () => {
      storage.set('key1', 'value1');
      storage.set('key2', 'value2');
      storage.set('key3', 'value3');

      expect(storage.get('key1')).toBe('value1');
      expect(storage.get('key2')).toBe('value2');
      expect(storage.get('key3')).toBe('value3');

      storage.clearAll();

      expect(storage.get('key1')).toBeNull();
      expect(storage.get('key2')).toBeNull();
      expect(storage.get('key3')).toBeNull();
    });

    it('应该只清空带前缀的数据', () => {
      const prefixStorage = new WebStorage({ prefix: 'myApp' });
      const normalStorage = new WebStorage();

      prefixStorage.set('key1', 'value1');
      normalStorage.set('key2', 'value2');

      prefixStorage.clearAll();

      expect(prefixStorage.get('key1')).toBeNull();
      expect(normalStorage.get('key2')).toBe('value2');
    });
  });

  describe('错误处理', () => {
    it('应该处理序列化错误', () => {
      const circularObj: any = {};
      circularObj.self = circularObj;

      expect(() => {
        storage.set('testKey', circularObj);
      }).toThrow();
    });

    it('应该处理损坏的存储数据', () => {
      // 直接在localStorage中存储损坏的数据
      localStorage.setItem('testKey', 'invalid json data');

      expect(storage.get('testKey')).toBeNull();
      // 损坏的数据应该被自动清除
      expect(localStorage.getItem('testKey')).toBeNull();
    });

    it('应该调用错误回调', () => {
      const errorCallback = vi.fn();
      const errorStorage = new WebStorage({ onError: errorCallback });

      const circularObj: any = {};
      circularObj.self = circularObj;

      try {
        errorStorage.set('testKey', circularObj);
      } catch (e) {
        // 预期会抛出错误
      }

      expect(errorCallback).toHaveBeenCalled();
    });
  });

  describe('调试模式', () => {
    it('应该在调试模式下输出日志', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const debugStorage = new WebStorage({ debug: true });
      debugStorage.set('testKey', 'testValue');
      debugStorage.get('testKey');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🚀 WebStorage Initialized'),
        expect.any(String),
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });

    it('应该在非调试模式下不输出日志', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const normalStorage = new WebStorage({ debug: false });
      normalStorage.set('testKey', 'testValue');
      normalStorage.get('testKey');

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('复杂场景测试', () => {
    it('应该处理加密数据的过期', async () => {
      const encryptStorage = new WebStorage({ encrypt: true });
      encryptStorage.set('testKey', 'testValue', { expire: 100 }); // 增加过期时间到100ms

      expect(encryptStorage.get('testKey')).toBe('testValue');

      await new Promise((resolve) => setTimeout(resolve, 120)); // 等待120ms确保过期

      expect(encryptStorage.get('testKey')).toBeNull();
    });

    it('应该处理带前缀的加密数据', () => {
      const prefixedStorage = new WebStorage({
        prefix: 'myApp',
        encrypt: true,
        version: '1.0.0',
      });

      const testData = {
        user: 'test',
        settings: { theme: 'dark', lang: 'zh' },
      };

      prefixedStorage.set('userConfig', testData);
      expect(prefixedStorage.get('userConfig')).toEqual(testData);

      // 验证数据确实被加密和添加了前缀
      const rawData = localStorage.getItem('myApp:userConfig');
      expect(rawData).toBeTruthy();
      expect(rawData).not.toContain('test');
      expect(rawData).not.toContain('dark');
    });

    it('应该处理多个实例同时操作', () => {
      const storage1 = new WebStorage({ prefix: 'app1' });
      const storage2 = new WebStorage({ prefix: 'app2' });
      const storage3 = new WebStorage({ encrypt: true });

      storage1.set('config', { app: 'app1' });
      storage2.set('config', { app: 'app2' });
      storage3.set('config', { app: 'encrypted' });

      expect(storage1.get('config')).toEqual({ app: 'app1' });
      expect(storage2.get('config')).toEqual({ app: 'app2' });
      expect(storage3.get('config')).toEqual({ app: 'encrypted' });

      storage1.clearAll();

      expect(storage1.get('config')).toBeNull();
      expect(storage2.get('config')).toEqual({ app: 'app2' });
      expect(storage3.get('config')).toEqual({ app: 'encrypted' });
    });
  });
});

import { beforeEach } from 'vitest';

// 模拟浏览器存储API
const createMockStorage = () => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };
};

// 在每个测试前重置存储
beforeEach(() => {
  Object.defineProperty(window, 'localStorage', {
    value: createMockStorage(),
    writable: true,
  });

  Object.defineProperty(window, 'sessionStorage', {
    value: createMockStorage(),
    writable: true,
  });
});

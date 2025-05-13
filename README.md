# @coderlzw/web-storage

一个功能强大的浏览器存储管理库，支持 localStorage、sessionStorage 和 Cookie 的统一管理，提供加密、过期时间、版本控制等高级功能。

## ✨ 特性

- 🚀 **统一 API**: 为 localStorage、sessionStorage 和 Cookie 提供一致的操作接口
- 🔐 **数据加密**: 内置 AES 加密，保护敏感数据
- ⏰ **过期管理**: 支持数据过期时间设置，自动清理过期数据
- 📦 **版本控制**: 支持数据版本管理，避免版本冲突
- 🏷️ **前缀支持**: 支持命名空间前缀，避免键名冲突
- 🔍 **调试模式**: 内置调试日志，便于开发调试
- 📝 **TypeScript**: 完整的 TypeScript 支持
- 🧪 **测试覆盖**: 完整的单元测试覆盖

## 📦 安装

```bash
npm install @coderlzw/web-storage
```

```bash
yarn add @coderlzw/web-storage
```

```bash
pnpm add @coderlzw/web-storage
```

## 🚀 快速开始

### WebStorage 基本使用

```typescript
import { WebStorage } from "@coderlzw/web-storage";

// 创建存储实例
const storage = new WebStorage({
  prefix: "myApp",
  encrypt: true,
  version: "1.0.0",
  debug: true
});

// 存储数据
storage.set("user", { name: "张三", age: 25 });

// 获取数据
const user = storage.get("user");
console.log(user); // { name: '张三', age: 25 }

// 设置过期时间（5分钟后过期）
storage.set("token", "abc123", { expire: 5 * 60 * 1000 });

// 清空所有数据
storage.clearAll();
```

### WebCookie 基本使用

```typescript
import { WebCookie } from "@coderlzw/web-storage";

// 创建 Cookie 实例
const cookie = new WebCookie({
  prefix: "myApp",
  encrypt: true,
  version: "1.0.0",
  maxAge: 7 * 24 * 60 * 60, // 7天
  path: "/",
  debug: true
});

// 设置 Cookie
cookie.set("theme", "dark");
cookie.set("user", { name: "张三", id: 123 });

// 设置带自定义选项的 Cookie
cookie.set("tempData", "value", {
  maxAge: 60 * 60, // 1小时
  secure: true,
  sameSite: "strict"
});

// 获取 Cookie
const theme = cookie.get("theme");
const user = cookie.get<{ name: string; id: number }>("user");

// 检查 Cookie 是否存在
if (cookie.has("theme")) {
  console.log("主题设置存在");
}

// 删除 Cookie
cookie.remove("theme");

// 获取所有 Cookie
const allCookies = cookie.getAll();

// 清空所有相关 Cookie
cookie.clearAll();
```

## 📚 API 文档

### WebStorage 类

#### 构造函数选项

```typescript
interface WebStorageOptions {
  storage?: "local" | "session"; // 存储类型，默认 'local'
  prefix?: string; // 键名前缀
  version?: string; // 数据版本
  encrypt?: boolean; // 是否加密，默认 false
  expire?: number; // 默认过期时间（毫秒）
  debug?: boolean; // 调试模式，默认 false
  onError?: (error: Error) => void; // 错误回调
}
```

#### 主要方法

```typescript
// 存储数据
set<T>(key: string, value: T, options?: SetOptions): void

// 获取数据
get<T>(key: string): T | null

// 删除数据
remove(key: string): void

// 清空所有数据
clearAll(): void

// 检查键是否存在
has(key: string): boolean

// 获取所有键名
keys(): string[]

// 获取存储大小
size(): number
```

### WebCookie 类

```typescript
// 构造函数
constructor(options?: WebCookieOptions)

// 设置 Cookie
set<T>(key: string, value: T, options?: SetCookieOptions): void

// 获取 Cookie
get<T>(key: string): T | null

// 删除 Cookie
remove(key: string, options?: Omit<SetCookieOptions, 'maxAge' | 'encrypt'>): void

// 检查 Cookie 是否存在
has(key: string): boolean

// 获取所有相关 Cookie 键名
getAllKeys(): string[]

// 获取所有相关 Cookie
getAll<T>(): Record<string, T>

// 清空所有相关 Cookie
clearAll(): void
```

#### WebCookie 选项

```typescript
interface WebCookieOptions {
  version?: string; // 数据版本号
  prefix?: string; // key 前缀
  encrypt?: boolean; // 是否加密
  maxAge?: number; // 默认过期时间（秒）
  path?: string; // 默认路径
  domain?: string; // 默认域名
  secure?: boolean; // 是否只在 HTTPS 中发送
  sameSite?: "strict" | "lax" | "none"; // SameSite 属性
  onError?: (err: Error) => void; // 错误回调
  debug?: boolean; // 是否打印调试信息
}

interface SetCookieOptions {
  maxAge?: number; // 过期时间（秒）
  expires?: string; // 过期时间（UTC 字符串）
  path?: string; // 路径
  domain?: string; // 域名
  secure?: boolean; // 是否只在 HTTPS 中发送
  sameSite?: "strict" | "lax" | "none"; // SameSite 属性
  encrypt?: boolean; // 是否加密
}
```

## 🌟 高级用法

### 数据加密

```typescript
const storage = new WebStorage({
  encrypt: true // 启用全局加密
});

// 或者单独为某个数据启用加密
storage.set("sensitiveData", "secret", { encrypt: true });
```

### 过期时间管理

```typescript
// 设置默认过期时间为 1 小时
const storage = new WebStorage({
  expire: 60 * 60 * 1000
});

// 为特定数据设置过期时间
storage.set("tempData", "value", { expire: 5 * 60 * 1000 }); // 5分钟

// 设置永不过期
storage.set("permanentData", "value", { expire: 0 });
```

### 版本控制

```typescript
const storage = new WebStorage({
  version: "2.0.0"
});

// 当版本不匹配时，旧数据将被忽略
const data = storage.get("userData"); // 只返回版本匹配的数据
```

### 错误处理

```typescript
const storage = new WebStorage({
  onError: (error) => {
    console.error("Storage error:", error);
    // 发送错误到监控系统
  }
});
```

## 🔧 开发

```bash
# 安装依赖
npm install

# 运行测试
npm test

# 构建
npm run build

# 开发模式
npm run dev
```

## 🧪 测试

项目包含完整的单元测试：

```bash
# 运行所有测试
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 以 UI 模式运行测试
npm run test:ui
```

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 🙋‍♂️ FAQ

### Q: 如何在服务端渲染（SSR）环境中使用？

A: 该库专为浏览器环境设计，在 SSR 环境中需要做相应的判断：

```typescript
import { WebStorage } from "@coderlzw/web-storage";

// 检查是否在浏览器环境
if (typeof window !== "undefined") {
  const storage = new WebStorage();
  // 使用存储功能
}
```

### Q: 数据加密安全吗？

A: 库使用 AES 算法进行数据加密，但请注意这只是客户端加密，主要用于防止普通用户直接查看存储的数据。对于真正敏感的数据，建议在服务端进行加密处理。

### Q: 如何处理存储空间不足的情况？

A: 当存储空间不足时，浏览器会抛出 `QuotaExceededError`。库内置了错误处理机制，你可以通过 `onError` 回调来处理这种情况：

```typescript
const storage = new WebStorage({
  onError: (error) => {
    if (error.name === "QuotaExceededError") {
      // 处理存储空间不足
      storage.clearAll(); // 清空存储或删除部分数据
    }
  }
});
```

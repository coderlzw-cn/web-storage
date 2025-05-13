/**
 * Web Storage - 一个功能强大的浏览器存储管理库
 * 支持 localStorage、sessionStorage 和 Cookie 的统一管理
 * 提供加密、过期时间、版本控制等高级功能
 */

// 导出 Cookie 相关功能
export { default as WebCookie } from './cookie';

// 导出 Storage 相关功能
export { default as WebStorage } from './storage';

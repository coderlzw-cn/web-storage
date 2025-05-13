import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm', 'iife'],
    dts: true, // 生成 dts 文件
    clean: true, // 清理 dist 目录
    sourcemap: true, // 生成 sourcemap 文件
    minify: true, // 压缩代码
    target: 'es2020', // 目标 es 版本
    external: ['crypto-js'], // 外部依赖
    banner: {
      js: '// @coderlzw/web-storage - A powerful browser storage management library', // 添加 banner 说明，
    },
    globalName: 'storageManager',
  },
]);

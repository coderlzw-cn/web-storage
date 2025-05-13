/**
 * semantic-release 配置文件
 * @type {import("semantic-release").GlobalConfig}
 *
 * branches: 指定哪些分支可以触发发布流程
 * plugins: 配置发布流程中使用的插件
 */
export default {
  // 支持的分支，release 和 main 分支均可发布
  branches: ['release', 'main'],
  plugins: [
    // 解析提交信息，决定版本号变更
    '@semantic-release/commit-analyzer',

    // 生成发布说明
    '@semantic-release/release-notes-generator',

    // 生成和更新 CHANGELOG.md
    '@semantic-release/changelog',

    // npm 相关操作，这里不自动发布到 npm
    [
      '@semantic-release/npm',
      {
        npmPublish: false,
      },
    ],
    // 提交变更到 git，包括 CHANGELOG.md 和 package.json
    [
      '@semantic-release/git',
      {
        assets: ['CHANGELOG.md', 'package.json'],
      },
    ],
    // 在 GitHub 上创建 release
    '@semantic-release/github',
  ],
};

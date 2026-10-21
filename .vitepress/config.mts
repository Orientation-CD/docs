import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'
import { navigation, sidebar } from './navigation.mjs'
import { tokenize } from './search.mjs'

const config = withMermaid(defineConfig({
  base: '/docs/',
  cleanUrls: true,
  lastUpdated: true,
  srcExclude: ['README.md', 'sources/**', 'scripts/**', 'tests/**', 'playwright-report/**', 'test-results/**'],
  head: [
    ['meta', { name: 'theme-color', content: '#526F5A' }],
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/docs/favicon.svg' }],
  ],
  mermaid: { theme: 'neutral', securityLevel: 'strict' },
  themeConfig: {
    logo: '/favicon.svg',
    socialLinks: [{ icon: 'github', link: 'https://github.com/Orientation-CD' }],
    search: {
      provider: 'local',
      options: {
        detailedView: true,
        miniSearch: {
          options: { tokenize },
          searchOptions: { combineWith: 'AND', prefix: true },
        },
        locales: {
          zh: {
            translations: {
              button: { buttonText: '搜索文档', buttonAriaLabel: '搜索全部中文文档' },
              modal: {
                displayDetails: '显示详细结果', resetButtonTitle: '清除搜索',
                backButtonTitle: '关闭搜索', noResultsText: '没有找到结果，请尝试其他关键词。',
                footer: {
                  selectText: '选择', selectKeyAriaLabel: '回车', navigateText: '切换结果',
                  navigateUpKeyAriaLabel: '上箭头', navigateDownKeyAriaLabel: '下箭头',
                  closeText: '关闭', closeKeyAriaLabel: '退出',
                },
              },
            },
          },
        },
      },
    },
  },
  locales: {
    root: {
      label: 'English', lang: 'en-US', title: 'YuanZhu AI Docs',
      description: 'Learn, develop and operate YuanZhu AI: mini programs, workflows, administration and deployment.',
      themeConfig: {
        nav: navigation('en'), sidebar: sidebar('en'),
        editLink: { pattern: 'https://github.com/Orientation-CD/docs/edit/main/:path', text: 'Edit this page on GitHub' },
        lastUpdated: { text: 'Page updated', formatOptions: { dateStyle: 'medium' } },
        outline: { label: 'On this page', level: [2, 3] },
        docFooter: { prev: 'Previous', next: 'Next' },
        footer: { message: 'Maintained by Orientation-CD · Source versions are recorded in Reference.', copyright: 'Copyright © 2026 Orientation-CD' },
      },
    },
    zh: {
      label: '简体中文', lang: 'zh-CN', title: '圆筑 AI 文档',
      description: '从第一次运行到开发与运维：圆筑 AI 小程序、工作流、管理后台与部署文档。',
      themeConfig: {
        nav: navigation('zh'), sidebar: sidebar('zh'),
        editLink: { pattern: 'https://github.com/Orientation-CD/docs/edit/main/:path', text: '在 GitHub 上编辑此页' },
        lastUpdated: { text: '页面更新时间', formatOptions: { dateStyle: 'medium' } },
        outline: { label: '本页目录', level: [2, 3] },
        docFooter: { prev: '上一页', next: '下一页' },
        darkModeSwitchLabel: '外观', lightModeSwitchTitle: '切换浅色主题', darkModeSwitchTitle: '切换深色主题',
        sidebarMenuLabel: '目录', returnToTopLabel: '返回顶部', langMenuLabel: '切换语言', skipToContentLabel: '跳转到正文',
        notFound: { title: '页面未找到', quote: '页面可能已迁移。请使用搜索或从首页继续阅读。', linkLabel: '返回首页', linkText: '返回首页' },
        footer: { message: '由 Orientation-CD 团队维护 · 源码核验版本见参考文档。', copyright: 'Copyright © 2026 Orientation-CD' },
      },
    },
  },
}))

// The plugin's bare CJS includes assume hoisted dependencies and predate
// Mermaid 11. Prebundle its actual import entry so all nested CommonJS modules
// receive browser interop under pnpm, including dynamically loaded diagrams.
const legacyMermaidIncludes = new Set(['@braintree/sanitize-url', 'dayjs', 'debug', 'cytoscape-cose-bilkent', 'cytoscape'])
config.vite!.optimizeDeps!.include = [
  ...config.vite!.optimizeDeps!.include!.filter(dependency => !legacyMermaidIncludes.has(dependency)),
  'mermaid',
]

export default config

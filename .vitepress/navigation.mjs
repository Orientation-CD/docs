// Shared topic IDs prevent English/Chinese navigation from drifting apart.
const topics = {
  start: ['Get started', '入门', [
    ['get-started/introduction', 'Introduction', '产品介绍'],
    ['get-started/macos-setup', 'Prepare your Mac', '准备你的 Mac'],
    ['get-started/quickstart', 'First complete workflow', '第一个完整工作流'],
    ['get-started/architecture', 'System architecture', '架构总览'],
    ['get-started/glossary', 'Glossary', '基础术语'],
    ['get-started/faq', 'Troubleshooting', '常见问题与排障'],
  ]],
  frontend: ['Frontend', '前端', [
    ['frontend/overview', 'Overview', '概览'], ['frontend/getting-started', 'Development setup', '开发入门'],
    ['frontend/architecture', 'Code map and state', '代码地图与状态'], ['frontend/data-source-modes', 'Build and data modes', '构建与数据源模式'],
    ['frontend/workflows', 'Feature workflows', '功能工作流'], ['frontend/projects', 'Projects and collaboration', '项目与协作'],
    ['frontend/platforms', 'WeChat and Douyin', '微信与抖音'], ['frontend/key-flows', 'User journeys', '核心用户流程'],
    ['frontend/design-system', 'Design system', '设计系统'], ['frontend/testing', 'Testing and quality', '测试与质量门禁'],
  ]],
  backend: ['Backend', '后端', [
    ['backend/overview', 'Overview', '概览'], ['backend/getting-started', 'Development setup', '开发入门'],
    ['backend/architecture', 'Architecture and code map', '架构与代码地图'], ['backend/authentication', 'Authentication', '认证与授权'],
    ['backend/workflows', 'Workflow execution', '工作流执行'], ['backend/design-jobs', 'Lifecycle and compatibility', '生命周期与兼容接口'],
    ['backend/voice', 'Voice summaries and file handoff', '语音总结与文件接力'], ['backend/copywriting', 'AI copywriting', 'AI 文案'],
    ['backend/video', 'Video generation', '视频生成'], ['backend/reports', 'Reports and PowerPoint', '报告与 PowerPoint'],
    ['backend/projects', 'Private projects and activity', '私有项目与活动'], ['backend/workspaces-orgs', 'Workspaces and organizations', '工作区与组织'],
    ['backend/billing-tokens', 'Billing and payments', '计费与支付'], ['backend/assets-storage', 'Assets and storage', '资产与对象存储'],
    ['backend/observability', 'Diagnostics and recovery', '诊断与恢复'],
  ]],
  admin: ['Administration', '管理后台', [
    ['admin/overview', 'Overview', '概览'], ['admin/getting-started', 'Access and first configuration', '访问与首次配置'],
    ['admin/tech-stack', 'Developer guide', '开发者指南'], ['admin/dashboard', 'Dashboard', '仪表盘'],
    ['admin/users', 'Users', '用户与账户'], ['admin/workspaces', 'Workspaces', '工作区'],
    ['admin/billing', 'Features, plans and tokens', '功能、套餐与积分'], ['admin/workflows', 'Workflow nodes', '工作流节点'],
    ['admin/providers', 'Connections and models', '连接与模型'], ['admin/prompts', 'Prompt templates', '提示词模板'],
    ['admin/design-jobs', 'Workflow diagnostics', '工作流诊断'], ['admin/assets', 'Assets', '资产管理'],
    ['admin/campaigns', 'Campaigns', '营销活动'], ['admin/marketing', 'Marketing data', '营销数据'],
    ['admin/finance', 'Finance and reconciliation', '财务与对账'], ['admin/performance', 'Performance', '性能监控'],
    ['admin/legal-documents', 'Legal documents', '法律文档'],
  ]],
  deploy: ['Deployment and testing', '部署与测试', [
    ['deploy/local-stack', 'Local stack', '本地开发栈'], ['testing/storage-environments', 'MinIO and OSS testing', 'MinIO 与 OSS 测试'],
    ['deploy/cloud-architecture', 'Cloud architecture', '云架构'], ['deploy/sae-deployment', 'SAE runbook', 'SAE 部署手册'],
    ['deploy/ci-cd', 'CI/CD', '持续集成与发布'], ['deploy/production', 'Promotion and recovery', '生产发布与恢复'],
  ]],
  reference: ['Reference', '参考', [
    ['reference/rest-api', 'REST API guide', 'REST API 指南'], ['reference/openapi', 'OpenAPI', 'OpenAPI'],
    ['reference/data-model', 'Data model', '数据模型'], ['reference/configuration', 'Configuration', '配置参考'],
    ['reference/douyin-payment', 'Douyin payments', '抖音支付'],
    ['reference/flows/wechat-login-flow', 'Login flow', '登录链路'], ['reference/flows/design-job-lifecycle', 'Workflow lifecycle', '工作流生命周期'],
    ['reference/flows/asset-upload-flow', 'Asset upload', '资产上传链路'], ['reference/flows/payment-flow', 'Payment flow', '支付链路'],
    ['reference/flows/report-view-flow', 'Report outputs', '报告产物链路'], ['reference/flows/workspace-membership-flow', 'Workspace membership', '工作区成员链路'],
    ['reference/source-revisions', 'Verified source versions', '已核验源码版本'], ['reference/maintenance', 'Maintain these docs', '维护本文档'],
  ]],
}
export const localLink = (route, locale) => `${locale === 'zh' ? '/zh' : ''}/${route}`
const text = (row, locale) => row[locale === 'zh' ? 2 : 1]
export const topicRoutes = Object.values(topics).flatMap((section) => section[2].map((row) => row[0]))
function section(key, locale) {
  const [en, zh, rows] = topics[key]
  return { text: locale === 'zh' ? zh : en, collapsed: false, items: rows.map((row) => ({ text: text(row, locale), link: localLink(row[0], locale) })) }
}
export function navigation(locale) {
  const link = (route) => localLink(route, locale)
  const zh = locale === 'zh'
  return [
    { text: zh ? '入门' : 'Get started', link: link('get-started/introduction') },
    { text: zh ? '开发指南' : 'Development', items: [
      { text: zh ? '前端' : 'Frontend', link: link('frontend/overview') },
      { text: zh ? '后端' : 'Backend', link: link('backend/overview') },
    ] },
    { text: zh ? '管理后台' : 'Administration', link: link('admin/overview') },
    { text: zh ? '部署与测试' : 'Deploy and test', link: link('deploy/local-stack') },
    { text: zh ? '参考' : 'Reference', link: link('reference/rest-api') },
  ]
}
export function sidebar(locale) {
  const prefix = locale === 'zh' ? '/zh' : ''
  return Object.fromEntries([
    ['get-started', ['start']], ['frontend', ['frontend']], ['backend', ['backend']],
    ['admin', ['admin']], ['deploy', ['deploy']], ['testing', ['deploy']], ['reference', ['reference']],
  ].map(([root, keys]) => [`${prefix}/${root}/`, keys.map((key) => section(key, locale))]))
}

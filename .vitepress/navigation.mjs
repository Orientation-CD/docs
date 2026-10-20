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
  refLearn: ['Learn the system', '读懂系统', [
    ['reference/system-walkthrough', 'From an action to stored evidence', '从操作追到存储证据'],
  ]],
  refIdentity: ['Identity and inputs', '身份与输入', [
    ['reference/flows/wechat-login-flow', 'Login, consent and sessions', '登录、同意与会话'],
    ['reference/flows/discovery-prompts-flow', 'Discovery and prompt configuration', '功能发现与提示词配置'],
    ['reference/flows/asset-upload-flow', 'Upload, verify and reuse Assets', '上传、核验与复用资产'],
    ['reference/flows/voice-upload-flow', 'Browser audio handoff', '浏览器音频接力'],
  ]],
  refWorkflow: ['Execution and results', '执行与产物', [
    ['reference/flows/design-job-lifecycle', 'Admission, queues and workers', '准入、队列与 worker'],
    ['reference/flows/workflow-products-flow', 'Image, voice, copywriting and video', '图片、语音、文案与视频分支'],
    ['reference/flows/report-view-flow', 'Report graph, HTML and PPTX', '报告图、HTML 与 PPTX'],
    ['reference/flows/workflow-history-flow', 'History, retry, move and deletion', '历史、重试、移动与删除'],
  ]],
  refBusiness: ['Collaboration and payments', '协作与交易', [
    ['reference/flows/project-flow', 'Projects, outcomes and cleanup', '项目、成交流失与清理'],
    ['reference/flows/workspace-membership-flow', 'Workspaces, members and invitations', '空间、成员与邀请'],
    ['reference/flows/referral-rewards-flow', 'Referral attribution and rewards', '推荐归因与奖励'],
    ['reference/flows/payment-flow', 'Purchase, callback and settlement', '购买、回调与结算'],
    ['reference/douyin-payment', 'Douyin channel and RSA', '抖音渠道与 RSA'],
    ['reference/flows/refund-flow', 'Refunds and reconciliation', '退款与对账'],
  ]],
  reference: ['Diagnosis and API reference', '诊断与接口索引', [
    ['reference/flows/runtime-debugging', 'Trace one task through the runtime', '跨进程追踪一个任务'],
    ['reference/rest-api', 'Every API and its full chain', '逐 API 全链路索引'],
    ['reference/openapi', 'OpenAPI boundaries', 'OpenAPI 边界'],
    ['reference/data-model', 'Data model', '数据模型'],
    ['reference/configuration', 'Configuration', '配置参考'],
    ['reference/source-revisions', 'Verified source versions', '已核验源码版本'],
    ['reference/maintenance', 'Maintain these docs', '维护本文档'],
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
    { text: zh ? '全链路参考' : 'Reference', link: link('reference/system-walkthrough') },
  ]
}
export function sidebar(locale) {
  const prefix = locale === 'zh' ? '/zh' : ''
  return Object.fromEntries([
    ['get-started', ['start']], ['frontend', ['frontend']], ['backend', ['backend']],
    ['admin', ['admin']], ['deploy', ['deploy']], ['testing', ['deploy']], ['reference', ['refLearn', 'refIdentity', 'refWorkflow', 'refBusiness', 'reference']],
  ].map(([root, keys]) => [`${prefix}/${root}/`, keys.map((key) => section(key, locale))]))
}

import { defineConfig } from "vitepress";

// ── Shared sidebar builders ──────────────────────────────────────────────
// Each function returns the sidebar for one locale. Links are locale-rooted
// (e.g. "/get-started/introduction") so VitePress resolves them under the
// active locale automatically.

function sidebarEn() {
  return {
    "/get-started/": [
      {
        text: "Get Started",
        items: [
          { text: "Introduction", link: "/get-started/introduction" },
          { text: "Architecture Overview", link: "/get-started/architecture" },
          { text: "Quick Start", link: "/get-started/quickstart" },
          { text: "Glossary", link: "/get-started/glossary" },
          { text: "FAQ", link: "/get-started/faq" },
        ],
      },
    ],
    "/frontend/": [
      {
        text: "Frontend",
        items: [
          { text: "Overview", link: "/frontend/overview" },
          { text: "Getting Started", link: "/frontend/getting-started" },
          { text: "Architecture", link: "/frontend/architecture" },
          { text: "Data Source Modes", link: "/frontend/data-source-modes" },
          { text: "Key User Flows", link: "/frontend/key-flows" },
          { text: "Design System", link: "/frontend/design-system" },
          { text: "Testing & Quality Gates", link: "/frontend/testing" },
        ],
      },
    ],
    "/backend/": [
      {
        text: "Backend",
        items: [
          { text: "Overview", link: "/backend/overview" },
          { text: "Getting Started", link: "/backend/getting-started" },
          { text: "Architecture & Components", link: "/backend/architecture" },
          { text: "Authentication", link: "/backend/authentication" },
          { text: "Design Jobs", link: "/backend/design-jobs" },
          { text: "Billing & Tokens", link: "/backend/billing-tokens" },
          { text: "Assets & Object Storage", link: "/backend/assets-storage" },
          { text: "Reports", link: "/backend/reports" },
          { text: "Workspaces & Organizations", link: "/backend/workspaces-orgs" },
          { text: "Observability & Safety", link: "/backend/observability" },
        ],
      },
    ],
    "/admin/": [
      {
        text: "Admin Console (Studio Control)",
        items: [
          { text: "Overview", link: "/admin/overview" },
          { text: "Tech Stack for Developers", link: "/admin/tech-stack" },
          { text: "Getting Started & Access", link: "/admin/getting-started" },
          { text: "Dashboard & Alerts", link: "/admin/dashboard" },
          { text: "Users & Accounts", link: "/admin/users" },
          { text: "Workspaces", link: "/admin/workspaces" },
          { text: "Billing & Tokens", link: "/admin/billing" },
          { text: "Campaigns", link: "/admin/campaigns" },
          { text: "Marketing Data", link: "/admin/marketing" },
          { text: "Finance", link: "/admin/finance" },
          { text: "Performance", link: "/admin/performance" },
          { text: "Design Jobs", link: "/admin/design-jobs" },
          { text: "Assets", link: "/admin/assets" },
          { text: "Legal Documents", link: "/admin/legal-documents" },
          { text: "Prompt Templates", link: "/admin/prompts" },
          { text: "Report Templates", link: "/admin/report-templates" },
          { text: "Model Providers & Catalogs", link: "/admin/providers" },
        ],
      },
    ],
    "/deploy/": [
      {
        text: "Deploy",
        items: [
          { text: "Local Development Stack", link: "/deploy/local-stack" },
          { text: "Cloud Architecture (Aliyun SAE)", link: "/deploy/cloud-architecture" },
          { text: "SAE Deployment Runbook", link: "/deploy/sae-deployment" },
          { text: "CI/CD with GitHub Actions", link: "/deploy/ci-cd" },
          { text: "Production Promotion & Rollback", link: "/deploy/production" },
        ],
      },
    ],
    "/testing/": [
      {
        text: "Testing",
        items: [
          { text: "Local MinIO and Alibaba OSS", link: "/testing/storage-environments" },
        ],
      },
    ],
    "/reference/": [
      {
        text: "Reference",
        items: [
          { text: "REST API Overview", link: "/reference/rest-api" },
          { text: "Data Model", link: "/reference/data-model" },
          { text: "Configuration Reference", link: "/reference/configuration" },
          { text: "OpenAPI", link: "/reference/openapi" },
          { text: "Douyin Payment Guide", link: "/reference/douyin-payment" },
        ],
      },
      {
        text: "End-to-End Call Chains",
        items: [
          { text: "WeChat Login Flow", link: "/reference/flows/wechat-login-flow" },
          { text: "Design Job Lifecycle", link: "/reference/flows/design-job-lifecycle" },
          { text: "Asset Upload Flow", link: "/reference/flows/asset-upload-flow" },
          { text: "Payment Flow", link: "/reference/flows/payment-flow" },
          { text: "Report Viewing Flow", link: "/reference/flows/report-view-flow" },
          { text: "Workspace Membership Flow", link: "/reference/flows/workspace-membership-flow" },
        ],
      },
    ],
  };
}

function sidebarZh() {
  return {
    "/get-started/": [
      {
        text: "入门指南",
        items: [
          { text: "产品介绍", link: "/get-started/introduction" },
          { text: "架构总览", link: "/get-started/architecture" },
          { text: "快速开始", link: "/get-started/quickstart" },
          { text: "术语表", link: "/get-started/glossary" },
          { text: "常见问题", link: "/get-started/faq" },
        ],
      },
    ],
    "/frontend/": [
      {
        text: "前端",
        items: [
          { text: "概览", link: "/frontend/overview" },
          { text: "开发入门", link: "/frontend/getting-started" },
          { text: "架构设计", link: "/frontend/architecture" },
          { text: "数据源模式", link: "/frontend/data-source-modes" },
          { text: "核心用户流程", link: "/frontend/key-flows" },
          { text: "设计系统", link: "/frontend/design-system" },
          { text: "测试与质量门禁", link: "/frontend/testing" },
        ],
      },
    ],
    "/backend/": [
      {
        text: "后端",
        items: [
          { text: "概览", link: "/backend/overview" },
          { text: "开发入门", link: "/backend/getting-started" },
          { text: "架构与组件", link: "/backend/architecture" },
          { text: "认证与授权", link: "/backend/authentication" },
          { text: "设计作业", link: "/backend/design-jobs" },
          { text: "计费与积分", link: "/backend/billing-tokens" },
          { text: "资产与对象存储", link: "/backend/assets-storage" },
          { text: "报告系统", link: "/backend/reports" },
          { text: "工作区与组织", link: "/backend/workspaces-orgs" },
          { text: "可观测性与安全", link: "/backend/observability" },
        ],
      },
    ],
    "/admin/": [
      {
        text: "管理后台（Studio Control）",
        items: [
          { text: "概览", link: "/admin/overview" },
          { text: "技术栈（面向开发）", link: "/admin/tech-stack" },
          { text: "入门与访问", link: "/admin/getting-started" },
          { text: "仪表盘与告警", link: "/admin/dashboard" },
          { text: "用户与账户", link: "/admin/users" },
          { text: "工作区", link: "/admin/workspaces" },
          { text: "计费与积分", link: "/admin/billing" },
          { text: "营销活动", link: "/admin/campaigns" },
          { text: "营销数据", link: "/admin/marketing" },
          { text: "财务", link: "/admin/finance" },
          { text: "性能监控", link: "/admin/performance" },
          { text: "设计作业", link: "/admin/design-jobs" },
          { text: "资产管理", link: "/admin/assets" },
          { text: "法律文档", link: "/admin/legal-documents" },
          { text: "提示词模板", link: "/admin/prompts" },
          { text: "报告模板", link: "/admin/report-templates" },
          { text: "模型提供商与目录", link: "/admin/providers" },
        ],
      },
    ],
    "/deploy/": [
      {
        text: "部署",
        items: [
          { text: "本地开发环境", link: "/deploy/local-stack" },
          { text: "云架构（阿里云 SAE）", link: "/deploy/cloud-architecture" },
          { text: "SAE 部署手册", link: "/deploy/sae-deployment" },
          { text: "CI/CD 与 GitHub Actions", link: "/deploy/ci-cd" },
          { text: "生产发布与回滚", link: "/deploy/production" },
        ],
      },
    ],
    "/testing/": [
      {
        text: "测试",
        items: [
          { text: "本地 MinIO 与阿里云 OSS", link: "/testing/storage-environments" },
        ],
      },
    ],
    "/reference/": [
      {
        text: "参考",
        items: [
          { text: "REST API 概览", link: "/reference/rest-api" },
          { text: "数据模型", link: "/reference/data-model" },
          { text: "配置参考", link: "/reference/configuration" },
          { text: "OpenAPI", link: "/reference/openapi" },
          { text: "抖音支付接入指南", link: "/reference/douyin-payment" },
        ],
      },
      {
        text: "端到端调用链路",
        items: [
          { text: "微信登录流程", link: "/reference/flows/wechat-login-flow" },
          { text: "设计作业生命周期", link: "/reference/flows/design-job-lifecycle" },
          { text: "资产上传流程", link: "/reference/flows/asset-upload-flow" },
          { text: "支付流程", link: "/reference/flows/payment-flow" },
          { text: "报告查看流程", link: "/reference/flows/report-view-flow" },
          { text: "工作区成员流程", link: "/reference/flows/workspace-membership-flow" },
        ],
      },
    ],
  };
}

function navEn() {
  return [
    { text: "Home", link: "/" },
    { text: "Get Started", link: "/get-started/introduction" },
    { text: "Frontend", link: "/frontend/overview" },
    { text: "Backend", link: "/backend/overview" },
    { text: "Admin", link: "/admin/overview" },
    { text: "Deploy", link: "/deploy/local-stack" },
    { text: "Testing", link: "/testing/storage-environments" },
    { text: "Reference", link: "/reference/rest-api" },
  ];
}

function navZh() {
  return [
    { text: "首页", link: "/" },
    { text: "入门", link: "/get-started/introduction" },
    { text: "前端", link: "/frontend/overview" },
    { text: "后端", link: "/backend/overview" },
    { text: "管理后台", link: "/admin/overview" },
    { text: "部署", link: "/deploy/local-stack" },
    { text: "测试", link: "/testing/storage-environments" },
    { text: "参考", link: "/reference/rest-api" },
  ];
}

export default defineConfig({
  base: "/docs/",
  cleanUrls: true,
  srcExclude: ["README.md"],
  head: [
    ["meta", { name: "theme-color", content: "#526F5A" }],
    ["link", { rel: "icon", type: "image/svg+xml", href: "/docs/favicon.svg" }],
  ],
  locales: {
    root: {
      label: "English",
      lang: "en-US",
      title: "YuanZhu AI Docs",
      description:
        "From zero to hero — documentation for the YuanZhu AI interior-design WeChat mini program: frontend, backend, admin, deployment and end-to-end reference.",
      themeConfig: {
        logo: "/docs/favicon.svg",
        nav: navEn(),
        sidebar: sidebarEn(),
        search: {
          provider: "local",
          options: {
            translations: {
              button: { buttonText: "Search", buttonAriaLabel: "Search" },
            },
          },
        },
        editLink: {
          pattern: "https://github.com/Orientation-CD/docs/edit/main/:path",
          text: "Edit this page on GitHub",
        },
        lastUpdated: {
          text: "Last updated",
          formatOptions: { dateStyle: "short", timeStyle: "medium" },
        },
        outline: { label: "On this page", level: [2, 3] },
        docFooter: { prev: "Previous", next: "Next" },
        footer: {
          message: "Built with VitePress. Maintained by the Orientation-CD team.",
          copyright: "Copyright © 2026 Orientation-CD",
        },
        socialLinks: [
          { icon: "github", link: "https://github.com/Orientation-CD" },
        ],
      },
    },
    zh: {
      label: "简体中文",
      lang: "zh-CN",
      title: "圆筑 AI 文档",
      description:
        "从零到精通 —— 圆筑 AI 室内设计微信小程序文档：前端、后端、管理后台、部署与端到端参考。",
      themeConfig: {
        logo: "/docs/favicon.svg",
        nav: navZh(),
        sidebar: sidebarZh(),
        search: {
          provider: "local",
          options: {
            translations: {
              button: { buttonText: "搜索", buttonAriaLabel: "搜索" },
            },
          },
        },
        editLink: {
          pattern: "https://github.com/Orientation-CD/docs/edit/main/:path",
          text: "在 GitHub 上编辑此页",
        },
        lastUpdated: {
          text: "最后更新",
          formatOptions: { dateStyle: "short", timeStyle: "medium" },
        },
        outline: { label: "本页目录", level: [2, 3] },
        docFooter: { prev: "上一页", next: "下一页" },
        footer: {
          message: "基于 VitePress 构建，由 Orientation-CD 团队维护。",
          copyright: "Copyright © 2026 Orientation-CD",
        },
        socialLinks: [
          { icon: "github", link: "https://github.com/Orientation-CD" },
        ],
      },
    },
  },
});

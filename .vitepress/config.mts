import { defineConfig } from "vitepress";

const sidebar = {
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
        { text: "Admin Site", link: "/backend/admin" },
        { text: "Observability & Safety", link: "/backend/observability" },
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
  "/reference/": [
    {
      text: "Reference",
      items: [
        { text: "REST API Overview", link: "/reference/rest-api" },
        { text: "Data Model", link: "/reference/data-model" },
        { text: "Configuration Reference", link: "/reference/configuration" },
        { text: "OpenAPI", link: "/reference/openapi" },
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

export default defineConfig({
  title: "YuanZhu AI Docs",
  description:
    "From zero to hero — documentation for the YuanZhu AI interior-design WeChat mini program: frontend, backend, deployment and end-to-end reference.",
  lang: "en-US",
  base: "/docs/",
  cleanUrls: true,
  srcExclude: ["README.md"],
  head: [
    ["meta", { name: "theme-color", content: "#526F5A" }],
    ["link", { rel: "icon", type: "image/svg+xml", href: "/docs/favicon.svg" }],
  ],
  themeConfig: {
    logo: "/docs/favicon.svg",
    nav: [
      { text: "Home", link: "/" },
      { text: "Get Started", link: "/get-started/introduction" },
      { text: "Frontend", link: "/frontend/overview" },
      { text: "Backend", link: "/backend/overview" },
      { text: "Deploy", link: "/deploy/local-stack" },
      { text: "Reference", link: "/reference/rest-api" },
    ],
    sidebar,
    search: {
      provider: "local",
      options: {
        translations: {
          button: { buttonText: "Search", buttonAriaLabel: "Search" },
        },
      },
    },
    editLink: {
      pattern:
        "https://github.com/Orientation-CD/docs/edit/main/:path",
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
});

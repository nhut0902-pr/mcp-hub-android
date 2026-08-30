import type { McpApiKeyHeader, McpAuthMode, McpTransport } from "./types";

export type McpCatalogEntry = {
  id: string;
  name: string;
  endpoint: string;
  transport: McpTransport;
  authMode: McpAuthMode;
  apiKeyHeader?: McpApiKeyHeader;
  detail: string;
  docsUrl: string;
  readOnlyHint?: string;
};

export const mcpCatalog: McpCatalogEntry[] = [
  // ─── Social Media & Posting ───
  { id: "zernio", name: "Zernio", endpoint: "https://mcp.zernio.com/mcp", transport: "streamable-http", authMode: "api-key", apiKeyHeader: "Authorization", detail: "280+ tools, 15 social platforms (TikTok, Facebook, Instagram, X, LinkedIn...). Đăng bài, lên lịch, comment, DM, analytics. Bearer token = API key từ dashboard Zernio.", docsUrl: "https://zernio.com/agents" },
  { id: "vibemarketing", name: "VibeMarketing", endpoint: "https://vibemarketing.ninja/mcp", transport: "streamable-http", authMode: "oauth", detail: "Tự động hoá social media marketing — tạo nội dung, lên lịch, đăng bài.", docsUrl: "https://vibemarketing.ninja" },
  { id: "tweetsave", name: "TweetSave", endpoint: "https://mcp.tweetsave.org/sse", transport: "sse", authMode: "none", detail: "Tải video Twitter/X — không cần auth.", docsUrl: "https://tweetsave.org" },

  // ─── Composio (API key) ───
  { id: "composio", name: "Composio", endpoint: "https://backend.composio.dev/v3/mcp/YOUR_SERVER_ID?user_id=YOUR_USER_ID", transport: "streamable-http", authMode: "api-key", apiKeyHeader: "x-api-key", detail: "MCP theo user cho 1.000+ toolkit. Tạo session/server trên Composio, thay SERVER_ID và USER_ID, rồi dán Composio API key. Lấy key tại composio.dev → Settings → API Keys.", docsUrl: "https://docs.composio.dev/docs/single-toolkit-mcp" },

  // ─── Project Management & CRM ───
  { id: "notion", name: "Notion", endpoint: "https://mcp.notion.com/mcp", transport: "streamable-http", authMode: "oauth", detail: "Workspace docs và pages qua OAuth.", docsUrl: "https://developers.notion.com/guides/mcp/get-started-with-mcp" },
  { id: "linear", name: "Linear", endpoint: "https://mcp.linear.app/mcp", transport: "streamable-http", authMode: "oauth", detail: "Issues, projects, cycles. OAuth, Bearer token hoặc API key.", docsUrl: "https://linear.app/docs/mcp", readOnlyHint: "Dùng https://mcp.linear.app/mcp/readonly khi chỉ cần đọc." },
  { id: "asana", name: "Asana", endpoint: "https://mcp.asana.com/sse", transport: "sse", authMode: "oauth", detail: "Quản lý dự án, tasks, deadlines qua OAuth.", docsUrl: "https://developers.asana.com/docs/mcp" },
  { id: "attio", name: "Attio", endpoint: "https://mcp.attio.com/mcp", transport: "streamable-http", authMode: "oauth", detail: "CRM hiện đại — contacts, deals, lists qua OAuth.", docsUrl: "https://attio.com/docs/mcp" },
  { id: "monday", name: "monday.com", endpoint: "https://mcp.monday.com/sse", transport: "sse", authMode: "oauth", detail: "Boards, items, columns, teams qua OAuth.", docsUrl: "https://developer.monday.com/api-reference/mcp" },
  { id: "hubspot", name: "HubSpot", endpoint: "https://app.hubspot.com/mcp/v1/http", transport: "streamable-http", authMode: "oauth", detail: "CRM — contacts, companies, deals, tickets qua OAuth.", docsUrl: "https://developers.hubspot.com/docs/mcp" },
  { id: "atlassian", name: "Atlassian (Jira+Confluence)", endpoint: "https://mcp.atlassian.com/v1/sse", transport: "sse", authMode: "oauth", detail: "Jira issues + Confluence pages qua OAuth.", docsUrl: "https://developer.atlassian.com/cloud/jira/platform/mcp/" },
  { id: "close", name: "Close CRM", endpoint: "https://mcp.close.com/mcp", transport: "streamable-http", authMode: "oauth", detail: "CRM — leads, contacts, opportunities qua OAuth.", docsUrl: "https://developer.close.com/mcp" },

  // ─── Developer Tools ───
  { id: "github", name: "GitHub", endpoint: "https://api.githubcopilot.com/mcp/", transport: "streamable-http", authMode: "oauth", detail: "Repos, issues, PRs, code search. OAuth hoặc PAT Bearer.", docsUrl: "https://docs.github.com/en/copilot/how-tos/provide-context/use-mcp-in-your-ide/set-up-the-github-mcp-server" },
  { id: "gitlab", name: "GitLab", endpoint: "https://mcp.gitlab.com/mcp", transport: "streamable-http", authMode: "oauth", detail: "Repos, MRs, pipelines, issues qua OAuth.", docsUrl: "https://docs.gitlab.com/ee/development/mcp/" },
  { id: "sentry", name: "Sentry", endpoint: "https://mcp.sentry.dev/sse", transport: "sse", authMode: "oauth", detail: "Error tracking — issues, releases, stack traces qua OAuth.", docsUrl: "https://docs.sentry.io/product/mcp/" },
  { id: "buildkite", name: "Buildkite", endpoint: "https://mcp.buildkite.com/mcp", transport: "streamable-http", authMode: "oauth", detail: "CI/CD pipelines, builds, agents qua OAuth.", docsUrl: "https://buildkite.com/docs/mcp" },
  { id: "vercel", name: "Vercel", endpoint: "https://mcp.vercel.com/", transport: "streamable-http", authMode: "oauth", detail: "Deployments, projects, domains, env vars qua OAuth.", docsUrl: "https://vercel.com/docs/mcp" },
  { id: "netlify", name: "Netlify", endpoint: "https://netlify-mcp.netlify.app/mcp", transport: "streamable-http", authMode: "oauth", detail: "Sites, deploys, forms, functions qua OAuth.", docsUrl: "https://docs.netlify.com/mcp" },
  { id: "cloudflare", name: "Cloudflare API", endpoint: "https://mcp.cloudflare.com/mcp", transport: "streamable-http", authMode: "oauth", detail: "Workers, DNS, KV, R2 qua OAuth hoặc API token.", docsUrl: "https://developers.cloudflare.com/agents/model-context-protocol/cloudflare/servers-for-cloudflare/" },
  { id: "docker", name: "Docker", endpoint: "https://mcp.docker.com", transport: "streamable-http", authMode: "oauth", detail: "Containers, images, builds, registries qua OAuth.", docsUrl: "https://docs.docker.com/mcp/" },
  { id: "neon", name: "Neon Postgres", endpoint: "https://mcp.neon.tech/mcp", transport: "streamable-http", authMode: "oauth", detail: "Serverless Postgres — databases, branches, SQL qua OAuth.", docsUrl: "https://neon.tech/docs/mcp" },
  { id: "prisma", name: "Prisma Postgres", endpoint: "https://mcp.prisma.io/mcp", transport: "streamable-http", authMode: "oauth", detail: "Prisma ORM + Postgres — schema, migrations, queries qua OAuth.", docsUrl: "https://www.prisma.io/docs/postgres/mcp" },

  // ─── Databases & Storage ───
  { id: "airtable", name: "Airtable", endpoint: "https://mcp.airtable.com/mcp", transport: "streamable-http", authMode: "oauth", detail: "Bases, tables, records, views qua OAuth.", docsUrl: "https://airtable.com/developers/mcp" },
  { id: "supabase", name: "Supabase", endpoint: "https://mcp.supabase.com/mcp", transport: "streamable-http", authMode: "oauth", detail: "Postgres, Auth, Storage, Edge Functions qua OAuth/DCR.", docsUrl: "https://supabase.com/docs/guides/ai-tools/mcp", readOnlyHint: "Thêm ?read_only=true để giới hạn truy vấn." },
  { id: "box", name: "Box", endpoint: "https://mcp.box.com", transport: "streamable-http", authMode: "oauth", detail: "File storage — files, folders, sharing qua OAuth.", docsUrl: "https://developer.box.com/guides/mcp/" },
  { id: "cloudinary", name: "Cloudinary", endpoint: "https://asset-management.mcp.cloudinary.com/sse", transport: "sse", authMode: "oauth", detail: "Quản lý hình ảnh/video — upload, transform, optimize qua OAuth.", docsUrl: "https://cloudinary.com/documentation/mcp_server" },

  // ─── Payments ───
  { id: "stripe", name: "Stripe", endpoint: "https://mcp.stripe.com", transport: "streamable-http", authMode: "oauth", detail: "Payments, customers, subscriptions, invoices. OAuth hoặc restricted key.", docsUrl: "https://docs.stripe.com/mcp" },
  { id: "paypal", name: "PayPal", endpoint: "https://mcp.paypal.com/sse", transport: "sse", authMode: "oauth", detail: "Payments, orders, refunds qua OAuth.", docsUrl: "https://developer.paypal.com/docs/mcp/" },
  { id: "square", name: "Square", endpoint: "https://mcp.squareup.com/sse", transport: "sse", authMode: "oauth", detail: "Payments, orders, inventory, customers qua OAuth.", docsUrl: "https://developer.squareup.com/docs/mcp" },
  { id: "plaid", name: "Plaid", endpoint: "https://api.dashboard.plaid.com/mcp/sse", transport: "sse", authMode: "oauth", detail: "Banking data — accounts, transactions, balances qua OAuth.", docsUrl: "https://plaid.com/docs/mcp/" },
  { id: "ramp", name: "Ramp", endpoint: "https://ramp-mcp-remote.ramp.com/mcp", transport: "streamable-http", authMode: "oauth", detail: "Corporate cards, expenses, receipts qua OAuth.", docsUrl: "https://docs.ramp.com/mcp" },

  // ─── Design & Content ───
  { id: "canva", name: "Canva", endpoint: "https://mcp.canva.com/mcp", transport: "streamable-http", authMode: "oauth", detail: "Tạo thiết kế, export, brand kit qua OAuth.", docsUrl: "https://www.canva.com/help/mcp-server/" },
  { id: "webflow", name: "Webflow", endpoint: "https://mcp.webflow.com/sse", transport: "sse", authMode: "oauth", detail: "CMS sites — collections, items, pages qua OAuth.", docsUrl: "https://developers.webflow.com/docs/mcp" },
  { id: "wix", name: "Wix", endpoint: "https://mcp.wix.com/sse", transport: "sse", authMode: "oauth", detail: "Website builder — pages, stores, bookings qua OAuth.", docsUrl: "https://dev.wix.com/docs/mcp" },

  // ─── Search & Data ───
  { id: "exa", name: "Exa Search", endpoint: "https://mcp.exa.ai/mcp", transport: "streamable-http", authMode: "oauth", detail: "AI-powered web search — tìm kiếm semantic, research qua OAuth.", docsUrl: "https://docs.exa.ai/reference/mcp-server" },
  { id: "fireflies", name: "Fireflies", endpoint: "https://api.fireflies.ai/mcp", transport: "streamable-http", authMode: "oauth", detail: "Meeting notes, transcripts, summaries qua OAuth.", docsUrl: "https://docs.fireflies.ai/mcp-server" },
  { id: "morningstar", name: "MorningStar", endpoint: "https://mcp.morningstar.com/mcp", transport: "streamable-http", authMode: "oauth", detail: "Financial data — stocks, funds, analytics qua OAuth.", docsUrl: "https://www.morningstar.com/mcp" },

  // ─── Slack (already existed) ───
  { id: "slack", name: "Slack", endpoint: "https://mcp.slack.com/mcp", transport: "streamable-http", authMode: "oauth", detail: "Channels, messages, files qua Confidential OAuth.", docsUrl: "https://docs.slack.dev/ai/slack-mcp-server" },
];

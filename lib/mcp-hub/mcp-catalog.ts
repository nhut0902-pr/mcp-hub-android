import type { McpAuthMode, McpTransport } from "./types";

export type McpCatalogEntry = {
  id: string;
  name: string;
  endpoint: string;
  transport: McpTransport;
  authMode: McpAuthMode;
  detail: string;
  docsUrl: string;
  readOnlyHint?: string;
};

export const mcpCatalog: McpCatalogEntry[] = [
  { id: "notion", name: "Notion", endpoint: "https://mcp.notion.com/mcp", transport: "streamable-http", authMode: "oauth", detail: "Workspace docs và pages qua OAuth.", docsUrl: "https://developers.notion.com/guides/mcp/get-started-with-mcp" },
  { id: "github", name: "GitHub", endpoint: "https://api.githubcopilot.com/mcp/", transport: "streamable-http", authMode: "oauth", detail: "GitHub OAuth hoặc PAT Bearer.", docsUrl: "https://docs.github.com/en/copilot/how-tos/provide-context/use-mcp-in-your-ide/set-up-the-github-mcp-server" },
  { id: "linear", name: "Linear", endpoint: "https://mcp.linear.app/mcp", transport: "streamable-http", authMode: "oauth", detail: "OAuth, Bearer token hoặc Linear API key.", docsUrl: "https://linear.app/docs/mcp", readOnlyHint: "Dùng https://mcp.linear.app/mcp/readonly khi chỉ cần đọc." },
  { id: "stripe", name: "Stripe", endpoint: "https://mcp.stripe.com", transport: "streamable-http", authMode: "oauth", detail: "OAuth hoặc restricted API key Bearer.", docsUrl: "https://docs.stripe.com/mcp?locale=en-GB" },
  { id: "supabase", name: "Supabase", endpoint: "https://mcp.supabase.com/mcp", transport: "streamable-http", authMode: "oauth", detail: "OAuth/DCR; CI có thể dùng PAT Bearer.", docsUrl: "https://supabase.com/docs/guides/ai-tools/mcp", readOnlyHint: "Thêm ?read_only=true để giới hạn truy vấn." },
  { id: "cloudflare", name: "Cloudflare API", endpoint: "https://mcp.cloudflare.com/mcp", transport: "streamable-http", authMode: "oauth", detail: "OAuth hoặc Cloudflare API token Bearer.", docsUrl: "https://developers.cloudflare.com/agents/model-context-protocol/cloudflare/servers-for-cloudflare/" },
  { id: "slack", name: "Slack", endpoint: "https://mcp.slack.com/mcp", transport: "streamable-http", authMode: "oauth", detail: "Confidential OAuth; yêu cầu Slack app đã đăng ký.", docsUrl: "https://docs.slack.dev/ai/slack-mcp-server" },
];

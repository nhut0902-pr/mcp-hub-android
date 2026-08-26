# MCP authentication catalog research

## Nguồn chuẩn về giao thức

MCP remote HTTP sử dụng OAuth 2.1 ở tầng transport. MCP server công bố Protected Resource Metadata để client tìm authorization server; khi dùng STDIO, credentials thường được lấy từ môi trường thay vì OAuth. [MCP Authorization](https://modelcontextprotocol.io/specification/draft/basic/authorization)

## Server đã xác minh

| Dịch vụ | URL MCP | Transport | Cách xác thực | Nguồn |
|---|---|---|---|---|
| Notion | `https://mcp.notion.com/mcp` | Streamable HTTP; có SSE fallback | OAuth tương tác | [Notion docs](https://developers.notion.com/guides/mcp/get-started-with-mcp) |
| GitHub | `https://api.githubcopilot.com/mcp/` | HTTP/SSE | OAuth hoặc Personal Access Token qua `Authorization: Bearer` | [GitHub docs](https://docs.github.com/en/copilot/how-tos/provide-context/use-mcp-in-your-ide/set-up-the-github-mcp-server) |
| Slack | `https://mcp.slack.com/mcp` | Streamable HTTP | Confidential OAuth; cần Slack app đã đăng ký, không hỗ trợ DCR | [Slack docs](https://docs.slack.dev/ai/slack-mcp-server) |
| Linear | `https://mcp.linear.app/mcp` | Streamable HTTP | OAuth 2.1 + DCR, hoặc Bearer token / Linear API key; `/readonly` giới hạn read-only | [Linear docs](https://linear.app/docs/mcp) |
| Stripe | `https://mcp.stripe.com` | Streamable HTTP | OAuth hoặc restricted API key qua `Authorization: Bearer` | [Stripe docs](https://docs.stripe.com/mcp?locale=en-GB) |
| Supabase | `https://mcp.supabase.com/mcp` | Streamable HTTP | OAuth + DCR; CI có thể dùng PAT Bearer | [Supabase docs](https://supabase.com/docs/guides/ai-tools/mcp) |
| Cloudflare API | `https://mcp.cloudflare.com/mcp` | Streamable HTTP | OAuth hoặc Cloudflare API token qua Bearer | [Cloudflare docs](https://developers.cloudflare.com/agents/model-context-protocol/cloudflare/servers-for-cloudflare/) |

Các nguồn được truy cập ngày 26-08-2026. Không lưu token trong tài liệu này.

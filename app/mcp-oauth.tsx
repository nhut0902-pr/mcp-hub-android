/**
 * /mcp-oauth — Deep link handler for MCP OAuth callbacks.
 *
 * When a user connects an MCP server (Notion, GitHub, Slack, etc.) via OAuth,
 * the OAuth provider redirects the browser back to:
 *   mcphub://mcp-oauth?code=xxx&state=yyy
 *
 * Without this route, Expo Router renders the ugly "Unmatched Route" page.
 * This route simply re-exports the OAuth callback handler at /oauth/callback
 * so the same logic (exchange code for token, store credentials) runs.
 *
 * v1.0.24+: Added to fix the "Unmatched Route" error after MCP OAuth login.
 */
export { default } from "./oauth/callback";

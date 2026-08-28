const MODEL = { id: "gemini-1.5-flash", object: "model", owned_by: "AI Cloud" };
const AUTH_VERIFY_URL = process.env.AUTH_VERIFY_URL || "https://mcpconfig-htxjzuzg.manus.space/api/auth/me";

async function hasAuthenticatedUser(request) {
  const authorization = request.headers.authorization;
  if (typeof authorization !== "string" || !authorization.startsWith("Bearer ")) return false;
  try {
    const verification = await fetch(AUTH_VERIFY_URL, { headers: { Accept: "application/json", Authorization: authorization } });
    if (!verification.ok) return false;
    const body = await verification.json();
    return Boolean(body?.user);
  } catch {
    return false;
  }
}

export default async function handler(request, response) {
  if (request.method !== "GET") return response.status(405).json({ error: { message: "Method not allowed" } });
  if (!(await hasAuthenticatedUser(request))) return response.status(401).json({ error: { message: "Bạn cần đăng nhập để sử dụng Nhutbot 1.0 Flash." } });
  response.setHeader("Cache-Control", "private, no-store");
  return response.status(200).json({ object: "list", data: [MODEL] });
}

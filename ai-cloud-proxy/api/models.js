const MODEL = { id: "gemini-1.5-flash", object: "model", owned_by: "AI Cloud" };

export default function handler(request, response) {
  if (request.method !== "GET") return response.status(405).json({ error: { message: "Method not allowed" } });
  response.setHeader("Cache-Control", "public, max-age=300, s-maxage=300");
  return response.status(200).json({ object: "list", data: [MODEL] });
}

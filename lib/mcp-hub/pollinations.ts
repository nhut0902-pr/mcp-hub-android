/**
 * Pollinations.ai — Free AI image generation (no API key needed)
 * 
 * Usage: https://image.pollinations.ai/prompt/{prompt}
 * Returns a PNG image directly.
 */

const POLLINATIONS_BASE = "https://image.pollinations.ai/prompt";

export function generateImageUrl(prompt: string, opts?: { width?: number; height?: number; seed?: number; model?: string }): string {
  const params = new URLSearchParams();
  if (opts?.width) params.set("width", String(opts.width));
  if (opts?.height) params.set("height", String(opts.height));
  if (opts?.seed) params.set("seed", String(opts.seed));
  if (opts?.model) params.set("model", opts.model);
  params.set("nologo", "true");
  const encoded = encodeURIComponent(prompt.substring(0, 500));
  return `${POLLINATIONS_BASE}/${encoded}?${params.toString()}`;
}

export async function generateImage(prompt: string): Promise<string> {
  return generateImageUrl(prompt, { width: 1024, height: 1024, model: "flux" });
}

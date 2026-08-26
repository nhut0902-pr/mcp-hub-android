import aiGenerate from "../assets/animations/ai-generate.json";
import aiThinking from "../assets/animations/ai-thinking.json";
import { describe, expect, it } from "vitest";

describe("AI animation assets", () => {
  it("keeps the supplied Generate animation as a compact looping Lottie source", () => {
    expect(aiGenerate.v).toBeTruthy();
    expect(aiGenerate.w).toBe(70);
    expect(aiGenerate.h).toBe(70);
    expect(aiGenerate.op).toBeGreaterThan(aiGenerate.ip);
  });

  it("keeps the supplied Thinking animation as the brain-sized Lottie source", () => {
    expect(aiThinking.v).toBeTruthy();
    expect(aiThinking.w).toBe(500);
    expect(aiThinking.h).toBe(500);
    expect(aiThinking.op).toBeGreaterThan(aiThinking.ip);
  });
});

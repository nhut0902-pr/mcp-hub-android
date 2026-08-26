import { describe, expect, it } from "vitest";

import { parseInequality, parseInequalitySystem, satisfies } from "../lib/ai-math/inequality";

describe("AI Math miền nghiệm", () => {
  it("đọc và đánh giá bất phương trình tuyến tính", () => {
    const inequality = parseInequality("2x + y ≤ 6");
    expect(inequality.kind).toBe("linear");
    expect(satisfies(inequality, 2, 2)).toBe(true);
    expect(satisfies(inequality, 3, 2)).toBe(false);
  });

  it("hỗ trợ parabol, trị tuyệt đối và đường tròn", () => {
    expect(parseInequality("y >= x^2 - 1").kind).toBe("quadratic");
    expect(parseInequality("y <= |x| + 2").kind).toBe("absolute");
    const circle = parseInequality("x^2 + y^2 <= 9");
    expect(circle.kind).toBe("circle");
    expect(satisfies(circle, 0, 0)).toBe(true);
    expect(satisfies(circle, 4, 0)).toBe(false);
  });

  it("đọc hệ bất phương trình và đánh giá phần giao miền nghiệm", () => {
    const system = parseInequalitySystem("x + y <= 4; x >= 0; y >= 0");
    expect(system).toHaveLength(3);
    expect(system.every((inequality) => satisfies(inequality, 1, 2))).toBe(true);
    expect(system.every((inequality) => satisfies(inequality, 3, 2))).toBe(false);
  });
});

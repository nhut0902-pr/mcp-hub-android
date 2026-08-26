export type Comparator = "<=" | ">=" | "<" | ">";

type InequalityBase = {
  comparator: Comparator;
};

export type LinearInequality = InequalityBase & {
  kind: "linear";
  a: number;
  b: number;
  c: number;
};

export type QuadraticInequality = InequalityBase & {
  kind: "quadratic";
  qa: number;
  qb: number;
  qc: number;
};

export type AbsoluteInequality = InequalityBase & {
  kind: "absolute";
  aa: number;
  ac: number;
};

export type CircleInequality = InequalityBase & {
  kind: "circle";
  radiusSquared: number;
};

export type ParsedInequality = LinearInequality | QuadraticInequality | AbsoluteInequality | CircleInequality;

type LinearPart = { a: number; b: number; c: number };
type PolynomialPart = { qa: number; qb: number; qc: number };

function addParts(left: LinearPart, right: LinearPart): LinearPart {
  return { a: left.a + right.a, b: left.b + right.b, c: left.c + right.c };
}

function numberFrom(value: string, fallback = 1) {
  if (value === "" || value === "+") return fallback;
  if (value === "-") return -fallback;
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error("Hệ số không hợp lệ.");
  return number;
}

function normalize(raw: string) {
  return raw
    .toLowerCase()
    .replace(/−/g, "-")
    .replace(/≤/g, "<=")
    .replace(/≥/g, ">=")
    .replace(/,/g, ".")
    .replace(/\|x\|/g, "abs(x)")
    .replace(/\s+/g, "");
}

function invertComparator(comparator: Comparator): Comparator {
  const inverted: Record<Comparator, Comparator> = { "<=": ">=", ">=": "<=", "<": ">", ">": "<" };
  return inverted[comparator];
}

function parseSide(input: string): LinearPart {
  const expression = input.replace(/\(([^()]+)\)/g, "$1");
  if (!expression) throw new Error("Thiếu vế của bất phương trình.");
  const tokens = expression.match(/[+-]?[^+-]+/g);
  if (!tokens || tokens.join("") !== expression) throw new Error("Biểu thức chỉ hỗ trợ phép cộng và trừ tuyến tính.");

  return tokens.reduce<LinearPart>((total, token) => {
    const sign = token.startsWith("-") ? -1 : 1;
    const body = token.replace(/^[+-]/, "");
    const numberThenVariable = body.match(/^(\d*\.?\d*)\*?([xy])$/);
    const variableThenNumber = body.match(/^([xy])\*(\d*\.?\d+)$/);
    const constant = body.match(/^\d*\.?\d+$/);
    let part: LinearPart;

    if (numberThenVariable) {
      const coefficient = numberFrom(numberThenVariable[1]);
      part = numberThenVariable[2] === "x" ? { a: sign * coefficient, b: 0, c: 0 } : { a: 0, b: sign * coefficient, c: 0 };
    } else if (variableThenNumber) {
      const coefficient = numberFrom(variableThenNumber[2]);
      part = variableThenNumber[1] === "x" ? { a: sign * coefficient, b: 0, c: 0 } : { a: 0, b: sign * coefficient, c: 0 };
    } else if (constant) {
      part = { a: 0, b: 0, c: sign * numberFrom(body) };
    } else {
      throw new Error("Dùng dạng ax + by ≤ c, y ≥ x^2 - 1, y ≤ |x| + 2 hoặc x^2 + y^2 ≤ 9.");
    }
    return addParts(total, part);
  }, { a: 0, b: 0, c: 0 });
}

function parsePolynomial(input: string): PolynomialPart {
  const tokens = input.match(/[+-]?[^+-]+/g);
  if (!tokens || tokens.join("") !== input) throw new Error("Không đọc được biểu thức bậc hai.");
  return tokens.reduce<PolynomialPart>((total, token) => {
    const sign = token.startsWith("-") ? -1 : 1;
    const body = token.replace(/^[+-]/, "");
    const squared = body.match(/^(\d*\.?\d*)\*?x\^2$/);
    const linear = body.match(/^(\d*\.?\d*)\*?x$/);
    const constant = body.match(/^\d*\.?\d+$/);
    if (squared) return { ...total, qa: total.qa + sign * numberFrom(squared[1]) };
    if (linear) return { ...total, qb: total.qb + sign * numberFrom(linear[1]) };
    if (constant) return { ...total, qc: total.qc + sign * numberFrom(body) };
    throw new Error("Bậc hai dùng dạng y >= ax^2 + bx + c.");
  }, { qa: 0, qb: 0, qc: 0 });
}

function parseFunctionBoundary(expression: string, comparator: Comparator): ParsedInequality | null {
  if (expression.includes("abs(x)")) {
    const match = expression.match(/^([+-]?(?:\d*\.?\d*)?)\*?abs\(x\)([+-]\d*\.?\d+)?$/);
    if (!match) throw new Error("Trị tuyệt đối dùng dạng y >= |x| + c.");
    return { kind: "absolute", aa: numberFrom(match[1]), ac: match[2] ? Number(match[2]) : 0, comparator };
  }
  if (expression.includes("x^2")) {
    const polynomial = parsePolynomial(expression);
    if (Math.abs(polynomial.qa) < 1e-10) throw new Error("Thiếu hạng tử x^2 trong biểu thức bậc hai.");
    return { kind: "quadratic", ...polynomial, comparator };
  }
  return null;
}

function parseCircle(left: string, right: string, comparator: Comparator): CircleInequality | null {
  const isCircle = (value: string) => value === "x^2+y^2" || value === "y^2+x^2";
  if (!isCircle(left) && !isCircle(right)) return null;
  const radiusSide = isCircle(left) ? right : left;
  if (!/^\d*\.?\d+$/.test(radiusSide)) throw new Error("Đường tròn dùng dạng x^2 + y^2 <= r^2, ví dụ: x^2 + y^2 <= 9.");
  const radiusSquared = Number(radiusSide);
  if (radiusSquared < 0) throw new Error("Bán kính bình phương phải không âm.");
  return { kind: "circle", radiusSquared, comparator: isCircle(left) ? comparator : invertComparator(comparator) };
}

export function parseInequality(raw: string): ParsedInequality {
  const normalized = normalize(raw);
  const parts = normalized.split(/(<=|>=|<|>)/);
  if (parts.length !== 3 || !parts[1]) throw new Error("Cần một dấu <, >, ≤ hoặc ≥.");
  const comparator = parts[1] as Comparator;
  const [left, right] = [parts[0], parts[2]];

  const circle = parseCircle(left, right, comparator);
  if (circle) return circle;

  if (left === "y") {
    const functionBoundary = parseFunctionBoundary(right, comparator);
    if (functionBoundary) return functionBoundary;
  }
  if (right === "y") {
    const functionBoundary = parseFunctionBoundary(left, invertComparator(comparator));
    if (functionBoundary) return functionBoundary;
  }

  const leftLinear = parseSide(left);
  const rightLinear = parseSide(right);
  const result: LinearInequality = { kind: "linear", a: leftLinear.a - rightLinear.a, b: leftLinear.b - rightLinear.b, c: leftLinear.c - rightLinear.c, comparator };
  if (Math.abs(result.a) < 1e-10 && Math.abs(result.b) < 1e-10) throw new Error("Cần có ít nhất biến x hoặc y.");
  return result;
}

export function evaluateBoundary(inequality: ParsedInequality, x: number, y: number) {
  switch (inequality.kind) {
    case "linear": return inequality.a * x + inequality.b * y + inequality.c;
    case "quadratic": return y - (inequality.qa * x * x + inequality.qb * x + inequality.qc);
    case "absolute": return y - (inequality.aa * Math.abs(x) + inequality.ac);
    case "circle": return x * x + y * y - inequality.radiusSquared;
  }
}

export function satisfies(inequality: ParsedInequality, x: number, y: number) {
  const value = evaluateBoundary(inequality, x, y);
  const tolerance = 1e-8;
  switch (inequality.comparator) {
    case "<": return value < -tolerance;
    case "<=": return value <= tolerance;
    case ">": return value > tolerance;
    case ">=": return value >= -tolerance;
  }
}

export function boundaryY(inequality: QuadraticInequality | AbsoluteInequality, x: number) {
  return inequality.kind === "quadratic"
    ? inequality.qa * x * x + inequality.qb * x + inequality.qc
    : inequality.aa * Math.abs(x) + inequality.ac;
}

export function kindLabel(inequality: ParsedInequality) {
  return ({ linear: "đường thẳng", quadratic: "parabol", absolute: "đồ thị trị tuyệt đối", circle: "đường tròn" })[inequality.kind];
}

export function comparatorLabel(comparator: Comparator) {
  return comparator.replace("<=", "≤").replace(">=", "≥");
}

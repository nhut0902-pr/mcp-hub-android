import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";

import { boundaryY, type ParsedInequality, satisfies } from "@/lib/ai-math/inequality";

const SIZE = 320;
const MIN = -10;
const MAX = 10;
const CELLS = 25;
const toX = (value: number) => ((value - MIN) / (MAX - MIN)) * SIZE;
const toY = (value: number) => SIZE - ((value - MIN) / (MAX - MIN)) * SIZE;

function curvePath(inequality: ParsedInequality) {
  if (inequality.kind !== "quadratic" && inequality.kind !== "absolute") return "";
  const points = Array.from({ length: 100 }, (_, index) => {
    const x = MIN + (index / 99) * (MAX - MIN);
    return `${index ? "L" : "M"}${toX(x).toFixed(2)} ${toY(boundaryY(inequality, x)).toFixed(2)}`;
  });
  return points.join(" ");
}

const boundaryColors = ["#FFB35C", "#8CD4FF", "#DBA5FF", "#A6E3A1", "#FF93B0", "#FFE58A"];

export function AiMathGraph({ inequalities }: { inequalities: ParsedInequality[] }) {
  const cells = useMemo(() => {
    const cellWorld = (MAX - MIN) / CELLS;
    return Array.from({ length: CELLS * CELLS }, (_, index) => {
      const column = index % CELLS;
      const row = Math.floor(index / CELLS);
      const x = MIN + (column + 0.5) * cellWorld;
      const y = MAX - (row + 0.5) * cellWorld;
      return { id: `${column}-${row}`, x: (column * SIZE) / CELLS, y: (row * SIZE) / CELLS, active: inequalities.every((inequality) => satisfies(inequality, x, y)) };
    });
  }, [inequalities]);
  const grid = Array.from({ length: 11 }, (_, index) => index * (SIZE / 10));

  return <View style={styles.wrap}><Svg width="100%" height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
    <Rect width={SIZE} height={SIZE} fill="#171A1E" rx={16} />
    {cells.filter((cell) => cell.active).map((cell) => <Rect key={cell.id} x={cell.x} y={cell.y} width={SIZE / CELLS + 0.5} height={SIZE / CELLS + 0.5} fill="#2996F3" opacity={0.22} />)}
    {grid.map((point) => <Line key={`v-${point}`} x1={point} x2={point} y1={0} y2={SIZE} stroke="#303741" strokeWidth={0.7} />)}
    {grid.map((point) => <Line key={`h-${point}`} y1={point} y2={point} x1={0} x2={SIZE} stroke="#303741" strokeWidth={0.7} />)}
    <Line x1={0} x2={SIZE} y1={toY(0)} y2={toY(0)} stroke="#87929E" strokeWidth={1.2} />
    <Line x1={toX(0)} x2={toX(0)} y1={0} y2={SIZE} stroke="#87929E" strokeWidth={1.2} />
    {inequalities.map((inequality, index) => {
      const dashed = inequality.comparator === "<" || inequality.comparator === ">";
      const stroke = boundaryColors[index % boundaryColors.length];
      if (inequality.kind === "linear") return Math.abs(inequality.b) > 1e-10
        ? <Line key={`boundary-${index}`} x1={toX(MIN)} y1={toY((-inequality.a * MIN - inequality.c) / inequality.b)} x2={toX(MAX)} y2={toY((-inequality.a * MAX - inequality.c) / inequality.b)} stroke={stroke} strokeWidth={2.3} strokeDasharray={dashed ? "6 5" : undefined} />
        : <Line key={`boundary-${index}`} x1={toX(-inequality.c / inequality.a)} y1={0} x2={toX(-inequality.c / inequality.a)} y2={SIZE} stroke={stroke} strokeWidth={2.3} strokeDasharray={dashed ? "6 5" : undefined} />;
      if (inequality.kind === "quadratic" || inequality.kind === "absolute") return <Path key={`boundary-${index}`} d={curvePath(inequality)} fill="none" stroke={stroke} strokeWidth={2.3} strokeDasharray={dashed ? "6 5" : undefined} />;
      return <Circle key={`boundary-${index}`} cx={toX(0)} cy={toY(0)} r={(Math.sqrt(inequality.radiusSquared) / (MAX - MIN)) * SIZE} fill="none" stroke={stroke} strokeWidth={2.3} strokeDasharray={dashed ? "6 5" : undefined} />;
    })}
  </Svg></View>;
}

const styles = StyleSheet.create({ wrap: { width: "100%", borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "#35424F" } });

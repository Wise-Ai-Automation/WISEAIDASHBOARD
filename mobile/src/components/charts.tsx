import { useId, useState } from "react";
import { Platform, View, type GestureResponderEvent } from "react-native";
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from "react-native-svg";
import { useTheme } from "@/lib/theme";
import { T } from "./ui";

const FONT = Platform.OS === "web" ? { fontFamily: "Inter_500Medium, system-ui, sans-serif" } : { fontFamily: "Inter_500Medium" };

interface Datum {
  label: string;
  value: number;
}

function niceCeil(v: number) {
  if (v <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}

/** Smooth monotone-ish curve through the points (Catmull-Rom → cubic Bézier). */
function curve(pts: { x: number; y: number }[]) {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M${pts[0]!.x},${pts[0]!.y}`;
  let d = `M${pts[0]!.x},${pts[0]!.y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[i + 2] ?? p2;
    const t = 0.18;
    d += ` C${p1.x + (p2.x - p0.x) * t},${p1.y + (p2.y - p0.y) * t} ${p2.x - (p3.x - p1.x) * t},${p2.y - (p3.y - p1.y) * t} ${p2.x},${p2.y}`;
  }
  return d;
}

/** Area/line chart with a soft gradient fill and touch-to-inspect. */
export function AreaChart({
  data,
  height = 190,
  color,
  format = (v: number) => String(Math.round(v)),
  unit = "",
}: {
  data: Datum[];
  height?: number;
  color?: string;
  format?: (v: number) => string;
  unit?: string;
}) {
  const { c } = useTheme();
  const id = useId().replace(/:/g, "");
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const tone = color ?? c.primary;
  const padL = 36;
  const padR = 14;
  const padT = 14;
  const padB = 24;
  const max = niceCeil(Math.max(...data.map((d) => d.value), 0));
  const plotW = Math.max(0, width - padL - padR);
  const plotH = height - padT - padB;
  const x = (i: number) => padL + (data.length <= 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
  const y = (v: number) => padT + plotH - (v / max) * plotH;
  const pts = data.map((d, i) => ({ x: x(i), y: y(d.value) }));
  const line = curve(pts);
  const area = pts.length ? `${line} L${pts[pts.length - 1]!.x},${padT + plotH} L${pts[0]!.x},${padT + plotH} Z` : "";
  const every = Math.max(1, Math.ceil(data.length / 5));

  const pick = (e: GestureResponderEvent) => {
    if (!data.length || plotW <= 0) return;
    const ratio = (e.nativeEvent.locationX - padL) / plotW;
    setActive(Math.max(0, Math.min(data.length - 1, Math.round(ratio * (data.length - 1)))));
  };

  const a = active != null ? data[active] : null;
  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ height }}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={pick}
      onResponderMove={pick}
      onResponderRelease={() => setTimeout(() => setActive(null), 900)}
    >
      {width > 0 ? (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={tone} stopOpacity={0.32} />
              <Stop offset="1" stopColor={tone} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {[0, 0.5, 1].map((p) => {
            const gy = padT + plotH * (1 - p);
            return (
              <G key={p}>
                <Line x1={padL} x2={width - padR} y1={gy} y2={gy} stroke={c.border} strokeWidth={1} strokeDasharray={p === 0 ? undefined : "3 5"} />
                <SvgText x={padL - 8} y={gy + 4} fontSize={10} fill={c.faint} textAnchor="end" {...FONT}>
                  {format(max * p)}
                </SvgText>
              </G>
            );
          })}
          {area ? <Path d={area} fill={`url(#${id})`} /> : null}
          {line ? <Path d={line} stroke={tone} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
          {data.map((d, i) =>
            i % every === 0 || i === data.length - 1 ? (
              <SvgText
                key={i}
                x={x(i)}
                y={height - 6}
                fontSize={10}
                fill={c.faint}
                textAnchor={i === data.length - 1 && data.length > 1 ? "end" : i === 0 ? "start" : "middle"}
                {...FONT}
              >
                {d.label}
              </SvgText>
            ) : null,
          )}
          {active != null && pts[active] ? (
            <G>
              <Line x1={pts[active]!.x} x2={pts[active]!.x} y1={padT} y2={padT + plotH} stroke={tone} strokeOpacity={0.35} strokeWidth={1} />
              <Circle cx={pts[active]!.x} cy={pts[active]!.y} r={6} fill={c.card} stroke={tone} strokeWidth={3} />
            </G>
          ) : data.length ? (
            <Circle cx={pts[pts.length - 1]!.x} cy={pts[pts.length - 1]!.y} r={4.5} fill={tone} stroke={c.card} strokeWidth={2} />
          ) : null}
        </Svg>
      ) : null}
      {a && active != null && pts[active] ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            left: Math.min(Math.max(pts[active]!.x - 46, 0), Math.max(0, width - 92)),
            width: 92,
            alignItems: "center",
            paddingVertical: 4,
            borderRadius: 10,
            backgroundColor: c.text,
          }}
        >
          <T size={12} weight="700" color={c.bg}>
            {format(a.value)}
            {unit}
          </T>
          <T size={10} weight="500" color={c.bg} style={{ opacity: 0.7 }}>
            {a.label}
          </T>
        </View>
      ) : null}
    </View>
  );
}

/** Rounded vertical bars; the tallest is emphasised. */
export function BarChart({
  data,
  height = 150,
  format = (v: number) => String(Math.round(v)),
  color,
}: {
  data: Datum[];
  height?: number;
  format?: (v: number) => string;
  color?: string;
}) {
  const { c } = useTheme();
  const [width, setWidth] = useState(0);
  const tone = color ?? c.primary;
  const padL = 30;
  const padB = 22;
  const padT = 6;
  const max = Math.max(...data.map((d) => d.value), 0);
  const top = niceCeil(max);
  const plotW = Math.max(0, width - padL);
  const plotH = height - padB - padT;
  const slot = data.length ? plotW / data.length : 0;
  const barW = Math.max(3, Math.min(22, slot * 0.58));
  const every = Math.max(1, Math.ceil(data.length / 6));

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height }}>
      {width > 0 ? (
        <Svg width={width} height={height}>
          {[0, 1].map((p) => {
            const gy = padT + plotH * (1 - p);
            return (
              <G key={p}>
                <Line x1={padL} x2={width} y1={gy} y2={gy} stroke={c.border} strokeWidth={1} strokeDasharray={p === 0 ? undefined : "3 5"} />
                <SvgText x={padL - 8} y={gy + 4} fontSize={10} fill={c.faint} textAnchor="end" {...FONT}>
                  {format(top * p)}
                </SvgText>
              </G>
            );
          })}
          {data.map((d, i) => {
            const h = (d.value / top) * plotH;
            const bx = padL + i * slot + (slot - barW) / 2;
            const peak = max > 0 && d.value === max;
            return (
              <G key={d.label + i}>
                <Rect
                  x={bx}
                  y={padT + plotH - h}
                  width={barW}
                  height={Math.max(h, d.value > 0 ? 3 : 0)}
                  rx={Math.min(7, barW / 2)}
                  fill={tone}
                  opacity={peak ? 1 : 0.42}
                />
                {i % every === 0 ? (
                  <SvgText x={bx + barW / 2} y={height - 6} fontSize={10} fill={c.faint} textAnchor="middle" {...FONT}>
                    {d.label}
                  </SvgText>
                ) : null}
              </G>
            );
          })}
        </Svg>
      ) : null}
    </View>
  );
}

/** Tiny trend line for hero cards (white on gradient by default). */
export function Sparkline({ values, height = 44, color = "#FFFFFF" }: { values: number[]; height?: number; color?: string }) {
  const [width, setWidth] = useState(0);
  const id = useId().replace(/:/g, "");
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => ({
    x: values.length <= 1 ? width / 2 : (i / (values.length - 1)) * width,
    y: 4 + (height - 8) * (1 - v / max),
  }));
  const line = curve(pts);
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height }}>
      {width > 0 && values.length > 1 ? (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.28} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path d={`${line} L${width},${height} L0,${height} Z`} fill={`url(#${id})`} />
          <Path d={line} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" />
        </Svg>
      ) : null}
    </View>
  );
}

/** One horizontal bar split into proportional segments, with a legend. */
export function StackedBar({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const { c } = useTheme();
  const total = segments.reduce((s, x) => s + x.value, 0);
  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: "row", height: 12, borderRadius: 6, overflow: "hidden", backgroundColor: c.cardAlt, gap: 2 }}>
        {total > 0
          ? segments.map((s) =>
              s.value > 0 ? <View key={s.label} style={{ flex: s.value, backgroundColor: s.color, borderRadius: 3 }} /> : null,
            )
          : null}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 24, rowGap: 14 }}>
        {segments.map((s) => (
          <View key={s.label} style={{ gap: 2, minWidth: 84 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: s.color }} />
              <T size={12} muted weight="600">
                {s.label}
              </T>
            </View>
            <T size={18} weight="700">
              {total ? Math.round((s.value / total) * 100) : 0}%
            </T>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Horizontal ranked bars — agents, disconnection reasons. */
export function HBars({
  data,
  color,
  format = (v: number) => String(v),
}: {
  data: Datum[];
  color?: string;
  format?: (v: number) => string;
}) {
  const { c } = useTheme();
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <View style={{ gap: 16 }}>
      {data.map((d) => (
        <View key={d.label} style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <T size={14} weight="600" numberOfLines={1}>
                {d.label}
              </T>
            </View>
            <T size={14} weight="700">
              {format(d.value)}
            </T>
          </View>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: c.cardAlt, overflow: "hidden" }}>
            <View style={{ width: `${Math.max(2, (d.value / max) * 100)}%`, height: 8, borderRadius: 4, backgroundColor: color ?? c.primary }} />
          </View>
        </View>
      ))}
    </View>
  );
}

/** Ring chart with a centred total. */
export function Donut({
  data,
  size = 148,
  centerLabel,
}: {
  data: { name: string; value: number; color: string }[];
  size?: number;
  centerLabel?: string;
}) {
  const { c } = useTheme();
  const total = data.reduce((s, d) => s + d.value, 0);
  const stroke = 16;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.cardAlt} strokeWidth={stroke} fill="none" />
          {total > 0
            ? data.map((d) => {
                const len = (d.value / total) * circ;
                const el = (
                  <Circle
                    key={d.name}
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    stroke={d.color}
                    strokeWidth={stroke}
                    fill="none"
                    strokeDasharray={`${Math.max(len - 3, 0)} ${circ}`}
                    strokeDashoffset={-offset}
                    strokeLinecap="round"
                  />
                );
                offset += len;
                return el;
              })
            : null}
        </G>
      </Svg>
      <T size={26} weight="800">
        {total.toLocaleString()}
      </T>
      {centerLabel ? (
        <T size={11} muted weight="600">
          {centerLabel}
        </T>
      ) : null}
    </View>
  );
}

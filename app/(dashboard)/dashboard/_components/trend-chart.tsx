"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  chartTooltipContentStyle,
  chartTooltipItemStyle,
  chartTooltipLabelStyle,
} from "./chart-tooltip-style";

type Datum = { period: string; payroll: number; expense: number };

export function TrendChart({ data }: { data: Datum[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-body-md text-on-surface-variant">
        추세 데이터 없음
      </div>
    );
  }
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 16, bottom: 8, left: 8 }}>
          <CartesianGrid stroke="rgba(199,196,215,0.08)" vertical={false} />
          <XAxis
            dataKey="period"
            tick={{ fill: "#c7c4d7", fontSize: 12 }}
            axisLine={{ stroke: "rgba(199,196,215,0.15)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#c7c4d7", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) =>
              v >= 100_000_000
                ? `${(v / 100_000_000).toFixed(1)}억`
                : v >= 10_000
                  ? `${Math.round(v / 10_000).toLocaleString("ko-KR")}만`
                  : v.toString()
            }
          />
          <Tooltip
            contentStyle={chartTooltipContentStyle}
            itemStyle={chartTooltipItemStyle}
            labelStyle={chartTooltipLabelStyle}
            formatter={(v: number, name: string) => [
              v.toLocaleString("ko-KR", { maximumFractionDigits: 0 }) + "원",
              name === "payroll" ? "급여" : "지출",
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: "#c7c4d7" }}
            formatter={(v: string) => (v === "payroll" ? "급여" : "지출")}
          />
          <Line
            type="monotone"
            dataKey="payroll"
            stroke="#c0c1ff"
            strokeWidth={2}
            dot={{ r: 3, fill: "#c0c1ff" }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="expense"
            stroke="#7bd0ff"
            strokeWidth={2}
            dot={{ r: 3, fill: "#7bd0ff" }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
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

type Datum = { name: string; cost: number };

export function DepartmentCostChart({ data }: { data: Datum[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-body-md text-on-surface-variant">
        부서별 인건비 데이터 없음
      </div>
    );
  }
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 16, bottom: 8, left: 8 }}>
          <CartesianGrid stroke="rgba(199,196,215,0.08)" vertical={false} />
          <XAxis
            dataKey="name"
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
            cursor={{ fill: "rgba(192,193,255,0.08)" }}
            contentStyle={chartTooltipContentStyle}
            itemStyle={chartTooltipItemStyle}
            labelStyle={chartTooltipLabelStyle}
            formatter={(v: number) =>
              v.toLocaleString("ko-KR", { maximumFractionDigits: 0 }) + "원"
            }
          />
          <Bar dataKey="cost" fill="#c0c1ff" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

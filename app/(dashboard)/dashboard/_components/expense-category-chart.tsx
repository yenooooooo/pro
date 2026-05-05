"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import {
  chartTooltipContentStyle,
  chartTooltipItemStyle,
  chartTooltipLabelStyle,
} from "./chart-tooltip-style";

type Datum = { name: string; value: number };

const COLORS = ["#c0c1ff", "#7bd0ff", "#8083ff", "#39485a", "#ffb4ab"];

export function ExpenseCategoryChart({ data }: { data: Datum[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-body-md text-on-surface-variant">
        카테고리별 지출 데이터 없음
      </div>
    );
  }
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="grid h-72 w-full grid-cols-1 gap-4 md:grid-cols-2">
      <div className="flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={50}
              outerRadius={88}
              paddingAngle={2}
              stroke="#0b1326"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={chartTooltipContentStyle}
              itemStyle={chartTooltipItemStyle}
              labelStyle={chartTooltipLabelStyle}
              formatter={(v: number) =>
                v.toLocaleString("ko-KR", { maximumFractionDigits: 0 }) + "원"
              }
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex flex-col justify-center gap-2 text-data-tabular">
        {data.map((d, i) => {
          const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
          return (
            <li key={d.name} className="flex items-center gap-2">
              <span
                aria-hidden
                className="h-2 w-2 flex-shrink-0 rounded-full"
                style={{ background: COLORS[i % COLORS.length] }}
              />
              <span className="flex-1 truncate text-on-surface-variant">{d.name}</span>
              <span className="tabular-nums text-on-surface">{pct}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

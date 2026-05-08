"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
} from "recharts";
import {
  chartTooltipContentStyle,
  chartTooltipItemStyle,
  chartTooltipLabelStyle,
} from "@/app/(dashboard)/dashboard/_components/chart-tooltip-style";

type CashFlowPoint = {
  month: string;
  inflow: number;
  outflow: number;
  net: number;
  is_forecast: boolean;
};

type Props = {
  cashFlow: CashFlowPoint[];
};

export function ExecutiveCharts({ cashFlow }: Props) {
  if (cashFlow.length === 0) {
    return null;
  }

  // 마지막 historical 의 인덱스 (forecast 시작점)
  const firstForecastIdx = cashFlow.findIndex((p) => p.is_forecast);
  const forecastStart = firstForecastIdx >= 0 ? cashFlow[firstForecastIdx].month : null;

  return (
    <section className="glass-panel rounded-xl p-6">
      <header className="mb-4 flex items-center justify-between">
        <h2 className="text-headline-md font-semibold text-on-surface">
          현금흐름 (실제 + AI 예측)
        </h2>
        {forecastStart ? (
          <span className="text-label-sm text-primary-electric">
            🔮 {forecastStart} 부터 예측
          </span>
        ) : null}
      </header>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={cashFlow} margin={{ top: 12, right: 16, bottom: 8, left: 8 }}>
            <CartesianGrid stroke="rgba(199,196,215,0.08)" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: "#c7c4d7", fontSize: 11 }}
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
              formatter={(v: number, name: string) => [
                `${v.toLocaleString("ko-KR")}원`,
                name === "inflow" ? "매출 (입금)" : name === "outflow" ? "비용 (지출)" : "순흐름",
              ]}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, color: "#c7c4d7" }}
              formatter={(v: string) =>
                v === "inflow" ? "매출" : v === "outflow" ? "비용" : "순흐름"
              }
            />
            {forecastStart ? (
              <ReferenceLine
                x={forecastStart}
                stroke="#c0c1ff"
                strokeDasharray="3 3"
                label={{
                  value: "예측 →",
                  fill: "#c0c1ff",
                  fontSize: 10,
                  position: "top",
                }}
              />
            ) : null}
            <Bar dataKey="inflow" fill="#7bd0ff" radius={[4, 4, 0, 0]} />
            <Bar dataKey="outflow" fill="#ffb4ab" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={cashFlow} margin={{ top: 12, right: 16, bottom: 8, left: 8 }}>
            <CartesianGrid stroke="rgba(199,196,215,0.08)" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: "#c7c4d7", fontSize: 11 }}
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
              formatter={(v: number) => `${v.toLocaleString("ko-KR")}원`}
            />
            <ReferenceLine y={0} stroke="rgba(199,196,215,0.3)" />
            {forecastStart ? (
              <ReferenceLine
                x={forecastStart}
                stroke="#c0c1ff"
                strokeDasharray="3 3"
              />
            ) : null}
            <Line
              type="monotone"
              dataKey="net"
              stroke="#c0c1ff"
              strokeWidth={2}
              dot={{ r: 3, fill: "#c0c1ff" }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-3 text-label-sm text-on-surface-variant/60">
        💡 점선 오른쪽은 Gemini 가 최근 12개월 패턴·계절성으로 예측한 값. 실제 결과와
        다를 수 있으며 의사결정 보조용.
      </p>
    </section>
  );
}

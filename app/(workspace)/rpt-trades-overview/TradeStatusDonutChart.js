"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
});

const NAVY_950 = "#082944";
const NAVY_800 = "#1e485f";
const GOLD_600 = "#ad8a40";
const GOLD_500 = "#c29d4d";
const GOLD_400 = "#d0b36f";
const GRAY_500 = "#939fa9";
const GRAY_700 = "#607586";
const SUCCESS = "#2f6b4f";
const WARNING = "#c48a2a";
const DANGER = "#b42318";

const FALLBACK_COLORS = [
  NAVY_950,
  GOLD_600,
  NAVY_800,
  GOLD_500,
  GRAY_700,
  GOLD_400,
  "#0b3455",
  GRAY_500,
];

const SEMANTIC_COLORS = [
  { pattern: /(cancel|fail|void|reject)/, color: DANGER },
  { pattern: /(complete|closed|deliver|done|finish)/, color: SUCCESS },
  { pattern: /(progress|active)/, color: GOLD_600 },
  { pattern: /(pending|await|hold|queue)/, color: WARNING },
  { pattern: /(draft|new)/, color: GRAY_500 },
];

function statusColor(name) {
  const key = String(name ?? "").trim().toLowerCase();

  for (const rule of SEMANTIC_COLORS) {
    if (rule.pattern.test(key)) {
      return rule.color;
    }
  }

  let hash = 0;

  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) >>> 0;
  }

  return FALLBACK_COLORS[hash % FALLBACK_COLORS.length];
}

function formatCount(value) {
  const n = Number(value);

  if (!Number.isFinite(n)) {
    return "0";
  }

  const rounded = Math.round(n);
  const sign = rounded < 0 ? "-" : "";
  return `${sign}${String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, " ")}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatPercent(value) {
  const n = Number(value);

  if (!Number.isFinite(n)) {
    return "0.0%";
  }

  return `${n.toFixed(1)}%`;
}

export default function TradeStatusDonutChart({ items = [], total = 0 }) {
  const chartRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(null);

  useEffect(() => {
    setActiveIndex(null);
  }, [items]);

  const segments = useMemo(
    () =>
      items.map((item) => {
        const percent = total > 0 ? (item.count / total) * 100 : 0;
        return {
          name: item.name,
          count: item.count,
          percent,
          color: statusColor(item.name),
        };
      }),
    [items, total],
  );

  const option = useMemo(
    () => ({
      animationDuration: 700,
      animationEasing: "cubicOut",
      animationDurationUpdate: 400,
      color: segments.map((segment) => segment.color),
      tooltip: {
        trigger: "item",
        backgroundColor: NAVY_950,
        borderWidth: 0,
        padding: [10, 12],
        extraCssText:
          "border-radius:6px;box-shadow:0 8px 24px rgba(8,41,68,0.18);",
        textStyle: {
          color: "#ffffff",
          fontSize: 12,
          fontFamily: "inherit",
        },
        formatter(params) {
          const segment = segments[params.dataIndex];
          const name = segment?.name ?? params.name;
          const count = formatCount(segment?.count ?? params.value);
          const share = formatPercent(segment?.percent ?? params.percent);
          return `<div style="font-weight:600;margin-bottom:6px">${escapeHtml(name)}</div>
<div>Trades: ${count}</div>
<div>Share: ${share}</div>`;
        },
      },
      legend: { show: false },
      series: [
        {
          type: "pie",
          name: "Trade status",
          radius: ["52%", "78%"],
          center: ["50%", "50%"],
          padAngle: 1.8,
          avoidLabelOverlap: true,
          stillShowZeroSum: false,
          itemStyle: {
            borderColor: "#ffffff",
            borderWidth: 2,
            borderRadius: 8,
          },
          label: { show: false },
          labelLine: { show: false },
          emphasis: {
            scale: true,
            scaleSize: 7,
            focus: "self",
            itemStyle: {
              borderWidth: 2,
              shadowBlur: 0,
            },
          },
          blur: {
            itemStyle: { opacity: 0.28 },
          },
          data: segments.map((segment) => ({
            name: segment.name,
            value: segment.count,
          })),
        },
      ],
    }),
    [segments],
  );

  useEffect(() => {
    const chart = chartRef.current;

    if (!chart) {
      return undefined;
    }

    if (activeIndex == null) {
      chart.dispatchAction({ type: "downplay", seriesIndex: 0 });
      chart.dispatchAction({ type: "hideTip" });
      return undefined;
    }

    chart.dispatchAction({ type: "downplay", seriesIndex: 0 });
    chart.dispatchAction({
      type: "highlight",
      seriesIndex: 0,
      dataIndex: activeIndex,
    });
    chart.dispatchAction({
      type: "showTip",
      seriesIndex: 0,
      dataIndex: activeIndex,
    });
    return undefined;
  }, [activeIndex, segments]);

  const active = activeIndex == null ? null : segments[activeIndex];
  const description = segments
    .map(
      (segment) =>
        `${segment.name}: ${formatCount(segment.count)} trades, ${formatPercent(segment.percent)}`,
    )
    .join(". ");

  return (
    <div className="grid w-full grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(16rem,0.85fr)]">
      <div
        className="relative mx-auto w-full max-w-[26rem]"
        role="img"
        aria-label={`Trade status distribution. Total trades ${formatCount(total)}. ${description}`}
      >
        <ReactECharts
          option={option}
          notMerge
          lazyUpdate
          onChartReady={(chart) => {
            chartRef.current = chart;
          }}
          onEvents={{
            mouseover(params) {
              if (params?.componentType === "series") {
                setActiveIndex(params.dataIndex);
              }
            },
            globalout() {
              setActiveIndex(null);
            },
          }}
          opts={{ renderer: "canvas" }}
          style={{ height: "22rem", width: "100%" }}
        />
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-16 text-center">
          {active ? (
            <>
              <p className="max-w-[9.5rem] truncate text-sm font-medium text-zinc-700">
                {active.name}
              </p>
              <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-navy-950">
                {formatCount(active.count)}
              </p>
              <p className="mt-0.5 text-sm tabular-nums text-zinc-600">
                {formatPercent(active.percent)}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-zinc-700">Total Trades</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-navy-950">
                {formatCount(total)}
              </p>
            </>
          )}
        </div>
      </div>
      <ul className="flex w-full min-w-0 flex-col gap-2" aria-label="Status legend">
        {segments.map((segment, index) => {
          const selected = activeIndex === index;

          return (
            <li key={segment.name}>
              <button
                type="button"
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
                onFocus={() => setActiveIndex(index)}
                onBlur={() => setActiveIndex(null)}
                className={[
                  "grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 rounded px-2 py-1.5 text-left transition-colors",
                  selected ? "bg-zinc-100" : "hover:bg-zinc-50",
                ].join(" ")}
              >
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: segment.color }}
                />
                <span className="min-w-0 truncate text-sm font-medium text-navy-950">
                  {segment.name}
                </span>
                <span className="text-sm tabular-nums text-zinc-700">
                  {formatCount(segment.count)}
                </span>
                <span className="w-12 text-right text-sm tabular-nums text-zinc-600">
                  {formatPercent(segment.percent)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

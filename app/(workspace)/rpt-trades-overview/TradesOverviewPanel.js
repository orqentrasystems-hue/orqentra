"use client";

import { useEffect, useMemo, useState } from "react";
import { loadTradesInterview } from "./actions";
import TradeStatusDonutChart from "./TradeStatusDonutChart";

const DATE_INPUT_CLASS =
  "rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-navy-950";

function toIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function defaultDateRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29);
  return { from: toIsoDate(from), to: toIsoDate(to) };
}

function fieldFromRow(row, names) {
  if (!row || typeof row !== "object") {
    return "";
  }

  for (const name of names) {
    const match = Object.keys(row).find(
      (key) => key.toLowerCase() === name.toLowerCase(),
    );
    const value = match ? row[match] : undefined;

    if (value != null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }

  return "";
}

function statusName(row) {
  return (
    fieldFromRow(row, [
      "trade_status",
      "status",
      "status_name",
      "descr",
      "description",
      "name",
    ]) || "Unspecified"
  );
}

function rowCount(row) {
  const raw = fieldFromRow(row, [
    "trade_count",
    "status_count",
    "count",
    "trades",
    "n",
  ]);

  if (raw === "") {
    return null;
  }

  const n = Number(String(raw).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function groupTradesByStatus(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const hasCounts = list.some((row) => rowCount(row) != null);
  const totals = new Map();

  for (const row of list) {
    const name = statusName(row);
    const count = hasCounts ? (rowCount(row) ?? 0) : 1;
    totals.set(name, (totals.get(name) ?? 0) + count);
  }

  return [...totals.entries()]
    .map(([name, count]) => ({ name, count }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function ChartSkeleton() {
  return (
    <div
      className="grid w-full grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(16rem,0.85fr)]"
      aria-hidden="true"
    >
      <div className="mx-auto flex h-[22rem] w-full max-w-[26rem] items-center justify-center">
        <div className="h-56 w-56 animate-pulse rounded-full border-[2.5rem] border-zinc-100" />
      </div>
      <div className="flex w-full flex-col gap-3">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="flex items-center gap-3 px-2 py-1.5">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-zinc-200" />
            <span className="h-3 flex-1 animate-pulse rounded bg-zinc-100" />
            <span className="h-3 w-8 animate-pulse rounded bg-zinc-100" />
            <span className="h-3 w-10 animate-pulse rounded bg-zinc-100" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TradesOverviewPanel() {
  const defaults = defaultDateRange();
  const [fromDate, setFromDate] = useState(defaults.from);
  const [toDate, setToDate] = useState(defaults.to);
  const [rows, setRows] = useState([]);
  const [pending, setPending] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setPending(true);
      setMessage("");
      const result = await loadTradesInterview(fromDate, toDate);

      if (cancelled) {
        return;
      }

      setRows(result.ok ? result.rows : []);
      setMessage(result.ok ? "" : result.message);
      setPending(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [fromDate, toDate]);

  const items = useMemo(() => groupTradesByStatus(rows), [rows]);
  const total = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <section className="w-1/2 min-w-0 self-start rounded border border-zinc-300 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-lg font-semibold text-navy-950">
            Trade Status Overview
          </h2>
          <p className="text-sm text-zinc-600">
            Distribution of trades for the selected period
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1" htmlFor="trades-overview-from">
            <span className="text-sm font-medium text-zinc-700">From Date</span>
            <input
              id="trades-overview-from"
              type="date"
              value={fromDate}
              max={toDate}
              onChange={(event) => setFromDate(event.target.value)}
              className={DATE_INPUT_CLASS}
            />
          </label>
          <label className="flex flex-col gap-1" htmlFor="trades-overview-to">
            <span className="text-sm font-medium text-zinc-700">To Date</span>
            <input
              id="trades-overview-to"
              type="date"
              value={toDate}
              min={fromDate}
              onChange={(event) => setToDate(event.target.value)}
              className={DATE_INPUT_CLASS}
            />
          </label>
        </div>
      </div>
      <div className="mt-6 min-h-[22rem]">
        {pending ? (
          <ChartSkeleton />
        ) : message ? (
          <p className="px-1 py-8 text-sm text-red-700">{message}</p>
        ) : total === 0 ? (
          <p className="px-1 py-8 text-sm text-zinc-600">
            No trades found for this period
          </p>
        ) : (
          <TradeStatusDonutChart items={items} total={total} />
        )}
      </div>
    </section>
  );
}

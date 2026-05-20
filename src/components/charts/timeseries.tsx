"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface Point {
  day: string;
  total: number;
  unique: number;
}

export function TimeseriesChart({ data }: { data: Point[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="oklch(0.58 0.20 250)" stopOpacity={0.5} />
              <stop offset="95%" stopColor="oklch(0.58 0.20 250)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="uniqueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="oklch(0.68 0.18 160)" stopOpacity={0.5} />
              <stop offset="95%" stopColor="oklch(0.68 0.18 160)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="day" fontSize={11} stroke="currentColor" />
          <YAxis fontSize={11} stroke="currentColor" />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Area type="monotone" dataKey="total" stroke="oklch(0.58 0.20 250)" fill="url(#totalGrad)" strokeWidth={2} />
          <Area type="monotone" dataKey="unique" stroke="oklch(0.68 0.18 160)" fill="url(#uniqueGrad)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

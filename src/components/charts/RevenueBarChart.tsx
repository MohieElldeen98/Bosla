"use client";

import { useId, useState } from "react";

export interface RevenueBarDatum {
  label: string;
  value: number;
}

function formatMoney(value: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
  } catch {
    return `${value.toFixed(0)} ${currency}`;
  }
}

/**
 * A single-series revenue bar chart (net revenue per time bucket) built
 * to the dataviz spec: thin baseline-anchored bars with rounded data
 * ends, a 2px surface gap between bars, recessive baseline, selective
 * direct labels (peak bucket only — never a number on every mark), a
 * per-bar hover tooltip, and a visually-hidden table so the data is
 * readable without the graphic. One series → the title names it, no
 * legend box; the bar hue is the brand primary and every piece of text
 * wears text tokens, never the series color. Negative buckets (refund-
 * heavy periods) render below the baseline in the destructive hue with
 * an icon-free but labeled tooltip.
 */
export function RevenueBarChart({
  data,
  currency,
  locale,
  title,
  height = 160,
}: {
  data: RevenueBarDatum[];
  currency: string;
  locale: string;
  title: string;
  height?: number;
}) {
  const tableId = useId();
  const [hovered, setHovered] = useState<number | null>(null);

  if (data.length === 0) return null;

  const max = Math.max(...data.map((d) => d.value), 0);
  const min = Math.min(...data.map((d) => d.value), 0);
  const range = max - min || 1;
  const peakIndex = data.reduce((best, d, i) => (d.value > data[best].value ? i : best), 0);

  const chartHeight = height;
  const labelZone = 20;
  const zeroY = chartHeight - labelZone - ((0 - min) / range) * (chartHeight - labelZone - 18);

  return (
    <figure role="group" aria-label={title} className="w-full">
      <div className="relative">
        <div
          role="img"
          aria-describedby={tableId}
          className="flex w-full items-stretch gap-[2px]"
          style={{ height: chartHeight }}
        >
          {data.map((d, index) => {
            const barHeight = Math.max((Math.abs(d.value) / range) * (chartHeight - labelZone - 18), d.value === 0 ? 2 : 3);
            const isNegative = d.value < 0;
            return (
              <div
                key={d.label}
                className="relative flex min-w-0 flex-1 flex-col"
                onMouseEnter={() => setHovered(index)}
                onMouseLeave={() => setHovered(null)}
              >
                {hovered === index && (
                  <div className="pointer-events-none absolute -top-1 start-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md">
                    <span className="font-medium">{d.label}</span>
                    <span className="ms-2">{formatMoney(d.value, currency, locale)}</span>
                  </div>
                )}
                {index === peakIndex && d.value > 0 && (
                  <span className="absolute start-1/2 -translate-x-1/2 text-[10px] font-medium text-muted-foreground" style={{ top: zeroY - ((d.value - min) / range) * (chartHeight - labelZone - 18) - 16 }}>
                    {formatMoney(d.value, currency, locale)}
                  </span>
                )}
                <div
                  aria-hidden="true"
                  className={`absolute start-1/2 w-[60%] max-w-7 -translate-x-1/2 ${
                    isNegative
                      ? "rounded-b-[4px] bg-destructive/80"
                      : "rounded-t-[4px] bg-primary"
                  } ${hovered === index ? "opacity-100" : "opacity-90"}`}
                  style={
                    isNegative
                      ? { top: zeroY, height: barHeight }
                      : { top: zeroY - barHeight, height: barHeight }
                  }
                />
                <span className="absolute bottom-0 start-1/2 -translate-x-1/2 truncate text-[10px] text-muted-foreground">
                  {d.label.slice(-2)}
                </span>
              </div>
            );
          })}
        </div>
        <div aria-hidden="true" className="absolute inset-x-0 border-t border-border/60" style={{ top: zeroY }} />
      </div>

      <table id={tableId} className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">Period</th>
            <th scope="col">Revenue ({currency})</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <td>{d.label}</td>
              <td>{d.value.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

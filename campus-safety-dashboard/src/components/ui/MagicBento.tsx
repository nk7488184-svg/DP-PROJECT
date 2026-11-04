'use client';

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState, CSSProperties, ReactNode } from 'react';

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

const THEMES: Record<string, Record<string, any>> = {
  dark: {
    '--mb-surface': 'linear-gradient(180deg, #141415 0%, #0d0d0e 100%)',
    '--mb-edge': 'rgba(255, 255, 255, 0.08)',
    '--mb-highlight': 'rgba(255, 255, 255, 0.08)',
    '--mb-shadow': '0 24px 48px -28px rgba(0, 0, 0, 0.85), 0 8px 18px -12px rgba(0, 0, 0, 0.6)',
    '--mb-tile': 'linear-gradient(180deg, #27272a 0%, #18181b 100%)',
    '--mb-tile-edge': 'rgba(255, 255, 255, 0.08)',
    '--mb-tile-highlight': 'rgba(255, 255, 255, 0.12)',
    '--mb-tile-shadow': '0 4px 10px -4px rgba(0, 0, 0, 0.7)',
    '--mb-well': 'rgba(255, 255, 255, 0.03)',
    '--mb-well-edge': 'rgba(255, 255, 255, 0.06)',
    '--mb-ink': '#f4f4f5',
    '--mb-muted': 'rgba(244, 244, 245, 0.6)',
    '--mb-faint': 'rgba(244, 244, 245, 0.3)',
    '--mb-line': 'rgba(244, 244, 245, 0.1)',
    '--mb-secondary': '#a1a1aa',
    '--mb-secondary-ink': '#121016',
    '--mb-cursor-stroke': 'rgba(18, 16, 22, 0.9)',
    '--mb-ring': 'rgba(18, 16, 22, 0.85)',
    '--mb-focus': 'rgba(244, 244, 245, 0.5)',
    '--mb-glow-alpha': 0.85,
    '--mb-spot-alpha': 0.07
  },
  light: {
    '--mb-surface': 'linear-gradient(180deg, #ffffff 0%, #f7f7f9 100%)',
    '--mb-edge': 'rgba(24, 24, 27, 0.08)',
    '--mb-highlight': 'rgba(255, 255, 255, 1)',
    '--mb-shadow': '0 24px 48px -30px rgba(24, 24, 27, 0.28), 0 8px 18px -14px rgba(24, 24, 27, 0.16)',
    '--mb-tile': 'linear-gradient(180deg, #ffffff 0%, #f6f6f8 100%)',
    '--mb-tile-edge': 'rgba(24, 24, 27, 0.08)',
    '--mb-tile-highlight': 'rgba(255, 255, 255, 1)',
    '--mb-tile-shadow': '0 4px 10px -5px rgba(24, 24, 27, 0.22)',
    '--mb-well': 'rgba(24, 24, 27, 0.025)',
    '--mb-well-edge': 'rgba(24, 24, 27, 0.06)',
    '--mb-ink': '#18181b',
    '--mb-muted': 'rgba(24, 24, 27, 0.6)',
    '--mb-faint': 'rgba(24, 24, 27, 0.3)',
    '--mb-line': 'rgba(24, 24, 27, 0.08)',
    '--mb-secondary': '#71717a',
    '--mb-secondary-ink': '#ffffff',
    '--mb-cursor-stroke': '#ffffff',
    '--mb-ring': '#ffffff',
    '--mb-focus': 'rgba(24, 24, 27, 0.4)',
    '--mb-glow-alpha': 0.5,
    '--mb-spot-alpha': 0.035
  }
};

const INK: Record<string, [number, number, number]> = { dark: [244, 244, 245], light: [24, 24, 27] };
const MIN_CELL = 150;
const MIN_PAIR = 200;
const STAGGER = 80;
const TILT = 6;
const MAGNET = 6;

const ROOT_CLASS =
  'magic-bento relative box-border grid w-full [grid-auto-flow:row_dense] text-[color:var(--mb-ink)] [-webkit-tap-highlight-color:transparent]';
const CELL_CLASS = 'magic-bento__cell relative min-h-0 min-w-0 [--mb-delay:0ms]';
const CARD_CLASS =
  'magic-bento__card relative box-border isolate flex h-full w-full select-none flex-col overflow-hidden rounded-[var(--mb-radius)] text-[color:var(--mb-ink)] no-underline outline-none [background:var(--mb-surface)] [box-shadow:var(--mb-shadow)] [transform:perspective(900px)_translate3d(var(--mb-tx,0px),var(--mb-ty,0px),0)_rotateX(var(--mb-rx,0deg))_rotateY(var(--mb-ry,0deg))_scale(var(--mb-press,1))] data-[clickable]:cursor-pointer focus-visible:[box-shadow:var(--mb-shadow),0_0_0_2px_var(--mb-focus)]';
const LIGHT_CLASS = 'pointer-events-none absolute inset-0 z-[1] rounded-[inherit]';
const STARS_CLASS = 'pointer-events-none absolute inset-0 z-[1] block h-full w-full';
const RIM_CLASS =
  'pointer-events-none absolute inset-0 z-[3] rounded-[inherit] [box-shadow:inset_0_0_0_1px_var(--mb-edge),inset_0_1px_0_var(--mb-highlight)]';
const BORDER_CLASS = 'pointer-events-none absolute inset-0 z-[4] box-border rounded-[inherit] p-px';
const CONTENT_CLASS = 'relative z-[2] box-border flex min-h-0 flex-1 flex-col gap-3 p-[var(--mb-pad)]';
const HEADER_CLASS =
  'flex min-w-0 items-center gap-2 text-[12px] leading-4 font-medium text-[color:var(--mb-muted)]';
const ICON_CLASS = 'grid h-4 w-4 flex-none place-items-center text-[color:var(--mb-ink)]';
const LABEL_CLASS = 'overflow-hidden text-ellipsis whitespace-nowrap text-xs font-semibold text-emerald-400';
const VISUAL_CLASS = 'relative flex min-h-[150px] flex-1 flex-col justify-center w-full my-1';
const TEXT_CLASS = 'mt-auto flex flex-col gap-1';
const TITLE_CLASS =
  'm-0 text-[15px] leading-5 font-semibold tracking-[-0.01em] text-[color:var(--mb-ink)]';
const DESCRIPTION_CLASS =
  'm-0 text-[12.5px] leading-[1.45] text-[color:var(--mb-muted)]';
const CHART_CLASS = 'magic-bento__chart flex min-h-0 flex-1 touch-none select-none flex-col';
const FIGURE_CLASS = 'flex min-w-0 items-baseline gap-1.5 whitespace-nowrap';
const FIGURE_VALUE_CLASS =
  'text-[18px] leading-[22px] font-bold tracking-[-0.02em] text-emerald-400 font-mono tabular-nums';
const FIGURE_NOTE_CLASS =
  'min-w-0 overflow-hidden text-ellipsis text-[11.5px] leading-[14px] text-purple-400 font-medium tabular-nums';
const PLOT_CLASS =
  'relative mt-1.5 min-h-0 flex-1 touch-none select-none [&_svg]:absolute [&_svg]:inset-0 [&_svg]:block [&_svg]:h-full [&_svg]:w-full [&_svg]:overflow-visible';
const CHART_AREA_CLASS = 'magic-bento__chart-area [fill:rgba(16,185,129,0.18)]';
const CHART_LINE_CLASS =
  'magic-bento__chart-line fill-none stroke-emerald-400 [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:2]';
const SCRUB_CLASS =
  'pointer-events-none absolute top-0 bottom-0 left-0 w-px opacity-0 transition-opacity duration-[180ms] [background:linear-gradient(to_bottom,rgba(16,185,129,0),rgba(16,185,129,0.5))] [[data-scrub]_&]:opacity-100';
const SCRUB_DOT_CLASS =
  'absolute top-0 left-0 -mt-[4px] -ml-[3.5px] h-[8px] w-[8px] rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]';
const BARS_CLASS = 'magic-bento__bars flex min-h-0 flex-1 flex-col';
const BARS_PLOT_CLASS = 'mt-2 flex min-h-0 flex-1 items-end gap-[6px]';
const BAR_CLASS =
  'magic-bento__bar relative h-[calc(var(--h)*100%)] min-h-[4px] flex-1 origin-bottom rounded-[4px_4px_2px_2px] bg-emerald-500/25 transition-[background-color,filter] duration-200 hover:bg-emerald-500/60 data-[peak]:bg-emerald-400 data-[peak]:shadow-[0_0_10px_rgba(16,185,129,0.5)]';

const FALLOFF = [1, 0.973, 0.837, 0.593, 0.317, 0.104, 0.009];

const glowStops = (alpha: string, weight: string) =>
  `${FALLOFF.map(
    (fall, index) => `rgba(var(--mb-glow-rgb), calc(var(${alpha}) * var(${weight}, 0) * ${fall})) ${index * 15}%`
  ).join(', ')}, rgba(var(--mb-glow-rgb), 0) 100%`;

const LIGHT_STYLE: CSSProperties = {
  background: `radial-gradient(var(--mb-spot-size) circle at var(--mb-x, -999px) var(--mb-y, -999px), ${glowStops('--mb-spot-alpha', '--mb-hot')})`
};

const WAVE = [
  ['0', '110px'],
  ['0.1', '80px'],
  ['0.32', '52px'],
  ['0.68', '28px'],
  ['0.94', '10px'],
  ['1', '3px']
];

const BORDER_STYLE: CSSProperties = {
  background: `radial-gradient(var(--mb-border-size) circle at var(--mb-x, -999px) var(--mb-y, -999px), ${glowStops('--mb-glow-alpha', '--mb-near')}), radial-gradient(circle at var(--mb-wx, -999px) var(--mb-wy, -999px), ${WAVE.map(
    ([alpha, offset]) =>
      `rgba(var(--mb-glow-rgb), calc(var(--mb-glow-alpha) * var(--mb-wa, 0) * ${alpha})) calc(var(--mb-wr, 0px) - ${offset})`
  ).join(', ')}, rgba(var(--mb-glow-rgb), 0) var(--mb-wr, 0px))`,
  WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
  WebkitMaskComposite: 'xor',
  mask: 'linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)'
};

const STYLE = `
.magic-bento{--mb-spring:cubic-bezier(0.34, 1.4, 0.64, 1)}
.magic-bento[data-intro] .magic-bento__cell{opacity: 0;transform: translate3d(0,16px,0) scale(0.97)}
.magic-bento[data-intro] .magic-bento__cell[data-state='in']{opacity: 1;transform: none;transition: opacity 420ms cubic-bezier(0.22,1,0.36,1) var(--mb-delay),transform 760ms var(--mb-spring) var(--mb-delay)}
.magic-bento[data-motion] .magic-bento__chart-line{stroke-dasharray: 1;animation: magic-bento-draw 1100ms cubic-bezier(0.65,0,0.35,1) calc(var(--mb-delay) + 220ms) both paused}
.magic-bento[data-motion] .magic-bento__chart-area{animation: magic-bento-fade 700ms ease calc(var(--mb-delay) + 700ms) both paused}
.magic-bento[data-motion] .magic-bento__bar{animation: magic-bento-grow 760ms var(--mb-spring) calc(var(--mb-delay) + 200ms + var(--i) * 55ms) both paused}
.magic-bento[data-motion] .magic-bento__cell[data-state='in'] :is( .magic-bento__chart-line,.magic-bento__chart-area,.magic-bento__bar ){animation-play-state: running}
@keyframes magic-bento-draw{from{stroke-dashoffset: 1}to{stroke-dashoffset: 0}}
@keyframes magic-bento-fade{from{opacity: 0}to{opacity: 1}}
@keyframes magic-bento-grow{from{transform: scaleY(0)}to{transform: scaleY(1)}}
`;

export interface MagicBentoItem {
  id?: string | number;
  label?: string;
  title?: string;
  description?: string;
  icon?: ReactNode;
  visual?: 'analytics' | 'dashboard' | ReactNode;
  content?: ReactNode;
  href?: string;
  target?: string;
  rel?: string;
  onClick?: (event: React.MouseEvent) => void;
  colSpan?: number;
  rowSpan?: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const vars = (values: Record<string, any>) => values as CSSProperties;

const parseRgb = (value?: string): [number, number, number] | null => {
  if (!value) return null;
  const text = String(value).trim();
  const hex = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text);
  if (hex) {
    const full = hex[1].length === 3 ? hex[1].replace(/./g, digit => digit + digit) : hex[1];
    return [0, 2, 4].map(index => parseInt(full.slice(index, index + 2), 16)) as [number, number, number];
  }
  const numbers = text.match(/[\d.]+/g);
  if (numbers && numbers.length >= 3 && /^(rgba?\(|[\d.\s,]+$)/i.test(text)) {
    return numbers.slice(0, 3).map(channel => clamp(Math.round(parseFloat(channel)), 0, 255)) as [
      number,
      number,
      number
    ];
  }
  return null;
};

const inkFor = (rgb: [number, number, number]) => {
  const [r, g, b] = rgb.map(channel => channel / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.55 ? '#121016' : '#ffffff';
};

// 24-hour speed profile points (km/h) for the velocity chart
const SPEED_POINTS = [34, 38, 42, 58, 64, 71, 74, 68, 62, 54, 45, 38];

const curve = (values: number[], width: number, height: number) => {
  const top = 8;
  const bottom = 4;
  const low = 20;
  const high = 80;
  const points: [number, number][] = values.map((value, index) => [
    (index / (values.length - 1)) * width,
    top + (1 - (value - low) / (high - low)) * (height - top - bottom)
  ]);
  const count = points.length;
  const slopes: number[] = [];
  for (let i = 0; i < count - 1; i++) {
    slopes.push((points[i + 1][1] - points[i][1]) / (points[i + 1][0] - points[i][0]));
  }
  const tangents = points.map((_, i) => {
    if (i === 0) return slopes[0];
    if (i === count - 1) return slopes[count - 2];
    return slopes[i - 1] * slopes[i] > 0 ? (slopes[i - 1] + slopes[i]) / 2 : 0;
  });
  let line = `M${points[0][0].toFixed(2)},${points[0][1].toFixed(2)}`;
  const samples: [number, number][] = [];
  for (let i = 0; i < count - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    const third = (x1 - x0) / 3;
    const c1 = [x0 + third, y0 + tangents[i] * third];
    const c2 = [x1 - third, y1 - tangents[i + 1] * third];
    line += ` C${c1[0].toFixed(2)},${c1[1].toFixed(2)} ${c2[0].toFixed(2)},${c2[1].toFixed(2)} ${x1.toFixed(2)},${y1.toFixed(2)}`;
    for (let step = 0; step < 12; step++) {
      const t = step / 12;
      const u = 1 - t;
      samples.push([
        u * u * u * x0 + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * x1,
        u * u * u * y0 + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * y1
      ]);
    }
  }
  samples.push(points[count - 1]);
  const area = `${line} L${width.toFixed(2)},${height.toFixed(2)} L0,${height.toFixed(2)} Z`;
  return { line, area, samples };
};

const sampleAt = (samples: [number, number][], x: number) => {
  let index = 1;
  while (index < samples.length - 1 && samples[index][0] < x) index++;
  const [x0, y0] = samples[index - 1];
  const [x1, y1] = samples[index];
  const t = x1 === x0 ? 0 : clamp((x - x0) / (x1 - x0), 0, 1);
  return y0 + (y1 - y0) * t;
};

const AnalyticsVisual = () => {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const plotRef = useRef<HTMLDivElement | null>(null);
  const scrubRef = useRef<HTMLSpanElement | null>(null);
  const dotRef = useRef<HTMLSpanElement | null>(null);
  const valueRef = useRef<HTMLSpanElement | null>(null);
  const noteRef = useRef<HTMLSpanElement | null>(null);
  const [size, setSize] = useState<{ width: number; height: number }>({ width: 480, height: 160 });

  useIsomorphicLayoutEffect(() => {
    const plot = plotRef.current;
    if (!plot) return;
    const update = () => {
      const rect = plot.getBoundingClientRect();
      const w = rect.width > 20 ? rect.width : (plot.clientWidth > 20 ? plot.clientWidth : 480);
      const h = rect.height > 20 ? rect.height : (plot.clientHeight > 20 ? plot.clientHeight : 160);
      setSize(previous =>
        previous && previous.width === Math.round(w) && previous.height === Math.round(h)
          ? previous
          : { width: Math.round(w), height: Math.round(h) }
      );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(plot);
    return () => observer.disconnect();
  }, []);

  const shape = useMemo(
    () => curve(SPEED_POINTS, size.width, size.height),
    [size]
  );

  const limitY = useMemo(() => {
    const top = 10;
    const bottom = 22;
    const low = 20;
    const high = 80;
    return top + (1 - (50 - low) / (high - low)) * (size.height - top - bottom);
  }, [size.height]);

  const scrub = (event: React.PointerEvent) => {
    const plot = plotRef.current;
    const chart = chartRef.current;
    const line = scrubRef.current;
    const dot = dotRef.current;
    const label = valueRef.current;
    const note = noteRef.current;
    if (!shape || !plot || !chart || !line || !dot || !label || !note) return;
    const rect = plot.getBoundingClientRect();
    const x = clamp(event.clientX - rect.left, 0, rect.width);
    const y = sampleAt(shape.samples, x);
    const position = (x / Math.max(1, rect.width)) * (SPEED_POINTS.length - 1);
    const index = Math.floor(position);
    const next = Math.min(SPEED_POINTS.length - 1, index + 1);
    const value = SPEED_POINTS[index] + (SPEED_POINTS[next] - SPEED_POINTS[index]) * (position - index);
    chart.dataset.scrub = '';
    line.style.transform = `translateX(${x.toFixed(1)}px)`;
    dot.style.transform = `translateY(${y.toFixed(1)}px)`;
    label.textContent = `${Math.round(value)} km/h`;
    const hour = Math.round(position * 2);
    note.textContent = `${hour.toString().padStart(2, '0')}:00 hrs (${value > 50 ? 'OVERSPEED' : 'NORMAL'})`;
    note.className = value > 50
      ? 'min-w-0 overflow-hidden text-ellipsis text-[11.5px] leading-[14px] text-rose-400 font-bold tabular-nums'
      : 'min-w-0 overflow-hidden text-ellipsis text-[11.5px] leading-[14px] text-emerald-400 font-medium tabular-nums';
  };

  const rest = () => {
    if (chartRef.current) delete chartRef.current.dataset.scrub;
    if (valueRef.current) valueRef.current.textContent = `74 km/h`;
    if (noteRef.current) {
      noteRef.current.textContent = `P85 Peak (+48% over limit)`;
      noteRef.current.className = 'min-w-0 overflow-hidden text-ellipsis text-[11.5px] leading-[14px] text-rose-400 font-medium tabular-nums';
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch {}
    scrub(event);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    try {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    } catch {}
    rest();
  };

  return (
    <div
      ref={chartRef}
      className="magic-bento__chart flex w-full flex-1 touch-none select-none flex-col min-h-[160px]"
      onPointerMove={scrub}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={rest}
    >
      <div className="flex min-w-0 items-baseline gap-2 whitespace-nowrap mb-1">
        <span ref={valueRef} className="text-[20px] leading-[24px] font-black tracking-tight text-emerald-400 font-mono tabular-nums">
          74 km/h
        </span>
        <span ref={noteRef} className="min-w-0 overflow-hidden text-ellipsis text-[11.5px] leading-[14px] text-rose-400 font-medium tabular-nums">
          P85 Peak (+48% over limit)
        </span>
      </div>

      <div ref={plotRef} className="relative w-full flex-1 min-h-[130px] h-[150px] sm:h-[180px] touch-none select-none overflow-visible">
        <svg
          viewBox={`0 0 ${size.width} ${size.height}`}
          className="absolute inset-0 block h-full w-full overflow-visible"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="velocityGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
              <stop offset="65%" stopColor="#10b981" stopOpacity="0.10" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
            <filter id="emeraldGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#10b981" floodOpacity="0.6" />
            </filter>
          </defs>

          {/* Grid lines */}
          <line x1="0" y1={size.height * 0.25} x2={size.width} y2={size.height * 0.25} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
          <line x1="0" y1={size.height * 0.5} x2={size.width} y2={size.height * 0.5} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
          <line x1="0" y1={size.height * 0.75} x2={size.width} y2={size.height * 0.75} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />

          {/* Speed Limit Reference Line (50 km/h) */}
          <line
            x1="0"
            y1={limitY}
            x2={size.width}
            y2={limitY}
            stroke="#f43f5e"
            strokeWidth="1.2"
            strokeDasharray="4 4"
            opacity="0.8"
          />
          <text
            x={size.width - 6}
            y={limitY - 5}
            textAnchor="end"
            fill="#f43f5e"
            fontSize="9"
            fontWeight="bold"
            fontFamily="monospace"
            letterSpacing="0.05em"
          >
            LIMIT: 50 km/h
          </text>

          {/* Area Fill */}
          <path d={shape.area} fill="url(#velocityGrad)" />

          {/* Velocity Profile Line */}
          <path
            d={shape.line}
            fill="none"
            stroke="#10b981"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#emeraldGlow)"
          />

          {/* Time axis markers at bottom */}
          <text x="4" y={size.height - 4} fill="rgba(255,255,255,0.3)" fontSize="8.5" fontFamily="monospace">00:00</text>
          <text x={size.width * 0.25} y={size.height - 4} fill="rgba(255,255,255,0.3)" fontSize="8.5" fontFamily="monospace" textAnchor="middle">06:00</text>
          <text x={size.width * 0.5} y={size.height - 4} fill="rgba(255,255,255,0.3)" fontSize="8.5" fontFamily="monospace" textAnchor="middle">12:00</text>
          <text x={size.width * 0.75} y={size.height - 4} fill="rgba(255,255,255,0.3)" fontSize="8.5" fontFamily="monospace" textAnchor="middle">18:00</text>
          <text x={size.width - 4} y={size.height - 4} fill="rgba(255,255,255,0.3)" fontSize="8.5" fontFamily="monospace" textAnchor="end">24:00</text>
        </svg>

        {/* Scrub vertical guide line & dot */}
        <span
          ref={scrubRef}
          className="pointer-events-none absolute top-0 bottom-4 left-0 w-px opacity-0 transition-opacity duration-150 bg-gradient-to-b from-emerald-400 via-emerald-500/80 to-transparent [[data-scrub]_&]:opacity-100 z-10"
        >
          <span
            ref={dotRef}
            className="absolute top-0 left-0 -mt-1.5 -ml-1.5 w-3 h-3 rounded-full bg-emerald-400 ring-4 ring-emerald-500/30 shadow-[0_0_12px_#10b981]"
          />
        </span>
      </div>
    </div>
  );
};

// Hourly traffic volume distributions (normalized 0-1)
const TRIP_DENSITIES = [22, 35, 48, 88, 96, 75, 68, 92, 100, 84, 52, 38];
const HOURS = ['00', '02', '04', '06', '08', '10', '12', '14', '16', '18', '20', '22'];

const DashboardVisual = () => (
  <div className="flex w-full flex-1 flex-col justify-between min-h-[140px] pt-1">
    <div className="flex min-w-0 items-baseline gap-2 whitespace-nowrap mb-2">
      <span className="text-[18px] leading-[22px] font-black tracking-tight text-emerald-400 font-mono tabular-nums">
        156 Active Trips
      </span>
      <span className="min-w-0 overflow-hidden text-ellipsis text-[11.5px] leading-[14px] text-emerald-400/80 font-medium tabular-nums">
        Peak: 10:00 &amp; 16:00 hrs
      </span>
    </div>

    <div className="flex items-end gap-1.5 sm:gap-2 w-full h-[90px] sm:h-[110px] min-h-[85px] px-1 pb-1">
      {TRIP_DENSITIES.map((height, index) => {
        const isPeak = height >= 90;
        return (
          <div
            key={index}
            className="relative flex-1 min-w-[8px] flex flex-col items-center justify-end h-full group cursor-pointer"
          >
            <div
              className={`w-full rounded-t-sm transition-all duration-300 group-hover:brightness-125 ${
                isPeak
                  ? 'bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.55)]'
                  : height >= 60
                  ? 'bg-emerald-500/50'
                  : 'bg-emerald-500/25'
              }`}
              style={{ height: `${height}%` }}
            />
            <span className="text-[8px] font-mono text-zinc-500 mt-1 opacity-75 group-hover:opacity-100 group-hover:text-emerald-400 transition-opacity">
              {HOURS[index]}
            </span>
          </div>
        );
      })}
    </div>
  </div>
);

const VISUALS: Record<string, () => React.JSX.Element> = {
  analytics: AnalyticsVisual,
  dashboard: DashboardVisual
};

export interface MagicBentoProps {
  items?: MagicBentoItem[];
  columns?: number;
  rowHeight?: number;
  gap?: number;
  radius?: number;
  theme?: 'dark' | 'light';
  glowColor?: string;
  enableBorderGlow?: boolean;
  enableSpotlight?: boolean;
  spotlightRadius?: number;
  enableTilt?: boolean;
  enableMagnetism?: boolean;
  clickEffect?: boolean;
  className?: string;
  style?: CSSProperties;
}

export const MagicBento: React.FC<MagicBentoProps> = ({
  items = [],
  columns = 4,
  rowHeight = 200,
  gap = 12,
  radius = 20,
  theme = 'dark',
  glowColor = '#10b981',
  enableBorderGlow = true,
  enableSpotlight = true,
  spotlightRadius = 300,
  enableTilt = false,
  enableMagnetism = false,
  clickEffect = true,
  className = '',
  style
}) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const cellRefs = useRef<(HTMLDivElement | null)[]>([]);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const [cols, setCols] = useState(Math.max(1, Math.round(columns)));

  const palette = theme === 'light' ? 'light' : 'dark';
  const glow = parseRgb(glowColor) ?? INK[palette];
  const settings = {
    items,
    columns: Math.max(1, Math.round(columns)),
    gap: Math.max(0, gap),
    enableBorderGlow,
    enableSpotlight,
    spotlightRadius: Math.max(40, spotlightRadius),
    enableTilt,
    enableMagnetism,
    clickEffect,
    glow
  };
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    root.dataset.motion = '';

    const pointer = { x: -1e5, y: -1e5, inside: false, down: -1 };
    const light = { x: -1e5, y: -1e5, near: 0, ready: false };
    const states: any[] = [];
    const wave = { x: 0, y: 0, t: -1, duration: 1.1, reach: 800 };
    let rects: (DOMRect | null)[] = [];
    let bounds: DOMRect | null = null;
    let dirty = true;
    let raf = 0;
    let last = 0;
    let visible = true;

    const stateFor = (index: number) => {
      if (!states[index]) {
        states[index] = {
          hot: 0,
          rx: 0,
          ry: 0,
          tx: 0,
          ty: 0,
          vrx: 0,
          vry: 0,
          vtx: 0,
          vty: 0,
          press: 1,
          vpress: 0,
          active: false,
          written: {}
        };
      }
      return states[index];
    };

    const write = (element: HTMLElement, state: any, name: string, value: string) => {
      if (state.written[name] === value) return;
      state.written[name] = value;
      element.style.setProperty(name, value);
    };

    const measure = () => {
      dirty = false;
      bounds = root.getBoundingClientRect();
      rects = cellRefs.current.map(cell => (cell ? cell.getBoundingClientRect() : null));
    };

    const startWave = (x: number, y: number, duration: number) => {
      if (!bounds) return;
      wave.x = x;
      wave.y = y;
      wave.t = 0;
      wave.duration = duration;
      wave.reach =
        Math.max(
          Math.hypot(x - bounds.left, y - bounds.top),
          Math.hypot(x - bounds.right, y - bounds.top),
          Math.hypot(x - bounds.left, y - bounds.bottom),
          Math.hypot(x - bounds.right, y - bounds.bottom)
        ) + 140;
    };

    const frame = (now: number) => {
      raf = 0;
      const dt = Math.min(0.05, (now - last) / 1000 || 0);
      last = now;
      if (dirty) measure();
      const s = settingsRef.current;
      const cards = cardRefs.current;
      let busy = false;

      const margin = s.spotlightRadius * 0.5;
      const near =
        pointer.inside &&
        bounds &&
        pointer.x > bounds.left - margin &&
        pointer.x < bounds.right + margin &&
        pointer.y > bounds.top - margin &&
        pointer.y < bounds.bottom + margin
          ? 1
          : 0;
      if (!light.ready && near) {
        light.x = pointer.x;
        light.y = pointer.y;
        light.ready = true;
      }
      const follow = 1 - Math.exp(-dt / 0.05);
      light.x += (pointer.x - light.x) * follow;
      light.y += (pointer.y - light.y) * follow;
      const fade = 1 - Math.exp(-dt / (near > light.near ? 0.12 : 0.4));
      light.near += (near - light.near) * fade;
      if (Math.abs(near - light.near) < 0.002) light.near = near;
      else busy = true;
      if (Math.abs(pointer.x - light.x) + Math.abs(pointer.y - light.y) > 0.3) busy = true;

      let waveRadius = 0;
      let waveAlpha = 0;
      if (wave.t >= 0) {
        wave.t += dt;
        const progress = Math.min(1, wave.t / wave.duration);
        waveRadius = wave.reach * (1 - Math.pow(1 - progress, 2.2));
        waveAlpha = Math.pow(1 - progress, 1.3);
        if (progress >= 1) {
          wave.t = -1;
          waveAlpha = 0;
        } else busy = true;
      }

      cards.forEach((card, index) => {
        const rect = rects[index];
        if (!card || !rect) return;
        const state = stateFor(index);
        const lx = light.x - rect.left;
        const ly = light.y - rect.top;
        const px = pointer.x - rect.left;
        const py = pointer.y - rect.top;
        const inside = pointer.inside && px >= 0 && py >= 0 && px <= rect.width && py <= rect.height;

        if (inside !== state.active) {
          state.active = inside;
          if (inside) card.dataset.active = '';
          else delete card.dataset.active;
        }

        const hotTarget = inside && s.enableSpotlight ? 1 : 0;
        state.hot += (hotTarget - state.hot) * (1 - Math.exp(-dt / (hotTarget > state.hot ? 0.14 : 0.32)));
        if (Math.abs(hotTarget - state.hot) < 0.002) state.hot = hotTarget;
        else busy = true;

        const u = clamp(px / Math.max(1, rect.width), 0, 1) - 0.5;
        const v = clamp(py / Math.max(1, rect.height), 0, 1) - 0.5;
        const tilt = inside && s.enableTilt;
        const magnet = inside && s.enableMagnetism;
        const targets = [
          tilt ? -v * 2 * TILT : 0,
          tilt ? u * 2 * TILT : 0,
          magnet ? u * 2 * MAGNET : 0,
          magnet ? v * 2 * MAGNET : 0
        ];
        const keys = [
          ['rx', 'vrx'],
          ['ry', 'vry'],
          ['tx', 'vtx'],
          ['ty', 'vty']
        ];
        const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
        const h = dt / steps;
        keys.forEach(([key, velocity], k) => {
          for (let step = 0; step < steps; step++) {
            state[velocity] += (170 * (targets[k] - state[key]) - 20 * state[velocity]) * h;
            state[key] += state[velocity] * h;
          }
          if (Math.abs(targets[k] - state[key]) < 0.002 && Math.abs(state[velocity]) < 0.01) {
            state[key] = targets[k];
            state[velocity] = 0;
          } else busy = true;
        });

        const pressTarget = pointer.down === index && s.clickEffect ? 0.985 : 1;
        for (let step = 0; step < steps; step++) {
          state.vpress += (420 * (pressTarget - state.press) - 28 * state.vpress) * h;
          state.press += state.vpress * h;
        }
        if (Math.abs(pressTarget - state.press) < 0.0002 && Math.abs(state.vpress) < 0.001) {
          state.press = pressTarget;
          state.vpress = 0;
        } else busy = true;

        write(card, state, '--mb-x', `${lx.toFixed(1)}px`);
        write(card, state, '--mb-y', `${ly.toFixed(1)}px`);
        write(card, state, '--mb-near', (s.enableBorderGlow ? light.near : 0).toFixed(3));
        write(card, state, '--mb-hot', state.hot.toFixed(3));
        write(card, state, '--mb-rx', `${state.rx.toFixed(3)}deg`);
        write(card, state, '--mb-ry', `${state.ry.toFixed(3)}deg`);
        write(card, state, '--mb-tx', `${state.tx.toFixed(2)}px`);
        write(card, state, '--mb-ty', `${state.ty.toFixed(2)}px`);
        write(card, state, '--mb-press', state.press.toFixed(4));
        write(card, state, '--mb-wx', `${(wave.x - rect.left).toFixed(1)}px`);
        write(card, state, '--mb-wy', `${(wave.y - rect.top).toFixed(1)}px`);
        write(card, state, '--mb-wr', `${waveRadius.toFixed(1)}px`);
        write(card, state, '--mb-wa', waveAlpha.toFixed(3));
      });

      if (busy && visible) raf = requestAnimationFrame(frame);
    };

    const wake = () => {
      if (raf || !visible) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };

    const cardIndex = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return -1;
      const card = target.closest('.magic-bento__card');
      return card instanceof HTMLElement ? cardRefs.current.indexOf(card) : -1;
    };

    const onPointerMove = (event: PointerEvent) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.inside = true;
      wake();
    };

    const onPointerOut = (event: PointerEvent) => {
      if (event.relatedTarget) return;
      pointer.inside = false;
      pointer.down = -1;
      wake();
    };

    const onPointerDown = (event: PointerEvent) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.inside = true;
      pointer.down = cardIndex(event.target);
      wake();
    };

    const release = () => {
      if (pointer.down < 0) return;
      pointer.down = -1;
      wake();
    };

    const activate = (index: number, x: number, y: number) => {
      const s = settingsRef.current;
      const card = cardRefs.current[index];
      if (!card) return;
      if (s.clickEffect) {
        if (dirty) measure();
        startWave(x, y, 1.1);
      }
      wake();
    };

    const onClick = (event: MouseEvent) => {
      const index = cardIndex(event.target);
      const card = cardRefs.current[index];
      if (!card) return;
      if (event.detail === 0) {
        const rect = card.getBoundingClientRect();
        activate(index, rect.left + rect.width / 2, rect.top + rect.height / 2);
      } else activate(index, event.clientX, event.clientY);
    };

    const resizeObserver = new ResizeObserver(() => {
      const s = settingsRef.current;
      const width = root.clientWidth;
      const cell = (count: number) => (width - s.gap * (count - 1)) / count;
      const next = cell(s.columns) >= MIN_CELL ? s.columns : s.columns >= 2 && cell(2) >= MIN_PAIR ? 2 : 1;
      setCols(next);
      dirty = true;
      wake();
    });
    resizeObserver.observe(root);

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointerup', release, { passive: true });
    window.addEventListener('pointercancel', release, { passive: true });
    document.addEventListener('pointerout', onPointerOut);
    root.addEventListener('click', onClick);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
      document.removeEventListener('pointerout', onPointerOut);
      root.removeEventListener('click', onClick);
    };
  }, []);

  const ink = INK[palette];
  const accent = parseRgb(glowColor) ?? ink;
  const corner = Math.max(0, radius);
  const span = Math.max(1, cols);

  cellRefs.current.length = items.length;
  cardRefs.current.length = items.length;

  return (
    <div
      ref={rootRef}
      className={`${ROOT_CLASS} ${className}`.trim()}
      style={{
        ...vars({
          ...THEMES[palette],
          '--mb-glow-rgb': glow.join(', '),
          '--mb-accent-rgb': accent.join(', '),
          '--mb-accent-ink': inkFor(accent),
          '--mb-radius': `${corner}px`,
          '--mb-inner-radius': `${Math.round(clamp(corner * 0.5, 6, 12))}px`,
          '--mb-pad': `${Math.round(clamp(corner * 0.85, 14, 20))}px`,
          '--mb-spot-size': `${Math.max(40, spotlightRadius)}px`,
          '--mb-border-size': `${Math.round(Math.max(40, spotlightRadius) * 0.75)}px`
        }),
        gridTemplateColumns: `repeat(${span}, minmax(0, 1fr))`,
        gridAutoRows: span === 1 ? `minmax(180px, auto)` : `${rowHeight}px`,
        gap: `${Math.max(0, gap)}px`,
        ...style
      }}
    >
      <style>{STYLE}</style>
      {items.map((item, index) => {
        const entry = item ?? {};
        const Visual = typeof entry.visual === 'string' ? VISUALS[entry.visual] : null;
        const visual = Visual ? <Visual /> : typeof entry.visual === 'string' ? null : entry.visual;
        const cardProps = {
          ref: (element: HTMLElement | null) => {
            cardRefs.current[index] = element;
          },
          className: CARD_CLASS,
          onClick: entry.onClick
        };
        const body = (
          <>
            {enableSpotlight && <span className={LIGHT_CLASS} style={LIGHT_STYLE} />}
            <div className={CONTENT_CLASS}>
              {entry.content ?? (
                <>
                  {(entry.icon || entry.label) && (
                    <div className={HEADER_CLASS}>
                      {entry.icon && <span className={ICON_CLASS}>{entry.icon}</span>}
                      {entry.label && <span className={LABEL_CLASS}>{entry.label}</span>}
                    </div>
                  )}
                  {visual && (
                    <div className={VISUAL_CLASS} aria-hidden="true">
                      {visual}
                    </div>
                  )}
                  {(entry.title || entry.description) && (
                    <div className={TEXT_CLASS}>
                      {entry.title && <h3 className={TITLE_CLASS}>{entry.title}</h3>}
                      {entry.description && <p className={DESCRIPTION_CLASS}>{entry.description}</p>}
                    </div>
                  )}
                </>
              )}
            </div>
            <span className={RIM_CLASS} />
            <span className={BORDER_CLASS} style={BORDER_STYLE} />
          </>
        );

        return (
          <div
            key={entry.id ?? index}
            ref={element => {
              cellRefs.current[index] = element;
            }}
            className={CELL_CLASS}
            style={{
              gridColumn: `span ${Math.min(span, Math.max(1, Math.round(entry.colSpan ?? 1)))}`,
              gridRow: `span ${span === 1 ? 1 : Math.max(1, Math.round(entry.rowSpan ?? 1))}`
            }}
          >
            {entry.href ? (
              <a {...cardProps} href={entry.href} target={entry.target} rel={entry.rel}>
                {body}
              </a>
            ) : (
              <div {...cardProps}>
                {body}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default MagicBento;

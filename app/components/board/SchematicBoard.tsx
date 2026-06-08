"use client";

import { cn } from "@/lib/utils.js";
import { CONTINENT_COLOR, NODE_POS, ownerColor } from "@/lib/game/layout.js";
import type { BoardProps } from "./Board.js";

// Keyframe animations for the Radar/HUD look, all gated behind prefers-reduced-motion.
const STYLES = `
  .radar-sweep {
    transform-box: fill-box;
    transform-origin: 50px 41px;
    animation: radarSpin 6s linear infinite;
  }
  .reticle-pulse {
    transform-box: fill-box;
    animation: reticlePulse 1.8s ease-in-out infinite;
  }
  .frontline-dash {
    stroke-dasharray: 2 2;
    animation: frontlineDash 18s linear infinite;
  }
  @keyframes radarSpin { to { transform: rotate(360deg); } }
  @keyframes reticlePulse {
    0%, 100% { opacity: 0.5; transform: scale(1); }
    50%       { opacity: 1;   transform: scale(1.12); }
  }
  @keyframes frontlineDash { to { stroke-dashoffset: -40; } }
  @media (prefers-reduced-motion: reduce) {
    .radar-sweep, .reticle-pulse, .frontline-dash {
      animation: none;
    }
  }
`;

export function SchematicBoard({ state, selectable, selected, onSelect }: BoardProps) {
  const selectableSet = new Set(selectable);
  const { territories, map } = state;

  // Build a unique edge list (a < b) from the map adjacency for drawing borders.
  const edges: Array<[string, string]> = [];
  const seen = new Set<string>();
  for (const t of map.territories) {
    for (const adj of t.adjacentTo) {
      const key = t.id < adj ? `${t.id}|${adj}` : `${adj}|${t.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        edges.push([t.id, adj]);
      }
    }
  }

  // Compute frontline edges: edges incident to the selected node where the other
  // endpoint belongs to a different owner. These glow amber.
  const frontlineEdges: Array<[string, string]> = [];
  if (selected !== null) {
    const selOwner = territories[selected]?.ownerId;
    for (const [a, b] of edges) {
      const other = a === selected ? b : b === selected ? a : null;
      if (other !== null && territories[other]?.ownerId !== selOwner) {
        frontlineEdges.push([a, b]);
      }
    }
  }

  // Edges that are NOT frontlines — drawn as regular hairlines.
  const normalEdges = edges.filter(
    ([a, b]) => !frontlineEdges.some(([fa, fb]) => (fa === a && fb === b) || (fa === b && fb === a)),
  );

  return (
    <svg
      viewBox="0 0 100 82"
      className="w-full max-w-3xl mx-auto select-none"
      role="group"
      aria-label="Game board"
    >
      <style>{STYLES}</style>

      <defs>
        {/* Soft glow filter used on owner-colored node circles */}
        <filter id="sb-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.1" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Sweep gradient: esmeralda → transparent */}
        <linearGradient id="sb-sweep" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--color-you)" />
          <stop offset="1" stopColor="transparent" />
        </linearGradient>
      </defs>

      {/* ── Radar backdrop: faint concentric rings + crosshair axes ── */}
      <g stroke="rgba(255,255,255,.06)" fill="none" aria-hidden="true">
        <circle cx="50" cy="41" r="14" />
        <circle cx="50" cy="41" r="26" />
        <circle cx="50" cy="41" r="38" />
        <circle cx="50" cy="41" r="50" />
        {/* Crosshair axes */}
        <line x1="0" y1="41" x2="100" y2="41" />
        <line x1="50" y1="0" x2="50" y2="82" />
      </g>

      {/* ── Radar sweep wedge (slow rotation, reduced-motion safe) ── */}
      <g
        className="radar-sweep"
        style={{ transformOrigin: "50px 41px" }}
        aria-hidden="true"
      >
        <path
          d="M50 41 L50 -9 A50 50 0 0 1 92 17 Z"
          fill="url(#sb-sweep)"
          opacity="0.10"
        />
      </g>

      {/* ── Normal adjacency edges (hairline) ── */}
      <g aria-hidden="true">
        {normalEdges.map(([a, b]) => {
          const pa = NODE_POS[a]!;
          const pb = NODE_POS[b]!;
          return (
            <line
              key={`edge-${a}-${b}`}
              x1={pa.x}
              y1={pa.y}
              x2={pb.x}
              y2={pb.y}
              stroke="rgba(255,255,255,.14)"
              strokeWidth={0.5}
            />
          );
        })}
      </g>

      {/* ── Frontline edges: amber glow from selected node to enemy neighbours ── */}
      {frontlineEdges.length > 0 && (
        <g
          className="frontline-dash"
          stroke="var(--color-signal)"
          strokeWidth={0.8}
          filter="url(#sb-glow)"
          aria-hidden="true"
        >
          {frontlineEdges.map(([a, b]) => {
            const pa = NODE_POS[a]!;
            const pb = NODE_POS[b]!;
            return (
              <line
                key={`front-${a}-${b}`}
                x1={pa.x}
                y1={pa.y}
                x2={pb.x}
                y2={pb.y}
              />
            );
          })}
        </g>
      )}

      {/* ── Territory nodes ── */}
      {map.territories.map((t) => {
        const pos = NODE_POS[t.id]!;
        const ts = territories[t.id]!;
        const isSelectable = selectableSet.has(t.id);
        const isSelected = selected === t.id;
        const fill = ownerColor(ts.ownerId);
        const contColor = CONTINENT_COLOR[t.continentId] ?? "var(--color-hairline)";

        // Text fill: for "you" (esmeralda) nodes, dark text reads better on the bright fill.
        const numFill = ts.ownerId === "you" ? "#04130d" : "#fff";
        const nodeR = isSelected ? 4.8 : 4.4;

        return (
          <g
            key={t.id}
            data-testid={`node-${t.id}`}
            data-selectable={isSelectable}
            data-selected={isSelected}
            role="button"
            tabIndex={0}
            aria-label={`${t.name}: ${ts.armies} armies`}
            onClick={() => onSelect(t.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onSelect(t.id);
            }}
            className={cn("cursor-pointer", !isSelectable && !isSelected && "opacity-80")}
          >
            {/* Pulsing crosshair reticle on the selected node */}
            {isSelected && (
              <g
                className="reticle-pulse"
                style={{ transformOrigin: `${pos.x}px ${pos.y}px` }}
                aria-hidden="true"
              >
                {/* Outer reticle ring */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={7}
                  fill="none"
                  stroke="#fff"
                  strokeWidth={0.5}
                />
                {/* Crosshair tick marks (N/S/E/W) */}
                <line
                  x1={pos.x}
                  y1={pos.y - 8.5}
                  x2={pos.x}
                  y2={pos.y - 6}
                  stroke="#fff"
                  strokeWidth={0.5}
                />
                <line
                  x1={pos.x}
                  y1={pos.y + 6}
                  x2={pos.x}
                  y2={pos.y + 8.5}
                  stroke="#fff"
                  strokeWidth={0.5}
                />
                <line
                  x1={pos.x - 8.5}
                  y1={pos.y}
                  x2={pos.x - 6}
                  y2={pos.y}
                  stroke="#fff"
                  strokeWidth={0.5}
                />
                <line
                  x1={pos.x + 6}
                  y1={pos.y}
                  x2={pos.x + 8.5}
                  y2={pos.y}
                  stroke="#fff"
                  strokeWidth={0.5}
                />
              </g>
            )}

            {/* Dashed amber ring on selectable (but not selected) nodes */}
            {isSelectable && !isSelected && (
              <circle
                cx={pos.x}
                cy={pos.y}
                r={nodeR + 0.8}
                fill="none"
                stroke="var(--color-signal)"
                strokeWidth={0.7}
                strokeDasharray="1.4 1.2"
                aria-hidden="true"
              />
            )}

            {/* Owner-colored filled circle with soft glow */}
            <circle
              cx={pos.x}
              cy={pos.y}
              r={nodeR}
              fill={fill}
              filter="url(#sb-glow)"
            />

            {/* Continent-colored thin ring on top of fill */}
            <circle
              cx={pos.x}
              cy={pos.y}
              r={nodeR}
              fill="none"
              stroke={isSelected ? "#fff" : contColor}
              strokeWidth={isSelectable ? 0.8 : 0.4}
              strokeOpacity={isSelected ? 0.8 : 0.5}
            />

            {/* Army count — mono font, centered */}
            <text
              x={pos.x}
              y={pos.y + 1.4}
              textAnchor="middle"
              fontSize={3.6}
              fontWeight={700}
              fill={numFill}
              fontFamily="var(--font-mono)"
            >
              {ts.armies}
            </text>

            {/* Territory id label — muted, above the node */}
            <text
              x={pos.x}
              y={pos.y - (nodeR + 2.4)}
              textAnchor="middle"
              fontSize={2.5}
              fill={isSelectable ? "var(--color-signal)" : "var(--color-muted)"}
              fontFamily="var(--font-mono)"
            >
              {t.id}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

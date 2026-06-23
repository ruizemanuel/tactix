"use client";

import { useId } from "react";
import { cn } from "@/lib/utils.js";
import { ownerColor } from "@/lib/game/layout.js";
import { WORLD_CONTINENT_COLOR, BRIDGES } from "@/lib/game/worldLayout.js";
import { WORLD_GEOMETRY } from "@/lib/game/worldGeometry.js";
import type { BoardProps } from "./Board.js";

export function WorldBoard({ state, selectable, selected, onSelect }: BoardProps) {
  const uid = useId();
  const glowId = `${uid}-glow`;
  const selectableSet = new Set(selectable);
  const { territories, map } = state;

  const selOwner = selected ? territories[selected]?.ownerId : undefined;

  return (
    <svg
      viewBox="110 0 890 560"
      className="h-full w-full select-none"
      role="group"
      aria-label="World board"
    >
      <defs>
        <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {BRIDGES.map(([a, b]) => {
        const pa = WORLD_GEOMETRY[a]?.labelAt;
        const pb = WORLD_GEOMETRY[b]?.labelAt;
        if (!pa || !pb) return null;
        return (
          <line
            key={`${a}-${b}`}
            x1={pa.x}
            y1={pa.y}
            x2={pb.x}
            y2={pb.y}
            stroke="var(--color-neutral)"
            strokeWidth={1.2}
            strokeDasharray="4 4"
            opacity={0.45}
            aria-hidden="true"
          />
        );
      })}

      {state.phase !== "reinforce" &&
        selected &&
        map.territories
          .find((t) => t.id === selected)
          ?.adjacentTo.filter((n) => territories[n]?.ownerId !== selOwner)
          .map((n) => {
            const pa = WORLD_GEOMETRY[selected]?.labelAt;
            const pb = WORLD_GEOMETRY[n]?.labelAt;
            if (!pa || !pb) return null;
            return (
              <line
                key={`fl-${n}`}
                data-testid="flow-line"
                x1={pa.x}
                y1={pa.y}
                x2={pb.x}
                y2={pb.y}
                stroke="var(--color-signal)"
                strokeWidth={1.4}
                filter={`url(#${glowId})`}
                aria-hidden="true"
              />
            );
          })}

      {map.territories.map((t) => {
        const g = WORLD_GEOMETRY[t.id]!;
        const ts = territories[t.id]!;
        const isSelectable = selectableSet.has(t.id);
        const isSelected = selected === t.id;
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
            className={cn("cursor-pointer outline-none", !isSelectable && !isSelected && "opacity-95")}
          >
            <path
              d={g.path}
              fill={ownerColor(ts.ownerId)}
              stroke={isSelected ? "#fff" : WORLD_CONTINENT_COLOR[t.continentId] ?? "var(--color-hairline)"}
              strokeWidth={isSelected ? 2 : isSelectable ? 1.4 : 0.8}
              strokeLinejoin="round"
              filter={isSelected ? `url(#${glowId})` : undefined}
            />
            {isSelectable && (
              <path
                d={g.path}
                fill="none"
                stroke="var(--color-signal)"
                strokeWidth={1.6}
                strokeDasharray="3 2.5"
                strokeLinejoin="round"
              />
            )}
            <circle cx={g.labelAt.x} cy={g.labelAt.y} r={10} fill="rgba(7,11,17,.55)" stroke="rgba(255,255,255,.18)" strokeWidth={0.6} />
            <text
              x={g.labelAt.x}
              y={g.labelAt.y + 3.6}
              textAnchor="middle"
              fontSize={11}
              fontWeight={700}
              fontFamily="var(--font-mono)"
              fill="#eef5f1"
              stroke="#04130d"
              strokeWidth={0.9}
              strokeLinejoin="round"
              paintOrder="stroke"
            >
              {ts.armies}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

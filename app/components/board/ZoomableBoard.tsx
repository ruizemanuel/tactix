"use client";

import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { useI18n } from "@/lib/i18n/I18nProvider.js";
import { WorldBoard } from "@/components/board/WorldBoard.js";
import type { BoardProps } from "@/components/board/Board.js";

/** Recenter / reset-view crosshair icon. */
function RecenterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="7" />
      <line x1="12" y1="2" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="2" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="22" y2="12" />
    </svg>
  );
}

/**
 * Wraps the world board in a pinch / drag / double-tap zoom surface with a
 * reset control. Tap-to-select is preserved: react-zoom-pan-pinch treats a
 * pointer as a pan only past a movement threshold, so a plain tap falls
 * through to the territory's onClick in WorldBoard.
 */
export function ZoomableBoard(props: BoardProps) {
  const { t } = useI18n();
  return (
    <div className="relative mx-auto aspect-[89/56] w-full max-w-4xl overflow-hidden">
      <TransformWrapper
        minScale={1}
        maxScale={4}
        initialScale={1}
        centerOnInit
        limitToBounds
        doubleClick={{ disabled: false, mode: "zoomIn", step: 0.7 }}
      >
        {({ resetTransform }) => (
          <>
            <button
              type="button"
              data-testid="board-reset"
              aria-label={t("board.reset")}
              onClick={() => resetTransform()}
              className="absolute bottom-2 right-2 z-10 rounded-lg border border-[var(--color-hairline-2)] bg-[var(--color-bg-2)]/85 p-1.5 text-[var(--color-muted)] hover:text-[var(--color-text)] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--color-signal)]"
            >
              <RecenterIcon />
            </button>
            <TransformComponent
              wrapperStyle={{ width: "100%", height: "100%" }}
              contentStyle={{ width: "100%", height: "100%" }}
            >
              <WorldBoard {...props} />
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </div>
  );
}

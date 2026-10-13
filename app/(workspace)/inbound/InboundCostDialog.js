"use client";

import { useEffect } from "react";

function dialogLayer(zClass) {
  const match = String(zClass ?? "").match(/(\d+)/);
  return match ? Number(match[1]) : 50;
}

export default function InboundCostDialog({
  open,
  onClose,
  title = "Inbound Cost",
  children,
  zClass = "z-50",
  panelClassName = "max-w-7xl",
  nested = false,
  closeOnMouseLeave = false,
  showCloseButton = true,
  headerExtra = null,
}) {
  const layer = dialogLayer(zClass);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function onKeyDown(event) {
      if (event.key !== "Escape") {
        return;
      }

      const layers = [...document.querySelectorAll("[data-dialog-layer]")].map(
        (element) => Number(element.getAttribute("data-dialog-layer")) || 0,
      );
      const top = layers.reduce((max, value) => Math.max(max, value), 0);

      if (layer < top) {
        return;
      }

      event.stopImmediatePropagation();
      onClose();
    }

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open, onClose, layer]);

  if (!open) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 ${zClass} flex items-center justify-center p-4`}
      data-dialog-layer={layer}
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative z-10 max-h-[85vh] w-full ${panelClassName} overflow-auto rounded border border-zinc-300 bg-white p-6 shadow-lg dark:border-zinc-600 dark:bg-zinc-900`}
        onMouseLeave={closeOnMouseLeave ? onClose : undefined}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
              {title}
            </h2>
            {headerExtra}
          </div>
          {showCloseButton ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-zinc-300 bg-white px-3 py-1 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            >
              Close
            </button>
          ) : null}
        </div>
        {children}
      </div>
    </div>
  );
}

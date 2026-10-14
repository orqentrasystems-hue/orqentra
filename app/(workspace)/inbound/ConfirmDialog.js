"use client";

import { useEffect } from "react";

export default function ConfirmDialog({
  open,
  title = "Warning",
  message,
  confirmLabel = "Yes",
  cancelLabel = "No",
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function onKeyDown(event) {
      if (event.key === "Escape") {
        onCancel();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label={cancelLabel}
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 w-full max-w-md rounded border border-zinc-300 bg-white p-6 shadow-lg dark:border-zinc-600 dark:bg-zinc-900"
      >
        <h2 className="text-lg font-semibold text-navy-950">
          {title}
        </h2>
        <p className="mt-3 whitespace-pre-line text-sm text-zinc-700 dark:text-zinc-300">
          {message}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-zinc-300 bg-white px-3 py-1 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded border border-red-700 bg-red-700 px-3 py-1 text-sm font-medium text-white hover:bg-red-800"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

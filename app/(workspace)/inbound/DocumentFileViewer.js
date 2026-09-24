"use client";

import { useEffect } from "react";

function isImage(fileName) {
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(fileName ?? "");
}

export default function DocumentFileViewer({ open, url, fileName, message, onClose }) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function onKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={fileName || "Document"}
        className="relative z-10 flex max-h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded border border-zinc-300 bg-white shadow-lg dark:border-zinc-600 dark:bg-zinc-900"
      >
        <div className="flex items-center justify-between gap-4 px-6 py-4">
          <h2 className="truncate text-lg font-semibold text-black dark:text-zinc-50">
            {fileName || "Document"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-zinc-300 bg-white px-3 py-1 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto px-6 pb-6">
          {message ? (
            <p className="text-sm text-red-700 dark:text-red-400">{message}</p>
          ) : url && isImage(fileName) ? (
            <img
              src={url}
              alt={fileName}
              className="mx-auto max-h-[75vh] max-w-full object-contain"
            />
          ) : url ? (
            <iframe
              title={fileName || "Document"}
              src={url}
              className="h-[75vh] w-full rounded border border-zinc-300 dark:border-zinc-600"
            />
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Opening file…
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

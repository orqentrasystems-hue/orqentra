"use client";

import { useRef, useState } from "react";

export default function DocumentUpload({
  file,
  onFile,
  pending = false,
  message = "",
  addDisabled = false,
  onAdd,
}) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  return (
    <div className="mt-4 flex w-full flex-col gap-3">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          const next = event.dataTransfer.files?.[0];
          if (next) {
            onFile(next);
          }
        }}
        className={[
          "flex min-h-28 w-full items-center justify-center rounded border-2 border-dashed px-4 py-6 text-center text-sm",
          dragOver
            ? "border-blue-700 bg-blue-50 text-blue-900 dark:border-blue-400 dark:bg-zinc-800 dark:text-blue-200"
            : "border-zinc-400 text-zinc-600 dark:border-zinc-500 dark:text-zinc-400",
        ].join(" ")}
      >
        {file
          ? file.name
          : "Drop a file here, or use Browse to select one."}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(event) => {
            const next = event.target.files?.[0];
            if (next) {
              onFile(next);
            }
            event.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
          className="rounded border border-zinc-300 bg-white px-3 py-1 text-sm font-medium text-zinc-800 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
        >
          Browse
        </button>
        <button
          type="button"
          disabled={addDisabled || pending}
          onClick={onAdd}
          className="rounded border border-zinc-800 bg-zinc-800 px-3 py-1 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:border-zinc-200 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {pending ? "Adding…" : "Add"}
        </button>
      </div>
      {message ? (
        <p className="text-sm text-red-700 dark:text-red-400">{message}</p>
      ) : null}
    </div>
  );
}

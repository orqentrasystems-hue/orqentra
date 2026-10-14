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
            ? "border-gold-600 bg-zinc-50 text-navy-950"
            : "border-zinc-300 text-zinc-700",
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
          className="rounded bg-navy-950 px-3 py-1 text-sm font-medium text-white hover:bg-navy-900 disabled:opacity-50"
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

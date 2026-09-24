"use client";

import { useEffect, useId, useRef, useState } from "react";

export default function TradeStatusesSelect({
  options,
  selectedIds = [],
  onSelectedIdsChange,
}) {
  const listId = useId();
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = new Set(selectedIds);

  const filtered = options.filter((option) =>
    option.label.toLowerCase().includes(query.trim().toLowerCase()),
  );

  useEffect(() => {
    function onPointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function toggle(id) {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onSelectedIdsChange([...next]);
  }

  return (
    <div ref={rootRef} className="relative flex w-full max-w-md flex-col gap-1">
      <label
        htmlFor="trade-statuses"
        className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        Trade Statuses
      </label>
      <div className="relative">
        <input
          id="trade-statuses"
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          value={query}
          placeholder={
            selected.size
              ? options
                  .filter((option) => selected.has(option.id))
                  .map((option) => option.label)
                  .join(", ")
              : "Select"
          }
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          className="w-full rounded border border-zinc-300 bg-white py-2 pl-3 pr-10 text-sm text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label={open ? "Hide trade statuses" : "Show trade statuses"}
          onClick={() => setOpen((current) => !current)}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-zinc-500"
        >
          <span aria-hidden="true">{open ? "▴" : "▾"}</span>
        </button>
      </div>
      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-multiselectable="true"
          className="absolute top-full z-10 mt-1 max-h-60 w-full overflow-auto rounded border border-zinc-300 bg-white py-1 shadow-sm dark:border-zinc-600 dark:bg-zinc-800"
        >
          {filtered.length ? (
            filtered.map((option) => {
              const checked = selected.has(option.id);

              return (
                <li key={option.id} role="option" aria-selected={checked}>
                  <label className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-700">
                    <input
                      type="checkbox"
                      name="trade-statuses"
                      value={option.id}
                      checked={checked}
                      onChange={() => toggle(option.id)}
                      className="h-4 w-4"
                    />
                    {option.label}
                  </label>
                </li>
              );
            })
          ) : (
            <li className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">
              No matches.
            </li>
          )}
        </ul>
      ) : null}
    </div>
  );
}

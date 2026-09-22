"use client";

import { useActionState, useState } from "react";
import { savePermissions } from "./actions";

const saveInitialState = {
  ok: false,
  message: "",
};

function formatCell(value) {
  if (value == null) {
    return "";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function isFunctionColumn(column) {
  return column.toLowerCase() === "function";
}

function integerId(value) {
  if (typeof value === "bigint") {
    return value.toString();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(Math.trunc(value));
  }

  const text = String(value ?? "").trim();
  return /^-?\d+$/.test(text) ? text : "";
}

function rawField(row, name) {
  if (!row || typeof row !== "object") {
    return undefined;
  }

  const match = Object.keys(row).find(
    (key) => key.toLowerCase() === name.toLowerCase(),
  );

  return match ? row[match] : undefined;
}

function initialChecked(rows, checkedById) {
  const next = {};

  rows.forEach((row, index) => {
    const id = integerId(rawField(row, "id")) || String(index);
    next[id] = Boolean(checkedById[id]);
  });

  return next;
}

function CheckboxCell({ id, checked, onChange }) {
  return (
    <td className="px-3 py-2 align-middle">
      <input
        type="checkbox"
        name="functions"
        value={id}
        checked={checked}
        onChange={onChange}
        aria-label={`Select function ${id}`}
        className="h-4 w-4"
      />
    </td>
  );
}

function headerCells(columns, hasFunctionColumn) {
  const cells = [];

  if (!hasFunctionColumn) {
    cells.push(
      <th
        key="selected"
        className="w-10 px-3 py-2 font-medium"
        aria-label="Selected"
      />,
    );
  }

  for (const column of columns) {
    if (isFunctionColumn(column)) {
      cells.push(
        <th
          key="selected"
          className="w-10 px-3 py-2 font-medium"
          aria-label="Selected"
        />,
      );
    }

    cells.push(
      <th key={column} className="px-3 py-2 font-medium">
        {column}
      </th>,
    );
  }

  return cells;
}

function bodyCells(columns, hasFunctionColumn, id, row, checked, onToggle) {
  const cells = [];
  const checkbox = (
    <CheckboxCell
      key="selected"
      id={id}
      checked={checked}
      onChange={() => onToggle(id)}
    />
  );

  if (!hasFunctionColumn) {
    cells.push(checkbox);
  }

  for (const column of columns) {
    if (isFunctionColumn(column)) {
      cells.push(checkbox);
    }

    cells.push(
      <td key={column} className="px-3 py-2 align-top">
        {formatCell(row[column])}
      </td>,
    );
  }

  return cells;
}

export default function PermissionsGrid({ rows, checkedById, selectedUserId }) {
  const [checked, setChecked] = useState(() =>
    initialChecked(rows, checkedById),
  );
  const [saveState, saveAction, savePending] = useActionState(
    savePermissions,
    saveInitialState,
  );

  if (!rows?.length) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">No rows.</p>
    );
  }

  const columns = Object.keys(rows[0]).filter(
    (column) => column.toLowerCase() !== "id",
  );
  const hasFunctionColumn = columns.some(isFunctionColumn);

  function setAll(value) {
    setChecked((current) =>
      Object.fromEntries(Object.keys(current).map((id) => [id, value])),
    );
  }

  function onToggle(id) {
    setChecked((current) => ({
      ...current,
      [id]: !current[id],
    }));
  }

  return (
    <div className="flex w-full flex-col items-start gap-4">
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm text-zinc-800 dark:text-zinc-200">
          <thead>
            <tr className="border-b border-zinc-300 dark:border-zinc-600">
              {headerCells(columns, hasFunctionColumn)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const id = integerId(rawField(row, "id")) || String(index);

              return (
                <tr
                  key={id}
                  className="border-b border-zinc-200 dark:border-zinc-700"
                >
                  {bodyCells(
                    columns,
                    hasFunctionColumn,
                    id,
                    row,
                    Boolean(checked[id]),
                    onToggle,
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setAll(true)}
          className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
        >
          Select All
        </button>
        <button
          type="button"
          onClick={() => setAll(false)}
          className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
        >
          Select None
        </button>
      </div>
      <form action={saveAction} className="flex flex-col items-start gap-3">
        <input type="hidden" name="userId" value={selectedUserId} />
        <input
          type="hidden"
          name="rows"
          value={JSON.stringify(
            Object.entries(checked).map(([functionId, give]) => ({
              functionId,
              give,
            })),
          )}
        />
        <button
          type="submit"
          disabled={savePending}
          className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {savePending ? "Saving…" : "Save"}
        </button>
        {saveState.message ? (
          <p
            aria-live="polite"
            className={
              saveState.ok
                ? "text-sm text-green-700 dark:text-green-400"
                : "text-sm text-red-700 dark:text-red-400"
            }
          >
            {saveState.message}
          </p>
        ) : null}
      </form>
    </div>
  );
}

function formatNumberMask(value) {
  if (value == null || value === "") {
    return "";
  }

  const n =
    typeof value === "number"
      ? value
      : Number(String(value).replace(/\s/g, "").replace(",", "."));

  if (!Number.isFinite(n)) {
    return String(value);
  }

  const [intPart, decPart] = n.toFixed(2).split(".");
  const sign = intPart.startsWith("-") ? "-" : "";
  const grouped = intPart.replace("-", "").replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  return `${sign}${grouped}.${decPart}`;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function toDate(value) {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string") {
    const dayOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (dayOnly) {
      return new Date(
        Number(dayOnly[1]),
        Number(dayOnly[2]) - 1,
        Number(dayOnly[3]),
      );
    }
  }

  return new Date(value);
}

function formatDateMask(value) {
  if (value == null || value === "") {
    return "";
  }

  const date = toDate(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const dd = String(date.getDate()).padStart(2, "0");
  return `${dd} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function formatCell(value, { numeric = false, date = false, zeroIfNull = false } = {}) {
  if (zeroIfNull && (value == null || value === "")) {
    return "0";
  }

  if (numeric) {
    return formatNumberMask(value);
  }

  if (date) {
    return formatDateMask(value);
  }

  if (value == null) {
    return "";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

const COLUMN_LABELS = [
  "id",
  "Trade Number",
  "Description",
  "Trade Status",
  "Saleable Volume",
  "Total Trade Delivered",
  "Progress %",
  "Unit of Measure",
];

export function rowId(row) {
  if (!row || typeof row !== "object") {
    return "";
  }

  const match = Object.keys(row).find((key) => key.toLowerCase() === "id");
  const value = match ? row[match] : Object.values(row)[0];
  return value == null ? "" : String(value);
}

const KEY_LABELS = {
  created_at: "Uploaded",
  descr: "Document Type",
  doc_count: "Docs",
  file_path: "File Path",
};

function fieldByKey(row, name) {
  if (!row || typeof row !== "object") {
    return undefined;
  }

  const match = Object.keys(row).find(
    (key) => key.toLowerCase() === name.toLowerCase(),
  );
  return match ? row[match] : undefined;
}

function gridColumns(row, labels = COLUMN_LABELS) {
  return Object.keys(row).map((key, index) => {
    const label = KEY_LABELS[key.toLowerCase()] ?? labels[index] ?? key;

    return {
      key,
      label,
      hidden:
        key.toLowerCase() === "id" ||
        key.toLowerCase() === "file_path" ||
        label.toLowerCase() === "id" ||
        label.toLowerCase() === "file path",
    };
  });
}

export function GridFrame({ title, children }) {
  return (
    <div className="w-full">
      {title ? (
        <h2 className="mb-2 text-lg font-semibold text-black dark:text-zinc-50">
          {title}
        </h2>
      ) : null}
      <div className="w-full overflow-x-auto rounded border border-zinc-400 dark:border-zinc-500">
        {children}
      </div>
    </div>
  );
}

export default function InboundGrid({
  rows,
  message,
  pending,
  selectedId,
  onSelect,
  title = "Inbound Trades",
  columnLabels = COLUMN_LABELS,
  numericLabels = [],
  dateLabels = [],
  onDocsSelect,
  showViewButton = false,
  onViewFile,
  showDeleteButton = false,
  onDeleteFile,
}) {
  if (message) {
    return (
      <GridFrame title={title}>
        <p className="px-3 py-2 text-sm text-red-700 dark:text-red-400">
          {message}
        </p>
      </GridFrame>
    );
  }

  if (pending && !rows?.length) {
    return (
      <GridFrame title={title}>
        <p className="px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400">
          Loading…
        </p>
      </GridFrame>
    );
  }

  if (!rows?.length) {
    return (
      <GridFrame title={title}>
        <p className="px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400">
          No rows.
        </p>
      </GridFrame>
    );
  }

  const columns = gridColumns(rows[0], columnLabels).filter(
    (column) => !column.hidden,
  );
  const numeric = new Set(
    numericLabels.map((label) => String(label).toLowerCase()),
  );
  const dates = new Set(dateLabels.map((label) => String(label).toLowerCase()));
  const selectable = typeof onSelect === "function";

  function matches(set, column) {
    return (
      set.has(String(column.label).toLowerCase()) ||
      set.has(String(column.key).toLowerCase())
    );
  }

  function isDocsColumn(column) {
    return (
      column.key.toLowerCase() === "doc_count" ||
      column.label.toLowerCase() === "docs"
    );
  }

  return (
    <GridFrame title={title}>
      <table className="w-full border-collapse text-left text-sm text-zinc-800 dark:text-zinc-200">
        <thead>
          <tr className="border-b border-zinc-300 dark:border-zinc-600">
            {columns.map((column) => (
              <th key={column.key} className="px-3 py-2 font-medium">
                {column.label}
              </th>
            ))}
            {showViewButton ? (
              <th className="px-3 py-2 font-medium" aria-label="View" />
            ) : null}
            {showDeleteButton ? (
              <th className="px-3 py-2 font-medium" aria-label="Delete" />
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const id = rowId(row);
            const selected = selectable && id !== "" && id === selectedId;

            return (
              <tr
                key={id || index}
                className={[
                  "border-b border-zinc-200 dark:border-zinc-700",
                  selectable
                    ? "cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    : "",
                  selected ? "bg-zinc-100 dark:bg-zinc-800" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={selectable ? () => onSelect(id) : undefined}
              >
                {columns.map((column) => {
                  const docsColumn = isDocsColumn(column);

                  return (
                    <td
                      key={column.key}
                      className={[
                        "px-3 py-2 align-top",
                        matches(numeric, column) ? "text-right tabular-nums" : "",
                        docsColumn && onDocsSelect
                          ? "cursor-pointer text-blue-900 underline dark:text-blue-300"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={
                        docsColumn && onDocsSelect
                          ? (event) => {
                              event.stopPropagation();
                              onDocsSelect(id);
                            }
                          : undefined
                      }
                    >
                      {formatCell(row[column.key], {
                        numeric: matches(numeric, column),
                        date: matches(dates, column),
                        zeroIfNull: docsColumn,
                      })}
                    </td>
                  );
                })}
                {showViewButton ? (
                  <td className="px-3 py-2 align-middle">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        const path = fieldByKey(row, "file_path");
                        if (path && onViewFile) {
                          onViewFile(String(path));
                        }
                      }}
                      className="rounded border border-zinc-300 bg-white px-3 py-1 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                    >
                      VIEW
                    </button>
                  </td>
                ) : null}
                {showDeleteButton ? (
                  <td className="px-3 py-2 align-middle">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        if (!onDeleteFile) {
                          return;
                        }

                        const path = fieldByKey(row, "file_path");
                        onDeleteFile({
                          id,
                          filePath: path == null ? "" : String(path),
                        });
                      }}
                      className="rounded border border-zinc-300 bg-white px-3 py-1 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                    >
                      DELETE
                    </button>
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </GridFrame>
  );
}

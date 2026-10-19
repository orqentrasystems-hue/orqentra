"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

function formatNumberMask(value, { decimals = 2, trim = false } = {}) {
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

  if (decimals <= 0) {
    const rounded = Math.round(n);
    const sign = rounded < 0 ? "-" : "";
    const grouped = String(Math.abs(rounded)).replace(
      /\B(?=(\d{3})+(?!\d))/g,
      " ",
    );
    return `${sign}${grouped}`;
  }

  const [intPart, decPart] = n.toFixed(decimals).split(".");
  const sign = intPart.startsWith("-") ? "-" : "";
  const grouped = intPart.replace("-", "").replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const fraction = trim ? decPart.replace(/0+$/, "") : decPart;

  return fraction ? `${sign}${grouped}.${fraction}` : `${sign}${grouped}`;
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

function formatDateTimeMask(value) {
  if (value == null || value === "") {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${dd} ${MONTHS[date.getMonth()]} ${date.getFullYear()} ${hh}:${mm}`;
}

function formatCell(
  value,
  {
    numeric = false,
    integer = false,
    decimals,
    trimDecimals = false,
    date = false,
    dateTime = false,
    zeroIfNull = false,
  } = {},
) {
  if (zeroIfNull && (value == null || value === "")) {
    return "0";
  }

  if (numeric) {
    return formatNumberMask(value, {
      decimals: integer ? 0 : decimals ?? 2,
      trim: trimDecimals,
    });
  }

  if (dateTime) {
    return formatDateTimeMask(value);
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

export const COLUMN_LABELS = [
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
  document_count: "Docs",
  note_count: "Notes",
  note: "Note",
  email: "Email",
  file_path: "File Path",
  description: "Description",
  local_industry_unit: "Unit",
  product_name: "Product Name",
  qty_to_lift: "Qty to Lift",
  load_qty: "Load Qty",
  actual_loaded_qty: "Actual Load Qty",
  unit: "Unit",
  supplier_release_number: "Supplier Release Number",
  lift_status: "Lift Status",
  remaining_qty_to_lift: "Over / Under",
  lift_over_under: "Over / Under",
  qty_still_to_lift: "Over / Under",
  item_over_under: "Over / Under",
  qty_not_assigned_to_load: "Unassigned",
  qty_not_assigned_to_lift: "Unassigned",
  blend_grouping_key: "Blend Group Key",
  blend_grouping_key_lift: "Blend Group Key (Lift)",
  blend_grouping_key_load: "Blend Group Key (Load)",
  docs: "Docs",
  notes: "Notes",
  load_date: "Load Date",
  transport_channel: "Transport Channel",
  contract_number: "Contract No.",
  uplift_number: "Uplift No.",
  collection_point: "Collection Point",
  load_status: "Load Status",
  expected_completion_date: "Exp Compl Date",
  company_name: "Company Name",
  driver: "Driver",
  truck: "Truck",
  trailer: "Trailer",
  trade_number: "Trade Number",
};

export function fieldByKey(row, name) {
  if (!row || typeof row !== "object") {
    return undefined;
  }

  const match = Object.keys(row).find(
    (key) => key.toLowerCase() === name.toLowerCase(),
  );
  return match ? row[match] : undefined;
}

export function fieldByColumnLabel(row, label) {
  if (!row || typeof row !== "object") {
    return undefined;
  }

  const wanted = String(label ?? "")
    .trim()
    .toLowerCase();

  if (!wanted) {
    return undefined;
  }

  for (const [key, value] of Object.entries(row)) {
    const keyLower = key.toLowerCase();
    const header = String(KEY_LABELS[keyLower] ?? key.replace(/_/g, " "))
      .trim()
      .toLowerCase();

    if (
      header === wanted ||
      keyLower === wanted.replace(/\s+/g, "_") ||
      key.replace(/_/g, " ").toLowerCase() === wanted
    ) {
      return value;
    }
  }

  return undefined;
}

function isDocsKey(key) {
  const name = String(key ?? "").toLowerCase();
  return name === "doc_count" || name === "document_count" || name === "docs";
}

function placeNoteCountAfterDocs(columns) {
  const noteIndex = columns.findIndex(
    (column) => column.key.toLowerCase() === "note_count",
  );

  if (noteIndex < 0) {
    return columns;
  }

  const next = columns.slice();
  const [noteColumn] = next.splice(noteIndex, 1);
  const docsIndex = next.findIndex((column) => isDocsKey(column.key));

  if (docsIndex < 0) {
    next.push(noteColumn);
    return next;
  }

  next.splice(docsIndex + 1, 0, noteColumn);
  return next;
}

function placeBlendGroupingKeyLiftAfterBlendGroupKey(columns) {
  const liftKeyIndex = columns.findIndex(
    (column) => column.key.toLowerCase() === "blend_grouping_key_lift",
  );

  if (liftKeyIndex < 0) {
    return columns;
  }

  const next = columns.slice();
  const [liftKeyColumn] = next.splice(liftKeyIndex, 1);
  const blendIndex = next.findIndex((column) => {
    const key = column.key.toLowerCase();
    const label = String(column.label).toLowerCase();
    return key === "blend_grouping_key" || label === "blend group key";
  });

  if (blendIndex < 0) {
    next.push(liftKeyColumn);
    return next;
  }

  next.splice(blendIndex + 1, 0, liftKeyColumn);
  return next;
}

function placeBlendGroupingKeyLoadAfterLift(columns) {
  const loadKeyIndex = columns.findIndex((column) => {
    const key = column.key.toLowerCase();
    const label = String(column.label).toLowerCase();
    return (
      key === "blend_grouping_key_load" ||
      label === "blend group key (load)"
    );
  });

  if (loadKeyIndex < 0) {
    return columns;
  }

  const next = columns.slice();
  const [loadKeyColumn] = next.splice(loadKeyIndex, 1);
  const liftIndex = next.findIndex((column) => {
    const key = column.key.toLowerCase();
    const label = String(column.label).toLowerCase();
    return (
      key === "blend_grouping_key_lift" ||
      label === "blend group key (lift)"
    );
  });

  if (liftIndex < 0) {
    next.push(loadKeyColumn);
    return next;
  }

  next.splice(liftIndex + 1, 0, loadKeyColumn);
  return next;
}

function placeTradeNumberFirst(columns) {
  const index = columns.findIndex((column) => {
    const key = column.key.toLowerCase();
    const label = String(column.label).toLowerCase();
    return key === "trade_number" || label === "trade number";
  });

  if (index <= 0) {
    return columns;
  }

  const next = columns.slice();
  const [tradeColumn] = next.splice(index, 1);
  next.unshift(tradeColumn);
  return next;
}

function placeProductAfterTradeNumber(columns) {
  const productIndex = columns.findIndex((column) => {
    const key = column.key.toLowerCase();
    const label = String(column.label).toLowerCase();
    return (
      key === "product_name" ||
      label === "product name" ||
      label === "product"
    );
  });

  if (productIndex < 0) {
    return columns;
  }

  const next = columns.slice();
  const [productColumn] = next.splice(productIndex, 1);
  const tradeIndex = next.findIndex((column) => {
    const key = column.key.toLowerCase();
    const label = String(column.label).toLowerCase();
    return key === "trade_number" || label === "trade number";
  });

  if (tradeIndex < 0) {
    return columns;
  }

  next.splice(tradeIndex + 1, 0, productColumn);
  return next;
}

function relabelLoadProduct(columns, kind) {
  if (kind !== "load") {
    return columns;
  }

  return columns.map((column) => {
    const key = column.key.toLowerCase();
    const label = String(column.label).toLowerCase();

    if (key === "product_name" || label === "product name") {
      return { ...column, label: "Product" };
    }

    return column;
  });
}

function placeDescriptionAfterCostType(columns) {
  const descriptionIndex = columns.findIndex(
    (column) => column.key.toLowerCase() === "description",
  );

  if (descriptionIndex < 0) {
    return columns;
  }

  const next = columns.slice();
  const [descriptionColumn] = next.splice(descriptionIndex, 1);
  const costTypeIndex = next.findIndex((column) => {
    const key = column.key.toLowerCase();
    const label = String(column.label).toLowerCase();
    return label === "cost type" || key === "cost_type";
  });

  if (costTypeIndex < 0) {
    next.push(descriptionColumn);
    return next;
  }

  next.splice(costTypeIndex + 1, 0, descriptionColumn);
  return next;
}

function gridColumns(row, labels = COLUMN_LABELS) {
  const extraHiddenKeys = new Set([
    "file_path",
    "user_id",
    "inbound_stock_item_tracking_id",
    "inbound_lift_id",
    "cost_per_litre",
    "product_id",
    "inbound_item_tracking",
    "qty_to_lift_max",
    "load_qty_max",
    "transport_company_id",
    "driver_id",
    "truck_id",
    "trailer_id",
  ]);
  const rowKeys = new Set(
    Object.keys(row).map((key) => key.toLowerCase()),
  );
  const hideRemainingQty = rowKeys.has("lift_over_under");
  const hideQtyStillToLift = rowKeys.has("item_over_under");
  let labelIndex = 0;
  const columns = Object.keys(row).map((key) => {
    const keyLower = key.toLowerCase();
    const skipLabelSlot =
      extraHiddenKeys.has(keyLower) ||
      (hideRemainingQty && keyLower === "remaining_qty_to_lift") ||
      (hideQtyStillToLift && keyLower === "qty_still_to_lift");
    const mapped = skipLabelSlot ? undefined : labels[labelIndex++];
    const label =
      keyLower === "note_count"
        ? "Notes"
        : mapped != null && String(mapped).trim() !== ""
          ? mapped
          : (KEY_LABELS[keyLower] ?? key);

    return {
      key,
      label,
      hidden:
        skipLabelSlot ||
        keyLower === "id" ||
        label.toLowerCase() === "id" ||
        label.toLowerCase() === "file path" ||
        label.toLowerCase() === "user_id" ||
        label.toLowerCase() === "user id" ||
        label.toLowerCase() === "inbound_stock_item_tracking_id" ||
        label.toLowerCase() === "inbound_lift_id" ||
        label.toLowerCase() === "product_id" ||
        label.toLowerCase() === "product id" ||
        label.toLowerCase() === "inbound_item_tracking" ||
        keyLower === "inbound_item_tracking" ||
        label.toLowerCase() === "transport_company_id" ||
        label.toLowerCase() === "transport company id" ||
        label.toLowerCase() === "driver_id" ||
        label.toLowerCase() === "driver id" ||
        label.toLowerCase() === "truck_id" ||
        label.toLowerCase() === "truck id" ||
        label.toLowerCase() === "trailer_id" ||
        label.toLowerCase() === "trailer id",
    };
  });

  return placeProductAfterTradeNumber(
    placeUnassignedAfterOverUnder(
      placeTradeNumberFirst(
        placeNoteCountAfterDocs(
          placeDescriptionAfterCostType(
            placeBlendGroupingKeyLoadAfterLift(
              placeBlendGroupingKeyLiftAfterBlendGroupKey(columns),
            ),
          ),
        ),
      ),
    ),
  );
}

function placeUnassignedAfterOverUnder(columns) {
  const unassignedIndex = columns.findIndex((column) => {
    const key = column.key.toLowerCase();
    const label = String(column.label).toLowerCase();
    return (
      key === "qty_not_assigned_to_load" ||
      key === "qty_not_assigned_to_lift" ||
      label === "unassigned"
    );
  });

  if (unassignedIndex < 0) {
    return columns;
  }

  const next = columns.slice();
  const [unassignedColumn] = next.splice(unassignedIndex, 1);
  const overUnderIndex = next.findIndex((column) => {
    const key = column.key.toLowerCase();
    const label = String(column.label).toLowerCase();
    return (
      label === "over / under" ||
      key === "lift_over_under" ||
      key === "remaining_qty_to_lift" ||
      key === "item_over_under"
    );
  });

  if (overUnderIndex < 0) {
    next.push(unassignedColumn);
    return next;
  }

  next.splice(overUnderIndex + 1, 0, unassignedColumn);
  return next;
}

function isDocsColumnDef(column) {
  return (
    isDocsKey(column.key) || String(column.label).toLowerCase() === "docs"
  );
}

function isNotesColumnDef(column) {
  const key = column.key.toLowerCase();
  const label = String(column.label).toLowerCase();
  return key === "note_count" || key === "notes" || label === "notes";
}

function placeDocsAndNotesAfterUnassigned(columns) {
  const unassignedIndex = columns.findIndex((column) => {
    const key = column.key.toLowerCase();
    const label = String(column.label).toLowerCase();
    return (
      key === "qty_not_assigned_to_load" ||
      key === "qty_not_assigned_to_lift" ||
      label === "unassigned"
    );
  });

  if (unassignedIndex < 0) {
    return columns;
  }

  const next = columns.slice();
  const docs = [];
  const notes = [];

  for (let i = next.length - 1; i >= 0; i -= 1) {
    if (isDocsColumnDef(next[i])) {
      docs.unshift(next.splice(i, 1)[0]);
    } else if (isNotesColumnDef(next[i])) {
      notes.unshift(next.splice(i, 1)[0]);
    }
  }

  if (!docs.length && !notes.length) {
    return columns;
  }

  const insertAt = next.findIndex((column) => {
    const key = column.key.toLowerCase();
    const label = String(column.label).toLowerCase();
    return (
      key === "qty_not_assigned_to_load" ||
      key === "qty_not_assigned_to_lift" ||
      label === "unassigned"
    );
  });

  const placed = [...docs, ...notes];

  if (insertAt < 0) {
    return [...next, ...placed];
  }

  next.splice(insertAt + 1, 0, ...placed);
  return next;
}

const COST_LINK_KEY = "__cost_link";

function insertCostLinkAfterCurrency(columns) {
  const costColumn = {
    key: COST_LINK_KEY,
    label: "Cost",
    hidden: false,
  };
  const currencyIndex = columns.findIndex((column) => {
    const key = column.key.toLowerCase();
    const label = String(column.label).toLowerCase();
    return label === "currency" || key === "currency";
  });

  if (currencyIndex < 0) {
    return [...columns, costColumn];
  }

  const next = columns.slice();
  next.splice(currencyIndex + 1, 0, costColumn);
  return next;
}

function labelsToColumns(labels = COLUMN_LABELS) {
  return labels
    .map((label) => ({
      key: String(label),
      label,
      hidden: String(label).toLowerCase() === "id",
    }))
    .filter((column) => !column.hidden);
}

function isCostTypeDraftColumn(column) {
  return (
    String(column.label).toLowerCase() === "cost type" ||
    column.key.toLowerCase() === "cost_type"
  );
}

function isAmtPerLitreColumn(column) {
  const { label, key } = columnLabelKey(column);
  return (
    label === "amt per litre" ||
    key === "amt_per_litre" ||
    key === "amount_per_litre" ||
    key === "amount_per_liter" ||
    key === "amt_per_liter"
  );
}

function isTradeStatusColumn(column) {
  const key = column.key.toLowerCase();
  return (
    String(column.label).toLowerCase() === "trade status" ||
    key === "trade_status"
  );
}

function isDescriptionDraftColumn(column) {
  const key = column.key.toLowerCase();
  return (
    String(column.label).toLowerCase() === "description" ||
    key === "description" ||
    key === "descr"
  );
}

function isAmountDraftColumn(column) {
  return (
    String(column.label).toLowerCase() === "amount" ||
    column.key.toLowerCase() === "amount"
  );
}

function isQtyDraftColumn(column) {
  return (
    String(column.label).toLowerCase() === "qty" ||
    column.key.toLowerCase() === "qty"
  );
}

function isCostDateDraftColumn(column) {
  return (
    String(column.label).toLowerCase() === "cost date" ||
    column.key.toLowerCase() === "cost_date"
  );
}

function columnLabelKey(column) {
  return {
    label: String(column.label).toLowerCase(),
    key: String(column.key).toLowerCase(),
  };
}

function isTrackingTradeNoColumn(column) {
  const { label, key } = columnLabelKey(column);
  return (
    label === "trade no." ||
    label === "trade no" ||
    label === "trade number" ||
    key === "trade_no" ||
    key === "trade_number"
  );
}

function isTrackingProductColumn(column) {
  const { label, key } = columnLabelKey(column);
  return label === "product" || key === "product" || key === "product_name";
}

function isTrackingUnitColumn(column) {
  const { label, key } = columnLabelKey(column);
  return (
    label === "unit" ||
    key === "unit" ||
    key === "local_industry_unit" ||
    key === "unit_of_measure"
  );
}

function isTrackingEthanolColumn(column) {
  const { label, key } = columnLabelKey(column);
  return (
    label === "e. %" ||
    label === "ethanol %" ||
    key === "ethanol" ||
    key === "ethanol_percent" ||
    key === "ethanol_blend_percentage"
  );
}

function isNumericCellValue(value) {
  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  if (typeof value !== "string") {
    return false;
  }

  const text = value.trim();

  if (text === "") {
    return false;
  }

  return Number.isFinite(Number(text.replace(/\s/g, "").replace(",", ".")));
}

function isNonNumericTradeColumn(column) {
  const { label, key } = columnLabelKey(column);
  return (
    key === "id" ||
    label === "id" ||
    label === "trade number" ||
    key === "trade_number" ||
    label === "description" ||
    key === "description" ||
    label.includes("status") ||
    key.includes("status") ||
    label === "unit of measure" ||
    key.includes("unit")
  );
}

function isSaleableVolumeColumn(column) {
  const { label, key } = columnLabelKey(column);
  return (
    label === "saleable volume" ||
    key === "saleable_volume" ||
    key === "saleable_qty"
  );
}

const SALEABLE_SPLIT_HIDDEN = new Set([
  "id",
  "trade_id",
  "p_trade_id",
  "inbound_trade_id",
]);

function saleableSplitColumns(rows) {
  const row = rows.find((item) => item && typeof item === "object");

  if (!row) {
    return [];
  }

  return Object.keys(row).filter(
    (key) => !SALEABLE_SPLIT_HIDDEN.has(key.toLowerCase()),
  );
}

function saleableSplitLabel(key) {
  const mapped = KEY_LABELS[key.toLowerCase()];

  if (mapped) {
    return mapped;
  }

  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function saleableSplitNumeric(rows, key) {
  return rows.some((row) => {
    const value = row?.[key];

    if (value == null || value === "") {
      return false;
    }

    if (typeof value === "number") {
      return Number.isFinite(value);
    }

    const n = Number(String(value).trim().replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(n) && String(value).trim() !== "";
  });
}

function SaleableVolumeBubble({ cellRef, open, pending, message, rows }) {
  const [coords, setCoords] = useState(null);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return undefined;
    }

    function update() {
      const rect = cellRef.current?.getBoundingClientRect();

      if (!rect) {
        return;
      }

      const placeBelow = rect.top < 200;
      setCoords({
        left: Math.min(
          Math.max(rect.left + rect.width / 2, 12),
          window.innerWidth - 12,
        ),
        top: placeBelow ? rect.bottom + 6 : rect.top - 6,
        placeBelow,
      });
    }

    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [cellRef, open, pending, rows]);

  if (!open || !coords || typeof document === "undefined") {
    return null;
  }

  const columns = saleableSplitColumns(rows ?? []);

  return createPortal(
    <div
      className="pointer-events-none fixed z-50 max-w-[min(36rem,calc(100vw-1.5rem))] -translate-x-1/2 rounded border border-zinc-300 bg-white shadow-lg dark:border-zinc-600 dark:bg-zinc-900"
      style={{
        left: coords.left,
        top: coords.top,
        transform: coords.placeBelow
          ? "translate(-50%, 0)"
          : "translate(-50%, -100%)",
      }}
    >
      {coords.placeBelow ? null : (
        <span
          aria-hidden="true"
          className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-300 dark:border-t-zinc-600"
        />
      )}
      {coords.placeBelow ? (
        <span
          aria-hidden="true"
          className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-zinc-300 dark:border-b-zinc-600"
        />
      ) : null}
      <div className="max-h-64 overflow-auto p-2">
        {pending ? (
          <p className="px-1 py-0.5 text-xs text-zinc-600 dark:text-zinc-400">
            Loading…
          </p>
        ) : message ? (
          <p className="px-1 py-0.5 text-xs text-red-700 dark:text-red-400">
            {message}
          </p>
        ) : !rows?.length || !columns.length ? (
          <p className="px-1 py-0.5 text-xs text-zinc-600 dark:text-zinc-400">
            No rows.
          </p>
        ) : (
          <table className="border-collapse text-left text-xs text-zinc-800 dark:text-zinc-200">
            <thead>
              <tr className="border-b border-zinc-300 bg-zinc-50 text-navy-950 dark:border-zinc-600 dark:bg-zinc-800">
                {columns.map((key) => (
                  <th
                    key={key}
                    className={[
                      "whitespace-nowrap px-2 py-1 font-bold",
                      saleableSplitNumeric(rows, key) ? "text-right" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {saleableSplitLabel(key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={`${rowId(row) || "row"}-${index}`}
                  className="border-b border-zinc-200 last:border-b-0 dark:border-zinc-700"
                >
                  {columns.map((key) => {
                    const numeric = saleableSplitNumeric(rows, key);

                    return (
                      <td
                        key={key}
                        className={[
                          "whitespace-nowrap px-2 py-1",
                          numeric ? "text-right tabular-nums" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {formatCell(row[key], { numeric })}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>,
    document.body,
  );
}

function SaleableVolumeCell({
  id,
  className,
  onClick,
  formatted,
  split,
  onEnter,
  onLeave,
}) {
  const cellRef = useRef(null);
  const open = Boolean(split && split.tradeId === id);

  return (
    <td
      ref={cellRef}
      className={className}
      onClick={onClick}
      onMouseEnter={() => onEnter?.(id)}
      onMouseLeave={() => onLeave?.(id)}
    >
      {formatted}
      <SaleableVolumeBubble
        cellRef={cellRef}
        open={open}
        pending={split?.pending}
        message={split?.message}
        rows={split?.rows}
      />
    </td>
  );
}

function qtyCubesTip(value) {
  const n =
    typeof value === "number"
      ? value
      : Number(
          String(value ?? "")
            .trim()
            .replace(/\s/g, "")
            .replace(",", "."),
        );

  if (!Number.isFinite(n)) {
    return "";
  }

  const cubes = n / 1000;
  const text = Number.isInteger(cubes)
    ? String(cubes)
    : cubes.toFixed(3).replace(/\.?0+$/, "");
  return `${text} cubes`;
}

function isQtyLitresColumn(column) {
  const { label, key } = columnLabelKey(column);
  return (
    label === "qty (litres)" ||
    ((label === "qty" || key === "qty") &&
      label !== "qty still to lift" &&
      label !== "over / under" &&
      key !== "qty_still_to_lift" &&
      key !== "remaining_qty_to_lift" &&
      key !== "item_over_under")
  );
}

function isTrackingQtyColumn(column) {
  return isQtyLitresColumn(column);
}

function isTrackingPurchaseDateColumn(column) {
  const { label, key } = columnLabelKey(column);
  return label === "purchase date" || key === "purchase_date";
}

function isTrackingStatusColumn(column) {
  const { label, key } = columnLabelKey(column);
  return label === "status" || key === "status";
}

function isVoidableStatusColumn(column) {
  const { label, key } = columnLabelKey(column);
  return (
    label === "status" ||
    label === "lift status" ||
    label === "load status" ||
    key === "lift_status" ||
    key === "load_status"
  );
}

function isTruthyFlag(value) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value !== 0;
  }

  const text = String(value ?? "")
    .trim()
    .toLowerCase();

  return text === "true" || text === "t" || text === "1" || text === "yes";
}

function isReversedColumn(column) {
  const { label, key } = columnLabelKey(column);
  return label === "reversed" || key === "reversed";
}

function isVoidGridRow(row, columns) {
  if (!row) {
    return false;
  }

  for (const column of columns ?? []) {
    if (isReversedColumn(column) && isTruthyFlag(row[column.key])) {
      return true;
    }

    if (!isVoidableStatusColumn(column)) {
      continue;
    }

    if (String(row[column.key] ?? "").trim().toLowerCase() === "void") {
      return true;
    }
  }

  const reversed = Object.keys(row).find(
    (key) => key.toLowerCase() === "reversed",
  );

  return reversed ? isTruthyFlag(row[reversed]) : false;
}

function isTrackingStatusDateColumn(column) {
  const { label, key } = columnLabelKey(column);
  return label === "status date" || key === "status_date";
}

function isTrackingCompanyColumn(column) {
  const { label, key } = columnLabelKey(column);
  return label === "company" || key === "company" || key === "company_name";
}

function isTrackingPortColumn(column) {
  const { label, key } = columnLabelKey(column);
  return label === "port" || key === "port";
}

function isTrackingSuppInvNoColumn(column) {
  const { label, key } = columnLabelKey(column);
  return (
    label === "supp_inv_no." ||
    label === "supp_inv_no" ||
    key === "supp_inv_no" ||
    key === "supplier_invoice_number"
  );
}

function isTrackingSuppInvAmtColumn(column) {
  const { label, key } = columnLabelKey(column);
  return (
    label === "supp_inv_amt." ||
    label === "supp_inv_amt" ||
    key === "supp_inv_amt" ||
    key === "supplier_invoice_amount"
  );
}

function isTrackingCurrencyColumn(column) {
  const { label, key } = columnLabelKey(column);
  return label === "currency" || key === "currency";
}

function isBlendGroupKeyColumn(column) {
  const { label, key } = columnLabelKey(column);
  return (
    label === "blend group key" ||
    label === "blend group key (lift)" ||
    label === "blend group key (load)" ||
    key === "blend_grouping_key" ||
    key === "blend_group_key" ||
    key === "blend_grouping_key_lift" ||
    key === "blend_grouping_key_load"
  );
}

function liftDraftCellValue(values, column) {
  const { label, key } = columnLabelKey(column);

  if (key === "inbound_item_tracking") {
    return values.inbound_item_tracking ?? "";
  }

  if (label === "trade number" || key === "trade_number") {
    return values.trade_number ?? "";
  }

  if (label === "product name" || key === "product_name") {
    return values.product_name ?? "";
  }

  if (label === "unit" || key === "unit" || key === "local_industry_unit") {
    return values.unit ?? "";
  }

  if (label === "blend group key" || key === "blend_grouping_key") {
    return values.blend_grouping_key ?? "";
  }

  if (label === "qty to lift" || key === "qty_to_lift") {
    return values.qty_to_lift ?? "";
  }

  if (
    label === "over / under" ||
    label === "remaining qty to lift" ||
    key === "remaining_qty_to_lift" ||
    key === "qty_still_to_lift" ||
    key === "lift_over_under"
  ) {
    return (
      values.lift_over_under ?? values.remaining_qty_to_lift ?? ""
    );
  }

  if (label === "unassigned" || key === "qty_not_assigned_to_load") {
    return values.qty_not_assigned_to_load ?? "";
  }

  if (label === "lift status" || key === "lift_status") {
    return values.lift_status ?? "";
  }

  if (
    label === "supplier release number" ||
    key === "supplier_release_number"
  ) {
    return values.supplier_release_number ?? "";
  }

  return values[column.key] ?? "";
}

function loadDraftCellValue(values, column) {
  const { label, key } = columnLabelKey(column);

  if (label === "id" || key === "id") {
    return values.id ?? "";
  }

  if (label === "trade number" || key === "trade_number") {
    return values.trade_number ?? "";
  }

  if (
    label === "product" ||
    label === "product name" ||
    key === "product_name" ||
    key === "product"
  ) {
    return values.product_name ?? "";
  }

  if (label === "unit" || key === "unit" || key === "local_industry_unit") {
    return values.unit ?? "";
  }

  if (
    label === "blend group key" ||
    key === "blend_grouping_key" ||
    key === "blend_group_key"
  ) {
    return values.blend_grouping_key ?? "";
  }

  if (
    label === "blend group key (lift)" ||
    key === "blend_grouping_key_lift"
  ) {
    return values.blend_grouping_key_lift ?? "";
  }

  if (
    label === "blend group key (load)" ||
    key === "blend_grouping_key_load"
  ) {
    return values.blend_grouping_key_load ?? "";
  }

  if (isLoadContractNoColumn(column)) {
    return values.contract_number ?? "";
  }

  if (isLoadUpliftNoColumn(column)) {
    return values.uplift_number ?? "";
  }

  if (isLoadQtyColumn(column)) {
    return values.load_qty ?? "";
  }

  if (isLoadActualQtyColumn(column)) {
    return values.actual_loaded_qty ?? "";
  }

  if (isLoadDateColumn(column)) {
    return values.load_date ?? "";
  }

  if (isLoadExpComplDateColumn(column)) {
    return values.expected_completion_date ?? "";
  }

  if (isLoadCollectionPointColumn(column)) {
    return values.collection_point_id ?? "";
  }

  return values[column.key] ?? "";
}

function isLoadContractNoColumn(column) {
  const { label, key } = columnLabelKey(column);
  return (
    label === "contract no." ||
    label === "contract no" ||
    key === "contract_number"
  );
}

function isLoadUpliftNoColumn(column) {
  const { label, key } = columnLabelKey(column);
  return (
    label === "uplift no." ||
    label === "uplift no" ||
    key === "uplift_number"
  );
}

function isLoadQtyColumn(column) {
  const { label, key } = columnLabelKey(column);
  return label === "load qty" || key === "load_qty";
}

function isLoadActualQtyColumn(column) {
  const { label, key } = columnLabelKey(column);
  return (
    label === "actual load qty" || key === "actual_loaded_qty"
  );
}

function isLoadDateColumn(column) {
  const { label, key } = columnLabelKey(column);
  return label === "load date" || key === "load_date";
}

function isLoadExpComplDateColumn(column) {
  const { label, key } = columnLabelKey(column);
  return (
    label === "exp compl date" ||
    key === "expected_completion_date"
  );
}

function isLoadCollectionPointColumn(column) {
  const { label, key } = columnLabelKey(column);
  return (
    label === "collection point" ||
    key === "collection_point" ||
    key === "collection_point_id"
  );
}

function isLoadStatusColumn(column) {
  const { label, key } = columnLabelKey(column);
  return label === "load status" || key === "load_status";
}

function isLoadEditableColumn(column) {
  return (
    isLoadContractNoColumn(column) ||
    isLoadUpliftNoColumn(column) ||
    isLoadQtyColumn(column) ||
    isLoadActualQtyColumn(column) ||
    isLoadDateColumn(column) ||
    isLoadExpComplDateColumn(column) ||
    isLoadCollectionPointColumn(column)
  );
}

function isAllowedSuggestedQtyInput(text, maxValue) {
  if (maxValue == null || String(maxValue).trim() === "") {
    return true;
  }

  const raw = String(text ?? "").trim();

  if (raw === "" || raw === "." || raw === ",") {
    return true;
  }

  if (!/^\d*([.,]\d*)?$/.test(raw)) {
    return false;
  }

  const qty = Number(raw.replace(",", "."));

  if (!Number.isFinite(qty) || qty < 0) {
    return false;
  }

  const max = Number(
    String(maxValue).trim().replace(/\s/g, "").replace(",", "."),
  );

  return !Number.isFinite(max) || qty <= max;
}

function LoadDraftCell({
  column,
  values,
  collectionPointOptions,
  selectLookupOption,
  disabled,
  onChange,
  draftIndex,
}) {
  if (isLoadContractNoColumn(column)) {
    return (
      <ClearableInput
        aria-label="Contract No."
        type="text"
        value={values.contract_number ?? ""}
        disabled={disabled}
        onChange={(event) =>
          onChange?.({ contract_number: event.target.value }, draftIndex)
        }
        className={DRAFT_INPUT_CLASS}
      />
    );
  }

  if (isLoadUpliftNoColumn(column)) {
    return (
      <ClearableInput
        aria-label="Uplift No."
        type="text"
        value={values.uplift_number ?? ""}
        disabled={disabled}
        onChange={(event) =>
          onChange?.({ uplift_number: event.target.value }, draftIndex)
        }
        className={DRAFT_INPUT_CLASS}
      />
    );
  }

  if (isLoadQtyColumn(column)) {
    return (
      <ClearableInput
        aria-label="Load Qty"
        type="text"
        inputMode="decimal"
        value={values.load_qty ?? ""}
        disabled={disabled}
        onChange={(event) => {
          const next = event.target.value;

          if (!isAllowedSuggestedQtyInput(next, values.load_qty_max)) {
            return;
          }

          onChange?.({ load_qty: next }, draftIndex);
        }}
        className={`${DRAFT_INPUT_CLASS} text-right tabular-nums`}
      />
    );
  }

  if (isLoadActualQtyColumn(column)) {
    return (
      <ClearableInput
        aria-label="Actual Load Qty"
        type="text"
        inputMode="decimal"
        value={values.actual_loaded_qty ?? ""}
        disabled={disabled}
        onChange={(event) =>
          onChange?.({ actual_loaded_qty: event.target.value }, draftIndex)
        }
        className={`${DRAFT_INPUT_CLASS} text-right tabular-nums`}
      />
    );
  }

  if (isLoadDateColumn(column)) {
    return (
      <input
        aria-label="Load Date"
        type="date"
        value={values.load_date ?? ""}
        disabled={disabled}
        onChange={(event) =>
          onChange?.({ load_date: event.target.value }, draftIndex)
        }
        className={DRAFT_DATE_CLASS}
      />
    );
  }

  if (isLoadExpComplDateColumn(column)) {
    return (
      <input
        aria-label="Exp Compl Date"
        type="date"
        value={values.expected_completion_date ?? ""}
        disabled={disabled}
        onChange={(event) =>
          onChange?.({
            expected_completion_date: event.target.value,
          }, draftIndex)
        }
        className={DRAFT_DATE_CLASS}
      />
    );
  }

  if (isLoadCollectionPointColumn(column)) {
    return (
      <DraftSelect
        label="Collection Point"
        value={values.collection_point_id ?? selectLookupOption.id}
        options={collectionPointOptions}
        selectOption={selectLookupOption}
        disabled={disabled}
        onChange={(collection_point_id) =>
          onChange?.({ collection_point_id }, draftIndex)
        }
      />
    );
  }

  return formatCell(loadDraftCellValue(values, column), {
    numeric:
      isLoadQtyColumn(column) || isLoadActualQtyColumn(column),
  });
}

function isLiftQtyToLiftColumn(column) {
  const { label, key } = columnLabelKey(column);
  return label === "qty to lift" || key === "qty_to_lift";
}

function isLiftSupplierReleaseColumn(column) {
  const { label, key } = columnLabelKey(column);
  return (
    label === "supplier release number" ||
    key === "supplier_release_number"
  );
}

function isLiftStatusColumn(column) {
  const { label, key } = columnLabelKey(column);
  return label === "lift status" || key === "lift_status";
}

function isOverUnderColumn(column) {
  const { label, key } = columnLabelKey(column);
  return (
    label === "over / under" ||
    label === "remaining qty to lift" ||
    label === "qty still to lift" ||
    key === "remaining_qty_to_lift" ||
    key === "qty_still_to_lift" ||
    key === "lift_over_under" ||
    key === "item_over_under"
  );
}

function overUnderHeaderTip(column, kind) {
  if (!isOverUnderColumn(column)) {
    return undefined;
  }

  const { key } = columnLabelKey(column);

  if (kind === "tracking" || key === "item_over_under") {
    return "Actual Over / Under For This Item";
  }

  return "Actual Over / Under Qty for this Lift";
}

function isUnassignedColumn(column) {
  const { label, key } = columnLabelKey(column);
  return (
    label === "unassigned" ||
    key === "qty_not_assigned_to_load" ||
    key === "qty_not_assigned_to_lift"
  );
}

function unassignedHeaderTip(column, kind) {
  if (!isUnassignedColumn(column)) {
    return undefined;
  }

  const { key } = columnLabelKey(column);

  if (kind === "tracking" || key === "qty_not_assigned_to_lift") {
    return "Qty not assigned to Lift";
  }

  if (kind === "lift" || key === "qty_not_assigned_to_load") {
    return "Qty not assigned to Load";
  }

  return undefined;
}

const BLEND_GROUP_KEY_COL_CLASS =
  "w-[calc((15ch+1.5rem)*0.5)] max-w-[calc((15ch+1.5rem)*0.5)] min-w-0 whitespace-normal break-words leading-tight";

function DraftSelect({
  label,
  value,
  options,
  selectOption,
  disabled,
  onChange,
  className = DRAFT_INPUT_CLASS,
}) {
  return (
    <select
      aria-label={label}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className={className}
    >
      <option value={selectOption.id}>{selectOption.label}</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

const DRAFT_CONTROL_CLASS =
  "rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200";

const DRAFT_INPUT_CLASS = `w-full min-w-24 ${DRAFT_CONTROL_CLASS}`;

const DRAFT_DATE_CLASS = `w-[90%] min-w-0 ${DRAFT_CONTROL_CLASS}`;

function ClearableInput({
  value,
  onChange,
  disabled,
  className,
  wrapperClassName = "w-full",
  style,
  ...props
}) {
  return (
    <span className={`relative inline-flex min-w-0 ${wrapperClassName}`}>
      <input
        {...props}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={className}
        style={{ paddingRight: "1.05rem", ...style }}
      />
      {disabled ? null : (
        <button
          type="button"
          aria-label="Clear"
          tabIndex={-1}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onChange?.({ target: { value: "" } });
          }}
          className="absolute top-0 right-0 z-10 flex h-3.5 w-3.5 items-center justify-center text-[11px] leading-none text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          ×
        </button>
      )}
    </span>
  );
}

const DRAFT_PRODUCT_SELECT_CLASS = `box-content w-[7ch] min-w-[7ch] max-w-[7ch] px-1 ${DRAFT_CONTROL_CLASS}`;

const DRAFT_CURRENCY_SELECT_CLASS = `box-content w-[5ch] min-w-[5ch] max-w-[5ch] px-1 ${DRAFT_CONTROL_CLASS}`;

const EDIT_CURRENCY_SELECT_CLASS = `box-content w-[6.25ch] min-w-[6.25ch] max-w-[6.25ch] px-1 ${DRAFT_CONTROL_CLASS}`;

const DRAFT_CELL_PAD_CLASS = "px-[calc(0.75rem*0.85*0.8)] py-2";

const DRAFT_CELL_PAD_NARROW_RIGHT_CLASS =
  "pl-[calc(0.75rem*0.85*0.8)] pr-[calc(0.75rem*0.85*0.75*0.8)] py-2";

const DRAFT_CELL_PAD_NARROW_LEFT_CLASS =
  "pl-[calc(0.75rem*0.85*0.75*0.8)] pr-[calc(0.75rem*0.85*0.8)] py-2";

const EDIT_CELL_PAD_CLASS = "px-[calc(0.75rem*0.85*0.8*0.8)] py-2";

const EDIT_CELL_PAD_NARROW_RIGHT_CLASS =
  "pl-[calc(0.75rem*0.85*0.8*0.8)] pr-[calc(0.75rem*0.85*0.75*0.8*0.8)] py-2";

const EDIT_CELL_PAD_NARROW_LEFT_CLASS =
  "pl-[calc(0.75rem*0.85*0.75*0.8*0.8)] pr-[calc(0.75rem*0.85*0.8*0.8)] py-2";

const CELL_PAD_NARROW_RIGHT_CLASS = "pl-3 pr-[calc(0.75rem*0.75)] py-2";

const CELL_PAD_NARROW_LEFT_CLASS = "pl-[calc(0.75rem*0.75)] pr-3 py-2";

function trackingColumnPadClass(column, { draft = false, edit = false } = {}) {
  if (isTrackingPurchaseDateColumn(column) || isTrackingStatusDateColumn(column)) {
    if (edit) {
      return EDIT_CELL_PAD_NARROW_RIGHT_CLASS;
    }

    return draft
      ? DRAFT_CELL_PAD_NARROW_RIGHT_CLASS
      : CELL_PAD_NARROW_RIGHT_CLASS;
  }

  if (isTrackingStatusColumn(column) || isTrackingCompanyColumn(column)) {
    if (edit) {
      return EDIT_CELL_PAD_NARROW_LEFT_CLASS;
    }

    return draft
      ? DRAFT_CELL_PAD_NARROW_LEFT_CLASS
      : CELL_PAD_NARROW_LEFT_CLASS;
  }

  if (edit) {
    return EDIT_CELL_PAD_CLASS;
  }

  return draft ? DRAFT_CELL_PAD_CLASS : "px-3 py-2";
}

function TrackingDraftCell({
  column,
  values,
  trackingLookups,
  selectLookupOption,
  disabled,
  onChange,
  locked = false,
}) {
  if (isTrackingTradeNoColumn(column)) {
    return values.tradeNo ?? "";
  }

  if (isTrackingProductColumn(column)) {
    if (locked) {
      const match = (trackingLookups.products ?? []).find(
        (option) => option.id === String(values.productId),
      );
      return match?.label ?? values.productLabel ?? "";
    }

    return (
      <DraftSelect
        label="Product"
        value={values.productId}
        options={trackingLookups.products}
        selectOption={selectLookupOption}
        disabled={disabled}
        className={DRAFT_PRODUCT_SELECT_CLASS}
        onChange={(productId) => onChange?.({ productId })}
      />
    );
  }

  if (isTrackingUnitColumn(column)) {
    return (
      <DraftSelect
        label="Unit"
        value={values.unitId}
        options={trackingLookups.units}
        selectOption={selectLookupOption}
        disabled={disabled}
        onChange={(unitId) => onChange?.({ unitId })}
      />
    );
  }

  if (isTrackingEthanolColumn(column)) {
    if (locked) {
      return values.ethanolPercent ?? "";
    }

    return (
      <ClearableInput
        aria-label="Ethanol %"
        type="text"
        inputMode="decimal"
        size={3}
        value={values.ethanolPercent}
        disabled={disabled}
        onChange={(event) => {
          const next = event.target.value;
          if (next !== "" && !/^-?\d*[.,]?\d*$/.test(next)) {
            return;
          }

          onChange?.({ ethanolPercent: next });
        }}
        wrapperClassName="w-auto"
        className="box-content w-[3ch] min-w-[3ch] rounded border border-zinc-300 bg-white px-1 py-1 text-right text-sm tabular-nums text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
      />
    );
  }

  if (isTrackingQtyColumn(column)) {
    if (locked) {
      return formatNumberMask(values.qty) || values.qty || "";
    }

    return (
      <ClearableInput
        aria-label="Qty (litres)"
        type="number"
        step="any"
        inputMode="decimal"
        value={values.qty}
        disabled={disabled}
        title={qtyCubesTip(values.qty)}
        onChange={(event) => onChange?.({ qty: event.target.value })}
        className={`${DRAFT_INPUT_CLASS} text-right tabular-nums`}
      />
    );
  }

  if (isTrackingPurchaseDateColumn(column)) {
    return (
      <input
        aria-label="Purchase Date"
        type="date"
        value={values.purchaseDate ?? ""}
        disabled={disabled}
        onChange={(event) =>
          onChange?.({
            purchaseDate: event.target.value,
          })
        }
        className={DRAFT_DATE_CLASS}
      />
    );
  }

  if (isTrackingStatusColumn(column)) {
    return (
      <DraftSelect
        label="Status"
        value={values.statusId}
        options={trackingLookups.statuses}
        selectOption={selectLookupOption}
        disabled={disabled}
        onChange={(statusId) => onChange?.({ statusId })}
      />
    );
  }

  if (isTrackingStatusDateColumn(column)) {
    return (
      <input
        aria-label="Status Date"
        type="date"
        value={values.statusDate ?? ""}
        disabled={disabled}
        onChange={(event) => onChange?.({ statusDate: event.target.value })}
        className={DRAFT_DATE_CLASS}
      />
    );
  }

  if (isTrackingCompanyColumn(column)) {
    return (
      <DraftSelect
        label="Company"
        value={values.companyId}
        options={trackingLookups.suppliers}
        selectOption={selectLookupOption}
        disabled={disabled}
        onChange={(companyId) => onChange?.({ companyId })}
      />
    );
  }

  if (isTrackingPortColumn(column)) {
    return (
      <DraftSelect
        label="Port"
        value={values.portId}
        options={trackingLookups.ports}
        selectOption={selectLookupOption}
        disabled={disabled}
        onChange={(portId) => onChange?.({ portId })}
      />
    );
  }

  if (isTrackingSuppInvNoColumn(column)) {
    return (
      <ClearableInput
        aria-label="Supp_Inv_No."
        type="text"
        value={values.suppInvNo}
        disabled={disabled}
        onChange={(event) => onChange?.({ suppInvNo: event.target.value })}
        className={DRAFT_INPUT_CLASS}
      />
    );
  }

  if (isTrackingSuppInvAmtColumn(column)) {
    return (
      <ClearableInput
        aria-label="Supp_Inv_Amt."
        type="number"
        step="any"
        inputMode="decimal"
        value={values.suppInvAmt}
        disabled={disabled}
        onChange={(event) =>
          onChange?.({
            suppInvAmt: event.target.value,
          })
        }
        className={`${DRAFT_INPUT_CLASS} text-right tabular-nums`}
      />
    );
  }

  if (isTrackingCurrencyColumn(column)) {
    return (
      <DraftSelect
        label="Currency"
        value={values.currencyId}
        options={trackingLookups.currencies}
        selectOption={selectLookupOption}
        disabled={disabled}
        className={
          locked ? EDIT_CURRENCY_SELECT_CLASS : DRAFT_CURRENCY_SELECT_CLASS
        }
        onChange={(currencyId) => onChange?.({ currencyId })}
      />
    );
  }

  return null;
}

export function GridFrame({ title, headerExtra = null, frameRef, children }) {
  return (
    <div className="w-full" ref={frameRef}>
      {title || headerExtra ? (
        <div className="mb-2 flex items-center gap-4">
          {title ? (
            <h2 className="text-lg font-semibold text-navy-950">
              {title}
            </h2>
          ) : null}
          {headerExtra}
        </div>
      ) : null}
      <div className="w-full overflow-x-auto rounded border border-zinc-300">
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
  integerNumeric = false,
  dateLabels = [],
  dateTimeLabels = [],
  onDocsSelect,
  onNotesSelect,
  onNoteTextSelect,
  onCostSelect,
  onTransportChannelSelect,
  showViewButton = false,
  onViewFile,
  showDeleteButton = false,
  onDeleteFile,
  currentUserId = "",
  deleteIfCurrentUser = false,
  draftRow = null,
  draftRows = null,
  onDraftChange,
  onCommitDraft,
  costTypeOptions = [],
  selectCostTypeOption = { id: "0", label: " - SELECT -" },
  draftPending = false,
  headerExtra = null,
  hoveredRowId = "",
  showRowEdit = false,
  onRowHover,
  onRowLeave,
  onEditSelect,
  frameRef,
  editRow = null,
  onEditChange,
  onCommitEdit,
  tradeStatusOptions = [],
  liftStatusOptions = [],
  loadStatusOptions = [],
  draftKind = "",
  trackingLookups = {
    products: [],
    units: [],
    suppliers: [],
    ports: [],
    currencies: [],
    statuses: [],
  },
  selectLookupOption = { id: "0", label: " - SELECT -" },
  collectionPointOptions = [],
  hideEthanolColumn = false,
  hideUnitColumn = false,
  saleableVolumeSplit = null,
  onSaleableVolumeEnter,
  onSaleableVolumeLeave,
}) {
  const activeDrafts =
    Array.isArray(draftRows) && draftRows.length
      ? draftRows
      : draftRow
        ? [draftRow]
        : [];

  if (message && !activeDrafts.length) {
    return (
      <GridFrame title={title} headerExtra={headerExtra} frameRef={frameRef}>
        <p className="px-3 py-2 text-sm text-red-700 dark:text-red-400">
          {message}
        </p>
      </GridFrame>
    );
  }

  if (pending && !rows?.length && !activeDrafts.length) {
    return (
      <GridFrame title={title} headerExtra={headerExtra} frameRef={frameRef}>
        <p className="px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400">
          Loading…
        </p>
      </GridFrame>
    );
  }

  if (!rows?.length && !activeDrafts.length) {
    return (
      <GridFrame title={title} headerExtra={headerExtra} frameRef={frameRef}>
        <p className="px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400">
          No rows.
        </p>
      </GridFrame>
    );
  }

  const columns = relabelLoadProduct(
    placeProductAfterTradeNumber(
      placeDocsAndNotesAfterUnassigned(
        insertCostLinkAfterCurrency(
          placeUnassignedAfterOverUnder(
            (rows?.[0]
              ? gridColumns(rows[0], columnLabels)
              : labelsToColumns(columnLabels)
            ).filter((column) => !column.hidden),
          ),
        ),
      ),
    ),
    draftKind,
  ).filter((column) => {
    if (hideEthanolColumn && isTrackingEthanolColumn(column)) {
      return false;
    }

    if (hideUnitColumn && isTrackingUnitColumn(column)) {
      return false;
    }

    if (column.key === COST_LINK_KEY) {
      return typeof onCostSelect === "function";
    }

    return true;
  });
  const numeric = new Set(
    numericLabels.map((label) => String(label).toLowerCase()),
  );
  const dates = new Set(dateLabels.map((label) => String(label).toLowerCase()));
  const dateTimes = new Set(
    dateTimeLabels.map((label) => String(label).toLowerCase()),
  );
  const selectable = typeof onSelect === "function";
  const showDeleteColumn = showDeleteButton || deleteIfCurrentUser;
  const showCommitColumn =
    Boolean(activeDrafts.length) && typeof onCommitDraft === "function";
  const showHoverEditColumn =
    typeof onRowHover === "function" && !activeDrafts.length;

  function matches(set, column) {
    return (
      set.has(String(column.label).toLowerCase()) ||
      set.has(String(column.key).toLowerCase())
    );
  }

  function isDocsColumn(column) {
    return isDocsKey(column.key) || column.label.toLowerCase() === "docs";
  }

  function isNotesColumn(column) {
    return (
      column.key.toLowerCase() === "note_count" ||
      column.key.toLowerCase() === "notes" ||
      column.label.toLowerCase() === "notes"
    );
  }

  function isNoteTextColumn(column) {
    return (
      column.key.toLowerCase() === "note" ||
      column.label.toLowerCase() === "note"
    );
  }

  function isTransportChannelColumn(column) {
    return (
      column.key.toLowerCase() === "transport_channel" ||
      column.label.toLowerCase() === "transport channel"
    );
  }

  return (
    <GridFrame title={title} headerExtra={headerExtra} frameRef={frameRef}>
      <table className="w-full border-collapse text-left text-sm text-zinc-800 dark:text-zinc-200">
        <thead>
          <tr className="border-b border-zinc-300 bg-zinc-50 text-navy-950">
            {columns.map((column) => (
              <th
                key={column.key}
                title={
                  isOverUnderColumn(column)
                    ? overUnderHeaderTip(column, draftKind)
                    : unassignedHeaderTip(column, draftKind) ??
                      (isTrackingEthanolColumn(column)
                        ? "Ethanol % - e.g. '10'"
                        : undefined)
                }
                className={[
                  draftKind === "tracking"
                    ? `${trackingColumnPadClass(column)} font-bold`
                    : "px-3 py-2 font-bold",
                  matches(numeric, column) ? "text-right" : "",
                  isTrackingEthanolColumn(column)
                    ? "cursor-default text-blue-900 underline dark:text-blue-300"
                    : "",
                  isOverUnderColumn(column)
                    ? "group relative cursor-pointer text-gold-600 underline"
                    : "",
                  unassignedHeaderTip(column, draftKind)
                    ? "group relative cursor-pointer text-gold-600 underline"
                    : "",
                  isBlendGroupKeyColumn(column) ? BLEND_GROUP_KEY_COL_CLASS : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {column.label}
                {isOverUnderColumn(column) ? (
                  <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-zinc-800 px-2 py-0.5 text-xs font-normal text-white group-hover:block dark:bg-zinc-200 dark:text-zinc-900">
                    {overUnderHeaderTip(column, draftKind)}
                  </span>
                ) : null}
                {unassignedHeaderTip(column, draftKind) ? (
                  <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-zinc-800 px-2 py-0.5 text-xs font-normal text-white group-hover:block dark:bg-zinc-200 dark:text-zinc-900">
                    {unassignedHeaderTip(column, draftKind)}
                  </span>
                ) : null}
              </th>
            ))}
            {showViewButton ? (
              <th className="px-3 py-2 font-bold" aria-label="View" />
            ) : null}
            {showDeleteColumn ? (
              <th className="px-3 py-2 font-bold" aria-label="Delete" />
            ) : null}
            {showCommitColumn ? (
              <th className="px-3 py-2 font-bold" aria-label="Commit" />
            ) : null}
            {showHoverEditColumn ? (
              <th className="px-3 py-2 font-bold" aria-label="Edit" />
            ) : null}
          </tr>
        </thead>
        <tbody onMouseLeave={onRowLeave}>
          {activeDrafts.map((draft, draftIndex) => (
            <tr
              key={`draft-${draftIndex}`}
              className="border-b border-zinc-200 dark:border-zinc-700"
            >
              {columns.map((column) => {
                const costTypeColumn = isCostTypeDraftColumn(column);
                const descriptionColumn = isDescriptionDraftColumn(column);
                const amountColumn = isAmountDraftColumn(column);
                const qtyColumn = isQtyDraftColumn(column);
                const costDateColumn = isCostDateDraftColumn(column);
                const numericColumn =
                  amountColumn ||
                  qtyColumn ||
                  (draftKind === "tracking" &&
                    (isTrackingEthanolColumn(column) ||
                      isTrackingQtyColumn(column) ||
                      isTrackingSuppInvAmtColumn(column))) ||
                  (draftKind === "lift" &&
                    (column.label.toLowerCase() === "qty to lift" ||
                      column.key.toLowerCase() === "qty_to_lift" ||
                      isOverUnderColumn(column) ||
                      isUnassignedColumn(column))) ||
                  (draftKind === "load" &&
                    (isLoadQtyColumn(column) ||
                      isLoadActualQtyColumn(column)));

                return (
                  <td
                    key={column.key}
                    className={[
                      draftKind === "tracking"
                        ? `${trackingColumnPadClass(column, { draft: true })} align-middle`
                        : "px-3 py-2 align-middle",
                      numericColumn ? "text-right" : "",
                      draftKind === "tracking" && isTrackingQtyColumn(column)
                        ? "group relative"
                        : "",
                      isBlendGroupKeyColumn(column)
                        ? BLEND_GROUP_KEY_COL_CLASS
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    title={
                      draftKind === "tracking" && isTrackingQtyColumn(column)
                        ? qtyCubesTip(draft.qty)
                        : undefined
                    }
                  >
                    {draftKind === "load" ? (
                      <LoadDraftCell
                        column={column}
                        values={draft}
                        collectionPointOptions={collectionPointOptions}
                        selectLookupOption={selectLookupOption}
                        disabled={draftPending}
                        onChange={onDraftChange}
                        draftIndex={draftIndex}
                      />
                    ) : draftKind === "lift" ? (
                      isLiftQtyToLiftColumn(column) ? (
                        <ClearableInput
                          aria-label="Qty to Lift"
                          type="text"
                          inputMode="decimal"
                          value={draft.qty_to_lift ?? ""}
                          disabled={draftPending}
                          onChange={(event) => {
                            const next = event.target.value;

                            if (
                              !isAllowedSuggestedQtyInput(
                                next,
                                draft.qty_to_lift_max,
                              )
                            ) {
                              return;
                            }

                            onDraftChange?.(
                              { qty_to_lift: next },
                              draftIndex,
                            );
                          }}
                          className={`${DRAFT_INPUT_CLASS} text-right tabular-nums`}
                        />
                      ) : isLiftSupplierReleaseColumn(column) ? (
                        <ClearableInput
                          aria-label="Supplier Release Number"
                          type="text"
                          value={draft.supplier_release_number ?? ""}
                          disabled={draftPending}
                          onChange={(event) =>
                            onDraftChange?.(
                              { supplier_release_number: event.target.value },
                              draftIndex,
                            )
                          }
                          className={DRAFT_INPUT_CLASS}
                        />
                      ) : (
                        formatCell(liftDraftCellValue(draft, column), {
                          numeric: numericColumn,
                        })
                      )
                    ) : draftKind === "tracking" ? (
                      <TrackingDraftCell
                        column={column}
                        values={draft}
                        trackingLookups={trackingLookups}
                        selectLookupOption={selectLookupOption}
                        disabled={draftPending}
                        onChange={onDraftChange}
                      />
                    ) : costTypeColumn ? (
                      <select
                        aria-label="Cost Type"
                        value={draft.costTypeId}
                        disabled={draftPending}
                        onChange={(event) =>
                          onDraftChange?.({ costTypeId: event.target.value })
                        }
                        className={DRAFT_INPUT_CLASS}
                      >
                        <option value={selectCostTypeOption.id}>
                          {selectCostTypeOption.label}
                        </option>
                        {costTypeOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : descriptionColumn ? (
                      <ClearableInput
                        aria-label="Description"
                        type="text"
                        value={draft.description}
                        disabled={draftPending}
                        onChange={(event) =>
                          onDraftChange?.({ description: event.target.value })
                        }
                        className={DRAFT_INPUT_CLASS}
                      />
                    ) : amountColumn ? (
                      <ClearableInput
                        aria-label="Amount"
                        type="number"
                        step="any"
                        inputMode="decimal"
                        value={draft.amount}
                        disabled={draftPending}
                        onChange={(event) =>
                          onDraftChange?.({ amount: event.target.value })
                        }
                        className={`${DRAFT_INPUT_CLASS} text-right tabular-nums`}
                      />
                    ) : qtyColumn ? (
                      <ClearableInput
                        aria-label="Qty"
                        type="number"
                        step="any"
                        inputMode="decimal"
                        value={draft.qty}
                        disabled={draftPending}
                        onChange={(event) =>
                          onDraftChange?.({ qty: event.target.value })
                        }
                        className={`${DRAFT_INPUT_CLASS} text-right tabular-nums`}
                      />
                    ) : costDateColumn ? (
                      <input
                        aria-label="Cost Date"
                        type="date"
                        value={draft.costDate ?? ""}
                        disabled={draftPending}
                        onChange={(event) =>
                          onDraftChange?.({ costDate: event.target.value })
                        }
                        className={DRAFT_INPUT_CLASS}
                      />
                    ) : null}
                  </td>
                );
              })}
              {showViewButton ? (
                <td
                  className={
                    draftKind === "tracking" ? DRAFT_CELL_PAD_CLASS : "px-3 py-2"
                  }
                />
              ) : null}
              {showDeleteColumn ? (
                <td
                  className={
                    draftKind === "tracking" ? DRAFT_CELL_PAD_CLASS : "px-3 py-2"
                  }
                />
              ) : null}
              {showCommitColumn ? (
                <td
                  className={
                    draftKind === "tracking"
                      ? `${DRAFT_CELL_PAD_CLASS} align-middle`
                      : "px-3 py-2 align-middle"
                  }
                >
                  <button
                    type="button"
                    disabled={draftPending}
                    onClick={() => onCommitDraft?.(draftIndex)}
                    className="text-sm font-medium text-blue-900 underline disabled:opacity-50 dark:text-blue-300"
                  >
                    {draftPending ? "Saving…" : "Commit"}
                  </button>
                </td>
              ) : null}
              {showHoverEditColumn ? (
                <td
                  className={
                    draftKind === "tracking" ? DRAFT_CELL_PAD_CLASS : "px-3 py-2"
                  }
                />
              ) : null}
            </tr>
          ))}
          {rows.map((row, index) => {
            const id = rowId(row);
            const selected = selectable && id !== "" && id === selectedId;
            const voidRow = isVoidGridRow(row, columns);

            return (
              <tr
                key={id || index}
                className={[
                  "border-b border-zinc-200 dark:border-zinc-700",
                  selectable
                    ? "cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    : "",
                  selected
                    ? "bg-zinc-100 shadow-[inset_4px_0_0_0_#AD8A40]"
                    : "",
                  voidRow
                    ? "[&>td]:line-through [&>td]:decoration-zinc-700 [&_button]:line-through dark:[&>td]:decoration-zinc-300"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={selectable ? () => onSelect(id) : undefined}
                onMouseEnter={
                  onRowHover && id
                    ? () => {
                        onRowHover(id);
                      }
                    : undefined
                }
              >
                {columns.map((column) => {
                  if (column.key === COST_LINK_KEY) {
                    return (
                      <td
                        key={column.key}
                        className="px-3 py-2 align-middle text-right tabular-nums"
                      >
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onCostSelect?.(id);
                          }}
                          className="cursor-pointer text-sm font-medium text-blue-900 underline dark:text-blue-300"
                        >
                          {formatCell(fieldByKey(row, "cost_per_litre"), {
                            numeric: true,
                            zeroIfNull: true,
                          })}
                        </button>
                      </td>
                    );
                  }

                  const docsColumn = isDocsColumn(column);
                  const notesColumn = isNotesColumn(column);
                  const noteTextColumn = isNoteTextColumn(column);
                  const transportChannelColumn = isTransportChannelColumn(column);
                  const editing = Boolean(editRow && id !== "" && id === editRow.id);
                  const descriptionColumn = isDescriptionDraftColumn(column);
                  const tradeStatusColumn = isTradeStatusColumn(column);

                  if (editing && descriptionColumn) {
                    return (
                      <td
                        key={column.key}
                        className="px-3 py-2 align-middle"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <ClearableInput
                          aria-label="Description"
                          type="text"
                          value={editRow.description}
                          onChange={(event) =>
                            onEditChange?.({ description: event.target.value })
                          }
                          className={DRAFT_INPUT_CLASS}
                        />
                      </td>
                    );
                  }

                  if (editing && tradeStatusColumn) {
                    const statusOptions = tradeStatusOptions.slice();
                    const hasSelected = statusOptions.some(
                      (option) => option.id === editRow.tradeStatusId,
                    );

                    if (!hasSelected) {
                      statusOptions.unshift({
                        id: editRow.tradeStatusId,
                        label: editRow.statusLabel || " - SELECT -",
                      });
                    }

                    return (
                      <td
                        key={column.key}
                        className="px-3 py-2 align-middle"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <select
                          aria-label="Trade Status"
                          value={editRow.tradeStatusId}
                          onChange={(event) =>
                            onEditChange?.({ tradeStatusId: event.target.value })
                          }
                          className={DRAFT_INPUT_CLASS}
                        >
                          {statusOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    );
                  }

                  if (editing && draftKind === "lift" && isLiftQtyToLiftColumn(column)) {
                    return (
                      <td
                        key={column.key}
                        className="px-3 py-2 align-middle text-right"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <ClearableInput
                          aria-label="Qty to Lift"
                          type="text"
                          inputMode="decimal"
                          value={editRow.qtyToLift ?? ""}
                          disabled={draftPending}
                          onChange={(event) =>
                            onEditChange?.({ qtyToLift: event.target.value })
                          }
                          className={`${DRAFT_INPUT_CLASS} text-right tabular-nums`}
                        />
                      </td>
                    );
                  }

                  if (
                    editing &&
                    draftKind === "lift" &&
                    isLiftSupplierReleaseColumn(column)
                  ) {
                    return (
                      <td
                        key={column.key}
                        className="px-3 py-2 align-middle"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <ClearableInput
                          aria-label="Supplier Release Number"
                          type="text"
                          value={editRow.supplierReleaseNumber ?? ""}
                          disabled={draftPending}
                          onChange={(event) =>
                            onEditChange?.({
                              supplierReleaseNumber: event.target.value,
                            })
                          }
                          className={DRAFT_INPUT_CLASS}
                        />
                      </td>
                    );
                  }

                  if (editing && draftKind === "lift" && isLiftStatusColumn(column)) {
                    const statusOptions = liftStatusOptions.slice();
                    const selectedId =
                      editRow.liftStatusId || editRow.statusLabel || "";
                    const hasSelected = statusOptions.some(
                      (option) => option.id === selectedId,
                    );

                    if (!hasSelected && selectedId) {
                      statusOptions.unshift({
                        id: selectedId,
                        label: editRow.statusLabel || selectedId,
                      });
                    }

                    return (
                      <td
                        key={column.key}
                        className="px-3 py-2 align-middle"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <select
                          aria-label="Lift Status"
                          value={selectedId}
                          disabled={draftPending}
                          onChange={(event) =>
                            onEditChange?.({ liftStatusId: event.target.value })
                          }
                          className={DRAFT_INPUT_CLASS}
                        >
                          {statusOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    );
                  }

                  if (editing && draftKind === "load" && isLoadStatusColumn(column)) {
                    const statusOptions = loadStatusOptions.slice();
                    const selectedId =
                      editRow.loadStatusId || editRow.statusLabel || "";
                    const hasSelected = statusOptions.some(
                      (option) => option.id === selectedId,
                    );

                    if (!hasSelected && selectedId) {
                      statusOptions.unshift({
                        id: selectedId,
                        label: editRow.statusLabel || selectedId,
                      });
                    }

                    return (
                      <td
                        key={column.key}
                        className="px-3 py-2 align-middle"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <select
                          aria-label="Load Status"
                          value={selectedId}
                          disabled={draftPending}
                          onChange={(event) =>
                            onEditChange?.({ loadStatusId: event.target.value })
                          }
                          className={DRAFT_INPUT_CLASS}
                        >
                          {statusOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    );
                  }

                  if (
                    editing &&
                    draftKind === "load" &&
                    isLoadEditableColumn(column)
                  ) {
                    return (
                      <td
                        key={column.key}
                        className={[
                          "px-3 py-2 align-middle",
                          isLoadQtyColumn(column) || isLoadActualQtyColumn(column)
                            ? "text-right"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <LoadDraftCell
                          column={column}
                          values={editRow}
                          collectionPointOptions={collectionPointOptions}
                          selectLookupOption={selectLookupOption}
                          disabled={draftPending}
                          onChange={(patch) => onEditChange?.(patch)}
                        />
                      </td>
                    );
                  }

                  if (editing && draftKind === "tracking") {
                    const trackingControl = (
                      <TrackingDraftCell
                        column={column}
                        values={editRow}
                        trackingLookups={trackingLookups}
                        selectLookupOption={selectLookupOption}
                        disabled={draftPending}
                        onChange={onEditChange}
                        locked
                      />
                    );

                    if (trackingControl != null) {
                      return (
                        <td
                          key={column.key}
                          className={[
                            `${trackingColumnPadClass(column, { edit: true })} align-middle`,
                            isTrackingQtyColumn(column) ||
                            isTrackingEthanolColumn(column) ||
                            isTrackingSuppInvAmtColumn(column)
                              ? "text-right"
                              : "",
                            isTrackingQtyColumn(column) ? "group relative" : "",
                            isBlendGroupKeyColumn(column)
                              ? BLEND_GROUP_KEY_COL_CLASS
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          title={
                            isTrackingQtyColumn(column)
                              ? qtyCubesTip(editRow.qty)
                              : undefined
                          }
                          onClick={(event) => event.stopPropagation()}
                        >
                          {trackingControl}
                        </td>
                      );
                    }
                  }

                  const qtyLitresColumn = isQtyLitresColumn(column);
                  const cubesTip = qtyLitresColumn
                    ? qtyCubesTip(row[column.key])
                    : "";
                  const linkColumn =
                    (docsColumn && onDocsSelect) ||
                    (notesColumn && onNotesSelect) ||
                    (noteTextColumn && onNoteTextSelect) ||
                    (transportChannelColumn && onTransportChannelSelect);
                  const saleableColumn =
                    isSaleableVolumeColumn(column) &&
                    typeof onSaleableVolumeEnter === "function" &&
                    id !== "";
                  const numericColumn =
                    matches(numeric, column) ||
                    (integerNumeric &&
                      !isNonNumericTradeColumn(column) &&
                      isNumericCellValue(row[column.key]));

                  if (saleableColumn) {
                    return (
                      <SaleableVolumeCell
                        key={column.key}
                        id={id}
                        className={[
                          "px-3 py-2 align-top",
                          numericColumn ? "text-right tabular-nums" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        formatted={formatCell(row[column.key], {
                          numeric: numericColumn,
                          integer: integerNumeric,
                          date: matches(dates, column),
                          dateTime: matches(dateTimes, column),
                        })}
                        split={saleableVolumeSplit}
                        onEnter={onSaleableVolumeEnter}
                        onLeave={onSaleableVolumeLeave}
                      />
                    );
                  }

                  return (
                    <td
                      key={column.key}
                      className={[
                        `${
                          draftKind === "tracking"
                            ? trackingColumnPadClass(column)
                            : "px-3 py-2"
                        } align-top`,
                        numericColumn ? "text-right tabular-nums" : "",
                        linkColumn
                          ? "cursor-pointer text-navy-950 underline"
                          : "",
                        isOverUnderColumn(column)
                          ? "font-medium text-gold-600"
                          : "",
                        qtyLitresColumn ? "group relative" : "",
                        isBlendGroupKeyColumn(column)
                          ? BLEND_GROUP_KEY_COL_CLASS
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      title={cubesTip || undefined}
                      onClick={
                        docsColumn && onDocsSelect
                          ? (event) => {
                              event.stopPropagation();
                              onDocsSelect(id);
                            }
                          : notesColumn && onNotesSelect
                            ? (event) => {
                                event.stopPropagation();
                                onNotesSelect(id);
                              }
                            : noteTextColumn && onNoteTextSelect
                              ? (event) => {
                                  event.stopPropagation();
                                  const value = row[column.key];
                                  onNoteTextSelect(
                                    value == null ? "" : String(value),
                                  );
                                }
                              : transportChannelColumn && onTransportChannelSelect
                                ? (event) => {
                                    event.stopPropagation();
                                    const value = row[column.key];
                                    const text =
                                      value == null ? "" : String(value);
                                    if (
                                      showCommitColumn &&
                                      text.trim().toLowerCase() !== "none"
                                    ) {
                                      return;
                                    }
                                    onTransportChannelSelect(id, text);
                                  }
                                : undefined
                      }
                    >
                      {formatCell(row[column.key], {
                        numeric: numericColumn,
                        integer: integerNumeric,
                        decimals: isAmtPerLitreColumn(column) ? 3 : undefined,
                        date: matches(dates, column),
                        dateTime: matches(dateTimes, column),
                        zeroIfNull: docsColumn || notesColumn,
                      })}
                      {cubesTip ? (
                        <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-zinc-800 px-2 py-0.5 text-xs text-white group-hover:block dark:bg-zinc-200 dark:text-zinc-900">
                          {cubesTip}
                        </span>
                      ) : null}
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
                {showDeleteColumn ? (
                  <td className="px-3 py-2 align-middle">
                    {showDeleteButton ||
                    (deleteIfCurrentUser &&
                      String(fieldByKey(row, "user_id") ?? "")
                        .trim()
                        .toLowerCase() ===
                        String(currentUserId ?? "")
                          .trim()
                          .toLowerCase() &&
                      String(currentUserId ?? "").trim() !== "") ? (
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
                    ) : null}
                  </td>
                ) : null}
                {showCommitColumn ? <td className="px-3 py-2" /> : null}
                {showHoverEditColumn ? (
                  <td className="px-3 py-2 align-middle">
                    {id !== "" && id === editRow?.id ? (
                      <button
                        type="button"
                        disabled={draftPending}
                        onClick={(event) => {
                          event.stopPropagation();
                          onCommitEdit?.();
                        }}
                        className="text-sm font-medium text-blue-900 underline disabled:opacity-50 dark:text-blue-300"
                      >
                        {draftPending ? "Saving…" : "Commit"}
                      </button>
                    ) : id !== "" &&
                      id === hoveredRowId &&
                      showRowEdit &&
                      !voidRow &&
                      id !== editRow?.id ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onEditSelect?.(id);
                        }}
                        className="text-sm font-medium text-blue-900 underline dark:text-blue-300"
                      >
                        Edit
                      </button>
                    ) : null}
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

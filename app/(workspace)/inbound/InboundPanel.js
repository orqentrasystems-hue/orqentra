"use client";

import { useEffect, useRef, useState } from "react";
import {
  addInboundCost,
  addInboundTrade,
  addInboundItemTracking,
  addInboundLift,
  addInboundLoad,
  updateInboundLoad,
  updateInboundLift,
  updateInboundItemTracking,
  updateInboundTrade,
  addInboundCostNote,
  addInboundDocument,
  addInboundLiftDocument,
  addInboundLiftNote,
  addInboundLoadDocument,
  addInboundLoadNote,
  addInboundNote,
  addTransportChannel,
  updateTransportChannel,
  deleteDocument,
  deleteInboundCostNote,
  deleteInboundLiftNote,
  deleteInboundLoadNote,
  deleteInboundNote,
  getDocumentFileUrl,
  loadCostTypes,
  loadDocumentDetails,
  loadDocumentInboundLift,
  loadDocumentInboundLoad,
  loadDocumentTypes,
  loadInboundCost,
  loadInboundItemTracking,
  loadInboundLift,
  loadInboundItemTrackingToLift,
  loadInboundLiftToLoad,
  loadInboundLoad,
  loadInboundTrades,
  loadSaleableVolumeSplit,
  loadItemTrackingStatuses,
  loadLiftStatuses,
  loadLoadStatuses,
  loadCollectionPoints,
  loadAllowAction,
  loadNotesInboundCost,
  loadNotesInboundLift,
  loadNotesInboundLoad,
  loadNotesInboundStockItemTracking,
  loadTransportChannel,
  loadCurrencies,
  loadPorts,
  loadProducts,
  loadSuppliers,
  loadTransportCompanies,
  loadTruckDrivers,
  loadTrucks,
  loadUnitsOfMeasure,
  loadTruckTrailers,
} from "./actions";
import DocumentDeleteConfirm from "./DocumentDeleteConfirm";
import ConfirmDialog from "./ConfirmDialog";
import DocumentFileViewer from "./DocumentFileViewer";
import DocumentUpload from "./DocumentUpload";
import InboundCostDialog from "./InboundCostDialog";
import InboundGrid, {
  COLUMN_LABELS,
  fieldByColumnLabel,
  fieldByKey,
  rowId,
} from "./InboundGrid";
import TradeStatusesSelect from "./TradeStatusesSelect";

const DEFAULT_STATUS_LABELS = new Set(["new", "in progress"]);

const SELECT_DOCUMENT_TYPE = {
  id: "0",
  label: " - SELECT -",
};

const SELECT_COST_TYPE = {
  id: "0",
  label: " - SELECT -",
};

const SELECT_LOOKUP = {
  id: "0",
  label: " - SELECT -",
};

const TRACKING_COLUMN_LABELS = [
  "id",
  "Trade No.",
  "Product",
  "Unit",
  "E. %",
  "Blend Group Key",
  "Qty (litres)",
  "Purchase Date",
  "Status",
  "Status Date",
  "Company",
  "Port",
  "Supp_Inv_No.",
  "Supp_Inv_Amt.",
  "Currency",
  "Over / Under",
  "Unassigned",
  "Docs",
  "Notes",
];

const LIFT_COLUMN_LABELS = [
  "id",
  "Trade Number",
  "Product Name",
  "Qty to Lift",
  "Supplier Release Number",
  "Lift Status",
  "Over / Under",
  "Unassigned",
  "Docs",
  "Notes",
  "Blend Group Key",
];

const LOAD_COLUMN_LABELS = [
  "id",
  "Trade Number",
  "Product",
  "Load Date",
  "Transport Channel",
  "Contract No.",
  "Uplift No.",
  "Collection Point",
  "Load Qty",
  "Unit",
  "Load Status",
  "Exp Compl Date",
  "Blend Group Key",
  "Blend Group Key (Lift)",
  "Blend Group Key (Load)",
  "Docs",
  "Notes",
  "Actual Load Qty",
];

const COST_COLUMN_LABELS = [
  "id",
  "Cost Type",
  "Description",
  "Amount",
  "Qty",
  "Unit",
  "Amt Per Litre",
  "Reversed",
  "Reverse Reason",
  "Cost Date",
  "Blend Group Key",
  "Notes",
];

function todayIsoDate() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function emptyCostDraft() {
  return {
    costTypeId: SELECT_COST_TYPE.id,
    description: "",
    amount: "",
    qty: "",
    costDate: todayIsoDate(),
  };
}

function emptyTrackingDraft(
  tradeNo = "",
  statusId = SELECT_LOOKUP.id,
  unitId = SELECT_LOOKUP.id,
) {
  return {
    tradeNo,
    productId: SELECT_LOOKUP.id,
    unitId,
    ethanolPercent: "",
    qty: "",
    purchaseDate: todayIsoDate(),
    statusId,
    statusDate: todayIsoDate(),
    company: "",
    companyId: SELECT_LOOKUP.id,
    portId: SELECT_LOOKUP.id,
    suppInvNo: "",
    suppInvAmt: "",
    currencyId: SELECT_LOOKUP.id,
  };
}

function liftDraftFromTrackingToLift(row) {
  const suggestedQty =
    fieldByKey(row, "qty_to_lift_max") ??
    fieldByKey(row, "qty_to_lift") ??
    fieldByKey(row, "suggested_qty") ??
    fieldByKey(row, "qty") ??
    "";

  return {
    inbound_item_tracking: firstField(row, ["id"]),
    trade_number: firstField(row, ["trade_number", "trade_no"]),
    product_name: firstField(row, ["product_name", "product"]),
    product_id: firstField(row, ["product_id"]),
    unit: firstField(row, ["unit", "local_industry_unit"]),
    blend_grouping_key: firstField(row, [
      "blend_grouping_key",
      "blend_group_key",
    ]),
    qty_to_lift: suggestedQty,
    qty_to_lift_max: suggestedQty,
    remaining_qty_to_lift:
      fieldByKey(row, "lift_over_under") ??
      fieldByKey(row, "qty_still_to_lift") ??
      fieldByKey(row, "remaining_qty_to_lift") ??
      "",
    lift_over_under: fieldByKey(row, "lift_over_under") ?? "",
    qty_not_assigned_to_load:
      fieldByKey(row, "qty_not_assigned_to_load") ?? "",
    supplier_release_number:
      firstField(row, ["supplier_release_number"]) || "",
    lift_status: "New",
  };
}

function emptyTradeDraft() {
  return {
    description: "",
  };
}

function patchDraftRows(rows, patch, index, sharedKeys = []) {
  const replicate = {};

  for (const key of sharedKeys) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      replicate[key] = patch[key];
    }
  }

  const shouldReplicate = Object.keys(replicate).length > 0;

  return rows.map((row, rowIndex) => {
    if (rowIndex === index) {
      return { ...row, ...patch };
    }

    if (shouldReplicate) {
      return { ...row, ...replicate };
    }

    return row;
  });
}

function loadDraftFromLiftToLoad(row) {
  const suggestedQty =
    fieldByKey(row, "load_qty_max") ?? fieldByKey(row, "load_qty") ?? "";

  return {
    id: firstField(row, ["id"]),
    trade_number: firstField(row, ["trade_number", "trade_no"]),
    product_name: firstField(row, ["product_name", "product"]),
    product_id: firstField(row, ["product_id"]),
    unit: firstField(row, ["unit", "local_industry_unit"]),
    blend_grouping_key: firstField(row, [
      "blend_grouping_key",
      "blend_group_key",
    ]),
    blend_grouping_key_lift: firstField(row, [
      "blend_grouping_key_lift",
      "blend_grouping_lift_key",
    ]),
    blend_grouping_key_load: firstField(row, [
      "blend_grouping_key_load",
      "blend_grouping_load_key",
    ]),
    contract_number: firstField(row, ["contract_number"]) || "",
    uplift_number: firstField(row, ["uplift_number"]) || "",
    load_qty: suggestedQty,
    load_qty_max: suggestedQty,
    actual_loaded_qty: fieldByKey(row, "actual_loaded_qty") ?? "",
    load_date: isoDateFromValue(fieldByKey(row, "load_date")) || "",
    expected_completion_date:
      isoDateFromValue(fieldByKey(row, "expected_completion_date")) || "",
    collection_point_id:
      firstField(row, ["collection_point_id"]) || SELECT_LOOKUP.id,
  };
}

function loadEditFromRow(
  row,
  collectionPointOptions = [],
  statusOptions = [],
) {
  const collectionLabel = firstField(row, [
    "collection_point",
    "collection_point_name",
  ]);
  const collectionIdField = firstField(row, ["collection_point_id"]);
  const statusLabel =
    firstField(row, ["load_status", "status"]) ||
    valueAtLabel(row, LOAD_COLUMN_LABELS, "Load Status");
  const statusIdField = firstField(row, ["load_status_id", "status_id"]);
  const matched =
    (statusOptions ?? []).find(
      (option) => option.id === statusIdField || option.id === statusLabel,
    ) ??
    (statusOptions ?? []).find(
      (option) =>
        option.label.trim().toLowerCase() ===
        String(statusLabel).trim().toLowerCase(),
    );

  return {
    id: rowId(row),
    trade_number: firstField(row, ["trade_number", "trade_no"]),
    product_name: firstField(row, ["product_name", "product"]),
    blend_grouping_key: firstField(row, [
      "blend_grouping_key",
      "blend_grouping_key_load",
      "blend_group_key",
    ]),
    blend_grouping_key_lift: firstField(row, [
      "blend_grouping_key_lift",
      "blend_grouping_lift_key",
    ]),
    contract_number: firstField(row, ["contract_number"]) || "",
    uplift_number: firstField(row, ["uplift_number"]) || "",
    load_qty: fieldByKey(row, "load_qty") ?? "",
    actual_loaded_qty: fieldByKey(row, "actual_loaded_qty") ?? "",
    load_date: isoDateFromValue(fieldByKey(row, "load_date")) || "",
    expected_completion_date:
      isoDateFromValue(fieldByKey(row, "expected_completion_date")) || "",
    collection_point_id: lookupIdFromValue(
      collectionPointOptions,
      collectionIdField,
      collectionLabel,
    ),
    loadStatusId: matched?.id ?? "",
    statusLabel,
  };
}

function lookupIdByLabel(options, label) {
  const match = (options ?? []).find(
    (option) =>
      option.label.trim().toLowerCase() === String(label).trim().toLowerCase(),
  );
  return match?.id ?? "";
}

function litreUnitId(units) {
  return (
    lookupIdByLabel(units, "Litres") ||
    lookupIdByLabel(units, "Litre") ||
    lookupIdByLabel(units, "Liters") ||
    lookupIdByLabel(units, "Liter") ||
    (units ?? []).find((option) =>
      /\blitres?\b|\bliters?\b/i.test(option.label),
    )?.id ||
    ""
  );
}

function isLookupSelected(value) {
  const text = String(value ?? "").trim();
  return text !== "" && text !== SELECT_LOOKUP.id && text !== "0";
}

function transportChannelFormError(description, companyId) {
  if (!String(description ?? "").trim()) {
    return "Enter a description.";
  }

  if (!isLookupSelected(companyId)) {
    return "Select a transport company.";
  }

  return "";
}

function isDieselOrEthanolProduct(productId, products) {
  const match = (products ?? []).find(
    (option) => option.id === String(productId),
  );
  const label = String(match?.label ?? "")
    .trim()
    .toLowerCase();
  return label === "diesel" || label === "ethanol";
}

function isoDateFromValue(value) {
  if (value == null || value === "") {
    return "";
  }

  if (typeof value === "string") {
    const dayOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (dayOnly) {
      return `${dayOnly[1]}-${dayOnly[2]}-${dayOnly[3]}`;
    }
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function lookupIdFromValue(options, ...values) {
  for (const value of values) {
    const text = String(value ?? "").trim();

    if (!text || text === SELECT_LOOKUP.id || text === "0") {
      continue;
    }

    const match = (options ?? []).find(
      (option) =>
        option.id === text ||
        option.label.trim().toLowerCase() === text.toLowerCase(),
    );

    if (match) {
      return match.id;
    }
  }

  return SELECT_LOOKUP.id;
}

function normalizeLookupText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[.,/|#_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function transportLookupId(options, ...values) {
  const exact = lookupIdFromValue(options, ...values);

  if (exact !== SELECT_LOOKUP.id) {
    return exact;
  }

  for (const value of values) {
    const text = normalizeLookupText(value);

    if (!text || text === SELECT_LOOKUP.id || text === "0" || text.length < 2) {
      continue;
    }

    const tokens = text.split(" ").filter(Boolean);
    const match = (options ?? []).find((option) => {
      const label = normalizeLookupText(option.label);
      const parts = label.split(" ");
      return (
        label === text ||
        label.endsWith(text) ||
        parts[parts.length - 1] === text ||
        label.includes(text) ||
        (tokens.length > 0 && tokens.every((token) => label.includes(token)))
      );
    });

    if (match) {
      return match.id;
    }
  }

  return SELECT_LOOKUP.id;
}

function fieldByAliases(row, aliases) {
  const direct = firstField(row, aliases);

  if (direct) {
    return direct;
  }

  if (!row) {
    return "";
  }

  const wanted = new Set(
    aliases.map((alias) =>
      String(alias).replace(/_/g, " ").trim().toLowerCase(),
    ),
  );

  for (const [key, value] of Object.entries(row)) {
    const keyNorm = key.replace(/_/g, " ").trim().toLowerCase();

    if (!wanted.has(key.toLowerCase()) && !wanted.has(keyNorm)) {
      continue;
    }

    if (value != null && String(value).trim() !== "") {
      return String(value);
    }
  }

  return "";
}

function cellTextByColumnLabel(row, label, aliases = []) {
  const byLabel = fieldByColumnLabel(row, label);

  if (byLabel != null && String(byLabel).trim() !== "") {
    return String(byLabel);
  }

  return fieldByAliases(row, aliases);
}

function transportChannelPrefillFromRow(row) {
  if (!row) {
    return null;
  }

  return {
    description: cellTextByColumnLabel(row, "Transport Channel", [
      "transport_channel",
      "descr",
      "description",
    ]),
    companyId: fieldByAliases(row, ["transport_company_id", "company_id"]),
    companyLabel: fieldByAliases(row, [
      "company_name",
      "transport_company",
      "company",
      "company name",
      "transport company",
    ]),
    driverId: fieldByAliases(row, ["truck_driver_id", "driver_id"]),
    driverLabel: fieldByAliases(row, [
      "truck_driver",
      "driver",
      "driver_name",
      "truck driver",
    ]),
    truckId: fieldByAliases(row, ["truck_id"]),
    truckLabel: cellTextByColumnLabel(row, "Truck", ["truck"]),
    trailerId: fieldByAliases(row, ["truck_trailer_id", "trailer_id"]),
    trailerLabel: fieldByAliases(row, [
      "truck_trailer",
      "trailer",
      "truck trailer",
    ]),
  };
}

function trackingEditFromRow(row, lookups) {
  const productIdValue = firstField(row, ["product_id"]);
  const productLabel =
    firstField(row, ["product", "product_name"]) ||
    valueAtLabel(row, TRACKING_COLUMN_LABELS, "Product");
  const unitLabel =
    firstField(row, ["unit_of_measure_id", "unit", "local_industry_unit"]) ||
    valueAtLabel(row, TRACKING_COLUMN_LABELS, "Unit");
  const statusLabel =
    firstField(row, [
      "item_tracking_status_id",
      "status_id",
      "status",
    ]) || valueAtLabel(row, TRACKING_COLUMN_LABELS, "Status");
  const companyLabel =
    firstField(row, ["supplier_id", "company_id", "company", "company_name"]) ||
    valueAtLabel(row, TRACKING_COLUMN_LABELS, "Company");
  const portLabel =
    firstField(row, ["port_id", "port", "port_name"]) ||
    valueAtLabel(row, TRACKING_COLUMN_LABELS, "Port");
  const currencyLabel =
    firstField(row, ["currency_id", "currency"]) ||
    valueAtLabel(row, TRACKING_COLUMN_LABELS, "Currency");

  return {
    id: rowId(row),
    tradeNo:
      firstField(row, ["trade_no", "trade_number"]) ||
      valueAtLabel(row, TRACKING_COLUMN_LABELS, "Trade No."),
    productLabel,
    productId: lookupIdFromValue(lookups.products, productIdValue, productLabel),
    unitLabel,
    unitId:
      lookupIdFromValue(lookups.units, unitLabel) ||
      litreUnitId(lookups.units) ||
      SELECT_LOOKUP.id,
    ethanolPercent:
      firstField(row, [
        "ethanol_blend_percentage",
        "ethanol_percent",
        "ethanol",
      ]) || valueAtLabel(row, TRACKING_COLUMN_LABELS, "E. %"),
    qty:
      firstField(row, ["qty"]) ||
      valueAtLabel(row, TRACKING_COLUMN_LABELS, "Qty (litres)"),
    purchaseDate: isoDateFromValue(
      firstField(row, ["purchase_date"]) ||
        valueAtLabel(row, TRACKING_COLUMN_LABELS, "Purchase Date"),
    ),
    statusLabel,
    statusId: lookupIdFromValue(lookups.statuses, statusLabel),
    statusDate: isoDateFromValue(
      firstField(row, ["status_date"]) ||
        valueAtLabel(row, TRACKING_COLUMN_LABELS, "Status Date"),
    ),
    companyLabel,
    companyId: lookupIdFromValue(lookups.suppliers, companyLabel),
    portLabel,
    portId: lookupIdFromValue(lookups.ports, portLabel),
    suppInvNo:
      firstField(row, ["supplier_invoice_number", "supp_inv_no"]) ||
      valueAtLabel(row, TRACKING_COLUMN_LABELS, "Supp_Inv_No."),
    suppInvAmt:
      firstField(row, ["supplier_invoice_amount", "supp_inv_amt"]) ||
      valueAtLabel(row, TRACKING_COLUMN_LABELS, "Supp_Inv_Amt."),
    currencyLabel,
    currencyId: lookupIdFromValue(lookups.currencies, currencyLabel),
  };
}

function matchTrackingLookups(values, lookups) {
  if (!values) {
    return values;
  }

  return {
    ...values,
    productId: lookupIdFromValue(
      lookups.products,
      values.productId,
      values.productLabel,
    ),
    unitId:
      lookupIdFromValue(lookups.units, values.unitId, values.unitLabel) ||
      litreUnitId(lookups.units) ||
      SELECT_LOOKUP.id,
    statusId: lookupIdFromValue(
      lookups.statuses,
      values.statusId,
      values.statusLabel,
    ),
    companyId: lookupIdFromValue(
      lookups.suppliers,
      values.companyId,
      values.companyLabel,
    ),
    portId: lookupIdFromValue(lookups.ports, values.portId, values.portLabel),
    currencyId: lookupIdFromValue(
      lookups.currencies,
      values.currencyId,
      values.currencyLabel,
    ),
  };
}

function isVoidStatus(statusId, statuses) {
  const match = (statuses ?? []).find(
    (option) => option.id === String(statusId),
  );
  return String(match?.label ?? "").trim().toLowerCase() === "void";
}

function trackingFormError(values, products) {
  const qtyValue = Number(String(values.qty ?? "").trim().replace(",", "."));

  if (!Number.isFinite(qtyValue) || qtyValue <= 0) {
    return "Qty must be greater than zero.";
  }

  if (
    !isLookupSelected(values.productId) ||
    !isLookupSelected(values.statusId) ||
    !isLookupSelected(values.companyId) ||
    !isLookupSelected(values.portId) ||
    !isLookupSelected(values.currencyId)
  ) {
    return "Select a value in each dropdown.";
  }

  if (!isDieselOrEthanolProduct(values.productId, products)) {
    const ethanolValue = Number(
      String(values.ethanolPercent ?? "")
        .trim()
        .replace(",", "."),
    );

    if (
      !Number.isFinite(ethanolValue) ||
      ethanolValue < 0 ||
      ethanolValue > 100
    ) {
      return "E. % must be between 0 and 100.";
    }
  }

  return "";
}

function selectedTradeNumber(rows, tradeId) {
  const row = (rows ?? []).find((item) => rowId(item) === String(tradeId));

  if (!row) {
    return "";
  }

  return (
    firstField(row, ["trade_number", "trade_no"]) ||
    valueAtLabel(row, COLUMN_LABELS, "Trade Number")
  );
}

function valueAtLabel(row, labels, label) {
  const index = labels.findIndex(
    (item) => String(item).toLowerCase() === String(label).toLowerCase(),
  );

  if (index < 0 || !row) {
    return "";
  }

  const keys = Object.keys(row);
  const value = keys[index] != null ? row[keys[index]] : undefined;
  return value == null ? "" : String(value);
}

function firstField(row, names) {
  for (const name of names) {
    const value = fieldByKey(row, name);
    if (value != null && String(value).trim() !== "") {
      return String(value);
    }
  }

  return "";
}

function liftEditFromRow(row, statusOptions = []) {
  const qtyToLift = firstField(row, ["qty_to_lift"]);
  const supplierReleaseNumber = firstField(row, ["supplier_release_number"]);
  const statusLabel =
    firstField(row, ["lift_status", "status"]) ||
    valueAtLabel(row, LIFT_COLUMN_LABELS, "Lift Status");
  const statusIdField = firstField(row, ["lift_status_id", "status_id"]);
  const matched =
    (statusOptions ?? []).find(
      (option) => option.id === statusIdField || option.id === statusLabel,
    ) ??
    (statusOptions ?? []).find(
      (option) =>
        option.label.trim().toLowerCase() ===
        String(statusLabel).trim().toLowerCase(),
    );

  return {
    id: rowId(row),
    qtyToLift,
    supplierReleaseNumber,
    liftStatusId: matched?.id ?? "",
    statusLabel,
  };
}

function tradeEditFromRow(row, statusOptions) {
  const description =
    firstField(row, ["description", "descr"]) ||
    valueAtLabel(row, COLUMN_LABELS, "Description");
  const statusLabel =
    firstField(row, ["trade_status", "status"]) ||
    valueAtLabel(row, COLUMN_LABELS, "Trade Status");
  const statusIdField = firstField(row, ["trade_status_id", "status_id"]);
  const matched =
    statusOptions.find(
      (option) => option.id === statusIdField || option.id === statusLabel,
    ) ??
    statusOptions.find(
      (option) =>
        option.label.trim().toLowerCase() === statusLabel.trim().toLowerCase(),
    );

  return {
    id: rowId(row),
    description,
    tradeStatusId: matched?.id ?? statusLabel,
    statusLabel,
  };
}

function blendGroupingKey(rows, trackingId) {
  const row = (rows ?? []).find((item) => rowId(item) === String(trackingId));

  if (!row) {
    return "";
  }

  const byName =
    fieldByKey(row, "blend_grouping_key") ??
    fieldByKey(row, "blend_group_key") ??
    fieldByKey(row, "grouping_key");

  if (byName != null && String(byName).trim() !== "") {
    return String(byName);
  }

  const keys = Object.keys(row);
  const index = TRACKING_COLUMN_LABELS.findIndex(
    (label) => label.toLowerCase() === "blend group key",
  );

  if (index >= 0 && keys[index] != null) {
    const value = row[keys[index]];
    return value == null ? "" : String(value);
  }

  return "";
}

function blendGroupingKeyLift(rows, liftId) {
  const row = (rows ?? []).find((item) => rowId(item) === String(liftId));
  const value = fieldByKey(row, "blend_grouping_key_lift");
  return value == null ? "" : String(value);
}

function scrollWindowToShowBottom(element, duration = 900) {
  if (!element) {
    return () => {};
  }

  const overflow =
    element.getBoundingClientRect().bottom - window.innerHeight + 16;

  if (overflow <= 1) {
    return () => {};
  }

  const start = window.scrollY;
  const end = start + overflow;
  const startTime = performance.now();
  let frame = 0;
  let cancelled = false;

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function step(now) {
    if (cancelled) {
      return;
    }

    const t = Math.min(1, (now - startTime) / duration);
    window.scrollTo(0, start + (end - start) * easeInOutCubic(t));

    if (t < 1) {
      frame = requestAnimationFrame(step);
    }
  }

  frame = requestAnimationFrame(step);

  return () => {
    cancelled = true;
    cancelAnimationFrame(frame);
  };
}

function defaultSelectedIds(options) {
  return options
    .filter((option) =>
      DEFAULT_STATUS_LABELS.has(String(option.label).trim().toLowerCase()),
    )
    .map((option) => option.id);
}

export default function InboundPanel({ options, userId = "" }) {
  const [selectedIds, setSelectedIds] = useState(() =>
    defaultSelectedIds(options),
  );
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(true);
  const [tradeDraft, setTradeDraft] = useState(null);
  const [tradeCommitPending, setTradeCommitPending] = useState(false);
  const [tradeCommitMessage, setTradeCommitMessage] = useState("");
  const [tradeHoverId, setTradeHoverId] = useState("");
  const [tradeEditAllowed, setTradeEditAllowed] = useState(false);
  const tradeEditAllowRef = useRef(null);
  const [saleableVolumeSplit, setSaleableVolumeSplit] = useState(null);
  const saleableSplitCacheRef = useRef(new Map());
  const saleableHoverIdRef = useRef("");
  const [tradeEdit, setTradeEdit] = useState(null);
  const [selectedTradeId, setSelectedTradeId] = useState("");
  const [trackingRows, setTrackingRows] = useState([]);
  const [trackingMessage, setTrackingMessage] = useState("");
  const [trackingPending, setTrackingPending] = useState(false);
  const [trackingDraft, setTrackingDraft] = useState(null);
  const [trackingCommitPending, setTrackingCommitPending] = useState(false);
  const [trackingCommitMessage, setTrackingCommitMessage] = useState("");
  const [trackingLookups, setTrackingLookups] = useState({
    products: [],
    units: [],
    suppliers: [],
    ports: [],
    currencies: [],
    statuses: [],
  });
  const [trackingLookupsMessage, setTrackingLookupsMessage] = useState("");
  const [trackingHoverId, setTrackingHoverId] = useState("");
  const [trackingEditAllowed, setTrackingEditAllowed] = useState(false);
  const trackingEditAllowRef = useRef(null);
  const [trackingEdit, setTrackingEdit] = useState(null);
  const [voidStatusPendingId, setVoidStatusPendingId] = useState("");
  const [selectedTrackingId, setSelectedTrackingId] = useState("");
  const [liftRows, setLiftRows] = useState([]);
  const [liftMessage, setLiftMessage] = useState("");
  const [liftPending, setLiftPending] = useState(false);
  const [liftDrafts, setLiftDrafts] = useState([]);
  const [liftCommitPending, setLiftCommitPending] = useState(false);
  const [liftCommitMessage, setLiftCommitMessage] = useState("");
  const [liftHoverId, setLiftHoverId] = useState("");
  const [liftEditAllowed, setLiftEditAllowed] = useState(false);
  const liftEditAllowRef = useRef(null);
  const [liftEdit, setLiftEdit] = useState(null);
  const [liftStatusOptions, setLiftStatusOptions] = useState([]);
  const [selectedLiftId, setSelectedLiftId] = useState("");
  const [liftDocsOpen, setLiftDocsOpen] = useState(false);
  const [liftDocsRows, setLiftDocsRows] = useState([]);
  const [liftDocsMessage, setLiftDocsMessage] = useState("");
  const [liftDocsPending, setLiftDocsPending] = useState(false);
  const [liftNotesOpen, setLiftNotesOpen] = useState(false);
  const [liftNotesRows, setLiftNotesRows] = useState([]);
  const [liftNotesMessage, setLiftNotesMessage] = useState("");
  const [liftNotesPending, setLiftNotesPending] = useState(false);
  const [liftNewNote, setLiftNewNote] = useState("");
  const [liftNoteAddPending, setLiftNoteAddPending] = useState(false);
  const [liftNoteAddMessage, setLiftNoteAddMessage] = useState("");
  const [loadRows, setLoadRows] = useState([]);
  const [loadMessage, setLoadMessage] = useState("");
  const [loadPending, setLoadPending] = useState(false);
  const [loadDrafts, setLoadDrafts] = useState([]);
  const [loadCommitPending, setLoadCommitPending] = useState(false);
  const [loadCommitMessage, setLoadCommitMessage] = useState("");
  const [loadHoverId, setLoadHoverId] = useState("");
  const [loadEditAllowed, setLoadEditAllowed] = useState(false);
  const loadEditAllowRef = useRef(null);
  const [loadEdit, setLoadEdit] = useState(null);
  const [collectionPointOptions, setCollectionPointOptions] = useState([]);
  const [loadStatusOptions, setLoadStatusOptions] = useState([]);
  const [selectedLoadId, setSelectedLoadId] = useState("");
  const [loadDocsOpen, setLoadDocsOpen] = useState(false);
  const [loadDocsRows, setLoadDocsRows] = useState([]);
  const [loadDocsMessage, setLoadDocsMessage] = useState("");
  const [loadDocsPending, setLoadDocsPending] = useState(false);
  const [loadNotesOpen, setLoadNotesOpen] = useState(false);
  const [loadNotesRows, setLoadNotesRows] = useState([]);
  const [loadNotesMessage, setLoadNotesMessage] = useState("");
  const [loadNotesPending, setLoadNotesPending] = useState(false);
  const [loadNewNote, setLoadNewNote] = useState("");
  const [loadNoteAddPending, setLoadNoteAddPending] = useState(false);
  const [loadNoteAddMessage, setLoadNoteAddMessage] = useState("");
  const [transportChannelOpen, setTransportChannelOpen] = useState(false);
  const [transportChannelMode, setTransportChannelMode] = useState("add");
  const [transportChannelId, setTransportChannelId] = useState("");
  const [transportChannelPrefill, setTransportChannelPrefill] = useState(null);
  const transportPrefillPendingRef = useRef(false);
  const transportPrefillCompanyRef = useRef("");
  const [transportDescription, setTransportDescription] = useState("");
  const [transportCompanyId, setTransportCompanyId] = useState(SELECT_LOOKUP.id);
  const [truckDriverId, setTruckDriverId] = useState(SELECT_LOOKUP.id);
  const [truckId, setTruckId] = useState(SELECT_LOOKUP.id);
  const [truckTrailerId, setTruckTrailerId] = useState(SELECT_LOOKUP.id);
  const [transportCompanies, setTransportCompanies] = useState([]);
  const [truckDrivers, setTruckDrivers] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [truckTrailers, setTruckTrailers] = useState([]);
  const [transportLookupsMessage, setTransportLookupsMessage] = useState("");
  const [transportAddPending, setTransportAddPending] = useState(false);
  const [transportAddMessage, setTransportAddMessage] = useState("");
  const [transportHoverLoadId, setTransportHoverLoadId] = useState("");
  const [transportHoverRows, setTransportHoverRows] = useState([]);
  const [transportHoverMessage, setTransportHoverMessage] = useState("");
  const [transportHoverPending, setTransportHoverPending] = useState(false);
  const [costOpen, setCostOpen] = useState(false);
  const [costRows, setCostRows] = useState([]);
  const [costMessage, setCostMessage] = useState("");
  const [costPending, setCostPending] = useState(false);
  const [costTypes, setCostTypes] = useState([]);
  const [costTypesMessage, setCostTypesMessage] = useState("");
  const [costDraft, setCostDraft] = useState(null);
  const [costCommitPending, setCostCommitPending] = useState(false);
  const [costCommitMessage, setCostCommitMessage] = useState("");
  const [costNotesOpen, setCostNotesOpen] = useState(false);
  const [costNotesRows, setCostNotesRows] = useState([]);
  const [costNotesMessage, setCostNotesMessage] = useState("");
  const [costNotesPending, setCostNotesPending] = useState(false);
  const [selectedCostId, setSelectedCostId] = useState("");
  const [costNewNote, setCostNewNote] = useState("");
  const [costNoteAddPending, setCostNoteAddPending] = useState(false);
  const [costNoteAddMessage, setCostNoteAddMessage] = useState("");
  const [docsOpen, setDocsOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesRows, setNotesRows] = useState([]);
  const [notesMessage, setNotesMessage] = useState("");
  const [notesPending, setNotesPending] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [noteAddPending, setNoteAddPending] = useState(false);
  const [noteAddMessage, setNoteAddMessage] = useState("");
  const [noteTextOpen, setNoteTextOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [docsRows, setDocsRows] = useState([]);
  const [docsMessage, setDocsMessage] = useState("");
  const [docsPending, setDocsPending] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState("");
  const [viewerName, setViewerName] = useState("");
  const [viewerMessage, setViewerMessage] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState("");
  const [documentTypes, setDocumentTypes] = useState([]);
  const [documentTypeId, setDocumentTypeId] = useState(SELECT_DOCUMENT_TYPE.id);
  const [documentTypesMessage, setDocumentTypesMessage] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPending, setUploadPending] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const uploadLock = useRef(false);
  const docsOpenRef = useRef(false);
  const liftDocsOpenRef = useRef(false);
  const loadDocsOpenRef = useRef(false);
  const tradeGridRef = useRef(null);
  const trackingGridRef = useRef(null);
  const liftGridRef = useRef(null);
  const loadGridRef = useRef(null);
  const loadSectionRef = useRef(null);
  const selectedKey = selectedIds.join(",");
  const selectedBlendGroupKey = blendGroupingKey(
    trackingRows,
    selectedTrackingId,
  );
  const selectedLiftBlendGroupKey = blendGroupingKey(
    liftRows,
    selectedLiftId,
  );
  const selectedLiftBlendGroupKeyLift = blendGroupingKeyLift(
    liftRows,
    selectedLiftId,
  );
  const trackingDraftOpen = Boolean(trackingDraft);
  const trackingFormOpen = Boolean(trackingDraft || trackingEdit);
  const trackingRowSelected = trackingRows.some(
    (row) => rowId(row) === String(selectedTrackingId) && selectedTrackingId !== "",
  );
  const liftRowSelected = liftRows.some(
    (row) => rowId(row) === String(selectedLiftId) && selectedLiftId !== "",
  );

  async function reloadTrackingAndLiftGrids() {
    const trackingPromise = selectedTradeId
      ? (async () => {
          setTrackingPending(true);
          const tracking = await loadInboundItemTracking(selectedTradeId);
          setTrackingRows(tracking.rows);
          setTrackingMessage(tracking.ok ? "" : tracking.message);
          setTrackingPending(false);
        })()
      : Promise.resolve();

    const liftPromise = selectedBlendGroupKey
      ? (async () => {
          setLiftPending(true);
          const lift = await loadInboundLift(selectedBlendGroupKey);
          setLiftRows(lift.rows);
          setLiftMessage(lift.ok ? "" : lift.message);
          setLiftPending(false);
        })()
      : Promise.resolve();

    await Promise.all([trackingPromise, liftPromise]);
  }

  useEffect(() => {
    if (!trackingEdit) {
      setVoidStatusPendingId("");
    }
  }, [trackingEdit]);

  useEffect(() => {
    let cancelled = false;
    const ids = selectedKey ? selectedKey.split(",") : [];

    async function load() {
      setPending(true);
      setTradeDraft(null);
      setTradeCommitMessage("");
      setTradeHoverId("");
      setTradeEdit(null);
      setSelectedTradeId("");
      setTrackingDraft(null);
      setTrackingEdit(null);
      setTrackingCommitMessage("");
      setSelectedTrackingId("");
      setCostOpen(false);
      setDocsOpen(false);
      setNotesOpen(false);
      setCostNotesOpen(false);
      setLiftDocsOpen(false);
      setLiftNotesOpen(false);
      setSelectedLiftId("");
      setLiftEdit(null);
      setLoadDrafts([]);
      setLoadEdit(null);
      setLoadDocsOpen(false);
      setLoadNotesOpen(false);
      setTransportChannelOpen(false);
      setSelectedLoadId("");
      const result = await loadInboundTrades(ids);

      if (cancelled) {
        return;
      }

      setRows(result.rows);
      setMessage(result.ok ? "" : result.message);
      setPending(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [selectedKey]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!selectedTradeId) {
        setTrackingRows([]);
        setTrackingMessage("");
        setTrackingPending(false);
        setTrackingDraft(null);
        setTrackingEdit(null);
        setTrackingCommitMessage("");
        setSelectedTrackingId("");
        setLiftRows([]);
        setLiftMessage("");
        setLiftPending(false);
        setLiftDrafts([]);
        setLiftEdit(null);
        setSelectedLiftId("");
        setLiftDocsOpen(false);
        setLiftNotesOpen(false);
        setLoadRows([]);
        setLoadMessage("");
        setLoadPending(false);
        setLoadDrafts([]);
        setLoadEdit(null);
        setSelectedLoadId("");
        setLoadDocsOpen(false);
        setLoadNotesOpen(false);
        setTransportChannelOpen(false);
        setCostOpen(false);
        setDocsOpen(false);
        setNotesOpen(false);
        setCostNotesOpen(false);
        return;
      }

      setTrackingPending(true);
      setTrackingDraft(null);
      setTrackingEdit(null);
      setTrackingCommitMessage("");
      setSelectedTrackingId("");
      const result = await loadInboundItemTracking(selectedTradeId);

      if (cancelled) {
        return;
      }

      setTrackingRows(result.rows);
      setTrackingMessage(result.ok ? "" : result.message);
      setTrackingPending(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [selectedTradeId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!selectedBlendGroupKey) {
        setLiftRows([]);
        setLiftMessage("");
        setLiftPending(false);
        setLiftDrafts([]);
        setLiftEdit(null);
        setSelectedLiftId("");
        setLiftDocsOpen(false);
        setLiftNotesOpen(false);
        setLoadRows([]);
        setLoadMessage("");
        setLoadPending(false);
        setLoadDrafts([]);
        setLoadEdit(null);
        setSelectedLoadId("");
        setLoadDocsOpen(false);
        setLoadNotesOpen(false);
        setTransportChannelOpen(false);
        return;
      }

      setLiftPending(true);
      setLiftDrafts([]);
      setLiftEdit(null);
      const result = await loadInboundLift(selectedBlendGroupKey);

      if (cancelled) {
        return;
      }

      setLiftRows(result.rows);
      setLiftMessage(result.ok ? "" : result.message);
      setLiftPending(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [selectedBlendGroupKey]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!selectedLiftBlendGroupKey) {
        setLoadRows([]);
        setLoadMessage("");
        setLoadPending(false);
        setLoadDrafts([]);
        setLoadEdit(null);
        setSelectedLoadId("");
        setLoadDocsOpen(false);
        setLoadNotesOpen(false);
        setTransportChannelOpen(false);
        return;
      }

      setLoadPending(true);
      setLoadDrafts([]);
      setLoadEdit(null);
      const result = await loadInboundLoad(
        selectedLiftBlendGroupKey,
        selectedLiftBlendGroupKeyLift,
      );

      if (cancelled) {
        return;
      }

      setLoadRows(result.rows);
      setLoadMessage(result.ok ? "" : result.message);
      setLoadPending(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [selectedLiftBlendGroupKey, selectedLiftBlendGroupKeyLift]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!costOpen || !selectedTrackingId) {
        setCostRows([]);
        setCostMessage("");
        setCostPending(false);
        return;
      }

      setCostPending(true);
      const result = await loadInboundCost(selectedTrackingId);

      if (cancelled) {
        return;
      }

      setCostRows(result.rows);
      setCostMessage(result.ok ? "" : result.message);
      setCostPending(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [costOpen, selectedTrackingId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!costOpen) {
        return;
      }

      const result = await loadCostTypes();

      if (cancelled) {
        return;
      }

      setCostTypes(result.options);
      setCostTypesMessage(result.ok ? "" : result.message);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [costOpen]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!costNotesOpen || !selectedCostId) {
        setCostNotesRows([]);
        setCostNotesMessage("");
        setCostNotesPending(false);
        return;
      }

      setCostNotesPending(true);
      const result = await loadNotesInboundCost(selectedCostId);

      if (cancelled) {
        return;
      }

      setCostNotesRows(result.rows);
      setCostNotesMessage(result.ok ? "" : result.message);
      setCostNotesPending(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [costNotesOpen, selectedCostId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!docsOpen || !selectedTrackingId) {
        setDocsRows([]);
        setDocsMessage("");
        setDocsPending(false);
        return;
      }

      setDocsPending(true);
      const result = await loadDocumentDetails(selectedTrackingId);

      if (cancelled) {
        return;
      }

      setDocsRows(result.rows);
      setDocsMessage(result.ok ? "" : result.message);
      setDocsPending(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [docsOpen, selectedTrackingId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!liftDocsOpen || !selectedLiftId) {
        setLiftDocsRows([]);
        setLiftDocsMessage("");
        setLiftDocsPending(false);
        return;
      }

      setLiftDocsPending(true);
      const result = await loadDocumentInboundLift(selectedLiftId);

      if (cancelled) {
        return;
      }

      setLiftDocsRows(result.rows);
      setLiftDocsMessage(result.ok ? "" : result.message);
      setLiftDocsPending(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [liftDocsOpen, selectedLiftId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!loadDocsOpen || !selectedLoadId) {
        setLoadDocsRows([]);
        setLoadDocsMessage("");
        setLoadDocsPending(false);
        return;
      }

      setLoadDocsPending(true);
      const result = await loadDocumentInboundLoad(selectedLoadId);

      if (cancelled) {
        return;
      }

      setLoadDocsRows(result.rows);
      setLoadDocsMessage(result.ok ? "" : result.message);
      setLoadDocsPending(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [loadDocsOpen, selectedLoadId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!notesOpen || !selectedTrackingId) {
        setNotesRows([]);
        setNotesMessage("");
        setNotesPending(false);
        return;
      }

      setNotesPending(true);
      const result = await loadNotesInboundStockItemTracking(selectedTrackingId);

      if (cancelled) {
        return;
      }

      setNotesRows(result.rows);
      setNotesMessage(result.ok ? "" : result.message);
      setNotesPending(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [notesOpen, selectedTrackingId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!liftNotesOpen || !selectedLiftId) {
        setLiftNotesRows([]);
        setLiftNotesMessage("");
        setLiftNotesPending(false);
        return;
      }

      setLiftNotesPending(true);
      const result = await loadNotesInboundLift(selectedLiftId);

      if (cancelled) {
        return;
      }

      setLiftNotesRows(result.rows);
      setLiftNotesMessage(result.ok ? "" : result.message);
      setLiftNotesPending(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [liftNotesOpen, selectedLiftId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!loadNotesOpen || !selectedLoadId) {
        setLoadNotesRows([]);
        setLoadNotesMessage("");
        setLoadNotesPending(false);
        return;
      }

      setLoadNotesPending(true);
      const result = await loadNotesInboundLoad(selectedLoadId);

      if (cancelled) {
        return;
      }

      setLoadNotesRows(result.rows);
      setLoadNotesMessage(result.ok ? "" : result.message);
      setLoadNotesPending(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [loadNotesOpen, selectedLoadId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const companies = await loadTransportCompanies();

      if (cancelled || !companies.ok) {
        return;
      }

      setTransportCompanies(companies.options);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!transportChannelOpen) {
      transportPrefillPendingRef.current = false;
      transportPrefillCompanyRef.current = "";
      return undefined;
    }

    const prefill =
      transportChannelMode === "change" ? transportChannelPrefill : null;
    transportPrefillPendingRef.current = Boolean(prefill);
    transportPrefillCompanyRef.current = "";

    setTransportDescription(prefill?.description ?? "");
    setTransportCompanyId(SELECT_LOOKUP.id);
    setTruckDriverId(SELECT_LOOKUP.id);
    setTruckId(SELECT_LOOKUP.id);
    setTruckTrailerId(SELECT_LOOKUP.id);
    setTransportLookupsMessage("");
    setTransportAddPending(false);
    setTransportAddMessage("");
    setTruckDrivers([]);
    setTrucks([]);
    setTruckTrailers([]);

    let cancelled = false;

    async function load() {
      const companies = await loadTransportCompanies();

      if (cancelled) {
        return;
      }

      setTransportCompanies(companies.options);

      if (!prefill) {
        transportPrefillPendingRef.current = false;
        setTransportLookupsMessage(companies.ok ? "" : companies.message);
        return;
      }

      const companyId = transportLookupId(
        companies.options,
        prefill.companyId,
        prefill.companyLabel,
      );

      if (!isLookupSelected(companyId)) {
        transportPrefillPendingRef.current = false;
        setTransportLookupsMessage(companies.ok ? "" : companies.message);
        return;
      }

      const [drivers, nextTrucks, trailers] = await Promise.all([
        loadTruckDrivers(companyId),
        loadTrucks(companyId),
        loadTruckTrailers(companyId),
      ]);

      if (cancelled) {
        return;
      }

      setTruckDrivers(drivers.options);
      setTrucks(nextTrucks.options);
      setTruckTrailers(trailers.options);
      setTransportLookupsMessage(
        [companies, drivers, nextTrucks, trailers]
          .filter((result) => !result.ok)
          .map((result) => result.message)
          .filter(Boolean)
          .join(" "),
      );
      transportPrefillCompanyRef.current = companyId;
      transportPrefillPendingRef.current = false;
      setTransportCompanyId(companyId);
      setTruckDriverId(
        transportLookupId(
          drivers.options,
          prefill.driverId,
          prefill.driverLabel,
        ),
      );
      setTruckId(
        transportLookupId(nextTrucks.options, prefill.truckLabel, prefill.truckId),
      );
      setTruckTrailerId(
        transportLookupId(
          trailers.options,
          prefill.trailerId,
          prefill.trailerLabel,
        ),
      );
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [transportChannelOpen, transportChannelMode, transportChannelPrefill]);

  useEffect(() => {
    if (!transportChannelOpen) {
      return undefined;
    }

    if (transportPrefillPendingRef.current) {
      return undefined;
    }

    if (
      transportPrefillCompanyRef.current &&
      transportCompanyId === transportPrefillCompanyRef.current
    ) {
      transportPrefillCompanyRef.current = "";
      return undefined;
    }

    if (transportCompanyId === SELECT_LOOKUP.id) {
      setTruckDrivers([]);
      setTrucks([]);
      setTruckTrailers([]);
      setTruckDriverId(SELECT_LOOKUP.id);
      setTruckId(SELECT_LOOKUP.id);
      setTruckTrailerId(SELECT_LOOKUP.id);
      return undefined;
    }

    setTruckDriverId(SELECT_LOOKUP.id);
    setTruckId(SELECT_LOOKUP.id);
    setTruckTrailerId(SELECT_LOOKUP.id);

    let cancelled = false;

    async function load() {
      const [drivers, nextTrucks, trailers] = await Promise.all([
        loadTruckDrivers(transportCompanyId),
        loadTrucks(transportCompanyId),
        loadTruckTrailers(transportCompanyId),
      ]);

      if (cancelled) {
        return;
      }

      setTruckDrivers(drivers.options);
      setTrucks(nextTrucks.options);
      setTruckTrailers(trailers.options);
      setTransportLookupsMessage(
        [drivers, nextTrucks, trailers]
          .filter((result) => !result.ok)
          .map((result) => result.message)
          .filter(Boolean)
          .join(" "),
      );
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [transportChannelOpen, transportCompanyId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!transportHoverLoadId) {
        setTransportHoverRows([]);
        setTransportHoverMessage("");
        setTransportHoverPending(false);
        return;
      }

      setTransportHoverPending(true);
      const result = await loadTransportChannel(transportHoverLoadId);

      if (cancelled) {
        return;
      }

      setTransportHoverRows(result.rows);
      setTransportHoverMessage(result.ok ? "" : result.message);
      setTransportHoverPending(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [transportHoverLoadId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!docsOpen && !liftDocsOpen && !loadDocsOpen) {
        return;
      }

      const functionalAreaId = loadDocsOpen ? 4 : liftDocsOpen ? 3 : 1;
      const result = await loadDocumentTypes(functionalAreaId);

      if (cancelled) {
        return;
      }

      setDocumentTypes(result.options);
      setDocumentTypesMessage(result.ok ? "" : result.message);
      setDocumentTypeId((current) =>
        current !== SELECT_DOCUMENT_TYPE.id &&
        result.options.some((option) => option.id === current)
          ? current
          : SELECT_DOCUMENT_TYPE.id,
      );
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [docsOpen, liftDocsOpen, loadDocsOpen]);

  useEffect(() => {
    const wasOpen = docsOpenRef.current;
    docsOpenRef.current = docsOpen;

    if (!wasOpen || docsOpen || !selectedTradeId) {
      return undefined;
    }

    let cancelled = false;

    async function load() {
      setTrackingPending(true);
      const result = await loadInboundItemTracking(selectedTradeId);

      if (cancelled) {
        return;
      }

      setTrackingRows(result.rows);
      setTrackingMessage(result.ok ? "" : result.message);
      setTrackingPending(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [docsOpen, selectedTradeId]);

  useEffect(() => {
    const wasOpen = liftDocsOpenRef.current;
    liftDocsOpenRef.current = liftDocsOpen;

    if (!wasOpen || liftDocsOpen || !selectedBlendGroupKey) {
      return undefined;
    }

    let cancelled = false;

    async function load() {
      setLiftPending(true);
      const result = await loadInboundLift(selectedBlendGroupKey);

      if (cancelled) {
        return;
      }

      setLiftRows(result.rows);
      setLiftMessage(result.ok ? "" : result.message);
      setLiftPending(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [liftDocsOpen, selectedBlendGroupKey]);

  useEffect(() => {
    const wasOpen = loadDocsOpenRef.current;
    loadDocsOpenRef.current = loadDocsOpen;

    if (!wasOpen || loadDocsOpen || !selectedLiftBlendGroupKey) {
      return undefined;
    }

    let cancelled = false;

    async function load() {
      setLoadPending(true);
      const result = await loadInboundLoad(
        selectedLiftBlendGroupKey,
        selectedLiftBlendGroupKeyLift,
      );

      if (cancelled) {
        return;
      }

      setLoadRows(result.rows);
      setLoadMessage(result.ok ? "" : result.message);
      setLoadPending(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [loadDocsOpen, selectedLiftBlendGroupKey, selectedLiftBlendGroupKeyLift]);

  useEffect(() => {
    if (
      (!trackingDraftOpen && !trackingEdit) ||
      trackingCommitPending ||
      voidStatusPendingId
    ) {
      return undefined;
    }

    function onPointerDown(event) {
      if (trackingGridRef.current?.contains(event.target)) {
        return;
      }

      setTrackingDraft(null);
      setTrackingEdit(null);
      setTrackingCommitMessage("");
      setTrackingLookupsMessage("");
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [trackingDraftOpen, trackingEdit, trackingCommitPending, voidStatusPendingId]);

  useEffect(() => {
    if (!liftDrafts.length || liftCommitPending) {
      return undefined;
    }

    function onPointerDown(event) {
      if (liftGridRef.current?.contains(event.target)) {
        return;
      }

      setLiftDrafts([]);
      setLiftCommitMessage("");
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [liftDrafts, liftCommitPending]);

  useEffect(() => {
    if (!loadDrafts.length || loadCommitPending) {
      return undefined;
    }

    function onPointerDown(event) {
      if (loadGridRef.current?.contains(event.target)) {
        return;
      }

      setLoadDrafts([]);
      setLoadCommitMessage("");
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [loadDrafts, loadCommitPending]);

  useEffect(() => {
    if (loadPending) {
      return undefined;
    }

    if (!loadRows.length && !loadDrafts.length && !loadCommitMessage) {
      return undefined;
    }

    let cancelled = false;
    let stopScroll = () => {};
    const measure = requestAnimationFrame(() => {
      if (cancelled) {
        return;
      }

      stopScroll = scrollWindowToShowBottom(loadSectionRef.current);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(measure);
      stopScroll();
    };
  }, [loadRows, loadDrafts.length, loadPending, loadCommitMessage]);

  useEffect(() => {
    if (!trackingFormOpen) {
      return undefined;
    }

    let cancelled = false;

    async function load() {
      const [products, units, suppliers, ports, currencies, statuses] =
        await Promise.all([
          loadProducts(),
          loadUnitsOfMeasure(),
          loadSuppliers(),
          loadPorts(),
          loadCurrencies(),
          loadItemTrackingStatuses(),
        ]);

      if (cancelled) {
        return;
      }

      const lookups = {
        products: products.options,
        units: units.options,
        suppliers: suppliers.options,
        ports: ports.options,
        currencies: currencies.options,
        statuses: statuses.options,
      };
      setTrackingLookups(lookups);
      const newStatusId = lookupIdByLabel(statuses.options, "New");
      const litresId = litreUnitId(units.options);
      if (newStatusId || litresId) {
        setTrackingDraft((current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            statusId:
              current.statusId === SELECT_LOOKUP.id && newStatusId
                ? newStatusId
                : current.statusId,
            unitId:
              current.unitId === SELECT_LOOKUP.id && litresId
                ? litresId
                : current.unitId,
          };
        });
      }
      setTrackingEdit((current) => matchTrackingLookups(current, lookups));
      setTrackingLookupsMessage(
        [products, units, suppliers, ports, currencies, statuses]
          .filter((result) => !result.ok)
          .map((result) => result.message)
          .filter(Boolean)
          .join(" "),
      );
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [trackingFormOpen]);

  useEffect(() => {
    if ((!tradeDraft && !tradeEdit) || tradeCommitPending) {
      return undefined;
    }

    function onPointerDown(event) {
      if (tradeGridRef.current?.contains(event.target)) {
        return;
      }

      setTradeDraft(null);
      setTradeEdit(null);
      setTradeCommitMessage("");
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [tradeDraft, tradeEdit, tradeCommitPending]);

  async function onSaleableVolumeEnter(tradeId) {
    const id = String(tradeId ?? "").trim();

    if (!id) {
      return;
    }

    saleableHoverIdRef.current = id;
    const cached = saleableSplitCacheRef.current.get(id);

    if (cached) {
      setSaleableVolumeSplit({ tradeId: id, pending: false, ...cached });
      return;
    }

    setSaleableVolumeSplit({
      tradeId: id,
      pending: true,
      message: "",
      rows: [],
    });
    const result = await loadSaleableVolumeSplit(id);

    if (saleableHoverIdRef.current !== id) {
      return;
    }

    const next = {
      rows: result.rows,
      message: result.ok ? "" : result.message,
    };
    saleableSplitCacheRef.current.set(id, next);
    setSaleableVolumeSplit({ tradeId: id, pending: false, ...next });
  }

  function onSaleableVolumeLeave(tradeId) {
    const id = String(tradeId ?? "").trim();

    if (saleableHoverIdRef.current !== id) {
      return;
    }

    saleableHoverIdRef.current = "";
    setSaleableVolumeSplit(null);
  }

  return (
    <div className="flex w-full flex-col items-start gap-6">
      <TradeStatusesSelect
        options={options}
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
      />
      <div className="w-full">
        <InboundGrid
          rows={rows}
          message={message}
          pending={pending}
          selectedId={selectedTradeId}
          onSelect={setSelectedTradeId}
          numericLabels={[
            "Saleable Volume",
            "Total Trade Delivered",
            "Progress %",
          ]}
          integerNumeric
          headerExtra={
            tradeDraft ? null : (
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setTradeDraft(emptyTradeDraft());
                  setTradeCommitMessage("");
                  setTradeHoverId("");
                  setTradeEdit(null);
                }}
                className="text-sm font-medium text-blue-900 underline disabled:opacity-50 dark:text-blue-300"
              >
                Add Trade
              </button>
            )
          }
          draftRow={tradeDraft}
          draftPending={tradeCommitPending}
          onDraftChange={(patch) => {
            setTradeDraft((current) => ({
              ...(current ?? emptyTradeDraft()),
              ...patch,
            }));
            setTradeCommitMessage("");
          }}
          hoveredRowId={tradeHoverId}
          showRowEdit={Boolean(tradeEditAllowed && !tradeDraft)}
          frameRef={tradeGridRef}
          editRow={tradeEdit}
          tradeStatusOptions={options}
          onEditChange={(patch) => {
            setTradeEdit((current) =>
              current ? { ...current, ...patch } : current,
            );
          }}
          onEditSelect={(id) => {
            const row = rows.find((item) => rowId(item) === String(id));

            if (!row) {
              return;
            }

            setTradeDraft(null);
            setTradeCommitMessage("");
            setTradeEdit(tradeEditFromRow(row, options));
          }}
          onCommitEdit={async () => {
            if (!tradeEdit || tradeCommitPending) {
              return;
            }

            setTradeCommitPending(true);
            setTradeCommitMessage("");
            const result = await updateInboundTrade({
              inboundTradeId: tradeEdit.id,
              description: tradeEdit.description,
              tradeStatusId: tradeEdit.tradeStatusId,
            });

            if (!result.ok) {
              setTradeCommitPending(false);
              setTradeCommitMessage(result.message);
              return;
            }

            setTradeEdit(null);
            setTradeCommitPending(false);
            setPending(true);
            const trades = await loadInboundTrades(selectedIds);
            setRows(trades.rows);
            setMessage(trades.ok ? "" : trades.message);
            setPending(false);
          }}
          onRowHover={(id) => {
            setTradeHoverId(id);

            if (tradeEditAllowRef.current != null) {
              return;
            }

            tradeEditAllowRef.current = loadAllowAction(10, 1)
              .then((result) => {
                const allowed = Boolean(result.ok && result.value > 0);
                tradeEditAllowRef.current = allowed;
                setTradeEditAllowed(allowed);
              })
              .catch(() => {
                tradeEditAllowRef.current = false;
                setTradeEditAllowed(false);
              });
          }}
          onRowLeave={() => setTradeHoverId("")}
          saleableVolumeSplit={saleableVolumeSplit}
          onSaleableVolumeEnter={onSaleableVolumeEnter}
          onSaleableVolumeLeave={onSaleableVolumeLeave}
          onCommitDraft={async () => {
            if (!tradeDraft || tradeCommitPending) {
              return;
            }

            setTradeCommitPending(true);
            setTradeCommitMessage("");
            const result = await addInboundTrade(tradeDraft.description);

            if (!result.ok) {
              setTradeCommitPending(false);
              setTradeCommitMessage(result.message);
              return;
            }

            setTradeDraft(null);
            setTradeCommitPending(false);
            setPending(true);
            const trades = await loadInboundTrades(selectedIds);
            setRows(trades.rows);
            setMessage(trades.ok ? "" : trades.message);
            setPending(false);
          }}
        />
        {tradeCommitMessage ? (
          <p className="mt-2 text-sm text-red-700 dark:text-red-400">
            {tradeCommitMessage}
          </p>
        ) : null}
      </div>
      <div className="w-full">
        <InboundGrid
        title="Inbound Item Tracking"
        rows={trackingRows}
        message={trackingMessage}
        pending={trackingPending}
        columnLabels={TRACKING_COLUMN_LABELS}
        numericLabels={[
          "Qty",
          "Qty (litres)",
          "Supp_Inv_Amt.",
          "Over / Under",
          "item_over_under",
          "qty_still_to_lift",
          "Unassigned",
          "qty_not_assigned_to_lift",
          "Cost",
        ]}
        dateLabels={["Purchase Date", "Status Date"]}
        selectedId={selectedTrackingId}
        frameRef={trackingGridRef}
        draftKind="tracking"
        draftRow={trackingDraft}
        trackingLookups={trackingLookups}
        selectLookupOption={SELECT_LOOKUP}
        hideEthanolColumn={isDieselOrEthanolProduct(
          trackingDraft?.productId ?? trackingEdit?.productId,
          trackingLookups.products,
        )}
        hideUnitColumn
        editRow={trackingEdit}
        onEditChange={(patch) => {
          if (
            patch.statusId != null &&
            isVoidStatus(patch.statusId, trackingLookups.statuses) &&
            !isVoidStatus(trackingEdit?.statusId, trackingLookups.statuses)
          ) {
            setVoidStatusPendingId(String(patch.statusId));
            return;
          }

          setTrackingEdit((current) =>
            current ? { ...current, ...patch } : current,
          );
          setTrackingCommitMessage("");
        }}
        onEditSelect={(id) => {
          const row = trackingRows.find((item) => rowId(item) === String(id));

          if (!row) {
            return;
          }

          setTrackingDraft(null);
          setTrackingCommitMessage("");
          setTrackingEdit(trackingEditFromRow(row, trackingLookups));
        }}
        onCommitEdit={async () => {
          if (!trackingEdit || trackingCommitPending) {
            return;
          }

          const error = trackingFormError(
            trackingEdit,
            trackingLookups.products,
          );

          if (error) {
            setTrackingCommitMessage(error);
            return;
          }

          setTrackingCommitPending(true);
          setTrackingCommitMessage("");
          const result = await updateInboundItemTracking({
            id: trackingEdit.id,
            productId: trackingEdit.productId,
            qty: trackingEdit.qty,
            purchaseDate: trackingEdit.purchaseDate,
            itemTrackingStatusId: trackingEdit.statusId,
            statusDate: trackingEdit.statusDate,
            supplierId: trackingEdit.companyId,
            portId: trackingEdit.portId,
            supplierInvoiceNumber: trackingEdit.suppInvNo,
            supplierInvoiceAmount: trackingEdit.suppInvAmt,
            currencyId: trackingEdit.currencyId,
            ethanolBlendPercentage: trackingEdit.ethanolPercent,
          });

          if (!result.ok) {
            setTrackingCommitPending(false);
            setTrackingCommitMessage(result.message);
            return;
          }

          setTrackingEdit(null);
          setTrackingCommitPending(false);
          setTrackingPending(true);
          const tracking = await loadInboundItemTracking(selectedTradeId);
          setTrackingRows(tracking.rows);
          setTrackingMessage(tracking.ok ? "" : tracking.message);
          setTrackingPending(false);

          const groupingKey = blendGroupingKey(
            tracking.rows,
            selectedTrackingId,
          );

          if (!groupingKey) {
            setLiftRows([]);
            setLiftMessage("");
            setLiftPending(false);
            setLoadRows([]);
            setLoadMessage("");
            setLoadPending(false);
            return;
          }

          setLiftPending(true);
          const lift = await loadInboundLift(groupingKey);
          setLiftRows(lift.rows);
          setLiftMessage(lift.ok ? "" : lift.message);
          setLiftPending(false);

          const liftGroupKey = blendGroupingKey(lift.rows, selectedLiftId);
          const liftGroupKeyLift = blendGroupingKeyLift(
            lift.rows,
            selectedLiftId,
          );

          if (!liftGroupKey) {
            setLoadRows([]);
            setLoadMessage("");
            setLoadPending(false);
            return;
          }

          setLoadPending(true);
          const load = await loadInboundLoad(liftGroupKey, liftGroupKeyLift);
          setLoadRows(load.rows);
          setLoadMessage(load.ok ? "" : load.message);
          setLoadPending(false);
        }}
        onDraftChange={(patch) => {
          setTrackingDraft((current) => ({
            ...(current ?? emptyTrackingDraft()),
            ...patch,
          }));
          setTrackingCommitMessage("");
        }}
        draftPending={trackingCommitPending}
        onCommitDraft={async () => {
          if (!trackingDraft || trackingCommitPending) {
            return;
          }

          const error = trackingFormError(
            trackingDraft,
            trackingLookups.products,
          );

          if (error) {
            setTrackingCommitMessage(error);
            return;
          }

          setTrackingCommitPending(true);
          setTrackingCommitMessage("");
          const result = await addInboundItemTracking({
            inboundTradeId: selectedTradeId,
            productId: trackingDraft.productId,
            unitOfMeasureId: trackingDraft.unitId,
            qty: trackingDraft.qty,
            purchaseDate: trackingDraft.purchaseDate,
            itemTrackingStatusId: trackingDraft.statusId,
            statusDate: trackingDraft.statusDate,
            supplierId: trackingDraft.companyId,
            portId: trackingDraft.portId,
            supplierInvoiceNumber: trackingDraft.suppInvNo,
            supplierInvoiceAmount: trackingDraft.suppInvAmt,
            currencyId: trackingDraft.currencyId,
            ethanolBlendPercentage: trackingDraft.ethanolPercent,
          });

          if (!result.ok) {
            setTrackingCommitPending(false);
            setTrackingCommitMessage(result.message);
            return;
          }

          setTrackingDraft(null);
          setTrackingCommitPending(false);
          setTrackingCommitMessage("");

          if (!selectedTradeId) {
            return;
          }

          setTrackingPending(true);
          const tracking = await loadInboundItemTracking(selectedTradeId);
          setTrackingRows(tracking.rows);
          setTrackingMessage(tracking.ok ? "" : tracking.message);
          setTrackingPending(false);
        }}
        headerExtra={
          trackingDraft || trackingEdit || !selectedTradeId ? null : (
            <button
              type="button"
              disabled={trackingPending}
              onClick={() => {
                setTrackingDraft(
                  emptyTrackingDraft(
                    selectedTradeNumber(rows, selectedTradeId),
                    lookupIdByLabel(trackingLookups.statuses, "New") ||
                      SELECT_LOOKUP.id,
                    litreUnitId(trackingLookups.units) || SELECT_LOOKUP.id,
                  ),
                );
                setTrackingLookupsMessage("");
              }}
              className="text-sm font-medium text-blue-900 underline disabled:opacity-50 dark:text-blue-300"
            >
              Add Item
            </button>
          )
        }
        hoveredRowId={trackingHoverId}
        showRowEdit={Boolean(trackingEditAllowed && !trackingDraft)}
        onRowHover={(id) => {
          setTrackingHoverId(id);

          if (trackingEditAllowRef.current != null) {
            return;
          }

          trackingEditAllowRef.current = loadAllowAction(11, 1)
            .then((result) => {
              const allowed = Boolean(result.ok && result.value > 0);
              trackingEditAllowRef.current = allowed;
              setTrackingEditAllowed(allowed);
            })
            .catch(() => {
              trackingEditAllowRef.current = false;
              setTrackingEditAllowed(false);
            });
        }}
        onRowLeave={() => setTrackingHoverId("")}
        onSelect={(id) => {
          setSelectedTrackingId(id);
          setDocsOpen(false);
          setNotesOpen(false);
          setCostOpen(false);
          setLiftDocsOpen(false);
          setLiftNotesOpen(false);
          setLoadDocsOpen(false);
          setLoadNotesOpen(false);
        }}
        onCostSelect={(id) => {
          setSelectedTrackingId(id);
          setDocsOpen(false);
          setNotesOpen(false);
          setCostOpen(true);
          setLiftDocsOpen(false);
          setLiftNotesOpen(false);
          setLoadDocsOpen(false);
          setLoadNotesOpen(false);
        }}
        onDocsSelect={(id) => {
          setSelectedTrackingId(id);
          setCostOpen(false);
          setNotesOpen(false);
          setDocsOpen(true);
          setLiftDocsOpen(false);
          setLiftNotesOpen(false);
          setLoadDocsOpen(false);
          setLoadNotesOpen(false);
        }}
        onNotesSelect={(id) => {
          setSelectedTrackingId(id);
          setCostOpen(false);
          setDocsOpen(false);
          setNotesOpen(true);
          setLiftDocsOpen(false);
          setLiftNotesOpen(false);
          setLoadDocsOpen(false);
          setLoadNotesOpen(false);
        }}
      />
        {trackingLookupsMessage ? (
          <p className="mt-2 text-sm text-red-700 dark:text-red-400">
            {trackingLookupsMessage}
          </p>
        ) : null}
        {trackingCommitMessage ? (
          <p className="mt-2 text-sm text-red-700 dark:text-red-400">
            {trackingCommitMessage}
          </p>
        ) : null}
      </div>
      <InboundGrid
        title="Inbound Lift"
        rows={liftRows}
        message={liftMessage}
        pending={liftPending}
        columnLabels={liftRows.length ? [] : LIFT_COLUMN_LABELS}
        numericLabels={[
          "Qty to Lift",
          "Over / Under",
          "Remaining Qty to Lift",
          "remaining_qty_to_lift",
          "lift_over_under",
          "Unassigned",
          "qty_not_assigned_to_load",
        ]}
        selectedId={selectedLiftId}
        frameRef={liftGridRef}
        draftKind="lift"
        hideUnitColumn
        hoveredRowId={liftHoverId}
        showRowEdit={Boolean(liftEditAllowed && !liftDrafts.length)}
        onRowHover={(id) => {
          setLiftHoverId(id);

          if (liftEditAllowRef.current != null) {
            return;
          }

          liftEditAllowRef.current = loadAllowAction(12, 1)
            .then((result) => {
              const allowed = Boolean(result.ok && result.value > 0);
              liftEditAllowRef.current = allowed;
              setLiftEditAllowed(allowed);
            })
            .catch(() => {
              liftEditAllowRef.current = false;
              setLiftEditAllowed(false);
            });
        }}
        onRowLeave={() => setLiftHoverId("")}
        editRow={liftEdit}
        liftStatusOptions={liftStatusOptions}
        onEditChange={(patch) => {
          setLiftEdit((current) =>
            current ? { ...current, ...patch } : current,
          );
          setLiftCommitMessage("");
        }}
        onEditSelect={async (id) => {
          const row = liftRows.find((item) => rowId(item) === String(id));

          if (!row) {
            return;
          }

          setLiftDrafts([]);
          setLiftCommitMessage("");
          setSelectedLiftId(id);
          setLiftEdit(liftEditFromRow(row, liftStatusOptions));

          let statusOptions = liftStatusOptions;

          if (!statusOptions.length) {
            const result = await loadLiftStatuses();

            if (!result.ok) {
              setLiftCommitMessage(result.message);
              return;
            }

            statusOptions = result.options;
            setLiftStatusOptions(statusOptions);
          }

          setLiftEdit((current) =>
            current?.id === String(id)
              ? liftEditFromRow(row, statusOptions)
              : current,
          );
        }}
        onCommitEdit={async () => {
          if (!liftEdit || liftCommitPending) {
            return;
          }

          setLiftCommitPending(true);
          setLiftCommitMessage("");
          const result = await updateInboundLift({
            id: liftEdit.id,
            qtyToLift: liftEdit.qtyToLift,
            supplierReleaseNumber: liftEdit.supplierReleaseNumber,
            liftStatusId: liftEdit.liftStatusId,
          });

          if (!result.ok) {
            setLiftCommitPending(false);
            setLiftCommitMessage(result.message);
            return;
          }

          setLiftEdit(null);
          setLiftCommitPending(false);

          const groupingKey = blendGroupingKey(
            trackingRows,
            selectedTrackingId,
          );

          if (!groupingKey) {
            return;
          }

          setLiftPending(true);
          const lift = await loadInboundLift(groupingKey);
          setLiftRows(lift.rows);
          setLiftMessage(lift.ok ? "" : lift.message);
          setLiftPending(false);

          const liftGroupKey = blendGroupingKey(lift.rows, selectedLiftId);
          const liftGroupKeyLift = blendGroupingKeyLift(
            lift.rows,
            selectedLiftId,
          );

          if (!liftGroupKey) {
            setLoadRows([]);
            setLoadMessage("");
            setLoadPending(false);
            return;
          }

          setLoadPending(true);
          const load = await loadInboundLoad(liftGroupKey, liftGroupKeyLift);
          setLoadRows(load.rows);
          setLoadMessage(load.ok ? "" : load.message);
          setLoadPending(false);
        }}
        headerExtra={
          liftDrafts.length || liftEdit || !trackingRowSelected ? null : (
            <button
              type="button"
              disabled={liftPending}
              onClick={async () => {
                const groupingKey = blendGroupingKey(
                  trackingRows,
                  selectedTrackingId,
                );

                if (!groupingKey) {
                  setLiftMessage("Missing blend group key.");
                  return;
                }

                setLiftPending(true);
                setLiftMessage("");
                setLiftCommitMessage("");
                setLiftEdit(null);
                const selectedTracking = trackingRows.find(
                  (row) => rowId(row) === String(selectedTrackingId),
                );
                const result = await loadInboundItemTrackingToLift(
                  groupingKey,
                  firstField(selectedTracking, ["product_id"]),
                );
                setLiftPending(false);

                if (!result.ok) {
                  setLiftMessage(result.message);
                  return;
                }

                setLiftDrafts(result.rows.map(liftDraftFromTrackingToLift));
              }}
              className="text-sm font-medium text-blue-900 underline disabled:opacity-50 dark:text-blue-300"
            >
              Add Lift
            </button>
          )
        }
        draftRows={liftDrafts}
        draftPending={liftCommitPending}
        onDraftChange={(patch, index) => {
          setLiftDrafts((current) =>
            patchDraftRows(current, patch, index, [
              "supplier_release_number",
            ]),
          );
          setLiftCommitMessage("");
        }}
        onCommitDraft={async (draftIndex) => {
          const draft = liftDrafts[draftIndex];

          if (!draft || liftCommitPending) {
            return;
          }

          const releaseNumber = String(
            draft.supplier_release_number ?? "",
          ).trim();

          if (!releaseNumber) {
            setLiftCommitMessage("Enter a supplier release number.");
            return;
          }

          const qtyValue = Number(
            String(draft.qty_to_lift ?? "")
              .trim()
              .replace(",", "."),
          );
          const maxQty = Number(
            String(draft.qty_to_lift_max ?? "")
              .trim()
              .replace(",", "."),
          );

          if (
            !Number.isFinite(qtyValue) ||
            qtyValue < 0 ||
            !Number.isFinite(maxQty) ||
            qtyValue > maxQty
          ) {
            setLiftCommitMessage(
              "Qty to Lift must be between 0 and the suggested quantity.",
            );
            return;
          }

          const groupingKey = blendGroupingKey(
            trackingRows,
            selectedTrackingId,
          );

          if (!groupingKey) {
            setLiftCommitMessage("Missing blend group key.");
            return;
          }

          setLiftCommitPending(true);
          setLiftCommitMessage("");
          const result = await addInboundLift({
            inboundStockItemTrackingId: draft.inbound_item_tracking,
            qtyToLift: draft.qty_to_lift,
            maxQtyToLift: draft.qty_to_lift_max,
            supplierReleaseNumber: releaseNumber,
            blendGroupingKey: groupingKey,
          });

          if (!result.ok) {
            setLiftCommitPending(false);
            setLiftCommitMessage(result.message);
            return;
          }

          setLiftDrafts((current) =>
            current.filter((_, index) => index !== draftIndex),
          );
          setLiftCommitPending(false);
          setLiftPending(true);
          const lift = await loadInboundLift(groupingKey);
          setLiftRows(lift.rows);
          setLiftMessage(lift.ok ? "" : lift.message);
          setLiftPending(false);
        }}
        onSelect={(id) => {
          setSelectedLiftId(id);
          setLiftDocsOpen(false);
          setLiftNotesOpen(false);
          setLoadDocsOpen(false);
          setLoadNotesOpen(false);
        }}
        onDocsSelect={(id) => {
          setSelectedLiftId(id);
          setLiftNotesOpen(false);
          setDocsOpen(false);
          setNotesOpen(false);
          setCostOpen(false);
          setLiftDocsOpen(true);
          setLoadDocsOpen(false);
          setLoadNotesOpen(false);
        }}
        onNotesSelect={(id) => {
          setSelectedLiftId(id);
          setLiftDocsOpen(false);
          setDocsOpen(false);
          setNotesOpen(false);
          setCostOpen(false);
          setLiftNotesOpen(true);
          setLoadDocsOpen(false);
          setLoadNotesOpen(false);
        }}
      />
      {liftCommitMessage ? (
        <p className="text-sm text-red-700 dark:text-red-400">
          {liftCommitMessage}
        </p>
      ) : null}
      <div ref={loadSectionRef}>
      <InboundGrid
        title="Inbound Load"
        rows={loadRows}
        message={loadMessage}
        pending={loadPending}
        columnLabels={loadRows.length ? [] : LOAD_COLUMN_LABELS}
        numericLabels={[
          "Load Qty",
          "Actual Load Qty",
          "load_qty",
          "actual_loaded_qty",
        ]}
        dateLabels={[
          "Load Date",
          "load_date",
          "Exp Compl Date",
          "expected_completion_date",
        ]}
        selectedId={selectedLoadId}
        frameRef={loadGridRef}
        draftKind="load"
        draftRows={loadDrafts}
        hoveredRowId={loadHoverId}
        showRowEdit={Boolean(loadEditAllowed && !loadDrafts.length)}
        editRow={loadEdit}
        loadStatusOptions={loadStatusOptions}
        onEditChange={(patch) => {
          setLoadEdit((current) =>
            current ? { ...current, ...patch } : current,
          );
          setLoadCommitMessage("");
        }}
        onEditSelect={async (id) => {
          const row = loadRows.find((item) => rowId(item) === String(id));

          if (!row) {
            return;
          }

          setLoadDrafts([]);
          setLoadCommitMessage("");
          setSelectedLoadId(id);
          setTransportHoverLoadId("");
          setTransportChannelOpen(false);

          let pointOptions = collectionPointOptions;
          let statusOptions = loadStatusOptions;

          if (!pointOptions.length || !statusOptions.length) {
            const [points, statuses] = await Promise.all([
              pointOptions.length
                ? Promise.resolve({
                    ok: true,
                    message: "",
                    options: pointOptions,
                  })
                : loadCollectionPoints(),
              statusOptions.length
                ? Promise.resolve({
                    ok: true,
                    message: "",
                    options: statusOptions,
                  })
                : loadLoadStatuses(),
            ]);

            if (!points.ok) {
              setLoadCommitMessage(points.message);
              return;
            }

            if (!statuses.ok) {
              setLoadCommitMessage(statuses.message);
              return;
            }

            pointOptions = points.options;
            statusOptions = statuses.options;
            setCollectionPointOptions(pointOptions);
            setLoadStatusOptions(statusOptions);
          }

          setLoadEdit(loadEditFromRow(row, pointOptions, statusOptions));
        }}
        onCommitEdit={async () => {
          if (!loadEdit || loadCommitPending) {
            return;
          }

          const groupingKey =
            loadEdit.blend_grouping_key ||
            blendGroupingKey(liftRows, selectedLiftId);
          const liftGroupingKey =
            loadEdit.blend_grouping_key_lift ||
            blendGroupingKeyLift(liftRows, selectedLiftId);

          setLoadCommitPending(true);
          setLoadCommitMessage("");
          const result = await updateInboundLoad({
            id: loadEdit.id,
            loadDate: loadEdit.load_date,
            contractNumber: loadEdit.contract_number,
            upliftNumber: loadEdit.uplift_number,
            collectionPointId: loadEdit.collection_point_id,
            loadQty: loadEdit.load_qty,
            expectedCompletionDate: loadEdit.expected_completion_date,
            actualLoadedQty: loadEdit.actual_loaded_qty,
            loadStatusId: loadEdit.loadStatusId,
          });

          if (!result.ok) {
            setLoadCommitPending(false);
            setLoadCommitMessage(result.message);
            return;
          }

          setLoadEdit(null);
          setLoadCommitPending(false);

          const refreshParents = reloadTrackingAndLiftGrids();

          if (!groupingKey) {
            await refreshParents;
            return;
          }

          setLoadPending(true);
          const load = await loadInboundLoad(groupingKey, liftGroupingKey);
          setLoadRows(load.rows);
          setLoadMessage(load.ok ? "" : load.message);
          setLoadPending(false);
          await refreshParents;
        }}
        onRowHover={(id) => {
          setLoadHoverId(id);

          if (loadEditAllowRef.current != null) {
            return;
          }

          loadEditAllowRef.current = loadAllowAction(13, 1)
            .then((result) => {
              const allowed = Boolean(result.ok && result.value > 0);
              loadEditAllowRef.current = allowed;
              setLoadEditAllowed(allowed);
            })
            .catch(() => {
              loadEditAllowRef.current = false;
              setLoadEditAllowed(false);
            });
        }}
        onRowLeave={() => setLoadHoverId("")}
        collectionPointOptions={collectionPointOptions}
        selectLookupOption={SELECT_LOOKUP}
        onDraftChange={(patch, index) => {
          setLoadDrafts((current) =>
            patchDraftRows(current, patch, index, [
              "contract_number",
              "uplift_number",
            ]),
          );
          setLoadCommitMessage("");
        }}
        draftPending={loadCommitPending}
        headerExtra={
          loadDrafts.length || loadEdit || !liftRowSelected ? null : (
            <button
              type="button"
              disabled={loadPending}
              onClick={async () => {
                const liftBlendKey = blendGroupingKeyLift(
                  liftRows,
                  selectedLiftId,
                );

                if (!liftBlendKey) {
                  setLoadMessage("Missing blend group key (lift).");
                  return;
                }

                setLoadPending(true);
                setLoadMessage("");
                const [result, collectionPoints] = await Promise.all([
                  loadInboundLiftToLoad(liftBlendKey),
                  collectionPointOptions.length
                    ? Promise.resolve({
                        ok: true,
                        message: "",
                        options: collectionPointOptions,
                      })
                    : loadCollectionPoints(),
                ]);
                setLoadPending(false);

                if (!result.ok) {
                  setLoadMessage(result.message);
                  return;
                }

                if (collectionPoints.ok) {
                  setCollectionPointOptions(collectionPoints.options);
                } else if (collectionPoints.message) {
                  setLoadMessage(collectionPoints.message);
                }

                setTransportHoverLoadId("");
                setLoadEdit(null);
                setLoadDrafts(result.rows.map(loadDraftFromLiftToLoad));
              }}
              className="text-sm font-medium text-blue-900 underline disabled:opacity-50 dark:text-blue-300"
            >
              Add Load
            </button>
          )
        }
        onCommitDraft={async (draftIndex) => {
          const draft = loadDrafts[draftIndex];

          if (!draft || loadCommitPending) {
            return;
          }

          if (!draft.id) {
            setLoadCommitMessage("Missing lift id.");
            return;
          }

          const qtyValue = Number(
            String(draft.load_qty ?? "")
              .trim()
              .replace(",", "."),
          );
          const maxQty = Number(
            String(draft.load_qty_max ?? "")
              .trim()
              .replace(",", "."),
          );

          if (
            !Number.isFinite(qtyValue) ||
            qtyValue < 0 ||
            !Number.isFinite(maxQty) ||
            qtyValue > maxQty
          ) {
            setLoadCommitMessage(
              "Load Qty must be between 0 and the suggested quantity.",
            );
            return;
          }

          const groupingKey = blendGroupingKey(liftRows, selectedLiftId);
          const liftGroupingKey = blendGroupingKeyLift(
            liftRows,
            selectedLiftId,
          );

          setLoadCommitPending(true);
          setLoadCommitMessage("");
          const result = await addInboundLoad({
            inboundLiftId: draft.id,
            loadDate: draft.load_date,
            contractNumber: draft.contract_number,
            upliftNumber: draft.uplift_number,
            collectionPointId: draft.collection_point_id,
            loadQty: draft.load_qty,
            maxLoadQty: draft.load_qty_max,
            expectedCompletionDate: draft.expected_completion_date,
            blendGroupingKey: groupingKey,
            blendGroupingKeyLift: liftGroupingKey,
            actualLoadedQty: draft.actual_loaded_qty,
          });

          if (!result.ok) {
            setLoadCommitPending(false);
            setLoadCommitMessage(result.message);
            return;
          }

          setLoadDrafts((current) =>
            current.filter((_, index) => index !== draftIndex),
          );
          setLoadCommitPending(false);

          const refreshParents = reloadTrackingAndLiftGrids();

          if (!groupingKey) {
            await refreshParents;
            return;
          }

          setLoadPending(true);
          const load = await loadInboundLoad(groupingKey, liftGroupingKey);
          setLoadRows(load.rows);
          setLoadMessage(load.ok ? "" : load.message);
          setLoadPending(false);
          await refreshParents;
        }}
        onSelect={(id) => {
          setSelectedLoadId(id);
          setLoadDocsOpen(false);
          setLoadNotesOpen(false);
          setTransportChannelOpen(false);
        }}
        onDocsSelect={(id) => {
          setSelectedLoadId(id);
          setLoadNotesOpen(false);
          setDocsOpen(false);
          setNotesOpen(false);
          setCostOpen(false);
          setLiftDocsOpen(false);
          setLiftNotesOpen(false);
          setTransportChannelOpen(false);
          setLoadDocsOpen(true);
        }}
        onNotesSelect={(id) => {
          setSelectedLoadId(id);
          setLoadDocsOpen(false);
          setDocsOpen(false);
          setNotesOpen(false);
          setCostOpen(false);
          setLiftDocsOpen(false);
          setLiftNotesOpen(false);
          setTransportChannelOpen(false);
          setLoadNotesOpen(true);
        }}
        onTransportChannelSelect={(id, text) => {
          setSelectedLoadId(id);
          setLoadDocsOpen(false);
          setLoadNotesOpen(false);
          setDocsOpen(false);
          setNotesOpen(false);
          setCostOpen(false);
          setLiftDocsOpen(false);
          setLiftNotesOpen(false);
          if (text.trim().toLowerCase() === "none") {
            setTransportHoverLoadId("");
            setTransportChannelId("");
            setTransportChannelPrefill(null);
            setTransportChannelMode("add");
            setTransportChannelOpen(true);
            return;
          }
          setTransportChannelOpen(false);
          setTransportHoverLoadId(id);
        }}
      />
      {loadCommitMessage ? (
        <p className="text-sm text-red-700 dark:text-red-400">
          {loadCommitMessage}
        </p>
      ) : null}
      </div>
      <InboundCostDialog
        open={Boolean(transportHoverLoadId) && !transportChannelOpen}
        title="Transport Channel"
        closeOnMouseLeave
        showCloseButton={false}
        headerExtra={
          <button
            type="button"
            onClick={() => {
              const row = transportHoverRows[0];
              setSelectedLoadId(transportHoverLoadId);
              setTransportChannelId(rowId(row));
              setTransportChannelPrefill(transportChannelPrefillFromRow(row));
              setTransportChannelMode("change");
              setTransportChannelOpen(true);
            }}
            className="text-sm font-medium text-blue-900 underline dark:text-blue-300"
          >
            Change
          </button>
        }
        onClose={() => {
          setTransportHoverLoadId("");
          setTransportHoverRows([]);
          setTransportHoverMessage("");
          setTransportHoverPending(false);
        }}
      >
        <InboundGrid
          title=""
          rows={transportHoverRows}
          message={transportHoverMessage}
          pending={transportHoverPending}
          columnLabels={[]}
        />
      </InboundCostDialog>
      <InboundCostDialog
        open={loadDocsOpen && selectedLoadId !== ""}
        title="Inbound Load Documents"
        onClose={() => {
          setLoadDocsOpen(false);
          setUploadFile(null);
          setUploadMessage("");
        }}
      >
        <InboundGrid
          title=""
          rows={loadDocsRows}
          message={loadDocsMessage}
          pending={loadDocsPending}
          columnLabels={[]}
          dateTimeLabels={["Uploaded", "created_at"]}
          showViewButton
          showDeleteButton
          onDeleteFile={(target) => {
            setDeleteTarget(target);
            setDeletePending(false);
            setDeleteMessage("");
          }}
          onViewFile={async (filePath) => {
            setViewerOpen(true);
            setViewerUrl("");
            setViewerName("");
            setViewerMessage("");
            const result = await getDocumentFileUrl(filePath);

            if (result.ok) {
              setViewerUrl(result.url);
              setViewerName(result.fileName ?? "");
              return;
            }

            setViewerMessage(result.message);
          }}
        />
        <label
          className="mt-4 flex w-full max-w-md flex-col gap-1"
          htmlFor="load-document-type"
        >
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Document Type
          </span>
          <select
            id="load-document-type"
            name="load-document-type"
            value={documentTypeId}
            onChange={(event) => setDocumentTypeId(event.target.value)}
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
          >
            <option value={SELECT_DOCUMENT_TYPE.id}>
              {SELECT_DOCUMENT_TYPE.label}
            </option>
            {documentTypes.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {documentTypesMessage ? (
          <p className="mt-2 text-sm text-red-700 dark:text-red-400">
            {documentTypesMessage}
          </p>
        ) : null}
        <DocumentUpload
          file={uploadFile}
          onFile={(next) => {
            setUploadFile(next);
            setUploadMessage("");
          }}
          pending={uploadPending}
          message={uploadMessage}
          addDisabled={
            documentTypeId === SELECT_DOCUMENT_TYPE.id ||
            !uploadFile ||
            !selectedLoadId
          }
          onAdd={async () => {
            if (
              uploadLock.current ||
              uploadPending ||
              documentTypeId === SELECT_DOCUMENT_TYPE.id ||
              !uploadFile ||
              !selectedLoadId
            ) {
              return;
            }

            uploadLock.current = true;
            setUploadPending(true);
            setUploadMessage("");

            const formData = new FormData();
            formData.set("documentTypeId", documentTypeId);
            formData.set("loadId", selectedLoadId);
            formData.set("file", uploadFile);

            const result = await addInboundLoadDocument(formData);

            if (!result.ok) {
              uploadLock.current = false;
              setUploadPending(false);
              setUploadMessage(result.message);
              return;
            }

            setUploadFile(null);
            setUploadPending(false);

            const docs = await loadDocumentInboundLoad(selectedLoadId);
            setLoadDocsRows(docs.rows);
            setLoadDocsMessage(docs.ok ? "" : docs.message);

            if (selectedLiftBlendGroupKey) {
              const load = await loadInboundLoad(
                selectedLiftBlendGroupKey,
                selectedLiftBlendGroupKeyLift,
              );
              setLoadRows(load.rows);
              setLoadMessage(load.ok ? "" : load.message);
            }

            uploadLock.current = false;
          }}
        />
      </InboundCostDialog>
      <InboundCostDialog
        open={loadNotesOpen && selectedLoadId !== ""}
        title="Inbound Load Notes"
        onClose={() => {
          setLoadNotesOpen(false);
          setLoadNewNote("");
          setLoadNoteAddMessage("");
          setNoteTextOpen(false);
          setNoteText("");
        }}
      >
        <InboundGrid
          title=""
          rows={loadNotesRows}
          message={loadNotesMessage}
          pending={loadNotesPending}
          columnLabels={[]}
          dateTimeLabels={["Uploaded", "created_at"]}
          deleteIfCurrentUser
          currentUserId={userId}
          onNoteTextSelect={(text) => {
            setNoteText(text);
            setNoteTextOpen(true);
          }}
          onDeleteFile={async ({ id }) => {
            if (!id) {
              return;
            }

            setLoadNoteAddMessage("");
            const result = await deleteInboundLoadNote(id);

            if (!result.ok) {
              setLoadNoteAddMessage(result.message);
              return;
            }

            const notes = await loadNotesInboundLoad(selectedLoadId);
            setLoadNotesRows(notes.rows);
            setLoadNotesMessage(notes.ok ? "" : notes.message);

            if (selectedLiftBlendGroupKey) {
              const load = await loadInboundLoad(
                selectedLiftBlendGroupKey,
                selectedLiftBlendGroupKeyLift,
              );
              setLoadRows(load.rows);
              setLoadMessage(load.ok ? "" : load.message);
            }
          }}
        />
        <label
          className="mt-4 flex w-full flex-col gap-1"
          htmlFor="load-new-note"
        >
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            New Note
          </span>
          <textarea
            id="load-new-note"
            name="New Note"
            rows={4}
            value={loadNewNote}
            onChange={(event) => {
              setLoadNewNote(event.target.value);
              setLoadNoteAddMessage("");
            }}
            className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
          />
        </label>
        <button
          type="button"
          disabled={
            loadNoteAddPending || !loadNewNote.trim() || !selectedLoadId
          }
          onClick={async () => {
            if (
              loadNoteAddPending ||
              !loadNewNote.trim() ||
              !selectedLoadId
            ) {
              return;
            }

            setLoadNoteAddPending(true);
            setLoadNoteAddMessage("");
            const result = await addInboundLoadNote(
              selectedLoadId,
              loadNewNote,
            );

            if (!result.ok) {
              setLoadNoteAddPending(false);
              setLoadNoteAddMessage(result.message);
              return;
            }

            setLoadNewNote("");
            setLoadNoteAddPending(false);

            const notes = await loadNotesInboundLoad(selectedLoadId);
            setLoadNotesRows(notes.rows);
            setLoadNotesMessage(notes.ok ? "" : notes.message);

            if (selectedLiftBlendGroupKey) {
              const load = await loadInboundLoad(
                selectedLiftBlendGroupKey,
                selectedLiftBlendGroupKeyLift,
              );
              setLoadRows(load.rows);
              setLoadMessage(load.ok ? "" : load.message);
            }
          }}
          className="mt-3 rounded border border-zinc-800 bg-zinc-800 px-3 py-1 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:border-zinc-200 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {loadNoteAddPending ? "Adding…" : "Add"}
        </button>
        {loadNoteAddMessage ? (
          <p className="mt-2 text-sm text-red-700 dark:text-red-400">
            {loadNoteAddMessage}
          </p>
        ) : null}
      </InboundCostDialog>
      <InboundCostDialog
        open={transportChannelOpen && selectedLoadId !== ""}
        title="Transport Channel Details"
        panelClassName="max-w-2xl"
        onClose={() => {
          setTransportChannelOpen(false);
          setTransportChannelMode("add");
          setTransportChannelId("");
          setTransportChannelPrefill(null);
        }}
      >
        <label
          className="flex w-full flex-col gap-1"
          htmlFor="transport-description"
        >
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Description
          </span>
          <input
            id="transport-description"
            name="Description"
            type="text"
            value={transportDescription}
            onChange={(event) => setTransportDescription(event.target.value)}
            className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
          />
        </label>
        {[
          {
            id: "transport-company",
            label: "Transport Company",
            value: transportCompanyId,
            onChange: setTransportCompanyId,
            options: transportCompanies,
          },
          {
            id: "truck-driver",
            label: "Truck Driver",
            value: truckDriverId,
            onChange: setTruckDriverId,
            options: truckDrivers,
            disabled: transportCompanyId === SELECT_LOOKUP.id,
          },
          {
            id: "truck",
            label: "Truck",
            value: truckId,
            onChange: setTruckId,
            options: trucks,
            disabled: transportCompanyId === SELECT_LOOKUP.id,
          },
          {
            id: "truck-trailer",
            label: "Truck Trailer",
            value: truckTrailerId,
            onChange: setTruckTrailerId,
            options: truckTrailers,
            disabled: transportCompanyId === SELECT_LOOKUP.id,
          },
        ].map((field) => (
          <label
            key={field.id}
            className="mt-4 flex w-full flex-col gap-1"
            htmlFor={field.id}
          >
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {field.label}
            </span>
            <select
              id={field.id}
              name={field.label}
              value={field.value}
              onChange={(event) => field.onChange(event.target.value)}
              disabled={field.disabled}
              className="rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 disabled:opacity-50"
            >
              <option value={SELECT_LOOKUP.id}>{SELECT_LOOKUP.label}</option>
              {field.options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ))}
        {transportLookupsMessage ? (
          <p className="mt-3 text-sm text-red-700 dark:text-red-400">
            {transportLookupsMessage}
          </p>
        ) : null}
        <div className="mt-6 flex items-center gap-3">
          {transportChannelMode === "add" ? (
            <button
              type="button"
              disabled={transportAddPending || !selectedLoadId}
              onClick={async () => {
                if (transportAddPending || !selectedLoadId) {
                  return;
                }

                const formError = transportChannelFormError(
                  transportDescription,
                  transportCompanyId,
                );

                if (formError) {
                  setTransportAddMessage(formError);
                  return;
                }

                setTransportAddPending(true);
                setTransportAddMessage("");
                const result = await addTransportChannel({
                  loadId: selectedLoadId,
                  description: transportDescription,
                  transportCompanyId,
                  truckDriverId,
                  truckId,
                  truckTrailerId,
                });

                if (!result.ok) {
                  setTransportAddPending(false);
                  setTransportAddMessage(result.message);
                  return;
                }

                setTransportAddPending(false);
                setTransportChannelOpen(false);
                setTransportChannelMode("add");
                setTransportChannelId("");
                setTransportChannelPrefill(null);

                if (selectedLiftBlendGroupKey) {
                  const load = await loadInboundLoad(
                    selectedLiftBlendGroupKey,
                    selectedLiftBlendGroupKeyLift,
                  );
                  setLoadRows(load.rows);
                  setLoadMessage(load.ok ? "" : load.message);
                }
              }}
              className="rounded bg-navy-950 px-4 py-2 text-sm font-medium text-white hover:bg-navy-900 disabled:opacity-50"
            >
              {transportAddPending ? "Adding…" : "Add"}
            </button>
          ) : null}
          {transportChannelMode === "change" ? (
            <button
              type="button"
              disabled={transportAddPending || !selectedLoadId}
              onClick={async () => {
                if (transportAddPending || !selectedLoadId) {
                  return;
                }

                const formError = transportChannelFormError(
                  transportDescription,
                  transportCompanyId,
                );

                if (formError) {
                  setTransportAddMessage(formError);
                  return;
                }

                if (!transportChannelId) {
                  setTransportAddMessage("Select a transport channel.");
                  return;
                }

                setTransportAddPending(true);
                setTransportAddMessage("");
                const result = await updateTransportChannel({
                  id: transportChannelId,
                  loadId: selectedLoadId,
                  description: transportDescription,
                  transportCompanyId,
                  truckDriverId,
                  truckId,
                  truckTrailerId,
                });

                if (!result.ok) {
                  setTransportAddPending(false);
                  setTransportAddMessage(result.message);
                  return;
                }

                setTransportAddPending(false);
                setTransportChannelOpen(false);
                setTransportChannelMode("add");
                setTransportChannelId("");
                setTransportChannelPrefill(null);
                setTransportHoverLoadId("");

                if (selectedLiftBlendGroupKey) {
                  const load = await loadInboundLoad(
                    selectedLiftBlendGroupKey,
                    selectedLiftBlendGroupKeyLift,
                  );
                  setLoadRows(load.rows);
                  setLoadMessage(load.ok ? "" : load.message);
                }
              }}
              className="rounded bg-gold-600 px-4 py-2 text-sm font-medium text-white hover:bg-gold-500 disabled:opacity-50"
            >
              {transportAddPending ? "Saving…" : "Change"}
            </button>
          ) : null}
        </div>
        {transportAddMessage ? (
          <p className="mt-2 text-sm text-red-700 dark:text-red-400">
            {transportAddMessage}
          </p>
        ) : null}
      </InboundCostDialog>
      <InboundCostDialog
        open={liftDocsOpen && selectedLiftId !== ""}
        title="Inbound Lift Documents"
        onClose={() => {
          setLiftDocsOpen(false);
          setUploadFile(null);
          setUploadMessage("");
        }}
      >
        <InboundGrid
          title=""
          rows={liftDocsRows}
          message={liftDocsMessage}
          pending={liftDocsPending}
          columnLabels={[]}
          dateTimeLabels={["Uploaded", "created_at"]}
          showViewButton
          showDeleteButton
          onDeleteFile={(target) => {
            setDeleteTarget(target);
            setDeletePending(false);
            setDeleteMessage("");
          }}
          onViewFile={async (filePath) => {
            setViewerOpen(true);
            setViewerUrl("");
            setViewerName("");
            setViewerMessage("");
            const result = await getDocumentFileUrl(filePath);

            if (result.ok) {
              setViewerUrl(result.url);
              setViewerName(result.fileName ?? "");
              return;
            }

            setViewerMessage(result.message);
          }}
        />
        <label
          className="mt-4 flex w-full max-w-md flex-col gap-1"
          htmlFor="lift-document-type"
        >
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Document Type
          </span>
          <select
            id="lift-document-type"
            name="lift-document-type"
            value={documentTypeId}
            onChange={(event) => setDocumentTypeId(event.target.value)}
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
          >
            <option value={SELECT_DOCUMENT_TYPE.id}>
              {SELECT_DOCUMENT_TYPE.label}
            </option>
            {documentTypes.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {documentTypesMessage ? (
          <p className="mt-2 text-sm text-red-700 dark:text-red-400">
            {documentTypesMessage}
          </p>
        ) : null}
        <DocumentUpload
          file={uploadFile}
          onFile={(next) => {
            setUploadFile(next);
            setUploadMessage("");
          }}
          pending={uploadPending}
          message={uploadMessage}
          addDisabled={
            documentTypeId === SELECT_DOCUMENT_TYPE.id ||
            !uploadFile ||
            !selectedLiftId
          }
          onAdd={async () => {
            if (
              uploadLock.current ||
              uploadPending ||
              documentTypeId === SELECT_DOCUMENT_TYPE.id ||
              !uploadFile ||
              !selectedLiftId
            ) {
              return;
            }

            uploadLock.current = true;
            setUploadPending(true);
            setUploadMessage("");

            const formData = new FormData();
            formData.set("documentTypeId", documentTypeId);
            formData.set("liftId", selectedLiftId);
            formData.set("file", uploadFile);

            const result = await addInboundLiftDocument(formData);

            if (!result.ok) {
              uploadLock.current = false;
              setUploadPending(false);
              setUploadMessage(result.message);
              return;
            }

            setUploadFile(null);
            setUploadPending(false);

            const docs = await loadDocumentInboundLift(selectedLiftId);
            setLiftDocsRows(docs.rows);
            setLiftDocsMessage(docs.ok ? "" : docs.message);

            if (selectedBlendGroupKey) {
              const lift = await loadInboundLift(selectedBlendGroupKey);
              setLiftRows(lift.rows);
              setLiftMessage(lift.ok ? "" : lift.message);
            }

            uploadLock.current = false;
          }}
        />
      </InboundCostDialog>
      <InboundCostDialog
        open={liftNotesOpen && selectedLiftId !== ""}
        title="Inbound Lift Notes"
        onClose={() => {
          setLiftNotesOpen(false);
          setLiftNewNote("");
          setLiftNoteAddMessage("");
          setNoteTextOpen(false);
          setNoteText("");
        }}
      >
        <InboundGrid
          title=""
          rows={liftNotesRows}
          message={liftNotesMessage}
          pending={liftNotesPending}
          columnLabels={[]}
          dateTimeLabels={["Uploaded", "created_at"]}
          deleteIfCurrentUser
          currentUserId={userId}
          onNoteTextSelect={(text) => {
            setNoteText(text);
            setNoteTextOpen(true);
          }}
          onDeleteFile={async ({ id }) => {
            if (!id) {
              return;
            }

            setLiftNoteAddMessage("");
            const result = await deleteInboundLiftNote(id);

            if (!result.ok) {
              setLiftNoteAddMessage(result.message);
              return;
            }

            const notes = await loadNotesInboundLift(selectedLiftId);
            setLiftNotesRows(notes.rows);
            setLiftNotesMessage(notes.ok ? "" : notes.message);

            if (selectedBlendGroupKey) {
              const lift = await loadInboundLift(selectedBlendGroupKey);
              setLiftRows(lift.rows);
              setLiftMessage(lift.ok ? "" : lift.message);
            }
          }}
        />
        <label
          className="mt-4 flex w-full flex-col gap-1"
          htmlFor="lift-new-note"
        >
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            New Note
          </span>
          <textarea
            id="lift-new-note"
            name="New Note"
            rows={4}
            value={liftNewNote}
            onChange={(event) => {
              setLiftNewNote(event.target.value);
              setLiftNoteAddMessage("");
            }}
            className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
          />
        </label>
        <button
          type="button"
          disabled={
            liftNoteAddPending || !liftNewNote.trim() || !selectedLiftId
          }
          onClick={async () => {
            if (
              liftNoteAddPending ||
              !liftNewNote.trim() ||
              !selectedLiftId
            ) {
              return;
            }

            setLiftNoteAddPending(true);
            setLiftNoteAddMessage("");
            const result = await addInboundLiftNote(
              selectedLiftId,
              liftNewNote,
            );

            if (!result.ok) {
              setLiftNoteAddPending(false);
              setLiftNoteAddMessage(result.message);
              return;
            }

            setLiftNewNote("");
            setLiftNoteAddPending(false);

            const notes = await loadNotesInboundLift(selectedLiftId);
            setLiftNotesRows(notes.rows);
            setLiftNotesMessage(notes.ok ? "" : notes.message);

            if (selectedBlendGroupKey) {
              const lift = await loadInboundLift(selectedBlendGroupKey);
              setLiftRows(lift.rows);
              setLiftMessage(lift.ok ? "" : lift.message);
            }
          }}
          className="mt-3 rounded border border-zinc-800 bg-zinc-800 px-3 py-1 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:border-zinc-200 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {liftNoteAddPending ? "Adding…" : "Add"}
        </button>
        {liftNoteAddMessage ? (
          <p className="mt-2 text-sm text-red-700 dark:text-red-400">
            {liftNoteAddMessage}
          </p>
        ) : null}
      </InboundCostDialog>
      <InboundCostDialog
        open={notesOpen}
        title="Inbound Stock Item Tracking Notes"
        onClose={() => {
          setNotesOpen(false);
          setNewNote("");
          setNoteAddMessage("");
          setNoteTextOpen(false);
          setNoteText("");
        }}
      >
        <InboundGrid
          title=""
          rows={notesRows}
          message={notesMessage}
          pending={notesPending}
          columnLabels={[]}
          dateTimeLabels={["Uploaded", "created_at"]}
          deleteIfCurrentUser
          currentUserId={userId}
          onNoteTextSelect={(text) => {
            setNoteText(text);
            setNoteTextOpen(true);
          }}
          onDeleteFile={async ({ id }) => {
            if (!id) {
              return;
            }

            setNoteAddMessage("");
            const result = await deleteInboundNote(id);

            if (!result.ok) {
              setNoteAddMessage(result.message);
              return;
            }

            const notes = await loadNotesInboundStockItemTracking(
              selectedTrackingId,
            );
            setNotesRows(notes.rows);
            setNotesMessage(notes.ok ? "" : notes.message);

            if (selectedTradeId) {
              const tracking = await loadInboundItemTracking(selectedTradeId);
              setTrackingRows(tracking.rows);
              setTrackingMessage(tracking.ok ? "" : tracking.message);
            }
          }}
        />
        <label
          className="mt-4 flex w-full flex-col gap-1"
          htmlFor="new-note"
        >
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            New Note
          </span>
          <textarea
            id="new-note"
            name="New Note"
            rows={4}
            value={newNote}
            onChange={(event) => {
              setNewNote(event.target.value);
              setNoteAddMessage("");
            }}
            className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
          />
        </label>
        <button
          type="button"
          disabled={noteAddPending || !newNote.trim() || !selectedTrackingId}
          onClick={async () => {
            if (noteAddPending || !newNote.trim() || !selectedTrackingId) {
              return;
            }

            setNoteAddPending(true);
            setNoteAddMessage("");
            const result = await addInboundNote(selectedTrackingId, newNote);

            if (!result.ok) {
              setNoteAddPending(false);
              setNoteAddMessage(result.message);
              return;
            }

            setNewNote("");
            setNoteAddPending(false);

            const notes = await loadNotesInboundStockItemTracking(
              selectedTrackingId,
            );
            setNotesRows(notes.rows);
            setNotesMessage(notes.ok ? "" : notes.message);

            if (selectedTradeId) {
              const tracking = await loadInboundItemTracking(selectedTradeId);
              setTrackingRows(tracking.rows);
              setTrackingMessage(tracking.ok ? "" : tracking.message);
            }
          }}
          className="mt-3 rounded border border-zinc-800 bg-zinc-800 px-3 py-1 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:border-zinc-200 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {noteAddPending ? "Adding…" : "Add"}
        </button>
        {noteAddMessage ? (
          <p className="mt-2 text-sm text-red-700 dark:text-red-400">
            {noteAddMessage}
          </p>
        ) : null}
      </InboundCostDialog>
      <InboundCostDialog
        open={noteTextOpen}
        title="Note"
        zClass="z-[70]"
        panelClassName="max-w-2xl"
        nested
        onClose={() => {
          setNoteTextOpen(false);
          setNoteText("");
        }}
      >
        <p className="whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">
          {noteText || ""}
        </p>
      </InboundCostDialog>
      <InboundCostDialog
        open={docsOpen}
        title="Inbound Stock Item Tracking Documents"
        onClose={() => {
          setDocsOpen(false);
          setUploadFile(null);
          setUploadMessage("");
        }}
      >
        <InboundGrid
          title=""
          rows={docsRows}
          message={docsMessage}
          pending={docsPending}
          columnLabels={[]}
          showViewButton
          showDeleteButton
          onDeleteFile={(target) => {
            setDeleteTarget(target);
            setDeletePending(false);
            setDeleteMessage("");
          }}
          onViewFile={async (filePath) => {
            setViewerOpen(true);
            setViewerUrl("");
            setViewerName("");
            setViewerMessage("");
            const result = await getDocumentFileUrl(filePath);

            if (result.ok) {
              setViewerUrl(result.url);
              setViewerName(result.fileName ?? "");
              return;
            }

            setViewerMessage(result.message);
          }}
        />
        <label
          className="mt-4 flex w-full max-w-md flex-col gap-1"
          htmlFor="document-type"
        >
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Document Type
          </span>
          <select
            id="document-type"
            name="document-type"
            value={documentTypeId}
            onChange={(event) => setDocumentTypeId(event.target.value)}
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
          >
            <option value={SELECT_DOCUMENT_TYPE.id}>
              {SELECT_DOCUMENT_TYPE.label}
            </option>
            {documentTypes.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {documentTypesMessage ? (
          <p className="mt-2 text-sm text-red-700 dark:text-red-400">
            {documentTypesMessage}
          </p>
        ) : null}
        <DocumentUpload
          file={uploadFile}
          onFile={(next) => {
            setUploadFile(next);
            setUploadMessage("");
          }}
          pending={uploadPending}
          message={uploadMessage}
          addDisabled={
            documentTypeId === SELECT_DOCUMENT_TYPE.id ||
            !uploadFile ||
            !selectedTrackingId
          }
          onAdd={async () => {
            if (
              uploadLock.current ||
              uploadPending ||
              documentTypeId === SELECT_DOCUMENT_TYPE.id ||
              !uploadFile ||
              !selectedTrackingId
            ) {
              return;
            }

            uploadLock.current = true;
            setUploadPending(true);
            setUploadMessage("");

            const formData = new FormData();
            formData.set("documentTypeId", documentTypeId);
            formData.set("trackingId", selectedTrackingId);
            formData.set("file", uploadFile);

            const result = await addInboundDocument(formData);

            if (!result.ok) {
              uploadLock.current = false;
              setUploadPending(false);
              setUploadMessage(result.message);
              return;
            }

            setUploadFile(null);
            setUploadPending(false);

            const docs = await loadDocumentDetails(selectedTrackingId);
            setDocsRows(docs.rows);
            setDocsMessage(docs.ok ? "" : docs.message);

            if (selectedTradeId) {
              const tracking = await loadInboundItemTracking(selectedTradeId);
              setTrackingRows(tracking.rows);
              setTrackingMessage(tracking.ok ? "" : tracking.message);
            }

            uploadLock.current = false;
          }}
        />
      </InboundCostDialog>
      <ConfirmDialog
        open={Boolean(voidStatusPendingId)}
        title="Warning"
        message={
          "If you change the status to 'Void', you will not be able to undo it. The Statuses in the relevant Lifts and Loads will also be 'Void'.\nDo you want to continue?"
        }
        onCancel={() => setVoidStatusPendingId("")}
        onConfirm={() => {
          const nextStatusId = voidStatusPendingId;
          setVoidStatusPendingId("");
          if (!nextStatusId) {
            return;
          }

          setTrackingEdit((current) =>
            current ? { ...current, statusId: nextStatusId } : current,
          );
          setTrackingCommitMessage("");
        }}
      />
      <DocumentDeleteConfirm
        open={Boolean(deleteTarget)}
        pending={deletePending}
        message={deleteMessage}
        onCancel={() => {
          if (deletePending) {
            return;
          }

          setDeleteTarget(null);
          setDeleteMessage("");
        }}
        onConfirm={async () => {
          if (!deleteTarget || deletePending) {
            return;
          }

          setDeletePending(true);
          setDeleteMessage("");
          const result = await deleteDocument(
            deleteTarget.id,
            deleteTarget.filePath,
          );

          if (!result.ok) {
            setDeletePending(false);
            setDeleteMessage(result.message);
            return;
          }

          setDeleteTarget(null);
          setDeletePending(false);
          setViewerOpen(false);
          setViewerUrl("");
          setViewerName("");
          setViewerMessage("");

          if (loadDocsOpen && selectedLoadId) {
            const docs = await loadDocumentInboundLoad(selectedLoadId);
            setLoadDocsRows(docs.rows);
            setLoadDocsMessage(docs.ok ? "" : docs.message);

            if (selectedLiftBlendGroupKey) {
              const load = await loadInboundLoad(
                selectedLiftBlendGroupKey,
                selectedLiftBlendGroupKeyLift,
              );
              setLoadRows(load.rows);
              setLoadMessage(load.ok ? "" : load.message);
            }

            return;
          }

          if (liftDocsOpen && selectedLiftId) {
            const docs = await loadDocumentInboundLift(selectedLiftId);
            setLiftDocsRows(docs.rows);
            setLiftDocsMessage(docs.ok ? "" : docs.message);

            if (selectedBlendGroupKey) {
              const lift = await loadInboundLift(selectedBlendGroupKey);
              setLiftRows(lift.rows);
              setLiftMessage(lift.ok ? "" : lift.message);
            }

            return;
          }

          const docs = await loadDocumentDetails(selectedTrackingId);
          setDocsRows(docs.rows);
          setDocsMessage(docs.ok ? "" : docs.message);

          if (selectedTradeId) {
            const tracking = await loadInboundItemTracking(selectedTradeId);
            setTrackingRows(tracking.rows);
            setTrackingMessage(tracking.ok ? "" : tracking.message);
          }
        }}
      />
      <DocumentFileViewer
        open={viewerOpen}
        url={viewerUrl}
        fileName={viewerName}
        message={viewerMessage}
        onClose={() => {
          setViewerOpen(false);
          setViewerUrl("");
          setViewerName("");
          setViewerMessage("");
        }}
      />
      <InboundCostDialog
        open={costOpen}
        panelClassName="max-w-[96rem]"
        onClose={() => {
          setCostOpen(false);
          setCostDraft(null);
          setCostCommitMessage("");
          setCostNotesOpen(false);
          setSelectedCostId("");
        }}
        headerExtra={
          costDraft ? null : (
            <button
              type="button"
              disabled={costPending}
              onClick={() => {
                setCostDraft(emptyCostDraft());
                setCostCommitMessage("");
              }}
              className="text-sm font-medium text-blue-900 underline disabled:opacity-50 dark:text-blue-300"
            >
              Add Cost
            </button>
          )
        }
      >
        <InboundGrid
          title=""
          rows={costRows}
          message={costMessage}
          pending={costPending}
          columnLabels={COST_COLUMN_LABELS}
          dateLabels={["Cost Date", "cost_date"]}
          numericLabels={[
            "Amount",
            "Qty",
            "Amt Per Litre",
            "amount",
            "qty",
            "amount_per_liter",
          ]}
          onNotesSelect={(id) => {
            setSelectedCostId(id);
            setCostNotesOpen(true);
          }}
          draftRow={costDraft}
          costTypeOptions={costTypes}
          selectCostTypeOption={SELECT_COST_TYPE}
          draftPending={costCommitPending}
          onDraftChange={(patch) => {
            setCostDraft((current) => ({
              ...(current ?? emptyCostDraft()),
              ...patch,
            }));
            setCostCommitMessage("");
          }}
          onCommitDraft={async () => {
            if (!costDraft || costCommitPending || !selectedTrackingId) {
              return;
            }

            const amountValue = Number(
              String(costDraft.amount).trim().replace(",", "."),
            );
            const qtyValue = Number(
              String(costDraft.qty).trim().replace(",", "."),
            );

            if (
              !Number.isFinite(amountValue) ||
              amountValue <= 0 ||
              !Number.isFinite(qtyValue) ||
              qtyValue <= 0
            ) {
              setCostCommitMessage(
                "The Amount as well as the Qty must be greater than Zero.",
              );
              return;
            }

            setCostCommitPending(true);
            setCostCommitMessage("");
            const result = await addInboundCost({
              costTypeId: costDraft.costTypeId,
              description: costDraft.description,
              amount: costDraft.amount,
              trackingId: selectedTrackingId,
              qty: costDraft.qty,
              costDate: costDraft.costDate,
              blendGroupingKey: blendGroupingKey(
                trackingRows,
                selectedTrackingId,
              ),
            });

            if (!result.ok) {
              setCostCommitPending(false);
              setCostCommitMessage(result.message);
              return;
            }

            setCostDraft(null);
            setCostCommitPending(false);
            const costs = await loadInboundCost(selectedTrackingId);
            setCostRows(costs.rows);
            setCostMessage(costs.ok ? "" : costs.message);
          }}
        />
        {costTypesMessage ? (
          <p className="mt-2 text-sm text-red-700 dark:text-red-400">
            {costTypesMessage}
          </p>
        ) : null}
        {costCommitMessage ? (
          <p className="mt-2 text-sm text-red-700 dark:text-red-400">
            {costCommitMessage}
          </p>
        ) : null}
      </InboundCostDialog>
      <InboundCostDialog
        open={costNotesOpen}
        title="Inbound Cost Notes"
        zClass="z-[60]"
        nested
        onClose={() => {
          setCostNotesOpen(false);
          setSelectedCostId("");
          setCostNewNote("");
          setCostNoteAddMessage("");
          setNoteTextOpen(false);
          setNoteText("");
        }}
      >
        <InboundGrid
          title=""
          rows={costNotesRows}
          message={costNotesMessage}
          pending={costNotesPending}
          columnLabels={[]}
          dateTimeLabels={["Uploaded", "created_at"]}
          deleteIfCurrentUser
          currentUserId={userId}
          onNoteTextSelect={(text) => {
            setNoteText(text);
            setNoteTextOpen(true);
          }}
          onDeleteFile={async ({ id }) => {
            if (!id) {
              return;
            }

            setCostNoteAddMessage("");
            const result = await deleteInboundCostNote(id);

            if (!result.ok) {
              setCostNoteAddMessage(result.message);
              return;
            }

            const notes = await loadNotesInboundCost(selectedCostId);
            setCostNotesRows(notes.rows);
            setCostNotesMessage(notes.ok ? "" : notes.message);

            if (selectedTrackingId) {
              const costs = await loadInboundCost(selectedTrackingId);
              setCostRows(costs.rows);
              setCostMessage(costs.ok ? "" : costs.message);
            }
          }}
        />
        <label
          className="mt-4 flex w-full flex-col gap-1"
          htmlFor="cost-new-note"
        >
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            New Note
          </span>
          <textarea
            id="cost-new-note"
            name="New Note"
            rows={4}
            value={costNewNote}
            onChange={(event) => {
              setCostNewNote(event.target.value);
              setCostNoteAddMessage("");
            }}
            className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
          />
        </label>
        <button
          type="button"
          disabled={costNoteAddPending || !costNewNote.trim() || !selectedCostId}
          onClick={async () => {
            if (costNoteAddPending || !costNewNote.trim() || !selectedCostId) {
              return;
            }

            setCostNoteAddPending(true);
            setCostNoteAddMessage("");
            const result = await addInboundCostNote(selectedCostId, costNewNote);

            if (!result.ok) {
              setCostNoteAddPending(false);
              setCostNoteAddMessage(result.message);
              return;
            }

            setCostNewNote("");
            setCostNoteAddPending(false);

            const notes = await loadNotesInboundCost(selectedCostId);
            setCostNotesRows(notes.rows);
            setCostNotesMessage(notes.ok ? "" : notes.message);

            if (selectedTrackingId) {
              const costs = await loadInboundCost(selectedTrackingId);
              setCostRows(costs.rows);
              setCostMessage(costs.ok ? "" : costs.message);
            }
          }}
          className="mt-3 rounded border border-zinc-800 bg-zinc-800 px-3 py-1 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:border-zinc-200 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {costNoteAddPending ? "Adding…" : "Add"}
        </button>
        {costNoteAddMessage ? (
          <p className="mt-2 text-sm text-red-700 dark:text-red-400">
            {costNoteAddMessage}
          </p>
        ) : null}
      </InboundCostDialog>
    </div>
  );
}

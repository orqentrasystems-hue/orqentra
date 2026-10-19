"use server";

import { cookies } from "next/headers";
import { NAV_APP_COOKIE, NAV_PAGE_COOKIE } from "@/lib/nav-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function toInteger(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  const text = String(value ?? "").trim();
  return /^-?\d+$/.test(text) ? Number(text) : NaN;
}

function toRows(data) {
  if (data == null) {
    return [];
  }

  const values = Array.isArray(data) ? data : [data];

  return values.map((row) => {
    if (row && typeof row === "object" && !Array.isArray(row)) {
      return row;
    }

    return { value: row };
  });
}

function fieldFromRow(row, names) {
  if (!row || typeof row !== "object") {
    return "";
  }

  for (const name of names) {
    const match = Object.keys(row).find(
      (key) => key.toLowerCase() === name.toLowerCase(),
    );
    const value = match ? row[match] : undefined;

    if (value != null && String(value).trim() !== "") {
      return String(value);
    }
  }

  return "";
}

function toSelectOptions(data) {
  return toRows(data)
    .map((row, index) => {
      const label = fieldFromRow(row, [
        "descr",
        "description",
        "name",
        "document_type",
        "value",
        "product_name",
        "company_name",
        "port",
        "currency",
        "code",
        "iso_code",
        "unit",
        "lift_status",
        "load_status",
        "status",
        "collection_point",
        "collection_point_name",
      ]);
      const id = fieldFromRow(row, [
        "id",
        "status_id",
        "lift_status_id",
        "load_status_id",
        "document_type_id",
        "cost_type_id",
        "product_id",
        "unit_of_measure_id",
        "supplier_id",
        "port_id",
        "currency_id",
        "collection_point_id",
      ]) || label || String(index);

      return { id, label: label || id };
    })
    .filter((option) => option.id !== "");
}

function toJoinedSelectOptions(data, labelKeys) {
  return toRows(data)
    .map((row) => {
      const id = fieldFromRow(row, ["id"]);
      const label = labelKeys
        .map((key) => fieldFromRow(row, [key]))
        .filter((part) => part !== "")
        .join(" ");

      return { id, label: label || id };
    })
    .filter((option) => option.id !== "");
}

export async function loadInboundTrades(ids) {
  const cookieStore = await cookies();
  const appName = cookieStore.get(NAV_APP_COOKIE)?.value ?? "";
  const allowedPage = cookieStore.get(NAV_PAGE_COOKIE)?.value ?? "";

  if (!appName || allowedPage !== "inbound") {
    return { ok: false, message: "Open Inbound from the app menu.", rows: [] };
  }

  const tradeStatusIds = (Array.isArray(ids) ? ids : [])
    .map(toInteger)
    .filter((id) => Number.isInteger(id));

  try {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getClaims();

    if (!session?.claims) {
      return { ok: false, message: "You must be logged on.", rows: [] };
    }

    const { data, error } = await supabase.rpc("pr_inbound_trade", {
      trade_status_ids: tradeStatusIds,
    });

    if (error) {
      return { ok: false, message: error.message, rows: [] };
    }

    return {
      ok: true,
      message: "",
      rows: JSON.parse(JSON.stringify(toRows(data))),
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not load trades.",
      rows: [],
    };
  }
}

export async function loadSaleableVolumeSplit(tradeId) {
  const cookieStore = await cookies();
  const appName = cookieStore.get(NAV_APP_COOKIE)?.value ?? "";
  const allowedPage = cookieStore.get(NAV_PAGE_COOKIE)?.value ?? "";

  if (!appName || allowedPage !== "inbound") {
    return { ok: false, message: "Open Inbound from the app menu.", rows: [] };
  }

  const inboundTradeId = toBigIntParam(tradeId);

  if (inboundTradeId == null || inboundTradeId === "") {
    return { ok: false, message: "Missing trade id.", rows: [] };
  }

  try {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getClaims();

    if (!session?.claims) {
      return { ok: false, message: "You must be logged on.", rows: [] };
    }

    const { data, error } = await supabase.rpc("pr_rpt_saleable_volume_split", {
      p_trade_id: inboundTradeId,
    });

    if (error) {
      return { ok: false, message: error.message, rows: [] };
    }

    return {
      ok: true,
      message: "",
      rows: JSON.parse(JSON.stringify(toRows(data))),
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Could not load saleable volume split.",
      rows: [],
    };
  }
}

export async function addInboundTrade(description) {
  const cookieStore = await cookies();
  const appName = cookieStore.get(NAV_APP_COOKIE)?.value ?? "";
  const allowedPage = cookieStore.get(NAV_PAGE_COOKIE)?.value ?? "";

  if (!appName || allowedPage !== "inbound") {
    return { ok: false, message: "Open Inbound from the app menu." };
  }

  try {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getClaims();

    if (!session?.claims) {
      return { ok: false, message: "You must be logged on." };
    }

    const { error } = await supabase.rpc("pi_inbound_trade", {
      p_descr: String(description ?? ""),
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true, message: "" };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not add the trade.",
    };
  }
}

export async function addInboundItemTracking({
  inboundTradeId,
  productId,
  unitOfMeasureId,
  qty,
  purchaseDate,
  itemTrackingStatusId,
  statusDate,
  supplierId,
  portId,
  supplierInvoiceNumber,
  supplierInvoiceAmount,
  currencyId,
  ethanolBlendPercentage,
}) {
  const cookieStore = await cookies();
  const appName = cookieStore.get(NAV_APP_COOKIE)?.value ?? "";
  const allowedPage = cookieStore.get(NAV_PAGE_COOKIE)?.value ?? "";

  if (!appName || allowedPage !== "inbound") {
    return { ok: false, message: "Open Inbound from the app menu." };
  }

  const tradeId = toBigIntParam(inboundTradeId);
  const nextProductId = toBigIntParam(productId);
  const nextUnitId = toInteger(unitOfMeasureId);
  const qtyValue = toNumeric(qty);
  const nextStatusId = toInteger(itemTrackingStatusId);
  const nextSupplierId = toInteger(supplierId);
  const nextPortId = toInteger(portId);
  const nextCurrencyId = toInteger(currencyId);
  const ethanolValue = toNumeric(ethanolBlendPercentage);
  const invoiceAmount = toNumeric(supplierInvoiceAmount);
  const nextPurchaseDate = String(purchaseDate ?? "").trim();
  const nextStatusDate = String(statusDate ?? "").trim();

  if (tradeId == null) {
    return { ok: false, message: "Select a trade." };
  }

  if (nextProductId == null || nextProductId === 0) {
    return { ok: false, message: "Select a product." };
  }

  if (!Number.isInteger(nextUnitId) || nextUnitId === 0) {
    return { ok: false, message: "Select a unit." };
  }

  if (!Number.isFinite(qtyValue) || qtyValue <= 0) {
    return { ok: false, message: "Qty must be greater than zero." };
  }

  if (Number.isFinite(ethanolValue) && (ethanolValue < 0 || ethanolValue > 100)) {
    return { ok: false, message: "E. % must be between 0 and 100." };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(nextPurchaseDate)) {
    return { ok: false, message: "Select a purchase date." };
  }

  if (!Number.isInteger(nextStatusId) || nextStatusId === 0) {
    return { ok: false, message: "Select a status." };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(nextStatusDate)) {
    return { ok: false, message: "Select a status date." };
  }

  if (!Number.isInteger(nextSupplierId) || nextSupplierId === 0) {
    return { ok: false, message: "Select a company." };
  }

  if (!Number.isInteger(nextPortId) || nextPortId === 0) {
    return { ok: false, message: "Select a port." };
  }

  if (!Number.isInteger(nextCurrencyId) || nextCurrencyId === 0) {
    return { ok: false, message: "Select a currency." };
  }

  try {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getClaims();

    if (!session?.claims) {
      return { ok: false, message: "You must be logged on." };
    }

    const userId =
      session.claims.sub ?? (await supabase.auth.getUser()).data.user?.id;

    if (!userId) {
      return { ok: false, message: "You must be logged on." };
    }

    const { error } = await supabase.rpc("pi_inbound_stock_item_tracking", {
      p_inbound_trade_id: tradeId,
      p_product_id: nextProductId,
      p_unit_of_measure_id: nextUnitId,
      p_qty: qtyValue,
      p_purchase_date: nextPurchaseDate,
      p_item_tracking_status_id: nextStatusId,
      p_status_date: nextStatusDate,
      p_supplier_id: nextSupplierId,
      p_port_id: nextPortId,
      p_supplier_invoice_number: String(supplierInvoiceNumber ?? ""),
      p_supplier_invoice_amount: Number.isFinite(invoiceAmount)
        ? invoiceAmount
        : 0,
      p_currency_id: nextCurrencyId,
      p_ethanol_blend_percentage: Number.isFinite(ethanolValue)
        ? ethanolValue
        : 0,
      p_blend_grouping_key: 0,
      p_user_id: userId,
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true, message: "" };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Could not add the tracking item.",
    };
  }
}

export async function updateInboundItemTracking({
  id,
  productId,
  qty,
  purchaseDate,
  itemTrackingStatusId,
  statusDate,
  supplierId,
  portId,
  supplierInvoiceNumber,
  supplierInvoiceAmount,
  currencyId,
  ethanolBlendPercentage,
}) {
  const cookieStore = await cookies();
  const appName = cookieStore.get(NAV_APP_COOKIE)?.value ?? "";
  const allowedPage = cookieStore.get(NAV_PAGE_COOKIE)?.value ?? "";

  if (!appName || allowedPage !== "inbound") {
    return { ok: false, message: "Open Inbound from the app menu." };
  }

  const trackingId = toBigIntParam(id);
  const nextProductId = toBigIntParam(productId);
  const qtyValue = toNumeric(qty);
  const nextStatusId = toInteger(itemTrackingStatusId);
  const nextSupplierId = toInteger(supplierId);
  const nextPortId = toInteger(portId);
  const nextCurrencyId = toInteger(currencyId);
  const ethanolValue = toNumeric(ethanolBlendPercentage);
  const invoiceAmount = toNumeric(supplierInvoiceAmount);
  const nextPurchaseDate = String(purchaseDate ?? "").trim();
  const nextStatusDate = String(statusDate ?? "").trim();

  if (trackingId == null) {
    return { ok: false, message: "Select a tracking item." };
  }

  if (nextProductId == null || nextProductId === 0) {
    return { ok: false, message: "Select a product." };
  }

  if (!Number.isFinite(qtyValue) || qtyValue <= 0) {
    return { ok: false, message: "Qty must be greater than zero." };
  }

  if (Number.isFinite(ethanolValue) && (ethanolValue < 0 || ethanolValue > 100)) {
    return { ok: false, message: "E. % must be between 0 and 100." };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(nextPurchaseDate)) {
    return { ok: false, message: "Select a purchase date." };
  }

  if (!Number.isInteger(nextStatusId) || nextStatusId === 0) {
    return { ok: false, message: "Select a status." };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(nextStatusDate)) {
    return { ok: false, message: "Select a status date." };
  }

  if (!Number.isInteger(nextSupplierId) || nextSupplierId === 0) {
    return { ok: false, message: "Select a company." };
  }

  if (!Number.isInteger(nextPortId) || nextPortId === 0) {
    return { ok: false, message: "Select a port." };
  }

  if (!Number.isInteger(nextCurrencyId) || nextCurrencyId === 0) {
    return { ok: false, message: "Select a currency." };
  }

  try {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getClaims();

    if (!session?.claims) {
      return { ok: false, message: "You must be logged on." };
    }

    const userId =
      session.claims.sub ?? (await supabase.auth.getUser()).data.user?.id;

    if (!userId) {
      return { ok: false, message: "You must be logged on." };
    }

    const { error } = await supabase.rpc("pu_inbound_stock_item_tracking", {
      p_id: trackingId,
      p_product_id: nextProductId,
      p_qty: qtyValue,
      p_purchase_date: nextPurchaseDate,
      p_item_tracking_status_id: nextStatusId,
      p_status_date: nextStatusDate,
      p_supplier_id: nextSupplierId,
      p_port_id: nextPortId,
      p_supplier_invoice_number: String(supplierInvoiceNumber ?? ""),
      p_supplier_invoice_amount: Number.isFinite(invoiceAmount)
        ? invoiceAmount
        : 0,
      p_currency_id: nextCurrencyId,
      p_ethanol_blend_percentage: Number.isFinite(ethanolValue)
        ? ethanolValue
        : 0,
      p_user_id: userId,
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true, message: "" };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Could not update the tracking item.",
    };
  }
}

export async function updateInboundTrade({
  inboundTradeId,
  description,
  tradeStatusId,
}) {
  const cookieStore = await cookies();
  const appName = cookieStore.get(NAV_APP_COOKIE)?.value ?? "";
  const allowedPage = cookieStore.get(NAV_PAGE_COOKIE)?.value ?? "";

  if (!appName || allowedPage !== "inbound") {
    return { ok: false, message: "Open Inbound from the app menu." };
  }

  const tradeId = toBigIntParam(inboundTradeId);
  const statusId = toInteger(tradeStatusId);

  if (tradeId == null) {
    return { ok: false, message: "Select a trade." };
  }

  if (!Number.isInteger(statusId) || statusId === 0) {
    return { ok: false, message: "Select a trade status." };
  }

  try {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getClaims();

    if (!session?.claims) {
      return { ok: false, message: "You must be logged on." };
    }

    const { error } = await supabase.rpc("pu_inbound_trade", {
      p_inbound_trade_id: tradeId,
      p_descr: String(description ?? ""),
      p_trade_status_id: statusId,
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true, message: "" };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Could not update the trade.",
    };
  }
}

function toAllowValue(data) {
  if (data == null) {
    return 0;
  }

  if (typeof data === "bigint") {
    return Number(data);
  }

  if (typeof data === "number" && Number.isFinite(data)) {
    return Math.trunc(data);
  }

  if (typeof data === "boolean") {
    return data ? 1 : 0;
  }

  const text = String(data).trim();

  if (/^-?\d+$/.test(text)) {
    return Number(text);
  }

  if (Array.isArray(data)) {
    return toAllowValue(data[0]);
  }

  if (typeof data === "object") {
    return toAllowValue(
      data.pr_allow_action ?? data.value ?? Object.values(data)[0],
    );
  }

  return 0;
}

export async function loadAllowAction(functionId, appId) {
  const cookieStore = await cookies();
  const appName = cookieStore.get(NAV_APP_COOKIE)?.value ?? "";
  const allowedPage = cookieStore.get(NAV_PAGE_COOKIE)?.value ?? "";

  if (!appName || allowedPage !== "inbound") {
    return { ok: false, message: "Open Inbound from the app menu.", value: 0 };
  }

  const nextFunctionId = toInteger(functionId);
  const nextAppId = toInteger(appId);

  if (!Number.isInteger(nextFunctionId) || !Number.isInteger(nextAppId)) {
    return { ok: false, message: "Missing allow-action parameters.", value: 0 };
  }

  try {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getClaims();

    if (!session?.claims) {
      return { ok: false, message: "You must be logged on.", value: 0 };
    }

    const userId =
      session.claims.sub ?? (await supabase.auth.getUser()).data.user?.id;

    if (!userId) {
      return { ok: false, message: "You must be logged on.", value: 0 };
    }

    const { data, error } = await supabase.rpc("pr_allow_action", {
      p_user_id: userId,
      p_function_id: nextFunctionId,
      p_app_id: nextAppId,
    });

    if (error) {
      return { ok: false, message: error.message, value: 0 };
    }

    return { ok: true, message: "", value: toAllowValue(data) };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Could not check the action.",
      value: 0,
    };
  }
}

export async function loadInboundItemTracking(inboundTradeId) {
  const cookieStore = await cookies();
  const appName = cookieStore.get(NAV_APP_COOKIE)?.value ?? "";
  const allowedPage = cookieStore.get(NAV_PAGE_COOKIE)?.value ?? "";

  if (!appName || allowedPage !== "inbound") {
    return { ok: false, message: "Open Inbound from the app menu.", rows: [] };
  }

  const tradeId = toInteger(inboundTradeId);

  if (!Number.isInteger(tradeId)) {
    return { ok: true, message: "", rows: [] };
  }

  try {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getClaims();

    if (!session?.claims) {
      return { ok: false, message: "You must be logged on.", rows: [] };
    }

    const { data, error } = await supabase.rpc(
      "pr_inbound_stock_item_tracking",
      {
        p_inbound_trade_id: tradeId,
      },
    );

    if (error) {
      return { ok: false, message: error.message, rows: [] };
    }

    return {
      ok: true,
      message: "",
      rows: JSON.parse(JSON.stringify(toRows(data))),
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Could not load tracking.",
      rows: [],
    };
  }
}

export async function loadInboundItemTrackingToLift(
  groupingKey,
  productId,
) {
  const cookieStore = await cookies();
  const appName = cookieStore.get(NAV_APP_COOKIE)?.value ?? "";
  const allowedPage = cookieStore.get(NAV_PAGE_COOKIE)?.value ?? "";

  if (!appName || allowedPage !== "inbound") {
    return { ok: false, message: "Open Inbound from the app menu.", rows: [] };
  }

  const blendGroupKey = toInteger(groupingKey);
  const fallbackProductId = toBigIntParam(productId);

  if (!Number.isInteger(blendGroupKey)) {
    return { ok: false, message: "Missing blend group key.", rows: [] };
  }

  try {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getClaims();

    if (!session?.claims) {
      return { ok: false, message: "You must be logged on.", rows: [] };
    }

    const { data, error } = await supabase.rpc(
      "pr_inbound_item_tracking_to_lift",
      {
        p_blend_grouping_key: blendGroupKey,
      },
    );

    if (error) {
      return { ok: false, message: error.message, rows: [] };
    }

    const rows = toRows(data);
    const suggested = await Promise.all(
      rows.map(async (row) => {
        const rowProductId =
          toBigIntParam(fieldFromRow(row, ["product_id"])) ??
          fallbackProductId;
        const rowBlendKey =
          toInteger(
            fieldFromRow(row, ["blend_grouping_key", "blend_group_key"]),
          ) || blendGroupKey;

        if (rowProductId == null) {
          return { ok: false, message: "Missing product id." };
        }

        if (!Number.isInteger(rowBlendKey)) {
          return { ok: false, message: "Missing blend group key." };
        }

        const { data: qtyData, error: qtyError } = await supabase.rpc(
          "pr_qty_to_suggest_item_tracking_vs_lift",
          {
            p_product_id: rowProductId,
            p_blend_grouping_key: rowBlendKey,
          },
        );

        if (qtyError) {
          return { ok: false, message: qtyError.message };
        }

        const qty = toSuggestedQty(qtyData);

        if (!Number.isFinite(qty)) {
          return {
            ok: false,
            message: "Could not suggest a lift quantity.",
          };
        }

        return {
          ok: true,
          row: {
            ...row,
            product_id: rowProductId,
            suggested_qty: qty,
            qty_to_lift: qty,
            qty_to_lift_max: qty,
          },
        };
      }),
    );

    const failed = suggested.find((item) => !item.ok);

    if (failed) {
      return { ok: false, message: failed.message, rows: [] };
    }

    return {
      ok: true,
      message: "",
      rows: JSON.parse(JSON.stringify(suggested.map((item) => item.row))),
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Could not load tracking items to lift.",
      rows: [],
    };
  }
}

export async function loadInboundLiftToLoad(blendGroupingLiftKey) {
  const cookieStore = await cookies();
  const appName = cookieStore.get(NAV_APP_COOKIE)?.value ?? "";
  const allowedPage = cookieStore.get(NAV_PAGE_COOKIE)?.value ?? "";

  if (!appName || allowedPage !== "inbound") {
    return { ok: false, message: "Open Inbound from the app menu.", rows: [] };
  }

  const liftBlendKey = toInteger(blendGroupingLiftKey);

  if (!Number.isInteger(liftBlendKey)) {
    return { ok: false, message: "Missing blend group key (lift).", rows: [] };
  }

  try {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getClaims();

    if (!session?.claims) {
      return { ok: false, message: "You must be logged on.", rows: [] };
    }

    const { data, error } = await supabase.rpc("pr_inbound_lift_to_load", {
      p_blend_grouping_lift_key: liftBlendKey,
    });

    if (error) {
      return { ok: false, message: error.message, rows: [] };
    }

    const rows = toRows(data);
    const suggested = await Promise.all(
      rows.map(async (row) => {
        const productId = toBigIntParam(fieldFromRow(row, ["product_id"]));
        const rowBlendKey = toInteger(
          fieldFromRow(row, [
            "blend_grouping_key_lift",
            "blend_grouping_lift_key",
          ]),
        );

        if (productId == null) {
          return { ok: false, message: "Missing product id." };
        }

        if (!Number.isInteger(rowBlendKey)) {
          return { ok: false, message: "Missing blend group key (lift)." };
        }

        const { data: qtyData, error: qtyError } = await supabase.rpc(
          "pr_qty_to_suggest_item_lift_vs_load",
          {
            p_product_id: productId,
            p_blend_grouping_key_lift: rowBlendKey,
          },
        );

        if (qtyError) {
          return { ok: false, message: qtyError.message };
        }

        const qty = toSuggestedQty(qtyData);

        if (!Number.isFinite(qty)) {
          return {
            ok: false,
            message: "Could not suggest a load quantity.",
          };
        }

        return {
          ok: true,
          row: {
            ...row,
            product_id: productId,
            load_qty: qty,
            load_qty_max: qty,
          },
        };
      }),
    );

    const failed = suggested.find((item) => !item.ok);

    if (failed) {
      return { ok: false, message: failed.message, rows: [] };
    }

    return {
      ok: true,
      message: "",
      rows: JSON.parse(JSON.stringify(suggested.map((item) => item.row))),
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Could not load lift items to load.",
      rows: [],
    };
  }
}

export async function addInboundLift({
  inboundStockItemTrackingId,
  qtyToLift,
  maxQtyToLift,
  supplierReleaseNumber,
  blendGroupingKey,
}) {
  const cookieStore = await cookies();
  const appName = cookieStore.get(NAV_APP_COOKIE)?.value ?? "";
  const allowedPage = cookieStore.get(NAV_PAGE_COOKIE)?.value ?? "";

  if (!appName || allowedPage !== "inbound") {
    return { ok: false, message: "Open Inbound from the app menu." };
  }

  const trackingId = toBigIntParam(inboundStockItemTrackingId);
  const qtyValue = toNumeric(qtyToLift);
  const maxQty = toNumeric(maxQtyToLift);
  const blendKey = toInteger(blendGroupingKey);
  const releaseNumber = String(supplierReleaseNumber ?? "").trim();

  if (trackingId == null) {
    return { ok: false, message: "Select a tracking item." };
  }

  if (!releaseNumber) {
    return { ok: false, message: "Enter a supplier release number." };
  }

  if (
    !Number.isFinite(qtyValue) ||
    qtyValue < 0 ||
    !Number.isFinite(maxQty) ||
    qtyValue > maxQty
  ) {
    return {
      ok: false,
      message: "Qty to Lift must be between 0 and the suggested quantity.",
    };
  }

  if (!Number.isInteger(blendKey)) {
    return { ok: false, message: "Missing blend group key." };
  }

  try {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getClaims();

    if (!session?.claims) {
      return { ok: false, message: "You must be logged on." };
    }

    const { error } = await supabase.rpc("pi_inbound_lift", {
      p_inbound_stock_item_tracking_id: trackingId,
      p_qty_to_lift: qtyValue,
      p_unit_of_measure_id: 2,
      p_supplier_release_number: releaseNumber,
      p_lift_status_id: 1,
      p_blend_grouping_key: blendKey,
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true, message: "" };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Could not add the lift.",
    };
  }
}

export async function addInboundLoad({
  inboundLiftId,
  loadDate,
  contractNumber,
  upliftNumber,
  collectionPointId,
  loadQty,
  maxLoadQty,
  expectedCompletionDate,
  blendGroupingKey,
  blendGroupingKeyLift,
  actualLoadedQty,
}) {
  const cookieStore = await cookies();
  const appName = cookieStore.get(NAV_APP_COOKIE)?.value ?? "";
  const allowedPage = cookieStore.get(NAV_PAGE_COOKIE)?.value ?? "";

  if (!appName || allowedPage !== "inbound") {
    return { ok: false, message: "Open Inbound from the app menu." };
  }

  const liftId = toBigIntParam(inboundLiftId);
  const nextLoadDate = String(loadDate ?? "").trim();
  const nextExpectedDate = String(expectedCompletionDate ?? "").trim();
  const nextCollectionPointId = toInteger(collectionPointId);
  const loadQtyValue = toNumeric(loadQty);
  const maxQty = toNumeric(maxLoadQty);
  const actualQtyValue = toNumeric(actualLoadedQty);
  const blendKey = toInteger(blendGroupingKey);
  const liftBlendKey = toInteger(blendGroupingKeyLift);

  if (liftId == null) {
    return { ok: false, message: "Select a lift." };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(nextLoadDate)) {
    return { ok: false, message: "Select a load date." };
  }

  if (!Number.isInteger(nextCollectionPointId) || nextCollectionPointId === 0) {
    return { ok: false, message: "Select a collection point." };
  }

  if (
    !Number.isFinite(loadQtyValue) ||
    loadQtyValue < 0 ||
    !Number.isFinite(maxQty) ||
    loadQtyValue > maxQty
  ) {
    return {
      ok: false,
      message: "Load Qty must be between 0 and the suggested quantity.",
    };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(nextExpectedDate)) {
    return { ok: false, message: "Select an expected completion date." };
  }

  if (!Number.isInteger(blendKey)) {
    return { ok: false, message: "Missing blend group key." };
  }

  if (!Number.isInteger(liftBlendKey)) {
    return { ok: false, message: "Missing blend group key (lift)." };
  }

  if (!Number.isFinite(actualQtyValue)) {
    return { ok: false, message: "Enter an actual load quantity." };
  }

  try {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getClaims();

    if (!session?.claims) {
      return { ok: false, message: "You must be logged on." };
    }

    const { error } = await supabase.rpc("pi_inbound_load", {
      p_inbound_lift_id: liftId,
      p_load_date: nextLoadDate,
      p_contract_number: String(contractNumber ?? "").trim(),
      p_uplift_number: String(upliftNumber ?? "").trim(),
      p_collection_point_id: nextCollectionPointId,
      p_load_qty: loadQtyValue,
      p_expected_completion_date: nextExpectedDate,
      p_blend_grouping_key: blendKey,
      p_blend_grouping_key_lift: liftBlendKey,
      p_actual_loaded_qty: actualQtyValue,
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true, message: "" };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Could not add the load.",
    };
  }
}

export async function updateInboundLoad({
  id,
  loadDate,
  contractNumber,
  upliftNumber,
  collectionPointId,
  loadQty,
  expectedCompletionDate,
  actualLoadedQty,
  loadStatusId,
}) {
  const cookieStore = await cookies();
  const appName = cookieStore.get(NAV_APP_COOKIE)?.value ?? "";
  const allowedPage = cookieStore.get(NAV_PAGE_COOKIE)?.value ?? "";

  if (!appName || allowedPage !== "inbound") {
    return { ok: false, message: "Open Inbound from the app menu." };
  }

  const loadId = toBigIntParam(id);
  const nextLoadDate = String(loadDate ?? "").trim();
  const nextExpectedDate = String(expectedCompletionDate ?? "").trim();
  const nextCollectionPointId = toInteger(collectionPointId);
  const loadQtyValue = toNumeric(loadQty);
  const actualQtyValue = toNumeric(actualLoadedQty);
  const statusId = toInteger(loadStatusId);

  if (loadId == null) {
    return { ok: false, message: "Select a load." };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(nextLoadDate)) {
    return { ok: false, message: "Select a load date." };
  }

  if (!Number.isInteger(nextCollectionPointId) || nextCollectionPointId === 0) {
    return { ok: false, message: "Select a collection point." };
  }

  if (!Number.isFinite(loadQtyValue)) {
    return { ok: false, message: "Enter a load quantity." };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(nextExpectedDate)) {
    return { ok: false, message: "Select an expected completion date." };
  }

  if (!Number.isFinite(actualQtyValue)) {
    return { ok: false, message: "Enter an actual load quantity." };
  }

  if (!Number.isInteger(statusId) || statusId === 0) {
    return { ok: false, message: "Select a load status." };
  }

  try {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getClaims();

    if (!session?.claims) {
      return { ok: false, message: "You must be logged on." };
    }

    const { error } = await supabase.rpc("pu_inbound_load", {
      p_id: loadId,
      p_load_date: nextLoadDate,
      p_contract_number: String(contractNumber ?? "").trim(),
      p_uplift_number: String(upliftNumber ?? "").trim(),
      p_collection_point_id: nextCollectionPointId,
      p_load_qty: loadQtyValue,
      p_expected_completion_date: nextExpectedDate,
      p_actual_loaded_qty: actualQtyValue,
      p_load_status_id: statusId,
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true, message: "" };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Could not update the load.",
    };
  }
}

export async function updateInboundLift({
  id,
  qtyToLift,
  supplierReleaseNumber,
  liftStatusId,
}) {
  const cookieStore = await cookies();
  const appName = cookieStore.get(NAV_APP_COOKIE)?.value ?? "";
  const allowedPage = cookieStore.get(NAV_PAGE_COOKIE)?.value ?? "";

  if (!appName || allowedPage !== "inbound") {
    return { ok: false, message: "Open Inbound from the app menu." };
  }

  const liftId = toBigIntParam(id);
  const qtyValue = toNumeric(qtyToLift);
  const statusId = toInteger(liftStatusId);
  const releaseNumber = String(supplierReleaseNumber ?? "").trim();

  if (liftId == null) {
    return { ok: false, message: "Select a lift." };
  }

  if (!Number.isFinite(qtyValue)) {
    return { ok: false, message: "Enter a quantity to lift." };
  }

  if (!Number.isInteger(statusId) || statusId === 0) {
    return { ok: false, message: "Select a lift status." };
  }

  try {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getClaims();

    if (!session?.claims) {
      return { ok: false, message: "You must be logged on." };
    }

    const { error } = await supabase.rpc("pu_inbound_lift", {
      p_id: liftId,
      p_qty_to_lift: qtyValue,
      p_supplier_release_number: releaseNumber,
      p_lift_status_id: statusId,
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true, message: "" };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Could not update the lift.",
    };
  }
}

export async function loadInboundLift(groupingKey) {
  const cookieStore = await cookies();
  const appName = cookieStore.get(NAV_APP_COOKIE)?.value ?? "";
  const allowedPage = cookieStore.get(NAV_PAGE_COOKIE)?.value ?? "";

  if (!appName || allowedPage !== "inbound") {
    return { ok: false, message: "Open Inbound from the app menu.", rows: [] };
  }

  const blendGroupKey = toInteger(groupingKey);

  if (!Number.isInteger(blendGroupKey)) {
    return { ok: true, message: "", rows: [] };
  }

  try {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getClaims();

    if (!session?.claims) {
      return { ok: false, message: "You must be logged on.", rows: [] };
    }

    const { data, error } = await supabase.rpc(
      "pr_inbound_lift_by_grouping_key",
      {
        p_grouping_key: blendGroupKey,
      },
    );

    if (error) {
      return { ok: false, message: error.message, rows: [] };
    }

    return {
      ok: true,
      message: "",
      rows: JSON.parse(JSON.stringify(toRows(data))),
    };
  } catch (error) {
    return {
      ok: false,
      message:         error instanceof Error ? error.message : "Could not load lifts.",
      rows: [],
    };
  }
}

export async function loadInboundLoad(groupingKey, blendGroupingKeyLift) {
  const cookieStore = await cookies();
  const appName = cookieStore.get(NAV_APP_COOKIE)?.value ?? "";
  const allowedPage = cookieStore.get(NAV_PAGE_COOKIE)?.value ?? "";

  if (!appName || allowedPage !== "inbound") {
    return { ok: false, message: "Open Inbound from the app menu.", rows: [] };
  }

  const blendGroupKey = toInteger(groupingKey);
  const liftBlendGroupKey = toInteger(blendGroupingKeyLift);

  if (!Number.isInteger(blendGroupKey)) {
    return { ok: true, message: "", rows: [] };
  }

  try {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getClaims();

    if (!session?.claims) {
      return { ok: false, message: "You must be logged on.", rows: [] };
    }

    const { data, error } = await supabase.rpc(
      "pr_inbound_load_by_grouping_key",
      {
        p_grouping_key: blendGroupKey,
        p_blend_grouping_key_lift: Number.isInteger(liftBlendGroupKey)
          ? liftBlendGroupKey
          : null,
      },
    );

    if (error) {
      return { ok: false, message: error.message, rows: [] };
    }

    return {
      ok: true,
      message: "",
      rows: JSON.parse(JSON.stringify(toRows(data))),
    };
  } catch (error) {
    return {
      ok: false,
      message:         error instanceof Error ? error.message : "Could not load loads.",
      rows: [],
    };
  }
}

export async function loadTransportChannel(inboundLoadId) {
  const cookieStore = await cookies();
  const appName = cookieStore.get(NAV_APP_COOKIE)?.value ?? "";
  const allowedPage = cookieStore.get(NAV_PAGE_COOKIE)?.value ?? "";

  if (!appName || allowedPage !== "inbound") {
    return { ok: false, message: "Open Inbound from the app menu.", rows: [] };
  }

  const loadId = toBigIntParam(inboundLoadId);

  if (loadId == null) {
    return { ok: true, message: "", rows: [] };
  }

  try {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getClaims();

    if (!session?.claims) {
      return { ok: false, message: "You must be logged on.", rows: [] };
    }

    const { data, error } = await supabase.rpc("pr_transport_channel", {
      p_inbound_load_id: loadId,
    });

    if (error) {
      return { ok: false, message: error.message, rows: [] };
    }

    return {
      ok: true,
      message: "",
      rows: JSON.parse(JSON.stringify(toRows(data))),
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Could not load the transport channel.",
      rows: [],
    };
  }
}

export async function loadInboundCost(inboundStockItemTrackingId) {
  const cookieStore = await cookies();
  const appName = cookieStore.get(NAV_APP_COOKIE)?.value ?? "";
  const allowedPage = cookieStore.get(NAV_PAGE_COOKIE)?.value ?? "";

  if (!appName || allowedPage !== "inbound") {
    return { ok: false, message: "Open Inbound from the app menu.", rows: [] };
  }

  const trackingId = toInteger(inboundStockItemTrackingId);

  if (!Number.isInteger(trackingId)) {
    return { ok: true, message: "", rows: [] };
  }

  try {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getClaims();

    if (!session?.claims) {
      return { ok: false, message: "You must be logged on.", rows: [] };
    }

    const { data, error } = await supabase.rpc("pr_inbound_cost", {
      p_inbound_stock_item_tracking_id: trackingId,
    });

    if (error) {
      return { ok: false, message: error.message, rows: [] };
    }

    return {
      ok: true,
      message: "",
      rows: JSON.parse(JSON.stringify(toRows(data))),
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not load costs.",
      rows: [],
    };
  }
}

function toBigIntParam(value) {
  const text = String(value ?? "").trim();

  if (!/^-?\d+$/.test(text)) {
    return null;
  }

  const n = Number(text);
  return Number.isSafeInteger(n) ? n : text;
}

export async function loadDocumentDetails(inboundStockItemTrackingId) {
  const cookieStore = await cookies();
  const appName = cookieStore.get(NAV_APP_COOKIE)?.value ?? "";
  const allowedPage = cookieStore.get(NAV_PAGE_COOKIE)?.value ?? "";

  if (!appName || allowedPage !== "inbound") {
    return { ok: false, message: "Open Inbound from the app menu.", rows: [] };
  }

  const trackingId = toBigIntParam(inboundStockItemTrackingId);

  if (trackingId == null) {
    return { ok: true, message: "", rows: [] };
  }

  try {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getClaims();

    if (!session?.claims) {
      return { ok: false, message: "You must be logged on.", rows: [] };
    }

    const { data, error } = await supabase.rpc("pr_document_details", {
      p_inbound_stock_item_tracking_id: trackingId,
    });

    if (error) {
      return { ok: false, message: error.message, rows: [] };
    }

    return {
      ok: true,
      message: "",
      rows: JSON.parse(JSON.stringify(toRows(data))),
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Could not load documents.",
      rows: [],
    };
  }
}

export async function loadDocumentInboundLift(inboundLiftId) {
  const cookieStore = await cookies();
  const appName = cookieStore.get(NAV_APP_COOKIE)?.value ?? "";
  const allowedPage = cookieStore.get(NAV_PAGE_COOKIE)?.value ?? "";

  if (!appName || allowedPage !== "inbound") {
    return { ok: false, message: "Open Inbound from the app menu.", rows: [] };
  }

  const liftId = toBigIntParam(inboundLiftId);

  if (liftId == null) {
    return { ok: true, message: "", rows: [] };
  }

  try {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getClaims();

    if (!session?.claims) {
      return { ok: false, message: "You must be logged on.", rows: [] };
    }

    const { data, error } = await supabase.rpc("pr_document_inbound_lift", {
      p_inbound_lift_id: liftId,
    });

    if (error) {
      return { ok: false, message: error.message, rows: [] };
    }

    return {
      ok: true,
      message: "",
      rows: JSON.parse(JSON.stringify(toRows(data))),
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Could not load lift documents.",
      rows: [],
    };
  }
}

export async function loadDocumentInboundLoad(inboundLoadId) {
  const cookieStore = await cookies();
  const appName = cookieStore.get(NAV_APP_COOKIE)?.value ?? "";
  const allowedPage = cookieStore.get(NAV_PAGE_COOKIE)?.value ?? "";

  if (!appName || allowedPage !== "inbound") {
    return { ok: false, message: "Open Inbound from the app menu.", rows: [] };
  }

  const loadId = toBigIntParam(inboundLoadId);

  if (loadId == null) {
    return { ok: true, message: "", rows: [] };
  }

  try {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getClaims();

    if (!session?.claims) {
      return { ok: false, message: "You must be logged on.", rows: [] };
    }

    const { data, error } = await supabase.rpc("pr_document_inbound_load", {
      p_inbound_load_id: loadId,
    });

    if (error) {
      return { ok: false, message: error.message, rows: [] };
    }

    return {
      ok: true,
      message: "",
      rows: JSON.parse(JSON.stringify(toRows(data))),
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Could not load load documents.",
      rows: [],
    };
  }
}

export async function loadNotesInboundStockItemTracking(
  inboundStockItemTrackingId,
) {
  const cookieStore = await cookies();
  const appName = cookieStore.get(NAV_APP_COOKIE)?.value ?? "";
  const allowedPage = cookieStore.get(NAV_PAGE_COOKIE)?.value ?? "";

  if (!appName || allowedPage !== "inbound") {
    return { ok: false, message: "Open Inbound from the app menu.", rows: [] };
  }

  const trackingId = toBigIntParam(inboundStockItemTrackingId);

  if (trackingId == null) {
    return { ok: true, message: "", rows: [] };
  }

  try {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getClaims();

    if (!session?.claims) {
      return { ok: false, message: "You must be logged on.", rows: [] };
    }

    const { data, error } = await supabase.rpc(
      "pr_notes_inbound_stock_item_tracking",
      {
        p_inbound_stock_item_tracking_id: trackingId,
      },
    );

    if (error) {
      return { ok: false, message: error.message, rows: [] };
    }

    return {
      ok: true,
      message: "",
      rows: JSON.parse(JSON.stringify(toRows(data))),
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not load notes.",
      rows: [],
    };
  }
}

export async function loadNotesInboundCost(inboundCostId) {
  const cookieStore = await cookies();
  const appName = cookieStore.get(NAV_APP_COOKIE)?.value ?? "";
  const allowedPage = cookieStore.get(NAV_PAGE_COOKIE)?.value ?? "";

  if (!appName || allowedPage !== "inbound") {
    return { ok: false, message: "Open Inbound from the app menu.", rows: [] };
  }

  const costId = toBigIntParam(inboundCostId);

  if (costId == null) {
    return { ok: true, message: "", rows: [] };
  }

  try {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getClaims();

    if (!session?.claims) {
      return { ok: false, message: "You must be logged on.", rows: [] };
    }

    const { data, error } = await supabase.rpc("pr_notes_inbound_cost", {
      p_inbound_cost_id: costId,
    });

    if (error) {
      return { ok: false, message: error.message, rows: [] };
    }

    return {
      ok: true,
      message: "",
      rows: JSON.parse(JSON.stringify(toRows(data))),
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Could not load cost notes.",
      rows: [],
    };
  }
}

export async function loadNotesInboundLift(inboundLiftId) {
  const cookieStore = await cookies();
  const appName = cookieStore.get(NAV_APP_COOKIE)?.value ?? "";
  const allowedPage = cookieStore.get(NAV_PAGE_COOKIE)?.value ?? "";

  if (!appName || allowedPage !== "inbound") {
    return { ok: false, message: "Open Inbound from the app menu.", rows: [] };
  }

  const liftId = toBigIntParam(inboundLiftId);

  if (liftId == null) {
    return { ok: true, message: "", rows: [] };
  }

  try {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getClaims();

    if (!session?.claims) {
      return { ok: false, message: "You must be logged on.", rows: [] };
    }

    const { data, error } = await supabase.rpc("pr_notes_inbound_lift", {
      p_inbound_lift_id: liftId,
    });

    if (error) {
      return { ok: false, message: error.message, rows: [] };
    }

    return {
      ok: true,
      message: "",
      rows: JSON.parse(JSON.stringify(toRows(data))),
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Could not load lift notes.",
      rows: [],
    };
  }
}

export async function loadNotesInboundLoad(inboundLoadId) {
  const cookieStore = await cookies();
  const appName = cookieStore.get(NAV_APP_COOKIE)?.value ?? "";
  const allowedPage = cookieStore.get(NAV_PAGE_COOKIE)?.value ?? "";

  if (!appName || allowedPage !== "inbound") {
    return { ok: false, message: "Open Inbound from the app menu.", rows: [] };
  }

  const loadId = toBigIntParam(inboundLoadId);

  if (loadId == null) {
    return { ok: true, message: "", rows: [] };
  }

  try {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getClaims();

    if (!session?.claims) {
      return { ok: false, message: "You must be logged on.", rows: [] };
    }

    const { data, error } = await supabase.rpc("pr_notes_inbound_load", {
      p_inbound_load_id: loadId,
    });

    if (error) {
      return { ok: false, message: error.message, rows: [] };
    }

    return {
      ok: true,
      message: "",
      rows: JSON.parse(JSON.stringify(toRows(data))),
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Could not load load notes.",
      rows: [],
    };
  }
}

export async function loadDocumentTypes(functionalAreaId = 1) {
  const cookieStore = await cookies();
  const appName = cookieStore.get(NAV_APP_COOKIE)?.value ?? "";
  const allowedPage = cookieStore.get(NAV_PAGE_COOKIE)?.value ?? "";

  if (!appName || allowedPage !== "inbound") {
    return { ok: false, message: "Open Inbound from the app menu.", options: [] };
  }

  const areaId = toInteger(functionalAreaId);

  if (!Number.isInteger(areaId)) {
    return { ok: true, message: "", options: [] };
  }

  try {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getClaims();

    if (!session?.claims) {
      return { ok: false, message: "You must be logged on.", options: [] };
    }

    const { data, error } = await supabase.rpc("pr_document_types", {
      p_functional_area_id: areaId,
    });

    if (error) {
      return { ok: false, message: error.message, options: [] };
    }

    return {
      ok: true,
      message: "",
      options: JSON.parse(JSON.stringify(toSelectOptions(data))),
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Could not load document types.",
      options: [],
    };
  }
}

export async function loadCostTypes() {
  const cookieStore = await cookies();
  const appName = cookieStore.get(NAV_APP_COOKIE)?.value ?? "";
  const allowedPage = cookieStore.get(NAV_PAGE_COOKIE)?.value ?? "";

  if (!appName || allowedPage !== "inbound") {
    return { ok: false, message: "Open Inbound from the app menu.", options: [] };
  }

  try {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getClaims();

    if (!session?.claims) {
      return { ok: false, message: "You must be logged on.", options: [] };
    }

    const { data, error } = await supabase.rpc("pr_cost_types");

    if (error) {
      return { ok: false, message: error.message, options: [] };
    }

    return {
      ok: true,
      message: "",
      options: JSON.parse(JSON.stringify(toSelectOptions(data))),
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Could not load cost types.",
      options: [],
    };
  }
}

async function loadActiveOnlyLookup(
  rpcName,
  labelKeys,
  fallbackMessage,
  extraParams = {},
) {
  const cookieStore = await cookies();
  const appName = cookieStore.get(NAV_APP_COOKIE)?.value ?? "";
  const allowedPage = cookieStore.get(NAV_PAGE_COOKIE)?.value ?? "";

  if (!appName || allowedPage !== "inbound") {
    return { ok: false, message: "Open Inbound from the app menu.", options: [] };
  }

  try {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getClaims();

    if (!session?.claims) {
      return { ok: false, message: "You must be logged on.", options: [] };
    }

    const { data, error } = await supabase.rpc(rpcName, {
      p_active_only: false,
      ...extraParams,
    });

    if (error) {
      return { ok: false, message: error.message, options: [] };
    }

    return {
      ok: true,
      message: "",
      options: JSON.parse(JSON.stringify(toJoinedSelectOptions(data, labelKeys))),
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : fallbackMessage,
      options: [],
    };
  }
}

async function loadLookup(rpcName, fallbackMessage, labelKeys) {
  const cookieStore = await cookies();
  const appName = cookieStore.get(NAV_APP_COOKIE)?.value ?? "";
  const allowedPage = cookieStore.get(NAV_PAGE_COOKIE)?.value ?? "";

  if (!appName || allowedPage !== "inbound") {
    return { ok: false, message: "Open Inbound from the app menu.", options: [] };
  }

  try {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getClaims();

    if (!session?.claims) {
      return { ok: false, message: "You must be logged on.", options: [] };
    }

    const { data, error } = await supabase.rpc(rpcName);

    if (error) {
      return { ok: false, message: error.message, options: [] };
    }

    return {
      ok: true,
      message: "",
      options: JSON.parse(
        JSON.stringify(
          labelKeys
            ? toJoinedSelectOptions(data, labelKeys)
            : toSelectOptions(data),
        ),
      ),
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : fallbackMessage,
      options: [],
    };
  }
}

export async function loadProducts() {
  return loadLookup("pr_products", "Could not load products.");
}

export async function loadUnitsOfMeasure() {
  return loadLookup("pr_unit_of_measure", "Could not load units of measure.");
}

export async function loadSuppliers() {
  return loadLookup("pr_suppliers", "Could not load suppliers.");
}

export async function loadPorts() {
  return loadLookup("pr_ports", "Could not load ports.", ["port_name"]);
}

export async function loadCurrencies() {
  return loadLookup("pr_currencies", "Could not load currencies.");
}

export async function loadItemTrackingStatuses() {
  return loadLookup(
    "pr_item_tracking_status",
    "Could not load item tracking statuses.",
  );
}

export async function loadLiftStatuses() {
  return loadLookup("pr_lift_status", "Could not load lift statuses.");
}

export async function loadLoadStatuses() {
  return loadLookup("pr_load_status", "Could not load load statuses.");
}

export async function loadCollectionPoints() {
  return loadLookup(
    "pr_collection_point",
    "Could not load collection points.",
  );
}

export async function loadTransportCompanies() {
  return loadActiveOnlyLookup(
    "pr_transport_companies",
    ["company_name"],
    "Could not load transport companies.",
  );
}

function companyLookupParams(transportCompanyId) {
  const companyId = toBigIntParam(transportCompanyId);

  if (companyId == null || companyId === 0) {
    return null;
  }

  return { p_transport_company_id: companyId };
}

export async function loadTruckDrivers(transportCompanyId) {
  const extraParams = companyLookupParams(transportCompanyId);

  if (!extraParams) {
    return { ok: true, message: "", options: [] };
  }

  return loadActiveOnlyLookup(
    "pr_truck_driver",
    ["name", "surname"],
    "Could not load truck drivers.",
    extraParams,
  );
}

export async function loadTrucks(transportCompanyId) {
  const extraParams = companyLookupParams(transportCompanyId);

  if (!extraParams) {
    return { ok: true, message: "", options: [] };
  }

  return loadActiveOnlyLookup(
    "pr_truck",
    ["make", "registration_number"],
    "Could not load trucks.",
    extraParams,
  );
}

export async function loadTruckTrailers(transportCompanyId) {
  const extraParams = companyLookupParams(transportCompanyId);

  if (!extraParams) {
    return { ok: true, message: "", options: [] };
  }

  return loadActiveOnlyLookup(
    "pr_truck_trailer",
    ["make", "registration_number"],
    "Could not load truck trailers.",
    extraParams,
  );
}

function toNumeric(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const n = Number(
    String(value ?? "")
      .trim()
      .replace(/\s/g, "")
      .replace(",", "."),
  );
  return Number.isFinite(n) ? n : NaN;
}

function toSuggestedQty(data) {
  if (data == null) {
    return NaN;
  }

  if (typeof data === "number" && Number.isFinite(data)) {
    return data;
  }

  if (typeof data === "bigint") {
    return Number(data);
  }

  if (Array.isArray(data)) {
    return data.length ? toSuggestedQty(data[0]) : NaN;
  }

  if (typeof data === "object") {
    return toSuggestedQty(
      data.pr_qty_to_suggest_item_tracking_vs_lift ??
        data.pr_qty_to_suggest_item_lift_vs_load ??
        data.suggested_qty ??
        data.load_qty ??
        data.qty_to_lift ??
        data.qty ??
        data.value ??
        Object.values(data)[0],
    );
  }

  return toNumeric(data);
}

export async function addInboundCost({
  costTypeId,
  description,
  amount,
  trackingId,
  qty,
  costDate,
  blendGroupingKey,
}) {
  const cookieStore = await cookies();
  const appName = cookieStore.get(NAV_APP_COOKIE)?.value ?? "";
  const allowedPage = cookieStore.get(NAV_PAGE_COOKIE)?.value ?? "";

  if (!appName || allowedPage !== "inbound") {
    return { ok: false, message: "Open Inbound from the app menu." };
  }

  const typeId = toBigIntParam(costTypeId);
  const inboundTrackingId = toBigIntParam(trackingId);
  const amountValue = toNumeric(amount);
  const qtyValue = toNumeric(qty);
  const blendKey = toInteger(blendGroupingKey);
  const descr = String(description ?? "");
  const selectedDate = String(costDate ?? "").trim();

  if (typeId == null || typeId === 0) {
    return { ok: false, message: "Select a cost type." };
  }

  if (inboundTrackingId == null) {
    return { ok: false, message: "Select a tracking item." };
  }

  if (
    !Number.isFinite(amountValue) ||
    amountValue <= 0 ||
    !Number.isFinite(qtyValue) ||
    qtyValue <= 0
  ) {
    return {
      ok: false,
      message: "The Amount as well as the Qty must be greater than Zero.",
    };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
    return { ok: false, message: "Select a cost date." };
  }

  if (!Number.isInteger(blendKey)) {
    return { ok: false, message: "Missing blend group key." };
  }

  try {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getClaims();

    if (!session?.claims) {
      return { ok: false, message: "You must be logged on." };
    }

    const userId =
      session.claims.sub ?? (await supabase.auth.getUser()).data.user?.id;

    if (!userId) {
      return { ok: false, message: "You must be logged on." };
    }

    const { error } = await supabase.rpc(
      "pi_cost_for_inbound_stock_item_tracking",
      {
        p_cost_type_id: typeId,
        p_descr: descr,
        p_amount: amountValue,
        p_inbound_stock_item_tracking_id: inboundTrackingId,
        p_reversed: false,
        p_reversal_reason: "",
        p_cost_date: selectedDate,
        p_amount_per_liter: amountValue / qtyValue,
        p_qty: qtyValue,
        p_unit_of_measure_id: 2,
        p_blend_grouping_key: blendKey,
        p_user_id: userId,
      },
    );

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true, message: "" };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not add the cost.",
    };
  }
}

function parseStoragePath(filePath) {
  const trimmed = String(filePath ?? "")
    .trim()
    .replace(/^\/+/, "");
  const slash = trimmed.indexOf("/");

  if (slash <= 0 || slash === trimmed.length - 1) {
    return null;
  }

  return {
    bucket: trimmed.slice(0, slash),
    objectPath: trimmed.slice(slash + 1),
    fileName: trimmed.slice(trimmed.lastIndexOf("/") + 1),
  };
}

export async function getDocumentFileUrl(filePath) {
  const cookieStore = await cookies();
  const appName = cookieStore.get(NAV_APP_COOKIE)?.value ?? "";
  const allowedPage = cookieStore.get(NAV_PAGE_COOKIE)?.value ?? "";

  if (!appName || allowedPage !== "inbound") {
    return { ok: false, message: "Open Inbound from the app menu.", url: "" };
  }

  const parsed = parseStoragePath(filePath);

  if (!parsed) {
    return { ok: false, message: "Invalid file path.", url: "" };
  }

  try {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getClaims();

    if (!session?.claims) {
      return { ok: false, message: "You must be logged on.", url: "" };
    }

    const { data, error } = await supabase.storage
      .from(parsed.bucket)
      .createSignedUrl(parsed.objectPath, 60 * 10);

    if (error || !data?.signedUrl) {
      return {
        ok: false,
        message: error?.message ?? "Could not open the file.",
        url: "",
      };
    }

    return {
      ok: true,
      message: "",
      url: data.signedUrl,
      fileName: parsed.fileName,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not open the file.",
      url: "",
    };
  }
}

export async function deleteDocument(documentId, filePath) {
  const cookieStore = await cookies();
  const appName = cookieStore.get(NAV_APP_COOKIE)?.value ?? "";
  const allowedPage = cookieStore.get(NAV_PAGE_COOKIE)?.value ?? "";

  if (!appName || allowedPage !== "inbound") {
    return { ok: false, message: "Open Inbound from the app menu." };
  }

  const id = toBigIntParam(documentId);

  if (id == null) {
    return { ok: false, message: "Invalid document id." };
  }

  try {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getClaims();

    if (!session?.claims) {
      return { ok: false, message: "You must be logged on." };
    }

    const parsed = parseStoragePath(filePath);

    if (parsed) {
      const { error: storageError } = await supabase.storage
        .from(parsed.bucket)
        .remove([parsed.objectPath]);

      if (storageError) {
        return { ok: false, message: storageError.message };
      }
    }

    const { error } = await supabase.rpc("pd_document", { p_id: id });

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true, message: "" };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Could not delete the document.",
    };
  }
}

export async function deleteInboundNote(noteId) {
  const cookieStore = await cookies();
  const appName = cookieStore.get(NAV_APP_COOKIE)?.value ?? "";
  const allowedPage = cookieStore.get(NAV_PAGE_COOKIE)?.value ?? "";

  if (!appName || allowedPage !== "inbound") {
    return { ok: false, message: "Open Inbound from the app menu." };
  }

  const id = toBigIntParam(noteId);

  if (id == null) {
    return { ok: false, message: "Invalid note id." };
  }

  try {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getClaims();

    if (!session?.claims) {
      return { ok: false, message: "You must be logged on." };
    }

    const { error } = await supabase.rpc("pd_notes_inbound_stock_item_tracking", {
      p_id: id,
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true, message: "" };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Could not delete the note.",
    };
  }
}

export async function deleteInboundCostNote(noteId) {
  const cookieStore = await cookies();
  const appName = cookieStore.get(NAV_APP_COOKIE)?.value ?? "";
  const allowedPage = cookieStore.get(NAV_PAGE_COOKIE)?.value ?? "";

  if (!appName || allowedPage !== "inbound") {
    return { ok: false, message: "Open Inbound from the app menu." };
  }

  const id = toBigIntParam(noteId);

  if (id == null) {
    return { ok: false, message: "Invalid note id." };
  }

  try {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getClaims();

    if (!session?.claims) {
      return { ok: false, message: "You must be logged on." };
    }

    const { error } = await supabase.rpc("pd_notes_inbound_cost", {
      p_id: id,
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true, message: "" };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Could not delete the note.",
    };
  }
}

export async function deleteInboundLiftNote(noteId) {
  const cookieStore = await cookies();
  const appName = cookieStore.get(NAV_APP_COOKIE)?.value ?? "";
  const allowedPage = cookieStore.get(NAV_PAGE_COOKIE)?.value ?? "";

  if (!appName || allowedPage !== "inbound") {
    return { ok: false, message: "Open Inbound from the app menu." };
  }

  const id = toBigIntParam(noteId);

  if (id == null) {
    return { ok: false, message: "Invalid note id." };
  }

  try {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getClaims();

    if (!session?.claims) {
      return { ok: false, message: "You must be logged on." };
    }

    const { error } = await supabase.rpc("pd_notes_inbound_lift", {
      p_id: id,
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true, message: "" };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Could not delete the note.",
    };
  }
}

export async function deleteInboundLoadNote(noteId) {
  const cookieStore = await cookies();
  const appName = cookieStore.get(NAV_APP_COOKIE)?.value ?? "";
  const allowedPage = cookieStore.get(NAV_PAGE_COOKIE)?.value ?? "";

  if (!appName || allowedPage !== "inbound") {
    return { ok: false, message: "Open Inbound from the app menu." };
  }

  const id = toBigIntParam(noteId);

  if (id == null) {
    return { ok: false, message: "Invalid note id." };
  }

  try {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getClaims();

    if (!session?.claims) {
      return { ok: false, message: "You must be logged on." };
    }

    const { error } = await supabase.rpc("pd_notes_inbound_load", {
      p_id: id,
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true, message: "" };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Could not delete the note.",
    };
  }
}

function fileNameOnly(name) {
  const text = String(name ?? "")
    .trim()
    .replace(/\\/g, "/");
  const base = text.slice(text.lastIndexOf("/") + 1).trim();

  if (!base || base === "." || base === "..") {
    return "";
  }

  return base;
}

function storagePathFromRpc(data) {
  if (typeof data === "string") {
    return data.trim();
  }

  if (Array.isArray(data)) {
    return storagePathFromRpc(data[0]);
  }

  if (data && typeof data === "object") {
    const value =
      data.file_path ??
      data.path ??
      data.value ??
      Object.values(data)[0] ??
      "";
    return String(value ?? "").trim();
  }

  return "";
}

async function uploadDocumentFromRpcPath(file, rpcPath) {
  const parsed = parseStoragePath(rpcPath);

  if (!parsed) {
    return { ok: false, message: "The document path was not returned." };
  }

  const storage = createAdminClient();
  const { error: uploadError } = await storage.storage
    .from(parsed.bucket)
    .upload(parsed.objectPath, file, {
      upsert: true,
      contentType: file.type || undefined,
    });

  if (uploadError) {
    const folder = parsed.objectPath.includes("/")
      ? parsed.objectPath.slice(0, parsed.objectPath.lastIndexOf("/"))
      : "";
    const { data: listed } = await storage.storage
      .from(parsed.bucket)
      .list(folder, {
        search: parsed.fileName,
        limit: 20,
      });

    if (listed?.some((item) => item.name === parsed.fileName)) {
      return { ok: true, message: "" };
    }

    return { ok: false, message: uploadError.message };
  }

  return { ok: true, message: "" };
}

export async function addInboundDocument(formData) {
  const cookieStore = await cookies();
  const appName = cookieStore.get(NAV_APP_COOKIE)?.value ?? "";
  const allowedPage = cookieStore.get(NAV_PAGE_COOKIE)?.value ?? "";

  if (!appName || allowedPage !== "inbound") {
    return { ok: false, message: "Open Inbound from the app menu." };
  }

  const documentTypeId = toInteger(formData.get("documentTypeId"));
  const trackingId = toInteger(formData.get("trackingId"));
  const file = formData.get("file");

  if (!Number.isInteger(documentTypeId) || documentTypeId <= 0) {
    return { ok: false, message: "Select a document type." };
  }

  if (!Number.isInteger(trackingId)) {
    return { ok: false, message: "Select a tracking item." };
  }

  if (!(file instanceof File)) {
    return { ok: false, message: "Select a file." };
  }

  const filename = fileNameOnly(file.name);

  if (!filename) {
    return { ok: false, message: "Select a file." };
  }

  try {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getClaims();

    if (!session?.claims) {
      return { ok: false, message: "You must be logged on." };
    }

    const userId =
      session.claims.sub ?? (await supabase.auth.getUser()).data.user?.id;

    if (!userId) {
      return { ok: false, message: "You must be logged on." };
    }

    const { data, error } = await supabase.rpc(
      "pi_document_for_inbound_stock_item_tracking",
      {
        p_document_type_id: documentTypeId,
        p_inbound_stock_item_tracking_id: trackingId,
        p_filename: filename,
        p_user_id: userId,
      },
    );

    if (error) {
      return { ok: false, message: error.message };
    }

    return uploadDocumentFromRpcPath(file, storagePathFromRpc(data));
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Could not add the document.",
    };
  }
}

export async function addInboundLiftDocument(formData) {
  const cookieStore = await cookies();
  const appName = cookieStore.get(NAV_APP_COOKIE)?.value ?? "";
  const allowedPage = cookieStore.get(NAV_PAGE_COOKIE)?.value ?? "";

  if (!appName || allowedPage !== "inbound") {
    return { ok: false, message: "Open Inbound from the app menu." };
  }

  const documentTypeId = toInteger(formData.get("documentTypeId"));
  const liftId = toInteger(formData.get("liftId"));
  const file = formData.get("file");

  if (!Number.isInteger(documentTypeId) || documentTypeId <= 0) {
    return { ok: false, message: "Select a document type." };
  }

  if (!Number.isInteger(liftId)) {
    return { ok: false, message: "Select a lift item." };
  }

  if (!(file instanceof File)) {
    return { ok: false, message: "Select a file." };
  }

  const filename = fileNameOnly(file.name);

  if (!filename) {
    return { ok: false, message: "Select a file." };
  }

  try {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getClaims();

    if (!session?.claims) {
      return { ok: false, message: "You must be logged on." };
    }

    const userId =
      session.claims.sub ?? (await supabase.auth.getUser()).data.user?.id;

    if (!userId) {
      return { ok: false, message: "You must be logged on." };
    }

    const { data, error } = await supabase.rpc("pi_document_for_inbound_lift", {
      p_document_type_id: documentTypeId,
      p_inbound_lift_id: liftId,
      p_filename: filename,
      p_user_id: userId,
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    return uploadDocumentFromRpcPath(file, storagePathFromRpc(data));
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Could not add the document.",
    };
  }
}

export async function addInboundLoadDocument(formData) {
  const cookieStore = await cookies();
  const appName = cookieStore.get(NAV_APP_COOKIE)?.value ?? "";
  const allowedPage = cookieStore.get(NAV_PAGE_COOKIE)?.value ?? "";

  if (!appName || allowedPage !== "inbound") {
    return { ok: false, message: "Open Inbound from the app menu." };
  }

  const documentTypeId = toInteger(formData.get("documentTypeId"));
  const loadId = toInteger(formData.get("loadId"));
  const file = formData.get("file");

  if (!Number.isInteger(documentTypeId) || documentTypeId <= 0) {
    return { ok: false, message: "Select a document type." };
  }

  if (!Number.isInteger(loadId)) {
    return { ok: false, message: "Select a load item." };
  }

  if (!(file instanceof File)) {
    return { ok: false, message: "Select a file." };
  }

  const filename = fileNameOnly(file.name);

  if (!filename) {
    return { ok: false, message: "Select a file." };
  }

  try {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getClaims();

    if (!session?.claims) {
      return { ok: false, message: "You must be logged on." };
    }

    const userId =
      session.claims.sub ?? (await supabase.auth.getUser()).data.user?.id;

    if (!userId) {
      return { ok: false, message: "You must be logged on." };
    }

    const { data, error } = await supabase.rpc("pi_document_for_inbound_load", {
      p_document_type_id: documentTypeId,
      p_inbound_load_id: loadId,
      p_filename: filename,
      p_user_id: userId,
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    return uploadDocumentFromRpcPath(file, storagePathFromRpc(data));
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Could not add the document.",
    };
  }
}

export async function addInboundNote(inboundStockItemTrackingId, noteText) {
  const cookieStore = await cookies();
  const appName = cookieStore.get(NAV_APP_COOKIE)?.value ?? "";
  const allowedPage = cookieStore.get(NAV_PAGE_COOKIE)?.value ?? "";

  if (!appName || allowedPage !== "inbound") {
    return { ok: false, message: "Open Inbound from the app menu." };
  }

  const trackingId = toInteger(inboundStockItemTrackingId);
  const text = String(noteText ?? "").trim();

  if (!Number.isInteger(trackingId)) {
    return { ok: false, message: "Select a tracking item." };
  }

  if (!text) {
    return { ok: false, message: "Enter a note." };
  }

  try {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getClaims();

    if (!session?.claims) {
      return { ok: false, message: "You must be logged on." };
    }

    const userId =
      session.claims.sub ?? (await supabase.auth.getUser()).data.user?.id;

    if (!userId) {
      return { ok: false, message: "You must be logged on." };
    }

    const { error } = await supabase.rpc(
      "pi_note_for_inbound_stock_item_tracking",
      {
        p_inbound_stock_item_tracking_id: trackingId,
        p_note_text: text,
        p_user_id: userId,
      },
    );

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true, message: "" };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not add the note.",
    };
  }
}

export async function addInboundCostNote(inboundCostId, noteText) {
  const cookieStore = await cookies();
  const appName = cookieStore.get(NAV_APP_COOKIE)?.value ?? "";
  const allowedPage = cookieStore.get(NAV_PAGE_COOKIE)?.value ?? "";

  if (!appName || allowedPage !== "inbound") {
    return { ok: false, message: "Open Inbound from the app menu." };
  }

  const costId = toBigIntParam(inboundCostId);
  const text = String(noteText ?? "").trim();

  if (costId == null) {
    return { ok: false, message: "Select a cost item." };
  }

  if (!text) {
    return { ok: false, message: "Enter a note." };
  }

  try {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getClaims();

    if (!session?.claims) {
      return { ok: false, message: "You must be logged on." };
    }

    const userId =
      session.claims.sub ?? (await supabase.auth.getUser()).data.user?.id;

    if (!userId) {
      return { ok: false, message: "You must be logged on." };
    }

    const { error } = await supabase.rpc("pi_note_for_inbound_cost", {
      p_inbound_cost_id: costId,
      p_note_text: text,
      p_user_id: userId,
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true, message: "" };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not add the note.",
    };
  }
}

export async function addInboundLiftNote(inboundLiftId, noteText) {
  const cookieStore = await cookies();
  const appName = cookieStore.get(NAV_APP_COOKIE)?.value ?? "";
  const allowedPage = cookieStore.get(NAV_PAGE_COOKIE)?.value ?? "";

  if (!appName || allowedPage !== "inbound") {
    return { ok: false, message: "Open Inbound from the app menu." };
  }

  const liftId = toBigIntParam(inboundLiftId);
  const text = String(noteText ?? "").trim();

  if (liftId == null) {
    return { ok: false, message: "Select a lift item." };
  }

  if (!text) {
    return { ok: false, message: "Enter a note." };
  }

  try {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getClaims();

    if (!session?.claims) {
      return { ok: false, message: "You must be logged on." };
    }

    const userId =
      session.claims.sub ?? (await supabase.auth.getUser()).data.user?.id;

    if (!userId) {
      return { ok: false, message: "You must be logged on." };
    }

    const { error } = await supabase.rpc("pi_note_for_inbound_lift", {
      p_inbound_lift_id: liftId,
      p_note_text: text,
      p_user_id: userId,
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true, message: "" };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not add the note.",
    };
  }
}

export async function addInboundLoadNote(inboundLoadId, noteText) {
  const cookieStore = await cookies();
  const appName = cookieStore.get(NAV_APP_COOKIE)?.value ?? "";
  const allowedPage = cookieStore.get(NAV_PAGE_COOKIE)?.value ?? "";

  if (!appName || allowedPage !== "inbound") {
    return { ok: false, message: "Open Inbound from the app menu." };
  }

  const loadId = toBigIntParam(inboundLoadId);
  const text = String(noteText ?? "").trim();

  if (loadId == null) {
    return { ok: false, message: "Select a load item." };
  }

  if (!text) {
    return { ok: false, message: "Enter a note." };
  }

  try {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getClaims();

    if (!session?.claims) {
      return { ok: false, message: "You must be logged on." };
    }

    const userId =
      session.claims.sub ?? (await supabase.auth.getUser()).data.user?.id;

    if (!userId) {
      return { ok: false, message: "You must be logged on." };
    }

    const { error } = await supabase.rpc("pi_note_for_inbound_load", {
      p_inbound_load_id: loadId,
      p_note_text: text,
      p_user_id: userId,
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true, message: "" };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not add the note.",
    };
  }
}

export async function addTransportChannel({
  loadId,
  description,
  transportCompanyId,
  truckDriverId,
  truckId,
  truckTrailerId,
}) {
  const cookieStore = await cookies();
  const appName = cookieStore.get(NAV_APP_COOKIE)?.value ?? "";
  const allowedPage = cookieStore.get(NAV_PAGE_COOKIE)?.value ?? "";

  if (!appName || allowedPage !== "inbound") {
    return { ok: false, message: "Open Inbound from the app menu." };
  }

  const inboundLoadId = toBigIntParam(loadId);
  const companyId = toBigIntParam(transportCompanyId);
  const driverId = toBigIntParam(truckDriverId);
  const nextTruckId = toBigIntParam(truckId);
  const trailerId = toBigIntParam(truckTrailerId);

  if (inboundLoadId == null) {
    return { ok: false, message: "Select a load item." };
  }

  if (!String(description ?? "").trim()) {
    return { ok: false, message: "Enter a description." };
  }

  if (companyId == null || companyId === 0) {
    return { ok: false, message: "Select a transport company." };
  }

  if (driverId == null || driverId === 0) {
    return { ok: false, message: "Select a truck driver." };
  }

  if (nextTruckId == null || nextTruckId === 0) {
    return { ok: false, message: "Select a truck." };
  }

  if (trailerId == null || trailerId === 0) {
    return { ok: false, message: "Select a truck trailer." };
  }

  try {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getClaims();

    if (!session?.claims) {
      return { ok: false, message: "You must be logged on." };
    }

    const { error } = await supabase.rpc("pi_transport_channel", {
      p_inbound_load_id: inboundLoadId,
      p_descr: String(description ?? "").trim(),
      p_transport_company_id: companyId,
      p_truck_driver_id: driverId,
      p_truck_id: nextTruckId,
      p_truck_trailer_id: trailerId,
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true, message: "" };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Could not add the transport channel.",
    };
  }
}

export async function updateTransportChannel({
  loadId,
  description,
  transportCompanyId,
  truckDriverId,
  truckId,
  truckTrailerId,
}) {
  const cookieStore = await cookies();
  const appName = cookieStore.get(NAV_APP_COOKIE)?.value ?? "";
  const allowedPage = cookieStore.get(NAV_PAGE_COOKIE)?.value ?? "";

  if (!appName || allowedPage !== "inbound") {
    return { ok: false, message: "Open Inbound from the app menu." };
  }

  const inboundLoadId = toBigIntParam(loadId);
  const companyId = toBigIntParam(transportCompanyId);
  const driverId = toBigIntParam(truckDriverId);
  const nextTruckId = toBigIntParam(truckId);
  const trailerId = toBigIntParam(truckTrailerId);

  if (inboundLoadId == null) {
    return { ok: false, message: "Select a load item." };
  }

  if (!String(description ?? "").trim()) {
    return { ok: false, message: "Enter a description." };
  }

  if (companyId == null || companyId === 0) {
    return { ok: false, message: "Select a transport company." };
  }

  try {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getClaims();

    if (!session?.claims) {
      return { ok: false, message: "You must be logged on." };
    }

    const { error } = await supabase.rpc("pu_transport_channel", {
      p_id: inboundLoadId,
      p_inbound_load_id: inboundLoadId,
      p_descr: String(description ?? "").trim(),
      p_transport_company_id: companyId,
      p_truck_driver_id: driverId,
      p_truck_id: nextTruckId,
      p_truck_trailer_id: trailerId,
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true, message: "" };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Could not update the transport channel.",
    };
  }
}

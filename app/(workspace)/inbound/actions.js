"use server";

import { cookies } from "next/headers";
import { NAV_APP_COOKIE, NAV_PAGE_COOKIE } from "@/lib/nav-access";
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

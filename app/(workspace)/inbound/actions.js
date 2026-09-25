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
      ]);
      const id = fieldFromRow(row, ["id", "document_type_id"]) || label || String(index);

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

export async function loadDocumentTypes() {
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

    const { data, error } = await supabase.rpc("pr_document_types", {
      p_functional_area_id: 1,
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

    const { error } = await supabase.rpc(
      "pi_document_for_inbound_stock_item_tracking",
      {
        p_document_type_id: documentTypeId,
        p_inbound_stock_item_tracking_id: trackingId,
        p_filename: filename,
      },
    );

    if (error) {
      return { ok: false, message: error.message };
    }

    const { error: uploadError } = await supabase.storage
      .from("documents_clte_apex")
      .upload(`inbound_stock_item_tracking/${filename}`, file, {
        upsert: true,
        contentType: file.type || undefined,
      });

    if (uploadError) {
      return { ok: false, message: uploadError.message };
    }

    return { ok: true, message: "" };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Could not add the document.",
    };
  }
}

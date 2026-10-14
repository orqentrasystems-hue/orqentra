"use server";

import { cookies } from "next/headers";
import { NAV_APP_COOKIE, NAV_PAGE_COOKIE } from "@/lib/nav-access";
import { createClient } from "@/lib/supabase/server";

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

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value ?? "").trim());
}

export async function loadTradesInterview(fromDate, toDate) {
  const cookieStore = await cookies();
  const appName = cookieStore.get(NAV_APP_COOKIE)?.value ?? "";
  const allowedPage = cookieStore.get(NAV_PAGE_COOKIE)?.value ?? "";

  if (!appName || allowedPage !== "rpt-trades-overview") {
    return {
      ok: false,
      message: "Open Trades Overview from the app menu.",
      rows: [],
    };
  }

  const from = String(fromDate ?? "").trim();
  const to = String(toDate ?? "").trim();

  if (!isIsoDate(from) || !isIsoDate(to)) {
    return { ok: false, message: "Select a valid date range.", rows: [] };
  }

  if (from > to) {
    return {
      ok: false,
      message: "From Date must be on or before To Date.",
      rows: [],
    };
  }

  try {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getClaims();

    if (!session?.claims) {
      return { ok: false, message: "You must be logged on.", rows: [] };
    }

    const { data, error } = await supabase.rpc("pr_rpt_trades_interview", {
      p_from: from,
      p_to: to,
    });

    if (error) {
      return {
        ok: false,
        message: "Could not load trade status overview.",
        rows: [],
      };
    }

    return {
      ok: true,
      message: "",
      rows: JSON.parse(JSON.stringify(toRows(data))),
    };
  } catch {
    return {
      ok: false,
      message: "Could not load trade status overview.",
      rows: [],
    };
  }
}

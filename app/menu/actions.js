"use server";

import { createClient } from "@/lib/supabase/server";

export async function addPpi(prevState, formData) {
  const username = String(formData.get("username") ?? "").trim();

  if (!username) {
    return { ok: false, message: "Username is required." };
  }

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();

    if (!data?.claims) {
      return { ok: false, message: "You must be logged on." };
    }

    const { error } = await supabase.rpc("ppi", {
      p_description: username,
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true, message: "Added." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not add.",
    };
  }
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

export async function getAll(prevState) {
  try {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getClaims();

    if (!session?.claims) {
      return { ok: false, message: "You must be logged on.", rows: [] };
    }

    const { data, error } = await supabase.rpc("pi_getall");

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
      message: error instanceof Error ? error.message : "Could not get rows.",
      rows: [],
    };
  }
}

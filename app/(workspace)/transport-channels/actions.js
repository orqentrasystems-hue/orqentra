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

function toInteger(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  const text = String(value ?? "").trim();
  return /^-?\d+$/.test(text) ? Number(text) : NaN;
}

function toBigIntParam(value) {
  const text = String(value ?? "").trim();

  if (!/^-?\d+$/.test(text)) {
    return null;
  }

  const n = Number(text);
  return Number.isSafeInteger(n) ? n : text;
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

function toBoolean(value) {
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

function requiredFieldsMessage(fields) {
  const missing = fields
    .filter((field) => !String(field.value ?? "").trim())
    .map((field) => field.label);

  if (!missing.length) {
    return "";
  }

  if (missing.length === 1) {
    return `${missing[0]} is required.`;
  }

  return `${missing[0]} and ${missing[1]} are required.`;
}

async function requireTransportChannelsPage() {
  const cookieStore = await cookies();
  const appName = cookieStore.get(NAV_APP_COOKIE)?.value ?? "";
  const allowedPage = cookieStore.get(NAV_PAGE_COOKIE)?.value ?? "";

  if (!appName || allowedPage !== "transport-channels") {
    return { ok: false, message: "Open Transport Channels from the app menu." };
  }

  return { ok: true, message: "" };
}

export async function loadTransportCompanies() {
  const access = await requireTransportChannelsPage();

  if (!access.ok) {
    return { ok: false, message: access.message, rows: [] };
  }

  try {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getClaims();

    if (!session?.claims) {
      return { ok: false, message: "You must be logged on.", rows: [] };
    }

    const { data, error } = await supabase.rpc("pr_transport_companies", {
      p_active_only: false,
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
          : "Could not load transport companies.",
      rows: [],
    };
  }
}

export async function loadAllowAction(functionId, appId) {
  const access = await requireTransportChannelsPage();

  if (!access.ok) {
    return { ok: false, message: access.message, value: 0 };
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

async function loadCompanyChildRows(
  rpcName,
  transportCompanyId,
  fallbackMessage,
) {
  const access = await requireTransportChannelsPage();

  if (!access.ok) {
    return { ok: false, message: access.message, rows: [] };
  }

  const companyId = toInteger(transportCompanyId);

  if (!Number.isInteger(companyId)) {
    return { ok: true, message: "", rows: [] };
  }

  try {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getClaims();

    if (!session?.claims) {
      return { ok: false, message: "You must be logged on.", rows: [] };
    }

    const { data, error } = await supabase.rpc(rpcName, {
      p_transport_company_id: companyId,
      p_active_only: false,
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
        error instanceof Error ? error.message : fallbackMessage,
      rows: [],
    };
  }
}

export async function loadTruckDrivers(transportCompanyId) {
  return loadCompanyChildRows(
    "pr_truck_driver",
    transportCompanyId,
    "Could not load drivers.",
  );
}

export async function loadTrucks(transportCompanyId) {
  return loadCompanyChildRows(
    "pr_truck",
    transportCompanyId,
    "Could not load trucks.",
  );
}

export async function loadTruckTrailers(transportCompanyId) {
  return loadCompanyChildRows(
    "pr_truck_trailer",
    transportCompanyId,
    "Could not load trailers.",
  );
}

export async function addTruckTrailer({
  transportCompanyId,
  make,
  model,
  registrationNumber,
}) {
  const access = await requireTransportChannelsPage();

  if (!access.ok) {
    return { ok: false, message: access.message };
  }

  const companyId = toInteger(transportCompanyId);

  if (!Number.isInteger(companyId)) {
    return { ok: false, message: "Select a transport company." };
  }

  const requiredMessage = requiredFieldsMessage([
    { value: make, label: "Make" },
    { value: registrationNumber, label: "Registration Number" },
  ]);

  if (requiredMessage) {
    return { ok: false, message: requiredMessage };
  }

  try {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getClaims();

    if (!session?.claims) {
      return { ok: false, message: "You must be logged on." };
    }

    const { error } = await supabase.rpc("pi_truck_trailer", {
      p_transport_company_id: companyId,
      p_make: String(make ?? "").trim(),
      p_model: String(model ?? "").trim(),
      p_registration_number: String(registrationNumber ?? "").trim(),
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true, message: "" };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Could not add the trailer.",
    };
  }
}

export async function addTruck({
  transportCompanyId,
  make,
  model,
  registrationNumber,
}) {
  const access = await requireTransportChannelsPage();

  if (!access.ok) {
    return { ok: false, message: access.message };
  }

  const companyId = toInteger(transportCompanyId);

  if (!Number.isInteger(companyId)) {
    return { ok: false, message: "Select a transport company." };
  }

  const requiredMessage = requiredFieldsMessage([
    { value: make, label: "Make" },
    { value: registrationNumber, label: "Registration Number" },
  ]);

  if (requiredMessage) {
    return { ok: false, message: requiredMessage };
  }

  try {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getClaims();

    if (!session?.claims) {
      return { ok: false, message: "You must be logged on." };
    }

    const { error } = await supabase.rpc("pi_truck", {
      p_transport_company_id: companyId,
      p_make: String(make ?? "").trim(),
      p_model: String(model ?? "").trim(),
      p_registration_number: String(registrationNumber ?? "").trim(),
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true, message: "" };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Could not add the truck.",
    };
  }
}

export async function addTruckDriver({
  transportCompanyId,
  name,
  surname,
  nationalIdNumber,
}) {
  const access = await requireTransportChannelsPage();

  if (!access.ok) {
    return { ok: false, message: access.message };
  }

  const companyId = toInteger(transportCompanyId);

  if (!Number.isInteger(companyId)) {
    return { ok: false, message: "Select a transport company." };
  }

  const requiredMessage = requiredFieldsMessage([
    { value: name, label: "Name" },
    { value: surname, label: "Surname" },
  ]);

  if (requiredMessage) {
    return { ok: false, message: requiredMessage };
  }

  try {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getClaims();

    if (!session?.claims) {
      return { ok: false, message: "You must be logged on." };
    }

    const { error } = await supabase.rpc("pi_truck_driver", {
      p_transport_company_id: companyId,
      p_name: String(name ?? "").trim(),
      p_surname: String(surname ?? "").trim(),
      p_national_id_number: String(nationalIdNumber ?? "").trim(),
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true, message: "" };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Could not add the driver.",
    };
  }
}

export async function addTransportCompany({ companyName, contactNo, email }) {
  const access = await requireTransportChannelsPage();

  if (!access.ok) {
    return { ok: false, message: access.message };
  }

  const requiredMessage = requiredFieldsMessage([
    { value: companyName, label: "Company Name" },
  ]);

  if (requiredMessage) {
    return { ok: false, message: requiredMessage };
  }

  try {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getClaims();

    if (!session?.claims) {
      return { ok: false, message: "You must be logged on." };
    }

    const { error } = await supabase.rpc("pi_transport_company", {
      p_company_name: String(companyName ?? "").trim(),
      p_contact_no: String(contactNo ?? "").trim(),
      p_email: String(email ?? "").trim(),
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
          : "Could not add the transport company.",
    };
  }
}

export async function updateTruck({
  id,
  make,
  model,
  registrationNumber,
  isActive,
}) {
  const access = await requireTransportChannelsPage();

  if (!access.ok) {
    return { ok: false, message: access.message };
  }

  const truckId = Number.isInteger(toInteger(id))
    ? toInteger(id)
    : toBigIntParam(id);

  if (truckId == null || truckId === "") {
    return { ok: false, message: "Missing truck id." };
  }

  const requiredMessage = requiredFieldsMessage([
    { value: make, label: "Make" },
    { value: registrationNumber, label: "Registration Number" },
  ]);

  if (requiredMessage) {
    return { ok: false, message: requiredMessage };
  }

  try {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getClaims();

    if (!session?.claims) {
      return { ok: false, message: "You must be logged on." };
    }

    const { error } = await supabase.rpc("pu_truck", {
      p_id: truckId,
      p_make: String(make ?? "").trim(),
      p_model: String(model ?? "").trim(),
      p_registration_number: String(registrationNumber ?? "").trim(),
      p_is_active: toBoolean(isActive),
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true, message: "" };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Could not update the truck.",
    };
  }
}

export async function updateTruckTrailer({
  id,
  make,
  model,
  registrationNumber,
  isActive,
}) {
  const access = await requireTransportChannelsPage();

  if (!access.ok) {
    return { ok: false, message: access.message };
  }

  const trailerId = Number.isInteger(toInteger(id))
    ? toInteger(id)
    : toBigIntParam(id);

  if (trailerId == null || trailerId === "") {
    return { ok: false, message: "Missing trailer id." };
  }

  const requiredMessage = requiredFieldsMessage([
    { value: make, label: "Make" },
    { value: registrationNumber, label: "Registration Number" },
  ]);

  if (requiredMessage) {
    return { ok: false, message: requiredMessage };
  }

  try {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getClaims();

    if (!session?.claims) {
      return { ok: false, message: "You must be logged on." };
    }

    const { error } = await supabase.rpc("pu_truck_trailer", {
      p_id: trailerId,
      p_make: String(make ?? "").trim(),
      p_model: String(model ?? "").trim(),
      p_registration_number: String(registrationNumber ?? "").trim(),
      p_is_active: toBoolean(isActive),
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
          : "Could not update the trailer.",
    };
  }
}

export async function updateTruckDriver({
  id,
  name,
  surname,
  nationalIdNumber,
  isActive,
}) {
  const access = await requireTransportChannelsPage();

  if (!access.ok) {
    return { ok: false, message: access.message };
  }

  const driverId = Number.isInteger(toInteger(id))
    ? toInteger(id)
    : toBigIntParam(id);

  if (driverId == null || driverId === "") {
    return { ok: false, message: "Missing driver id." };
  }

  const requiredMessage = requiredFieldsMessage([
    { value: name, label: "Name" },
    { value: surname, label: "Surname" },
  ]);

  if (requiredMessage) {
    return { ok: false, message: requiredMessage };
  }

  try {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getClaims();

    if (!session?.claims) {
      return { ok: false, message: "You must be logged on." };
    }

    const { error } = await supabase.rpc("pu_truck_driver", {
      p_id: driverId,
      p_name: String(name ?? "").trim(),
      p_surname: String(surname ?? "").trim(),
      p_national_id_number: String(nationalIdNumber ?? "").trim(),
      p_is_active: toBoolean(isActive),
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
          : "Could not update the driver.",
    };
  }
}

export async function updateTransportCompany({
  id,
  companyName,
  contactNo,
  email,
  isActive,
}) {
  const access = await requireTransportChannelsPage();

  if (!access.ok) {
    return { ok: false, message: access.message };
  }

  const companyId = toBigIntParam(id);

  if (companyId == null) {
    return { ok: false, message: "Missing company id." };
  }

  const requiredMessage = requiredFieldsMessage([
    { value: companyName, label: "Company Name" },
  ]);

  if (requiredMessage) {
    return { ok: false, message: requiredMessage };
  }

  try {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getClaims();

    if (!session?.claims) {
      return { ok: false, message: "You must be logged on." };
    }

    const { error } = await supabase.rpc("pu_transport_company", {
      p_id: companyId,
      p_company_name: String(companyName ?? "").trim(),
      p_contact_no: String(contactNo ?? "").trim(),
      p_email: String(email ?? "").trim(),
      p_is_active: toBoolean(isActive),
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
          : "Could not update the transport company.",
    };
  }
}

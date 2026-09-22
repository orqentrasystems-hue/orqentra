import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import PermissionsGrid from "./PermissionsGrid";
import UsersDropdown from "./UsersDropdown";
import { NAV_APP_COOKIE, NAV_PAGE_COOKIE } from "@/lib/nav-access";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Permissions",
  description: "Permissions",
};

export const dynamic = "force-dynamic";

const SELECT_USER = {
  id: "0",
  email: " - SELECT -",
};

function firstString(value) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
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

function rawField(row, name) {
  if (!row || typeof row !== "object") {
    return undefined;
  }

  const match = Object.keys(row).find(
    (key) => key.toLowerCase() === name.toLowerCase(),
  );

  return match ? row[match] : undefined;
}

function field(row, name) {
  const value = rawField(row, name);
  return value == null ? "" : String(value);
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

function toReturnedInteger(data) {
  if (data == null) {
    return 0;
  }

  if (typeof data === "bigint") {
    return data > BigInt(Number.MAX_SAFE_INTEGER)
      ? Number.MAX_SAFE_INTEGER
      : Number(data);
  }

  if (typeof data === "number" && Number.isFinite(data)) {
    return Math.trunc(data);
  }

  if (typeof data === "boolean") {
    return data ? 1 : 0;
  }

  if (Array.isArray(data)) {
    return toReturnedInteger(data[0]);
  }

  if (typeof data === "object") {
    return toReturnedInteger(Object.values(data)[0]);
  }

  const n = Number(String(data).trim());
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

async function permCheckedByFunctionId(supabase, userId, appName, rows) {
  const checkedById = {};

  if (!userId || userId === SELECT_USER.id) {
    return checkedById;
  }

  const userIdNumber = Number(userId);

  await Promise.all(
    rows.map(async (row) => {
      const functionId = integerId(rawField(row, "id"));

      if (!functionId) {
        return;
      }

      const { data, error } = await supabase.rpc("pr_perms_by_user_and_app", {
        p_user_id: userIdNumber,
        p_function_id: Number(functionId),
        p_app_name: appName,
      });

      checkedById[functionId] = !error && toReturnedInteger(data) > 0;
    }),
  );

  return checkedById;
}

export default async function PermissionsPage({ searchParams }) {
  const cookieStore = await cookies();
  const appName = cookieStore.get(NAV_APP_COOKIE)?.value ?? "";
  const allowedPage = cookieStore.get(NAV_PAGE_COOKIE)?.value ?? "";

  if (!appName) {
    redirect("/landing");
  }

  if (allowedPage !== "permissions") {
    redirect(`/app-menu?app=${encodeURIComponent(appName)}`);
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims) {
    redirect("/");
  }

  const [usersResult, functionsResult] = await Promise.all([
    supabase.rpc("pr_users_by_app", { p_app_name: appName }),
    supabase.rpc("pr_functions_by_app", { p_app_name: appName }),
  ]);

  const users = [
    SELECT_USER,
    ...toRows(usersResult.data)
      .map((row) => ({
        id: integerId(rawField(row, "id")),
        email: field(row, "email"),
      }))
      .filter((user) => user.id !== "" && user.id !== SELECT_USER.id),
  ];

  const requestedUser = firstString((await searchParams).user).trim();
  const selectedUserId = users.some((user) => user.id === requestedUser)
    ? requestedUser
    : SELECT_USER.id;

  const functionRows = JSON.parse(JSON.stringify(toRows(functionsResult.data)));
  const checkedById = functionsResult.error
    ? {}
    : await permCheckedByFunctionId(
        supabase,
        selectedUserId,
        appName,
        functionRows,
      );

  return (
    <>
      <h1 className="text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
        Permissions
      </h1>
      {usersResult.error ? (
        <p className="text-sm text-red-700 dark:text-red-400">
          {usersResult.error.message}
        </p>
      ) : (
        <UsersDropdown users={users} selectedId={selectedUserId} />
      )}
      {functionsResult.error ? (
        <p className="text-sm text-red-700 dark:text-red-400">
          {functionsResult.error.message}
        </p>
      ) : (
        <PermissionsGrid
          key={selectedUserId}
          rows={functionRows}
          checkedById={checkedById}
          selectedUserId={selectedUserId}
        />
      )}
    </>
  );
}

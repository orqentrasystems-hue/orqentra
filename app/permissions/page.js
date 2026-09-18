import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { exitApp, signOut } from "../actions";
import UsersDropdown from "./UsersDropdown";
import { NAV_APP_COOKIE, NAV_PAGE_COOKIE } from "@/lib/nav-access";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Permissions",
  description: "Permissions",
};

export const dynamic = "force-dynamic";

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

function formatCell(value) {
  if (value == null) {
    return "";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function isFunctionColumn(column) {
  return column.toLowerCase() === "function";
}

function CheckboxCell({ id, checked }) {
  return (
    <td className="px-3 py-2 align-middle">
      <input
        type="checkbox"
        name="functions"
        value={id}
        defaultChecked={checked}
        aria-label={`Select function ${id}`}
        className="h-4 w-4"
      />
    </td>
  );
}

function headerCells(columns, hasFunctionColumn) {
  const cells = [];

  if (!hasFunctionColumn) {
    cells.push(
      <th
        key="selected"
        className="w-10 px-3 py-2 font-medium"
        aria-label="Selected"
      />,
    );
  }

  for (const column of columns) {
    if (isFunctionColumn(column)) {
      cells.push(
        <th
          key="selected"
          className="w-10 px-3 py-2 font-medium"
          aria-label="Selected"
        />,
      );
    }

    cells.push(
      <th key={column} className="px-3 py-2 font-medium">
        {column}
      </th>,
    );
  }

  return cells;
}

function bodyCells(columns, hasFunctionColumn, id, row, checked) {
  const cells = [];

  if (!hasFunctionColumn) {
    cells.push(<CheckboxCell key="selected" id={id} checked={checked} />);
  }

  for (const column of columns) {
    if (isFunctionColumn(column)) {
      cells.push(<CheckboxCell key="selected" id={id} checked={checked} />);
    }

    cells.push(
      <td key={column} className="px-3 py-2 align-top">
        {formatCell(row[column])}
      </td>,
    );
  }

  return cells;
}

function ResultGrid({ rows, checkedById }) {
  if (!rows?.length) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">No rows.</p>
    );
  }

  const columns = Object.keys(rows[0]).filter(
    (column) => column.toLowerCase() !== "id",
  );
  const hasFunctionColumn = columns.some(isFunctionColumn);

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm text-zinc-800 dark:text-zinc-200">
        <thead>
          <tr className="border-b border-zinc-300 dark:border-zinc-600">
            {headerCells(columns, hasFunctionColumn)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const id = integerId(rawField(row, "id")) || String(index);
            const checked = Boolean(checkedById[id]);

            return (
              <tr
                key={id}
                className="border-b border-zinc-200 dark:border-zinc-700"
              >
                {bodyCells(columns, hasFunctionColumn, id, row, checked)}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

async function permCheckedByFunctionId(supabase, userId, appName, rows) {
  const checkedById = {};

  if (!userId) {
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

  const users = toRows(usersResult.data)
    .map((row) => ({
      id: integerId(rawField(row, "id")),
      email: field(row, "email"),
    }))
    .filter((user) => user.id !== "");

  const requestedUser = firstString((await searchParams).user).trim();
  const selectedUserId = users.some((user) => user.id === requestedUser)
    ? requestedUser
    : (users[0]?.id ?? "");

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
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <header className="flex w-full items-center justify-between px-16 py-4">
        <form action={exitApp}>
          <button
            type="submit"
            className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            Exit App
          </button>
        </form>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            Sign Out
          </button>
        </form>
      </header>
      <main className="flex w-full max-w-5xl flex-col items-start gap-6 px-16 py-4 bg-white dark:bg-black">
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
          <ResultGrid
            key={selectedUserId}
            rows={functionRows}
            checkedById={checkedById}
          />
        )}
      </main>
    </div>
  );
}

import { requireMenuPage } from "../requireMenuPage";
import InboundPanel from "./InboundPanel";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Inbound",
  description: "Inbound",
};

export const dynamic = "force-dynamic";

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

function field(row, names) {
  for (const name of names) {
    const value = rawField(row, name);
    if (value != null && String(value).trim() !== "") {
      return String(value);
    }
  }

  return "";
}

function toOptions(data) {
  return toRows(data)
    .map((row, index) => {
      const label = field(row, [
        "descr",
        "description",
        "name",
        "status",
        "trade_status",
        "value",
      ]);
      const id = field(row, ["id", "status_id"]) || label || String(index);

      return { id, label: label || id };
    })
    .filter((option) => option.id !== "");
}

export default async function InboundPage() {
  await requireMenuPage("inbound");

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId =
    claimsData?.claims?.sub ??
    (await supabase.auth.getUser()).data.user?.id ??
    "";
  const { data, error } = await supabase.rpc("pr_trade_statuses");
  const options = error ? [] : JSON.parse(JSON.stringify(toOptions(data)));

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-navy-950">
          Inbound
        </h1>
        <div className="h-0.5 w-12 bg-gold-600" aria-hidden="true" />
      </div>
      {error ? (
        <p className="text-sm text-red-700 dark:text-red-400">{error.message}</p>
      ) : (
        <InboundPanel options={options} userId={userId} />
      )}
    </>
  );
}

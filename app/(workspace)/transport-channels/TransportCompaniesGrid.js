"use client";

import { useEffect, useRef, useState } from "react";
import {
  addTransportCompany,
  addTruck,
  addTruckDriver,
  addTruckTrailer,
  loadAllowAction,
  loadTransportCompanies,
  loadTruckDrivers,
  loadTruckTrailers,
  loadTrucks,
  updateTransportCompany,
  updateTruck,
  updateTruckDriver,
  updateTruckTrailer,
} from "./actions";

const KEY_LABELS = {
  company_name: "Company Name",
  contact_no: "Contact No.",
  email: "Email",
  is_active: "Is Active",
  name: "Name",
  surname: "Surname",
  first_name: "First Name",
  last_name: "Last Name",
  phone: "Phone",
  licence_number: "Licence Number",
  license_number: "Licence Number",
  make: "Make",
  model: "Model",
  registration_number: "Registration Number",
  trailer: "Trailer",
  national_id_number: "National ID Number",
};

const HIDDEN_KEYS = new Set(["id"]);

const INPUT_CLASS =
  "w-full min-w-24 rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-800";

function fieldByKey(row, name) {
  if (!row || typeof row !== "object") {
    return undefined;
  }

  const match = Object.keys(row).find(
    (key) => key.toLowerCase() === name.toLowerCase(),
  );
  return match ? row[match] : undefined;
}

function trimmedField(row, ...names) {
  for (const name of names) {
    const value = fieldByKey(row, name);

    if (value != null) {
      return String(value).trim();
    }
  }

  return "";
}

function requiredFieldsMessage(row, fields) {
  const missing = fields
    .filter((field) => !trimmedField(row, ...field.keys))
    .map((field) => field.label);

  if (!missing.length) {
    return "";
  }

  if (missing.length === 1) {
    return `${missing[0]} is required.`;
  }

  return `${missing[0]} and ${missing[1]} are required.`;
}

const COMPANY_REQUIRED = [
  { keys: ["company_name"], label: "Company Name" },
];
const DRIVER_REQUIRED = [
  { keys: ["name", "first_name"], label: "Name" },
  { keys: ["surname", "last_name"], label: "Surname" },
];
const VEHICLE_REQUIRED = [
  { keys: ["make"], label: "Make" },
  { keys: ["registration_number"], label: "Registration Number" },
];

function useOutsideDismiss(ref, enabled, onDismiss) {
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    function onPointerDown(event) {
      if (ref.current?.contains(event.target)) {
        return;
      }

      onDismissRef.current();
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [ref, enabled]);
}

function rowId(row) {
  const value = fieldByKey(row, "id");
  return value == null ? "" : String(value);
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

function labelForKey(key) {
  return KEY_LABELS[key.toLowerCase()] ?? key;
}

function columnFromKey(key) {
  return {
    key,
    label: labelForKey(key),
    isActive: key.toLowerCase() === "is_active",
    isCompanyName: key.toLowerCase() === "company_name",
    isContactNo: key.toLowerCase() === "contact_no",
    isEmail: key.toLowerCase() === "email",
  };
}

const DEFAULT_COLUMNS = [
  "company_name",
  "contact_no",
  "email",
  "is_active",
].map(columnFromKey);

function columnsFromRows(rows) {
  const row = rows[0];

  if (!row || typeof row !== "object") {
    return DEFAULT_COLUMNS;
  }

  const columns = Object.keys(row)
    .filter((key) => !HIDDEN_KEYS.has(key.toLowerCase()))
    .map(columnFromKey);

  return columns.length ? columns : DEFAULT_COLUMNS;
}

function emptyDraft(columns) {
  const draft = {};

  for (const column of columns) {
    draft[column.key] = column.isActive ? false : "";
  }

  return draft;
}

function columnsFromChildRows(rows, fallback) {
  const row = rows[0];

  if (!row || typeof row !== "object") {
    return fallback;
  }

  const columns = Object.keys(row)
    .filter((key) => !HIDDEN_KEYS.has(key.toLowerCase()))
    .map(columnFromKey);
  const seen = new Set(columns.map((column) => column.key.toLowerCase()));

  for (const column of fallback) {
    if (!seen.has(column.key.toLowerCase())) {
      columns.push(column);
    }
  }

  return columns.length ? columns : fallback;
}

const DEFAULT_DRIVER_COLUMNS = [
  "name",
  "surname",
  "national_id_number",
  "is_active",
].map(columnFromKey);

const DEFAULT_TRUCK_COLUMNS = [
  "make",
  "model",
  "registration_number",
  "is_active",
].map(columnFromKey);

const DEFAULT_TRAILER_COLUMNS = [
  "make",
  "model",
  "registration_number",
  "is_active",
].map(columnFromKey);

function formatCell(column, value) {
  if (column.isActive) {
    return toBoolean(value) ? "true" : "false";
  }

  if (value == null) {
    return "";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function editFromRow(row) {
  return {
    id: rowId(row),
    company_name: String(fieldByKey(row, "company_name") ?? ""),
    contact_no: String(fieldByKey(row, "contact_no") ?? ""),
    email: String(fieldByKey(row, "email") ?? ""),
    is_active: toBoolean(fieldByKey(row, "is_active")),
  };
}

function ActiveSwitch({ checked, disabled, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label="Is Active"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50",
        checked ? "bg-gold-600" : "bg-zinc-300",
      ].join(" ")}
    >
      <span
        className={[
          "inline-block h-4 w-4 rounded-full bg-white transition-transform",
          checked ? "translate-x-4" : "translate-x-0.5",
        ].join(" ")}
      />
    </button>
  );
}

function editFromChildRow(row, columns) {
  const edit = { id: rowId(row) };

  for (const column of columns) {
    const value = fieldByKey(row, column.key);
    edit[column.key] = column.isActive
      ? toBoolean(value)
      : String(value ?? "");
  }

  return edit;
}

function ChildGrid({
  title,
  rows,
  message,
  pending,
  defaultColumns = [],
  addLabel = "",
  showAdd = false,
  showEdit = false,
  draft = null,
  editRow = null,
  onAdd,
  onDraftChange,
  onCommit,
  onEditSelect,
  onEditChange,
  onEditCommit,
  onDismiss,
  commitPending = false,
  commitMessage = "",
}) {
  const gridRef = useRef(null);
  const columns = columnsFromChildRows(rows, defaultColumns);
  const showGrid = Boolean(rows.length || draft);
  const showActionColumn = Boolean(draft || showAdd || showEdit);

  useOutsideDismiss(
    gridRef,
    Boolean((draft || editRow) && !commitPending),
    () => onDismiss?.(),
  );

  function valueCell(column, values, onChange) {
    if (column.isActive) {
      return (
        <ActiveSwitch
          checked={toBoolean(values?.[column.key])}
          disabled={commitPending}
          onChange={(is_active) =>
            onChange?.({ ...values, [column.key]: is_active })
          }
        />
      );
    }

    return (
      <input
        aria-label={column.label}
        type="text"
        value={values?.[column.key] ?? ""}
        disabled={commitPending}
        onChange={(event) =>
          onChange?.({ ...values, [column.key]: event.target.value })
        }
        className={INPUT_CLASS}
      />
    );
  }

  return (
    <div
      ref={gridRef}
      className="flex min-w-0 w-full flex-col items-start gap-2"
    >
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-navy-950">{title}</h2>
        {showAdd && addLabel && !draft && !editRow ? (
          <button
            type="button"
            disabled={pending || commitPending}
            onClick={() => onAdd?.(emptyDraft(columns))}
            className="text-sm font-medium text-blue-900 underline disabled:opacity-50"
          >
            {addLabel}
          </button>
        ) : null}
      </div>
      <div className="w-full overflow-x-auto rounded border border-zinc-300">
        {pending && !showGrid ? (
          <p className="px-3 py-2 text-sm text-zinc-600">Loading…</p>
        ) : message && !showGrid ? (
          <p className="px-3 py-2 text-sm text-red-700">{message}</p>
        ) : !showGrid ? (
          <p className="px-3 py-2 text-sm text-zinc-600">No rows.</p>
        ) : (
          <table className="w-full border-collapse text-left text-sm text-zinc-800">
            <thead>
              <tr className="border-b border-zinc-300 bg-zinc-50 text-navy-950">
                {columns.map((column) => (
                  <th key={column.key} className="px-3 py-2 font-bold">
                    {column.label}
                  </th>
                ))}
                {showActionColumn ? (
                  <th className="px-3 py-2 font-bold" aria-label="Edit" />
                ) : null}
              </tr>
            </thead>
            <tbody>
              {draft ? (
                <tr className="border-b border-zinc-200 bg-zinc-100 shadow-[inset_4px_0_0_0_#AD8A40]">
                  {columns.map((column) => (
                    <td key={column.key} className="px-3 py-2 align-middle">
                      {valueCell(column, draft, onDraftChange)}
                    </td>
                  ))}
                  <td className="px-3 py-2 align-middle">
                    <button
                      type="button"
                      disabled={commitPending}
                      onClick={onCommit}
                      className="text-sm font-medium text-blue-900 underline disabled:opacity-50"
                    >
                      {commitPending ? "Saving…" : "Commit"}
                    </button>
                  </td>
                </tr>
              ) : null}
              {rows.map((row, index) => {
                const id = rowId(row);
                const editing = Boolean(
                  editRow && id !== "" && id === String(editRow.id ?? ""),
                );

                return (
                  <tr
                    key={id || index}
                    className={[
                      "border-b border-zinc-200",
                      editing
                        ? "bg-zinc-100 shadow-[inset_4px_0_0_0_#AD8A40]"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {columns.map((column) => (
                      <td key={column.key} className="px-3 py-2 align-middle">
                        {editing
                          ? valueCell(column, editRow, onEditChange)
                          : formatCell(column, row[column.key])}
                      </td>
                    ))}
                    {showActionColumn ? (
                      <td className="px-3 py-2 align-middle">
                        {editing ? (
                          <button
                            type="button"
                            disabled={commitPending}
                            onClick={onEditCommit}
                            className="text-sm font-medium text-blue-900 underline disabled:opacity-50"
                          >
                            {commitPending ? "Saving…" : "Commit"}
                          </button>
                        ) : showEdit && !draft ? (
                          <button
                            type="button"
                            disabled={commitPending}
                            onClick={() =>
                              onEditSelect?.(editFromChildRow(row, columns))
                            }
                            className="text-sm font-medium text-blue-900 underline disabled:opacity-50"
                          >
                            Edit
                          </button>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {message && rows.length ? (
        <p className="text-sm text-red-700">{message}</p>
      ) : null}
      {commitMessage ? (
        <p className="text-sm text-red-700">{commitMessage}</p>
      ) : null}
    </div>
  );
}

export default function TransportCompaniesGrid() {
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(true);
  const [allow, setAllow] = useState(0);
  const [selectedId, setSelectedId] = useState("");
  const [editRow, setEditRow] = useState(null);
  const [draft, setDraft] = useState(null);
  const [commitPending, setCommitPending] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");
  const [driverRows, setDriverRows] = useState([]);
  const [driverMessage, setDriverMessage] = useState("");
  const [driverPending, setDriverPending] = useState(false);
  const [driverDraft, setDriverDraft] = useState(null);
  const [driverEdit, setDriverEdit] = useState(null);
  const [driverCommitPending, setDriverCommitPending] = useState(false);
  const [driverCommitMessage, setDriverCommitMessage] = useState("");
  const [truckRows, setTruckRows] = useState([]);
  const [truckMessage, setTruckMessage] = useState("");
  const [truckPending, setTruckPending] = useState(false);
  const [truckDraft, setTruckDraft] = useState(null);
  const [truckEdit, setTruckEdit] = useState(null);
  const [truckCommitPending, setTruckCommitPending] = useState(false);
  const [truckCommitMessage, setTruckCommitMessage] = useState("");
  const [trailerRows, setTrailerRows] = useState([]);
  const [trailerMessage, setTrailerMessage] = useState("");
  const [trailerPending, setTrailerPending] = useState(false);
  const [trailerDraft, setTrailerDraft] = useState(null);
  const [trailerEdit, setTrailerEdit] = useState(null);
  const [trailerCommitPending, setTrailerCommitPending] = useState(false);
  const [trailerCommitMessage, setTrailerCommitMessage] = useState("");

  const showEdit = allow > 0;
  const columns = columnsFromRows(rows);
  const showGrid = Boolean(rows.length || draft);
  const companyGridRef = useRef(null);

  useOutsideDismiss(
    companyGridRef,
    Boolean((draft || editRow) && !commitPending),
    () => {
      setDraft(null);
      setEditRow(null);
      setCommitMessage("");
    },
  );

  async function reloadCompanies() {
    const result = await loadTransportCompanies();
    setRows(result.rows);
    setMessage(result.ok ? "" : result.message);
    setSelectedId((current) =>
      current && result.rows.some((row) => rowId(row) === current)
        ? current
        : "",
    );
    return result;
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setPending(true);
      const [companies, allowResult] = await Promise.all([
        loadTransportCompanies(),
        loadAllowAction(14, 1),
      ]);

      if (cancelled) {
        return;
      }

      setRows(companies.rows);
      setMessage(companies.ok ? "" : companies.message);
      setAllow(allowResult.ok ? allowResult.value : 0);
      setPending(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setDriverDraft(null);
      setDriverEdit(null);
      setDriverCommitMessage("");
      setTruckDraft(null);
      setTruckEdit(null);
      setTruckCommitMessage("");
      setTrailerDraft(null);
      setTrailerEdit(null);
      setTrailerCommitMessage("");

      if (!selectedId) {
        setDriverRows([]);
        setDriverMessage("");
        setDriverPending(false);
        setTruckRows([]);
        setTruckMessage("");
        setTruckPending(false);
        setTrailerRows([]);
        setTrailerMessage("");
        setTrailerPending(false);
        return;
      }

      setDriverPending(true);
      setTruckPending(true);
      setTrailerPending(true);
      const [drivers, trucks, trailers] = await Promise.all([
        loadTruckDrivers(selectedId),
        loadTrucks(selectedId),
        loadTruckTrailers(selectedId),
      ]);

      if (cancelled) {
        return;
      }

      setDriverRows(drivers.rows);
      setDriverMessage(drivers.ok ? "" : drivers.message);
      setDriverPending(false);
      setTruckRows(trucks.rows);
      setTruckMessage(trucks.ok ? "" : trucks.message);
      setTruckPending(false);
      setTrailerRows(trailers.rows);
      setTrailerMessage(trailers.ok ? "" : trailers.message);
      setTrailerPending(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  async function onCommit() {
    if (!editRow || commitPending) {
      return;
    }

    const requiredMessage = requiredFieldsMessage(editRow, COMPANY_REQUIRED);

    if (requiredMessage) {
      setCommitMessage(requiredMessage);
      return;
    }

    setCommitPending(true);
    setCommitMessage("");
    const result = await updateTransportCompany({
      id: editRow.id,
      companyName: editRow.company_name,
      contactNo: editRow.contact_no,
      email: editRow.email,
      isActive: editRow.is_active,
    });

    if (!result.ok) {
      setCommitPending(false);
      setCommitMessage(result.message);
      return;
    }

    setEditRow(null);
    setCommitPending(false);
    setPending(true);
    await reloadCompanies();
    setPending(false);
  }

  async function onInsertCommit() {
    if (!draft || commitPending) {
      return;
    }

    const requiredMessage = requiredFieldsMessage(draft, COMPANY_REQUIRED);

    if (requiredMessage) {
      setCommitMessage(requiredMessage);
      return;
    }

    setCommitPending(true);
    setCommitMessage("");
    const result = await addTransportCompany({
      companyName: draft.company_name,
      contactNo: draft.contact_no,
      email: draft.email,
    });

    if (!result.ok) {
      setCommitPending(false);
      setCommitMessage(result.message);
      return;
    }

    setDraft(null);
    setCommitPending(false);
    setPending(true);
    await reloadCompanies();
    setPending(false);
  }

  async function onInsertDriverCommit() {
    if (!driverDraft || driverCommitPending) {
      return;
    }

    const requiredMessage = requiredFieldsMessage(driverDraft, DRIVER_REQUIRED);

    if (requiredMessage) {
      setDriverCommitMessage(requiredMessage);
      return;
    }

    setDriverCommitPending(true);
    setDriverCommitMessage("");
    const result = await addTruckDriver({
      transportCompanyId: selectedId,
      name: fieldByKey(driverDraft, "name"),
      surname: fieldByKey(driverDraft, "surname"),
      nationalIdNumber: fieldByKey(driverDraft, "national_id_number"),
    });

    if (!result.ok) {
      setDriverCommitPending(false);
      setDriverCommitMessage(result.message);
      return;
    }

    setDriverDraft(null);
    setDriverCommitPending(false);
    setDriverPending(true);
    const drivers = await loadTruckDrivers(selectedId);
    setDriverRows(drivers.rows);
    setDriverMessage(drivers.ok ? "" : drivers.message);
    setDriverPending(false);
  }

  async function onUpdateDriverCommit() {
    if (!driverEdit || driverCommitPending) {
      return;
    }

    const requiredMessage = requiredFieldsMessage(driverEdit, DRIVER_REQUIRED);

    if (requiredMessage) {
      setDriverCommitMessage(requiredMessage);
      return;
    }

    setDriverCommitPending(true);
    setDriverCommitMessage("");
    const result = await updateTruckDriver({
      id: driverEdit.id,
      name: fieldByKey(driverEdit, "name"),
      surname: fieldByKey(driverEdit, "surname"),
      nationalIdNumber: fieldByKey(driverEdit, "national_id_number"),
      isActive: fieldByKey(driverEdit, "is_active"),
    });

    if (!result.ok) {
      setDriverCommitPending(false);
      setDriverCommitMessage(result.message);
      return;
    }

    setDriverEdit(null);
    setDriverCommitPending(false);
    setDriverPending(true);
    const drivers = await loadTruckDrivers(selectedId);
    setDriverRows(drivers.rows);
    setDriverMessage(drivers.ok ? "" : drivers.message);
    setDriverPending(false);
  }

  async function onInsertTruckCommit() {
    if (!truckDraft || truckCommitPending) {
      return;
    }

    const requiredMessage = requiredFieldsMessage(truckDraft, VEHICLE_REQUIRED);

    if (requiredMessage) {
      setTruckCommitMessage(requiredMessage);
      return;
    }

    setTruckCommitPending(true);
    setTruckCommitMessage("");
    const result = await addTruck({
      transportCompanyId: selectedId,
      make: fieldByKey(truckDraft, "make"),
      model: fieldByKey(truckDraft, "model"),
      registrationNumber: fieldByKey(truckDraft, "registration_number"),
    });

    if (!result.ok) {
      setTruckCommitPending(false);
      setTruckCommitMessage(result.message);
      return;
    }

    setTruckDraft(null);
    setTruckCommitPending(false);
    setTruckPending(true);
    const trucks = await loadTrucks(selectedId);
    setTruckRows(trucks.rows);
    setTruckMessage(trucks.ok ? "" : trucks.message);
    setTruckPending(false);
  }

  async function onUpdateTruckCommit() {
    if (!truckEdit || truckCommitPending) {
      return;
    }

    const requiredMessage = requiredFieldsMessage(truckEdit, VEHICLE_REQUIRED);

    if (requiredMessage) {
      setTruckCommitMessage(requiredMessage);
      return;
    }

    setTruckCommitPending(true);
    setTruckCommitMessage("");
    const result = await updateTruck({
      id: truckEdit.id,
      make: fieldByKey(truckEdit, "make"),
      model: fieldByKey(truckEdit, "model"),
      registrationNumber: fieldByKey(truckEdit, "registration_number"),
      isActive: fieldByKey(truckEdit, "is_active"),
    });

    if (!result.ok) {
      setTruckCommitPending(false);
      setTruckCommitMessage(result.message);
      return;
    }

    setTruckEdit(null);
    setTruckCommitPending(false);
    setTruckPending(true);
    const trucks = await loadTrucks(selectedId);
    setTruckRows(trucks.rows);
    setTruckMessage(trucks.ok ? "" : trucks.message);
    setTruckPending(false);
  }

  async function onInsertTrailerCommit() {
    if (!trailerDraft || trailerCommitPending) {
      return;
    }

    const requiredMessage = requiredFieldsMessage(
      trailerDraft,
      VEHICLE_REQUIRED,
    );

    if (requiredMessage) {
      setTrailerCommitMessage(requiredMessage);
      return;
    }

    setTrailerCommitPending(true);
    setTrailerCommitMessage("");
    const result = await addTruckTrailer({
      transportCompanyId: selectedId,
      make: fieldByKey(trailerDraft, "make"),
      model: fieldByKey(trailerDraft, "model"),
      registrationNumber: fieldByKey(trailerDraft, "registration_number"),
    });

    if (!result.ok) {
      setTrailerCommitPending(false);
      setTrailerCommitMessage(result.message);
      return;
    }

    setTrailerDraft(null);
    setTrailerCommitPending(false);
    setTrailerPending(true);
    const trailers = await loadTruckTrailers(selectedId);
    setTrailerRows(trailers.rows);
    setTrailerMessage(trailers.ok ? "" : trailers.message);
    setTrailerPending(false);
  }

  async function onUpdateTrailerCommit() {
    if (!trailerEdit || trailerCommitPending) {
      return;
    }

    const requiredMessage = requiredFieldsMessage(
      trailerEdit,
      VEHICLE_REQUIRED,
    );

    if (requiredMessage) {
      setTrailerCommitMessage(requiredMessage);
      return;
    }

    setTrailerCommitPending(true);
    setTrailerCommitMessage("");
    const result = await updateTruckTrailer({
      id: trailerEdit.id,
      make: fieldByKey(trailerEdit, "make"),
      model: fieldByKey(trailerEdit, "model"),
      registrationNumber: fieldByKey(trailerEdit, "registration_number"),
      isActive: fieldByKey(trailerEdit, "is_active"),
    });

    if (!result.ok) {
      setTrailerCommitPending(false);
      setTrailerCommitMessage(result.message);
      return;
    }

    setTrailerEdit(null);
    setTrailerCommitPending(false);
    setTrailerPending(true);
    const trailers = await loadTruckTrailers(selectedId);
    setTrailerRows(trailers.rows);
    setTrailerMessage(trailers.ok ? "" : trailers.message);
    setTrailerPending(false);
  }

  function draftCell(column) {
    if (column.isActive) {
      return (
        <ActiveSwitch
          checked={toBoolean(draft[column.key])}
          disabled={commitPending}
          onChange={(is_active) =>
            setDraft((current) =>
              current ? { ...current, [column.key]: is_active } : current,
            )
          }
        />
      );
    }

    return (
      <input
        aria-label={column.label}
        type="text"
        value={draft[column.key] ?? ""}
        disabled={commitPending}
        onChange={(event) =>
          setDraft((current) =>
            current
              ? { ...current, [column.key]: event.target.value }
              : current,
          )
        }
        className={INPUT_CLASS}
      />
    );
  }

  return (
    <div className="flex w-full min-w-0 flex-col items-stretch gap-6 self-stretch">
    <div
      ref={companyGridRef}
      className="flex w-fit max-w-full flex-col items-start gap-2 self-start"
    >
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-navy-950">
          Transport Companies
        </h2>
        {showEdit && !draft ? (
          <button
            type="button"
            disabled={pending || commitPending}
            onClick={() => {
              setEditRow(null);
              setCommitMessage("");
              setDraft(emptyDraft(columns));
            }}
            className="text-sm font-medium text-blue-900 underline disabled:opacity-50"
          >
            Add Company
          </button>
        ) : null}
      </div>
      <div className="w-full overflow-x-auto rounded border border-zinc-300">
        {pending && !showGrid ? (
          <p className="px-3 py-2 text-sm text-zinc-600">Loading…</p>
        ) : message && !showGrid ? (
          <p className="px-3 py-2 text-sm text-red-700">{message}</p>
        ) : !showGrid ? (
          <p className="px-3 py-2 text-sm text-zinc-600">No rows.</p>
        ) : (
          <table className="w-full border-collapse text-left text-sm text-zinc-800">
            <thead>
              <tr className="border-b border-zinc-300 bg-zinc-50 text-navy-950">
                {columns.map((column) => (
                  <th key={column.key} className="px-3 py-2 font-bold">
                    {column.label}
                  </th>
                ))}
                {showEdit || draft ? (
                  <th className="px-3 py-2 font-bold" aria-label="Edit" />
                ) : null}
              </tr>
            </thead>
            <tbody>
              {draft ? (
                <tr className="border-b border-zinc-200 bg-zinc-100 shadow-[inset_4px_0_0_0_#AD8A40]">
                  {columns.map((column) => (
                    <td key={column.key} className="px-3 py-2 align-middle">
                      {draftCell(column)}
                    </td>
                  ))}
                  <td className="px-3 py-2 align-middle">
                    <button
                      type="button"
                      disabled={commitPending}
                      onClick={onInsertCommit}
                      className="text-sm font-medium text-blue-900 underline disabled:opacity-50"
                    >
                      {commitPending ? "Saving…" : "Commit"}
                    </button>
                  </td>
                </tr>
              ) : null}
              {rows.map((row, index) => {
                const id = rowId(row);
                const editing = Boolean(editRow && id !== "" && id === editRow.id);
                const selected = id !== "" && id === selectedId;

                return (
                  <tr
                    key={id || index}
                    className={[
                      "border-b border-zinc-200",
                      "cursor-pointer hover:bg-zinc-100",
                      selected || editing
                        ? "bg-zinc-100 shadow-[inset_4px_0_0_0_#AD8A40]"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => {
                      if (id) {
                        setSelectedId(id);
                      }
                    }}
                  >
                    {columns.map((column) => {
                      const value = row[column.key];

                      if (editing && column.isCompanyName) {
                        return (
                          <td key={column.key} className="px-3 py-2 align-middle">
                            <input
                              aria-label="Company Name"
                              type="text"
                              value={editRow.company_name}
                              disabled={commitPending}
                              onChange={(event) =>
                                setEditRow((current) =>
                                  current
                                    ? {
                                        ...current,
                                        company_name: event.target.value,
                                      }
                                    : current,
                                )
                              }
                              className={INPUT_CLASS}
                            />
                          </td>
                        );
                      }

                      if (editing && column.isContactNo) {
                        return (
                          <td key={column.key} className="px-3 py-2 align-middle">
                            <input
                              aria-label="Contact No."
                              type="text"
                              value={editRow.contact_no}
                              disabled={commitPending}
                              onChange={(event) =>
                                setEditRow((current) =>
                                  current
                                    ? {
                                        ...current,
                                        contact_no: event.target.value,
                                      }
                                    : current,
                                )
                              }
                              className={INPUT_CLASS}
                            />
                          </td>
                        );
                      }

                      if (editing && column.isEmail) {
                        return (
                          <td key={column.key} className="px-3 py-2 align-middle">
                            <input
                              aria-label="Email"
                              type="text"
                              value={editRow.email}
                              disabled={commitPending}
                              onChange={(event) =>
                                setEditRow((current) =>
                                  current
                                    ? { ...current, email: event.target.value }
                                    : current,
                                )
                              }
                              className={INPUT_CLASS}
                            />
                          </td>
                        );
                      }

                      if (editing && column.isActive) {
                        return (
                          <td key={column.key} className="px-3 py-2 align-middle">
                            <ActiveSwitch
                              checked={Boolean(editRow.is_active)}
                              disabled={commitPending}
                              onChange={(is_active) =>
                                setEditRow((current) =>
                                  current ? { ...current, is_active } : current,
                                )
                              }
                            />
                          </td>
                        );
                      }

                      return (
                        <td key={column.key} className="px-3 py-2 align-middle">
                          {formatCell(column, value)}
                        </td>
                      );
                    })}
                    {showEdit || draft ? (
                      <td
                        className="px-3 py-2 align-middle"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {editing ? (
                          <button
                            type="button"
                            disabled={commitPending}
                            onClick={onCommit}
                            className="text-sm font-medium text-blue-900 underline disabled:opacity-50"
                          >
                            {commitPending ? "Saving…" : "Commit"}
                          </button>
                        ) : showEdit ? (
                          <button
                            type="button"
                            disabled={commitPending}
                            onClick={() => {
                              setDraft(null);
                              setCommitMessage("");
                              if (id) {
                                setSelectedId(id);
                              }
                              setEditRow(editFromRow(row));
                            }}
                            className="text-sm font-medium text-blue-900 underline disabled:opacity-50"
                          >
                            Edit
                          </button>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {message && rows.length ? (
        <p className="text-sm text-red-700">{message}</p>
      ) : null}
      {commitMessage ? (
        <p className="text-sm text-red-700">{commitMessage}</p>
      ) : null}
    </div>
      <div className="grid w-full min-w-0 grid-cols-3 gap-6">
      <ChildGrid
        title="Drivers"
        rows={driverRows}
        message={driverMessage}
        pending={driverPending}
        defaultColumns={DEFAULT_DRIVER_COLUMNS}
        addLabel="Add Driver"
        showAdd={showEdit && Boolean(selectedId)}
        showEdit={showEdit}
        draft={driverDraft}
        editRow={driverEdit}
        onAdd={(next) => {
          setDriverEdit(null);
          setDriverCommitMessage("");
          setDriverDraft(next);
        }}
        onDraftChange={setDriverDraft}
        onCommit={onInsertDriverCommit}
        onEditSelect={(edit) => {
          setDriverDraft(null);
          setDriverCommitMessage("");
          setDriverEdit(edit);
        }}
        onEditChange={setDriverEdit}
        onEditCommit={onUpdateDriverCommit}
        onDismiss={() => {
          setDriverDraft(null);
          setDriverEdit(null);
          setDriverCommitMessage("");
        }}
        commitPending={driverCommitPending}
        commitMessage={driverCommitMessage}
      />
      <ChildGrid
        title="Trucks"
        rows={truckRows}
        message={truckMessage}
        pending={truckPending}
        defaultColumns={DEFAULT_TRUCK_COLUMNS}
        addLabel="Add Truck"
        showAdd={showEdit && Boolean(selectedId)}
        showEdit={showEdit}
        draft={truckDraft}
        editRow={truckEdit}
        onAdd={(next) => {
          setTruckEdit(null);
          setTruckCommitMessage("");
          setTruckDraft(next);
        }}
        onDraftChange={setTruckDraft}
        onCommit={onInsertTruckCommit}
        onEditSelect={(edit) => {
          setTruckDraft(null);
          setTruckCommitMessage("");
          setTruckEdit(edit);
        }}
        onEditChange={setTruckEdit}
        onEditCommit={onUpdateTruckCommit}
        onDismiss={() => {
          setTruckDraft(null);
          setTruckEdit(null);
          setTruckCommitMessage("");
        }}
        commitPending={truckCommitPending}
        commitMessage={truckCommitMessage}
      />
      <ChildGrid
        title="Trailers"
        rows={trailerRows}
        message={trailerMessage}
        pending={trailerPending}
        defaultColumns={DEFAULT_TRAILER_COLUMNS}
        addLabel="Add Trailer"
        showAdd={showEdit && Boolean(selectedId)}
        showEdit={showEdit}
        draft={trailerDraft}
        editRow={trailerEdit}
        onAdd={(next) => {
          setTrailerEdit(null);
          setTrailerCommitMessage("");
          setTrailerDraft(next);
        }}
        onDraftChange={setTrailerDraft}
        onCommit={onInsertTrailerCommit}
        onEditSelect={(edit) => {
          setTrailerDraft(null);
          setTrailerCommitMessage("");
          setTrailerEdit(edit);
        }}
        onEditChange={setTrailerEdit}
        onEditCommit={onUpdateTrailerCommit}
        onDismiss={() => {
          setTrailerDraft(null);
          setTrailerEdit(null);
          setTrailerCommitMessage("");
        }}
        commitPending={trailerCommitPending}
        commitMessage={trailerCommitMessage}
      />
      </div>
    </div>
  );
}

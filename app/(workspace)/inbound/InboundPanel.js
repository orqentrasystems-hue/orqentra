"use client";

import { useEffect, useState } from "react";
import {
  addInboundDocument,
  deleteDocument,
  getDocumentFileUrl,
  loadDocumentDetails,
  loadDocumentTypes,
  loadInboundCost,
  loadInboundItemTracking,
  loadInboundTrades,
} from "./actions";
import DocumentDeleteConfirm from "./DocumentDeleteConfirm";
import DocumentFileViewer from "./DocumentFileViewer";
import DocumentUpload from "./DocumentUpload";
import InboundCostDialog from "./InboundCostDialog";
import InboundGrid from "./InboundGrid";
import TradeStatusesSelect from "./TradeStatusesSelect";

const DEFAULT_STATUS_LABELS = new Set(["new", "in progress"]);

const TRACKING_COLUMN_LABELS = [
  "id",
  "Trade No.",
  "Product",
  "Unit",
  "Ethanol %",
  "Blend Group Key",
  "Qty",
  "Purchase Date",
  "Status",
  "Status Date",
  "Company",
  "Port",
  "Supp_Inv_No.",
  "Supp_Inv_Amt.",
  "Currency",
  "Qty Still To Lift",
  "Docs",
];

function defaultSelectedIds(options) {
  return options
    .filter((option) =>
      DEFAULT_STATUS_LABELS.has(String(option.label).trim().toLowerCase()),
    )
    .map((option) => option.id);
}

export default function InboundPanel({ options }) {
  const [selectedIds, setSelectedIds] = useState(() =>
    defaultSelectedIds(options),
  );
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(true);
  const [selectedTradeId, setSelectedTradeId] = useState("");
  const [trackingRows, setTrackingRows] = useState([]);
  const [trackingMessage, setTrackingMessage] = useState("");
  const [trackingPending, setTrackingPending] = useState(false);
  const [selectedTrackingId, setSelectedTrackingId] = useState("");
  const [costOpen, setCostOpen] = useState(false);
  const [costRows, setCostRows] = useState([]);
  const [costMessage, setCostMessage] = useState("");
  const [costPending, setCostPending] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [docsRows, setDocsRows] = useState([]);
  const [docsMessage, setDocsMessage] = useState("");
  const [docsPending, setDocsPending] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState("");
  const [viewerName, setViewerName] = useState("");
  const [viewerMessage, setViewerMessage] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState("");
  const [documentTypes, setDocumentTypes] = useState([]);
  const [documentTypeId, setDocumentTypeId] = useState("");
  const [documentTypesMessage, setDocumentTypesMessage] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPending, setUploadPending] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const selectedKey = selectedIds.join(",");

  useEffect(() => {
    let cancelled = false;
    const ids = selectedKey ? selectedKey.split(",") : [];

    async function load() {
      setPending(true);
      setSelectedTradeId("");
      setSelectedTrackingId("");
      setCostOpen(false);
      setDocsOpen(false);
      const result = await loadInboundTrades(ids);

      if (cancelled) {
        return;
      }

      setRows(result.rows);
      setMessage(result.ok ? "" : result.message);
      setPending(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [selectedKey]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!selectedTradeId) {
        setTrackingRows([]);
        setTrackingMessage("");
        setTrackingPending(false);
        setSelectedTrackingId("");
        setCostOpen(false);
        setDocsOpen(false);
        return;
      }

      setTrackingPending(true);
      const result = await loadInboundItemTracking(selectedTradeId);

      if (cancelled) {
        return;
      }

      setTrackingRows(result.rows);
      setTrackingMessage(result.ok ? "" : result.message);
      setTrackingPending(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [selectedTradeId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!costOpen || !selectedTrackingId) {
        setCostRows([]);
        setCostMessage("");
        setCostPending(false);
        return;
      }

      setCostPending(true);
      const result = await loadInboundCost(selectedTrackingId);

      if (cancelled) {
        return;
      }

      setCostRows(result.rows);
      setCostMessage(result.ok ? "" : result.message);
      setCostPending(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [costOpen, selectedTrackingId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!docsOpen || !selectedTrackingId) {
        setDocsRows([]);
        setDocsMessage("");
        setDocsPending(false);
        return;
      }

      setDocsPending(true);
      const result = await loadDocumentDetails(selectedTrackingId);

      if (cancelled) {
        return;
      }

      setDocsRows(result.rows);
      setDocsMessage(result.ok ? "" : result.message);
      setDocsPending(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [docsOpen, selectedTrackingId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!docsOpen) {
        return;
      }

      const result = await loadDocumentTypes();

      if (cancelled) {
        return;
      }

      setDocumentTypes(result.options);
      setDocumentTypesMessage(result.ok ? "" : result.message);
      setDocumentTypeId((current) =>
        result.options.some((option) => option.id === current)
          ? current
          : "",
      );
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [docsOpen]);

  return (
    <div className="flex w-full flex-col items-start gap-6">
      <TradeStatusesSelect
        options={options}
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
      />
      <InboundGrid
        rows={rows}
        message={message}
        pending={pending}
        selectedId={selectedTradeId}
        onSelect={setSelectedTradeId}
      />
      <InboundGrid
        title="Inbound Item Tracking"
        rows={trackingRows}
        message={trackingMessage}
        pending={trackingPending}
        columnLabels={TRACKING_COLUMN_LABELS}
        numericLabels={["Qty", "Supp_Inv_Amt.", "Qty Still To Lift"]}
        dateLabels={["Purchase Date", "Status Date"]}
        selectedId={selectedTrackingId}
        onSelect={(id) => {
          setSelectedTrackingId(id);
          setDocsOpen(false);
          setCostOpen(true);
        }}
        onDocsSelect={(id) => {
          setSelectedTrackingId(id);
          setCostOpen(false);
          setDocsOpen(true);
        }}
      />
      <InboundCostDialog
        open={docsOpen}
        title="Documents"
        onClose={() => {
          setDocsOpen(false);
          setUploadFile(null);
          setUploadMessage("");
        }}
      >
        <InboundGrid
          title=""
          rows={docsRows}
          message={docsMessage}
          pending={docsPending}
          columnLabels={[]}
          showViewButton
          showDeleteButton
          onDeleteFile={(target) => {
            setDeleteTarget(target);
            setDeletePending(false);
            setDeleteMessage("");
          }}
          onViewFile={async (filePath) => {
            setViewerOpen(true);
            setViewerUrl("");
            setViewerName("");
            setViewerMessage("");
            const result = await getDocumentFileUrl(filePath);

            if (result.ok) {
              setViewerUrl(result.url);
              setViewerName(result.fileName ?? "");
              return;
            }

            setViewerMessage(result.message);
          }}
        />
        <label
          className="mt-4 flex w-full max-w-md flex-col gap-1"
          htmlFor="document-type"
        >
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Document Type
          </span>
          <select
            id="document-type"
            name="document-type"
            value={documentTypeId}
            onChange={(event) => setDocumentTypeId(event.target.value)}
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
          >
            <option value="" />
            {documentTypes.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {documentTypesMessage ? (
          <p className="mt-2 text-sm text-red-700 dark:text-red-400">
            {documentTypesMessage}
          </p>
        ) : null}
        <DocumentUpload
          file={uploadFile}
          onFile={(next) => {
            setUploadFile(next);
            setUploadMessage("");
          }}
          pending={uploadPending}
          message={uploadMessage}
          addDisabled={!documentTypeId || !uploadFile || !selectedTrackingId}
          onAdd={async () => {
            if (
              uploadPending ||
              !documentTypeId ||
              !uploadFile ||
              !selectedTrackingId
            ) {
              return;
            }

            setUploadPending(true);
            setUploadMessage("");

            const formData = new FormData();
            formData.set("documentTypeId", documentTypeId);
            formData.set("trackingId", selectedTrackingId);
            formData.set("file", uploadFile);

            const result = await addInboundDocument(formData);

            if (!result.ok) {
              setUploadPending(false);
              setUploadMessage(result.message);
              return;
            }

            setUploadFile(null);
            setUploadPending(false);

            const docs = await loadDocumentDetails(selectedTrackingId);
            setDocsRows(docs.rows);
            setDocsMessage(docs.ok ? "" : docs.message);

            if (selectedTradeId) {
              const tracking = await loadInboundItemTracking(selectedTradeId);
              setTrackingRows(tracking.rows);
              setTrackingMessage(tracking.ok ? "" : tracking.message);
            }
          }}
        />
      </InboundCostDialog>
      <DocumentDeleteConfirm
        open={Boolean(deleteTarget)}
        pending={deletePending}
        message={deleteMessage}
        onCancel={() => {
          if (deletePending) {
            return;
          }

          setDeleteTarget(null);
          setDeleteMessage("");
        }}
        onConfirm={async () => {
          if (!deleteTarget || deletePending) {
            return;
          }

          setDeletePending(true);
          setDeleteMessage("");
          const result = await deleteDocument(
            deleteTarget.id,
            deleteTarget.filePath,
          );

          if (!result.ok) {
            setDeletePending(false);
            setDeleteMessage(result.message);
            return;
          }

          setDeleteTarget(null);
          setDeletePending(false);
          setViewerOpen(false);
          setViewerUrl("");
          setViewerName("");
          setViewerMessage("");

          const docs = await loadDocumentDetails(selectedTrackingId);
          setDocsRows(docs.rows);
          setDocsMessage(docs.ok ? "" : docs.message);

          if (selectedTradeId) {
            const tracking = await loadInboundItemTracking(selectedTradeId);
            setTrackingRows(tracking.rows);
            setTrackingMessage(tracking.ok ? "" : tracking.message);
          }
        }}
      />
      <DocumentFileViewer
        open={viewerOpen}
        url={viewerUrl}
        fileName={viewerName}
        message={viewerMessage}
        onClose={() => {
          setViewerOpen(false);
          setViewerUrl("");
          setViewerName("");
          setViewerMessage("");
        }}
      />
      <InboundCostDialog
        open={costOpen}
        onClose={() => setCostOpen(false)}
      >
        <InboundGrid
          title=""
          rows={costRows}
          message={costMessage}
          pending={costPending}
          columnLabels={[
            "id",
            "Cost Type",
            "Amount",
            "Qty",
            "Local Industry Unit",
            "Amt Per Litre",
            "Reversed",
            "Reverse Reason",
            "Cost Date",
            "Blend Group Key",
          ]}
          dateLabels={["Cost Date", "cost_date"]}
          numericLabels={[
            "Amount",
            "Qty",
            "Amt Per Litre",
            "amount",
            "qty",
            "amount_per_liter",
          ]}
        />
      </InboundCostDialog>
    </div>
  );
}

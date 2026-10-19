"use client";

const NAVY = "FF082944";
const GOLD = "FFAD8A40";
const HEADER_BG = "FFF4F4F5";
const BORDER = "FFD4D4D8";
const WHITE = "FFFFFFFF";
const SKIP_HEADERS = new Set(["view", "delete", "commit", "edit"]);

function cssColorToArgb(color) {
  if (!color || color === "transparent") {
    return null;
  }

  const match = String(color).match(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([0-9.]+))?\s*\)/i,
  );

  if (!match) {
    return null;
  }

  const alpha = match[4] == null ? 1 : Number(match[4]);

  if (!Number.isFinite(alpha) || alpha <= 0.05) {
    return null;
  }

  const r = Number(match[1]).toString(16).padStart(2, "0");
  const g = Number(match[2]).toString(16).padStart(2, "0");
  const b = Number(match[3]).toString(16).padStart(2, "0");
  return `FF${r}${g}${b}`.toUpperCase();
}

function isVisible(element) {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    rect.width > 0 &&
    rect.height > 0
  );
}

function cellText(cell) {
  const control = cell.querySelector("input, select, textarea");

  if (control instanceof HTMLSelectElement) {
    return (
      control.options[control.selectedIndex]?.text ?? control.value ?? ""
    ).trim();
  }

  if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) {
    return String(control.value ?? "").trim();
  }

  return String(cell.innerText ?? "")
    .replace(/\u00d7/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function headerLabel(cell) {
  const labelled = cell.getAttribute("aria-label");
  const text = cellText(cell);
  return text || labelled || "";
}

function shouldSkipColumn(headerCell) {
  const label = headerLabel(headerCell).trim().toLowerCase();
  return SKIP_HEADERS.has(label);
}

function thinBorder() {
  return {
    top: { style: "thin", color: { argb: BORDER } },
    left: { style: "thin", color: { argb: BORDER } },
    bottom: { style: "thin", color: { argb: BORDER } },
    right: { style: "thin", color: { argb: BORDER } },
  };
}

function applyDomStyle(excelCell, element, { header = false } = {}) {
  const style = window.getComputedStyle(element);
  const fill = cssColorToArgb(style.backgroundColor);
  const color = cssColorToArgb(style.color);
  const strike = String(style.textDecorationLine || "").includes("line-through");
  const bold =
    header ||
    Number(style.fontWeight) >= 600 ||
    String(style.fontWeight).includes("bold");
  const right =
    style.textAlign === "right" || element.classList.contains("text-right");

  excelCell.font = {
    name: "Calibri",
    size: header ? 11 : 10,
    bold,
    strike,
    color: { argb: color || (header ? NAVY : "FF18181B") },
  };
  excelCell.alignment = {
    vertical: "middle",
    horizontal: right ? "right" : "left",
    wrapText: true,
  };
  excelCell.border = thinBorder();

  if (fill && fill !== WHITE) {
    excelCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: fill },
    };
  } else if (header) {
    excelCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: HEADER_BG },
    };
  }

  if (element.classList.contains("text-gold-600")) {
    excelCell.font = {
      ...excelCell.font,
      color: { argb: GOLD },
      bold: true,
    };
  }
}

const PAGE_GRID_TITLES = [
  "Inbound Trades",
  "Inbound Item Tracking",
  "Inbound Lift",
  "Inbound Load",
];

function tableTitle(table, index) {
  const frame = table.closest("div.w-full");
  const heading = frame?.querySelector("h2");
  const fromDom = String(heading?.textContent ?? "").trim();
  return fromDom || PAGE_GRID_TITLES[index] || "";
}

function collectTables(root) {
  return [...root.querySelectorAll("table")].filter((table) => {
    if (!isVisible(table)) {
      return false;
    }

    if (table.closest("[data-dialog-layer]")) {
      return false;
    }

    return true;
  });
}

function fileName() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `Inbound-${now.getFullYear()}-${month}-${day}.xlsx`;
}

export async function exportInboundPageToExcel(root, { tradeStatuses = [] } = {}) {
  if (!root) {
    return;
  }

  const ExcelJSModule = await import("exceljs/dist/exceljs.min.js");
  const ExcelJS = ExcelJSModule.default ?? ExcelJSModule;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Orqentra";
  const sheet = workbook.addWorksheet("Inbound", {
    views: [{ showGridLines: false }],
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9,
    },
  });

  let rowNumber = 1;
  let maxColumns = 1;
  const columnWidths = [];

  const pageTitle = root.querySelector("h1")?.textContent?.trim() || "Inbound";
  const titleRow = sheet.getRow(rowNumber);
  titleRow.getCell(1).value = pageTitle;
  titleRow.getCell(1).font = {
    name: "Calibri",
    size: 16,
    bold: true,
    color: { argb: NAVY },
  };
  titleRow.height = 22;
  rowNumber += 1;

  if (tradeStatuses.length) {
    const statusRow = sheet.getRow(rowNumber);
    statusRow.getCell(1).value = `Trade Statuses: ${tradeStatuses.join(", ")}`;
    statusRow.getCell(1).font = {
      name: "Calibri",
      size: 11,
      color: { argb: "FF3F3F46" },
    };
    rowNumber += 1;
  }

  rowNumber += 1;

  const tables = collectTables(root);

  for (const table of tables) {
    const headers = [...table.querySelectorAll("thead th")];
    const keep = headers.map((header, index) =>
      headers.length ? !shouldSkipColumn(header) : true,
    );
    const visibleHeaders = headers.filter((_, index) => keep[index]);
    const bodyRows = [...table.querySelectorAll("tbody tr")].filter(isVisible);
    const title = tableTitle(table, tables.indexOf(table));
    const usedColumns = Math.max(visibleHeaders.length, 1);
    maxColumns = Math.max(maxColumns, usedColumns);

    if (title) {
      const heading = sheet.getRow(rowNumber);
      heading.getCell(1).value = title;
      heading.getCell(1).font = {
        name: "Calibri",
        size: 13,
        bold: true,
        color: { argb: NAVY },
      };
      heading.height = 18;
      rowNumber += 1;
    }

    if (visibleHeaders.length) {
      const headerRow = sheet.getRow(rowNumber);
      headerRow.height = 18;

      visibleHeaders.forEach((header, index) => {
        const cell = headerRow.getCell(index + 1);
        cell.value = headerLabel(header);
        applyDomStyle(cell, header, { header: true });
        const px = header.getBoundingClientRect().width;
        columnWidths[index] = Math.max(columnWidths[index] ?? 0, px);
      });

      rowNumber += 1;
    }

    if (!bodyRows.length) {
      const empty = sheet.getRow(rowNumber);
      empty.getCell(1).value = "No rows.";
      empty.getCell(1).font = {
        name: "Calibri",
        size: 10,
        italic: true,
        color: { argb: "FF71717A" },
      };
      rowNumber += 2;
      continue;
    }

    for (const bodyRow of bodyRows) {
      const cells = [...bodyRow.children].filter(
        (cell) => cell.tagName === "TD" || cell.tagName === "TH",
      );
      const visibleCells = headers.length
        ? cells.filter((_, index) => keep[index])
        : cells;
      const excelRow = sheet.getRow(rowNumber);
      excelRow.height = 16;

      visibleCells.forEach((source, index) => {
        const cell = excelRow.getCell(index + 1);
        const text = cellText(source);
        const numeric = Number(
          text.replace(/\s/g, "").replace(",", "."),
        );

        if (text !== "" && /^-?\d[\d\s]*([.,]\d+)?$/.test(text) && Number.isFinite(numeric)) {
          cell.value = numeric;
          cell.numFmt = Number.isInteger(numeric) ? "#,##0" : "#,##0.###";
        } else {
          cell.value = text;
        }

        applyDomStyle(cell, source);
        const px = source.getBoundingClientRect().width;
        columnWidths[index] = Math.max(columnWidths[index] ?? 0, px);
      });

      rowNumber += 1;
    }

    rowNumber += 1;
  }

  sheet.mergeCells(1, 1, 1, Math.max(maxColumns, 1));

  columnWidths.forEach((px, index) => {
    sheet.getColumn(index + 1).width = Math.min(
      48,
      Math.max(10, Math.round((px || 80) / 7.2)),
    );
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName();
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function toRows(data) {
  if (data == null) {
    return [];
  }

  const values = Array.isArray(data) ? data : [data];

  return values.map((row) => {
    if (row && typeof row === "object" && !Array.isArray(row)) {
      return row;
    }

    return { descr: row };
  });
}

export function buildFunctionMenuTree(data) {
  const rows = toRows(data);
  const sections = [];
  const bySection = new Map();

  for (const row of rows) {
    const section = String(row.menu_section ?? "");

    if (!bySection.has(section)) {
      const node = {
        id: `section:${section}`,
        label: section,
        children: [],
        seen: new Set(),
      };
      bySection.set(section, node);
      sections.push(node);
    }

    const descr = row.descr == null ? "" : String(row.descr);

    if (!descr) {
      continue;
    }

    const parent = bySection.get(section);

    if (!parent.seen.has(descr)) {
      parent.seen.add(descr);
      parent.children.push({
        id: `descr:${section}:${descr}`,
        label: descr,
        children: [],
      });
    }
  }

  return sections.map(({ seen, ...node }) => node);
}

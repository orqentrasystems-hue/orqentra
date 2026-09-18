function toRows(data) {
  if (data == null) {
    return [];
  }

  const values = Array.isArray(data) ? data : [data];

  return values
    .map((row) => {
      if (row && typeof row === "object" && !Array.isArray(row)) {
        return row;
      }

      return { app_name: row };
    })
    .filter((row) => row.app_name != null && String(row.app_name).length > 0);
}

function pickKey(rows, candidates) {
  return candidates.find((key) => rows.some((row) => row[key] != null));
}

export function buildAppTree(data) {
  const rows = toRows(data);
  const idKey = pickKey(rows, ["id", "app_id"]);
  const parentKey = pickKey(rows, ["parent_id", "parent_app_id", "parent"]);

  if (idKey && parentKey) {
    const nodes = new Map();

    for (const row of rows) {
      const id = String(row[idKey]);
      nodes.set(id, {
        id,
        label: String(row.app_name),
        children: [],
      });
    }

    const roots = [];

    for (const row of rows) {
      const id = String(row[idKey]);
      const node = nodes.get(id);
      const parentId = row[parentKey];
      const parent =
        parentId == null || parentId === ""
          ? null
          : nodes.get(String(parentId));

      if (parent && parent.id !== id) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  return rows.map((row, index) => ({
    id: String(row.id ?? row.app_id ?? index),
    label: String(row.app_name),
    children: [],
  }));
}

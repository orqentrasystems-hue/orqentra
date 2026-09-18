"use client";

import { openApp, openMenuPage } from "../actions";

function isPermissionsNode(label) {
  return String(label ?? "").trim().toLowerCase() === "permissions";
}

function NodeLabel({ openOnSelect, menuPage, label, children }) {
  if (openOnSelect) {
    return (
      <form action={openApp.bind(null, label)} className="inline">
        <button
          type="submit"
          className="hover:underline text-left"
          onClick={(event) => event.stopPropagation()}
        >
          {children}
        </button>
      </form>
    );
  }

  if (menuPage) {
    return (
      <form action={openMenuPage.bind(null, label)} className="inline">
        <button
          type="submit"
          className="hover:underline text-left"
          onClick={(event) => event.stopPropagation()}
        >
          {children}
        </button>
      </form>
    );
  }

  return children;
}

function TreeNode({ node, openOnSelect, openMenuPages }) {
  const hasChildren = node.children?.length > 0;
  const menuPage = openMenuPages && !hasChildren && isPermissionsNode(node.label);

  if (!hasChildren) {
    return (
      <li role="treeitem" className="py-1">
        <NodeLabel
          openOnSelect={openOnSelect}
          menuPage={menuPage}
          label={node.label}
        >
          {node.label}
        </NodeLabel>
      </li>
    );
  }

  return (
    <li role="treeitem" className="py-1">
      <details open>
        <summary className="cursor-pointer select-none">
          <NodeLabel openOnSelect={openOnSelect} label={node.label}>
            {node.label}
          </NodeLabel>
        </summary>
        <ul
          role="group"
          className="ml-4 border-l border-zinc-300 pl-3 dark:border-zinc-600"
        >
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              openOnSelect={openOnSelect}
              openMenuPages={openMenuPages}
            />
          ))}
        </ul>
      </details>
    </li>
  );
}

export default function AppTree({
  nodes,
  openOnSelect = false,
  openMenuPages = false,
  emptyMessage = "No apps.",
}) {
  if (!nodes?.length) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{emptyMessage}</p>
    );
  }

  return (
    <ul
      role="tree"
      className="w-full max-w-md text-zinc-800 dark:text-zinc-200"
    >
      {nodes.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          openOnSelect={openOnSelect}
          openMenuPages={openMenuPages}
        />
      ))}
    </ul>
  );
}

"use client";

import { openApp, openMenuPage } from "../actions";
import { menuPagePath } from "@/lib/nav-access";

function isMenuPageNode(label) {
  return Boolean(menuPagePath(label));
}

function buttonClassName(asButtons, isChild) {
  if (asButtons) {
    return [
      "w-fit rounded border border-zinc-300 bg-white px-4 py-2 text-left text-sm font-medium hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:hover:bg-zinc-700",
      isChild
        ? "text-blue-900 dark:text-blue-300"
        : "text-zinc-800 dark:text-zinc-200",
    ].join(" ");
  }

  return "hover:underline text-left";
}

function NodeLabel({
  openOnSelect,
  menuPage,
  asButtons,
  isChild,
  label,
  children,
}) {
  const className = buttonClassName(asButtons, isChild);

  if (openOnSelect) {
    return (
      <form action={openApp.bind(null, label)} className={asButtons ? "w-fit" : "inline"}>
        <button
          type="submit"
          className={className}
          onClick={(event) => event.stopPropagation()}
        >
          {children}
        </button>
      </form>
    );
  }

  if (menuPage) {
    return (
      <form
        action={openMenuPage.bind(null, label)}
        className={asButtons ? "w-fit" : "inline"}
      >
        <button
          type="submit"
          className={className}
          onClick={(event) => event.stopPropagation()}
        >
          {children}
        </button>
      </form>
    );
  }

  if (asButtons) {
    if (!isChild) {
      return (
        <span className="w-fit text-sm font-bold text-zinc-800 dark:text-zinc-200">
          {children}
        </span>
      );
    }

    return (
      <button type="button" className={className}>
        {children}
      </button>
    );
  }

  return children;
}

function TreeNode({ node, openOnSelect, openMenuPages, asButtons }) {
  const hasChildren = node.children?.length > 0;
  const menuPage = openMenuPages && !hasChildren && isMenuPageNode(node.label);
  const isChild = Boolean(node.isChild);

  if (asButtons) {
    if (hasChildren) {
      return (
        <li className="flex w-fit flex-col items-start">
          <details>
            <summary className="cursor-pointer select-none">
              <NodeLabel asButtons isChild={false} label={node.label}>
                {node.label}
              </NodeLabel>
            </summary>
            <ul className="mt-2 flex w-fit flex-col items-start gap-2 pl-4">
              {node.children.map((child) => (
                <TreeNode
                  key={child.id}
                  node={child}
                  openOnSelect={openOnSelect}
                  openMenuPages={openMenuPages}
                  asButtons
                />
              ))}
            </ul>
          </details>
        </li>
      );
    }

    return (
      <li className="flex w-fit flex-col items-start gap-2">
        <NodeLabel
          openOnSelect={openOnSelect}
          menuPage={menuPage}
          asButtons
          isChild={isChild}
          label={node.label}
        >
          {node.label}
        </NodeLabel>
      </li>
    );
  }

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
  asButtons = false,
  emptyMessage = "No apps.",
}) {
  if (!nodes?.length) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{emptyMessage}</p>
    );
  }

  return (
    <ul
      role={asButtons ? "list" : "tree"}
      className={
        asButtons
          ? "flex w-fit flex-col items-start gap-3 text-zinc-800 dark:text-zinc-200"
          : "w-full max-w-md text-zinc-800 dark:text-zinc-200"
      }
    >
      {nodes.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          openOnSelect={openOnSelect}
          openMenuPages={openMenuPages}
          asButtons={asButtons}
        />
      ))}
    </ul>
  );
}

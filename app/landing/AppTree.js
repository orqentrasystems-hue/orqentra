"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { openApp, openMenuPage } from "../actions";
import { menuPageKey, menuPagePath } from "@/lib/nav-access";

function isMenuPageNode(label) {
  return Boolean(menuPagePath(label));
}

function buttonClassName(asButtons, isChild, variant, selected) {
  if (variant === "sidebar") {
    if (!isChild) {
      return "whitespace-nowrap text-sm font-semibold tracking-wide text-white";
    }

    return [
      "w-full whitespace-nowrap rounded-r border-l-2 px-3 py-2 text-left text-sm font-medium",
      selected
        ? "border-gold-600 bg-navy-800 text-white"
        : "border-transparent text-white/90 hover:bg-navy-900",
    ].join(" ");
  }

  if (asButtons) {
    return [
      "w-fit rounded border border-zinc-300 bg-white px-4 py-2 text-left text-sm font-medium text-navy-950 hover:bg-zinc-100",
      selected ? "border-gold-600 shadow-[inset_0_-2px_0_0_#AD8A40]" : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  return "text-left text-navy-950 hover:underline";
}

function NodeLabel({
  openOnSelect,
  menuPage,
  asButtons,
  isChild,
  label,
  variant,
  selected,
  children,
}) {
  const className = buttonClassName(asButtons, isChild, variant, selected);

  if (openOnSelect) {
    return (
      <form
        action={openApp.bind(null, label)}
        className={variant === "sidebar" ? "w-full" : asButtons ? "w-fit" : "inline"}
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

  if (menuPage) {
    return (
      <form
        action={openMenuPage.bind(null, label)}
        className={
          variant === "sidebar" ? "w-full" : asButtons ? "w-fit" : "inline"
        }
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
        <span
          className={
            variant === "sidebar"
              ? "w-fit whitespace-nowrap text-sm font-semibold tracking-wide text-white"
              : "w-fit text-sm font-bold text-navy-950"
          }
        >
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

function TreeNode({
  node,
  openOnSelect,
  openMenuPages,
  asButtons,
  variant,
  selectedPage,
  defaultOpen,
}) {
  const hasChildren = node.children?.length > 0;
  const menuPage = openMenuPages && !hasChildren && isMenuPageNode(node.label);
  const isChild = Boolean(node.isChild);
  const selected =
    Boolean(selectedPage) && menuPageKey(node.label) === selectedPage;
  const [open, setOpen] = useState(Boolean(defaultOpen));

  function onToggle(event) {
    const next = event.currentTarget.open;

    if (next !== open) {
      setOpen(next);
    }
  }

  if (asButtons) {
    if (hasChildren) {
      return (
        <li className="flex w-full flex-col items-stretch">
          <details open={open} onToggle={onToggle}>
            <summary
              className={
                variant === "sidebar"
                  ? "cursor-pointer select-none text-white"
                  : "cursor-pointer select-none"
              }
            >
              <NodeLabel
                asButtons
                isChild={false}
                label={node.label}
                variant={variant}
              >
                {node.label}
              </NodeLabel>
            </summary>
            <ul
              className={
                variant === "sidebar"
                  ? "mt-2 flex w-full flex-col items-stretch gap-1"
                  : "mt-2 flex w-fit flex-col items-start gap-2 pl-4"
              }
            >
              {node.children.map((child) => (
                <TreeNode
                  key={child.id}
                  node={child}
                  openOnSelect={openOnSelect}
                  openMenuPages={openMenuPages}
                  asButtons
                  variant={variant}
                  selectedPage={selectedPage}
                  defaultOpen={defaultOpen}
                />
              ))}
            </ul>
          </details>
        </li>
      );
    }

    return (
      <li
        className={
          variant === "sidebar"
            ? "flex w-full flex-col items-stretch"
            : "flex w-fit flex-col items-start gap-2"
        }
      >
        <NodeLabel
          openOnSelect={openOnSelect}
          menuPage={menuPage}
          asButtons
          isChild={isChild}
          label={node.label}
          variant={variant}
          selected={selected}
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
      <details open={open} onToggle={onToggle}>
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
              variant={variant}
              selectedPage={selectedPage}
              defaultOpen={defaultOpen}
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
  variant = "default",
  selectedPage = "",
  emptyMessage = "No apps.",
}) {
  const pathname = usePathname();
  const onAppMenu = pathname === "/app-menu";
  const activeSelectedPage = onAppMenu ? "" : selectedPage;
  const defaultOpen = !onAppMenu;

  if (!nodes?.length) {
    return (
      <p
        className={
          variant === "sidebar"
            ? "text-sm text-white/70"
            : "text-sm text-zinc-700"
        }
      >
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul
      key={onAppMenu ? "app-menu" : "workspace"}
      role={asButtons ? "list" : "tree"}
      className={
        asButtons
          ? variant === "sidebar"
            ? "flex w-max flex-col items-stretch gap-3 text-white"
            : "flex w-fit flex-col items-start gap-3 text-navy-950"
          : "w-full max-w-md text-navy-950"
      }
    >
      {nodes.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          openOnSelect={openOnSelect}
          openMenuPages={openMenuPages}
          asButtons={asButtons}
          variant={variant}
          selectedPage={activeSelectedPage}
          defaultOpen={defaultOpen}
        />
      ))}
    </ul>
  );
}

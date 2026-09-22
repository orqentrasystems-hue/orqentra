export const NAV_APP_COOKIE = "orqentra-nav-app";
export const NAV_PAGE_COOKIE = "orqentra-nav-page";

export const navCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 8,
};

export const MENU_PAGES = {
  permissions: "/permissions",
  inbound: "/inbound",
  "virtual location": "/virtual-location",
  outbound: "/outbound",
  "cost type": "/cost-type",
};

export function menuPagePath(label) {
  return MENU_PAGES[String(label ?? "").trim().toLowerCase()] ?? "";
}

export function menuPageKey(label) {
  const path = menuPagePath(label);
  return path ? path.slice(1) : "";
}

export const MENU_PAGE_PATHS = Object.values(MENU_PAGES);

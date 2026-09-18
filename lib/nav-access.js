export const NAV_APP_COOKIE = "orqentra-nav-app";
export const NAV_PAGE_COOKIE = "orqentra-nav-page";

export const navCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 8,
};

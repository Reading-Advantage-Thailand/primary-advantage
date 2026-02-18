import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

// ===== next-intl middleware instance =====
const intlMiddleware = createIntlMiddleware(routing);

// ===== Configuration =====

const LOCALES = routing.locales as unknown as string[];
const DEFAULT_LOCALE = routing.defaultLocale;

/**
 * Route-to-role mapping
 * Key: route prefix (without locale)
 * Value: array of roles allowed to access routes under that prefix
 */
const ROUTE_ROLES: Record<string, string[]> = {
  "/student": ["student", "teacher", "admin", "system"],
  "/teacher": ["teacher", "admin", "system"],
  "/admin": ["admin", "system"],
  "/system": ["system"],
};

/**
 * Protected routes that require authentication but allow any role
 */
const AUTH_ONLY_ROUTES = ["/settings"];

/**
 * Public path prefixes — accessible without authentication
 */
const PUBLIC_PREFIXES = [
  "/auth",
  "/about",
  "/authors",
  "/contact",
  "/privacy-policy",
  "/terms",
  "/unauthorized",
];

/**
 * Public exact paths
 */
const PUBLIC_EXACT = ["/"];

/**
 * Role-to-dashboard mapping
 * After login, users are redirected to their role-specific dashboard
 */
const ROLE_DASHBOARDS: Record<string, string> = {
  student: "/student/read",
  teacher: "/teacher/dashboard",
  admin: "/admin/dashboard",
  system: "/system/dashboard",
};

/**
 * Auth page prefixes — if already logged in, redirect to role dashboard
 */
const AUTH_PAGES = ["/auth/signin", "/auth/signup"];

/**
 * Auth callback path — used after OAuth login to redirect based on role
 */
const AUTH_CALLBACK = "/auth/callback";

// ===== Helpers =====

/**
 * Strip locale prefix from pathname
 * e.g. /th/admin/dashboard → /admin/dashboard
 *      /admin/dashboard → /admin/dashboard
 */
function stripLocale(pathname: string): string {
  for (const locale of LOCALES) {
    const prefix = `/${locale}`;
    if (pathname === prefix) return "/";
    if (pathname.startsWith(`${prefix}/`)) {
      return pathname.slice(prefix.length);
    }
  }
  return pathname;
}

/**
 * Extract locale from pathname, fallback to default
 */
function getLocale(pathname: string): string {
  for (const locale of LOCALES) {
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) {
      return locale;
    }
  }
  return DEFAULT_LOCALE;
}

/**
 * Check if a path (without locale) is public
 */
function isPublicPath(path: string): boolean {
  if (PUBLIC_EXACT.includes(path)) return true;
  return PUBLIC_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

/**
 * Check if the path is an auth page (signin/signup)
 */
function isAuthPage(path: string): boolean {
  return AUTH_PAGES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

/**
 * Get the dashboard URL for a given role
 */
function getDashboardForRole(role: string): string {
  return ROLE_DASHBOARDS[role] || "/";
}

/**
 * Find the matching role-protected route and return its allowed roles.
 * Returns null if the path is not role-protected.
 */
function getAllowedRoles(path: string): string[] | null {
  for (const [prefix, roles] of Object.entries(ROUTE_ROLES)) {
    if (path === prefix || path.startsWith(`${prefix}/`)) {
      return roles;
    }
  }
  return null;
}

/**
 * Check if a path requires authentication only (any role)
 */
function isAuthOnlyPath(path: string): boolean {
  return AUTH_ONLY_ROUTES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

/**
 * Check if pathname already has a locale prefix
 */
function hasLocale(pathname: string): boolean {
  for (const locale of LOCALES) {
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) {
      return true;
    }
  }
  return false;
}

// ===== Middleware =====

/**
 * Fetch and validate the current session from the auth API.
 * Returns the session object if valid, or null if expired/invalid.
 */
async function getValidSession(
  request: NextRequest,
): Promise<{ user: { role?: string; [key: string]: unknown } } | null> {
  try {
    const res = await fetch(new URL("/api/auth/get-session", request.url), {
      headers: { cookie: request.headers.get("cookie") || "" },
    });
    if (!res.ok) return null;
    const session = await res.json();
    if (!session?.user) return null;
    return session;
  } catch {
    return null;
  }
}

/**
 * Build a redirect URL to the signin page with callbackUrl and optional reason.
 * callbackUrl is stored WITHOUT locale prefix so next-intl router can handle it correctly.
 */
function buildSigninRedirect(
  request: NextRequest,
  locale: string,
  pathname: string,
  reason?: "expired",
): NextResponse {
  const signinUrl = new URL(`/${locale}/auth/signin`, request.url);
  // Strip locale from callback so the signin form can use router.push()
  // without next-intl doubling the locale prefix
  const callbackPath = stripLocale(pathname);
  signinUrl.searchParams.set("callbackUrl", callbackPath);
  if (reason) {
    signinUrl.searchParams.set("session", reason);
  }
  return NextResponse.redirect(signinUrl);
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 0. If no locale prefix, let next-intl handle the redirect
  if (!hasLocale(pathname)) {
    return intlMiddleware(request);
  }

  const locale = getLocale(pathname);
  const path = stripLocale(pathname);

  // 1. Auth callback — after OAuth, redirect to role-based dashboard
  if (path === AUTH_CALLBACK) {
    const session = getSessionCookie(request)
      ? await getValidSession(request)
      : null;
    if (session?.user) {
      const role = (session.user.role as string) || "user";
      const dashboard = getDashboardForRole(role);
      return NextResponse.redirect(
        new URL(`/${locale}${dashboard}`, request.url),
      );
    }
    return NextResponse.redirect(
      new URL(`/${locale}/auth/signin`, request.url),
    );
  }

  // 2. If user is logged in and visits auth pages → redirect to role dashboard
  if (isAuthPage(path)) {
    if (getSessionCookie(request)) {
      const session = await getValidSession(request);
      if (session?.user) {
        const role = (session.user.role as string) || "user";
        const dashboard = getDashboardForRole(role);
        return NextResponse.redirect(
          new URL(`/${locale}${dashboard}`, request.url),
        );
      }
    }
    return intlMiddleware(request);
  }

  // 3. Public paths — allow access without authentication
  if (isPublicPath(path)) {
    return intlMiddleware(request);
  }

  // 4. Check for session cookie (fast path — no network call if no cookie)
  //    No cookie at all → never had a session or it was fully cleared
  if (!getSessionCookie(request)) {
    return buildSigninRedirect(request, locale, pathname);
  }

  // 5. Validate session against the auth API
  //    Cookie exists but session may be expired server-side
  const session = await getValidSession(request);

  if (!session?.user) {
    // Session cookie exists but session is expired/invalid
    // → redirect to signin with expired reason so client can show a message
    return buildSigninRedirect(request, locale, pathname, "expired");
  }

  // 6. Determine if this route needs role checking
  const allowedRoles = getAllowedRoles(path);
  const authOnly = isAuthOnlyPath(path);

  // If the path is neither role-protected nor auth-only,
  // let Next.js handle it (will hit [...not-found] catch-all if no page exists)
  if (!allowedRoles && !authOnly) {
    return intlMiddleware(request);
  }

  // 7. Auth-only route — user is authenticated, allow access
  if (authOnly && !allowedRoles) {
    return intlMiddleware(request);
  }

  // 8. Role-based access check
  const userRole = (session.user.role as string) || "user";

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    // Role doesn't match — redirect to their own dashboard
    const dashboard = getDashboardForRole(userRole);
    return NextResponse.redirect(
      new URL(`/${locale}${dashboard}`, request.url),
    );
  }

  // Authorized — proceed
  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|trpc|_next|_next/image|favicon.ico|_vercel|.*\\..*).*)"],
};

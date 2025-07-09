import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { getToken } from "next-auth/jwt";

// Define protected routes and their required roles
const protectedRoutes = {
  "/admin": ["ADMIN", "SYSTEM"],
  "/teacher": ["TEACHER", "ADMIN", "SYSTEM"],
  "/student": ["STUDENT", "TEACHER", "ADMIN", "SYSTEM"],
  "/system": ["SYSTEM"],
  "/settings": ["USER", "STUDENT", "TEACHER", "ADMIN", "SYSTEM"],
};

// Define role-based default redirects after login
const roleDefaultRedirects = {
  USER: "/",
  STUDENT: "/student/read",
  TEACHER: "/teacher/dashboard",
  ADMIN: "/admin/dashboard",
  SYSTEM: "/system/dashboard",
};

// Create the intl middleware
const intlMiddleware = createIntlMiddleware(routing);

export async function middleware(request: NextRequest) {
  // Get the pathname without locale
  const pathname = request.nextUrl.pathname;
  const locale = request.nextUrl.pathname.split("/")[1];
  const pathWithoutLocale = pathname.replace(`/${locale}`, "") || "/";

  // Handle post-login redirects
  if (pathWithoutLocale === "/auth/signin") {
    const token = await getToken({
      req: request,
      secret: process.env.AUTH_SECRET,
    });

    if (token) {
      const userRole = token.role as string;
      const callbackUrl = request.nextUrl.searchParams.get("callbackUrl");

      if (callbackUrl) {
        // Check if user has access to the callback URL
        const callbackPathWithoutLocale =
          callbackUrl.replace(`/${locale}`, "") || "/";
        const requiredRoles = Object.entries(protectedRoutes).find(([route]) =>
          callbackPathWithoutLocale.startsWith(route),
        )?.[1];

        if (requiredRoles && requiredRoles.includes(userRole)) {
          // If user has access to callback URL, redirect there
          return NextResponse.redirect(new URL(callbackUrl, request.url));
        }
      }

      // If no callback URL or user doesn't have access, use default redirect
      const defaultRedirect =
        roleDefaultRedirects[userRole as keyof typeof roleDefaultRedirects];
      if (defaultRedirect) {
        return NextResponse.redirect(
          new URL(`/${locale}${defaultRedirect}`, request.url),
        );
      }
      // Fallback redirect to home page
      return NextResponse.redirect(new URL(`/${locale}/`, request.url));
    }
  }

  //handle i18n routing
  const response = await intlMiddleware(request);

  // Check if the route is protected
  const isProtectedRoute = Object.keys(protectedRoutes).some((route) =>
    pathWithoutLocale.startsWith(route),
  );

  if (isProtectedRoute) {
    const token = await getToken({
      req: request,
      secret: process.env.AUTH_SECRET,
    });

    // If no token, redirect to login
    if (!token) {
      const loginUrl = new URL(`/${locale}/auth/signin`, request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Check if user has required role for the route
    const userRole = token.role as string;
    const requiredRoles = Object.entries(protectedRoutes).find(([route]) =>
      pathWithoutLocale.startsWith(route),
    )?.[1];

    if (requiredRoles && !requiredRoles.includes(userRole)) {
      // Redirect to unauthorized page if user doesn't have required role
      return NextResponse.redirect(
        new URL(`/${locale}/unauthorized`, request.url),
      );
    }
  }

  return response;
}

export const config = {
  // Match all pathnames except for
  // - API routes
  // - Next.js internals
  // - Static files
  matcher: [
    "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
    // "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
    // Skip Next.js internals and all static files, unless found in search params
    // "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // // Always run for API routes
    // "/(api|trpc)(.*)",
  ],
};

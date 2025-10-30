import type { Metadata } from "next";
import "@/styles/globals.css";
import { NextIntlClientProvider, hasLocale, Locale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { siteConfig } from "@/configs/site-config";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Inter as FontSans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/lib/auth";
import { LayoutProvider } from "@/hooks/use-layout";

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: "%s | " + siteConfig.name,
  },
  description: siteConfig.description,
  keywords: [
    "primary advantage",
    "primary",
    "advantage",
    "primary advantage app",
    "primary advantage web",
  ],
  // openGraph: {
  //   type: "website",
  //   locale: "en_US",
  //   url: siteConfig.url,
  //   title: siteConfig.name,
  //   description: siteConfig.description,
  //   siteName: siteConfig.name,
  // },
  icons: {
    icon: "/primary-advantage.png",
    // shortcut: "/favicon-16x16.png",
    // apple: "/apple-touch-icon.png",
  },
  // manifest: `${siteConfig.url}/site.webmanifest`,
  // manifest: `http://localhost:3000/site.webmanifest`,
};

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{
    locale: Locale;
  }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const session = await auth();

  return (
    <SessionProvider session={session}>
      <html lang={locale} suppressHydrationWarning>
        <body
          className={` ${fontSans.variable} bg-background min-h-screen font-sans antialiased`}
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
            enableColorScheme
          >
            {/* <LayoutProvider> */}
            <NextIntlClientProvider>{children}</NextIntlClientProvider>
            <Toaster />
            {/* </LayoutProvider> */}
          </ThemeProvider>
        </body>
      </html>
    </SessionProvider>
  );
}

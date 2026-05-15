import { NextRequest, NextResponse, after } from "next/server";
import { contactFormSchema } from "@/lib/zod";
import { getCurrentUser } from "@/lib/session";
import { createContactMessage } from "@/server/models/contactModel";
import { verifyRecaptchaToken } from "@/lib/recaptcha";
import { sendContactNotificationEmail } from "@/server/services/contactNotificationService";

// In-memory token bucket rate limiter: 5 submissions per 10 minutes per IP
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REQUESTS = 5;

interface BucketEntry {
  count: number;
  windowStart: number;
}

const rateLimitBuckets = new Map<string, BucketEntry>();

function getClientIp(req: NextRequest): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0].trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return null;
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitBuckets.get(ip);

  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    rateLimitBuckets.set(ip, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= MAX_REQUESTS) {
    return false;
  }

  entry.count += 1;
  return true;
}

export async function submitContactMessage(
  req: NextRequest,
): Promise<NextResponse> {
  // Rate limiting
  const ip = getClientIp(req);
  if (ip !== null) {
    const allowed = checkRateLimit(ip);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many submissions, please try again later" },
        { status: 429 },
      );
    }
  }

  // Parse and validate body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: { _errors: ["Invalid JSON body"] },
      },
      { status: 400 },
    );
  }

  const parsed = contactFormSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // reCAPTCHA verification (after cheap rate-limit check, before DB)
  const recaptchaResult = await verifyRecaptchaToken(
    parsed.data.recaptchaToken,
    "contact_submit",
    0.5,
  );
  if (!recaptchaResult.ok) {
    return NextResponse.json(
      {
        error: "reCAPTCHA verification failed",
        reason: recaptchaResult.reason,
      },
      { status: 403 },
    );
  }

  // Capture session user if present (tolerant of no session)
  let userId: string | null = null;
  try {
    const user = await getCurrentUser();
    if (user?.id) userId = user.id;
  } catch {
    // No session — proceed as anonymous
  }

  try {
    const record = await createContactMessage(parsed.data, userId);
    // Fire notification after response is sent — DB insert is source of truth.
    // after() defers the callback until after the response is flushed (Next.js 15+).
    after(() => {
      void sendContactNotificationEmail(record).catch((err) =>
        console.error("Contact notification email failed:", err),
      );
    });
    return NextResponse.json({ success: true, id: record.id }, { status: 200 });
  } catch (err) {
    console.error("contact submission failed:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

type VerifyResult =
  | { ok: true; score: number }
  | { ok: false; reason: string };

interface SiteverifyResponse {
  success: boolean;
  score?: number;
  action?: string;
  "error-codes"?: string[];
}

/**
 * Verify a reCAPTCHA v3 token against Google's siteverify endpoint.
 *
 * Fail-open only when RECAPTCHA_SECRET_KEY is not configured (dev environments).
 * All other failure modes (missing token, low score, network error) are fail-closed.
 */
export async function verifyRecaptchaToken(
  token: string | undefined | null,
  expectedAction: string,
  minScore: number = 0.5,
): Promise<VerifyResult> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;

  // Fail-open only when the secret is not configured (dev/test without keys)
  if (!secret) {
    console.warn(
      "reCAPTCHA secret not configured — skipping verification",
    );
    return { ok: true, score: 1 };
  }

  if (!token) {
    return { ok: false, reason: "missing_token" };
  }

  const body = new URLSearchParams({ secret, response: token });

  let data: SiteverifyResponse;
  try {
    const response = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
        signal: AbortSignal.timeout(5000),
      },
    );
    data = (await response.json()) as SiteverifyResponse;
  } catch (err) {
    console.warn("reCAPTCHA siteverify unreachable:", err);
    return { ok: false, reason: "verify_unreachable" };
  }

  if (!data.success) {
    const codes = (data["error-codes"] ?? []).join(",");
    return { ok: false, reason: `invalid_token: ${codes}` };
  }

  if (data.action !== expectedAction) {
    return { ok: false, reason: "action_mismatch" };
  }

  const score = data.score ?? 0;
  if (score < minScore) {
    return { ok: false, reason: `low_score: ${score}` };
  }

  return { ok: true, score };
}

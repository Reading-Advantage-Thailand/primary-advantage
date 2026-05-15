import { Resend } from "resend";

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

type SendEmailResult =
  | { ok: true; id: string }
  | { ok: false; reason: string };

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey) {
    console.warn("RESEND_API_KEY not configured — skipping email send");
    return { ok: true, id: "dev-skip" };
  }

  if (!from) {
    return { ok: false, reason: "from_not_configured" };
  }

  const resend = new Resend(apiKey);

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    });

    if (error) {
      console.error("Email send failed:", error);
      return { ok: false, reason: error.message };
    }

    return { ok: true, id: data!.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Email send failed:", err);
    return { ok: false, reason: message };
  }
}

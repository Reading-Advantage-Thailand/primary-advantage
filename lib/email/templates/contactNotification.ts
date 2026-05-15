type InquiryType = "SALES" | "SUPPORT" | "PARTNERSHIPS";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(date: Date): string {
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });
}

function wrapText(text: string, maxWidth = 72): string {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    if (paragraph.length <= maxWidth) {
      lines.push(paragraph);
      continue;
    }
    const words = paragraph.split(" ");
    let line = "";
    for (const word of words) {
      if (!line) {
        line = word;
      } else if (line.length + 1 + word.length <= maxWidth) {
        line += " " + word;
      } else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
  }
  return lines.join("\n");
}

export function renderContactNotificationEmail(input: {
  id: string;
  name: string;
  email: string;
  institution: string | null;
  inquiry: InquiryType;
  message: string;
  createdAt: Date;
  isAuthenticatedUser: boolean;
  appUrl: string;
}): { subject: string; html: string; text: string } {
  const {
    id,
    name,
    email,
    institution,
    inquiry,
    message,
    createdAt,
    isAuthenticatedUser,
    appUrl,
  } = input;

  const subject = `[Primary Advantage] New ${inquiry} inquiry from ${name}`;

  const ctaUrl = `${appUrl}/en/system/contact-messages?status=NEW`;
  const formattedDate = formatDate(createdAt);
  const accountStatus = isAuthenticatedUser ? "Registered user" : "Guest";
  const institutionDisplay = institution ?? "—";

  const safeName = escapeHtml(name);
  const safeInstitution = escapeHtml(institutionDisplay);
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br>");
  const safeEmail = escapeHtml(email);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background-color:#6366f1;padding:24px 32px;">
              <p style="margin:0;font-size:20px;font-weight:bold;color:#ffffff;">New Contact Message</p>
              <p style="margin:4px 0 0;font-size:14px;color:#e0e7ff;">Primary Advantage Platform</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 24px;font-size:15px;color:#374151;">
                A new contact form submission has been received. Details below:
              </p>

              <!-- Field table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:24px;">
                <tr>
                  <td style="padding:10px 12px;background-color:#f9fafb;border:1px solid #e5e7eb;width:35%;font-size:13px;font-weight:bold;color:#6b7280;vertical-align:top;">Name</td>
                  <td style="padding:10px 12px;border:1px solid #e5e7eb;border-left:none;font-size:14px;color:#111827;vertical-align:top;">${safeName}</td>
                </tr>
                <tr>
                  <td style="padding:10px 12px;background-color:#f9fafb;border:1px solid #e5e7eb;border-top:none;font-size:13px;font-weight:bold;color:#6b7280;vertical-align:top;">Email</td>
                  <td style="padding:10px 12px;border:1px solid #e5e7eb;border-left:none;border-top:none;font-size:14px;color:#111827;vertical-align:top;"><a href="mailto:${safeEmail}" style="color:#6366f1;text-decoration:none;">${safeEmail}</a></td>
                </tr>
                <tr>
                  <td style="padding:10px 12px;background-color:#f9fafb;border:1px solid #e5e7eb;border-top:none;font-size:13px;font-weight:bold;color:#6b7280;vertical-align:top;">Institution</td>
                  <td style="padding:10px 12px;border:1px solid #e5e7eb;border-left:none;border-top:none;font-size:14px;color:#111827;vertical-align:top;">${safeInstitution}</td>
                </tr>
                <tr>
                  <td style="padding:10px 12px;background-color:#f9fafb;border:1px solid #e5e7eb;border-top:none;font-size:13px;font-weight:bold;color:#6b7280;vertical-align:top;">Inquiry Type</td>
                  <td style="padding:10px 12px;border:1px solid #e5e7eb;border-left:none;border-top:none;font-size:14px;color:#111827;vertical-align:top;">
                    <span style="display:inline-block;padding:2px 10px;background-color:#ede9fe;color:#5b21b6;border-radius:9999px;font-size:12px;font-weight:bold;">${inquiry}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 12px;background-color:#f9fafb;border:1px solid #e5e7eb;border-top:none;font-size:13px;font-weight:bold;color:#6b7280;vertical-align:top;">Submitted At</td>
                  <td style="padding:10px 12px;border:1px solid #e5e7eb;border-left:none;border-top:none;font-size:14px;color:#111827;vertical-align:top;">${escapeHtml(formattedDate)}</td>
                </tr>
                <tr>
                  <td style="padding:10px 12px;background-color:#f9fafb;border:1px solid #e5e7eb;border-top:none;font-size:13px;font-weight:bold;color:#6b7280;vertical-align:top;">Account Status</td>
                  <td style="padding:10px 12px;border:1px solid #e5e7eb;border-left:none;border-top:none;font-size:14px;color:#111827;vertical-align:top;">${accountStatus}</td>
                </tr>
                <tr>
                  <td style="padding:10px 12px;background-color:#f9fafb;border:1px solid #e5e7eb;border-top:none;font-size:13px;font-weight:bold;color:#6b7280;vertical-align:top;">Message ID</td>
                  <td style="padding:10px 12px;border:1px solid #e5e7eb;border-left:none;border-top:none;font-size:14px;color:#6b7280;font-family:monospace;vertical-align:top;">${escapeHtml(id)}</td>
                </tr>
              </table>

              <!-- Message block -->
              <p style="margin:0 0 8px;font-size:13px;font-weight:bold;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Message</p>
              <div style="background-color:#f9fafb;border-left:4px solid #6366f1;padding:16px;border-radius:0 4px 4px 0;font-size:14px;color:#374151;line-height:1.6;">
                ${safeMessage}
              </div>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;">
                <tr>
                  <td align="center">
                    <a href="${ctaUrl}" style="display:inline-block;padding:12px 28px;background-color:#6366f1;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;border-radius:6px;">
                      View in Admin Dashboard
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;">
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
                You're receiving this because you're configured as the contact notification recipient for Primary Advantage.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const plainBody = wrapText(
    [
      "NEW CONTACT MESSAGE — Primary Advantage",
      "=".repeat(40),
      "",
      `Name:           ${name}`,
      `Email:          ${email}`,
      `Institution:    ${institutionDisplay}`,
      `Inquiry Type:   ${inquiry}`,
      `Submitted At:   ${formattedDate}`,
      `Account Status: ${accountStatus}`,
      `Message ID:     ${id}`,
      "",
      "MESSAGE",
      "-".repeat(40),
      message,
      "-".repeat(40),
      "",
      `View in Admin Dashboard: ${ctaUrl}`,
      "",
      "---",
      "You're receiving this because you're configured as the contact",
      "notification recipient for Primary Advantage.",
    ].join("\n"),
  );

  return { subject, html, text: plainBody };
}

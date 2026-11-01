/** Existing website inquiry email formatting and Resend delivery. */
const RESEND_URL = "https://api.resend.com/emails";

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function line(label, value) {
  const safeValue = escapeHtml(value || "Not provided");
  return `
    <tr>
      <td style="padding:10px 0;color:#7a8496;font-size:13px;width:145px;vertical-align:top;">${label}</td>
      <td style="padding:10px 0;color:#182033;font-size:14px;font-weight:600;vertical-align:top;">${safeValue}</td>
    </tr>`;
}

function buildHtml(inquiry) {
  const safeMessage = escapeHtml(inquiry.message).replaceAll("\n", "<br />");

  return `<!doctype html>
  <html>
    <body style="margin:0;background:#f5f7fb;font-family:Arial,Helvetica,sans-serif;color:#182033;">
      <div style="padding:28px 14px;">
        <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e8ebf2;border-radius:20px;overflow:hidden;box-shadow:0 14px 36px rgba(31,43,68,.08);">
          <div style="padding:26px 28px;background:linear-gradient(135deg,#fff2e6,#fff8dc);">
            <div style="font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#b75a1b;">New Neptrixx inquiry</div>
            <h1 style="margin:10px 0 0;font-size:26px;line-height:1.15;">${escapeHtml(inquiry.name)} wants to discuss ${escapeHtml(inquiry.service)}</h1>
          </div>
          <div style="padding:24px 28px;">
            <table role="presentation" style="width:100%;border-collapse:collapse;">
              ${line("Name", inquiry.name)}
              ${line("Email", inquiry.email)}
              ${line("Company", inquiry.company)}
              ${line("Service", inquiry.service)}
              ${line("Budget", inquiry.budget)}
              ${line("Timeline", inquiry.timeline)}
              ${line("Submitted", new Date(inquiry.createdAt).toLocaleString("en-US", { timeZone: "UTC" }) + " UTC")}
            </table>
            <div style="margin-top:18px;padding-top:20px;border-top:1px solid #eceff4;">
              <div style="margin-bottom:9px;color:#7a8496;font-size:13px;">Project details</div>
              <div style="padding:16px 18px;border-radius:14px;background:#f8f9fc;color:#25304a;font-size:14px;line-height:1.65;">${safeMessage}</div>
            </div>
            <div style="margin-top:20px;font-size:13px;color:#788296;">Reply directly to this email to respond to ${escapeHtml(inquiry.name)}.</div>
          </div>
        </div>
      </div>
    </body>
  </html>`;
}

function buildText(inquiry) {
  return [
    "NEW NEPTRIXX WEBSITE INQUIRY",
    "",
    `Name: ${inquiry.name}`,
    `Email: ${inquiry.email}`,
    `Company: ${inquiry.company || "Not provided"}`,
    `Service: ${inquiry.service || "Not provided"}`,
    `Budget: ${inquiry.budget || "Not provided"}`,
    `Timeline: ${inquiry.timeline || "Not provided"}`,
    `Submitted: ${inquiry.createdAt}`,
    "",
    "Project details:",
    inquiry.message,
  ].join("\n");
}

export async function sendInquiryEmail(inquiry) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.INQUIRY_TO_EMAIL || "neptrixxinternational@gmail.com";
  const from = process.env.INQUIRY_FROM_EMAIL;

  if (!apiKey || !from) {
    throw new Error("Inquiry email is not configured on the server.");
  }

  const response = await fetch(RESEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": inquiry.id,
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `Neptrixx inquiry: ${inquiry.service} — ${inquiry.name}`,
      html: buildHtml(inquiry),
      text: buildText(inquiry),
      reply_to: inquiry.email,
      tags: [
        { name: "source", value: "neptrixx_website" },
        { name: "type", value: "project_inquiry" },
      ],
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload?.message || payload?.name || `Resend returned HTTP ${response.status}`;
    throw new Error(`Email delivery failed: ${detail}`);
  }

  return payload;
}

import { Resend } from "resend";

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function getFrom(): string {
  return process.env.RESEND_FROM_EMAIL || "Bära <noreply@baraapp.se>";
}

function jobTypeLabel(jobType: string): string {
  switch (jobType) {
    case "furniture_transport": return "Furniture Transport";
    case "bulky_delivery":      return "Bulky Item Delivery";
    case "junk_pickup":         return "Junk & Trash Pickup";
    default:                    return jobType;
  }
}

function formatSEK(amount: number): string {
  return `${amount.toLocaleString("sv-SE")} kr`;
}

function starRating(rating: number | null | undefined): string {
  if (rating == null) return "Not yet rated";
  const full = Math.round(rating);
  return "★".repeat(full) + "☆".repeat(5 - full) + ` (${rating.toFixed(1)})`;
}

interface ReceiptData {
  jobId: number;
  jobType: string;
  completedAt: string;
  pickupAddress?: string | null;
  dropoffAddress?: string | null;
  homeAddress?: string | null;
  priceTotal: number;
  driverName: string;
  driverRating?: number | null;
  customerName: string;
  customerEmail: string;
}

function buildReceiptHtml(data: ReceiptData): string {
  const {
    jobId, jobType, completedAt, pickupAddress, dropoffAddress,
    homeAddress, priceTotal, driverName, driverRating,
    customerName,
  } = data;

  const date = new Date(completedAt).toLocaleDateString("sv-SE", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const hasAddresses = pickupAddress || dropoffAddress || homeAddress;

  const addressRows = hasAddresses ? `
    <tr>
      <td style="padding:0 0 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
          style="background:#f8f7f4;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="padding:16px 20px;">
              <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#8B9CBD;letter-spacing:0.8px;text-transform:uppercase;">Location</p>
              ${pickupAddress ? `
              <p style="margin:0 0 8px;font-size:14px;color:#1B2A4A;">
                <span style="color:#C9A84C;font-weight:600;">Pickup:</span> ${pickupAddress}
              </p>` : ""}
              ${dropoffAddress ? `
              <p style="margin:0;font-size:14px;color:#1B2A4A;">
                <span style="color:#C9A84C;font-weight:600;">Drop-off:</span> ${dropoffAddress}
              </p>` : ""}
              ${homeAddress && !pickupAddress ? `
              <p style="margin:0;font-size:14px;color:#1B2A4A;">
                <span style="color:#C9A84C;font-weight:600;">Address:</span> ${homeAddress}
              </p>` : ""}
            </td>
          </tr>
        </table>
      </td>
    </tr>` : "";

  return `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Job Receipt — Bära</title>
</head>
<body style="margin:0;padding:0;background:#f0ede8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0ede8;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">

          <!-- Header -->
          <tr>
            <td style="background:#1B2A4A;border-radius:12px 12px 0 0;padding:32px 36px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <p style="margin:0 0 4px;font-size:26px;font-weight:800;color:#C9A84C;letter-spacing:-0.5px;">Bära</p>
                    <p style="margin:0;font-size:13px;color:#8B9CBD;letter-spacing:0.3px;">On-demand transport & pickup</p>
                  </td>
                  <td align="right" valign="top">
                    <span style="display:inline-block;background:#C9A84C20;border:1px solid #C9A84C40;color:#C9A84C;font-size:11px;font-weight:600;letter-spacing:0.6px;padding:5px 12px;border-radius:20px;text-transform:uppercase;">
                      ✓ Completed
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:32px 36px;border-radius:0 0 12px 12px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">

                <!-- Greeting -->
                <tr>
                  <td style="padding:0 0 24px;">
                    <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#1B2A4A;">
                      Your receipt, ${customerName.split(" ")[0]}
                    </p>
                    <p style="margin:0;font-size:14px;color:#666;line-height:1.6;">
                      Your job has been successfully completed. Here's a summary for your records.
                    </p>
                  </td>
                </tr>

                <!-- Divider -->
                <tr><td style="padding:0 0 24px;"><div style="height:1px;background:#e8e4de;"></div></td></tr>

                <!-- Job details card -->
                <tr>
                  <td style="padding:0 0 16px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0"
                      style="background:#f8f7f4;border-radius:8px;overflow:hidden;">
                      <tr>
                        <td style="padding:16px 20px;">
                          <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#8B9CBD;letter-spacing:0.8px;text-transform:uppercase;">Service</p>
                          <p style="margin:0 0 16px;font-size:15px;font-weight:600;color:#1B2A4A;">${jobTypeLabel(jobType)}</p>
                          <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#8B9CBD;letter-spacing:0.8px;text-transform:uppercase;">Date & Time</p>
                          <p style="margin:0;font-size:14px;color:#1B2A4A;">${date}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Address card -->
                ${addressRows}

                <!-- Driver card -->
                <tr>
                  <td style="padding:0 0 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0"
                      style="background:#f8f7f4;border-radius:8px;overflow:hidden;">
                      <tr>
                        <td style="padding:16px 20px;">
                          <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#8B9CBD;letter-spacing:0.8px;text-transform:uppercase;">Driver</p>
                          <p style="margin:0 0 4px;font-size:15px;font-weight:600;color:#1B2A4A;">${driverName}</p>
                          <p style="margin:0;font-size:13px;color:#C9A84C;font-weight:500;">${starRating(driverRating)}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Divider -->
                <tr><td style="padding:0 0 24px;"><div style="height:1px;background:#e8e4de;"></div></td></tr>

                <!-- Price row -->
                <tr>
                  <td style="padding:0 0 8px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td><p style="margin:0;font-size:14px;color:#666;">Total paid</p></td>
                        <td align="right">
                          <p style="margin:0;font-size:24px;font-weight:800;color:#C9A84C;">${formatSEK(priceTotal)}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Job ref -->
                <tr>
                  <td style="padding:0 0 28px;">
                    <p style="margin:0;font-size:12px;color:#999;">Job reference: <span style="font-family:monospace;color:#666;">#${String(jobId).padStart(6, "0")}</span></p>
                  </td>
                </tr>

                <!-- Divider -->
                <tr><td style="padding:0 0 24px;"><div style="height:1px;background:#e8e4de;"></div></td></tr>

                <!-- Support note -->
                <tr>
                  <td style="padding:0 0 8px;">
                    <p style="margin:0;font-size:13px;color:#666;line-height:1.7;">
                      Have a question about this job? Reply to this email or contact us at
                      <a href="mailto:hello@baraapp.se" style="color:#C9A84C;text-decoration:none;font-weight:500;">hello@baraapp.se</a>
                      and reference job <span style="font-family:monospace;">#${String(jobId).padStart(6, "0")}</span>.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 0 0;text-align:center;">
              <p style="margin:0 0 4px;font-size:12px;color:#999;">© ${new Date().getFullYear()} Bära · Sverige</p>
              <p style="margin:0;font-size:11px;color:#bbb;">You're receiving this because you completed a job on Bära.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendReceiptEmail(data: ReceiptData): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping receipt email");
    return;
  }

  const html = buildReceiptHtml(data);
  const subject = `Your Bära receipt — ${jobTypeLabel(data.jobType)} #${String(data.jobId).padStart(6, "0")}`;

  try {
    const result = await resend.emails.send({
      from: getFrom(),
      to: data.customerEmail,
      subject,
      html,
    });
    if (result.error) {
      console.error("[email] Resend returned error:", result.error);
    } else {
      console.info(`[email] Receipt sent to ${data.customerEmail} for job #${data.jobId}`);
    }
  } catch (err) {
    console.error("[email] Failed to send receipt:", err);
  }
}

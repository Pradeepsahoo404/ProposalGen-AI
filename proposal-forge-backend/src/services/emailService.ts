import nodemailer from "nodemailer";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const MAIL_FROM = process.env.MAIL_FROM || "ProposalForge <noreply@proposalforge.com>";
const COMPANY_NAME = process.env.COMPANY_NAME || "Your Company";

function getTransporter() {
  const host = process.env.MAIL_HOST;
  const port = process.env.MAIL_PORT ? parseInt(process.env.MAIL_PORT, 10) : 587;
  const user = process.env.MAIL_USER;
  const pass = process.env.MAIL_PASS;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendShareEmail(
  recipientEmail: string,
  shareLink: string,
  message: string,
  proposalTitle?: string
): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn("Email not configured (MAIL_HOST/USER/PASS). Skipping send.");
    return false;
  }
  const title = proposalTitle || "Proposal";
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Proposal from ${COMPANY_NAME}</title>
</head>
<body style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,0.07);overflow:hidden;">
    <div style="background:#3b82f6;color:#fff;padding:20px 24px;">
      <h1 style="margin:0;font-size:1.25rem;font-weight:600;">${COMPANY_NAME}</h1>
      <p style="margin:4px 0 0;opacity:0.9;font-size:0.875rem;">Proposal: ${title}</p>
    </div>
    <div style="padding:24px;">
      <p style="margin:0 0 16px;color:#334155;line-height:1.6;">${message || "You have been sent a proposal. Open the link below to view it."}</p>
      <p style="margin:0 0 8px;font-size:0.875rem;color:#64748b;">Secure link (expires in 30 days):</p>
      <a href="${shareLink}" style="display:inline-block;background:#3b82f6;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:500;margin-top:8px;">View Proposal</a>
      <p style="margin:16px 0 0;font-size:0.75rem;color:#94a3b8;">Or copy this link: ${shareLink}</p>
    </div>
    <div style="padding:12px 24px;background:#f1f5f9;font-size:0.75rem;color:#64748b;">
      This link is private and only intended for you. Do not share it with others.
    </div>
  </div>
</body>
</html>
  `.trim();

  try {
    await transporter.sendMail({
      from: MAIL_FROM,
      to: recipientEmail,
      subject: `Proposal from ${COMPANY_NAME}: ${title}`,
      text: `${message || "You have been sent a proposal."}\n\nView proposal: ${shareLink}`,
      html,
    });
    return true;
  } catch (err) {
    console.error("sendShareEmail error:", err);
    return false;
  }
}

const RESET_EXPIRY_HOURS = 1;

export async function sendPasswordResetEmail(
  recipientEmail: string,
  resetToken: string
): Promise<boolean> {
  const transporter = getTransporter();
  const resetLink = `${FRONTEND_URL}/reset-password?token=${encodeURIComponent(resetToken)}`;
  if (!transporter) {
    console.warn("Email not configured. Skipping password reset email.");
    return false;
  }
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your password</title>
</head>
<body style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,0.07);overflow:hidden;">
    <div style="background:#3b82f6;color:#fff;padding:20px 24px;">
      <h1 style="margin:0;font-size:1.25rem;font-weight:600;">${COMPANY_NAME}</h1>
      <p style="margin:4px 0 0;opacity:0.9;font-size:0.875rem;">Reset your password</p>
    </div>
    <div style="padding:24px;">
      <p style="margin:0 0 16px;color:#334155;line-height:1.6;">You requested a password reset. Click the button below to set a new password. This link expires in ${RESET_EXPIRY_HOURS} hour(s).</p>
      <a href="${resetLink}" style="display:inline-block;background:#3b82f6;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:500;margin-top:8px;">Reset password</a>
      <p style="margin:16px 0 0;font-size:0.75rem;color:#94a3b8;">Or copy: ${resetLink}</p>
    </div>
    <div style="padding:12px 24px;background:#f1f5f9;font-size:0.75rem;color:#64748b;">
      If you did not request this, you can ignore this email.
    </div>
  </div>
</body>
</html>
  `.trim();

  try {
    await transporter.sendMail({
      from: MAIL_FROM,
      to: recipientEmail,
      subject: `Reset your password – ${COMPANY_NAME}`,
      text: `Reset your password: ${resetLink}\n\nThis link expires in ${RESET_EXPIRY_HOURS} hour(s).`,
      html,
    });
    return true;
  } catch (err) {
    console.error("sendPasswordResetEmail error:", err);
    return false;
  }
}

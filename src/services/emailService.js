/**
 * emailService.js
 *
 * Sends transactional email via:
 *   sendgrid — SendGrid REST API (uses EMAIL_PASS as Bearer token SG.xxxx)
 *   brevo    — Brevo REST API   (uses EMAIL_PASS as the api-key header)
 *   gmail    — Gmail SMTP       (needs an App Password)
 *   smtp     — Custom SMTP
 */

const nodemailer = require('nodemailer');

// ─── Brevo REST API sender ────────────────────────────────────────────────────

const sendViaBrevoApi = async (toEmail, fromName, fromAddress, subject, html, text) => {
  const apiKey = process.env.EMAIL_PASS;

  const body = {
    sender: { name: fromName, email: fromAddress },
    to: [{ email: toEmail }],
    subject,
    htmlContent: html,
    textContent: text,
  };

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  console.log(`    Brevo API response: ${res.status} ${res.statusText} - ${JSON.stringify(data)}`);

  if (!res.ok) {
    throw new Error(`Brevo API error ${res.status}: ${data.message || JSON.stringify(data)}`);
  }

  return data;          // { messageId: '...' }
};

// ─── SMTP transporter (gmail / custom smtp) ───────────────────────────────────

const buildSmtpTransporter = async () => {
  const provider = (process.env.EMAIL_PROVIDER || '').toLowerCase();
  const hasCredentials = process.env.EMAIL_USER && process.env.EMAIL_PASS;

  if (provider === 'gmail' && hasCredentials) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
  }

  if (provider === 'smtp' && process.env.EMAIL_HOST && hasCredentials) {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: Number(process.env.EMAIL_PORT) === 465,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
  }

  // Fallback: Ethereal catch-all (dev only)
  const testAccount = await nodemailer.createTestAccount();
  const t = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
  t._isEthereal = true;
  return t;
};

let _smtpTransporter = null;
const getSmtpTransporter = async () => {
  if (_smtpTransporter) return _smtpTransporter;
  const t = await buildSmtpTransporter();
  if (!t._isEthereal) {
    try {
      await t.verify();
      console.log(`✅  SMTP ready (${process.env.EMAIL_PROVIDER})`);
    } catch (err) {
      console.error(`❌  SMTP verify failed: ${err.message}`);
      return t;   // don't cache
    }
  }
  _smtpTransporter = t;
  return _smtpTransporter;
};

// ─── OTP email HTML ───────────────────────────────────────────────────────────

const otpHtml = (firstName, code) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0"
          style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1,#06b6d4);padding:28px 40px;">
              <span style="color:#fff;font-size:20px;font-weight:800;letter-spacing:0.06em;">GRAVITY GYM</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">Verify your account</p>
              <p style="margin:0 0 28px;font-size:14px;color:#64748b;line-height:1.6;">
                Hi ${firstName}, use the code below to verify your Gravity Gym account.
                It expires in <strong>10 minutes</strong>.
              </p>

              <!-- OTP box -->
              <div style="background:#f8fafc;border:2px dashed #e2e8f0;border-radius:12px;padding:28px;text-align:center;margin-bottom:28px;">
                <p style="margin:0 0 6px;font-size:11px;font-weight:600;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;">Verification code</p>
                <p style="margin:0;font-size:44px;font-weight:800;letter-spacing:14px;color:#0f172a;font-family:monospace;">${code}</p>
              </div>

              <p style="margin:0;font-size:12px;color:#94a3b8;">
                If you didn't create a Gravity Gym account, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:18px 40px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
                &copy; ${new Date().getFullYear()} Gravity Gym &mdash; Sent securely
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// ─── Public API ───────────────────────────────────────────────────────────────

const sendOtpEmail = async (toEmail, firstName, code) => {
  const provider = (process.env.EMAIL_PROVIDER || '').toLowerCase();
  const fromName = process.env.EMAIL_FROM_NAME || 'Gravity Gym';
  const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  const subject = `${code} — your Gravity Gym verification code`;
  const html = otpHtml(firstName, code);
  const text = `Hi ${firstName},\n\nYour Gravity Gym verification code is: ${code}\n\nExpires in 10 minutes.\n\nIf you didn't register, ignore this email.`;

  console.log(`\n📤  Sending OTP email`);
  console.log(`    Provider : ${provider || 'ethereal'}`);
  console.log(`    To       : ${toEmail}`);
  console.log(`    From     : "${fromName}" <${fromAddress}>`);
  console.log(`    OTP      : ${code}`);

  // ── Brevo REST API path ──
  if (provider === 'brevo') {
    try {
      const result = await sendViaBrevoApi(toEmail, fromName, fromAddress, subject, html, text);
      console.log(`    Status   : sent ✓  (messageId: ${result.messageId})\n`);
      return result;
    } catch (err) {
      console.error(`    FAILED   : ${err.message}\n`);
      throw err;
    }
  }

  // ── SMTP path (gmail / custom / ethereal) ──
  const transporter = await getSmtpTransporter();
  try {
    const info = await transporter.sendMail({ from: `"${fromName}" <${fromAddress}>`, to: toEmail, subject, html, text });
    if (transporter._isEthereal) {
      console.log(`    Preview  : ${nodemailer.getTestMessageUrl(info)}`);
    } else {
      console.log(`    Status   : sent ✓  (messageId: ${info.messageId})`);
    }
    console.log('');
    return info;
  } catch (err) {
    console.error(`    FAILED   : ${err.message}\n`);
    _smtpTransporter = null;
    throw err;
  }
};

module.exports = { sendOtpEmail };

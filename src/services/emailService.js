const nodemailer = require('nodemailer');

/**
 * Build a transporter based on EMAIL_PROVIDER env var.
 *
 * Supported values:
 *   brevo  — Brevo (ex-Sendinblue) SMTP  — 300 free emails/day
 *   gmail  — Gmail SMTP (needs App Password)
 *   smtp   — Custom SMTP (EMAIL_HOST / EMAIL_PORT)
 *
 * If EMAIL_PROVIDER is missing or credentials are absent, falls back to
 * Ethereal (catches emails in preview URLs — good for quick local dev).
 */
const buildTransporter = async () => {
  const provider = (process.env.EMAIL_PROVIDER || '').toLowerCase();
  const hasCredentials = process.env.EMAIL_USER && process.env.EMAIL_PASS;

  // Brevo or any provider where host/port are set explicitly via env
  if ((provider === 'brevo' || provider === 'smtp') && process.env.EMAIL_HOST && hasCredentials) {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: Number(process.env.EMAIL_PORT) === 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  // Brevo defaults (if EMAIL_HOST not set)
  if (provider === 'brevo' && hasCredentials) {
    return nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  if (provider === 'gmail' && hasCredentials) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  // Fallback: Ethereal catch-all (dev only — logs a preview URL)
  const testAccount = await nodemailer.createTestAccount();
  const transport = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
  transport._isEthereal = true;
  return transport;
};

// Singleton so we don't create a new transport per request
let _transporter = null;
const getTransporter = async () => {
  if (!_transporter) _transporter = await buildTransporter();
  return _transporter;
};

// ─── OTP email ────────────────────────────────────────────────────────────────

const otpHtml = (firstName, code) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#f4f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.07);">

          <!-- Header -->
          <tr>
            <td style="background:#1e293b;padding:32px 40px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#2563eb;width:36px;height:36px;border-radius:10px;text-align:center;vertical-align:middle;">
                    <span style="color:#fff;font-size:20px;line-height:36px;">&#9829;</span>
                  </td>
                  <td style="padding-left:12px;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">GymManager</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 8px;font-size:24px;font-weight:700;color:#0f172a;">Verify your account</p>
              <p style="margin:0 0 28px;font-size:15px;color:#64748b;line-height:1.6;">
                Hi ${firstName}, use the code below to verify your GymManager account.
                It expires in <strong>10 minutes</strong>.
              </p>

              <!-- OTP box -->
              <div style="background:#f8fafc;border:2px dashed #cbd5e1;border-radius:12px;padding:28px;text-align:center;margin-bottom:28px;">
                <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;">Verification code</p>
                <p style="margin:0;font-size:42px;font-weight:800;letter-spacing:12px;color:#1e293b;font-family:monospace;">${code}</p>
              </div>

              <p style="margin:0 0 6px;font-size:13px;color:#94a3b8;">
                If you didn't create a GymManager account, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
                &copy; ${new Date().getFullYear()} GymManager &mdash; Sent securely
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

/**
 * Send an OTP verification email.
 * @param {string} toEmail
 * @param {string} firstName
 * @param {string} code   6-digit OTP
 */
const sendOtpEmail = async (toEmail, firstName, code) => {
  const transporter = await getTransporter();

  const fromName = process.env.EMAIL_FROM_NAME || 'GymManager';
  const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@gymmanager.app';

  const info = await transporter.sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    to: toEmail,
    subject: `${code} is your GymManager verification code`,
    html: otpHtml(firstName, code),
    text: `Hi ${firstName},\n\nYour GymManager verification code is: ${code}\n\nIt expires in 10 minutes.\n\nIf you didn't create an account, ignore this email.`,
  });

  if (transporter._isEthereal) {
    console.log(`\n📧  Email preview (Ethereal): ${nodemailer.getTestMessageUrl(info)}\n`);
  }

  return info;
};

module.exports = { sendOtpEmail };

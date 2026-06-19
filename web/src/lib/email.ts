import "server-only"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = "Astra <noreply@useastra.tech>"
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://useastra.tech"

/* ─── Shared shell ─────────────────────────────────────── */

function emailShell(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>Astra</title>
</head>
<body style="margin:0;padding:0;background:#f1f1f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"
         style="background:#f1f1f0;padding:40px 16px 56px">
    <tr><td align="center">

      <!-- Card -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"
             style="max-width:560px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">

        <!-- Header -->
        <tr>
          <td style="background:#09090b;padding:28px 40px 24px">
            <table cellpadding="0" cellspacing="0" border="0" role="presentation">
              <tr>
                <td style="vertical-align:middle;padding-right:10px">
                  <div style="width:30px;height:30px;background:#f97316;border-radius:8px"></div>
                </td>
                <td style="vertical-align:middle">
                  <span style="color:#ffffff;font-size:20px;font-weight:900;letter-spacing:-0.5px">Astra</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Accent bar -->
        <tr>
          <td style="background:linear-gradient(90deg,#f97316 0%,#fb923c 100%);height:3px;font-size:0;line-height:0">&zwnj;</td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 36px">
            ${body}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#fafafa;border-top:1px solid #e4e4e7;padding:24px 40px">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
              <tr>
                <td>
                  <p style="margin:0 0 6px;font-size:12px;color:#a1a1aa;line-height:1.5">
                    Questions? Reply to this email or write to
                    <a href="mailto:support@useastra.tech" style="color:#f97316;text-decoration:none;font-weight:500">support@useastra.tech</a>
                  </p>
                  <p style="margin:0;font-size:12px;color:#d4d4d8;line-height:1.5">
                    © ${new Date().getFullYear()} Astra · <a href="${APP_URL}/privacy" style="color:#d4d4d8;text-decoration:underline">Privacy</a> · <a href="${APP_URL}/terms" style="color:#d4d4d8;text-decoration:underline">Terms</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
      <!-- /Card -->

    </td></tr>
  </table>
</body>
</html>`
}

/* ─── Shared primitives ─────────────────────────────────── */

function badge(text: string): string {
  return `<p style="margin:0 0 20px">
    <span style="display:inline-block;background:#fff7ed;color:#f97316;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:4px 12px;border-radius:100px;border:1px solid #fed7aa">${text}</span>
  </p>`
}

function heading(text: string): string {
  return `<h1 style="margin:0 0 12px;font-size:28px;font-weight:900;color:#09090b;letter-spacing:-0.5px;line-height:1.15">${text}</h1>`
}

function body(text: string): string {
  return `<p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:#52525b">${text}</p>`
}

function ctaButton(href: string, label: string): string {
  return `<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin:28px 0 0">
    <tr>
      <td style="border-radius:10px;background:#09090b">
        <a href="${href}"
           style="display:inline-block;padding:13px 28px;background:#09090b;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:10px;letter-spacing:-0.1px">
          ${label} &rarr;
        </a>
      </td>
    </tr>
  </table>`
}

function divider(): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin:28px 0">
    <tr><td style="border-top:1px solid #f4f4f5;height:0;font-size:0;line-height:0">&zwnj;</td></tr>
  </table>`
}

function featureRow(icon: string, title: string, desc: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin-bottom:16px">
    <tr>
      <td style="vertical-align:top;width:36px;padding-right:12px">
        <div style="width:32px;height:32px;background:#fff7ed;border-radius:8px;text-align:center;line-height:32px;font-size:16px">${icon}</div>
      </td>
      <td style="vertical-align:top">
        <p style="margin:0 0 2px;font-size:13px;font-weight:700;color:#09090b">${title}</p>
        <p style="margin:0;font-size:13px;color:#71717a;line-height:1.5">${desc}</p>
      </td>
    </tr>
  </table>`
}

/* ─── Templates ─────────────────────────────────────────── */

export async function sendWaitlistConfirmationEmail(to: string): Promise<void> {
  const html = emailShell(`
    ${badge("Early Access")}
    ${heading("You're on the list.")}
    ${body("Thanks for signing up — you're in. We're building Astra in the open and rolling out early access to the waitlist first. You'll get an email the moment a spot opens up.")}

    ${divider()}

    <p style="margin:0 0 16px;font-size:13px;font-weight:700;color:#09090b;text-transform:uppercase;letter-spacing:0.06em">What to expect</p>

    ${featureRow("⚡", "First access", "Waitlist members get early access before any public launch.")}
    ${featureRow("🔒", "Locked-in pricing", "Your rate is set at signup — price increases won't affect you.")}
    ${featureRow("🔭", "Direct influence", "Shape the roadmap. We listen to early users first.")}

    ${divider()}

    ${body("In the meantime, keep shipping. Your next commit might be the one that makes the portfolio.")}
  `)

  await resend.emails.send({
    from: FROM,
    to,
    subject: "You're on the Astra waitlist",
    html,
  })
}

export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  const firstName = name.split(" ")[0]

  const html = emailShell(`
    ${badge("Welcome")}
    ${heading(`Welcome, ${firstName}.`)}
    ${body("Your Astra account is ready. Connect your GitHub repositories and we'll do the rest — AST analysis, technical narrative generation, and a live portfolio in under 60 seconds.")}

    ${ctaButton(`${APP_URL}/dashboard`, "Open Dashboard")}

    ${divider()}

    <p style="margin:0 0 16px;font-size:13px;font-weight:700;color:#09090b;text-transform:uppercase;letter-spacing:0.06em">Get started in 3 steps</p>

    ${featureRow("01", "Select up to 5 repositories", "Choose the projects that best represent your engineering depth.")}
    ${featureRow("02", "Hit Generate", "Astra runs parallel AST analysis and produces technical narratives in under 60 seconds.")}
    ${featureRow("03", "Share your link", `Your portfolio is live at <strong style="color:#09090b">useastra.tech/u/${name.toLowerCase().replace(/\s+/g, "")}</strong> — share it anywhere.`)}

    ${divider()}

    ${body(`Auto-sync is on by default. Every push to a connected repo updates your portfolio automatically within ~2 minutes.`)}
  `)

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Welcome to Astra, ${firstName}`,
    html,
  })
}

export async function sendPortfolioPublishedEmail(
  to: string,
  name: string,
  username: string
): Promise<void> {
  const firstName = name.split(" ")[0]
  const portfolioUrl = `${APP_URL}/u/${username}`

  const html = emailShell(`
    ${badge("Portfolio Live")}
    ${heading(`You're live, ${firstName}.`)}
    ${body("Your Astra portfolio is now publicly accessible. Share it in job applications, your GitHub bio, or anywhere you want your engineering work to speak for itself.")}

    <!-- URL pill -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin:24px 0">
      <tr>
        <td style="background:#fafafa;border:1px solid #e4e4e7;border-radius:10px;padding:14px 20px">
          <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#a1a1aa;letter-spacing:0.08em;text-transform:uppercase">Your portfolio URL</p>
          <a href="${portfolioUrl}" style="font-size:14px;color:#f97316;font-weight:600;text-decoration:none;word-break:break-all">${portfolioUrl}</a>
        </td>
      </tr>
    </table>

    ${ctaButton(portfolioUrl, "View your portfolio")}

    ${divider()}

    <p style="margin:0 0 16px;font-size:13px;font-weight:700;color:#09090b;text-transform:uppercase;letter-spacing:0.06em">What happens next</p>

    ${featureRow("🔄", "Auto-sync is active", "Push new code and your portfolio updates automatically within ~2 minutes.")}
    ${featureRow("✏️", "Edit anytime", "Every generated section is editable from your dashboard.")}
    ${featureRow("🎨", "Switch templates", "Try Minimal, Terminal, or Void from your dashboard settings.")}
  `)

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Your Astra portfolio is live`,
    html,
  })
}

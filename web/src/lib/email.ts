import "server-only"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = "Astra <noreply@useastra.tech>"
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://useastra.tech"

const FONT = `"SF Pro Display","Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif`
const MONO = `"SF Mono","Fira Code","Fira Mono","Roboto Mono",monospace`

/* ─── Components ─────────────────────────────────────────── */

function logoRow(): string {
  return `
  <tr>
    <td style="padding:40px 0 28px">
      <table cellpadding="0" cellspacing="0" border="0" role="presentation">
        <tr>
          <td style="vertical-align:middle;padding-right:10px">
            <img src="https://useastra.tech/favicon.svg" alt="" height="40"
                 style="display:block;border:0;height:40px;width:auto" />
          </td>
          <td style="vertical-align:middle">
            <img src="https://useastra.tech/name.svg" alt="Astra" height="20"
                 style="display:block;border:0;height:20px;width:auto" />
          </td>
        </tr>
      </table>
    </td>
  </tr>`
}

function statusPill(text: string): string {
  return `<span style="display:inline-block;background:rgba(255,255,255,0.22);color:#ffffff;font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;padding:5px 14px;border-radius:100px;border:1px solid rgba(255,255,255,0.35)">${text}</span>`
}

function heroRow(pill: string, headline: string, description: string): string {
  return `
  <tr>
    <td style="background:linear-gradient(135deg,#f97316 0%,#fb923c 100%);border-radius:24px;padding:40px">
      <p style="margin:0 0 18px">${statusPill(pill)}</p>
      <h1 style="margin:0 0 14px;font-family:${FONT};font-size:34px;font-weight:800;color:#ffffff;letter-spacing:-0.8px;line-height:1.1">${headline}</h1>
      <p style="margin:0;font-family:${FONT};font-size:16px;line-height:1.75;color:rgba(255,255,255,0.88)">${description}</p>
    </td>
  </tr>
  <tr><td style="height:32px;font-size:0;line-height:0">&zwnj;</td></tr>`
}

function contentCard(inner: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
    <tr>
      <td style="background:#fafafa;border:1px solid #ececec;border-radius:16px;padding:24px">
        ${inner}
      </td>
    </tr>
  </table>`
}

function sectionTitle(text: string): string {
  return `<p style="margin:0 0 20px;font-family:${FONT};font-size:11px;font-weight:700;color:#a1a1aa;letter-spacing:0.1em;text-transform:uppercase">${text}</p>`
}

function bodyText(text: string): string {
  return `<p style="margin:0;font-family:${FONT};font-size:15px;line-height:1.75;color:#52525b">${text}</p>`
}

function ctaButton(href: string, label: string): string {
  return `<table cellpadding="0" cellspacing="0" border="0" role="presentation">
    <tr>
      <td style="border-radius:12px;background:#111111">
        <a href="${href}"
           style="display:inline-block;padding:14px 28px;background:#111111;color:#ffffff;font-family:${FONT};font-size:15px;font-weight:600;text-decoration:none;border-radius:12px;letter-spacing:-0.1px">
          ${label} →
        </a>
      </td>
    </tr>
  </table>`
}

function divider(): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
    <tr><td style="border-top:1px solid #ececec;height:0;font-size:0;line-height:0">&zwnj;</td></tr>
  </table>`
}

function urlShowcaseCard(url: string, href: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
    <tr>
      <td style="background:#111111;border-radius:16px;padding:28px 32px">
        <p style="margin:0 0 10px;font-family:${FONT};font-size:11px;font-weight:700;color:rgba(255,255,255,0.38);letter-spacing:0.1em;text-transform:uppercase">Your Portfolio URL</p>
        <a href="${href}" style="font-family:${MONO};font-size:15px;color:#f97316;font-weight:600;text-decoration:none;word-break:break-all;letter-spacing:-0.2px">${url}</a>
      </td>
    </tr>
  </table>`
}

function bulletItem(text: string, last = false): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"${last ? "" : ` style="margin-bottom:12px"`}>
    <tr>
      <td style="vertical-align:top;width:18px;font-family:${FONT};font-size:14px;font-weight:700;color:#f97316;padding-top:2px">—</td>
      <td style="vertical-align:top;font-family:${FONT};font-size:14px;line-height:1.65;color:#3f3f46">${text}</td>
    </tr>
  </table>`
}

function timelineStep(num: string, title: string, desc: string, last = false): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"${last ? "" : ` style="margin-bottom:24px"`}>
    <tr>
      <td style="vertical-align:top;width:36px;padding-right:16px;padding-top:2px">
        <div style="width:28px;height:28px;background:#fff7ed;border-radius:8px;text-align:center;line-height:28px;font-family:${FONT};font-size:11px;font-weight:800;color:#f97316">${num}</div>
      </td>
      <td style="vertical-align:top">
        <p style="margin:0 0 4px;font-family:${FONT};font-size:15px;font-weight:700;color:#09090b">${title}</p>
        <p style="margin:0;font-family:${FONT};font-size:14px;line-height:1.65;color:#71717a">${desc}</p>
      </td>
    </tr>
  </table>`
}

function spacerRow(height = 28): string {
  return `<tr><td style="height:${height}px;font-size:0;line-height:0">&zwnj;</td></tr>`
}

function footerRow(): string {
  return `
  <tr>
    <td style="padding:36px 0 48px;text-align:center">
      <p style="margin:0 0 8px;font-family:${FONT};font-size:12px;color:#a1a1aa;line-height:1.6">
        Questions? <a href="mailto:support@useastra.tech" style="color:#a1a1aa;text-decoration:underline">support@useastra.tech</a>
      </p>
      <p style="margin:0;font-family:${FONT};font-size:12px;color:#d4d4d8;line-height:1.6">
        © ${new Date().getFullYear()} Astra &nbsp;·&nbsp;
        <a href="${APP_URL}/privacy" style="color:#d4d4d8;text-decoration:underline">Privacy</a>
        &nbsp;·&nbsp;
        <a href="${APP_URL}/terms" style="color:#d4d4d8;text-decoration:underline">Terms</a>
      </p>
    </td>
  </tr>`
}

/* ─── Shell ─────────────────────────────────────────────── */

function emailShell(rows: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>Astra</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:${FONT}">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"
         style="background:#f4f4f5;padding:0 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"
             style="max-width:560px;width:100%">
        ${logoRow()}
        ${rows}
        ${footerRow()}
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

/* ─── Templates ─────────────────────────────────────────── */

export async function sendWaitlistConfirmationEmail(to: string): Promise<void> {
  const html = emailShell(`
    ${heroRow(
      "Early Access",
      "You're in.",
      "Astra is currently opening access in waves. You're now on the list — we'll reach out the moment your spot is ready."
    )}

    <tr>
      <td>
        ${contentCard(`
          ${sectionTitle("What Happens Next")}
          ${bulletItem("Early access invitations sent in waves")}
          ${bulletItem("Founder updates on build progress")}
          ${bulletItem("Priority onboarding support from day one")}
        `)}
      </td>
    </tr>

    ${spacerRow(28)}

    <tr>
      <td>${bodyText("In the meantime, keep shipping. Your next commit might be the one that makes the portfolio.")}</td>
    </tr>
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
  const slug = name.toLowerCase().replace(/\s+/g, "")

  const html = emailShell(`
    ${heroRow(
      "Account Ready",
      "Welcome to Astra.",
      "Turn your repositories into a portfolio that updates itself. You're ready to go."
    )}

    <tr>
      <td>
        ${sectionTitle("Get started in 3 steps")}
        ${timelineStep("01", "Connect repositories", "Choose the projects that best represent your engineering depth.")}
        ${timelineStep("02", "Hit Generate", "Astra runs parallel AST analysis and produces technical narratives in under 60 seconds.")}
        ${timelineStep("03", "Share your link", `Your portfolio is live at useastra.tech/u/${slug} — share it anywhere.`, true)}
      </td>
    </tr>

    ${spacerRow(28)}

    <tr>
      <td>${contentCard(bodyText("Most developers publish their portfolio in under 2 minutes."))}</td>
    </tr>

    <tr>
      <td style="padding-top:32px">${ctaButton(`${APP_URL}/dashboard`, "Open Dashboard")}</td>
    </tr>
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
    ${heroRow(
      "Portfolio Published",
      "Your work now has a home.",
      "Your portfolio is live and ready to share. Put it everywhere your engineering should speak for itself."
    )}

    <tr>
      <td>${urlShowcaseCard(portfolioUrl, portfolioUrl)}</td>
    </tr>

    <tr>
      <td style="padding-top:24px">${ctaButton(portfolioUrl, "View your portfolio")}</td>
    </tr>

    ${spacerRow(36)}

    <tr>
      <td>${divider()}</td>
    </tr>

    ${spacerRow(4)}

    <tr>
      <td>
        ${contentCard(`
          ${sectionTitle("Share it here")}
          ${bulletItem("GitHub profile — pin it as a featured repository")}
          ${bulletItem("LinkedIn — add it to your featured section")}
          ${bulletItem("Resume — replace generic project descriptions with your live URL")}
          ${bulletItem("Job applications — let your code speak before the interview", true)}
        `)}
      </td>
    </tr>
  `)

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Your Astra portfolio is live, ${firstName}`,
    html,
  })
}

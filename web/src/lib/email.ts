import "server-only"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = "Astra <noreply@useastra.qzz.io>"
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://useastra.qzz.io"

export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Welcome to Astra — your GitHub story starts here",
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#18181b">
        <h1 style="font-size:24px;font-weight:700;margin-bottom:8px">Welcome, ${name} 👋</h1>
        <p style="color:#52525b;line-height:1.6">
          You've just joined Astra — the tool that reads your GitHub repos and ships a portfolio
          that tells the story your work deserves.
        </p>
        <p style="color:#52525b;line-height:1.6">
          Connect your repos, pick a template, and your portfolio is live in minutes.
        </p>
        <a href="${APP_URL}/dashboard"
           style="display:inline-block;margin-top:16px;padding:12px 24px;background:#7c3aed;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Go to Dashboard →
        </a>
        <p style="margin-top:32px;font-size:13px;color:#a1a1aa">
          Questions? Reply to this email or reach us at
          <a href="mailto:support@useastra.qzz.io" style="color:#7c3aed">support@useastra.qzz.io</a>
        </p>
      </div>
    `,
  })
}

export async function sendWaitlistConfirmationEmail(to: string): Promise<void> {
  await resend.emails.send({
    from: FROM,
    to,
    subject: "You're on the Astra waitlist 🎉",
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#18181b">
        <h1 style="font-size:24px;font-weight:700;margin-bottom:8px">You're on the list!</h1>
        <p style="color:#52525b;line-height:1.6">
          Thanks for joining the Astra waitlist. We're building a portfolio tool that reads your
          GitHub repos and tells the story your work deserves — no templates to fight, no markdown
          to write.
        </p>
        <p style="color:#52525b;line-height:1.6">
          We'll email you as soon as early access opens. In the meantime, keep shipping.
        </p>
        <p style="margin-top:32px;font-size:13px;color:#a1a1aa">
          Questions? Reach us at
          <a href="mailto:support@useastra.qzz.io" style="color:#7c3aed">support@useastra.qzz.io</a>
        </p>
      </div>
    `,
  })
}

export async function sendPortfolioPublishedEmail(
  to: string,
  name: string,
  username: string
): Promise<void> {
  const portfolioUrl = `${APP_URL}/${username}`

  await resend.emails.send({
    from: FROM,
    to,
    subject: "Your Astra portfolio is live 🚀",
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#18181b">
        <h1 style="font-size:24px;font-weight:700;margin-bottom:8px">You're live, ${name}!</h1>
        <p style="color:#52525b;line-height:1.6">
          Your Astra portfolio is now publicly accessible. Share it with the world.
        </p>
        <a href="${portfolioUrl}"
           style="display:inline-block;margin-top:16px;padding:12px 24px;background:#7c3aed;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          View your portfolio →
        </a>
        <p style="margin-top:16px;color:#71717a;font-size:14px;word-break:break-all">${portfolioUrl}</p>
        <p style="margin-top:32px;font-size:13px;color:#a1a1aa">
          Questions? Reach us at
          <a href="mailto:support@useastra.qzz.io" style="color:#7c3aed">support@useastra.qzz.io</a>
        </p>
      </div>
    `,
  })
}

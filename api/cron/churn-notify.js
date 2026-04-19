// /api/cron/churn-notify.js — Vercel Cron Job
// Runs daily, checks for newly expired subscribers, emails Hernán
// Triggered by vercel.json cron config

const STRIPE_VERSION = "2023-10-16";

export default async function handler(req, res) {
  // Verify this is a cron request (Vercel sets this header)
  const authHeader = req.headers["authorization"];
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Also allow manual trigger with admin pass
    const pass = req.query.pass;
    if (pass !== (process.env.ADMIN_PASS || "elgordo")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
  const RESEND_KEY = process.env.RESEND_API_KEY;

  if (!STRIPE_KEY) {
    return res.status(500).json({ error: "STRIPE_SECRET_KEY not configured" });
  }

  try {
    const now = Date.now();

    // Fetch canceled subscriptions
    let allCanceled = [];
    let hasMore = true;
    let startingAfter = null;

    while (hasMore) {
      const params = new URLSearchParams({
        status: "canceled",
        limit: "100",
        "expand[]": "data.customer",
      });
      if (startingAfter) params.append("starting_after", startingAfter);

      const resp = await fetch(
        `https://api.stripe.com/v1/subscriptions?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${STRIPE_KEY}`,
            "Stripe-Version": STRIPE_VERSION,
          },
        }
      );
      if (!resp.ok) break;
      const data = await resp.json();
      allCanceled = allCanceled.concat(data.data);
      hasMore = data.has_more;
      if (hasMore && data.data.length > 0) {
        startingAfter = data.data[data.data.length - 1].id;
      } else {
        hasMore = false;
      }
    }

    // Fetch active emails for re-sub detection
    let activeEmails = new Set();
    hasMore = true;
    startingAfter = null;

    while (hasMore) {
      const params = new URLSearchParams({
        status: "active",
        limit: "100",
        "expand[]": "data.customer",
      });
      if (startingAfter) params.append("starting_after", startingAfter);

      const resp = await fetch(
        `https://api.stripe.com/v1/subscriptions?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${STRIPE_KEY}`,
            "Stripe-Version": STRIPE_VERSION,
          },
        }
      );
      if (!resp.ok) break;
      const data = await resp.json();
      data.data.forEach((sub) => {
        const email =
          typeof sub.customer === "object" ? sub.customer.email : null;
        if (email) activeEmails.add(email.toLowerCase());
      });
      hasMore = data.has_more;
      if (hasMore && data.data.length > 0) {
        startingAfter = data.data[data.data.length - 1].id;
      } else {
        hasMore = false;
      }
    }

    // Process: find newly actionable subs
    // "Newly expired" = access expired within the last 48 hours (to catch daily cron window)
    const twoDaysMs = 2 * 24 * 60 * 60 * 1000;
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    const newlyExpired = [];
    const upcomingExpiry = []; // Annual subs expiring within 7 days
    const pendingRemoval = []; // All monthly subs past 30 days

    for (const sub of allCanceled) {
      const customer =
        typeof sub.customer === "object" ? sub.customer : null;
      const email = customer?.email || "unknown";
      if (email === "unknown") continue;
      if (activeEmails.has(email.toLowerCase())) continue; // Re-subbed

      const amount = sub.items?.data?.[0]?.price?.unit_amount
        ? sub.items.data[0].price.unit_amount / 100
        : sub.plan?.amount
        ? sub.plan.amount / 100
        : 0;
      const isAnnual = amount >= 300;

      const canceledAt = sub.canceled_at
        ? new Date(sub.canceled_at * 1000)
        : sub.ended_at
        ? new Date(sub.ended_at * 1000)
        : null;
      if (!canceledAt) continue;

      const daysSinceCancel = Math.floor(
        (now - canceledAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (isAnnual) {
        const periodEnd = sub.current_period_end
          ? new Date(sub.current_period_end * 1000)
          : null;
        if (!periodEnd) continue;

        const daysUntilExpiry = Math.ceil(
          (periodEnd.getTime() - now) / (1000 * 60 * 60 * 24)
        );

        // Expired within last 48h
        if (
          periodEnd.getTime() < now &&
          now - periodEnd.getTime() < twoDaysMs
        ) {
          newlyExpired.push({
            email,
            plan: "Annual ($" + amount + ")",
            canceledAt: canceledAt.toISOString().split("T")[0],
            expiredAt: periodEnd.toISOString().split("T")[0],
          });
        }

        // Expiring within 7 days (heads up)
        if (daysUntilExpiry > 0 && daysUntilExpiry <= 7) {
          upcomingExpiry.push({
            email,
            plan: "Annual ($" + amount + ")",
            daysLeft: daysUntilExpiry,
            expiresAt: periodEnd.toISOString().split("T")[0],
          });
        }
      } else {
        // Monthly: use periodEnd (when their paid access actually expires)
        const periodEnd = sub.current_period_end
          ? new Date(sub.current_period_end * 1000)
          : null;

        if (periodEnd) {
          const periodExpiredMs = now - periodEnd.getTime();
          // Expired within last 48h
          if (periodEnd.getTime() < now && periodExpiredMs < twoDaysMs) {
            newlyExpired.push({
              email,
              plan: "Monthly ($" + amount + ")",
              canceledAt: canceledAt.toISOString().split("T")[0],
              expiredAt: periodEnd.toISOString().split("T")[0],
            });
          }
          // Expiring within 3 days (heads up for monthly)
          const daysUntilExpiry = Math.ceil(
            (periodEnd.getTime() - now) / (1000 * 60 * 60 * 24)
          );
          if (daysUntilExpiry > 0 && daysUntilExpiry <= 3) {
            upcomingExpiry.push({
              email,
              plan: "Monthly ($" + amount + ")",
              daysLeft: daysUntilExpiry,
              expiresAt: periodEnd.toISOString().split("T")[0],
            });
          }
        } else {
          // Fallback: no periodEnd, use 30-day rule
          if (daysSinceCancel >= 30 && daysSinceCancel <= 32) {
            newlyExpired.push({
              email,
              plan: "Monthly ($" + amount + ")",
              canceledAt: canceledAt.toISOString().split("T")[0],
              expiredAt: canceledAt.toISOString().split("T")[0],
            });
          }
        }
      }
    }

    // Only send email if there's something to report
    const hasNews =
      newlyExpired.length > 0 || upcomingExpiry.length > 0;

    if (!hasNews) {
      return res.status(200).json({
        message: "No new expirations or upcoming expiries. No email sent.",
        newlyExpired: 0,
        upcomingExpiry: 0,
      });
    }

    // Build email body
    let emailHtml = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0F; color: #E4E4E7; padding: 32px; border-radius: 12px;">
        <h1 style="font-size: 24px; margin-bottom: 4px;">
          <span style="color: #D4A843;">CHURN</span>
          <span style="color: #22C55E;"> CONTROL</span>
        </h1>
        <p style="color: #71717A; font-size: 12px; margin-bottom: 24px;">Daily subscriber access report</p>
    `;

    if (newlyExpired.length > 0) {
      emailHtml += `
        <div style="background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <h2 style="color: #EF4444; font-size: 14px; margin: 0 0 12px 0;">🚨 REMOVE FROM ALPHA CHAT (${newlyExpired.length})</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr style="color: #71717A; font-size: 11px; text-transform: uppercase;">
              <td style="padding: 4px 8px;">Email</td>
              <td style="padding: 4px 8px;">Plan</td>
              <td style="padding: 4px 8px;">Canceled</td>
            </tr>
      `;
      for (const s of newlyExpired) {
        emailHtml += `
            <tr style="border-top: 1px solid rgba(255,255,255,0.05);">
              <td style="padding: 8px; font-weight: 600;">${s.email}</td>
              <td style="padding: 8px; color: #71717A;">${s.plan}</td>
              <td style="padding: 8px; color: #71717A;">${s.canceledAt}</td>
            </tr>
        `;
      }
      emailHtml += `</table></div>`;
    }

    if (upcomingExpiry.length > 0) {
      emailHtml += `
        <div style="background: rgba(212,168,67,0.08); border: 1px solid rgba(212,168,67,0.2); border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <h2 style="color: #D4A843; font-size: 14px; margin: 0 0 12px 0;">⏳ ANNUAL SUBS EXPIRING SOON (${upcomingExpiry.length})</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr style="color: #71717A; font-size: 11px; text-transform: uppercase;">
              <td style="padding: 4px 8px;">Email</td>
              <td style="padding: 4px 8px;">Expires</td>
              <td style="padding: 4px 8px;">Days Left</td>
            </tr>
      `;
      for (const s of upcomingExpiry) {
        emailHtml += `
            <tr style="border-top: 1px solid rgba(255,255,255,0.05);">
              <td style="padding: 8px; font-weight: 600;">${s.email}</td>
              <td style="padding: 8px; color: #71717A;">${s.expiresAt}</td>
              <td style="padding: 8px; color: #D4A843; font-weight: 700;">${s.daysLeft}d</td>
            </tr>
        `;
      }
      emailHtml += `</table></div>`;
    }

    emailHtml += `
        <p style="color: #52525B; font-size: 11px; margin-top: 24px;">
          <a href="https://growth.10am.pro/admin/churn" style="color: #22C55E;">Open Churn Control →</a>
        </p>
      </div>
    `;

    // Send email via Resend
    if (RESEND_KEY) {
      const emailResp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "10AMPRO Churn Control <onboarding@resend.dev>",
          to: ["hernanjaramillo@gmail.com", "info@10am.pro"],
          subject: `🚨 Churn Alert: ${newlyExpired.length} to remove${upcomingExpiry.length > 0 ? `, ${upcomingExpiry.length} expiring soon` : ""}`,
          html: emailHtml,
        }),
      });

      const emailResult = await emailResp.json();

      return res.status(200).json({
        message: "Email sent",
        newlyExpired: newlyExpired.length,
        upcomingExpiry: upcomingExpiry.length,
        emailResult,
      });
    } else {
      // No Resend key — just return the data
      return res.status(200).json({
        message: "RESEND_API_KEY not configured — data returned but no email sent",
        newlyExpired,
        upcomingExpiry,
      });
    }
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Cron job failed", detail: err.message });
  }
}

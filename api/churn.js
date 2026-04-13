// /api/churn.js — Vercel Serverless Function
// Fetches canceled/past_due Stripe subscriptions for churn management
// Password-gated: requires ?pass=ADMIN_PASS query param

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") return res.status(200).end();

  // Gate: require password
  const pass = req.query.pass;
  if (pass !== (process.env.ADMIN_PASS || "elgordo")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
  if (!STRIPE_KEY) {
    return res.status(500).json({ error: "STRIPE_SECRET_KEY not configured" });
  }

  try {
    // Fetch all canceled subscriptions (paginated)
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
            "Stripe-Version": "2023-10-16",
          },
        }
      );
      if (!resp.ok) {
        const err = await resp.text();
        return res.status(resp.status).json({ error: err });
      }
      const data = await resp.json();
      allCanceled = allCanceled.concat(data.data);
      hasMore = data.has_more;
      if (hasMore && data.data.length > 0) {
        startingAfter = data.data[data.data.length - 1].id;
      } else {
        hasMore = false;
      }
    }

    // Also fetch past_due subscriptions
    let allPastDue = [];
    hasMore = true;
    startingAfter = null;

    while (hasMore) {
      const params = new URLSearchParams({
        status: "past_due",
        limit: "100",
        "expand[]": "data.customer",
      });
      if (startingAfter) params.append("starting_after", startingAfter);

      const resp = await fetch(
        `https://api.stripe.com/v1/subscriptions?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${STRIPE_KEY}`,
            "Stripe-Version": "2023-10-16",
          },
        }
      );
      if (!resp.ok) {
        const err = await resp.text();
        return res.status(resp.status).json({ error: err });
      }
      const data = await resp.json();
      allPastDue = allPastDue.concat(data.data);
      hasMore = data.has_more;
      if (hasMore && data.data.length > 0) {
        startingAfter = data.data[data.data.length - 1].id;
      } else {
        hasMore = false;
      }
    }

    // Also fetch active for cross-reference (someone canceled then re-subbed)
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
            "Stripe-Version": "2023-10-16",
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

    // Process canceled subs
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    const formatSub = (sub, status) => {
      const customer =
        typeof sub.customer === "object" ? sub.customer : null;
      const email = customer?.email || "unknown";
      const name = customer?.name || "";
      const canceledAt = sub.canceled_at
        ? new Date(sub.canceled_at * 1000)
        : sub.ended_at
        ? new Date(sub.ended_at * 1000)
        : null;
      const daysSinceCancel = canceledAt
        ? Math.floor((now - canceledAt.getTime()) / (1000 * 60 * 60 * 24))
        : null;
      const product =
        sub.items?.data?.[0]?.price?.product || sub.plan?.product || "";
      const productName =
        sub.items?.data?.[0]?.price?.nickname ||
        sub.plan?.nickname ||
        "";
      const amount = sub.items?.data?.[0]?.price?.unit_amount
        ? (sub.items.data[0].price.unit_amount / 100).toFixed(2)
        : sub.plan?.amount
        ? (sub.plan.amount / 100).toFixed(2)
        : "0";
      const currency = sub.currency || "usd";
      const resubbed = activeEmails.has(email.toLowerCase());

      return {
        email,
        name,
        status,
        canceledAt: canceledAt ? canceledAt.toISOString() : null,
        daysSinceCancel,
        over30Days: daysSinceCancel !== null && daysSinceCancel >= 30,
        amount: parseFloat(amount),
        currency,
        productName,
        resubbed,
        subscriptionId: sub.id,
      };
    };

    const canceled = allCanceled.map((s) => formatSub(s, "canceled"));
    const pastDue = allPastDue.map((s) => formatSub(s, "past_due"));
    const all = [...canceled, ...pastDue].sort(
      (a, b) => (b.daysSinceCancel || 0) - (a.daysSinceCancel || 0)
    );

    // Summary
    const toRemove = all.filter((s) => s.over30Days && !s.resubbed);
    const resubbed = all.filter((s) => s.resubbed);
    const recentCancels = all.filter(
      (s) => !s.over30Days && !s.resubbed && s.status === "canceled"
    );

    return res.status(200).json({
      fetchedAt: new Date().toISOString(),
      summary: {
        totalCanceled: canceled.length,
        totalPastDue: pastDue.length,
        toRemove: toRemove.length,
        resubbed: resubbed.length,
        recentCancels: recentCancels.length,
      },
      toRemove,
      recentCancels,
      pastDue: pastDue.filter((s) => !s.resubbed),
      resubbed,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Failed to fetch from Stripe", detail: err.message });
  }
}

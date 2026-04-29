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
      const amountNum = parseFloat(amount);

      // Annual plan ($400/yr): access lasts until current_period_end
      // Monthly plan ($40/mo): access also lasts until current_period_end
      // Stripe sets current_period_end to when the prepaid period expires
      const isAnnual = amountNum >= 300; // $400/yr or similar annual plans
      const periodEnd = sub.current_period_end
        ? new Date(sub.current_period_end * 1000)
        : null;
      const accessExpired = periodEnd
        ? periodEnd.getTime() < now
        : daysSinceCancel !== null && daysSinceCancel >= (isAnnual ? 365 : 30);
      const daysUntilExpiry = periodEnd
        ? Math.ceil((periodEnd.getTime() - now) / (1000 * 60 * 60 * 24))
        : null;

      return {
        email,
        name,
        status,
        canceledAt: canceledAt ? canceledAt.toISOString() : null,
        daysSinceCancel,
        accessExpired,
        isAnnual,
        periodEnd: periodEnd ? periodEnd.toISOString() : null,
        daysUntilExpiry,
        amount: amountNum,
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

    // Debug mode: dump raw signals to identify Gumroad vs Substack subs
    if (req.query.debug === "1") {
      const sample = [...allCanceled, ...allPastDue].slice(0, 30).map((s) => {
        const cust = typeof s.customer === "object" ? s.customer : null;
        const item = s.items?.data?.[0];
        return {
          email: cust?.email,
          subId: s.id,
          subMetadata: s.metadata || {},
          custMetadata: cust?.metadata || {},
          custDescription: cust?.description || null,
          priceNickname: item?.price?.nickname || null,
          priceProduct: item?.price?.product || null,
          priceMetadata: item?.price?.metadata || {},
          unitAmount: item?.price?.unit_amount,
          interval: item?.price?.recurring?.interval,
          collectionMethod: s.collection_method,
          appFeesAccount: s.application || null,
          source: s.source || null,
        };
      });
      return res.status(200).json({ debug: true, count: sample.length, sample });
    }

    // Summary
    const toRemove = all.filter((s) => s.accessExpired && !s.resubbed);
    const stillActive = all.filter((s) => !s.accessExpired && !s.resubbed && s.isAnnual);
    const resubbed = all.filter((s) => s.resubbed);
    const recentCancels = all.filter(
      (s) => !s.accessExpired && !s.resubbed && !s.isAnnual && s.status === "canceled"
    );

    return res.status(200).json({
      fetchedAt: new Date().toISOString(),
      summary: {
        totalCanceled: canceled.length,
        totalPastDue: pastDue.length,
        toRemove: toRemove.length,
        stillActive: stillActive.length,
        resubbed: resubbed.length,
        recentCancels: recentCancels.length,
      },
      toRemove,
      stillActive,
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

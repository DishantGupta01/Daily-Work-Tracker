const express = require("express");

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL;
const APP_API_KEY = process.env.APP_API_KEY;

// Lightweight starter protection. Set APP_API_KEY in Render and send it in
// the x-api-key header from your trusted frontend/backend integration.
function requireApiKey(req, res, next) {
  if (!APP_API_KEY) {
    return res.status(503).json({
      error: "Backend is not configured yet. Set APP_API_KEY in environment variables."
    });
  }
  if (req.get("x-api-key") !== APP_API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "StarkFlow task notifications" });
});

app.post("/api/task-assigned", requireApiKey, async (req, res) => {
  const {
    taskName, client, assignDate, dueDate, assigneeName, assigneeEmail,
    owner, description, priority
  } = req.body || {};

  const required = { taskName, assigneeEmail };
  const missing = Object.entries(required)
    .filter(([, value]) => !String(value || "").trim())
    .map(([key]) => key);

  if (missing.length) {
    return res.status(400).json({
      error: "Missing required fields",
      fields: missing
    });
  }

  if (!RESEND_API_KEY || !FROM_EMAIL) {
    return res.status(503).json({
      error: "Email is not configured. Set RESEND_API_KEY and FROM_EMAIL in Render."
    });
  }

  const safe = (value) => String(value || "Not provided")
    .replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;",
      '"': "&quot;", "'": "&#39;"
    }[ch]));

  const rows = [
    ["Task", taskName],
    ["Client", client],
    ["Assign date", assignDate],
    ["Due date", dueDate],
    ["Assignee", assigneeName],
    ["Task owner", owner],
    ["Priority", priority],
    ["Description", description]
  ];

  const htmlRows = rows.map(([label, value]) =>
    `<tr><th style="text-align:left;padding:8px;border-bottom:1px solid #ddd">${safe(label)}</th>` +
    `<td style="padding:8px;border-bottom:1px solid #ddd">${safe(value)}</td></tr>`
  ).join("");

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [String(assigneeEmail).trim()],
        subject: `New task assigned: ${String(taskName).slice(0, 120)}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:720px;margin:auto">
          <h2>New task assigned to you</h2>
          <p>A task has been assigned to you in StarkFlow.</p>
          <table style="border-collapse:collapse;width:100%">${htmlRows}</table>
          <p style="color:#666;font-size:12px">Automated notification from StarkFlow.</p>
        </div>`
      })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("Email provider error:", response.status, payload);
      return res.status(502).json({
        error: "Email provider rejected the request.",
        providerStatus: response.status,
        details: payload.message || payload.error || "See Render logs."
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Email provider accepted the notification.",
      emailId: payload.id || null
    });
  } catch (error) {
    console.error("Email request failed:", error);
    return res.status(502).json({ error: "Could not reach email provider." });
  }
});

app.listen(PORT, () => {
  console.log(`StarkFlow notification backend listening on port ${PORT}`);
});

# StarkFlow — Render notification starter

This starter provides a small Node.js backend that sends a task-assignment email through the Resend HTTPS API. It is not the full StarkFlow task tracker and does not yet include a database or connect to an existing local HTML app.

## Deploy on Render

1. Create a GitHub repository (for example `starkflow-notifications`) and upload all files in this folder.
2. In Render, choose **New + → Web Service** and connect that GitHub repository.
3. Set:
   - **Runtime:** Node
   - **Build command:** `npm install`
   - **Start command:** `npm start`
   - **Instance type:** Free (if offered for your account/region)
4. In Render → Environment, add:
   - `RESEND_API_KEY`: your Resend API key
   - `FROM_EMAIL`: a sender identity/domain verified in Resend
   - `APP_API_KEY`: a long random secret used to protect the endpoint
5. Deploy. Open `https://YOUR-SERVICE.onrender.com/health`; it should return JSON with `"ok": true`.
6. Open the service root URL to use the basic test form. Submit a test task to an email address you control.

## Email setup

Create an account at https://resend.com/ and follow its current domain/sender verification requirements. Do not put the Resend API key or `APP_API_KEY` into a public GitHub repository or client-side production HTML. The included form is only for a controlled test; its API key field is sent to the backend in a header, but any key entered into a browser can be exposed to that browser's user.

## Connect to the real StarkFlow UI

When a task is assigned, the trusted app/backend should POST JSON to `/api/task-assigned` with header `x-api-key: YOUR_APP_API_KEY` and a JSON body like:

```json
{
  "taskName": "Optimize product titles",
  "client": "Woodland Direct",
  "assignDate": "2026-10-14",
  "dueDate": "2026-10-16",
  "assigneeName": "Example User",
  "assigneeEmail": "person@example.com",
  "owner": "Task Owner",
  "description": "Review extracted attributes",
  "priority": "High"
}
```

Do not hardcode the API key into public frontend JavaScript for a production deployment. The correct long-term design is to have task assignment go through a protected backend.

## Important limitations

- This is a notification starter, not a full task manager.
- It does not persist tasks or provide shared task history. Add a database (for example Supabase/Postgres) before relying on it for real team workflows.
- Render free services may sleep when inactive; the first request after sleep can take longer.
- Email delivery depends on provider setup, sender verification, quotas, and spam filtering. A successful API response means the provider accepted the email, not that the recipient has read it.
- Never commit `.env` or secrets to GitHub.

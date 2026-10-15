# ChatSpace deployment preparation

This project is a React/Vite single-page frontend and an Express/Socket.IO backend. It also needs MongoDB, Firebase Authentication/Admin, Gemini API access for summarization, and persistent storage for uploaded media.

## Recommended layout

- **Frontend:** Render Static Site, repository root directory `client`, build command `npm install && npm run build`, publish directory `dist`. Add a rewrite from `/*` to `/index.html` so React Router routes work after refresh.
- **Backend:** Render Web Service, repository root directory `.`, build command `npm ci`, start command `npm start`, health check path `/healthz`. The service must accept WebSocket upgrades for Socket.IO.
- **Database:** MongoDB Atlas or another managed MongoDB service. Restrict database network access to the backend where the provider supports it, use TLS, and maintain backups.
- **Uploads:** Mount a persistent disk at `/var/data` and set `UPLOAD_DIR=/var/data/uploads`. The backend still defaults to `server/uploads` for local development. A local disk is tied to one service instance; do not horizontally scale this configuration. For multiple backend instances, migrate media to shared object storage first.

Render documents [static sites](https://render.com/docs/static-sites), [SPA rewrites](https://render.com/docs/redirects-rewrites), [web services](https://render.com/docs/web-services), [WebSockets](https://render.com/docs/websocket), [persistent disks](https://render.com/docs/disks), and [environment variables and secret files](https://render.com/docs/configure-environment-variables). Free web services can spin down after inactivity, and persistent disks require a paid service plan. Choose a plan only after reviewing current platform pricing and availability.

## Backend configuration

Set these in the backend service environment. Do not put backend-only values in the Vite build environment.

| Name | Purpose |
| --- | --- |
| `PORT` | Runtime listener port; hosting platforms provide this. Local fallback is `3030`. |
| `MONGO_URI` | MongoDB connection string. Use a least-privilege application account. |
| `CLIENT_URL` | Exact HTTPS frontend origin, without a path. Comma-separated origins are supported for previews if needed. |
| `UPLOAD_DIR` | Optional persistent media directory. Use `/var/data/uploads` with the disk layout above. |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Optional path to Firebase Admin service-account JSON. Locally this defaults to `server/firebase-service-account.json`. |
| `GEMINI_API_KEY` | Backend-only Gemini API key. Never use a `VITE_` prefix. |
| `GEMINI_MODEL` | Optional Gemini model override; current default is `gemini-3.5-flash-lite`. |

For Render, upload the Firebase Admin JSON as a secret file (for example `/etc/secrets/firebase-service-account.json`) and set `FIREBASE_SERVICE_ACCOUNT_PATH` to that path. Never commit the file. The Firebase project must match the existing ChatSpace project and its Authentication providers must be configured.

The frontend build needs `VITE_API_URL` set to the backend HTTPS origin with no trailing slash. Socket.IO connects to that same origin. This value is public configuration, not a secret. Configure `CLIENT_URL` to the deployed frontend origin; the backend intentionally rejects other browser origins.

Set the Firebase Authentication authorized domain to the frontend's deployed hostname in Firebase Console. Keep the existing Firebase project configuration in the frontend aligned with the Admin service account. Do not deploy with example or placeholder values.

## Gemini privacy and quota

The configured model is currently listed by Google's official [Gemini model documentation](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite) and [pricing page](https://ai.google.dev/gemini-api/docs/pricing): the Standard free tier lists input and output as free of charge, while free-tier prompts may be used to improve Google products. The API still has quota and availability limits that can change. Confirm the selected account's current limits in Google AI Studio before launch, and keep users' consent/data-processing notice visible. Do not send summaries automatically.

## Before launch

1. Create the frontend static site and backend web service from the same repository; configure the separate service root directories and build commands above.
2. Add all backend variables and the Firebase Admin secret file. Add `VITE_API_URL` to the frontend build environment, then rebuild the static site.
3. Create the MongoDB database/user, restrict network access, configure backups, and verify `/healthz` reports healthy.
4. Add the frontend hostname to Firebase Authentication authorized domains and confirm email verification/sign-in flows.
5. Configure the backend CORS origin to the exact frontend origin. Verify both HTTPS API calls and Socket.IO WebSocket upgrades in browser developer tools.
6. Test private/group messaging, protected media, account deletion, summaries and consent, and reloads of `/chat`, `/profile`, and settings routes.
7. Confirm uploaded files survive a backend restart and a redeploy before using production data.
8. Exercise audio/video calls on separate networks. The current client configures a public STUN server but no TURN relay; peer-to-peer calls can fail on restrictive NAT/firewall networks. Select and configure a TURN service before relying on calls broadly.
9. Review hosting, Gemini, database, TURN, persistent storage, retention, and backup costs and policies. Do not point the deployment at production data until access controls and recovery are verified.

## Current deployment boundary

This repository has no deployment automation or database migration command. The current deployment flow is manual through the hosting provider dashboard. No deployment, external account change, database operation, or Git push is performed by this audit.

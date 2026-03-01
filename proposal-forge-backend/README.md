# Proposal Forge Backend

Express + TypeScript + MongoDB + OpenAI.

## Setup

```bash
npm install
npm run dev
```

## Seed (admin + sales users)

With MongoDB running, create test users (idempotent; skips if users exist):

```bash
npm run seed
```

Then log in from the frontend:

| Role  | Email                     | Password   |
|-------|---------------------------|------------|
| Admin | admin@proposalforge.com   | password123 |
| Sales | sales@proposalforge.com   | password123 |

Dashboard and layout show different content by role (data from API; only the auth token is stored in the browser).

## File upload (Cloudinary)

For the “New Proposal” file upload, set in `.env`:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

Uploads are in-memory (no temp files); allowed types: PDF, DOCX, TXT, max 20MB.

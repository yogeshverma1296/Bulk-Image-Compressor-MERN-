# Bulk Image Compressor (MERN)

Compress up to 50 images at once. React (Vite) frontend, Express backend using `sharp`, MongoDB for job history.

## Requirements
- Node.js 18+
- MongoDB running locally, or a MongoDB Atlas connection string

## Run it
```bash
# 1. Backend
cd server
npm install
cp .env.example .env      # edit MONGO_URI if needed
npm run dev               # http://localhost:5000

# 2. Frontend (new terminal)
cd client
npm install
npm run dev               # http://localhost:5173
```
The Vite dev server proxies `/api` to the backend. For production, run `npm run build` in `client`
and set `VITE_API_URL` to your API address before building.

## API
| Method | Route | Purpose |
|---|---|---|
| POST | `/api/compress` | multipart: `images[]`, `quality` (1-100), `format` (original/jpeg/png/webp/avif), `maxWidth` |
| GET | `/api/jobs` | 20 most recent jobs |
| GET | `/api/jobs/:id` | one job |
| GET | `/api/jobs/:id/download` | ZIP of compressed images |
| GET | `/api/jobs/:id/files/:name` | one compressed image |
| DELETE | `/api/jobs/:id` | delete job and files |

## Notes
- Compressed files are stored in `server/outputs/<jobId>/`; metadata (sizes, settings) is stored in MongoDB.
- Jobs and files older than `RETENTION_HOURS` (default 24) are deleted automatically every hour.
- With "Keep original" format, an image is returned unchanged if compression would make it larger.
- EXIF metadata is stripped (orientation is applied first).

# SHC Legacy System Integration & Deployment Pipeline

A robust, containerized ETL pipeline built with TypeScript and Node.js to ingest and normalize legacy patient data into the SHC REST API.

## Architecture & Design Decisions
- **TypeScript & Node.js:** Selected for strict type-safety, high-performance streaming I/O (`csv-parser`), and cross-platform reliability.
- **Deduplication Strategy:** In-memory hash mapping (`Map<string, PatientRecord>`) using `patient_id` as the key. Record retention is governed by the highest `last_modified` ISO timestamp.
- **Date Normalization:** Regex-based heuristic parser transforming varied international date formats (`MM/DD/YYYY`, `DD-MM-YYYY`, `YYYY-MM-DD`) to ISO 8601.
- **Fault Tolerance:**
  - Token-bucket rate limiting capped at 5 requests/sec.
  - Payload batching restricted to 100 records per API call.
  - Full exponential backoff with jitter on `429` (Rate Limit) and `5xx` (Server Error).
  - Isolates non-halting `400 Bad Request` payloads into `failed_records.json`.

## Quickstart (Local Development)

```bash
# 1. Install dependencies
npm install

# 2. Run in development mode
npm run dev

# 3. Build & Run in production mode
npm run build
npm start
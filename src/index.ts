import * as fs from "fs";
import csv from "csv-parser";
import dotenv from "dotenv";
import { RawPatientRecord, NormalizedPatientRecord } from "./types";
import { normalizeRecord } from "./normalizer";
import { IngestionApiClient } from "./apiClient";

dotenv.config();

const CSV_FILE = process.env.CSV_FILE_PATH || "./data/patients.csv";
const API_URL = process.env.API_BASE_URL || "https://api.mock-shc.com/v1/patients";
const API_TOKEN = process.env.API_BEARER_TOKEN || "mock_token";
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || "100", 10);
const MAX_RPS = parseInt(process.env.MAX_REQUESTS_PER_SECOND || "5", 10);
const IS_MOCK = process.env.MOCK_API_MODE === "true";

async function runPipeline() {
  console.log("=== SHC Ingestion Pipeline Started ===");

  if (!fs.existsSync(CSV_FILE)) {
    console.error(`Error: CSV file not found at ${CSV_FILE}`);
    process.exit(1);
  }

  const patientMap = new Map<string, NormalizedPatientRecord>();
  let totalRowsRead = 0;

  console.log(`Parsing and normalizing: ${CSV_FILE}...`);

  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(CSV_FILE)
      .pipe(csv())
      .on("data", (row: RawPatientRecord) => {
        totalRowsRead++;
        const normalized = normalizeRecord(row);
        const existing = patientMap.get(normalized.patient_id);

        // Deduplication Logic: Keep newest by last_modified
        if (!existing) {
          patientMap.set(normalized.patient_id, normalized);
        } else {
          const existingTime = new Date(existing.last_modified).getTime();
          const newTime = new Date(normalized.last_modified).getTime();
          if (newTime >= existingTime) {
            patientMap.set(normalized.patient_id, normalized);
          }
        }
      })
      .on("end", () => resolve())
      .on("error", (err) => reject(err));
  });

  const uniquePatients = Array.from(patientMap.values());
  console.log(`Total rows read: ${totalRowsRead}`);
  console.log(`Unique records after deduplication: ${uniquePatients.length}`);

  // Batching (max 100 per batch)
  const batches: NormalizedPatientRecord[][] = [];
  for (let i = 0; i < uniquePatients.length; i += BATCH_SIZE) {
    batches.push(uniquePatients.slice(i, i + BATCH_SIZE));
  }

  console.log(`Total batches to ingest: ${batches.length}`);

  const client = new IngestionApiClient(API_URL, API_TOKEN, MAX_RPS, IS_MOCK);

  for (let i = 0; i < batches.length; i++) {
    console.log(`Ingesting batch ${i + 1}/${batches.length} (${batches[i].length} records)...`);
    await client.sendBatchWithRetry(batches[i]);
  }

  console.log("=== Pipeline execution finished successfully. ===");
}

runPipeline().catch((err) => {
  console.error("Pipeline failed:", err);
  process.exit(1);
});
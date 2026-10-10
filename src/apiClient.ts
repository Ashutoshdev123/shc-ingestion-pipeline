import axios from "axios";
import * as fs from "fs";
import { NormalizedPatientRecord } from "./types";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class IngestionApiClient {
  private endpoint: string;
  private token: string;
  private isMock: boolean;
  private minIntervalMs: number;
  private lastRequestTimestamp: number = 0;

  constructor(endpoint: string, token: string, maxReqPerSec = 5, isMock = false) {
    this.endpoint = endpoint;
    this.token = token;
    this.isMock = isMock;
    this.minIntervalMs = 1000 / maxReqPerSec;
  }

  private async enforceRateLimit() {
    const now = Date.now();
    const elapsed = now - this.lastRequestTimestamp;
    const delay = Math.max(0, this.minIntervalMs - elapsed);

    if (delay > 0) {
      await sleep(delay);
    }

    this.lastRequestTimestamp = Date.now();
  }

  public async sendBatchWithRetry(
    batch: NormalizedPatientRecord[],
    maxRetries = 5
  ): Promise<boolean> {
    let attempt = 0;

    while (attempt < maxRetries) {
      await this.enforceRateLimit();

      try {
        if (this.isMock) {
          // Local testing ke liye mock success response
          console.log(`[MOCK API] Ingested batch of ${batch.length} records successfully.`);
          return true;
        }

        await axios.post(this.endpoint, { patients: batch }, {
          headers: {
            Authorization: `Bearer ${this.token}`,
            "Content-Type": "application/json"
          },
          timeout: 10000
        });

        return true;
      } catch (err: any) {
        attempt++;
        const status = err.response?.status;

        // 400 Bad Request: Pipeline stop nahi karna, alag file me likhna hai
        if (status === 400) {
          console.error(`[API 400] Bad Request encountered. Logging batch to failed_records.json`);
          this.logFailedRecords(batch, err.response?.data || "Bad Request");
          return false;
        }

        // 429 Too Many Requests ya 5xx Server Error: Exponential Backoff
        if (status === 429 || (status >= 500 && status < 600) || !status) {
          const backoffDelay = Math.pow(2, attempt) * 500 + Math.random() * 200;
          console.warn(
            `[API Retry] Status: ${status || "Network Error"}. Retrying attempt ${attempt}/${maxRetries} in ${backoffDelay.toFixed(0)}ms...`
          );
          await sleep(backoffDelay);
        } else {
          // Other unexpected errors
          console.error(`[API Fatal Error] Status ${status}:`, err.message);
          this.logFailedRecords(batch, err.message);
          return false;
        }
      }
    }

    console.error(`[API Error] Batch failed after ${maxRetries} retries.`);
    this.logFailedRecords(batch, "Max retries exceeded");
    return false;
  }

  private logFailedRecords(records: NormalizedPatientRecord[], reason: any) {
    const filePath = "./failed_records.json";
    const failurePayload = {
      timestamp: new Date().toISOString(),
      reason,
      records
    };

    let existing: any[] = [];
    if (fs.existsSync(filePath)) {
      try {
        existing = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      } catch {
        existing = [];
      }
    }
    existing.push(failurePayload);
    fs.writeFileSync(filePath, JSON.stringify(existing, null, 2), "utf-8");
  }
}
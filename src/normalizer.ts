import { RawPatientRecord, NormalizedPatientRecord } from "./types";

const isValidCalendarDate = (year: number, month: number, day: number): boolean => {
  const dt = new Date(year, month - 1, day);
  return (
    dt.getFullYear() === year &&
    dt.getMonth() === month - 1 &&
    dt.getDate() === day
  );
};

const formatISODate = (year: number, month: number, day: number): string => {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

export function parseDateToISO(dateStr: string): string {
  if (!dateStr) return "";

  const cleaned = dateStr.trim();
  if (!cleaned) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    const [year, month, day] = cleaned.split("-").map((part) => parseInt(part, 10));
    if (isValidCalendarDate(year, month, day)) {
      return formatISODate(year, month, day);
    }
    return "";
  }

  if (/^\d{4}[/-]\d{1,2}[/-]\d{1,2}$/.test(cleaned)) {
    const [year, month, day] = cleaned.split(/[/-]/).map((part) => parseInt(part, 10));
    if (isValidCalendarDate(year, month, day)) {
      return formatISODate(year, month, day);
    }
    return "";
  }

  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(cleaned)) {
    const parts = cleaned.split(/[/-]/).map((part) => parseInt(part, 10));
    const [part1, part2, year] = parts;
    const month = part1 > 12 ? part2 : part1;
    const day = part1 > 12 ? part1 : part2;

    if (isValidCalendarDate(year, month, day)) {
      return formatISODate(year, month, day);
    }

    return "";
  }

  const parsed = new Date(cleaned);
  if (!Number.isNaN(parsed.getTime())) {
    const iso = parsed.toISOString().split("T")[0];
    return iso;
  }

  return "";
}

export function parseAccountBalance(balanceStr: string): number {
  if (!balanceStr) return 0.0;

  const trimmed = balanceStr.trim();
  if (!trimmed) return 0.0;

  const isNegative = trimmed.startsWith("(") && trimmed.endsWith(")");
  let cleaned = trimmed.replace(/[()]/g, "").replace(/[^0-9,\.\-+]/g, "");

  if (!cleaned || cleaned === "." || cleaned === "-" || cleaned === "+") {
    return 0.0;
  }

  if (cleaned.includes(",") && !cleaned.includes(".")) {
    const parts = cleaned.split(",");
    const lastPart = parts[parts.length - 1];
    const isThousandsSeparator = lastPart.length === 3 && parts.length > 1 && parts.every((part) => part.length <= 3);
    cleaned = isThousandsSeparator ? cleaned.replace(/,/g, "") : cleaned.replace(/,/g, ".");
  }

  if (cleaned.includes(",") && cleaned.includes(".")) {
    const lastCommaIndex = cleaned.lastIndexOf(",");
    const lastDotIndex = cleaned.lastIndexOf(".");
    const decimalSeparator = lastCommaIndex > lastDotIndex ? "," : ".";
    const thousandsSeparator = decimalSeparator === "," ? "." : ",";
    cleaned = cleaned.replace(new RegExp(`\\${thousandsSeparator}`, "g"), "").replace(decimalSeparator, ".");
  }

  const value = Number(cleaned);
  if (!Number.isFinite(value)) {
    return 0.0;
  }

  return isNegative ? -value : value;
}

export function normalizeRecord(raw: RawPatientRecord): NormalizedPatientRecord {
  const rawLastModified = raw.last_modified ? raw.last_modified.trim() : "";
  const dto = parseDateToISO(raw.dob);

  return {
    patient_id: raw.patient_id ? raw.patient_id.trim() : "",
    first_name: raw.first_name ? raw.first_name.trim() : "",
    last_name: raw.last_name ? raw.last_name.trim() : "",
    dob: dto,
    email: raw.email && raw.email.trim() ? raw.email.trim() : null,
    phone: raw.phone && raw.phone.trim() ? raw.phone.trim() : null,
    account_balance: parseAccountBalance(raw.account_balance),
    last_modified: rawLastModified && !Number.isNaN(new Date(rawLastModified).getTime()) ? new Date(rawLastModified).toISOString() : ""
  };
}
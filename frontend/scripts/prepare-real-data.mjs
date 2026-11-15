#!/usr/bin/env node
/*
 * Turns the real public datasets into small JSON for the body scan page.
 *
 * Rules this script follows:
 *  - Real recordings only. It never generates, simulates or samples data.
 *  - Missing raw file => say exactly what is missing and where it belongs,
 *    then stop that dataset. It does not substitute anything.
 *  - Gaps stay gaps: "No Data" and unparseable values become null.
 *
 * Usage: node scripts/prepare-real-data.mjs
 */

import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const RAW_DIR = path.join(ROOT, "data-raw");
const OUT_DIR = path.join(ROOT, "public", "data");
const TARGET_BYTES = 2 * 1024 * 1024;

const DATASETS = [
  {
    id: "bedrest-actigraphy",
    label: "NASA bed-rest actigraphy",
    // File name as distributed with the study archive.
    file: "BRSMACT_Campagin_1_Actigraphy.csv",
    region: ["Head", "Legs"],
    source: "NASA Human Research Program bed-rest campaign 1",
    url: "https://humanresearchroadmap.nasa.gov/",
    license: "Public domain (NASA)",
    citation:
      "NASA Bed Rest Campaign 1 actigraphy (BRSMACT_Campagin_1_Actigraphy.csv)",
    samplingRate: "per epoch as recorded (downsampled to one value per minute)",
  },
  {
    id: "physionet-wearable",
    label: "PhysioNet wearable vitals",
    // The archive name varies by distribution; accept the usual spellings.
    file: "physionet-wearable.csv",
    alternatives: ["PhysioNet_wearable.csv", "wearable.csv"],
    region: ["Heart", "Skin"],
    source: "PhysioNet wearable dataset",
    url: "https://physionet.org/",
    license: "Open Data Commons Attribution License v1.0",
    citation: "PhysioNet wearable dataset (see the research report for the exact record)",
    samplingRate: "per record (downsampled to one value per minute)",
  },
];

function findRaw(dataset) {
  const candidates = [dataset.file, ...(dataset.alternatives ?? [])];
  for (const name of candidates) {
    const full = path.join(RAW_DIR, name);
    if (existsSync(full)) return full;
  }
  return null;
}

function preflight() {
  const missing = [];
  const found = [];
  for (const dataset of DATASETS) {
    const full = findRaw(dataset);
    if (full) {
      found.push(full);
      console.log(`[ok]      ${dataset.label}: ${path.relative(ROOT, full)}`);
    } else {
      missing.push(dataset);
      console.log(`[missing] ${dataset.label}`);
      console.log(`          expected at: ${path.relative(ROOT, path.join(RAW_DIR, dataset.file))}`);
      console.log(`          source:      ${dataset.source} — ${dataset.url}`);
      console.log("          stopping this dataset; nothing will be generated in its place.");
    }
  }
  return { missing, found };
}

/** "7:44:00" is elapsed time; plain numbers are seconds or epochs. */
function parseDuration(value) {
  const text = String(value ?? "").trim();
  if (!text || /^no data$/i.test(text)) return null;
  if (/^\d+:\d{2}:\d{2}$/.test(text)) {
    const [hours, minutes, seconds] = text.split(":").map(Number);
    return hours * 3600 + minutes * 60 + seconds;
  }
  const numeric = Number(text);
  return Number.isFinite(numeric) ? numeric : null;
}

function splitRow(line) {
  return line.split(",").map((cell) => cell.replace(/^"|"$/g, "").trim());
}

/** Keeps one value per minute so the bundle stays small, gaps preserved. */
function downsamplePerMinute(seconds, value) {
  const bucket = Math.floor(seconds / 60);
  return { bucket, value };
}

function convertCsv(csv, dataset, participantId) {
  const lines = csv.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length < 2) return null;
  const header = splitRow(lines[0]).map((name) => name.toLowerCase());
  const timeIndex = header.findIndex((name) => /time|epoch|second|clock/.test(name));
  const valueIndex = header.findIndex((name) => /activ|value|count|heart|temp/.test(name));
  if (timeIndex === -1 || valueIndex === -1) return null;

  const buckets = new Map();
  for (const line of lines.slice(1)) {
    const cells = splitRow(line);
    const seconds = parseDuration(cells[timeIndex]);
    const raw = cells[valueIndex];
    const parsed = parseDuration(raw);
    // Missing values stay null rather than being carried forward.
    const value = parsed === null ? null : parsed;
    if (seconds === null) continue;
    const { bucket } = downsamplePerMinute(seconds, value);
    if (!buckets.has(bucket)) buckets.set(bucket, value);
  }

  const points = [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([bucket, value]) => ({ minute: bucket, value }));

  return {
    metadata: {
      source: dataset.source,
      url: dataset.url,
      license: dataset.license,
      citation: dataset.citation,
      participant: participantId,
      samplingRate: dataset.samplingRate,
      processing: [
        "parsed elapsed durations (H:MM:SS) as seconds",
        "treated \"No Data\" and unparseable values as null (gaps kept as gaps)",
        "downsampled to one value per minute",
      ],
    },
    points,
  };
}

async function main() {
  console.log("Preflight — raw files (frontend/data-raw/, gitignored):\n");
  if (!existsSync(RAW_DIR)) {
    console.log(`[missing] ${path.relative(ROOT, RAW_DIR)}/ does not exist yet.`);
  }
  const { missing, found } = preflight();

  if (found.length === 0) {
    console.log(
      "\nNothing to prepare: no real dataset is present, so no JSON was written.",
    );
    console.log(
      "Put the raw files in frontend/data-raw/ and run this again. This script will not invent data.",
    );
    process.exitCode = 1;
    return;
  }

  await mkdir(OUT_DIR, { recursive: true });
  for (const dataset of DATASETS) {
    const full = findRaw(dataset);
    if (!full) continue; // already reported, stays stopped
    const csv = await readFile(full, "utf8");
    const converted = convertCsv(csv, dataset, path.basename(full, ".csv"));
    if (!converted) {
      console.log(
        `[skip]    ${dataset.label}: could not find a time and a value column in ${path.basename(full)}`,
      );
      continue;
    }
    const outFile = path.join(OUT_DIR, `${dataset.id}.json`);
    const json = JSON.stringify(converted);
    await writeFile(outFile, json);
    const bytes = Buffer.byteLength(json);
    console.log(
      `[written] ${path.relative(ROOT, outFile)} — ${converted.points.length} points, ${(bytes / 1024).toFixed(0)} KB${bytes > TARGET_BYTES ? " (OVER 2 MB TARGET)" : ""}`,
    );
  }
  if (missing.length > 0) {
    console.log(
      `\nStopped ${missing.length} dataset(s) for missing raw files; nothing was generated for them.`,
    );
  }
}

await main();

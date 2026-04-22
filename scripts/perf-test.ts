#!/usr/bin/env bun
/**
 * API Performance Test Suite
 *
 * Usage:
 *   bun scripts/perf-test.ts                                  # prompts for input
 *   bun scripts/perf-test.ts --token "session_token_value"    # direct token
 *   bun scripts/perf-test.ts --curl "curl 'http://...' -b ..." # extract from curl
 *   bun scripts/perf-test.ts --label "after-index-fix"        # custom run label
 *   bun scripts/perf-test.ts --base "https://prod.example.com"
 *   bun scripts/perf-test.ts --file-key "logs%2Fmy-file.csv"
 *   bun scripts/perf-test.ts --categories "aggregations"           # only aggregations
 *   bun scripts/perf-test.ts --categories "logs-timestamp,logs-sort" # skip aggregations
 *
 * Results saved to: scripts/perf-results/<timestamp>-<label>.json
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TestResult {
  category: string;
  name: string;
  url: string;
  httpStatus: number;
  timeMs: number;
  sizeBytes: number;
  details: Record<string, unknown>;
}

interface CategorySummary {
  count: number;
  avgMs: number;
  minMs: number;
  maxMs: number;
  p50Ms: number;
  p95Ms: number;
  slowCount: number;
}

interface PerfReport {
  meta: {
    timestamp: string;
    label: string;
    baseUrl: string;
    fileKey: string;
    gitBranch: string;
    gitCommit: string;
    testCount: number;
  };
  tests: TestResult[];
  summary: Record<string, CategorySummary>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractToken(input: string): string | null {
  const match = input.match(/session_token=([^;&"'\s]+)/);
  return match?.[1] ?? null;
}

function extractFileKey(input: string): string | null {
  const match = input.match(/fileKey=([^&"'\s]+)/);
  return match?.[1] ?? null;
}

function git(cmd: string): string {
  try {
    return execSync(`git ${cmd}`, { encoding: "utf-8" }).trim();
  } catch {
    return "unknown";
  }
}

async function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function color(ms: number): string {
  if (ms > 5000) return "\x1b[31m"; // red
  if (ms > 2000) return "\x1b[33m"; // yellow
  return "\x1b[32m"; // green
}

const RESET = "\x1b[0m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";

function percentile(sorted: number[], p: number): number {
  const idx = Math.min(Math.floor(sorted.length * p), sorted.length - 1);
  return sorted[idx];
}

// ---------------------------------------------------------------------------
// Test runner
// ---------------------------------------------------------------------------

const results: TestResult[] = [];
let testIndex = 0;

async function runTest(
  category: string,
  name: string,
  url: string,
  cookie: string,
): Promise<void> {
  testIndex++;
  const label = `  [${String(testIndex).padStart(2)}] ${name.padEnd(50)}`;
  process.stdout.write(label);

  const start = performance.now();
  let httpStatus = 0;
  let sizeBytes = 0;
  let body: Record<string, unknown> = {};

  try {
    const res = await fetch(url, {
      headers: { Cookie: cookie },
    });
    httpStatus = res.status;
    const text = await res.text();
    sizeBytes = new TextEncoder().encode(text).length;
    try {
      body = JSON.parse(text);
    } catch {
      // not json
    }
  } catch (err) {
    httpStatus = 0;
  }

  const timeMs = Math.round(performance.now() - start);

  // Extract details
  const details: Record<string, unknown> = {};
  if (url.includes("/api/logs?")) {
    const data = body.data as unknown[];
    details.records = Array.isArray(data) ? data.length : 0;
    details.hasMore = body.hasMore;
    details.page = body.page;
  } else if (url.includes("aggregations")) {
    const kpis = body.kpis as Record<string, number> | undefined;
    if (kpis) {
      details.totalRequests = kpis.totalRequests;
      details.avgDuration = Math.round((kpis.avgDuration ?? 0) * 10) / 10;
      details.errorRate = Math.round((kpis.errorRate ?? 0) * 100) / 100;
    }
  }

  const c = color(timeMs);
  console.log(
    `${c}${String(timeMs).padStart(7)}ms${RESET}  ${DIM}HTTP ${httpStatus}  ${sizeBytes}B${RESET}`,
  );

  results.push({ category, name, url, httpStatus, timeMs, sizeBytes, details });
}

// ---------------------------------------------------------------------------
// Test definitions
// ---------------------------------------------------------------------------

function defineTests(base: string, fk: string) {
  type Test = { category: string; name: string; path: string };
  const tests: Test[] = [];
  const add = (category: string, name: string, path: string) =>
    tests.push({ category, name, path });

  // Aggregations
  add("aggregations", "No filters", `/api/logs/aggregations?fileKey=${fk}`);
  add("aggregations", "method=GET", `/api/logs/aggregations?method=GET&fileKey=${fk}`);
  add("aggregations", "endpoint=query", `/api/logs/aggregations?endpoint=query&fileKey=${fk}`);
  add("aggregations", "method=GET + endpoint=query", `/api/logs/aggregations?method=GET&endpoint=query&fileKey=${fk}`);
  add("aggregations", "GET + query + studio=false", `/api/logs/aggregations?method=GET&endpoint=query&studio=false&fileKey=${fk}`);
  add("aggregations", "status=200", `/api/logs/aggregations?status=200&fileKey=${fk}`);

  // Logs: timestamp sort (index-backed fast path)
  const logBase = `page=1&pageSize=50&sortBy=timestamp&sortDir=desc&fileKey=${fk}`;
  add("logs-timestamp", "No filters", `/api/logs?${logBase}`);
  add("logs-timestamp", "method=GET", `/api/logs?method=GET&${logBase}`);
  add("logs-timestamp", "method=GET + endpoint=query", `/api/logs?method=GET&endpoint=query&${logBase}`);
  add("logs-timestamp", "GET + query + studio=false", `/api/logs?method=GET&endpoint=query&studio=false&${logBase}`);
  add("logs-timestamp", "status=200", `/api/logs?status=200&${logBase}`);

  // Logs: non-timestamp sort (subquery capped path)
  const sortBase = `page=1&pageSize=50&sortDir=desc&fileKey=${fk}`;
  add("logs-sort", "sort=duration (no filters)", `/api/logs?sortBy=duration&${sortBase}`);
  add("logs-sort", "sort=duration + method=GET", `/api/logs?method=GET&sortBy=duration&${sortBase}`);
  add("logs-sort", "sort=duration + GET+query+!studio", `/api/logs?method=GET&endpoint=query&studio=false&sortBy=duration&${sortBase}`);
  add("logs-sort", "sort=status (no filters)", `/api/logs?sortBy=status&${sortBase}`);
  add("logs-sort", "sort=method (no filters)", `/api/logs?sortBy=method&${sortBase}`);
  add("logs-sort", "sort=responseSize (no filters)", `/api/logs?sortBy=responseSize&${sortBase}`);

  // Pagination
  add("logs-pagination", "page=1 (timestamp)", `/api/logs?page=1&pageSize=50&sortBy=timestamp&sortDir=desc&fileKey=${fk}`);
  add("logs-pagination", "page=2 (timestamp)", `/api/logs?page=2&pageSize=50&sortBy=timestamp&sortDir=desc&fileKey=${fk}`);
  add("logs-pagination", "page=5 (timestamp)", `/api/logs?page=5&pageSize=50&sortBy=timestamp&sortDir=desc&fileKey=${fk}`);
  add("logs-pagination", "page=2 (duration sort)", `/api/logs?page=2&pageSize=50&sortBy=duration&sortDir=desc&fileKey=${fk}`);

  return tests.map((t) => ({ ...t, url: `${base}${t.path}` }));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  let base = "http://localhost:3000";
  let token = "";
  let fileKey = "";
  let label = "";
  let categories: string[] = [];

  // Parse args
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--token":
        token = args[++i];
        break;
      case "--curl": {
        const curl = args[++i];
        token = extractToken(curl) ?? "";
        fileKey = fileKey || extractFileKey(curl) || "";
        break;
      }
      case "--label":
        label = args[++i];
        break;
      case "--base":
        base = args[++i];
        break;
      case "--file-key":
        fileKey = args[++i];
        break;
      case "--categories":
        categories = args[++i].split(",").map((c) => c.trim());
        break;
    }
  }

  // Prompt if missing
  if (!token) {
    const input = await prompt(
      "Paste session token or full curl command:\n> ",
    );
    if (input.includes("curl")) {
      token = extractToken(input) ?? "";
      fileKey = fileKey || extractFileKey(input) || "";
    } else {
      token = input;
    }
  }

  if (!token) {
    console.error("Error: Could not extract session token.");
    process.exit(1);
  }

  if (!fileKey) {
    fileKey = await prompt("Enter file key (URL-encoded):\n> ");
  }

  if (!fileKey) {
    console.error("Error: File key is required.");
    process.exit(1);
  }

  // Verify auth
  const cookie = `better-auth.session_token=${token}`;
  const check = await fetch(
    `${base}/api/logs?page=1&pageSize=1&sortBy=timestamp&sortDir=desc&fileKey=${fileKey}`,
    { headers: { Cookie: cookie } },
  );

  if (!check.ok) {
    console.error(`Error: Auth failed (HTTP ${check.status}). Token may be expired.`);
    process.exit(1);
  }
  await check.text(); // drain body

  console.log(`${BOLD}Auth verified.${RESET} Running tests...\n`);

  // Setup output
  const scriptDir = dirname(new URL(import.meta.url).pathname);
  const resultsDir = join(scriptDir, "perf-results");
  mkdirSync(resultsDir, { recursive: true });

  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const runLabel = label || "run";
  const outputFile = join(resultsDir, `${ts}-${runLabel}.json`);

  // Header
  console.log("=========================================================================");
  console.log(`  API Performance Test Suite`);
  console.log(`  Base: ${base}`);
  console.log(`  Time: ${new Date().toISOString()}`);
  console.log(`  Branch: ${git("rev-parse --abbrev-ref HEAD")} @ ${git("rev-parse --short HEAD")}`);
  console.log("=========================================================================");

  // Run tests
  let tests = defineTests(base, fileKey);
  if (categories.length > 0) {
    tests = tests.filter((t) => categories.includes(t.category));
    console.log(`  Categories: ${categories.join(", ")}`);
  }
  let currentCategory = "";

  for (const t of tests) {
    if (t.category !== currentCategory) {
      currentCategory = t.category;
      console.log(`\n${BOLD}--- ${currentCategory} ---${RESET}`);
    }
    await runTest(t.category, t.name, t.url, cookie);
  }

  // Build summary
  const summary: Record<string, CategorySummary> = {};
  const byCategory = new Map<string, number[]>();

  for (const r of results) {
    const arr = byCategory.get(r.category) ?? [];
    arr.push(r.timeMs);
    byCategory.set(r.category, arr);
  }

  for (const [cat, times] of byCategory) {
    const sorted = [...times].sort((a, b) => a - b);
    summary[cat] = {
      count: times.length,
      avgMs: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
      minMs: sorted[0],
      maxMs: sorted[sorted.length - 1],
      p50Ms: percentile(sorted, 0.5),
      p95Ms: percentile(sorted, 0.95),
      slowCount: times.filter((t) => t > 5000).length,
    };
  }

  const allTimes = results.map((r) => r.timeMs);
  const allSorted = [...allTimes].sort((a, b) => a - b);
  summary.overall = {
    count: allTimes.length,
    avgMs: Math.round(allTimes.reduce((a, b) => a + b, 0) / allTimes.length),
    minMs: allSorted[0],
    maxMs: allSorted[allSorted.length - 1],
    p50Ms: percentile(allSorted, 0.5),
    p95Ms: percentile(allSorted, 0.95),
    slowCount: allTimes.filter((t) => t > 5000).length,
  };

  // Write report
  const report: PerfReport = {
    meta: {
      timestamp: new Date().toISOString(),
      label: runLabel,
      baseUrl: base,
      fileKey,
      gitBranch: git("rev-parse --abbrev-ref HEAD"),
      gitCommit: git("rev-parse --short HEAD"),
      testCount: results.length,
    },
    tests: results,
    summary,
  };

  writeFileSync(outputFile, JSON.stringify(report, null, 2));

  // Print summary
  console.log(`\n${BOLD}=========================================================================`);
  console.log("  Summary");
  console.log(`=========================================================================${RESET}\n`);

  for (const [cat, s] of Object.entries(summary)) {
    const slow = s.slowCount ? `  \x1b[31m(${s.slowCount} slow >5s)\x1b[0m` : "";
    console.log(
      `  ${cat.padEnd(20)}  avg=${String(s.avgMs).padStart(7)}ms  p50=${String(s.p50Ms).padStart(7)}ms  p95=${String(s.p95Ms).padStart(7)}ms  max=${String(s.maxMs).padStart(7)}ms${slow}`,
    );
  }

  console.log(`\n  Results saved to: ${outputFile}`);
  console.log("");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

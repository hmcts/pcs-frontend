import * as fs from 'fs';
import * as path from 'path';

const DEFAULT_SUMMARY_CANDIDATES = [
  'e2e-output/widgets/summary.json',
  'e2e-output/data/widgets/summary.json',
  'allure-report/widgets/summary.json',
  'allure-report/data/widgets/summary.json',
];

export function findAllureSummaryJson(
  baseDir: string = process.cwd(),
  candidates: string[] = DEFAULT_SUMMARY_CANDIDATES
): string {
  for (const p of candidates) {
    const fullPath = path.join(baseDir, p);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }
  throw new Error(
    `Allure summary.json not found. Checked:\n- ${candidates.map((c) => path.join(baseDir, c)).join('\n- ')}`
  );
}

export interface AllureSummary {
  total: number;
  passed: number;
  failed: number;
  broken: number;
  skipped: number;
  unknown: number;
  duration_ms: number;
  duration_seconds: number;
  pass_rate: number;
}

export function parseAllureSummary(summaryPath: string): AllureSummary {
  if (!fs.existsSync(summaryPath)) {
    throw new Error(`Allure summary not found at: ${summaryPath}`);
  }
  const data = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
  const stats = data.statistic ?? {};
  const timeInfo = data.time ?? {};
  const total = parseInt(String(stats.total ?? 0), 10) || 0;
  const passed = parseInt(String(stats.passed ?? 0), 10) || 0;
  const failed = parseInt(String(stats.failed ?? 0), 10) || 0;
  const broken = parseInt(String(stats.broken ?? 0), 10) || 0;
  const skipped = parseInt(String(stats.skipped ?? 0), 10) || 0;
  const unknown = parseInt(String(stats.unknown ?? 0), 10) || 0;
  const durationMs = parseInt(String(timeInfo.duration ?? 0), 10) || 0;
  const durationSeconds = Math.round((durationMs / 1000) * 100) / 100;
  const runCount = total - skipped;
  const passRate =
    runCount > 0 ? Math.round((passed / runCount) * 10000) / 100 : total > 0 ? 0 : 100;

  return {
    total,
    passed,
    failed,
    broken,
    skipped,
    unknown,
    duration_ms: durationMs,
    duration_seconds: durationSeconds,
    pass_rate: passRate,
  };
}

function safeGet<T>(d: Record<string, unknown>, key: string, defaultVal: T): T {
  const v = d[key];
  return (v === undefined || v === null ? defaultVal : v) as T;
}

function extractLabel(resultJson: Record<string, unknown>, labelName: string): string {
  const labels = (resultJson.labels ?? []) as Array<{ name?: string; value?: string }>;
  for (const lab of labels) {
    if (lab?.name === labelName) {
      return String(lab.value ?? '');
    }
  }
  return '';
}

export interface AllureTestRecord {
  name: string;
  status: string;
  duration_ms: number;
  duration_seconds: number;
  suite: string;
  feature: string;
  story: string;
  severity: string;
  message: string;
  /** Used to deduplicate retries: same test across attempts shares this id */
  historyId?: string;
  fullName?: string;
  /** Start timestamp (ms) for ordering retries – keep latest attempt */
  start?: number;
}

export function parseAllureResults(
  allureResultsDir: string = path.join(process.cwd(), 'allure-results')
): AllureTestRecord[] {
  if (!fs.existsSync(allureResultsDir)) {
    throw new Error(`Allure results directory not found: ${allureResultsDir}`);
  }
  const files = fs.readdirSync(allureResultsDir).filter((f) => f.endsWith('-result.json'));
  const tests: AllureTestRecord[] = [];

  for (const file of files.sort()) {
    const filePath = path.join(allureResultsDir, file);
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {
      continue;
    }
    const name = String(safeGet(data, 'name', file.replace('-result.json', '')));
    const status = String(safeGet(data, 'status', 'unknown'));
    const statusDetails = (data.statusDetails ?? {}) as Record<string, unknown>;
    const message = String(statusDetails.message ?? '');
    const start = (safeGet(data, 'start', 0) as number) ?? 0;
    const stop = (safeGet(data, 'stop', 0) as number) ?? 0;
    const durationMs =
      start && stop && stop >= start ? Math.round(stop - start) : 0;
    const suite =
      extractLabel(data, 'suite') || extractLabel(data, 'parentSuite');
    const feature = extractLabel(data, 'feature');
    const story = extractLabel(data, 'story');
    const severity = extractLabel(data, 'severity');
    const historyId = (data.historyId as string) ?? '';
    const fullName = (data.fullName as string) ?? '';

    tests.push({
      name,
      status,
      duration_ms: durationMs,
      duration_seconds: Math.round((durationMs / 1000) * 100) / 100,
      suite,
      feature,
      story,
      severity,
      message,
      historyId: historyId || undefined,
      fullName: fullName || undefined,
      start,
    });
  }
  return tests;
}

/** Tests with duration >= minDurationSeconds, sorted slowest first, up to topN. */
export function topSlowestTests(
  tests: AllureTestRecord[],
  topN: number = 5,
  minDurationSeconds: number = 5 * 60
): AllureTestRecord[] {
  return [...tests]
    .filter((t) => (t.duration_seconds ?? 0) >= minDurationSeconds)
    .sort((a, b) => (b.duration_ms ?? 0) - (a.duration_ms ?? 0))
    .slice(0, topN);
}

export function failedTests(tests: AllureTestRecord[]): AllureTestRecord[] {
  return tests.filter((t) =>
    ['failed', 'broken'].includes(t.status ?? '')
  );
}

export function deduplicateFailedTestsByRetry(tests: AllureTestRecord[]): AllureTestRecord[] {
  return failedTests(latestResultByKey(tests));
}

export function countSlowTests(
  tests: AllureTestRecord[],
  thresholdSeconds: number = 5 * 60
): number {
  return tests.filter((t) => (t.duration_seconds ?? 0) >= thresholdSeconds).length;
}

/** Format seconds as human-readable (e.g. 1021.64 → "17m 2s", 3661 → "1h 1m 1s"). */
export function formatDuration(seconds: number): string {
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m < 60) return sec > 0 ? `${m}m ${sec}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const min = m % 60;
  const parts = [`${h}h`];
  if (min > 0) parts.push(`${min}m`);
  if (sec > 0) parts.push(`${sec}s`);
  return parts.join(' ');
}

export function ragStatus(summary: AllureSummary): string {
  if (summary.failed > 0 || summary.pass_rate < 95) {
    return '🔴 RED';
  }
  if (summary.broken > 0 || summary.pass_rate < 98) {
    return '🟠 AMBER';
  }
  return '🟢 GREEN';
}

/** One record per test (latest by start time), keyed by historyId/fullName/name. */
function latestResultByKey(tests: AllureTestRecord[]): AllureTestRecord[] {
  const byKey = new Map<string, AllureTestRecord>();
  for (const t of tests) {
    const key = (t.historyId ?? t.fullName ?? t.name).trim() || t.name;
    const existing = byKey.get(key);
    const start = t.start ?? 0;
    const existingStart = existing?.start ?? 0;
    if (!existing || start >= existingStart) byKey.set(key, t);
  }
  return Array.from(byKey.values());
}

function latestResultSummary(tests: AllureTestRecord[]): { failed: number; broken: number; pass_rate: number } {
  const latest = latestResultByKey(tests);
  const total = latest.length;
  const failed = latest.filter((t) => t.status === 'failed').length;
  const broken = latest.filter((t) => t.status === 'broken').length;
  const skipped = latest.filter((t) => t.status === 'skipped').length;
  const passed = total - failed - broken - skipped;
  const runCount = total - skipped;
  const pass_rate =
    runCount > 0 ? Math.round((passed / runCount) * 10000) / 100 : total > 0 ? 0 : 100;
  return { failed, broken, pass_rate };
}

export function buildSlackMessage(
  summary: AllureSummary,
  buildNumber: string,
  buildUrl: string,
  reportPathSuffix: string = 'allure/',
  tests: AllureTestRecord[] | null = null,
  topNSlowest: number = 5,
  maxFailuresToList: number = 8,
  slowThresholdSeconds: number = 5 * 60,
  serviceName: string = 'pcs-frontend',
  pipelineType: string = 'nightly'
): string {
  const summaryForRag =
    tests && tests.length > 0
      ? { ...summary, ...latestResultSummary(tests) }
      : summary;
  const rag = ragStatus(summaryForRag);
  const reportUrl = buildUrl ? `${buildUrl}${reportPathSuffix}` : '';
  const lines: string[] = [];
  lines.push(`*E2E Test Results* — Build #${buildNumber}  ${rag}`);
  lines.push(`*Service:* ${serviceName}  |  *Pipeline:* ${pipelineType}`);
  lines.push('');
  if (reportUrl) {
    lines.push(`*Allure report:* ${reportUrl}`);
    lines.push('');
  }
  const slowCount =
    tests && tests.length > 0
      ? countSlowTests(tests, slowThresholdSeconds)
      : 0;
  const durationFormatted = formatDuration(summary.duration_seconds);
  lines.push('*Status*');
  lines.push(`Total: *${summary.total}*`);
  lines.push(`✅ Passed: *${summary.passed}*`);
  lines.push(`❌ Failed: *${summary.failed}*`);
  const slowLabel =
    slowThresholdSeconds >= 60
      ? `≥${Math.round(slowThresholdSeconds / 60)}m`
      : `≥${slowThresholdSeconds}s`;
  lines.push(`🐢 Slow (${slowLabel}): *${slowCount}*`);
  lines.push(`⏭️ Skipped: *${summary.skipped}*`);
  if (summary.broken > 0) {
    lines.push(`⚠️ Broken: *${summary.broken}*`);
  }
  lines.push(`Pass rate: *${summary.pass_rate}%*`);
  lines.push(`Duration: *${durationFormatted}*`);
  lines.push('');

  if (tests && tests.length > 0) {
    const fails = deduplicateFailedTestsByRetry(tests);
    const slow = topSlowestTests(tests, topNSlowest, slowThresholdSeconds);

    if (fails.length > 0) {
      lines.push(`*Failures / Broken* (${fails.length})`);
      for (const t of fails.slice(0, maxFailuresToList)) {
        const msg = (t.message ?? '').trim().replace(/\n/g, ' ');
        const truncated = msg.length > 120 ? msg.slice(0, 120) + '…' : msg;
        lines.push(
          `• \`${t.status}\` ${t.name} (${t.duration_seconds}s)` +
            (truncated ? ` — ${truncated}` : '')
        );
      }
      if (fails.length > maxFailuresToList) {
        lines.push(`  _…and ${fails.length - maxFailuresToList} more_`);
      }
      lines.push('');
    }

    if (slow.length > 0) {
      lines.push(`*Top ${slow.length} slowest tests* (${slowLabel})`);
      for (const t of slow) {
        lines.push(`• ${t.name} — ${t.duration_seconds}s`);
      }
      lines.push('');
    }
  }

  return lines.join('\n').trim();
}

// pcs-frontend: Allure report at repo root; CNP report name "PCS Frontend Functional Test Report"
const DEFAULT_REPORT_PATH = 'PCS_20Frontend_20Functional_20Test_20Report/';

/** pcs-frontend: allure-report and allure-results are at repo root (process.cwd() in Jenkins). */
function resolveDirs(): { baseDir: string; resultsDir: string } {
  const baseDir = process.cwd();
  const resultsDir = path.join(baseDir, 'allure-results');
  return { baseDir, resultsDir };
}

export function getSlackMessage(): string {
  const { baseDir, resultsDir } = resolveDirs();
  const buildNumber = (process.env.BUILD_NUMBER ?? 'local').trim();
  const buildUrl = (process.env.BUILD_URL ?? '').trim();
  const jobName = (process.env.JOB_NAME ?? 'e2e').trim();
  const reportSuffix = (process.env.ALLURE_REPORT_PATH_SUFFIX ?? DEFAULT_REPORT_PATH).trim() || DEFAULT_REPORT_PATH;
  const serviceName = (process.env.E2E_SERVICE_NAME ?? process.env.COMPONENT ?? 'pcs-frontend').trim() || 'pcs-frontend';
  const pipelineType = (process.env.E2E_PIPELINE_TYPE ?? (jobName.toLowerCase().includes('nightly') ? 'nightly' : 'master')).trim() || 'master';

  try {
    const summary = parseAllureSummary(findAllureSummaryJson(baseDir));
    let tests: AllureTestRecord[] | null = null;
    try {
      if (fs.existsSync(resultsDir)) {
        tests = parseAllureResults(resultsDir);
      }
    } catch {
      /* optional */
    }
    return buildSlackMessage(summary, buildNumber, buildUrl, reportSuffix, tests, 5, 8, 5 * 60, serviceName, pipelineType);
  } catch (err) {
    if (!process.argv.includes('--print-only')) {
      console.warn('[WARN] Could not read Allure summary; sending fallback.', err);
    }
    const reportUrl = buildUrl ? `${buildUrl}${reportSuffix}` : '';
    return `E2E Test Results — Build #${buildNumber}\n*Service:* ${serviceName}  |  *Pipeline:* ${pipelineType}\n\nAllure report not available – check build logs.${reportUrl ? `\n*Allure report:* ${reportUrl}` : buildUrl ? `\n*Build:* ${buildUrl}` : ''}`;
  }
}

/** Builds the message for Slack. With --print-only (used by Jenkins) writes to stdout for slackSend. */
export function main(): void {
  const msg = getSlackMessage();
  if (process.argv.includes('--print-only')) {
    process.stdout.write(msg);
  } else {
    console.log(msg);
  }
}

const isMain =
  require.main === module ||
  process.argv[1]?.includes('allure-slack-notifier');

if (isMain) {
  try {
    main();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

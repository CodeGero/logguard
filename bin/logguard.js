#!/usr/bin/env node

const { Command } = require('commander');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const program = new Command();

program
  .name('logguard')
  .description('Log file analyzer CLI — scan, tail, and get stats from JSON, plain text, and CSV logs')
  .version('1.0.0');

// ─── Helpers ────────────────────────────────────────────────────────────────

function detectFormat(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.json' || ext === '.jsonl') return 'json';
  if (ext === '.csv') return 'csv';
  return 'text';
}

function getLines(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }
  return fs.readFileSync(filePath, 'utf-8').split(/\r?\n/);
}

// ─── Patterns ───────────────────────────────────────────────────────────────

const ERROR_PATTERNS = [
  /\b(error|err|fail|fatal|critical)\b/i,
  /\b(exception|traceback|stack\s?trace)\b/i,
  /\bE\d{4,5}\b/,
  /\bstatus\s*(:|=)\s*(4\d{2}|5\d{2})\b/i,
];

const WARN_PATTERNS = [
  /\b(warn|warning|deprecated|deprecation)\b/i,
  /\bW\d{4,5}\b/,
];

// ─── scan ───────────────────────────────────────────────────────────────────

program
  .command('scan <file>')
  .description('Scan a log file for errors, warnings, and patterns')
  .option('-f, --format <type>', 'Log format: text, json, csv (auto-detected if omitted)')
  .option('-p, --pattern <regex>', 'Custom regex pattern to search for')
  .option('-i, --ignore-case', 'Case-insensitive matching', false)
  .option('-c, --context <lines>', 'Lines of context around matches', '0')
  .action((file, opts) => {
    const format = opts.format || detectFormat(file);
    const lines = getLines(file);
    const context = parseInt(opts.context, 10) || 0;
    let matches = [];

    console.log(`\n🔍 Scanning: ${file} (format: ${format})\n`);

    if (opts.pattern) {
      const flags = opts.ignoreCase ? 'i' : '';
      const re = new RegExp(opts.pattern, flags);
      lines.forEach((line, idx) => {
        if (re.test(line)) matches.push({ line: idx + 1, content: line.trim(), type: 'custom' });
      });
    } else {
      lines.forEach((line, idx) => {
        for (const re of ERROR_PATTERNS) {
          if (re.test(line)) { matches.push({ line: idx + 1, content: line.trim(), type: 'error' }); break; }
        }
        for (const re of WARN_PATTERNS) {
          if (re.test(line)) { matches.push({ line: idx + 1, content: line.trim(), type: 'warn' }); break; }
        }
      });
    }

    if (matches.length === 0) {
      console.log('✅ No issues found.\n');
      return;
    }

    const seen = new Set();
    matches.forEach((m) => {
      const key = `${m.line}:${m.type}`;
      if (seen.has(key)) return;
      seen.add(key);

      const icon = m.type === 'error' ? '❌' : m.type === 'warn' ? '⚠️' : '🔎';
      console.log(`  ${icon} [${m.type.toUpperCase()}] Ln ${m.line}: ${m.content}`);

      if (context > 0) {
        const start = Math.max(0, m.line - context - 1);
        const end = Math.min(lines.length, m.line + context);
        for (let i = start; i < end; i++) {
          if (i === m.line - 1) continue;
          console.log(`     │ Ln ${i + 1}: ${(lines[i] || '').trim()}`);
        }
        console.log('');
      }
    });

    console.log(`\n📊 Summary: ${matches.length} issue(s) found in ${lines.length} lines.\n`);
  });

// ─── stats ──────────────────────────────────────────────────────────────────

program
  .command('stats <file>')
  .description('Display statistics about a log file')
  .option('-f, --format <type>', 'Log format: text, json, csv (auto-detected if omitted)')
  .option('--top-errors <n>', 'Show top N most frequent error messages', '5')
  .action((file, opts) => {
    const format = opts.format || detectFormat(file);
    const lines = getLines(file);
    const topN = parseInt(opts.topErrors, 10) || 5;

    console.log(`\n📈 Stats for: ${file}\n`);
    console.log(`  Format:        ${format}`);
    console.log(`  Total lines:   ${lines.length}`);
    console.log(`  File size:     ${(fs.statSync(file).size / 1024).toFixed(2)} KB`);

    let errors = 0;
    let warnings = 0;
    const errorMsgs = {};
    const warnMsgs = {};

    lines.forEach((line) => {
      for (const re of ERROR_PATTERNS) {
        if (re.test(line)) { errors++; break; }
      }
      for (const re of WARN_PATTERNS) {
        if (re.test(line)) { warnings++; break; }
      }
      // Collect unique messages
      for (const re of ERROR_PATTERNS) {
        if (re.test(line)) {
          const msg = line.replace(re, '***').trim().slice(0, 80);
          errorMsgs[msg] = (errorMsgs[msg] || 0) + 1;
          break;
        }
      }
    });

    const nonEmpty = lines.filter((l) => l.trim()).length;
    console.log(`  Errors:        ${errors}`);
    console.log(`  Warnings:      ${warnings}`);
    console.log(`  Error rate:    ${nonEmpty > 0 ? ((errors / nonEmpty) * 100).toFixed(2) : '0.00'}%`);

    if (Object.keys(errorMsgs).length > 0) {
      console.log(`\n  🔥 Top ${Math.min(topN, Object.keys(errorMsgs).length)} Error Messages:`);
      const sorted = Object.entries(errorMsgs).sort((a, b) => b[1] - a[1]).slice(0, topN);
      sorted.forEach(([msg, count]) => {
        console.log(`    [${count}x] ${msg}`);
      });
    }

    // Time range estimation if JSON logs with timestamps
    if (format === 'json') {
      const timestamps = [];
      lines.forEach((line) => {
        try {
          const obj = JSON.parse(line);
          const ts = obj.timestamp || obj.time || obj['@timestamp'] || obj.date || obj.ts;
          if (ts) timestamps.push(new Date(ts).getTime());
        } catch {}
      });
      if (timestamps.length >= 2) {
        const sorted = timestamps.filter(Boolean).sort();
        const first = new Date(sorted[0]);
        const last = new Date(sorted[sorted.length - 1]);
        console.log(`\n  ⏱️  Time span:    ${first.toISOString()} → ${last.toISOString()}`);
        console.log(`  Duration:     ${((sorted[sorted.length - 1] - sorted[0]) / 1000 / 60).toFixed(2)} minutes`);
      }
    }

    console.log('');
  });

// ─── tail ───────────────────────────────────────────────────────────────────

program
  .command('tail <file>')
  .description('Tail the last N lines of a log file (live follow with -f)')
  .option('-n, --lines <n>', 'Number of lines to show', '20')
  .option('-f, --follow', 'Follow the file for new lines (like tail -f)', false)
  .option('-p, --pattern <regex>', 'Filter lines by pattern')
  .option('-e, --errors-only', 'Show only error lines', false)
  .option('-w, --warnings-only', 'Show only warning lines', false)
  .action((file, opts) => {
    const numLines = parseInt(opts.lines, 10) || 20;

    if (!fs.existsSync(file)) {
      console.error(`Error: File not found: ${file}`);
      process.exit(1);
    }

    function printFiltered(lines) {
      let reFilter = null;
      if (opts.pattern) reFilter = new RegExp(opts.pattern, 'i');

      lines.forEach((line) => {
        let show = true;
        if (opts.errorsOnly) show = ERROR_PATTERNS.some((re) => re.test(line));
        if (opts.warningsOnly) show = WARN_PATTERNS.some((re) => re.test(line));
        if (reFilter) show = show && reFilter.test(line);
        if (show && line.trim()) {
          // Colorize
          let prefix = '  ';
          if (ERROR_PATTERNS.some((re) => re.test(line))) prefix = '❌ ';
          else if (WARN_PATTERNS.some((re) => re.test(line))) prefix = '⚠️ ';
          console.log(`${prefix}${line}`);
        }
      });
    }

    const content = fs.readFileSync(file, 'utf-8');
    const allLines = content.split(/\r?\n/);
    const tailLines = allLines.slice(-numLines);

    console.log(`\n📋 Tail of ${file} (last ${Math.min(numLines, tailLines.length)} lines):\n`);
    printFiltered(tailLines);

    if (opts.follow) {
      console.log(`\n👀 Following ${file} (Ctrl+C to stop)...\n`);
      let lastSize = fs.statSync(file).size;

      const watcher = fs.watch(file, () => {
        try {
          const newStat = fs.statSync(file);
          if (newStat.size > lastSize) {
            const stream = fs.createReadStream(file, { start: lastSize, encoding: 'utf-8' });
            let buf = '';
            stream.on('data', (chunk) => { buf += chunk; });
            stream.on('end', () => {
              const newLines = buf.split(/\r?\n/).filter(Boolean);
              printFiltered(newLines);
            });
            lastSize = newStat.size;
          }
        } catch {}
      });

      process.on('SIGINT', () => { watcher.close(); process.exit(0); });
    } else {
      console.log('');
    }
  });

program.parse(process.argv);

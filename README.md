# 🔍 Kryptorious LogGuard

**Log file analyzer CLI** — scan, tail, and get stats from JSON, plain text, and CSV log files. Built for developers who need to troubleshoot fast.

[![npm version](https://img.shields.io/npm/v/kryptorious-logguard)](https://www.npmjs.com/package/kryptorious-logguard)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🚀 Quick Start

```bash
npm install -g kryptorious-logguard
```

## 📋 Commands

### `logguard scan <file>`

Scan a log file for errors, warnings, and custom patterns.

```bash
# Auto-detect format and scan for errors/warnings
logguard scan app.log

# Scan with a custom regex pattern
logguard scan app.log --pattern "timeout|connection refused" --ignore-case

# Show 3 lines of context around each match
logguard scan app.log --context 3

# Scan JSON logs with explicit format
logguard scan logs.json --format json
```

### `logguard stats <file>`

Get detailed statistics about your log file.

```bash
# Basic stats
logguard stats app.log

# Show top 10 most frequent error messages
logguard stats app.log --top-errors 10

# Stats for JSON logs (includes time-range estimation)
logguard stats production.jsonl --format json
```

### `logguard tail <file>`

Tail the end of a log file, with live-follow support.

```bash
# Show last 50 lines
logguard tail app.log --lines 50

# Follow the file (like tail -f)
logguard tail app.log --follow

# Filter to errors only
logguard tail app.log --errors-only

# Filter by pattern
logguard tail app.log --pattern "POST /api" --follow
```

## 🎯 Supported Formats

| Format | Extensions | Description |
|--------|-----------|-------------|
| **Text** | `.log`, `.txt`, `.out` | Plain text log files (auto-detected by default) |
| **JSON** | `.json`, `.jsonl` | JSON and JSON Lines logs with timestamp extraction |
| **CSV** | `.csv` | CSV log exports |

## 📊 Example Output

```
🔍 Scanning: app.log (format: text)

  ❌ [ERROR] Ln 42: [2024-08-15 14:32:10] ERROR: Connection timeout to db.example.com:5432
  ❌ [ERROR] Ln 87: [2024-08-15 14:33:45] FATAL: Out of memory
  ⚠️ [WARN]  Ln 103: [2024-08-15 14:34:01] WARNING: Deprecated API v1 used

📊 Summary: 3 issue(s) found in 250 lines.
```

## ⭐ Premium Features

Unlock the full power of LogGuard with our **$9 lifetime license**:

- 🔧 **Custom rule definitions** — define your own error/warning patterns in `.logguardrc.json`
- 📊 **Team dashboards** — aggregate log stats across multiple servers
- 🤖 **AI-powered anomaly detection** — detect unusual patterns automatically
- 📧 **Priority support** — get help directly from the Kryptorious team
- 🔄 **Export reports** — generate PDF/HTML audit reports

👉 **[Get Premium — $9 Lifetime](https://kryptorious.gumroad.com/l/jbvet)**

---

## 🔗 Links

- **Premium License**: [kryptorious.gumroad.com/l/jbvet](https://kryptorious.gumroad.com/l/jbvet)
- **GitHub**: [github.com/CodeGero/kryptorious-logguard](https://github.com/CodeGero/kryptorious-logguard)
- **npm**: [npmjs.com/package/kryptorious-logguard](https://www.npmjs.com/package/kryptorious-logguard)

## 📜 License

MIT © [Kryptorious](https://github.com/CodeGero)

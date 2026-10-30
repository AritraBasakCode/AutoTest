# AutoTest AI

AutoTest AI is a local-first web app for running existing JavaScript/TypeScript unit and E2E scripts, viewing their output, and starting an authorized Strix security assessment against a registered codebase.

## Stack

- **Web app:** React + TypeScript + Vite
- **API:** FastAPI (Python)
- **Run history:** SQLite by default; PostgreSQL supported through `AUTOTEST_DATABASE_URL`
- **Unit/E2E:** the selected project's own npm, pnpm, Yarn, or Bun scripts (commonly Vitest/Jest and Playwright)
- **Pentesting:** Strix CLI, running its scan sandbox through Docker
- **Optional AI analysis:** Ollama on `127.0.0.1:11434` to explain failed run output

The brief recommends PostgreSQL. For zero setup the app uses SQLite at `backend/.data/autotest.sqlite3`; the API also supports PostgreSQL when configured.

## Start the app on Windows

Install the frontend packages and start the web app:

```powershell
npm install
npm run dev
```

In a second PowerShell window, install and start the API:

```powershell
py -3.14 -m venv .venv314
.\.venv314\Scripts\Activate.ps1
pip install -r backend/requirements.txt
python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

Use a fresh venv directory for each Python version; do not recreate a Python 3.14 venv over an existing Python 3.12 `.venv`.
If an older API server is already running, stop it with `Ctrl+C` in that terminal before starting this command, so it does not keep serving requests from the old environment.

Open the Vite address (normally `http://localhost:5173`). The API stays bound to loopback at `http://127.0.0.1:8000`; health is available at `/api/health`.

To use PostgreSQL instead of the default SQLite file, start the included local database and set the connection string before starting Uvicorn:

```powershell
docker compose up -d postgres
$env:AUTOTEST_DATABASE_URL = 'postgresql://autotest:autotest-local@127.0.0.1:5432/autotest'
python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

The compose credentials are for local development only. Keep the database port bound to loopback and change them before any shared deployment.

## Connect and run a project

1. Select **Connect local project** and enter the absolute path to its folder. It must contain `package.json`.
2. AutoTest AI detects the package manager from the lockfile and analyzes dependencies, scripts, source files, test files, and Playwright configuration.
3. If scripts are missing, choose **Analyze & generate scripts**. Existing scripts are preserved. When Vitest/Jest is already installed, AutoTest AI adds the appropriate unit command; when Playwright is already installed, it can add `test:e2e`. Otherwise it adds a guarded Node.js test-runner script for JavaScript tests and reports what setup is still needed.
4. Unit runs use the first available script from `test:unit`, `unit`, `test`. E2E runs use the first available script from `test:e2e`, `e2e`, `playwright`.
5. Expand a run to see its command, live output, completion state, and exit code. Runs have a 15-minute default timeout and can be cancelled.

Script setup does not invent meaningful test assertions. If the analysis finds no test files, add tests (or ask the optional AI assistant to help author them) before a passing run is possible. E2E tests also need a running application, browser installation, environment variables, and test data; AutoTest AI reports when Playwright is missing but does not install packages or start arbitrary project services automatically.

The runner starts the script in the registered project folder under the same operating-system user as the API. Treat a project as trusted before running its scripts: npm lifecycle scripts can execute arbitrary code with that user's permissions.

To try the full run flow immediately, connect `examples/sample-project`. It has a small Node unit suite and an HTTP end-to-end smoke test and needs no extra npm packages.

## Security assessments

For the Security card, install Strix, make sure Docker is running, and configure a Strix model provider. Strix supports local model endpoints as well as hosted providers. The security card stays disabled until Strix and Docker are detected. Starting a scan requires a second confirmation naming the registered local codebase. The app invokes Strix in non-interactive quick-scan mode against that path; it does not accept arbitrary URLs in this MVP.

Only scan code and systems you own or have explicit authorization to test. Strix is an autonomous security tool and can execute tools in its Docker sandbox. Review its [official setup and usage docs](https://github.com/usestrix/strix#readme) before enabling scans.

## Optional local AI explanations

Install and start Ollama, then pull a model supported by your machine. In AutoTest AI, open **AI assistant** and enter the installed model name. On failed runs, choose **Explain with AI**. The app sends the selected run's command and output only to the local Ollama API at `127.0.0.1:11434`; model output is advisory and cannot execute commands or modify files. See Ollama's [local chat API documentation](https://docs.ollama.com/api/chat).

## Current limitations

- Project discovery currently supports JavaScript/TypeScript `package.json` projects.
- Automatic script setup currently supports JavaScript/TypeScript `package.json` projects. It may add a helper file and update `package.json`; review these project-file changes.
- Test case/assertion generation is not yet automatic. E2E setup (application server, browser installation, environment variables, and test data) remains the project's responsibility.
- Strix is an optional external install; PentAGI is not wired into this MVP.
- Result records and console output are stored locally. Structured reports, screenshots, videos, coverage ingestion, and GitHub Actions are not included yet.

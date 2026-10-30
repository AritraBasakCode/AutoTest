import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import {
  Activity, ArrowRight, ArrowUpRight, Bell, Bug, Check, ChevronDown,
  ChevronRight, CircleHelp, Clock3, Command, FileCode2, FlaskConical,
  FolderGit2, Gauge, LockKeyhole, MoreHorizontal, Play, Plus, Search,
  Settings2, Shield, Sparkles, TerminalSquare, X, Zap,
} from 'lucide-react'
import { api, type Health, type Project, type ProjectAnalysis, type Run } from './api'

type KindFilter = 'all' | Run['kind']

function App() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [runs, setRuns] = useState<Run[]>([])
  const [analysis, setAnalysis] = useState<ProjectAnalysis | null>(null)
  const [health, setHealth] = useState<Health | null>(null)
  const [activeNav, setActiveNav] = useState('Overview')
  const [activeKind, setActiveKind] = useState<KindFilter>('all')
  const [notice, setNotice] = useState('')
  const [projectDialog, setProjectDialog] = useState(false)
  const [securityDialog, setSecurityDialog] = useState(false)
  const [aiDialog, setAiDialog] = useState(false)
  const [aiModel, setAiModel] = useState(() => window.localStorage.getItem('autotest-ai-model') ?? '')
  const [aiAnswer, setAiAnswer] = useState<Record<string, string>>({})
  const [aiBusyRun, setAiBusyRun] = useState('')
  const [projectPath, setProjectPath] = useState('')
  const [busy, setBusy] = useState(false)
  const [analysisBusy, setAnalysisBusy] = useState(false)
  const [expandedRun, setExpandedRun] = useState('')

  const project = projects.find((item) => item.id === selectedId) ?? null
  const loadProjects = useCallback(async () => {
    const result = await api.projects()
    setProjects(result)
    setSelectedId((current) => result.some((item) => item.id === current) ? current : result[0]?.id ?? '')
  }, [])
  const loadRuns = useCallback(async () => {
    if (!selectedId) { setRuns([]); return }
    setRuns(await api.runs(selectedId))
  }, [selectedId])

  useEffect(() => {
    api.health().then(setHealth).catch((error: Error) => setNotice(error.message))
    loadProjects().catch((error: Error) => setNotice(error.message))
  }, [loadProjects])

  useEffect(() => {
    loadRuns().catch((error: Error) => setNotice(error.message))
    const timer = window.setInterval(() => loadRuns().catch(() => undefined), 1800)
    return () => window.clearInterval(timer)
  }, [loadRuns])

  useEffect(() => {
    if (!selectedId) { setAnalysis(null); return }
    api.analyzeProject(selectedId).then(setAnalysis).catch((error: Error) => setNotice(error.message))
  }, [selectedId])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 6500)
    return () => window.clearTimeout(timer)
  }, [notice])

  const activeRun = runs.some((run) => run.status === 'running' || run.status === 'queued')
  const visibleRuns = useMemo(() => activeKind === 'all' ? runs : runs.filter((run) => run.kind === activeKind), [runs, activeKind])
  const passed = runs.filter((run) => run.status === 'passed').length
  const completed = runs.filter((run) => run.kind !== 'security' && ['passed', 'failed'].includes(run.status))
  const passRate = completed.length ? `${Math.round((passed / completed.length) * 100)}%` : '—'
  const avgDuration = useMemo(() => {
    const durations = runs.filter((run) => run.finished_at).map((run) => (Date.parse(run.finished_at!) - Date.parse(run.started_at)) / 1000).filter(Number.isFinite)
    return durations.length ? `${(durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1)}s` : '—'
  }, [runs])

  const addProject = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    try {
      const added = await api.addProject(projectPath.trim())
      await loadProjects()
      setSelectedId(added.id)
      setProjectPath('')
      setProjectDialog(false)
      setNotice(`Connected ${added.name}`)
    } catch (error) { setNotice((error as Error).message) }
    finally { setBusy(false) }
  }

  const removeProject = async () => {
    if (!project) return
    setBusy(true)
    try {
      await api.removeProject(project.id)
      await loadProjects()
      setNotice(`Removed ${project.name} from the workspace`)
    } catch (error) { setNotice((error as Error).message) }
    finally { setBusy(false) }
  }

  const startRun = async (kind: Run['kind'], confirmSecurityScope = false) => {
    if (!project) { setProjectDialog(true); return }
    if (kind === 'security' && !confirmSecurityScope) { setSecurityDialog(true); return }
    setBusy(true)
    try {
      const run = await api.startRun(project.id, kind, confirmSecurityScope)
      await loadRuns()
      setNotice(`${kind === 'security' ? 'Security assessment' : kind === 'e2e' ? 'E2E tests' : 'Unit tests'} queued`)
      setExpandedRun(run.id)
    } catch (error) { setNotice((error as Error).message) }
    finally { setBusy(false); setSecurityDialog(false) }
  }

  const cancelRun = async (run: Run) => {
    try { await api.cancelRun(run.id); await loadRuns(); setNotice('Run cancelled') }
    catch (error) { setNotice((error as Error).message) }
  }

  const setupTestScripts = async () => {
    if (!project) return
    setAnalysisBusy(true)
    try {
      const result = await api.setupTestScripts(project.id)
      setAnalysis(result.analysis)
      await loadProjects()
      const added = Object.entries(result.added_scripts).map(([name, command]) => `${name}: ${command}`)
      setNotice(added.length ? `Generated ${added.join(' · ')}` : 'Analysis complete; no safe script changes were needed')
    } catch (error) { setNotice((error as Error).message) }
    finally { setAnalysisBusy(false) }
  }

  const explainRun = async (run: Run) => {
    if (!aiModel.trim()) { setAiDialog(true); return }
    setAiBusyRun(run.id)
    try {
      const result = await api.explain({ model: aiModel.trim(), command: run.command, output: run.output || run.error || 'No output captured.', status: run.status })
      setAiAnswer((current) => ({ ...current, [run.id]: result.explanation }))
    } catch (error) { setNotice((error as Error).message) }
    finally { setAiBusyRun('') }
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Command size={19} strokeWidth={2.3} /></div><span>AutoTest<span className="brand-ai"> AI</span></span></div>
      <div className="workspace-select"><div className="workspace-avatar">P</div><span className="workspace-text"><b>Local workspace</b><small>Runs stay on this machine</small></span><ChevronDown size={15} /></div>
      <div className="side-label">PROJECT</div>
      <div className="project-picker"><FolderGit2 size={15}/><select aria-label="Choose project" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}><option value="">No project connected</option>{projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><ChevronDown size={14}/></div>
      <button className="add-project-side" onClick={() => setProjectDialog(true)}><Plus size={14}/> Connect local project</button>
      <div className="side-label nav-label">TESTING</div>
      <nav>{[{ label: 'Overview', icon: Gauge }, { label: 'Test runs', icon: Activity, count: String(runs.length) }, { label: 'AI assistant', icon: Sparkles, badge: aiModel ? 'Local' : 'Setup' }].map(({ label, icon: Icon, count, badge }) => <button key={label} className={`nav-item ${activeNav === label ? 'selected' : ''}`} onClick={() => { setActiveNav(label); if (label === 'AI assistant') setAiDialog(true) }}><Icon size={17} strokeWidth={1.8}/><span>{label}</span>{count && <em>{count}</em>}{badge && <small>{badge}</small>}</button>)}</nav>
      <div className="side-label nav-label">PROJECT</div>
      <nav><button className="nav-item" onClick={() => setNotice('Coverage is reported by your project test runner when available')}><FileCode2 size={17}/><span>Code coverage</span></button><button className="nav-item" onClick={removeProject} disabled={!project || busy}><Settings2 size={17}/><span>Remove project</span></button></nav>
      <div className="sidebar-bottom"><div className="usage-card"><div className="usage-title"><Activity size={14}/><b>Local runner</b><span>{health?.status === 'ok' ? 'Ready' : 'Offline'}</span></div><div className="usage-track"><span style={{ width: health?.status === 'ok' ? '100%' : '15%' }}/></div><small>API · {health?.database ?? 'local DB'}</small></div><div className="profile"><div className="profile-avatar">L</div><span><b>Local session</b><small>Private to this machine</small></span></div></div>
    </aside>

    <main className="main-content">
      <header className="topbar"><div className="breadcrumbs"><span>Projects</span><ChevronRight size={14}/><b>{project?.name ?? 'Connect a project'}</b></div><div className="top-actions"><span className={`connection-label ${health?.status === 'ok' ? 'online' : ''}`}><i/>{health?.status === 'ok' ? 'API connected' : 'API offline'}</span><button className="icon-button" aria-label="Search runs" onClick={() => setNotice('Use the run type filters to find recent runs')}><Search size={17}/></button><button className="icon-button notification" aria-label="Notifications"><Bell size={17}/></button><div className="top-divider"/><button className="help-link" onClick={() => setNotice('See README.md for setup and runner requirements')}><CircleHelp size={16}/> Help</button></div></header>
      <div className="page-content">
        <div className="page-heading"><div><div className="eyebrow"><span className={`live-dot ${health?.status === 'ok' ? '' : 'offline'}`}/>{project ? 'CONNECTED LOCAL PROJECT' : 'LOCAL TEST WORKSPACE'}</div><h1>{project ? project.name : 'Run your project tests.'}</h1><p>{project ? 'Run the scripts discovered in this project and inspect their output.' : 'Connect a JavaScript or TypeScript project folder to get started.'}</p></div><button className="primary-button" disabled={!project || activeRun || busy || !project.unit_script} onClick={() => startRun('unit')}><Play size={15} fill="currentColor"/> Run unit tests</button></div>

        {project ? <>
          <div className="project-banner"><div className="project-info"><div className="repo-icon"><TerminalSquare size={21}/></div><div><div className="project-name">{project.name} <span className="branch-pill"><FolderGit2 size={12}/> {project.manager}</span></div><div className="project-path">{project.root} <span className="path-dot">·</span> {project.scripts.length} package scripts discovered</div></div></div><div className="banner-divider"/><div className="runtime-info"><span className={`runtime-light ${health?.status === 'ok' ? '' : 'offline'}`}/><span>{health?.status === 'ok' ? 'Local API ready' : 'Start API server'}</span><span className="runtime-divider">·</span><span>{health?.strix_available ? 'Strix available' : 'Strix not installed'}</span></div><button className="banner-action" onClick={() => setProjectDialog(true)}><Plus size={17}/></button></div>
          {analysis && <section className="analysis-panel"><div className="analysis-icon"><Sparkles size={17}/></div><div className="analysis-content"><div className="analysis-title">Codebase test analysis <span>{analysis.package_manager}</span></div><p>Found {analysis.source_file_count} source files · {analysis.unit_test_file_count} unit test files · {analysis.e2e_test_file_count} E2E test files</p><div className="analysis-detections"><span>Unit runner: <b>{analysis.unit_runner ?? 'not detected'}</b></span><span>E2E runner: <b>{analysis.e2e_runner ?? 'not detected'}</b></span></div>{analysis.unit_test_file_count === 0 && <small className="analysis-warning">No unit tests were found. Add test files before expecting meaningful pass/fail results.</small>}{analysis.missing_e2e_script && !analysis.playwright_installed && <small className="analysis-warning">Playwright is not installed. Add <code>@playwright/test</code> and E2E tests to enable E2E runs.</small>}</div>{(analysis.missing_unit_script || (analysis.missing_e2e_script && analysis.playwright_installed)) && <button className="setup-tests-button" disabled={analysisBusy} onClick={setupTestScripts}>{analysisBusy ? 'Analyzing…' : 'Analyze & generate scripts'} <ArrowRight size={14}/></button>}</section>}
          <section className="metrics-grid"><Metric icon={<Check size={17}/>} label="Pass rate" value={passRate} change={`${passed} passed`} note={`${completed.length} completed runs`} tone="green" chart="pass"/><Metric icon={<Clock3 size={17}/>} label="Average runtime" value={avgDuration} change={`${runs.length} total`} note="for this project" tone="blue" chart="time"/><Metric icon={<Shield size={17}/>} label="Security runs" value={String(runs.filter((run) => run.kind === 'security').length)} change={health?.strix_available ? 'Strix ready' : 'Setup required'} note="local codebase scope" tone="orange" chart="security"/></section>
          <section className="test-cards-section"><div className="section-heading"><div><h2>Run a test suite</h2><p>Uses scripts declared in <b>package.json</b>.</p></div><button className="text-button" onClick={() => setActiveNav('Test runs')}>Run history <ArrowRight size={15}/></button></div><div className="test-cards">
            <TestCard icon={<FlaskConical size={18}/>} tone="purple" title="Unit tests" tag="UNIT" detail="Runs the discovered test:unit, unit, or test script." meta={project.unit_script ? `${project.manager} run ${project.unit_script}` : 'Add test:unit or test script'} disabled={!project.unit_script || activeRun || busy} onRun={() => startRun('unit')}/>
            <TestCard icon={<Activity size={18}/>} tone="blue" title="E2E tests" tag="PLAYWRIGHT" detail="Runs test:e2e, e2e, or playwright from package.json." meta={project.e2e_script ? `${project.manager} run ${project.e2e_script}` : 'Add test:e2e or e2e script'} disabled={!project.e2e_script || activeRun || busy} onRun={() => startRun('e2e')}/>
            <TestCard icon={<LockKeyhole size={18}/>} tone="orange" title="Security assessment" tag="STRIX" detail="Runs Strix against this local codebase in its Docker sandbox." meta={health?.strix_available && health.docker_available ? 'Requires explicit scope confirmation' : 'Install Strix + Docker + model'} disabled={!health?.strix_available || !health?.docker_available || activeRun || busy} onRun={() => startRun('security')}/>
          </div></section>
          <section className="runs-section"><div className="section-heading runs-heading"><div><h2>{activeNav === 'Test runs' ? 'Test run history' : 'Recent activity'}</h2><p>Live status, exit codes, and captured runner output.</p></div><button className="icon-button more-runs" onClick={() => loadRuns()} aria-label="Refresh runs"><MoreHorizontal size={19}/></button></div>
            <div className="run-filters">{(['all', 'unit', 'e2e', 'security'] as const).map((kind) => <button key={kind} className={activeKind === kind ? 'filter-active' : ''} onClick={() => setActiveKind(kind)}>{kind === 'all' ? 'All runs' : kind === 'e2e' ? 'E2E' : kind === 'security' ? 'Security' : 'Unit'}</button>)}</div>
            <div className="run-table"><div className="table-head"><span>RUN</span><span>TYPE</span><span>STATUS</span><span>STARTED</span><span/></div>
              {visibleRuns.length ? visibleRuns.map((run) => <div className="run-row-wrap" key={run.id}><div className="run-row"><div className="run-title"><div className={`run-icon ${run.kind}`}><RunIcon kind={run.kind}/></div><div><b>{run.kind === 'unit' ? 'Unit tests' : run.kind === 'e2e' ? 'E2E tests' : 'Security assessment'}</b><small>{run.command}</small></div></div><span className={`type-label ${run.kind}`}>{run.kind.toUpperCase()}</span><span><Status status={run.status}/></span><span className="time-label">{new Date(run.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span><button className="row-arrow" onClick={() => setExpandedRun(expandedRun === run.id ? '' : run.id)} aria-label="Show run output"><ArrowUpRight size={16}/></button></div>{expandedRun === run.id && <div className="run-output"><div className="output-bar"><span>RUN OUTPUT</span>{run.exit_code !== null && <b>Exit code {run.exit_code}</b>}{['queued', 'running'].includes(run.status) && <button onClick={() => cancelRun(run)}>Cancel run</button>}{run.status === 'failed' && <button className="ai-explain" disabled={!!aiBusyRun} onClick={() => explainRun(run)}><Sparkles size={12}/>{aiBusyRun === run.id ? 'Asking local model…' : 'Explain with AI'}</button>}</div>{run.error && <p className="run-error">{run.error}</p>}<pre>{run.output || (run.status === 'queued' || run.status === 'running' ? 'Waiting for process output…' : 'No output was captured.')}</pre>{aiAnswer[run.id] && <div className="ai-answer"><b><Sparkles size={13}/> Local model analysis</b><p>{aiAnswer[run.id]}</p></div>}</div>}</div>) : <div className="empty-runs"><Activity size={20}/><b>No runs yet</b><span>Start a test suite to see live results and logs here.</span></div>}
            </div>
          </section>
        </> : <div className="welcome-card"><div className="welcome-icon"><FolderGit2 size={24}/></div><h2>Connect a local project</h2><p>AutoTest AI reads its package scripts, then runs the selected test command inside that project folder. Nothing is uploaded.</p><button className="primary-button" onClick={() => setProjectDialog(true)}><Plus size={15}/> Choose project folder</button><small>Current support: JavaScript and TypeScript projects with package.json.</small></div>}
        <footer className="footer"><span><span className={`footer-dot ${health?.status === 'ok' ? '' : 'offline'}`}/> {health?.status === 'ok' ? 'Local API connected' : 'Local API unavailable'}</span><span>AutoTest AI <b>0.2.0</b></span></footer>
      </div>
    </main>

    {projectDialog && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setProjectDialog(false)}><form className="modal" onSubmit={addProject}><button type="button" className="modal-close" onClick={() => setProjectDialog(false)} aria-label="Close"><X size={18}/></button><div className="modal-kicker">LOCAL PROJECT</div><h2>Connect a project</h2><p>Enter the absolute path to a JavaScript or TypeScript project folder on this machine.</p><label htmlFor="project-path">Project folder path</label><input id="project-path" autoFocus placeholder={navigator.platform.startsWith('Win') ? 'C:\\Users\\you\\Projects\\my-app' : '/Users/you/Projects/my-app'} value={projectPath} onChange={(event) => setProjectPath(event.target.value)}/><div className="modal-note">The local API will read package.json and save the path on this machine. It will run only scripts you start.</div><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setProjectDialog(false)}>Cancel</button><button className="primary-button" disabled={!projectPath.trim() || busy}>{busy ? 'Connecting…' : 'Connect project'}</button></div></form></div>}

    {securityDialog && <div className="modal-backdrop"><div className="modal"><button className="modal-close" onClick={() => setSecurityDialog(false)} aria-label="Close"><X size={18}/></button><div className="modal-kicker security-kicker">AUTHORIZED SECURITY TEST</div><h2>Confirm scan scope</h2><p>Strix runs an autonomous security assessment against the registered local codebase. Its agent can execute tools inside its Docker sandbox.</p><div className="scope-box"><Shield size={16}/><div><b>{project?.name}</b><small>{project?.root}</small></div></div><div className="modal-note">Only proceed if you own this project or have explicit authorization. The scan uses your configured Strix model provider.</div><div className="modal-actions"><button className="secondary-button" onClick={() => setSecurityDialog(false)}>Cancel</button><button className="primary-button security-button" disabled={busy} onClick={() => startRun('security', true)}><Play size={14} fill="currentColor"/> Confirm and scan</button></div></div></div>}

    {aiDialog && <div className="modal-backdrop"><form className="modal" onSubmit={(event) => { event.preventDefault(); window.localStorage.setItem('autotest-ai-model', aiModel.trim()); setAiDialog(false); setNotice('Local model saved') }}><button type="button" className="modal-close" onClick={() => setAiDialog(false)} aria-label="Close"><X size={18}/></button><div className="modal-kicker">OPTIONAL LOCAL AI</div><h2>Connect an Ollama model</h2><p>AutoTest AI can send a failed run’s command and captured output to Ollama on this machine for a plain-language explanation. The app never sends it to a hosted model.</p><label htmlFor="ai-model">Installed model name</label><input id="ai-model" placeholder="for example, qwen2.5-coder:7b" value={aiModel} onChange={(event) => setAiModel(event.target.value)}/><div className="modal-note">Start Ollama at its default local address and pull the model first. See the README for setup. Analysis is advisory and does not run commands or edit files.</div><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => { setAiModel(''); window.localStorage.removeItem('autotest-ai-model'); setAiDialog(false) }}>Disconnect</button><button className="primary-button" disabled={!aiModel.trim()}>Save model</button></div></form></div>}

    {notice && <div className="toast"><div className="toast-icon"><Check size={15}/></div><span>{notice}</span><button onClick={() => setNotice('')}>×</button></div>}
  </div>
}

function RunIcon({ kind }: { kind: Run['kind'] }) { return kind === 'unit' ? <FlaskConical size={16}/> : kind === 'e2e' ? <Activity size={16}/> : <Shield size={16}/> }
function Metric({ icon, label, value, change, note, tone, chart }: { icon: ReactNode; label: string; value: string; change: string; note: string; tone: string; chart: string }) { return <div className="metric-card"><div className="metric-top"><div className={`metric-icon ${tone}`}>{icon}</div><span>{label}</span><button aria-label="Metric information"><CircleHelp size={14}/></button></div><div className="metric-main"><strong>{value}</strong><div className="metric-chart" aria-hidden="true"><Chart type={chart}/></div></div><div className="metric-bottom"><span className={`metric-change ${tone}`}>{change}</span><span>{note}</span></div></div> }
function Chart({ type }: { type: string }) { const lines: Record<string, string> = { pass: 'M1 25 C12 22 18 24 27 16 S40 18 48 12 S60 16 68 7 S79 11 89 4', time: 'M1 8 C11 9 16 16 27 13 S40 17 50 20 S61 15 68 19 S79 12 89 17', security: 'M1 6 C14 8 14 19 29 15 S40 22 53 20 S68 13 76 17 S84 13 89 12' }; return <svg viewBox="0 0 90 30" preserveAspectRatio="none"><path d={lines[type]}/></svg> }
function TestCard({ icon, tone, title, tag, detail, meta, disabled, onRun }: { icon: ReactNode; tone: string; title: string; tag: string; detail: string; meta: string; disabled: boolean; onRun: () => void }) { return <article className={`test-card ${disabled ? 'test-card-disabled' : ''}`}><div className="test-card-top"><div className={`suite-icon ${tone}`}>{icon}</div><span className={`suite-tag ${tone}`}>{tag}</span></div><h3>{title}</h3><p>{detail}</p><div className="test-card-bottom"><span title={meta}>{meta}</span><button disabled={disabled} onClick={onRun}>Run <ArrowRight size={14}/></button></div></article> }
function Status({ status }: { status: Run['status'] }) { const Icon = status === 'passed' ? Check : status === 'failed' ? Bug : status === 'cancelled' ? X : Zap; const label = status[0].toUpperCase() + status.slice(1); return <span className={`status ${status}`}><Icon size={13}/>{label}</span> }

export default App

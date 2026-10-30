export type Project = {
  id: string
  name: string
  root: string
  manager: string
  scripts: string[]
  unit_script: string | null
  e2e_script: string | null
  created_at: string
}

export type Run = {
  id: string
  project_id: string
  kind: 'unit' | 'e2e' | 'security'
  status: 'queued' | 'running' | 'passed' | 'failed' | 'cancelled'
  command: string
  started_at: string
  finished_at: string | null
  exit_code: number | null
  output: string
  error: string | null
}

export type Health = {
  status: string
  strix_available: boolean
  docker_available: boolean
  database: string
}

export type ProjectAnalysis = {
  project_name: string
  root: string
  package_manager: string
  source_file_count: number
  unit_test_files: string[]
  e2e_test_files: string[]
  unit_test_file_count: number
  e2e_test_file_count: number
  unit_runner: string | null
  e2e_runner: string | null
  playwright_installed: boolean
  playwright_config: boolean
  unit_script: string | null
  e2e_script: string | null
  missing_unit_script: boolean
  missing_e2e_script: boolean
  test_frameworks: string[]
  scripts: Record<string, string>
}

const API_ROOT = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_ROOT}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    })
  } catch {
    throw new Error('Cannot reach the local AutoTest API. Start the backend and refresh.')
  }
  if (!response.ok) {
    const data = await response.json().catch(() => null) as { detail?: string } | null
    throw new Error(data?.detail ?? `Request failed (${response.status})`)
  }
  return response.json() as Promise<T>
}

export const api = {
  health: () => request<Health>('/health'),
  projects: () => request<Project[]>('/projects'),
  analyzeProject: (id: string) => request<ProjectAnalysis>(`/projects/${id}/analysis`),
  setupTestScripts: (id: string) => request<{ analysis: ProjectAnalysis; added_scripts: Record<string, string>; helper_created: boolean; unit_tests_found: number; e2e_tests_found: number; e2e_setup_required: boolean }>(`/projects/${id}/setup-tests`, { method: 'POST' }),
  addProject: (path: string) => request<Project>('/projects', { method: 'POST', body: JSON.stringify({ path }) }),
  removeProject: (id: string) => request<{ status: string }>(`/projects/${id}`, { method: 'DELETE' }),
  runs: (projectId: string) => request<Run[]>(`/projects/${projectId}/runs`),
  startRun: (projectId: string, kind: Run['kind'], confirmSecurityScope = false) => request<Run>(`/projects/${projectId}/runs`, {
    method: 'POST', body: JSON.stringify({ kind, confirm_security_scope: confirmSecurityScope }),
  }),
  cancelRun: (runId: string) => request<{ status: string }>(`/runs/${runId}/cancel`, { method: 'POST' }),
  explain: (input: { model: string; command: string; output: string; status: Run['status'] }) => request<{ model: string; explanation: string }>('/ai/explain', { method: 'POST', body: JSON.stringify(input) }),
}

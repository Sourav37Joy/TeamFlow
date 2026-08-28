export interface Warning {
  code: string;
  message: string;
  employeeName?: string;
  resultingPercent?: number;
  capacityPercent?: number;
  onDate?: string | null;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Array<{ field: string; permitted: string; code: string }>;
  warnings?: Warning[];
  wouldRemove?: AssignmentRow[];
  ruleCode?: string;
  action?: string;
  requiredRole?: string;
  [extra: string]: unknown;
}

export class ApiFailure extends Error {
  constructor(
    readonly status: number,
    readonly error: ApiError,
  ) {
    super(error.message);
  }
}

// The single door to /api. Every screen renders what the server returns and computes no
// derived figure of its own (Constitution II).
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error: ApiError = payload?.error ?? {
      code: 'UNKNOWN',
      message: `Request failed with status ${response.status}.`,
    };
    throw new ApiFailure(response.status, error);
  }

  return payload as T;
}

// A refusal already names the offending field and what it permits; more than one field is
// listed in full rather than summarised away (FR-078).
export function failureText(failure: unknown): string {
  if (!(failure instanceof ApiFailure)) return 'The request could not be completed.';
  const details = failure.error.details ?? [];
  if (details.length > 1) {
    return details.map((detail) => `${detail.field}: permitted ${detail.permitted}`).join('; ');
  }
  return failure.error.message;
}

const query = (params: Record<string, string | undefined>) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const text = search.toString();
  return text ? `?${text}` : '';
};

const send = <T>(path: string, method: string, body?: unknown) =>
  api<T>(path, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });

/* Session */

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  role: 'PROJECT_MANAGER' | 'ADMINISTRATOR';
}

export const signIn = (email: string, password: string) =>
  send<SessionUser>('/session', 'POST', { email, password });

export const currentSession = () => api<SessionUser>('/session');

export const signOut = () => send<{ signedOut: boolean }>('/session', 'DELETE');

/* Catalogues */

export interface CatalogueEntry {
  id: string;
  name: string;
}

export const listSkills = (q?: string) =>
  api<{ skills: CatalogueEntry[] }>(`/skills${query({ q })}`);

export const listRoles = (q?: string) => api<{ roles: CatalogueEntry[] }>(`/roles${query({ q })}`);

export const createSkill = (name: string) => send<CatalogueEntry>('/skills', 'POST', { name });

export const createRole = (name: string) => send<CatalogueEntry>('/roles', 'POST', { name });

/* Employees */

export interface RatedSkill {
  skillId: string;
  skillName: string;
  rating: number;
}

export interface EmployeeRow {
  id: string;
  name: string;
  roleTitle: string;
  totalCapacityPercent: number;
  skills: RatedSkill[];
}

export interface EmployeeDetail extends EmployeeRow {
  assignments: AssignmentRow[];
}

export interface EmployeeInput {
  name: string;
  roleTitle: string;
  totalCapacityPercent: number;
  skills?: Array<{ skillId: string; rating: number }>;
}

export const listEmployees = (params: { q?: string; skillId?: string } = {}) =>
  api<{ employees: EmployeeRow[] }>(`/employees${query(params)}`);

export const readEmployee = (id: string) => api<EmployeeDetail>(`/employees/${id}`);

export const createEmployee = (body: EmployeeInput) =>
  send<EmployeeRow>('/employees', 'POST', body);

export const updateEmployee = (id: string, body: Partial<Omit<EmployeeInput, 'skills'>>) =>
  send<EmployeeRow>(`/employees/${id}`, 'PATCH', body);

export const deleteEmployee = (id: string, confirm = false) =>
  send<{ deleted: boolean; removedAssignments: number }>(
    `/employees/${id}${confirm ? '?confirm=true' : ''}`,
    'DELETE',
  );

export const setEmployeeSkill = (id: string, skillId: string, rating: number) =>
  send<EmployeeRow>(`/employees/${id}/skills/${skillId}`, 'PUT', { rating });

export const removeEmployeeSkill = (id: string, skillId: string) =>
  send<EmployeeRow>(`/employees/${id}/skills/${skillId}`, 'DELETE');

/* Projects */

export const PROJECT_STATUSES = ['PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export interface ProjectRow {
  id: string;
  name: string;
  status: ProjectStatus;
}

export interface RequirementRow {
  id: string;
  projectId: string;
  roleId: string;
  roleName: string;
  requiredSkillId: string;
  requiredSkillName: string;
  headcount: number;
}

export interface ProjectDetail extends ProjectRow {
  requirements: RequirementRow[];
  assignments: AssignmentRow[];
}

export interface RequirementInput {
  roleId: string;
  requiredSkillId: string;
  headcount: number;
}

export const listProjects = (params: { q?: string; status?: string } = {}) =>
  api<{ projects: ProjectRow[] }>(`/projects${query(params)}`);

export const readProject = (id: string) => api<ProjectDetail>(`/projects/${id}`);

export const createProject = (body: {
  name: string;
  status: ProjectStatus;
  requirements?: RequirementInput[];
}) => send<ProjectDetail>('/projects', 'POST', body);

export const updateProject = (id: string, body: { name?: string; status?: ProjectStatus }) =>
  send<ProjectDetail>(`/projects/${id}`, 'PATCH', body);

export const deleteProject = (id: string, confirm = false) =>
  send<{ deleted: boolean; removedAssignments: number }>(
    `/projects/${id}${confirm ? '?confirm=true' : ''}`,
    'DELETE',
  );

export const addRequirement = (projectId: string, body: RequirementInput) =>
  send<RequirementRow>(`/projects/${projectId}/requirements`, 'POST', body);

export const updateRequirement = (
  projectId: string,
  requirementId: string,
  body: { headcount?: number; requiredSkillId?: string },
) => send<RequirementRow>(`/projects/${projectId}/requirements/${requirementId}`, 'PATCH', body);

export const removeRequirement = (projectId: string, requirementId: string) =>
  send<{ deleted: boolean }>(`/projects/${projectId}/requirements/${requirementId}`, 'DELETE');

/* Assignments */

export interface AssignmentRow {
  id: string;
  employeeId: string;
  employeeName: string;
  projectId: string;
  projectName: string;
  roleId: string;
  roleName: string;
  allocationPercent: number;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssignmentInput {
  employeeId: string;
  projectId: string;
  roleId: string;
  allocationPercent: number;
  startDate: string;
  endDate: string;
  acknowledgeWarnings?: boolean;
}

export interface AssignmentWrite {
  warnings: Warning[];
  assignment: AssignmentRow | null;
}

export const listAssignments = (
  params: { employeeId?: string; projectId?: string; roleId?: string; asOf?: string } = {},
) => api<{ asOf: string | null; assignments: AssignmentRow[] }>(`/assignments${query(params)}`);

export const createAssignment = (body: AssignmentInput) =>
  send<AssignmentWrite>('/assignments', 'POST', body);

export const updateAssignment = (
  id: string,
  body: Partial<Pick<AssignmentInput, 'roleId' | 'allocationPercent' | 'startDate' | 'endDate'>> & {
    acknowledgeWarnings?: boolean;
  },
) => send<AssignmentWrite>(`/assignments/${id}`, 'PATCH', body);

export const deleteAssignment = (id: string) =>
  send<{ deleted: boolean }>(`/assignments/${id}`, 'DELETE');

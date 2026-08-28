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

/* Shared derived vocabulary - the server owns every one of these values */

export const LOAD_LABELS = [
  'UNASSIGNED',
  'AVAILABLE',
  'BALANCED',
  'HIGH_LOAD',
  'OVERALLOCATED',
] as const;

export type LoadLabel = (typeof LOAD_LABELS)[number];

export const LOAD_LABEL_TEXT: Record<LoadLabel, string> = {
  UNASSIGNED: 'Unassigned',
  AVAILABLE: 'Available',
  BALANCED: 'Balanced',
  HIGH_LOAD: 'High load',
  OVERALLOCATED: 'Overallocated',
};

export const STAFFING_STATUSES = [
  'FULLY_STAFFED',
  'UNDERSTAFFED',
  'OVERSTAFFED',
  'NO_REQUIREMENTS_DECLARED',
] as const;

export type StaffingStatus = (typeof STAFFING_STATUSES)[number];

export const STAFFING_STATUS_TEXT: Record<StaffingStatus, string> = {
  FULLY_STAFFED: 'Fully staffed',
  UNDERSTAFFED: 'Understaffed',
  OVERSTAFFED: 'Overstaffed',
  NO_REQUIREMENTS_DECLARED: 'No requirements declared',
};

export const PROJECT_STATUSES = ['PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_STATUS_TEXT: Record<ProjectStatus, string> = {
  PLANNED: 'Planned',
  ACTIVE: 'Active',
  ON_HOLD: 'On hold',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

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

export interface Load {
  utilizationPercent: number;
  remainingCapacityPercent: number;
  loadLabel: LoadLabel;
}

export interface EmployeeRow extends Load {
  id: string;
  name: string;
  roleTitle: string;
  totalCapacityPercent: number;
  avatarUrl: string | null;
  skills: RatedSkill[];
}

export interface HeldAssignment extends AssignmentRow {
  standing: 'ACTIVE' | 'EXPIRED' | 'FUTURE';
}

export interface EmployeeDetail extends EmployeeRow {
  asOf: string;
  assignments: HeldAssignment[];
  replacementHistory: ReplacementHistoryRow[];
}

export interface EmployeeInput {
  name: string;
  roleTitle: string;
  totalCapacityPercent: number;
  skills?: Array<{ skillId: string; rating: number }>;
}

export const listEmployees = (
  params: { q?: string; skillId?: string; loadLabel?: string; asOf?: string } = {},
) => api<{ asOf: string; employees: EmployeeRow[] }>(`/employees${query(params)}`);

export const readEmployee = (id: string, asOf?: string) =>
  api<EmployeeDetail>(`/employees/${id}${query({ asOf })}`);

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

export interface ProjectRow {
  id: string;
  name: string;
  status: ProjectStatus;
  staffingStatus: StaffingStatus;
  totalShortfall: number;
  producesGaps: boolean;
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

export interface FillerRow {
  employeeId: string;
  employeeName: string;
  employeeAvatarUrl: string | null;
  allocationPercent: number;
  assignmentId: string;
}

export interface RequirementStaffingRow {
  requirementId: string;
  roleId: string;
  roleName: string;
  requiredSkillId: string;
  requiredSkillName: string;
  requiredHeadcount: number;
  filledHeadcount: number;
  shortfall: number;
  surplus: number;
  fillers: FillerRow[];
}

export interface ProjectStaffing {
  projectId: string;
  projectName: string;
  status: ProjectStatus;
  asOf: string;
  staffingStatus: StaffingStatus;
  totalShortfall: number;
  producesGaps: boolean;
  requirements: RequirementStaffingRow[];
  unrequestedRoles: Array<{
    roleId: string;
    roleName: string;
    headcount: number;
    fillers: FillerRow[];
  }>;
}

export interface ProjectDetail {
  id: string;
  name: string;
  status: ProjectStatus;
  asOf: string;
  staffing: ProjectStaffing;
  requirements: RequirementRow[];
  assignments: AssignmentRow[];
}

export interface RequirementInput {
  roleId: string;
  requiredSkillId: string;
  headcount: number;
}

export const listProjects = (
  params: { q?: string; status?: string; staffingStatus?: string; asOf?: string } = {},
) => api<{ asOf: string; projects: ProjectRow[] }>(`/projects${query(params)}`);

export const readProject = (id: string, asOf?: string) =>
  api<ProjectDetail>(`/projects/${id}${query({ asOf })}`);

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
  employeeAvatarUrl: string | null;
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

/* Replacement */

export interface ReplacementHistoryRow {
  id: string;
  effectiveDate: string;
  outgoingEmployeeId: string;
  outgoingEmployeeName: string;
  outgoingEmployeeAvatarUrl: string | null;
  incomingEmployeeId: string | null;
  incomingEmployeeName: string | null;
  incomingEmployeeAvatarUrl: string | null;
  projectName: string | null;
  roleName: string | null;
  performedByUserId: string;
  performedByName: string;
  performedAt: string;
  outgoingAssignmentId: string | null;
  incomingAssignmentId: string | null;
}

export interface ReplacementInput {
  incomingEmployeeId: string;
  effectiveDate: string;
  allocationPercent?: number;
  endDate?: string;
  acknowledgeWarnings?: boolean;
}

export interface ReplacementResult {
  warnings: Warning[];
  effectiveDate: string;
  outgoingEmployeeName: string;
  incomingEmployeeName: string;
  outgoingRemoved: boolean;
  outgoingEndsOn: string | null;
  incoming: AssignmentRow | null;
  outgoing: AssignmentRow | null;
}

export const replaceOnAssignment = (id: string, body: ReplacementInput, dryRun = false) =>
  send<ReplacementResult>(
    `/assignments/${id}/replacement${dryRun ? '?dryRun=true' : ''}`,
    'POST',
    body,
  );

/* Candidates */

export interface Candidate {
  employeeId: string;
  name: string;
  avatarUrl: string | null;
  skillRating: number;
  skillComponent: number;
  capacityComponent: number;
  overallScore: number;
}

export interface Shortlist {
  asOf: string;
  requiredSkillId: string | null;
  requiredSkillName: string | null;
  candidates: Candidate[];
  reason: string | null;
  message: string | null;
}

export interface RequirementShortlist extends Shortlist {
  projectId: string;
  requirementId: string;
  shortfall: number;
}

export interface ReplacementShortlist extends Shortlist {
  assignmentId: string;
  outgoingEmployeeId?: string;
}

export const requirementCandidates = (projectId: string, requirementId: string, asOf?: string) =>
  api<RequirementShortlist>(
    `/projects/${projectId}/requirements/${requirementId}/candidates${query({ asOf })}`,
  );

export const replacementCandidates = (assignmentId: string, asOf?: string) =>
  api<ReplacementShortlist>(
    `/assignments/${assignmentId}/replacement-candidates${query({ asOf })}`,
  );

/* Derived reads */

export interface PersonGroup {
  kind: 'person';
  id: string;
  name: string;
  avatarUrl: string | null;
  roleTitle: string;
  totalCommittedPercent: number;
  remainingCapacityPercent: number;
  loadLabel: LoadLabel;
  rows: AssignmentRow[];
}

export interface ProjectGroup {
  kind: 'project';
  id: string;
  name: string;
  status: ProjectStatus;
  assignedHeadcount: number;
  rows: AssignmentRow[];
}

export interface AllocationOverview {
  asOf: string;
  groupBy: 'person' | 'project';
  rowCount: number;
  groups: Array<PersonGroup | ProjectGroup>;
  reason: string | null;
}

export const allocationOverview = (
  params: {
    groupBy?: string;
    q?: string;
    skillId?: string;
    roleId?: string;
    asOf?: string;
  } = {},
) => api<AllocationOverview>(`/allocation-overview${query(params)}`);

export interface OverallocatedEntry {
  employeeId: string;
  name: string;
  avatarUrl: string | null;
  roleTitle: string;
  utilizationPercent: number;
  totalCapacityPercent: number;
  overBy: number;
  loadLabel: LoadLabel;
}

export interface AvailableEntry {
  employeeId: string;
  name: string;
  avatarUrl: string | null;
  roleTitle: string;
  remainingCapacityPercent: number;
  utilizationPercent: number;
  loadLabel: LoadLabel;
}

export interface GapEntry {
  projectId: string;
  projectName: string;
  status: ProjectStatus;
  staffingStatus: StaffingStatus;
  totalShortfall: number;
  shortRoles: Array<{
    requirementId: string;
    roleId: string;
    roleName: string;
    requiredHeadcount: number;
    filledHeadcount: number;
    shortfall: number;
  }>;
}

export interface Dashboard {
  asOf: string;
  overallocated: { entries: OverallocatedEntry[]; reason: string | null };
  available: { entries: AvailableEntry[]; reason: string | null };
  gaps: { entries: GapEntry[]; reason: string | null };
}

export const readDashboard = (asOf?: string) => api<Dashboard>(`/dashboard${query({ asOf })}`);

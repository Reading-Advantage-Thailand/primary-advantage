//---------------------------------
// System Dashboard API
//---------------------------------

export const fetchSystemDashboardApi = async (dateRange?: string | number) => {
  const queryParams = new URLSearchParams({
    dateRange: dateRange?.toString() || "",
  }).toString();
  const response = await fetch(`/api/system/dashboard?${queryParams}`).then(
    (res) => res.json(),
  );
  return response;
};

export const fetchLicensesApi = async () => {
  const response = await fetch("/api/licenses").then((res) => res.json());
  return response;
};

export const fetchDailyActivityUsersApi = async (licenseId?: string) => {
  const queryParams = new URLSearchParams({
    licenseId: licenseId || "",
  }).toString();
  const response = await fetch(
    `/api/system/dashboard/activity/dairy-activity-users?${queryParams}`,
  ).then((res) => res.json());
  return response;
};

export const fetchActiveUsersApi = async (dateRange?: string | number) => {
  const queryParams = new URLSearchParams({
    dateRange: dateRange?.toString() || "",
  }).toString();
  const response = await fetch(
    `/api/system/dashboard/activity/active-users?${queryParams}`,
  ).then((res) => res.json());
  return response;
};

export const fetchMetricsCardsApi = async (dateRange?: string | number) => {
  const queryParams = new URLSearchParams({
    dateRange: dateRange?.toString() || "",
  }).toString();
  const response = await fetch(
    `/api/system/dashboard/summary?${queryParams}`,
  ).then((res) => res.json());
  return response;
};

export const fetchSystemActivityChartsApi = async (
  dateRange?: string | number,
) => {
  const queryParams = new URLSearchParams({
    dateRange: dateRange?.toString() || "",
  }).toString();
  const response = await fetch(
    `/api/system/dashboard/activity/charts?${queryParams}`,
  ).then((res) => res.json());
  return response;
};

export const fetchSchoolsListApi = async () => {
  const response = await fetch(`/api/system/dashboard/schools`).then((res) =>
    res.json(),
  );
  return response;
};

//---------------------------------
// Admin Dashboard API
//---------------------------------

export const fetchAdminDashboardApi = async (
  schoolId?: string,
  dateRange?: string,
) => {
  const queryParams = new URLSearchParams({
    schoolId: schoolId || "",
    dateRange: dateRange || "",
  }).toString();
  const response = await fetch(`/api/admin/dashboard?${queryParams}`).then(
    (res) => res.json(),
  );
  return response;
};

//---------------------------------
// Teacher Dashboard API
//---------------------------------

export const fetchTeacherDashboardApi = async () => {
  const response = await fetch("/api/teachers/dashboard").then((res) =>
    res.json(),
  );
  return response;
};

export const fetchTeacherClassReportApi = async (classroomId: string) => {
  const response = await fetch(
    `/api/teachers/dashboard/report/${classroomId}`,
  ).then((res) => res.json());
  return response;
};

export const fetchTeacherClassHeatmapApi = async (
  classroomId: string,
  expanded: boolean,
) => {
  const response = await fetch(
    `/api/teachers/dashboard/report/${classroomId}/heatmap?expanded=${expanded}`,
  ).then((res) => res.json());
  return response;
};

export const fetchTeacherClassGoalsApi = async (classroomId: string) => {
  const response = await fetch(
    `/api/teachers/dashboard/report/${classroomId}/goals`,
  ).then((res) => res.json());
  return response;
};

//---------------------------------
// Student Dashboard API
//---------------------------------

export const fetchStudentDashboardApi = async () => {
  const response = await fetch("/api/students/report").then((res) =>
    res.json(),
  );
  return response;
};
export const fetchStudentHeatmapApi = async (studentId: string) => {
  const response = await fetch(`/api/students/${studentId}/heatmap`).then(
    (res) => res.json(),
  );
  return response;
};

export const fetchStudentVelocityApi = async (studentId?: string) => {
  const queryParams = studentId
    ? new URLSearchParams({ studentId }).toString()
    : "";
  const url = queryParams
    ? `/api/students/velocity?${queryParams}`
    : "/api/students/velocity";
  const response = await fetch(url).then((res) => res.json());
  return response;
};

export const fetchStudentGenreEngagementApi = async (studentId?: string) => {
  const queryParams = studentId
    ? new URLSearchParams({ studentId }).toString()
    : "";
  const url = queryParams
    ? `/api/students/${studentId}/genre-engagement?${queryParams}`
    : `/api/students/${studentId}/genre-engagement`;
  const response = await fetch(url).then((res) => res.json());
  return response;
};

export const fetchStudentSRSHealthApi = async (studentId: string) => {
  const response = await fetch(`/api/students/${studentId}/srs-health`).then(
    (res) => res.json(),
  );
  return response;
};

export const fetchStudentGoalsApi = async () => {
  const response = await fetch(`/api/students/goals`).then((res) => res.json());
  return response;
};

//---------------------------------
// All Roles API
//---------------------------------

export const fetchAISummaryApi = async (
  kind?: string,
  contextId?: string,
  refresh?: string,
) => {
  const queryParams = new URLSearchParams({
    kind: kind || "",
    contextId: contextId || "",
    refresh: refresh || "",
  }).toString();
  const response = await fetch(`/api/ai/summary?${queryParams}`).then((res) =>
    res.json(),
  );
  return response;
};

export const fetchDashboardHeatmapApi = async (
  entityIds?: string,
  timeframe?: string,
) => {
  const queryParams = new URLSearchParams({
    entityIds: entityIds || "",
    timeframe: timeframe || "",
  }).toString();
  const response = await fetch(`/api/dashboard/heatmap?${queryParams}`).then(
    (res) => res.json(),
  );
  return response;
};

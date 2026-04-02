import axios from "axios";

const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) { localStorage.clear(); window.location.href = "/"; }
    return Promise.reject(err);
  }
);

export const authAPI = {
  signup:                  (d) => api.post("/auth/signup",      d).then((r) => r.data),
  login:                   (d) => api.post("/auth/login",       d).then((r) => r.data),
  sendOtp:                 (d) => api.post("/auth/send-otp",    d).then((r) => r.data),
  verifyOtp:               (d) => api.post("/auth/verify-otp",  d).then((r) => r.data),
  me:                      ()  => api.get("/auth/me").then((r) => r.data),
  getManagers:             ()  => api.get("/auth/managers").then((r) => r.data),
  createEmployeeAccount:   (d) => api.post("/auth/create-employee-account", d).then((r) => r.data),
};

export const empAPI = {
  getSelf:        ()     => api.get("/employees/me").then((r) => r.data),
  getAll:        (p)     => api.get("/employees", { params: p }).then((r) => r.data),
  getOne:        (id)    => api.get(`/employees/${id}`).then((r) => r.data),
  getFullProfile:(id)    => api.get(`/employees/${id}/full-profile`).then((r) => r.data),
  create:        (d)     => api.post("/employees", d).then((r) => r.data),
  update:        (id, d) => api.put(`/employees/${id}`, d).then((r) => r.data),
  remove:        (id)    => api.delete(`/employees/${id}`).then((r) => r.data),
  getDepts:      ()      => api.get("/employees/departments").then((r) => r.data),
  resendConfirm: (id)    => api.post(`/employees/resend-confirmation/${id}`).then((r) => r.data),
  confirmOffer:  (p)     => axios.get("/api/employees/confirm", { params: p }).then((r) => r.data),
};

export const attAPI = {
  mark:          (d)         => api.post("/attendance", d).then((r) => r.data),
  getByDate:     (date)      => api.get("/attendance", { params: { date } }).then((r) => r.data),
  getByEmployee: (id)        => api.get(`/attendance/${id}`).then((r) => r.data),
  getSummary:    (id, month) => api.get(`/attendance/summary/${id}`, { params: { month } }).then((r) => r.data),
};

export const leaveAPI = {
  apply:  (d)          => api.post("/leaves", d).then((r) => r.data),
  getAll: (p)          => api.get("/leaves", { params: p }).then((r) => r.data),
  review: (id, status) => api.put(`/leaves/${id}/review`, { status }).then((r) => r.data),
  remove: (id)         => api.delete(`/leaves/${id}`).then((r) => r.data),
};

export const payrollAPI = {
  generate:      (d)          => api.post("/payroll/generate", d).then((r) => r.data),
  runMonth:      (month)      => api.post("/payroll/run-month", { month }).then((r) => r.data),
  getAll:        (p)          => api.get("/payroll", { params: p }).then((r) => r.data),
  getSlip:       (id)         => api.get(`/payroll/slip/${id}`).then((r) => r.data),
  getByEmployee: (empId)      => api.get(`/payroll/employee/${empId}`).then((r) => r.data),
  updateStatus:  (id, status) => api.put(`/payroll/${id}/status`, { status }).then((r) => r.data),
};

export const dashAPI = {
  getSummary:  () => api.get("/dashboard").then((r) => r.data),
  getAuditLogs:() => api.get("/dashboard/audit").then((r) => r.data),
};

export const recruitAPI = {
  parseResume:      (fd)     => api.post("/recruitment/parse-resume", fd, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data),
  generateJD:        (d)      => api.post("/recruitment/generate-jd", d).then((r) => r.data),
  getStats:          ()       => api.get("/recruitment/stats").then((r) => r.data),
  getJobs:           (p)      => api.get("/recruitment/jobs", { params: p }).then((r) => r.data),
  createJob:         (d)      => api.post("/recruitment/jobs", d).then((r) => r.data),
  updateJob:         (id, d)  => api.put(`/recruitment/jobs/${id}`, d).then((r) => r.data),
  deleteJob:         (id)     => api.delete(`/recruitment/jobs/${id}`).then((r) => r.data),
  getCandidates:     (p)      => api.get("/recruitment/candidates", { params: p }).then((r) => r.data),
  addCandidate:      (fd)     => api.post("/recruitment/candidates", fd, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data),
  updateStage:       (id, d)  => api.put(`/recruitment/candidates/${id}/stage`, d).then((r) => r.data),
  scheduleInterview: (id, d)  => api.put(`/recruitment/candidates/${id}/interview`, d).then((r) => r.data),
  uploadResume:      (id, fd) => api.post(`/recruitment/candidates/${id}/resume`, fd, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data),
  draftEmail:        (id, d)  => api.post(`/recruitment/candidates/${id}/draft-email`, d).then((r) => r.data),
  sendEmail:         (id, d)  => api.post(`/recruitment/candidates/${id}/send-email`, d).then((r) => r.data),
  deleteCandidate:   (id)     => api.delete(`/recruitment/candidates/${id}`).then((r) => r.data),
};

export const exitAPI = {
  initiate:     (id, d)  => api.post(`/exit/${id}/initiate`, d).then((r) => r.data),
  approve:      (id, d)  => api.post(`/exit/${id}/approve`, d).then((r) => r.data),
  getDetails:   (id)     => api.get(`/exit/${id}/details`).then((r) => r.data),
  calculateFNF: (id, d)  => api.post(`/exit/${id}/calculate-fnf`, d).then((r) => r.data),
  complete:     (id)     => api.post(`/exit/${id}/complete`).then((r) => r.data),
  getAll:       (p)      => api.get("/exit", { params: p }).then((r) => r.data),
};

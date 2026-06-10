import api from './axios';

export const getHRUsers = () => api.get('/hradmin/users');
export const getJobTitles = () => api.get<string[]>('/hradmin/job-titles');
export const getJobCategories = () => api.get<string[]>('/hradmin/job-categories');
export const getAuditTrail = () => api.get('/hradmin/audit-trail');
export const deactivateUser = (id: number) => api.post(`/hradmin/users/${id}/deactivate`);

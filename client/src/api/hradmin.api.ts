import api from './axios';

export const getHRUsers = async () => {
  const response = await api.get<{ success: boolean; data: any }>('/hradmin/users');
  return { data: response.data.data };
};

export const getJobTitles = async () => {
  const response = await api.get<{ success: boolean; data: string[] }>('/hradmin/job-titles');
  return { data: response.data.data };
};

export const getJobCategories = async () => {
  const response = await api.get<{ success: boolean; data: string[] }>('/hradmin/job-categories');
  return { data: response.data.data };
};

export const getAuditTrail = async () => {
  const response = await api.get<{ success: boolean; data: any }>('/hradmin/audit-trail');
  return { data: response.data.data };
};

export const deactivateUser = async (id: number) => {
  const response = await api.post<{ success: boolean; data: any }>(`/hradmin/users/${id}/deactivate`);
  return { data: response.data.data };
};

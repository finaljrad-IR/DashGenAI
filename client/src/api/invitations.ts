import api from './api';

// Description: Send invitation(s) to email addresses for a dashboard
// Endpoint: POST /api/invitations/send
// Request: { projectId: string, emails: string[], message?: string }
// Response: { success: string[], failed: string[], message: string }
export const sendInvitations = async (data: {
  projectId: string;
  emails: string[];
  message?: string;
}) => {
  try {
    const response = await api.post('/api/invitations/send', data);
    return response.data;
  } catch (error: any) {
    console.error(error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Get invitation details by token
// Endpoint: GET /api/invitations/:token
// Request: {}
// Response: { invitation: { email: string, projectName: string, invitedBy: string, message?: string } }
export const getInvitationByToken = async (token: string) => {
  try {
    const response = await api.get(`/api/invitations/${token}`);
    return response.data;
  } catch (error: any) {
    console.error(error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Accept invitation and set password
// Endpoint: POST /api/invitations/:token/accept
// Request: { password: string }
// Response: { user: { _id: string, email: string }, project: { _id: string, name: string }, accessToken: string, refreshToken: string }
export const acceptInvitation = async (token: string, password: string) => {
  try {
    const response = await api.post(`/api/invitations/${token}/accept`, {
      password,
    });
    return response.data;
  } catch (error: any) {
    console.error(error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Get all dashboards shared with the current user
// Endpoint: GET /api/invitations/shared-dashboards
// Request: {}
// Response: { dashboards: Array<{ _id: string, name: string, status: string, sharedBy: string, sharedAt: Date, accessLevel: string }> }
export const getSharedDashboards = async () => {
  try {
    const response = await api.get('/api/invitations/shared-dashboards');
    return response.data;
  } catch (error: any) {
    console.error(error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Get users who have access to a project
// Endpoint: GET /api/invitations/project/:projectId/users
// Request: {}
// Response: { users: Array<{ email: string, sharedBy: string, sharedAt: Date, accessLevel: string }> }
export const getProjectSharedUsers = async (projectId: string) => {
  try {
    const response = await api.get(`/api/invitations/project/${projectId}/users`);
    return response.data;
  } catch (error: any) {
    console.error(error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};
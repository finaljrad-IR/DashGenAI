import api from './api';

// Description: Send invitations to users
// Endpoint: POST /api/invitations/send
// Request: { dashboardId: string, emails: string[], message?: string }
// Response: { success: boolean, message: string, invitationsSent: number }
export const sendInvitations = (data: { dashboardId: string; emails: string[]; message?: string }) => {
  // Mocking the response
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        message: `Invitations sent to ${data.emails.length} users`,
        invitationsSent: data.emails.length
      });
    }, 800);
  });
  // Uncomment the below lines to make an actual API call
  // try {
  //   return await api.post('/api/invitations/send', data);
  // } catch (error) {
  //   throw new Error(error?.response?.data?.message || error.message);
  // }
};

// Description: Accept invitation and set password
// Endpoint: POST /api/invitations/accept
// Request: { token: string, password: string }
// Response: { success: boolean, message: string, dashboardId: string, accessToken: string }
export const acceptInvitation = (data: { token: string; password: string }) => {
  // Mocking the response
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        message: 'Invitation accepted successfully',
        dashboardId: 'dash_1',
        accessToken: 'mock_access_token_' + Math.random().toString(36).substr(2, 9)
      });
    }, 1000);
  });
  // Uncomment the below lines to make an actual API call
  // try {
  //   return await api.post('/api/invitations/accept', data);
  // } catch (error) {
  //   throw new Error(error?.response?.data?.message || error.message);
  // }
};

// Description: Get invitation details by token
// Endpoint: GET /api/invitations/:token
// Request: {}
// Response: { invitation: { email: string, dashboardName: string, inviterEmail: string, message?: string } }
export const getInvitationDetails = (token: string) => {
  // Mocking the response
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        invitation: {
          email: 'invited@example.com',
          dashboardName: 'Sales Analytics Dashboard',
          inviterEmail: 'owner@example.com',
          message: 'Check out this amazing dashboard I created!'
        }
      });
    }, 500);
  });
  // Uncomment the below lines to make an actual API call
  // try {
  //   return await api.get(`/api/invitations/${token}`);
  // } catch (error) {
  //   throw new Error(error?.response?.data?.message || error.message);
  // }
};
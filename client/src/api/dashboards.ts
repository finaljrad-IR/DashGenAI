import api from './api';

// Description: Submit MongoDB connection to generate dashboard
// Endpoint: POST /api/dashboards/generate
// Request: { email: string, mongoUri: string }
// Response: { success: boolean, message: string, dashboardId: string }
export const generateDashboard = (data: { email: string; mongoUri: string }) => {
  // Mocking the response
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        message: 'Dashboard generation started. You will receive an email when it\'s ready.',
        dashboardId: 'dash_' + Math.random().toString(36).substr(2, 9)
      });
    }, 1000);
  });
  // Uncomment the below lines to make an actual API call
  // try {
  //   return await api.post('/api/dashboards/generate', data);
  // } catch (error) {
  //   throw new Error(error?.response?.data?.message || error.message);
  // }
};

// Description: Get dashboard by ID
// Endpoint: GET /api/dashboards/:id
// Request: {}
// Response: { _id: string, name: string, previewUrl: string, ownerId: string, createdAt: string }
export const getDashboard = (id: string) => {
  // Mocking the response
  return new Promise<{
    _id: string;
    name: string;
    previewUrl: string;
    ownerId: string;
    createdAt: string;
  }>((resolve) => {
    setTimeout(() => {
      resolve({
        _id: id,
        name: 'Sales Analytics Dashboard',
        previewUrl: 'https://example-daytona-instance.com/preview',
        ownerId: 'user123',
        createdAt: new Date().toISOString()
      });
    }, 500);
  });
  // Uncomment the below lines to make an actual API call
  // try {
  //   const response = await api.get(`/api/dashboards/${id}`);
  //   return response.data.dashboard;
  // } catch (error) {
  //   throw new Error(error?.response?.data?.message || error.message);
  // }
};

// Description: Get all dashboards for current user
// Endpoint: GET /api/dashboards
// Request: {}
// Response: { dashboards: Array<{ _id: string, name: string, createdAt: string, lastModified: string }> }
export const getUserDashboards = () => {
  // Mocking the response
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        dashboards: [
          {
            _id: 'dash_1',
            name: 'Sales Analytics Dashboard',
            createdAt: '2024-01-15T10:30:00Z',
            lastModified: '2024-01-20T14:45:00Z'
          },
          {
            _id: 'dash_2',
            name: 'User Behavior Dashboard',
            createdAt: '2024-01-10T09:15:00Z',
            lastModified: '2024-01-18T16:20:00Z'
          },
          {
            _id: 'dash_3',
            name: 'Inventory Management Dashboard',
            createdAt: '2024-01-05T11:00:00Z',
            lastModified: '2024-01-19T13:30:00Z'
          }
        ]
      });
    }, 500);
  });
  // Uncomment the below lines to make an actual API call
  // try {
  //   return await api.get('/api/dashboards');
  // } catch (error) {
  //   throw new Error(error?.response?.data?.message || error.message);
  // }
};

// Description: Update dashboard name
// Endpoint: PUT /api/dashboards/:id
// Request: { name: string }
// Response: { success: boolean, dashboard: { _id: string, name: string } }
export const updateDashboard = (id: string, data: { name: string }) => {
  // Mocking the response
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        dashboard: {
          _id: id,
          name: data.name
        }
      });
    }, 500);
  });
  // Uncomment the below lines to make an actual API call
  // try {
  //   return await api.put(`/api/dashboards/${id}`, data);
  // } catch (error) {
  //   throw new Error(error?.response?.data?.message || error.message);
  // }
};

// Description: Send chat message to modify dashboard
// Endpoint: POST /api/dashboards/:id/chat
// Request: { message: string }
// Response: { success: boolean, reply: string, status: string, dashboardUpdated?: boolean }
export const sendChatMessage = (id: string, message: string) => {
  // Mocking the response
  return new Promise((resolve) => {
    setTimeout(() => {
      const responses = [
        'Analyzing your request...',
        'Modifying the dashboard components...',
        'Testing changes...',
        'Changes applied! Your dashboard has been updated.'
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      resolve({
        success: true,
        reply: randomResponse,
        status: 'completed',
        dashboardUpdated: true
      });
    }, 1500);
  });
  // Uncomment the below lines to make an actual API call
  // try {
  //   return await api.post(`/api/dashboards/${id}/chat`, { message });
  // } catch (error) {
  //   throw new Error(error?.response?.data?.message || error.message);
  // }
};

// Description: Get chat history for dashboard
// Endpoint: GET /api/dashboards/:id/chat
// Request: {}
// Response: { messages: Array<{ _id: string, role: 'user' | 'system', content: string, timestamp: string }> }
export const getChatHistory = (id: string) => {
  // Mocking the response
  return new Promise<{
    messages: Array<{
      _id: string;
      role: 'user' | 'system';
      content: string;
      timestamp: string;
    }>;
  }>((resolve) => {
    setTimeout(() => {
      resolve({
        messages: [
          {
            _id: 'msg_1',
            role: 'system',
            content: 'Welcome! I\'ve generated your dashboard based on your MongoDB database. You can ask me to make changes anytime.',
            timestamp: new Date(Date.now() - 3600000).toISOString()
          },
          {
            _id: 'msg_2',
            role: 'user',
            content: 'Add a pie chart showing user distribution by country',
            timestamp: new Date(Date.now() - 1800000).toISOString()
          },
          {
            _id: 'msg_3',
            role: 'system',
            content: 'I\'ve added a pie chart showing user distribution by country. The chart is now visible in your dashboard.',
            timestamp: new Date(Date.now() - 1700000).toISOString()
          }
        ]
      });
    }, 500);
  });
  // Uncomment the below lines to make an actual API call
  // try {
  //   return await api.get(`/api/dashboards/${id}/chat`);
  // } catch (error) {
  //   throw new Error(error?.response?.data?.message || error.message);
  // }
};
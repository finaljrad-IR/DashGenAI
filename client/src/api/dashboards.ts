import api from './api';

// Description: Submit MongoDB connection to generate dashboard
// Endpoint: POST /api/projects
// Request: { name: string, mongoConnectionString: string }
// Response: { project: IProject }
export const generateDashboard = async (data: { email: string; mongoUri: string }) => {
  try {
    console.log('[generateDashboard] Creating project with data:', data);
    const response = await api.post('/api/projects', {
      name: `Dashboard for ${data.email}`,
      mongoConnectionString: data.mongoUri,
    });
    console.log('[generateDashboard] Project created successfully:', response.data);
    return {
      success: true,
      message: 'Dashboard generation started. Your dashboard is being created and deployed.',
      dashboardId: response.data.project._id
    };
  } catch (error) {
    console.error('[generateDashboard] Error creating project:', error);
    throw new Error(error?.response?.data?.error || error.message);
  }
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

// Description: Send chat message to modify dashboard using Claude Code (deprecated - use streaming version)
// Endpoint: POST /api/projects/:id/run-claude
// Request: { prompt: string }
// Response: { success: boolean, message: string, rawOutput: string, sessionId: string | null }
export const sendChatMessage = async (id: string, message: string) => {
  try {
    console.log('[sendChatMessage] Sending message to Claude Code:', message);
    const response = await api.post(`/api/projects/${id}/run-claude`, {
      prompt: message
    });
    console.log('[sendChatMessage] Claude Code response received:', response.data);
    return {
      success: response.data.success,
      reply: response.data.message,
      rawOutput: response.data.rawOutput,
      sessionId: response.data.sessionId,
      status: 'completed',
      dashboardUpdated: true
    };
  } catch (error) {
    console.error('[sendChatMessage] Error sending message:', error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Send chat message to modify dashboard using Claude Code with real-time streaming
// Endpoint: GET /api/projects/:id/run-claude/stream?prompt=xxx
// Request: Query param: prompt (string)
// Response: Server-Sent Events stream with real-time Claude Code output
export const sendChatMessageStreaming = (
  id: string,
  message: string,
  onChunk: (data: { type: string; [key: string]: unknown }) => void,
  onComplete: (sessionId: string | null) => void,
  onError: (error: Error) => void
): (() => void) => {
  console.log('[sendChatMessageStreaming] Starting streaming request to Claude Code:', message);

  // Get auth token from localStorage
  const token = localStorage.getItem('accessToken');
  if (!token) {
    console.error('[sendChatMessageStreaming] No auth token found');
    onError(new Error('Authentication required'));
    return () => {};
  }

  // Encode the prompt for URL
  const encodedPrompt = encodeURIComponent(message);

  // Create EventSource URL with token in query parameter (EventSource can't send custom headers)
  const baseUrl = import.meta.env.VITE_API_URL || '';
  const streamUrl = `${baseUrl}/api/projects/${id}/run-claude/stream?prompt=${encodedPrompt}&token=${token}`;

  console.log('[sendChatMessageStreaming] Opening EventSource connection');
  const eventSource = new EventSource(streamUrl);

  let sessionId: string | null = null;

  eventSource.onopen = () => {
    console.log('[sendChatMessageStreaming] EventSource connection opened');
  };

  eventSource.onmessage = (event) => {
    try {
      const trimmedData = event.data.trim();
      if (!trimmedData) {
        console.log('[sendChatMessageStreaming] Received empty chunk, skipping');
        return;
      }

      console.log('[sendChatMessageStreaming] Received chunk:', trimmedData.substring(0, 100));
      const data = JSON.parse(trimmedData);

      // Extract session ID if present
      if (data.session_id && !sessionId) {
        sessionId = data.session_id;
        console.log('[sendChatMessageStreaming] Session ID found:', sessionId);
      }

      // Handle completion event
      if (data.type === 'complete') {
        console.log('[sendChatMessageStreaming] Stream completed');
        eventSource.close();
        onComplete(data.sessionId || sessionId);
        return;
      }

      // Handle error event
      if (data.type === 'error') {
        console.error('[sendChatMessageStreaming] Error received:', data.message);
        eventSource.close();
        onError(new Error(data.message || 'Unknown error'));
        return;
      }

      // Send chunk to callback
      onChunk(data);
    } catch (parseError) {
      console.error('[sendChatMessageStreaming] Error parsing chunk:', parseError);
      console.error('[sendChatMessageStreaming] Problematic data:', event.data);
      // Don't close on parse errors, but log them clearly
    }
  };

  eventSource.onerror = (error) => {
    console.error('[sendChatMessageStreaming] EventSource error:', error);
    eventSource.close();
    onError(new Error('Connection error or stream ended'));
  };

  // Return cleanup function
  return () => {
    console.log('[sendChatMessageStreaming] Closing EventSource connection');
    eventSource.close();
  };
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
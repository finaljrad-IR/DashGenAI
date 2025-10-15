import api from './api';

export interface Project {
  _id: string;
  name: string;
  userId: string;
  mongoConnectionString: string;
  databaseName?: string;
  templateData?: Record<string, unknown>;
  renderedOutput?: string;
  status: 'active' | 'archived' | 'failed' | 'generating' | 'deploying';
  sandboxId?: string;
  sandboxUrl?: string;
  sandboxStatus?: 'creating' | 'running' | 'stopped' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  name: string;
  mongoConnectionString: string;
  databaseName?: string;
  templateData?: Record<string, unknown>;
}

export interface UpdateProjectInput {
  name?: string;
  mongoConnectionString?: string;
  databaseName?: string;
  templateData?: Record<string, unknown>;
}

// Description: Create a new project
// Endpoint: POST /api/projects
// Request: { name: string, mongoConnectionString: string, databaseName?: string, templateData?: Record<string, unknown> }
// Response: { project: Project }
export const createProject = async (data: CreateProjectInput): Promise<Project> => {
  try {
    const response = await api.post('/api/projects', data);
    return response.data.project;
  } catch (error: unknown) {
    console.error('Error creating project:', error);
    const err = error as { response?: { data?: { error?: string } }; message?: string };
    throw new Error(err?.response?.data?.error || err?.message || 'Failed to create project');
  }
};

// Description: Get all projects for the authenticated user
// Endpoint: GET /api/projects
// Request: {}
// Response: { projects: Array<Project> }
export const getProjects = async (): Promise<Project[]> => {
  try {
    const response = await api.get('/api/projects');
    return response.data.projects;
  } catch (error: unknown) {
    console.error('Error fetching projects:', error);
    const err = error as { response?: { data?: { error?: string } }; message?: string };
    throw new Error(err?.response?.data?.error || err?.message || 'Failed to fetch projects');
  }
};

// Description: Get a specific project by ID
// Endpoint: GET /api/projects/:id
// Request: {}
// Response: { project: Project }
export const getProjectById = async (id: string): Promise<Project> => {
  try {
    const response = await api.get(`/api/projects/${id}`);
    return response.data.project;
  } catch (error: unknown) {
    console.error('Error fetching project:', error);
    const err = error as { response?: { data?: { error?: string } }; message?: string };
    throw new Error(err?.response?.data?.error || err?.message || 'Failed to fetch project');
  }
};

// Description: Update a project
// Endpoint: PUT /api/projects/:id
// Request: { name?: string, mongoConnectionString?: string, databaseName?: string, templateData?: Record<string, unknown> }
// Response: { project: Project }
export const updateProject = async (
  id: string,
  data: UpdateProjectInput
): Promise<Project> => {
  try {
    const response = await api.put(`/api/projects/${id}`, data);
    return response.data.project;
  } catch (error: unknown) {
    console.error('Error updating project:', error);
    const err = error as { response?: { data?: { error?: string } }; message?: string };
    throw new Error(err?.response?.data?.error || err?.message || 'Failed to update project');
  }
};

// Description: Delete a project
// Endpoint: DELETE /api/projects/:id
// Request: {}
// Response: { message: string }
export const deleteProject = async (id: string): Promise<void> => {
  try {
    await api.delete(`/api/projects/${id}`);
  } catch (error: unknown) {
    console.error('Error deleting project:', error);
    const err = error as { response?: { data?: { error?: string } }; message?: string };
    throw new Error(err?.response?.data?.error || err?.message || 'Failed to delete project');
  }
};

// Description: Get sandbox status for a project
// Endpoint: GET /api/projects/:id/sandbox/status
// Request: {}
// Response: { sandboxStatus: string, sandboxUrl?: string }
export const getSandboxStatus = async (id: string): Promise<{
  sandboxStatus: string;
  sandboxUrl?: string;
}> => {
  try {
    const response = await api.get(`/api/projects/${id}/sandbox/status`);
    return response.data;
  } catch (error: unknown) {
    console.error('Error getting sandbox status:', error);
    const err = error as { response?: { data?: { error?: string } }; message?: string };
    throw new Error(err?.response?.data?.error || err?.message || 'Failed to get sandbox status');
  }
};

// Description: Deploy project to Daytona sandbox
// Endpoint: POST /api/projects/:id/sandbox/deploy
// Request: {}
// Response: { message: string }
export const deploySandbox = async (id: string): Promise<{ message: string }> => {
  try {
    const response = await api.post(`/api/projects/${id}/sandbox/deploy`);
    return response.data;
  } catch (error: unknown) {
    console.error('Error deploying sandbox:', error);
    const err = error as { response?: { data?: { error?: string } }; message?: string };
    throw new Error(err?.response?.data?.error || err?.message || 'Failed to deploy sandbox');
  }
};

// Description: Run Codex on project sandbox
// Endpoint: POST /api/projects/:id/run-codex
// Request: { prompt?: string }
// Response: { success: boolean, message: string, sessionId: string, cmdId: string }
export const runCodexOnProject = async (
  projectId: string,
  prompt?: string
): Promise<{ success: boolean; message: string; sessionId: string; cmdId: string }> => {
  try {
    const response = await api.post(`/api/projects/${projectId}/run-codex`, {
      prompt,
    });
    return response.data;
  } catch (error: unknown) {
    console.error('Error running Codex:', error);
    const err = error as { response?: { data?: { error?: string } }; message?: string };
    throw new Error(err?.response?.data?.error || err?.message || 'Failed to run Codex');
  }
};

// Description: Stream logs from project sandbox
// Endpoint: GET /api/projects/:id/logs
// Request: { sessionId: string, cmdId: string } (query parameters)
// Response: EventSource stream
export const streamProjectLogs = (
  projectId: string,
  sessionId: string,
  cmdId: string,
  onMessage: (data: { type: string; data: unknown }) => void,
  onError?: (error: Error) => void
): EventSource => {
  const token = localStorage.getItem('accessToken');
  const eventSource = new EventSource(
    `/api/projects/${projectId}/logs?token=${token}&sessionId=${sessionId}&cmdId=${cmdId}`
  );

  eventSource.onmessage = (event) => {
    try {
      const parsed = JSON.parse(event.data);
      onMessage(parsed);
    } catch (error) {
      console.error('Error parsing log message:', error);
    }
  };

  eventSource.onerror = (error) => {
    console.error('EventSource error:', error);
    if (onError) {
      onError(new Error('Log stream connection error'));
    }
    eventSource.close();
  };

  return eventSource;
};

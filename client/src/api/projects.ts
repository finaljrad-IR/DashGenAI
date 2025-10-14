import api from './api';

export interface Project {
  _id: string;
  name: string;
  userId: string;
  mongoConnectionString: string;
  databaseName?: string;
  templateData?: Record<string, unknown>;
  renderedOutput?: string;
  status: 'active' | 'archived' | 'failed';
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
// Request: { name: string, mongoConnectionString: string, databaseName?: string, templateData?: Record<string, any> }
// Response: { project: Project }
export const createProject = async (data: CreateProjectInput): Promise<Project> => {
  try {
    const response = await api.post('/api/projects', data);
    return response.data.project;
  } catch (error: any) {
    console.error('Error creating project:', error);
    throw new Error(error?.response?.data?.error || error.message);
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
  } catch (error: any) {
    console.error('Error fetching projects:', error);
    throw new Error(error?.response?.data?.error || error.message);
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
  } catch (error: any) {
    console.error('Error fetching project:', error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Update a project
// Endpoint: PUT /api/projects/:id
// Request: { name?: string, mongoConnectionString?: string, databaseName?: string, templateData?: Record<string, any> }
// Response: { project: Project }
export const updateProject = async (
  id: string,
  data: UpdateProjectInput
): Promise<Project> => {
  try {
    const response = await api.put(`/api/projects/${id}`, data);
    return response.data.project;
  } catch (error: any) {
    console.error('Error updating project:', error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Delete a project
// Endpoint: DELETE /api/projects/:id
// Request: {}
// Response: { message: string }
export const deleteProject = async (id: string): Promise<void> => {
  try {
    await api.delete(`/api/projects/${id}`);
  } catch (error: any) {
    console.error('Error deleting project:', error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};

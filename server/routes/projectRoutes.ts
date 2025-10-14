import express, { Request, Response } from 'express';
import { requireUser } from './middlewares/auth.js';
import ProjectService from '../services/projectService.js';
import TemplateService from '../services/templateService.js';

const router = express.Router();

// Description: Create a new project
// Endpoint: POST /api/projects
// Request: { name: string, mongoConnectionString: string, databaseName?: string, templateData?: Record<string, any> }
// Response: { project: IProject }
router.post('/', requireUser, async (req: Request, res: Response) => {
  try {
    console.log('[POST /api/projects] Creating new project');

    const { name, mongoConnectionString, databaseName, templateData } = req.body;

    // Validation
    if (!name || !name.trim()) {
      console.warn('[POST /api/projects] Validation failed: Missing project name');
      return res.status(400).json({ error: 'Project name is required' });
    }

    if (!mongoConnectionString || !mongoConnectionString.trim()) {
      console.warn(
        '[POST /api/projects] Validation failed: Missing MongoDB connection string'
      );
      return res
        .status(400)
        .json({ error: 'MongoDB connection string is required' });
    }

    // Create project
    const project = await ProjectService.createProject({
      name: name.trim(),
      userId: req.user._id,
      mongoConnectionString: mongoConnectionString.trim(),
      databaseName: databaseName?.trim(),
      templateData: templateData || {},
    });

    console.log(`[POST /api/projects] Project created successfully: ${project._id}`);
    res.status(201).json({ project });
  } catch (error) {
    console.error('[POST /api/projects] Error creating project:', error);
    res.status(500).json({
      error: error.message || 'Failed to create project',
    });
  }
});

// Description: Get all projects for the authenticated user
// Endpoint: GET /api/projects
// Request: {}
// Response: { projects: Array<IProject> }
router.get('/', requireUser, async (req: Request, res: Response) => {
  try {
    console.log(`[GET /api/projects] Fetching projects for user: ${req.user._id}`);

    const projects = await ProjectService.getUserProjects(req.user._id.toString());

    console.log(`[GET /api/projects] Retrieved ${projects.length} projects`);
    res.status(200).json({ projects });
  } catch (error) {
    console.error('[GET /api/projects] Error fetching projects:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch projects',
    });
  }
});

// Description: Get a specific project by ID
// Endpoint: GET /api/projects/:id
// Request: {}
// Response: { project: IProject }
router.get('/:id', requireUser, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`[GET /api/projects/:id] Fetching project: ${id}`);

    const project = await ProjectService.getProjectById(
      id,
      req.user._id.toString()
    );

    if (!project) {
      console.warn(`[GET /api/projects/:id] Project not found: ${id}`);
      return res.status(404).json({ error: 'Project not found' });
    }

    console.log(`[GET /api/projects/:id] Project retrieved successfully: ${id}`);
    res.status(200).json({ project });
  } catch (error) {
    console.error('[GET /api/projects/:id] Error fetching project:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch project',
    });
  }
});

// Description: Update a project
// Endpoint: PUT /api/projects/:id
// Request: { name?: string, mongoConnectionString?: string, databaseName?: string, templateData?: Record<string, any> }
// Response: { project: IProject }
router.put('/:id', requireUser, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`[PUT /api/projects/:id] Updating project: ${id}`);

    const { name, mongoConnectionString, databaseName, templateData } = req.body;

    const updates: Partial<{
      name: string;
      mongoConnectionString: string;
      databaseName: string;
      templateData: Record<string, unknown>;
    }> = {};
    if (name !== undefined) updates.name = name.trim();
    if (mongoConnectionString !== undefined)
      updates.mongoConnectionString = mongoConnectionString.trim();
    if (databaseName !== undefined) updates.databaseName = databaseName.trim();
    if (templateData !== undefined) updates.templateData = templateData;

    const project = await ProjectService.updateProject(
      id,
      req.user._id.toString(),
      updates
    );

    if (!project) {
      console.warn(`[PUT /api/projects/:id] Project not found: ${id}`);
      return res.status(404).json({ error: 'Project not found' });
    }

    console.log(`[PUT /api/projects/:id] Project updated successfully: ${id}`);
    res.status(200).json({ project });
  } catch (error) {
    console.error('[PUT /api/projects/:id] Error updating project:', error);
    res.status(500).json({
      error: error.message || 'Failed to update project',
    });
  }
});

// Description: Delete a project
// Endpoint: DELETE /api/projects/:id
// Request: {}
// Response: { message: string }
router.delete('/:id', requireUser, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`[DELETE /api/projects/:id] Deleting project: ${id}`);

    const deleted = await ProjectService.deleteProject(id, req.user._id.toString());

    if (!deleted) {
      console.warn(`[DELETE /api/projects/:id] Project not found: ${id}`);
      return res.status(404).json({ error: 'Project not found' });
    }

    console.log(`[DELETE /api/projects/:id] Project deleted successfully: ${id}`);
    res.status(200).json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('[DELETE /api/projects/:id] Error deleting project:', error);
    res.status(500).json({
      error: error.message || 'Failed to delete project',
    });
  }
});

// Description: Render vite_react template to temp folder for testing
// Endpoint: POST /api/projects/test-render
// Request: { project_name: string }
// Response: { outputPath: string, message: string }
router.post('/test-render', requireUser, async (req: Request, res: Response) => {
  try {
    console.log('[POST /api/projects/test-render] Testing template rendering');

    const { project_name } = req.body;

    if (!project_name || !project_name.trim()) {
      console.warn('[POST /api/projects/test-render] Missing project_name');
      return res.status(400).json({ error: 'project_name is required' });
    }

    // Render template to temp folder with required variables
    const outputPath = await TemplateService.renderTemplateToTemp({
      project_name: project_name.trim(),
      options: {
        auth: true, // Always true
        db_type: 'nosql', // Always nosql
      },
    });

    console.log(`[POST /api/projects/test-render] Template rendered to: ${outputPath}`);
    res.status(200).json({
      outputPath,
      message: 'Template rendered successfully to temp folder',
    });
  } catch (error) {
    console.error('[POST /api/projects/test-render] Error rendering template:', error);
    res.status(500).json({
      error: error.message || 'Failed to render template',
    });
  }
});

export default router;

import express, { Request, Response } from 'express';
import { requireUser } from './middlewares/auth.js';
import ProjectService from '../services/projectService.js';
import TemplateService from '../services/templateService.js';

const router = express.Router();

// Description: Create a new project
// Endpoint: POST /api/projects
// Request: { name: string, mongoConnectionString: string, databaseName?: string, templateData?: Record<string, any> }
// Response: { project: IProject }
router.post('/', requireUser(), async (req: Request, res: Response) => {
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
router.get('/', requireUser(), async (req: Request, res: Response) => {
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
router.get('/:id', requireUser(), async (req: Request, res: Response) => {
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
router.put('/:id', requireUser(), async (req: Request, res: Response) => {
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
router.delete('/:id', requireUser(), async (req: Request, res: Response) => {
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
router.post('/test-render', requireUser(), async (req: Request, res: Response) => {
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

// Description: Get sandbox status for a project
// Endpoint: GET /api/projects/:id/sandbox/status
// Request: {}
// Response: { sandboxStatus: string, sandboxUrl?: string }
router.get('/:id/sandbox/status', requireUser(), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`[GET /api/projects/:id/sandbox/status] Getting sandbox status for project: ${id}`);

    const status = await ProjectService.getSandboxStatus(id, req.user._id.toString());

    console.log(`[GET /api/projects/:id/sandbox/status] Sandbox status retrieved: ${status.sandboxStatus}`);
    res.status(200).json(status);
  } catch (error) {
    console.error('[GET /api/projects/:id/sandbox/status] Error getting sandbox status:', error);
    res.status(500).json({
      error: error.message || 'Failed to get sandbox status',
    });
  }
});

// Description: Deploy project to Daytona sandbox
// Endpoint: POST /api/projects/:id/sandbox/deploy
// Request: {}
// Response: { message: string }
router.post('/:id/sandbox/deploy', requireUser(), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`[POST /api/projects/:id/sandbox/deploy] Deploying project to sandbox: ${id}`);

    // Verify project exists and belongs to user
    const project = await ProjectService.getProjectById(id, req.user._id.toString());
    if (!project) {
      console.warn(`[POST /api/projects/:id/sandbox/deploy] Project not found: ${id}`);
      return res.status(404).json({ error: 'Project not found' });
    }

    // Deploy asynchronously
    ProjectService.deployToSandbox(id).catch((error) => {
      console.error(`[POST /api/projects/:id/sandbox/deploy] Async deployment error:`, error);
    });

    console.log(`[POST /api/projects/:id/sandbox/deploy] Deployment started for project: ${id}`);
    res.status(202).json({ message: 'Deployment started' });
  } catch (error) {
    console.error('[POST /api/projects/:id/sandbox/deploy] Error starting deployment:', error);
    res.status(500).json({
      error: error.message || 'Failed to start deployment',
    });
  }
});

// Description: Run Codex on project sandbox to implement dashboard
// Endpoint: POST /api/projects/:id/run-codex
// Request: { prompt?: string }
// Response: { success: boolean, message: string, sessionId: string, cmdId: string }
router.post('/:id/run-codex', requireUser(), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { prompt } = req.body;

    console.log(`[POST /api/projects/:id/run-codex] Running Codex on project ${id}`);

    // Get project
    const project = await ProjectService.getProjectById(id, req.user._id.toString());
    if (!project) {
      console.warn(`[POST /api/projects/:id/run-codex] Project not found: ${id}`);
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if sandbox is deployed
    if (!project.sandboxId) {
      console.warn(`[POST /api/projects/:id/run-codex] Sandbox not deployed for project: ${id}`);
      return res.status(400).json({ error: 'Sandbox not deployed yet' });
    }

    // Run Codex and get session info
    const { sessionId, cmdId } = await ProjectService.runCodexOnProject(id, req.user._id.toString(), prompt);

    console.log(`[POST /api/projects/:id/run-codex] Codex execution started successfully with session ${sessionId}`);
    res.status(200).json({
      success: true,
      message: 'Codex execution started. Check logs for progress.',
      sessionId,
      cmdId,
    });
  } catch (error) {
    console.error(`[POST /api/projects/:id/run-codex] Error running Codex:`, error);
    res.status(500).json({ error: error.message || 'Failed to run Codex' });
  }
});

// Description: Stream logs from project sandbox
// Endpoint: GET /api/projects/:id/logs
// Request: { sessionId: string, cmdId: string } (query parameters)
// Response: Server-Sent Events (SSE) stream of logs
router.get('/:id/logs', requireUser(), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { sessionId, cmdId } = req.query;

    console.log(`[GET /api/projects/:id/logs] Streaming logs for project ${id}, session: ${sessionId}, cmd: ${cmdId}`);

    // Validate required parameters
    if (!sessionId || !cmdId) {
      console.warn(`[GET /api/projects/:id/logs] Missing sessionId or cmdId`);
      return res.status(400).json({ error: 'sessionId and cmdId are required query parameters' });
    }

    // Get project
    const project = await ProjectService.getProjectById(id, req.user._id.toString());
    if (!project) {
      console.warn(`[GET /api/projects/:id/logs] Project not found: ${id}`);
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if sandbox is deployed
    if (!project.sandboxId) {
      console.warn(`[GET /api/projects/:id/logs] Sandbox not deployed for project: ${id}`);
      return res.status(400).json({ error: 'Sandbox not deployed yet' });
    }

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    console.log(`[GET /api/projects/:id/logs] SSE connection established`);

    // Stream logs
    await ProjectService.streamProjectLogs(
      id,
      req.user._id.toString(),
      sessionId as string,
      cmdId as string,
      (logData) => {
        // Send data as SSE
        res.write(`data: ${JSON.stringify(logData)}\n\n`);
      },
      (error) => {
        // Send error and close
        console.error(`[GET /api/projects/:id/logs] Error in log stream:`, error);
        res.write(`data: ${JSON.stringify({ type: 'error', data: error.message })}\n\n`);
        res.end();
      }
    );

    console.log(`[GET /api/projects/:id/logs] Log stream ended`);
  } catch (error) {
    console.error('[GET /api/projects/:id/logs] Error streaming logs:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Failed to stream logs' });
    }
  }
});

export default router;

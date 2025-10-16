import express, { Request, Response } from 'express';
import { requireUser } from './middlewares/auth.js';
import ProjectService from '../services/projectService.js';
import TemplateService from '../services/templateService.js';
import CodexMessageService from '../services/codexMessageService.js';

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

// Description: Run Claude Code on project sandbox to implement dashboard (deprecated - use streaming version)
// Endpoint: POST /api/projects/:id/run-claude
// Request: { prompt?: string }
// Response: { success: boolean, message: string, rawOutput: string, sessionId: string | null }
router.post('/:id/run-claude', requireUser(), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { prompt } = req.body;

    console.log(`[POST /api/projects/:id/run-claude] Running Claude Code on project ${id}`);

    // Get project
    const project = await ProjectService.getProjectById(id, req.user._id.toString());
    if (!project) {
      console.warn(`[POST /api/projects/:id/run-claude] Project not found: ${id}`);
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if sandbox is deployed
    if (!project.sandboxId) {
      console.warn(`[POST /api/projects/:id/run-claude] Sandbox not deployed for project: ${id}`);
      return res.status(400).json({ error: 'Sandbox not deployed yet' });
    }

    // Run Claude Code and get output
    const { rawOutput, sessionId } = await ProjectService.runClaudeCodeOnProject(id, req.user._id.toString(), prompt);

    console.log(`[POST /api/projects/:id/run-claude] Claude Code execution completed successfully`);
    console.log(`[POST /api/projects/:id/run-claude] Session ID: ${sessionId || 'Not found in output'}`);

    res.status(200).json({
      success: true,
      message: 'Claude Code execution completed.',
      rawOutput,
      sessionId,
    });
  } catch (error) {
    console.error(`[POST /api/projects/:id/run-claude] Error running Claude Code:`, error);
    res.status(500).json({ error: error.message || 'Failed to run Claude Code' });
  }
});

// Description: Run Claude Code on project sandbox with real-time streaming output
// Endpoint: GET /api/projects/:id/run-claude/stream
// Request: Query params: { prompt?: string }
// Response: Server-Sent Events stream with Claude Code output
router.get('/:id/run-claude/stream', requireUser(), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { prompt } = req.query;

    console.log(`[GET /api/projects/:id/run-claude/stream] Starting Claude Code streaming for project ${id}`);

    // Get project
    const project = await ProjectService.getProjectById(id, req.user._id.toString());
    if (!project) {
      console.warn(`[GET /api/projects/:id/run-claude/stream] Project not found: ${id}`);
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if sandbox is deployed
    if (!project.sandboxId) {
      console.warn(`[GET /api/projects/:id/run-claude/stream] Sandbox not deployed for project: ${id}`);
      return res.status(400).json({ error: 'Sandbox not deployed yet' });
    }

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering in nginx

    console.log(`[GET /api/projects/:id/run-claude/stream] SSE headers set, starting stream`);

    // Get Anthropic API key
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicApiKey) {
      const errorData = JSON.stringify({ type: 'error', message: 'ANTHROPIC_API_KEY not configured' });
      res.write(`data: ${errorData}\n\n`);
      res.end();
      return;
    }

    // Get or create database documentation
    const { getDatabaseDocumentation, analyzeDatabase, generateDashboardPrompt } = await import('../services/codexService.js');
    let dbDoc = await getDatabaseDocumentation(id);

    if (!dbDoc) {
      console.log(`[GET /api/projects/:id/run-claude/stream] No database documentation found. Analyzing database...`);
      res.write(`data: ${JSON.stringify({ type: 'status', message: 'Analyzing database schema...' })}\n\n`);

      if (!project.mongoConnectionString) {
        const errorData = JSON.stringify({ type: 'error', message: 'MongoDB connection string not found in project' });
        res.write(`data: ${errorData}\n\n`);
        res.end();
        return;
      }

      try {
        dbDoc = await analyzeDatabase(project.mongoConnectionString, id);
        console.log(`[GET /api/projects/:id/run-claude/stream] Database analyzed successfully`);
        res.write(`data: ${JSON.stringify({ type: 'status', message: 'Database analysis complete' })}\n\n`);
      } catch (analyzeError) {
        console.error(`[GET /api/projects/:id/run-claude/stream] Failed to analyze database:`, analyzeError);
        const errorData = JSON.stringify({ type: 'error', message: `Failed to analyze database: ${analyzeError.message}` });
        res.write(`data: ${errorData}\n\n`);
        res.end();
        return;
      }
    }

    // Determine the prompt and system prompt
    let finalPrompt: string;
    let systemPrompt: string | undefined;

    if (!project.claudeSessionId && !prompt) {
      // First run: Use generated dashboard prompt as system prompt
      systemPrompt = generateDashboardPrompt(dbDoc, project.mongoConnectionString);
      finalPrompt = 'Please start implementing the dashboard based on the instructions provided in the system prompt.';
      console.log(`[GET /api/projects/:id/run-claude/stream] First run: Using generated dashboard prompt as system prompt`);
    } else if (prompt) {
      // User provided a custom message
      systemPrompt = generateDashboardPrompt(dbDoc, project.mongoConnectionString);
      finalPrompt = prompt as string;
      console.log(`[GET /api/projects/:id/run-claude/stream] Custom prompt provided: "${(prompt as string).substring(0, 50)}..."`);
    } else {
      // Continuation with existing session
      systemPrompt = undefined;
      finalPrompt = (prompt as string) || 'Please continue with the dashboard implementation.';
      console.log(`[GET /api/projects/:id/run-claude/stream] Resuming session with prompt: "${finalPrompt.substring(0, 50)}..."`);
    }

    // Import daytonaService dynamically to get the streaming method
    const daytonaService = (await import('../services/daytonaService.js')).default;

    // Stream Claude Code output
    let allOutput = '';
    let newSessionId: string | null = null;

    try {
      for await (const chunk of daytonaService.runClaudeCodeOnSandboxStreaming(
        project.sandboxId,
        anthropicApiKey,
        finalPrompt,
        systemPrompt,
        project.claudeSessionId || undefined
      )) {
        // Send chunk to client - chunk already has newline
        // SSE format: each message must be "data: <content>\n\n"
        const trimmedChunk = chunk.trim();
        if (trimmedChunk) {
          res.write(`data: ${trimmedChunk}\n\n`);

          // Accumulate output for session ID extraction
          allOutput += trimmedChunk + '\n';

          // Try to extract session ID from the chunk
          try {
            const chunkData = JSON.parse(trimmedChunk);
            if (chunkData.session_id && !newSessionId) {
              newSessionId = chunkData.session_id;
              console.log(`[GET /api/projects/:id/run-claude/stream] Session ID found: ${newSessionId}`);
            }
          } catch {
            // Not all chunks will be JSON, that's okay
          }
        }
      }

      // Update project with new session ID if found
      if (newSessionId && newSessionId !== project.claudeSessionId) {
        const Project = (await import('../models/Project.js')).default;
        await Project.findByIdAndUpdate(id, { claudeSessionId: newSessionId });
        console.log(`[GET /api/projects/:id/run-claude/stream] Saved new session ID to project: ${newSessionId}`);
      }

      // Send completion event
      res.write(`data: ${JSON.stringify({ type: 'complete', sessionId: newSessionId || project.claudeSessionId })}\n\n`);
      console.log(`[GET /api/projects/:id/run-claude/stream] Stream completed successfully`);
    } catch (streamError) {
      console.error(`[GET /api/projects/:id/run-claude/stream] Error during streaming:`, streamError);
      res.write(`data: ${JSON.stringify({ type: 'error', message: streamError.message })}\n\n`);
    }

    res.end();
  } catch (error) {
    console.error(`[GET /api/projects/:id/run-claude/stream] Error setting up stream:`, error);

    // Try to send error via SSE if headers not sent yet
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
    }

    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message || 'Failed to run Claude Code' })}\n\n`);
    res.end();
  }
});


// Description: Save a Codex message for a project
// Endpoint: POST /api/projects/:id/codex-messages
// Request: { messageType: string, title: string, description?: string, icon?: string, timestamp: number, status?: string, rawData?: object }
// Response: { message: ICodexMessage }
router.post('/:id/codex-messages', requireUser(), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { messageType, title, description, icon, timestamp, status, rawData } = req.body;

    console.log(`[POST /api/projects/:id/codex-messages] Saving Codex message for project: ${id}`);

    // Validate required fields
    if (!messageType || !title || timestamp === undefined) {
      console.warn('[POST /api/projects/:id/codex-messages] Missing required fields');
      return res.status(400).json({ error: 'messageType, title, and timestamp are required' });
    }

    // Verify project exists and belongs to user
    const project = await ProjectService.getProjectById(id, req.user._id.toString());
    if (!project) {
      console.warn(`[POST /api/projects/:id/codex-messages] Project not found: ${id}`);
      return res.status(404).json({ error: 'Project not found' });
    }

    // Create message
    const message = await CodexMessageService.createMessage({
      projectId: id,
      messageType,
      title,
      description,
      icon,
      timestamp,
      status,
      rawData,
    });

    console.log(`[POST /api/projects/:id/codex-messages] Codex message saved successfully: ${message._id}`);
    res.status(201).json({ message });
  } catch (error) {
    console.error('[POST /api/projects/:id/codex-messages] Error saving Codex message:', error);
    res.status(500).json({
      error: error.message || 'Failed to save Codex message',
    });
  }
});

// Description: Get all Codex messages for a project
// Endpoint: GET /api/projects/:id/codex-messages
// Request: {}
// Response: { messages: Array<ICodexMessage> }
router.get('/:id/codex-messages', requireUser(), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    console.log(`[GET /api/projects/:id/codex-messages] Fetching Codex messages for project: ${id}`);

    // Verify project exists and belongs to user
    const project = await ProjectService.getProjectById(id, req.user._id.toString());
    if (!project) {
      console.warn(`[GET /api/projects/:id/codex-messages] Project not found: ${id}`);
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get messages
    const messages = await CodexMessageService.getProjectMessages(id);

    console.log(`[GET /api/projects/:id/codex-messages] Retrieved ${messages.length} Codex messages`);
    res.status(200).json({ messages });
  } catch (error) {
    console.error('[GET /api/projects/:id/codex-messages] Error fetching Codex messages:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch Codex messages',
    });
  }
});

// Description: Delete all Codex messages for a project
// Endpoint: DELETE /api/projects/:id/codex-messages
// Request: {}
// Response: { message: string, deletedCount: number }
router.delete('/:id/codex-messages', requireUser(), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    console.log(`[DELETE /api/projects/:id/codex-messages] Deleting Codex messages for project: ${id}`);

    // Verify project exists and belongs to user
    const project = await ProjectService.getProjectById(id, req.user._id.toString());
    if (!project) {
      console.warn(`[DELETE /api/projects/:id/codex-messages] Project not found: ${id}`);
      return res.status(404).json({ error: 'Project not found' });
    }

    // Delete messages
    const deletedCount = await CodexMessageService.deleteProjectMessages(id);

    console.log(`[DELETE /api/projects/:id/codex-messages] Deleted ${deletedCount} Codex messages`);
    res.status(200).json({ message: 'Codex messages deleted successfully', deletedCount });
  } catch (error) {
    console.error('[DELETE /api/projects/:id/codex-messages] Error deleting Codex messages:', error);
    res.status(500).json({
      error: error.message || 'Failed to delete Codex messages',
    });
  }
});

export default router;

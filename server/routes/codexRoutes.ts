import express, { Request, Response } from 'express';
import { requireUser } from './middlewares/auth';
import * as CodexService from '../services/codexService';

const router = express.Router();

// Description: Analyze database and generate documentation
// Endpoint: POST /api/codex/analyze
// Request: { projectId: string, databaseUri: string }
// Response: { documentation: IDatabaseDocumentation }
router.post('/analyze', requireUser(), async (req: Request, res: Response) => {
  try {
    const { projectId, databaseUri } = req.body;

    console.log(`[CodexRoutes] Received analysis request for project: ${projectId}`);

    // Validate input
    if (!projectId) {
      console.error('[CodexRoutes] Missing projectId in request');
      return res.status(400).json({ error: 'projectId is required' });
    }

    if (!databaseUri) {
      console.error('[CodexRoutes] Missing databaseUri in request');
      return res.status(400).json({ error: 'databaseUri is required' });
    }

    // Validate MongoDB URI format
    if (!databaseUri.startsWith('mongodb://') && !databaseUri.startsWith('mongodb+srv://')) {
      console.error('[CodexRoutes] Invalid database URI format');
      return res.status(400).json({ error: 'Invalid MongoDB URI format' });
    }

    console.log('[CodexRoutes] Starting database analysis...');
    const documentation = await CodexService.analyzeDatabase(databaseUri, projectId);

    console.log(`[CodexRoutes] Analysis completed successfully: ${documentation._id}`);
    res.status(200).json({ documentation });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to analyze database';
    console.error('[CodexRoutes] Error during database analysis:', error);
    res.status(500).json({
      error: errorMessage,
    });
  }
});

// Description: Get database documentation by project ID
// Endpoint: GET /api/codex/documentation/:projectId
// Request: {}
// Response: { documentation: IDatabaseDocumentation | null }
router.get('/documentation/:projectId', requireUser(), async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    console.log(`[CodexRoutes] Fetching documentation for project: ${projectId}`);

    if (!projectId) {
      console.error('[CodexRoutes] Missing projectId in request');
      return res.status(400).json({ error: 'projectId is required' });
    }

    const documentation = await CodexService.getDatabaseDocumentation(projectId);

    if (!documentation) {
      console.log('[CodexRoutes] No documentation found for project');
      return res.status(404).json({ error: 'Documentation not found' });
    }

    console.log(`[CodexRoutes] Documentation retrieved: ${documentation._id}`);
    res.status(200).json({ documentation });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch documentation';
    console.error('[CodexRoutes] Error fetching documentation:', error);
    res.status(500).json({
      error: errorMessage,
    });
  }
});

// Description: Delete database documentation
// Endpoint: DELETE /api/codex/documentation/:documentationId
// Request: {}
// Response: { success: boolean }
router.delete('/documentation/:documentationId', requireUser(), async (req: Request, res: Response) => {
  try {
    const { documentationId } = req.params;

    console.log(`[CodexRoutes] Deleting documentation: ${documentationId}`);

    if (!documentationId) {
      console.error('[CodexRoutes] Missing documentationId in request');
      return res.status(400).json({ error: 'documentationId is required' });
    }

    const success = await CodexService.deleteDatabaseDocumentation(documentationId);

    if (!success) {
      console.log('[CodexRoutes] Documentation not found or already deleted');
      return res.status(404).json({ error: 'Documentation not found' });
    }

    console.log('[CodexRoutes] Documentation deleted successfully');
    res.status(200).json({ success: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete documentation';
    console.error('[CodexRoutes] Error deleting documentation:', error);
    res.status(500).json({
      error: errorMessage,
    });
  }
});

export default router;

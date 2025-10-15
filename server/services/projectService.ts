import Project, { IProject } from '../models/Project.js';
import mongoose from 'mongoose';
import TemplateService from './templateService.js';
import daytonaService from './daytonaService.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface CreateProjectInput {
  name: string;
  userId: string | mongoose.Types.ObjectId;
  mongoConnectionString: string;
  databaseName?: string;
  templateData?: Record<string, unknown>;
}

class ProjectService {
  /**
   * Create a new project
   */
  async createProject(input: CreateProjectInput): Promise<IProject> {
    try {
      console.log(`[ProjectService] Creating new project: ${input.name}`);

      // Validate user ID
      if (!mongoose.Types.ObjectId.isValid(input.userId.toString())) {
        throw new Error('Invalid user ID format');
      }

      // Create project document
      const project = new Project({
        name: input.name,
        userId: new mongoose.Types.ObjectId(input.userId.toString()),
        mongoConnectionString: input.mongoConnectionString,
        databaseName: input.databaseName || '',
        templateData: input.templateData || {},
        status: 'active',
      });

      // Always render vite_react template with required variables
      try {
        const renderedOutputPath = await TemplateService.renderTemplateToTemp({
          project_name: input.name,
          options: {
            auth: true, // Always true as per requirements
            db_type: 'nosql', // Always 'nosql' as per requirements
          },
        });
        // Store just the folder name (last part of the path) for reference
        project.renderedOutput = path.basename(renderedOutputPath);
        console.log('[ProjectService] vite_react template rendered successfully to:', renderedOutputPath);
      } catch (templateError) {
        console.warn(
          `[ProjectService] Template rendering failed: ${templateError.message}`
        );
        // Continue without rendered output
      }

      await project.save();
      console.log(`[ProjectService] Project created successfully with ID: ${project._id}`);

      // Deploy to Daytona sandbox asynchronously
      this.deployToSandbox(project._id.toString()).catch((error) => {
        console.error(`[ProjectService] Failed to deploy project ${project._id} to sandbox:`, error);
      });

      return project;
    } catch (error) {
      console.error(`[ProjectService] Error creating project: ${error.message}`, error);
      throw new Error(`Failed to create project: ${error.message}`);
    }
  }

  /**
   * Get project by ID
   */
  async getProjectById(
    projectId: string,
    userId: string
  ): Promise<IProject | null> {
    try {
      console.log(`[ProjectService] Fetching project: ${projectId}`);

      if (!mongoose.Types.ObjectId.isValid(projectId)) {
        throw new Error('Invalid project ID format');
      }

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid user ID format');
      }

      const project = await Project.findOne({
        _id: new mongoose.Types.ObjectId(projectId),
        userId: new mongoose.Types.ObjectId(userId),
      });

      if (!project) {
        console.log(`[ProjectService] Project not found: ${projectId}`);
        return null;
      }

      console.log(`[ProjectService] Project fetched successfully: ${projectId}`);
      return project;
    } catch (error) {
      console.error(`[ProjectService] Error fetching project: ${error.message}`, error);
      throw new Error(`Failed to fetch project: ${error.message}`);
    }
  }

  /**
   * Get all projects for a user
   */
  async getUserProjects(userId: string): Promise<IProject[]> {
    try {
      console.log(`[ProjectService] Fetching projects for user: ${userId}`);

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid user ID format');
      }

      const projects = await Project.find({
        userId: new mongoose.Types.ObjectId(userId),
      })
        .sort({ createdAt: -1 })
        .lean();

      console.log(`[ProjectService] Found ${projects.length} projects for user: ${userId}`);
      return projects as IProject[];
    } catch (error) {
      console.error(
        `[ProjectService] Error fetching user projects: ${error.message}`,
        error
      );
      throw new Error(`Failed to fetch user projects: ${error.message}`);
    }
  }

  /**
   * Update project
   */
  async updateProject(
    projectId: string,
    userId: string,
    updates: Partial<CreateProjectInput>
  ): Promise<IProject | null> {
    try {
      console.log(`[ProjectService] Updating project: ${projectId}`);

      if (!mongoose.Types.ObjectId.isValid(projectId)) {
        throw new Error('Invalid project ID format');
      }

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid user ID format');
      }

      const project = await Project.findOne({
        _id: new mongoose.Types.ObjectId(projectId),
        userId: new mongoose.Types.ObjectId(userId),
      });

      if (!project) {
        console.log(`[ProjectService] Project not found for update: ${projectId}`);
        return null;
      }

      // Update allowed fields
      if (updates.name !== undefined) project.name = updates.name;
      if (updates.mongoConnectionString !== undefined)
        project.mongoConnectionString = updates.mongoConnectionString;
      if (updates.databaseName !== undefined)
        project.databaseName = updates.databaseName;
      if (updates.templateData !== undefined)
        project.templateData = updates.templateData;

      // Re-render vite_react template if name changed
      if (updates.name !== undefined) {
        try {
          const renderedOutputPath = await TemplateService.renderTemplateToTemp({
            project_name: project.name,
            options: {
              auth: true, // Always true as per requirements
              db_type: 'nosql', // Always 'nosql' as per requirements
            },
          });
          // Store just the folder name (last part of the path) for reference
          project.renderedOutput = path.basename(renderedOutputPath);
          console.log('[ProjectService] vite_react template re-rendered successfully to:', renderedOutputPath);
        } catch (templateError) {
          console.warn(
            `[ProjectService] Template re-rendering failed: ${templateError.message}`
          );
        }
      }

      await project.save();
      console.log(`[ProjectService] Project updated successfully: ${projectId}`);

      return project;
    } catch (error) {
      console.error(`[ProjectService] Error updating project: ${error.message}`, error);
      throw new Error(`Failed to update project: ${error.message}`);
    }
  }

  /**
   * Delete project
   */
  async deleteProject(projectId: string, userId: string): Promise<boolean> {
    try {
      console.log(`[ProjectService] Deleting project: ${projectId}`);

      if (!mongoose.Types.ObjectId.isValid(projectId)) {
        throw new Error('Invalid project ID format');
      }

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid user ID format');
      }

      // Get project to check for sandbox
      const project = await Project.findOne({
        _id: new mongoose.Types.ObjectId(projectId),
        userId: new mongoose.Types.ObjectId(userId),
      });

      // Delete sandbox if exists
      if (project?.sandboxId) {
        try {
          await daytonaService.deleteSandbox(project.sandboxId);
          console.log(`[ProjectService] Sandbox deleted for project: ${projectId}`);
        } catch (sandboxError) {
          console.warn(`[ProjectService] Failed to delete sandbox: ${sandboxError.message}`);
          // Continue with project deletion even if sandbox deletion fails
        }
      }

      const result = await Project.deleteOne({
        _id: new mongoose.Types.ObjectId(projectId),
        userId: new mongoose.Types.ObjectId(userId),
      });

      if (result.deletedCount === 0) {
        console.log(`[ProjectService] Project not found for deletion: ${projectId}`);
        return false;
      }

      console.log(`[ProjectService] Project deleted successfully: ${projectId}`);
      return true;
    } catch (error) {
      console.error(`[ProjectService] Error deleting project: ${error.message}`, error);
      throw new Error(`Failed to delete project: ${error.message}`);
    }
  }

  /**
   * Deploy project to Daytona sandbox
   */
  async deployToSandbox(projectId: string): Promise<void> {
    try {
      console.log(`[ProjectService] Starting sandbox deployment for project: ${projectId}`);

      // Get project
      const project = await Project.findById(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      // Update status to deploying
      project.status = 'deploying';
      project.sandboxStatus = 'creating';
      await project.save();

      // Get rendered template path
      const projectPath = path.join(__dirname, '..', 'temp', project.renderedOutput || project.name);

      // Deploy to Daytona
      const sandboxInfo = await daytonaService.deployProject({
        name: project.name,
        projectPath,
      });

      // Ensure sandbox URL is HTTPS
      let secureUrl = sandboxInfo.sandboxUrl;
      if (secureUrl && secureUrl.startsWith('http://')) {
        secureUrl = secureUrl.replace('http://', 'https://');
        console.log(`[ProjectService] Converted sandbox URL to HTTPS: ${secureUrl}`);
      }

      // Update project with sandbox info
      project.sandboxId = sandboxInfo.sandboxId;
      project.sandboxUrl = secureUrl;
      project.sandboxStatus = sandboxInfo.status;
      project.status = 'active';
      await project.save();

      console.log(`[ProjectService] Project deployed successfully to sandbox: ${sandboxInfo.sandboxUrl}`);
    } catch (error) {
      console.error(`[ProjectService] Error deploying to sandbox: ${error.message}`, error);

      // Update project status to failed
      try {
        await Project.findByIdAndUpdate(projectId, {
          status: 'failed',
          sandboxStatus: 'failed',
        });
      } catch (updateError) {
        console.error(`[ProjectService] Failed to update project status:`, updateError);
      }

      throw error;
    }
  }

  /**
   * Get sandbox status for a project
   */
  async getSandboxStatus(projectId: string, userId: string): Promise<{
    sandboxStatus: string;
    sandboxUrl?: string;
  }> {
    try {
      console.log(`[ProjectService] Getting sandbox status for project: ${projectId}`);

      const project = await this.getProjectById(projectId, userId);
      if (!project) {
        throw new Error('Project not found');
      }

      if (!project.sandboxId) {
        return { sandboxStatus: 'not_created' };
      }

      // Get live status from Daytona
      const status = await daytonaService.getSandboxStatus(project.sandboxId);

      // Update project if status changed
      if (status !== project.sandboxStatus) {
        project.sandboxStatus = status;
        await project.save();
      }

      return {
        sandboxStatus: status,
        sandboxUrl: project.sandboxUrl,
      };
    } catch (error) {
      console.error(`[ProjectService] Error getting sandbox status: ${error.message}`, error);
      throw new Error(`Failed to get sandbox status: ${error.message}`);
    }
  }

  /**
   * Run Codex on a project's sandbox
   */
  async runCodexOnProject(projectId: string, userId: string, customPrompt?: string): Promise<{
    sessionId: string;
    cmdId: string;
  }> {
    try {
      console.log(`[ProjectService] Running Codex on project: ${projectId}`);

      // Get project
      const project = await this.getProjectById(projectId, userId);
      if (!project) {
        throw new Error('Project not found');
      }

      // Check if sandbox is deployed
      if (!project.sandboxId) {
        throw new Error('Sandbox not deployed yet');
      }

      // Get OpenAI API key from environment
      const openaiApiKey = process.env.OPENAI_API_KEY;
      if (!openaiApiKey) {
        throw new Error('OPENAI_API_KEY not configured on server');
      }

      // Get or create database documentation
      const { getDatabaseDocumentation, analyzeDatabase, generateDashboardPrompt } = await import('./codexService.js');
      let dbDoc = await getDatabaseDocumentation(projectId);

      if (!dbDoc) {
        console.log(`[ProjectService] No database documentation found. Analyzing database...`);

        // Check if we have a valid MongoDB connection string
        if (!project.mongoConnectionString) {
          throw new Error('MongoDB connection string not found in project');
        }

        try {
          // Analyze the database and create documentation
          dbDoc = await analyzeDatabase(project.mongoConnectionString, projectId);
          console.log(`[ProjectService] Database analyzed successfully`);
        } catch (analyzeError) {
          console.error(`[ProjectService] Failed to analyze database:`, analyzeError);
          throw new Error(`Failed to analyze database: ${analyzeError.message}. Please check your MongoDB connection string.`);
        }
      }

      // Generate or use custom prompt
      const prompt = customPrompt || generateDashboardPrompt(dbDoc, project.mongoConnectionString);

      // Run Codex on sandbox
      console.log(`[ProjectService] Executing Codex on sandbox: ${project.sandboxId}`);
      const result = await daytonaService.runCodexOnSandbox(
        project.sandboxId,
        openaiApiKey,
        prompt
      );

      if (!result.success || !result.sessionId || !result.cmdId) {
        throw new Error(result.error || 'Failed to run Codex');
      }

      console.log(`[ProjectService] Codex execution started successfully with session ${result.sessionId}`);
      return { sessionId: result.sessionId, cmdId: result.cmdId };
    } catch (error) {
      console.error(`[ProjectService] Error running Codex: ${error.message}`, error);
      throw new Error(`Failed to run Codex: ${error.message}`);
    }
  }

  /**
   * Stream project logs from sandbox using session-based streaming
   */
  async streamProjectLogs(
    projectId: string,
    userId: string,
    sessionId: string,
    cmdId: string,
    onData: (data: { type: string; data: unknown }) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    try {
      console.log(`[ProjectService] Starting log stream for project: ${projectId}, session: ${sessionId}, cmdId: ${cmdId}`);

      // Get project
      const project = await this.getProjectById(projectId, userId);
      if (!project) {
        throw new Error('Project not found');
      }

      // Check if sandbox is deployed
      if (!project.sandboxId) {
        throw new Error('Sandbox not deployed yet');
      }

      // Stream logs using Daytona session-based streaming
      await daytonaService.streamSessionLogs(
        project.sandboxId,
        sessionId,
        cmdId,
        (stdout: string) => {
          // Process stdout
          const lines = stdout.split('\n').filter((line) => line.trim());
          for (const line of lines) {
            // Try to parse as JSON for Codex output
            try {
              const jsonLog = JSON.parse(line);
              onData({ type: 'json', data: jsonLog });
            } catch {
              // Send as plain text
              onData({ type: 'text', data: line });
            }
          }
        },
        (stderr: string) => {
          // Process stderr
          const lines = stderr.split('\n').filter((line) => line.trim());
          for (const line of lines) {
            onData({ type: 'error', data: line });
          }
        }
      );

      console.log(`[ProjectService] Log streaming completed for project: ${projectId}`);
    } catch (error) {
      console.error(`[ProjectService] Error streaming logs: ${error.message}`, error);
      onError(error as Error);
    }
  }

}

export default new ProjectService();

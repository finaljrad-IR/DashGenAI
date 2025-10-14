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

      // Update project with sandbox info
      project.sandboxId = sandboxInfo.sandboxId;
      project.sandboxUrl = sandboxInfo.sandboxUrl;
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

}

export default new ProjectService();

import nunjucks from 'nunjucks';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import Project, { IProject } from '../models/Project.js';
import mongoose from 'mongoose';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure Nunjucks
const templatesPath = path.join(__dirname, '../templates');
nunjucks.configure(templatesPath, {
  autoescape: true,
  noCache: process.env.NODE_ENV === 'development',
});

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

      // Attempt to render template if template data exists
      if (input.templateData && Object.keys(input.templateData).length > 0) {
        try {
          const renderedOutput = await this.renderTemplate(
            'dashboard.html',
            input.templateData
          );
          project.renderedOutput = renderedOutput;
          console.log('[ProjectService] Template rendered successfully');
        } catch (templateError) {
          console.warn(
            `[ProjectService] Template rendering failed: ${templateError.message}`
          );
          // Continue without rendered output
        }
      }

      await project.save();
      console.log(`[ProjectService] Project created successfully with ID: ${project._id}`);

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

      // Re-render template if template data changed
      if (updates.templateData && Object.keys(updates.templateData).length > 0) {
        try {
          const renderedOutput = await this.renderTemplate(
            'dashboard.html',
            updates.templateData
          );
          project.renderedOutput = renderedOutput;
          console.log('[ProjectService] Template re-rendered successfully');
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
   * Render a Nunjucks template with data
   */
  async renderTemplate(
    templateName: string,
    data: Record<string, unknown>
  ): Promise<string> {
    try {
      console.log(`[ProjectService] Rendering template: ${templateName}`);
      const rendered = nunjucks.render(templateName, data);
      return rendered;
    } catch (error) {
      console.error(
        `[ProjectService] Template rendering error: ${error.message}`,
        error
      );
      throw new Error(`Template rendering failed: ${error.message}`);
    }
  }
}

export default new ProjectService();

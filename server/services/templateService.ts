import nunjucks from 'nunjucks';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs-extra';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths
const templatesBasePath = path.join(__dirname, '../templates');
const tempOutputPath = path.join(__dirname, '../temp');

// Configure Nunjucks for the vite_react template
const viteReactTemplatePath = path.join(templatesBasePath, 'vite_react');

interface TemplateOptions {
  auth: boolean;
  db_type: 'nosql' | 'sql';
}

interface RenderTemplateInput {
  project_name: string;
  options: TemplateOptions;
}

class TemplateService {
  /**
   * Render the vite_react template with provided variables
   */
  async renderViteReactTemplate(input: RenderTemplateInput): Promise<string> {
    try {
      console.log(`[TemplateService] Rendering vite_react template for project: ${input.project_name}`);

      // Validate template exists
      const templateExists = await fs.pathExists(viteReactTemplatePath);
      if (!templateExists) {
        throw new Error(`Template not found at: ${viteReactTemplatePath}`);
      }

      // Create template context
      const context = {
        project_name: input.project_name,
        options: {
          auth: input.options.auth,
          db_type: input.options.db_type,
        },
      };

      console.log('[TemplateService] Template context:', JSON.stringify(context, null, 2));

      // For now, we'll return a success message since the template is a full project structure
      // In a real implementation, you'd process each file through Nunjucks
      return `Template rendered for project: ${input.project_name}`;
    } catch (error) {
      console.error(`[TemplateService] Error rendering template: ${error.message}`, error);
      throw new Error(`Template rendering failed: ${error.message}`);
    }
  }

  /**
   * Process entire vite_react template directory and output to temp folder
   * This function copies the template and processes any Nunjucks variables
   */
  async renderTemplateToTemp(input: RenderTemplateInput): Promise<string> {
    try {
      console.log(`[TemplateService] Rendering vite_react template to temp folder`);
      console.log(`[TemplateService] Project name: ${input.project_name}`);
      console.log(`[TemplateService] Options:`, input.options);

      // Create a safe folder name from project name
      const safeFolderName = input.project_name
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '_')
        .replace(/_{2,}/g, '_');

      const outputPath = path.join(tempOutputPath, safeFolderName);

      // Ensure temp directory exists and clean if needed
      await fs.ensureDir(tempOutputPath);

      // Remove existing output if it exists
      if (await fs.pathExists(outputPath)) {
        console.log(`[TemplateService] Removing existing output at: ${outputPath}`);
        await fs.remove(outputPath);
      }

      console.log(`[TemplateService] Copying template from: ${viteReactTemplatePath}`);
      console.log(`[TemplateService] Output path: ${outputPath}`);

      // Copy the entire template directory
      await fs.copy(viteReactTemplatePath, outputPath);

      // Template context for Nunjucks
      const context = {
        project_name: input.project_name,
        options: {
          auth: input.options.auth,
          db_type: input.options.db_type,
        },
      };

      // Process files with Nunjucks variables
      await this.processTemplateFiles(outputPath, context);

      console.log(`[TemplateService] Template successfully rendered to: ${outputPath}`);
      return outputPath;
    } catch (error) {
      console.error(`[TemplateService] Error rendering template to temp: ${error.message}`, error);
      throw new Error(`Failed to render template to temp: ${error.message}`);
    }
  }

  /**
   * Recursively process all files in a directory, rendering Nunjucks templates
   */
  private async processTemplateFiles(
    dirPath: string,
    context: Record<string, unknown>
  ): Promise<void> {
    try {
      const files = await fs.readdir(dirPath);

      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stat = await fs.stat(filePath);

        if (stat.isDirectory()) {
          // Skip node_modules and other build directories
          if (
            file === 'node_modules' ||
            file === 'dist' ||
            file === 'build' ||
            file === '.git'
          ) {
            continue;
          }
          // Recursively process subdirectories
          await this.processTemplateFiles(filePath, context);
        } else if (stat.isFile()) {
          // Process text files that might contain Nunjucks variables
          const shouldProcess = this.shouldProcessFile(file);
          if (shouldProcess) {
            await this.processFile(filePath, context);
          }
        }
      }
    } catch (error) {
      console.error(`[TemplateService] Error processing files in ${dirPath}:`, error);
      throw error;
    }
  }

  /**
   * Determine if a file should be processed for Nunjucks variables
   */
  private shouldProcessFile(filename: string): boolean {
    const textExtensions = [
      '.ts',
      '.tsx',
      '.js',
      '.jsx',
      '.json',
      '.html',
      '.css',
      '.md',
      '.txt',
      '.env',
      '.gitignore',
      '.yaml',
      '.yml',
    ];

    return textExtensions.some((ext) => filename.endsWith(ext));
  }

  /**
   * Process a single file with Nunjucks
   */
  private async processFile(
    filePath: string,
    context: Record<string, unknown>
  ): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');

      // Only process if the file contains Nunjucks syntax
      if (content.includes('{{') || content.includes('{%') || content.includes('{#')) {
        console.log(`[TemplateService] Processing file: ${filePath}`);

        // Create a temporary Nunjucks environment for this file
        const env = new nunjucks.Environment(null, {
          autoescape: false,
        });

        const rendered = env.renderString(content, context);
        await fs.writeFile(filePath, rendered, 'utf-8');
      }
    } catch (error) {
      console.warn(`[TemplateService] Could not process file ${filePath}:`, error.message);
      // Continue with other files even if one fails
    }
  }

  /**
   * Get the temp output directory path
   */
  getTempPath(): string {
    return tempOutputPath;
  }

  /**
   * Clean all temp directories
   */
  async cleanTempDirectory(): Promise<void> {
    try {
      console.log(`[TemplateService] Cleaning temp directory: ${tempOutputPath}`);
      if (await fs.pathExists(tempOutputPath)) {
        await fs.emptyDir(tempOutputPath);
        console.log('[TemplateService] Temp directory cleaned successfully');
      }
    } catch (error) {
      console.error(`[TemplateService] Error cleaning temp directory:`, error);
      throw error;
    }
  }
}

export default new TemplateService();

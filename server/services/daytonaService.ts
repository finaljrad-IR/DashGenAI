import { Daytona } from '@daytonaio/sdk';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface SandboxConfig {
  name: string;
  projectPath: string;
}

interface SandboxInfo {
  sandboxId: string;
  sandboxUrl: string;
  status: 'creating' | 'running' | 'stopped' | 'failed';
}

class DaytonaService {
  private client: Daytona | null = null;
  private initialized = false;

  private initializeClient() {
    if (this.initialized) {
      return;
    }

    const apiKey = process.env.DAYTONA_API_KEY;
    const apiUrl = process.env.DAYTONA_API_URL || 'https://api.daytona.io';

    if (!apiKey) {
      console.warn('Daytona API key not configured. Sandbox features will be disabled.');
      this.initialized = true;
      return;
    }

    try {
      this.client = new Daytona({
        apiKey,
        baseURL: apiUrl,
      });
      console.log('Daytona client initialized successfully');
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize Daytona client:', error);
      this.initialized = true;
      throw new Error(`Daytona initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private ensureClient(): Daytona {
    if (!this.initialized) {
      this.initializeClient();
    }

    if (!this.client) {
      throw new Error('Daytona client not initialized. Please configure DAYTONA_API_KEY.');
    }
    return this.client;
  }

  /**
   * Create a new Daytona sandbox
   */
  async createSandbox(config: SandboxConfig): Promise<SandboxInfo> {
    console.log(`Creating Daytona sandbox for project: ${config.name}`);
    const client = this.ensureClient();

    try {
      // Create a new workspace
      const workspace = await client.workspaces.create({
        name: config.name.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        template: 'nodejs',
      });

      console.log(`Sandbox created with ID: ${workspace.id}`);

      // Get the sandbox URL (port 5173 for Vite)
      const sandboxUrl = `https://${workspace.id}.daytona.app:5173`;

      return {
        sandboxId: workspace.id,
        sandboxUrl,
        status: 'creating',
      };
    } catch (error) {
      console.error('Error creating Daytona sandbox:', error);
      throw new Error(`Failed to create sandbox: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload project files to the sandbox
   */
  async uploadFiles(sandboxId: string, projectPath: string): Promise<void> {
    console.log(`Uploading files to sandbox ${sandboxId} from ${projectPath}`);
    const client = this.ensureClient();

    try {
      // Create a tarball of the project
      const tarballPath = path.join(path.dirname(projectPath), `${path.basename(projectPath)}.tar.gz`);

      console.log(`Creating tarball: ${tarballPath}`);
      await execAsync(`tar -czf "${tarballPath}" -C "${path.dirname(projectPath)}" "${path.basename(projectPath)}"`);

      // Upload the tarball
      const fileBuffer = await fs.readFile(tarballPath);

      await client.workspaces.uploadFiles(sandboxId, {
        files: [{
          name: 'project.tar.gz',
          content: fileBuffer,
        }],
      });

      // Extract the tarball in the sandbox
      await client.workspaces.executeCommand(sandboxId, {
        command: `tar -xzf project.tar.gz && rm project.tar.gz && mv ${path.basename(projectPath)} /workspace`,
      });

      // Clean up local tarball
      await fs.unlink(tarballPath);

      console.log(`Files uploaded successfully to sandbox ${sandboxId}`);
    } catch (error) {
      console.error('Error uploading files to sandbox:', error);
      throw new Error(`Failed to upload files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Install dependencies in the sandbox
   */
  async installDependencies(sandboxId: string): Promise<void> {
    console.log(`Installing dependencies in sandbox ${sandboxId}`);
    const client = this.ensureClient();

    try {
      // Run npm install in the workspace
      await client.workspaces.executeCommand(sandboxId, {
        command: 'cd /workspace && npm install',
      });

      console.log(`Dependencies installed successfully in sandbox ${sandboxId}`);
    } catch (error) {
      console.error('Error installing dependencies:', error);
      throw new Error(`Failed to install dependencies: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Start the application in the sandbox
   */
  async startApplication(sandboxId: string): Promise<void> {
    console.log(`Starting application in sandbox ${sandboxId}`);
    const client = this.ensureClient();

    try {
      // Run npm start in the background
      await client.workspaces.executeCommand(sandboxId, {
        command: 'cd /workspace && npm start',
        background: true,
      });

      console.log(`Application started successfully in sandbox ${sandboxId}`);
    } catch (error) {
      console.error('Error starting application:', error);
      throw new Error(`Failed to start application: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get sandbox status
   */
  async getSandboxStatus(sandboxId: string): Promise<'creating' | 'running' | 'stopped' | 'failed'> {
    console.log(`Getting status for sandbox ${sandboxId}`);
    const client = this.ensureClient();

    try {
      const workspace = await client.workspaces.get(sandboxId);

      switch (workspace.status) {
        case 'creating':
        case 'starting':
          return 'creating';
        case 'running':
          return 'running';
        case 'stopped':
          return 'stopped';
        case 'error':
        case 'failed':
          return 'failed';
        default:
          return 'running';
      }
    } catch (error) {
      console.error('Error getting sandbox status:', error);
      throw new Error(`Failed to get sandbox status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Stop a sandbox
   */
  async stopSandbox(sandboxId: string): Promise<void> {
    console.log(`Stopping sandbox ${sandboxId}`);
    const client = this.ensureClient();

    try {
      await client.workspaces.stop(sandboxId);
      console.log(`Sandbox ${sandboxId} stopped successfully`);
    } catch (error) {
      console.error('Error stopping sandbox:', error);
      throw new Error(`Failed to stop sandbox: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a sandbox
   */
  async deleteSandbox(sandboxId: string): Promise<void> {
    console.log(`Deleting sandbox ${sandboxId}`);
    const client = this.ensureClient();

    try {
      await client.workspaces.delete(sandboxId);
      console.log(`Sandbox ${sandboxId} deleted successfully`);
    } catch (error) {
      console.error('Error deleting sandbox:', error);
      throw new Error(`Failed to delete sandbox: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Full deployment flow: create sandbox, upload files, install deps, start app
   */
  async deployProject(config: SandboxConfig): Promise<SandboxInfo> {
    console.log(`Starting full deployment for project: ${config.name}`);

    try {
      // Step 1: Create sandbox
      const sandboxInfo = await this.createSandbox(config);

      // Step 2: Upload files
      await this.uploadFiles(sandboxInfo.sandboxId, config.projectPath);

      // Step 3: Install dependencies
      await this.installDependencies(sandboxInfo.sandboxId);

      // Step 4: Start application
      await this.startApplication(sandboxInfo.sandboxId);

      // Update status
      sandboxInfo.status = 'running';

      console.log(`Project ${config.name} deployed successfully to ${sandboxInfo.sandboxUrl}`);
      return sandboxInfo;
    } catch (error) {
      console.error('Error during project deployment:', error);
      throw new Error(`Deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
const daytonaService = new DaytonaService();
export default daytonaService;

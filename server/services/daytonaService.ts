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

// Store active sandboxes in memory (in production, use database)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const activeSandboxes = new Map<string, any>();

class DaytonaService {
  private client: Daytona | null = null;
  private initialized = false;

  private initializeClient() {
    if (this.initialized) {
      return;
    }

    const apiKey = process.env.DAYTONA_API_KEY;
    const apiUrl = process.env.DAYTONA_API_URL;

    if (!apiKey) {
      console.warn('Daytona API key not configured. Sandbox features will be disabled.');
      this.initialized = true;
      return;
    }

    try {
      this.client = new Daytona({
        apiKey,
        apiUrl: apiUrl || undefined,
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
      // Create a new sandbox with TypeScript language
      const sandbox = await client.create({
        language: 'typescript',
        envVars: {
          NODE_ENV: 'development',
          PORT: '5173',
        },
        autoStopInterval: 60, // Auto-stop after 1 hour of inactivity
      });

      console.log(`Sandbox created with ID: ${sandbox.id}`);

      // Store sandbox reference for later use
      activeSandboxes.set(sandbox.id, sandbox);

      // Get the sandbox URL (port 5173 for Vite)
      const sandboxUrl = `https://${sandbox.id}.daytona.app:5173`;

      return {
        sandboxId: sandbox.id,
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
    const sandbox = activeSandboxes.get(sandboxId);

    if (!sandbox) {
      throw new Error(`Sandbox ${sandboxId} not found. It may have been deleted or not properly created.`);
    }

    try {
      console.log(`Reading files from: ${projectPath}`);

      // Upload all files from the project directory recursively
      await this.uploadDirectory(sandbox, projectPath, '/workspace');

      console.log(`Files uploaded successfully to sandbox ${sandboxId}`);
    } catch (error) {
      console.error('Error uploading files to sandbox:', error);
      throw new Error(`Failed to upload files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Recursively upload directory contents to sandbox
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async uploadDirectory(sandbox: any, localPath: string, remotePath: string): Promise<void> {
    const entries = await fs.readdir(localPath, { withFileTypes: true });

    for (const entry of entries) {
      const localFilePath = path.join(localPath, entry.name);
      const remoteFilePath = path.join(remotePath, entry.name);

      // Skip node_modules and other unnecessary directories
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name === 'build') {
        console.log(`Skipping directory: ${entry.name}`);
        continue;
      }

      if (entry.isDirectory()) {
        // Recursively upload subdirectories
        await this.uploadDirectory(sandbox, localFilePath, remoteFilePath);
      } else {
        // Upload file
        const fileContent = await fs.readFile(localFilePath);
        await sandbox.fs.uploadFile(fileContent, remoteFilePath);
        console.log(`Uploaded: ${remoteFilePath}`);
      }
    }
  }

  /**
   * Install dependencies in the sandbox
   */
  async installDependencies(sandboxId: string): Promise<void> {
    console.log(`Installing dependencies in sandbox ${sandboxId}`);
    const sandbox = activeSandboxes.get(sandboxId);

    if (!sandbox) {
      throw new Error(`Sandbox ${sandboxId} not found.`);
    }

    try {
      // Run npm install in the workspace root
      console.log('Running npm install...');
      const response = await sandbox.process.executeCommand('cd /workspace && npm install');
      console.log(`npm install output: ${response.result}`);

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
    const sandbox = activeSandboxes.get(sandboxId);

    if (!sandbox) {
      throw new Error(`Sandbox ${sandboxId} not found.`);
    }

    try {
      // Run npm start in the workspace (runs concurrently for client and server)
      console.log('Starting application with npm start...');
      const response = await sandbox.process.executeCommand('cd /workspace && nohup npm start > /tmp/app.log 2>&1 &');
      console.log(`npm start output: ${response.result}`);

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
    const sandbox = activeSandboxes.get(sandboxId);

    if (!sandbox) {
      // Sandbox not found in memory, assume it's stopped or deleted
      return 'stopped';
    }

    try {
      // Try to execute a simple command to check if sandbox is responsive
      await sandbox.process.executeCommand('echo "alive"');
      return 'running';
    } catch (error) {
      console.error('Error getting sandbox status:', error);
      return 'failed';
    }
  }

  /**
   * Stop a sandbox
   */
  async stopSandbox(sandboxId: string): Promise<void> {
    console.log(`Stopping sandbox ${sandboxId}`);
    const sandbox = activeSandboxes.get(sandboxId);

    if (!sandbox) {
      console.log(`Sandbox ${sandboxId} not found in active sandboxes`);
      return;
    }

    try {
      // Stop any running processes
      await sandbox.process.executeCommand('pkill -f "npm start" || true');
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
    const sandbox = activeSandboxes.get(sandboxId);

    if (!sandbox) {
      console.log(`Sandbox ${sandboxId} not found in active sandboxes`);
      return;
    }

    try {
      // Delete the sandbox using the client
      await client.delete(sandbox);

      // Remove from active sandboxes
      activeSandboxes.delete(sandboxId);

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

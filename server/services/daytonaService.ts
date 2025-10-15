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

// Track which sandboxes have Codex authenticated
const codexAuthenticatedSandboxes = new Set<string>();

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
      console.log('Calling Daytona SDK create method...');

      // Create a new sandbox with TypeScript language
      const sandbox = await client.create({
        language: 'typescript',
        public: true,
        envVars: {
          NODE_ENV: 'development',
          PORT: '5173',
        },
        autoStopInterval: 60, // Auto-stop after 1 hour of inactivity
      });

      console.log(`Sandbox response received:`, JSON.stringify(sandbox, null, 2));

      // Validate the response
      if (!sandbox || typeof sandbox !== 'object') {
        console.error('Invalid sandbox response:', sandbox);
        throw new Error('Daytona API returned an invalid response. Please check your API key and endpoint configuration.');
      }

      if (!sandbox.id) {
        console.error('Sandbox response missing ID:', sandbox);
        throw new Error('Daytona API did not return a sandbox ID. Response may be invalid.');
      }

      console.log(`Sandbox created with ID: ${sandbox.id}`);

      // Store sandbox reference for later use
      activeSandboxes.set(sandbox.id, sandbox);

      // Get preview URL using getPreviewUrl (will be updated after app starts on port 5173)
      console.log('Getting initial preview URL...');
      try {
        const previewInfo = await sandbox.getPreviewLink(5173);
        console.log(`Preview URL: ${previewInfo.url}`);
        console.log(`Preview token: ${previewInfo.token ? '[PRESENT]' : '[NOT PRESENT]'}`);

        // Ensure the URL is HTTPS
        let secureUrl = previewInfo.url;
        if (secureUrl && secureUrl.startsWith('http://')) {
          secureUrl = secureUrl.replace('http://', 'https://');
          console.log(`Converted URL to HTTPS: ${secureUrl}`);
        }

        return {
          sandboxId: sandbox.id,
          sandboxUrl: secureUrl,
          status: 'creating',
        };
      } catch (previewError) {
        console.warn('Could not get preview URL immediately, will retry after deployment:', previewError);
        // Return a placeholder URL, will be updated in deployProject
        return {
          sandboxId: sandbox.id,
          sandboxUrl: `https://${sandbox.id}.daytona.app:5173`,
          status: 'creating',
        };
      }
    } catch (error) {
      console.error('Error creating Daytona sandbox:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');

      // Check if the error is related to HTML response
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('DOCTYPE') || errorMessage.includes('<html') || errorMessage.includes('<body')) {
        throw new Error('Daytona API returned HTML instead of JSON. This usually means the API endpoint is incorrect or the API key is invalid. Please verify your DAYTONA_API_KEY and DAYTONA_API_URL environment variables.');
      }

      throw new Error(`Failed to create sandbox: ${errorMessage}`);
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

      // Collect all files and directories (using relative path 'workspace' instead of '/workspace')
      const { directories, files } = await this.collectFilesAndDirectories(projectPath, 'workspace');

      console.log(`Found ${directories.length} directories and ${files.length} files to upload`);

      // Create all directories first
      console.log('Creating directory structure...');
      for (const dir of directories) {
        try {
          await sandbox.fs.createFolder(dir, '755');
          console.log(`Created directory: ${dir}`);
        } catch (error) {
          console.error(`Error creating directory ${dir}:`, error);
          // Continue - directory might already exist
        }
      }

      // Upload all files in batches using uploadFiles method
      console.log('Uploading files...');
      const batchSize = 50; // Upload 50 files at a time
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        console.log(`Uploading batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(files.length / batchSize)} (${batch.length} files)`);

        try {
          await sandbox.fs.uploadFiles(batch);
          console.log(`Batch uploaded successfully`);
        } catch (error) {
          console.error(`Error uploading batch:`, error);
          throw error;
        }
      }

      console.log(`Files uploaded successfully to sandbox ${sandboxId}`);
    } catch (error) {
      console.error('Error uploading files to sandbox:', error);
      throw new Error(`Failed to upload files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Recursively collect all files and directories from a local path
   */
  private async collectFilesAndDirectories(
    localBasePath: string,
    remoteBasePath: string,
    currentLocalPath: string = localBasePath,
    currentRemotePath: string = remoteBasePath
  ): Promise<{ directories: string[]; files: Array<{ source: string; destination: string }> }> {
    const directories: string[] = [];
    const files: Array<{ source: string; destination: string }> = [];

    const entries = await fs.readdir(currentLocalPath, { withFileTypes: true });

    for (const entry of entries) {
      const localFilePath = path.join(currentLocalPath, entry.name);
      const remoteFilePath = path.posix.join(currentRemotePath, entry.name);

      // Skip node_modules and other unnecessary directories
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name === 'build') {
        console.log(`Skipping directory: ${entry.name}`);
        continue;
      }

      if (entry.isDirectory()) {
        // Add directory to list
        directories.push(remoteFilePath);

        // Recursively collect from subdirectory
        const subResults = await this.collectFilesAndDirectories(
          localBasePath,
          remoteBasePath,
          localFilePath,
          remoteFilePath
        );
        directories.push(...subResults.directories);
        files.push(...subResults.files);
      } else {
        // Add file to list
        files.push({
          source: localFilePath,
          destination: remoteFilePath
        });
      }
    }

    return { directories, files };
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
      const response = await sandbox.process.executeCommand('cd workspace && npm install');
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
      const response = await sandbox.process.executeCommand('cd workspace && nohup npm start > /tmp/app.log 2>&1 &');
      console.log(`npm start output: ${response.result}`);

      console.log(`Application started successfully in sandbox ${sandboxId}`);
    } catch (error) {
      console.error('Error starting application:', error);
      throw new Error(`Failed to start application: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get or reconnect to an existing sandbox by ID
   */
  private async getOrReconnectSandbox(sandboxId: string): Promise<any> {
    console.log(`[DaytonaService] Getting or reconnecting to sandbox ${sandboxId}`);

    // Check if sandbox is already in memory
    let sandbox = activeSandboxes.get(sandboxId);
    if (sandbox) {
      console.log(`[DaytonaService] Sandbox ${sandboxId} found in memory`);
      return sandbox;
    }

    // Sandbox not in memory, try to reconnect via Daytona API
    console.log(`[DaytonaService] Sandbox not in memory, reconnecting via Daytona API...`);
    const client = this.ensureClient();

    try {
      // Get the sandbox from Daytona API
      sandbox = await client.get(sandboxId);

      if (!sandbox) {
        throw new Error(`Sandbox ${sandboxId} not found in Daytona`);
      }

      console.log(`[DaytonaService] Successfully reconnected to sandbox ${sandboxId}`);

      // Store in memory for future use
      activeSandboxes.set(sandboxId, sandbox);

      return sandbox;
    } catch (error) {
      console.error(`[DaytonaService] Error reconnecting to sandbox:`, error);
      throw new Error(`Failed to reconnect to sandbox ${sandboxId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get sandbox status
   */
  async getSandboxStatus(sandboxId: string): Promise<'creating' | 'running' | 'stopped' | 'failed'> {
    console.log(`Getting status for sandbox ${sandboxId}`);

    try {
      // Try to get or reconnect to the sandbox
      const sandbox = await this.getOrReconnectSandbox(sandboxId);

      // Try to execute a simple command to check if sandbox is responsive
      await sandbox.process.executeCommand('echo "alive"');
      return 'running';
    } catch (error) {
      console.error('Error getting sandbox status:', error);
      // If we can't reconnect or execute command, consider it stopped
      return 'stopped';
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

      // Remove from active sandboxes and authentication tracking
      activeSandboxes.delete(sandboxId);
      codexAuthenticatedSandboxes.delete(sandboxId);

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
    let sandboxInfo: SandboxInfo | null = null;

    try {
      // Step 1: Create sandbox
      console.log('Step 1/4: Creating sandbox...');
      sandboxInfo = await this.createSandbox(config);
      console.log(`Sandbox created successfully: ${sandboxInfo.sandboxId}`);

      // Step 2: Upload files
      console.log('Step 2/4: Uploading project files...');
      await this.uploadFiles(sandboxInfo.sandboxId, config.projectPath);
      console.log('Files uploaded successfully');

      // Step 3: Install dependencies
      console.log('Step 3/4: Installing dependencies...');
      await this.installDependencies(sandboxInfo.sandboxId);
      console.log('Dependencies installed successfully');

      // Step 4: Start application
      console.log('Step 4/4: Starting application...');
      await this.startApplication(sandboxInfo.sandboxId);
      console.log('Application started successfully');

      // Step 5: Set sandbox to public and get the correct preview URL
      console.log('Step 5/6: Setting sandbox to public and getting preview URL...');
      const sandbox = activeSandboxes.get(sandboxInfo.sandboxId);
      if (sandbox) {
        try {

          // Wait a moment for the app to start listening on port 5173
          console.log('Waiting for application to start on port 5173...');
          await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

          const previewInfo = await sandbox.getPreviewLink(5173);
          console.log(`Preview URL obtained: ${previewInfo.url}`);
          console.log(`Preview token: ${previewInfo.token ? '[PRESENT]' : '[NOT PRESENT]'}`);

          // Ensure the URL is HTTPS
          let secureUrl = previewInfo.url;
          if (secureUrl && secureUrl.startsWith('http://')) {
            secureUrl = secureUrl.replace('http://', 'https://');
            console.log(`Converted URL to HTTPS: ${secureUrl}`);
          }

          sandboxInfo.sandboxUrl = secureUrl;
        } catch (previewError) {
          console.error('Error getting preview URL:', previewError);
          console.log('Using fallback URL format');
          // Keep the existing URL if preview URL fetch fails
        }
      }

      // Update status
      sandboxInfo.status = 'running';

      console.log(`Project ${config.name} deployed successfully to ${sandboxInfo.sandboxUrl}`);
      return sandboxInfo;
    } catch (error) {
      console.error('Error during project deployment:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack trace',
        sandboxId: sandboxInfo?.sandboxId || 'Not created yet',
      });

      // Clean up sandbox if it was created
      if (sandboxInfo?.sandboxId) {
        console.log(`Attempting to clean up sandbox ${sandboxInfo.sandboxId} after deployment failure...`);
        try {
          await this.deleteSandbox(sandboxInfo.sandboxId);
          console.log('Sandbox cleaned up successfully');
        } catch (cleanupError) {
          console.error('Error cleaning up sandbox:', cleanupError);
          // Don't throw here, we want to preserve the original error
        }
      }

      throw new Error(`Deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute a command on the sandbox
   */
  async executeCommand(
    sandboxId: string,
    command: string
  ): Promise<{ success: boolean; output?: string; error?: string }> {
    console.log(`[DaytonaService] Executing command on sandbox ${sandboxId}: ${command}`);

    try {
      // Get or reconnect to the sandbox
      const sandbox = await this.getOrReconnectSandbox(sandboxId);

      const response = await sandbox.process.executeCommand(command);
      console.log(`[DaytonaService] Command executed successfully`);
      return { success: true, output: response.result };
    } catch (error) {
      console.error(`[DaytonaService] Error executing command:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Setup Codex authentication on the sandbox
   * This must be run after Codex installation and before running any Codex commands
   */
  private async setupCodexAuthentication(sandboxId: string, openaiApiKey: string): Promise<void> {
    console.log(`[DaytonaService] Setting up Codex authentication for sandbox ${sandboxId}`);

    // Check if already authenticated
    if (codexAuthenticatedSandboxes.has(sandboxId)) {
      console.log(`[DaytonaService] Codex already authenticated for sandbox ${sandboxId}`);
      return;
    }

    try {
      // Run the two commands in sequence to authenticate Codex
      console.log(`[DaytonaService] Exporting OPENAI_API_KEY and logging into Codex...`);

      const authCommand = `export OPENAI_API_KEY="${openaiApiKey}" && printenv OPENAI_API_KEY | codex login --with-api-key`;

      const authResult = await this.executeCommand(sandboxId, authCommand);

      if (!authResult.success) {
        throw new Error(`Codex authentication failed: ${authResult.error}`);
      }

      console.log(`[DaytonaService] Codex authentication output: ${authResult.output?.substring(0, 200)}`);

      // Verify Codex is working
      console.log(`[DaytonaService] Verifying Codex installation...`);
      const verifyResult = await this.executeCommand(sandboxId, 'codex --version');

      if (!verifyResult.success) {
        console.warn(`[DaytonaService] Codex verification warning: ${verifyResult.error}`);
      } else {
        console.log(`[DaytonaService] Codex version: ${verifyResult.output}`);
      }

      // Mark sandbox as authenticated
      codexAuthenticatedSandboxes.add(sandboxId);
      console.log(`[DaytonaService] Codex authentication completed successfully for sandbox ${sandboxId}`);
    } catch (error) {
      console.error(`[DaytonaService] Error setting up Codex authentication:`, error);
      throw new Error(`Failed to authenticate Codex: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Run Codex on the sandbox with MongoDB documentation
   */
  async runCodexOnSandbox(
    sandboxId: string,
    openaiApiKey: string,
    prompt: string
  ): Promise<{ success: boolean; sessionId?: string; cmdId?: string; error?: string }> {
    console.log(`[DaytonaService] Running Codex on sandbox ${sandboxId}`);

    try {
      // Get or reconnect to the sandbox
      const sandbox = await this.getOrReconnectSandbox(sandboxId);

      // Step 1: Install Codex CLI if not already installed
      console.log(`[DaytonaService] Installing Codex CLI...`);
      const installResult = await this.executeCommand(
        sandboxId,
        'npm install -g @openai/codex || true'
      );

      if (!installResult.success) {
        console.warn(`[DaytonaService] Codex CLI installation warning: ${installResult.error}`);
      } else {
        console.log(`[DaytonaService] Codex CLI installation output: ${installResult.output?.substring(0, 200)}`);
      }

      // Step 2: Setup Codex authentication (export API key and login)
      console.log(`[DaytonaService] Setting up Codex authentication...`);
      await this.setupCodexAuthentication(sandboxId, openaiApiKey);

      // Step 3: Create a process session for streaming
      const sessionId = `codex-session-${Date.now()}`;
      console.log(`[DaytonaService] Creating process session: ${sessionId}`);
      await sandbox.process.createSession(sessionId);

      // Step 4: Run Codex in JSON mode with the prompt using the session
      // Include the API key in the environment for this specific command
      console.log(`[DaytonaService] Executing Codex with prompt in session`);
      const escapedPrompt = prompt.replace(/"/g, '\\"').replace(/\n/g, '\\n');
      const codexCommand = `cd workspace && OPENAI_API_KEY="${openaiApiKey}" codex exec --json --yolo --skip-git-repo-check "${escapedPrompt}"`;

      // Execute the command asynchronously in the session
      const commandResult = await sandbox.process.executeSessionCommand(sessionId, {
        command: codexCommand,
        runAsync: true,
      });

      if (!commandResult.cmdId) {
        throw new Error('Failed to get command ID from Codex execution');
      }

      console.log(`[DaytonaService] Codex execution initiated successfully with cmdId: ${commandResult.cmdId}`);
      return { success: true, sessionId, cmdId: commandResult.cmdId };
    } catch (error) {
      console.error(`[DaytonaService] Error running Codex:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Stream logs from a sandbox session command
   */
  async streamSessionLogs(
    sandboxId: string,
    sessionId: string,
    cmdId: string,
    onStdout: (data: string) => void,
    onStderr: (data: string) => void
  ): Promise<void> {
    console.log(`[DaytonaService] Streaming logs for session ${sessionId}, command ${cmdId}`);

    try {
      // Get or reconnect to the sandbox
      const sandbox = await this.getOrReconnectSandbox(sandboxId);

      // Stream logs with separate callbacks for stdout and stderr
      await sandbox.process.getSessionCommandLogs(
        sessionId,
        cmdId,
        (stdout: string) => {
          console.log('[STDOUT]:', stdout);
          onStdout(stdout);
        },
        (stderr: string) => {
          console.log('[STDERR]:', stderr);
          onStderr(stderr);
        }
      );

      console.log(`[DaytonaService] Log streaming completed for session ${sessionId}`);
    } catch (error) {
      console.error(`[DaytonaService] Error streaming logs:`, error);
      throw error;
    }
  }

  /**
   * Get logs from the sandbox (for streaming Codex output)
   * @deprecated Use streamSessionLogs instead for better real-time streaming
   */
  async getSandboxLogs(sandboxId: string, logFile: string = '/tmp/codex.log'): Promise<string> {
    console.log(`[DaytonaService] Getting logs from sandbox ${sandboxId}: ${logFile}`);

    try {
      // Get or reconnect to the sandbox
      const sandbox = await this.getOrReconnectSandbox(sandboxId);

      const response = await sandbox.process.executeCommand(`tail -n 100 ${logFile} 2>/dev/null || echo ""`);
      return response.result || '';
    } catch (error) {
      console.error(`[DaytonaService] Error getting logs:`, error);
      return '';
    }
  }
}

// Export singleton instance
const daytonaService = new DaytonaService();
export default daytonaService;

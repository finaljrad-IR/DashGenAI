import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

interface LogEntry {
  timestamp: Date;
  source: 'stdout' | 'stderr';
  content: string;
}

class LogCapture extends EventEmitter {
  private logs: LogEntry[] = [];
  private maxLines: number = 1000;
  private processes: Map<string, ChildProcess> = new Map();

  /**
   * Register a process for log capture
   */
  registerProcess(processId: string, process: ChildProcess): void {
    console.log(`[LogCapture] Registering process ${processId} for log capture`);

    this.processes.set(processId, process);

    if (process.stdout) {
      process.stdout.on('data', (data: Buffer) => {
        this.addLog(processId, 'stdout', data.toString());
      });
    }

    if (process.stderr) {
      process.stderr.on('data', (data: Buffer) => {
        this.addLog(processId, 'stderr', data.toString());
      });
    }

    process.on('exit', (code) => {
      console.log(`[LogCapture] Process ${processId} exited with code ${code}`);
      this.processes.delete(processId);
    });
  }

  /**
   * Add a log entry
   */
  addLog(processId: string, source: 'stdout' | 'stderr', content: string): void {
    const lines = content.split('\n').filter(line => line.trim().length > 0);

    for (const line of lines) {
      this.logs.push({
        timestamp: new Date(),
        source,
        content: line
      });

      // Keep only the last maxLines entries
      if (this.logs.length > this.maxLines) {
        this.logs.shift();
      }
    }

    this.emit('log', { processId, source, content });
  }

  /**
   * Get the last N lines of logs
   */
  getLastLogs(lines: number = 1000): string {
    const logsToReturn = this.logs.slice(-lines);

    if (logsToReturn.length === 0) {
      return 'No application logs available yet.';
    }

    const formattedLogs = logsToReturn.map(log => {
      const timestamp = log.timestamp.toISOString();
      const source = log.source === 'stderr' ? '[STDERR]' : '[STDOUT]';
      return `${timestamp} ${source} ${log.content}`;
    }).join('\n');

    console.log(`[LogCapture] Returning ${logsToReturn.length} log lines (${formattedLogs.length} characters)`);

    return formattedLogs;
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    console.log(`[LogCapture] Clearing ${this.logs.length} log entries`);
    this.logs = [];
  }

  /**
   * Get specific process
   */
  getProcess(processId: string): ChildProcess | undefined {
    return this.processes.get(processId);
  }

  /**
   * Unregister a process
   */
  unregisterProcess(processId: string): void {
    console.log(`[LogCapture] Unregistering process ${processId}`);
    this.processes.delete(processId);
  }
}

// Singleton instance
export const logCapture = new LogCapture();

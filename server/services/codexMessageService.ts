import CodexMessage, { ICodexMessage } from '../models/CodexMessage.js';
import mongoose from 'mongoose';

interface CreateCodexMessageInput {
  projectId: string;
  messageType: 'reasoning' | 'command_execution' | 'agent_message' | 'turn_completed' | 'unknown';
  title: string;
  description?: string;
  icon?: string;
  timestamp: number;
  status?: 'in_progress' | 'completed';
  rawData?: Record<string, unknown>;
}

class CodexMessageService {
  /**
   * Create a new Codex message
   */
  async createMessage(data: CreateCodexMessageInput): Promise<ICodexMessage> {
    try {
      console.log(`[CodexMessageService] Creating Codex message for project: ${data.projectId}`);

      const message = await CodexMessage.create({
        projectId: new mongoose.Types.ObjectId(data.projectId),
        messageType: data.messageType,
        title: data.title,
        description: data.description,
        icon: data.icon,
        timestamp: data.timestamp,
        status: data.status || 'in_progress',
        rawData: data.rawData || {},
      });

      console.log(`[CodexMessageService] Codex message created successfully: ${message._id}`);
      return message;
    } catch (error) {
      console.error('[CodexMessageService] Error creating Codex message:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to create Codex message'
      );
    }
  }

  /**
   * Get all Codex messages for a project
   */
  async getProjectMessages(projectId: string): Promise<ICodexMessage[]> {
    try {
      console.log(`[CodexMessageService] Fetching Codex messages for project: ${projectId}`);

      const messages = await CodexMessage.find({
        projectId: new mongoose.Types.ObjectId(projectId),
      })
        .sort({ timestamp: 1 }) // Sort by timestamp ascending (oldest first)
        .lean();

      console.log(
        `[CodexMessageService] Retrieved ${messages.length} Codex messages for project: ${projectId}`
      );
      return messages;
    } catch (error) {
      console.error('[CodexMessageService] Error fetching Codex messages:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to fetch Codex messages'
      );
    }
  }

  /**
   * Delete all Codex messages for a project
   */
  async deleteProjectMessages(projectId: string): Promise<number> {
    try {
      console.log(`[CodexMessageService] Deleting Codex messages for project: ${projectId}`);

      const result = await CodexMessage.deleteMany({
        projectId: new mongoose.Types.ObjectId(projectId),
      });

      console.log(
        `[CodexMessageService] Deleted ${result.deletedCount} Codex messages for project: ${projectId}`
      );
      return result.deletedCount || 0;
    } catch (error) {
      console.error('[CodexMessageService] Error deleting Codex messages:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to delete Codex messages'
      );
    }
  }

  /**
   * Update message status
   */
  async updateMessageStatus(
    messageId: string,
    status: 'in_progress' | 'completed'
  ): Promise<ICodexMessage | null> {
    try {
      console.log(`[CodexMessageService] Updating message status: ${messageId} to ${status}`);

      const message = await CodexMessage.findByIdAndUpdate(
        messageId,
        { status },
        { new: true }
      );

      if (message) {
        console.log(`[CodexMessageService] Message status updated successfully: ${messageId}`);
      } else {
        console.warn(`[CodexMessageService] Message not found: ${messageId}`);
      }

      return message;
    } catch (error) {
      console.error('[CodexMessageService] Error updating message status:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to update message status'
      );
    }
  }

  /**
   * Mark all messages for a project as completed
   */
  async markAllMessagesCompleted(projectId: string): Promise<number> {
    try {
      console.log(
        `[CodexMessageService] Marking all messages as completed for project: ${projectId}`
      );

      const result = await CodexMessage.updateMany(
        {
          projectId: new mongoose.Types.ObjectId(projectId),
          status: 'in_progress',
        },
        { status: 'completed' }
      );

      console.log(
        `[CodexMessageService] Marked ${result.modifiedCount} messages as completed for project: ${projectId}`
      );
      return result.modifiedCount || 0;
    } catch (error) {
      console.error('[CodexMessageService] Error marking messages as completed:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to mark messages as completed'
      );
    }
  }
}

export default new CodexMessageService();

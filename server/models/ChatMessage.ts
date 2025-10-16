import mongoose, { Schema, Document } from 'mongoose';

export interface IChatMessage extends Document {
  _id: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  messageType: 'user' | 'iteration_completed' | 'system';
  content: string;
  metadata?: {
    sessionId?: string;
    resultDescription?: string;
    currentAction?: string;
    icon?: string;
    hasCompleted?: boolean;
    [key: string]: unknown;
  };
  createdAt: Date;
  updatedAt: Date;
}

const chatMessageSchema = new Schema<IChatMessage>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project ID is required'],
      index: true,
    },
    messageType: {
      type: String,
      enum: ['user', 'iteration_completed', 'system'],
      required: [true, 'Message type is required'],
    },
    content: {
      type: String,
      required: [true, 'Message content is required'],
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying - sort by createdAt for chronological order
chatMessageSchema.index({ projectId: 1, createdAt: 1 });

const ChatMessage = mongoose.model<IChatMessage>('ChatMessage', chatMessageSchema);

export default ChatMessage;

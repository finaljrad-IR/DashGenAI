import mongoose, { Schema, Document } from 'mongoose';

export interface ICodexMessage extends Document {
  _id: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  messageType: 'reasoning' | 'command_execution' | 'agent_message' | 'turn_completed' | 'unknown';
  title: string;
  description?: string;
  icon?: string;
  timestamp: number;
  status: 'in_progress' | 'completed';
  rawData?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const codexMessageSchema = new Schema<ICodexMessage>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project ID is required'],
      index: true,
    },
    messageType: {
      type: String,
      enum: ['reasoning', 'command_execution', 'agent_message', 'turn_completed', 'unknown'],
      required: [true, 'Message type is required'],
    },
    title: {
      type: String,
      required: [true, 'Message title is required'],
      trim: true,
      maxlength: [500, 'Title cannot exceed 500 characters'],
    },
    description: {
      type: String,
      trim: true,
    },
    icon: {
      type: String,
      trim: true,
      maxlength: [10, 'Icon cannot exceed 10 characters'],
    },
    timestamp: {
      type: Number,
      required: [true, 'Timestamp is required'],
    },
    status: {
      type: String,
      enum: ['in_progress', 'completed'],
      default: 'in_progress',
    },
    rawData: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
codexMessageSchema.index({ projectId: 1, timestamp: 1 });
codexMessageSchema.index({ projectId: 1, messageType: 1 });

const CodexMessage = mongoose.model<ICodexMessage>('CodexMessage', codexMessageSchema);

export default CodexMessage;

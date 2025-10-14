import mongoose, { Schema, Document } from 'mongoose';

export interface IProject extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  userId: mongoose.Types.ObjectId;
  mongoConnectionString: string;
  databaseName?: string;
  templateData?: Record<string, unknown>;
  renderedOutput?: string;
  status: 'active' | 'archived' | 'failed' | 'generating' | 'deploying';
  sandboxId?: string;
  sandboxUrl?: string;
  sandboxStatus?: 'creating' | 'running' | 'stopped' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProject>(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      maxlength: [200, 'Project name cannot exceed 200 characters'],
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    mongoConnectionString: {
      type: String,
      required: [true, 'MongoDB connection string is required'],
      trim: true,
    },
    databaseName: {
      type: String,
      trim: true,
    },
    templateData: {
      type: Schema.Types.Mixed,
      default: {},
    },
    renderedOutput: {
      type: String,
    },
    status: {
      type: String,
      enum: ['active', 'archived', 'failed', 'generating', 'deploying'],
      default: 'generating',
    },
    sandboxId: {
      type: String,
      trim: true,
    },
    sandboxUrl: {
      type: String,
      trim: true,
    },
    sandboxStatus: {
      type: String,
      enum: ['creating', 'running', 'stopped', 'failed'],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        // Remove sensitive connection string from JSON output
        if (ret.mongoConnectionString) {
          ret.mongoConnectionString = '***REDACTED***';
        }
        return ret;
      },
    },
  }
);

// Index for efficient querying
projectSchema.index({ userId: 1, createdAt: -1 });
projectSchema.index({ status: 1 });

const Project = mongoose.model<IProject>('Project', projectSchema);

export default Project;

import mongoose, { Schema, Document } from 'mongoose';

export interface IDashboardShare extends Document {
  projectId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  sharedBy: mongoose.Types.ObjectId;
  accessLevel: 'viewer';
  createdAt: Date;
  updatedAt: Date;
}

const DashboardShareSchema = new Schema<IDashboardShare>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sharedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    accessLevel: {
      type: String,
      enum: ['viewer'],
      default: 'viewer',
    },
  },
  {
    timestamps: true,
  }
);

// Ensure unique user-project combinations
DashboardShareSchema.index({ projectId: 1, userId: 1 }, { unique: true });

// Index for querying user's shared dashboards
DashboardShareSchema.index({ userId: 1 });

const DashboardShare = mongoose.model<IDashboardShare>(
  'DashboardShare',
  DashboardShareSchema
);

export default DashboardShare;

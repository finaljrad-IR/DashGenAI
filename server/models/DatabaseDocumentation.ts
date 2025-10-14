import mongoose, { Schema, Document } from 'mongoose';

export interface IDatabaseDocumentation extends Document {
  projectId: mongoose.Types.ObjectId;
  databaseUri: string;
  documentation: {
    collections: Array<{
      name: string;
      documentCount: number;
      sampleSchema: object;
      indexes: Array<{
        name: string;
        keys: object;
        unique?: boolean;
      }>;
      description?: string;
    }>;
    databaseName: string;
    totalCollections: number;
    analyzedAt: Date;
    aiSummary?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const DatabaseDocumentationSchema: Schema = new Schema(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    databaseUri: {
      type: String,
      required: true,
    },
    documentation: {
      collections: [
        {
          name: {
            type: String,
            required: true,
          },
          documentCount: {
            type: Number,
            default: 0,
          },
          sampleSchema: {
            type: Schema.Types.Mixed,
            default: {},
          },
          indexes: [
            {
              name: String,
              keys: Schema.Types.Mixed,
              unique: Boolean,
            },
          ],
          description: String,
        },
      ],
      databaseName: {
        type: String,
        required: true,
      },
      totalCollections: {
        type: Number,
        required: true,
      },
      analyzedAt: {
        type: Date,
        default: Date.now,
      },
      aiSummary: String,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
DatabaseDocumentationSchema.index({ projectId: 1, createdAt: -1 });

const DatabaseDocumentation = mongoose.model<IDatabaseDocumentation>(
  'DatabaseDocumentation',
  DatabaseDocumentationSchema
);

export default DatabaseDocumentation;

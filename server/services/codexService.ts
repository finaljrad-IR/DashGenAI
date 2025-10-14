import mongoose from 'mongoose';
import DatabaseDocumentation, { IDatabaseDocumentation } from '../models/DatabaseDocumentation';
import { sendLLMRequest } from './llmService';

interface CollectionInfo {
  name: string;
  documentCount: number;
  sampleSchema: object;
  indexes: Array<{
    name: string;
    keys: object;
    unique?: boolean;
  }>;
  description?: string;
}

interface DatabaseAnalysisResult {
  collections: CollectionInfo[];
  databaseName: string;
  totalCollections: number;
  analyzedAt: Date;
  aiSummary: string;
}

/**
 * Analyze MongoDB database structure and create documentation
 * @param databaseUri - MongoDB connection string
 * @param projectId - Project ID to associate with the documentation
 * @returns Database documentation with AI-generated summary
 */
export async function analyzeDatabase(
  databaseUri: string,
  projectId: string
): Promise<IDatabaseDocumentation> {
  let connection: mongoose.Connection | null = null;

  try {
    console.log(`[CodexService] Starting database analysis for project: ${projectId}`);

    // Create a new connection to the user's database
    connection = await mongoose.createConnection(databaseUri).asPromise();
    console.log('[CodexService] Successfully connected to database');

    const db = connection.db;
    if (!db) {
      throw new Error('Failed to get database instance');
    }

    const databaseName = db.databaseName;
    console.log(`[CodexService] Analyzing database: ${databaseName}`);

    // Get all collections
    const collections = await db.listCollections().toArray();
    console.log(`[CodexService] Found ${collections.length} collections`);

    const collectionInfos: CollectionInfo[] = [];

    // Analyze each collection
    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      console.log(`[CodexService] Analyzing collection: ${collectionName}`);

      const collection = db.collection(collectionName);

      // Get document count
      const documentCount = await collection.countDocuments();

      // Get sample document to infer schema
      const sampleDoc = await collection.findOne();
      const sampleSchema = sampleDoc ? inferSchema(sampleDoc) : {};

      // Get indexes
      const indexesRaw = await collection.indexes();
      const indexes = indexesRaw.map((idx: { name: string; key: object; unique?: boolean }) => ({
        name: idx.name,
        keys: idx.key,
        unique: idx.unique || false,
      }));

      collectionInfos.push({
        name: collectionName,
        documentCount,
        sampleSchema,
        indexes,
      });

      console.log(
        `[CodexService] Collection ${collectionName}: ${documentCount} documents, ${indexes.length} indexes`
      );
    }

    // Generate AI summary using LLM
    console.log('[CodexService] Generating AI summary of database structure');
    const aiSummary = await generateAISummary({
      collections: collectionInfos,
      databaseName,
      totalCollections: collections.length,
      analyzedAt: new Date(),
      aiSummary: '',
    });

    // Add AI-generated descriptions to collections
    const enhancedCollections = await enhanceCollectionsWithAI(collectionInfos, aiSummary);

    const documentation: DatabaseAnalysisResult = {
      collections: enhancedCollections,
      databaseName,
      totalCollections: collections.length,
      analyzedAt: new Date(),
      aiSummary,
    };

    // Save documentation to database
    console.log('[CodexService] Saving documentation to database');
    const doc = new DatabaseDocumentation({
      projectId: new mongoose.Types.ObjectId(projectId),
      databaseUri: maskDatabaseUri(databaseUri),
      documentation,
    });

    await doc.save();
    console.log(`[CodexService] Documentation saved with ID: ${doc._id}`);

    return doc;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[CodexService] Error analyzing database:', error);
    throw new Error(`Failed to analyze database: ${errorMessage}`);
  } finally {
    // Close the connection
    if (connection) {
      await connection.close();
      console.log('[CodexService] Database connection closed');
    }
  }
}

/**
 * Infer schema from a sample document
 */
function inferSchema(doc: Record<string, unknown>, prefix: string = ''): object {
  const schema: Record<string, unknown> = {};

  for (const key in doc) {
    if (Object.prototype.hasOwnProperty.call(doc, key)) {
      const value = doc[key];
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (value === null) {
        schema[key] = { type: 'null', example: null };
      } else if (Array.isArray(value)) {
        if (value.length > 0) {
          const firstElement = value[0];
          if (typeof firstElement === 'object' && firstElement !== null) {
            schema[key] = {
              type: 'array',
              items: inferSchema(firstElement, fullKey),
            };
          } else {
            schema[key] = {
              type: 'array',
              items: { type: typeof firstElement },
            };
          }
        } else {
          schema[key] = { type: 'array', items: {} };
        }
      } else if (value instanceof Date) {
        schema[key] = { type: 'date', example: value.toISOString() };
      } else if (value instanceof mongoose.Types.ObjectId) {
        schema[key] = { type: 'ObjectId', example: value.toString() };
      } else if (typeof value === 'object') {
        schema[key] = {
          type: 'object',
          properties: inferSchema(value, fullKey),
        };
      } else {
        schema[key] = {
          type: typeof value,
          example: typeof value === 'string' && value.length > 50 ? value.substring(0, 50) + '...' : value,
        };
      }
    }
  }

  return schema;
}

/**
 * Generate AI summary of database structure
 */
async function generateAISummary(analysis: DatabaseAnalysisResult): Promise<string> {
  const prompt = `Analyze the following MongoDB database structure and provide a comprehensive summary:

Database Name: ${analysis.databaseName}
Total Collections: ${analysis.totalCollections}

Collections:
${analysis.collections
  .map(
    (col) => `
- Collection: ${col.name}
  Document Count: ${col.documentCount}
  Schema: ${JSON.stringify(col.sampleSchema, null, 2)}
  Indexes: ${col.indexes.map((idx) => `${idx.name} (${JSON.stringify(idx.keys)})`).join(', ')}
`
  )
  .join('\n')}

Please provide:
1. A high-level overview of the database purpose
2. Key relationships between collections
3. Data model insights and patterns
4. Recommendations for optimization or improvements
5. Any potential issues or concerns

Keep the summary concise but informative (max 500 words).`;

  try {
    const summary = await sendLLMRequest([
      {
        role: 'system',
        content:
          'You are a database architect expert. Analyze database structures and provide insightful, actionable summaries.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ]);

    return summary;
  } catch (error: unknown) {
    console.error('[CodexService] Error generating AI summary:', error);
    return 'AI summary generation failed. Manual review recommended.';
  }
}

/**
 * Enhance collection descriptions using AI
 */
async function enhanceCollectionsWithAI(
  collections: CollectionInfo[],
  aiSummary: string
): Promise<CollectionInfo[]> {
  const enhanced = [...collections];

  for (let i = 0; i < enhanced.length; i++) {
    const col = enhanced[i];
    const prompt = `Based on this collection structure, provide a brief description (1-2 sentences) of its purpose:

Collection: ${col.name}
Document Count: ${col.documentCount}
Schema: ${JSON.stringify(col.sampleSchema, null, 2)}

Context from database summary:
${aiSummary.substring(0, 300)}...

Provide only the description, no additional text.`;

    try {
      const description = await sendLLMRequest([
        {
          role: 'system',
          content: 'You are a database documentation expert. Provide clear, concise collection descriptions.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ]);

      enhanced[i].description = description.trim();
      console.log(`[CodexService] Generated description for collection: ${col.name}`);
    } catch (error) {
      console.error(`[CodexService] Error generating description for ${col.name}:`, error);
      enhanced[i].description = `Collection storing ${col.name} data`;
    }
  }

  return enhanced;
}

/**
 * Mask sensitive information in database URI
 */
function maskDatabaseUri(uri: string): string {
  try {
    const url = new URL(uri);
    if (url.password) {
      url.password = '****';
    }
    if (url.username) {
      url.username = url.username.substring(0, 3) + '***';
    }
    return url.toString();
  } catch (error) {
    // If URL parsing fails, just mask the entire middle part
    const parts = uri.split('@');
    if (parts.length > 1) {
      return uri.substring(0, 10) + '****' + uri.substring(uri.length - 20);
    }
    return uri;
  }
}

/**
 * Get database documentation by project ID
 */
export async function getDatabaseDocumentation(
  projectId: string
): Promise<IDatabaseDocumentation | null> {
  try {
    console.log(`[CodexService] Fetching documentation for project: ${projectId}`);
    const doc = await DatabaseDocumentation.findOne({
      projectId: new mongoose.Types.ObjectId(projectId),
    }).sort({ createdAt: -1 });

    if (doc) {
      console.log(`[CodexService] Found documentation with ID: ${doc._id}`);
    } else {
      console.log('[CodexService] No documentation found for project');
    }

    return doc;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[CodexService] Error fetching documentation:', error);
    throw new Error(`Failed to fetch documentation: ${errorMessage}`);
  }
}

/**
 * Delete database documentation
 */
export async function deleteDatabaseDocumentation(
  documentationId: string
): Promise<boolean> {
  try {
    console.log(`[CodexService] Deleting documentation: ${documentationId}`);
    const result = await DatabaseDocumentation.deleteOne({
      _id: new mongoose.Types.ObjectId(documentationId),
    });

    console.log(`[CodexService] Deleted ${result.deletedCount} documentation(s)`);
    return result.deletedCount > 0;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[CodexService] Error deleting documentation:', error);
    throw new Error(`Failed to delete documentation: ${errorMessage}`);
  }
}

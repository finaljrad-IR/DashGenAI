/**
 * Script to analyze a database and generate documentation using Codex
 *
 * Usage:
 * npm run script:analyze -- <databaseUri> <projectId>
 *
 * Example:
 * npm run script:analyze -- "mongodb://localhost:27017/mydb" "507f1f77bcf86cd799439011"
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { analyzeDatabase, getDatabaseDocumentation } from '../services/codexService';
import { connectDB } from '../config/database';

// Load environment variables
dotenv.config();

async function main() {
  try {
    // Get arguments from command line
    const args = process.argv.slice(2);

    if (args.length < 2) {
      console.error('Error: Missing required arguments');
      console.log('\nUsage: npm run script:analyze -- <databaseUri> <projectId>');
      console.log('\nExample:');
      console.log('  npm run script:analyze -- "mongodb://localhost:27017/mydb" "507f1f77bcf86cd799439011"');
      process.exit(1);
    }

    const [databaseUri, projectId] = args;

    console.log('='.repeat(80));
    console.log('DATABASE ANALYSIS SCRIPT');
    console.log('='.repeat(80));
    console.log(`Database URI: ${databaseUri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')}`);
    console.log(`Project ID: ${projectId}`);
    console.log('='.repeat(80));
    console.log('');

    // Connect to main application database
    console.log('[Script] Connecting to application database...');
    await connectDB();
    console.log('[Script] Connected to application database');
    console.log('');

    // Analyze the user's database
    console.log('[Script] Starting database analysis...');
    const documentation = await analyzeDatabase(databaseUri, projectId);

    console.log('');
    console.log('='.repeat(80));
    console.log('ANALYSIS COMPLETED SUCCESSFULLY');
    console.log('='.repeat(80));
    console.log(`Documentation ID: ${documentation._id}`);
    console.log(`Database Name: ${documentation.documentation.databaseName}`);
    console.log(`Total Collections: ${documentation.documentation.totalCollections}`);
    console.log(`Analyzed At: ${documentation.documentation.analyzedAt}`);
    console.log('');

    // Display collection summary
    console.log('COLLECTIONS:');
    console.log('-'.repeat(80));
    documentation.documentation.collections.forEach((col, index) => {
      console.log(`${index + 1}. ${col.name}`);
      console.log(`   Documents: ${col.documentCount}`);
      console.log(`   Indexes: ${col.indexes.length}`);
      console.log(`   Available Keys: ${col.availableKeys.length}`);
      if (col.availableKeys.length > 0) {
        console.log(`   Keys: ${col.availableKeys.slice(0, 10).join(', ')}${col.availableKeys.length > 10 ? '...' : ''}`);
      }
      if (col.description) {
        console.log(`   Description: ${col.description}`);
      }
      console.log('');
    });

    // Display AI Summary
    console.log('AI SUMMARY:');
    console.log('-'.repeat(80));
    console.log(documentation.documentation.aiSummary);
    console.log('');

    console.log('='.repeat(80));
    console.log('');

    // Verify we can retrieve the documentation
    console.log('[Script] Verifying documentation retrieval...');
    const retrieved = await getDatabaseDocumentation(projectId);

    if (retrieved && retrieved._id.toString() === documentation._id.toString()) {
      console.log('[Script] ✓ Documentation successfully stored and retrieved');
    } else {
      console.log('[Script] ✗ Warning: Retrieved documentation does not match');
    }

    console.log('');
    console.log('[Script] Analysis complete!');

    process.exit(0);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : 'No stack trace';
    console.error('');
    console.error('='.repeat(80));
    console.error('ERROR DURING ANALYSIS');
    console.error('='.repeat(80));
    console.error(`Error: ${errorMessage}`);
    console.error('');
    console.error('Stack trace:');
    console.error(errorStack);
    console.error('='.repeat(80));
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('[Script] Database connection closed');
  }
}

// Run the script
main();

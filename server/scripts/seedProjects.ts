import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { connectDB } from '../config/database.js';
import ProjectService from '../services/projectService.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

async function seedProjects() {
  try {
    console.log('=================================');
    console.log('Starting Project Seeding Script');
    console.log('=================================\n');

    // Connect to database
    await connectDB();
    console.log('✓ Connected to database\n');

    // Find an existing user to assign projects to
    let testUser = await User.findOne({ email: 'test@example.com' });

    // If no test user exists, create one
    if (!testUser) {
      console.log('No test user found. Creating test user...');
      const { generatePasswordHash } = await import('../utils/password.js');
      const hashedPassword = await generatePasswordHash('TestPassword123!');

      testUser = new User({
        email: 'test@example.com',
        password: hashedPassword,
        role: 'user',
        isVerified: true,
      });

      await testUser.save();
      console.log(`✓ Test user created: ${testUser.email}\n`);
    } else {
      console.log(`✓ Using existing test user: ${testUser.email}\n`);
    }

    // Create sample projects
    console.log('Creating sample projects...\n');

    const sampleProjects = [
      {
        name: 'E-Commerce Analytics Dashboard',
        mongoConnectionString: 'mongodb://localhost:27017/ecommerce',
        databaseName: 'ecommerce',
        templateData: {
          projectName: 'E-Commerce Analytics Dashboard',
          databaseName: 'ecommerce',
          createdDate: new Date().toISOString(),
          customData: {
            totalOrders: 1250,
            totalRevenue: 125000,
            activeUsers: 450,
          },
        },
      },
      {
        name: 'User Behavior Tracking',
        mongoConnectionString: 'mongodb://localhost:27017/analytics',
        databaseName: 'analytics',
        templateData: {
          projectName: 'User Behavior Tracking',
          databaseName: 'analytics',
          createdDate: new Date().toISOString(),
          customData: {
            pageViews: 50000,
            sessions: 12000,
            bounceRate: 35.5,
          },
        },
      },
      {
        name: 'Inventory Management System',
        mongoConnectionString: 'mongodb://localhost:27017/inventory',
        databaseName: 'inventory',
        templateData: {
          projectName: 'Inventory Management System',
          databaseName: 'inventory',
          createdDate: new Date().toISOString(),
          customData: {
            totalProducts: 500,
            lowStockItems: 25,
            outOfStock: 3,
          },
        },
      },
    ];

    const createdProjects = [];

    for (const projectData of sampleProjects) {
      try {
        const project = await ProjectService.createProject({
          ...projectData,
          userId: testUser._id,
        });

        createdProjects.push(project);
        console.log(`✓ Created project: ${project.name} (ID: ${project._id})`);
      } catch (error) {
        console.error(`✗ Failed to create project "${projectData.name}":`, error.message);
      }
    }

    console.log(`\n=================================`);
    console.log(`Summary:`);
    console.log(`- Total projects created: ${createdProjects.length}`);
    console.log(`- User: ${testUser.email}`);
    console.log(`- User ID: ${testUser._id}`);
    console.log(`=================================\n`);

    console.log('Project IDs:');
    createdProjects.forEach((project) => {
      console.log(`  - ${project.name}: ${project._id}`);
    });

    console.log('\n✓ Seeding completed successfully!\n');

    // Close database connection
    await mongoose.connection.close();
    console.log('✓ Database connection closed');

    process.exit(0);
  } catch (error) {
    console.error('\n✗ Seeding failed:');
    console.error(error);
    process.exit(1);
  }
}

// Run the seeding script
seedProjects();

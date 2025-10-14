import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import TemplateService from '../services/templateService.js';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

async function testTemplateRender() {
  try {
    console.log('=================================');
    console.log('Testing vite_react Template Rendering');
    console.log('=================================\n');

    const testProjectName = 'My Test Dashboard App';

    console.log(`Project Name: ${testProjectName}`);
    console.log('Options:');
    console.log('  - auth: true (always)');
    console.log('  - db_type: nosql (always)\n');

    console.log('Starting template rendering...\n');

    const outputPath = await TemplateService.renderTemplateToTemp({
      project_name: testProjectName,
      options: {
        auth: true,
        db_type: 'nosql',
      },
    });

    console.log('\n=================================');
    console.log('✓ Template Rendering Successful!');
    console.log('=================================\n');
    console.log(`Output location: ${outputPath}`);
    console.log('\nYou can now inspect the rendered template at the location above.');
    console.log('The template has been processed with the following variables:');
    console.log(`  - project_name: "${testProjectName}"`);
    console.log('  - options.auth: true');
    console.log('  - options.db_type: "nosql"');
    console.log('\n');

    process.exit(0);
  } catch (error) {
    console.error('\n✗ Template rendering failed:');
    console.error(error);
    process.exit(1);
  }
}

// Run the test
testTemplateRender();

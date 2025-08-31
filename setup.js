#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Culture App Setup Wizard');
console.log('============================\n');

// Check if .env already exists
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    console.log('⚠️  .env file already exists!');
    console.log('If you want to start fresh, delete the existing .env file and run this script again.\n');
    process.exit(0);
}

console.log('This script will help you create your .env file with all the required environment variables.');
console.log('Make sure you have the following ready:');
console.log('• MongoDB Atlas connection string');
console.log('• Gmail account with 2FA enabled');
console.log('• Gmail app password');
console.log('• OpenAI API key (optional)\n');

// Read the example file
const examplePath = path.join(__dirname, 'env.example');
let exampleContent = '';
try {
    exampleContent = fs.readFileSync(examplePath, 'utf8');
} catch (error) {
    console.log('❌ Could not read env.example file. Please create it manually.');
    process.exit(1);
}

// Create .env file
try {
    fs.writeFileSync(envPath, exampleContent);
    console.log('✅ Created .env file successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Open the .env file in your code editor');
    console.log('2. Replace all placeholder values with your actual credentials');
    console.log('3. Save the file');
    console.log('5. Run: npm start');
    console.log('\n🔗 Helpful links:');
    console.log('• MongoDB Atlas: https://www.mongodb.com/atlas');
    console.log('• Gmail App Passwords: https://myaccount.google.com/apppasswords');
    console.log('• OpenAI API Keys: https://platform.openai.com/api-keys');
    console.log('\n⚠️  Important: Never commit your .env file to version control!');
    console.log('   It contains sensitive information like passwords and API keys.');
    
} catch (error) {
    console.log('❌ Failed to create .env file:', error.message);
    process.exit(1);
}

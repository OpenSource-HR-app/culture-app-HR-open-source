#!/usr/bin/env node

// Simple test runner for ES modules
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Running Simple Tests...\n');

let passed = 0;
let failed = 0;

// Test function
function test(name, testFn) {
  try {
    testFn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
    failed++;
  }
}

// Test suite function
function describe(name, testSuite) {
  console.log(`\n📋 ${name}`);
  testSuite();
}

// Assertion functions
function expect(value) {
  return {
    toBe(expected) {
      if (value !== expected) {
        throw new Error(`Expected ${value} to be ${expected}`);
      }
    },
    toHaveProperty(prop) {
      if (!(prop in value)) {
        throw new Error(`Expected object to have property ${prop}`);
      }
    },
    toBeDefined() {
      if (value === undefined) {
        throw new Error('Expected value to be defined');
      }
    },
    toBeGreaterThan(expected) {
      if (value <= expected) {
        throw new Error(`Expected ${value} to be greater than ${expected}`);
      }
    }
  };
}

// Run tests
async function runTests() {
  try {
    // Test 1: Basic functionality
    describe('Basic Tests', () => {
      test('should support basic assertions', () => {
        expect(2 + 2).toBe(4);
      });

      test('should support object property checks', () => {
        const obj = { name: 'test', value: 42 };
        expect(obj).toHaveProperty('name');
        expect(obj).toHaveProperty('value');
      });

      test('should support defined checks', () => {
        const value = 'test';
        expect(value).toBeDefined();
      });

      test('should support comparison checks', () => {
        expect(10).toBeGreaterThan(5);
      });
    });

    // Test 2: Environment
    describe('Environment Tests', () => {
      test('should be in Node.js environment', () => {
        expect(typeof process).toBe('object');
        expect(typeof process.env).toBe('object');
      });

      test('should support ES modules', () => {
        expect(typeof globalThis).toBe('object');
      });
    });

    // Test 3: Project Structure
    describe('Project Structure Tests', () => {
      test('should have main.js file', async () => {
        const fs = await import('fs');
        const mainExists = fs.existsSync(join(__dirname, 'main.js'));
        expect(mainExists).toBe(true);
      });

      test('should have package.json', async () => {
        const fs = await import('fs');
        const packageExists = fs.existsSync(join(__dirname, 'package.json'));
        expect(packageExists).toBe(true);
      });
    });

  } catch (error) {
    console.error('❌ Test runner error:', error);
    failed++;
  }

  // Summary
  console.log('\n📊 Test Summary:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${passed + failed}`);

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run the tests
runTests().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

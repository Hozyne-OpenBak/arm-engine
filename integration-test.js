#!/usr/bin/env node
/**
 * integration-test.js - ARM v1 End-to-End Integration Test
 * 
 * Tests complete governed loop across repositories:
 * 1. Scan Hozyne-OpenBak/arm for outdated dependencies
 * 2. Create Story in Hozyne-OpenBak/openclaw-core
 * 3. Create PR in Hozyne-OpenBak/arm with cross-repo Story reference
 * 4. Output URLs and instructions for manual verification
 * 
 * Story: #18
 * Epic: #13
 */

const fs = require('fs');
const path = require('path');
const { DependencyScanner, UpdateFilter, StoryCreator, PRGenerator } = require('./src');
const config = require('./arm.config.json');

// Test configuration
const LOG_FILE = path.join(__dirname, 'test/integration/test-run.log');
const RESULT_FILE = path.join(__dirname, 'test/integration/test-results.json');

class IntegrationTest {
  constructor() {
    this.results = {
      testId: `test-${Date.now()}`,
      timestamp: new Date().toISOString(),
      steps: [],
      urls: {},
      success: false
    };
    this.logs = [];
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message}`;
    console.log(logLine);
    this.logs.push(logLine);
  }

  recordStep(step, status, data = {}) {
    this.results.steps.push({
      step,
      status,
      timestamp: new Date().toISOString(),
      ...data
    });
  }

  async run() {
    this.log('🦞 ARM v1 Integration Test - Epic #13');
    this.log(`Test ID: ${this.results.testId}`);
    this.log(`Target: ${config.target.repository}`);
    this.log(`Governance: ${config.governance.repository}\n`);

    try {
      // Step 1: Scan for outdated dependencies
      this.log('Step 1: Scanning repository for outdated dependencies...');
      const scanner = new DependencyScanner(config.target.repository);
      const report = await scanner.scan();
      
      this.recordStep('scan', 'success', {
        scannedAt: report.scannedAt,
        dependenciesFound: report.dependencies.length
      });
      
      this.log(`✅ Scan complete: Found ${report.dependencies.length} outdated dependencies`);
      
      if (report.dependencies.length === 0) {
        this.log('❌ No outdated dependencies found. Test cannot proceed.');
        this.results.success = false;
        return this.saveResults();
      }

      // Step 2: Filter dependencies
      this.log('\nStep 2: Applying filter policy...');
      const filter = new UpdateFilter(config.policy);
      const filtered = filter.filter(report);
      
      this.recordStep('filter', 'success', {
        recommended: filtered.recommended.length,
        excluded: filtered.excluded.length
      });
      
      this.log(`✅ Filter applied: ${filtered.recommended.length} recommended, ${filtered.excluded.length} excluded`);
      
      if (filtered.recommended.length === 0) {
        this.log('❌ No recommended updates after filtering. Test cannot proceed.');
        this.results.success = false;
        return this.saveResults();
      }

      // Test with first recommended dependency
      const dep = filtered.recommended[0];
      this.log(`\nTesting with: ${dep.package} (${dep.current} → ${dep.wanted})\n`);

      // Step 3: Create Story in governance repo
      this.log('Step 3: Creating Story in governance repository...');
      const storyCreator = new StoryCreator({
        governanceRepo: config.governance.repository,
        epicNumber: config.governance.epicNumber,
        targetRepo: config.target.repository
      });

      // Check for existing Story first
      const existingStory = await storyCreator.findExistingStory(dep);
      let story;
      
      if (existingStory) {
        this.log(`⚠️  Story already exists: #${existingStory.number}`);
        this.log(`   Using existing Story for test: ${existingStory.url}`);
        story = existingStory;
        
        this.recordStep('story', 'existing', {
          storyNumber: story.number,
          storyUrl: story.url,
          title: story.title
        });
      } else {
        story = await storyCreator.createStory(dep, report.ecosystem, false); // REAL creation
        
        this.recordStep('story', 'created', {
          storyNumber: story.number,
          storyUrl: story.url,
          title: story.title
        });
        
        this.log(`✅ Story created: #${story.number}`);
      }
      
      this.log(`   URL: ${story.url}`);
      this.results.urls.story = story.url;

      // Step 4: Create PR in target repo
      this.log('\nStep 4: Creating PR in target repository...');
      const prGenerator = new PRGenerator({
        targetRepo: config.target.repository,
        baseBranch: config.target.branch
      });

      // Check for existing PR first
      const existingPR = await prGenerator.findExistingPR(dep);
      let pr;
      
      if (existingPR) {
        this.log(`⚠️  PR already exists: #${existingPR.number}`);
        this.log(`   Using existing PR for test: ${existingPR.url}`);
        pr = existingPR;
        pr.storyNumber = story.number; // Update story reference
        
        this.recordStep('pr', 'existing', {
          prNumber: pr.number,
          prUrl: pr.url,
          branch: pr.branch
        });
      } else {
        pr = await prGenerator.createPR(dep, story.number, config.governance.repository, false); // REAL creation
        
        this.recordStep('pr', 'created', {
          prNumber: pr.number,
          prUrl: pr.url,
          branch: pr.branch,
          storyReference: `${config.governance.repository}#${story.number}`
        });
        
        this.log(`✅ PR created: #${pr.number}`);
      }
      
      this.log(`   URL: ${pr.url}`);
      this.log(`   Branch: ${pr.branch}`);
      this.results.urls.pr = pr.url;

      // Step 5: Verification instructions
      this.log('\nStep 5: Manual verification required\n');
      this.log('═══════════════════════════════════════════════════════════════');
      this.log('MANUAL VERIFICATION STEPS:');
      this.log('═══════════════════════════════════════════════════════════════');
      this.log(`1. Review Story: ${story.url}`);
      this.log(`   - Verify Story is in Epic #13`);
      this.log(`   - Verify Story has correct labels`);
      this.log(`   - Verify Story template is complete\n`);
      
      this.log(`2. Review PR: ${pr.url}`);
      this.log(`   - Verify PR references Story with: Closes ${config.governance.repository}#${story.number}`);
      this.log(`   - Verify PR validation workflows pass`);
      this.log(`   - Verify package.json and package-lock.json updated\n`);
      
      this.log(`3. Merge PR in target repo`);
      this.log(`   - Click "Merge pull request" in GitHub UI`);
      this.log(`   - OR via CLI: gh pr merge ${pr.number} --repo ${config.target.repository} --squash\n`);
      
      this.log(`4. Verify Story auto-closure`);
      this.log(`   - Navigate to: ${story.url}`);
      this.log(`   - Verify Story status changed to "Closed"`);
      this.log(`   - Verify status label changed to "status/completed" (if workflow exists)\n`);
      
      this.log('═══════════════════════════════════════════════════════════════\n');

      this.results.success = true;
      this.results.verificationRequired = true;
      this.results.verificationSteps = [
        `Review Story: ${story.url}`,
        `Review PR: ${pr.url}`,
        `Merge PR: gh pr merge ${pr.number} --repo ${config.target.repository} --squash`,
        `Verify Story closed: ${story.url}`
      ];

      this.log('✅ Integration test setup complete!');
      this.log('   Story and PR created successfully.');
      this.log('   Follow manual verification steps above.\n');

    } catch (error) {
      this.log(`❌ Test failed: ${error.message}`);
      this.recordStep('error', 'failed', { error: error.message });
      this.results.success = false;
    }

    return this.saveResults();
  }

  saveResults() {
    // Ensure test directory exists
    const testDir = path.dirname(LOG_FILE);
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // Save logs
    fs.writeFileSync(LOG_FILE, this.logs.join('\n'), 'utf8');
    this.log(`\n📝 Logs saved to: ${LOG_FILE}`);

    // Save results
    fs.writeFileSync(RESULT_FILE, JSON.stringify(this.results, null, 2), 'utf8');
    this.log(`📊 Results saved to: ${RESULT_FILE}\n`);

    return this.results;
  }
}

// Run test
if (require.main === module) {
  const test = new IntegrationTest();
  test.run().then(results => {
    process.exit(results.success ? 0 : 1);
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { IntegrationTest };

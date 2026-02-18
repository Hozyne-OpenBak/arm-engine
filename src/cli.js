#!/usr/bin/env node
/**
 * cli.js - ARM v1 CLI Entry Point for GitHub Actions
 * 
 * Reads configuration from environment variables and executes ARM workflow.
 * 
 * Environment Variables:
 *   ARM_TARGET_REPO - Target repository (e.g., "Hozyne-OpenBak/arm")
 *   ARM_DRY_RUN - Dry run mode ("true" or "false")
 *   ARM_CONFIG_PATH - Path to config file (default: "arm.config.json")
 *   GITHUB_TOKEN - GitHub token for API calls
 * 
 * Story: #31
 * Epic: #30
 */

const fs = require('fs');
const path = require('path');
const { DependencyScanner, UpdateFilter, StoryCreator, PRGenerator } = require('./index');

async function main() {
  console.log('🦞 ARM v1 - GitHub Actions Execution\n');
  
  // Read environment variables
  const targetRepo = process.env.ARM_TARGET_REPO;
  const dryRun = process.env.ARM_DRY_RUN === 'true';
  const configPath = process.env.ARM_CONFIG_PATH || 'arm.config.json';
  const githubToken = process.env.GITHUB_TOKEN;
  
  // Validate inputs
  if (!targetRepo) {
    console.error('❌ Error: ARM_TARGET_REPO environment variable is required');
    process.exit(1);
  }
  
  if (!githubToken) {
    console.error('❌ Error: GITHUB_TOKEN environment variable is required');
    process.exit(1);
  }
  
  // Load configuration
  console.log('📋 Configuration:');
  console.log(`   Target Repository: ${targetRepo}`);
  console.log(`   Dry Run: ${dryRun ? 'YES' : 'NO'}`);
  console.log(`   Config Path: ${configPath}\n`);
  
  let config;
  try {
    const configFullPath = path.resolve(configPath);
    if (!fs.existsSync(configFullPath)) {
      console.error(`❌ Error: Config file not found: ${configFullPath}`);
      process.exit(1);
    }
    config = JSON.parse(fs.readFileSync(configFullPath, 'utf8'));
  } catch (error) {
    console.error(`❌ Error loading config: ${error.message}`);
    process.exit(1);
  }
  
  // Override target repo if provided via environment
  if (targetRepo) {
    config.target.repository = targetRepo;
  }
  
  // Step 1: Scan for outdated dependencies
  console.log('📡 Step 1: Scanning repository for outdated dependencies...');
  const scanner = new DependencyScanner(config.target.repository);
  
  let report;
  try {
    report = await scanner.scan();
    console.log(`✅ Scan complete at ${report.scannedAt}`);
    console.log(`   Found ${report.dependencies.length} outdated dependencies\n`);
  } catch (error) {
    console.error(`❌ Scan failed: ${error.message}`);
    process.exit(1);
  }
  
  if (report.dependencies.length === 0) {
    console.log('🎉 No outdated dependencies found!');
    console.log('\n✨ ARM execution complete. Nothing to do.\n');
    return;
  }
  
  // Step 2: Apply filter policy
  console.log('🔍 Step 2: Applying filter policy...');
  console.log(`   Policy: patch=${config.policy.allowPatch}, minor=${config.policy.allowMinor}, major=${config.policy.allowMajor}\n`);
  
  const filter = new UpdateFilter(config.policy);
  const results = filter.filter(report);
  
  console.log(filter.getSummary(results));
  console.log('');
  
  if (results.recommended.length === 0) {
    console.log('⚠️  No updates recommended after filtering.');
    console.log('\n✨ ARM execution complete. Nothing to do.\n');
    return;
  }
  
  // Step 3: Plan Story and PR creation
  console.log('📝 Step 3: Planning Story and PR creation...\n');
  
  const plannedActions = [];
  
  for (const dep of results.recommended) {
    const action = {
      package: dep.package,
      current: dep.current,
      wanted: dep.wanted,
      type: dep.type,
      storyTitle: `Update ${dep.package} from ${dep.current} to ${dep.wanted}`,
      prTitle: `Update ${dep.package} to ${dep.wanted}`,
      prBranch: `arm/update-${dep.package.replace(/[@/]/g, '-')}-${dep.wanted.replace(/\./g, '-')}`
    };
    
    plannedActions.push(action);
  }
  
  // Output planned actions
  console.log('Planned Actions:');
  console.log('─'.repeat(80));
  
  for (const action of plannedActions) {
    console.log(`\n📦 ${action.package} (${action.type} update)`);
    console.log(`   Current: ${action.current}`);
    console.log(`   Target:  ${action.wanted}`);
    console.log(`   Story:   "${action.storyTitle}"`);
    console.log(`   PR:      "${action.prTitle}"`);
    console.log(`   Branch:  ${action.prBranch}`);
  }
  
  console.log('\n' + '─'.repeat(80));
  console.log(`\nTotal planned: ${plannedActions.length} Story + PR pairs\n`);
  
  // Dry-run vs production mode
  if (dryRun) {
    console.log('🔒 DRY RUN MODE: No API calls will be made.');
    console.log('   To execute for real, set ARM_DRY_RUN=false\n');
    
    console.log('✨ ARM execution complete (dry-run).\n');
  } else {
    console.log('🚀 PRODUCTION MODE: Creating Stories and PRs...\n');
    
    const storyCreator = new StoryCreator({
      governanceRepo: config.governance.repository,
      epicNumber: config.governance.epicNumber,
      targetRepo: config.target.repository
    });
    
    const prGenerator = new PRGenerator({
      targetRepo: config.target.repository,
      baseBranch: config.target.branch
    });
    
    for (const dep of results.recommended) {
      console.log(`\nProcessing: ${dep.package} (${dep.current} → ${dep.wanted})`);
      
      // Create Story
      try {
        const story = await storyCreator.createStory(dep, report.ecosystem, false);
        console.log(`✅ Story created: ${story.url}`);
        
        // Create PR
        try {
          const pr = await prGenerator.createPR(dep, story.number, config.governance.repository, false);
          console.log(`✅ PR created: ${pr.url}`);
        } catch (error) {
          console.error(`❌ PR creation failed: ${error.message}`);
        }
      } catch (error) {
        console.error(`❌ Story creation failed: ${error.message}`);
      }
    }
    
    console.log('\n✨ ARM execution complete (production).\n');
  }
}

// Run CLI
main().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  console.error(error.stack);
  process.exit(1);
});

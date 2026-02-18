#!/usr/bin/env node
/**
 * demo.js - Demo script for ARM v1 end-to-end workflow
 * 
 * Usage: 
 *   node demo.js                    # Scan only
 *   node demo.js --create-story     # Scan + Story creation (dry-run)
 *   node demo.js --full             # Scan + Story + PR (dry-run)
 * 
 * Scans Hozyne-OpenBak/arm repository and demonstrates ARM v1 workflow.
 * 
 * Story: #15, #16, #17
 * Epic: #13
 */

const { DependencyScanner, UpdateFilter, StoryCreator, PRGenerator } = require('./src');
const config = require('./arm.config.json');

const shouldCreateStory = process.argv.includes('--create-story') || process.argv.includes('--full');
const shouldCreatePR = process.argv.includes('--full');

async function demo() {
  console.log('🦞 ARM v1 End-to-End Demo\n');
  console.log(`Target: ${config.target.repository}`);
  console.log(`Policy: patch=${config.policy.allowPatch}, minor=${config.policy.allowMinor}, major=${config.policy.allowMajor}\n`);
  
  console.log('📡 Step 1: Scanning repository...');
  const scanner = new DependencyScanner(config.target.repository);
  
  try {
    const report = await scanner.scan();
    console.log(`✅ Scan complete at ${report.scannedAt}`);
    console.log(`   Found ${report.dependencies.length} outdated dependencies\n`);
    
    if (report.dependencies.length === 0) {
      console.log('🎉 No outdated dependencies found!');
      return;
    }
    
    console.log('🔍 Step 2: Applying filter policy...');
    const filter = new UpdateFilter(config.policy);
    const results = filter.filter(report);
    
    console.log('\n' + filter.getSummary(results));
    
    if (results.recommended.length === 0) {
      console.log('\n⚠️  No updates recommended after filtering.');
      return;
    }

    // Story creation demo
    let stories = [];
    if (shouldCreateStory) {
      console.log('\n📝 Step 3: Story Creation (Dry-Run)\n');
      
      const storyCreator = new StoryCreator({
        governanceRepo: config.governance.repository,
        epicNumber: config.governance.epicNumber,
        targetRepo: config.target.repository
      });
      
      for (const dep of results.recommended) {
        console.log(`Creating Story for ${dep.package}...`);
        const story = await storyCreator.createStory(dep, report.ecosystem, true); // dry-run
        stories.push(story);
        
        console.log(`✅ Story created: ${story.title}`);
        console.log(`   URL: ${story.url}\n`);
      }
    }

    // PR creation demo
    if (shouldCreatePR) {
      console.log('🚀 Step 4: PR Generation (Dry-Run)\n');
      
      const prGenerator = new PRGenerator({
        targetRepo: config.target.repository,
        baseBranch: config.target.branch
      });
      
      for (let i = 0; i < results.recommended.length; i++) {
        const dep = results.recommended[i];
        const story = stories[i];
        
        console.log(`Creating PR for ${dep.package}...`);
        const pr = await prGenerator.createPR(dep, story.number || 999, config.governance.repository, true); // dry-run
        
        console.log(`✅ PR created: [Story #${pr.storyNumber}] ${dep.package}`);
        console.log(`   Branch: ${pr.branch}`);
        console.log(`   PR URL: ${pr.url}`);
        console.log(`   Story URL: ${story.url}\n`);
        
        console.log('   PR body preview:');
        console.log('   ' + '─'.repeat(58));
        console.log('   ' + pr.body.split('\n').slice(0, 10).join('\n   '));
        console.log('   ' + '─'.repeat(58));
        console.log('   ...(truncated)...\n');
      }
    }
    
    console.log('✨ Demo complete!\n');
    
    if (!shouldCreateStory && results.recommended.length > 0) {
      console.log('💡 Tip: Run with --create-story to see Story creation');
      console.log('💡 Tip: Run with --full to see full workflow (Story + PR)\n');
    } else if (shouldCreateStory && !shouldCreatePR) {
      console.log('💡 Tip: Run with --full to see PR generation\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

demo();

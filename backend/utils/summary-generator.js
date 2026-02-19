/**
 * summary-generator.js - GitHub Actions Job Summary Generator
 * 
 * Generates markdown summaries for GitHub Actions UI using $GITHUB_STEP_SUMMARY.
 * 
 * Story: #34
 * Task: T34.3
 * Epic: #30
 */

const fs = require('fs');

/**
 * @typedef {Object} ExecutionResult
 * @property {string} packageName - Package name
 * @property {string} current - Current version
 * @property {string} wanted - Target version
 * @property {string} type - Change type (patch/minor/major)
 * @property {Object|null} storyUrl - Story URL info {number, url} or null
 * @property {Object|null} prUrl - PR URL info {number, url} or null
 * @property {string} status - Status emoji + text (e.g., "✅ Created", "⏭️ Skipped")
 */

/**
 * Generate markdown summary table from execution results
 * @param {ExecutionResult[]} results - Array of execution results
 * @returns {string} Markdown formatted summary
 */
function generateMarkdownSummary(results) {
  if (!results || results.length === 0) {
    return `## ARM Execution Summary

No dependencies processed.
`;
  }

  const tableHeader = `| Package | Story | PR | Status |
|---------|-------|----|---------|`;

  const tableRows = results.map(result => {
    const { packageName, storyUrl, prUrl, status } = result;
    const formattedStory = storyUrl 
      ? `[#${storyUrl.number}](${storyUrl.url})` 
      : 'N/A';
    const formattedPR = prUrl 
      ? `[#${prUrl.number}](${prUrl.url})` 
      : 'N/A';
    return `| ${packageName} | ${formattedStory} | ${formattedPR} | ${status} |`;
  }).join('\n');

  // Calculate summary counts
  const totalCount = results.length;
  const createdCount = results.filter(r => r.status.includes('✅')).length;
  const skippedCount = results.filter(r => r.status.includes('⏭️')).length;
  const failedCount = results.filter(r => r.status.includes('❌')).length;

  const summaryRow = `\n**Total:** ${totalCount} | **Created:** ${createdCount} | **Skipped:** ${skippedCount} | **Failed:** ${failedCount}`;

  return `## ARM Execution Summary

${tableHeader}
${tableRows}
${summaryRow}
`;
}

/**
 * Write job summary to GitHub Actions (if in Actions context)
 * @param {ExecutionResult[]} results - Array of execution results
 */
function writeJobSummary(results) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  
  if (!summaryPath) {
    // Not running in GitHub Actions context, skip summary
    return;
  }

  try {
    const summary = generateMarkdownSummary(results);
    fs.appendFileSync(summaryPath, summary, 'utf8');
    console.log('📊 GitHub Actions job summary written');
  } catch (error) {
    console.warn(`⚠️  Warning: Could not write job summary: ${error.message}`);
  }
}

module.exports = {
  generateMarkdownSummary,
  writeJobSummary
};

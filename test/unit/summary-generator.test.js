/**
 * summary-generator.test.js - Unit tests for GitHub Actions Summary Generator
 * 
 * Story: #34
 * Task: T34.7
 * Epic: #30
 */

const { generateMarkdownSummary, writeJobSummary } = require('../../src/utils/summary-generator');
const fs = require('fs');

describe('generateMarkdownSummary', () => {
  test('generates summary for valid results', () => {
    const results = [
      {
        packageName: 'express',
        current: '4.17.1',
        wanted: '4.18.2',
        type: 'minor',
        storyUrl: { number: 123, url: 'https://github.com/owner/repo/issues/123' },
        prUrl: { number: 45, url: 'https://github.com/owner/repo/pull/45' },
        status: '✅ Created'
      },
      {
        packageName: 'lodash',
        current: '4.17.20',
        wanted: '4.17.21',
        type: 'patch',
        storyUrl: { number: 124, url: 'https://github.com/owner/repo/issues/124' },
        prUrl: null,
        status: '⏭️ Skipped'
      }
    ];

    const summary = generateMarkdownSummary(results);

    expect(summary).toContain('## ARM Execution Summary');
    expect(summary).toContain('| Package | Story | PR | Status |');
    expect(summary).toContain('| express |');
    expect(summary).toContain('[#123](https://github.com/owner/repo/issues/123)');
    expect(summary).toContain('[#45](https://github.com/owner/repo/pull/45)');
    expect(summary).toContain('✅ Created');
    expect(summary).toContain('| lodash |');
    expect(summary).toContain('N/A');
    expect(summary).toContain('⏭️ Skipped');
    expect(summary).toContain('**Total:** 2');
    expect(summary).toContain('**Created:** 1');
    expect(summary).toContain('**Skipped:** 1');
    expect(summary).toContain('**Failed:** 0');
  });

  test('handles empty results', () => {
    const summary = generateMarkdownSummary([]);

    expect(summary).toContain('## ARM Execution Summary');
    expect(summary).toContain('No dependencies processed');
  });

  test('handles null results', () => {
    const summary = generateMarkdownSummary(null);

    expect(summary).toContain('No dependencies processed');
  });

  test('handles results without URLs', () => {
    const results = [
      {
        packageName: 'react',
        current: '17.0.0',
        wanted: '18.0.0',
        type: 'major',
        storyUrl: null,
        prUrl: null,
        status: '❌ Failed'
      }
    ];

    const summary = generateMarkdownSummary(results);

    expect(summary).toContain('| react | N/A | N/A | ❌ Failed |');
    expect(summary).toContain('**Failed:** 1');
  });

  test('correctly counts different status types', () => {
    const results = [
      { packageName: 'a', storyUrl: null, prUrl: null, status: '✅ Created' },
      { packageName: 'b', storyUrl: null, prUrl: null, status: '✅ Created' },
      { packageName: 'c', storyUrl: null, prUrl: null, status: '⏭️ Skipped' },
      { packageName: 'd', storyUrl: null, prUrl: null, status: '❌ Failed' }
    ];

    const summary = generateMarkdownSummary(results);

    expect(summary).toContain('**Total:** 4');
    expect(summary).toContain('**Created:** 2');
    expect(summary).toContain('**Skipped:** 1');
    expect(summary).toContain('**Failed:** 1');
  });
});

describe('writeJobSummary', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('writes summary when GITHUB_STEP_SUMMARY is set', () => {
    const tempFile = '/tmp/test-summary.txt';
    process.env.GITHUB_STEP_SUMMARY = tempFile;

    // Clean up temp file if it exists
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }

    const results = [
      {
        packageName: 'express',
        storyUrl: { number: 123, url: 'https://github.com/owner/repo/issues/123' },
        prUrl: { number: 45, url: 'https://github.com/owner/repo/pull/45' },
        status: '✅ Created'
      }
    ];

    writeJobSummary(results);

    expect(fs.existsSync(tempFile)).toBe(true);
    const content = fs.readFileSync(tempFile, 'utf8');
    expect(content).toContain('## ARM Execution Summary');
    expect(content).toContain('express');

    // Clean up
    fs.unlinkSync(tempFile);
  });

  test('does not write when GITHUB_STEP_SUMMARY is not set', () => {
    delete process.env.GITHUB_STEP_SUMMARY;

    const results = [
      {
        packageName: 'express',
        storyUrl: null,
        prUrl: null,
        status: '✅ Created'
      }
    ];

    // Should not throw
    expect(() => writeJobSummary(results)).not.toThrow();
  });

  test('handles write errors gracefully', () => {
    process.env.GITHUB_STEP_SUMMARY = '/invalid/path/summary.txt';

    const results = [
      {
        packageName: 'express',
        storyUrl: null,
        prUrl: null,
        status: '✅ Created'
      }
    ];

    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    writeJobSummary(results);

    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Could not write job summary'));

    consoleWarnSpy.mockRestore();
  });
});

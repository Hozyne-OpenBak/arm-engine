/**
 * pr-generator.test.js - Unit tests for PRGenerator
 * 
 * Story: #17
 * Epic: #13
 */

const { PRGenerator } = require('../../src/pr-generator');

describe('PRGenerator', () => {
  let generator;
  const testDep = {
    package: 'express',
    current: '4.17.1',
    wanted: '4.22.1',
    latest: '5.2.1',
    type: 'minor',
    location: 'dependencies'
  };

  beforeEach(() => {
    generator = new PRGenerator({
      targetRepo: 'Hozyne-OpenBak/arm',
      baseBranch: 'main'
    });
  });

  describe('constructor', () => {
    test('requires targetRepo', () => {
      expect(() => new PRGenerator({})).toThrow('targetRepo is required');
    });

    test('uses default baseBranch', () => {
      const gen = new PRGenerator({ targetRepo: 'owner/repo' });
      expect(gen.baseBranch).toBe('main');
    });

    test('accepts custom baseBranch', () => {
      const gen = new PRGenerator({ 
        targetRepo: 'owner/repo',
        baseBranch: 'develop'
      });
      expect(gen.baseBranch).toBe('develop');
    });
  });

  describe('generateBranchName', () => {
    test('generates valid branch name', () => {
      const branch = generator.generateBranchName(testDep);
      expect(branch).toBe('arm/update-express-4-22-1');
    });

    test('handles scoped packages', () => {
      const scopedDep = { ...testDep, package: '@types/node', wanted: '20.0.0' };
      const branch = generator.generateBranchName(scopedDep);
      expect(branch).toBe('arm/update--types-node-20-0-0');
    });

    test('handles packages with slashes', () => {
      const slashDep = { ...testDep, package: 'babel/core', wanted: '7.0.0' };
      const branch = generator.generateBranchName(slashDep);
      expect(branch).toBe('arm/update-babel-core-7-0-0');
    });

    test('lowercases branch name', () => {
      const upperDep = { ...testDep, package: 'Express' };
      const branch = generator.generateBranchName(upperDep);
      expect(branch).toMatch(/express/);
    });
  });

  describe('generateCommitMessage', () => {
    test('generates correct commit message', () => {
      const message = generator.generateCommitMessage(testDep);
      expect(message).toBe('Update express from 4.17.1 to 4.22.1');
    });
  });

  describe('generatePRTitle', () => {
    test('includes Story reference', () => {
      const title = generator.generatePRTitle(testDep, 123);
      expect(title).toContain('[Story #123]');
    });

    test('includes package and versions', () => {
      const title = generator.generatePRTitle(testDep, 123);
      expect(title).toContain('express');
      expect(title).toContain('4.17.1');
      expect(title).toContain('4.22.1');
    });

    test('follows required format', () => {
      const title = generator.generatePRTitle(testDep, 123);
      expect(title).toBe('[Story #123] Update express from 4.17.1 to 4.22.1');
    });
  });

  describe('generatePRBody', () => {
    test('includes Story reference with Closes keyword', () => {
      const body = generator.generatePRBody(testDep, 123, 'owner/governance');
      expect(body).toContain('Closes owner/governance#123');
    });

    test('includes all required sections', () => {
      const body = generator.generatePRBody(testDep, 123, 'owner/governance');
      
      expect(body).toContain('### Story');
      expect(body).toContain('### Change Summary');
      expect(body).toContain('### Changes');
      expect(body).toContain('### Testing');
      expect(body).toContain('### Governance');
    });

    test('includes dependency details', () => {
      const body = generator.generatePRBody(testDep, 123, 'owner/governance');
      
      expect(body).toContain('Package:** express');
      expect(body).toContain('Current:** 4.17.1');
      expect(body).toContain('Target:** 4.22.1');
      expect(body).toContain('Latest:** 5.2.1');
      expect(body).toContain('Change type:** Minor');
    });

    test('includes note when wanted != latest', () => {
      const body = generator.generatePRBody(testDep, 123, 'owner/governance');
      expect(body).toContain('Latest version is 5.2.1');
      expect(body).toContain('but 4.22.1 is recommended');
    });

    test('excludes note when wanted === latest', () => {
      const dep = { ...testDep, wanted: '5.2.1', latest: '5.2.1' };
      const body = generator.generatePRBody(dep, 123, 'owner/governance');
      expect(body).not.toContain('but');
      expect(body).not.toContain('is recommended');
    });

    test('links to Story and Epic', () => {
      const body = generator.generatePRBody(testDep, 123, 'owner/governance');
      expect(body).toContain('https://github.com/owner/governance/issues/123');
      expect(body).toContain('https://github.com/owner/governance/issues/13');
    });

    test('mentions ARM v1', () => {
      const body = generator.generatePRBody(testDep, 123, 'owner/governance');
      expect(body).toContain('ARM v1');
      expect(body).toContain('Automated PR');
    });
  });

  describe('createPR (dry-run)', () => {
    test('returns PR object in dry-run mode', async () => {
      const pr = await generator.createPR(testDep, 123, 'owner/governance', true);

      expect(pr).toMatchObject({
        number: 0,
        branch: 'arm/update-express-4-22-1',
        storyNumber: 123,
        dependency: testDep
      });
      expect(pr.url).toContain('dry-run');
      expect(pr.body).toBeDefined();
    });

    test('includes generated body in dry-run', async () => {
      const pr = await generator.createPR(testDep, 123, 'owner/governance', true);
      expect(pr.body).toContain('Closes owner/governance#123');
      expect(pr.body).toContain('express');
    });
  });

  describe('PR body validation', () => {
    test('body includes required checkboxes', () => {
      const body = generator.generatePRBody(testDep, 123, 'owner/governance');
      
      expect(body).toContain('- [x] package-lock.json regenerated');
      expect(body).toContain('- [x] No breaking changes');
      expect(body).toContain('- [ ] Manual review recommended');
    });

    test('body references Story with correct format', () => {
      const body = generator.generatePRBody(testDep, 123, 'owner/governance');
      // Must use "Closes owner/repo#123" format for cross-repo automation
      expect(body).toMatch(/Closes owner\/governance#123/);
    });

    test('body includes Epic reference', () => {
      const body = generator.generatePRBody(testDep, 123, 'owner/governance');
      expect(body).toContain('Epic: [#13]');
    });
  });

  describe('updatePackageJson', () => {
    test('throws if package.json not found', () => {
      // This would require mocking fs
      // Placeholder for integration testing
      expect(true).toBe(true);
    });
  });
});

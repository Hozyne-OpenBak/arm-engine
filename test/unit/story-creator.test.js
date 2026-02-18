/**
 * story-creator.test.js - Unit tests for StoryCreator
 * 
 * Story: #16
 * Epic: #13
 */

const { StoryCreator } = require('../../src/story-creator');

describe('StoryCreator', () => {
  let creator;
  const testDep = {
    package: 'express',
    current: '4.17.1',
    wanted: '4.22.1',
    latest: '5.2.1',
    type: 'minor',
    location: 'dependencies'
  };

  beforeEach(() => {
    creator = new StoryCreator({
      governanceRepo: 'Hozyne-OpenBak/openclaw-core',
      epicNumber: 13,
      targetRepo: 'Hozyne-OpenBak/arm'
    });
  });

  describe('constructor', () => {
    test('requires governanceRepo', () => {
      expect(() => new StoryCreator({
        epicNumber: 13,
        targetRepo: 'owner/repo'
      })).toThrow('governanceRepo is required');
    });

    test('requires epicNumber', () => {
      expect(() => new StoryCreator({
        governanceRepo: 'owner/governance',
        targetRepo: 'owner/repo'
      })).toThrow('epicNumber is required');
    });

    test('requires targetRepo', () => {
      expect(() => new StoryCreator({
        governanceRepo: 'owner/governance',
        epicNumber: 13
      })).toThrow('targetRepo is required');
    });

    test('accepts valid config', () => {
      expect(() => new StoryCreator({
        governanceRepo: 'owner/governance',
        epicNumber: 13,
        targetRepo: 'owner/repo'
      })).not.toThrow();
    });
  });

  describe('generateTitle', () => {
    test('generates correct title for Node.js', () => {
      const title = creator.generateTitle(testDep, 'nodejs');
      expect(title).toBe('Update express (Node.js) from 4.17.1 to 4.22.1');
    });

    test('generates correct title for Python', () => {
      const pythonDep = { ...testDep, package: 'requests' };
      const title = creator.generateTitle(pythonDep, 'python');
      expect(title).toBe('Update requests (Python) from 4.17.1 to 4.22.1');
    });

    test('defaults to nodejs', () => {
      const title = creator.generateTitle(testDep);
      expect(title).toContain('Node.js');
    });
  });

  describe('getEcosystemLabel', () => {
    test('maps ecosystem identifiers to labels', () => {
      expect(creator.getEcosystemLabel('nodejs')).toBe('Node.js');
      expect(creator.getEcosystemLabel('python')).toBe('Python');
      expect(creator.getEcosystemLabel('ruby')).toBe('Ruby');
      expect(creator.getEcosystemLabel('go')).toBe('Go');
    });

    test('passes through unknown ecosystems', () => {
      expect(creator.getEcosystemLabel('rust')).toBe('rust');
    });
  });

  describe('generateBody', () => {
    test('includes all required sections', () => {
      const body = creator.generateBody(testDep, 'nodejs');

      // Check for required sections
      expect(body).toContain('### Epic');
      expect(body).toContain('#13');
      expect(body).toContain('### Objective');
      expect(body).toContain('### Target Repository');
      expect(body).toContain('Hozyne-OpenBak/arm');
      expect(body).toContain('### Change Details');
      expect(body).toContain('### Goals');
      expect(body).toContain('### Non-Goals');
      expect(body).toContain('### Acceptance Criteria');
      expect(body).toContain('### Tasks');
      expect(body).toContain('### Implementation Notes');
      expect(body).toContain('### PR Link');
    });

    test('includes dependency details', () => {
      const body = creator.generateBody(testDep, 'nodejs');

      expect(body).toContain('Package:** express');
      expect(body).toContain('Current version:** 4.17.1');
      expect(body).toContain('Target version:** 4.22.1');
      expect(body).toContain('Latest version:** 5.2.1');
      expect(body).toContain('Change type:** Minor');
    });

    test('includes note when wanted != latest', () => {
      const body = creator.generateBody(testDep, 'nodejs');
      expect(body).toContain('Latest version is 5.2.1');
      expect(body).toContain('but 4.22.1 is recommended');
    });

    test('excludes note when wanted === latest', () => {
      const dep = { ...testDep, wanted: '5.2.1', latest: '5.2.1' };
      const body = creator.generateBody(dep, 'nodejs');
      expect(body).not.toContain('but');
      expect(body).not.toContain('is recommended');
    });

    test('formats change type labels correctly', () => {
      const patchDep = { ...testDep, type: 'patch' };
      const minorDep = { ...testDep, type: 'minor' };
      const majorDep = { ...testDep, type: 'major' };

      expect(creator.generateBody(patchDep)).toContain('Change type:** Patch');
      expect(creator.generateBody(minorDep)).toContain('Change type:** Minor');
      expect(creator.generateBody(majorDep)).toContain('Change type:** Major');
    });
  });

  describe('createStory (dry-run)', () => {
    test('returns Story object in dry-run mode', async () => {
      const story = await creator.createStory(testDep, 'nodejs', true);

      expect(story).toMatchObject({
        number: 0,
        title: 'Update express (Node.js) from 4.17.1 to 4.22.1',
        dependency: testDep
      });
      expect(story.url).toContain('dry-run');
      expect(story.body).toBeDefined();
    });

    test('includes generated body in dry-run', async () => {
      const story = await creator.createStory(testDep, 'nodejs', true);
      expect(story.body).toContain('### Epic');
      expect(story.body).toContain('express');
    });
  });

  describe('Story template validation', () => {
    test('template includes all required checkboxes', () => {
      const body = creator.generateBody(testDep, 'nodejs');
      
      // Acceptance Criteria checkboxes
      expect(body).toContain('- [ ] Package manifest updated');
      expect(body).toContain('- [ ] Lock file regenerated');
      expect(body).toContain('- [ ] No breaking changes');
      expect(body).toContain('- [ ] PR created and linked');
      expect(body).toContain('- [ ] PR passes validation');
      expect(body).toContain('- [ ] Human review completed');

      // Task checkboxes
      expect(body).toContain('- [ ] Update package manifest');
      expect(body).toContain('- [ ] Regenerate lock file');
      expect(body).toContain('- [ ] Run basic smoke tests');
      expect(body).toContain('- [ ] Create PR with Story reference');
      expect(body).toContain('- [ ] Link PR to this Story');
    });

    test('template has no due dates', () => {
      const body = creator.generateBody(testDep, 'nodejs');
      expect(body).not.toMatch(/due.*:/i);
      expect(body).not.toMatch(/deadline/i);
      // Allow "Scanned at:" timestamp, but no other dates
      const bodyWithoutScanTimestamp = body.replace(/Scanned at:.*$/, '');
      expect(bodyWithoutScanTimestamp).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    });

    test('template references Epic', () => {
      const body = creator.generateBody(testDep, 'nodejs');
      expect(body).toMatch(/#13.*ARM v1/);
    });
  });
});

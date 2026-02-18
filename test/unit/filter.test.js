/**
 * filter.test.js - Unit tests for UpdateFilter
 * 
 * Story: #15
 * Epic: #13
 */

const { UpdateFilter } = require('../../src/filter');

describe('UpdateFilter', () => {
  describe('constructor', () => {
    test('uses default values', () => {
      const filter = new UpdateFilter({});
      expect(filter.policy.allowPatch).toBe(true);
      expect(filter.policy.allowMinor).toBe(true);
      expect(filter.policy.allowMajor).toBe(false);
      expect(filter.policy.excludePatterns).toEqual([]);
    });

    test('respects provided values', () => {
      const filter = new UpdateFilter({
        allowPatch: false,
        allowMinor: true,
        allowMajor: true,
        excludePatterns: ['@types/*']
      });
      expect(filter.policy.allowPatch).toBe(false);
      expect(filter.policy.allowMajor).toBe(true);
      expect(filter.policy.excludePatterns).toEqual(['@types/*']);
    });
  });

  describe('isExcluded', () => {
    test('matches glob patterns', () => {
      const filter = new UpdateFilter({
        excludePatterns: ['@types/*', 'eslint-*']
      });

      expect(filter.isExcluded('@types/node')).toBe(true);
      expect(filter.isExcluded('@types/react')).toBe(true);
      expect(filter.isExcluded('eslint-config-airbnb')).toBe(true);
      expect(filter.isExcluded('express')).toBe(false);
    });

    test('handles no patterns', () => {
      const filter = new UpdateFilter({});
      expect(filter.isExcluded('any-package')).toBe(false);
    });
  });

  describe('isChangeTypeAllowed', () => {
    test('respects patch policy', () => {
      const filter = new UpdateFilter({ allowPatch: false });
      expect(filter.isChangeTypeAllowed('patch')).toBe(false);
    });

    test('respects minor policy', () => {
      const filter = new UpdateFilter({ allowMinor: false });
      expect(filter.isChangeTypeAllowed('minor')).toBe(false);
    });

    test('respects major policy', () => {
      const filter = new UpdateFilter({ allowMajor: true });
      expect(filter.isChangeTypeAllowed('major')).toBe(true);
    });

    test('rejects unknown types', () => {
      const filter = new UpdateFilter({});
      expect(filter.isChangeTypeAllowed('unknown')).toBe(false);
    });
  });

  describe('filter', () => {
    test('filters by change type', () => {
      const filter = new UpdateFilter({
        allowPatch: true,
        allowMinor: true,
        allowMajor: false
      });

      const report = {
        scannedAt: '2026-02-18T03:00:00Z',
        repository: 'test/repo',
        dependencies: [
          { package: 'express', current: '4.17.1', wanted: '4.18.2', latest: '4.18.2', type: 'minor' },
          { package: 'lodash', current: '4.17.19', wanted: '4.17.21', latest: '4.17.21', type: 'patch' },
          { package: 'react', current: '17.0.2', wanted: '18.0.0', latest: '18.0.0', type: 'major' }
        ]
      };

      const result = filter.filter(report);

      expect(result.recommended).toHaveLength(2);
      expect(result.recommended.map(d => d.package)).toEqual(['express', 'lodash']);
      
      expect(result.excluded).toHaveLength(1);
      expect(result.excluded[0].dep.package).toBe('react');
      expect(result.excluded[0].reason).toContain('Major updates not allowed');
    });

    test('filters by exclusion patterns', () => {
      const filter = new UpdateFilter({
        excludePatterns: ['@types/*']
      });

      const report = {
        scannedAt: '2026-02-18T03:00:00Z',
        repository: 'test/repo',
        dependencies: [
          { package: 'express', current: '4.17.1', wanted: '4.18.2', latest: '4.18.2', type: 'minor' },
          { package: '@types/node', current: '18.0.0', wanted: '20.0.0', latest: '20.0.0', type: 'major' }
        ]
      };

      const result = filter.filter(report);

      expect(result.recommended).toHaveLength(1);
      expect(result.recommended[0].package).toBe('express');
      
      expect(result.excluded).toHaveLength(1);
      expect(result.excluded[0].dep.package).toBe('@types/node');
      expect(result.excluded[0].reason).toContain('exclusion pattern');
    });

    test('handles empty report', () => {
      const filter = new UpdateFilter({});
      const report = {
        scannedAt: '2026-02-18T03:00:00Z',
        repository: 'test/repo',
        dependencies: []
      };

      const result = filter.filter(report);
      expect(result.recommended).toHaveLength(0);
      expect(result.excluded).toHaveLength(0);
    });

    test('MVP scenario: express update', () => {
      // Real-world test case from Hozyne-OpenBak/arm
      const filter = new UpdateFilter({
        allowPatch: true,
        allowMinor: true,
        allowMajor: false
      });

      const report = {
        scannedAt: '2026-02-18T03:00:00Z',
        repository: 'Hozyne-OpenBak/arm',
        dependencies: [
          { 
            package: 'express', 
            current: '4.17.1', 
            wanted: '4.17.3',
            latest: '4.18.2', 
            type: 'minor',
            location: 'dependencies'
          }
        ]
      };

      const result = filter.filter(report);

      expect(result.recommended).toHaveLength(1);
      expect(result.recommended[0].package).toBe('express');
      expect(result.excluded).toHaveLength(0);
    });
  });

  describe('getSummary', () => {
    test('formats summary correctly', () => {
      const results = {
        recommended: [
          { package: 'express', current: '4.17.1', wanted: '4.18.2', latest: '4.18.2', type: 'minor' }
        ],
        excluded: [
          { 
            dep: { package: 'react', current: '17.0.2', wanted: '18.0.0', latest: '18.0.0', type: 'major' },
            reason: 'Major updates not allowed'
          }
        ]
      };

      const filter = new UpdateFilter({});
      const summary = filter.getSummary(results);

      expect(summary).toContain('Recommended updates: 1');
      expect(summary).toContain('express: 4.17.1 → 4.18.2 (minor)');
      expect(summary).toContain('Excluded: 1');
      expect(summary).toContain('react: 17.0.2 → 18.0.0');
    });

    test('handles no updates', () => {
      const results = { recommended: [], excluded: [] };
      const filter = new UpdateFilter({});
      const summary = filter.getSummary(results);

      expect(summary).toContain('No updates recommended');
    });
  });
});

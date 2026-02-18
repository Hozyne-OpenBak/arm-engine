/**
 * filter.test.js - Unit tests for UpdateFilter
 * 
 * Includes tests for:
 * - T32.7: Denylist filtering
 * - T32.8: Major update blocking
 * 
 * Story: #15, #32
 * Epic: #13, #30
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

  // T32.7: Denylist filtering tests
  describe('isDenylisted (T32.7)', () => {
    test('exact match for denylisted package', () => {
      const filter = new UpdateFilter({
        denylist: ['express', 'lodash', 'webpack']
      });

      expect(filter.isDenylisted('express')).toBe(true);
      expect(filter.isDenylisted('lodash')).toBe(true);
      expect(filter.isDenylisted('webpack')).toBe(true);
    });

    test('no match for non-denylisted package', () => {
      const filter = new UpdateFilter({
        denylist: ['express']
      });

      expect(filter.isDenylisted('axios')).toBe(false);
      expect(filter.isDenylisted('react')).toBe(false);
    });

    test('case-sensitive matching', () => {
      const filter = new UpdateFilter({
        denylist: ['express']
      });

      expect(filter.isDenylisted('express')).toBe(true);
      expect(filter.isDenylisted('Express')).toBe(false);
      expect(filter.isDenylisted('EXPRESS')).toBe(false);
    });

    test('no partial matching', () => {
      const filter = new UpdateFilter({
        denylist: ['express']
      });

      expect(filter.isDenylisted('express')).toBe(true);
      expect(filter.isDenylisted('express-session')).toBe(false);
      expect(filter.isDenylisted('express-validator')).toBe(false);
    });

    test('empty denylist returns false', () => {
      const filter = new UpdateFilter({
        denylist: []
      });

      expect(filter.isDenylisted('any-package')).toBe(false);
    });

    test('undefined denylist returns false', () => {
      const filter = new UpdateFilter({});
      expect(filter.isDenylisted('any-package')).toBe(false);
    });
  });

  describe('filter with denylist (T32.7)', () => {
    test('excludes denylisted packages', () => {
      const filter = new UpdateFilter({
        denylist: ['express', 'lodash']
      });

      const report = {
        scannedAt: '2026-02-18T03:00:00Z',
        repository: 'test/repo',
        dependencies: [
          { package: 'express', current: '4.17.1', wanted: '4.18.2', latest: '4.18.2', type: 'minor' },
          { package: 'lodash', current: '4.17.19', wanted: '4.17.21', latest: '4.17.21', type: 'patch' },
          { package: 'axios', current: '0.21.0', wanted: '0.27.2', latest: '0.27.2', type: 'minor' }
        ]
      };

      const result = filter.filter(report);

      expect(result.recommended).toHaveLength(1);
      expect(result.recommended[0].package).toBe('axios');
      
      expect(result.excluded).toHaveLength(2);
      expect(result.excluded.map(e => e.dep.package)).toEqual(['express', 'lodash']);
      expect(result.excluded[0].reason).toBe('Package is denylisted');
      expect(result.excluded[1].reason).toBe('Package is denylisted');
    });

    test('non-denylisted packages pass through', () => {
      const filter = new UpdateFilter({
        denylist: ['express']
      });

      const report = {
        scannedAt: '2026-02-18T03:00:00Z',
        repository: 'test/repo',
        dependencies: [
          { package: 'express', current: '4.17.1', wanted: '4.18.2', latest: '4.18.2', type: 'minor' },
          { package: 'axios', current: '0.21.0', wanted: '0.27.2', latest: '0.27.2', type: 'minor' },
          { package: 'lodash', current: '4.17.19', wanted: '4.17.21', latest: '4.17.21', type: 'patch' }
        ]
      };

      const result = filter.filter(report);

      expect(result.recommended).toHaveLength(2);
      expect(result.recommended.map(d => d.package)).toEqual(['axios', 'lodash']);
      
      expect(result.excluded).toHaveLength(1);
      expect(result.excluded[0].dep.package).toBe('express');
    });

    test('empty denylist excludes nothing', () => {
      const filter = new UpdateFilter({
        denylist: []
      });

      const report = {
        scannedAt: '2026-02-18T03:00:00Z',
        repository: 'test/repo',
        dependencies: [
          { package: 'express', current: '4.17.1', wanted: '4.18.2', latest: '4.18.2', type: 'minor' },
          { package: 'axios', current: '0.21.0', wanted: '0.27.2', latest: '0.27.2', type: 'minor' }
        ]
      };

      const result = filter.filter(report);

      expect(result.recommended).toHaveLength(2);
      expect(result.excluded).toHaveLength(0);
    });

    test('denylist with multiple packages', () => {
      const filter = new UpdateFilter({
        denylist: ['express', 'lodash', 'webpack', 'react', 'vue']
      });

      const report = {
        scannedAt: '2026-02-18T03:00:00Z',
        repository: 'test/repo',
        dependencies: [
          { package: 'express', current: '4.17.1', wanted: '4.18.2', latest: '4.18.2', type: 'minor' },
          { package: 'lodash', current: '4.17.19', wanted: '4.17.21', latest: '4.17.21', type: 'patch' },
          { package: 'webpack', current: '4.46.0', wanted: '5.76.0', latest: '5.76.0', type: 'major' },
          { package: 'axios', current: '0.21.0', wanted: '0.27.2', latest: '0.27.2', type: 'minor' }
        ]
      };

      const result = filter.filter(report);

      expect(result.recommended).toHaveLength(1);
      expect(result.recommended[0].package).toBe('axios');
      
      expect(result.excluded).toHaveLength(3);
      expect(result.excluded.map(e => e.dep.package)).toEqual(['express', 'lodash', 'webpack']);
    });

    test('case-sensitive denylist matching', () => {
      const filter = new UpdateFilter({
        denylist: ['Express']
      });

      const report = {
        scannedAt: '2026-02-18T03:00:00Z',
        repository: 'test/repo',
        dependencies: [
          { package: 'express', current: '4.17.1', wanted: '4.18.2', latest: '4.18.2', type: 'minor' },
          { package: 'Express', current: '1.0.0', wanted: '1.1.0', latest: '1.1.0', type: 'minor' }
        ]
      };

      const result = filter.filter(report);

      // 'express' (lowercase) should pass, 'Express' (capital) should be excluded
      expect(result.recommended).toHaveLength(1);
      expect(result.recommended[0].package).toBe('express');
      
      expect(result.excluded).toHaveLength(1);
      expect(result.excluded[0].dep.package).toBe('Express');
    });
  });

  // T32.8: Major update blocking tests
  describe('major update blocking (T32.8)', () => {
    test('blocks major updates when allowMajor: false', () => {
      const filter = new UpdateFilter({
        allowPatch: true,
        allowMinor: true,
        allowMajor: false
      });

      const report = {
        scannedAt: '2026-02-18T03:00:00Z',
        repository: 'test/repo',
        dependencies: [
          { package: 'express', current: '4.18.0', wanted: '5.0.0', latest: '5.0.0', type: 'major' },
          { package: 'webpack', current: '4.46.0', wanted: '5.76.0', latest: '5.76.0', type: 'major' },
          { package: 'react', current: '17.0.2', wanted: '18.2.0', latest: '18.2.0', type: 'major' }
        ]
      };

      const result = filter.filter(report);

      expect(result.recommended).toHaveLength(0);
      expect(result.excluded).toHaveLength(3);
      
      result.excluded.forEach(e => {
        expect(e.dep.type).toBe('major');
        expect(e.reason).toContain('Major updates not allowed');
      });
    });

    test('allows patch and minor but blocks major', () => {
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
          { package: 'webpack', current: '4.46.0', wanted: '5.76.0', latest: '5.76.0', type: 'major' }
        ]
      };

      const result = filter.filter(report);

      expect(result.recommended).toHaveLength(2);
      expect(result.recommended.map(d => d.package)).toEqual(['express', 'lodash']);
      expect(result.recommended[0].type).toBe('minor');
      expect(result.recommended[1].type).toBe('patch');
      
      expect(result.excluded).toHaveLength(1);
      expect(result.excluded[0].dep.package).toBe('webpack');
      expect(result.excluded[0].dep.type).toBe('major');
    });

    test('allows major updates when allowMajor: true', () => {
      const filter = new UpdateFilter({
        allowMajor: true
      });

      const report = {
        scannedAt: '2026-02-18T03:00:00Z',
        repository: 'test/repo',
        dependencies: [
          { package: 'express', current: '4.18.0', wanted: '5.0.0', latest: '5.0.0', type: 'major' }
        ]
      };

      const result = filter.filter(report);

      expect(result.recommended).toHaveLength(1);
      expect(result.recommended[0].type).toBe('major');
      expect(result.excluded).toHaveLength(0);
    });

    test('major update detection with various version jumps', () => {
      const filter = new UpdateFilter({
        allowMajor: false
      });

      const report = {
        scannedAt: '2026-02-18T03:00:00Z',
        repository: 'test/repo',
        dependencies: [
          { package: 'pkg1', current: '1.0.0', wanted: '2.0.0', latest: '2.0.0', type: 'major' },
          { package: 'pkg2', current: '3.2.1', wanted: '4.0.0', latest: '4.0.0', type: 'major' },
          { package: 'pkg3', current: '10.5.2', wanted: '11.0.0', latest: '11.0.0', type: 'major' }
        ]
      };

      const result = filter.filter(report);

      expect(result.excluded).toHaveLength(3);
      result.excluded.forEach(e => {
        expect(e.dep.type).toBe('major');
      });
    });

    test('no Stories or PRs for blocked major updates', () => {
      // This test verifies the integration behavior
      const filter = new UpdateFilter({
        allowMajor: false
      });

      const report = {
        scannedAt: '2026-02-18T03:00:00Z',
        repository: 'test/repo',
        dependencies: [
          { package: 'express', current: '4.18.0', wanted: '5.0.0', latest: '5.0.0', type: 'major' }
        ]
      };

      const result = filter.filter(report);

      // Verify major update is NOT in recommended list
      expect(result.recommended).toHaveLength(0);
      
      // Verify it IS in excluded list
      expect(result.excluded).toHaveLength(1);
      expect(result.excluded[0].dep.package).toBe('express');
      
      // This means no Story/PR will be created for this update
    });
  });

  // Combined scenarios (denylist + major blocking)
  describe('combined denylist and major blocking (T32.7 + T32.8)', () => {
    test('denylist checked before major blocking', () => {
      const filter = new UpdateFilter({
        denylist: ['webpack'],
        allowMajor: false
      });

      const report = {
        scannedAt: '2026-02-18T03:00:00Z',
        repository: 'test/repo',
        dependencies: [
          { package: 'webpack', current: '4.46.0', wanted: '5.76.0', latest: '5.76.0', type: 'major' }
        ]
      };

      const result = filter.filter(report);

      // webpack should be excluded by denylist, not major blocking
      expect(result.excluded).toHaveLength(1);
      expect(result.excluded[0].reason).toBe('Package is denylisted');
      expect(result.excluded[0].reason).not.toContain('Major');
    });

    test('multiple exclusion reasons for different packages', () => {
      const filter = new UpdateFilter({
        denylist: ['express'],
        allowMajor: false
      });

      const report = {
        scannedAt: '2026-02-18T03:00:00Z',
        repository: 'test/repo',
        dependencies: [
          { package: 'express', current: '4.17.1', wanted: '4.18.2', latest: '4.18.2', type: 'minor' },
          { package: 'webpack', current: '4.46.0', wanted: '5.76.0', latest: '5.76.0', type: 'major' },
          { package: 'axios', current: '0.21.0', wanted: '0.27.2', latest: '0.27.2', type: 'minor' }
        ]
      };

      const result = filter.filter(report);

      expect(result.recommended).toHaveLength(1);
      expect(result.recommended[0].package).toBe('axios');
      
      expect(result.excluded).toHaveLength(2);
      
      const expressExclusion = result.excluded.find(e => e.dep.package === 'express');
      expect(expressExclusion.reason).toBe('Package is denylisted');
      
      const webpackExclusion = result.excluded.find(e => e.dep.package === 'webpack');
      expect(webpackExclusion.reason).toContain('Major updates not allowed');
    });

    test('all filters working together', () => {
      const filter = new UpdateFilter({
        allowPatch: true,
        allowMinor: true,
        allowMajor: false,
        denylist: ['lodash'],
        excludePatterns: ['@types/*']
      });

      const report = {
        scannedAt: '2026-02-18T03:00:00Z',
        repository: 'test/repo',
        dependencies: [
          { package: 'express', current: '4.17.1', wanted: '4.18.2', latest: '4.18.2', type: 'minor' },
          { package: 'lodash', current: '4.17.19', wanted: '4.17.21', latest: '4.17.21', type: 'patch' },
          { package: 'webpack', current: '4.46.0', wanted: '5.76.0', latest: '5.76.0', type: 'major' },
          { package: '@types/node', current: '18.0.0', wanted: '20.0.0', latest: '20.0.0', type: 'major' },
          { package: 'axios', current: '0.21.0', wanted: '0.27.2', latest: '0.27.2', type: 'minor' }
        ]
      };

      const result = filter.filter(report);

      // Only express and axios should pass
      expect(result.recommended).toHaveLength(2);
      expect(result.recommended.map(d => d.package)).toEqual(['express', 'axios']);
      
      // lodash (denylisted), webpack (major), @types/node (pattern) excluded
      expect(result.excluded).toHaveLength(3);
      
      const lodashExcl = result.excluded.find(e => e.dep.package === 'lodash');
      expect(lodashExcl.reason).toBe('Package is denylisted');
      
      const webpackExcl = result.excluded.find(e => e.dep.package === 'webpack');
      expect(webpackExcl.reason).toContain('Major');
      
      const typesExcl = result.excluded.find(e => e.dep.package === '@types/node');
      expect(typesExcl.reason).toContain('exclusion pattern');
    });
  });
});

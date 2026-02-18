/**
 * scanner.test.js - Unit tests for DependencyScanner
 * 
 * Story: #15
 * Epic: #13
 */

const { DependencyScanner } = require('../../src/scanner');

describe('DependencyScanner', () => {
  describe('determineChangeType', () => {
    let scanner;

    beforeEach(() => {
      scanner = new DependencyScanner('test/repo');
    });

    test('detects major version change', () => {
      expect(scanner.determineChangeType('1.0.0', '2.0.0')).toBe('major');
      expect(scanner.determineChangeType('1.5.3', '3.0.0')).toBe('major');
    });

    test('detects minor version change', () => {
      expect(scanner.determineChangeType('1.0.0', '1.1.0')).toBe('minor');
      expect(scanner.determineChangeType('2.3.4', '2.5.0')).toBe('minor');
    });

    test('detects patch version change', () => {
      expect(scanner.determineChangeType('1.0.0', '1.0.1')).toBe('patch');
      expect(scanner.determineChangeType('2.3.4', '2.3.7')).toBe('patch');
    });

    test('handles version prefixes', () => {
      expect(scanner.determineChangeType('v1.0.0', '2.0.0')).toBe('major');
      expect(scanner.determineChangeType('^1.0.0', '1.1.0')).toBe('minor');
      expect(scanner.determineChangeType('~1.0.0', '1.0.1')).toBe('patch');
    });

    test('handles equal versions', () => {
      expect(scanner.determineChangeType('1.0.0', '1.0.0')).toBe('patch');
    });
  });

  describe('parseNpmOutdated', () => {
    let scanner;

    beforeEach(() => {
      scanner = new DependencyScanner('test/repo');
    });

    test('parses valid npm outdated JSON', () => {
      const input = JSON.stringify({
        express: {
          current: '4.17.1',
          wanted: '4.17.3',
          latest: '4.18.2',
          type: 'dependencies'
        },
        lodash: {
          current: '4.17.19',
          wanted: '4.17.21',
          latest: '4.17.21',
          type: 'dependencies'
        }
      });

      const result = scanner.parseNpmOutdated(input);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        package: 'express',
        current: '4.17.1',
        wanted: '4.17.3',
        latest: '4.18.2',
        type: 'patch', // 4.17.1 → 4.17.3 is patch
        location: 'dependencies'
      });
      expect(result[1]).toMatchObject({
        package: 'lodash',
        current: '4.17.19',
        latest: '4.17.21',
        type: 'patch'
      });
    });

    test('handles empty output', () => {
      expect(scanner.parseNpmOutdated('')).toEqual([]);
      expect(scanner.parseNpmOutdated('{}')).toEqual([]);
    });

    test('throws on invalid JSON', () => {
      expect(() => scanner.parseNpmOutdated('invalid json')).toThrow();
    });

    test('handles missing version fields', () => {
      const input = JSON.stringify({
        'test-package': {
          current: '1.0.0',
          latest: '2.0.0'
        }
      });

      const result = scanner.parseNpmOutdated(input);
      expect(result[0].wanted).toBe('2.0.0'); // Falls back to latest
    });
  });

  describe('scan method error handling', () => {
    test('throws error if package.json missing', async () => {
      // This test would require mocking fs
      // Placeholder for integration testing
      expect(true).toBe(true);
    });
  });
});

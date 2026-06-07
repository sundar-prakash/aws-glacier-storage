import { describe, it, expect } from 'vitest';
import { parseRestoreHeader } from '../s3';

// Replicate formatBytes for standalone testing
const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const sizeIndex = Math.min(i, sizes.length - 1);
  return parseFloat((bytes / Math.pow(k, sizeIndex)).toFixed(dm)) + ' ' + sizes[sizeIndex];
};

describe('S3 Glacier Restore Header Parser', () => {
  it('should return ARCHIVED when header is undefined', () => {
    const result = parseRestoreHeader(undefined);
    expect(result).toEqual({ status: 'ARCHIVED', expiresAt: null });
  });

  it('should return ARCHIVED when header is empty', () => {
    const result = parseRestoreHeader('');
    expect(result).toEqual({ status: 'ARCHIVED', expiresAt: null });
  });

  it('should return RESTORING when ongoing-request is true', () => {
    const result = parseRestoreHeader('ongoing-request="true"');
    expect(result).toEqual({ status: 'RESTORING', expiresAt: null });
  });

  it('should return RESTORED with ISO string expiry date when restore is complete', () => {
    const result = parseRestoreHeader('ongoing-request="false", expiry-date="Fri, 23 Dec 2022 00:00:00 GMT"');
    expect(result.status).toBe('RESTORED');
    expect(result.expiresAt).toBe('2022-12-23T00:00:00.000Z');
  });

  it('should return RESTORED with null expiry if expiry-date is malformed', () => {
    const result = parseRestoreHeader('ongoing-request="false", expiry-date="malformed-date"');
    expect(result.status).toBe('RESTORED');
    expect(result.expiresAt).toBeNull();
  });
});

describe('Large File Size Formatting (Stress Simulation)', () => {
  it('should format bytes correctly', () => {
    expect(formatBytes(0)).toBe('0 Bytes');
    expect(formatBytes(1023)).toBe('1023 Bytes');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
  });

  it('should format Gigabytes correctly', () => {
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
    expect(formatBytes(2.5 * 1024 * 1024 * 1024)).toBe('2.5 GB');
  });

  it('should format Terabytes correctly', () => {
    expect(formatBytes(1024 * 1024 * 1024 * 1024)).toBe('1 TB');
    expect(formatBytes(500 * 1024 * 1024 * 1024 * 1024)).toBe('500 TB');
  });

  it('should format Petabytes correctly without crashing', () => {
    const petabyteVal = 2.5 * 1024 * 1024 * 1024 * 1024 * 1024;
    expect(formatBytes(petabyteVal)).toBe('2.5 PB');
  });

  it('should format Exabytes correctly without crashing', () => {
    const exabyteVal = 1.2 * 1024 * 1024 * 1024 * 1024 * 1024 * 1024;
    expect(formatBytes(exabyteVal)).toBe('1.2 EB');
  });

  it('should format Zettabytes and Yottabytes correctly', () => {
    const yottabyteVal = 5 * Math.pow(1024, 8);
    expect(formatBytes(yottabyteVal)).toBe('5 YB');
  });
});

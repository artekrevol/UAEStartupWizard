import { describe, expect, test } from '@jest/globals';
import { validateUAEPhone, validateTradeLicense, validateDocumentType, validateFileSize } from '../../../shared/utils/validation';

describe('UAE Phone Validation', () => {
  test('validates correct UAE phone formats', () => {
    expect(validateUAEPhone('+971501234567')).toBe(true);
    expect(validateUAEPhone('0501234567')).toBe(true);
  });

  test('rejects incorrect UAE phone formats', () => {
    expect(validateUAEPhone('+9715012345')).toBe(false); // Too short
    expect(validateUAEPhone('+96150123456')).toBe(false); // Wrong country code
    expect(validateUAEPhone('050123456')).toBe(false); // Too short
    expect(validateUAEPhone('050123456789')).toBe(false); // Too long
  });
});

describe('Trade License Validation', () => {
  test('validates correct trade license formats', () => {
    expect(validateTradeLicense('DMCC-12345')).toBe(true);
    expect(validateTradeLicense('DED98765')).toBe(true);
  });

  test('rejects incorrect trade license formats', () => {
    expect(validateTradeLicense('')).toBe(false); // Empty
    expect(validateTradeLicense('123')).toBe(false); // Too short
    expect(validateTradeLicense('123ABC')).toBe(false); // Numbers first
    expect(validateTradeLicense('AB##123')).toBe(false); // Invalid characters
  });
});

describe('Document Type Validation', () => {
  test('accepts valid document types', () => {
    expect(validateDocumentType('passport.pdf')).toBe(true);
    expect(validateDocumentType('license.jpg')).toBe(true);
    expect(validateDocumentType('ID_CARD.PNG')).toBe(true);
    expect(validateDocumentType('contract.docx')).toBe(true);
  });

  test('rejects invalid document types', () => {
    expect(validateDocumentType('script.js')).toBe(false);
    expect(validateDocumentType('data.csv')).toBe(false);
    expect(validateDocumentType('archive.zip')).toBe(false);
    expect(validateDocumentType('image.gif')).toBe(false);
  });
});

describe('File Size Validation', () => {
  test('accepts files within size limit', () => {
    // 5MB in bytes
    expect(validateFileSize(5 * 1024 * 1024)).toBe(true);
    // 9.9MB in bytes
    expect(validateFileSize(9.9 * 1024 * 1024)).toBe(true);
    // Empty file
    expect(validateFileSize(0)).toBe(true);
  });

  test('rejects files exceeding size limit', () => {
    // 10.1MB in bytes
    expect(validateFileSize(10.1 * 1024 * 1024)).toBe(false);
    // 20MB in bytes
    expect(validateFileSize(20 * 1024 * 1024)).toBe(false);
  });

  test('accepts custom size limits', () => {
    // 15MB in bytes, with 20MB limit
    expect(validateFileSize(15 * 1024 * 1024, 20)).toBe(true);
    // 25MB in bytes, with 20MB limit
    expect(validateFileSize(25 * 1024 * 1024, 20)).toBe(false);
  });
});
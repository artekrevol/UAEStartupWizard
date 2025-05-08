import { describe, expect, test } from '@jest/globals';
import { validateEmail, validatePassword, validateBusinessName } from '../../../shared/utils/validation';

describe('Email Validation', () => {
  test('validates correct email formats', () => {
    expect(validateEmail('test@example.com')).toBe(true);
    expect(validateEmail('name.surname@domain.co.uk')).toBe(true);
    expect(validateEmail('name+tag@example.ae')).toBe(true);
  });

  test('rejects incorrect email formats', () => {
    expect(validateEmail('test@')).toBe(false);
    expect(validateEmail('test@domain')).toBe(false);
    expect(validateEmail('test.domain.com')).toBe(false);
    expect(validateEmail('')).toBe(false);
  });
});

describe('Password Validation', () => {
  test('accepts strong passwords', () => {
    expect(validatePassword('StrongP@ss123')).toBe(true);
    expect(validatePassword('Another_2Good!Pass')).toBe(true);
  });

  test('rejects weak passwords', () => {
    expect(validatePassword('password')).toBe(false);
    expect(validatePassword('12345678')).toBe(false);
    expect(validatePassword('short')).toBe(false);
    expect(validatePassword('NoSpecialChar1')).toBe(false);
  });
});

describe('Business Name Validation', () => {
  test('accepts valid business names', () => {
    expect(validateBusinessName('Acme Corporation LLC')).toBe(true);
    expect(validateBusinessName('Dubai Trading & Services')).toBe(true);
    expect(validateBusinessName('Al-Futtaim Group')).toBe(true);
  });

  test('rejects invalid business names', () => {
    expect(validateBusinessName('')).toBe(false);
    expect(validateBusinessName('a')).toBe(false); // Too short
    expect(validateBusinessName('   ')).toBe(false); // Only whitespace
    expect(validateBusinessName('Company Name with @special# characters!')).toBe(false); // Invalid characters
  });
});
/**
 * Simple validation test focusing only on email and password validation
 */

const validation = require('../../shared/utils/validation');

describe('Validation Utilities', () => {
  describe('validateEmail', () => {
    it('should accept valid email addresses', () => {
      expect(validation.validateEmail('user@example.com')).toBe(true);
      expect(validation.validateEmail('user.name@example.co.uk')).toBe(true);
      expect(validation.validateEmail('user+tag@example.org')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(validation.validateEmail('not-an-email')).toBe(false);
      expect(validation.validateEmail('missing@domain')).toBe(false);
      expect(validation.validateEmail('@example.com')).toBe(false);
      expect(validation.validateEmail('user@.com')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should accept strong passwords', () => {
      expect(validation.validatePassword('StrongP@ss123')).toBe(true);
      expect(validation.validatePassword('Another!9Password')).toBe(true);
    });

    it('should reject weak passwords', () => {
      expect(validation.validatePassword('short')).toBe(false);
      expect(validation.validatePassword('nouppercase123')).toBe(false);
      expect(validation.validatePassword('NOLOWERCASE123')).toBe(false);
      expect(validation.validatePassword('NoNumbers!')).toBe(false);
      expect(validation.validatePassword('NoSpecial123')).toBe(false);
    });
  });
});
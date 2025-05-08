/**
 * Unit tests for validation utilities
 */

const { 
  validateEmail, 
  validatePassword, 
  validateBusinessName,
  validateUAEPhone,
  validateTradeLicense,
  validateDocumentType,
  validateFileSize
} = require('../../../shared/utils/validation');

describe('Validation Utilities', () => {
  describe('validateEmail', () => {
    it('should accept valid email addresses', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('user.name@example.co.uk')).toBe(true);
      expect(validateEmail('user+tag@example.org')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(validateEmail('not-an-email')).toBe(false);
      expect(validateEmail('missing@domain')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('user@.com')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should accept strong passwords', () => {
      expect(validatePassword('StrongP@ss123')).toBe(true);
      expect(validatePassword('Another!9Password')).toBe(true);
    });

    it('should reject weak passwords', () => {
      expect(validatePassword('short')).toBe(false);
      expect(validatePassword('nouppercase123')).toBe(false);
      expect(validatePassword('NOLOWERCASE123')).toBe(false);
      expect(validatePassword('NoNumbers!')).toBe(false);
      expect(validatePassword('NoSpecial123')).toBe(false);
    });
  });

  describe('validateBusinessName', () => {
    it('should accept valid business names', () => {
      expect(validateBusinessName('Acme Corporation LLC')).toBe(true);
      expect(validateBusinessName('Global Trade & Services')).toBe(true);
      expect(validateBusinessName('UAE Business Setup Consultants FZE')).toBe(true);
    });

    it('should reject invalid business names', () => {
      expect(validateBusinessName('')).toBe(false);
      expect(validateBusinessName('ab')).toBe(false); // Too short
      expect(validateBusinessName('A'.repeat(101))).toBe(false); // Too long
    });
  });

  describe('validateUAEPhone', () => {
    it('should accept valid UAE phone numbers', () => {
      expect(validateUAEPhone('+97143211234')).toBe(true);
      expect(validateUAEPhone('00971501234567')).toBe(true);
      expect(validateUAEPhone('0501234567')).toBe(true);
    });

    it('should reject invalid UAE phone numbers', () => {
      expect(validateUAEPhone('123456')).toBe(false); // Too short
      expect(validateUAEPhone('+1234567890')).toBe(false); // Not UAE
      expect(validateUAEPhone('not-a-number')).toBe(false); 
    });
  });

  describe('validateTradeLicense', () => {
    it('should accept valid UAE trade license numbers', () => {
      expect(validateTradeLicense('ABCDE-12345')).toBe(true);
      expect(validateTradeLicense('12345/DMCC/2023')).toBe(true);
      expect(validateTradeLicense('TL-12345-SAIF')).toBe(true);
    });

    it('should reject invalid UAE trade license numbers', () => {
      expect(validateTradeLicense('')).toBe(false);
      expect(validateTradeLicense('AB')).toBe(false); // Too short
      expect(validateTradeLicense('A'.repeat(31))).toBe(false); // Too long
    });
  });
  
  describe('validateDocumentType', () => {
    it('should accept valid document types', () => {
      expect(validateDocumentType('pdf')).toBe(true);
      expect(validateDocumentType('doc')).toBe(true);
      expect(validateDocumentType('docx')).toBe(true);
      expect(validateDocumentType('jpg')).toBe(true);
      expect(validateDocumentType('png')).toBe(true);
    });

    it('should reject invalid document types', () => {
      expect(validateDocumentType('exe')).toBe(false);
      expect(validateDocumentType('js')).toBe(false);
      expect(validateDocumentType('php')).toBe(false);
    });
  });

  describe('validateFileSize', () => {
    it('should accept files within size limit', () => {
      expect(validateFileSize(5 * 1024 * 1024)).toBe(true); // 5MB
      expect(validateFileSize(1 * 1024 * 1024)).toBe(true); // 1MB
    });

    it('should reject files exceeding size limit', () => {
      expect(validateFileSize(11 * 1024 * 1024)).toBe(false); // 11MB
      expect(validateFileSize(20 * 1024 * 1024)).toBe(false); // 20MB
    });
  });
});
/**
 * Checkout Utilities Tests
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  CHECKOUT_STATUS,
  generateCheckoutReference,
  parseMemberIdFromReference,
  parseCheckoutResponse,
  validateCheckoutStatus,
  isCheckoutValid,
  getTimeUntilExpiry
} from '../src/lib/checkout.js';

describe('Checkout Utilities', () => {
  // Mock date for consistent testing
  const MOCK_NOW = new Date('2024-12-01T12:00:00Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(MOCK_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('CHECKOUT_STATUS', () => {
    it('has all expected status values', () => {
      expect(CHECKOUT_STATUS.PENDING).toBe('PENDING');
      expect(CHECKOUT_STATUS.PAID).toBe('PAID');
      expect(CHECKOUT_STATUS.FAILED).toBe('FAILED');
      expect(CHECKOUT_STATUS.EXPIRED).toBe('EXPIRED');
    });
  });

  describe('generateCheckoutReference', () => {
    it('generates reference with default prefix', () => {
      const ref = generateCheckoutReference(123);
      expect(ref).toMatch(/^ndi-123-\d+-[a-z0-9]{8}$/);
    });

    it('generates reference with custom prefix', () => {
      const ref = generateCheckoutReference(456, 'join');
      expect(ref).toMatch(/^join-456-\d+-[a-z0-9]{8}$/);
    });

    it('includes timestamp', () => {
      const ref = generateCheckoutReference(789);
      const parts = ref.split('-');
      const timestamp = Number.parseInt(parts[2], 10);
      expect(timestamp).toBe(MOCK_NOW.getTime());
    });

    it('generates unique references', () => {
      const refs = new Set();
      for (let i = 0; i < 100; i++) {
        refs.add(generateCheckoutReference(1));
      }
      // All 100 should be unique due to random suffix
      expect(refs.size).toBe(100);
    });

    it('accepts string member ID', () => {
      const ref = generateCheckoutReference('42');
      expect(ref).toMatch(/^ndi-42-/);
    });
  });

  describe('parseMemberIdFromReference', () => {
    it('extracts member ID from valid reference', () => {
      expect(parseMemberIdFromReference('ndi-123-1234567890-abc123')).toBe(123);
      expect(parseMemberIdFromReference('join-456-1234567890-xyz789')).toBe(456);
    });

    it('returns null for invalid reference', () => {
      expect(parseMemberIdFromReference(null)).toBeNull();
      expect(parseMemberIdFromReference('')).toBeNull();
      expect(parseMemberIdFromReference('invalid')).toBeNull();
      expect(parseMemberIdFromReference(123)).toBeNull();
    });

    it('returns null for non-numeric member ID', () => {
      expect(parseMemberIdFromReference('ndi-abc-timestamp-random')).toBeNull();
    });

    it('handles references with fewer parts', () => {
      expect(parseMemberIdFromReference('ndi-123')).toBe(123);
    });
  });

  describe('parseCheckoutResponse', () => {
    const validResponse = {
      id: 'checkout_123',
      status: 'PENDING',
      amount: 5,
      currency: 'EUR',
      checkout_reference: 'ndi-42-1234567890-abc123',
      description: 'NDI Registration',
      date: '2024-12-01T10:00:00Z',
      valid_until: '2024-12-01T10:10:00Z',
      transactions: []
    };

    it('normalizes valid checkout response', () => {
      const result = parseCheckoutResponse(validResponse);

      expect(result.id).toBe('checkout_123');
      expect(result.status).toBe('PENDING');
      expect(result.amount).toBe(5);
      expect(result.amountCents).toBe(500);
      expect(result.currency).toBe('EUR');
      expect(result.reference).toBe('ndi-42-1234567890-abc123');
      expect(result.description).toBe('NDI Registration');
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.validUntil).toBeInstanceOf(Date);
      expect(result.isPaid).toBe(false);
      expect(result.isPending).toBe(true);
      expect(result.isFailed).toBe(false);
      expect(result.isExpired).toBe(false);
      expect(result.transactions).toEqual([]);
      expect(result.transactionId).toBeNull();
    });

    it('handles PAID status correctly', () => {
      const paidResponse = {
        ...validResponse,
        status: 'PAID',
        transactions: [{
          id: 'tx_abc',
          status: 'SUCCESSFUL',
          amount: 5,
          currency: 'EUR'
        }]
      };

      const result = parseCheckoutResponse(paidResponse);
      expect(result.isPaid).toBe(true);
      expect(result.isPending).toBe(false);
      expect(result.transactionId).toBe('tx_abc');
    });

    it('handles FAILED status correctly', () => {
      const result = parseCheckoutResponse({ ...validResponse, status: 'FAILED' });
      expect(result.isFailed).toBe(true);
      expect(result.isPaid).toBe(false);
    });

    it('handles EXPIRED status correctly', () => {
      const result = parseCheckoutResponse({ ...validResponse, status: 'EXPIRED' });
      expect(result.isExpired).toBe(true);
      expect(result.isPaid).toBe(false);
    });

    it('extracts transaction ID from PAID status', () => {
      const response = {
        ...validResponse,
        transactions: [
          { id: 'tx_failed', status: 'FAILED', amount: 5, currency: 'EUR' },
          { id: 'tx_success', status: 'SUCCESSFUL', amount: 5, currency: 'EUR' }
        ]
      };

      const result = parseCheckoutResponse(response);
      expect(result.transactionId).toBe('tx_success');
    });

    it('handles missing optional fields', () => {
      const minimalResponse = {
        id: 'checkout_min',
        status: 'PENDING',
        amount: 7,
        currency: 'EUR',
        checkout_reference: 'ref_123'
      };

      const result = parseCheckoutResponse(minimalResponse);
      expect(result.description).toBeNull();
      expect(result.createdAt).toBeNull();
      expect(result.validUntil).toBeNull();
      expect(result.transactions).toEqual([]);
    });

    it('returns null for null response', () => {
      expect(parseCheckoutResponse(null)).toBeNull();
      expect(parseCheckoutResponse()).toBeNull();
    });

    it('normalizes transaction amounts to cents', () => {
      const response = {
        ...validResponse,
        transactions: [{
          id: 'tx_1',
          status: 'SUCCESSFUL',
          amount: 5.5,
          currency: 'EUR'
        }]
      };

      const result = parseCheckoutResponse(response);
      expect(result.transactions[0].amount).toBe(5.5);
      expect(result.transactions[0].amountCents).toBe(550);
    });
  });

  describe('validateCheckoutStatus', () => {
    it('returns valid for PAID status', () => {
      const result = validateCheckoutStatus({ status: 'PAID' });
      expect(result.valid).toBe(true);
      expect(result.status).toBe('PAID');
      expect(result.error).toBeNull();
    });

    it('returns invalid with message for PENDING status', () => {
      const result = validateCheckoutStatus({ status: 'PENDING' });
      expect(result.valid).toBe(false);
      expect(result.status).toBe('PENDING');
      expect(result.error).toBe('Payment not yet completed');
    });

    it('returns invalid with message for FAILED status', () => {
      const result = validateCheckoutStatus({ status: 'FAILED' });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Payment failed');
    });

    it('returns invalid with message for EXPIRED status', () => {
      const result = validateCheckoutStatus({ status: 'EXPIRED' });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Checkout expired');
    });

    it('returns invalid for unknown status', () => {
      const result = validateCheckoutStatus({ status: 'UNKNOWN' });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Unknown checkout status: UNKNOWN');
    });

    it('returns invalid for null checkout', () => {
      const result = validateCheckoutStatus(null);
      expect(result.valid).toBe(false);
      expect(result.status).toBeNull();
      expect(result.error).toBe('Checkout not found');
    });
  });

  describe('isCheckoutValid', () => {
    it('returns true for PENDING checkout with future expiry', () => {
      const checkout = {
        status: 'PENDING',
        valid_until: '2024-12-01T13:00:00Z' // 1 hour from now
      };
      expect(isCheckoutValid(checkout)).toBe(true);
    });

    it('returns true for PENDING checkout without expiry', () => {
      const checkout = { status: 'PENDING' };
      expect(isCheckoutValid(checkout)).toBe(true);
    });

    it('returns false for PAID checkout', () => {
      expect(isCheckoutValid({ status: 'PAID' })).toBe(false);
    });

    it('returns false for FAILED checkout', () => {
      expect(isCheckoutValid({ status: 'FAILED' })).toBe(false);
    });

    it('returns false for EXPIRED checkout', () => {
      expect(isCheckoutValid({ status: 'EXPIRED' })).toBe(false);
    });

    it('returns false for expired PENDING checkout', () => {
      const checkout = {
        status: 'PENDING',
        valid_until: '2024-12-01T11:00:00Z' // 1 hour ago
      };
      expect(isCheckoutValid(checkout)).toBe(false);
    });

    it('handles normalized validUntil property', () => {
      const checkout = {
        status: 'PENDING',
        validUntil: new Date('2024-12-01T13:00:00Z')
      };
      expect(isCheckoutValid(checkout)).toBe(true);
    });

    it('returns false for null checkout', () => {
      expect(isCheckoutValid(null)).toBe(false);
    });
  });

  describe('getTimeUntilExpiry', () => {
    it('returns milliseconds until expiry', () => {
      const checkout = {
        valid_until: '2024-12-01T12:10:00Z' // 10 minutes from now
      };
      expect(getTimeUntilExpiry(checkout)).toBe(10 * 60 * 1000);
    });

    it('returns 0 for expired checkout', () => {
      const checkout = {
        valid_until: '2024-12-01T11:00:00Z' // 1 hour ago
      };
      expect(getTimeUntilExpiry(checkout)).toBe(0);
    });

    it('returns null for checkout without expiry', () => {
      expect(getTimeUntilExpiry({ status: 'PENDING' })).toBeNull();
    });

    it('returns null for null checkout', () => {
      expect(getTimeUntilExpiry(null)).toBeNull();
    });

    it('handles normalized validUntil property', () => {
      const checkout = {
        validUntil: new Date('2024-12-01T12:05:00Z') // 5 minutes from now
      };
      expect(getTimeUntilExpiry(checkout)).toBe(5 * 60 * 1000);
    });
  });
});

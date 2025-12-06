/**
 * Pricing Module Tests
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  calculateTier,
  getPrice,
  formatPrice,
  getTierLabel,
  daysUntilDeadline,
  isDeadlinePassed,
  getPricingSummary
} from '../src/lib/pricing.js';

describe('Pricing Module', () => {
  // Mock date for consistent testing
  const MOCK_NOW = new Date('2024-12-01T12:00:00Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(MOCK_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('calculateTier', () => {
    it('returns tier1 when more than 7 days before deadline', () => {
      // Deadline is Dec 15, now is Dec 1 (14 days away)
      const deadline = new Date('2024-12-15T12:00:00Z');
      expect(calculateTier(deadline)).toBe('tier1');
    });

    it('returns tier1 when exactly 8 days before deadline', () => {
      const deadline = new Date('2024-12-09T12:00:00Z');
      expect(calculateTier(deadline)).toBe('tier1');
    });

    it('returns tier2 when exactly 7 days before deadline', () => {
      const deadline = new Date('2024-12-08T12:00:00Z');
      expect(calculateTier(deadline)).toBe('tier2');
    });

    it('returns tier2 when within 7 days of deadline', () => {
      // Deadline is Dec 5, now is Dec 1 (4 days away)
      const deadline = new Date('2024-12-05T12:00:00Z');
      expect(calculateTier(deadline)).toBe('tier2');
    });

    it('returns tier2 when deadline is today', () => {
      const deadline = new Date('2024-12-01T12:00:00Z');
      expect(calculateTier(deadline)).toBe('tier2');
    });

    it('returns tier2 when deadline has passed', () => {
      const deadline = new Date('2024-11-25T12:00:00Z');
      expect(calculateTier(deadline)).toBe('tier2');
    });

    it('accepts string date format', () => {
      expect(calculateTier('2024-12-15')).toBe('tier1');
      expect(calculateTier('2024-12-05')).toBe('tier2');
    });

    it('returns tier2 for invalid date', () => {
      expect(calculateTier('invalid-date')).toBe('tier2');
      expect(calculateTier(null)).toBe('tier2');
    });

    it('respects custom tierCutoffDays', () => {
      // 10 days before deadline
      const deadline = new Date('2024-12-11T12:00:00Z');

      // With default 7-day cutoff: tier1
      expect(calculateTier(deadline, 7)).toBe('tier1');

      // With 10-day cutoff: tier2
      expect(calculateTier(deadline, 10)).toBe('tier2');

      // With 14-day cutoff: tier2
      expect(calculateTier(deadline, 14)).toBe('tier2');
    });
  });

  describe('getPrice', () => {
    it('returns tier1 price for tier1', () => {
      expect(getPrice('tier1')).toBe(500); // 5€ default
    });

    it('returns tier2 price for tier2', () => {
      expect(getPrice('tier2')).toBe(700); // 7€ default
    });

    it('uses custom price config for tier1', () => {
      expect(getPrice('tier1', { tier1: 400 })).toBe(400);
    });

    it('uses custom price config for tier2', () => {
      expect(getPrice('tier2', { tier2: 800 })).toBe(800);
    });

    it('uses custom config for both tiers', () => {
      const config = { tier1: 300, tier2: 600 };
      expect(getPrice('tier1', config)).toBe(300);
      expect(getPrice('tier2', config)).toBe(600);
    });

    it('falls back to tier2 price for unknown tier', () => {
      expect(getPrice('tier3')).toBe(700);
      expect(getPrice()).toBe(700);
    });

    it('handles missing config gracefully', () => {
      expect(getPrice('tier1', {})).toBe(500);
      expect(getPrice('tier2', null)).toBe(700);
    });
  });

  describe('formatPrice', () => {
    it('formats cents to euros in French locale', () => {
      expect(formatPrice(500)).toBe('5,00\u00a0€'); // 5,00 €
      expect(formatPrice(700)).toBe('7,00\u00a0€');
    });

    it('handles zero amount', () => {
      expect(formatPrice(0)).toBe('0,00\u00a0€');
    });

    it('formats with different locale', () => {
      const result = formatPrice(500, 'en-US', 'USD');
      expect(result).toContain('5.00');
      expect(result).toContain('$');
    });

    it('handles large amounts', () => {
      expect(formatPrice(10_000)).toBe('100,00\u00a0€');
      expect(formatPrice(99_999)).toBe('999,99\u00a0€');
    });

    it('handles fractional cents', () => {
      expect(formatPrice(550)).toBe('5,50\u00a0€');
      expect(formatPrice(599)).toBe('5,99\u00a0€');
    });
  });

  describe('getTierLabel', () => {
    it('returns French labels by default', () => {
      expect(getTierLabel('tier1')).toBe('Inscription anticipée');
      expect(getTierLabel('tier2')).toBe('Inscription standard');
    });

    it('returns English labels when requested', () => {
      expect(getTierLabel('tier1', 'en')).toBe('Early registration');
      expect(getTierLabel('tier2', 'en')).toBe('Standard registration');
    });

    it('falls back to French for unknown locale', () => {
      expect(getTierLabel('tier1', 'de')).toBe('Inscription anticipée');
    });

    it('falls back to tier2 label for unknown tier', () => {
      expect(getTierLabel('tier3')).toBe('Inscription standard');
    });
  });

  describe('daysUntilDeadline', () => {
    it('returns positive days for future deadline', () => {
      const deadline = new Date('2024-12-15T12:00:00Z');
      expect(daysUntilDeadline(deadline)).toBe(14);
    });

    it('returns 0 for deadline today', () => {
      const deadline = new Date('2024-12-01T23:59:59Z');
      expect(daysUntilDeadline(deadline)).toBe(0);
    });

    it('returns negative days for past deadline', () => {
      const deadline = new Date('2024-11-25T12:00:00Z');
      expect(daysUntilDeadline(deadline)).toBe(-6);
    });

    it('accepts string date format', () => {
      expect(daysUntilDeadline('2024-12-15')).toBe(13);
    });

    it('returns 0 for invalid date', () => {
      expect(daysUntilDeadline('invalid')).toBe(0);
    });
  });

  describe('isDeadlinePassed', () => {
    it('returns false for future deadline', () => {
      expect(isDeadlinePassed('2024-12-15')).toBe(false);
    });

    it('returns false for deadline today (same time)', () => {
      // At 12:00 UTC, deadline at 12:00 UTC is "today"
      expect(isDeadlinePassed('2024-12-01T12:00:00Z')).toBe(false);
    });

    it('returns true for past deadline', () => {
      expect(isDeadlinePassed('2024-11-25')).toBe(true);
    });
  });

  describe('getPricingSummary', () => {
    it('returns complete summary for tier1', () => {
      const deadline = '2024-12-20';
      const summary = getPricingSummary(deadline);

      expect(summary.tier).toBe('tier1');
      expect(summary.price).toBe(500);
      expect(summary.priceFormatted).toBe('5,00\u00a0€');
      expect(summary.label).toBe('Inscription anticipée');
      expect(summary.daysUntilDeadline).toBe(18);
      expect(summary.isDeadlinePassed).toBe(false);
      expect(summary.willChangeTier).toBe(false);
      expect(summary.tier2Price).toBe(700);
      expect(summary.tier2PriceFormatted).toBe('7,00\u00a0€');
    });

    it('returns complete summary for tier2', () => {
      const deadline = '2024-12-05';
      const summary = getPricingSummary(deadline);

      expect(summary.tier).toBe('tier2');
      expect(summary.price).toBe(700);
      expect(summary.label).toBe('Inscription standard');
    });

    it('indicates when tier will change soon', () => {
      // 5 days until deadline - currently tier2, so willChangeTier should be false
      const deadline = '2024-12-06';
      const summary = getPricingSummary(deadline);
      expect(summary.willChangeTier).toBe(false);

      // 6 days until deadline - still tier2 with 7-day cutoff
      const deadline2 = '2024-12-07';
      const summary2 = getPricingSummary(deadline2);
      expect(summary2.willChangeTier).toBe(false);
    });

    it('respects custom price config', () => {
      const summary = getPricingSummary('2024-12-20', { tier1: 400, tier2: 600 });
      expect(summary.price).toBe(400);
      expect(summary.tier2Price).toBe(600);
    });

    it('respects custom tier cutoff days', () => {
      // 10 days until deadline
      const deadline = '2024-12-11';

      // Default 7-day cutoff: tier1
      expect(getPricingSummary(deadline).tier).toBe('tier1');

      // 14-day cutoff: tier2
      expect(getPricingSummary(deadline, {}, 14).tier).toBe('tier2');
    });
  });
});

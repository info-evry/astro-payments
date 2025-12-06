/**
 * SumUp Client Tests
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SumUpClient, SumUpError } from '../src/lib/sumup-client.js';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('SumUp Client', () => {
  const API_KEY = 'test_api_key_123';
  const MERCHANT_CODE = 'MERCH123';
  let client;

  beforeEach(() => {
    client = new SumUpClient(API_KEY);
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('creates client with API key', () => {
      const newClient = new SumUpClient('my_key');
      expect(newClient.apiKey).toBe('my_key');
      expect(newClient.baseUrl).toBe('https://api.sumup.com');
    });

    it('accepts custom base URL', () => {
      const newClient = new SumUpClient('key', { baseUrl: 'https://test.api.com' });
      expect(newClient.baseUrl).toBe('https://test.api.com');
    });

    it('throws error without API key', () => {
      expect(() => new SumUpClient()).toThrow('SumUp API key is required');
      expect(() => new SumUpClient('')).toThrow('SumUp API key is required');
    });
  });

  describe('request', () => {
    it('includes authorization header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('{}')
      });

      await client.request('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.sumup.com/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test_api_key_123',
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('parses JSON response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('{"id": "123", "status": "PENDING"}')
      });

      const result = await client.request('/checkouts/123');
      expect(result).toEqual({ id: '123', status: 'PENDING' });
    });

    it('handles empty response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('')
      });

      const result = await client.request('/checkouts/123', { method: 'DELETE' });
      expect(result).toBeNull();
    });

    it('throws SumUpError on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: () => Promise.resolve('{"message": "Invalid checkout reference"}')
      });

      try {
        await client.request('/checkouts');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SumUpError);
        expect(error.message).toBe('Invalid checkout reference');
        expect(error.status).toBe(400);
      }
    });

    it('handles non-JSON error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('Server Error')
      });

      await expect(client.request('/checkouts')).rejects.toThrow('Server Error');
    });
  });

  describe('createCheckout', () => {
    const validParams = {
      checkout_reference: 'ndi-123-timestamp-random',
      amount: 5,
      currency: 'EUR',
      merchant_code: MERCHANT_CODE,
      description: 'NDI Registration'
    };

    it('creates checkout with correct parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({
          id: 'checkout_abc',
          status: 'PENDING',
          amount: 5,
          currency: 'EUR',
          checkout_reference: validParams.checkout_reference
        }))
      });

      const result = await client.createCheckout(validParams);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.sumup.com/v0.1/checkouts',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            checkout_reference: validParams.checkout_reference,
            amount: 5,
            currency: 'EUR',
            merchant_code: MERCHANT_CODE,
            description: 'NDI Registration',
            return_url: undefined,
            redirect_url: undefined,
            purpose: 'CHECKOUT'
          })
        })
      );

      expect(result.id).toBe('checkout_abc');
      expect(result.status).toBe('PENDING');
    });

    it('includes optional URLs when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('{}')
      });

      await client.createCheckout({
        ...validParams,
        return_url: 'https://example.com/callback',
        redirect_url: 'https://example.com/success'
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.return_url).toBe('https://example.com/callback');
      expect(callBody.redirect_url).toBe('https://example.com/success');
    });

    it('throws error without checkout_reference', async () => {
      await expect(client.createCheckout({
        amount: 5,
        currency: 'EUR',
        merchant_code: MERCHANT_CODE
      })).rejects.toThrow('checkout_reference is required');
    });

    it('throws error without positive amount', async () => {
      await expect(client.createCheckout({
        checkout_reference: 'ref_123',
        amount: 0,
        currency: 'EUR',
        merchant_code: MERCHANT_CODE
      })).rejects.toThrow('amount must be a positive number');

      await expect(client.createCheckout({
        checkout_reference: 'ref_123',
        amount: -5,
        currency: 'EUR',
        merchant_code: MERCHANT_CODE
      })).rejects.toThrow('amount must be a positive number');
    });

    it('throws error without currency', async () => {
      await expect(client.createCheckout({
        checkout_reference: 'ref_123',
        amount: 5,
        merchant_code: MERCHANT_CODE
      })).rejects.toThrow('currency is required');
    });

    it('throws error without merchant_code', async () => {
      await expect(client.createCheckout({
        checkout_reference: 'ref_123',
        amount: 5,
        currency: 'EUR'
      })).rejects.toThrow('merchant_code is required');
    });
  });

  describe('getCheckout', () => {
    it('retrieves checkout by ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({
          id: 'checkout_xyz',
          status: 'PAID',
          amount: 7,
          currency: 'EUR',
          transactions: [{
            id: 'tx_123',
            status: 'SUCCESSFUL',
            amount: 7
          }]
        }))
      });

      const result = await client.getCheckout('checkout_xyz');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.sumup.com/v0.1/checkouts/checkout_xyz',
        expect.any(Object)
      );

      expect(result.status).toBe('PAID');
      expect(result.transactions).toHaveLength(1);
    });

    it('throws error without checkoutId', async () => {
      await expect(client.getCheckout()).rejects.toThrow('checkoutId is required');
      await expect(client.getCheckout('')).rejects.toThrow('checkoutId is required');
    });
  });

  describe('listCheckouts', () => {
    it('lists all checkouts without filter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify([
          { id: 'checkout_1', status: 'PAID' },
          { id: 'checkout_2', status: 'PENDING' }
        ]))
      });

      const result = await client.listCheckouts();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.sumup.com/v0.1/checkouts',
        expect.any(Object)
      );

      expect(result).toHaveLength(2);
    });

    it('filters by checkout reference', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('[]')
      });

      await client.listCheckouts('ndi-123-timestamp');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.sumup.com/v0.1/checkouts?checkout_reference=ndi-123-timestamp',
        expect.any(Object)
      );
    });

    it('encodes special characters in reference', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('[]')
      });

      await client.listCheckouts('ref with spaces');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.sumup.com/v0.1/checkouts?checkout_reference=ref%20with%20spaces',
        expect.any(Object)
      );
    });
  });

  describe('deactivateCheckout', () => {
    it('deactivates checkout by ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({
          id: 'checkout_to_deactivate',
          status: 'EXPIRED'
        }))
      });

      const result = await client.deactivateCheckout('checkout_to_deactivate');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.sumup.com/v0.1/checkouts/checkout_to_deactivate',
        expect.objectContaining({
          method: 'DELETE'
        })
      );

      expect(result.status).toBe('EXPIRED');
    });

    it('throws error without checkoutId', async () => {
      await expect(client.deactivateCheckout()).rejects.toThrow('checkoutId is required');
    });
  });

  describe('getPaymentMethods', () => {
    it('retrieves payment methods for merchant', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(['card', 'apple_pay', 'google_pay']))
      });

      const result = await client.getPaymentMethods(MERCHANT_CODE);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.sumup.com/v0.1/merchants/${MERCHANT_CODE}/payment-methods`,
        expect.any(Object)
      );

      expect(result).toContain('card');
    });

    it('includes amount and currency filters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('[]')
      });

      await client.getPaymentMethods(MERCHANT_CODE, { amount: 500, currency: 'EUR' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('amount=500'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('currency=EUR'),
        expect.any(Object)
      );
    });

    it('throws error without merchantCode', async () => {
      await expect(client.getPaymentMethods()).rejects.toThrow('merchantCode is required');
    });
  });

  describe('SumUpError', () => {
    it('creates error with all properties', () => {
      const error = new SumUpError('Payment failed', 400, '{"error": "invalid_card"}');

      expect(error.message).toBe('Payment failed');
      expect(error.name).toBe('SumUpError');
      expect(error.status).toBe(400);
      expect(error.body).toBe('{"error": "invalid_card"}');
    });

    it('is instanceof Error', () => {
      const error = new SumUpError('Test', 500, '');
      expect(error).toBeInstanceOf(Error);
    });
  });
});

/**
 * SumUp API Client
 * Server-side client for SumUp payment processing
 *
 * @see https://developer.sumup.com/api/checkouts
 */

const SUMUP_API_BASE = 'https://api.sumup.com';

/**
 * SumUp API client for creating and managing checkouts
 */
export class SumUpClient {
  /**
   * @param {string} apiKey - SumUp API key (Bearer token)
   * @param {object} options - Client options
   * @param {string} options.baseUrl - API base URL (for testing)
   */
  constructor(apiKey, options = {}) {
    if (!apiKey) {
      throw new Error('SumUp API key is required');
    }
    this.apiKey = apiKey;
    this.baseUrl = options.baseUrl || SUMUP_API_BASE;
  }

  /**
   * Make an authenticated request to the SumUp API
   * @param {string} endpoint - API endpoint path
   * @param {object} options - Fetch options
   * @returns {Promise<object>} Response data
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;

    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      const errorBody = await response.text();
      let errorMessage;
      try {
        const errorJson = JSON.parse(errorBody);
        errorMessage = errorJson.message || errorJson.error || errorBody;
      } catch {
        errorMessage = errorBody || response.statusText;
      }
      throw new SumUpError(errorMessage, response.status, errorBody);
    }

    // Handle empty responses (e.g., DELETE)
    const text = await response.text();
    if (!text) {
      return null;
    }

    return JSON.parse(text);
  }

  /**
   * Create a new checkout
   * @param {object} params - Checkout parameters
   * @param {string} params.checkout_reference - Unique reference for this checkout
   * @param {number} params.amount - Amount in the currency's main unit (e.g., euros, not cents)
   * @param {string} params.currency - ISO 4217 currency code (e.g., 'EUR')
   * @param {string} params.merchant_code - Merchant identifier
   * @param {string} [params.description] - Short description for dashboard
   * @param {string} [params.return_url] - URL for payment status notifications
   * @param {string} [params.redirect_url] - Post-payment redirect URL
   * @returns {Promise<Checkout>} Created checkout
   */
  async createCheckout(params) {
    if (!params.checkout_reference) {
      throw new Error('checkout_reference is required');
    }
    if (typeof params.amount !== 'number' || params.amount <= 0) {
      throw new Error('amount must be a positive number');
    }
    if (!params.currency) {
      throw new Error('currency is required');
    }
    if (!params.merchant_code) {
      throw new Error('merchant_code is required');
    }

    return this.request('/v0.1/checkouts', {
      method: 'POST',
      body: JSON.stringify({
        checkout_reference: params.checkout_reference,
        amount: params.amount,
        currency: params.currency,
        merchant_code: params.merchant_code,
        description: params.description,
        return_url: params.return_url,
        redirect_url: params.redirect_url,
        purpose: 'CHECKOUT'
      })
    });
  }

  /**
   * Get checkout by ID
   * @param {string} checkoutId - Checkout ID
   * @returns {Promise<Checkout>} Checkout details
   */
  async getCheckout(checkoutId) {
    if (!checkoutId) {
      throw new Error('checkoutId is required');
    }
    return this.request(`/v0.1/checkouts/${checkoutId}`);
  }

  /**
   * List checkouts by reference
   * @param {string} checkoutReference - Checkout reference to filter by
   * @returns {Promise<Checkout[]>} List of checkouts
   */
  async listCheckouts(checkoutReference) {
    const query = checkoutReference
      ? `?checkout_reference=${encodeURIComponent(checkoutReference)}`
      : '';
    return this.request(`/v0.1/checkouts${query}`);
  }

  /**
   * Deactivate a checkout (cannot be used for payment after this)
   * @param {string} checkoutId - Checkout ID to deactivate
   * @returns {Promise<Checkout>} Deactivated checkout with EXPIRED status
   */
  async deactivateCheckout(checkoutId) {
    if (!checkoutId) {
      throw new Error('checkoutId is required');
    }
    return this.request(`/v0.1/checkouts/${checkoutId}`, {
      method: 'DELETE'
    });
  }

  /**
   * Get available payment methods for a merchant
   * @param {string} merchantCode - Merchant code
   * @param {object} [options] - Filter options
   * @param {number} [options.amount] - Amount to check availability for
   * @param {string} [options.currency] - Currency to check
   * @returns {Promise<string[]>} List of available payment method IDs
   */
  async getPaymentMethods(merchantCode, options = {}) {
    if (!merchantCode) {
      throw new Error('merchantCode is required');
    }

    const params = new URLSearchParams();
    if (options.amount) params.set('amount', options.amount);
    if (options.currency) params.set('currency', options.currency);

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/v0.1/merchants/${merchantCode}/payment-methods${query}`);
  }
}

/**
 * Custom error class for SumUp API errors
 */
export class SumUpError extends Error {
  /**
   * @param {string} message - Error message
   * @param {number} status - HTTP status code
   * @param {string} body - Raw response body
   */
  constructor(message, status, body) {
    super(message);
    this.name = 'SumUpError';
    this.status = status;
    this.body = body;
  }
}

/**
 * @typedef {object} Checkout
 * @property {string} id - Unique checkout identifier
 * @property {string} status - Status: 'PENDING', 'PAID', 'FAILED', 'EXPIRED'
 * @property {number} amount - Amount in currency main unit
 * @property {string} currency - ISO 4217 currency code
 * @property {string} checkout_reference - Client-provided reference
 * @property {string} [description] - Checkout description
 * @property {string} date - ISO 8601 creation timestamp
 * @property {string} [valid_until] - Expiration timestamp
 * @property {Transaction[]} [transactions] - Associated transactions
 */

/**
 * @typedef {object} Transaction
 * @property {string} id - Transaction ID
 * @property {string} status - Transaction status
 * @property {number} amount - Transaction amount
 * @property {string} currency - Currency code
 */

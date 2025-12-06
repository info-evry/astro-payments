/**
 * Checkout Utilities
 * Helper functions for managing SumUp checkouts
 */

/**
 * Checkout status constants
 */
export const CHECKOUT_STATUS = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  EXPIRED: 'EXPIRED'
};

/**
 * Generate a unique checkout reference
 * Format: {prefix}-{memberId}-{timestamp}-{random}
 * @param {number|string} memberId - Member ID
 * @param {string} prefix - Reference prefix (default: 'ndi')
 * @returns {string} Unique checkout reference
 */
export function generateCheckoutReference(memberId, prefix = 'ndi') {
  const timestamp = Date.now();
  // Use crypto for secure random values
  const array = new Uint8Array(4);
  crypto.getRandomValues(array);
  const random = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  return `${prefix}-${memberId}-${timestamp}-${random}`;
}

/**
 * Parse member ID from checkout reference
 * @param {string} reference - Checkout reference
 * @returns {number|null} Member ID or null if invalid
 */
export function parseMemberIdFromReference(reference) {
  if (!reference || typeof reference !== 'string') {
    return null;
  }

  const parts = reference.split('-');
  if (parts.length < 2) {
    return null;
  }

  const memberId = Number.parseInt(parts[1], 10);
  return Number.isNaN(memberId) ? null : memberId;
}

/**
 * Parse and normalize SumUp checkout response
 * @param {object} response - Raw SumUp API response
 * @returns {NormalizedCheckout} Normalized checkout object
 */
export function parseCheckoutResponse(response) {
  if (!response) {
    return null;
  }

  return {
    id: response.id,
    status: response.status,
    amount: response.amount,
    amountCents: Math.round(response.amount * 100),
    currency: response.currency,
    reference: response.checkout_reference,
    description: response.description || null,
    createdAt: response.date ? new Date(response.date) : null,
    validUntil: response.valid_until ? new Date(response.valid_until) : null,
    isPaid: response.status === CHECKOUT_STATUS.PAID,
    isPending: response.status === CHECKOUT_STATUS.PENDING,
    isFailed: response.status === CHECKOUT_STATUS.FAILED,
    isExpired: response.status === CHECKOUT_STATUS.EXPIRED,
    transactions: (response.transactions || []).map(tx => ({
      id: tx.id,
      status: tx.status,
      amount: tx.amount,
      amountCents: Math.round(tx.amount * 100),
      currency: tx.currency
    })),
    // Extract first successful transaction ID
    transactionId: response.transactions?.find(tx =>
      tx.status === 'SUCCESSFUL' || tx.status === 'PAID'
    )?.id || null
  };
}

/**
 * Validate checkout status for payment completion
 * @param {object} checkout - Checkout object (raw or normalized)
 * @returns {ValidationResult} Validation result
 */
export function validateCheckoutStatus(checkout) {
  if (!checkout) {
    return {
      valid: false,
      status: null,
      error: 'Checkout not found'
    };
  }

  const status = checkout.status;

  switch (status) {
    case CHECKOUT_STATUS.PAID: {
      return {
        valid: true,
        status,
        error: null
      };
    }

    case CHECKOUT_STATUS.PENDING: {
      return {
        valid: false,
        status,
        error: 'Payment not yet completed'
      };
    }

    case CHECKOUT_STATUS.FAILED: {
      return {
        valid: false,
        status,
        error: 'Payment failed'
      };
    }

    case CHECKOUT_STATUS.EXPIRED: {
      return {
        valid: false,
        status,
        error: 'Checkout expired'
      };
    }

    default: {
      return {
        valid: false,
        status,
        error: `Unknown checkout status: ${status}`
      };
    }
  }
}

/**
 * Check if checkout is still valid (not expired)
 * @param {object} checkout - Checkout object
 * @returns {boolean} True if checkout is still valid
 */
export function isCheckoutValid(checkout) {
  if (!checkout) {
    return false;
  }

  // Already completed states
  if (checkout.status === CHECKOUT_STATUS.PAID ||
      checkout.status === CHECKOUT_STATUS.FAILED ||
      checkout.status === CHECKOUT_STATUS.EXPIRED) {
    return false;
  }

  // Check expiration time if available
  const validUntil = checkout.valid_until || checkout.validUntil;
  if (validUntil) {
    const expiryDate = validUntil instanceof Date ? validUntil : new Date(validUntil);
    if (expiryDate.getTime() < Date.now()) {
      return false;
    }
  }

  return checkout.status === CHECKOUT_STATUS.PENDING;
}

/**
 * Calculate time remaining until checkout expiry
 * @param {object} checkout - Checkout object
 * @returns {number|null} Milliseconds until expiry, null if unknown
 */
export function getTimeUntilExpiry(checkout) {
  if (!checkout) {
    return null;
  }

  const validUntil = checkout.valid_until || checkout.validUntil;
  if (!validUntil) {
    return null;
  }

  const expiryDate = validUntil instanceof Date ? validUntil : new Date(validUntil);
  const remaining = expiryDate.getTime() - Date.now();

  return remaining > 0 ? remaining : 0;
}

/**
 * @typedef {object} NormalizedCheckout
 * @property {string} id - Checkout ID
 * @property {string} status - Checkout status
 * @property {number} amount - Amount in currency main unit
 * @property {number} amountCents - Amount in cents
 * @property {string} currency - Currency code
 * @property {string} reference - Client reference
 * @property {string|null} description - Description
 * @property {Date|null} createdAt - Creation timestamp
 * @property {Date|null} validUntil - Expiry timestamp
 * @property {boolean} isPaid - Is payment completed
 * @property {boolean} isPending - Is awaiting payment
 * @property {boolean} isFailed - Has payment failed
 * @property {boolean} isExpired - Has checkout expired
 * @property {object[]} transactions - Transaction details
 * @property {string|null} transactionId - Successful transaction ID
 */

/**
 * @typedef {object} ValidationResult
 * @property {boolean} valid - Is checkout valid for completion
 * @property {string|null} status - Current status
 * @property {string|null} error - Error message if invalid
 */

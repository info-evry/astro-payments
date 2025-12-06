/**
 * Payment Type Definitions
 * TypeScript definitions for the astro-payments module
 */

/**
 * Checkout status values from SumUp API
 */
export type CheckoutStatus = 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED';

/**
 * Transaction status values
 */
export type TransactionStatus = 'PENDING' | 'SUCCESSFUL' | 'FAILED' | 'CANCELLED';

/**
 * Pricing tier identifier
 */
export type PricingTier = 'tier1' | 'tier2';

/**
 * Payment status for member records
 */
export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'delayed' | 'refunded';

/**
 * Payment method used
 */
export type PaymentMethod = 'online' | 'on_site' | null;

/**
 * SumUp API transaction object
 */
export interface Transaction {
  /** Unique transaction identifier */
  id: string;
  /** Transaction status */
  status: TransactionStatus;
  /** Transaction amount in currency main unit */
  amount: number;
  /** ISO 4217 currency code */
  currency: string;
}

/**
 * Raw SumUp checkout response from API
 */
export interface SumUpCheckout {
  /** Unique checkout identifier */
  id: string;
  /** Current checkout status */
  status: CheckoutStatus;
  /** Amount in currency main unit (e.g., euros) */
  amount: number;
  /** ISO 4217 currency code */
  currency: string;
  /** Client-provided reference for tracking */
  checkout_reference: string;
  /** Optional description shown in dashboard */
  description?: string;
  /** ISO 8601 creation timestamp */
  date: string;
  /** ISO 8601 expiration timestamp */
  valid_until?: string;
  /** Associated payment transactions */
  transactions?: Transaction[];
}

/**
 * Normalized checkout object for application use
 */
export interface NormalizedCheckout {
  /** Checkout ID */
  id: string;
  /** Current status */
  status: CheckoutStatus;
  /** Amount in currency main unit */
  amount: number;
  /** Amount in cents */
  amountCents: number;
  /** Currency code */
  currency: string;
  /** Client reference */
  reference: string;
  /** Description */
  description: string | null;
  /** Creation date */
  createdAt: Date | null;
  /** Expiration date */
  validUntil: Date | null;
  /** Is payment completed */
  isPaid: boolean;
  /** Is awaiting payment */
  isPending: boolean;
  /** Has payment failed */
  isFailed: boolean;
  /** Has checkout expired */
  isExpired: boolean;
  /** Transaction details */
  transactions: NormalizedTransaction[];
  /** First successful transaction ID */
  transactionId: string | null;
}

/**
 * Normalized transaction object
 */
export interface NormalizedTransaction {
  id: string;
  status: TransactionStatus;
  amount: number;
  amountCents: number;
  currency: string;
}

/**
 * Validation result for checkout status
 */
export interface ValidationResult {
  /** Is checkout valid for completion */
  valid: boolean;
  /** Current checkout status */
  status: CheckoutStatus | null;
  /** Error message if invalid */
  error: string | null;
}

/**
 * Price configuration for tiers
 */
export interface PriceConfig {
  /** Tier 1 price in cents (early bird) */
  tier1?: number;
  /** Tier 2 price in cents (late registration) */
  tier2?: number;
}

/**
 * Pricing summary for display
 */
export interface PricingSummary {
  /** Current pricing tier */
  tier: PricingTier;
  /** Price in cents */
  price: number;
  /** Formatted price string */
  priceFormatted: string;
  /** Tier label for display */
  label: string;
  /** Days until registration deadline */
  daysUntilDeadline: number;
  /** Whether deadline has passed */
  isDeadlinePassed: boolean;
  /** Days for tier1 cutoff */
  tierCutoffDays: number;
  /** Whether tier will change soon */
  willChangeTier: boolean;
  /** Tier 2 price in cents */
  tier2Price: number;
  /** Formatted tier 2 price */
  tier2PriceFormatted: string;
}

/**
 * Parameters for creating a SumUp checkout
 */
export interface CreateCheckoutParams {
  /** Unique reference for this checkout */
  checkout_reference: string;
  /** Amount in currency main unit (euros, not cents) */
  amount: number;
  /** ISO 4217 currency code */
  currency: string;
  /** SumUp merchant code */
  merchant_code: string;
  /** Optional description */
  description?: string;
  /** URL for payment status callbacks */
  return_url?: string;
  /** Post-payment redirect URL */
  redirect_url?: string;
}

/**
 * SumUp API error response
 */
export interface SumUpErrorResponse {
  /** Error message */
  message?: string;
  /** Error code */
  error?: string;
  /** HTTP status code */
  status?: number;
}

/**
 * Payment event for audit logging
 */
export interface PaymentEvent {
  /** Event ID */
  id?: number;
  /** Member ID */
  member_id: number;
  /** SumUp checkout ID */
  checkout_id?: string;
  /** Event type */
  event_type: 'checkout_created' | 'payment_pending' | 'payment_completed' | 'payment_failed' | 'payment_delayed' | 'refunded';
  /** Amount in cents */
  amount: number;
  /** Pricing tier */
  tier: PricingTier;
  /** Additional metadata as JSON */
  metadata?: string;
  /** Event timestamp */
  created_at?: string;
}

/**
 * Payment widget events dispatched to document
 */
export interface PaymentWidgetEvents {
  'payment-widget-ready': CustomEvent<{ checkoutId: string }>;
  'payment-success': CustomEvent<{
    checkoutId: string;
    transactionCode?: string;
    transactionId?: string;
  }>;
  'payment-error': CustomEvent<{
    checkoutId: string;
    error: string;
    code?: string;
  }>;
  'payment-processing': CustomEvent<{ checkoutId: string }>;
}

/**
 * SumUp Card Widget mount options
 */
export interface SumUpCardMountOptions {
  /** Container element ID */
  id: string;
  /** Checkout ID */
  checkoutId: string;
  /** Widget locale */
  locale?: string;
  /** Callback when widget loads */
  onLoad?: () => void;
  /** Callback for payment responses */
  onResponse?: (type: 'success' | 'error' | 'sent', body?: Record<string, unknown>) => void;
  /** Callback for errors */
  onError?: (error: Error) => void;
}

declare global {
  interface Window {
    SumUpCard?: {
      mount(options: SumUpCardMountOptions): {
        unmount: () => void;
      };
    };
    PaymentWidget?: Record<string, {
      unmount: () => void;
      isReady: () => boolean;
    }>;
  }
}

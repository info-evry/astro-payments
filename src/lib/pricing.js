/**
 * Pricing Module
 * Dynamic pricing calculations based on registration deadline
 */

/**
 * Calculate the pricing tier based on deadline proximity
 * @param {Date|string} registrationDeadline - Registration cutoff date
 * @param {number} tierCutoffDays - Days before deadline for tier1 (default: 7)
 * @returns {'tier1' | 'tier2'} Pricing tier
 */
export function calculateTier(registrationDeadline, tierCutoffDays = 7) {
  const deadline = registrationDeadline instanceof Date
    ? registrationDeadline
    : new Date(registrationDeadline);

  if (Number.isNaN(deadline.getTime())) {
    // Invalid date, return tier2 as default (higher price)
    return 'tier2';
  }

  const now = new Date();
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysUntilDeadline = Math.floor((deadline.getTime() - now.getTime()) / msPerDay);

  // tier1 (early bird) if more than cutoff days before deadline
  // tier2 (late registration) otherwise
  return daysUntilDeadline > tierCutoffDays ? 'tier1' : 'tier2';
}

/**
 * Get price for a tier in cents
 * @param {'tier1' | 'tier2'} tier - Pricing tier
 * @param {object} priceConfig - Price configuration
 * @param {number} priceConfig.tier1 - Tier 1 price in cents (default: 500 = 5€)
 * @param {number} priceConfig.tier2 - Tier 2 price in cents (default: 700 = 7€)
 * @returns {number} Price in cents
 */
export function getPrice(tier, priceConfig = {}) {
  const config = priceConfig || {};
  const prices = {
    tier1: config.tier1 ?? 500, // 5€ default
    tier2: config.tier2 ?? 700  // 7€ default
  };

  return prices[tier] ?? prices.tier2;
}

/**
 * Format price from cents to display string
 * @param {number} amountCents - Amount in cents
 * @param {string} locale - Locale for formatting (default: 'fr-FR')
 * @param {string} currency - Currency code (default: 'EUR')
 * @returns {string} Formatted price string
 */
export function formatPrice(amountCents, locale = 'fr-FR', currency = 'EUR') {
  const amount = amountCents / 100;

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency
  }).format(amount);
}

/**
 * Get human-readable label for a tier
 * @param {'tier1' | 'tier2'} tier - Pricing tier
 * @param {string} locale - Locale for label (default: 'fr')
 * @returns {string} Tier label
 */
export function getTierLabel(tier, locale = 'fr') {
  const labels = {
    fr: {
      tier1: 'Inscription anticipée',
      tier2: 'Inscription standard'
    },
    en: {
      tier1: 'Early registration',
      tier2: 'Standard registration'
    }
  };

  const localeLabels = labels[locale] || labels.fr;
  return localeLabels[tier] || localeLabels.tier2;
}

/**
 * Calculate days until deadline
 * @param {Date|string} deadline - Deadline date
 * @returns {number} Days until deadline (negative if past)
 */
export function daysUntilDeadline(deadline) {
  const deadlineDate = deadline instanceof Date ? deadline : new Date(deadline);

  if (Number.isNaN(deadlineDate.getTime())) {
    return 0;
  }

  const now = new Date();
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((deadlineDate.getTime() - now.getTime()) / msPerDay);
}

/**
 * Check if registration deadline has passed
 * @param {Date|string} deadline - Deadline date
 * @returns {boolean} True if deadline has passed
 */
export function isDeadlinePassed(deadline) {
  return daysUntilDeadline(deadline) < 0;
}

/**
 * Get pricing summary for display
 * @param {Date|string} deadline - Registration deadline
 * @param {object} priceConfig - Price configuration
 * @param {number} tierCutoffDays - Days for tier1 cutoff
 * @returns {object} Pricing summary
 */
export function getPricingSummary(deadline, priceConfig = {}, tierCutoffDays = 7) {
  const tier = calculateTier(deadline, tierCutoffDays);
  const price = getPrice(tier, priceConfig);
  const days = daysUntilDeadline(deadline);
  const isPast = days < 0;

  return {
    tier,
    price,
    priceFormatted: formatPrice(price),
    label: getTierLabel(tier),
    daysUntilDeadline: days,
    isDeadlinePassed: isPast,
    tierCutoffDays,
    // Show tier change info if currently in tier1
    willChangeTier: tier === 'tier1' && days <= tierCutoffDays && days > 0,
    tier2Price: getPrice('tier2', priceConfig),
    tier2PriceFormatted: formatPrice(getPrice('tier2', priceConfig))
  };
}

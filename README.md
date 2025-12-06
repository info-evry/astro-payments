# Astro Payments

Payment integration module for Astro projects - SumUp checkout and pricing utilities.

## Installation

Add as a git submodule:

```bash
git submodule add https://github.com/info-evry/astro-payments.git payments
```

## Usage

```javascript
import { createCheckout, formatPrice } from 'astro-payments';

// Create a SumUp checkout
const checkout = await createCheckout({
  amount: 10.00,
  currency: 'EUR',
  description: 'Membership fee'
});

// Format price for display
const formatted = formatPrice(10.00, 'EUR'); // "10,00 €"
```

## Development

```bash
# Install dependencies
bun install

# Run tests
bun test

# Watch mode
bun run test:watch
```

## License

MIT

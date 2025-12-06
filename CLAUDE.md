# Claude Code Guidelines for Astro Payments

## Overview

Astro Payments is a shared payment integration module for Astro projects, providing SumUp checkout functionality and pricing utilities.

## Project Structure

```
astro-payments/
├── src/
│   ├── index.js           # Main exports
│   ├── lib/
│   │   ├── sumup.js       # SumUp checkout API integration
│   │   └── pricing.js     # Pricing utilities
│   └── components/
│       └── *.astro        # Payment-related Astro components
├── test/
│   └── *.test.js          # Vitest tests
├── package.json
└── vitest.config.js
```

## Testing

```bash
# Run tests
bun test

# Watch mode
bun run test:watch
```

## Exports

The package exports via package.json exports field:

```javascript
// Import main module
import { createCheckout, formatPrice } from 'astro-payments';

// Import specific utilities
import { SumUpClient } from 'astro-payments/lib/sumup';
import { calculateTotal } from 'astro-payments/lib/pricing';

// Import components
import CheckoutButton from 'astro-payments/components/CheckoutButton.astro';
```

## Making Changes

1. Make changes to source files in `src/`
2. Update or add tests in `test/`
3. Run tests: `bun test`
4. Commit and push

## Integration with Other Projects

This module is used as a git submodule in:
- astro-ndi (as `payments/`)
- astro-join (as `payments/`)
- astro-maestro (as `projects/astro-payments`)

When updating, remember to update the submodule references in consuming projects.

## Environment Variables

Projects using this module need to configure:
- `SUMUP_API_KEY` - SumUp API key for checkout creation
- `SUMUP_MERCHANT_CODE` - SumUp merchant code

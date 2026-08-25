# Review Shop Design Language

This is the visual source of truth for Review Shop UI work. It follows the
Impeccable anti-slop principles while respecting Ant Design and the repository UI
guidelines.

## Direction

**Verified work ledger**: a composed, editorial marketplace that makes work,
reviews and payouts feel concrete and trustworthy. The interface should feel
intentional and useful, not like a generic SaaS template.

## Do

- Use ink-forward neutrals with one warm signal accent and restrained teal status.
- Use typography contrast through Be Vietnam Pro's scale, weight and spacing for
  both headings and body copy. The same loaded Vietnamese-capable family prevents
  diacritic rendering differences across platforms.
- Use rules, whitespace, alignment and data grouping before adding containers.
- Keep cards flat or lightly elevated; reserve larger radius for primary surfaces.
- Make the product's evidence visible: status, review, milestone, amount and owner.
- Use motion only to clarify state changes, with transform/opacity preferred.

## Don't

- No purple/blue gradients, gradient text, ambient glows or decorative grid fields.
- No glassmorphism or nested cards without a real layering need.
- No identical icon-plus-heading card grids for every section.
- No oversized hero sentence that consumes the whole first viewport.
- No all-caps paragraphs, vague startup copy or decorative UI badges without meaning.

## Tokens

Colors, spacing, radius, type scale, elevation and layers live in
`src/app/styles/tokens.css` and are mirrored in `src/app/theme/antdTheme.js`.
Component CSS must consume those tokens instead of adding repeated literals.

## Typography

- Primary family: `Be Vietnam Pro`.
- Approved fallback: `Segoe UI`, `Noto Sans`, `Arial`, sans-serif.
- The font is loaded in `index.html` with weights 400, 500, 600, 700 and 800.
- Use the same family for Vietnamese headings and body copy. Create editorial
  contrast with size, weight, line-height and spacing, not a second serif family.
- Do not introduce an unlisted font or use a serif font for Vietnamese UI text.
- Shared CSS tokens are `--font-family-body` and `--font-family-display`.

## Review

For a finished surface, run the Impeccable-style review: check hierarchy, cognitive
load, copy specificity, keyboard/focus behavior, responsive layout and anti-slop
patterns. If the CLI is available, run `npx impeccable detect src/` as an
additional diagnostic; it is not a replacement for the repository lint/build checks.

## Bosla UI kit — conventions

These 8 components (`Button`, `Badge`, `Card` + its parts, `Input`,
`Checkbox`, `Switch`, `Avatar` + its parts, `Tabs` + its parts) are
Bosla's real, production shadcn-on-`@base-ui/react` components — no
mock/reimplementation. No provider or context wrapper is required: none of
them read translations, session, or theme context. Just render them.

### Styling idiom: Tailwind v4 utility classes, real semantic token names

Style with these utility classes directly — never invent new class names,
never write raw hex/oklch values. Every name below is verified present in
the shipped stylesheet:

| Role | Classes |
|---|---|
| Primary brand (buttons, focus) | `bg-primary` / `text-primary-foreground` |
| Secondary surface | `bg-secondary` / `text-secondary-foreground` |
| Muted/quiet surface | `bg-muted` / `text-muted-foreground` |
| Pale hover/selected tint (NOT the brand color) | `bg-tint` / `text-tint-foreground` |
| Destructive/error | `bg-destructive` / `text-destructive` |
| Card surface | `bg-card` / `text-card-foreground` |
| Borders | `border-border` |
| Corner radius | `rounded-lg` (default), `rounded-xl` (cards) |

All neutrals (background, foreground, muted, border) share one hue with
`primary` — a deliberate faint brand tint, not pure gray. Don't lighten/
darken `primary` by hand for hover states — components already encode
their own hover/disabled/focus treatment (e.g. `Button`'s `hover:bg-primary/80`);
just use the component as-is rather than restyling it externally.

### Where the truth lives

Read `styles.css` (imports the full compiled stylesheet) before styling
anything new — it has the complete token set, not just the table above.
Each component's own `.prompt.md` in this project documents its specific
props and variants; read that before composing one.

### Build snippet (real, verified pattern — from the synced `Card`)

```tsx
<Card className="w-80">
  <CardHeader>
    <CardTitle>Shoulder Rehab Masterclass</CardTitle>
    <CardDescription>Assessment to Return-to-Function</CardDescription>
    <CardAction>
      <Button variant="ghost" size="sm">Save</Button>
    </CardAction>
  </CardHeader>
  <CardContent>
    <p>Evidence-based courses for physiotherapists and nutrition specialists.</p>
  </CardContent>
  <CardFooter>
    <Button className="w-full">Enroll now</Button>
  </CardFooter>
</Card>
```

`Button` variants: `default` (primary, the usual choice), `outline`,
`secondary`, `ghost`, `destructive`, `link`. Sizes: `default`, `sm`, `lg`,
plus `icon`/`icon-sm`/`icon-lg` for icon-only buttons — always pair
`size="icon*"` with `aria-label`, never bare.

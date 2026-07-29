// Synthetic entry for the design-sync converter (claude.ai/design). This
// repo has no separate build step for its UI kit (src/components/ui/*.tsx
// is consumed directly by Next.js — no dist/ output), so this directory
// exists only to give esbuild/ts-morph a single bundleable, type-checkable
// entry point re-exporting the components chosen for this sync, plus its
// own package.json so the converter's package.json-walk-up stops here
// instead of at the app's own root package.json. Relative imports only —
// the converter's ts-morph export-scan doesn't thread through the app's
// tsconfig path aliases the way esbuild's bundling does. Underscore-
// prefixed so it's excluded from Next.js routing, same convention as
// (public)/_draft-homepage. Not imported by the app itself.
export { Button } from "../components/ui/button"
export { Badge } from "../components/ui/badge"
export {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card"
export { Input } from "../components/ui/input"
export { Checkbox } from "../components/ui/checkbox"
export { Switch } from "../components/ui/switch"
export { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar"
export { Tabs, TabsList, TabsPanel, TabsTab } from "../components/ui/tabs"

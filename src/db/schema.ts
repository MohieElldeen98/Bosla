// Barrel — new domains get their own file under `db/schema/*` (split by
// domain, not by table count) and are re-exported here, per
// docs/architecture.md §7.
export * from "./schema/auth-users";
export * from "./schema/profiles";
export * from "./schema/cms";
export * from "./schema/course";
export * from "./schema/learning";
export * from "./schema/commerce";
export * from "./schema/instructor";

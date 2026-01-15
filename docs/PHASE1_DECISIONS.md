# Phase 1 - Architectural Decisions

**Date:** January 13, 2026  
**Status:** Decisions Made Before Phase 2

---

## 1. ✅ getWorkflowTemplatesCollection() Accessor

**Decision:** Added the missing accessor function for consistency with other collections.

**Implementation:**
- ✅ Added `getWorkflowTemplatesCollection(orgId)` in `src/lib/platform/db.ts`
- ✅ Uses proper `WorkflowTemplate` type

**Rationale:** All collections should have accessor functions for consistency and type safety.

---

## 2. ⚠️ Connections and applicationId

**Decision:** **Connections remain at Project level, NOT Application level.**

**Reasoning:**
- Connections (ConnectionVault entries) are infrastructure/resources shared across applications within a project
- Multiple applications may need to use the same database connection
- Connections already have `projectId` which provides proper scoping
- Applications can reference connections via `vaultId` in their forms' `dataSource` field

**For Phase 2:**
- ✅ Keep connections at project level
- ✅ Forms within applications reference connections via `dataSource.vaultId`
- ❌ Do NOT add `applicationId` to ConnectionVault
- ✅ `connectionsCount` in application stats can be calculated by counting unique `vaultId` references in the application's forms

**Future Consideration:**
- May want to track "preferred connections" or "default connections" per application
- This would be a separate mapping table if needed, not a change to ConnectionVault itself

---

## 3. ✅ Default Application Naming

**Decision:** **Default applications should use project name for better UX.**

**Implementation:**
- Updated `ensureDefaultApplication()` to use: `"{projectName} - Default Application"`
- Example: Project "Customer Onboarding" → Default App "Customer Onboarding - Default Application"

**Rationale:**
- Provides better context in UI
- Makes it clear which project the default app belongs to
- Still clearly indicates it's the default application
- Improves UX when users have multiple projects

**Code Change:**
```typescript
// Before: name: 'Default Application'
// After: name: `${project.name} - Default Application`
```

---

## 4. ✅ Role-Based Permissions

**Decision:** **Follow existing patterns - DELETE requires admin, UPDATE allows members.**

**Current Pattern (from Projects API):**
- DELETE: Requires `isOrgAdmin` (owner or admin)
- UPDATE: Allows any `orgRole` (member, admin, or owner)
- CREATE: Allows any `orgRole`

**Implementation:**
- ✅ Updated Applications API DELETE endpoint to require `isOrgAdmin`
- ✅ UPDATE endpoint remains permissive (any member can update)
- ✅ CREATE endpoint remains permissive (any member can create)

**Rationale:**
- Consistent with Projects API behavior
- DELETE is destructive, should require elevated permissions
- UPDATE/CREATE are less risky and encourage collaboration

**Security Note:**
- Default applications are protected from deletion (separate check)
- Applications with forms/workflows are protected from deletion (separate check)
- These checks happen regardless of role

---

## 5. ✅ Marketplace Fields Documentation

**Decision:** **Document marketplace fields as supporting Marketplace integration.**

**Fields:**
- `marketplaceApplicationId?: string` - ID of marketplace app this was imported from
- `marketplaceVersion?: string` - Version imported from marketplace

**Purpose:**
- Track which marketplace application was the source
- Enable upgrade/version tracking for imported applications
- Support future features: upgrade notifications, version history, rollback

**Documentation:**
- ✅ Fields documented in `Application` interface
- ✅ Purpose explained in status document
- ✅ Usage will be documented when Marketplace integration is enhanced

**Relation to Spec:**
- Spec mentions marketplace features but doesn't detail all fields
- These fields support the upgrade/versioning features mentioned in the spec
- No spec change needed - implementation detail that supports spec goals

---

## Summary

All questions resolved. Changes made:
1. ✅ Added WorkflowTemplates collection accessor
2. ✅ Documented connections stay at project level
3. ✅ Updated default app naming to include project name
4. ✅ Added role-based permission checks (DELETE requires admin)
5. ✅ Documented marketplace fields purpose

**Ready for Phase 2.**

# NetPad Applications Roadmap

**Last Updated:** January 15, 2026

---

## Overview

This roadmap tracks the implementation of the **Applications-First** model, transforming NetPad from a form builder into an application platform.

---

## Completed Phases

### ✅ Phase 1: Applications Foundation
**Status:** Complete  
**Docs:** `docs/PHASE1_IMPLEMENTATION_STATUS.md`

- Applications as first-class entities
- Applications API (CRUD)
- Applications UI (list, detail, create)
- Forms and workflows scoped to applications

### ✅ Phase 2: Applications Navigation
**Status:** Complete  
**Docs:** `docs/PHASE2_IMPLEMENTATION_STATUS.md`

- Applications-first navigation
- Application detail pages
- Forms/Workflows tabs within applications

### ✅ Phase 3: Applications Export/Import
**Status:** Complete  
**Docs:** `docs/PHASE3_IMPLEMENTATION_STATUS.md`

- Application bundle export
- Application import with connections
- Marketplace infrastructure (API + UI)

### ✅ Phase 4: Releases, Templates, and Insights
**Status:** Complete  
**Docs:** `docs/PHASE4_IMPLEMENTATION_STATUS.md`

- Application Releases (versioned snapshots)
- Workflow Templates (seed script + UI)
- Application Insights (last release in header)
- **Backend Testing:** ✅ 25/25 tests passed

---

## Current Phase

### ✅ Phase 5: Marketplace Publishing & Discovery
**Status:** Complete  
**Spec:** `docs/PHASE5_SPEC.md`  
**Status Doc:** `docs/PHASE5_IMPLEMENTATION_STATUS.md`

**Goal:** Connect Phase 4 releases to marketplace publishing

**Key Features:**
1. ✅ **Publish from Releases** - Publish any application release to marketplace
2. ✅ **Marketplace Discovery** - Navigation integration, browse/search
3. ✅ **My Applications** - Manage published applications
4. ✅ **Marketplace Seeding** - Populate with example applications

**Timeline:** 2 weeks (Completed)

**Dependencies:** Phase 4 Complete ✅

---

### ✅ Phase 6: Marketplace Versioning
**Status:** Complete  
**Spec:** `docs/PHASE6_SPEC.md`  
**Status Doc:** `docs/PHASE6_IMPLEMENTATION_STATUS.md`

**Goal:** Add versioning and update management to marketplace

**Key Features:**
1. ✅ **Track Installed Applications** - Know what's installed and which version
2. ✅ **Publish New Versions** - Update existing marketplace listings
3. ✅ **Update Notifications** - Alert users when updates are available
4. ✅ **Upgrade Workflows** - One-click upgrade to latest version
5. ✅ **Version History** - View changelog and version progression

**Timeline:** 2 weeks (Completed)

**Dependencies:** Phase 5 Complete ✅

---

### ✅ Phase 7: Ratings & Reviews
**Status:** Complete  
**Spec:** `docs/PHASE7_SPEC.md`  
**Status Doc:** `docs/PHASE7_IMPLEMENTATION_STATUS.md`

**Goal:** Add user ratings and reviews to marketplace

**Key Features:**
1. ✅ User ratings (1-5 stars)
2. ✅ Written reviews
3. ✅ Average rating display
4. ✅ Filter/sort by rating

**Timeline:** 1 week (Completed)

**Dependencies:** Phase 6 Complete ✅

---

## Completed Phases (Continued)

### ✅ Phase 8: npm Integration
**Status:** Complete  
**Spec:** `docs/NPM_INTEGRATION_IMPLEMENTATION_PLAN.md`  
**Status Doc:** `docs/PHASE8_IMPLEMENTATION_STATUS.md`

**Goal:** Integrate npm packages with NetPad marketplace

**Key Features:**
1. ✅ Package Structure Utilities
2. ✅ Bundle Generation Tool
3. ✅ npm Registry Sync Service
4. ✅ npm Package Import API
5. ✅ CLI Tool Foundation (Published: @netpad/cli@0.2.0)
6. ✅ Marketplace UI Integration

**Timeline:** 3-4 weeks (Completed January 15, 2026)

**Dependencies:** Phase 7 Complete ✅

---

## Future Phases

### 🟡 Phase 8: npm Integration
**Status:** In Progress (Steps 1-4 Complete)  
**Spec:** `docs/NPM_INTEGRATION_IMPLEMENTATION_PLAN.md`  
**Status Doc:** `docs/PHASE8_IMPLEMENTATION_STATUS.md`

**Goal:** Integrate npm packages with NetPad marketplace

**Key Features:**
1. ✅ Package Structure Utilities
2. ✅ Bundle Generation Tool
3. ✅ npm Registry Sync Service
4. ✅ npm Package Import API
5. 🔲 CLI Tool Foundation
6. 🔲 Marketplace UI Integration

**Timeline:** 3-4 weeks (In Progress)

### ✅ Phase 9: Contracts & Protection
**Status:** Complete  
**Dependencies:** Phase 4 ✅  
**Spec:** `docs/PHASE9_SPEC.md`  
**Status Doc:** `docs/PHASE9_IMPLEMENTATION_STATUS.md`

**Goal:** Ensure application integrity during upgrades and customization

**Key Features:**
1. ✅ Contract Definition & Storage
2. ✅ Contract Enforcement at Publish/Deploy Time
3. ✅ Breaking Change Detection (Deterministic Diff)
4. ✅ Contract Validation on Upgrades
5. ✅ Component Protection (Optional Explicit Locking)
6. ✅ Contract UI & Management

**Timeline:** 3-4 weeks (Completed January 15, 2026)

---

## Future Phases

### Phase 10: Application Permissions
**Status:** Planned  
**Dependencies:** Phase 1

- Application-based RBAC
- Per-application roles
- Application-level access control

---

## Strategic Vision

### Applications-First Model

> **"NetPad is an application platform where forms and workflows are implementation details, not the product."**

**Key Principles:**
1. **Applications are the Product** - Primary unit of value, sharing, monetization
2. **Forms/Workflows are Implementation Details** - Power applications, accessible to power users
3. **Applications Own Lifecycle** - Install, configure, upgrade, fork, monetize
4. **Marketplace Clarity** - Marketplace sells applications (solutions), not components

**See:** `docs/APPLICATIONS_DESIGN.md` for full strategic framework

---

## Implementation Status Summary

| Phase | Status | Key Deliverable | Docs |
|-------|--------|----------------|------|
| Phase 1 | ✅ Complete | Applications Foundation | `PHASE1_IMPLEMENTATION_STATUS.md` |
| Phase 2 | ✅ Complete | Applications Navigation | `PHASE2_IMPLEMENTATION_STATUS.md` |
| Phase 3 | ✅ Complete | Export/Import | `PHASE3_IMPLEMENTATION_STATUS.md` |
| Phase 4 | ✅ Complete | Releases & Templates | `PHASE4_IMPLEMENTATION_STATUS.md` |
| Phase 5 | ✅ Complete | Marketplace Publishing | `PHASE5_SPEC.md` |
| Phase 6 | ✅ Complete | Marketplace Versioning | `PHASE6_SPEC.md` |
| Phase 7 | ✅ Complete | Ratings & Reviews | `PHASE7_SPEC.md` |
| Phase 8 | ✅ Complete | npm Integration | `PHASE8_IMPLEMENTATION_STATUS.md` |
| Phase 9 | ✅ Complete | Contracts & Protection | `PHASE9_IMPLEMENTATION_STATUS.md` |

---

## Quick Links

- **Strategic Design:** `docs/APPLICATIONS_DESIGN.md`
- **Marketplace Vision:** `docs/APPLICATION_MARKETPLACE_NPM_INTEGRATION.md`
- **Next Steps:** `docs/PHASE5_NEXT_STEPS.md`
- **Test Plan:** `docs/PHASE4_TEST_PLAN.md`

---

**Current Focus:** Phase 9 Complete ✅ - Next: Phase 10 (Application Permissions) or other priorities

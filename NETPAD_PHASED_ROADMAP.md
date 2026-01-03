NetPad – Phased Roadmap & Feature Planning Guide

Audience: Engineering, Product, Architecture
Purpose: Provide a shared, concrete plan for how NetPad evolves from its current state into a focused, defensible, monetizable platform.

This document is intentionally opinionated. It is designed to help the team make sequencing decisions, not just collect ideas.

⸻

Guiding Product Principles

These principles should be used as tie‑breakers when prioritizing features.
	1.	Systems over Features
We prioritize end‑to‑end workflows that solve real problems over isolated capabilities.
	2.	MongoDB‑Native First
If a feature does not become meaningfully better because MongoDB is underneath it, it is not a priority.
	3.	Production Safety Enables Monetization
Features that make NetPad safe to use in production (versioning, rollback, auditability) unlock paid tiers.
	4.	Opinionated > Generic
NetPad wins by being prescriptive and fast, not by being infinitely flexible.
	5.	Developer Trust is the Moat
Clear behavior, predictable limits, and transparent data flow matter more than UI polish alone.

⸻

Current State (Baseline)

NetPad today already supports:
	•	Forms: visual builder, schema import, conditional logic, analytics
	•	Workflows: visual builder, triggers, execution engine, retries, logs
	•	Data Management: MongoDB browsing, connections, Atlas provisioning
	•	Platform: multi‑tenancy, Stripe billing, usage enforcement, APIs

This puts NetPad at functional completeness but not yet at organizational readiness.

⸻

Phase Overview

Phase	Name	Primary Goal
Phase 1	Production Foundation	Make NetPad safe, predictable, and team‑ready
Phase 2	Opinionated Systems	Prove NetPad solves real business workflows end‑to‑end
Phase 3	Collaboration & Scale	Enable teams, governance, and enterprise adoption
Phase 4	Ecosystem & Expansion	Open the platform to extensibility and partners


⸻

Phase 1 – Production Foundation (Highest Priority)

Goal: Make workflows and forms safe to run in real environments.

This phase directly enables paid adoption.

1. Workflow Versioning & Lifecycle

Why it matters: No serious team will automate business processes without versioning.

Scope:
	•	Draft vs Published workflows
	•	Immutable execution against a specific version
	•	Version history with metadata (who, when, why)
	•	Rollback to previous versions

Out of scope (for now):
	•	Cross‑environment promotion (dev → prod)

Impact:
	•	Unlocks Team & Enterprise plans
	•	Reduces fear of change

⸻

2. Execution Transparency & Determinism

Why it matters: Trust is built when users understand exactly what happened.

Scope:
	•	Clear execution timelines
	•	Node‑level input/output inspection
	•	Stable execution IDs
	•	Replay execution with same input

Impact:
	•	Debuggability
	•	Supportability
	•	Audit readiness

⸻

3. Limits That Map to Value

Why it matters: Usage limits should feel fair and understandable.

Scope:
	•	Shift messaging from raw executions → active production workflows
	•	Explicit distinction between:
	•	Draft workflows (unlimited)
	•	Active workflows (tier‑limited)
	•	Clear UI indicators when limits are reached

Impact:
	•	Pricing clarity
	•	Less friction upgrading

⸻

Phase 2 – Opinionated Systems (Market Proof)

Goal: Demonstrate NetPad as a solution, not a toolkit.

This phase sells the vision.

1. End‑to‑End Workflow Templates

Templates should span Forms + Workflows + Data Views.

Initial candidates:
	•	Client onboarding command center
	•	Employee onboarding
	•	Lead intake & routing
	•	Compliance / intake workflows

Template characteristics:
	•	Opinionated defaults
	•	Editable but guided
	•	Demonstrates MongoDB document lifecycle

Impact:
	•	Faster onboarding
	•	Stronger demos
	•	Clear differentiation

⸻

2. Stateful & Long‑Running Workflows

Why it matters: Real processes don’t finish in one execution.

Scope:
	•	Wait states
	•	Human approval steps
	•	SLA timers
	•	Resume from checkpoint

Impact:
	•	Moves NetPad beyond Zapier‑style automation
	•	Enables regulated and operational use cases

⸻

3. AI Nodes (Scoped & Purpose‑Built)

Rule: AI must influence workflow decisions, not just generate text.

Initial nodes:
	•	AI Extract → schema‑validated output
	•	AI Classify → routing conditions
	•	AI Summarize → audit/log enrichment

Explicit non‑goals:
	•	Free‑form chat nodes
	•	Generic prompt playgrounds

Impact:
	•	Clear AI value
	•	Lower hallucination risk

⸻

Phase 3 – Collaboration & Scale

Goal: Enable teams and organizations to work together safely.

1. Collaboration Primitives

Scope:
	•	Comments on forms/workflows
	•	Ownership and responsibility
	•	Change attribution
	•	Notifications

Note: Real‑time cursors are not required yet.

⸻

2. Role‑Based Access Control (RBAC)

Scope:
	•	Viewer / Editor / Admin roles
	•	Per‑resource permissions
	•	Environment‑aware permissions (later)

Impact:
	•	Enterprise readiness
	•	Reduced blast radius

⸻

3. Audit & Compliance Surface

Scope:
	•	Read/write audit logs
	•	Workflow execution audit trails
	•	Exportable logs

Impact:
	•	Regulated industries
	•	Security reviews

⸻

Phase 4 – Ecosystem & Expansion

Goal: Let others build on NetPad.

1. Extensible Node SDK

Scope:
	•	Define custom workflow nodes
	•	Package & register nodes
	•	Org‑local vs shared nodes

⸻

2. Template Marketplace (Curated First)

Rules:
	•	Start first‑party only
	•	Prove value before opening submissions

⸻

3. Advanced Integrations

Only after:
	•	Core workflows are deeply stable

⸻

What We Are Intentionally Not Doing (Yet)
	•	Generic BI dashboards
	•	Large third‑party integration catalogs
	•	Consumer‑grade form marketplaces
	•	Real‑time multi‑cursor editing

These add surface area without strengthening the core moat.

⸻

How Engineering Should Use This Document
	•	Treat each Phase as a delivery boundary
	•	Do not pull Phase 3+ work forward without explicit review
	•	Use principles to resolve disagreements
	•	Optimize for clarity and trust, not feature count

⸻

North Star:
NetPad becomes the safest, fastest way to turn MongoDB‑backed ideas into real, automated systems.
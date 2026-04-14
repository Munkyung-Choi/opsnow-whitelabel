---
id: SKL-multi-MULTITENANCYSAAS
name: Multi Tenancy Saas
description: Multi-tenancy lets one product serve many customers safely. The hard
  parts are enforcing isolation everywhere (API, DB, cache, jobs), preventing noisy-neighbor
  issues, and keeping operations (migratio
version: 1.0.0
status: active
owner: '@cerebra-team'
last_updated: '2026-02-22'
category: Backend
tags:
- api
- backend
- server
- database
stack:
- Python
- Node.js
- REST API
- GraphQL
difficulty: Intermediate
---

# Multi Tenancy Saas

## Skill Profile
*(Select at least one profile to enable specific modules)*
- [ ] **DevOps**
- [x] **Backend**
- [ ] **Frontend**
- [ ] **AI-RAG**
- [ ] **Security Critical**

## Overview
Multi-tenancy lets one product serve many customers safely. The hard parts are enforcing isolation everywhere (API, DB, cache, jobs), preventing noisy-neighbor issues, and keeping operations (migrations, billing, support) tenant-aware.

## Why This Matters
- **Security**: prevent cross-tenant data leaks (the #1 existential risk for SaaS)
- **Scalability**: serve thousands of tenants without exploding ops overhead
- **Cost efficiency**: shared infra with fair resource allocation
- **Velocity**: one codebase and deployment model, still customizable per tenant

## Core Concepts & Rules

### 1. Core Principles
- Follow established patterns and conventions
- Maintain consistency across codebase
- Document decisions and trade-offs

### 2. Implementation Guidelines
- Start with the simplest viable solution
- Iterate based on feedback and requirements
- Test thoroughly before deployment


## Inputs / Outputs / Contracts
* **Inputs**:
  - <e.g., env vars, request payload, file paths, schema>
* **Entry Conditions**:
  - <Pre-requisites: e.g., Repo initialized, DB running, specific branch checked out>
* **Outputs**:
  - <e.g., artifacts (PR diff, docs, tests, dashboard JSON)>
* **Artifacts Required (Deliverables)**:
  - <e.g., Code Diff, Unit Tests, Migration Script, API Docs>
* **Acceptance Evidence**:
  - <e.g., Test Report (screenshot/log), Benchmark Result, Security Scan Report>
* **Success Criteria**:
  - <e.g., p95 < 300ms, coverage ≥ 80%>

## Skill Composition
* **Depends on**: None
* **Compatible with**: None
* **Conflicts with**: None
* **Related Skills**: None

## Quick Start
#

## Assumptions
- Multi-tenant SaaS application architecture
- Relational database with support for row-level security (PostgreSQL recommended)
- Authentication system that can validate tenant membership
- Billing/subscription system for entitlement management
- Cache layer (Redis) for tenant-aware caching

## Compatibility
- **PostgreSQL**: 12+ (for RLS features)
- **Node.js**: 16+ (for TypeScript examples)
- **Redis**: 6+ (for tenant-aware caching)
- **Stripe**: Latest API version
- **ORMs**: Prisma 4+, TypeORM 0.3+, Sequelize 6+

## Test Scenario Matrix
| Scenario | Input | Expected Output | Verification |
|----------|-------|-----------------|--------------|
| Tenant isolation | Query with tenant_id | Returns only tenant data | DB query inspection |
| Cross-tenant access | Query with wrong tenant_id | Empty result | API response check |
| Rate limit enforcement | Exceed tenant quota | 429 Too Many Requests | Load test |
| Billing event | Usage event | Idempotent ledger entry | Event deduplication |
| Tenant provisioning | New tenant data | Tenant created + admin user | Smoke test |
| Tenant offboarding | Offboard tenant | Data deleted/exported | Retention check |

## Technical Guardrails
#

## Agent Directives & Error Recovery
*(ข้อกำหนดสำหรับ AI Agent ในการคิดและแก้ปัญหาเมื่อเกิดข้อผิดพลาด)*

- **Thinking Process**: Analyze root cause before fixing. Do not brute-force.
- **Fallback Strategy**: Stop after 3 failed test attempts. Output root cause and ask for human intervention/clarification.
- **Self-Review**: Check against Guardrails & Anti-patterns before finalizing.
- **Output Constraints**: Output ONLY the modified code block. Do not explain unless asked.


## Definition of Done
A multi-tenancy feature is complete when:

- [ ] Tenant isolation enforced at database layer (RLS or equivalent)
- [ ] All repositories require tenant context
- [ ] Caches are namespaced by tenant ID
- [ ] Queues include tenant context
- [ ] Rate limits and quotas are per-tenant
- [ ] Billing events are tenant-scoped and idempotent
- [ ] Onboarding/offboarding are automated
- [ ] Logs include tenant ID for debugging
- [ ] Admin tools require explicit tenant context
- [ ] Security review passed for isolation patterns

## Anti-patterns
1. **"Filter in app only"**: no DB enforcement; one missed `tenant_id` filter becomes a breach
2. **Shared resources without limits**: one tenant degrades everyone
3. **Global caches**: cached objects without tenant namespace
4. **Tenant-unaware jobs**: background workers processing cross-tenant data accidentally
5. **Admin bypass**: admin tools that skip tenant scoping
6. **Mixed logs**: logs without tenant context making debugging impossible
7. **Global migrations**: schema changes that don't consider per-tenant impact
8. **Customization as code**: divergent code paths instead of configuration

## Reference Links
- [Multi-Tenant SaaS Patterns (AWS)](https://aws.amazon.com/partners/programs/saas/)
- [Azure Multi-Tenant Guidance](https://learn.microsoft.com/azure/architecture/guide/multitenant/)
- [PostgreSQL Row Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Stripe Billing Best Practices](https://stripe.com/docs/billing/best-practices)
- [SaaS Architecture Patterns](https://martinfowler.com/articles/multi-tenancy.html)

## Versioning & Changelog

* **Version**: 1.0.0
* **Changelog**:
  - 2026-02-22: Initial version with complete template structure


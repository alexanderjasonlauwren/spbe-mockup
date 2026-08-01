# SiDistrib — High-Level Solution Document

**LPG Distribution Management System | Enterprise Edition**
_Prepared: May 3, 2026 | Role: Senior Solution Engineer_

---

## 1. System Context

**SiDistrib** is a web-based operational platform for LPG distribution agents (_agen_) in Indonesia. It sits in the middle tier of the Pertamina supply chain:

```
Pertamina → SPBE → [Agen / SiDistrib] → Pangkalan → End Consumer
```

The system manages quota allocation (via Schedule Agreement), daily distribution planning, driver fleet, payment verification, and regulatory reporting — targeting the operational staff of an LPG agent with multiple pangkalan outlets.

---

## 2. Current Feature Inventory

`

### 2.1 Implemented (with mock data)

| Module                    | Features Present                                                                                                                                                            |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Authentication**        | Login, Zustand auth store, localStorage persistence, protected routes                                                                                                       |
| **RBAC**                  | 6 roles (admin, manager, finance, driver, staff, viewer), 10+ granular permissions, `<CanAccess>` UI gate                                                                   |
| **Dashboard**             | 4 KPI cards (daily distribution, quota remaining, active pangkalan, pending payments), monthly bar chart (target vs realisasi), regional donut chart, recent activity table |
| **Schedule Agreement**    | SA list table, status badges (Aktif/Selesai/Draft/Limit), month/year/status filter, upload modal, PDF download, global sisa kuota display                                   |
| **Distribution Planning** | Two-panel list+detail layout, row-level editing (pangkalan, driver, qty, jam pengiriman, statusBayar), Draft → Terkonfirmasi → Selesai workflow                             |
| **Monitoring**            | Driver status cards (4 statuses), quick stats bar, live map with markers, monitoring table with pencapaian %, date range filter                                             |
| **Payment Verification**  | Tabbed view (All/Waiting/Verified/Rejected), payment proof cards with bank info, approve/reject modal with notes                                                            |
| **Financial Reports**     | Revenue KPI cards, bar charts, period filter                                                                                                                                |
| **Notifications**         | System notification list, WhatsApp blast composer (templates, recipient groups, scheduling), auto-reminder config (SA expiry, low stock, payment pending, delivery delay)   |
| **Driver Management**     | Stats cards, searchable driver table, trip log view                                                                                                                         |
| **Pangkalan Management**  | Contact info, payment status, target tracking, searchable table                                                                                                             |
| **Product Management**    | LPG product list (3 kg, 5.5 kg, 12 kg categories), status badges, search/filter                                                                                             |
| **User Management**       | User table, role-based filter, sortable columns                                                                                                                             |
| **Settings**              | Branch/profile settings, notification preferences, basic security settings                                                                                                  |

### 2.2 Gaps & Placeholders

| Module             | Gap                                                   |
| ------------------ | ----------------------------------------------------- |
| **Orders**         | Page exists (`/orders`) — minimal implementation only |
| **Live Map**       | UI rendered, no real GPS data source connected        |
| **WhatsApp Blast** | UI complete, no WhatsApp Business API integration     |
| **File Upload**    | Upload modals exist, no backend storage connected     |
| **All API calls**  | React Query hooks structured, all data is mock arrays |
| **Auth**           | No real token validation, refresh, or session expiry  |

---

## 3. Ideal Enterprise Feature Set

### 3.1 Core Operations

#### 3.1.1 Schedule Agreement & Quota Management

- [ ] Automated SA ingestion from Pertamina's portal (API or EDI)
- [ ] Quota allocation engine — distribute SA quota to pangkalan by historical consumption, region, and priority tier
- [ ] Quota forecasting — alert when burn rate projects early exhaustion
- [ ] Multi-SA period support (overlapping or rollover quotas)
- [ ] SA audit log — every quota change recorded with actor and timestamp
- [ ] SA amendment workflow with approval chain

#### 3.1.2 Distribution Planning & Dispatch

- [ ] AI-assisted route optimization (multi-stop TSP with time windows)
- [ ] Auto-scheduling based on pangkalan order requests and quota availability
- [ ] Load plan: cylinder count ↔ vehicle capacity matching
- [ ] Delivery time-window constraints per pangkalan
- [ ] Return/empty cylinder reconciliation per trip
- [ ] Drag-and-drop dispatch board (Kanban-style)
- [ ] Conflict detection (driver double-booked, vehicle overloaded)
- [ ] Digital Delivery Order (e-DO) generation and QR-code signing

#### 3.1.3 Inventory & Cylinder Management

- [ ] Real-time full/empty/damaged cylinder inventory at depot level
- [ ] Cylinder serialization (barcode/RFID scanning)
- [ ] Stock reconciliation — cylinders dispatched vs returned vs sold
- [ ] Minimum stock alert with automated reorder trigger
- [ ] Cylinder loss & damage reporting and write-off workflow
- [ ] Inter-depot transfer management

#### 3.1.4 Fleet & Driver Operations

- [ ] Real GPS integration (Google Maps Platform / Mapbox) with live vehicle positions
- [ ] Geofencing — alert when driver deviates from approved route
- [ ] Driver mobile app: digital DO, arrival/departure timestamps, proof of delivery (photo + signature)
- [ ] Vehicle maintenance scheduler — service reminders, downtime logging
- [ ] Driver performance scorecard (on-time %, delivery accuracy, customer rating)
- [ ] License and STNK expiry alerts
- [ ] Fuel consumption tracking per trip

---

### 3.2 Financial Management

| Feature                            | Description                                                               |
| ---------------------------------- | ------------------------------------------------------------------------- |
| **Automated Invoicing**            | Auto-generate invoices on delivery completion, PDF + WhatsApp delivery    |
| **Accounts Receivable**            | Aging schedule per pangkalan, overdue escalation workflow                 |
| **Credit Limit Management**        | Per-pangkalan credit ceiling; block dispatch if limit breached            |
| **Multi-payment Gateway**          | Bank transfer (VA), QRIS, GoPay, OVO, BNI Direct, Mandiri Cash Management |
| **Payment Reconciliation**         | Auto-match payment proofs to invoices via amount + bank ref               |
| **Subsidy Tracking**               | Track Pertamina subsidy per cylinder type, reconcile with actual sales    |
| **Tax Module**                     | PPN 11%, PPh 22 computation; generate e-Faktur-ready CSV                  |
| **Petty Cash & Operational Costs** | Driver expense claims, fuel reimbursement, toll costs                     |
| **Financial Consolidation**        | Multi-branch P&L, balance sheet, cash flow statement                      |
| **Audit Trail**                    | Immutable financial event log, exportable for external auditor            |

---

### 3.3 Pangkalan (Partner) Management

- [ ] Digital onboarding — license upload (SIUP, SKU, Pertamina letter), e-KTP verification
- [ ] Performance scorecard — monthly achievement vs target, payment discipline score
- [ ] Service area geofencing — ensure pangkalan sells within designated territory
- [ ] License renewal management with expiry reminders
- [ ] Pangkalan credit rating — auto-downgrade credit limit on late payments
- [ ] Tiered pricing support (subsidized 3 kg vs non-subsidized)
- [ ] Pangkalan mobile/WhatsApp ordering portal

---

### 3.4 Reporting & Business Intelligence

# SiDistrib SPPG Multi-Tenant Solution Architecture Document

LPG Distribution Management Platform for Indonesian SPPG Agency  
Prepared: 2026-07-04  
Role: Solutions Architect

## 1. Executive Summary

SiDistrib is designed as an enterprise-grade, multi-tenant, on-premise platform for SPPG agencies that manage LPG distribution from distributor to retailer (pangkalan). The current frontend provides strong module coverage for operational workflows (SA, planning, monitoring, payment, reporting, notifications), but backend integrations, data integrity, and compliance controls are not yet production-ready. This document reworks the solution around existing mock screens and extends it to full enterprise operations: tenant isolation, regulatory reporting, financial reconciliation, high availability, advanced security, and end-to-end auditability.

## 2. Scope and Inputs

### 2.1 Deliverable Type

Full solution architecture document, including:

- current-state architecture and feature maturity,
- target architecture and integration model,
- security and compliance assessment,
- reporting and analytics architecture,
- implementation roadmap.

### 2.2 Confirmed Constraints

- Deployment model: On-premise only
- NFR target: aggressive SLA
  - uptime: 99.95%
  - API latency: <300ms P95 for operational reads
  - RPO: 15 minutes
  - RTO: 1 hour

## 3. Current-State Architecture (Based on Mock Screens)

### 3.1 Systems Inventory

| System             | Purpose                                                      | Technology                   | Current State                                  |
| ------------------ | ------------------------------------------------------------ | ---------------------------- | ---------------------------------------------- |
| Web Admin          | Operations for SA, planning, monitoring, payments, reporting | React + TypeScript (Vite)    | Implemented UI with mock data                  |
| Auth/RBAC (Client) | Login and permission-gated views                             | Zustand + client-side guards | No production-grade token/session backend      |
| API Layer          | Data access abstraction in frontend                          | Axios + React Query hooks    | Structured, but currently mock-backed          |
| Reporting UI       | KPI cards and charts                                         | Recharts                     | Visualization-only, no data warehouse pipeline |

### 3.2 Implemented Functional Surface

Operational modules available in UI:

- dashboard,
- schedule agreement,
- distribution planning,
- monitoring (including live map UI),
- payment verification,
- financial report screens,
- notifications and WhatsApp blast composer,
- master data (users, drivers, pangkalan, products),
- OCR receipt workflow pages.

### 3.3 Current Gaps

- Mock data across core flows; no authoritative transactional backend.
- No real GPS ingestion pipeline for live monitoring.
- WhatsApp/Bank/Regulator integrations not connected.
- Limited enterprise controls for multi-tenancy and data governance.
- No immutable audit chain and incomplete financial traceability.
- Placeholder-level order orchestration and procurement flow.

## 4. Target Business Architecture for SPPG Agency

### 4.1 Supply Chain Context

Distributor -> SPPG Agency (SiDistrib tenant) -> Retailer/Pangkalan -> End Consumer

### 4.2 Multi-Tenant Operating Model

Tenant = one SPPG agency legal entity.  
Branch/Depot = operational node inside tenant.

Required controls:

- strict tenant-scoped data isolation,
- branch-level segmentation,
- tenant-specific master data and policy settings,
- consolidated tenant reporting with branch drill-down,
- optional regulator-facing aggregated outputs.

### 4.3 Personas

- tenant_super_admin,
- branch_manager,
- dispatcher,
- finance_officer,
- compliance_officer,
- driver (mobile role),
- retailer/pangkalan operator (portal role),
- auditor_readonly.

## 5. Functional Requirements (Reworked)

### 5.1 Core Distribution Operations

| ID   | Requirement                              | Priority | Notes                                             |
| ---- | ---------------------------------------- | -------- | ------------------------------------------------- |
| FR-1 | SA ingestion and lifecycle               | Must     | import, approval, amendment, expiration alerts    |
| FR-2 | Quota allocation to retailer/pangkalan   | Must     | by region, priority, historical burn              |
| FR-3 | Distribution planning and dispatch board | Must     | schedule, assign driver/vehicle, route sequencing |
| FR-4 | Delivery execution and proof of delivery | Must     | timestamp, photo/signature, QR e-DO               |
| FR-5 | Live monitoring and geofence exceptions  | Must     | vehicle position, route adherence, delay alerts   |
| FR-6 | Return/empty cylinder reconciliation     | Must     | per-trip accountability                           |

### 5.2 Commercial and Financial

| ID    | Requirement                                   | Priority | Notes                                           |
| ----- | --------------------------------------------- | -------- | ----------------------------------------------- |
| FR-7  | Automated invoicing from delivered quantities | Must     | supports subsidized and non-subsidized products |
| FR-8  | Payment verification and reconciliation       | Must     | transfer proof + reference matching             |
| FR-9  | Accounts receivable aging and escalation      | Must     | 0-30, 31-60, 61-90, 90+ buckets                 |
| FR-10 | Credit limit and dispatch block rules         | Must     | prevent dispatch when policy violated           |
| FR-11 | Tax and subsidy reporting support             | Should   | PPN/PPh calculations and export templates       |

### 5.3 Communication and Partner Management

| ID    | Requirement                                       | Priority | Notes                                           |
| ----- | ------------------------------------------------- | -------- | ----------------------------------------------- |
| FR-12 | Event-driven notifications (in-app + WhatsApp)    | Must     | delivery/payment/quota alerts                   |
| FR-13 | Broadcast campaigns and template management       | Should   | segmentation by branch, status, geography       |
| FR-14 | Retailer/pangkalan onboarding and compliance docs | Must     | license expiry, identity docs, territory policy |

### 5.4 Reporting and Analytics

| ID    | Requirement                                 | Priority | Notes                                       |
| ----- | ------------------------------------------- | -------- | ------------------------------------------- |
| FR-15 | Operational KPI dashboard with drill-down   | Must     | tenant -> branch -> route -> delivery       |
| FR-16 | Distribution efficiency and SLA reporting   | Must     | on-time %, cycle time, load utilization     |
| FR-17 | Quota utilization and forecast              | Must     | variance and projected depletion            |
| FR-18 | Financial reporting and margin visibility   | Must     | revenue, cost, receivables, profit          |
| FR-19 | Regulatory reporting packs                  | Must     | BPH Migas and internal compliance templates |
| FR-20 | Ad-hoc report builder and scheduled exports | Should   | CSV/XLSX/PDF with role-scoped data          |

## 6. Non-Functional Requirements

| Category         | Requirement                      | Target                               |
| ---------------- | -------------------------------- | ------------------------------------ |
| Availability     | Service uptime                   | 99.95% monthly                       |
| Performance      | API response (operational reads) | <300ms P95                           |
| Scalability      | Concurrent users per tenant      | 2,000+                               |
| Scalability      | Total tenants                    | 100+ SPPG agencies                   |
| Data Recovery    | RPO                              | 15 minutes                           |
| Service Recovery | RTO                              | 1 hour                               |
| Security         | Encryption                       | AES-256 at rest, TLS 1.2+ in transit |
| Compliance       | Data privacy and auditability    | UU PDP aligned, full audit trails    |

## 7. Target Solution Architecture

### 7.1 Logical Component View

```text
Users (Admin, Ops, Finance, Compliance, Driver, Retailer)
	|
Web Portal + Mobile Apps
	|
API Gateway / WAF
	|
Domain Services (Auth, Tenant, SA, Planning, Dispatch, Monitoring, Billing, Payment, Notification, Reporting)
	|
Transactional DB + Event Bus + Document Storage + Analytics Store
	|
Integrations (Maps/GPS, WhatsApp, Banking, Regulator, ERP/Accounting)
```

### 7.2 Deployment Architecture (On-Prem)

- Container platform: Kubernetes (on-prem cluster, minimum 3 control plane + 3 worker nodes).
- Ingress and API gateway with WAF and rate limiting.
- PostgreSQL HA cluster with synchronous replica for primary zone.
- Redis cluster for cache/session/rate limiting.
- Message broker (Kafka or RabbitMQ) for asynchronous workflows.
- Object storage (on-prem S3-compatible) for SA docs, payment proofs, POD, OCR artifacts.
- Log and observability stack (OpenTelemetry + Prometheus + Grafana + centralized logs).
- DR site replication for DB and object storage to satisfy RPO/RTO.

### 7.3 Multi-Tenancy Pattern

Recommended model: Shared database, shared schema with strict row-level tenancy.

- Every transactional table includes `tenant_id` and `branch_id`.
- Row-level security (RLS) policy per tenant.
- Tenant-aware encryption key strategy for sensitive fields.
- Tenant partitioning strategy for high-volume tables (events, GPS, logs).

Alternative for high-regulatory tenant isolation:

- separate schema per tenant for premium/compliance-sensitive deployments.

## 8. Integration Architecture

### 8.1 Required Integrations

| Integration                  | Direction     | Pattern                       | Auth                   |
| ---------------------------- | ------------- | ----------------------------- | ---------------------- |
| Distributor/SA source        | Inbound       | API + scheduled batch import  | mTLS + signed payload  |
| Mapping/GPS provider         | Bidirectional | REST + streaming callbacks    | API key/OAuth          |
| Banking and VA               | Bidirectional | API + webhook                 | mTLS + IP allowlist    |
| WhatsApp Business API        | Outbound      | API + delivery status webhook | OAuth/API key          |
| Regulator reporting endpoint | Outbound      | Scheduled batch/API           | certificate-based auth |
| ERP/Accounting               | Bidirectional | API/file export               | service account        |

### 8.2 Integration Reliability Controls

- idempotency keys for all financial and message APIs,
- retry with exponential backoff and dead-letter queues,
- replay-safe event handling,
- schema versioning for integration contracts,
- reconciliation jobs for eventual consistency checks.

## 9. Data Architecture and Domain Model

### 9.1 Core Entities

- tenant, branch, user, role, permission,
- distributor, retailer_pangkalan,
- product, cylinder_inventory, vehicle, driver,
- schedule_agreement, sa_allocation, quota_ledger,
- distribution_plan, distribution_plan_item, delivery_order, delivery_event,
- gps_track, geofence_rule, geofence_alert,
- invoice, payment, payment_verification, receivable_snapshot,
- notification, notification_template, campaign, campaign_delivery,
- document_asset, ocr_inbox, ocr_extraction, audit_log.

### 9.2 Data Lifecycle

- hot operational data: 12-18 months,
- warm archive: 3-5 years,
- compliance retention: per regulator policy and tenant legal obligations.

### 9.3 Data Quality and Governance

- master data stewardship for branch, retailer, product,
- duplicate detection (retailer and invoice),
- mandatory lineage metadata for reporting tables,
- monthly data quality scorecards (completeness, timeliness, validity).

## 10. Reporting and Analytics Architecture

### 10.1 Reporting Layers

- Layer 1: Operational dashboards (near-real-time from transactional read models).
- Layer 2: Analytical marts (daily/hourly ETL into dimensional/fact models).
- Layer 3: Compliance packs (regulated templates and signed exports).

### 10.2 Enterprise Reporting Catalogue

| Report Group | Reports                                                                |
| ------------ | ---------------------------------------------------------------------- |
| Operations   | Delivery SLA, route adherence, dispatcher productivity, stock movement |
| Quota        | SA utilization, forecasted depletion, over/under allocation            |
| Finance      | Revenue, AR aging, payment turnaround, margin by branch/product        |
| Fleet        | Vehicle utilization, downtime, fuel cost per km, driver scorecards     |
| Partner      | Retailer performance, payment discipline, territory compliance         |
| Compliance   | Regulator monthly realization, subsidy traceability, audit extracts    |

### 10.3 BI Capability

- tenant-safe semantic model,
- role-based report access,
- scheduled distribution (email/secure portal),
- ad-hoc exploration with governed datasets.

## 11. Security and Compliance Assessment

### 11.1 Authentication and Session Security

- SSO support (OIDC/SAML) for enterprise tenants.
- MFA for privileged roles.
- refresh token rotation and session revocation.
- adaptive session timeout by role risk profile.

### 11.2 Authorization

- RBAC with resource-level permissions.
- branch and tenant scoping on every request.
- dual-control approvals for sensitive operations (payment override, quota amendment).

### 11.3 Data Protection

- TLS 1.2+ for all service-to-service and client traffic.
- AES-256 encryption at rest for databases and object storage.
- field-level encryption/tokenization for PII (KTP, phone, bank account details).

### 11.4 Compliance Controls

- full audit logs (who/what/when/where/before/after),
- consent and privacy handling for partner communication,
- legal hold and retention policy enforcement,
- periodic penetration testing and vulnerability remediation SLA.

### 11.5 Security Gaps to Resolve from Current State

- move from client-side auth state to server-issued JWT/OIDC flow,
- introduce immutable finance and quota audit trails,
- implement secrets management and key rotation,
- harden upload pipeline with malware scanning and content validation.

## 12. Proof of Concept Scope (Enterprise Readiness)

### 12.1 Objectives

1. Validate end-to-end distribution workflow from SA to invoiced delivery for one tenant with two branches.
2. Validate multi-tenant data isolation and role-based access controls.
3. Validate reporting accuracy for operations and finance against controlled sample data.

### 12.2 Success Criteria

| Criteria            | Target                                  | Measurement            |
| ------------------- | --------------------------------------- | ---------------------- |
| Workflow completion | 100% critical path scenarios pass       | UAT script pass rate   |
| Tenant isolation    | 0 cross-tenant data leakage             | security test results  |
| API performance     | <300ms P95 on core read APIs            | load test report       |
| Availability        | 99.95% during test window               | platform SLI report    |
| Report correctness  | >=99.5% reconciliation with source data | finance audit sampling |

### 12.3 In Scope

- SA, planning, dispatch, monitoring, payments, reporting, notifications,
- bank proof verification flow,
- on-prem deployment baseline,
- audit logging and security baseline.

### 12.4 Out of Scope

- full mobile app rollout,
- advanced AI route optimization,
- complete regulator API automation across all provinces.

## 13. Implementation Roadmap

### Phase 1 (0-3 Months): Platform Foundation

- on-prem infrastructure baseline (K8s, DB HA, storage, observability),
- identity and tenant model,
- master data services,
- backend API for existing core screens.

### Phase 2 (4-6 Months): Core Operations Go-Live

- SA and quota engine,
- distribution planning and dispatch execution,
- delivery events and monitoring ingestion,
- initial finance workflows (invoice/payment verification).

### Phase 3 (7-9 Months): Enterprise Finance and Compliance

- AR aging, credit controls, tax-ready exports,
- immutable audit and compliance packs,
- regulator reporting automation,
- DR drills against RPO/RTO targets.

### Phase 4 (10-12 Months): Scale and Optimization

- advanced analytics and forecasting,
- campaign automation and communication optimization,
- inventory serialization and advanced reconciliation,
- multi-tenant performance tuning and partition strategy.

## 14. Updated Feature Maturity Matrix

| Domain                | Current (Mock Screen State) | Target Enterprise State                         |
| --------------------- | --------------------------- | ----------------------------------------------- |
| Authentication        | UI login + local store      | SSO/OIDC + MFA + secure sessions                |
| SA and Quota          | Screen workflows only       | integrated, auditable, policy-driven allocation |
| Planning and Dispatch | manual planning UI          | optimized dispatch with constraint engine       |
| Monitoring            | map UI, mock statuses       | live GPS stream and geofence alerts             |
| Payments              | verification UI             | reconciled, policy-gated receivables lifecycle  |
| Reporting             | static visuals              | governed BI + compliance reports                |
| Notifications         | campaign UI                 | omnichannel delivery with delivery telemetry    |
| OCR                   | UI flow available           | document intelligence with approval workflow    |
| Multi-tenancy         | not implemented             | strict tenant isolation + branch segmentation   |
| Security and Audit    | partial                     | enterprise security controls + immutable logs   |

## 15. Key Risks and Mitigation

| Risk                                     | Impact | Mitigation                                               |
| ---------------------------------------- | ------ | -------------------------------------------------------- |
| Integration complexity underestimated    | High   | integration discovery workshops + staged adapters        |
| Data model drift from frontend contracts | High   | contract-first APIs + schema governance                  |
| On-prem ops maturity insufficient        | High   | platform SRE runbook + managed support model             |
| Regulatory interpretation changes        | Medium | compliance working group + configurable reporting engine |
| Scope expansion from mock-to-enterprise  | High   | gated roadmap, strict change control, phased acceptance  |

## 16. Conclusion

The current UI gives a strong functional blueprint. To make SiDistrib enterprise-ready for Indonesian SPPG agencies, the next step is to anchor those screens to a multi-tenant transactional core, integrate critical operational systems (GPS, banking, regulatory), and enforce enterprise-grade security, audit, and reporting controls. This architecture provides a practical path from mock-driven frontend to production-grade distribution platform at multi-tenant scale.

## 17. Appendix A: API Contract Matrix (Screen-by-Screen)

### 17.1 Cross-Cutting API Conventions

- Base path: `/api/v1`
- Auth: OAuth2/OIDC access token (`Bearer`) for user-facing APIs
- Tenant scope: derived from token claims (`tenant_id`, `branch_ids`) and enforced server-side
- Idempotency: required for create/mutate financial and messaging endpoints via `Idempotency-Key`
- Traceability: include `X-Request-Id` on all requests and responses
- Pagination format: `page`, `limit`, `sort_by`, `sort_order`, `search`

### 17.2 Screen Contracts

| Screen                | Endpoint                                   | Method | Purpose                     | Request (Key Fields)                                                                                                 | Response (Key Fields)                                                              | Auth           | Rate Limit     |
| --------------------- | ------------------------------------------ | ------ | --------------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------- | -------------- |
| Login                 | `/auth/login`                              | POST   | Authenticate user           | `email`, `password`, `mfa_code?`                                                                                     | `access_token`, `refresh_token`, `user`, `permissions`                             | Public         | 20/min/IP      |
| Login                 | `/auth/refresh`                            | POST   | Rotate access token         | `refresh_token`                                                                                                      | `access_token`, `refresh_token`                                                    | Public         | 60/min/user    |
| Login                 | `/auth/logout`                             | POST   | Revoke session              | `refresh_token`                                                                                                      | `success`                                                                          | User           | 30/min/user    |
| Dashboard             | `/dashboard/kpis`                          | GET    | KPI summary                 | `period`, `branch_id?`                                                                                               | `daily_distributed`, `quota_remaining`, `active_pangkalan`, `pending_payments`     | User           | 120/min/user   |
| Dashboard             | `/dashboard/distribution-trend`            | GET    | Target vs realization chart | `period`, `branch_id?`                                                                                               | `series[{date,target,realisasi}]`                                                  | User           | 120/min/user   |
| Dashboard             | `/dashboard/pangkalan-share`               | GET    | Regional share chart        | `period`, `branch_id?`                                                                                               | `series[{region,value,percentage}]`                                                | User           | 120/min/user   |
| Dashboard             | `/dashboard/recent-activities`             | GET    | Recent ops feed             | `page`, `limit`                                                                                                      | `items[{date,pangkalan,driver,qty,status}]`                                        | User           | 120/min/user   |
| Schedule Agreement    | `/schedule-agreements`                     | GET    | List SA                     | `status?`, `month?`, `year?`, `page`, `limit`                                                                        | `items[{id,nomor_sa,spbe,start_date,end_date,total_quota,remaining_quota,status}]` | User           | 120/min/user   |
| Schedule Agreement    | `/schedule-agreements`                     | POST   | Create/import SA metadata   | `nomor_sa`, `spbe`, `start_date`, `end_date`, `total_quota`                                                          | `id`, `status`                                                                     | User           | 30/min/user    |
| Schedule Agreement    | `/schedule-agreements/{sa_id}`             | PATCH  | Update SA                   | mutable SA fields                                                                                                    | updated SA record                                                                  | User           | 60/min/user    |
| Schedule Agreement    | `/schedule-agreements/{sa_id}/allocations` | PUT    | Set quota allocations       | `allocations[{pangkalan_id,product_id,allocated_qty,priority_tier}]`                                                 | allocation summary                                                                 | User           | 30/min/user    |
| Schedule Agreement    | `/schedule-agreements/{sa_id}/document`    | POST   | Upload SA file              | multipart `file`, `doc_type`                                                                                         | `document_url`, `checksum`                                                         | User           | 10/min/user    |
| Schedule Agreement    | `/schedule-agreements/{sa_id}/download`    | GET    | Download SA PDF             | -                                                                                                                    | file stream                                                                        | User           | 60/min/user    |
| Distribution Planning | `/distribution-plans`                      | GET    | List plans                  | `date_from?`, `date_to?`, `status?`, `branch_id?`                                                                    | `items[{id,plan_date,total_cylinders,total_pangkalan,total_drivers,status}]`       | User           | 120/min/user   |
| Distribution Planning | `/distribution-plans`                      | POST   | Create plan                 | `plan_date`, `branch_id`, `notes?`                                                                                   | `id`, `status`                                                                     | User           | 30/min/user    |
| Distribution Planning | `/distribution-plans/{plan_id}`            | GET    | Plan detail                 | -                                                                                                                    | plan header + `items[]`                                                            | User           | 120/min/user   |
| Distribution Planning | `/distribution-plans/{plan_id}/items`      | PUT    | Upsert plan rows            | `items[{id?,pangkalan_id,driver_id,vehicle_id,product_id,qty_cylinders,scheduled_time,payment_state,sequence_no}]`   | updated items                                                                      | User           | 60/min/user    |
| Distribution Planning | `/distribution-plans/{plan_id}/confirm`    | POST   | Confirm plan                | `confirmation_note?`                                                                                                 | `status=CONFIRMED`, `confirmed_at`                                                 | User           | 30/min/user    |
| Distribution Planning | `/distribution-plans/{plan_id}/complete`   | POST   | Close plan                  | `close_note?`                                                                                                        | `status=COMPLETED`                                                                 | User           | 30/min/user    |
| Monitoring            | `/monitoring/drivers`                      | GET    | Driver live cards           | `branch_id?`, `status?`                                                                                              | `drivers[{driver_id,name,vehicle,status,eta,location}]`                            | User           | 120/min/user   |
| Monitoring            | `/monitoring/assignments`                  | GET    | Assignment table            | `date`, `branch_id?`                                                                                                 | `items[{delivery_id,pangkalan,target,realisasi,progress,status}]`                  | User           | 120/min/user   |
| Monitoring            | `/monitoring/map`                          | GET    | Map markers                 | `date`, `branch_id?`                                                                                                 | `markers[{type,id,lat,lng,status}]`                                                | User           | 120/min/user   |
| Monitoring            | `/gps/tracks`                              | POST   | Ingest GPS points           | `delivery_id`, `driver_id`, `tracked_at`, `lat`, `lng`, `speed_kmh?`, `heading?`                                     | `accepted=true`                                                                    | Service/Device | 600/min/device |
| Payments              | `/payments`                                | GET    | Payment list/tabs           | `status?`, `date_from?`, `date_to?`, `search?`, `page`, `limit`                                                      | `items[{id,invoice_id,pangkalan,amount,bank_name,paid_at,status}]`                 | User           | 120/min/user   |
| Payments              | `/payments/{payment_id}`                   | GET    | Payment detail              | -                                                                                                                    | payment + proof metadata + verification history                                    | User           | 120/min/user   |
| Payments              | `/payments/{payment_id}/verify`            | POST   | Approve payment             | `note?`                                                                                                              | `status=VERIFIED`, `verified_at`, `verified_by`                                    | User           | 60/min/user    |
| Payments              | `/payments/{payment_id}/reject`            | POST   | Reject payment              | `reason`, `note?`                                                                                                    | `status=REJECTED`                                                                  | User           | 60/min/user    |
| Reports               | `/reports/financial/kpis`                  | GET    | Financial KPI cards         | `period`, `branch_id?`                                                                                               | revenue, receivables, cost, net_profit                                             | User           | 120/min/user   |
| Reports               | `/reports/financial/trend`                 | GET    | Revenue vs expense trend    | `period`, `granularity`                                                                                              | `series[{period,revenue,expense,profit}]`                                          | User           | 120/min/user   |
| Reports               | `/reports/operations/sla`                  | GET    | SLA metrics                 | `period`, `branch_id?`                                                                                               | on-time rate, avg cycle time, delay buckets                                        | User           | 120/min/user   |
| Reports               | `/reports/regulatory/bph-migas`            | POST   | Generate compliance pack    | `period`, `branch_ids[]`, `format`                                                                                   | `job_id`, `status`                                                                 | User           | 20/min/user    |
| Notifications         | `/notifications`                           | GET    | In-app list                 | `type?`, `is_read?`, `page`, `limit`                                                                                 | `items[{id,type,title,message,is_read,created_at}]`                                | User           | 120/min/user   |
| Notifications         | `/notifications/{id}/read`                 | POST   | Mark read                   | -                                                                                                                    | `is_read=true`                                                                     | User           | 120/min/user   |
| Notifications         | `/reminder-settings`                       | GET    | Load reminder config        | `branch_id?`                                                                                                         | settings object                                                                    | User           | 120/min/user   |
| Notifications         | `/reminder-settings`                       | PUT    | Save reminder config        | `sa_expiry_enabled`, `stock_low_enabled`, `payment_pending_enabled`, `delivery_delay_enabled`, `stock_threshold_pct` | updated settings                                                                   | User           | 60/min/user    |
| WhatsApp Blast        | `/message-templates`                       | GET    | List templates              | `channel=WHATSAPP`                                                                                                   | `items[{id,name,body,variables}]`                                                  | User           | 120/min/user   |
| WhatsApp Blast        | `/campaigns`                               | POST   | Create/send campaign        | `channel`, `template_id`, `recipient_group`, `schedule_at?`, `parameters`                                            | `campaign_id`, `status`                                                            | User           | 30/min/user    |
| WhatsApp Blast        | `/campaigns/{campaign_id}`                 | GET    | Campaign detail             | -                                                                                                                    | campaign + delivery stats                                                          | User           | 120/min/user   |
| WhatsApp Blast        | `/campaigns/{campaign_id}/deliveries`      | GET    | Delivery receipts           | `status?`, `page`, `limit`                                                                                           | per-recipient status (sent/delivered/read/failed)                                  | User           | 120/min/user   |
| Drivers               | `/drivers`                                 | GET    | Driver list                 | `search?`, `status?`, `branch_id?`, `page`, `limit`                                                                  | `items[{id,name,phone,vehicle,status,trips_today,rating}]`                         | User           | 120/min/user   |
| Drivers               | `/drivers`                                 | POST   | Create driver               | profile + compliance fields                                                                                          | driver record                                                                      | User           | 30/min/user    |
| Drivers               | `/drivers/{driver_id}`                     | PATCH  | Update driver               | mutable profile/status fields                                                                                        | updated record                                                                     | User           | 60/min/user    |
| Drivers               | `/drivers/{driver_id}/trips`               | GET    | Trip logs                   | `date_from?`, `date_to?`, `page`, `limit`                                                                            | trip list and summaries                                                            | User           | 120/min/user   |
| Pangkalan             | `/retailers`                               | GET    | Pangkalan list              | `search?`, `payment_status?`, `branch_id?`, `page`, `limit`                                                          | `items[{id,name,address,phone,target,achievement,payment_status}]`                 | User           | 120/min/user   |
| Pangkalan             | `/retailers`                               | POST   | Create pangkalan            | onboarding fields + docs refs                                                                                        | retailer record                                                                    | User           | 30/min/user    |
| Pangkalan             | `/retailers/{retailer_id}`                 | PATCH  | Update pangkalan            | mutable profile fields                                                                                               | updated record                                                                     | User           | 60/min/user    |
| Products              | `/products`                                | GET    | Product list                | `search?`, `category?`, `status?`, `page`, `limit`                                                                   | `items[{id,name,size_kg,category,price,stock,status}]`                             | User           | 120/min/user   |
| Products              | `/products`                                | POST   | Create product              | catalog fields                                                                                                       | product record                                                                     | User           | 30/min/user    |
| Products              | `/products/{product_id}`                   | PATCH  | Update product              | mutable fields                                                                                                       | updated record                                                                     | User           | 60/min/user    |
| Users                 | `/users`                                   | GET    | User list                   | `search?`, `role?`, `branch_id?`, `page`, `limit`                                                                    | `items[{id,name,email,role,branch,status}]`                                        | User           | 120/min/user   |
| Users                 | `/users`                                   | POST   | Create user                 | identity + role + branch access                                                                                      | user record                                                                        | User           | 20/min/user    |
| Users                 | `/users/{user_id}`                         | PATCH  | Update user                 | role/status/branch scope                                                                                             | updated record                                                                     | User           | 60/min/user    |
| Settings              | `/branches`                                | GET    | Branch settings list        | `page`, `limit`                                                                                                      | branch records                                                                     | User           | 120/min/user   |
| Settings              | `/branches/{branch_id}`                    | PATCH  | Update branch settings      | branch profile/config                                                                                                | updated branch                                                                     | User           | 60/min/user    |
| Settings              | `/settings/security`                       | GET    | Get security policy         | -                                                                                                                    | policy object                                                                      | User           | 120/min/user   |
| Settings              | `/settings/security`                       | PUT    | Update security policy      | session policy, MFA policy, IP allowlist                                                                             | updated policy                                                                     | User           | 30/min/user    |
| Orders (placeholder)  | `/orders`                                  | GET    | Order list                  | filters + paging                                                                                                     | order headers                                                                      | User           | 120/min/user   |
| Orders (placeholder)  | `/orders`                                  | POST   | Create order                | retailer/product/qty/date                                                                                            | order record                                                                       | User           | 30/min/user    |
| OCR Inbox             | `/ocr/inbox`                               | GET    | List uploaded docs          | `status?`, `page`, `limit`                                                                                           | `items[{id,file_name,upload_at,process_status,progress_pct}]`                      | User           | 120/min/user   |
| OCR Inbox             | `/ocr/inbox`                               | POST   | Upload receipt/doc          | multipart `file`, `source_channel?`                                                                                  | `id`, `process_status`                                                             | User           | 20/min/user    |
| OCR Verification      | `/ocr/extractions/{id}`                    | GET    | Extraction detail           | -                                                                                                                    | header fields + `items[]` + confidence                                             | User           | 120/min/user   |
| OCR Verification      | `/ocr/extractions/{id}`                    | PATCH  | Correct extraction          | corrected fields + line items                                                                                        | updated extraction                                                                 | User           | 60/min/user    |
| OCR Verification      | `/ocr/extractions/{id}/verify`             | POST   | Approve extraction          | `note?`                                                                                                              | `verification_status=VERIFIED`                                                     | User           | 60/min/user    |
| OCR Archive           | `/ocr/archive`                             | GET    | Archived docs               | filters + paging                                                                                                     | archived records                                                                   | User           | 120/min/user   |

### 17.3 Domain Webhooks (Outbound)

| Webhook                    | Trigger                         | Payload Key Fields                                              | Consumer                 |
| -------------------------- | ------------------------------- | --------------------------------------------------------------- | ------------------------ |
| `delivery.updated`         | Delivery status changes         | `tenant_id`, `delivery_id`, `status`, `timestamps`, `driver_id` | Mobile, Ops integrations |
| `payment.verified`         | Finance verification success    | `tenant_id`, `payment_id`, `invoice_id`, `verified_at`          | ERP/Accounting           |
| `quota.low`                | Remaining quota below threshold | `tenant_id`, `sa_id`, `remaining_qty`, `threshold`              | Notification service     |
| `campaign.delivery_status` | Message delivery update         | `campaign_id`, `recipient`, `status`, `provider_ref`            | Notification analytics   |

## 18. Appendix B: Target Data Model Mapping (Screen Field -> Entity)

### 18.1 Mapping Rules

- Every mapped table below is implicitly tenant-scoped by `tenant_id`.
- Branch-operational data must include `branch_id`.
- UI display labels may come from joins (for example, driver name from `drivers`, not from `distribution_plan_items`).

### 18.2 Login and User Context

| Screen | UI Field    | Entity.Table.Column                         | Type          | Notes                    |
| ------ | ----------- | ------------------------------------------- | ------------- | ------------------------ |
| Login  | email       | `users.email`                               | string        | unique                   |
| Login  | password    | `users.password_hash`                       | secret hash   | never returned to client |
| Login  | role        | `roles.name` (via `users.role_id`)          | enum/string   | access scope             |
| Login  | permissions | `permissions.code` (via `role_permissions`) | array<string> | token claims             |

### 18.3 Dashboard

| UI Field                    | Entity Mapping                             | Computation Source                        |
| --------------------------- | ------------------------------------------ | ----------------------------------------- |
| daily distribution          | `deliveries.delivered_qty`                 | sum by current day/branch                 |
| quota remaining             | `schedule_agreements.remaining_quota`      | active SA aggregate                       |
| active pangkalan            | `retailer_pangkalan.id`                    | count by active status                    |
| pending payments            | `payments.id`                              | count where `status=WAITING_VERIFICATION` |
| monthly target vs realisasi | `distribution_targets` + `deliveries`      | by week/month bucket                      |
| regional share              | `retailer_pangkalan.region` + `deliveries` | grouped aggregate                         |
| recent activities           | `delivery_events`                          | latest operations feed                    |

### 18.4 Schedule Agreement Screen

| UI Field              | Entity.Table.Column                                          | Notes               |
| --------------------- | ------------------------------------------------------------ | ------------------- |
| nomor SA              | `schedule_agreements.nomor_sa`                               | unique business key |
| SPBE                  | `schedule_agreements.spbe_name`                              | source depot        |
| periode mulai         | `schedule_agreements.start_date`                             | date                |
| periode berakhir      | `schedule_agreements.end_date`                               | date                |
| total kuota           | `schedule_agreements.total_quota`                            | numeric             |
| sudah didistribusikan | `schedule_agreements.distributed_quota`                      | numeric             |
| sisa kuota            | `schedule_agreements.remaining_quota`                        | numeric             |
| status                | `schedule_agreements.status`                                 | enum                |
| upload file           | `document_asset` linked by `owner_table=schedule_agreements` | file metadata       |

### 18.5 Distribution Planning Screen

| UI Field            | Entity.Table.Column                                                 | Notes                     |
| ------------------- | ------------------------------------------------------------------- | ------------------------- |
| tanggal rencana     | `distribution_plans.plan_date`                                      | header                    |
| total tabung        | `distribution_plans.total_cylinders`                                | derived from items        |
| jumlah pangkalan    | `distribution_plans.total_pangkalan`                                | distinct count            |
| jumlah driver       | `distribution_plans.total_drivers`                                  | distinct count            |
| status plan         | `distribution_plans.status`                                         | DRAFT/CONFIRMED/COMPLETED |
| pangkalan (row)     | `distribution_plan_items.pangkalan_id` -> `retailer_pangkalan.name` | join for display          |
| alamat (row)        | `retailer_pangkalan.address`                                        | master data               |
| jumlah tabung (row) | `distribution_plan_items.qty_cylinders`                             | numeric                   |
| driver (row)        | `distribution_plan_items.driver_id` -> `drivers.name`               | join for display          |
| jam pengiriman      | `distribution_plan_items.scheduled_time`                            | time                      |
| status bayar        | `distribution_plan_items.payment_state`                             | LUNAS/BELUM_LUNAS         |

### 18.6 Monitoring Screen

| UI Field         | Entity.Table.Column                                                 | Notes                    |
| ---------------- | ------------------------------------------------------------------- | ------------------------ |
| driver name      | `drivers.name`                                                      | master                   |
| plat/armada      | `vehicles.plate_no`, `vehicles.type`                                | via assignment           |
| kapasitas        | `vehicles.capacity_cylinders`                                       | integer                  |
| status driver    | `deliveries.delivery_status` mapped to runtime status               | derived                  |
| lokasi map       | `gps_tracks.lat`, `gps_tracks.lng`                                  | latest point             |
| ETA              | derived from route engine + `gps_tracks`                            | computed field           |
| target/realisasi | `distribution_plan_items.qty_cylinders`, `deliveries.delivered_qty` | progress basis           |
| pencapaian %     | derived metric                                                      | `(realisasi/target)*100` |

### 18.7 Payment Verification Screen

| UI Field           | Entity.Table.Column                                  | Notes                     |
| ------------------ | ---------------------------------------------------- | ------------------------- |
| pangkalan          | `payments.pangkalan_id` -> `retailer_pangkalan.name` | join for display          |
| jumlah tabung      | `invoices.total_cylinders` or delivery aggregate     | finance reference         |
| nominal            | `payments.amount`                                    | decimal                   |
| bank               | `payments.bank_name`                                 | enum/string               |
| no rekening        | `payments.account_no_masked`                         | masked in UI              |
| tanggal bayar      | `payments.paid_at`                                   | timestamp                 |
| status             | `payments.status`                                    | WAITING/VERIFIED/REJECTED |
| bukti transfer     | `document_asset.storage_key` (payment ownership)     | file reference            |
| catatan verifikasi | `payment_verifications.note`                         | decision trail            |

### 18.8 Reports Screen

| UI Field                  | Entity Mapping                        | Notes                |
| ------------------------- | ------------------------------------- | -------------------- |
| total pendapatan          | `fact_finance_daily.revenue`          | aggregated by period |
| total piutang             | `receivable_snapshot.outstanding`     | latest snapshot      |
| biaya operasional         | `fact_finance_daily.operational_cost` | aggregated           |
| laba bersih               | `fact_finance_daily.net_profit`       | aggregated           |
| chart pendapatan vs biaya | `fact_finance_daily`                  | time-series          |
| per-pangkalan performance | `retailer_pangkalan` + finance facts  | drill-down           |

### 18.9 Notifications and WhatsApp Blast

| UI Field        | Entity.Table.Column                                          | Notes                 |
| --------------- | ------------------------------------------------------------ | --------------------- |
| tipe notifikasi | `notifications.type`                                         | REMINDER/ALERT/SYSTEM |
| judul           | `notifications.title`                                        | text                  |
| pesan           | `notifications.message`                                      | text                  |
| waktu           | `notifications.created_at`                                   | timestamp             |
| status baca     | `notifications.is_read`                                      | boolean               |
| template blast  | `notification_templates.name`, `notification_templates.body` | channel-specific      |
| grup penerima   | `campaigns.recipient_group`                                  | segment               |
| jadwal kirim    | `campaigns.schedule_at`                                      | timestamp             |
| status kirim    | `campaign_deliveries.status`                                 | per-recipient status  |

### 18.10 Drivers Screen

| UI Field        | Entity.Table.Column                           | Notes                         |
| --------------- | --------------------------------------------- | ----------------------------- |
| nama driver     | `drivers.name`                                | text                          |
| no HP           | `drivers.phone`                               | encrypted at rest recommended |
| no kendaraan    | `vehicles.plate_no`                           | current assignment            |
| jenis kendaraan | `vehicles.type`                               | enum/string                   |
| kapasitas       | `vehicles.capacity_cylinders`                 | integer                       |
| status          | `drivers.employment_status` + runtime overlay | combined view                 |
| trip hari ini   | `deliveries` count by driver/day              | derived                       |
| rating          | `drivers.rating`                              | numeric                       |

### 18.11 Pangkalan Screen

| UI Field             | Entity.Table.Column                   | Notes                         |
| -------------------- | ------------------------------------- | ----------------------------- |
| nama pangkalan       | `retailer_pangkalan.name`             | text                          |
| alamat               | `retailer_pangkalan.address`          | text                          |
| kota                 | `retailer_pangkalan.city`             | text                          |
| no HP                | `retailer_pangkalan.phone`            | encrypted at rest recommended |
| NPWP                 | `retailer_pangkalan.npwp`             | sensitive                     |
| target bulanan       | `retailer_targets.target_qty`         | per period                    |
| distribusi bulan ini | `fact_delivery_daily.delivered_qty`   | aggregate                     |
| status pembayaran    | derived from `payments`/`receivables` | enum display                  |
| status               | `retailer_pangkalan.status`           | active/suspended              |

### 18.12 Products Screen

| UI Field     | Entity.Table.Column              | Notes                   |
| ------------ | -------------------------------- | ----------------------- |
| nama produk  | `products.name`                  | text                    |
| ukuran       | `products.size_kg`               | decimal                 |
| kategori     | `products.category`              | enum/string             |
| merek        | `products.brand`                 | text                    |
| harga        | `products.price`                 | decimal                 |
| stok         | `cylinder_inventory.on_hand_qty` | by branch/product       |
| stok minimal | `products.min_stock`             | threshold               |
| status       | derived from stock threshold     | tersedia/terbatas/habis |

### 18.13 Users and Settings Screens

| UI Field            | Entity.Table.Column                   | Notes                   |
| ------------------- | ------------------------------------- | ----------------------- |
| user name           | `users.name`                          | text                    |
| email               | `users.email`                         | unique                  |
| role                | `roles.name`                          | RBAC role               |
| branch              | `branches.name` via `users.branch_id` | scope                   |
| user status         | `users.is_active`                     | boolean                 |
| branch code/name    | `branches.code`, `branches.name`      | settings                |
| branch address/city | `branches.address`, `branches.city`   | settings                |
| penanggung jawab    | `branches.manager_name`               | settings                |
| security policy     | `security_policies.*`                 | session/MFA/IP controls |

### 18.14 OCR Screens (Inbox, Verification, Archive)

| UI Field            | Entity.Table.Column                                              | Notes                  |
| ------------------- | ---------------------------------------------------------------- | ---------------------- |
| filename            | `ocr_inbox.file_name`                                            | uploaded asset         |
| upload date         | `ocr_inbox.upload_at`                                            | timestamp              |
| process status      | `ocr_inbox.process_status`                                       | PROCESSING/READY       |
| progress            | `ocr_inbox.progress_pct`                                         | 0-100                  |
| merchant            | `ocr_extractions.merchant_name`                                  | extracted              |
| date                | `ocr_extractions.txn_date`                                       | extracted              |
| reference           | `ocr_extractions.reference_no`                                   | extracted              |
| currency            | `ocr_extractions.currency`                                       | extracted              |
| category            | `ocr_archive.category`                                           | classified             |
| line items          | `ocr_extraction_items.*`                                         | itemized table         |
| verification status | `ocr_verifications.verification_status`                          | approved/review/failed |
| verified by/at      | `ocr_verifications.verified_by`, `ocr_verifications.verified_at` | auditability           |

### 18.15 Orders Placeholder (Forward Model)

| UI Field (Planned) | Entity.Table.Column         | Notes                                  |
| ------------------ | --------------------------- | -------------------------------------- |
| order number       | `orders.order_no`           | unique                                 |
| retailer           | `orders.pangkalan_id`       | FK                                     |
| order date         | `orders.order_date`         | date                                   |
| requested qty      | `order_items.requested_qty` | per product                            |
| fulfillment status | `orders.status`             | requested/approved/scheduled/fulfilled |

### 18.16 Mandatory Column Standards for All Transactional Tables

- `id` (UUID)
- `tenant_id` (UUID)
- `branch_id` (UUID, nullable only for tenant-global tables)
- `created_at`, `created_by`
- `updated_at`, `updated_by`
- `version` (optimistic locking)
- `is_deleted` (soft-delete where applicable)

### 18.17 Traceability Join Map (Minimum)

`schedule_agreements -> sa_allocations -> distribution_plans -> distribution_plan_items -> deliveries -> invoices -> payments -> payment_verifications -> audit_logs`

This chain is mandatory for regulator-grade traceability from quota issuance to verified cash receipt.

# SiDistrib Database Design (Screen-Driven)

Prepared: 2026-07-04  
Author: GitHub Copilot (GPT-5.3-Codex)

## 1. Objective

Define a production-ready PostgreSQL data model based on current frontend screens in SiDistrib.  
This document converts UI contracts into normalized entities, relationships, and enums suitable for API and analytics.

## 2. Hosting Recommendation

For a new managed PostgreSQL deployment, use PlanetScale Postgres as the primary recommendation (unless you already have a mandated provider).

## 3. Design Principles

- Use UUID primary keys for all business entities.
- Replace text references in UI payloads with foreign keys.
- Enforce status lifecycle with database enums/check constraints.
- Add audit fields to all mutable business tables.
- Separate operational tables from reporting aggregates.

## 4. Core Domains and Entities

## 4.1 Identity and Access

### `branches`

- id
- code
- name
- address
- city
- phone
- manager_name
- is_active
- created_at
- updated_at

### `roles`

- id
- name (admin, manager, finance, driver, staff, viewer)

### `permissions`

- id
- code
- module
- action

### `role_permissions`

- role_id (FK -> roles.id)
- permission_id (FK -> permissions.id)

### `users`

- id
- branch_id (FK -> branches.id)
- role_id (FK -> roles.id)
- name
- email (unique)
- phone
- password_hash
- avatar_url
- is_active
- last_login_at
- created_at
- updated_at

### `user_sessions`

- id
- user_id (FK -> users.id)
- refresh_token_hash
- ip_address
- user_agent
- expires_at
- revoked_at
- created_at

## 4.2 Master Data

### `pangkalan`

- id
- branch_id (FK -> branches.id)
- code
- name
- owner_name
- phone
- address
- city
- npwp
- geo_lat
- geo_lng
- credit_limit
- payment_term_days
- status
- created_at
- updated_at

### `drivers`

- id
- branch_id (FK -> branches.id)
- name
- phone
- license_no
- license_expiry_date
- employment_status
- rating
- notes
- created_at
- updated_at

### `vehicles`

- id
- branch_id (FK -> branches.id)
- plate_no (unique per active vehicle)
- type
- capacity_cylinders
- active_status
- created_at
- updated_at

### `products`

- id
- sku
- name
- category
- size_kg
- brand
- price
- min_stock
- active_status
- created_at
- updated_at

### `branch_product_stock`

- id
- branch_id (FK -> branches.id)
- product_id (FK -> products.id)
- on_hand_qty
- reserved_qty
- damaged_qty
- updated_at

## 4.3 Schedule Agreement and Quota

### `schedule_agreements`

- id
- branch_id (FK -> branches.id)
- nomor_sa (unique)
- spbe_name
- start_date
- end_date
- total_quota
- distributed_quota
- remaining_quota
- status
- document_url
- created_by (FK -> users.id)
- created_at
- updated_at

### `sa_allocations`

- id
- sa_id (FK -> schedule_agreements.id)
- pangkalan_id (FK -> pangkalan.id)
- product_id (FK -> products.id)
- allocated_qty
- consumed_qty
- remaining_qty
- priority_tier
- created_at
- updated_at

### `sa_events`

- id
- sa_id (FK -> schedule_agreements.id)
- event_type
- before_json
- after_json
- actor_user_id (FK -> users.id)
- created_at

## 4.4 Distribution Planning and Execution

### `distribution_plans`

- id
- branch_id (FK -> branches.id)
- plan_date
- status
- total_cylinders
- total_pangkalan
- total_drivers
- confirmed_at
- confirmed_by (FK -> users.id)
- created_by (FK -> users.id)
- created_at
- updated_at

### `distribution_plan_items`

- id
- plan_id (FK -> distribution_plans.id)
- pangkalan_id (FK -> pangkalan.id)
- driver_id (FK -> drivers.id)
- vehicle_id (FK -> vehicles.id)
- product_id (FK -> products.id)
- qty_cylinders
- scheduled_time
- payment_state
- sequence_no
- notes
- created_at
- updated_at

### `deliveries`

- id
- plan_item_id (FK -> distribution_plan_items.id)
- do_number
- qr_code
- depart_at
- arrive_at
- unload_start_at
- unload_end_at
- delivered_qty
- return_empty_qty
- delivery_status
- created_at
- updated_at

### `delivery_events`

- id
- delivery_id (FK -> deliveries.id)
- event_type
- event_at
- geo_lat
- geo_lng
- payload_json

## 4.5 Monitoring and GPS

### `gps_tracks`

- id
- delivery_id (FK -> deliveries.id)
- driver_id (FK -> drivers.id)
- tracked_at
- lat
- lng
- speed_kmh
- heading

### `geofence_rules`

- id
- pangkalan_id (FK -> pangkalan.id)
- radius_meter
- is_active
- created_at
- updated_at

### `geofence_alerts`

- id
- delivery_id (FK -> deliveries.id)
- rule_id (FK -> geofence_rules.id)
- alert_type
- detected_at
- resolved_at

## 4.6 Payments and Receivables

### `invoices`

- id
- pangkalan_id (FK -> pangkalan.id)
- delivery_id (FK -> deliveries.id)
- invoice_number (unique)
- invoice_date
- due_date
- subtotal
- tax_amount
- total_amount
- invoice_status
- pdf_url
- created_at
- updated_at

### `payments`

- id
- pangkalan_id (FK -> pangkalan.id)
- invoice_id (FK -> invoices.id)
- amount
- bank_name
- account_no_masked
- paid_at
- status
- proof_file_url
- reference_no
- created_at
- updated_at

### `payment_verifications`

- id
- payment_id (FK -> payments.id)
- decision
- note
- decided_by (FK -> users.id)
- decided_at

### `ar_aging_snapshots`

- id
- pangkalan_id (FK -> pangkalan.id)
- snapshot_date
- bucket_0_30
- bucket_31_60
- bucket_61_90
- bucket_90_plus

## 4.7 Notifications and Communication

### `notifications`

- id
- user_id (FK -> users.id)
- type
- title
- message
- is_read
- created_at

### `reminder_settings`

- id
- branch_id (FK -> branches.id)
- sa_expiry_enabled
- stock_low_enabled
- payment_pending_enabled
- delivery_delay_enabled
- stock_threshold_pct
- updated_by (FK -> users.id)
- updated_at

### `message_templates`

- id
- channel
- name
- body
- variables_json
- is_active
- created_at
- updated_at

### `message_campaigns`

- id
- channel
- template_id (FK -> message_templates.id)
- recipient_group
- schedule_at
- status
- created_by (FK -> users.id)
- created_at
- updated_at

### `message_deliveries`

- id
- campaign_id (FK -> message_campaigns.id)
- recipient_type
- recipient_id
- destination
- send_status
- provider_message_id
- sent_at
- delivered_at
- read_at
- error_text

## 4.8 OCR and Digital Receipt Archive

### `receipt_inbox`

- id
- branch_id (FK -> branches.id)
- file_name
- file_url
- upload_at
- process_status
- progress_pct
- source_channel

### `receipt_extractions`

- id
- inbox_id (FK -> receipt_inbox.id)
- merchant_name
- txn_date
- reference_no
- currency
- subtotal
- tax_amount
- total_amount
- confidence_score
- extraction_status
- created_at
- updated_at

### `receipt_items`

- id
- extraction_id (FK -> receipt_extractions.id)
- item_name
- qty
- unit_price
- line_total

### `receipt_verifications`

- id
- extraction_id (FK -> receipt_extractions.id)
- verified_by (FK -> users.id)
- verified_at
- verification_status
- correction_json

### `receipt_archive`

- id
- extraction_id (FK -> receipt_extractions.id)
- category
- final_status
- archived_at

## 4.9 Compliance and Files

### `audit_logs`

- id
- table_name
- record_id
- action
- actor_user_id (FK -> users.id)
- before_json
- after_json
- ip_address
- created_at

### `file_assets`

- id
- owner_table
- owner_id
- file_type
- storage_key
- mime_type
- size_bytes
- uploaded_by (FK -> users.id)
- uploaded_at

## 5. Enum Suggestions

### `sa_status`

- DRAFT
- ACTIVE
- LIMIT
- COMPLETED

### `plan_status`

- DRAFT
- CONFIRMED
- COMPLETED

### `payment_status`

- WAITING_VERIFICATION
- VERIFIED
- REJECTED

### `delivery_status`

- QUEUED
- IN_TRANSIT
- UNLOADING
- COMPLETED
- DELAYED
- CANCELLED

### `driver_runtime_status`

- STANDBY
- IN_TRANSIT
- UNLOADING
- FINISHED

### `notification_type`

- REMINDER
- ALERT
- SYSTEM

### `campaign_status`

- DRAFT
- SCHEDULED
- SENDING
- COMPLETED
- FAILED

### `ocr_status`

- PROCESSING
- READY
- REVIEW_NEEDED
- FAILED

## 6. Key Relationships (Cardinality)

- branches 1:N users
- branches 1:N drivers
- branches 1:N pangkalan
- schedule_agreements 1:N sa_allocations
- distribution_plans 1:N distribution_plan_items
- distribution_plan_items 1:1..N deliveries
- deliveries 1:N delivery_events
- deliveries 1:N gps_tracks
- deliveries 1:1..N invoices
- invoices 1:N payments
- payments 1:N payment_verifications
- message_campaigns 1:N message_deliveries
- receipt_inbox 1:1..N receipt_extractions
- receipt_extractions 1:N receipt_items

## 7. Indexing Priorities

Create indexes early for high-volume filters and joins:

- users(email)
- schedule_agreements(nomor_sa, status, start_date, end_date)
- distribution_plans(plan_date, status, branch_id)
- distribution_plan_items(plan_id, pangkalan_id, driver_id)
- deliveries(delivery_status, depart_at)
- payments(status, paid_at, invoice_id)
- invoices(invoice_number, due_date, invoice_status)
- notifications(user_id, is_read, created_at)
- gps_tracks(driver_id, tracked_at)
- audit_logs(table_name, record_id, created_at)

## 8. Minimum Viable Implementation Order

### Phase A

- identity: users, roles, permissions, branches
- master: pangkalan, drivers, vehicles, products

### Phase B

- schedule agreements: schedule_agreements, sa_allocations
- distribution: distribution_plans, distribution_plan_items, deliveries

### Phase C

- finance: invoices, payments, payment_verifications
- notifications: notifications, reminder_settings

### Phase D

- ocr: receipt_inbox, receipt_extractions, receipt_items, receipt_verifications
- observability: audit_logs, file_assets

## 9. Immediate Contract Fixes for Frontend-Backend Alignment

- Replace `driver` and `pangkalan` string fields in planning payloads with `driver_id` and `pangkalan_id`.
- Replace payment references by free text with `invoice_id` + `pangkalan_id`.
- Enforce status transitions server-side (for plan, payment, delivery).
- Add `created_by`, `updated_by`, and timestamps across all mutating endpoints.

## 10. Notes

This design is intentionally screen-first: it mirrors fields already visible in the UI, then normalizes them for robust operational data, reconciliation, and analytics.

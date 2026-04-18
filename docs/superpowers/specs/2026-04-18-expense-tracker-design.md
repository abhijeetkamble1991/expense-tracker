# Expense Tracker Design

**Date:** 2026-04-18
**Status:** Approved for implementation planning
**Scope:** v1 single-user web application

## 1. Overview

This project is a single-user expense tracker built with a FastAPI backend, React frontend, and SQLite database. The core workflow is:

1. Upload a UPI or credit-card PDF statement for a target month.
2. Review and correct extracted transactions.
3. Generate and inspect a monthly report that shows expenses, categories, and detailed transaction data.

The application also supports manual expense entry so the monthly report remains complete even when some expenses are missing from statement imports.

The product is not intended to be a generic bookkeeping system in v1. Its primary value is month-based expense review and reporting from imported PDF statements.

## 2. Product Goals

### Primary goals

- Require authentication before access.
- Import expenses from UPI app statements and credit-card statements in PDF format.
- Allow manual expense entry for any month.
- Support monthly review before a report is trusted.
- Generate month-based reports with totals, category breakdowns, merchant summaries, and a detailed expense list.
- Keep the UI minimalist and focused on the `upload -> review -> report` workflow.

### Non-goals for v1

- Multi-user support
- Bank sync or email ingestion
- OCR-first processing for scanned statements
- Budget planning, forecasting, or yearly analytics
- Mobile app support
- Editable expense categories beyond the fixed `common` and `personal` values

## 3. Core User Workflow

The application centers on one month at a time.

### Upload

The user selects a target month and uploads one or more statements for that month. Supported sources in v1 are:

- UPI app statements
- Credit-card statements

Each upload creates an import batch so the system can track which files contributed which transactions.

### Review

Imported transactions are placed into a review queue. The user can:

- confirm or edit merchant text
- change the fixed expense category (`common` or `personal`)
- accept or override the suggested spend category
- inspect possible duplicate warnings
- review parser warnings on a per-batch basis

Manual expenses are stored in the same ledger as imported transactions and can appear alongside them in review and reporting.

### Report

Once the month has been reviewed, the user opens the monthly report page to inspect:

- total spend for the month
- `common` vs `personal` split
- spend-category breakdown
- merchant summary
- source summary (`manual`, `upi_pdf`, `credit_card_pdf`)
- detailed transaction list for the month

Reports should be auditable, so summary widgets must always be tied back to the underlying transaction list.

## 4. UI and UX Direction

The UI should be minimalist. It should avoid heavy card walls, bright finance-app styling, or dashboards overloaded with widgets.

### UX principles

- Ledger and review actions must remain fast and obvious.
- Monthly context must remain visible without overpowering the screen.
- The reporting workflow must be the main product identity.
- Inline editing is preferred over modal-heavy flows where practical.
- One restrained accent color is preferred over multicolor visual noise.

### Navigation

Recommended top-level sections:

- Reports
- Upload
- Review Queue
- Transactions
- Add Expense
- Categories

### Default landing view

The recommended default home is a report-centric month view rather than a generic transaction ledger.

It should show:

- currently selected month
- monthly totals
- review status or pending-review count
- quick access to upload a statement
- quick access to manual expense entry
- summary charts and merchant/category breakdowns

The full transaction ledger still exists, but it supports the reporting workflow rather than defining the product.

## 5. Architecture

The system is composed of three main parts:

### Frontend

- React application
- Handles login, month selection, upload, review, manual entry, category management, and report views

### Backend

- FastAPI application
- Exposes authentication, import, transaction, category, and reporting APIs

### Database

- SQLite database
- Stores user credentials, spend categories, imports, transactions, merchant rules, and monthly report snapshots

This stack is appropriate for v1 because the app is single-user, local-first, and form/report heavy.

## 6. Data Model

### Users

Single local account for authentication.

Fields:

- id
- username
- password_hash
- created_at
- updated_at

### Spend Categories

Editable categories such as groceries, fuel, travel, subscriptions, rent, and similar user-defined labels.

Fields:

- id
- name
- is_active
- created_at
- updated_at

### Import Batches

Tracks each uploaded PDF and its processing outcome.

Fields:

- id
- month_key
- source_type (`upi_pdf` or `credit_card_pdf`)
- original_filename
- parser_type
- parse_status (`success`, `partial_success`, `parse_failed`)
- extracted_count
- skipped_count
- flagged_count
- warnings_json
- uploaded_at

### Merchant Rules

Used to auto-suggest a spend category based on known merchant patterns.

Fields:

- id
- match_text
- spend_category_id
- created_at
- updated_at

### Transactions

The canonical ledger for both imported and manually entered expenses.

Fields:

- id
- transaction_date
- posted_date
- amount
- description
- merchant
- month_key
- source_type (`manual`, `upi_pdf`, `credit_card_pdf`)
- expense_category (`common`, `personal`)
- spend_category_id
- import_batch_id
- review_status (`needs_review`, `reviewed`, `flagged`)
- duplicate_suspected
- duplicate_reason
- source_reference
- notes
- created_at
- updated_at

### Monthly Reports

Represents report snapshots or regenerated summaries for a month.

Fields:

- id
- month_key
- generated_at
- total_amount
- common_amount
- personal_amount
- unresolved_count
- summary_json

## 7. Category Rules

### Expense Category

Expense category is fixed and constrained to:

- `common`
- `personal`

It is not editable in v1.

### Spend Category

Spend category is user-managed. The user can:

- create categories
- rename categories
- retire categories from future use

Transactions may initially be uncategorized if no suggestion rule matches.

## 8. PDF Import Pipeline

The importer uses a two-stage pipeline.

### Stage 1: Statement parsing

Each parser extracts candidate rows from a known statement family.

Required parser families in v1:

- UPI statement parser
- Credit-card statement parser

The parser output should capture:

- transaction date
- posted date if present
- amount
- description
- merchant guess
- debit or credit direction
- reference number if present

### Stage 2: Normalization

A shared normalization layer converts parser output into the application transaction model.

Responsibilities:

- keep expense-like debit rows by default
- skip obvious non-expense rows where possible
- derive merchant text for review
- assign the selected month
- apply merchant-category suggestion rules
- set review and duplicate suspicion flags

The importer should optimize for text-based PDFs first. OCR is out of scope for v1.

## 9. Review Workflow

Imported rows should never be treated as fully trusted on arrival.

### Review statuses

- `needs_review`: imported but not fully validated
- `reviewed`: accepted for reporting
- `flagged`: suspicious, ambiguous, or parser-related concern

### Review behavior

The user must be able to:

- edit merchant and description text
- change expense category
- change spend category
- inspect and resolve duplicate warnings
- inspect import batch warnings

Manual entries should be created directly in a reviewed state by default, while still allowing the user to edit them later. They must be included in the same month ledger and report calculations as imported transactions.

## 10. Duplicate Handling

Duplicates must be surfaced, not silently removed.

The system should compute a duplicate suspicion score using signals such as:

- same transaction date
- same amount
- similar merchant or description
- matching source reference number when present

Potential duplicates should be shown in the review interface with an explanation. The user decides whether to keep both rows or treat one as unwanted duplication.

This is especially important because the same month may contain:

- multiple statement uploads
- manual entries
- corrected re-imports

## 11. Reporting Rules

Monthly reporting is the main outcome of the application.

### Report inputs

Reports are built from all transactions for a selected month, regardless of whether they came from:

- manual entry
- UPI PDF import
- credit-card PDF import

### Report outputs

Each monthly report should show:

- total spend
- `common` spend total
- `personal` spend total
- spend by spend category
- spend by merchant
- spend by source
- detailed transaction list

### Report generation model

The report should be available as a live computed view from transactions and may also be persisted as a regenerated snapshot for history and quick loading.

Recommended rule:

- do not auto-finalize a report while flagged or unresolved review items remain
- allow the user to regenerate the report after edits

## 12. API Surface

Recommended initial API shape:

- `POST /auth/login`
- `POST /auth/logout`
- `GET /months`
- `POST /imports`
- `GET /imports/{id}`
- `GET /transactions`
- `PATCH /transactions/{id}`
- `POST /transactions/manual`
- `GET /spend-categories`
- `POST /spend-categories`
- `PATCH /spend-categories/{id}`
- `GET /reports/{month}`
- `POST /reports/{month}/regenerate`

The month is the organizing unit. A month may have multiple imports, one shared review queue, and one reporting view.

## 13. Error Handling

Import reliability is critical because statement formats can be inconsistent.

### Import classification errors

If a PDF cannot be confidently classified as UPI or credit-card:

- store the upload attempt
- mark the import batch as `parse_failed`
- present a human-readable warning to the user

### Partial extraction

If only part of the statement is parsed:

- save successfully parsed rows
- mark the batch as `partial_success`
- expose extracted, skipped, and flagged counts
- retain parser warnings for the review UI

### Batch visibility

Every import batch must retain enough metadata for troubleshooting:

- original filename
- upload timestamp
- parser type
- parse status
- row counts
- warnings

The review screen should clearly show when the report may be incomplete due to import warnings.

## 14. Authentication

Authentication in v1 is simple local username/password login stored in the application database.

Requirements:

- password hashes must be stored, never plain text passwords
- unauthenticated users must not reach import, ledger, or report pages
- the app only needs one local user in v1, but the schema should still use a user table

Third-party auth is out of scope.

## 15. Testing Strategy

Trust in monthly reporting depends on reliable parsing and predictable calculations.

### Parser tests

Create parser tests using fixture PDFs or extracted text samples for:

- supported UPI statement formats
- supported credit-card statement formats
- malformed or partial statements

### Normalization tests

Verify:

- debit rows become expenses
- non-expense rows are skipped where intended
- month assignment is correct
- merchant/category suggestion logic behaves predictably

### API tests

Cover:

- login and logout
- imports
- transaction review updates
- manual expense creation
- spend category management
- monthly report generation

### UI tests

Cover the critical user path:

- login
- upload statement
- review extracted expenses
- edit expense and spend categories
- add manual expenses
- generate and inspect monthly report

## 16. Definition of Done for v1

v1 is complete when all of the following are true:

- the user can log in with a local username/password
- the user can upload a UPI or credit-card PDF for a selected month
- extracted expenses appear in a review queue
- the user can edit merchant text, expense category, and spend category
- the user can add manual expenses into a month
- the user can generate and view a monthly report
- the monthly report shows summary totals and a detailed list of expenses
- parser failures and partial imports are visible to the user

## 17. Open Implementation Constraints

The design intentionally leaves implementation details open in these areas so the implementation plan can choose pragmatic specifics:

- exact PDF parsing library selection
- exact authentication mechanism details between token and session implementation
- charting library selection in the React frontend
- whether report snapshots are persisted eagerly or only when regenerated manually

These are implementation decisions, not unresolved product requirements.

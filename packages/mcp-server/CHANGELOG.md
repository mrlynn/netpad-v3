# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-01-15

### Added

This major release expands the MCP server from 22 tools to **75 tools**, adding comprehensive support for applications, workflows, marketplace, conversational forms, and data browsing.

#### Application Management Tools (7 new tools)
- `list_application_templates` - List available application templates (contact-app, support-portal, event-registration, etc.)
- `get_application_template` - Get detailed template information with forms, workflows, and contracts
- `create_application` - Generate code to create a new NetPad application
- `generate_application_contract` - Generate API contracts defining inputs, outputs, and side effects
- `generate_application_release` - Generate release configuration with semantic versioning
- `generate_export_bundle` - Generate export bundle structure for sharing
- `preview_application_config` - Preview application configuration before creation

#### Marketplace & npm Integration Tools (8 new tools)
- `list_marketplace_categories` - List marketplace categories (business, events, feedback, etc.)
- `search_marketplace` - Search marketplace for applications with filters
- `publish_to_marketplace` - Generate code to publish an application to marketplace
- `install_from_marketplace` - Generate code to install from marketplace
- `generate_npm_package` - Generate npm package.json with netpad configuration
- `sync_to_npm` - Generate code to sync application to npm registry
- `import_from_npm` - Generate code to import application from npm
- `validate_npm_package_name` - Validate npm package name format

#### Workflow Automation Tools (10 new tools)
- `list_workflow_node_types` - List 25+ workflow node types across categories
- `list_workflow_templates` - List workflow templates (form-to-email, lead-qualification, etc.)
- `get_workflow_template` - Get detailed workflow template configuration
- `create_workflow` - Generate code to create a workflow
- `add_workflow_node` - Generate code to add nodes to workflow
- `connect_workflow_nodes` - Generate code to connect workflow nodes
- `configure_workflow_trigger` - Generate trigger configuration
- `test_workflow` - Generate workflow test code
- `get_workflow_execution_history` - Generate execution history retrieval code
- `preview_workflow_config` - Preview workflow configuration

#### Conversational & Search Form Tools (11 new tools)
- `list_conversational_templates` - List AI-powered conversational form templates
- `get_conversational_template` - Get template details (it-helpdesk, customer-feedback, etc.)
- `create_conversational_form` - Create conversational forms with topics, personas, and extraction
- `configure_rag_settings` - Configure RAG (Retrieval-Augmented Generation) for forms
- `add_rag_document` - Generate code to upload documents for RAG
- `list_search_operators` - List search operators by field type
- `create_search_form` - Create MongoDB search forms with configurable operators
- `configure_search_operators` - Configure operators for specific fields
- `test_conversational_form` - Generate conversational form test code
- `test_search_form` - Generate search form test code

#### Enhanced Template Tools (5 new tools)
- `list_template_categories` - List 10 template categories
- `list_form_templates` - List 24 pre-built form templates
- `get_form_template` - Get detailed template with all fields and configuration
- `create_form_from_template` - Create form from template with customizations
- `preview_template_config` - Preview template configuration

#### Data Browser & Connection Tools (12 new tools)
- `list_connection_types` - List supported MongoDB connection types
- `generate_connection_config` - Generate connection vault configuration
- `list_query_templates` - List pre-built query templates
- `get_query_template` - Get specific query template
- `generate_data_browser_query` - Generate find/aggregate/distinct/count queries
- `generate_aggregation_pipeline` - Generate complex aggregation pipelines
- `generate_index_recommendations` - Get index suggestions based on query patterns
- `generate_schema_analysis` - Generate schema inference code
- `generate_data_export` - Generate data export code (JSON/CSV/XLSX)
- `generate_connection_test` - Generate connection test code
- `generate_list_databases` - Generate database listing code
- `generate_list_collections` - Generate collection listing code

#### New Resources (9 new resources)
- `netpad://reference/application-templates` - Application templates reference
- `netpad://reference/workflow-nodes` - Workflow node types reference
- `netpad://reference/workflow-templates` - Workflow templates reference
- `netpad://reference/conversational-templates` - Conversational form templates
- `netpad://reference/search-operators` - Search operators by field type
- `netpad://reference/form-templates` - 24 form templates
- `netpad://reference/template-categories` - Template categories
- `netpad://reference/connection-types` - MongoDB connection types
- `netpad://reference/query-templates` - Query templates

#### Form Templates (24 templates)
Added comprehensive form template library across 10 categories:
- **Business**: Contact Form, Lead Capture, Quote Request, Newsletter Signup
- **Events**: Event Registration, RSVP, Volunteer Signup, Webinar Registration
- **Feedback**: Customer Satisfaction, NPS Survey, Product Feedback, General Feedback
- **Support**: Support Ticket, Appointment Booking
- **E-commerce**: Order Form, Return Request
- **Healthcare**: Patient Intake (encrypted), Health Screening
- **HR**: Job Application
- **Finance**: Expense Report
- **Education**: Course Enrollment, Scholarship Application
- **Real Estate**: Property Inquiry, Rental Application

#### Conversational Form Templates (4 templates)
- `it-helpdesk` - IT support ticket collection through conversation
- `customer-feedback` - Customer experience feedback collection
- `lead-qualification` - Sales lead qualification with scoring
- `patient-intake` - Healthcare patient information gathering

#### Workflow Templates (5 templates)
- `form-to-email` - Send email notifications on form submission
- `form-to-database` - Save submissions to MongoDB
- `lead-qualification` - Qualify and route leads based on criteria
- `webhook-to-database` - Process incoming webhooks to database
- `scheduled-report` - Generate and send scheduled reports

### Changed

- Package version bumped from 0.1.0 to 2.0.0
- Description updated to reflect 75 tools
- Added keywords for new features (workflow, applications, marketplace, etc.)

### Technical Details

- 6 new tool modules added:
  - `application-management-tools.ts` - Application lifecycle management
  - `marketplace-tools.ts` - Marketplace and npm integration
  - `workflow-tools.ts` - Workflow automation
  - `conversational-search-tools.ts` - Conversational and search forms
  - `template-tools.ts` - Enhanced form templates
  - `data-browser-tools.ts` - MongoDB data browser
- Total tool count: 75 tools
- Total resources: 16 resources
- Built with TypeScript and tsup
- Uses @modelcontextprotocol/sdk v1.0.0
- Requires Node.js 18+

---

## [0.1.0] - 2025-01-03

### Added

#### Form Building Tools (6 tools)
- `generate_form` - Generate complete form configurations from natural language descriptions
- `generate_field` - Generate individual field configurations with validation
- `generate_conditional_logic` - Create show/hide logic based on field values
- `generate_computed_field` - Create formula-based calculated fields
- `generate_multipage_config` - Generate multi-page wizard configurations
- `validate_form_config` - Validate form configurations for errors

#### Application Building Tools (5 tools)
- `scaffold_nextjs_app` - Generate complete Next.js applications with forms
- `generate_workflow_integration` - Generate workflow integration code (MongoDB, notifications, pipelines)
- `generate_mongodb_query` - Generate MongoDB queries for form data
- `generate_api_route` - Generate Next.js API routes
- `generate_react_code` - Generate React components for forms

#### Reference Tools (5 tools)
- `list_field_types` - List all 28+ supported field types
- `list_operators` - List conditional logic operators
- `list_formula_functions` - List formula functions for computed fields
- `list_validation_options` - List validation rule options
- `list_theme_options` - List theme customization options

#### Helper Tools (6 tools)
- `get_use_case_template` - Pre-built templates (leadCapture, eventRegistration, feedbackSurvey)
- `suggest_form_fields` - Field recommendations based on use case and industry
- `get_best_practices` - Best practices for form design, workflows, security, troubleshooting
- `debug_form_config` - Analyze form configurations for issues
- `explain_error` - Explain error codes with solutions
- `get_documentation` - Access embedded documentation

#### Resources (7 resources)
- `netpad://docs/readme` - Main documentation
- `netpad://docs/architecture` - Architecture guide
- `netpad://docs/quick-start` - Quick start guide
- `netpad://docs/examples` - Code examples
- `netpad://reference/field-types` - Field type reference
- `netpad://reference/operators` - Operator reference
- `netpad://reference/formulas` - Formula function reference

#### Prompts (5 prompts)
- `create-contact-form` - Generate a basic contact form
- `create-registration-form` - Generate a user registration form
- `create-survey-form` - Generate a multi-page survey
- `create-order-form` - Generate an order form with computed totals
- `explain-conditional-logic` - Explain conditional logic usage

### Technical Details
- Built with TypeScript and tsup
- Uses @modelcontextprotocol/sdk v1.0.0
- Requires Node.js 18+
- Supports Claude Desktop, Cursor, and other MCP-compatible clients

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

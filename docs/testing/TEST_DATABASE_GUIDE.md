# Form Builder Test Database Guide

This document describes the test database designed to showcase all features of the Form Builder application.

## Database: `form_builder_test`

## Collections Overview

| Collection | Purpose | Key Features Demonstrated |
|------------|---------|---------------------------|
| `departments` | Lookup reference | Simple reference, searchable dropdown |
| `job_titles` | Cascading lookup | Filtered by department, cascading dropdowns |
| `employees` | Full employee records | All field types, patterns, computed fields |
| `products` | Product catalog | Multi-page forms, variants, e-commerce |
| `orders` | Order management | Line items, computed totals, nested objects |
| `support_tickets` | Support system | Conditional fields, comments, status workflow |
| `projects` | Project management | Team references, milestones, budget tracking |
| `events` | Event definitions | Session management, capacity |
| `event_registrations` | Registration forms | Multi-page, repeater, conditional |
| `surveys` | Survey definitions | Rating scales, matrix questions |

---

## Collection Details

### 1. departments

**Purpose:** Lookup reference collection for dropdown fields

**Schema:**
```javascript
{
  _id: ObjectId,
  code: String,        // "ENG", "MKT", "HR"
  name: String,        // "Engineering"
  budget: Number,      // 5000000
  headCount: Number,   // 150
  location: String,    // "Building A"
  active: Boolean,     // true
  createdAt: Date
}
```

**Form Builder Features:**
- Simple lookup/reference field source
- Searchable dropdown with `displayField: "name"`, `valueField: "code"`
- Filter by `active: true` to exclude inactive departments

---

### 2. job_titles

**Purpose:** Cascading lookup filtered by department

**Schema:**
```javascript
{
  _id: ObjectId,
  departmentCode: String,  // "ENG"
  title: String,           // "Software Engineer"
  level: String,           // "IC", "Manager", "Director"
  salaryMin: Number,
  salaryMax: Number
}
```

**Form Builder Features:**
- **Cascading Dropdown:** `filterField: "departmentCode"`, `filterSourceField: "department"`
- When user selects department, job titles filter automatically
- Demonstrates cross-field dependencies

---

### 3. employees

**Purpose:** Complete employee record demonstrating ALL field types

**Schema:**
```javascript
{
  // Basic Types
  firstName: String,
  lastName: String,
  email: String,              // type: "email"
  phone: String,
  dateOfBirth: Date,          // type: "date"
  hireDate: Date,
  salary: Number,             // type: "number"
  isRemote: Boolean,          // type: "boolean" (switch)
  isFullTime: Boolean,
  employeeId: String,

  // Reference Fields
  departmentCode: String,     // lookup to departments
  jobTitle: String,           // cascading lookup to job_titles
  managerId: ObjectId,        // lookup to other employees

  // Nested Object
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String,
    email: String
  },

  // Tags Pattern
  skills: [String],           // arrayPattern: "tags"

  // Attribute Pattern (Key-Value)
  metadata: [
    { key: String, value: String }
  ],                          // arrayPattern: "key-value"

  // Repeater - Work History
  workHistory: [
    {
      company: String,
      title: String,
      startDate: Date,
      endDate: Date,
      description: String
    }
  ],

  // Repeater - Certifications
  certifications: [
    {
      name: String,
      issuer: String,
      issueDate: Date,
      expirationDate: Date
    }
  ],

  // Conditional Logic Fields
  enrolledInHealthcare: Boolean,
  healthcarePlan: String,      // Show only if enrolledInHealthcare === true
  enrolledIn401k: Boolean,
  contribution401k: Number,    // Show only if enrolledIn401k === true

  // For Computed Fields
  bonus: Number,
  stockOptions: Number,
  // totalCompensation = salary + bonus + stockOptions (computed)
  // yearsOfService = (today - hireDate) in years (computed)

  status: String,
  createdAt: Date,
  updatedAt: Date
}
```

**Form Builder Features:**

| Feature | Fields |
|---------|--------|
| **All Basic Types** | firstName (string), email (email), dateOfBirth (date), salary (number), isRemote (boolean) |
| **Nested Objects** | address, emergencyContact - expand to sub-fields |
| **Tags Pattern** | skills - chip/tag input with suggestions |
| **Attribute Pattern** | metadata - key-value pairs (MongoDB Attribute Pattern) |
| **Repeater Fields** | workHistory, certifications - add/remove items |
| **Lookup Fields** | departmentCode, jobTitle, managerId |
| **Cascading Lookups** | jobTitle filtered by departmentCode |
| **Conditional Logic** | healthcarePlan shows when enrolledInHealthcare=true |
| **Computed Fields** | totalCompensation = salary + bonus + stockOptions |

---

### 4. products

**Purpose:** E-commerce product catalog with multi-page form structure

**Schema:**
```javascript
{
  // Page 1: Basic Info
  name: String,
  sku: String,
  description: String,
  brand: String,
  manufacturer: String,

  // Page 2: Pricing
  basePrice: Number,
  cost: Number,
  currency: String,
  taxable: Boolean,
  taxRate: Number,
  discountPercent: Number,
  // Computed: margin = ((basePrice - cost) / basePrice) * 100
  // Computed: discountedPrice = basePrice * (1 - discountPercent/100)

  // Page 3: Inventory
  inStock: Boolean,
  stockQuantity: Number,
  lowStockThreshold: Number,
  warehouseLocation: String,
  reorderPoint: Number,

  // Tags Pattern
  categories: [String],

  // Attribute Pattern
  specifications: [
    { key: String, value: String }
  ],

  // Repeater - Variants
  variants: [
    {
      color: String,
      size: String,
      sku: String,
      additionalPrice: Number,
      stock: Number
    }
  ],

  // Simple Array
  images: [String],

  // Publishing
  isPublished: Boolean,
  publishedAt: Date,
  isFeatured: Boolean,

  createdAt: Date,
  updatedAt: Date
}
```

**Form Builder Features:**

| Feature | Implementation |
|---------|----------------|
| **Multi-Page Forms** | Page 1: Basic Info, Page 2: Pricing, Page 3: Inventory |
| **Computed Fields** | margin, discountedPrice |
| **Tags Pattern** | categories |
| **Attribute Pattern** | specifications |
| **Repeater** | variants |
| **URL Array** | images |

---

### 5. orders

**Purpose:** E-commerce orders with line items

**Schema:**
```javascript
{
  orderNumber: String,

  // Nested Object - Customer
  customer: {
    firstName: String,
    lastName: String,
    email: String,
    phone: String
  },

  // Nested Objects - Addresses
  shippingAddress: { street, city, state, zipCode, country },
  billingAddress: { street, city, state, zipCode, country },
  sameAsShipping: Boolean,  // Conditional: hide billingAddress if true

  // Repeater - Line Items
  items: [
    {
      productSku: String,     // Lookup to products
      productName: String,
      quantity: Number,
      unitPrice: Number,
      discount: Number
      // lineTotal = (unitPrice * quantity) - discount (computed)
    }
  ],

  // Computed Totals
  subtotal: Number,           // sum of lineTotals
  taxRate: Number,
  taxAmount: Number,          // subtotal * taxRate / 100
  shippingCost: Number,
  total: Number,              // subtotal + taxAmount + shippingCost

  // Payment
  paymentMethod: String,
  paymentStatus: String,
  paidAt: Date,

  // Status Workflow
  status: String,
  statusHistory: [
    { status: String, timestamp: Date, note: String }
  ],

  // Shipping
  shippingMethod: String,
  trackingNumber: String,
  estimatedDelivery: Date,

  // Notes
  customerNotes: String,
  internalNotes: String,

  createdAt: Date,
  updatedAt: Date
}
```

**Form Builder Features:**

| Feature | Implementation |
|---------|----------------|
| **Conditional Fields** | billingAddress hidden when sameAsShipping=true |
| **Repeater with Computed** | Line items with lineTotal calculation |
| **Multiple Computed Fields** | subtotal, taxAmount, total |
| **Lookup in Repeater** | productSku references products |
| **Status Workflow** | statusHistory array tracks changes |

---

### 6. support_tickets

**Purpose:** Customer support with conditional sections

**Schema:**
```javascript
{
  ticketNumber: String,

  // Reporter Info
  reporterName: String,
  reporterEmail: String,
  reporterPhone: String,
  isExistingCustomer: Boolean,
  customerId: String,         // Show only if isExistingCustomer=true

  // Ticket Details
  subject: String,
  description: String,        // Multiline
  category: String,           // Dropdown
  subcategory: String,        // Cascading from category

  // Priority & Urgency
  priority: String,           // low, medium, high, critical
  isUrgent: Boolean,
  urgencyReason: String,      // Show only if isUrgent=true
  expectedResolutionDate: Date, // Show only if isUrgent=true

  // Multi-select Reference
  affectedProducts: [String], // Multiple product SKUs

  // Tags
  tags: [String],

  // Assignment
  assignedTo: String,
  assignedAgent: String,

  // Status
  status: String,
  resolution: String,         // Show only if status=resolved

  // Comments - Repeater
  comments: [
    {
      author: String,
      authorType: String,     // system, agent, customer
      content: String,
      timestamp: Date,
      isInternal: Boolean
    }
  ],

  // Attachments
  attachments: [
    { name: String, url: String, type: String }
  ],

  // SLA
  slaDeadline: Date,
  slaBreached: Boolean,

  createdAt: Date,
  updatedAt: Date,
  firstResponseAt: Date
}
```

**Form Builder Features:**

| Feature | Implementation |
|---------|----------------|
| **Conditional Logic** | customerId, urgencyReason, resolution fields |
| **Cascading Dropdowns** | subcategory based on category |
| **Multi-select Lookup** | affectedProducts |
| **Tags** | tags for categorization |
| **Repeater** | comments activity log |
| **File Upload Pattern** | attachments array |

---

### 7. projects

**Purpose:** Project management with team and milestones

**Schema:**
```javascript
{
  projectCode: String,
  name: String,
  description: String,

  // Client
  clientName: String,
  clientContact: String,

  // Status
  status: String,
  phase: String,
  percentComplete: Number,

  // Team References
  projectManager: String,     // Lookup to employees
  teamMembers: [
    { email: String, role: String }
  ],
  departmentCode: String,     // Lookup to departments

  // Timeline
  startDate: Date,
  targetEndDate: Date,
  actualEndDate: Date,        // Show only if status=completed
  // daysRemaining = targetEndDate - today (computed)

  // Budget
  budgetAmount: Number,
  budgetSpent: Number,
  budgetRemaining: Number,    // Computed: budgetAmount - budgetSpent
  // budgetUtilization = (budgetSpent / budgetAmount) * 100 (computed)

  // Milestones Repeater
  milestones: [
    {
      name: String,
      description: String,
      dueDate: Date,
      completedDate: Date,
      status: String
    }
  ],

  // Risks - Attribute Pattern
  risks: [
    { key: String, value: String }
  ],

  tags: [String],

  documents: [
    { name: String, url: String }
  ],

  createdAt: Date,
  updatedAt: Date
}
```

**Form Builder Features:**

| Feature | Implementation |
|---------|----------------|
| **Lookup Fields** | projectManager, departmentCode |
| **Team Array** | teamMembers with nested object |
| **Computed Fields** | budgetRemaining, budgetUtilization |
| **Repeater** | milestones |
| **Attribute Pattern** | risks |
| **Conditional** | actualEndDate shows when completed |

---

### 8. event_registrations

**Purpose:** Multi-page event registration form

**Schema:**
```javascript
{
  eventId: String,            // Reference to events
  registrationNumber: String,

  // Page 1: Primary Contact
  primaryContact: {
    firstName: String,
    lastName: String,
    email: String,
    phone: String,
    company: String,
    jobTitle: String
  },

  // Page 2: Attendees (Repeater)
  attendees: [
    {
      firstName: String,
      lastName: String,
      email: String,
      ticketType: String,     // Lookup to event.ticketTypes
      hasDietaryRestrictions: Boolean,
      dietaryRestrictions: [String],  // Show only if has=true
      accessibilityNeeds: String
    }
  ],

  // Page 3: Session Selection
  selectedSessions: [String], // Multi-select from event.sessions

  // Page 4: Preferences
  tshirtSizes: [
    { attendeeEmail: String, size: String }
  ],

  // Conditional: Hotel
  hotelBookingRequested: Boolean,
  hotelCheckIn: Date,         // Show only if hotel=true
  hotelCheckOut: Date,
  hotelRoomType: String,

  // Conditional: Parking
  parkingRequired: Boolean,
  parkingDays: [String],      // Show only if parking=true

  // Computed Totals
  numberOfAttendees: Number,
  ticketSubtotal: Number,
  hotelCost: Number,
  parkingCost: Number,
  totalAmount: Number,

  // Payment
  paymentMethod: String,
  paymentStatus: String,
  invoiceNumber: String,

  specialRequests: String,

  status: String,
  confirmationSentAt: Date,

  createdAt: Date,
  updatedAt: Date
}
```

**Form Builder Features:**

| Feature | Implementation |
|---------|----------------|
| **Multi-Page Form** | 4 pages: Contact, Attendees, Sessions, Preferences |
| **Repeater** | attendees with conditional fields |
| **Multi-select** | selectedSessions, dietaryRestrictions |
| **Conditional Sections** | hotel fields, parking fields |
| **Computed** | totalAmount from all costs |
| **Reference** | eventId to events collection |

---

## Recommended Form Configurations

### Employee Onboarding Form

**Collection:** `employees`

**Multi-Page Structure:**
1. **Personal Information**
   - Layout: Section Header "Personal Details"
   - Fields: firstName, lastName, email, phone, dateOfBirth
   - Layout: Divider
   - Fields: address (nested object)

2. **Employment Details**
   - Layout: Section Header "Position Information"
   - Fields: departmentCode (lookup), jobTitle (cascading), managerId (lookup)
   - Fields: hireDate, salary, isRemote, isFullTime

3. **Skills & Background**
   - Layout: Description "Add your professional skills and work history"
   - Fields: skills (tags), workHistory (repeater), certifications (repeater)

4. **Benefits Enrollment**
   - Layout: Section Header "Benefits"
   - Fields: enrolledInHealthcare → healthcarePlan (conditional)
   - Fields: enrolledIn401k → contribution401k (conditional)
   - Layout: Spacer
   - Fields: emergencyContact (nested object)

**Computed Fields:**
- `totalCompensation`: `salary + bonus + stockOptions`
- `yearsOfService`: `YEAR_DIFF(TODAY(), hireDate)`

---

### Product Entry Form

**Collection:** `products`

**Multi-Page Structure:**
1. **Basic Info** - name, sku, description, brand, manufacturer
2. **Pricing** - basePrice, cost, taxable, taxRate, discountPercent (with computed margin)
3. **Inventory** - inStock, stockQuantity, lowStockThreshold, warehouseLocation
4. **Details** - categories (tags), specifications (key-value), variants (repeater)
5. **Publishing** - images, isPublished, isFeatured

---

### Support Ticket Form

**Collection:** `support_tickets`

**Conditional Logic Examples:**
```javascript
// Show customerId when isExistingCustomer is true
{
  action: 'show',
  logicType: 'all',
  conditions: [
    { field: 'isExistingCustomer', operator: 'isTrue' }
  ]
}

// Show urgency fields when isUrgent is true
{
  action: 'show',
  logicType: 'all',
  conditions: [
    { field: 'isUrgent', operator: 'isTrue' }
  ]
}

// Show resolution when status equals 'resolved'
{
  action: 'show',
  logicType: 'all',
  conditions: [
    { field: 'status', operator: 'equals', value: 'resolved' }
  ]
}
```

---

## Running the Seed Script

```bash
# Install dependencies if needed
npm install mongodb

# Run with default localhost connection
npx ts-node scripts/seed-test-database.ts

# Or with custom connection string
MONGODB_URI="mongodb+srv://..." npx ts-node scripts/seed-test-database.ts
```

---

## Feature Coverage Matrix

| Feature | employees | products | orders | support_tickets | event_registrations |
|---------|-----------|----------|--------|-----------------|---------------------|
| String fields | ✓ | ✓ | ✓ | ✓ | ✓ |
| Number fields | ✓ | ✓ | ✓ | ✓ | ✓ |
| Boolean fields | ✓ | ✓ | ✓ | ✓ | ✓ |
| Date fields | ✓ | ✓ | ✓ | ✓ | ✓ |
| Email fields | ✓ | | | ✓ | ✓ |
| Nested objects | ✓ | | ✓ | | ✓ |
| Tags pattern | ✓ | ✓ | | ✓ | |
| Key-value pattern | ✓ | ✓ | | | |
| Repeater fields | ✓ | ✓ | ✓ | ✓ | ✓ |
| Lookup fields | ✓ | | ✓ | ✓ | ✓ |
| Cascading lookups | ✓ | | | ✓ | |
| Multi-select | | | | ✓ | ✓ |
| Computed fields | ✓ | ✓ | ✓ | | ✓ |
| Conditional logic | ✓ | | ✓ | ✓ | ✓ |
| Multi-page forms | | ✓ | | | ✓ |
| Layout fields | Demo | Demo | Demo | Demo | Demo |

---

## Best Practices Demonstrated

1. **MongoDB Attribute Pattern** - Use `metadata` and `specifications` arrays for flexible key-value storage
2. **Extended Reference Pattern** - Store denormalized data in references (employee name in team members)
3. **Computed Fields** - Calculate values like totals, percentages at form level
4. **Cascading Lookups** - Filter dependent dropdowns (job titles by department)
5. **Conditional UI** - Show/hide fields based on user selections
6. **Multi-page Forms** - Break complex forms into logical sections
7. **Repeater Fields** - Allow dynamic arrays with defined schemas
8. **Layout Elements** - Use section headers and descriptions for UX

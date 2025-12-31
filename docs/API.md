# NetPad Public API Documentation

The NetPad API provides programmatic access to your forms and submissions. Use it to integrate NetPad with your applications, automate workflows, or build custom dashboards.

## Base URL

```
https://your-domain.com/api/v1
```

## Authentication

All API requests require authentication using an API key. Include your API key in the `Authorization` header:

```
Authorization: Bearer np_live_your_api_key_here
```

### API Key Types

| Type | Prefix | Description |
|------|--------|-------------|
| Live | `np_live_` | For production use |
| Test | `np_test_` | For development/testing (can submit to unpublished forms) |

### Creating API Keys

1. Navigate to **Settings > API Keys** in the NetPad dashboard
2. Click **Create API Key**
3. Configure the key name, permissions, and expiration
4. Copy the key immediately - it won't be shown again

## Rate Limiting

API requests are rate limited to protect the service:

| Limit | Default |
|-------|---------|
| Per Hour | 1,000 requests |
| Per Day | 10,000 requests |

Rate limit headers are included in all responses:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1704067200
X-Request-Id: req_abc123
```

## Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "requestId": "req_abc123"
}
```

### Paginated Response

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "totalPages": 5,
    "hasMore": true
  },
  "requestId": "req_abc123"
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "FORM_NOT_FOUND",
    "message": "Form not found",
    "details": {}
  },
  "requestId": "req_abc123"
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid API key |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `FORM_NOT_FOUND` | 404 | Form does not exist |
| `SUBMISSION_NOT_FOUND` | 404 | Submission does not exist |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Endpoints

### Health Check

#### Get API Health Status

Check the health status of the API and its dependencies.

```
GET /api/v1/health
```

**Authentication:** Not required

**Example Request:**

```bash
curl -X GET "https://your-domain.com/api/v1/health"
```

**Example Response:**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-20T12:00:00.000Z",
  "version": "1.0.0",
  "services": {
    "api": {
      "status": "up",
      "responseTime": 5
    },
    "database": {
      "status": "up",
      "responseTime": 15
    }
  }
}
```

**Status Values:**

| Status | HTTP Code | Description |
|--------|-----------|-------------|
| `healthy` | 200 | All services operational |
| `degraded` | 200 | Slow response times (>1s database) |
| `unhealthy` | 503 | Database or critical service down |

**Note:** This endpoint is designed for monitoring services like Upptime, Datadog, or custom health checks. It does not require authentication and should not be rate limited.

---

### Forms

#### List Forms

Retrieve all forms in your organization.

```
GET /api/v1/forms
```

**Required Permission:** `forms:read`

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `pageSize` | number | 20 | Items per page (max 100) |
| `status` | string | - | Filter by status: `draft` or `published` |

**Example Request:**

```bash
curl -X GET "https://your-domain.com/api/v1/forms?status=published&page=1&pageSize=10" \
  -H "Authorization: Bearer np_live_your_api_key"
```

**Example Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "form_abc123",
      "slug": "contact-form",
      "name": "Contact Form",
      "description": "Customer contact form",
      "status": "published",
      "responseCount": 42,
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-20T15:30:00.000Z",
      "publishedAt": "2024-01-16T09:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 5,
    "page": 1,
    "pageSize": 10,
    "totalPages": 1,
    "hasMore": false
  },
  "requestId": "req_abc123"
}
```

---

#### Get Form

Retrieve a single form by ID or slug.

```
GET /api/v1/forms/:formId
```

**Required Permission:** `forms:read`

**Example Request:**

```bash
curl -X GET "https://your-domain.com/api/v1/forms/contact-form" \
  -H "Authorization: Bearer np_live_your_api_key"
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "id": "form_abc123",
    "slug": "contact-form",
    "name": "Contact Form",
    "description": "Customer contact form",
    "status": "published",
    "responseCount": 42,
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-20T15:30:00.000Z",
    "publishedAt": "2024-01-16T09:00:00.000Z",
    "fields": [
      {
        "id": "field_1",
        "path": "name",
        "label": "Full Name",
        "type": "text",
        "required": true,
        "placeholder": "Enter your name"
      },
      {
        "id": "field_2",
        "path": "email",
        "label": "Email Address",
        "type": "email",
        "required": true,
        "validation": {
          "pattern": "^[^@]+@[^@]+\\.[^@]+$"
        }
      }
    ],
    "settings": {
      "submitButtonText": "Send Message",
      "successMessage": "Thank you for contacting us!"
    }
  },
  "requestId": "req_abc123"
}
```

---

#### Create Form

Create a new form.

```
POST /api/v1/forms
```

**Required Permission:** `forms:write`

**Request Body:**

```json
{
  "name": "Feedback Form",
  "description": "Collect customer feedback",
  "fields": [
    {
      "path": "rating",
      "label": "Rating",
      "type": "number",
      "required": true,
      "validation": {
        "min": 1,
        "max": 5
      }
    },
    {
      "path": "comments",
      "label": "Comments",
      "type": "textarea",
      "required": false,
      "placeholder": "Tell us more..."
    }
  ]
}
```

**Example Request:**

```bash
curl -X POST "https://your-domain.com/api/v1/forms" \
  -H "Authorization: Bearer np_live_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Feedback Form",
    "description": "Collect customer feedback",
    "fields": [
      {
        "path": "rating",
        "label": "Rating",
        "type": "number",
        "required": true
      }
    ]
  }'
```

---

#### Update Form

Update an existing form.

```
PATCH /api/v1/forms/:formId
```

**Required Permission:** `forms:write`

**Request Body:**

```json
{
  "name": "Updated Form Name",
  "description": "Updated description",
  "status": "published"
}
```

---

#### Delete Form

Delete a form and all its submissions.

```
DELETE /api/v1/forms/:formId
```

**Required Permission:** `forms:delete`

**Example Request:**

```bash
curl -X DELETE "https://your-domain.com/api/v1/forms/form_abc123" \
  -H "Authorization: Bearer np_live_your_api_key"
```

---

### Submissions

#### List Submissions

Retrieve all submissions for a form.

```
GET /api/v1/forms/:formId/submissions
```

**Required Permission:** `submissions:read`

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `pageSize` | number | 20 | Items per page (max 100) |
| `startDate` | ISO date | - | Filter submissions after this date |
| `endDate` | ISO date | - | Filter submissions before this date |

**Example Request:**

```bash
curl -X GET "https://your-domain.com/api/v1/forms/contact-form/submissions?page=1&pageSize=50" \
  -H "Authorization: Bearer np_live_your_api_key"
```

**Example Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "sub_xyz789",
      "formId": "form_abc123",
      "data": {
        "name": "John Doe",
        "email": "john@example.com",
        "message": "Hello!"
      },
      "metadata": {
        "submittedAt": "2024-01-20T14:30:00.000Z",
        "ipAddress": "192.168.1.1",
        "userAgent": "Mozilla/5.0...",
        "referrer": "https://example.com"
      }
    }
  ],
  "pagination": {
    "total": 42,
    "page": 1,
    "pageSize": 50,
    "totalPages": 1,
    "hasMore": false
  },
  "requestId": "req_abc123"
}
```

---

#### Get Submission

Retrieve a single submission.

```
GET /api/v1/forms/:formId/submissions/:submissionId
```

**Required Permission:** `submissions:read`

---

#### Create Submission

Submit data to a form programmatically.

```
POST /api/v1/forms/:formId/submissions
```

**Required Permission:** `submissions:write`

**Request Body:**

```json
{
  "data": {
    "name": "Jane Smith",
    "email": "jane@example.com",
    "message": "I have a question about your product."
  },
  "metadata": {
    "referrer": "https://myapp.com/contact",
    "customFields": {
      "source": "mobile-app",
      "version": "2.1.0"
    }
  }
}
```

**Example Request:**

```bash
curl -X POST "https://your-domain.com/api/v1/forms/contact-form/submissions" \
  -H "Authorization: Bearer np_live_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "name": "Jane Smith",
      "email": "jane@example.com",
      "message": "Hello from the API!"
    }
  }'
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "submissionId": "sub_new123",
    "formId": "form_abc123",
    "submittedAt": "2024-01-20T16:45:00.000Z"
  },
  "requestId": "req_abc123"
}
```

**Note:** The form must be published to accept submissions with a `live` API key. Use a `test` API key to submit to unpublished forms during development.

---

#### Delete Submission

Delete a submission.

```
DELETE /api/v1/forms/:formId/submissions/:submissionId
```

**Required Permission:** `submissions:delete`

---

## Permissions

When creating an API key, you can assign the following permissions:

| Permission | Description |
|------------|-------------|
| `forms:read` | View form definitions and settings |
| `forms:write` | Create and update forms |
| `forms:delete` | Delete forms |
| `submissions:read` | View form submissions |
| `submissions:write` | Create new submissions |
| `submissions:delete` | Delete submissions |
| `analytics:read` | View analytics data |
| `webhooks:manage` | Configure webhooks |

---

## Code Examples

### JavaScript/Node.js

```javascript
const API_KEY = 'np_live_your_api_key';
const BASE_URL = 'https://your-domain.com/api/v1';

// List all forms
async function listForms() {
  const response = await fetch(`${BASE_URL}/forms`, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
    },
  });
  return response.json();
}

// Submit to a form
async function submitForm(formId, data) {
  const response = await fetch(`${BASE_URL}/forms/${formId}/submissions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ data }),
  });
  return response.json();
}

// Usage
const forms = await listForms();
console.log(forms.data);

const result = await submitForm('contact-form', {
  name: 'API User',
  email: 'api@example.com',
});
console.log(result.data.submissionId);
```

### Python

```python
import requests

API_KEY = 'np_live_your_api_key'
BASE_URL = 'https://your-domain.com/api/v1'

headers = {
    'Authorization': f'Bearer {API_KEY}',
    'Content-Type': 'application/json',
}

# List all forms
response = requests.get(f'{BASE_URL}/forms', headers=headers)
forms = response.json()
print(forms['data'])

# Submit to a form
submission_data = {
    'data': {
        'name': 'API User',
        'email': 'api@example.com',
    }
}
response = requests.post(
    f'{BASE_URL}/forms/contact-form/submissions',
    headers=headers,
    json=submission_data,
)
result = response.json()
print(result['data']['submissionId'])
```

### cURL

```bash
# List forms
curl -X GET "https://your-domain.com/api/v1/forms" \
  -H "Authorization: Bearer np_live_your_api_key"

# Get form details
curl -X GET "https://your-domain.com/api/v1/forms/contact-form" \
  -H "Authorization: Bearer np_live_your_api_key"

# Submit to form
curl -X POST "https://your-domain.com/api/v1/forms/contact-form/submissions" \
  -H "Authorization: Bearer np_live_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"data": {"name": "Test", "email": "test@example.com"}}'

# Get submissions with date filter
curl -X GET "https://your-domain.com/api/v1/forms/contact-form/submissions?startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer np_live_your_api_key"
```

---

## API Documentation

### API Playground

Test the NetPad API interactively in your browser:

```
/api-playground
```

The API Playground provides:
- Enter your API key and make live requests
- Select from all available endpoints
- Edit request URLs and JSON bodies
- View response status, headers, and body
- Track request history during your session
- Quick example buttons for common operations

### Interactive Documentation (Swagger UI)

View the full API documentation with a built-in testing interface at:

```
/api/docs
```

This provides:
- Browse all endpoints with descriptions
- Try out API calls directly in the browser
- View request/response schemas
- Test authentication with your API key

### OpenAPI Specification

The complete OpenAPI 3.0 specification is available at:

```
GET /api/v1/openapi.json
```

You can use this specification with:
- **Postman**: Import the URL to auto-generate a complete collection
- **Code Generators**: Generate client SDKs in any language using `openapi-generator`
- **Swagger UI**: Host your own documentation instance
- **API Testing Tools**: Integrate with tools like Insomnia, Thunder Client, etc.

---

## Webhooks (Coming Soon)

Configure webhooks to receive real-time notifications when events occur:

- `form.submission.created` - New submission received
- `form.submission.updated` - Submission modified
- `form.submission.deleted` - Submission deleted
- `form.published` - Form published
- `form.unpublished` - Form unpublished

---

## Support

- **Documentation:** [docs.netpad.io](https://docs.netpad.io)
- **API Status:** [status.netpad.io](https://status.netpad.io)
- **Contact:** support@netpad.io

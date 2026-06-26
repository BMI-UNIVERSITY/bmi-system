/**
 * BMI UMS — OpenAPI 3.0 Specification
 *
 * 100% Open Source | Privacy-First | Self-Hosted
 * This file is the single source-of-truth for the API contract.
 *
 * Served at:
 *   GET /api/openapi.json   — machine-readable JSON spec
 *   GET /api/docs           — Scalar interactive UI (MIT)
 */

export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "BMI University Management System API",
    version: "1.0.0",
    description:
      "REST API for the BMI University Management System.\n\n" +
      "**Stack:** Hono.js · PocketBase · JWT (RS256/HS256) · Zod\n\n" +
      "**Auth:** All endpoints (except `/health` and `/api/v1/certificates/verify`) " +
      "require a Bearer token obtained from `POST /api/v1/auth/login`.",
    contact: { name: "BMI University IT", email: "it@bmiuniversity.org" },
    license: { name: "MIT", url: "https://opensource.org/licenses/MIT" },
  },
  servers: [
    { url: "http://localhost:3001", description: "Local development" },
    { url: "https://api.bmiuniversity.org", description: "Production" },
  ],
  tags: [
    { name: "Auth", description: "Authentication & session management" },
    { name: "Students", description: "Student registry CRUD" },
    { name: "Staff", description: "Staff & faculty profiles" },
    { name: "Courses", description: "Course catalogue & enrolments" },
    { name: "Grades", description: "Grade entry & GPA computation" },
    { name: "Finance", description: "Transaction management" },
    { name: "Certificates", description: "Certificate issuance & QR verification" },
    { name: "Dashboard", description: "Aggregated statistics & trends" },
    { name: "Library", description: "Library catalogue" },
    { name: "Transcripts", description: "Transcript generation & verification" },
    { name: "Study Centers", description: "Study center registry" },
    { name: "Hostels", description: "Hostel & room management" },
    { name: "Medical", description: "Health center visits" },
    { name: "Inventory", description: "Physical inventory" },
    { name: "Visitors", description: "Visitor log" },
    { name: "Attendance", description: "Course attendance records" },
    { name: "GradeAppeals", description: "Grade appeal workflow" },
    { name: "GradingScales", description: "Configurable grading scales" },
    { name: "AI", description: "Local LLM (Ollama) integration" },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JWT access token from `POST /api/v1/auth/login`",
      },
    },
    schemas: {
      ApiResponse: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          data: {},
          error: { type: "string" },
          message: { type: "string" },
          meta: {
            type: "object",
            properties: {
              page: { type: "integer" },
              perPage: { type: "integer" },
              total: { type: "integer" },
            },
          },
        },
        required: ["success"],
      },
      Student: {
        type: "object",
        properties: {
          id: { type: "string" },
          student_code: { type: "string" },
          full_name: { type: "string" },
          first_name: { type: "string" },
          last_name: { type: "string" },
          email: { type: "string", format: "email" },
          phone: { type: "string" },
          gender: { type: "string", enum: ["Male", "Female"] },
          programme: { type: "string" },
          admission_date: { type: "string", format: "date" },
          status: {
            type: "string",
            enum: ["Active", "Inactive", "Graduated", "Suspended", "Applicant"],
          },
          study_center_id: { type: "string" },
        },
        required: ["id", "student_code", "full_name", "email"],
      },
      Transaction: {
        type: "object",
        properties: {
          id: { type: "string" },
          ref: { type: "string" },
          name: { type: "string" },
          desc: { type: "string" },
          amt: { type: "number" },
          status: { type: "string", enum: ["Paid", "Pending", "Failed"] },
          date: { type: "string", format: "date" },
        },
        required: ["ref", "name", "desc", "amt", "status", "date"],
      },
      Certificate: {
        type: "object",
        properties: {
          id: { type: "string" },
          serial_number: { type: "string", example: "BMI-2024-001234" },
          student_name: { type: "string" },
          degree: { type: "string" },
          faculty: { type: "string" },
          issue_date: { type: "string", format: "date" },
          gpa: { type: "number" },
          status: { type: "string", enum: ["ISSUED", "REVOKED", "SUSPENDED"] },
          content_hash: { type: "string" },
        },
        required: ["id", "serial_number", "student_name", "degree", "status"],
      },
      Grade: {
        type: "object",
        properties: {
          id: { type: "string" },
          studentId: { type: "string" },
          studentName: { type: "string" },
          courseCode: { type: "string" },
          courseName: { type: "string" },
          numericGrade: { type: "number", minimum: 0, maximum: 100 },
          letterGrade: { type: "string" },
          gradePoints: { type: "number" },
          academicYear: { type: "string", example: "2024-2025" },
          semester: { type: "string" },
        },
      },
      LoginRequest: {
        type: "object",
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 12 },
          rememberMe: { type: "boolean" },
        },
        required: ["email", "password"],
      },
      LoginResponse: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          data: {
            type: "object",
            properties: {
              token: { type: "string" },
              user: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  email: { type: "string" },
                  name: { type: "string" },
                  role: { type: "string" },
                  isActive: { type: "boolean" },
                },
              },
            },
          },
        },
      },
    },
  },
  security: [{ BearerAuth: [] }],
  paths: {
    // ── Auth ────────────────────────────────────────────────────────────────
    "/api/v1/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login",
        description: "Authenticate with email+password. Returns a short-lived access token and sets a `bmi_refresh_token` HTTP-only cookie.",
        security: [],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/LoginRequest" } } },
        },
        responses: {
          200: { description: "Login successful", content: { "application/json": { schema: { $ref: "#/components/schemas/LoginResponse" } } } },
          401: { description: "Invalid credentials" },
          429: { description: "Rate limited — 10 attempts per 15 minutes" },
        },
      },
    },
    "/api/v1/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Logout",
        description: "Revokes the current access token and clears the refresh cookie.",
        responses: { 200: { description: "Logged out" } },
      },
    },
    "/api/v1/auth/refresh": {
      post: {
        tags: ["Auth"],
        summary: "Refresh access token",
        description: "Uses the `bmi_refresh_token` HTTP-only cookie to issue a new access token.",
        security: [],
        responses: {
          200: { description: "New access token issued" },
          401: { description: "Refresh token missing or invalid" },
        },
      },
    },
    "/api/v1/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get current user",
        responses: { 200: { description: "Current authenticated user" } },
      },
    },
    "/api/v1/auth/forgot-password": {
      post: {
        tags: ["Auth"],
        summary: "Request password reset",
        security: [],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", properties: { email: { type: "string", format: "email" } }, required: ["email"] } } },
        },
        responses: { 200: { description: "Reset email sent (if address exists)" } },
      },
    },
    "/api/v1/auth/change-password": {
      post: {
        tags: ["Auth"],
        summary: "Change password (authenticated)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  currentPassword: { type: "string" },
                  newPassword: { type: "string", minLength: 12, description: "Min 12 chars, 1 uppercase, 1 number, 1 special char" },
                },
                required: ["currentPassword", "newPassword"],
              },
            },
          },
        },
        responses: { 200: { description: "Password changed" }, 400: { description: "Validation error" } },
      },
    },

    // ── Students ────────────────────────────────────────────────────────────
    "/api/v1/students": {
      get: {
        tags: ["Students"],
        summary: "List students (paginated)",
        description: "Returns up to 100 students per page with server-side filtering.",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "perPage", in: "query", schema: { type: "integer", default: 50, maximum: 100 } },
          { name: "search", in: "query", schema: { type: "string" }, description: "Full-text search on name and student code" },
          { name: "status", in: "query", schema: { type: "string", enum: ["Active", "Inactive", "Graduated", "Suspended", "Applicant"] } },
          { name: "study_center_id", in: "query", schema: { type: "string" } },
        ],
        responses: {
          200: {
            description: "Paginated student list",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/ApiResponse" },
                    { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/Student" } } } },
                  ],
                },
              },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
      post: {
        tags: ["Students"],
        summary: "Create student",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Student" } } } },
        responses: { 201: { description: "Student created" }, 400: { description: "Validation error" } },
      },
    },
    "/api/v1/students/{id}": {
      get: {
        tags: ["Students"],
        summary: "Get student by ID",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Student record" }, 404: { description: "Not found" } },
      },
      patch: {
        tags: ["Students"],
        summary: "Update student",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Student" } } } },
        responses: { 200: { description: "Updated" }, 404: { description: "Not found" } },
      },
      delete: {
        tags: ["Students"],
        summary: "Delete student",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Deleted" }, 403: { description: "Insufficient role" }, 404: { description: "Not found" } },
      },
    },

    // ── Finance ─────────────────────────────────────────────────────────────
    "/api/v1/finance/transactions": {
      get: {
        tags: ["Finance"],
        summary: "List transactions (paginated)",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "perPage", in: "query", schema: { type: "integer", default: 20, maximum: 500 } },
          { name: "status", in: "query", schema: { type: "string", enum: ["Paid", "Pending", "Failed"] } },
          { name: "search", in: "query", schema: { type: "string" } },
        ],
        responses: {
          200: {
            description: "Paginated transaction list",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/ApiResponse" },
                    { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/Transaction" } } } },
                  ],
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Finance"],
        summary: "Create transaction",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Transaction" } } } },
        responses: { 201: { description: "Transaction created" } },
      },
    },
    "/api/v1/finance/stats": {
      get: {
        tags: ["Finance"],
        summary: "Financial statistics",
        responses: { 200: { description: "Revenue totals and counts by status" } },
      },
    },

    // ── Certificates ─────────────────────────────────────────────────────────
    "/api/v1/certificates": {
      get: {
        tags: ["Certificates"],
        summary: "List certificates",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer" } },
          { name: "perPage", in: "query", schema: { type: "integer" } },
          { name: "status", in: "query", schema: { type: "string", enum: ["ISSUED", "REVOKED", "SUSPENDED"] } },
        ],
        responses: { 200: { description: "Certificate list" } },
      },
    },
    "/api/v1/certificates/generate": {
      post: {
        tags: ["Certificates"],
        summary: "Generate (issue) a certificate",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  studentId: { type: "string" },
                  degree: { type: "string" },
                  faculty: { type: "string" },
                  department: { type: "string" },
                  gpa: { type: "number" },
                  graduationDate: { type: "string", format: "date" },
                },
                required: ["studentId", "degree", "faculty", "department", "gpa", "graduationDate"],
              },
            },
          },
        },
        responses: { 201: { description: "Certificate issued" }, 400: { description: "Validation error" } },
      },
    },
    "/api/v1/certificates/verify": {
      post: {
        tags: ["Certificates"],
        summary: "Verify a certificate (public)",
        description: "Public endpoint — no auth required. Rate limited to 30 requests per 15 minutes.",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  serial: { type: "string", example: "BMI-2024-001234" },
                  t: { type: "string", description: "HMAC token from QR code" },
                  offline_jwt: { type: "string", description: "Offline verification JWT" },
                  method: { type: "string", enum: ["online", "offline", "qr_scan"] },
                },
                required: ["serial"],
              },
            },
          },
        },
        responses: {
          200: { description: "Verification result (valid=true/false)" },
          429: { description: "Rate limited" },
        },
      },
    },
    "/api/v1/certificates/{id}/qr": {
      get: {
        tags: ["Certificates"],
        summary: "Get QR code for certificate",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          { name: "mode", in: "query", schema: { type: "string", enum: ["online", "offline"], default: "online" } },
        ],
        responses: { 200: { description: "QR code data URL + verification URL" } },
      },
    },
    "/api/v1/certificates/{id}/revoke": {
      patch: {
        tags: ["Certificates"],
        summary: "Revoke a certificate",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Revoked" }, 403: { description: "Admin role required" } },
      },
    },

    // ── Grades ───────────────────────────────────────────────────────────────
    "/api/v1/grades": {
      get: {
        tags: ["Grades"],
        summary: "List grades",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer" } },
          { name: "perPage", in: "query", schema: { type: "integer" } },
          { name: "studentId", in: "query", schema: { type: "string" } },
          { name: "courseCode", in: "query", schema: { type: "string" } },
          { name: "academicYear", in: "query", schema: { type: "string" } },
        ],
        responses: { 200: { description: "Grade list in frontend shape" } },
      },
      post: {
        tags: ["Grades"],
        summary: "Create a grade record",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Grade" } } } },
        responses: { 201: { description: "Grade saved" } },
      },
    },
    "/api/v1/grades/{id}": {
      get: { tags: ["Grades"], summary: "Get grade by ID", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Grade record" } } },
      put: { tags: ["Grades"], summary: "Update grade (full)", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Grade" } } } }, responses: { 200: { description: "Updated" } } },
      patch: { tags: ["Grades"], summary: "Partial grade update", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Grade" } } } }, responses: { 200: { description: "Updated" } } },
      delete: { tags: ["Grades"], summary: "Delete grade", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Deleted" } } },
    },

    // ── Dashboard ────────────────────────────────────────────────────────────
    "/api/v1/dashboard/stats": {
      get: {
        tags: ["Dashboard"],
        summary: "Aggregated dashboard statistics",
        description: "Cached for 30 seconds. Returns counts for students, staff, courses, finance, library.",
        responses: { 200: { description: "Stats object" } },
      },
    },
    "/api/v1/dashboard/revenue-trend": {
      get: {
        tags: ["Dashboard"],
        summary: "Monthly revenue trend",
        description: "Last N months of paid transactions aggregated by month.",
        parameters: [{ name: "months", in: "query", schema: { type: "integer", default: 6, minimum: 1, maximum: 24 } }],
        responses: {
          200: {
            description: "Array of { month, year, revenue }",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          month: { type: "string", example: "Jan" },
                          year: { type: "integer" },
                          revenue: { type: "number" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/dashboard/recent-activity": {
      get: { tags: ["Dashboard"], summary: "Recent system activity feed (last 10 events)", responses: { 200: { description: "Activity array" } } },
    },
    "/api/v1/dashboard/academic-stats": {
      get: { tags: ["Dashboard"], summary: "Grade distribution & campus breakdown", responses: { 200: { description: "Academic stats" } } },
    },

    // ── AI ───────────────────────────────────────────────────────────────────
    "/api/v1/ai/chat": {
      post: {
        tags: ["AI"],
        summary: "Free-form AI chat (local LLM)",
        description: "Powered by Ollama running locally — no data leaves the server.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  prompt: { type: "string", maxLength: 10000 },
                  context: { type: "string", maxLength: 500 },
                },
                required: ["prompt"],
              },
            },
          },
        },
        responses: { 200: { description: "AI response text" }, 503: { description: "Ollama offline" } },
      },
    },
    "/api/v1/ai/health": {
      get: { tags: ["AI"], summary: "Ollama health check", security: [], responses: { 200: { description: "Running & model loaded" }, 503: { description: "Offline or model missing" } } },
    },

    // ── Health ───────────────────────────────────────────────────────────────
    "/health": {
      get: {
        tags: [],
        summary: "API health check",
        description: "Returns 200 OK when PocketBase is reachable.",
        security: [],
        responses: { 200: { description: "Healthy" }, 503: { description: "PocketBase unavailable" } },
      },
    },

    // ── Staff ────────────────────────────────────────────────────────────────────
    "/api/v1/staff": {
      get: { tags: ["Staff"], summary: "List staff (paginated)", parameters: [
        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        { name: "perPage", in: "query", schema: { type: "integer", default: 50, maximum: 200 } },
        { name: "search", in: "query", schema: { type: "string" } },
        { name: "campus_id", in: "query", schema: { type: "string" } },
      ], responses: { 200: { description: "Staff list" }, 401: { description: "Unauthorized" } } },
      post: { tags: ["Staff"], summary: "Create staff member",
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: {
          staff_number: { type: "string" }, first_name: { type: "string" }, last_name: { type: "string" },
          email: { type: "string", format: "email" }, phone: { type: "string" }, role: { type: "string" },
          study_center_id: { type: "string" },
        }, required: ["staff_number", "first_name", "last_name", "role"] } } } },
        responses: { 201: { description: "Staff created" }, 400: { description: "Validation error" } } },
    },
    "/api/v1/staff/{id}": {
      get: { tags: ["Staff"], summary: "Get staff member", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Staff record" }, 404: { description: "Not found" } } },
      patch: { tags: ["Staff"], summary: "Update staff member", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } }, responses: { 200: { description: "Updated" } } },
      delete: { tags: ["Staff"], summary: "Delete staff member (admin only)", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Deleted" }, 403: { description: "Admin role required" } } },
    },

    // ── Courses ───────────────────────────────────────────────────────────────────
    "/api/v1/courses": {
      get: { tags: ["Courses"], summary: "List courses", parameters: [
        { name: "page", in: "query", schema: { type: "integer" } }, { name: "perPage", in: "query", schema: { type: "integer" } },
        { name: "campus_id", in: "query", schema: { type: "string" } }, { name: "search", in: "query", schema: { type: "string" } },
      ], responses: { 200: { description: "Course list" } } },
      post: { tags: ["Courses"], summary: "Create course",
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: {
          code: { type: "string" }, title: { type: "string" }, credit_hours: { type: "integer" }, study_center_id: { type: "string" },
        }, required: ["code", "title"] } } } },
        responses: { 201: { description: "Course created" } } },
    },
    "/api/v1/courses/{id}": {
      get: { tags: ["Courses"], summary: "Get course", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Course" } } },
      patch: { tags: ["Courses"], summary: "Update course", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } }, responses: { 200: { description: "Updated" } } },
      delete: { tags: ["Courses"], summary: "Delete course", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Deleted" }, 403: { description: "Admin only" } } },
    },

    // ── Library ───────────────────────────────────────────────────────────────────
    "/api/v1/library": {
      get: { tags: ["Library"], summary: "List library items", parameters: [
        { name: "page", in: "query", schema: { type: "integer" } }, { name: "perPage", in: "query", schema: { type: "integer" } },
        { name: "category", in: "query", schema: { type: "string" } }, { name: "search", in: "query", schema: { type: "string" } },
      ], responses: { 200: { description: "Library items" } } },
      post: { tags: ["Library"], summary: "Add library item", requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: {
        title: { type: "string" }, author: { type: "string" }, category: { type: "string" }, type: { type: "string" }, status: { type: "string" },
      }, required: ["title", "author", "category", "type", "status"] } } } }, responses: { 201: { description: "Created" } } },
    },
    "/api/v1/library/{id}": {
      patch: { tags: ["Library"], summary: "Update library item", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } }, responses: { 200: { description: "Updated" } } },
      delete: { tags: ["Library"], summary: "Delete library item", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Deleted" } } },
    },

    // ── Transcripts ───────────────────────────────────────────────────────────────
    "/api/v1/transcripts": {
      get: { tags: ["Transcripts"], summary: "List transcripts", parameters: [
        { name: "page", in: "query", schema: { type: "integer" } }, { name: "perPage", in: "query", schema: { type: "integer" } }, { name: "studentId", in: "query", schema: { type: "string" } },
      ], responses: { 200: { description: "Transcript list" } } },
      post: { tags: ["Transcripts"], summary: "Generate transcript", requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { studentId: { type: "string" }, academicYear: { type: "string" } }, required: ["studentId"] } } } }, responses: { 201: { description: "Transcript generated" } } },
    },
    "/api/v1/transcripts/verify": {
      post: { tags: ["Transcripts"], summary: "Verify transcript (public)", security: [], requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { id: { type: "string" }, token: { type: "string" } }, required: ["id"] } } } }, responses: { 200: { description: "Verification result" }, 429: { description: "Rate limited" } } },
    },

    // ── Study Centers ────────────────────────────────────────────────────────────
    "/api/v1/study-centers": {
      get: { tags: ["Study Centers"], summary: "List study centers", responses: { 200: { description: "Study center list" } } },
      post: { tags: ["Study Centers"], summary: "Create study center (admin only)", requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, location: { type: "string" } }, required: ["name"] } } } }, responses: { 201: { description: "Created" }, 403: { description: "Admin only" } } },
    },
    "/api/v1/study-centers/{id}": {
      patch: { tags: ["Study Centers"], summary: "Update study center", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } }, responses: { 200: { description: "Updated" } } },
      delete: { tags: ["Study Centers"], summary: "Delete study center (admin only)", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Deleted" }, 409: { description: "Has associated students/staff" } } },
    },

    // ── Hostels ───────────────────────────────────────────────────────────────────
    "/api/v1/hostels": {
      get: { tags: ["Hostels"], summary: "List hostels", responses: { 200: { description: "Hostel list with occupancy" } } },
      post: { tags: ["Hostels"], summary: "Create hostel", requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, type: { type: "string", enum: ["Male", "Female"] }, capacity: { type: "integer" }, location: { type: "string" } }, required: ["name", "type", "capacity", "location"] } } } }, responses: { 201: { description: "Created" } } },
    },
    "/api/v1/hostels/assign": {
      post: { tags: ["Hostels"], summary: "Assign student to room", requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { studentId: { type: "string" }, hostelId: { type: "string" }, roomNumber: { type: "string" } }, required: ["studentId", "hostelId", "roomNumber"] } } } }, responses: { 201: { description: "Room assigned" } } },
    },

    // ── Medical ───────────────────────────────────────────────────────────────────
    "/api/v1/medical": {
      get: { tags: ["Medical"], summary: "List medical visits", parameters: [{ name: "page", in: "query", schema: { type: "integer" } }, { name: "perPage", in: "query", schema: { type: "integer" } }], responses: { 200: { description: "Visit list" } } },
      post: { tags: ["Medical"], summary: "Record medical visit", requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { studentId: { type: "string" }, condition: { type: "string" }, date: { type: "string" }, status: { type: "string", enum: ["Normal", "Urgent", "Follow-up"] } }, required: ["studentId", "condition", "date", "status"] } } } }, responses: { 201: { description: "Visit recorded" } } },
    },

    // ── Inventory ─────────────────────────────────────────────────────────────────
    "/api/v1/inventory": {
      get: { tags: ["Inventory"], summary: "List inventory items", responses: { 200: { description: "Inventory list" } } },
      post: { tags: ["Inventory"], summary: "Add inventory item", requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, category: { type: "string" }, quantity: { type: "integer" }, location: { type: "string" }, condition: { type: "string", enum: ["New", "Good", "Fair", "Poor"] } }, required: ["name", "category", "quantity", "location", "condition"] } } } }, responses: { 201: { description: "Created" } } },
    },

    // ── Visitors ──────────────────────────────────────────────────────────────────
    "/api/v1/visitors": {
      get: { tags: ["Visitors"], summary: "List visitors (today)", responses: { 200: { description: "Visitor log" } } },
      post: { tags: ["Visitors"], summary: "Check in visitor", requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, purpose: { type: "string" }, host: { type: "string" } }, required: ["name", "purpose", "host"] } } } }, responses: { 201: { description: "Checked in" } } },
    },
    "/api/v1/visitors/{id}/checkout": {
      patch: { tags: ["Visitors"], summary: "Check out visitor", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Checked out" } } },
    },

    // ── Attendance ────────────────────────────────────────────────────────────────
    "/api/v1/attendance": {
      get: { tags: ["Attendance"], summary: "List attendance records", parameters: [{ name: "courseId", in: "query", schema: { type: "string" } }, { name: "date", in: "query", schema: { type: "string", format: "date" } }], responses: { 200: { description: "Attendance records" } } },
      post: { tags: ["Attendance"], summary: "Create attendance record", requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { courseId: { type: "string" }, date: { type: "string" }, records: { type: "object", description: "Map of studentId \u2192 present/absent" } }, required: ["courseId", "date", "records"] } } } }, responses: { 201: { description: "Recorded" } } },
    },

    // ── Grade Appeals ─────────────────────────────────────────────────────────────
    "/api/v1/grade-appeals": {
      get: { tags: ["GradeAppeals"], summary: "List grade appeals", parameters: [{ name: "status", in: "query", schema: { type: "string", enum: ["Pending", "Under Review", "Approved", "Denied", "Withdrawn"] } }], responses: { 200: { description: "Appeal list" } } },
      post: { tags: ["GradeAppeals"], summary: "Submit grade appeal", requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { student_id: { type: "string" }, enrollment_id: { type: "string" }, appeal_reason: { type: "string" } }, required: ["student_id", "enrollment_id", "appeal_reason"] } } } }, responses: { 201: { description: "Appeal submitted" } } },
    },
    "/api/v1/grade-appeals/{id}": {
      patch: { tags: ["GradeAppeals"], summary: "Update appeal status (admin/registrar/faculty)", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { status: { type: "string" }, instructor_response: { type: "string" } } } } } }, responses: { 200: { description: "Updated" } } },
    },

    // ── Grading Scales ────────────────────────────────────────────────────────────
    "/api/v1/grading-scales": {
      get: { tags: ["GradingScales"], summary: "List grading scales", responses: { 200: { description: "Grading scale list" } } },
      post: { tags: ["GradingScales"], summary: "Create grading scale", requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, description: { type: "string" }, scale_data: { type: "object" }, is_default: { type: "boolean" } }, required: ["name", "scale_data"] } } } }, responses: { 201: { description: "Created" } } },
    },
  },
} as const;







import { describe, it, expect, vi } from "vitest";
import gradeRouter from "./grades.js";

// Mock auth so we can exercise grading handlers without real JWTs.
vi.mock("../middleware/auth.js", () => ({
  authMiddleware: async (c: any, next: any) => {
    c.set("user", { sub: "u1", email: "admin@example.com", role: "admin" });
    await next();
  },
  requireRole:
    (..._roles: string[]) =>
    async (_c: any, next: any) =>
      next(),
  // getUser reads the same payload set by authMiddleware via the Hono context
  getUser: (c: any) =>
    c.get("user") as { sub: string; email: string; role: string } | undefined,
}));

vi.mock("../utils/logger.js", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

const getPocketBaseMock = vi.fn();
vi.mock("../services/pocketbase.js", () => ({
  getPocketBase: () => getPocketBaseMock(),
}));

describe("Grades contract", () => {
  it("GET /api/v1/grades returns frontend-shaped items", async () => {
    const expandedBefore = {
      id: "g1",
      percentage: 88,
      grade_letter: "B",
      gpa: 3.0,
      created: "2026-01-01T00:00:00.000Z",
      updated: "2026-01-02T00:00:00.000Z",
      expand: {
        enrollment_id: {
          academic_year: "2024-2025",
          semester: "Fall",
          expand: {
            student_number: {
              id: "s1",
              student_number: "BMI-2024-0001",
              first_name: "John",
              last_name: "Doe",
            },
            course_code: {
              id: "c1",
              course_code: "CS101",
              title: "Intro to CS",
              credits: 3,
            },
          },
        },
      },
    };

    getPocketBaseMock.mockReturnValue({
      collection: () => ({
        getList: vi.fn().mockResolvedValue({
          items: [expandedBefore],
          page: 1,
          perPage: 50,
          totalItems: 1,
        }),
        getOne: vi.fn().mockResolvedValue(expandedBefore),
        update: vi.fn(),
      }),
    });

    const req = new Request("http://localhost/", { method: "GET" });
    const res = await gradeRouter.fetch(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.items[0].numericGrade).toBe(88);
    expect(json.data.items[0].gradePoints).toBe(3.0);
    expect(json.data.items[0].courseCode).toBe("CS101");
    expect(json.data.items[0].credits).toBe(3);
    expect(Array.isArray(json.data.items[0].components)).toBe(true);
  });

  it("GET /api/v1/grades/:id returns frontend-shaped grade", async () => {
    const expanded = {
      id: "g1",
      percentage: 88,
      grade_letter: "B",
      gpa: 3.0,
      created: "2026-01-01T00:00:00.000Z",
      updated: "2026-01-02T00:00:00.000Z",
      expand: {
        enrollment_id: {
          academic_year: "2024-2025",
          semester: "Fall",
          expand: {
            student_number: {
              id: "s1",
              student_number: "BMI-2024-0001",
              first_name: "John",
              last_name: "Doe",
            },
            course_code: {
              id: "c1",
              course_code: "CS101",
              title: "Intro to CS",
              credits: 3,
            },
          },
        },
      },
    };

    getPocketBaseMock.mockReturnValue({
      collection: () => ({
        getList: vi.fn(),
        getOne: vi.fn().mockResolvedValue(expanded),
        update: vi.fn(),
      }),
    });

    const req = new Request("http://localhost/g1", { method: "GET" });
    const res = await gradeRouter.fetch(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.id).toBe("g1");
    expect(json.data.numericGrade).toBe(88);
    expect(json.data.courseCode).toBe("CS101");
    expect(json.data.gradePoints).toBe(3.0);
  });

  it("PUT /api/v1/grades/:id updates grade derived from component scores", async () => {
    const expandedAfter = {
      id: "g1",
      percentage: 90,
      grade_letter: "A",
      gpa: 4.0,
      created: "2026-01-01T00:00:00.000Z",
      updated: "2026-01-02T00:00:00.000Z",
      expand: {
        enrollment_id: {
          academic_year: "2024-2025",
          semester: "Fall",
          expand: {
            student_number: {
              id: "s1",
              student_number: "BMI-2024-0001",
              first_name: "John",
              last_name: "Doe",
            },
            course_code: {
              id: "c1",
              course_code: "CS101",
              title: "Intro to CS",
              credits: 3,
            },
          },
        },
      },
    };

    const updateSpy = vi.fn().mockResolvedValue(expandedAfter);

    getPocketBaseMock.mockReturnValue({
      collection: () => ({
        getList: vi.fn(),
        getOne: vi.fn().mockResolvedValue(expandedAfter),
        update: updateSpy,
      }),
    });

    const req = new Request("http://localhost/g1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        components: [
          {
            componentId: "m1",
            componentType: "Midterm",
            score: 90,
            maxScore: 100,
            weight: 100,
            gradedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
        status: "Provisional",
        gradingScaleType: "US_4_0",
      }),
    });

    const res = await gradeRouter.fetch(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.numericGrade).toBe(90);
    expect(json.data.letterGrade).toBe("A");
    expect(updateSpy).toHaveBeenCalledWith("g1", expect.objectContaining({
      total_score: 90,
      letter_grade: "A",
      grade_points: 4.0,
      status: "Provisional",
    }));
  });
});







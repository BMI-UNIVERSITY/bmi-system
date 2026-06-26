// BMI UMS - Dashboard Routes (Aggregated Statistics)
import { Hono } from "hono";
import { getPocketBase } from "../services/pocketbase.js";
import { authMiddleware } from "../middleware/auth.js";
import { logger } from "../utils/logger.js";
import { cache } from "../services/cacheService.js";
import { pbRecord, errorMessage } from "../utils/helpers.js";
import type { ApiResponse } from "../types/index.js";
import type { Transaction, Student, Certificate } from "../types/index.js";

const dashboardRouter = new Hono();

// Apply auth middleware
dashboardRouter.use("*", authMiddleware);

/**
 * GET /api/v1/dashboard/stats
 * Get comprehensive dashboard statistics — uses paginated counts, not full table scans
 */
dashboardRouter.get("/stats", async (c) => {
  try {
    const stats = await cache.getOrSet(
      "dashboard:stats",
      async () => {
        const pb = getPocketBase();

        // Use getList with perPage=1 to get totalItems counts — no full table scan
        const [
          studentsAll,
          studentsActive,
          studentsApplicant,
          studentsGraduated,
          studentsTheology,
          studentsICT,
          studentsBusiness,
          studentsEducation,
          staffAll,
          staffAcademic,
          staffAdmin,
          staffMgmt,
          coursesAll,
          coursesPublished,
          coursesUG,
          coursesPG,
          coursesDip,
          coursesCert,
          certsAll,
          certsIssued,
          certsRevoked,
          txAll,
          txPaid,
          txPending,
          libAll,
          libDigital,
          libAvailable,
          libBorrowed,
        ] = await Promise.all([
          pb.collection("students").getList(1, 1),
          pb
            .collection("students")
            .getList(1, 1, { filter: 'status = "Active"' }),
          pb
            .collection("students")
            .getList(1, 1, { filter: 'status = "Applicant"' }),
          pb
            .collection("students")
            .getList(1, 1, { filter: 'status = "Graduated"' }),
          pb
            .collection("students")
            .getList(1, 1, { filter: 'faculty = "Theology"' }),
          pb
            .collection("students")
            .getList(1, 1, { filter: 'faculty = "ICT"' }),
          pb
            .collection("students")
            .getList(1, 1, { filter: 'faculty = "Business"' }),
          pb
            .collection("students")
            .getList(1, 1, { filter: 'faculty = "Education"' }),
          pb.collection("staff").getList(1, 1),
          pb
            .collection("staff")
            .getList(1, 1, { filter: 'category = "Academic"' }),
          pb
            .collection("staff")
            .getList(1, 1, { filter: 'category = "Administrative"' }),
          pb
            .collection("staff")
            .getList(1, 1, { filter: 'category = "Management"' }),
          pb.collection("courses").getList(1, 1),
          pb
            .collection("courses")
            .getList(1, 1, { filter: 'status = "Published"' }),
          pb
            .collection("courses")
            .getList(1, 1, { filter: 'level = "Undergraduate"' }),
          pb
            .collection("courses")
            .getList(1, 1, { filter: 'level = "Postgraduate"' }),
          pb
            .collection("courses")
            .getList(1, 1, { filter: 'level = "Diploma"' }),
          pb
            .collection("courses")
            .getList(1, 1, { filter: 'level = "Certificate"' }),
          pb.collection("certificates").getList(1, 1),
          pb
            .collection("certificates")
            .getList(1, 1, { filter: 'status = "ISSUED"' }),
          pb
            .collection("certificates")
            .getList(1, 1, { filter: 'status = "REVOKED"' }),
          pb.collection("transactions").getList(1, 1),
          pb
            .collection("transactions")
            .getList(1, 1, { filter: 'status = "Paid"' }),
          pb
            .collection("transactions")
            .getList(1, 1, { filter: 'status = "Pending"' }),
          pb.collection("library_items").getList(1, 1),
          pb
            .collection("library_items")
            .getList(1, 1, { filter: 'status = "Digital"' }),
          pb
            .collection("library_items")
            .getList(1, 1, { filter: 'status = "Available"' }),
          pb
            .collection("library_items")
            .getList(1, 1, { filter: 'status = "Borrowed"' }),
        ]);

        // Revenue: fetch only paid transactions (limited to last 1000 for performance)
        const paidTxRecords = await pb
          .collection("transactions")
          .getList(1, 1000, {
            filter: 'status = "Paid"',
            fields: "amt",
          });
        const totalRevenue = paidTxRecords.items.reduce(
          (sum: number, t) => sum + (pbRecord<Transaction>(t).amt || 0),
          0,
        );

        return {
          students: {
            total: studentsAll.totalItems,
            active: studentsActive.totalItems,
            applicants: studentsApplicant.totalItems,
            graduated: studentsGraduated.totalItems,
            byFaculty: {
              Theology: studentsTheology.totalItems,
              ICT: studentsICT.totalItems,
              Business: studentsBusiness.totalItems,
              Education: studentsEducation.totalItems,
            },
          },
          staff: {
            total: staffAll.totalItems,
            byCategory: {
              Academic: staffAcademic.totalItems,
              Administrative: staffAdmin.totalItems,
              Management: staffMgmt.totalItems,
            },
          },
          courses: {
            total: coursesAll.totalItems,
            published: coursesPublished.totalItems,
            byLevel: {
              Undergraduate: coursesUG.totalItems,
              Postgraduate: coursesPG.totalItems,
              Diploma: coursesDip.totalItems,
              Certificate: coursesCert.totalItems,
            },
          },
          certificates: {
            total: certsAll.totalItems,
            issued: certsIssued.totalItems,
            revoked: certsRevoked.totalItems,
          },
          finance: {
            totalRevenue,
            transactions: txAll.totalItems,
            paid: txPaid.totalItems,
            pending: txPending.totalItems,
          },
          library: {
            total: libAll.totalItems,
            digital: libDigital.totalItems,
            available: libAvailable.totalItems,
            borrowed: libBorrowed.totalItems,
          },
        };
      },
      30_000,
    ); // Cache for 30 seconds

    return c.json<ApiResponse<typeof stats>>({ success: true, data: stats });
  } catch (error) {
    logger.error(`Get dashboard stats error: ${errorMessage(error)}`);
    return c.json<ApiResponse<never>>(
      { success: false, error: "Failed to fetch dashboard statistics" },
      500,
    );
  }
});

/**
 * GET /api/v1/dashboard/recent-activity
 * Get recent system activity — paginated, no full table scans
 */
dashboardRouter.get("/recent-activity", async (c) => {
  try {
    const pb = getPocketBase();

    const [recentStudents, recentTransactions, recentCertificates] =
      await Promise.all([
        pb.collection("students").getList(1, 5, {
          sort: "-created",
          fields: "id,firstName,lastName,created",
        }),
        pb.collection("transactions").getList(1, 5, {
          sort: "-date",
          fields: "id,name,desc,date,amt,status",
        }),
        pb.collection("certificates").getList(1, 5, {
          sort: "-issue_date",
          fields: "id,student_name,degree,issue_date",
        }),
      ]);

    const activity = [
      ...recentStudents.items.map((r) => {
        const s = pbRecord<Student>(r);
        return {
          type: "student",
          action: "New student registered",
          description: `${s.first_name} ${s.last_name}`,
          timestamp: s.created,
          id: s.id,
        };
      }),
      ...recentTransactions.items.map((r) => {
        const t = pbRecord<Transaction>(r);
        return {
          type: "finance",
          action: "Payment recorded",
          description: `${t.name} - ${t.desc}`,
          timestamp: t.date,
          id: t.id,
          amount: t.amt,
          status: t.status,
        };
      }),
      ...recentCertificates.items.map((r) => {
        const cert = pbRecord<Certificate>(r);
        return {
          type: "certificate",
          action: "Certificate issued",
          description: `${cert.student_name} - ${cert.degree}`,
          timestamp: cert.issue_date,
          id: cert.id,
        };
      }),
    ]
      .sort(
        (a, b) =>
          new Date(b.timestamp || "").getTime() - new Date(a.timestamp || "").getTime(),
      )
      .slice(0, 10);

    return c.json<ApiResponse<typeof activity>>({
      success: true,
      data: activity,
    });
  } catch (error) {
    logger.error(`Get recent activity error: ${errorMessage(error)}`);
    return c.json<ApiResponse<never>>(
      { success: false, error: "Failed to fetch recent activity" },
      500,
    );
  }
});

/**
 * GET /api/v1/dashboard/revenue-trend
 * Last 12 months of paid transaction totals, grouped by month.
 * Powers the financial performance chart on the Dashboard.
 */
dashboardRouter.get("/revenue-trend", async (c) => {
  try {
    const months = parseInt(c.req.query("months") ?? "6", 10);
    const limit = Math.min(Math.max(months, 1), 24);

    const trend = await cache.getOrSet(
      `dashboard:revenue-trend:${limit}`,
      async () => {
        const pb = getPocketBase();
        const now = new Date();
        const MONTH_LABELS = [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ];

        const results = await Promise.all(
          Array.from({ length: limit }, async (_, i) => {
            const d = new Date(
              now.getFullYear(),
              now.getMonth() - (limit - 1 - i),
              1,
            );
            const nextD = new Date(d.getFullYear(), d.getMonth() + 1, 1);
            const from = d.toISOString().split("T")[0];
            const to = nextD.toISOString().split("T")[0];

            // PocketBase date filter on `date` field (stored as YYYY-MM-DD)
            const paid = await pb.collection("transactions").getFullList({
              filter: `status = "Paid" && date >= "${from}" && date < "${to}"`,
              fields: "amt",
            });

            const revenue = paid.reduce(
              (sum, t) => sum + (pbRecord<Transaction>(t).amt ?? 0),
              0,
            );
            return {
              month: MONTH_LABELS[d.getMonth()],
              year: d.getFullYear(),
              revenue: Math.round(revenue),
            };
          }),
        );

        return results;
      },
      60_000,
    ); // Cache 1 minute

    return c.json<ApiResponse<typeof trend>>({ success: true, data: trend });
  } catch (error) {
    logger.error(`Revenue trend error: ${errorMessage(error)}`);
    return c.json<ApiResponse<never>>(
      { success: false, error: "Failed to fetch revenue trend" },
      500,
    );
  }
});

/**
 * GET /api/v1/dashboard/system-health
 */
dashboardRouter.get("/system-health", async (c) => {
  try {
    const health = {
      database: true,
      api: true,
      ai: false,
      uptime: Math.floor(process.uptime()),
      uptimeHuman: formatUptime(process.uptime()),
    };
    return c.json<ApiResponse<typeof health>>({ success: true, data: health });
  } catch (error) {
    logger.error(`Get system health error: ${errorMessage(error)}`);
    return c.json<ApiResponse<never>>(
      { success: false, error: "Failed to fetch system health" },
      500,
    );
  }
});

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

/**
 * GET /api/v1/dashboard/academic-stats
 * Grade distribution and campus breakdown from grades.
 */
dashboardRouter.get("/academic-stats", async (c) => {
  try {
    const pb = getPocketBase();

    const campusList = await pb.collection("study_centers").getFullList({ fields: "id,name" });

    let gradesList: any[] = [];
    let arList: any[] = [];

    try {
      gradesList = await pb.collection("grades").getFullList({ fields: "grade_letter,percentage,total_score" });
    } catch (err) {
      logger.warn(`Failed to fetch grades for stats: ${errorMessage(err)}`);
    }

    try {
      arList = await pb.collection("academic_records").getFullList({ fields: "grade,total_score" });
    } catch (err) {
      logger.warn(`Failed to fetch academic_records for stats: ${errorMessage(err)}`);
    }

    interface UnifiedRecord {
      score: number;
      grade: string;
    }
    
    const unified: UnifiedRecord[] = [];
    
    for (const r of gradesList) {
      const score = r.percentage ?? r.total_score ?? 0;
      const grade = r.grade_letter ?? r.letter_grade ?? "F";
      unified.push({ score, grade });
    }
    
    for (const r of arList) {
      const score = r.total_score ?? 0;
      const grade = r.grade ?? "F";
      unified.push({ score, grade });
    }

    const totalCount = unified.length;
    let passingCount = 0;
    let failingCount = 0;
    let scoreSum = 0;
    const gradeDist: Record<string, number> = {};
    
    for (const rec of unified) {
      if (rec.score >= 50) {
        passingCount++;
      } else {
        failingCount++;
      }
      scoreSum += rec.score;
      const g = rec.grade || "F";
      gradeDist[g] = (gradeDist[g] || 0) + 1;
    }
    
    const avgScore = totalCount > 0
      ? parseFloat((scoreSum / totalCount).toFixed(1))
      : 0;

    // Per-campus student counts
    const campusStats: Array<{ name: string; students: number }> = [];
    interface CampusRecord {
      id: string;
      name: string;
    }
    for (const campus of campusList) {
      const rec = pbRecord<CampusRecord>(campus);
      const count = await pb.collection("students").getList(1, 1, {
        filter: `study_center_id = "${rec.id}"`,
      });
      campusStats.push({ name: rec.name, students: count.totalItems });
    }

    return c.json({
      success: true,
      data: {
        totalRecords: totalCount,
        passing: passingCount,
        failing: failingCount,
        passRate: totalCount > 0 ? parseFloat(((passingCount / totalCount) * 100).toFixed(1)) : 0,
        averageScore: avgScore,
        gradeDistribution: gradeDist,
        campusBreakdown: campusStats,
      },
    });
  } catch (error) {
    logger.error(`Academic stats error: ${errorMessage(error)}`);
    return c.json(
      { success: false, error: "Failed to fetch academic stats" },
      500,
    );
  }
});

export default dashboardRouter;







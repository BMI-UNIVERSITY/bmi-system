/**
 * BMI UMS - Query Optimizer
 * Implements eager loading, caching, and query optimization patterns
 */

import { withPocketBase } from './pocketbasePool.js';
import { logger } from '../utils/logger.js';
import { normalizeText } from '../utils/dataNormalizer.js';

/**
 * In-memory cache for reference data
 * Reference data changes infrequently, so caching dramatically improves performance
 */
class QueryCache {
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  
  set(key: string, data: any, ttl: number = 300000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }
  
  get(key: string): any | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  invalidate(key: string): void {
    this.cache.delete(key);
  }
  
  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

const queryCache = new QueryCache();

/**
 * Query options for optimization
 */
export interface QueryOptions {
  expand?: string | string[];
  filter?: string;
  sort?: string;
  page?: number;
  perPage?: number;
  cache?: boolean;
  cacheTTL?: number;
}

/**
 * Optimized query builder
 */
export class OptimizedQuery {
  private collection: string;
  private options: QueryOptions = {};
  
  constructor(collection: string) {
    this.collection = collection;
  }
  
  /**
   * Add eager loading (expand relations)
   */
  expand(relations: string | string[]): this {
    this.options.expand = Array.isArray(relations) ? relations.join(',') : relations;
    return this;
  }
  
  /**
   * Add filter
   */
  filter(filter: string): this {
    this.options.filter = filter;
    return this;
  }
  
  /**
   * Add sorting
   */
  sort(sort: string): this {
    this.options.sort = sort;
    return this;
  }
  
  /**
   * Add pagination
   */
  paginate(page: number, perPage: number = 50): this {
    this.options.page = page;
    this.options.perPage = perPage;
    return this;
  }
  
  /**
   * Enable caching
   */
  cached(ttl: number = 300000): this {
    this.options.cache = true;
    this.options.cacheTTL = ttl;
    return this;
  }
  
  /**
   * Execute the query
   */
  async execute(): Promise<any> {
    const cacheKey = this.getCacheKey();
    
    // Check cache if enabled
    if (this.options.cache) {
      const cached = queryCache.get(cacheKey);
      if (cached) {
        logger.debug(`Cache hit: ${cacheKey}`);
        return cached;
      }
    }
    
    // Execute query
    const start = Date.now();
    const result = await withPocketBase(async (pb) => {
      const { page = 1, perPage = 50, expand, filter, sort } = this.options;
      
      const expandStr = Array.isArray(expand) ? expand.join(',') : expand;
      
      return pb.collection(this.collection).getList(page, perPage, {
        expand: expandStr,
        ...(filter ? { filter } : {}),
        sort,
      });
    });
    
    const duration = Date.now() - start;
    
    // Log slow queries
    if (duration > 500) {
      logger.warn({
        collection: this.collection,
        options: this.options,
      }, `Slow query detected: ${this.collection} (${duration}ms)`);
    }
    
    // Cache result if enabled
    if (this.options.cache) {
      queryCache.set(cacheKey, result, this.options.cacheTTL);
    }
    
    return result;
  }
  
  /**
   * Execute and get first item
   */
  async first(): Promise<any> {
    this.options.perPage = 1;
    const result = await this.execute();
    return result.items[0] || null;
  }
  
  /**
   * Get cache key for this query
   */
  private getCacheKey(): string {
    return `${this.collection}:${JSON.stringify(this.options)}`;
  }
}

/**
 * Create an optimized query
 */
export function query(collection: string): OptimizedQuery {
  return new OptimizedQuery(collection);
}

/**
 * Batch load multiple records by IDs (DataLoader pattern)
 */
export async function batchLoad(
  collection: string,
  ids: string[],
  expand?: string
): Promise<Map<string, any>> {
  if (ids.length === 0) {
    return new Map();
  }
  
  const result = await withPocketBase(async (pb) => {
    const filter = ids.map(id => `id="${id}"`).join(' || ');
    return pb.collection(collection).getList(1, ids.length, {
      filter,
      expand,
    });
  });
  
  const map = new Map();
  for (const item of result.items) {
    map.set(item.id, item);
  }
  
  return map;
}

/**
 * Optimized student queries with eager loading
 */
export const StudentQueries = {
  /**
   * Get students with campus and academic records
   */
  async getWithRelations(filters: {
    page?: number;
    perPage?: number;
    campusId?: string;
    status?: string;
    search?: string;
    programme?: string;
  } = {}) {
    const { page = 1, perPage = 50, campusId, status, search, programme } = filters;
    
    let filterStr = '';
    const conditions: string[] = [];
    
    if (campusId) conditions.push(`campus_id="${campusId}"`);
    if (status) conditions.push(`status="${status}"`);
    if (programme) conditions.push(`programme="${programme}"`);
    if (search) {
      conditions.push(`(full_name~"${search}" || student_code~"${search}" || reg_no~"${search}")`);
    }
    
    if (conditions.length > 0) {
      filterStr = conditions.join(' && ');
    }
    
    const result = await query('students')
      .expand(['campus_id', 'program_code.dept_code.faculty_code', 'academic_records_via_student_id'])
      .filter(filterStr)
      .sort('-created')
      .paginate(page, perPage)
      .execute();

    // Normalise names and resolve programme dynamically
    result.items = result.items.map((s: any) => {
      if (s.full_name) {
        s.full_name = normalizeText(s.full_name, 'name');
      }
      if (s.full_name && !s.first_name) {
        const parts = s.full_name.trim().split(/\s+/);
        s = { ...s, first_name: parts[0] || '', last_name: parts.slice(1).join(' ') || '' };
      }
      if (s.first_name) {
        s.first_name = normalizeText(s.first_name, 'name');
      }
      if (s.last_name) {
        s.last_name = normalizeText(s.last_name, 'name');
      }
      if (s.expand?.program_code) {
        s.programme = normalizeText(s.expand.program_code.name || s.expand.program_code.program_code || s.programme || '', 'title');
        s.degree_level = s.expand.program_code.degree_level || s.degree_level || '';
        s.department = normalizeText(s.expand.program_code.expand?.dept_code?.name || s.department || '', 'title');
        s.faculty = normalizeText(s.expand.program_code.expand?.dept_code?.expand?.faculty_code?.name || s.faculty || '', 'title');
      }
      return s;
    });

    return result;
  },
  
  /**
   * 🔒 [LOCKED] getWithAcademicHistory
   * ───────────────────────────────────────────────────────────────────────────
   * MUST query both 'grades' AND 'academic_records' for the given studentId.
   *
   * Why: Bulk-imported scores are in 'academic_records' (640+ records).
   *      Faculty-entered scores are in 'grades'.
   *      Querying only one collection yields incomplete transcripts.
   *
   * The results are merged into a single academic_records array where
   * 'grades' entries take precedence over 'academic_records' entries for
   * the same course (last-write-wins by course key).
   *
   * DO NOT remove either collection query or the merge step.
   */
  async getWithAcademicHistory(studentId: string) {
    return withPocketBase(async (pb) => {
      let student = await pb.collection('students').getOne(studentId, {
        expand: 'campus_id,program_code.dept_code.faculty_code',
      });
      // Ensure first_name/last_name are always populated from full_name
      // (our import stores full_name; split here so every caller gets consistent data)
      if (student.full_name) {
        student.full_name = normalizeText(student.full_name, 'name');
      }
      if (student.full_name && !student.first_name) {
        const parts = student.full_name.trim().split(/\s+/);
        student = { ...student, first_name: parts[0] || '', last_name: parts.slice(1).join(' ') || '' };
      }
      if (student.first_name) {
        student.first_name = normalizeText(student.first_name, 'name');
      }
      if (student.last_name) {
        student.last_name = normalizeText(student.last_name, 'name');
      }
      if (student.expand?.program_code) {
        student.programme = normalizeText(student.expand.program_code.name || student.expand.program_code.program_code || student.programme || '', 'title');
        student.degree_level = student.expand.program_code.degree_level || student.degree_level || '';
        student.department = normalizeText(student.expand.program_code.expand?.dept_code?.name || student.department || '', 'title');
        student.faculty = normalizeText(student.expand.program_code.expand?.dept_code?.expand?.faculty_code?.name || student.faculty || '', 'title');
      }
      
      let grades: any[] = [];
      let ar: any[] = [];

      // ───────────────────────────────────────────────────────────────────────────
      // 🔒 LOCKED: Fetch #1 — 'grades' collection (faculty-entered scores)
      // Do NOT remove this query. Removing it silently drops faculty grades.
      // ───────────────────────────────────────────────────────────────────────────
      try {
        const gradesRes = await pb.collection('grades').getList(1, 100, {
          filter: `student_id="${studentId}" || enrollment_id.student_number="${studentId}"`,
          expand: 'enrollment_id.course_code,enrollment_id.course_code.module_id,course_id,course_id.module_id',
          sort: '-created',
        });
        grades = gradesRes.items || [];
      } catch (err: any) {
        logger.warn(`Failed to fetch student grades from grades collection: ${err.message}`);
      }

      // ───────────────────────────────────────────────────────────────────────────
      // 🔒 LOCKED: Fetch #2 — 'academic_records' collection (bulk-imported scores)
      // Do NOT remove this query. This is the primary source of imported grades.
      // 640+ records live here from the institution's spreadsheet import.
      // ───────────────────────────────────────────────────────────────────────────
      try {
        const arRes = await pb.collection('academic_records').getList(1, 100, {
          filter: `student_id="${studentId}"`,
          expand: 'course_id,course_id.module_id',
          sort: '-created',
        });
        ar = arRes.items || [];
      } catch (err: any) {
        logger.warn(`Failed to fetch student academic records: ${err.message}`);
      }

      // ───────────────────────────────────────────────────────────────────────────
      // 🔒 LOCKED: Merge step — academic_records first, grades override (same course key)
      // Deduplication key: course_code string, falling back to course_id, then record id.
      // 'grades' entries are set last so faculty corrections override import data.
      // Do NOT remove or reorder these loops.
      // ───────────────────────────────────────────────────────────────────────────
      // Merge and deduplicate records by course ID or code
      const merged = new Map<string, any>();
      for (const item of ar) {
        const courseCode = item.expand?.course_id?.code || item.expand?.course_id?.course_code || '';
        const key = courseCode || item.course_id || item.id;
        merged.set(key, item);
      }
      for (const item of grades) {
        const courseCode = item.expand?.course_id?.code || item.expand?.course_id?.course_code || item.expand?.enrollment_id?.expand?.course_code?.code || '';
        const key = courseCode || item.course_id || item.id;
        merged.set(key, item);
      }
      
      return {
        ...student,
        academic_records: Array.from(merged.values()),
      };
    });
  },
  
  /**
   * Get students by campus (cached)
   */
  async getByCampus(campusId: string) {
    const result = await query('students')
      .expand(['campus_id', 'program_code'])
      .filter(`campus_id="${campusId}"`)
      .sort('full_name')
      .cached(600000) // Cache for 10 minutes
      .execute();

    result.items = result.items.map((s: any) => {
      if (s.full_name) {
        s.full_name = normalizeText(s.full_name, 'name');
      }
      if (s.full_name && !s.first_name) {
        const parts = s.full_name.trim().split(/\s+/);
        s = { ...s, first_name: parts[0] || '', last_name: parts.slice(1).join(' ') || '' };
      }
      if (s.first_name) {
        s.first_name = normalizeText(s.first_name, 'name');
      }
      if (s.last_name) {
        s.last_name = normalizeText(s.last_name, 'name');
      }
      if (s.expand?.program_code) {
        s.programme = normalizeText(s.expand.program_code.name || s.expand.program_code.program_code, 'title');
      }
      return s;
    });

    return result;
  },
};

/**
 * Optimized academic record queries
 */
export const AcademicRecordQueries = {
  /**
   * Get academic records with student and course details
   */
  async getWithDetails(filters: {
    page?: number;
    perPage?: number;
    studentId?: string;
    courseId?: string;
    academicYear?: string;
    semester?: string;
  } = {}) {
    const { page = 1, perPage = 50, studentId, courseId, academicYear, semester } = filters;
    
    const conditions: string[] = [];
    if (studentId) conditions.push(`enrollment_id.student_number="${studentId}"`);
    if (courseId) conditions.push(`enrollment_id.course_code="${courseId}"`);
    if (academicYear) conditions.push(`enrollment_id.academic_year="${academicYear}"`);
    if (semester) conditions.push(`enrollment_id.semester="${semester}"`);
    
    const filterStr = conditions.length > 0 ? conditions.join(' && ') : '';
    
    return query('grades')
      .expand(['enrollment_id.student_number', 'enrollment_id.course_code', 'enrollment_id.course_code.module_id'])
      .filter(filterStr)
      .sort('-enrollment_id.academic_year,-enrollment_id.semester')
      .paginate(page, perPage)
      .execute();
  },
};

/**
 * Optimized staff queries
 */
export const StaffQueries = {
  async getWithDetails(filters: {
    page?: number;
    perPage?: number;
    campusId?: string;
    department?: string;
    search?: string;
    category?: string;
  } = {}) {
    const { page = 1, perPage = 50, campusId, department, search, category } = filters;
    
    const conditions: string[] = [];
    if (campusId) conditions.push(`campus_id="${campusId}"`);
    if (department && department !== 'All Departments') conditions.push(`department="${department}"`);
    if (category && category !== 'All') conditions.push(`category="${category}"`);
    if (search) {
      conditions.push(`(first_name~"${search}" || last_name~"${search}" || staff_number~"${search}" || email~"${search}")`);
    }
    
    const filterStr = conditions.length > 0 ? conditions.join(' && ') : '';
    
    return query('staff')
      .expand('campus_id')
      .filter(filterStr)
      .sort('last_name,first_name')
      .paginate(page, perPage)
      .execute();
  },
};

/**
 * Optimized course queries
 */
export const CourseQueries = {
  async getWithDetails(filters: {
    page?: number;
    perPage?: number;
    campusId?: string;
    moduleId?: string;
    search?: string;
    status?: string;
  } = {}) {
    const { page = 1, perPage = 50, campusId, moduleId, search, status } = filters;
    
    const conditions: string[] = [];
    if (campusId) conditions.push(`campus_id="${campusId}"`);
    if (moduleId) conditions.push(`module_id="${moduleId}"`);
    if (status) conditions.push(`status="${status}"`);
    if (search) {
      conditions.push(`(name~"${search}" || code~"${search}")`);
    }
    
    const filterStr = conditions.length > 0 ? conditions.join(' && ') : '';
    
    return query('courses')
      .expand(['campus_id', 'module_id'])
      .filter(filterStr)
      .sort('code')
      .paginate(page, perPage)
      .execute();
  },
};

/**
 * Optimized catalog queries
 */
export const CatalogQueries = {
  /**
   * Get student transcript (all academic records)
   */
  async getTranscript(studentId: string) {
    return query('grades')
      .expand(['enrollment_id.course_code', 'enrollment_id.course_code.module_id'])
      .filter(`enrollment_id.student_number="${studentId}"`)
      .sort('-enrollment_id.academic_year,-enrollment_id.semester')
      .paginate(1, 500)
      .execute();
  },
};

/**
 * Reference data queries (heavily cached)
 */
export const ReferenceDataQueries = {
  /**
   * Get all campuses (cached)
   */
  async getCampuses() {
    return query('campuses')
      .sort('name')
      .paginate(1, 100)
      .cached(1800000) // Cache for 30 minutes
      .execute();
  },
  
  /**
   * Get all modules (cached)
   */
  async getModules() {
    return query('modules')
      .sort('sort_order')
      .paginate(1, 100)
      .cached(1800000) // Cache for 30 minutes
      .execute();
  },
};

/**
 * Optimized finance queries
 */
export const FinanceQueries = {
  async getWithDetails(filters: {
    page?: number;
    perPage?: number;
    studentId?: string;
    status?: string;
    search?: string;
  } = {}) {
    const { page = 1, perPage = 50, studentId, status, search } = filters;

    const conditions: string[] = [];
    if (studentId) conditions.push(`student_id = "${studentId}"`);
    if (status) conditions.push(`status = "${status}"`);
    if (search) {
      conditions.push(`(name~"${search}" || ref~"${search}" || desc~"${search}")`);
    }

    const filterStr = conditions.length > 0 ? conditions.join(" && ") : "";

    return query("transactions")
      .expand("student_id")
      .filter(filterStr)
      .sort("-date")
      .paginate(page, perPage)
      .execute();
  },
};

/**
 * Optimized library queries
 */
export const LibraryQueries = {
  async getWithDetails(filters: {
    page?: number;
    perPage?: number;
    category?: string;
    type?: string;
    status?: string;
    search?: string;
  } = {}) {
    const { page = 1, perPage = 50, category, type, status, search } = filters;

    const conditions: string[] = [];
    if (category) conditions.push(`category="${category}"`);
    if (type) conditions.push(`type="${type}"`);
    if (status) conditions.push(`status="${status}"`);
    if (search) {
      conditions.push(`(title~"${search}" || author~"${search}" || isbn~"${search}")`);
    }

    const filterStr = conditions.length > 0 ? conditions.join(" && ") : "";

    return query("library_items")
      .filter(filterStr)
      .sort("-created")
      .paginate(page, perPage)
      .execute();
  },
};

/**
 * Optimized hostel queries
 */
export const HostelQueries = {
  async getHostels() {
    return query("hostels").sort("-created").paginate(1, 100).cached(300000).execute();
  },

  async getAssignments(filters: {
    page?: number;
    perPage?: number;
    hostelId?: string;
    studentId?: string;
    status?: string;
  } = {}) {
    const { page = 1, perPage = 50, hostelId, studentId, status } = filters;

    const conditions: string[] = [];
    if (hostelId) conditions.push(`hostelId="${hostelId}"`);
    if (studentId) conditions.push(`studentId="${studentId}"`);
    if (status) conditions.push(`status="${status}"`);

    const filterStr = conditions.length > 0 ? conditions.join(" && ") : "";

    return query("room_assignments")
      .expand("hostelId")
      .filter(filterStr)
      .sort("-created")
      .paginate(page, perPage)
      .execute();
  },
};

/**
 * Cache management
 */
export const CacheManager = {
  /**
   * Invalidate cache for a collection
   */
  invalidate(collection: string): void {
    queryCache.invalidatePattern(`^${collection}:`);
    logger.info(`Cache invalidated for collection: ${collection}`);
  },
  
  /**
   * Clear all cache
   */
  clearAll(): void {
    queryCache.clear();
    logger.info('All cache cleared');
  },
  
  /**
   * Get cache statistics
   */
  getStats() {
    return queryCache.getStats();
  },
};

/**
 * Query performance monitoring
 */
export class QueryMonitor {
  private static queries: Array<{
    collection: string;
    duration: number;
    timestamp: number;
    options: any;
  }> = [];
  
  static log(collection: string, duration: number, options: any): void {
    this.queries.push({
      collection,
      duration,
      timestamp: Date.now(),
      options,
    });
    
    // Keep only last 1000 queries
    if (this.queries.length > 1000) {
      this.queries.shift();
    }
  }
  
  static getStats(): {
    totalQueries: number;
    avgDuration: number;
    slowQueries: number;
    byCollection: Record<string, { count: number; avgDuration: number }>;
  } {
    const byCollection: Record<string, { count: number; totalDuration: number }> = {};
    let slowQueries = 0;
    
    for (const query of this.queries) {
      if (!byCollection[query.collection]) {
        byCollection[query.collection] = { count: 0, totalDuration: 0 };
      }
      byCollection[query.collection].count++;
      byCollection[query.collection].totalDuration += query.duration;
      
      if (query.duration > 500) {
        slowQueries++;
      }
    }
    
    const totalDuration = this.queries.reduce((sum, q) => sum + q.duration, 0);
    
    return {
      totalQueries: this.queries.length,
      avgDuration: this.queries.length > 0 ? totalDuration / this.queries.length : 0,
      slowQueries,
      byCollection: Object.fromEntries(
        Object.entries(byCollection).map(([name, stats]) => [
          name,
          {
            count: stats.count,
            avgDuration: stats.totalDuration / stats.count,
          },
        ])
      ),
    };
  }
}







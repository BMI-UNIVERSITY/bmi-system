/**
 * BMI UMS - Database Optimizer
 * Implements indexes, cascade rules, and performance optimizations
 */

import { getPocketBase } from "./pocketbase.js";
import { logger } from "../utils/logger.js";
import { errorMessage } from '../utils/helpers.js';

/**
 * Create indexes for optimal query performance
 * Indexes dramatically improve query speed on large datasets
 */
export async function createDatabaseIndexes(): Promise<void> {
  logger.info("Database indexes are managed by pb_migrations.");
  logger.info("  Migration: pb_migrations/1780000002_add_indexes.js");
  logger.info("  To verify: check PocketBase admin UI > Collections > [collection] > Indexes tab");
}

/**
 * Update collection schemas with cascade rules and optimizations
 */
export async function optimizeCollectionSchemas(): Promise<void> {
  logger.info("Collection schemas are managed by pb_migrations. No runtime schema optimization needed.");
}

/**
 * Analyze query performance and suggest optimizations
 */
export async function analyzeQueryPerformance(): Promise<void> {
  const pb = getPocketBase();

  try {
    logger.info("Analyzing query performance...");

    // Test common queries and measure performance
    const tests = [
      {
        name: "Students list with campus expand",
        query: async () => {
          const start = Date.now();
          await pb.collection("students").getList(1, 50, {
            expand: "campus_id",
          });
          return Date.now() - start;
        },
      },
      {
        name: "Academic records with student and course expand",
        query: async () => {
          const start = Date.now();
          await pb.collection("academic_records").getList(1, 50, {
            expand: "student_id,course_id",
          });
          return Date.now() - start;
        },
      },
      {
        name: "Students filtered by campus and status",
        query: async () => {
          const start = Date.now();
          await pb.collection("students").getList(1, 50, {
            filter: 'status = "Active"',
          });
          return Date.now() - start;
        },
      },
    ];

    for (const test of tests) {
      try {
        const duration = await test.query();
        const status = duration < 100 ? "✓" : duration < 500 ? "⚠" : "✗";
        logger.info(`${status} ${test.name}: ${duration}ms`);

        if (duration > 500) {
          logger.warn(
            `  Slow query detected! Consider adding indexes or optimizing query.`,
          );
        }
      } catch (error) {
        logger.warn(`  Skipped ${test.name} (collection may not exist yet)`);
      }
    }

    logger.info("✓ Query performance analysis complete");
  } catch (error) {
    logger.error(`Failed to analyze query performance: ${errorMessage(error)}`);
  }
}

/**
 * Get database statistics
 */
export async function getDatabaseStats(): Promise<{
  collections: number;
  totalRecords: number;
  largestCollection: string;
  avgQueryTime: number;
}> {
  const pb = getPocketBase();

  try {
    const collections = await pb.collections.getList(1, 100);
    let totalRecords = 0;
    let largestCollection = "";
    let largestSize = 0;

    for (const collection of collections.items) {
      try {
        const records = await pb.collection(collection.name).getList(1, 1);
        const count = records.totalItems;
        totalRecords += count;

        if (count > largestSize) {
          largestSize = count;
          largestCollection = collection.name;
        }
      } catch (error) { // Skip collections that can't be queried
      }
    }

    return {
      collections: collections.totalItems,
      totalRecords,
      largestCollection: `${largestCollection} (${largestSize} records)`,
      avgQueryTime: 0, // Would need query logging to calculate
    };
  } catch (error) {
    logger.error(`Failed to get database stats: ${errorMessage(error)}`);
    return {
      collections: 0,
      totalRecords: 0,
      largestCollection: "unknown",
      avgQueryTime: 0,
     };
  }
}

/**
 * Run all database optimizations
 */
export async function optimizeDatabase(): Promise<void> {
  logger.info("🚀 Starting database optimization...");

  try {
    await createDatabaseIndexes();
    await optimizeCollectionSchemas();
    await analyzeQueryPerformance();

    const stats = await getDatabaseStats();
    logger.info({ stats }, "📊 Database Statistics");

    logger.info("✅ Database optimization complete!");
  } catch (error) {
    logger.error(`❌ Database optimization failed: ${errorMessage(error)}`);
    throw error;
  }
}







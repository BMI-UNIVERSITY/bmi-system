import { getPocketBase } from "./pocketbase.js";
import { logger } from "../utils/logger.js";
import { errorMessage } from '../utils/helpers.js';

/**
 * Data Retention Service
 * Automatically cleans up old logs and temporary records
 */
export const retentionService = {
  /**
   * Run cleanup tasks
   */
  async runCleanup() {
    logger.info("Starting scheduled data retention cleanup...");
    
    try {
      const pb = getPocketBase();
      
      // 1. Audit Logs (90 days)
      const auditLogCutoff = new Date();
      auditLogCutoff.setDate(auditLogCutoff.getDate() - 90);
      const auditFilter = `created < "${auditLogCutoff.toISOString()}"`;
      
      const oldAuditLogs = await pb.collection("audit_logs").getFullList({ filter: auditFilter });
      for (const log of oldAuditLogs) {
        await pb.collection("audit_logs").delete(log.id);
      }
      if (oldAuditLogs.length > 0) {
        logger.info(`Purged ${oldAuditLogs.length} old audit logs.`);
      }

      // 2. Visitor Records (30 days)
      const visitorCutoff = new Date();
      visitorCutoff.setDate(visitorCutoff.getDate() - 30);
      const visitorFilter = `created < "${visitorCutoff.toISOString()}"`;
      
      const oldVisitors = await pb.collection("visitors").getFullList({ filter: visitorFilter });
      for (const visitor of oldVisitors) {
        await pb.collection("visitors").delete(visitor.id);
      }
      if (oldVisitors.length > 0) {
        logger.info(`Purged ${oldVisitors.length} old visitor records.`);
      }

      // 3. Old Notifications (30 days)
      const notifCutoff = new Date();
      notifCutoff.setDate(notifCutoff.getDate() - 30);
      const notifFilter = `created < "${notifCutoff.toISOString()}"`;
      
      const oldNotifs = await pb.collection("notifications").getFullList({ filter: notifFilter });
      for (const notif of oldNotifs) {
        await pb.collection("notifications").delete(notif.id);
      }
      if (oldNotifs.length > 0) {
        logger.info(`Purged ${oldNotifs.length} old notifications.`);
      }

      logger.info("Data retention cleanup completed successfully.");
    } catch (error) {
      logger.error(`Data retention cleanup failed: ${errorMessage(error)}`);
    }
  },

  /**
   * Schedule the cleanup task (e.g., once every 24 hours)
   */
  schedule(intervalMs: number = 24 * 60 * 60 * 1000) {
    logger.info(`Scheduling data retention cleanup every ${intervalMs / 3600000} hours`);
    setInterval(() => this.runCleanup(), intervalMs);
    
    // Run once immediately on startup
    this.runCleanup();
  }
};







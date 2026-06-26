import { getPocketBase } from "./pocketbase.js";
import { logger } from "../utils/logger.js";

export type NotificationType = "grade_published" | "fee_update" | "document_ready" | "system_alert" | "appeal_response";

export interface NotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, any>;
}

/**
 * Notification Service
 * Handles system notifications and mock email delivery
 */
export const notificationService = {
  /**
   * Send a notification to a specific user
   */
  async send(payload: NotificationPayload) {
    try {
      const pb = getPocketBase();
      
      // 1. Create system notification in DB
      const record = await pb.collection("notifications").create({
        user_id: payload.userId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        link: payload.link,
        metadata: payload.metadata || {},
        is_read: false,
      });

      // 2. Mock Email Delivery (Log to console/file)
      this.sendMockEmail(payload);

      return record;
    } catch (error) {
      logger.error({ err: error }, "Failed to send notification");
      throw error;
    }
  },

  /**
   * Broadcast a notification to all users or a specific role
   */
  async broadcast(payload: Omit<NotificationPayload, "userId">, role?: string) {
    try {
      const pb = getPocketBase();
      let filter = "";
      if (role) filter = `role = "${role}"`;

      const users = await pb.collection("users").getFullList({ filter });
      
      const promises = users.map(user => this.send({
        ...payload,
        userId: user.id
      }));

      await Promise.all(promises);
      logger.info(`Broadcasted notification: ${payload.title} to ${users.length} users`);
    } catch (error) {
      logger.error({ err: error }, "Broadcast notification error");
    }
  },

  /**
   * Helper for mock email delivery
   */
  sendMockEmail(payload: NotificationPayload) {
    // In a real system, this would use nodemailer or an API like SendGrid
    logger.info(`[MOCK EMAIL] To: User(${payload.userId}) | Subject: ${payload.title} | Content: ${payload.message}`);
  }
};







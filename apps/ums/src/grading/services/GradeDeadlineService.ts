/* eslint-disable */
/* eslint-disable */
/**
 * BMI UMS - Grade Deadline Service
 * Manages grade submission deadlines, reminders, and auto-finalization
 */

import { GradeDeadlineConfig } from '../types';

/**
 * Grade deadline configuration for a semester
 */
export interface DeadlineConfig extends GradeDeadlineConfig {
  id: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Course with missing grades
 */
export interface MissingGradeCourse {
  courseId: string;
  courseCode: string;
  courseName: string;
  instructorId: string;
  instructorName: string;
  instructorEmail: string;
  enrolledStudents: number;
  submittedGrades: number;
  missingGrades: number;
}

/**
 * Deadline extension request
 */
export interface DeadlineExtension {
  id: string;
  courseId: string;
  courseCode: string;
  instructorId: string;
  requestedDeadline: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Denied';
  requestedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

/**
 * Service for managing grade submission deadlines
 */
export class GradeDeadlineService {
  /**
   * Set grade submission deadline for a semester
   */
  static async setDeadline(config: Omit<GradeDeadlineConfig, 'id'>): Promise<DeadlineConfig> {
    // TODO: Implement API call to save deadline configuration
    const deadline: DeadlineConfig = {
      ...config,
      id: `DL-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log('[GradeDeadline] Set deadline:', deadline);
    return deadline;
  }

  /**
   * Get deadline configuration for a semester
   */
  static async getDeadline(academicYear: string, semester: string): Promise<DeadlineConfig | null> {
    // TODO: Implement API call to fetch deadline configuration
    console.log('[GradeDeadline] Fetching deadline for:', academicYear, semester);
    return null;
  }

  /**
   * Check if deadline has passed
   */
  static hasDeadlinePassed(deadline: string): boolean {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    return now > deadlineDate;
  }

  /**
   * Calculate days until deadline
   */
  static getDaysUntilDeadline(deadline: string): number {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * Send reminder notifications to instructors with unsubmitted grades
   */
  static async sendDeadlineReminders(
    deadline: DeadlineConfig,
    daysBeforeDeadline: number
  ): Promise<string[]> {
    const daysUntil = this.getDaysUntilDeadline(deadline.submissionDeadline);

    // Only send if within reminder window
    if (daysUntil !== daysBeforeDeadline) {
      return [];
    }

    // Get courses with missing grades
    const coursesWithMissingGrades = await this.getCoursesWithMissingGrades(
      deadline.academicYear,
      deadline.semester
    );

    const notifiedInstructors: string[] = [];

    for (const course of coursesWithMissingGrades) {
      try {
        await this.sendReminderNotification(course, deadline, daysUntil);
        notifiedInstructors.push(course.instructorId);
        
        console.log(`[GradeDeadline] Sent reminder to instructor ${course.instructorId} for course ${course.courseCode}`);
      } catch (error) { console.error(`[GradeDeadline] Failed to send reminder for course ${course.courseCode }:`, error);
      }
    }

    return notifiedInstructors;
  }

  /**
   * Send reminder notification to instructor
   */
  private static async sendReminderNotification(
    course: MissingGradeCourse,
    deadline: DeadlineConfig,
    daysUntil: number
  ): Promise<void> {
    // TODO: Implement notification service
    console.log(`Sending deadline reminder to ${course.instructorEmail}:`, {
      course: course.courseCode,
      missingGrades: course.missingGrades,
      deadline: deadline.submissionDeadline,
      daysUntil,
    });
  }

  /**
   * Get courses with missing grades for a semester
   */
  static async getCoursesWithMissingGrades(
    academicYear: string,
    semester: string
  ): Promise<MissingGradeCourse[]> {
    // TODO: Implement API call to fetch courses with missing grades
    console.log('[GradeDeadline] Fetching courses with missing grades:', academicYear, semester);
    
    // Mock data
    return [
      {
        courseId: 'CRS-101',
        courseCode: 'THEO101',
        courseName: 'Systematic Theology I',
        instructorId: 'INS-001',
        instructorName: 'Dr. Samuel Kiptoo',
        instructorEmail: 's.kiptoo@bmi.edu',
        enrolledStudents: 30,
        submittedGrades: 25,
        missingGrades: 5,
      },
    ];
  }

  /**
   * Flag courses with missing grades after deadline
   */
  static async flagMissingGrades(
    academicYear: string,
    semester: string
  ): Promise<string[]> {
    const coursesWithMissingGrades = await this.getCoursesWithMissingGrades(
      academicYear,
      semester
    );

    const flaggedCourses: string[] = [];

    for (const course of coursesWithMissingGrades) {
      if (course.missingGrades > 0) {
        // TODO: Flag course in database
        flaggedCourses.push(course.courseId);
        console.log(`[GradeDeadline] Flagged course ${course.courseCode} with ${course.missingGrades} missing grades`);
      }
    }

    return flaggedCourses;
  }

  /**
   * Generate report of courses with unsubmitted grades
   */
  static async generateMissingGradesReport(
    academicYear: string,
    semester: string
  ): Promise<{
    totalCourses: number;
    coursesWithMissingGrades: number;
    totalMissingGrades: number;
    courses: MissingGradeCourse[];
  }> {
    const courses = await this.getCoursesWithMissingGrades(academicYear, semester);

    const coursesWithMissing = courses.filter(c => c.missingGrades > 0);
    const totalMissing = coursesWithMissing.reduce((sum, c) => sum + c.missingGrades, 0);

    return {
      totalCourses: courses.length,
      coursesWithMissingGrades: coursesWithMissing.length,
      totalMissingGrades: totalMissing,
      courses: coursesWithMissing,
    };
  }

  /**
   * Request deadline extension for a course
   */
  static async requestExtension(
    courseId: string,
    instructorId: string,
    requestedDeadline: string,
    reason: string
  ): Promise<DeadlineExtension> {
    const extension: DeadlineExtension = {
      id: `EXT-${Date.now()}`,
      courseId,
      courseCode: 'UNKNOWN', // TODO: Fetch from course
      instructorId,
      requestedDeadline,
      reason,
      status: 'Pending',
      requestedAt: new Date().toISOString(),
    };

    // TODO: Save to database
    console.log('[GradeDeadline] Extension requested:', extension);
    return extension;
  }

  /**
   * Approve or deny deadline extension
   */
  static async reviewExtension(
    extensionId: string,
    approved: boolean,
    reviewerId: string
  ): Promise<DeadlineExtension> {
    // TODO: Update extension in database
    console.log('[GradeDeadline] Extension reviewed:', {
      extensionId,
      approved,
      reviewerId,
    });

    return {
      id: extensionId,
      courseId: 'CRS-101',
      courseCode: 'THEO101',
      instructorId: 'INS-001',
      requestedDeadline: new Date().toISOString(),
      reason: 'Need more time',
      status: approved ? 'Approved' : 'Denied',
      requestedAt: new Date().toISOString(),
      reviewedAt: new Date().toISOString(),
      reviewedBy: reviewerId,
    };
  }

  /**
   * Prevent students from viewing grades until instructor submits them
   */
  static async setGradeVisibility(
    gradeId: string,
    visible: boolean
  ): Promise<void> {
    // TODO: Update grade visibility in database
    console.log('[GradeDeadline] Set grade visibility:', { gradeId, visible });
  }

  /**
   * Auto-finalize submitted grades after review period
   */
  static async autoFinalizeGrades(
    academicYear: string,
    semester: string,
    reviewPeriodDays: number
  ): Promise<string[]> {
    // Get all submitted grades that are past review period
    // TODO: Implement API call to fetch and finalize grades
    
    const finalizedGradeIds: string[] = [];
    
    console.log('[GradeDeadline] Auto-finalizing grades for:', {
      academicYear,
      semester,
      reviewPeriodDays,
    });

    return finalizedGradeIds;
  }

  /**
   * Run all deadline-related automated operations
   */
  static async runDeadlineOperations(deadline: DeadlineConfig): Promise<{
    remindersSent: string[];
    flaggedCourses: string[];
    finalizedGrades: string[];
  }> {
    console.log('[GradeDeadline] Running deadline operations...');

    const daysUntil = this.getDaysUntilDeadline(deadline.submissionDeadline);

    // Send reminders if within reminder window
    let remindersSent: string[] = [];
    if (deadline.reminderDays.includes(daysUntil)) {
      remindersSent = await this.sendDeadlineReminders(deadline, daysUntil);
    }

    // Flag courses with missing grades if deadline has passed
    let flaggedCourses: string[] = [];
    if (this.hasDeadlinePassed(deadline.submissionDeadline)) {
      flaggedCourses = await this.flagMissingGrades(
        deadline.academicYear,
        deadline.semester
      );
    }

    // Auto-finalize grades after review period
    const finalizedGrades = await this.autoFinalizeGrades(
      deadline.academicYear,
      deadline.semester,
      deadline.autoFinalizeAfterDays
    );

    console.log('[GradeDeadline] Deadline operations complete:', {
      remindersSent: remindersSent.length,
      flaggedCourses: flaggedCourses.length,
      finalizedGrades: finalizedGrades.length,
    });

    return {
      remindersSent,
      flaggedCourses,
      finalizedGrades,
    };
  }
}

export default GradeDeadlineService;










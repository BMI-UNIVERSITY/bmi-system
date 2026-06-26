
/**
 * BMI UMS - Grading Utilities
 */

export interface GradeCalculation {
  letterGrade: string;
  gradePoints: number;
}

/**
 * Calculate letter grade and grade points from percentage
 * Default US 4.0 scale
 */
export function calculateGradeResult(percentage: number): GradeCalculation {
  if (percentage >= 90) return { letterGrade: 'A', gradePoints: 4.0 };
  if (percentage >= 80) return { letterGrade: 'B', gradePoints: 3.0 };
  if (percentage >= 70) return { letterGrade: 'C', gradePoints: 2.0 };
  if (percentage >= 60) return { letterGrade: 'D', gradePoints: 1.0 };
  return { letterGrade: 'F', gradePoints: 0.0 };
}







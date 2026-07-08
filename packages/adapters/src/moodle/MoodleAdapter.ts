import { ILMSProvider, Course, Enrollment, Grade } from '@bmi/ports';

export class MoodleAdapter implements ILMSProvider {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    this.token = token;
  }

  private async callRest(wsfunction: string, params: Record<string, any> = {}): Promise<any> {
    const url = new URL(`${this.baseUrl}webservice/rest/server.php`);
    url.searchParams.append('wstoken', this.token);
    url.searchParams.append('wsfunction', wsfunction);
    url.searchParams.append('moodlewsrestformat', 'json');
    
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.append(key, String(value));
    }

    const response = await fetch(url.toString(), { method: 'POST' });
    const data: any = await response.json();
    if (data.exception) {
      throw new Error(`Moodle API Error: ${data.message}`);
    }
    return data;
  }

  async getCourses(userId?: string): Promise<Course[]> {
    return []; // Mock
  }

  async getCourse(courseId: string): Promise<Course | null> {
    const data = await this.callRest('core_course_get_courses', { 'options[ids][0]': courseId });
    if (!data || data.length === 0) return null;
    const c = data[0] as any;
    return {
      id: String(c.id),
      code: c.shortname,
      name: c.fullname,
      credits: 3,
      semester: 'Fall',
      year: 2026,
    };
  }

  async enrollStudent(userId: string, courseId: string): Promise<Enrollment> {
    await this.callRest('enrol_manual_enrol_users', {
      'enrolments[0][roleid]': 5,
      'enrolments[0][userid]': userId,
      'enrolments[0][courseid]': courseId,
    });
    return { id: `enr_${userId}_${courseId}`, userId, courseId, status: 'enrolled', enrollmentDate: new Date() };
  }

  async dropStudent(userId: string, courseId: string): Promise<void> {
    // Requires unenroll API
  }

  async getEnrollments(userId: string): Promise<Enrollment[]> {
    return [];
  }

  async getGrades(userId: string, courseId?: string): Promise<Grade[]> {
    if (!courseId) return [];
    const data = await this.callRest('gradereport_user_get_grade_items', { courseid: courseId, userid: userId });
    const items = data?.usergrades?.[0]?.gradeitems || [];
    return items.map((g: any) => ({
      id: String(g.id),
      userId,
      courseId,
      value: String(g.graderaw || '0'),
      percentage: (parseFloat(g.graderaw) / parseFloat(g.grademax)) * 100 || 0,
      timestamp: new Date(),
    }));
  }

  async syncGrade(grade: Grade): Promise<void> {
    // Send grade to Moodle
  }
}

-- Create timetabling table
CREATE TABLE IF NOT EXISTS timetabling (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  instructor_id TEXT,
  classroom_id TEXT,
  day_of_week TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_timetabling_course ON timetabling(course_id);
CREATE INDEX IF NOT EXISTS idx_timetabling_instructor ON timetabling(instructor_id);
CREATE INDEX IF NOT EXISTS idx_timetabling_day ON timetabling(day_of_week);

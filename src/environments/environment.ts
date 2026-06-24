export const environment = {
  production: import.meta.env['NG_APP_PRODUCTION'] === 'true',
  apiUrl: import.meta.env['NG_APP_API_URL'] || 'http://localhost:3001/api',
  lessonUploadPreset: 'lessons',
  thumbnailUploadPreset: 'course_thumbnails',
  studentAppUrl: import.meta.env['NG_APP_STUDENT_APP_URL'] || 'http://localhost:3000',
};
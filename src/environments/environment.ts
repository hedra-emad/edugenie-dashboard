export const environment = {
  production: false,
  apiUrl: 'https://edugenie-api.vercel.app',
  lessonUploadPreset: 'lessons',
  thumbnailUploadPreset: 'course_thumbnails',
  // studentAppUrl: 'http://localhost:3000' // NOTE: Verified via next.config.ts and package.json that Next.js uses 3000, not 4200
  studentAppUrl: 'https://edugenie-student-web.vercel.app'
};

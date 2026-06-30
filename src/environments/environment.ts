// EduGenie Dashboard — development environment (values are baked in at build time).
export const environment = {
  production: false,
  apiUrl: 'https://edugenie-api.vercel.app/api',           // NestJS API base (includes the /api prefix)
  studentAppUrl: 'http://localhost:3000',        // SSO handoff target (student web)
  cloudName: 'dxeoqi3kb',                         // Cloudinary cloud name (unsigned uploads)
  pusherKey: '3a59a972cbaf38e1fb97',             // Pusher public key (realtime notifications)
  pusherCluster: 'us2',
};

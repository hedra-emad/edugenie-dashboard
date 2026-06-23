interface ImportMetaEnv {
  readonly NG_APP_API_URL: string;
  readonly NG_APP_LESSON_UPLOAD_PRESET: string;
  readonly NG_APP_THUMBNAIL_UPLOAD_PRESET: string;
  readonly NG_APP_STUDENT_APP_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

export enum AttachmentParentType {
  LESSON = 'lesson',
}

export interface Attachment {
  id: string;
  courseId: string;
  sectionId: string;
  lessonId: string;
  title: string;
  originalFilename: string;
  fileUrl: string;
  filePublicId?: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAttachmentPayload {
  title: string;
  originalFilename: string;
  fileUrl: string;
  filePublicId: string;
  fileType: string;
  fileSize: number;
}

export const MAX_ATTACHMENT_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
export const MAX_ATTACHMENTS_PER_PARENT = 5;

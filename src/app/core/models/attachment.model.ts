export enum AttachmentParentType {
  COURSE = 'course',
  SECTION = 'section',
  LESSON = 'lesson',
}

export interface Attachment {
  id: string;
  parentType: AttachmentParentType;
  courseId: string;
  sectionId?: string | null;
  lessonId?: string | null;
  title: string;
  originalFilename: string;
  fileUrl: string;
  filePublicId?: string;
  fileType: string;
  fileSize: number;
  isPublic: boolean;
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
  isPublic?: boolean;
}

export const MAX_ATTACHMENT_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
export const MAX_ATTACHMENTS_PER_PARENT = 5;

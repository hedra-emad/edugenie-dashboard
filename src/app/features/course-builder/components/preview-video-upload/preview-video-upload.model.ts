export type PreviewVideoUploadState =
  | 'idle'
  | 'video_selected'
  | 'uploading'
  | 'upload_success'
  | 'upload_error'
  | 'saved';

export interface PreviewVideoUploadSnapshot {
  state: PreviewVideoUploadState;
  progress: number;
  message: string;
}

export function initialSnapshot(): PreviewVideoUploadSnapshot {
  return {
    state: 'idle',
    progress: 0,
    message: '',
  };
}

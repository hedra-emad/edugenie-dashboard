export interface Lesson {
  title: string;
  videoFile: string | null;
  uploadStatus: 'idle' | 'uploading' | 'success' | 'error' | 'videoTooLong';
  uploadProgress: number;
}

export interface Section {
  title: string;
  description: string;
  isBasicSection: boolean;
  expectedOutcomes: string[];
  lessons: Lesson[];
}

export interface Course {
  title: string;
  description: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  price: number | null;
  thumbnail: string | null;
  goals: string[];
  requirements: string[];
  sections: Section[];
}

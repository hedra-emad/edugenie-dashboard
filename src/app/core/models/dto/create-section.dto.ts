export interface CreateSectionDto {
  title: string;
  description?: string;
  expectedOutcomes?: string[];
  price?: number | null;
  previewVideoUrl?: string | null;       // add this
  previewVideoPublicId?: string | null;  // add this
}

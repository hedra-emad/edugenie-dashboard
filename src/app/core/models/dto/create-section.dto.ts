export interface CreateSectionDto {
  title: string;
  description?: string;
  order: number;
  expectedOutcomes?: string[];
  price?: number | null;
}

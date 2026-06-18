export interface CreateSectionDto {
  title: string;
  description?: string;
  order: number;
  expectedOutcomes?: string[];
  isBasicSection?: boolean;
}

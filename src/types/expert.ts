export interface ExpertConfig {
  id: string;
  label: string;
  role: string;
  mission: string;
  objectives: string[];
  schema: object;
  priorityFields: string[];
  documentMetadata: {
    supportedLanguages: string[];
    version: string;
    category: string;
    confidenceThreshold: number;
  };
}

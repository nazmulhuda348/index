export interface DocumentRecord {
  id: string;
  ref_number: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  file_url?: string;
  is_pinned: boolean;
  created_at: string;
}

export const CATEGORIES = [
  'Legal & Compliance',
  'Financial Records',
  'Human Resources',
  'Business Operations',
  'Technical Assets',
  'Marketing & Assets',
  'Others'
] as const;

export type Category = typeof CATEGORIES[number];

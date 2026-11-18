import type { QuizDemoCategory } from '@/apps/training-quizzes/shared/quiz-demo-content';

export interface CategoryCertDefinition {
  category: QuizDemoCategory;
  title: string;
  /** PrimeIcons class(es) shown in Training & Quizzes and lab messaging. */
  icon: string;
  description: string;
}

/** Default category certifications — one badge per demo training track. */
export const CATEGORY_CERT_DEFINITIONS: readonly CategoryCertDefinition[] = [
  {
    category: 'Platform basics',
    title: 'THE-LAB Foundations',
    icon: 'pi pi-sparkles',
    description: 'Passed every quiz in Platform basics.',
  },
  {
    category: 'Settings & personas',
    title: 'Platform Steward',
    icon: 'pi pi-cog',
    description: 'Passed every quiz in Settings & personas.',
  },
  {
    category: 'Apps, team & support',
    title: 'Catalog & Team Specialist',
    icon: 'pi pi-sitemap',
    description: 'Passed every quiz in Apps, team & support.',
  },
];

export function categoryCertDefinitionFor(
  category: string,
): CategoryCertDefinition | undefined {
  return CATEGORY_CERT_DEFINITIONS.find((row) => row.category === category);
}

export function categoryCertIconFor(category: string): string {
  return categoryCertDefinitionFor(category)?.icon ?? 'pi pi-verified';
}

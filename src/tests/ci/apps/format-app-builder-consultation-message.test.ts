import {
  APP_BUILDER_CONSULTATION_MARKER,
  formatAppBuilderConsultationMessage,
} from '@/apps/lab-app-builder/shared/format-app-builder-consultation-message';

describe('formatAppBuilderConsultationMessage', () => {
  test('includes marker and draft fields', () => {
    const text = formatAppBuilderConsultationMessage({
      displayName: 'Vendor Hub',
      description: 'Track vendor onboarding and approvals.',
      faIcon: 'fa-briefcase',
      catalogTag: { mode: 'user_selected', tagId: 'productivity', tagLabel: 'Productivity' },
    });
    expect(text).toContain(APP_BUILDER_CONSULTATION_MARKER);
    expect(text).toContain('**Display name:** Vendor Hub');
    expect(text).toContain('`fa-briefcase`');
    expect(text).toContain('Track vendor onboarding');
    expect(text).toMatch(/do not.*App Management/i);
    expect(text).toContain('productivity');
    expect(text).toContain('Forms Builder');
    expect(text).toContain('Chart Builder');
    expect(text).toContain('catalogTagIds');
  });

  test('recommend-for-me mode stresses catalogTagIds on create_app', () => {
    const text = formatAppBuilderConsultationMessage({
      displayName: 'Smoke Test',
      description: 'Verify scaffold.',
      faIcon: 'fa-vial',
      catalogTag: { mode: 'assistant_recommend' },
    });
    expect(text).toContain('Recommend for me');
    expect(text).toContain('catalogTagIds');
    expect(text).toMatch(/same tool call/i);
    expect(text).not.toContain('PUT /api/platform/apps/catalog-tags');
  });
});

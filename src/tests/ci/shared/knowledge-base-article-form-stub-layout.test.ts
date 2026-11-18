import { layoutKnowledgeBaseArticleStubComponents } from '@/shared/lab-integrations/platform-catalog-form-stub-layout';

describe('layoutKnowledgeBaseArticleStubComponents', () => {
  test('places body on the third row, full width, as Textarea', () => {
    const laidOut = layoutKnowledgeBaseArticleStubComponents([
      { fieldKey: 'title', label: 'Title', type: 'InputText', row: 0, col: 0, span: 1 },
      { fieldKey: 'category', label: 'Category', type: 'InputText', row: 0, col: 1, span: 1 },
      { fieldKey: 'tags', label: 'Tags', type: 'InputText', row: 0, col: 2, span: 1 },
      { fieldKey: 'body', label: 'Body', type: 'InputText', row: 0, col: 3, span: 1 },
      { fieldKey: 'status', label: 'Status', type: 'Select', row: 1, col: 0, span: 1 },
      { fieldKey: 'author', label: 'Author', type: 'Select', row: 1, col: 1, span: 1 },
    ]);

    const body = laidOut.find((c) => c.fieldKey === 'body');
    expect(body?.row).toBe(2);
    expect(body?.col).toBe(0);
    expect(body?.span).toBe(4);
    expect(body?.type).toBe('Textarea');
  });
});

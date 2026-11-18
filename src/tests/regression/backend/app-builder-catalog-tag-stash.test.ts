import { describe, expect, test } from '@jest/globals';
import {
  consumeAppBuilderCatalogTags,
  rememberAppBuilderCatalogTags,
  rememberAppBuilderCatalogTagsFromSidecarContext,
} from '@/backend/db/AppTags/app-builder-catalog-tag-stash';
import {
  APP_BUILDER_HOST_CTX_CATALOG_TAG_LABEL,
  APP_BUILDER_HOST_CTX_PRIMARY_CATALOG_TAG_ID,
} from '@/shared/constants/app-builder-host-context';

describe('app-builder-catalog-tag-stash', () => {
  test('consume returns stashed tags once per user', () => {
    rememberAppBuilderCatalogTags(42, [{ id: 'demo-training', label: 'Demo training' }]);
    expect(consumeAppBuilderCatalogTags(42)).toEqual([{ id: 'demo-training', label: 'Demo training' }]);
    expect(consumeAppBuilderCatalogTags(42)).toBeUndefined();
  });

  test('rememberFromSidecarContext reads app_builder hostContext', () => {
    rememberAppBuilderCatalogTagsFromSidecarContext(7, {
      viewMode: 'apps_home',
      visibleAppIds: [],
      focusedAppId: null,
      toolProfile: 'app_builder',
      hostContext: {
        [APP_BUILDER_HOST_CTX_PRIMARY_CATALOG_TAG_ID]: 'examples',
        [APP_BUILDER_HOST_CTX_CATALOG_TAG_LABEL]: 'Examples',
      },
    });
    expect(consumeAppBuilderCatalogTags(7)).toEqual([{ id: 'examples', label: 'Examples' }]);
  });
});

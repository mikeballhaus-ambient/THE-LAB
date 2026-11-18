import { describe, test, expect, afterEach } from '@jest/globals';
import {

  getDefaultGoogleOidcRedirectUri,

  isGoogleOidcConfiguredInEnv,

  readGoogleOidcFromEnv,

} from '@/shared/config/lab-google-oidc-env.node';

import { isGoogleOidcConfigured } from '@/shared/config/lab-google-oidc.node';



describe('Google OIDC env helpers', () => {

  const env = process.env;



  afterEach(() => {

    process.env = { ...env };

  });



  test('isGoogleOidcConfiguredInEnv is false without env', () => {

    delete process.env.LAB_GOOGLE_OIDC_CLIENT_ID;

    delete process.env.LAB_GOOGLE_OIDC_CLIENT_SECRET;

    expect(isGoogleOidcConfiguredInEnv()).toBe(false);

  });



  test('isGoogleOidcConfiguredInEnv is true when client id and secret set', () => {

    process.env.LAB_GOOGLE_OIDC_CLIENT_ID = 'test-client';

    process.env.LAB_GOOGLE_OIDC_CLIENT_SECRET = 'test-secret';

    expect(isGoogleOidcConfiguredInEnv()).toBe(true);

  });



  test('default redirect URI points at platform callback', () => {

    delete process.env.LAB_GOOGLE_OIDC_REDIRECT_URI;

    process.env.BACKEND_URL = 'http://localhost:3000';

    expect(getDefaultGoogleOidcRedirectUri()).toBe(

      'http://localhost:3000/auth/oidc/google/callback',

    );

  });



  test('readGoogleOidcFromEnv returns credentials', () => {

    process.env.LAB_GOOGLE_OIDC_CLIENT_ID = 'a';

    process.env.LAB_GOOGLE_OIDC_CLIENT_SECRET = 'b';

    delete process.env.LAB_GOOGLE_OIDC_REDIRECT_URI;

    process.env.BACKEND_URL = 'http://localhost:3000';

    expect(readGoogleOidcFromEnv()).toEqual({

      clientId: 'a',

      clientSecret: 'b',

      redirectUri: 'http://localhost:3000/auth/oidc/google/callback',

    });

  });

});



describe('Google OIDC runtime (Settings database only)', () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
  });

  test('isGoogleOidcConfigured is false without DB settings', () => {
    delete process.env.LAB_GOOGLE_OIDC_CLIENT_ID;
    delete process.env.LAB_GOOGLE_OIDC_CLIENT_SECRET;
    process.env.LAB_GOOGLE_OIDC_CLIENT_ID = 'test-client';
    process.env.LAB_GOOGLE_OIDC_CLIENT_SECRET = 'test-secret';
    expect(isGoogleOidcConfigured()).toBe(false);
  });
});



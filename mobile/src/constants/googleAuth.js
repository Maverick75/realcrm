/**
 * Google OAuth client IDs from Google Cloud Console.
 * Use the Web client ID for Expo / id_token audience.
 * Add Android / iOS clients when building standalone apps.
 *
 * Must match GOOGLE_CLIENT_ID (or GOOGLE_CLIENT_IDS) on the backend.
 */
export const GOOGLE_WEB_CLIENT_ID =
  '220961113659-0e5o8q8coau2gd3c963rc284c382ahno.apps.googleusercontent.com';

// Optional: create Android OAuth client (package com.realcrm.app + SHA-1)
export const GOOGLE_ANDROID_CLIENT_ID = '';

// Optional: create iOS OAuth client (bundle com.realcrm.app)
export const GOOGLE_IOS_CLIENT_ID = '';

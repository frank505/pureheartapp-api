// Test script to verify OAuth callback URL construction
// This script tests the URL construction logic to ensure proper formatting

const testUrlConstruction = (baseUri: string, token: string, state?: string) => {
  console.log(`\nTesting URL construction with baseUri: ${baseUri}`);
  console.log(`Token: ${token}`);
  console.log(`State: ${state || 'none'}`);
  
  let redirectUrl: string;
  
  if (baseUri.startsWith('http://') || baseUri.startsWith('https://')) {
    // Standard HTTP URL - use URL constructor
    const url = new URL(baseUri);
    url.searchParams.set('ourownjwttoken', token);
    if (state) {
      url.searchParams.set('state', String(state));
    }
    redirectUrl = url.toString();
  } else {
    // Deep link URL - construct manually
    const separator = baseUri.includes('?') ? '&' : '?';
    redirectUrl = `${baseUri}${separator}ourownjwttoken=${encodeURIComponent(token)}`;
    if (state) {
      redirectUrl += `&state=${encodeURIComponent(String(state))}`;
    }
  }
  
  console.log(`Result: ${redirectUrl}`);
  return redirectUrl;
};

// Test cases
const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjIsImVtYWlsIjoiYWtwdWZyYW5rbGluNDQ0QGdtYWlsLmNvbSIsImZpcnN0TmFtZSI6ImZyYW5rbGluIiwibGFzdE5hbWUiOiJha3B1IiwidXNlcm5hbWUiOiJmcmFua2xpbmFrcHUxIiwiaWF0IjoxNzU4NDE0MzI5LCJleHAiOjE3NTkwMTkxMjl9.ZqiknWm864jyjdYEjvtLi_v8w9sW9FfZ5ljqJcN_jok';
const testState = '05364b7aa80a541f3e240307032641704e5fbab52dfe90000cae8cf8131912a6';

console.log('=== OAuth Callback URL Construction Tests ===');

// Test with deep link URL (current production case)
testUrlConstruction('pureheart://auth/callback', testToken, testState);

// Test with HTTP URL
testUrlConstruction('https://example.com/auth/callback', testToken, testState);

// Test with deep link URL that already has query params
testUrlConstruction('pureheart://auth/callback?existing=param', testToken, testState);

// Test without state
testUrlConstruction('pureheart://auth/callback', testToken);

console.log('\n=== Tests Complete ===');

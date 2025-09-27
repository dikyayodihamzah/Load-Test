import http from 'k6/http';
import { check, sleep, fail } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
export const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '10s', target: 3 },  // Ramp up to 3 users
    { duration: '20s', target: 3 },  // Stay at 3 users
    { duration: '10s', target: 0 },  // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'], // 95% of requests must complete below 3s
    http_req_failed: ['rate<0.05'],    // Error rate must be below 5%
    errors: ['rate<0.05'],             // Custom error rate must be below 5%
  },
};

// Base URL
const BASE_URL = 'https://dev-nearon.synapsis.id';

/// =============================== Negative Test Cases ===============================

export default function () {
  // Test Case 1: Login with wrong password
  console.log('=== Test Case 1: Login with wrong password ===');
  
  const wrongPasswordPayload = JSON.stringify({
    username: 'qaapiautomation',
    password: 'wrongpassword'
  });

  const loginParams = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const wrongPasswordResponse = http.post(`${BASE_URL}/api/auth/login`, wrongPasswordPayload, loginParams);
  
  // Check wrong password response - should fail
  const checkWrongPassword = check(wrongPasswordResponse, {
    'Wrong password should return 401 or 400': (response) => response.status === 401 || response.status === 400,
    'Wrong password response time < 3000ms': (response) => response.timings.duration < 3000,
    'Wrong password response has error message': (response) => response.body && response.body.length > 0,
  });

  if (!checkWrongPassword) {
    errorRate.add(1);
    fail(`Wrong password test failed - Expected 401/400 but got: ${wrongPasswordResponse.status}`);
  }

  console.log('Wrong password test passed!');
  console.log(`Wrong password response status: ${wrongPasswordResponse.status}`);
  console.log(`Wrong password response time: ${wrongPasswordResponse.timings.duration}ms`);
  
  // Parse and display error response
  try {
    const errorResponse = JSON.parse(wrongPasswordResponse.body);
    console.log('Wrong password error response (formatted):');
    console.log(JSON.stringify(errorResponse, null, 2));
  } catch (error) {
    console.log(`Wrong password response body (raw): ${wrongPasswordResponse.body}`);
  }

  sleep(1);

  // Test Case 2: Login with wrong username
  console.log('=== Test Case 2: Login with wrong username ===');
  
  const wrongUsernamePayload = JSON.stringify({
    username: 'wrongusername',
    password: 'password'
  });

  const wrongUsernameResponse = http.post(`${BASE_URL}/api/auth/login`, wrongUsernamePayload, loginParams);
  
  // Check wrong username response - should fail
  const checkWrongUsername = check(wrongUsernameResponse, {
    'Wrong username should return 401, 400, or 404': (response) => response.status === 401 || response.status === 400 || response.status === 404,
    'Wrong username response time < 3000ms': (response) => response.timings.duration < 3000,
    'Wrong username response has error message': (response) => response.body && response.body.length > 0,
  });

  if (!checkWrongUsername) {
    errorRate.add(1);
    fail(`Wrong username test failed - Expected 401/400/404 but got: ${wrongUsernameResponse.status}`);
  }

  console.log('Wrong username test passed!');
  console.log(`Wrong username response status: ${wrongUsernameResponse.status}`);
  console.log(`Wrong username response time: ${wrongUsernameResponse.timings.duration}ms`);
  
  // Parse and display error response
  try {
    const errorResponse = JSON.parse(wrongUsernameResponse.body);
    console.log('Wrong username error response (formatted):');
    console.log(JSON.stringify(errorResponse, null, 2));
  } catch (error) {
    console.log(`Wrong username response body (raw): ${wrongUsernameResponse.body}`);
  }

  sleep(1);

  // Test Case 3: Login with empty credentials
  console.log('=== Test Case 3: Login with empty credentials ===');
  
  const emptyCredentialsPayload = JSON.stringify({
    username: '',
    password: ''
  });

  const emptyCredentialsResponse = http.post(`${BASE_URL}/api/auth/login`, emptyCredentialsPayload, loginParams);
  
  // Check empty credentials response - should fail
  const checkEmptyCredentials = check(emptyCredentialsResponse, {
    'Empty credentials should return 400 or 422': (response) => response.status === 400 || response.status === 422,
    'Empty credentials response time < 3000ms': (response) => response.timings.duration < 3000,
    'Empty credentials response has error message': (response) => response.body && response.body.length > 0,
  });

  if (!checkEmptyCredentials) {
    errorRate.add(1);
    fail(`Empty credentials test failed - Expected 400/422 but got: ${emptyCredentialsResponse.status}`);
  }

  console.log('Empty credentials test passed!');
  console.log(`Empty credentials response status: ${emptyCredentialsResponse.status}`);
  console.log(`Empty credentials response time: ${emptyCredentialsResponse.timings.duration}ms`);
  
  // Parse and display error response
  try {
    const errorResponse = JSON.parse(emptyCredentialsResponse.body);
    console.log('Empty credentials error response (formatted):');
    console.log(JSON.stringify(errorResponse, null, 2));
  } catch (error) {
    console.log(`Empty credentials response body (raw): ${emptyCredentialsResponse.body}`);
  }

  sleep(1);

  // Test Case 4: Login with malformed JSON
  console.log('=== Test Case 4: Login with malformed JSON ===');
  
  const malformedJsonPayload = '{"username": "qaapiautomation", "password": "password"'; // Missing closing brace

  const malformedJsonResponse = http.post(`${BASE_URL}/api/auth/login`, malformedJsonPayload, loginParams);
  
  // Check malformed JSON response - should fail
  const checkMalformedJson = check(malformedJsonResponse, {
    'Malformed JSON should return 400': (response) => response.status === 400,
    'Malformed JSON response time < 3000ms': (response) => response.timings.duration < 3000,
    'Malformed JSON response has error message': (response) => response.body && response.body.length > 0,
  });

  if (!checkMalformedJson) {
    errorRate.add(1);
    fail(`Malformed JSON test failed - Expected 400 but got: ${malformedJsonResponse.status}`);
  }

  console.log('Malformed JSON test passed!');
  console.log(`Malformed JSON response status: ${malformedJsonResponse.status}`);
  console.log(`Malformed JSON response time: ${malformedJsonResponse.timings.duration}ms`);
  
  // Parse and display error response
  try {
    const errorResponse = JSON.parse(malformedJsonResponse.body);
    console.log('Malformed JSON error response (formatted):');
    console.log(JSON.stringify(errorResponse, null, 2));
  } catch (error) {
    console.log(`Malformed JSON response body (raw): ${malformedJsonResponse.body}`);
  }

  sleep(1);
}

export function handleSummary(data) {
  return {
    'results/example-login-negative-report.json': JSON.stringify(data, null, 2),
  };
}

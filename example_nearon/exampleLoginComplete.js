import http from 'k6/http';
import { check, sleep, fail } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics - harus dibuat di init context
export const errorRate = new Rate('errors');
export const loginDuration = new Trend('login_duration');
export const getUserDuration = new Trend('get_user_duration');
export const totalRequests = new Counter('total_requests');

// Test configuration
export const options = {
  stages: [
    { duration: '10s', target: 5 },  // Ramp up to 5 users
    { duration: '30s', target: 5 },  // Stay at 5 users
    { duration: '10s', target: 0 },  // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'], // 95% of requests must complete below 3s
    http_req_failed: ['rate<0.6'],     // Error rate must be below 60% (allowing negative test cases)
    errors: ['rate<0.1'],              // Custom error rate must be below 10%
    login_duration: ['p(95)<2000'],    // 95% of login requests must complete below 2s
    get_user_duration: ['p(95)<1000'], // 95% of get user requests must complete below 1s
    total_requests: ['count>0'],       // Must have at least 1 request
  },
  cloud: {
    // Project: example_performance_synapsis
    projectID: 4603007,
    // Test runs with the same name groups test runs together.
    name: 'Login Complete Test (22/09/2025-13:42:37)'
  }
};

// Base URL
const BASE_URL = 'https://dev-nearon.synapsis.id';

/// =============================== Complete Login Test Suite ===============================

export default function () {
  // Test Case 1: Login (Positive)
  console.log('=== Test Case 1: Login ===');
  
  const loginPayload = JSON.stringify({
    username: 'qaapiautomation',
    password: 'password'
  });

  const loginParams = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const loginResponse = http.post(`${BASE_URL}/api/auth/login`, loginPayload, loginParams);
  
  // Add custom metrics
  loginDuration.add(loginResponse.timings.duration);
  totalRequests.add(1);
  
  // Check login response
  const checkLogin = check(loginResponse, {
    'login response must 200': (response) => response.status === 200,
    'login response time < 3000ms': (response) => response.timings.duration < 3000,
    'login response has body': (response) => response.body && response.body.length > 0,
  });

  if (!checkLogin) {
    errorRate.add(1);
    fail(`Failed to login user: qaapiautomation - Status: ${loginResponse.status}`);
  }

  console.log('Login successful!');
  console.log(`Login response status: ${loginResponse.status}`);
  console.log(`Login response time: ${loginResponse.timings.duration}ms`);

  // Extract cookies from login response
  const cookies = loginResponse.headers['Set-Cookie'];
  console.log(`Login cookies: ${cookies}`);

  sleep(1);

  // Test Case 2: Get Current User (Positive)
  console.log('=== Test Case 2: Get Current User ===');
  
  // Parse cookies properly
  let cookieString = '';
  if (cookies) {
    cookieString = cookies;
  }
  
  const getUserParams = {
    headers: {
      'Cookie': cookieString,
      'Content-Type': 'application/json',
    },
  };

  const currentUserResponse = http.get(`${BASE_URL}/api/users/company/ajbdjyzk1w/users?page=1&limit=10`, getUserParams);
  
  // Add custom metrics
  getUserDuration.add(currentUserResponse.timings.duration);
  totalRequests.add(1);
  
  // Check current user response
  const checkCurrent = check(currentUserResponse, {
    'current response must 200': (response) => response.status === 200,
    'current response time < 3000ms': (response) => response.timings.duration < 3000,
    'current response has body': (response) => response.body && response.body.length > 0,
  });

  if (!checkCurrent) {
    errorRate.add(1);
    fail(`Failed to get current user - Status: ${currentUserResponse.status}`);
  }

  console.log('Get current user successful!');
  console.log(`Current user response status: ${currentUserResponse.status}`);
  console.log(`Current user response time: ${currentUserResponse.timings.duration}ms`);
  
  // Parse and pretty print JSON response
  try {
    const jsonResponse = JSON.parse(currentUserResponse.body);
    console.log('Current user response body (formatted):');
    console.log(JSON.stringify(jsonResponse, null, 2));
  } catch (error) {
    console.log(`Current user response body (raw): ${currentUserResponse.body}`);
  }

  sleep(1);

  /// =============================== Login with Wrong Password ===============================

  // Test Case 3: Login with Wrong Password (Negative)
  console.log('=== Test Case 3: Login with Wrong Password ===');
  
  const wrongPasswordPayload = JSON.stringify({
    username: 'qaapiautomation',
    password: 'wrongpassword'
  });

  const wrongPasswordResponse = http.post(`${BASE_URL}/api/auth/login`, wrongPasswordPayload, loginParams);
  
  // Add custom metrics
  totalRequests.add(1);
  
  // Check wrong password response - should fail
  const checkWrongPassword = check(wrongPasswordResponse, {
    'wrong password should return 400': (response) => response.status === 400,
    'wrong password response time < 3000ms': (response) => response.timings.duration < 3000,
    'wrong password response has error message': (response) => response.body && response.body.length > 0,
  });

  if (!checkWrongPassword) {
    errorRate.add(1);
    fail(`Wrong password test failed - Expected 400 but got: ${wrongPasswordResponse.status}`);
  }

  console.log('Wrong password test passed!');
  console.log(`Wrong password response status: ${wrongPasswordResponse.status}`);
  console.log(`Wrong password response time: ${wrongPasswordResponse.timings.duration}ms`);

  sleep(1);

  /// =============================== Login with Wrong Username ===============================

  // Test Case 4: Login with Wrong Username (Negative)
  console.log('=== Test Case 4: Login with Wrong Username ===');
  
  const wrongUsernamePayload = JSON.stringify({
    username: 'wrongusername',
    password: 'password'
  });

  const wrongUsernameResponse = http.post(`${BASE_URL}/api/auth/login`, wrongUsernamePayload, loginParams);
  
  // Add custom metrics
  totalRequests.add(1);
  
  // Check wrong username response - should fail
  const checkWrongUsername = check(wrongUsernameResponse, {
    'wrong username should return 404': (response) => response.status === 404,
    'wrong username response time < 3000ms': (response) => response.timings.duration < 3000,
    'wrong username response has error message': (response) => response.body && response.body.length > 0,
  });

  if (!checkWrongUsername) {
    errorRate.add(1);
    fail(`Wrong username test failed - Expected 404 but got: ${wrongUsernameResponse.status}`);
  }

  console.log('Wrong username test passed!');
  console.log(`Wrong username response status: ${wrongUsernameResponse.status}`);
  console.log(`Wrong username response time: ${wrongUsernameResponse.timings.duration}ms`);

  sleep(1);

  /// =============================== Login with Empty Credentials ===============================

  // Test Case 5: Login with Empty Credentials (Negative)
  console.log('=== Test Case 5: Login with Empty Credentials ===');
  
  const emptyCredentialsPayload = JSON.stringify({
    username: '',
    password: ''
  });

  const emptyCredentialsResponse = http.post(`${BASE_URL}/api/auth/login`, emptyCredentialsPayload, loginParams);
  
  // Add custom metrics
  totalRequests.add(1);
  
  // Check empty credentials response - should fail
  const checkEmptyCredentials = check(emptyCredentialsResponse, {
    'empty credentials should return 400': (response) => response.status === 400,
    'empty credentials response time < 3000ms': (response) => response.timings.duration < 3000,
    'empty credentials response has error message': (response) => response.body && response.body.length > 0,
  });

  if (!checkEmptyCredentials) {
    errorRate.add(1);
    fail(`Empty credentials test failed - Expected 400 but got: ${emptyCredentialsResponse.status}`);
  }

  console.log('Empty credentials test passed!');
  console.log(`Empty credentials response status: ${emptyCredentialsResponse.status}`);
  console.log(`Empty credentials response time: ${emptyCredentialsResponse.timings.duration}ms`);

  sleep(1);
}

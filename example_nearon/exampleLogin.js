import http from 'k6/http';
import { check, sleep, fail } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
export const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '10s', target: 5 },  // Ramp up to 5 users
    { duration: '30s', target: 5 },  // Stay at 5 users
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

/// =============================== Login ===============================

export default function () {
  // Step 1: Login
  console.log('Starting Login test...');
  
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
  
  // Check login response
  const checkLogin = check(loginResponse, {
    'Login response must be 200': (response) => response.status === 200,
    'Login response time < 3000ms': (response) => response.timings.duration < 3000,
    'Login response has body': (response) => response.body && response.body.length > 0,
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

/// =============================== Get User ===============================

  // Step 2: Get User
  console.log('Starting Get User test...');
  
  // Parse cookies properly - cookies is already a string
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

  // Try a simpler endpoint first
  const getUserResponse = http.get(
    `${BASE_URL}/api/users/company/ajbdjyzk1w/users?page=1&limit=10`,
    getUserParams
  );

  // Check get user response
  console.log(`Get User response status: ${getUserResponse.status}`);
  console.log(`Get User response time: ${getUserResponse.timings.duration}ms`);
  
  const checkGetUser = check(getUserResponse, {
    'Get User response must be 200': (response) => response.status === 200,
    'Get User response time < 3000ms': (response) => response.timings.duration < 3000,
    'Get User response has body': (response) => response.body && response.body.length > 0,
  });

  if (!checkGetUser) {
    errorRate.add(1);
    fail(`Failed to get user data - Status: ${getUserResponse.status}`);
  }

  console.log('Get User successful!');
  console.log(`Get User response body length: ${getUserResponse.body.length} characters`);
  
  // Parse and pretty print JSON response
  try {
    const jsonResponse = JSON.parse(getUserResponse.body);
    console.log('Get User response body (formatted):');
    console.log(JSON.stringify(jsonResponse, null, 2));
  } catch (error) {
    console.log(`Get User response body (raw): ${getUserResponse.body}`);
  }

  // Sleep between iterations
  sleep(1);
}

export function handleSummary(data) {
  return {
    'results/example-login-report.json': JSON.stringify(data, null, 2),
  };
}

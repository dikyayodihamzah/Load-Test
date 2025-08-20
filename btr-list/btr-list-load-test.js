import http from 'k6/http';
import { check, sleep } from 'k6';

// Load test configuration
export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Ramp up to 20 users over 30 seconds
    { duration: '1m', target: 20 },  // Stay at 20 users for 1 minute
    { duration: '30s', target: 0 },  // Ramp down to 0 users over 30 seconds
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'], // 95% of requests should be below 3s
    http_req_failed: ['rate<0.05'],    // Error rate should be below 5%
  },
};

// Test data - replace with your actual token
const TOKEN_ESS = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzZXNzaW9uX2lkIjoiMzdmMTc1M2ItMmRmYi00MjJkLWI2NjEtMDk2ZjE4OWU0NjRiIiwiYWxsb3dlZF9hcHBzIjpbIkVTUyIsIlJBQSIsIk1PQ0EiLCIwMDFNIiwiVENTIiwiTE1TLU9QRCIsIkxNUy1PUEQtQURNSU4iLCJNRURJQyIsIlNDTSIsIlFIU0UiXSwibGV2ZWwiOiIxIiwicGVybWlzc2lvbnMiOlsxLDEzLDE0LDE1LDIyLDIzLDI0LDI1LDI2LDI3LDI4LDI5LDMwLDMxLDMyLDMzLDM0LDM1LDM2LDM3LDM4LDM5LDQwLDQxLDQyLDQzLDQ0LDQ1LDQ2LDQ3LDQ4XSwiZXhwIjoxNzU1NjgwMzYwLCJpc3MiOiIxMDEwIn0.GhHsTOdqVWPEvyBLilbwRYOvhtXGDpOaXQeftSRtbjE';
const REFRESH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzZXNzaW9uX2lkIjoiMzdmMTc1M2ItMmRmYi00MjJkLWI2NjEtMDk2ZjE4OWU0NjRiIiwiZXhwIjoxNzU4MTg1OTYwLCJpc3MiOiIxMDEwIn0.UEZwZ_9m5_4EuvYSlwxQ4ZDOp0JG8YJDeIwcsEfpMhM';
const TOKEN_QHSE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJsZXZlbCI6IjIiLCJwZXJtaXNzaW9ucyI6W3siaWQiOjF9LHsiaWQiOjJ9LHsiaWQiOjN9LHsiaWQiOjR9LHsiaWQiOjV9LHsiaWQiOjZ9LHsiaWQiOjd9LHsiaWQiOjh9LHsiaWQiOjEwMX0seyJpZCI6MTAyfSx7ImlkIjoxMDN9LHsiaWQiOjEwNX0seyJpZCI6MTEwfSx7ImlkIjoxMTJ9LHsiaWQiOjExM30seyJpZCI6MTE1fSx7ImlkIjoxMTZ9LHsiaWQiOjExN30seyJpZCI6MTE5fSx7ImlkIjoxMjB9LHsiaWQiOjEyMX0seyJpZCI6MTIyfSx7ImlkIjoxMjN9LHsiaWQiOjEyNH0seyJpZCI6MTI4fSx7ImlkIjoxMjl9LHsiaWQiOjEzMX0seyJpZCI6MTM1fSx7ImlkIjoxMzZ9XSwiZXhwIjoxNzU1NjgwMzY3LCJpc3MiOiIxMDEwIn0.1mVXNTRZXyr0mOLFUDLzTXFZSf4Q_5HwTgCyLiQY4Us';

export default function () {
  // Request headers matching the curl command
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:141.0) Gecko/20100101 Firefox/141.0',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Referer': 'https://super-apps.madhani.id/btr/ticket?tz=7&tab=active&segment=ticketing',
    'Connection': 'keep-alive',
    'Cookie': `token_ess=${TOKEN_ESS}; refresh_token=${REFRESH_TOKEN}; token_qhse=${TOKEN_QHSE}`,
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'TE': 'trailers'
  };

  // API endpoint with query parameters
  const url = 'https://super-apps.madhani.id/api/btr/ticketing-folder/list?tz=7&tab=active&segment=ticketing';

  // Make the HTTP GET request
  const response = http.get(url, { headers });

  // Validate the response
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 2000ms': (r) => r.timings.duration < 2000,
    'response has data': (r) => r.body && r.body.length > 0,
    'content type is JSON': (r) => r.headers['Content-Type'] && r.headers['Content-Type'].includes('application/json'),
  });

  // Optional: Log response details for debugging
  if (response.status !== 200) {
    console.log(`Request failed with status ${response.status}: ${response.body}`);
  }

  // Wait 1 second between requests
  sleep(1);
}

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
let errorRate = new Rate('errors');
let responseTimeTrend = new Trend('response_time');
let requestCounter = new Counter('requests_total');

// Load test configuration
export let options = {
  stages: [
    // Ramp-up: gradually increase load
    { duration: '2m', target: 10 },   // Ramp up to 10 users over 2 minutes
    { duration: '5m', target: 10 },   // Stay at 10 users for 5 minutes
    { duration: '2m', target: 20 },   // Ramp up to 20 users over 2 minutes
    { duration: '5m', target: 20 },   // Stay at 20 users for 5 minutes
    { duration: '2m', target: 50 },   // Ramp up to 50 users over 2 minutes
    { duration: '5m', target: 50 },   // Stay at 50 users for 5 minutes
    { duration: '2m', target: 0 },    // Ramp down to 0 users over 2 minutes
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.05'],   // Error rate should be less than 5%
    errors: ['rate<0.05'],            // Custom error rate should be less than 5%
  },
};

// Configuration object - customize these for your endpoints
const config = {
  baseUrl: 'https://super-apps.madhani.id/api', 
  endpoints: {
    // GET endpoint example
    getApproval: '/approval?tz=7&tab=active&sequence=2&limit=10',
    
    // // POST endpoint example
    // createUser: '/api/users',
    
    // // PUT endpoint example
    // updateUser: '/api/users/{id}',
    
    // // DELETE endpoint example
    // deleteUser: '/api/users/{id}',
    
    // // Additional endpoints - add your own here
    // getProducts: '/api/products',
    // createOrder: '/api/orders',
    // getOrders: '/api/orders',
  },
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    // Add authentication headers if needed
    'Cookie': 'token_ess=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzZXNzaW9uX2lkIjoiMzdmMTc1M2ItMmRmYi00MjJkLWI2NjEtMDk2ZjE4OWU0NjRiIiwiYWxsb3dlZF9hcHBzIjpbIkVTUyIsIlJBQSIsIk1PQ0EiLCIwMDFNIiwiVENTIiwiTE1TLU9QRCIsIkxNUy1PUEQtQURNSU4iLCJNRURJQyIsIlNDTSIsIlFIU0UiXSwibGV2ZWwiOiIxIiwicGVybWlzc2lvbnMiOlsxLDEzLDE0LDE1LDIyLDIzLDI0LDI1LDI2LDI3LDI4LDI5LDMwLDMxLDMyLDMzLDM0LDM1LDM2LDM3LDM4LDM5LDQwLDQxLDQyLDQzLDQ0LDQ1LDQ2LDQ3LDQ4XSwiZXhwIjoxNzU1NjgwMzYwLCJpc3MiOiIxMDEwIn0.GhHsTOdqVWPEvyBLilbwRYOvhtXGDpOaXQeftSRtbjE; refresh_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzZXNzaW9uX2lkIjoiMzdmMTc1M2ItMmRmYi00MjJkLWI2NjEtMDk2ZjE4OWU0NjRiIiwiZXhwIjoxNzU4MTg1OTYwLCJpc3MiOiIxMDEwIn0.UEZwZ_9m5_4EuvYSlwxQ4ZDOp0JG8YJDeIwcsEfpMhM; token_qhse=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJsZXZlbCI6IjIiLCJwZXJtaXNzaW9ucyI6W3siaWQiOjF9LHsiaWQiOjJ9LHsiaWQiOjN9LHsiaWQiOjR9LHsiaWQiOjV9LHsiaWQiOjZ9LHsiaWQiOjd9LHsiaWQiOjh9LHsiaWQiOjEwMX0seyJpZCI6MTAyfSx7ImlkIjoxMDN9LHsiaWQiOjEwNX0seyJpZCI6MTEwfSx7ImlkIjoxMTJ9LHsiaWQiOjExM30seyJpZCI6MTE1fSx7ImlkIjoxMTZ9LHsiaWQiOjExN30seyJpZCI6MTE5fSx7ImlkIjoxMjB9LHsiaWQiOjEyMX0seyJpZCI6MTIyfSx7ImlkIjoxMjN9LHsiaWQiOjEyNH0seyJpZCI6MTI4fSx7ImlkIjoxMjl9LHsiaWQiOjEzMX0seyJpZCI6MTM1fSx7ImlkIjoxMzZ9XSwiZXhwIjoxNzU1NjgwMzY3LCJpc3MiOiIxMDEwIn0.1mVXNTRZXyr0mOLFUDLzTXFZSf4Q_5HwTgCyLiQY4Us' ,
  },
  // Test data
//   testData: {
//     users: [
//       { name: 'John Doe', email: 'john@example.com', age: 30 },
//       { name: 'Jane Smith', email: 'jane@example.com', age: 25 },
//       { name: 'Bob Johnson', email: 'bob@example.com', age: 35 },
//     ],
//     products: [
//       { name: 'Product A', price: 29.99, category: 'Electronics' },
//       { name: 'Product B', price: 19.99, category: 'Books' },
//     ],
//   },
};

// Helper function to get random item from array
function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Helper function to generate random ID
function getRandomId() {
  return Math.floor(Math.random() * 1000) + 1;
}

// Helper function to make HTTP request with error handling
function makeRequest(method, url, payload = null, params = {}) {
  requestCounter.add(1);
  
  const options = {
    headers: config.headers,
    ...params,
  };
  
  let response;
  const startTime = Date.now();
  
  try {
    switch (method.toLowerCase()) {
      case 'get':
        response = http.get(url, options);
        break;
      case 'post':
        response = http.post(url, JSON.stringify(payload), options);
        break;
      case 'put':
        response = http.put(url, JSON.stringify(payload), options);
        break;
      case 'delete':
        response = http.del(url, null, options);
        break;
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }
  } catch (error) {
    console.error(`Request failed: ${error.message}`);
    errorRate.add(1);
    return null;
  }
  
  const endTime = Date.now();
  responseTimeTrend.add(endTime - startTime);
  
  // Check response status
  const isSuccess = check(response, {
    [`${method.toUpperCase()} ${url} - Status is 2xx`]: (r) => r.status >= 200 && r.status < 300,
    [`${method.toUpperCase()} ${url} - Response time < 1000ms`]: (r) => r.timings.duration < 1000,
  });
  
  if (!isSuccess) {
    errorRate.add(1);
    console.error(`Request failed: ${method.toUpperCase()} ${url} - Status: ${response.status}`);
  }
  
  return response;
}

// Test scenario 1: GET requests
function testGetEndpoints() {
//get approval
  makeRequest('GET', `${config.baseUrl}${config.endpoints.getApproval}`);
  
//   // Test getting specific user by ID
//   const userId = getRandomId();
//   const getUserUrl = `${config.baseUrl}${config.endpoints.getUserById.replace('{id}', userId)}`;
//   makeRequest('GET', getUserUrl);
  
//   // Test getting products
//   makeRequest('GET', `${config.baseUrl}${config.endpoints.getProducts}`);
}

// Test scenario 2: POST requests (Create operations)
// function testPostEndpoints() {
//   // Create a new user
//   const userData = getRandomItem(config.testData.users);
//   const createUserResponse = makeRequest('POST', `${config.baseUrl}${config.endpoints.createUser}`, userData);
  
//   // Create a new order (example)
//   const orderData = {
//     userId: getRandomId(),
//     products: [
//       { productId: getRandomId(), quantity: 2 },
//       { productId: getRandomId(), quantity: 1 },
//     ],
//     totalAmount: 89.97,
//   };
//   makeRequest('POST', `${config.baseUrl}${config.endpoints.createOrder}`, orderData);
  
//   return createUserResponse;
// }

// // Test scenario 3: PUT requests (Update operations)
// function testPutEndpoints() {
//   const userId = getRandomId();
//   const updateData = {
//     name: 'Updated Name',
//     email: 'updated@example.com',
//     age: 28,
//   };
  
//   const updateUrl = `${config.baseUrl}${config.endpoints.updateUser.replace('{id}', userId)}`;
//   makeRequest('PUT', updateUrl, updateData);
// }

// // Test scenario 4: DELETE requests
// function testDeleteEndpoints() {
//   const userId = getRandomId();
//   const deleteUrl = `${config.baseUrl}${config.endpoints.deleteUser.replace('{id}', userId)}`;
//   makeRequest('DELETE', deleteUrl);
// }

// // Test scenario 5: Mixed workflow (realistic user journey)
// function testUserWorkflow() {
//   // 1. Get list of users
//   makeRequest('GET', `${config.baseUrl}${config.endpoints.getUsers}`);
//   sleep(1); // Think time
  
//   // 2. Create a new user
//   const userData = getRandomItem(config.testData.users);
//   const createResponse = makeRequest('POST', `${config.baseUrl}${config.endpoints.createUser}`, userData);
  
//   if (createResponse && createResponse.status === 201) {
//     sleep(0.5);
    
//     // 3. Get the created user (assuming response contains user ID)
//     try {
//       const createdUser = JSON.parse(createResponse.body);
//       if (createdUser.id) {
//         const getUserUrl = `${config.baseUrl}${config.endpoints.getUserById.replace('{id}', createdUser.id)}`;
//         makeRequest('GET', getUserUrl);
//         sleep(0.5);
        
//         // 4. Update the user
//         const updateData = { ...userData, age: userData.age + 1 };
//         const updateUrl = `${config.baseUrl}${config.endpoints.updateUser.replace('{id}', createdUser.id)}`;
//         makeRequest('PUT', updateUrl, updateData);
//       }
//     } catch (e) {
//       console.warn('Could not parse create user response');
//     }
//   }
// }

// Main test function - this runs for each virtual user
export default function () {
  // Randomly choose which test scenario to run (weighted distribution)
  const rand = Math.random();
  
  if (rand < 0.4) {
    // 40% - GET requests (most common)
    testGetEndpoints();
  } 
//   else if (rand < 0.6) {
//     // 20% - POST requests
//     testPostEndpoints();
//   } else if (rand < 0.75) {
//     // 15% - PUT requests
//     testPutEndpoints();
//   } else if (rand < 0.85) {
//     // 10% - DELETE requests
//     testDeleteEndpoints();
//   } else {
//     // 15% - Complete user workflow
//     testUserWorkflow();
//   }
  
  // Random sleep between requests (1-3 seconds)
  sleep(Math.random() * 2 + 1);
}

// Setup function - runs once before the test starts
export function setup() {
  console.log('🚀 Starting load test...');
  console.log(`📊 Target URL: ${config.baseUrl}`);
  console.log(`⏱️  Test duration: ~23 minutes`);
  console.log(`👥 Max concurrent users: 50`);
  console.log('');
  
  // Optional: Perform any setup operations here
  // e.g., authentication, data preparation, etc.
  
  return { timestamp: new Date().toISOString() };
}

// Teardown function - runs once after the test completes
export function teardown(data) {
  console.log('');
  console.log('✅ Load test completed!');
  console.log(`📈 Test started at: ${data.timestamp}`);
  console.log(`🏁 Test ended at: ${new Date().toISOString()}`);
  
  // Optional: Perform cleanup operations here
  // e.g., clean up test data, send notifications, etc.
}

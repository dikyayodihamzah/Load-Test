import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Load configuration from JSON file
const config = JSON.parse(open('./config.json'));

// Custom metrics (only if enabled)
let errorRate = config.settings.enableCustomMetrics ? new Rate('errors') : null;
let responseTimeTrend = config.settings.enableCustomMetrics ? new Trend('response_time') : null;
let requestCounter = config.settings.enableCustomMetrics ? new Counter('requests_total') : null;

// Load test configuration - can be overridden via environment variables
const LOAD_PROFILE = __ENV.LOAD_PROFILE || 'medium'; // light, medium, heavy, spike
const BASE_URL = __ENV.BASE_URL || config.baseUrl;

export let options = {
  stages: config.loadProfile[LOAD_PROFILE],
  thresholds: config.thresholds,
};

// Helper function to get random item from array
function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Helper function to generate random ID
function getRandomId() {
  return Math.floor(Math.random() * 1000) + 1;
}

// Helper function to log messages (respects logging setting)
function log(message) {
  if (config.settings.enableDetailedLogs) {
    console.log(message);
  }
}

// Helper function to build headers with authentication
function buildHeaders() {
  let headers = { ...config.headers };
  
  if (config.authentication.enabled) {
    switch (config.authentication.type) {
      case 'bearer':
        headers['Authorization'] = `Bearer ${config.authentication.token}`;
        break;
      case 'basic':
        // Add basic auth if needed
        break;
      case 'api-key':
        headers['X-API-Key'] = config.authentication.token;
        break;
    }
  }
  
  return headers;
}

// Enhanced HTTP request function with better error handling and metrics
function makeRequest(method, url, payload = null, params = {}) {
  if (requestCounter) requestCounter.add(1);
  
  const options = {
    headers: buildHeaders(),
    timeout: '30s',
    ...params,
  };
  
  let response;
  const startTime = Date.now();
  
  try {
    log(`Making ${method.toUpperCase()} request to: ${url}`);
    
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
      case 'patch':
        response = http.patch(url, JSON.stringify(payload), options);
        break;
      case 'delete':
        response = http.del(url, null, options);
        break;
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }
  } catch (error) {
    console.error(`Request failed: ${error.message}`);
    if (errorRate) errorRate.add(1);
    return null;
  }
  
  const endTime = Date.now();
  if (responseTimeTrend) responseTimeTrend.add(endTime - startTime);
  
  // Enhanced response checks
  const isSuccess = check(response, {
    [`${method.toUpperCase()} ${url} - Status is successful`]: (r) => r.status >= 200 && r.status < 300,
    [`${method.toUpperCase()} ${url} - Response time OK`]: (r) => r.timings.duration < 1000,
    [`${method.toUpperCase()} ${url} - Has response body`]: (r) => r.body && r.body.length > 0,
  });
  
  if (!isSuccess) {
    if (errorRate) errorRate.add(1);
    console.error(`Request failed: ${method.toUpperCase()} ${url} - Status: ${response.status}, Body: ${response.body}`);
  } else {
    log(`✅ ${method.toUpperCase()} ${url} - Status: ${response.status}, Duration: ${response.timings.duration}ms`);
  }
  
  return response;
}

// Test scenario 1: GET requests
function testGetEndpoints() {
  // Test getting all users
  makeRequest('GET', `${BASE_URL}${config.endpoints.getUsers}`);
  
  // Test getting specific user by ID
  const userId = getRandomId();
  const getUserUrl = `${BASE_URL}${config.endpoints.getUserById.replace('{id}', userId)}`;
  makeRequest('GET', getUserUrl);
  
  // Test getting products
  makeRequest('GET', `${BASE_URL}${config.endpoints.getProducts}`);
  
  // Test getting orders
  makeRequest('GET', `${BASE_URL}${config.endpoints.getOrders}`);
}

// Test scenario 2: POST requests (Create operations)
function testPostEndpoints() {
  // Create a new user
  const userData = getRandomItem(config.testData.users);
  const createUserResponse = makeRequest('POST', `${BASE_URL}${config.endpoints.createUser}`, userData);
  
  // Create a new order
  const orderData = {
    userId: getRandomId(),
    products: [
      { productId: getRandomId(), quantity: Math.floor(Math.random() * 5) + 1 },
      { productId: getRandomId(), quantity: Math.floor(Math.random() * 3) + 1 },
    ],
    totalAmount: Math.round((Math.random() * 200 + 20) * 100) / 100,
    orderDate: new Date().toISOString(),
  };
  makeRequest('POST', `${BASE_URL}${config.endpoints.createOrder}`, orderData);
  
  return createUserResponse;
}

// Test scenario 3: PUT requests (Update operations)
function testPutEndpoints() {
  const userId = getRandomId();
  const updateData = {
    ...getRandomItem(config.testData.users),
    updatedAt: new Date().toISOString(),
  };
  
  const updateUrl = `${BASE_URL}${config.endpoints.updateUser.replace('{id}', userId)}`;
  makeRequest('PUT', updateUrl, updateData);
}

// Test scenario 4: DELETE requests
function testDeleteEndpoints() {
  const userId = getRandomId();
  const deleteUrl = `${BASE_URL}${config.endpoints.deleteUser.replace('{id}', userId)}`;
  makeRequest('DELETE', deleteUrl);
}

// Test scenario 5: Complex user workflow
function testUserWorkflow() {
  log('🔄 Starting user workflow test');
  
  // 1. Get list of users (browsing)
  makeRequest('GET', `${BASE_URL}${config.endpoints.getUsers}`);
  sleep(Math.random() * 2 + 0.5); // User thinks time
  
  // 2. Get products (browsing)
  makeRequest('GET', `${BASE_URL}${config.endpoints.getProducts}`);
  sleep(Math.random() * 2 + 0.5);
  
  // 3. Create a new user (registration)
  const userData = getRandomItem(config.testData.users);
  const createResponse = makeRequest('POST', `${BASE_URL}${config.endpoints.createUser}`, userData);
  
  if (createResponse && createResponse.status >= 200 && createResponse.status < 300) {
    sleep(Math.random() + 0.5);
    
    // 4. Try to get the created user
    try {
      const createdUser = JSON.parse(createResponse.body);
      if (createdUser && createdUser.id) {
        const getUserUrl = `${BASE_URL}${config.endpoints.getUserById.replace('{id}', createdUser.id)}`;
        makeRequest('GET', getUserUrl);
        sleep(Math.random() + 0.5);
        
        // 5. Update the user profile
        const updateData = { 
          ...userData, 
          age: userData.age + Math.floor(Math.random() * 5),
          updatedAt: new Date().toISOString()
        };
        const updateUrl = `${BASE_URL}${config.endpoints.updateUser.replace('{id}', createdUser.id)}`;
        makeRequest('PUT', updateUrl, updateData);
        sleep(Math.random() + 0.5);
        
        // 6. Create an order for this user
        const orderData = {
          userId: createdUser.id,
          products: [getRandomItem(config.testData.products)],
          totalAmount: Math.round(Math.random() * 100 * 100) / 100,
        };
        makeRequest('POST', `${BASE_URL}${config.endpoints.createOrder}`, orderData);
      }
    } catch (e) {
      log(`⚠️  Could not parse create user response: ${e.message}`);
    }
  }
  
  log('✅ User workflow completed');
}

// Main test function - runs for each virtual user
export default function () {
  const rand = Math.random();
  const weights = config.scenarios.weights;
  
  // Use weighted random selection for test scenarios
  if (rand < weights.get_requests) {
    testGetEndpoints();
  } else if (rand < weights.get_requests + weights.post_requests) {
    testPostEndpoints();
  } else if (rand < weights.get_requests + weights.post_requests + weights.put_requests) {
    testPutEndpoints();
  } else if (rand < weights.get_requests + weights.post_requests + weights.put_requests + weights.delete_requests) {
    testDeleteEndpoints();
  } else {
    testUserWorkflow();
  }
  
  // Random sleep between requests
  const minSleep = config.settings.minSleepTime;
  const maxSleep = config.settings.maxSleepTime;
  const sleepTime = Math.random() * (maxSleep - minSleep) + minSleep;
  sleep(sleepTime);
}

// Setup function - runs once before the test starts
export function setup() {
  console.log('🚀 Starting configurable k6 load test...');
  console.log('='.repeat(50));
  console.log(`📊 Target URL: ${BASE_URL}`);
  console.log(`🎯 Load Profile: ${LOAD_PROFILE}`);
  console.log(`👥 Load Stages:`);
  config.loadProfile[LOAD_PROFILE].forEach((stage, index) => {
    console.log(`   Stage ${index + 1}: ${stage.duration} with ${stage.target} users`);
  });
  console.log(`📈 Thresholds:`);
  Object.entries(config.thresholds).forEach(([metric, threshold]) => {
    console.log(`   ${metric}: ${threshold.join(', ')}`);
  });
  console.log(`🔐 Authentication: ${config.authentication.enabled ? 'Enabled' : 'Disabled'}`);
  console.log(`📝 Detailed Logs: ${config.settings.enableDetailedLogs ? 'Enabled' : 'Disabled'}`);
  console.log('='.repeat(50));
  console.log('');
  
  // Test connectivity
  console.log('🔍 Testing connectivity...');
  const testResponse = http.get(BASE_URL, { timeout: '10s' });
  if (testResponse.status === 0) {
    console.error('❌ Failed to connect to the target URL. Please check your configuration.');
  } else {
    console.log(`✅ Connected successfully (Status: ${testResponse.status})`);
  }
  console.log('');
  
  return { 
    timestamp: new Date().toISOString(),
    loadProfile: LOAD_PROFILE,
    baseUrl: BASE_URL 
  };
}

// Teardown function - runs once after the test completes
export function teardown(data) {
  console.log('');
  console.log('='.repeat(50));
  console.log('✅ Load test completed!');
  console.log(`📊 Load Profile: ${data.loadProfile}`);
  console.log(`🎯 Target URL: ${data.baseUrl}`);
  console.log(`⏰ Started: ${data.timestamp}`);
  console.log(`🏁 Ended: ${new Date().toISOString()}`);
  console.log('='.repeat(50));
  
  // Calculate test duration
  const startTime = new Date(data.timestamp);
  const endTime = new Date();
  const duration = Math.round((endTime - startTime) / 1000);
  console.log(`📏 Total Duration: ${Math.floor(duration / 60)}m ${duration % 60}s`);
  console.log('');
  console.log('💡 Tip: Check the summary report above for detailed metrics!');
}

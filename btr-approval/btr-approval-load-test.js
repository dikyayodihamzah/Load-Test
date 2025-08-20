import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Load configuration from JSON file
const configRaw = open('./config.json');
const config = JSON.parse(configRaw);

// Replace environment variable placeholders with actual values
function resolveEnvironmentVariables(obj) {
  const envPattern = /\$\{([^}]+)\}/g;
  const jsonStr = JSON.stringify(obj);
  const resolvedStr = jsonStr.replace(envPattern, (match, envVar) => {
    // Handle default values: ${VAR_NAME:-default_value}
    const [varName, defaultValue] = envVar.split(':-');
    const value = __ENV[varName];
    
    if (value) {
      return value;
    } else if (defaultValue !== undefined) {
      console.log(`ℹ️  Using default value for ${varName}: ${defaultValue}`);
      return defaultValue;
    } else {
      console.warn(`⚠️  Environment variable ${varName} is not set and no default provided.`);
      return match; // Keep placeholder if env var not found and no default
    }
  });
  return JSON.parse(resolvedStr);
}

// Resolve environment variables in config
const resolvedConfig = resolveEnvironmentVariables(config);

// Custom metrics for BTR Approval API
let errorRate = new Rate('btr_errors');
let responseTimeTrend = new Trend('btr_response_time');
let requestCounter = new Counter('btr_requests_total');
let approvalFetchCounter = new Counter('approval_fetches');

// Load test configuration
const LOAD_PROFILE = __ENV.LOAD_PROFILE || 'medium';
const BASE_URL = __ENV.BASE_URL || resolvedConfig.baseUrl;

export let options = {
  stages: resolvedConfig.loadProfile[LOAD_PROFILE].stages,
  thresholds: {
    ...resolvedConfig.thresholds,
    'btr_response_time': ['p(95)<1000'], // BTR API should respond within 1 second for 95% of requests
    'btr_errors': ['rate<0.02'],         // BTR API error rate should be less than 2%
  },
};

// Helper function to build cookie string from tokens
function buildCookieString() {
  if (!resolvedConfig.authentication.enabled || resolvedConfig.authentication.type !== 'cookie') {
    return '';
  }
  
  const tokens = resolvedConfig.authentication.tokens;
  const cookieParts = [];
  
  for (const [key, value] of Object.entries(tokens)) {
    // Skip if value is still a placeholder (env var not set)
    if (!value || value.startsWith('${')) {
      console.warn(`⚠️  Token ${key} is not properly set from environment variable`);
      continue;
    }
    cookieParts.push(`${key}=${value}`);
  }
  
  return cookieParts.join('; ');
}

// Helper function to build headers with cookies
function buildHeaders() {
  let headers = { ...resolvedConfig.headers };
  
  if (resolvedConfig.authentication.enabled && resolvedConfig.authentication.type === 'cookie') {
    headers['Cookie'] = buildCookieString();
  }
  
  return headers;
}

// Enhanced HTTP request function for BTR API
function makeBTRRequest(method, url, payload = null, params = {}) {
  requestCounter.add(1);
  approvalFetchCounter.add(1);
  
  const options = {
    headers: buildHeaders(),
    timeout: '30s',
    ...params,
  };
  
  let response;
  const startTime = Date.now();
  
  try {
    console.log(`🔄 Making ${method.toUpperCase()} request to: ${url}`);
    
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
    console.error(`❌ BTR Request failed: ${error.message}`);
    errorRate.add(1);
    return null;
  }
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  responseTimeTrend.add(duration);
  
  // Enhanced response checks for BTR API
  const isSuccess = check(response, {
    [`BTR API - Status is successful (${response.status})`]: (r) => r.status >= 200 && r.status < 300,
    [`BTR API - Response time acceptable (<3s)`]: (r) => r.timings.duration < 3000,
    [`BTR API - Has response body`]: (r) => r.body && r.body.length > 0,
    [`BTR API - Content-Type is JSON`]: (r) => r.headers['Content-Type'] && r.headers['Content-Type'].includes('application/json'),
  });
  
  if (!isSuccess) {
    errorRate.add(1);
    console.error(`❌ BTR API Error: ${method.toUpperCase()} ${url} - Status: ${response.status}, Duration: ${duration}ms`);
    if (response.body) {
      console.error(`Response body: ${response.body.substring(0, 200)}...`);
    }
  } else {
    console.log(`✅ BTR API Success: ${method.toUpperCase()} ${url} - Status: ${response.status}, Duration: ${duration}ms`);
  }
  
  return response;
}

// Test scenario 1: BTR approval active tab with different pagination
function testBTRApprovalPagination() {
  const randomLimit = [5, 10, 20, 50][Math.floor(Math.random() * 4)];
//   const randomSequence = 2
//   const tabs = 'active';
//   const randomTab = tabs[Math.floor(Math.random() * tabs.length)];
  
  const url = `${BASE_URL}/api/btr/approval?tz=7&tab=active&sequence=2&limit=${randomLimit}`;
  console.log(`🔄 Testing pagination: tab=active, sequence=2, limit=${randomLimit}`);
  
  const response = makeBTRRequest('GET', url);
  
  if (response && response.status === 200) {
    try {
      const data = JSON.parse(response.body);
      console.log(`📄 BTR Pagination test - active: ${data.data ? data.data.length : 'unknown'} items`);
    } catch (e) {
      console.log(`📄 BTR Pagination test - active: response received`);
    }
  }
  
  return response;
}

// Test scenario 2: BTR approval history tab with different pagination
function testBTRApprovalHistory() {
    const randomLimit = [5, 10, 20, 50][Math.floor(Math.random() * 4)];
    // const randomSequence = 2;
    // const tabs = 'history';
    // const randomTab = tabs[Math.floor(Math.random() * tabs.length)];
    
    const url = `${BASE_URL}/api/btr/approval?tz=7&tab=history&sequence=2&limit=${randomLimit}`;
    console.log(`🔄 Testing pagination: tab=history, sequence=2, limit=${randomLimit}`);

    const response = makeBTRRequest('GET', url);

    if (response && response.status === 200) {
        try {
            const data = JSON.parse(response.body);
            console.log(`📄 BTR Pagination test - history: ${data.data ? data.data.length : 'unknown'} items`);
        } catch (e) {
            console.log(`📄 BTR Pagination test - history: response received`);
        }
    }

    return response;
}


// Main test function - runs for each virtual user
export default function () {
  console.log(`👤 VU ${__VU}, Iteration ${__ITER}: Starting BTR approval tests`);
  
  // Weighted random selection for different test scenarios
  const rand = Math.random();
  
  if (rand < 0.5) {
    testBTRApprovalPagination();
  } else {
    testBTRApprovalHistory();
  }
  
  // Random sleep between requests (simulate user think time)
  const minSleep = parseFloat(resolvedConfig.settings.minSleepTime) || 1;
  const maxSleep = parseFloat(resolvedConfig.settings.maxSleepTime) || 3;
  const sleepTime = Math.random() * (maxSleep - minSleep) + minSleep;
  
  if (resolvedConfig.settings.enableDetailedLogs === 'true') {
    console.log(`😴 VU ${__VU} sleeping for ${sleepTime.toFixed(1)}s`);
  }
  sleep(sleepTime);
}

// Setup function - runs once before the test starts
export function setup() {
  console.log('🚀 Starting BTR Approval API Load Test...');
  console.log('='.repeat(70));
  console.log(`📊 Target URL: ${BASE_URL}`);
  console.log(`🎯 Load Profile: ${LOAD_PROFILE}`);
  console.log(`🔐 Authentication: Cookie-based (${resolvedConfig.authentication.enabled ? 'Enabled' : 'Disabled'})`);
  console.log('');
  console.log('📋 BTR Endpoints to test:');
  console.log(`   • Active: ${resolvedConfig.endpoints.btrApprovalActive}`);
  console.log(`   • History: ${resolvedConfig.endpoints.btrApprovalHistory}`);
  console.log('');
  console.log(`👥 Load Stages:`);
  resolvedConfig.loadProfile[LOAD_PROFILE].stages.forEach((stage, index) => {
    console.log(`   Stage ${index + 1}: ${stage.duration} with ${stage.target} users`);
  });
  console.log('');
  console.log('📈 Performance Thresholds:');
  console.log('   • Response time p95 < 1000ms');
  console.log('   • Error rate < 2%');
  console.log('   • Overall error rate < 5%');
  console.log('='.repeat(70));
  
  // Test connectivity to BTR API
  console.log('🔍 Testing BTR API connectivity...');
  const testUrl = `${BASE_URL}${resolvedConfig.endpoints.btrApprovalActive}`;
  
  try {
    const testResponse = http.get(testUrl, { 
      headers: buildHeaders(),
      timeout: '10s' 
    });
    
    if (testResponse.status === 0) {
      console.error('❌ Failed to connect to BTR API. Please check your configuration and network.');
    } else if (testResponse.status === 401 || testResponse.status === 403) {
      console.error('🔒 Authentication failed. Please check your tokens in config.json.');
      console.error(`   Status: ${testResponse.status}`);
    } else if (testResponse.status >= 200 && testResponse.status < 300) {
      console.log(`✅ BTR API connected successfully (Status: ${testResponse.status})`);
      try {
        const data = JSON.parse(testResponse.body);
        console.log(`📊 Sample data returned: ${data.data ? data.data.length : 'unknown'} items`);
      } catch (e) {
        console.log('📊 Response received (JSON parsing failed - might be expected)');
      }
    } else {
      console.warn(`⚠️  BTR API returned status ${testResponse.status}. Test will continue.`);
    }
  } catch (error) {
    console.error(`❌ Connectivity test failed: ${error.message}`);
  }
  
  console.log('');
  console.log('🎬 Starting load test in 3 seconds...');
  sleep(3);
  
  return { 
    timestamp: new Date().toISOString(),
    loadProfile: LOAD_PROFILE,
    baseUrl: BASE_URL,
    endpoints: resolvedConfig.endpoints
  };
}

// Teardown function - runs once after the test completes
export function teardown(data) {
  console.log('');
  console.log('='.repeat(70));
  console.log('🏁 BTR Approval API Load Test COMPLETED!');
  console.log('='.repeat(70));
  console.log(`📊 Test Summary:`);
  console.log(`   • Load Profile: ${data.loadProfile}`);
  console.log(`   • Target API: ${data.baseUrl}`);
  console.log(`   • Started: ${data.timestamp}`);
  console.log(`   • Ended: ${new Date().toISOString()}`);
  console.log('');
  console.log('📈 Check the metrics above for:');
  console.log('   • btr_response_time - BTR API response times');
  console.log('   • btr_errors - BTR API specific error rate');
  console.log('   • approval_fetches - Total approval data fetches');
  console.log('   • http_reqs - Overall request rate (RPS)');
  console.log('   • vus/vus_max - Virtual user statistics');
  console.log('');
  console.log('💡 Tips:');
  console.log('   • If error rate is high, check authentication tokens');
  console.log('   • If response time is slow, consider server capacity');
  console.log('   • Use different load profiles: light, medium, heavy, spike');
  console.log('='.repeat(70));
}

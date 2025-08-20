# K6 Load Testing Suite

A comprehensive load testing suite using [k6](https://k6.io/) for testing multiple API endpoints with configurable load profiles and scenarios.

## 📋 Prerequisites

1. **Install k6**: Visit [k6.io/docs/get-started/installation](https://k6.io/docs/get-started/installation/)
   ```bash
   # macOS
   brew install k6
   
   # Windows (via Chocolatey)
   choco install k6
   
   # Linux (Debian/Ubuntu)
   sudo gpg -k
   sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
   echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
   sudo apt-get update
   sudo apt-get install k6
   ```

## 📁 Files Overview

- **`load-test.js`** - Basic load test script with embedded configuration
- **`configurable-load-test.js`** - Advanced script that uses external configuration
- **`config.json`** - Configuration file for endpoints, load profiles, and test data
- **`README.md`** - This documentation file

## 🚀 Quick Start

### 1. Set Up Environment Variables

**Important**: Never commit sensitive tokens to your repository!

Copy the environment example file and add your tokens:

```bash
# Copy the example file
cp env.example .env

# Edit .env with your actual tokens
TOKEN_ESS=your_actual_token_ess_here
REFRESH_TOKEN=your_actual_refresh_token_here
TOKEN_QHSE=your_actual_token_qhse_here
```

**Alternative**: Set environment variables directly:

```bash
# Linux/macOS
export TOKEN_ESS="your_token_here"
export REFRESH_TOKEN="your_refresh_token_here"
export TOKEN_QHSE="your_qhse_token_here"

# Windows CMD
set TOKEN_ESS=your_token_here
set REFRESH_TOKEN=your_refresh_token_here
set TOKEN_QHSE=your_qhse_token_here

# Windows PowerShell
$env:TOKEN_ESS="your_token_here"
$env:REFRESH_TOKEN="your_refresh_token_here"
$env:TOKEN_QHSE="your_qhse_token_here"
```

### 2. Configure Your Endpoints (Optional)

The default configuration is set for BTR Approval API. To customize for other APIs, edit `config.json`:

```json
{
  "baseUrl": "https://your-api.example.com",
  "endpoints": {
    "getUsers": "/api/users",
    "createUser": "/api/users"
  }
}
```

### 3. Run Load Tests

**⚠️ Important**: k6 doesn't automatically load `.env` files. Use our wrapper scripts:

```bash
# Method 1: Using .env file (Recommended)
./run-with-env.sh                              # Uses .env file
./run-with-env.sh btr-approval-load-test.js heavy  # Custom load profile

# Windows PowerShell:
.\run-with-env.ps1
.\run-with-env.ps1 -LoadProfile heavy

# Method 2: Manual environment variables
export TOKEN_ESS="your_token"
export REFRESH_TOKEN="your_refresh_token"
export BASE_URL="https://super-apps.madhani.id"
k6 run btr-approval-load-test.js

# Method 3: Inline with k6 command
k6 run -e TOKEN_ESS="your_token" -e BASE_URL="https://super-apps.madhani.id" btr-approval-load-test.js
```

### 4. Customize Load Profile

```bash
# Light load (5 users)
k6 run -e LOAD_PROFILE=light configurable-load-test.js

# Medium load (20 users) - default
k6 run -e LOAD_PROFILE=medium configurable-load-test.js

# Heavy load (50 users)
k6 run -e LOAD_PROFILE=heavy configurable-load-test.js

# Spike test (sudden burst to 100 users)
k6 run -e LOAD_PROFILE=spike configurable-load-test.js
```

### 5. Override Base URL

```bash
# Test against different environment
k6 run -e BASE_URL=https://staging-api.example.com configurable-load-test.js
```

## ⚙️ Configuration Options

### Load Profiles

| Profile | Description | Peak Users | Duration |
|---------|-------------|------------|----------|
| `light` | Basic smoke test | 5 | ~4 minutes |
| `medium` | Standard load test | 20 | ~16 minutes |
| `heavy` | High load test | 50 | ~23 minutes |
| `spike` | Sudden traffic burst | 100 | ~3.5 minutes |

### Authentication & Security

🔐 **Token Security**: Tokens are now managed via environment variables for security.

Authentication is pre-configured for BTR API with cookie-based JWT tokens:

```json
{
  "authentication": {
    "type": "cookie",
    "tokens": {
      "token_ess": "${TOKEN_ESS}",
      "refresh_token": "${REFRESH_TOKEN}",
      "token_qhse": "${TOKEN_QHSE}"
    },
    "enabled": true
  }
}
```

**Security Best Practices**:
- ✅ Never commit `.env` files or hardcoded tokens
- ✅ Use environment variables for sensitive data
- ✅ Rotate tokens regularly
- ✅ Use different tokens for different environments
- ✅ Add `.env` to your `.gitignore` (already included)

**Getting Your Tokens**:
1. Login to your BTR application
2. Open browser developer tools (F12)
3. Go to Application/Storage → Cookies
4. Copy the values for `token_ess`, `refresh_token`, and `token_qhse`

### Test Scenarios

The test suite includes 5 different scenarios with configurable weights:

1. **GET Requests** (40%) - Read operations
2. **POST Requests** (20%) - Create operations  
3. **PUT Requests** (15%) - Update operations
4. **DELETE Requests** (10%) - Delete operations
5. **User Workflow** (15%) - Complete user journey

Modify weights in `config.json`:

```json
{
  "scenarios": {
    "weights": {
      "get_requests": 0.5,
      "post_requests": 0.3,
      "put_requests": 0.1,
      "delete_requests": 0.05,
      "user_workflow": 0.05
    }
  }
}
```

## 📊 Understanding Results

### Key Metrics

- **http_req_duration** - Response time (aim for p95 < 500ms)
- **http_req_failed** - Error rate (aim for < 5%)
- **http_reqs** - Total requests per second
- **vus** - Virtual users (concurrent users)

### Sample Output

```
✓ GET https://api.example.com/api/users - Status is successful
✓ GET https://api.example.com/api/users - Response time OK
✓ GET https://api.example.com/api/users - Has response body

     ✓ checks.........................: 100.00% ✓ 1234      ✗ 0
     data_received..................: 2.1 MB  73 kB/s
     data_sent......................: 284 kB  9.7 kB/s
     http_req_blocked...............: avg=1.2ms    min=0s       med=1ms      max=45ms     p(90)=2ms      p(95)=3ms
     http_req_connecting............: avg=0.5ms    min=0s       med=0s       max=23ms     p(90)=1ms      p(95)=2ms
     http_req_duration..............: avg=123ms    min=45ms     med=98ms     max=2.1s     p(90)=187ms    p(95)=234ms
     http_req_failed................: 2.34%   ✓ 29        ✗ 1205
     http_req_receiving.............: avg=0.8ms    min=0.1ms    med=0.5ms    max=12ms     p(90)=1.2ms    p(95)=2.1ms
     http_req_sending...............: avg=0.1ms    min=0s       med=0.1ms    max=2ms      p(90)=0.2ms    p(95)=0.3ms
     http_req_tls_handshaking.......: avg=0s       min=0s       med=0s       max=0s       p(90)=0s       p(95)=0s
     http_req_waiting...............: avg=122ms    min=44ms     med=97ms     max=2.1s     p(90)=186ms    p(95)=233ms
     http_reqs......................: 1234    42.1/s
     iteration_duration.............: avg=2.1s     min=1.2s     med=2.0s     max=5.2s     p(90)=2.8s     p(95)=3.2s
     iterations.....................: 567     19.3/s
     vus............................: 20      min=1        max=50
     vus_max........................: 50      min=50       max=50
```

## 🎯 Performance Thresholds

Default thresholds are configured to fail the test if:

- 95th percentile response time > 500ms
- Error rate > 5%

Customize thresholds in `config.json`:

```json
{
  "thresholds": {
    "http_req_duration": ["p(95)<200", "p(99)<1000"],
    "http_req_failed": ["rate<0.01"],
    "errors": ["rate<0.01"]
  }
}
```

## 🐛 Troubleshooting

### Common Issues

1. **Connection Failed**
   ```
   ❌ Failed to connect to the target URL
   ```
   - Check if the API is running and accessible
   - Verify the `baseUrl` in configuration
   - Test with a simple curl command first

2. **Authentication Errors (401)**
   ```
   Request failed: GET /api/users - Status: 401
   ```
   - Update the authentication token in `config.json`
   - Ensure the token has sufficient permissions
   - Check if the authentication type is correct

3. **High Error Rates**
   ```
   ✗ http_req_failed................: 15.23%
   ```
   - Reduce load profile (use `light` instead of `heavy`)
   - Check server capacity and scaling
   - Review error responses in detailed logs

4. **Slow Response Times**
   ```
   ✗ http_req_duration..............: p(95)=2.1s
   ```
   - Profile your API for bottlenecks
   - Check database query performance
   - Consider implementing caching

### Enable Detailed Logging

Set `enableDetailedLogs: true` in `config.json` for verbose output:

```json
{
  "settings": {
    "enableDetailedLogs": true
  }
}
```

## 📈 Advanced Usage

### Custom Test Scenarios

Create your own test scenarios by modifying the test functions in `configurable-load-test.js`:

```javascript
function testCustomWorkflow() {
  // Your custom test logic here
  makeRequest('GET', `${BASE_URL}/api/custom-endpoint`);
  sleep(1);
  // ... more steps
}
```

### Environment-Specific Configurations

Create multiple config files for different environments:

```bash
# Development
k6 run -e CONFIG_FILE=config-dev.json configurable-load-test.js

# Staging  
k6 run -e CONFIG_FILE=config-staging.json configurable-load-test.js

# Production
k6 run -e CONFIG_FILE=config-prod.json configurable-load-test.js
```

### Output Formats

Save results in different formats:

```bash
# JSON output
k6 run --out json=results.json configurable-load-test.js

# CSV output
k6 run --out csv=results.csv configurable-load-test.js

# InfluxDB (for Grafana dashboards)
k6 run --out influxdb=http://localhost:8086/mydb configurable-load-test.js
```

## 🔗 Resources

- [k6 Documentation](https://k6.io/docs/)
- [k6 Examples](https://k6.io/docs/examples/)
- [Performance Testing Best Practices](https://k6.io/docs/testing-guides/)
- [k6 Grafana Dashboard](https://k6.io/docs/results-visualization/grafana-dashboards/)

## 📝 License

This load testing suite is provided as-is for educational and testing purposes. Modify as needed for your specific use case.

---

**Happy Load Testing! 🚀**

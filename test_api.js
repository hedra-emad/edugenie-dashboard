const https = require('https');

async function testApi() {
  const baseUrl = 'https://edugenie-api.vercel.app';
  
  const request = (method, path, body = null, headers = {}) => {
    return new Promise((resolve) => {
      const start = Date.now();
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };

      const req = https.request(`${baseUrl}${path}`, options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const time = Date.now() - start;
          let parsed = data;
          try { parsed = JSON.parse(data); } catch(e) {}
          resolve({ status: res.statusCode, time, data: parsed, headers: res.headers });
        });
      });

      req.on('error', (e) => {
        resolve({ status: 'ERROR', time: Date.now() - start, error: e.message });
      });

      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  };

  const results = {};

  // 2.1 Health Check
  results.health = await request('GET', '/health');
  if (results.health.status === 404) {
      results.health = await request('GET', '/');
  }

  // 2.2 Auth (Login without credentials to see response structure)
  results.login = await request('POST', '/auth/login', { email: 'test@test.com', password: 'wrongpassword' });

  // 2.3 Other Endpoints
  results.coursesList = await request('GET', '/courses');
  
  // Try to get one course ID to test details
  let courseId = 'invalid-id';
  if (results.coursesList.data && Array.isArray(results.coursesList.data) && results.coursesList.data.length > 0) {
     courseId = results.coursesList.data[0]._id;
  }
  
  if (courseId !== 'invalid-id') {
     results.courseDetails = await request('GET', `/courses/${courseId}`);
  }

  results.categories = await request('GET', '/categories');
  results.profile = await request('GET', '/users/profile'); // Expect 401 without cookie

  // 2.5 CORS audit preflight
  results.corsDev = await request('OPTIONS', '/courses', null, { 'Origin': 'http://localhost:4200', 'Access-Control-Request-Method': 'GET' });
  
  console.log(JSON.stringify(results, null, 2));
}

testApi();

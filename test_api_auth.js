const https = require('https');

async function testApi() {
  const baseUrl = 'https://edugenie-api.vercel.app';
  let cookieStr = '';
  
  const request = (method, path, body = null, extraHeaders = {}) => {
    return new Promise((resolve) => {
      const start = Date.now();
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...extraHeaders
        }
      };
      
      if (cookieStr) {
          options.headers['Cookie'] = cookieStr;
      }

      const req = https.request(`${baseUrl}${path}`, options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const time = Date.now() - start;
          
          if (res.headers['set-cookie']) {
              cookieStr = res.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
          }

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

  // Step 1: Login
  results.login = await request('POST', '/auth/login', { email: 'emadhedra4@gmail.com', password: 'pass@555' });
  
  if (results.login.status !== 200 && results.login.status !== 201) {
     console.log('Login failed:', results.login.status, results.login.data);
  }

  // Step 2: Run endpoints
  results.profile = await request('GET', '/users/profile');
  results.myCourses = await request('GET', '/courses/my-courses');
  
  // Try to create a dummy course
  results.createCourse = await request('POST', '/courses', {
      title: 'Dummy Test Course',
      description: 'This is a test description that is at least twenty characters long.',
      price: 0,
      thumbnail: 'https://placehold.co/600x400',
      level: 'beginner',
      categoryId: '6a2aa0298df1f625dda844f4',
      courseStatus: 'draft'
  });
  
  let newCourseId = null;
  if (results.createCourse.data && results.createCourse.data.data && results.createCourse.data.data.id) {
     newCourseId = results.createCourse.data.data.id;
  }
  
  if (newCourseId) {
      results.patchCourse = await request('PATCH', `/courses/${newCourseId}`, { title: 'Updated Title' });
      results.submitCourse = await request('PATCH', `/courses/${newCourseId}/submit-for-review`);
      
      results.createSection = await request('POST', `/courses/${newCourseId}/sections`, {
          title: 'Dummy Section',
          order: 1
      });
      
      let sectionId = null;
      if (results.createSection.data && results.createSection.data.data) {
          sectionId = results.createSection.data.data.id || results.createSection.data.data._id;
          if (sectionId && sectionId.buffer) {
              // Not a string id returned directly?
              // The API might just return the course back. Let's see later.
          }
      }
      // Since it's a test script, we will just stop creating deep nested objects to avoid errors if we don't know the exact schema needed yet.
      
      // Delete the course to clean up
      results.deleteCourse = await request('DELETE', `/courses/${newCourseId}`);
  }

  results.analytics = await request('GET', '/analytics/instructor');
  results.categories = await request('GET', '/categories');
  
  console.log(JSON.stringify(results, null, 2));
}

testApi();

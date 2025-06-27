#!/usr/bin/env node

const BASE_URL = 'https://dream-machine-api.01jtgshcvx4ms1zqv3x8vcdmxg.lmapp.run';

async function testAPI() {
  console.log('🧪 Testing Dream Machine API endpoints...\n');
  
  let testResults = {
    passed: 0,
    failed: 0,
    total: 0
  };

  // Helper function to make requests
  async function makeRequest(endpoint, method = 'GET', body = null) {
    const url = `${BASE_URL}${endpoint}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    return fetch(url, options);
  }

  // Test function
  async function test(name, testFn) {
    testResults.total++;
    console.log(`📋 Testing: ${name}`);
    
    try {
      const result = await testFn();
      if (result) {
        console.log(`✅ PASS: ${name}\n`);
        testResults.passed++;
      } else {
        console.log(`❌ FAIL: ${name}\n`);
        testResults.failed++;
      }
    } catch (error) {
      console.log(`❌ ERROR: ${name} - ${error.message}\n`);
      testResults.failed++;
    }
  }

  // Test 1: Health check / 404 for root
  await test('Root endpoint returns 404', async () => {
    const response = await makeRequest('/');
    return response.status === 404;
  });

  // Test 2: Submit a dream
  let dreamId = null;
  await test('Submit dream (POST /api/dreams)', async () => {
    const dreamData = {
      content: "I was walking through a forest of crystal trees that sang melodies when the wind touched them.",
      title: "Crystal Forest Symphony",
      theme: "nature"
    };
    
    const response = await makeRequest('/api/dreams', 'POST', dreamData);
    const data = await response.json();
    
    if (response.status === 201 && data.id && data.message) {
      dreamId = data.id;
      console.log(`   🎯 Dream ID: ${dreamId}`);
      console.log(`   🎭 Analysis themes: ${data.analysis?.themes?.join(', ') || 'N/A'}`);
      return true;
    }
    
    console.log(`   ❌ Response: ${JSON.stringify(data)}`);
    return false;
  });

  // Test 3: Get all dreams
  await test('Get dreams (GET /api/dreams)', async () => {
    const response = await makeRequest('/api/dreams');
    const data = await response.json();
    
    if (response.status === 200 && data.dreams && Array.isArray(data.dreams)) {
      console.log(`   📊 Found ${data.dreams.length} dreams`);
      return true;
    }
    
    console.log(`   ❌ Response: ${JSON.stringify(data)}`);
    return false;
  });

  // Test 4: Get dream details (if we have a dream ID)
  if (dreamId) {
    await test('Get dream details (GET /api/dreams/:id)', async () => {
      const response = await makeRequest(`/api/dreams/${dreamId}`);
      const data = await response.json();
      
      if (response.status === 200 && data.id === dreamId && data.content) {
        console.log(`   🔍 Dream title: ${data.title || 'Untitled'}`);
        return true;
      }
      
      console.log(`   ❌ Response: ${JSON.stringify(data)}`);
      return false;
    });

    // Test 5: Get similar dreams
    await test('Get similar dreams (GET /api/dreams/:id/similar)', async () => {
      const response = await makeRequest(`/api/dreams/${dreamId}/similar`);
      const data = await response.json();
      
      if (response.status === 200 && data.similar_dreams !== undefined) {
        console.log(`   🔗 Found ${data.similar_dreams.length} similar dreams`);
        return true;
      }
      
      console.log(`   ❌ Response: ${JSON.stringify(data)}`);
      return false;
    });

    // Test 6: Continue dream
    await test('Continue dream (POST /api/dreams/:id/continue)', async () => {
      const response = await makeRequest(`/api/dreams/${dreamId}/continue`, 'POST', {
        direction: 'forward'
      });
      const data = await response.json();
      
      if (response.status === 200 && data.continuation && data.original_dream) {
        console.log(`   ✨ Continuation preview: ${data.continuation.content.substring(0, 100)}...`);
        return true;
      }
      
      console.log(`   ❌ Response: ${JSON.stringify(data)}`);
      return false;
    });
  }

  // Test 7: Get constellation
  await test('Get constellation (GET /api/constellation)', async () => {
    const response = await makeRequest('/api/constellation?query=nature dreams&limit=5');
    const data = await response.json();
    
    if (response.status === 200 && data.constellation !== undefined) {
      console.log(`   🌌 Constellation nodes: ${data.constellation.length}`);
      return true;
    }
    
    console.log(`   ❌ Response: ${JSON.stringify(data)}`);
    return false;
  });

  // Test 8: Seed database (debug endpoint)
  await test('Seed database (POST /api/debug/seed)', async () => {
    const response = await makeRequest('/api/debug/seed', 'POST');
    const data = await response.json();
    
    if (response.status === 200 && data.message && data.dreams_added) {
      console.log(`   🌱 Added ${data.dreams_added} sample dreams`);
      return true;
    }
    
    console.log(`   ❌ Response: ${JSON.stringify(data)}`);
    return false;
  });

  // Test 9: Invalid endpoint returns 404
  await test('Invalid endpoint returns 404', async () => {
    const response = await makeRequest('/api/nonexistent');
    return response.status === 404;
  });

  // Test 10: CORS preflight request
  await test('CORS preflight (OPTIONS)', async () => {
    const response = await fetch(`${BASE_URL}/api/dreams`, {
      method: 'OPTIONS'
    });
    
    const corsHeader = response.headers.get('Access-Control-Allow-Origin');
    return response.status === 204 && corsHeader === '*';
  });

  // Summary
  console.log('='.repeat(50));
  console.log('🎯 TEST SUMMARY:');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📊 Total: ${testResults.total}`);
  console.log(`📈 Success Rate: ${Math.round((testResults.passed / testResults.total) * 100)}%`);
  
  if (testResults.failed === 0) {
    console.log('\n🎉 All tests passed! API is working correctly.');
  } else {
    console.log(`\n⚠️  ${testResults.failed} test(s) failed. Check the details above.`);
  }
}

// Run the tests
testAPI().catch(console.error);
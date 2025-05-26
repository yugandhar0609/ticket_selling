const http = require('node:http');
const { randomUUID } = require('node:crypto');

const USERS = 1000;
let sold = 0;
let failed = 0;
let statusCodes = {};

const makePurchase = () => new Promise((resolve) => {
  const req = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/purchase',
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'Idempotency-key': randomUUID(),
    },
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      // Track status codes
      statusCodes[res.statusCode] = (statusCodes[res.statusCode] || 0) + 1;
      
      if (res.statusCode === 200) {
        sold += 1;
      } else {
        failed += 1;
      }
      resolve();
    });
  });
  req.write(JSON.stringify({ quantity: 1 }));
  req.end();
});

async function runTest() {
  console.log(`🎫 Starting concurrent load test with ${USERS} users...`);
  const startTime = Date.now();
  
  await Promise.all(Array.from({ length: USERS }, makePurchase));
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  console.log(`\n📊 Results:`);
  console.log(`Sold seats: ${sold}/${USERS}`);
  console.log(`Failed requests: ${failed}/${USERS}`);
  console.log(`Duration: ${duration}ms`);
  console.log(`\n📈 Status Code Breakdown:`);
  Object.entries(statusCodes).forEach(([code, count]) => {
    console.log(`  ${code}: ${count} requests`);
  });
}

runTest(); 
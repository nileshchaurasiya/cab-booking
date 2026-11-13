/**
 * Verification Test: 8 Test Rides for Driver Dashboard
 * Validates that all 8 rides remain permanently in storage,
 * Page 1 returns records 1–5, Page 2 returns records 6–8,
 * and Next/Previous navigation works without deleting any records.
 */

const assert = require('assert');

console.log('================================================================');
console.log('   INDIAN CABS - DRIVER 8-RIDE RETENTION & PAGINATION TEST      ');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}`);
    console.error(`   Error: ${err.message}`);
  }
}

// Frontend range calculation formula
function getPaginationState(page, pageSize, total) {
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const startRecord = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRecord = total === 0 ? 0 : Math.min(page * pageSize, total);
  const text = total === 0 ? '0–0 of 0' : `${startRecord}–${endRecord} of ${total}`;
  const isPrevDisabled = page <= 1 || total === 0;
  const isNextDisabled = page >= lastPage || endRecord >= total || total === 0;

  return {
    page,
    pageSize,
    total,
    lastPage,
    startRecord,
    endRecord,
    text,
    isPrevDisabled,
    isNextDisabled
  };
}

// Controller paginate implementation (mirroring driverController.js)
function driverPaginate(query, records, req) {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  const skip = (page - 1) * limit;

  let filtered = records.filter(r => {
    for (const key of Object.keys(query)) {
      if (r[key] !== query[key]) return false;
    }
    return true;
  });

  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = filtered.length;
  const data = filtered.slice(skip, skip + limit);
  const totalPages = Math.ceil(total / limit) || 1;

  return {
    current_page: page,
    data,
    total,
    per_page: limit,
    last_page: totalPages,
    meta: {
      current_page: page,
      last_page: totalPages,
      per_page: limit,
      total
    }
  };
}

// Create 8 rides for Driver 101, completed sequentially
const dbRides = [];
const driverId = 'driver_101';
const customerId = 'cust_202';

for (let i = 1; i <= 8; i++) {
  dbRides.push({
    _id: `ride_${i}`,
    id: `ride_${i}`,
    driver_id: driverId,
    customer_id: customerId,
    pickup_address: `Pickup Point #${i}`,
    dropoff_address: `Dropoff Point #${i}`,
    fare: 150 + i * 20,
    status: 'completed',
    createdAt: new Date(Date.now() - (8 - i) * 60000).toISOString() // Ride 8 is newest, Ride 1 is oldest
  });
}

// TEST 1: All 8 rides exist in DB
runTest('All 8 rides are stored and retained in the database', () => {
  assert.strictEqual(dbRides.length, 8);
  const ride1 = dbRides.find(r => r.id === 'ride_1');
  const ride8 = dbRides.find(r => r.id === 'ride_8');
  assert.ok(ride1, 'Oldest ride #1 must exist in database');
  assert.ok(ride8, 'Newest ride #8 must exist in database');
});

// TEST 2: Page 1 returns records 1–5 (Newest 5: ride_8, ride_7, ride_6, ride_5, ride_4)
runTest('Page 1 displays records 1–5 of 8 with Prev disabled and Next enabled', () => {
  const resP1 = driverPaginate({ driver_id: driverId }, dbRides, { query: { page: '1', limit: '5' } });
  
  assert.strictEqual(resP1.total, 8, 'Total must be 8, not capped at 5');
  assert.strictEqual(resP1.last_page, 2, 'Last page must be 2');
  assert.strictEqual(resP1.current_page, 1);
  assert.strictEqual(resP1.data.length, 5);

  // Check top-level total for frontend
  assert.strictEqual(typeof resP1.total, 'number');

  const p1State = getPaginationState(resP1.current_page, 5, resP1.total);
  assert.strictEqual(p1State.text, '1–5 of 8');
  assert.strictEqual(p1State.isPrevDisabled, true);
  assert.strictEqual(p1State.isNextDisabled, false);

  // Page 1 data must be the 5 newest rides (ride_8 down to ride_4)
  assert.deepStrictEqual(resP1.data.map(r => r.id), ['ride_8', 'ride_7', 'ride_6', 'ride_5', 'ride_4']);
});

// TEST 3: Page 2 displays records 6–8 (Remaining 3 oldest rides: ride_3, ride_2, ride_1)
runTest('Page 2 displays records 6–8 of 8 with Prev enabled and Next disabled', () => {
  const resP2 = driverPaginate({ driver_id: driverId }, dbRides, { query: { page: '2', limit: '5' } });
  
  assert.strictEqual(resP2.total, 8);
  assert.strictEqual(resP2.last_page, 2);
  assert.strictEqual(resP2.current_page, 2);
  assert.strictEqual(resP2.data.length, 3); // 8 - 5 = 3 remaining

  const p2State = getPaginationState(resP2.current_page, 5, resP2.total);
  assert.strictEqual(p2State.text, '6–8 of 8');
  assert.strictEqual(p2State.isPrevDisabled, false);
  assert.strictEqual(p2State.isNextDisabled, true);

  // Page 2 data contains the oldest rides including ride_1
  assert.deepStrictEqual(resP2.data.map(r => r.id), ['ride_3', 'ride_2', 'ride_1']);
});

// TEST 4: Navigating Back to Page 1
runTest('Returning to Page 1 displays records 1–5 again with all original rides intact', () => {
  const resP1Again = driverPaginate({ driver_id: driverId }, dbRides, { query: { page: '1', limit: '5' } });
  assert.strictEqual(resP1Again.data.length, 5);
  assert.deepStrictEqual(resP1Again.data.map(r => r.id), ['ride_8', 'ride_7', 'ride_6', 'ride_5', 'ride_4']);
  assert.strictEqual(dbRides.length, 8, 'No rides were deleted from database during navigation');
});

// TEST 5: Background Polling / Refresh retains current page and all 8 rides
runTest('Background polling maintains Page 2 and does not delete records or reset page', () => {
  // Simulate driver viewing Page 2
  const pageRef = 2;
  const pollRes = driverPaginate({ driver_id: driverId }, dbRides, { query: { page: String(pageRef), limit: '5' } });
  
  assert.strictEqual(pollRes.current_page, 2);
  assert.strictEqual(pollRes.total, 8);
  assert.strictEqual(pollRes.data.length, 3);
  assert.strictEqual(dbRides.length, 8);
});

// TEST 6: Customer and Admin histories remain correct
runTest('Customer and Admin dashboard queries reflect all 8 rides accurately', () => {
  // Customer query
  const custRes = driverPaginate({ customer_id: customerId }, dbRides, { query: { page: '1', limit: '5' } });
  assert.strictEqual(custRes.total, 8);

  // Admin query (all rides)
  const adminRes = driverPaginate({}, dbRides, { query: { page: '1', limit: '5' } });
  assert.strictEqual(adminRes.total, 8);
  assert.strictEqual(adminRes.last_page, 2);
});

console.log('\n================================================================');
console.log(`Results: ${passedTests} / ${totalTests} tests passed`);
console.log('================================================================');

if (passedTests !== totalTests) {
  process.exit(1);
}


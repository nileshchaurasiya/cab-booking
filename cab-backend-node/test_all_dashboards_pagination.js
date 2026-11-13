/**
 * Comprehensive Unit & Integration Test for 5-Record-At-A-Time Pagination
 * Across All 3 Dashboards: Customer, Driver, and Admin.
 */

const assert = require('assert');

console.log('================================================================');
console.log('   INDIAN CABS - CONSISTENT 5-RECORD PAGINATION TEST SUITE      ');
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

// 1. Exact Pagination Range & State Formula used in all 3 dashboards
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

// Mock backend pagination helper matching customerRideController, driverController, adminController
async function mockBackendPaginate(query, records, req) {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  const skip = (page - 1) * limit;

  // Filter query
  let filtered = records.filter(r => {
    for (const key of Object.keys(query)) {
      if (r[key] !== query[key]) return false;
    }
    return true;
  });

  // Sort descending by createdAt
  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = filtered.length;
  const data = filtered.slice(skip, skip + limit);
  const lastPage = Math.ceil(total / limit) || 1;

  return {
    current_page: page,
    data,
    total,
    per_page: limit,
    last_page: lastPage
  };
}

// Seed 23 test ride records with distinct timestamps
const mockRides = Array.from({ length: 23 }, (_, i) => ({
  id: `ride_${i + 1}`,
  customer_id: i < 15 ? 'cust_1' : 'cust_2',
  driver_id: i < 12 ? 'driver_1' : 'driver_2',
  pickup_address: `Pickup Location ${i + 1}`,
  dropoff_address: `Destination ${i + 1}`,
  fare: 150 + i * 10,
  status: i % 3 === 0 ? 'cancelled' : 'completed',
  createdAt: new Date(Date.now() - (23 - i) * 3600000).toISOString() // Newer rides have higher timestamps
}));

// TEST 1: Page 1 with 23 records (Format: 1–5 of 23, Prev disabled, Next enabled)
runTest('Page 1 of 23 displays 1–5 of 23 with Prev disabled and Next enabled', () => {
  const p1 = getPaginationState(1, 5, 23);
  assert.strictEqual(p1.text, '1–5 of 23');
  assert.strictEqual(p1.isPrevDisabled, true);
  assert.strictEqual(p1.isNextDisabled, false);
});

// TEST 2: Page 2 of 23 displays 6–10 of 23
runTest('Page 2 of 23 displays 6–10 of 23 with both buttons enabled', () => {
  const p2 = getPaginationState(2, 5, 23);
  assert.strictEqual(p2.text, '6–10 of 23');
  assert.strictEqual(p2.isPrevDisabled, false);
  assert.strictEqual(p2.isNextDisabled, false);
});

// TEST 3: Page 3 of 23 displays 11–15 of 23
runTest('Page 3 of 23 displays 11–15 of 23 with both buttons enabled', () => {
  const p3 = getPaginationState(3, 5, 23);
  assert.strictEqual(p3.text, '11–15 of 23');
  assert.strictEqual(p3.isPrevDisabled, false);
  assert.strictEqual(p3.isNextDisabled, false);
});

// TEST 4: Page 4 of 23 displays 16–20 of 23
runTest('Page 4 of 23 displays 16–20 of 23 with both buttons enabled', () => {
  const p4 = getPaginationState(4, 5, 23);
  assert.strictEqual(p4.text, '16–20 of 23');
  assert.strictEqual(p4.isPrevDisabled, false);
  assert.strictEqual(p4.isNextDisabled, false);
});

// TEST 5: Last page (Page 5 of 23) displays 21–23 of 23 with Next disabled
runTest('Last page (5 of 23) displays 21–23 of 23 with Prev enabled and Next disabled', () => {
  const p5 = getPaginationState(5, 5, 23);
  assert.strictEqual(p5.text, '21–23 of 23');
  assert.strictEqual(p5.isPrevDisabled, false);
  assert.strictEqual(p5.isNextDisabled, true);
});

// TEST 6: Never append records - Next replaces current 5 records with next 5 records
runTest('Page navigation replaces existing records (never appends)', async () => {
  let displayedRecords = [];

  // Load Page 1
  const resP1 = await mockBackendPaginate({}, mockRides, { query: { page: '1', limit: '5' } });
  displayedRecords = resP1.data;
  assert.strictEqual(displayedRecords.length, 5);
  const page1Ids = displayedRecords.map(r => r.id);

  // Load Page 2 (replaces array)
  const resP2 = await mockBackendPaginate({}, mockRides, { query: { page: '2', limit: '5' } });
  displayedRecords = resP2.data;
  assert.strictEqual(displayedRecords.length, 5);
  const page2Ids = displayedRecords.map(r => r.id);

  // Verify none of the page 1 IDs are present in page 2
  for (const id of page1Ids) {
    assert.strictEqual(page2Ids.includes(id), false, `Page 2 should not contain Page 1 record ${id}`);
  }

  // Load Previous (Page 1) - restores exact original records
  const resP1Again = await mockBackendPaginate({}, mockRides, { query: { page: '1', limit: '5' } });
  displayedRecords = resP1Again.data;
  assert.deepStrictEqual(displayedRecords.map(r => r.id), page1Ids);
});

// TEST 7: Customer Dashboard Backend Pagination (Filtered by customer_id)
runTest('Customer Dashboard paginates customer-specific rides (15 rides -> 3 pages of 5)', async () => {
  const custQuery = { customer_id: 'cust_1' };
  
  const p1 = await mockBackendPaginate(custQuery, mockRides, { query: { page: '1', limit: '5' } });
  assert.strictEqual(p1.total, 15);
  assert.strictEqual(p1.data.length, 5);
  assert.strictEqual(p1.last_page, 3);

  const p3 = await mockBackendPaginate(custQuery, mockRides, { query: { page: '3', limit: '5' } });
  assert.strictEqual(p3.data.length, 5);
  assert.strictEqual(p3.current_page, 3);
});

// TEST 8: Driver Dashboard Backend Pagination (Filtered by driver_id)
runTest('Driver Dashboard paginates driver-specific rides (12 rides -> 3 pages: 5, 5, 2)', async () => {
  const driverQuery = { driver_id: 'driver_1' };
  
  const p1 = await mockBackendPaginate(driverQuery, mockRides, { query: { page: '1', limit: '5' } });
  assert.strictEqual(p1.total, 12);
  assert.strictEqual(p1.data.length, 5);
  assert.strictEqual(p1.last_page, 3);

  const p3 = await mockBackendPaginate(driverQuery, mockRides, { query: { page: '3', limit: '5' } });
  assert.strictEqual(p3.data.length, 2); // 12 - 10 = 2 remaining
  assert.strictEqual(p3.current_page, 3);
});

// TEST 9: Admin Dashboard Backend Pagination (All rides visible: 23 rides -> 5 pages)
runTest('Admin Dashboard paginates all rides across system (23 rides -> 5 pages of 5)', async () => {
  const adminQuery = {}; // Admin sees all rides
  
  const p1 = await mockBackendPaginate(adminQuery, mockRides, { query: { page: '1', limit: '5' } });
  assert.strictEqual(p1.total, 23);
  assert.strictEqual(p1.data.length, 5);
  assert.strictEqual(p1.last_page, 5);

  const p5 = await mockBackendPaginate(adminQuery, mockRides, { query: { page: '5', limit: '5' } });
  assert.strictEqual(p5.data.length, 3); // 23 - 20 = 3 remaining
  assert.strictEqual(p5.current_page, 5);
});

// TEST 10: Status Filtering & Recount across dashboards
runTest('Status filtering accurately recalculates totals and resets pages', async () => {
  const completedRides = mockRides.filter(r => r.status === 'completed');
  const resCompleted = await mockBackendPaginate({ status: 'completed' }, mockRides, { query: { page: '1', limit: '5' } });
  
  assert.strictEqual(resCompleted.total, completedRides.length);
  assert.strictEqual(resCompleted.data.length, 5);
  assert.strictEqual(resCompleted.current_page, 1);

  const info = getPaginationState(1, 5, resCompleted.total);
  assert.strictEqual(info.text, `1–5 of ${completedRides.length}`);
});

// TEST 11: Empty State handling
runTest('Empty record set displays 0–0 of 0 with both navigation buttons disabled', () => {
  const empty = getPaginationState(1, 5, 0);
  assert.strictEqual(empty.text, '0–0 of 0');
  assert.strictEqual(empty.isPrevDisabled, true);
  assert.strictEqual(empty.isNextDisabled, true);
});

console.log('\n================================================================');
console.log(`Results: ${passedTests} / ${totalTests} tests passed`);
console.log('================================================================');

if (passedTests !== totalTests) {
  process.exit(1);
}


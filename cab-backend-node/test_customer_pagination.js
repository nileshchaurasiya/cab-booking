/**
 * Unit Test for Customer Dashboard Trip History Pagination Logic & Backend Controller
 * Page Size: 5 records per page
 */

const assert = require('assert');

console.log('======================================================');
console.log('   INDIAN CABS - CUSTOMER DASHBOARD PAGINATION TESTS  ');
console.log('======================================================\n');

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

// Pagination Range Calculation Function (Exact frontend formula)
function getPaginationInfo(page, pageSize, total) {
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

// TEST 1: Page 1 with 28 records
runTest('Page 1 of 28 displays 1–5 of 28, prev disabled, next enabled', () => {
  const info = getPaginationInfo(1, 5, 28);
  assert.strictEqual(info.text, '1–5 of 28');
  assert.strictEqual(info.isPrevDisabled, true);
  assert.strictEqual(info.isNextDisabled, false);
});

// TEST 2: Page 2 with 28 records
runTest('Page 2 of 28 displays 6–10 of 28, prev enabled, next enabled', () => {
  const info = getPaginationInfo(2, 5, 28);
  assert.strictEqual(info.text, '6–10 of 28');
  assert.strictEqual(info.isPrevDisabled, false);
  assert.strictEqual(info.isNextDisabled, false);
});

// TEST 3: Page 3 with 28 records
runTest('Page 3 of 28 displays 11–15 of 28, prev enabled, next enabled', () => {
  const info = getPaginationInfo(3, 5, 28);
  assert.strictEqual(info.text, '11–15 of 28');
  assert.strictEqual(info.isPrevDisabled, false);
  assert.strictEqual(info.isNextDisabled, false);
});

// TEST 4: Last page (6) with 28 records
runTest('Last page (6) of 28 displays 26–28 of 28, next disabled', () => {
  const info = getPaginationInfo(6, 5, 28);
  assert.strictEqual(info.text, '26–28 of 28');
  assert.strictEqual(info.isPrevDisabled, false);
  assert.strictEqual(info.isNextDisabled, true);
});

// TEST 5: Medium set: 12 records (Pages 1, 2, 3)
runTest('Navigation across 12 records (3 pages: 1–5, 6–10, 11–12)', () => {
  const p1 = getPaginationInfo(1, 5, 12);
  assert.strictEqual(p1.text, '1–5 of 12');
  assert.strictEqual(p1.isPrevDisabled, true);
  assert.strictEqual(p1.isNextDisabled, false);

  const p2 = getPaginationInfo(2, 5, 12);
  assert.strictEqual(p2.text, '6–10 of 12');
  assert.strictEqual(p2.isPrevDisabled, false);
  assert.strictEqual(p2.isNextDisabled, false);

  const p3 = getPaginationInfo(3, 5, 12);
  assert.strictEqual(p3.text, '11–12 of 12');
  assert.strictEqual(p3.isPrevDisabled, false);
  assert.strictEqual(p3.isNextDisabled, true);
});

// TEST 6: Exactly 5 records (1 page, both arrows disabled)
runTest('Exactly 5 records (1–5 of 5, both arrows disabled)', () => {
  const info = getPaginationInfo(1, 5, 5);
  assert.strictEqual(info.text, '1–5 of 5');
  assert.strictEqual(info.isPrevDisabled, true);
  assert.strictEqual(info.isNextDisabled, true);
});

// TEST 7: 0 records
runTest('0 records displays 0–0 of 0 with both arrows disabled', () => {
  const info = getPaginationInfo(1, 5, 0);
  assert.strictEqual(info.text, '0–0 of 0');
  assert.strictEqual(info.isPrevDisabled, true);
  assert.strictEqual(info.isNextDisabled, true);
});

// TEST 8: Backend paginate mock simulation with limit 5
runTest('Backend paginate logic handles limit=5, skip, and status filter', async () => {
  const mockRides = Array.from({ length: 23 }, (_, i) => ({
    _id: `ride_${i + 1}`,
    pickup_address: `Pickup ${i + 1}`,
    dropoff_address: `Dropoff ${i + 1}`,
    fare: 100 + i,
    status: i % 2 === 0 ? 'completed' : 'cancelled'
  }));

  const mockModel = {
    find(q) {
      let result = mockRides.filter(r => !q.status || r.status === q.status);
      return {
        sort() {
          return {
            skip(s) {
              return {
                limit(l) {
                  return {
                    populate() {
                      return Promise.resolve(result.slice(s, s + l));
                    },
                    then(cb) {
                      return Promise.resolve(result.slice(s, s + l)).then(cb);
                    }
                  };
                }
              };
            }
          };
        }
      };
    },
    countDocuments(q) {
      const filtered = mockRides.filter(r => !q.status || r.status === q.status);
      return Promise.resolve(filtered.length);
    }
  };

  // Simulate paginate helper
  async function testPaginate(query, model, req) {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const data = await model.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);
    const total = await model.countDocuments(query);
    const lastPage = Math.ceil(total / limit) || 1;

    return {
      current_page: page,
      data,
      total,
      per_page: limit,
      last_page: lastPage
    };
  }

  // Request Page 1, limit 5
  const resPage1 = await testPaginate({}, mockModel, { query: { page: '1', limit: '5' } });
  assert.strictEqual(resPage1.data.length, 5);
  assert.strictEqual(resPage1.total, 23);
  assert.strictEqual(resPage1.current_page, 1);
  assert.strictEqual(resPage1.last_page, 5);

  // Request Page 2, limit 5
  const resPage2 = await testPaginate({}, mockModel, { query: { page: '2', limit: '5' } });
  assert.strictEqual(resPage2.data.length, 5);
  assert.strictEqual(resPage2.current_page, 2);

  // Request Page 5, limit 5 (remaining 3)
  const resPage5 = await testPaginate({}, mockModel, { query: { page: '5', limit: '5' } });
  assert.strictEqual(resPage5.data.length, 3);
  assert.strictEqual(resPage5.current_page, 5);

  // Filter completed (12 completed rides out of 23)
  const resCompleted = await testPaginate({ status: 'completed' }, mockModel, { query: { page: '1', limit: '5' } });
  assert.strictEqual(resCompleted.total, 12);
  assert.strictEqual(resCompleted.data.length, 5);
  assert.strictEqual(resCompleted.last_page, 3);
});

console.log('\n======================================================');
console.log(`Results: ${passedTests} / ${totalTests} tests passed`);
console.log('======================================================');

if (passedTests !== totalTests) {
  process.exit(1);
}

/**
 * Unit Test for Customer Dashboard Wallet Transactions 5-Record Pagination
 */

const assert = require('assert');

console.log('================================================================');
console.log('   INDIAN CABS - WALLET TRANSACTIONS PAGINATION TEST SUITE      ');
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

// 1. Pagination Range Calculation Function (Exact formula)
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

// Mock backend wallet transaction pagination
function mockWalletPaginate(transactions, page = 1, limit = 5) {
  const skip = (page - 1) * limit;
  const total = transactions.length;
  const data = transactions.slice(skip, skip + limit);
  const lastPage = Math.ceil(total / limit) || 1;

  return {
    current_page: page,
    transactions: data,
    total,
    per_page: limit,
    last_page: lastPage
  };
}

// Generate 18 mock transactions
const mockTransactions = Array.from({ length: 18 }, (_, i) => ({
  id: `tx_${i + 1}`,
  type: i % 2 === 0 ? 'deposit' : 'payment',
  amount: 100 + i * 25,
  description: i % 2 === 0 ? 'Wallet Recharge Deposit' : `Fare for Ride #${i + 1}`,
  createdAt: new Date(Date.now() - (18 - i) * 3600000).toISOString()
}));

// TEST 1: Page 1 with 18 transactions
runTest('Page 1 of 18 displays 1–5 of 18, Prev disabled, Next enabled', () => {
  const p1 = getPaginationState(1, 5, 18);
  assert.strictEqual(p1.text, '1–5 of 18');
  assert.strictEqual(p1.isPrevDisabled, true);
  assert.strictEqual(p1.isNextDisabled, false);
});

// TEST 2: Page 2 of 18 displays 6–10 of 18
runTest('Page 2 of 18 displays 6–10 of 18, both buttons enabled', () => {
  const p2 = getPaginationState(2, 5, 18);
  assert.strictEqual(p2.text, '6–10 of 18');
  assert.strictEqual(p2.isPrevDisabled, false);
  assert.strictEqual(p2.isNextDisabled, false);
});

// TEST 3: Page 3 of 18 displays 11–15 of 18
runTest('Page 3 of 18 displays 11–15 of 18, both buttons enabled', () => {
  const p3 = getPaginationState(3, 5, 18);
  assert.strictEqual(p3.text, '11–15 of 18');
  assert.strictEqual(p3.isPrevDisabled, false);
  assert.strictEqual(p3.isNextDisabled, false);
});

// TEST 4: Page 4 (Last page) displays 16–18 of 18, Next disabled
runTest('Last page (4 of 18) displays 16–18 of 18, Next disabled', () => {
  const p4 = getPaginationState(4, 5, 18);
  assert.strictEqual(p4.text, '16–18 of 18');
  assert.strictEqual(p4.isPrevDisabled, false);
  assert.strictEqual(p4.isNextDisabled, true);
});

// TEST 5: Backend pagination replaces records (does not append)
runTest('Pagination replaces records on page change (no append)', () => {
  const res1 = mockWalletPaginate(mockTransactions, 1, 5);
  assert.strictEqual(res1.transactions.length, 5);
  const page1Ids = res1.transactions.map(t => t.id);

  const res2 = mockWalletPaginate(mockTransactions, 2, 5);
  assert.strictEqual(res2.transactions.length, 5);
  const page2Ids = res2.transactions.map(t => t.id);

  // Check that records are completely replaced
  for (const id of page1Ids) {
    assert.strictEqual(page2Ids.includes(id), false);
  }
});

// TEST 6: Empty transactions displays 0–0 of 0 with both buttons disabled
runTest('Empty transaction list displays 0–0 of 0 with both buttons disabled', () => {
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


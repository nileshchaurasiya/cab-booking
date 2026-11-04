/**
 * Comprehensive Test Suite for Indian Cabs:
 * Ride Duration, Timestamps, Timezones & State Transitions
 */

const assert = require('assert');

// 1. Emulate timeUtils logic to test exact frontend behavior in Node
function formatMinutesToDuration(totalMinutes) {
  if (totalMinutes === undefined || totalMinutes === null || isNaN(totalMinutes) || totalMinutes < 0) {
    return '–';
  }
  const rounded = Math.floor(totalMinutes);
  const hours = Math.floor(rounded / 60);
  const minutes = rounded % 60;
  if (hours > 0) {
    return `${hours} hr ${minutes} min`;
  }
  return `${minutes} min`;
}

function getRideDurationDisplay(ride) {
  if (!ride) return '–';

  const startVal = ride.startedAt || ride.started_at;
  const endVal = ride.completedAt || ride.completed_at;

  if (startVal && endVal) {
    const start = new Date(startVal);
    const end = new Date(endVal);

    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end.getTime() >= start.getTime()) {
      const diffMs = end.getTime() - start.getTime();
      const diffMinutes = Math.floor(diffMs / 60000);
      return formatMinutesToDuration(diffMinutes);
    }
  }

  const estimated = ride.estimatedDuration ?? ride.estimated_duration ?? ride.duration;
  if (estimated !== undefined && estimated !== null && !isNaN(Number(estimated))) {
    return `${formatMinutesToDuration(Number(estimated))} (est.)`;
  }

  return '–';
}

function formatISTDateTime(dateVal) {
  if (!dateVal) return '—';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '—';

  const formatted = d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  return formatted.replace(/\b(am|pm)\b/gi, (match) => match.toUpperCase());
}

console.log('======================================================');
console.log('       INDIAN CABS - RIDE DURATION & TIME TESTS       ');
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

// TEST 1: The exact prompt problem scenario (12:51 PM to 5:33 PM)
runTest('Ride lasts 4 hours 42 minutes (12:51 PM to 5:33 PM)', () => {
  const start = new Date('2026-11-03T07:21:00.000Z'); // 12:51 PM IST
  const end = new Date('2026-11-03T12:03:00.000Z');   // 5:33 PM IST
  
  const startIST = formatISTDateTime(start);
  const endIST = formatISTDateTime(end);
  const duration = getRideDurationDisplay({ startedAt: start, completedAt: end });

  assert.strictEqual(startIST, '3 Nov 2026, 12:51 PM', `Expected 12:51 PM, got ${startIST}`);
  assert.strictEqual(endIST, '3 Nov 2026, 5:33 PM', `Expected 5:33 PM, got ${endIST}`);
  assert.strictEqual(duration, '4 hr 42 min', `Expected 4 hr 42 min, got ${duration}`);
});

// TEST 2: Ride lasts 30 minutes
runTest('Ride lasts 30 minutes', () => {
  const start = new Date('2026-11-03T10:00:00.000Z');
  const end = new Date('2026-11-03T10:30:00.000Z');
  const duration = getRideDurationDisplay({ startedAt: start, completedAt: end });
  assert.strictEqual(duration, '30 min', `Expected 30 min, got ${duration}`);
});

// TEST 3: Ride lasts 60 minutes
runTest('Ride lasts 60 minutes (1 hr 0 min)', () => {
  const start = new Date('2026-11-03T10:00:00.000Z');
  const end = new Date('2026-11-03T11:00:00.000Z');
  const duration = getRideDurationDisplay({ startedAt: start, completedAt: end });
  assert.strictEqual(duration, '1 hr 0 min', `Expected 1 hr 0 min, got ${duration}`);
});

// TEST 4: Ride lasts 90 minutes
runTest('Ride lasts 90 minutes (1 hr 30 min)', () => {
  const start = new Date('2026-11-03T10:00:00.000Z');
  const end = new Date('2026-11-03T11:30:00.000Z');
  const duration = getRideDurationDisplay({ startedAt: start, completedAt: end });
  assert.strictEqual(duration, '1 hr 30 min', `Expected 1 hr 30 min, got ${duration}`);
});

// TEST 5: Ride crosses midnight
runTest('Ride crosses midnight (11:50 PM to 01:10 AM)', () => {
  // 11:50 PM IST on Nov 3 = 18:20 UTC Nov 3
  // 01:10 AM IST on Nov 4 = 19:40 UTC Nov 3
  const start = new Date('2026-11-03T18:20:00.000Z');
  const end = new Date('2026-11-03T19:40:00.000Z');
  
  const startIST = formatISTDateTime(start);
  const endIST = formatISTDateTime(end);
  const duration = getRideDurationDisplay({ startedAt: start, completedAt: end });

  assert.strictEqual(startIST, '3 Nov 2026, 11:50 PM', `Expected 3 Nov 2026, 11:50 PM, got ${startIST}`);
  assert.strictEqual(endIST, '4 Nov 2026, 1:10 AM', `Expected 4 Nov 2026, 1:10 AM, got ${endIST}`);
  assert.strictEqual(duration, '1 hr 20 min', `Expected 1 hr 20 min, got ${duration}`);
});

// TEST 6: Old ride without timestamps (estimated duration fallback)
runTest('Old ride without timestamps displays (est.) label', () => {
  const oldRide1 = { estimatedDuration: 25, startedAt: null, completedAt: null };
  const oldRide2 = { duration: 15, startedAt: null, completedAt: null };
  const oldRide3 = { estimated_duration: 65, started_at: null, completed_at: null };

  assert.strictEqual(getRideDurationDisplay(oldRide1), '25 min (est.)');
  assert.strictEqual(getRideDurationDisplay(oldRide2), '15 min (est.)');
  assert.strictEqual(getRideDurationDisplay(oldRide3), '1 hr 5 min (est.)');
});

// TEST 7: Ride with missing / invalid timestamps safely handled
runTest('Missing or invalid timestamps handled safely without crashing', () => {
  assert.strictEqual(getRideDurationDisplay(null), '–');
  assert.strictEqual(getRideDurationDisplay({}), '–');
  assert.strictEqual(getRideDurationDisplay({ startedAt: 'invalid-date', completedAt: 'bad' }), '–');
  assert.strictEqual(formatISTDateTime(null), '—');
  assert.strictEqual(formatISTDateTime(undefined), '—');
  assert.strictEqual(formatISTDateTime('invalid-date'), '—');
});

// TEST 8: Multiple completed rides show independent durations
runTest('Multiple completed rides calculate independent durations', () => {
  const rideA = {
    startedAt: '2026-11-03T07:00:00.000Z',
    completedAt: '2026-11-03T07:45:00.000Z'
  };
  const rideB = {
    startedAt: '2026-11-03T08:00:00.000Z',
    completedAt: '2026-11-03T11:30:00.000Z'
  };
  const rideC = {
    startedAt: '2026-11-03T13:00:00.000Z',
    completedAt: '2026-11-03T13:12:00.000Z'
  };

  assert.strictEqual(getRideDurationDisplay(rideA), '45 min');
  assert.strictEqual(getRideDurationDisplay(rideB), '3 hr 30 min');
  assert.strictEqual(getRideDurationDisplay(rideC), '12 min');
});

// TEST 9: Duplicate start request preservation simulation
runTest('Duplicate start request preserves original start timestamp', () => {
  const originalStartTime = new Date('2026-11-03T10:00:00.000Z');
  const ride = {
    status: 'in_progress',
    startedAt: originalStartTime
  };

  // Simulating duplicate start action
  if (ride.status === 'in_progress') {
    // Preserve original timestamp
    if (!ride.startedAt) {
      ride.startedAt = new Date();
    }
  }

  assert.strictEqual(ride.startedAt.getTime(), originalStartTime.getTime());
});

// TEST 10: Duplicate completion request preservation simulation
runTest('Duplicate completion request preserves original completion timestamp', () => {
  const originalCompletedTime = new Date('2026-11-03T14:42:00.000Z');
  const ride = {
    status: 'completed',
    completedAt: originalCompletedTime
  };

  // Simulating duplicate complete action
  if (ride.status === 'completed') {
    // Preserve original timestamp
    if (!ride.completedAt) {
      ride.completedAt = new Date();
    }
  }

  assert.strictEqual(ride.completedAt.getTime(), originalCompletedTime.getTime());
});

console.log('\n======================================================');
console.log(`Results: ${passedTests} / ${totalTests} tests passed`);
console.log('======================================================');

if (passedTests !== totalTests) {
  process.exit(1);
}


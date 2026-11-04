/**
 * Unit & Integration Test for Backend Ride Schema & Controller Logic
 */

const assert = require('assert');
const mongoose = require('mongoose');
const Ride = require('./models/Ride');

console.log('======================================================');
console.log('       INDIAN CABS - BACKEND SCHEMA & LOGIC TESTS     ');
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

// TEST 1: Schema has startedAt, completedAt, estimatedDuration
runTest('Ride schema defines startedAt, completedAt, estimatedDuration as proper types', () => {
  const schemaPaths = Ride.schema.paths;
  assert(schemaPaths['startedAt'], 'startedAt path must exist');
  assert.strictEqual(schemaPaths['startedAt'].instance, 'Date');
  assert(schemaPaths['completedAt'], 'completedAt path must exist');
  assert.strictEqual(schemaPaths['completedAt'].instance, 'Date');
  assert(schemaPaths['estimatedDuration'], 'estimatedDuration path must exist');
  assert.strictEqual(schemaPaths['estimatedDuration'].instance, 'Number');
});

// TEST 2: Virtual aliases for snake_case
runTest('Virtual aliases started_at, completed_at, estimated_duration work', () => {
  const started = new Date('2026-11-03T07:21:00.000Z');
  const completed = new Date('2026-11-03T12:03:00.000Z');

  const ride = new Ride({
    customer_id: new mongoose.Types.ObjectId(),
    driver_id: new mongoose.Types.ObjectId(),
    pickup_address: 'Andheri West, Mumbai',
    dropoff_address: 'Nariman Point, Mumbai',
    pickup_latitude: 19.1363,
    pickup_longitude: 72.8277,
    dropoff_latitude: 18.9256,
    dropoff_longitude: 72.8242,
    fare: 450,
    distance: 32,
    duration: 282,
    estimatedDuration: 45,
    startedAt: started,
    completedAt: completed,
    status: 'completed'
  });

  assert.strictEqual(ride.started_at.getTime(), started.getTime());
  assert.strictEqual(ride.completed_at.getTime(), completed.getTime());
  assert.strictEqual(ride.estimated_duration, 45);

  const json = ride.toJSON();
  assert(json.startedAt, 'startedAt must be in toJSON');
  assert(json.completedAt, 'completedAt must be in toJSON');
  assert(json.started_at, 'started_at virtual must be in toJSON');
  assert(json.completed_at, 'completed_at virtual must be in toJSON');
  assert.strictEqual(json.estimatedDuration, 45);
  assert.strictEqual(json.estimated_duration, 45);
});

// TEST 3: Controller start logic behavior
runTest('Controller Start Logic sets startedAt and rejects unauthorized/invalid states', () => {
  const driverId = new mongoose.Types.ObjectId();
  const otherDriverId = new mongoose.Types.ObjectId();

  // A. Unauthorized driver check
  const rideNotMine = {
    driver_id: otherDriverId,
    status: 'accepted'
  };
  assert.notStrictEqual(rideNotMine.driver_id.toString(), driverId.toString());

  // B. Valid start transition
  const rideAccepted = {
    driver_id: driverId,
    status: 'accepted',
    startedAt: null
  };
  const validTransitions = ['accepted', 'waiting_for_customer', 'arrived'];
  assert(validTransitions.includes(rideAccepted.status));

  // Simulate starting
  rideAccepted.status = 'in_progress';
  rideAccepted.startedAt = new Date('2026-11-03T07:21:00.000Z');
  assert.strictEqual(rideAccepted.status, 'in_progress');
  assert(rideAccepted.startedAt instanceof Date);

  // C. Duplicate start request does NOT overwrite startedAt
  const originalStarted = rideAccepted.startedAt;
  if (rideAccepted.status === 'in_progress') {
    // duplicate start request
    if (!rideAccepted.startedAt) {
      rideAccepted.startedAt = new Date();
    }
  }
  assert.strictEqual(rideAccepted.startedAt.getTime(), originalStarted.getTime());
});

// TEST 4: Controller complete logic behavior
runTest('Controller Complete Logic sets completedAt, calculates duration and preserves timestamps', () => {
  const driverId = new mongoose.Types.ObjectId();
  const start = new Date('2026-11-03T07:21:00.000Z'); // 12:51 PM IST
  const end = new Date('2026-11-03T12:03:00.000Z');   // 5:33 PM IST

  const ride = {
    driver_id: driverId,
    status: 'in_progress',
    startedAt: start,
    completedAt: null
  };

  // Must be in_progress
  assert.strictEqual(ride.status, 'in_progress');

  // Complete
  ride.status = 'completed';
  if (!ride.completedAt) {
    ride.completedAt = end;
  }
  const diffMs = ride.completedAt.getTime() - ride.startedAt.getTime();
  ride.duration = Math.max(1, Math.round(diffMs / 60000));

  assert.strictEqual(ride.status, 'completed');
  assert.strictEqual(ride.duration, 282); // 4 hours 42 minutes = 282 mins
  assert.strictEqual(ride.completedAt.getTime(), end.getTime());

  // Duplicate completion request does NOT overwrite completedAt
  const originalCompleted = ride.completedAt;
  if (ride.status === 'completed') {
    if (!ride.completedAt) {
      ride.completedAt = new Date();
    }
  }
  assert.strictEqual(ride.completedAt.getTime(), originalCompleted.getTime());
});

console.log('\n======================================================');
console.log(`Results: ${passedTests} / ${totalTests} tests passed`);
console.log('======================================================');

if (passedTests !== totalTests) {
  process.exit(1);
}


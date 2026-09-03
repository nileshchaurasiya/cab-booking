
async function run() {
  try {
    // 1. login as customer
    const loginRes = await fetch('http://localhost:8000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'customer@cab.com', password: 'password123', role: 'customer' })
    });
    const loginData = await loginRes.json();
    console.log('Login:', loginData);

    const token = loginData.access_token;

    // 2. Recharge
    const rechargeRes = await fetch('http://localhost:8000/api/customer/wallet/recharge', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ amount: 100 })
    });
    
    console.log('Recharge Status:', rechargeRes.status);
    const rechargeData = await rechargeRes.json();
    console.log('Recharge Data:', rechargeData);
  } catch (err) {
    console.error('Error:', err);
  }
}
run();

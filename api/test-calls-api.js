/**
 * Test script for Call API endpoints
 *
 * Tests:
 * 1. Register two users (Anna and Boris)
 * 2. Create a call record (Anna calls Boris)
 * 3. Get call history for Anna
 * 4. Get call history for Boris
 * 5. Mark call as missed
 * 6. Get missed calls only
 */

const API_URL = 'http://localhost:8080/api';

let annaToken = '';
let borisToken = '';
let annaId = '';
let borisId = '';
let callId = '';

async function request(method, path, body = null, token = null) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_URL}${path}`, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
  }

  return data;
}

async function test() {
  console.log('🧪 Testing Call API Endpoints\n');

  try {
    // 1. Register Anna
    console.log('1️⃣  Registering Anna...');
    const annaReg = await request('POST', '/auth/register', {
      email: `anna_call_${Date.now()}@test.com`,
      password: 'password123',
      username: `anna_call_${Date.now()}`,
    });
    annaToken = annaReg.accessToken;
    annaId = annaReg.user.id;
    console.log(`✅ Anna registered (ID: ${annaId})\n`);

    // 2. Register Boris
    console.log('2️⃣  Registering Boris...');
    const borisReg = await request('POST', '/auth/register', {
      email: `boris_call_${Date.now()}@test.com`,
      password: 'password123',
      username: `boris_call_${Date.now()}`,
    });
    borisToken = borisReg.accessToken;
    borisId = borisReg.user.id;
    console.log(`✅ Boris registered (ID: ${borisId})\n`);

    // 3. Create call record (Anna calls Boris)
    console.log('3️⃣  Creating call record (Anna → Boris)...');
    const callResponse = await request(
      'POST',
      '/calls',
      {
        receiverId: borisId,
        type: 'VIDEO',
        mode: 'NORMAL',
      },
      annaToken
    );
    callId = callResponse.call.id;
    console.log(`✅ Call created (ID: ${callId})`);
    console.log(`   Status: ${callResponse.call.status}`);
    console.log(`   Type: ${callResponse.call.type}`);
    console.log(`   Mode: ${callResponse.call.mode}\n`);

    // 4. Get call history for Anna (should see 1 OUTGOING call)
    console.log('4️⃣  Getting call history for Anna...');
    const annaHistory = await request('GET', '/calls?filter=all&limit=10', null, annaToken);
    console.log(`✅ Anna's call history: ${annaHistory.calls.length} calls`);
    if (annaHistory.calls.length > 0) {
      const call = annaHistory.calls[0];
      console.log(`   Call ID: ${call.id}`);
      console.log(`   Direction: ${call.direction}`);
      console.log(`   Status: ${call.status}`);
      console.log(`   Participant: ${call.participant.username}\n`);
    }

    // 5. Get call history for Boris (should see 1 INCOMING call)
    console.log('5️⃣  Getting call history for Boris...');
    const borisHistory = await request('GET', '/calls?filter=all&limit=10', null, borisToken);
    console.log(`✅ Boris's call history: ${borisHistory.calls.length} calls`);
    if (borisHistory.calls.length > 0) {
      const call = borisHistory.calls[0];
      console.log(`   Call ID: ${call.id}`);
      console.log(`   Direction: ${call.direction}`);
      console.log(`   Status: ${call.status}`);
      console.log(`   Participant: ${call.participant.username}\n`);
    }

    // 6. Mark call as missed
    console.log('6️⃣  Marking call as missed...');
    const missedResponse = await request('PATCH', `/calls/${callId}/missed`, null, annaToken);
    console.log(`✅ Call marked as missed`);
    console.log(`   Status: ${missedResponse.call.status}\n`);

    // 7. Get missed calls only for Anna
    console.log('7️⃣  Getting missed calls for Anna...');
    const annaMissed = await request('GET', '/calls?filter=missed&limit=10', null, annaToken);
    console.log(`✅ Anna's missed calls: ${annaMissed.calls.length} calls`);
    if (annaMissed.calls.length > 0) {
      const call = annaMissed.calls[0];
      console.log(`   Call ID: ${call.id}`);
      console.log(`   Status: ${call.status}`);
      console.log(`   Participant: ${call.participant.username}\n`);
    }

    // 8. Get missed calls only for Boris
    console.log('8️⃣  Getting missed calls for Boris...');
    const borisMissed = await request('GET', '/calls?filter=missed&limit=10', null, borisToken);
    console.log(`✅ Boris's missed calls: ${borisMissed.calls.length} calls`);
    if (borisMissed.calls.length > 0) {
      const call = borisMissed.calls[0];
      console.log(`   Call ID: ${call.id}`);
      console.log(`   Status: ${call.status}`);
      console.log(`   Participant: ${call.participant.username}\n`);
    }

    // 9. Create another call and end it
    console.log('9️⃣  Creating another call and ending it...');
    const call2Response = await request(
      'POST',
      '/calls',
      {
        receiverId: borisId,
        type: 'AUDIO',
        mode: 'NORMAL',
      },
      annaToken
    );
    const call2Id = call2Response.call.id;
    console.log(`✅ Call 2 created (ID: ${call2Id})`);

    // Wait 2 seconds to simulate call duration
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const endResponse = await request('PATCH', `/calls/${call2Id}/end`, null, annaToken);
    console.log(`✅ Call 2 ended`);
    console.log(`   Status: ${endResponse.call.status}`);
    console.log(`   Duration: ${endResponse.call.duration} seconds\n`);

    console.log('🎉 All tests passed!\n');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

test();


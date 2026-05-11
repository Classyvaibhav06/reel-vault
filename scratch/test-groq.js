require('dotenv').config({ path: '.env.local' });

async function testGroq() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error('❌ GROQ_API_KEY is missing from .env.local');
    return;
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'user',
            content: 'Say "Groq is working!" if you can read this.'
          }
        ]
      }),
    });

    const data = await response.json();
    console.log('✅ Response:', data.choices?.[0]?.message?.content);
  } catch (err) {
    console.error('❌ Groq Error:', err.message);
  }
}

testGroq();

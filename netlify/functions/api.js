exports.handler = async (event, context) => {
    // These securely grab the values from your Netlify Environment settings
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
    
    const BASE_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

    try {
        // Handle getting updates (Long Polling from JS)
        if (event.httpMethod === 'GET') {
            const { offset, limit } = event.queryStringParameters;
            const url = new URL(`${BASE_URL}/getUpdates`);
            if (offset) url.searchParams.append('offset', offset);
            if (limit) url.searchParams.append('limit', limit);

            const response = await fetch(url);
            const data = await response.json();
            return {
                statusCode: 200,
                body: JSON.stringify(data)
            };
        }

        // Handle sending alert messages and adding inline keyboards
        if (event.httpMethod === 'POST') {
            const body = JSON.parse(event.body);
            
            // Format the inline action buttons just like the original JS
            const inlineActionKeyboard = {
                inline_keyboard: [[
                    { text: "✅ Approve", callback_data: `approve_${body.actionIdentifier}` },
                    { text: "❌ Reject", callback_data: `reject_${body.actionIdentifier}` }
                ]]
            };

            const response = await fetch(`${BASE_URL}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: CHAT_ID,
                    text: body.text,
                    parse_mode: "Markdown",
                    reply_markup: inlineActionKeyboard
                })
            });
            const data = await response.json();
            return {
                statusCode: 200,
                body: JSON.stringify(data)
            };
        }
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};

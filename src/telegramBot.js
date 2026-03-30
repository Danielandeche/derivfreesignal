const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_BOT_TOKEN;
let bot = null;

if (token) {
    bot = new TelegramBot(token, { polling: false });
} else {
    console.warn('[Telegram] Warning: TELEGRAM_BOT_TOKEN is not set in .env. Messages will only print to console.');
}

const chatId = process.env.TELEGRAM_CHAT_ID;

// Track message history for deletion
const signalHistory = {
    messageIds: [],
    maxHistory: 2, // Keep only last message visible
};

/**
 * Format Market Name
 */
function getMarketName(symbol) {
    const map = {
        'R_10': 'Volatility 10 Index',
        'R_25': 'Volatility 25 Index',
        'R_50': 'Volatility 50 Index',
        'R_75': 'Volatility 75 Index',
        'R_100': 'Volatility 100 Index',
    };
    return map[symbol] || symbol;
}

/**
 * Delete old messages (keep only last message visible)
 */
async function deleteOldMessages() {
    if (signalHistory.messageIds.length >= signalHistory.maxHistory) {
        const oldMessageId = signalHistory.messageIds.shift();
        
        if (bot && chatId) {
            try {
                await bot.deleteMessage(chatId, oldMessageId);
                console.log(`[Telegram] Deleted old message: ${oldMessageId}`);
            } catch (err) {
                console.warn(`[Telegram] Could not delete message ${oldMessageId}: ${err.message}`);
            }
        }
    }
}

/**
 * Get last 10 digits and count for display
 */
function getDigitStats(ticks) {
    const digits = ticks.map(t => parseInt(String(t.quote).split('').pop()));
    const last10 = digits.slice(-10);
    return {
        digits: last10,
        digitsStr: last10.join(','),
        highCount: last10.filter(d => d >= 4).length,
        lowCount: last10.filter(d => d <= 3).length
    };
}

/**
 * Format detailed signal message
 */
function formatSignal(signal, ticks) {
    const { market, type, score } = signal;
    
    const timeOpts = { 
        timeZone: 'Africa/Nairobi', 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: false 
    };
    const entryTime = new Intl.DateTimeFormat('en-US', timeOpts).format(new Date());
    
    const stats = getDigitStats(ticks);
    
    let emoji = '⚡';
    let explanation = '';
    
    if (type === 'OVER_4') {
        emoji = '📈';
        explanation = 'Strong reversal after LOW digit saturation.\nHIGH digits (5-9) are flooding the market.';
    } else if (type === 'UNDER_5') {
        emoji = '📉';
        explanation = 'Strong reversal after HIGH digit saturation.\nLOW digits (0-4) are flooding the market.';
    } else if (type === 'EVEN') {
        emoji = '⚪';
        explanation = 'EVEN digits showing strong cluster.\nPattern continuation expected.';
    } else if (type === 'ODD') {
        emoji = '⭕';
        explanation = 'ODD digits showing strong cluster.\nPattern continuation expected.';
    } else if (type === 'RISE') {
        emoji = '📊';
        explanation = 'Price trending UPWARD.\nHigher lows and higher highs detected.';
    } else if (type === 'FALL') {
        emoji = '📊';
        explanation = 'Price trending DOWNWARD.\nLower highs and lower lows detected.';
    }
    
    const message = `${emoji} ${type} SIGNAL

📊 Market: ${getMarketName(market)}
⏰ Time: ${entryTime} EAT

🔢 Last 10 Digits: ${stats.digitsStr}
📈 High Count (4-9): ${stats.highCount}/10
📉 Low Count (0-3): ${stats.lowCount}/10

💡 Why this market?
${explanation}

🎯 CONFIDENCE: ${score.toFixed(0)}%`;

    return message;
}

/**
 * Publish signal to Telegram
 */
async function publishSignal(signal, ticks) {
    if (!bot || !chatId) {
        console.log('[Telegram] Bot not configured. Signal output:\n' + formatSignal(signal, ticks));
        return;
    }

    try {
        // Delete old messages first
        await deleteOldMessages();
        
        const messageText = formatSignal(signal, ticks);
        
        const sentMessage = await bot.sendMessage(chatId, messageText, {
            parse_mode: 'HTML',
            disable_web_page_preview: true
        });
        
        signalHistory.messageIds.push(sentMessage.message_id);
        
        console.log(`[Telegram] ✅ Signal sent successfully (Message ID: ${sentMessage.message_id})`);
    } catch (err) {
        console.error(`[Telegram] ❌ Failed to send message: ${err.message}`);
        if (err.response && err.response.statusCode === 404) {
            console.error('[Telegram] 404 Error - Check TELEGRAM_CHAT_ID format (should be number or -100xxxxx for channels)');
        }
    }
}

module.exports = {
    publishSignal,
    getMarketName
};

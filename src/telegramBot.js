const TelegramBot = require('node-telegram-bot-api');

// Setup Bot (Polling mode disabled since we only send messages)
const token = process.env.TELEGRAM_BOT_TOKEN;
let bot = null;

if (token) {
    bot = new TelegramBot(token, { polling: false });
} else {
    console.warn('[Telegram] Warning: TELEGRAM_BOT_TOKEN is not set in .env. Messages will only print to console.');
}

const chatId = process.env.TELEGRAM_CHAT_ID;

/**
 * Format Market Name
 * @param {string} symbol e.g., 'R_100'
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
 * Publishes top signal to Telegram Channel
 * @param {Object} signal 
 */
function publishSignal(signal) {
    const { market, type, score } = signal;

    // Time Formatting
    const timeOpts = { timeZone: 'Africa/Nairobi', hour: '2-digit', minute: '2-digit', hour12: true };
    const entryTime = new Intl.DateTimeFormat('en-US', timeOpts).format(new Date());

    // Reason Generator based on signal type
    let reason = "High statistical probability detected.";
    let basis = "Tick logic";
    
    if (type === 'OVER_4' || type === 'UNDER_5') {
        basis = "Digit imbalance reversal";
        reason = "- High digit saturation detected\\n- Reversal pressure active\\n- Micro-momentum confirms entry";
    } else if (type === 'EVEN' || type === 'ODD') {
        basis = "Parity clustering anomaly";
        reason = "- Strong parity clustering\\n- Recent ticks confirm heavy sequence\\n- Low alternation penalty";
    } else if (type === 'RISE' || type === 'FALL') {
        basis = "Tick momentum trend";
        reason = "- Clean short-term tick momentum\\n- Micro-trend aligns with entry\\n- Spike filter passed";
    }

    const message = `✅ DERIV TICK SIGNAL

Market: ${getMarketName(market)}
Trade Type: ${type.replace('_', ' ')}
Basis: ${basis}
Entry Time: ${entryTime} EAT
Duration: 1 tick
Confidence: ${score.toFixed(0)}%

Reason:
${reason}

Risk: Medium`;

    if (bot && chatId) {
        bot.sendMessage(chatId, message)
            .then(() => console.log(`[Telegram] Sent ${type} signal for ${market}`))
            .catch(err => console.error(`[Telegram] Failed to send message: ${err.message}`));
    } else {
        // If not configured, just console log it clearly
        console.log(`\\n\\n=========== SIGNAL SUPPRESSED (NO BOT CONFIG) ===========\\n${message}\\n=========================================================\\n\\n`);
    }
}

module.exports = {
    publishSignal
};

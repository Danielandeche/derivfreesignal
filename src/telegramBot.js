const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_BOT_TOKEN;
let bot = null;

if (token) {
    bot = new TelegramBot(token, { polling: false });
} else {
    console.warn('[Telegram] Warning: TELEGRAM_BOT_TOKEN is not set in .env. Messages will only print to console.');
}

const chatId = process.env.TELEGRAM_CHAT_ID;

// Track message IDs for editing/deleting
const signalMessages = new Map(); // market -> message ID

/**
 * Format Market Name
 */
function getMarketName(symbol) {
    const map = {
        'R_10': 'Volatility 10',
        'R_25': 'Volatility 25',
        'R_50': 'Volatility 50',
        'R_75': 'Volatility 75',
        'R_100': 'Volatility 100',
        'R_10_1s': 'Volatility 10 (1s)',
        'R_25_1s': 'Volatility 25 (1s)',
        'R_50_1s': 'Volatility 50 (1s)',
        'R_75_1s': 'Volatility 75 (1s)',
        'R_100_1s': 'Volatility 100 (1s)',
    };
    return map[symbol] || symbol;
}

/**
 * Get digit statistics
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
 * Format signal with all 6 strategies ranked
 */
function formatSignal(signalData, ticks) {
    const { market, bestSignal, allScores } = signalData;
    
    const timeOpts = { 
        timeZone: 'Africa/Nairobi', 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: false 
    };
    const entryTime = new Intl.DateTimeFormat('en-US', timeOpts).format(new Date());
    
    const stats = getDigitStats(ticks);
    
    // Rank all strategies by score
    const ranked = Object.entries(allScores)
        .sort((a, b) => b[1] - a[1])
        .map((entry, idx) => {
            const strategy = entry[0];
            const score = entry[1];
            const emoji = idx === 0 ? '🔥' : idx === 1 ? '⬆️' : idx === 2 ? '➡️' : '  ';
            return `${emoji} ${strategy.padEnd(10)} ${score.toFixed(0).padStart(3)}%`;
        });
    
    let emoji = '📊';
    if (bestSignal.type === 'OVER_4') emoji = '📈';
    else if (bestSignal.type === 'UNDER_5') emoji = '📉';
    else if (bestSignal.type === 'EVEN') emoji = '⚪';
    else if (bestSignal.type === 'ODD') emoji = '⭕';
    else if (bestSignal.type === 'RISE') emoji = '⬆️';
    else if (bestSignal.type === 'FALL') emoji = '⬇️';
    
    const message = `${emoji} <b>SIGNAL ALERT</b> 🎯

<b>Market:</b> ${getMarketName(market)}
<b>Best Strategy:</b> <u>${bestSignal.type}</u>
<b>Confidence:</b> <b>${bestSignal.score.toFixed(0)}%</b>
<b>Time:</b> ${entryTime} EAT

<b>📊 All Strategies (Ranked):</b>
<code>
${ranked.join('\n')}
</code>

<b>📈 Last 10 Digits:</b> <code>${stats.digitsStr}</code>
<b>High (4-9):</b> ${stats.highCount}/10 | <b>Low (0-3):</b> ${stats.lowCount}/10

<b>⏱️ Signal Valid For: 2 Minutes</b>`;

    return message;
}

/**
 * Send main signal to Telegram
 */
async function publishSignal(signalData, ticks) {
    if (!bot || !chatId) {
        console.log('[Telegram] Signal output:\n' + formatSignal(signalData, ticks));
        return;
    }

    try {
        const messageText = formatSignal(signalData, ticks);
        
        const sentMessage = await bot.sendMessage(chatId, messageText, {
            parse_mode: 'HTML',
            disable_web_page_preview: true
        });
        
        signalMessages.set(signalData.market, sentMessage.message_id);
        console.log(`[Telegram] ✅ Signal sent for ${signalData.market}`);
    } catch (err) {
        console.error(`[Telegram] ❌ Failed to send signal: ${err.message}`);
    }
}

/**
 * Send expiry notice
 */
async function publishExpiryNotice() {
    if (!bot || !chatId) {
        console.log('[Telegram] Expiry notice: Signals expired. Next signal in 10 minutes.');
        return;
    }

    try {
        const message = `⏰ <b>SIGNALS EXPIRED</b> ⏰

The 2-minute signals have expired.

<b>⏱️ Next Signal In: 10 Minutes</b>
🔔 Stay tuned for the next round of analysis!`;
        
        await bot.sendMessage(chatId, message, {
            parse_mode: 'HTML'
        });
        
        console.log(`[Telegram] ✅ Expiry notice sent`);
    } catch (err) {
        console.error(`[Telegram] ❌ Failed to send expiry notice: ${err.message}`);
    }
}

/**
 * Send countdown notice (1 minute before signal)
 */
async function publishCountdownNotice() {
    if (!bot || !chatId) {
        console.log('[Telegram] Countdown: Signal coming in 1 minute');
        return;
    }

    try {
        const message = `🔔 <b>SIGNAL INCOMING</b> 🔔

<b>⏱️ New signals coming in 1 minute!</b>

Get ready for fresh market analysis...`;
        
        await bot.sendMessage(chatId, message, {
            parse_mode: 'HTML'
        });
        
        console.log(`[Telegram] ✅ Countdown notice sent`);
    } catch (err) {
        console.error(`[Telegram] ❌ Failed to send countdown notice: ${err.message}`);
    }
}

module.exports = {
    publishSignal,
    publishExpiryNotice,
    publishCountdownNotice,
    getMarketName
};

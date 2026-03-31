/**
 * Signal Manager - Professional Telegram Signal Publishing
 */

const TelegramBot = require('node-telegram-bot-api');

class SignalManager {
    constructor() {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        this.bot = token ? new TelegramBot(token, { polling: false }) : null;
        this.chatId = process.env.TELEGRAM_CHAT_ID;
        this.messageIds = new Map();
        
        if (!token) {
            console.warn('[SignalManager] ⚠️  TELEGRAM_BOT_TOKEN not set. Console output only.');
        }
        if (!this.chatId) {
            console.warn('[SignalManager] ⚠️  TELEGRAM_CHAT_ID not set. Console output only.');
        }
    }

    /**
     * Send signal batch
     */
    async sendSignalBatch(signals, batchNumber = 1) {
        if (!this.bot || !this.chatId) {
            console.warn('[SignalManager] ⚠️  Bot not configured. Console output:');
            this.consoleOutput(this.formatBatch(signals, batchNumber));
            return;
        }

        try {
            const message = this.formatBatch(signals, batchNumber);
            const sent = await this.bot.sendMessage(this.chatId, message, { parse_mode: 'HTML' });
            this.messageIds.set(`batch_${batchNumber}`, sent.message_id);
            console.log(`[SignalManager] ✅ Signal batch sent to chat ${this.chatId} (${signals.length} markets)`);
        } catch (err) {
            console.error(`[SignalManager] ❌ Failed to send batch: ${err.message}`);
            if (err.message.includes('404')) {
                console.error(`
[SignalManager] TELEGRAM ERROR: 404 Not Found
This means your TELEGRAM_CHAT_ID is wrong!

How to fix:
1. Add this bot to get your chat ID: @userinfobot
   - Type: /start
   - It will show your ID (e.g., 123456789)

2. If using a GROUP or CHANNEL:
   - Add the bot to the group first
   - Send any message in the group
   - Use: @userinfobot -> /my_id
   - It will show the group ID (format: -100XXXXXXXXX)

3. Update your .env file:
   TELEGRAM_CHAT_ID=your_id_here

4. Restart: npm start

Current chatId in .env: ${this.chatId}
`);
            }
            console.log(`[SignalManager] 📝 Signal output to console instead:`);
            this.consoleOutput(this.formatBatch(signals, batchNumber));
        }
    }

    /**
     * Send expiry notice
     */
    async sendExpiryNotice() {
        if (!this.bot || !this.chatId) {
            this.consoleOutput(this.formatExpiryNotice());
            return;
        }

        try {
            const message = this.formatExpiryNotice();
            await this.bot.sendMessage(this.chatId, message, { parse_mode: 'HTML' });
            console.log(`[SignalManager] ✅ Expiry notice sent`);
        } catch (err) {
            if (err.message.includes('404')) {
                console.error(`[SignalManager] ❌ Expiry failed: Invalid TELEGRAM_CHAT_ID (${this.chatId})`);
            } else {
                console.error(`[SignalManager] ❌ Failed to send expiry: ${err.message}`);
            }
        }
    }

    /**
     * Send countdown notice
     */
    async sendCountdownNotice() {
        if (!this.bot || !this.chatId) {
            this.consoleOutput(this.formatCountdownNotice());
            return;
        }

        try {
            const message = this.formatCountdownNotice();
            await this.bot.sendMessage(this.chatId, message, { parse_mode: 'HTML' });
            console.log(`[SignalManager] ✅ Countdown notice sent`);
        } catch (err) {
            if (err.message.includes('404')) {
                console.error(`[SignalManager] ❌ Countdown failed: Invalid TELEGRAM_CHAT_ID (${this.chatId})`);
            } else {
                console.error(`[SignalManager] ❌ Failed to send countdown: ${err.message}`);
            }
        }
    }

    /**
     * Format signal batch for display
     */
    formatBatch(signals, batchNumber) {
        if (signals.length === 0) {
            return `<b>📊 ANALYSIS CYCLE #${batchNumber}</b>\n\n⚠️ No strong signals generated.\nWaiting for next cycle...`;
        }

        let message = `<b>🎯 SIGNAL CYCLE #${batchNumber}</b>\n<b>⏰ ${this.getTime()}</b>\n\n`;
        message += `<b>📊 Active Signals: ${signals.length}/13 Markets</b>\n`;
        message += `${'─'.repeat(50)}\n\n`;

        signals.forEach((signal, idx) => {
            const { market, best, allScores, timestamp } = signal;
            const marketName = this.getMarketName(market);
            
            // Rank signals
            const ranked = Object.entries(allScores)
                .sort((a, b) => b[1] - a[1])
                .map((e, i) => {
                    const score = parseInt(e[1]);
                    const bars = '█'.repeat(Math.ceil(score / 10));
                    return `  ${i === 0 ? '🔥' : i === 1 ? '⬆️ ' : '  '} ${e[0].padEnd(14)} ${bars} ${score}%`;
                });

            message += `<b>${idx + 1}. ${marketName}</b>\n`;
            message += `   <b>Top:</b> ${best.signal} (${parseInt(best.score)}%)\n`;
            message += `<code>\n${ranked.slice(0, 3).join('\n')}\n</code>\n\n`;
        });

        message += `${'─'.repeat(50)}\n`;
        message += `<b>⏱️  Signal Duration: 2 Minutes</b>\n`;
        message += `<b>🔔 Next Round: In 10 Minutes</b>`;

        return message;
    }

    /**
     * Format expiry notice
     */
    formatExpiryNotice() {
        return `<b>⏰ SIGNALS EXPIRED ⏰</b>\n\n` +
               `Previous signals are no longer valid.\n\n` +
               `<b>⏱️  Wait Time: 8 Minutes</b>\n` +
               `<b>🔔 Next Signal: In ~8 Minutes</b>\n\n` +
               `<i>Preparing next analysis cycle...</i>`;
    }

    /**
     * Format countdown notice
     */
    formatCountdownNotice() {
        return `<b>🔔 ALERT: SIGNAL INCOMING 🔔</b>\n\n` +
               `<b>⏱️  Get ready!</b>\n` +
               `<b>⏳ New signals in 1 MINUTE</b>\n\n` +
               `Fresh market analysis incoming...`;
    }

    /**
     * Get market name
     */
    getMarketName(symbol) {
        const names = {
            'R_10': '🔟 Vol 10',
            'R_25': '2️⃣5️⃣ Vol 25',
            'R_50': '5️⃣0️⃣ Vol 50',
            'R_75': '7️⃣5️⃣ Vol 75',
            'R_100': '💯 Vol 100',
        };
        return names[symbol] || symbol;
    }

    /**
     * Get formatted time
     */
    getTime() {
        const opts = {
            timeZone: 'Africa/Nairobi',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        };
        return new Intl.DateTimeFormat('en-US', opts).format(new Date());
    }

    /**
     * Console output when bot is not configured
     */
    consoleOutput(message) {
        console.log(`\n${'═'.repeat(60)}`);
        console.log(message.replace(/<[^>]*>/g, ''));
        console.log(`${'═'.repeat(60)}\n`);
    }
}

module.exports = SignalManager;

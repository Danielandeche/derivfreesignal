require('dotenv').config();
const { initDerivScanner, getMarketTicks, getActiveMarkets } = require('./derivScanner');
const { evaluateAll } = require('./scoringEngine');
const { publishSignal } = require('./telegramBot');

const INTERVAL_MS = parseInt(process.env.EVALUATION_INTERVAL_MS || 600000, 10); // 10 minutes default
const MIN_CONFIDENCE_SCORE = 80;

console.log('===================================================');
console.log('   Starting Deriv Tick-Based Telegram Bot   ');
console.log(`   Evaluation Interval: ${INTERVAL_MS / 1000 / 60} minutes`);
console.log('===================================================');

// 1. Start capturing ticks
initDerivScanner();

// 2. Setup the loop
setInterval(evaluateMarketCycle, INTERVAL_MS);

/**
 * Runs every X minutes. Scans 25 ticks of all markets, applies 6 strategies,
 * finds the highest confidence score. If it exceeds threshold, publishes to Telegram.
 */
function evaluateMarketCycle() {
    console.log(`\\n[Core] Running 10-minute Evaluation Cycle... (${new Date().toLocaleString()})`);
    const marketTicks = getMarketTicks();
    const activeMarkets = getActiveMarkets();

    let bestSignal = null;
    let highestScore = 0;

    activeMarkets.forEach(market => {
        const ticks = marketTicks[market];

        // Wait until we have a full window of 25 ticks
        if (!ticks || ticks.length < 25) {
            console.log(`  - [${market}] Skipping: Insufficient ticks (${ticks ? ticks.length : 0}/25)`);
            return;
        }

        // Apply scoring formulas
        const scores = evaluateAll(ticks);
        
        // Find best strategy in this market
        let marketBestType = null;
        let marketBestScore = 0;

        for (const [strategy, score] of Object.entries(scores)) {
            if (score > marketBestScore) {
                marketBestScore = score;
                marketBestType = strategy;
            }
        }

        console.log(`  - [${market}] Best: ${marketBestType} (${marketBestScore} pts)`);

        // Compare against global best
        if (marketBestScore > highestScore) {
            highestScore = marketBestScore;
            bestSignal = {
                market: market,
                type: marketBestType,
                score: highestScore
            };
        }
    });

    console.log('---------------------------------------------------');
    if (highestScore >= MIN_CONFIDENCE_SCORE && bestSignal) {
        console.log(`[Core] 🚀 WINNER FOUND: ${bestSignal.market} -> ${bestSignal.type} with ${highestScore} pts! Publishing...`);
        publishSignal(bestSignal);
    } else if (highestScore > 0) {
        console.log(`[Core] 📉 Top score was only ${highestScore}. Below ${MIN_CONFIDENCE_SCORE} threshold. Skipping this interval.`);
    } else {
        console.log(`[Core] ⏳ No viable signals generated. Waiting for next cycle.`);
    }
}

// Keep the process alive handle unhandled exceptions cleanly so Railway won't restart loop constantly
process.on('uncaughtException', (err) => {
    console.error('[CRITICAL ERROR] Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('[CRITICAL ERROR] Unhandled Rejection at:', promise, 'reason:', reason);
});

require('dotenv').config();
const { initDerivScanner, getMarketTicks, getActiveMarkets } = require('./derivScanner');
const { evaluateAll } = require('./scoringEngine');
const { publishSignal } = require('./telegramBot');

const INTERVAL_MS = parseInt(process.env.EVALUATION_INTERVAL_MS || 300000, 10); // 5 minutes default
const MIN_CONFIDENCE_SCORE = 80; // High confidence threshold for quality signals

console.log('===================================================');
console.log('   Starting Deriv Tick-Based Telegram Bot   ');
console.log(`   Evaluation Interval: ${INTERVAL_MS / 1000 / 60} minutes`);
console.log(`   Confidence Threshold: ${MIN_CONFIDENCE_SCORE}%`);
console.log('===================================================');

// 1. Start capturing ticks
initDerivScanner();

// 2. Setup the loop
setInterval(evaluateMarketCycle, INTERVAL_MS);

// Run first evaluation after enough ticks are collected (~40 seconds)
setTimeout(evaluateMarketCycle, 40000);

/**
 * Runs every X minutes. Scans 25 ticks of all markets, applies all 6 strategies,
 * finds the highest confidence score. If it exceeds threshold, publishes to Telegram.
 */
function evaluateMarketCycle() {
    console.log(`\n[Core] Running Evaluation Cycle... (${new Date().toLocaleString()})`);
    const marketTicks = getMarketTicks();
    const activeMarkets = getActiveMarkets();

    let bestSignal = null;
    let bestTicks = null;
    let highestScore = 0;

    activeMarkets.forEach(market => {
        const ticks = marketTicks[market];

        // Wait until we have a full window of 25 ticks
        if (!ticks || ticks.length < 25) {
            console.log(`  - [${market}] Skipping: Insufficient ticks (${ticks ? ticks.length : 0}/25)`);
            return;
        }

        // Apply all 6 scoring strategies
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

        console.log(`  - [${market}] Best: ${marketBestType} (${marketBestScore.toFixed(0)}%)`);

        // Compare against global best
        if (marketBestScore > highestScore) {
            highestScore = marketBestScore;
            bestSignal = {
                market: market,
                type: marketBestType,
                score: highestScore
            };
            bestTicks = ticks;
        }
    });

    console.log('---------------------------------------------------');
    if (highestScore >= MIN_CONFIDENCE_SCORE && bestSignal) {
        console.log(`[Core] 🚀 WINNER FOUND: ${bestSignal.market} -> ${bestSignal.type} (${highestScore.toFixed(0)}%)! Publishing...`);
        publishSignal(bestSignal, bestTicks);
    } else if (highestScore > 0) {
        console.log(`[Core] 📉 Top score was ${highestScore.toFixed(0)}%. Below ${MIN_CONFIDENCE_SCORE}% threshold. Skipping this cycle.`);
    } else {
        console.log(`[Core] ⏳ No viable signals generated. Waiting for next cycle.`);
    }
}

// Keep the process alive and handle unhandled exceptions cleanly
process.on('uncaughtException', (err) => {
    console.error('[CRITICAL ERROR] Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('[CRITICAL ERROR] Unhandled Rejection at:', promise, 'reason:', reason);
});

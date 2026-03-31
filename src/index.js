/**
 * COMPLETELY REDESIGNED BOT - From Ground Up
 * Professional Deriv Signal System with Advanced Analysis
 */

require('dotenv').config();

const { initDerivScanner, getMarketTicks, getActiveMarkets } = require('./derivScanner');
const { analyzeAllSignals } = require('./analysisEngine');
const Scheduler = require('./scheduler');
const SignalManager = require('./signalManager');

// Configuration
const SIGNAL_CYCLE = 10 * 60 * 1000; // 10 minutes
const SIGNAL_DURATION = 2 * 60 * 1000; // 2 minutes
const MIN_CONFIDENCE = 75; // 75% confidence threshold

console.log(`
╔${'═'.repeat(58)}╗
║  🚀 DERIV AUTOMATED SIGNAL SYSTEM - REDESIGNED 🚀        ║
║                                                          ║
║  Strategy: Advanced Price Action Analysis              ║
║  Markets: 5 Volatility Indices (Deriv)                 ║
║  Signals: Every 10 minutes                             ║
║  Duration: 2 minutes per signal                        ║
║  Methods: BREAKOUT | REVERSION | VOLATILITY |          ║
║           CONSOLIDATION | TREND | REVERSAL             ║
╚${'═'.repeat(58)}╝`);

// Initialize
const scheduler = new Scheduler();
const signalManager = new SignalManager();
let cycleNumber = 0;

// Start market scanner
initDerivScanner();

// Wait 90 seconds for initial tick collection, then start
setTimeout(() => {
    console.log('\n[System] Initial tick collection complete. Starting signal cycles...\n');
    
    // Run first cycle immediately
    runAnalysisCycle();
    
    // Then repeat every 10 minutes
    scheduler.scheduleRepeating('main-analysis', SIGNAL_CYCLE, runAnalysisCycle);
    
    // Schedule expiry notice (at 2-minute mark of each cycle)
    scheduler.scheduleRelative('expiry-notice', SIGNAL_CYCLE, SIGNAL_DURATION, () => {
        signalManager.sendExpiryNotice();
    });
    
    // Schedule countdown notice (at 9-minute mark - 1 minute before next signal)
    scheduler.scheduleRelative('countdown-notice', SIGNAL_CYCLE, SIGNAL_CYCLE - 60000, () => {
        signalManager.sendCountdownNotice();
    });
}, 90000);

/**
 * Main Analysis Cycle - Runs every 10 minutes
 */
async function runAnalysisCycle() {
    cycleNumber++;
    const cycleStart = Date.now();
    
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`[CYCLE #${cycleNumber}] Started at ${new Date().toLocaleTimeString()}`);
    console.log(`${'═'.repeat(70)}`);

    const marketTicks = getMarketTicks();
    const activeMarkets = getActiveMarkets();
    
    const signals = [];
    let analyzed = 0;
    let qualified = 0;

    // Analyze each market with statistical methods
    activeMarkets.forEach(market => {
        const ticks = marketTicks[market];

        if (!ticks || ticks.length < 25) {
            console.log(`  ⏳ [${market.padEnd(8)}] Insufficient ticks (${ticks?.length || 0}/25)`);
            return;
        }

        analyzed++;

        // Get all 6 signal types using new analysis engine
        const allScores = analyzeAllSignals(ticks);
        
        // Find best signal
        let bestSignal = null;
        let bestScore = 0;
        
        for (const [signalType, score] of Object.entries(allScores)) {
            if (score > bestScore) {
                bestScore = score;
                bestSignal = signalType;
            }
        }

        // Format scores for display
        const scored = Object.entries(allScores)
            .sort((a, b) => b[1] - a[1])
            .map(e => `${e[0]}:${parseInt(e[1])}%`)
            .join(' | ');

        console.log(`  ✅ [${market.padEnd(8)}] ${bestSignal.padEnd(14)} ${parseInt(bestScore).toString().padStart(3)}% | ${scored}`);

        // Qualified signal (above threshold)
        if (bestScore >= MIN_CONFIDENCE) {
            signals.push({
                market,
                best: { signal: bestSignal, score: bestScore },
                allScores,
                timestamp: new Date(),
                ticks
            });
            qualified++;
        }
    });

    console.log(`${'─'.repeat(70)}`);
    console.log(`[Analysis] Analyzed: ${analyzed}/5 | Qualified: ${qualified} (>${MIN_CONFIDENCE}%)`);
    console.log(`${'─'.repeat(70)}`);

    // Send signals to Telegram
    if (signals.length > 0) {
        await signalManager.sendSignalBatch(signals, cycleNumber);
        console.log(`\n✅ Published ${signals.length} signals to Telegram group\n`);
    } else {
        console.log(`\n⚠️  No signals qualified. Waiting for next cycle...\n`);
    }

    const cycleEnd = Date.now();
    console.log(`[Cycle Complete] Duration: ${(cycleEnd - cycleStart)}ms`);
    console.log(`[Next Cycle] In 10 minutes\n`);
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n[System] Shutting down gracefully...');
    scheduler.clearAll();
    process.exit(0);
});

process.on('uncaughtException', (err) => {
    console.error('[FATAL ERROR]', err);
});

process.on('unhandledRejection', (reason) => {
    console.error('[UNHANDLED REJECTION]', reason);
});

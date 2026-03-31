/**
 * COMPLETELY REDESIGNED BOT - With Debugging
 */

require('dotenv').config();

console.log('[Startup] Loading modules...');

try {
    const { initDerivScanner, getMarketTicks, getActiveMarkets } = require('./derivScanner');
    console.log('[Startup] ✅ derivScanner loaded');
    
    const { analyzeAllSignals } = require('./analysisEngine');
    console.log('[Startup] ✅ analysisEngine loaded');
    
    const SignalManager = require('./signalManager');
    console.log('[Startup] ✅ signalManager loaded');

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
    const signalManager = new SignalManager();
    console.log('[Startup] ✅ SignalManager initialized');
    
    let cycleNumber = 0;

    // Start market scanner
    initDerivScanner();
    console.log('[Startup] ✅ DerivScanner initialized');

    // Wait 90 seconds for initial tick collection, then start
    console.log('[Startup] ⏳ Waiting 90 seconds for tick collection before first cycle...');
    console.log('[DEBUG] Setting up 90-second timeout NOW');
    
    const startTimeout = setTimeout(async () => {
        console.log('\n[System] ✅ 90 SECOND TIMER FIRED - Starting cycles now!\n');
        
        // Verify ticks are available before running cycle
        let attempts = 0;
        let hasEnoughTicks = false;
        
        while (attempts < 30 && !hasEnoughTicks) {
            const marketTicks = getMarketTicks();
            const r10Ticks = marketTicks.R_10 || [];
            
            if (r10Ticks.length >= 25) {
                hasEnoughTicks = true;
                console.log(`[System] ✅ Ticks ready: ${r10Ticks.length} ticks collected`);
            } else {
                attempts++;
                if (attempts % 5 === 0) {
                    console.log(`[System] Waiting for ticks... (${r10Ticks.length}/25) - Attempt ${attempts}`);
                }
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
            }
        }
        
        if (!hasEnoughTicks) {
            console.warn('[System] ⚠️  Timed out waiting for ticks. Starting cycle anyway...');
        }
        
        // Run first cycle immediately
        console.log('[System] Running first cycle immediately...');
        try {
            runAnalysisCycle().catch(err => {
                console.error('[CYCLE ERROR] First cycle failed:', err.message);
                console.error(err.stack);
            });
        } catch (err) {
            console.error('[CYCLE ERROR] Sync error in first cycle:', err.message);
            console.error(err.stack);
        }
        
        // Then repeat every 10 minutes
        console.log('[System] Setting up recurring cycles every 10 minutes...');
        setInterval(() => {
            runAnalysisCycle().catch(err => {
                console.error('[CYCLE ERROR] Recurring cycle failed:', err.message);
                console.error(err.stack);
            });
        }, SIGNAL_CYCLE);
        
        // Schedule expiry notice (after 2 minutes of each cycle)
        setInterval(() => {
            signalManager.sendExpiryNotice();
        }, SIGNAL_CYCLE + SIGNAL_DURATION);
        
        // Schedule countdown notice (at 9 minutes into each cycle)
        setInterval(() => {
            signalManager.sendCountdownNotice();
        }, SIGNAL_CYCLE + (SIGNAL_CYCLE - 60000));
        
    }, 90000);
    
    console.log('[DEBUG] 90-second timeout is now pending. Bot is ready and waiting...');

    /**
     * Main Analysis Cycle - Runs every 10 minutes
     */
    async function runAnalysisCycle() {
        cycleNumber++;
        const cycleStart = Date.now();
        
        console.log(`\n${'═'.repeat(70)}`);
        console.log(`[CYCLE #${cycleNumber}] Started at ${new Date().toLocaleTimeString()}`);
        console.log(`${'═'.repeat(70)}`);

        try {
            const marketTicks = getMarketTicks();
            console.log(`[CYCLE] Got market ticks`);
            
            const activeMarkets = getActiveMarkets();
            console.log(`[CYCLE] Got active markets: ${activeMarkets.join(', ')}`);
            
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

                try {
                    // Get all 6 signal types using new analysis engine
                    const allScores = analyzeAllSignals(ticks);
                    console.log(`[CYCLE] ${market} scores: ${JSON.stringify(allScores)}`);
                    
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
                } catch (err) {
                    console.error(`  ❌ [${market}] Analysis error: ${err.message}`);
                    console.error(err.stack);
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

        } catch (err) {
            console.error(`[CYCLE ERROR] ${err.message}`);
            console.error(err.stack);
        }
    }

    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n\n[System] Shutting down gracefully...');
        clearTimeout(startTimeout);
        process.exit(0);
    });

    process.on('uncaughtException', (err) => {
        console.error('[FATAL ERROR]', err.message);
        console.error(err.stack);
    });

    process.on('unhandledRejection', (reason) => {
        console.error('[UNHANDLED REJECTION]', reason);
    });

} catch (err) {
    console.error('[STARTUP ERROR] Failed to load modules:');
    console.error(err.message);
    console.error(err.stack);
    process.exit(1);
}

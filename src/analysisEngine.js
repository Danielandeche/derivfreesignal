/**
 * Advanced Analysis Engine - Completely New Strategy
 * Uses Statistical Analysis, Price Action, and Volatility Detection
 */

/**
 * Calculate Statistical Metrics
 */
function getStatistics(ticks) {
    if (ticks.length < 25) return null;

    const prices = ticks.map(t => t.quote);
    
    // Basic stats
    const mean = prices.reduce((a, b) => a + b) / prices.length;
    const variance = prices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);
    
    // Trend
    const first5 = prices.slice(0, 5).reduce((a, b) => a + b) / 5;
    const last5 = prices.slice(-5).reduce((a, b) => a + b) / 5;
    const trendStrength = Math.abs(last5 - first5) / stdDev;
    
    // Volatility (recent vs historical)
    const histVolatility = stdDev;
    const recentPrices = prices.slice(-10);
    const recentStdDev = Math.sqrt(
        recentPrices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / recentPrices.length
    );
    const volatilityRatio = recentStdDev / (histVolatility || 1);
    
    return {
        mean,
        stdDev,
        min: Math.min(...prices),
        max: Math.max(...prices),
        range: Math.max(...prices) - Math.min(...prices),
        trendStrength: Math.abs(trendStrength),
        trendDirection: last5 > first5 ? 'UP' : 'DOWN',
        volatilityRatio,
        recentStdDev,
        prices
    };
}

/**
 * Detect Breakout Signals (price breaking support/resistance)
 */
function analyzeBreakout(ticks) {
    if (ticks.length < 25) return 0;
    
    const stats = getStatistics(ticks);
    const prices = stats.prices;
    
    // Support/Resistance (based on recent highs/lows)
    const recent12 = prices.slice(-12);
    const recent12High = Math.max(...recent12);
    const recent12Low = Math.min(...recent12);
    const older13 = prices.slice(0, 13);
    const older13High = Math.max(...older13);
    const older13Low = Math.min(...older13);
    
    let breakoutScore = 0;
    
    // BULLISH breakout: recent price above old resistance
    if (recent12High > older13High) {
        breakoutScore += 30;
        // Strength: how much above
        if (recent12High > older13High * 1.005) breakoutScore += 20;
    }
    
    // BEARISH breakout: recent price below old support
    if (recent12Low < older13Low) {
        breakoutScore += 30;
        if (recent12Low < older13Low * 0.995) breakoutScore += 20;
    }
    
    // Last 3 candles trending (momentum confirmation)
    const last3 = prices.slice(-3);
    if (last3[2] > last3[1] && last3[1] > last3[0]) breakoutScore += 20;
    else if (last3[2] < last3[1] && last3[1] < last3[0]) breakoutScore += 20;
    
    return Math.min(100, breakoutScore);
}

/**
 * Detect Mean Reversion (oversold/overbought)
 */
function analyzeMeanReversion(ticks) {
    if (ticks.length < 25) return 0;
    
    const stats = getStatistics(ticks);
    const prices = stats.prices;
    const currentPrice = prices[prices.length - 1];
    
    let reversionScore = 0;
    
    // Price is above 2 std dev (overbought)
    if (currentPrice > stats.mean + (2 * stats.stdDev)) {
        reversionScore += 35;
        // Add bonus if recent volatility is high (likely to revert)
        if (stats.volatilityRatio > 1.2) reversionScore += 25;
    }
    
    // Price is below 2 std dev (oversold)
    if (currentPrice < stats.mean - (2 * stats.stdDev)) {
        reversionScore += 35;
        if (stats.volatilityRatio > 1.2) reversionScore += 25;
    }
    
    // One std dev extreme
    if (currentPrice > stats.mean + stats.stdDev && currentPrice <= stats.mean + (2 * stats.stdDev)) {
        reversionScore += 20;
    }
    
    return Math.min(100, reversionScore);
}

/**
 * Detect Volatility Expansion (quiet market about to explode)
 */
function analyzeVolatilityShift(ticks) {
    if (ticks.length < 25) return 0;
    
    const stats = getStatistics(ticks);
    let volatilityScore = 0;
    
    // Recent volatility HIGHER than historical (expansion)
    if (stats.volatilityRatio > 1.3) {
        volatilityScore += 40;
    } else if (stats.volatilityRatio > 1.15) {
        volatilityScore += 25;
    }
    
    // Check if volatility was low then spiked
    const older12 = ticks.slice(0, 12).map(t => t.quote);
    const older12StdDev = Math.sqrt(
        older12.reduce((a, b) => a + Math.pow(b - stats.mean, 2), 0) / older12.length
    );
    
    if (stats.recentStdDev > (older12StdDev * 1.5)) {
        volatilityScore += 35;
    }
    
    // Last 3 moves are larger than average
    const prices = stats.prices;
    const avgMove = stats.range / prices.length;
    const lastMoves = [
        Math.abs(prices[prices.length - 1] - prices[prices.length - 2]),
        Math.abs(prices[prices.length - 2] - prices[prices.length - 3]),
        Math.abs(prices[prices.length - 3] - prices[prices.length - 4])
    ];
    
    if (lastMoves.every(m => m > avgMove)) {
        volatilityScore += 25;
    }
    
    return Math.min(100, volatilityScore);
}

/**
 * Detect Consolidation (trending sideways - calm before storm)
 */
function analyzeConsolidation(ticks) {
    if (ticks.length < 25) return 0;
    
    const stats = getStatistics(ticks);
    const prices = stats.prices;
    let consolidationScore = 0;
    
    // Low volatility (narrow range)
    const avgMove = stats.range / prices.length;
    if (stats.recentStdDev < (stats.stdDev * 0.7)) {
        consolidationScore += 30;
    }
    
    // Price stuck within narrow band
    if (stats.range < stats.mean * 0.01) {
        consolidationScore += 35;
    }
    
    // Trend strength is very low (no direction)
    if (stats.trendStrength < 0.5) {
        consolidationScore += 25;
    }
    
    // Last few candles very small
    const lastMoves = [];
    for (let i = prices.length - 1; i > prices.length - 6; i--) {
        lastMoves.push(Math.abs(prices[i] - prices[i - 1]));
    }
    const avgLastMove = lastMoves.reduce((a, b) => a + b) / lastMoves.length;
    if (avgLastMove < avgMove * 0.5) {
        consolidationScore += 20;
    }
    
    return Math.min(100, consolidationScore);
}

/**
 * Detect Strong Trend (consistent directional movement)
 */
function analyzeTrend(ticks) {
    if (ticks.length < 25) return 0;
    
    const stats = getStatistics(ticks);
    const prices = stats.prices;
    let trendScore = 0;
    
    // Strong trend strength indicator
    if (stats.trendStrength > 2) {
        trendScore += 40;
    } else if (stats.trendStrength > 1) {
        trendScore += 25;
    }
    
    // Directional consistency (many candles in one direction)
    let upCandles = 0, downCandles = 0;
    for (let i = 1; i < prices.length; i++) {
        if (prices[i] > prices[i - 1]) upCandles++;
        else downCandles++;
    }
    
    const consistency = Math.max(upCandles, downCandles) / prices.length;
    if (consistency > 0.72) {
        trendScore += 35;
    }
    
    // Moving average confirmation
    const ma5 = prices.slice(-5).reduce((a, b) => a + b) / 5;
    const ma10 = prices.slice(-10).reduce((a, b) => a + b) / 10;
    const ma20 = prices.slice(0, 20).reduce((a, b) => a + b) / 20;
    
    // Golden cross patterns (short MA above long MA)
    if (ma5 > ma10 && ma10 > ma20) {
        trendScore += 25;
    } else if (ma5 < ma10 && ma10 < ma20) {
        trendScore += 25;
    }
    
    return Math.min(100, trendScore);
}

/**
 * Detect Reversal Patterns (momentum loss)
 */
function analyzeReversal(ticks) {
    if (ticks.length < 25) return 0;
    
    const stats = getStatistics(ticks);
    const prices = stats.prices;
    let reversalScore = 0;
    
    // Diminishing momentum (moves getting smaller)
    const move1 = Math.abs(prices[prices.length - 1] - prices[prices.length - 2]);
    const move2 = Math.abs(prices[prices.length - 2] - prices[prices.length - 3]);
    const move3 = Math.abs(prices[prices.length - 3] - prices[prices.length - 4]);
    
    if (move1 < move2 && move2 < move3) {
        reversalScore += 30;
    }
    
    // Price at extreme (high/low) of recent period
    const recent10 = prices.slice(-10);
    const maxPrice = Math.max(...recent10);
    const minPrice = Math.min(...recent10);
    
    if (prices[prices.length - 1] >= maxPrice * 0.98 || prices[prices.length - 1] <= minPrice * 1.02) {
        reversalScore += 25;
    }
    
    // Wicks/shadows (rejection candles)
    if (prices.length >= 5) {
        const lastCandle = prices[prices.length - 1];
        const prev = prices[prices.length - 2];
        if (Math.abs(lastCandle - prev) < stats.stdDev * 0.3) {
            reversalScore += 20;
        }
    }
    
    return Math.min(100, reversalScore);
}

/**
 * All-in-one Analysis - returns all 5 signals
 */
function analyzeAllSignals(ticks) {
    return {
        BREAKOUT: analyzeBreakout(ticks),
        REVERSION: analyzeMeanReversion(ticks),
        VOLATILITY: analyzeVolatilityShift(ticks),
        CONSOLIDATION: analyzeConsolidation(ticks),
        TREND: analyzeTrend(ticks),
        REVERSAL: analyzeReversal(ticks)
    };
}

module.exports = {
    analyzeAllSignals,
    getStatistics,
    analyzeBreakout,
    analyzeMeanReversion,
    analyzeVolatilityShift,
    analyzeConsolidation,
    analyzeTrend,
    analyzeReversal
};

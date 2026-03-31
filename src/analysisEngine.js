/**
 * Deriv Signal Analysis Engine
 * 6 Original Digit-Based Strategies
 */

/**
 * EVEN: Price ends on an even digit (0, 2, 4, 6, 8)
 * Score based on how many even endings in recent ticks
 */
function analyzeEven(ticks) {
    if (!ticks || ticks.length === 0) return 0;
    
    let evenCount = 0;
    ticks.forEach(tick => {
        const digit = Math.floor(tick.quote * 10) % 10; // Last digit
        if (digit % 2 === 0) evenCount++;
    });
    
    return (evenCount / ticks.length) * 100;
}

/**
 * ODD: Price ends on an odd digit (1, 3, 5, 7, 9)
 * Score based on how many odd endings in recent ticks
 */
function analyzeOdd(ticks) {
    if (!ticks || ticks.length === 0) return 0;
    
    let oddCount = 0;
    ticks.forEach(tick => {
        const digit = Math.floor(tick.quote * 10) % 10; // Last digit
        if (digit % 2 === 1) oddCount++;
    });
    
    return (oddCount / ticks.length) * 100;
}

/**
 * OVER_4: Price ends on digit > 4 (5, 6, 7, 8, 9)
 * Score based on how many high digits in recent ticks
 */
function analyzeOver4(ticks) {
    if (!ticks || ticks.length === 0) return 0;
    
    let over4Count = 0;
    ticks.forEach(tick => {
        const digit = Math.floor(tick.quote * 10) % 10; // Last digit
        if (digit > 4) over4Count++;
    });
    
    return (over4Count / ticks.length) * 100;
}

/**
 * UNDER_5: Price ends on digit < 5 (0, 1, 2, 3, 4)
 * Score based on how many low digits in recent ticks
 */
function analyzeUnder5(ticks) {
    if (!ticks || ticks.length === 0) return 0;
    
    let under5Count = 0;
    ticks.forEach(tick => {
        const digit = Math.floor(tick.quote * 10) % 10; // Last digit
        if (digit < 5) under5Count++;
    });
    
    return (under5Count / ticks.length) * 100;
}

/**
 * RISE: Price tends to go up
 * Score based on closing price relative to opening
 */
function analyzeRise(ticks) {
    if (!ticks || ticks.length < 2) return 0;
    
    const openPrice = ticks[0].quote;
    const closePrice = ticks[ticks.length - 1].quote;
    
    if (closePrice > openPrice) {
        // Uptrend: score based on how strong
        const riseStrength = ((closePrice - openPrice) / openPrice) * 10000;
        return Math.min(100, riseStrength * 10);
    }
    
    return 0;
}

/**
 * FALL: Price tends to go down
 * Score based on closing price relative to opening
 */
function analyzeFall(ticks) {
    if (!ticks || ticks.length < 2) return 0;
    
    const openPrice = ticks[0].quote;
    const closePrice = ticks[ticks.length - 1].quote;
    
    if (closePrice < openPrice) {
        // Downtrend: score based on how strong
        const fallStrength = ((openPrice - closePrice) / openPrice) * 10000;
        return Math.min(100, fallStrength * 10);
    }
    
    return 0;
}

/**
 * Analyze all 6 original signals
 * Returns object with scores for each signal type
 */
function analyzeAllSignals(ticks) {
    return {
        EVEN: analyzeEven(ticks),
        ODD: analyzeOdd(ticks),
        OVER_4: analyzeOver4(ticks),
        UNDER_5: analyzeUnder5(ticks),
        RISE: analyzeRise(ticks),
        FALL: analyzeFall(ticks)
    };
}

module.exports = {
    analyzeAllSignals,
    analyzeEven,
    analyzeOdd,
    analyzeOver4,
    analyzeUnder5,
    analyzeRise,
    analyzeFall
};

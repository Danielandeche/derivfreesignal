/**
 * Scoring engine for Deriv Signal Bot.
 * Each function takes an array of the last 25 ticks.
 * Returns a score from 0 to 100.
 */

function calculateOver4(ticks) {
    if (ticks.length < 25) return 0;
    
    // Extract last digits
    const digits = ticks.map(t => parseInt(t.quote.toString().split('').pop()));
    
    // Historical Saturation (Max 35 pts) - Strong LOW digit dominance in older window
    const olderWindow = digits.slice(0, 17);
    const lowCount = olderWindow.filter(d => d <= 4).length;
    const lowRatio = lowCount / 17;
    
    let historicalScore = 0;
    if (lowRatio >= 0.76) historicalScore = 35;
    else if (lowRatio >= 0.64) historicalScore = 20;
    
    // Reversal Pressure (Max 40 pts) - Recent window shows HIGH digit cluster
    const recentWindow = digits.slice(17, 25); // last 8 ticks
    const highCount = recentWindow.filter(d => d >= 5).length;
    
    let reversalScore = 0;
    if (highCount === 8) reversalScore = 40;
    else if (highCount === 7) reversalScore = 28;
    else if (highCount === 6) reversalScore = 15;
    
    // Momentum Confirmation (Max 25 pts) - Last 3 ticks MUST be high
    const lastThree = digits.slice(22, 25);
    const lastThreeHigh = lastThree.filter(d => d >= 5).length;
    
    let momentumScore = 0;
    if (lastThreeHigh === 3) momentumScore = 25;
    else if (lastThreeHigh === 2) momentumScore = 10;
    
    return historicalScore + reversalScore + momentumScore;
}

function calculateUnder5(ticks) {
    if (ticks.length < 25) return 0;
    
    const digits = ticks.map(t => parseInt(t.quote.toString().split('').pop()));
    
    // Historical Saturation (Max 35 pts) - Strong HIGH digit dominance in older window
    const olderWindow = digits.slice(0, 17);
    const highCount = olderWindow.filter(d => d >= 5).length;
    const highRatio = highCount / 17;
    
    let historicalScore = 0;
    if (highRatio >= 0.76) historicalScore = 35;
    else if (highRatio >= 0.64) historicalScore = 20;
    
    // Reversal Pressure (Max 40 pts) - Recent window shows LOW digit cluster
    const recentWindow = digits.slice(17, 25); // last 8 ticks
    const lowCount = recentWindow.filter(d => d <= 4).length;
    
    let reversalScore = 0;
    if (lowCount === 8) reversalScore = 40;
    else if (lowCount === 7) reversalScore = 28;
    else if (lowCount === 6) reversalScore = 15;
    
    // Momentum Confirmation (Max 25 pts) - Last 3 ticks MUST be low
    const lastThree = digits.slice(22, 25);
    const lastThreeLow = lastThree.filter(d => d <= 4).length;
    
    let momentumScore = 0;
    if (lastThreeLow === 3) momentumScore = 25;
    else if (lastThreeLow === 2) momentumScore = 10;
    
    return historicalScore + reversalScore + momentumScore;
}

function calculateEven(ticks) {
    if (ticks.length < 25) return 0;
    
    const digits = ticks.map(t => parseInt(t.quote.toString().split('').pop()));
    
    // Historical Consistency (Max 35 pts) - EVEN dominance in older ticks
    const olderWindow = digits.slice(0, 12);
    const evenOld = olderWindow.filter(d => d % 2 === 0).length;
    
    let consistencyScore = 0;
    if (evenOld >= 10) consistencyScore = 35;
    else if (evenOld >= 9) consistencyScore = 20;
    
    // Cluster Strength (Max 35 pts) - Strong EVEN in recent 10
    const last10 = digits.slice(15, 25);
    const evenCount = last10.filter(d => d % 2 === 0).length;
    
    let clusterScore = 0;
    if (evenCount === 10) clusterScore = 35;
    else if (evenCount === 9) clusterScore = 25;
    else if (evenCount >= 8) clusterScore = 15;
    
    // Immediate Confirmation (Max 30 pts) - Last 3 ticks ALL even
    const last3 = digits.slice(22, 25);
    const allEven = last3.every(d => d % 2 === 0);
    let confirmationScore = allEven ? 30 : 0;
    
    return consistencyScore + clusterScore + confirmationScore;
}

function calculateOdd(ticks) {
    if (ticks.length < 25) return 0;
    
    const digits = ticks.map(t => parseInt(t.quote.toString().split('').pop()));
    
    // Historical Consistency (Max 35 pts) - ODD dominance in older ticks
    const olderWindow = digits.slice(0, 12);
    const oddOld = olderWindow.filter(d => d % 2 !== 0).length;
    
    let consistencyScore = 0;
    if (oddOld >= 10) consistencyScore = 35;
    else if (oddOld >= 9) consistencyScore = 20;
    
    // Cluster Strength (Max 35 pts) - Strong ODD in recent 10
    const last10 = digits.slice(15, 25);
    const oddCount = last10.filter(d => d % 2 !== 0).length;
    
    let clusterScore = 0;
    if (oddCount === 10) clusterScore = 35;
    else if (oddCount === 9) clusterScore = 25;
    else if (oddCount >= 8) clusterScore = 15;
    
    // Immediate Confirmation (Max 30 pts) - Last 3 ticks ALL odd
    const last3 = digits.slice(22, 25);
    const allOdd = last3.every(d => d % 2 !== 0);
    let confirmationScore = allOdd ? 30 : 0;
    
    return consistencyScore + clusterScore + confirmationScore;
}

function calculateRise(ticks) {
    if (ticks.length < 25) return 0;
    
    const prices = ticks.map(t => t.quote);
    
    // Uptrend Consistency (Max 40 pts) - Progressive higher averages
    const A1 = prices.slice(0, 5).reduce((a, b) => a + b) / 5;
    const A2 = prices.slice(5, 10).reduce((a, b) => a + b) / 5;
    const A3 = prices.slice(10, 15).reduce((a, b) => a + b) / 5;
    const A4 = prices.slice(15, 20).reduce((a, b) => a + b) / 5;
    const A5 = prices.slice(20, 25).reduce((a, b) => a + b) / 5;
    
    let trendScore = 0;
    if (A5 > A4 && A4 > A3 && A3 > A2 && A2 > A1) trendScore = 40;
    else if (A5 > A4 && A4 > A3 && A3 > A2) trendScore = 25;
    else if (A5 > A4 && A4 > A3) trendScore = 15;
    
    // Higher Lows Formation (Max 35 pts) - Recent lows above older lows
    const old13 = prices.slice(0, 13);
    const new12 = prices.slice(13, 25);
    
    const L_old = Math.min(...old13);
    const L_new = Math.min(...new12);
    
    let lowScore = 0;
    if (L_new > L_old) lowScore = 35;
    
    // Recent Momentum (Max 25 pts) - Last 2 ticks must be rising
    const p24 = prices[23];
    const p25 = prices[24];
    
    let momentumScore = 0;
    if (p25 > p24) {
        const rise = p25 - p24;
        // Also check it's not a spike (overly large move)
        const totalDiff = prices.reduce((sum, v, i) => i > 0 ? sum + Math.abs(v - prices[i-1]) : sum, 0);
        const avgMove = totalDiff / 24;
        
        if (rise <= (2 * avgMove)) momentumScore = 25;
        else if (rise <= (3 * avgMove)) momentumScore = 12;
    }
    
    return trendScore + lowScore + momentumScore;
}

function calculateFall(ticks) {
    if (ticks.length < 25) return 0;
    
    const prices = ticks.map(t => t.quote);
    
    // Downtrend Consistency (Max 40 pts) - Progressive lower averages
    const A1 = prices.slice(0, 5).reduce((a, b) => a + b) / 5;
    const A2 = prices.slice(5, 10).reduce((a, b) => a + b) / 5;
    const A3 = prices.slice(10, 15).reduce((a, b) => a + b) / 5;
    const A4 = prices.slice(15, 20).reduce((a, b) => a + b) / 5;
    const A5 = prices.slice(20, 25).reduce((a, b) => a + b) / 5;
    
    let trendScore = 0;
    if (A5 < A4 && A4 < A3 && A3 < A2 && A2 < A1) trendScore = 40;
    else if (A5 < A4 && A4 < A3 && A3 < A2) trendScore = 25;
    else if (A5 < A4 && A4 < A3) trendScore = 15;
    
    // Lower Highs Formation (Max 35 pts) - Recent highs below older highs
    const old13 = prices.slice(0, 13);
    const new12 = prices.slice(13, 25);
    
    const H_old = Math.max(...old13);
    const H_new = Math.max(...new12);
    
    let highScore = 0;
    if (H_new < H_old) highScore = 35;
    
    // Recent Momentum (Max 25 pts) - Last 2 ticks must be falling
    const p24 = prices[23];
    const p25 = prices[24];
    
    let momentumScore = 0;
    if (p24 > p25) {
        const fall = p24 - p25;
        // Also check it's not a spike (overly large move)
        const totalDiff = prices.reduce((sum, v, i) => i > 0 ? sum + Math.abs(v - prices[i-1]) : sum, 0);
        const avgMove = totalDiff / 24;
        
        if (fall <= (2 * avgMove)) momentumScore = 25;
        else if (fall <= (3 * avgMove)) momentumScore = 12;
    }
    
    return trendScore + highScore + momentumScore;
}

function evaluateAll(ticks) {
    return {
        "OVER_4": calculateOver4(ticks),
        "UNDER_5": calculateUnder5(ticks),
        "EVEN": calculateEven(ticks),
        "ODD": calculateOdd(ticks),
        "RISE": calculateRise(ticks),
        "FALL": calculateFall(ticks)
    };
}

module.exports = {
    evaluateAll,
    calculateOver4,
    calculateUnder5,
    calculateEven,
    calculateOdd,
    calculateRise,
    calculateFall
};

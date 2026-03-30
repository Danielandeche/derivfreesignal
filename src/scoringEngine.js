/**
 * Scoring engine for Deriv Signal Bot.
 * Each function takes an array of the last 25 ticks.
 * Returns a score from 0 to 100.
 */

function calculateOver4(ticks) {
    if (ticks.length < 25) return 0;
    
    // Extract last digits
    const digits = ticks.map(t => parseInt(t.quote.toString().split('').pop()));
    
    // Historical Imbalance (Max 40 pts)
    const olderWindow = digits.slice(0, 20);
    const lowCount = olderWindow.filter(d => d <= 4).length;
    const lowRatio = lowCount / 20;
    
    let historicalScore = 0;
    if (lowRatio >= 0.70) historicalScore = 40;
    else if (lowRatio >= 0.60) historicalScore = 20;
    
    // Reversal Pressure (Max 40 pts)
    const recentWindow = digits.slice(20, 25); // last 5 ticks
    const highCount = recentWindow.filter(d => d >= 5).length;
    
    let reversalScore = 0;
    if (highCount === 4) reversalScore = 40;
    else if (highCount === 3) reversalScore = 25;
    else if (highCount === 5) reversalScore = 15;
    
    // Micro-momentum Filter (Max 20 pts)
    const p23 = ticks[22].quote;
    const p24 = ticks[23].quote;
    const p25 = ticks[24].quote;
    
    let momentumScore = 0;
    if (p25 > p24 && p24 > p23) momentumScore = 20;
    
    return historicalScore + reversalScore + momentumScore;
}

function calculateUnder5(ticks) {
    if (ticks.length < 25) return 0;
    
    const digits = ticks.map(t => parseInt(t.quote.toString().split('').pop()));
    
    // Historical Imbalance (Max 40 pts)
    const olderWindow = digits.slice(0, 20);
    const highCount = olderWindow.filter(d => d >= 5).length;
    const highRatio = highCount / 20;
    
    let historicalScore = 0;
    if (highRatio >= 0.70) historicalScore = 40;
    else if (highRatio >= 0.60) historicalScore = 20;
    
    // Reversal Pressure (Max 40 pts)
    const recentWindow = digits.slice(20, 25);
    const lowCount = recentWindow.filter(d => d <= 4).length;
    
    let reversalScore = 0;
    if (lowCount === 4) reversalScore = 40;
    else if (lowCount === 3) reversalScore = 25;
    else if (lowCount === 5) reversalScore = 15;
    
    // Micro-momentum Filter (Max 20 pts)
    const p23 = ticks[22].quote;
    const p24 = ticks[23].quote;
    const p25 = ticks[24].quote;
    
    let momentumScore = 0;
    if (p25 < p24 && p24 < p23) momentumScore = 20;
    
    return historicalScore + reversalScore + momentumScore;
}

function calculateEven(ticks) {
    if (ticks.length < 25) return 0;
    
    const digits = ticks.map(t => parseInt(t.quote.toString().split('').pop()));
    
    // Cluster Strength (Max 45 pts)
    const last10 = digits.slice(15, 25);
    const evenCount = last10.filter(d => d % 2 === 0).length;
    
    let clusterScore = 0;
    if (evenCount >= 8) clusterScore = 45;
    else if (evenCount === 7) clusterScore = 30;
    
    // Immediate Continuation (Max 35 pts)
    const last3 = digits.slice(22, 25);
    const immediateEven = last3.every(d => d % 2 === 0);
    let continuationScore = immediateEven ? 35 : 0;
    
    // Alternation Penalty (Max 20 pts)
    const olderWindow = digits.slice(0, 15);
    let flips = 0;
    for (let i = 1; i < olderWindow.length; i++) {
        if ((olderWindow[i] % 2 === 0) !== (olderWindow[i - 1] % 2 === 0)) flips++;
    }
    
    // If flips < 5 -> stable market (low chop)
    let penaltyScore = flips < 5 ? 20 : 0;
    
    return clusterScore + continuationScore + penaltyScore;
}

function calculateOdd(ticks) {
    if (ticks.length < 25) return 0;
    
    const digits = ticks.map(t => parseInt(t.quote.toString().split('').pop()));
    
    // Cluster Strength (Max 45 pts)
    const last10 = digits.slice(15, 25);
    const oddCount = last10.filter(d => d % 2 !== 0).length;
    
    let clusterScore = 0;
    if (oddCount >= 8) clusterScore = 45;
    else if (oddCount === 7) clusterScore = 30;
    
    // Immediate Continuation (Max 35 pts)
    const last3 = digits.slice(22, 25);
    const immediateOdd = last3.every(d => d % 2 !== 0);
    let continuationScore = immediateOdd ? 35 : 0;
    
    // Alternation Penalty (Max 20 pts)
    const olderWindow = digits.slice(0, 15);
    let flips = 0;
    for (let i = 1; i < olderWindow.length; i++) {
        if ((olderWindow[i] % 2 !== 0) !== (olderWindow[i - 1] % 2 !== 0)) flips++;
    }
    
    let penaltyScore = flips < 5 ? 20 : 0;
    
    return clusterScore + continuationScore + penaltyScore;
}

function calculateRise(ticks) {
    if (ticks.length < 25) return 0;
    
    const prices = ticks.map(t => t.quote);
    
    // Micro-Trend Slope (Max 40 pts)
    const A1 = prices.slice(0, 5).reduce((a, b) => a + b) / 5;
    const A2 = prices.slice(5, 10).reduce((a, b) => a + b) / 5;
    const A3 = prices.slice(10, 15).reduce((a, b) => a + b) / 5;
    const A4 = prices.slice(15, 20).reduce((a, b) => a + b) / 5;
    const A5 = prices.slice(20, 25).reduce((a, b) => a + b) / 5;
    
    let trendScore = 0;
    if (A5 > A4 && A4 > A3 && A3 > A2 && A2 > A1) trendScore = 40;
    else if (A5 > A4 && A4 > A3) trendScore = 20;
    
    // Higher Micro-Lows (Max 35 pts)
    const old12 = prices.slice(0, 12);
    const new12 = prices.slice(13, 25);
    
    const L_old = Math.min(...old12);
    const L_new = Math.min(...new12);
    
    let lowScore = 0;
    if (L_new > L_old) lowScore = 35;
    
    // Whip/Spike Filter (Max 25 pts)
    let totalDiff = 0;
    for (let i = 1; i < prices.length; i++) {
        totalDiff += Math.abs(prices[i] - prices[i - 1]);
    }
    const avgTickSize = totalDiff / 24;
    
    const p24 = prices[23];
    const p25 = prices[24];
    
    const move = p25 - p24;
    let filterScore = 0;
    if (move > 0 && move < (3 * avgTickSize)) filterScore = 25;
    
    return trendScore + lowScore + filterScore;
}

function calculateFall(ticks) {
    if (ticks.length < 25) return 0;
    
    const prices = ticks.map(t => t.quote);
    
    // Micro-Trend Slope (Max 40 pts)
    const A1 = prices.slice(0, 5).reduce((a, b) => a + b) / 5;
    const A2 = prices.slice(5, 10).reduce((a, b) => a + b) / 5;
    const A3 = prices.slice(10, 15).reduce((a, b) => a + b) / 5;
    const A4 = prices.slice(15, 20).reduce((a, b) => a + b) / 5;
    const A5 = prices.slice(20, 25).reduce((a, b) => a + b) / 5;
    
    let trendScore = 0;
    if (A5 < A4 && A4 < A3 && A3 < A2 && A2 < A1) trendScore = 40;
    else if (A5 < A4 && A4 < A3) trendScore = 20;
    
    // Lower Micro-Highs (Max 35 pts)
    const old12 = prices.slice(0, 12);
    const new12 = prices.slice(13, 25);
    
    const H_old = Math.max(...old12);
    const H_new = Math.max(...new12);
    
    let highScore = 0;
    if (H_new < H_old) highScore = 35;
    
    // Whip/Spike Filter (Max 25 pts)
    let totalDiff = 0;
    for (let i = 1; i < prices.length; i++) {
        totalDiff += Math.abs(prices[i] - prices[i - 1]);
    }
    const avgTickSize = totalDiff / 24;
    
    const p24 = prices[23];
    const p25 = prices[24];
    
    const move = p24 - p25; // drop amount
    let filterScore = 0;
    if (move > 0 && move < (3 * avgTickSize)) filterScore = 25;
    
    return trendScore + highScore + filterScore;
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

const WebSocket = require('ws');

// 13 Volatility Markets for Deriv
const TARGET_MARKETS = [
    'R_10', 'R_25', 'R_50', 'R_75', 'R_100',  // Standard volatility indices
    'R_10_1s', 'R_25_1s', 'R_50_1s', 'R_75_1s', 'R_100_1s'  // 1-second variants
];

// Maps symbol to an array of recent ticks
const marketTicks = {};

// Initialize empty arrays
TARGET_MARKETS.forEach(market => {
    marketTicks[market] = [];
});

let ws;

function initDerivScanner() {
    const appId = process.env.DERIV_APP_ID || 1089;
    
    console.log(`[DerivScanner] Connecting to Deriv WebSocket with App ID: ${appId}...`);
    ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${appId}`);

    ws.on('open', () => {
        console.log('[DerivScanner] Connected.');
        // Subscribe to targeted markets
        TARGET_MARKETS.forEach(market => {
            console.log(`[DerivScanner] Subscribing to ticks for ${market}...`);
            ws.send(JSON.stringify({
                ticks: market,
                subscribe: 1
            }));
        });
    });

    ws.on('message', (data) => {
        const response = JSON.parse(data);

        // Check if there is tick data
        if (response.msg_type === 'tick' && response.tick) {
            const tickData = response.tick;
            const market = tickData.symbol;
            
            if (!marketTicks[market]) return;
            
            // Add new tick
            marketTicks[market].push({
                quote: tickData.quote,
                epoch: tickData.epoch
            });

            // Keep rolling window at 25 ticks exactly
            if (marketTicks[market].length > 25) {
                marketTicks[market].shift();
            }
            
            // Log every 5 ticks to show progress
            if (marketTicks[market].length % 5 === 0) {
                console.log(`[DerivScanner] ${market}: ${marketTicks[market].length} ticks collected`);
            }
        }
    });

    ws.on('close', () => {
        console.log('[DerivScanner] WebSocket Connection closed. Reconnecting in 5s...');
        setTimeout(initDerivScanner, 5000);
    });

    ws.on('error', (err) => {
        console.error('[DerivScanner] Error:', err.message);
    });
}

function getMarketTicks() {
    return marketTicks;
}

function getActiveMarkets() {
    return TARGET_MARKETS;
}

module.exports = {
    initDerivScanner,
    getMarketTicks,
    getActiveMarkets
};

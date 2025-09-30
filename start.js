// start.js - Run both keep-alive server and bot
console.log('🚀 Starting IPA Signer Bot with Keep-Alive...');

// Start keep-alive server first
console.log('📡 Starting keep-alive server...');
require('./keep-alive');

// Wait a moment then start the bot
setTimeout(() => {
    console.log('🤖 Starting Discord bot...');
    require('./src/bot');
}, 1000);

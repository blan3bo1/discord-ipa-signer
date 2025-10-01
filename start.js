// start.js - Run both keep-alive server and bot
console.log('🚀 Starting IPA Signer Bot with Keep-Alive...');

// Start keep-alive server first
console.log('📡 Starting keep-alive server...');
require('./keep-alive');

// Simple command registration and bot start
setTimeout(() => {
    console.log('📝 Registering Discord commands...');
    require('./deploy-commands');
    
    setTimeout(() => {
        console.log('🤖 Starting Discord bot...');
        require('./src/bot');
    }, 3000);
}, 1000);

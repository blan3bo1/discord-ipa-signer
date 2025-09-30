// start.js - Run both keep-alive server and bot
console.log('🚀 Starting IPA Signer Bot with Keep-Alive...');

// Start keep-alive server first
console.log('📡 Starting keep-alive server...');
require('./keep-alive');

// Auto-register commands then start bot
const initializeBot = async () => {
    try {
        console.log('📝 Attempting to register Discord commands...');
        const registerCommands = require('./deploy-commands');
        await registerCommands();
        
        console.log('✅ Command registration completed');
    } catch (error) {
        console.log('⚠️ Command registration failed, starting bot anyway...');
    }
    
    // Start the bot regardless of command registration
    console.log('🤖 Starting Discord bot...');
    require('./src/bot');
};

initializeBot();

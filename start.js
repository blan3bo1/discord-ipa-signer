// start.js - Run both keep-alive server and bot
console.log('🚀 Starting IPA Signer Bot with Keep-Alive...');

// Start keep-alive server first
console.log('📡 Starting keep-alive server...');
require('./keep-alive');

// Auto-register commands then start bot
const registerCommands = async () => {
    try {
        console.log('📝 Attempting to register Discord commands...');
        require('./deploy-commands');
        
        // Wait a bit for command registration
        setTimeout(() => {
            console.log('🤖 Starting Discord bot...');
            require('./src/bot');
        }, 3000);
        
    } catch (error) {
        console.log('⚠️ Command registration failed, starting bot anyway...');
        console.log('🤖 Starting Discord bot...');
        require('./src/bot');
    }
};

registerCommands();

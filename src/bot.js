// MANUALLY LOAD .env FILE
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const equalsIndex = trimmed.indexOf('=');
        if (equalsIndex === -1) continue;
        const key = trimmed.substring(0, equalsIndex).trim();
        const value = trimmed.substring(equalsIndex + 1).trim();
        if (key && value) {
            process.env[key] = value;
        }
    }
}

const { Client, GatewayIntentBits, Collection, ActivityType } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences
    ],
    presence: {
        status: 'online',
        activities: [{
            name: 'IPA Signing',
            type: ActivityType.Watching
        }]
    }
});

client.commands = new Collection();

// Load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    client.commands.set(command.data.name, command);
}

// Load events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

// Initialize cleanup service
const cleanupService = require('./utils/fileCleanup');
cleanupService.startCleanup();

// Auto-register commands when bot starts
client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    console.log(`🏠 Serving ${client.guilds.cache.size} servers`);
    
    // Try to register commands on startup
    try {
        console.log('🔄 Checking command registration...');
        const registerCommands = require('../deploy-commands');
        await registerCommands();
    } catch (error) {
        console.log('⚠️ Command registration check failed, but bot is running');
    }
});

client.login(process.env.DISCORD_TOKEN);

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('💥 Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught exception:', error);
});

// Auto-restart on crash
process.on('unhandledRejection', (error) => {
  console.error('💥 Unhandled Exception:', error);
  console.log('🔄 Restarting in 10 seconds...');
  setTimeout(() => {
    process.exit(1);
  }, 10000);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  client.destroy();
  process.exit(0);
});

module.exports = client;

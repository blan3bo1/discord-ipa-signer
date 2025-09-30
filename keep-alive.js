const express = require('express');
const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(express.json());
app.use((req, res, next) => {
    console.log(`📊 ${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Routes
app.get('/', (req, res) => {
    res.json({
        status: 'online',
        bot: 'IPA Signer Bot',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: {
            used: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
            total: `${(process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2)} MB`
        },
        endpoints: [
            '/health - Bot health status',
            '/status - Bot detailed status',
            '/ - This information page'
        ]
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: `${process.uptime().toFixed(2)} seconds`,
        memory: {
            rss: `${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB`,
            heapTotal: `${(process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2)} MB`,
            heapUsed: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
            external: `${(process.memoryUsage().external / 1024 / 1024).toFixed(2)} MB`
        },
        node: {
            version: process.version,
            platform: process.platform
        }
    });
});

app.get('/status', (req, res) => {
    res.json({
        bot: {
            name: 'IPA Signer Bot',
            version: '1.0.0',
            status: 'running'
        },
        system: {
            uptime: `${process.uptime().toFixed(2)} seconds`,
            timestamp: new Date().toISOString(),
            loadavg: process.loadavg ? process.loadavg() : 'N/A'
        },
        memory: process.memoryUsage(),
        environment: {
            node: process.version,
            platform: process.platform,
            arch: process.arch,
            repl_slug: process.env.REPL_SLUG || 'not-set',
            repl_owner: process.env.REPL_OWNER || 'not-set'
        }
    });
});

app.get('/ping', (req, res) => {
    res.json({
        message: 'pong',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        available_endpoints: [
            'GET / - Bot information',
            'GET /health - Health status',
            'GET /status - Detailed status',
            'GET /ping - Simple ping'
        ]
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('❌ Server error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message
    });
});

// Start server
const server = app.listen(port, '0.0.0.0', () => {
    const replSlug = process.env.REPL_SLUG || 'your-repl-name';
    const replOwner = process.env.REPL_OWNER || 'your-username';
    const url = `https://${replSlug}.${replOwner}.repl.co`;
    
    console.log('===========================================');
    console.log('🤖 KEEP-ALIVE SERVER STARTED SUCCESSFULLY!');
    console.log('===========================================');
    console.log(`📡 Port: ${port}`);
    console.log(`🌐 Your Public URL: ${url}`);
    console.log(`🕒 Started at: ${new Date().toISOString()}`);
    console.log('===========================================');
    console.log('📋 Available endpoints:');
    console.log(`   ${url}/          - Bot information`);
    console.log(`   ${url}/health    - Health status`);
    console.log(`   ${url}/status    - Detailed status`);
    console.log(`   ${url}/ping      - Simple ping test`);
    console.log('===========================================');
    console.log('💡 Use this URL in UptimeRobot to keep your bot online 24/7!');
    console.log('===========================================');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('🛑 Received SIGINT, shutting down gracefully...');
    server.close(() => {
        console.log('✅ Keep-alive server closed');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('🛑 Received SIGTERM, shutting down gracefully...');
    server.close(() => {
        console.log('✅ Keep-alive server closed');
        process.exit(0);
    });
});

// Handle server errors
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.log(`❌ Port ${port} is already in use. Trying port 3000...`);
        // Don't try to restart here - let the main process handle it
    } else {
        console.error('❌ Server error:', error);
    }
});

// Heartbeat logging
setInterval(() => {
    const now = new Date();
    if (now.getMinutes() % 5 === 0 && now.getSeconds() === 0) {
        console.log(`💓 Heartbeat - Bot is alive: ${now.toISOString()}`);
    }
}, 60000); // Check every minute

module.exports = app;

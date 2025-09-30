const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const https = require('https');
const { URL } = require('url');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bypass')
        .setDescription('Bypass URL restrictions using multiple APIs')
        .addStringOption(option =>
            option.setName('url')
                .setDescription('The URL to bypass (include http:// or https://)')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const urlToBypass = interaction.options.getString('url');
            
            // Validate URL format
            if (!this.isValidUrl(urlToBypass)) {
                return await interaction.editReply({
                    content: '❌ Please provide a valid URL (include http:// or https://)'
                });
            }

            await interaction.editReply({ content: '🔄 Bypassing URL...' });

            // Try multiple bypass APIs in sequence
            const result = await this.tryAllBypassApis(urlToBypass);

            if (result.success) {
                const embed = new EmbedBuilder()
                    .setColor(0x00ff00)
                    .setTitle('✅ URL Bypassed Successfully')
                    .addFields(
                        { name: '📥 Original URL', value: `\`\`\`${urlToBypass}\`\`\``, inline: false },
                        { name: '📤 Bypassed URL', value: `\`\`\`${result.url}\`\`\``, inline: false },
                        { name: '🔧 API Used', value: result.api, inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: 'Multi-API Bypass Service' });

                // Create button to open the URL
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setLabel('Open Bypassed URL')
                            .setStyle(ButtonStyle.Link)
                            .setURL(result.url),
                        new ButtonBuilder()
                            .setLabel('Test URL')
                            .setStyle(ButtonStyle.Secondary)
                            .setCustomId('test_url')
                    );

                const reply = await interaction.editReply({ 
                    content: null,
                    embeds: [embed],
                    components: [row]
                });

                // Add button interaction
                const collector = reply.createMessageComponentCollector({ time: 30000 });

                collector.on('collect', async (i) => {
                    if (i.customId === 'test_url') {
                        await i.reply({ 
                            content: `🔗 Testing URL: ${result.url}`,
                            ephemeral: true 
                        });
                    }
                });

            } else {
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xff0000)
                    .setTitle('❌ Bypass Failed')
                    .addFields(
                        { name: '📥 Original URL', value: `\`\`\`${urlToBypass}\`\`\``, inline: false },
                        { name: '💡 Error', value: result.error, inline: false },
                        { name: '🔧 APIs Tried', value: result.apisTried.join(', '), inline: false }
                    )
                    .setTimestamp();

                await interaction.editReply({ 
                    content: null,
                    embeds: [errorEmbed]
                });
            }

        } catch (error) {
            console.error('Bypass error:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor(0xff0000)
                .setTitle('❌ Bypass Error')
                .setDescription(`An unexpected error occurred: ${error.message}`)
                .setTimestamp();

            await interaction.editReply({ 
                content: null,
                embeds: [errorEmbed]
            });
        }
    },

    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    },

    async tryAllBypassApis(url) {
        const apis = [
            {
                name: 'TRW API',
                url: `https://trw.lat/api/free/bypass?url=${encodeURIComponent(url)}`,
                parser: (data) => data.destination || data.url
            },
            {
                name: 'ByPass.PM',
                url: `https://bypass.pm/bypass?url=${encodeURIComponent(url)}`,
                parser: (data) => data.destination || data.url
            },
            {
                name: 'LinkBypass',
                url: `https://linkbypass.com/api/bypass?url=${encodeURIComponent(url)}`,
                parser: (data) => data.destination || data.url
            },
            {
                name: 'Bypass API 2',
                url: `https://api.bypass.vip/bypass?url=${encodeURIComponent(url)}`,
                parser: (data) => data.destination || data.url
            }
        ];

        const apisTried = [];

        for (const api of apis) {
            try {
                apisTried.push(api.name);
                console.log(`Trying ${api.name}...`);
                
                const result = await this.callBypassApi(api.url, api.parser);
                
                if (result.success) {
                    return {
                        success: true,
                        url: result.url,
                        api: api.name,
                        apisTried
                    };
                }
            } catch (error) {
                console.log(`${api.name} failed:`, error.message);
                continue;
            }
        }

        return {
            success: false,
            error: 'All bypass APIs failed. The URL may not be supported or services are down.',
            apisTried
        };
    },

    callBypassApi(apiUrl, parser) {
        return new Promise((resolve) => {
            const request = https.get(apiUrl, (response) => {
                let data = '';

                response.on('data', (chunk) => {
                    data += chunk;
                });

                response.on('end', () => {
                    try {
                        if (response.statusCode === 200) {
                            const result = JSON.parse(data);
                            const bypassedUrl = parser(result);
                            
                            if (bypassedUrl && this.isValidUrl(bypassedUrl)) {
                                resolve({ success: true, url: bypassedUrl });
                            } else {
                                resolve({ success: false, error: 'Invalid URL returned' });
                            }
                        } else {
                            resolve({ 
                                success: false, 
                                error: `API returned status: ${response.statusCode}` 
                            });
                        }
                    } catch (parseError) {
                        resolve({ 
                            success: false, 
                            error: 'Failed to parse API response' 
                        });
                    }
                });
            });

            request.on('error', (error) => {
                resolve({ 
                    success: false, 
                    error: `Network error: ${error.message}` 
                });
            });

            // Set timeout (8 seconds)
            request.setTimeout(8000, () => {
                request.destroy();
                resolve({ 
                    success: false, 
                    error: 'Request timeout' 
                });
            });
        });
    },

    // Alternative method for simple URL redirects
    async bypassWithRedirect(url) {
        return new Promise((resolve) => {
            const request = https.get(url, (response) => {
                // Check for redirect
                if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                    resolve({ success: true, url: response.headers.location });
                } else {
                    resolve({ success: false, error: 'No redirect found' });
                }
            });

            request.on('error', () => {
                resolve({ success: false, error: 'Request failed' });
            });

            request.setTimeout(5000, () => {
                request.destroy();
                resolve({ success: false, error: 'Timeout' });
            });
        });
    }
};

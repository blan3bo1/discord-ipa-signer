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
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const https = require('https');
const { URL } = require('url');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bypass')
        .setDescription('Bypass URL restrictions using TRW API')
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

            await interaction.editReply({ content: '🔄 Bypassing URL with TRW API...' });

            const result = await this.bypassWithTRW(urlToBypass);

            if (result.success) {
                const embed = new EmbedBuilder()
                    .setColor(0x00ff00)
                    .setTitle('✅ URL Bypassed Successfully')
                    .addFields(
                        { name: '📥 Original URL', value: `\`\`\`${urlToBypass}\`\`\``, inline: false },
                        { name: '📤 Bypassed URL', value: `\`\`\`${result.url}\`\`\``, inline: false },
                        { name: '🔧 API Used', value: 'TRW Bypass API', inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: 'TRW Bypass Service' });

                // Create button to open the URL
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setLabel('Open Bypassed URL')
                            .setStyle(ButtonStyle.Link)
                            .setURL(result.url),
                        new ButtonBuilder()
                            .setLabel('Copy URL')
                            .setStyle(ButtonStyle.Secondary)
                            .setCustomId('copy_url')
                    );

                const reply = await interaction.editReply({ 
                    content: null,
                    embeds: [embed],
                    components: [row]
                });

                // Add button interaction for copy
                const collector = reply.createMessageComponentCollector({ time: 30000 });

                collector.on('collect', async (i) => {
                    if (i.customId === 'copy_url') {
                        await i.reply({ 
                            content: `📋 URL copied to clipboard:\n\`\`\`${result.url}\`\`\``,
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
                        { name: '💡 Error', value: result.error, inline: false }
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

    bypassWithTRW(url) {
        return new Promise((resolve) => {
            const apiUrl = `https://trw.lat/api/free/bypass?url=${encodeURIComponent(url)}`;
            
            console.log(`Calling TRW API: ${apiUrl}`);
            
            const request = https.get(apiUrl, (response) => {
                let data = '';

                response.on('data', (chunk) => {
                    data += chunk;
                });

                response.on('end', () => {
                    console.log('TRW API Response:', data);
                    
                    try {
                        if (response.statusCode === 200) {
                            const result = JSON.parse(data);
                            console.log('Parsed JSON:', result);
                            
                            // Extract the bypassed URL from the JSON response
                            let bypassedUrl = null;
                            
                            // Try different possible JSON structures
                            if (result.destination) {
                                bypassedUrl = result.destination;
                            } else if (result.url) {
                                bypassedUrl = result.url;
                            } else if (result.result) {
                                bypassedUrl = result.result;
                            } else if (result.data && result.data.destination) {
                                bypassedUrl = result.data.destination;
                            } else if (typeof result === 'string' && this.isValidUrl(result)) {
                                // If the API returns a plain URL string
                                bypassedUrl = result;
                            }
                            
                            if (bypassedUrl && this.isValidUrl(bypassedUrl)) {
                                resolve({ 
                                    success: true, 
                                    url: bypassedUrl,
                                    rawResponse: result 
                                });
                            } else {
                                console.log('No valid URL found in response. Full response:', result);
                                resolve({ 
                                    success: false, 
                                    error: 'TRW API returned no valid bypassed URL',
                                    rawResponse: result
                                });
                            }
                        } else {
                            resolve({ 
                                success: false, 
                                error: `TRW API returned status: ${response.statusCode}`,
                                responseData: data
                            });
                        }
                    } catch (parseError) {
                        console.log('JSON Parse Error:', parseError);
                        console.log('Raw response data:', data);
                        
                        // If JSON parsing fails, try to extract URL from raw text
                        const urlMatch = data.match(/https?:\/\/[^\s"']+[^"']/);
                        if (urlMatch && this.isValidUrl(urlMatch[0])) {
                            resolve({ 
                                success: true, 
                                url: urlMatch[0],
                                rawResponse: data 
                            });
                        } else {
                            resolve({ 
                                success: false, 
                                error: 'Failed to parse TRW API response',
                                rawResponse: data
                            });
                        }
                    }
                });
            });

            request.on('error', (error) => {
                console.log('TRW API Network Error:', error);
                resolve({ 
                    success: false, 
                    error: `TRW API network error: ${error.message}`
                });
            });

            // Set timeout (15 seconds)
            request.setTimeout(15000, () => {
                request.destroy();
                resolve({ 
                    success: false, 
                    error: 'TRW API request timeout'
                });
            });

            // Handle socket errors
            request.on('socket', (socket) => {
                socket.setTimeout(15000);
                socket.on('timeout', () => {
                    request.destroy();
                    resolve({ 
                        success: false, 
                        error: 'TRW API socket timeout'
                    });
                });
            });
        });
    },

    // Alternative method if TRW fails
    async bypassWithFallback(url) {
        // First try TRW
        const trwResult = await this.bypassWithTRW(url);
        if (trwResult.success) {
            return trwResult;
        }

        // If TRW fails, try direct redirect
        console.log('TRW failed, trying direct redirect...');
        return await this.followRedirects(url);
    },

    followRedirects(url) {
        return new Promise((resolve) => {
            const request = https.get(url, (response) => {
                if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
                    const location = response.headers.location;
                    if (location && this.isValidUrl(location)) {
                        resolve({ success: true, url: location, method: 'Direct Redirect' });
                    } else {
                        resolve({ success: false, error: 'Invalid redirect location' });
                    }
                } else {
                    resolve({ success: false, error: 'No redirect found' });
                }
            });

            request.on('error', (error) => {
                resolve({ success: false, error: `Redirect error: ${error.message}` });
            });

            request.setTimeout(8000, () => {
                request.destroy();
                resolve({ success: false, error: 'Redirect timeout' });
            });
        });
    }
};

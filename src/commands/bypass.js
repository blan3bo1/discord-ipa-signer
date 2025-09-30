const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const https = require('https');
const { URL } = require('url');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bypass')
        .setDescription('Bypass Linkvertise, Rekonise, Work.ink & Link-Unlock URLs')
        .addStringOption(option =>
            option.setName('url')
                .setDescription('URL from Linkvertise, Rekonise, Work.ink or Link-Unlock')
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

            const result = await this.bypassWithTRW(urlToBypass);

            if (result.success) {
                const embed = new EmbedBuilder()
                    .setColor(0x00ff00)
                    .setTitle('✅ URL Bypassed Successfully')
                    .addFields(
                        { name: '📥 Original URL', value: `\`\`\`${urlToBypass}\`\`\``, inline: false },
                        { name: '📤 Bypassed URL', value: `\`\`\`${result.url}\`\`\``, inline: false },
                        { name: '🔧 Service', value: 'TRW Bypass API', inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: 'Supports: Linkvertise, Rekonise, Work.ink, Link-Unlock' });

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
                        { name: '💡 Error', value: result.error, inline: false },
                        { name: '📋 Supported Services', value: 'Linkvertise, Rekonise, Work.ink, Link-Unlock', inline: false }
                    )
                    .setTimestamp();

                await interaction.editReply({ 
                    content: null,
                    embeds: [errorEmbed]
                });
            }

        } catch (error) {
            console.error('Bypass error:', error);
            
            await interaction.editReply({
                content: `❌ Error: ${error.message}`
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
            
            const request = https.get(apiUrl, (response) => {
                let data = '';

                response.on('data', (chunk) => {
                    data += chunk;
                });

                response.on('end', () => {
                    try {
                        const result = JSON.parse(data);
                        
                        if (result.success === true && result.result) {
                            // Success case - we got a bypassed URL
                            resolve({ 
                                success: true, 
                                url: result.result
                            });
                        } else if (result.success === false) {
                            // TRW API returned an error
                            resolve({ 
                                success: false, 
                                error: result.result || 'TRW API returned an error'
                            });
                        } else {
                            // Unexpected response format
                            resolve({ 
                                success: false, 
                                error: 'Unexpected response from TRW API'
                            });
                        }
                    } catch (parseError) {
                        resolve({ 
                            success: false, 
                            error: 'Failed to parse TRW API response'
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

            // Set timeout (15 seconds)
            request.setTimeout(15000, () => {
                request.destroy();
                resolve({ 
                    success: false, 
                    error: 'TRW API request timeout'
                });
            });
        });
    }
};

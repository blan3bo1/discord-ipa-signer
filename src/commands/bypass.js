const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const https = require('https');
const { URL } = require('url');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bypass')
        .setDescription('Bypass URL restrictions using TRW API')
        .addStringOption(option =>
            option.setName('url')
                .setDescription('The URL to bypass')
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

            const bypassedUrl = await this.bypassUrl(urlToBypass);

            if (bypassedUrl) {
                const embed = new EmbedBuilder()
                    .setColor(0x00ff00)
                    .setTitle('🔗 URL Bypassed Successfully')
                    .addFields(
                        { name: '📥 Original URL', value: `\`\`\`${urlToBypass}\`\`\``, inline: false },
                        { name: '📤 Bypassed URL', value: `\`\`\`${bypassedUrl}\`\`\``, inline: false },
                        { name: '🔗 Quick Link', value: `[Click to Open](${bypassedUrl})`, inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: 'TRW Bypass API' });

                await interaction.editReply({ 
                    content: null,
                    embeds: [embed] 
                });
            } else {
                await interaction.editReply({
                    content: '❌ Failed to bypass URL. The service might be down or the URL is not supported.'
                });
            }

        } catch (error) {
            console.error('Bypass error:', error);
            await interaction.editReply({
                content: `❌ Error bypassing URL: ${error.message}`
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

    bypassUrl(url) {
        return new Promise((resolve, reject) => {
            const apiUrl = `https://trw.lat/api/free/bypass?url=${encodeURIComponent(url)}`;
            
            https.get(apiUrl, (response) => {
                let data = '';

                response.on('data', (chunk) => {
                    data += chunk;
                });

                response.on('end', () => {
                    try {
                        if (response.statusCode === 200) {
                            const result = JSON.parse(data);
                            
                            if (result && result.destination) {
                                resolve(result.destination);
                            } else if (result && result.url) {
                                resolve(result.url);
                            } else {
                                reject(new Error('No bypassed URL found in response'));
                            }
                        } else {
                            reject(new Error(`API returned status: ${response.statusCode}`));
                        }
                    } catch (parseError) {
                        reject(new Error('Failed to parse API response'));
                    }
                });
            }).on('error', (error) => {
                reject(error);
            });
        });
    }
};

const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs-extra');
const path = require('path');
const forge = require('node-forge');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('certcheck')
        .setDescription('Check the status and information of a P12 certificate')
        .addAttachmentOption(option =>
            option.setName('p12')
                .setDescription('P12 certificate file to check')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('password')
                .setDescription('Password for the P12 certificate')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const p12Attachment = interaction.options.getAttachment('p12');
            const password = interaction.options.getString('password');

            // Validate file type
            if (!p12Attachment.name.endsWith('.p12')) {
                return await interaction.editReply({
                    content: '❌ Please provide a valid .p12 file.'
                });
            }

            // Create temporary directory
            const sessionId = require('uuid').v4();
            const tempDir = path.join(__dirname, '../../temp', sessionId);
            await fs.ensureDir(tempDir);

            const p12Path = path.join(tempDir, 'certificate.p12');

            // Download the file
            await interaction.editReply({ content: '📥 Downloading certificate...' });

            const https = require('https');
            await new Promise((resolve, reject) => {
                const file = fs.createWriteStream(p12Path);
                https.get(p12Attachment.url, (response) => {
                    response.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        resolve();
                    });
                }).on('error', reject);
            });

            // Check certificate
            await interaction.editReply({ content: '🔍 Analyzing certificate...' });

            const certInfo = await this.analyzeCertificate(p12Path, password);

            // Format the response
            const embed = {
                color: certInfo.isValid ? 0x00ff00 : 0xff0000,
                title: '📋 Certificate Analysis',
                fields: [
                    {
                        name: '✅ Status',
                        value: certInfo.isValid ? '**VALID** 🟢' : '**INVALID** 🔴',
                        inline: true
                    },
                    {
                        name: '👤 Common Name',
                        value: certInfo.commonName || 'N/A',
                        inline: true
                    },
                    {
                        name: '🆔 Serial Number',
                        value: certInfo.serialNumber || 'N/A',
                        inline: true
                    },
                    {
                        name: '📅 Valid From',
                        value: certInfo.validFrom || 'N/A',
                        inline: true
                    },
                    {
                        name: '📅 Valid Until',
                        value: certInfo.validUntil || 'N/A',
                        inline: true
                    },
                    {
                        name: '⏰ Days Remaining',
                        value: certInfo.daysRemaining !== null ? `${certInfo.daysRemaining} days` : 'N/A',
                        inline: true
                    },
                    {
                        name: '🏢 Organization',
                        value: certInfo.organization || 'N/A',
                        inline: true
                    },
                    {
                        name: '📧 Email',
                        value: certInfo.email || 'N/A',
                        inline: true
                    },
                    {
                        name: '🔐 Has Private Key',
                        value: certInfo.hasPrivateKey ? 'Yes ✅' : 'No ❌',
                        inline: true
                    }
                ],
                timestamp: new Date()
            };

            if (!certInfo.isValid && certInfo.error) {
                embed.fields.push({
                    name: '❌ Error',
                    value: certInfo.error,
                    inline: false
                });
            }

            await interaction.editReply({ 
                content: null,
                embeds: [embed]
            });

            // Cleanup
            await fs.remove(tempDir);

        } catch (error) {
            console.error('Certificate check error:', error);
            await interaction.editReply({
                content: `❌ Error checking certificate: ${error.message}`
            });
        }
    },

    async analyzeCertificate(p12Path, password) {
        try {
            const p12Buffer = await fs.readFile(p12Path);
            const p12Der = forge.util.binary.raw.encode(new Uint8Array(p12Buffer));
            const p12Asn1 = forge.asn1.fromDer(p12Der);
            const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

            // Get certificate bags
            const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
            const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });

            if (!certBags[forge.pki.oids.certBag] || certBags[forge.pki.oids.certBag].length === 0) {
                throw new Error('No certificates found in P12 file');
            }

            const certificate = certBags[forge.pki.oids.certBag][0].cert;
            const privateKey = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]?.key;

            // Extract certificate information
            const subject = certificate.subject;
            const issuer = certificate.issuer;
            const now = new Date();
            const validFrom = new Date(certificate.validity.notBefore);
            const validUntil = new Date(certificate.validity.notAfter);

            const daysRemaining = Math.floor((validUntil - now) / (1000 * 60 * 60 * 24));
            const isValid = now >= validFrom && now <= validUntil;

            // Extract common name and organization
            let commonName = '';
            let organization = '';
            let email = '';

            for (let i = 0; i < subject.attributes.length; i++) {
                const attr = subject.attributes[i];
                if (attr.name === 'commonName') {
                    commonName = attr.value;
                } else if (attr.name === 'organizationName') {
                    organization = attr.value;
                } else if (attr.name === 'emailAddress') {
                    email = attr.value;
                }
            }

            return {
                isValid,
                commonName,
                organization,
                email,
                serialNumber: certificate.serialNumber,
                validFrom: validFrom.toLocaleDateString(),
                validUntil: validUntil.toLocaleDateString(),
                daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
                hasPrivateKey: !!privateKey,
                issuerCommonName: this.getIssuerCommonName(issuer)
            };

        } catch (error) {
            return {
                isValid: false,
                error: error.message
            };
        }
    },

    getIssuerCommonName(issuer) {
        for (let i = 0; i < issuer.attributes.length; i++) {
            const attr = issuer.attributes[i];
            if (attr.name === 'commonName') {
                return attr.value;
            }
        }
        return 'Unknown';
    }
};

const fs = require('fs-extra');
const path = require('path');
const unzipper = require('unzipper');
const archiver = require('archiver');
const plist = require('plist');
const forge = require('node-forge');

class SigningService {
    async signIpa(ipaPath, p12Path, provisionPath, password, outputDir) {
        try {
            const tempExtractDir = path.join(outputDir, 'extracted');
            await fs.ensureDir(tempExtractDir);

            // Extract IPA
            await this.extractIpa(ipaPath, tempExtractDir);

            // Read app information
            const appPath = await this.findAppDirectory(tempExtractDir);
            const appInfo = await this.readAppInfo(appPath);

            // Replace provision profile
            await this.replaceProvisionProfile(appPath, provisionPath);

            // Sign the app
            await this.signApp(appPath, p12Path, password);

            // Create signed IPA
            const signedIpaPath = path.join(outputDir, `signed-${path.basename(ipaPath)}`);
            await this.createIpa(tempExtractDir, signedIpaPath);

            // Cleanup extracted files
            await fs.remove(tempExtractDir);

            return signedIpaPath;
        } catch (error) {
            throw new Error(`Signing failed: ${error.message}`);
        }
    }

    async extractIpa(ipaPath, extractDir) {
        return new Promise((resolve, reject) => {
            fs.createReadStream(ipaPath)
                .pipe(unzipper.Extract({ path: extractDir }))
                .on('close', resolve)
                .on('error', reject);
        });
    }

    async findAppDirectory(extractDir) {
        const payloadDir = path.join(extractDir, 'Payload');
        const items = await fs.readdir(payloadDir);
        
        for (const item of items) {
            if (item.endsWith('.app')) {
                return path.join(payloadDir, item);
            }
        }
        throw new Error('No .app directory found in IPA');
    }

    async readAppInfo(appPath) {
        const infoPlistPath = path.join(appPath, 'Info.plist');
        const infoPlist = plist.parse(await fs.readFile(infoPlistPath, 'utf8'));
        
        return {
            bundleId: infoPlist.CFBundleIdentifier,
            bundleName: infoPlist.CFBundleName,
            executable: infoPlist.CFBundleExecutable
        };
    }

    async replaceProvisionProfile(appPath, provisionPath) {
        const destProvision = path.join(appPath, 'embedded.mobileprovision');
        await fs.copyFile(provisionPath, destProvision);
    }

    async signApp(appPath, p12Path, password) {
        try {
            // Read P12 file
            const p12Buffer = await fs.readFile(p12Path);
            const p12Der = forge.util.binary.raw.encode(new Uint8Array(p12Buffer));
            const p12Asn1 = forge.asn1.fromDer(p12Der);
            const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

            // Get certificate and private key
            const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
            const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });

            if (!certBags[forge.p

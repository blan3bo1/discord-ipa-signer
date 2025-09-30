const { REST, Routes } = require('discord.js');

const commands = [
  {
    name: 'sign',
    description: 'Sign an IPA file with P12 and mobile provision',
    options: [
      {
        name: 'ipa',
        type: 11,
        description: 'The IPA file to sign',
        required: true
      },
      {
        name: 'p12',
        type: 11,
        description: 'P12 certificate file',
        required: true
      },
      {
        name: 'provision',
        type: 11,
        description: 'Mobile provision file',
        required: true
      },
      {
        name: 'password',
        type: 3,
        description: 'Password for P12 certificate',
        required: true
      }
    ]
  },
  {
    name: 'certcheck',
    description: 'Check the status and information of a P12 certificate',
    options: [
      {
        name: 'p12',
        type: 11,
        description: 'P12 certificate file to check',
        required: true
      },
      {
        name: 'password',
        type: 3,
        description: 'Password for the P12 certificate',
        required: true
      }
    ]
  },
  {
    name: 'analyzeksign',
    description: 'Analyze a .ksign file structure and extract certificates',
    options: [
      {
        name: 'ksign',
        type: 11,
        description: '.ksign file to analyze',
        required: true
      }
    ]
  },
  {
    name: 'bypass',
    description: 'Bypass URL restrictions using multiple APIs',
    options: [
      {
        name: 'url',
        type: 3,
        description: 'The URL to bypass (include http:// or https://)',
        required: true
      }
    ]
  }
];

async function registerCommands() {
    try {
        console.log('📝 Registering Discord commands...');
        
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        
        const data = await rest.put(
            Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.GUILD_ID),
            { body: commands },
        );

        console.log('✅ Commands registered successfully!');
        console.log('📋 Available commands:');
        console.log('   /sign - Sign IPA files');
        console.log('   /certcheck - Check certificate status');
        console.log('   /analyzeksign - Analyze ksign files');
        console.log('   /bypass - Bypass URL restrictions');
        
        return data;
    } catch (error) {
        console.error('❌ Error registering commands:', error);
        throw error;
    }
}

// Auto-run if this file is executed directly
if (require.main === module) {
    registerCommands();
}

module.exports = registerCommands;

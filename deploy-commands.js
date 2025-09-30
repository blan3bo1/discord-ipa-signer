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
  }
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Registering commands...');
    
    await rest.put(
      Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.GUILD_ID),
      { body: commands },
    );

    console.log('Commands registered successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error registering commands:', error);
    process.exit(1);
  }
})();

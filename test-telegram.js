const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

console.log('Testing Telegram connection...\n');
console.log('Bot Token:', token ? '✅ Present' : '❌ Missing');
console.log('Chat ID:', chatId ? `✅ ${chatId}` : '❌ Missing');

if (!token || !chatId) {
  console.error('\n❌ Missing credentials in .env');
  process.exit(1);
}

const bot = new TelegramBot(token);

async function test() {
  try {
    console.log('\n[1] Testing bot token validity...');
    const me = await bot.getMe();
    console.log(`    ✅ Bot is valid: @${me.username} (ID: ${me.id})`);

    console.log('\n[2] Testing message send to chat ID...');
    const msg = await bot.sendMessage(chatId, '🤖 Test message from derivFreeTelegram bot\n\nIf you see this, Telegram integration is working!', { parse_mode: 'HTML' });
    console.log(`    ✅ Message sent! (Message ID: ${msg.message_id})`);
    
    console.log('\n✅ ALL TESTS PASSED - Your Telegram setup is correct!');
    console.log('\nRestart with: npm start');
    process.exit(0);

  } catch (err) {
    console.error(`\n❌ ERROR: ${err.message}`);
    
    if (err.message.includes('404')) {
      console.error('\n🔍 DIAGNOSIS: 404 Not Found');
      console.error('   This means the bot cannot access chat ID:', chatId);
      console.error('\n   How to fix:');
      console.error('   1. Open Telegram and check if bot is member of group');
      console.error('   2. In the group, send: @userinfobot /my_id');
      console.error('   3. Copy the exact ID returned');
      console.error('   4. Update .env: TELEGRAM_CHAT_ID=<exact_id>');
      console.error('   5. Run this test again');
    } else if (err.message.includes('401')) {
      console.error('\n🔍 DIAGNOSIS: 401 Unauthorized');
      console.error('   Your bot token is invalid or revoked');
      console.error('   Check BotFather for the correct token');
    }
    
    process.exit(1);
  }
}

test();

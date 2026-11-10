require('dotenv').config();
const bcrypt = require('bcryptjs');

async function createHash() {
    const password = 'Wanjiru@2026';

    const hash = await bcrypt.hash(password, 10);

    console.log('PASSWORD HASH:');
    console.log(hash);
}

createHash();

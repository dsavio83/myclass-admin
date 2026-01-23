const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });
const { User } = require('./models.cjs');

async function listUsers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const users = await User.find({}, 'username role requestRole');
        console.log('Users found:', users);
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

listUsers();

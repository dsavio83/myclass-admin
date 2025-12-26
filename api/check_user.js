
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { User } = require('./models.cjs');

async function checkUser() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const u = await User.findOne({ username: 'student1' });
        if (u) {
            console.log(`User found: ${u.username}, Role: ${u.role}, Password: ${u.password}`);
        } else {
            console.log("User student1 not found");
        }
        const admin = await User.findOne({ username: 'admin' });
        if (admin) {
            console.log(`User found: ${admin.username}, Role: ${admin.role}, Password: ${admin.password}`);
        }
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}
checkUser();

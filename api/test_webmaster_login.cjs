const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const { Webmaster } = require('./models.cjs');

const testWebmasterLogin = async () => {
    try {
        console.log('Testing webmaster login...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✓ MongoDB connected');

        // Test login with new credentials
        const username = 'webmaster';
        const password = 'admin';
        
        console.log(`Testing login with username: ${username}, password: ${password}`);
        
        const webmaster = await Webmaster.findOne({ username });
        
        if (!webmaster) {
            console.log('✗ Webmaster user not found');
            return;
        }
        
        console.log(`✓ Found webmaster user: ${webmaster.username}`);
        console.log(`Password hash: ${webmaster.password.substring(0, 20)}...`);
        
        // Test password verification
        const isValidPassword = await bcrypt.compare(password, webmaster.password);
        
        if (isValidPassword) {
            console.log('✓ Password verification successful!');
            console.log('✓ Webmaster login should work correctly');
            console.log('\nTest Results:');
            console.log('Username: webmaster');
            console.log('Password: admin');
            console.log('Status: ✓ LOGIN WORKS');
        } else {
            console.log('✗ Password verification failed');
            console.log('Status: ✗ LOGIN FAILS');
        }
        
        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('✗ Test error:', error);
        process.exit(1);
    }
};

testWebmasterLogin();
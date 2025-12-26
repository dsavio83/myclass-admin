const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const { Webmaster } = require('./models.cjs');

const setWebmasterPassword = async () => {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✓ MongoDB connected');

        // Find existing webmaster or create new one
        let webmaster = await Webmaster.findOne({ username: 'webmaster' });
        
        if (webmaster) {
            console.log('✓ Found existing webmaster user');
            console.log(`  - username: ${webmaster.username}`);
            console.log(`  - current password hash: ${webmaster.password.substring(0, 20)}...`);
        } else {
            console.log('✓ Creating new webmaster user');
            webmaster = new Webmaster({
                username: 'webmaster'
            });
        }

        // Set new password "admin"
        const newPassword = 'admin';
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        webmaster.password = hashedPassword;
        await webmaster.save();
        
        console.log('✓ Webmaster password updated successfully!');
        console.log('\nWebmaster Login Credentials:');
        console.log('Username: webmaster');
        console.log('Password: admin');
        console.log('Endpoint: POST /api/auth/webmaster-login');

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('✗ Password update error:', error);
        process.exit(1);
    }
};

setWebmasterPassword();
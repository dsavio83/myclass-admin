const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const { Webmaster } = require('./models');

const seedWebmaster = async () => {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✓ MongoDB connected');

        // Clear existing webmasters (optional - remove this line if you want to keep existing webmasters)
        await Webmaster.deleteMany({});
        console.log('✓ Cleared existing webmasters');

        // Create test webmaster user
        // Note: The webmaster model uses bcrypt for password hashing (line 480 in routes)
        const webmaster = new Webmaster({
            username: 'webmaster',
            password: await bcrypt.hash('webmaster123', 10) // Hash the password for security
        });

        await webmaster.save();
        console.log('✓ Created webmaster user:');
        console.log(`  - username: ${webmaster.username}`);
        console.log('  - password: webmaster123');

        console.log('\n✅ Webmaster seeded successfully!');
        console.log('\nWebmaster Login Credentials:');
        console.log('Username: webmaster');
        console.log('Password: webmaster123');
        console.log('Endpoint: POST /api/auth/webmaster-login');

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('✗ Webmaster seeding error:', error);
        process.exit(1);
    }
};

seedWebmaster();
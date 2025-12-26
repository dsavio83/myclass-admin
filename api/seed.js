const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const testConnection = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined. Please configure MongoDB Atlas connection in api/.env file.');
        }

        await mongoose.connect(process.env.MONGODB_URI);

        console.log('✓ MongoDB connection successful');
        console.log('No data was added, removed, or modified.');

        process.exit(0);
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

testConnection();

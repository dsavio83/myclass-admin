// Test your MongoDB credentials without starting the server.
// Run:  node api/test-db-connection.js
//   or: node api/test-db-connection.js "mongodb+srv://user:pass@host/db"
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables safely
const envCandidatePaths = [
    path.join(process.cwd(), '.env'),
    path.join(__dirname, '.env'),
    path.join(__dirname, '../.env')
];
for (const envPath of envCandidatePaths) {
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath, override: false });
    }
}

let uri = process.argv[2] || process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL;

if (!uri) {
    console.error('No URI found. Set MONGODB_URI in your environment or pass one as an argument.');
    process.exit(1);
}

uri = uri.trim();
if ((uri.startsWith('"') && uri.endsWith('"')) || (uri.startsWith("'") && uri.endsWith("'"))) {
    uri = uri.slice(1, -1).trim();
}

// Show the shape of the URI without leaking the password
const safe = uri.replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)[^@]+(@)/i, '$1****$2');
console.log(`Testing MongoDB connection: ${safe}\n`);

try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    const state = mongoose.connection.readyState;
    const host = mongoose.connection.host;
    const name = mongoose.connection.name;
    console.log(`SUCCESS - connected to ${host}, database "${name}", state=${state}`);
    console.log('Your .env is correct. Start the server with: npm run dev');
    await mongoose.disconnect();
    process.exit(0);
} catch (error) {
    const msg = error?.message ?? String(error);
    console.error(`FAILED - ${error?.name}: ${msg}\n`);

    if (/bad auth|auth(?:entication)? failed/i.test(msg)) {
        console.error(
            'DIAGNOSIS: the username exists but the PASSWORD is wrong.\n' +
            '  - This is NOT a code bug and NOT an authSource bug.\n' +
            '  - Go to https://cloud.mongodb.com -> Database Access -> dsavio83_db_user\n' +
            '  - Edit Password, choose a NEW one using letters+digits only\n' +
            '  - Put it in api/.env as:\n' +
            '    MONGODB_URI="mongodb+srv://dsavio83_db_user:NEW_PASS@cluster0.kfyrhlx.mongodb.net/test?retryWrites=true&w=majority&authSource=admin"\n' +
            '  (note the surrounding double quotes)'
        );
    } else if (/getaddrinfo|ENOTFOUND|querySrv/i.test(msg)) {
        console.error('DIAGNOSIS: could not resolve the cluster hostname - check the host name / your internet.');
    } else if (/Server selection timed out/i.test(msg)) {
        console.error('DIAGNOSIS: cluster unreachable - check your IP is allowed in Atlas Network Access.');
    } else {
        console.error('DIAGNOSIS: unrecognised error - see the message above.');
    }
    process.exit(1);
}

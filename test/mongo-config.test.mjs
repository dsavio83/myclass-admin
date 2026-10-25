import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getMongoUri, maskMongoUri, app } from '../api/index.js';

describe('MongoDB Configuration & Security Suite', () => {
    it('maskMongoUri should safely mask passwords in standard and SRV URIs', () => {
        const srv = 'mongodb+srv://adminUser:SuperSecret123@cluster0.abcde.mongodb.net/test?retryWrites=true';
        assert.equal(maskMongoUri(srv), 'mongodb+srv://adminUser:****@cluster0.abcde.mongodb.net/test?retryWrites=true');

        const standard = 'mongodb://dbuser:mypassword@localhost:27017/myclass';
        assert.equal(maskMongoUri(standard), 'mongodb://dbuser:****@localhost:27017/myclass');

        assert.equal(maskMongoUri(''), 'not-configured');
        assert.equal(maskMongoUri(null), 'not-configured');
    });

    it('getMongoUri should strip enclosing double or single quotes', () => {
        const original = process.env.MONGODB_URI;
        try {
            process.env.MONGODB_URI = '"mongodb+srv://user:pass@host/db"';
            assert.equal(getMongoUri(), 'mongodb+srv://user:pass@host/db');

            process.env.MONGODB_URI = "'mongodb+srv://user:pass@host/db'";
            assert.equal(getMongoUri(), 'mongodb+srv://user:pass@host/db');

            process.env.MONGODB_URI = '  mongodb+srv://user:pass@host/db  ';
            assert.equal(getMongoUri(), 'mongodb+srv://user:pass@host/db');
        } finally {
            if (original !== undefined) {
                process.env.MONGODB_URI = original;
            } else {
                delete process.env.MONGODB_URI;
            }
        }
    });

    it('getMongoUri should support MONGO_URI and DATABASE_URL aliases', () => {
        const origMain = process.env.MONGODB_URI;
        const origAlias = process.env.DATABASE_URL;
        try {
            delete process.env.MONGODB_URI;
            process.env.DATABASE_URL = 'mongodb+srv://aliasUser:aliasPass@host/aliasDb';
            assert.equal(getMongoUri(), 'mongodb+srv://aliasUser:aliasPass@host/aliasDb');
        } finally {
            if (origMain !== undefined) process.env.MONGODB_URI = origMain;
            if (origAlias !== undefined) process.env.DATABASE_URL = origAlias;
            else delete process.env.DATABASE_URL;
        }
    });

    it('Express app exports a valid router and middleware stack', () => {
        assert.ok(app);
        assert.equal(typeof app.use, 'function');
        assert.equal(typeof app.listen, 'function');
    });
});

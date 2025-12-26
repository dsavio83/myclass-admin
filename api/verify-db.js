const mongoose = require('mongoose');
const { User, Class, Subject, Unit, SubUnit, Lesson, Content } = require('./models');
const dotenv = require('dotenv');

dotenv.config();

const verifyDatabase = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('✗ MONGODB_URI not found in .env file');
            process.exit(1);
        }

        console.log('Connecting to:', process.env.MONGODB_URI.replace(/:[^:@]+@/, ':****@'));
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✓ Connected to MongoDB');
        console.log('✓ Database name:', mongoose.connection.name);
        console.log('✓ Host:', mongoose.connection.host);
        console.log('\n--- Database Contents ---\n');

        const [users, classes, subjects, units, subUnits, lessons, contents] = await Promise.all([
            User.find({}),
            Class.find({}),
            Subject.find({}),
            Unit.find({}),
            SubUnit.find({}),
            Lesson.find({}),
            Content.find({})
        ]);

        console.log(`Users: ${users.length}`);
        users.forEach(u => console.log(`  - ${u.username} (${u.role})`));

        console.log(`\nClasses: ${classes.length}`);
        classes.forEach(c => console.log(`  - ${c.name} (ID: ${c._id})`));

        console.log(`\nSubjects: ${subjects.length}`);
        subjects.forEach(s => console.log(`  - ${s.name} (Class: ${s.classId})`));

        console.log(`\nUnits: ${units.length}`);
        units.forEach(u => console.log(`  - ${u.name} (Subject: ${u.subjectId})`));

        console.log(`\nSubUnits: ${subUnits.length}`);
        subUnits.forEach(su => console.log(`  - ${su.name} (Unit: ${su.unitId})`));

        console.log(`\nLessons: ${lessons.length}`);
        lessons.forEach(l => console.log(`  - ${l.name} (SubUnit: ${l.subUnitId})`));

        console.log(`\nContents: ${contents.length}`);
        contents.forEach(c => console.log(`  - ${c.title} (${c.type})`));

        process.exit(0);
    } catch (error) {
        console.error('✗ Error:', error.message);
        process.exit(1);
    }
};

verifyDatabase();

const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const { User, Class, Subject, Unit, SubUnit, Lesson } = require('./models');

const seedUsers = async () => {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✓ MongoDB connected');

        // Clear existing users (optional - remove this line if you want to keep existing users)
        await User.deleteMany({});
        console.log('✓ Cleared existing users');

        // Create test users
        const users = [
            {
                username: 'admin',
                password: 'admin', // Note: In production, use bcrypt to hash passwords
                name: 'Administrator',
                email: 'admin@example.com',
                role: 'admin',
                status: 'active',
                isFirstLogin: false
            },
            {
                username: 'teacher1',
                password: 'teacher123',
                name: 'John Teacher',
                email: 'teacher@example.com',
                role: 'teacher',
                status: 'active',
                isFirstLogin: false
            },
            {
                username: 'student1',
                password: 'student123',
                name: 'Jane Student',
                email: 'student@example.com',
                role: 'student',
                status: 'active',
                isFirstLogin: false
            },
            {
                username: 'teacher2',
                password: 'teacher456',
                name: 'Sarah Science Teacher',
                email: 'sarah.science@example.com',
                role: 'teacher',
                status: 'active',
                isFirstLogin: false
            }
        ];

        // Insert users
        const insertedUsers = await User.insertMany(users);
        console.log('✓ Created', insertedUsers.length, 'users:');
        insertedUsers.forEach(user => {
            console.log(`  - ${user.username} (${user.role})`);
        });

        // Create some sample hierarchy (classes, subjects, etc.)
        console.log('Creating sample hierarchy...');
        
        const class8 = new Class({ name: 'Class 8' });
        await class8.save();
        console.log('✓ Created Class 8');

        const class10 = new Class({ name: 'Class 10' });
        await class10.save();
        console.log('✓ Created Class 10');

        const tamil8 = new Subject({ name: 'Tamil AT', classId: class8._id });
        await tamil8.save();
        console.log('✓ Created Tamil AT subject');

        const biology10 = new Subject({ name: 'Biology', classId: class10._id });
        await biology10.save();
        console.log('✓ Created Biology subject');

        const unit1 = new Unit({ name: 'Unit 1', subjectId: tamil8._id });
        await unit1.save();
        console.log('✓ Created Unit 1');

        const unit4 = new Unit({ name: 'Unit 4', subjectId: biology10._id });
        await unit4.save();
        console.log('✓ Created Unit 4');

        // Create subUnits first
        const subUnit1 = new SubUnit({ name: 'Basic Tamil', unitId: unit1._id });
        await subUnit1.save();
        console.log('✓ Created Basic Tamil subUnit');

        const subUnit4 = new SubUnit({ name: 'Cell Structure', unitId: unit4._id });
        await subUnit4.save();
        console.log('✓ Created Cell Structure subUnit');

        // Create lessons under subUnits
        const lesson1 = new Lesson({ name: 'Introduction to Tamil', subUnitId: subUnit1._id });
        await lesson1.save();
        console.log('✓ Created Tamil lesson');

        const cellBiology = new Lesson({ name: 'Cell Biology', subUnitId: subUnit4._id });
        await cellBiology.save();
        console.log('✓ Created Biology lesson');

        console.log('\n✅ Database seeded successfully!');
        console.log('\nTest Login Credentials:');
        console.log('Admin: username="admin", password="admin123"');
        console.log('Teacher: username="teacher1", password="teacher123"');
        console.log('Student: username="student1", password="student123"');

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('✗ Seeding error:', error);
        process.exit(1);
    }
};

seedUsers();
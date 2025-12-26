import mongoose from 'mongoose';
import cloudinary from 'cloudinary';

// Load env vars
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Test database save functionality
async function testDatabaseSave() {
    try {
        console.log('Testing database save functionality...');
        
        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        console.log('✅ Database connected successfully');
        
        // Load models
        const models = await import('./models.cjs');
        console.log('Available models:', Object.keys(models));
        
        const { Content, Lesson, SubUnit, Unit, Subject, Class } = models;
        
        // Create test hierarchy
        console.log('Creating test hierarchy...');
        const testClass = await Class.create({ name: 'Test Class' });
        const testSubject = await Subject.create({ name: 'Test Subject', classId: testClass._id });
        const testUnit = await Unit.create({ name: 'Test Unit', subjectId: testSubject._id });
        const testSubUnit = await SubUnit.create({ name: 'Test SubUnit', unitId: testUnit._id });
        const testLesson = await Lesson.create({ name: 'Test Lesson', subUnitId: testSubUnit._id });
        
        console.log('✅ Test hierarchy created:', testLesson._id);
        
        // Simulate Cloudinary upload result
        const mockUploadResult = {
            secure_url: 'https://res.cloudinary.com/test/video/upload/v1234567890/test-video.mp4',
            public_id: 'test-video',
            bytes: 1024000,
            pages: 0,
            duration: 60
        };
        
        // Test content creation with the same logic as the upload route
        console.log('Testing content creation...');
        
        const contentData = {
            lessonId: testLesson._id,
            title: 'Test Video Upload',
            type: 'video',
            storage: "cloudinary",
            file: {
                url: mockUploadResult.secure_url,
                publicId: mockUploadResult.public_id,
                size: mockUploadResult.bytes,
                mime: 'video/mp4',
                pages: mockUploadResult.pages,
                duration: mockUploadResult.duration
            },
            viewCount: 0,
            downloadCount: 0,
            isPublished: false,
            metadata: {
                hierarchyPath: 'test/path',
                className: 'Test Class',
                subjectName: 'Test Subject',
                unitName: 'Test Unit',
                subUnitName: 'Test SubUnit',
                lessonName: 'Test Lesson'
            }
        };
        
        console.log('Content data:', {
            lessonId: contentData.lessonId,
            title: contentData.title,
            type: contentData.type,
            storage: contentData.storage,
            fileUrl: contentData.file.url
        });
        
        const content = await Content.create(contentData);
        
        console.log('✅ Content saved successfully:', {
            id: content._id,
            title: content.title,
            type: content.type,
            lessonId: content.lessonId,
            fileUrl: content.file.url
        });
        
        console.log('🎉 Database save test PASSED!');
        
        // Clean up test data
        await Content.deleteOne({ _id: content._id });
        await Lesson.deleteOne({ _id: testLesson._id });
        await SubUnit.deleteOne({ _id: testSubUnit._id });
        await Unit.deleteOne({ _id: testUnit._id });
        await Subject.deleteOne({ _id: testSubject._id });
        await Class.deleteOne({ _id: testClass._id });
        
        console.log('✅ Test data cleaned up');
        
    } catch (error) {
        console.error('❌ Database save test FAILED:', {
            error: error.message,
            errorType: error.constructor.name,
            validationErrors: error.errors
        });
    } finally {
        await mongoose.disconnect();
    }
}

testDatabaseSave();
import axios from 'axios';
import FormData from 'form-data';

// Test upload functionality with a valid video file
async function testUpload() {
    try {
        console.log('Testing upload functionality...');
        
        // Create a minimal valid MP4 file header for testing
        // This is a very basic MP4 header that Cloudinary should accept
        const mp4Header = Buffer.from([
            0x00, 0x00, 0x00, 0x20, // Box size (32 bytes)
            0x66, 0x74, 0x79, 0x70, // 'ftyp' - File Type Box
            0x69, 0x73, 0x6F, 0x6D, // 'isom' - Major brand
            0x00, 0x00, 0x02, 0x00, // Minor version
            0x69, 0x73, 0x6F, 0x6D, // Compatible brand 1
            0x61, 0x76, 0x63, 0x31, // Compatible brand 2
            0x6D, 0x70, 0x34, 0x31, // Compatible brand 3
            0x6D, 0x70, 0x34, 0x32  // Compatible brand 4
        ]);
        
        const testFile = Buffer.concat([mp4Header, Buffer.alloc(1024 * 1024, 0)]); // 1MB file
        const testFileName = 'test-upload-video.mp4';
        
        // Create form data
        const form = new FormData();
        form.append('file', testFile, {
            filename: testFileName,
            contentType: 'video/mp4'
        });
        form.append('type', 'video');
        form.append('title', 'Test Upload Video');
        form.append('lessonId', '6769a1b8e4b0f8b8c8b8c8b8'); // Test ObjectId
        form.append('folder', 'test/Videos');
        
        console.log('Sending upload request...');
        
        const response = await axios.post('http://localhost:5001/api/upload', form, {
            headers: {
                ...form.getHeaders(),
                'Content-Type': `multipart/form-data; boundary=${form._boundary}`
            },
            timeout: 60000 // Increased timeout for upload
        });
        
        console.log('Upload response:', response.data);
        
        if (response.data.success) {
            console.log('✅ Upload test PASSED!');
            console.log('Content ID:', response.data.content._id);
            console.log('Content Title:', response.data.content.title);
            console.log('File URL:', response.data.content.file.url);
        } else {
            console.log('❌ Upload test FAILED:', response.data.message);
        }
        
    } catch (error) {
        if (error.response) {
            console.log('❌ Upload test FAILED with status:', error.response.status);
            console.log('Error response:', error.response.data);
        } else {
            console.log('❌ Upload test FAILED:', error.message);
        }
    }
}

testUpload();
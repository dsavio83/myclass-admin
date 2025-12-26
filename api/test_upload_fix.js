import axios from 'axios';
import FormData from 'form-data';

// Test the fixed upload functionality
async function testUploadFix() {
    try {
        console.log('Testing upload fix for both Video and Audio...');
        
        // Test with a simple text file to avoid Cloudinary format issues
        const testFile = Buffer.from('test upload content for validation', 'utf8');
        const testFileName = 'test-upload.txt';
        
        // Create form data for audio upload
        const form = new FormData();
        form.append('file', testFile, {
            filename: testFileName,
            contentType: 'text/plain'
        });
        form.append('type', 'audio');
        form.append('title', 'Test Audio Upload');
        form.append('lessonId', '6769a1b8e4b0f8b8c8b8c8b8'); // Invalid ObjectId for testing
        form.append('folder', 'test/Audios');
        
        console.log('Sending upload request with invalid lessonId...');
        
        const response = await axios.post('http://localhost:5001/api/upload', form, {
            headers: {
                ...form.getHeaders(),
                'Content-Type': `multipart/form-data; boundary=${form._boundary}`
            },
            timeout: 30000
        });
        
        console.log('Upload response:', response.data);
        
        // Check if the fix is working - should get a specific error about invalid lessonId
        if (response.data.message && response.data.message.includes('Invalid lessonId')) {
            console.log('✅ Upload fix is working! Invalid lessonId properly validated');
            console.log('Error message:', response.data.message);
        } else if (response.data.success) {
            console.log('✅ Upload successful with valid data');
        } else {
            console.log('❌ Upload failed with unexpected error:', response.data.message);
        }
        
    } catch (error) {
        if (error.response) {
            console.log('Upload response status:', error.response.status);
            console.log('Response data:', error.response.data);
            
            // Check if we get the expected validation error
            if (error.response.data.message && error.response.data.message.includes('Invalid lessonId')) {
                console.log('✅ Upload fix is working! Invalid lessonId properly validated');
            } else {
                console.log('❌ Upload failed with unexpected error:', error.response.data.message);
            }
        } else {
            console.log('❌ Upload test failed:', error.message);
        }
    }
}

testUploadFix();
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Content } = require('./models.cjs');
const { v2: cloudinary } = require('cloudinary');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('Connected to DB');

        // Target the specific lesson
        const lessonId = "692a723f856ab8a8d15e4652";

        // Find books for this lesson
        const books = await Content.find({ lessonId, type: 'book' });
        console.log(`Found ${books.length} books.`);

        for (const book of books) {
            console.log(`Deleting book: ${book.title} (ID: ${book._id})`);

            // Try to delete from Cloudinary if public_id exists
            if (book.file && book.file.publicId) {
                try {
                    // Try deleting as image first (since that's what it was uploaded as)
                    await cloudinary.uploader.destroy(book.file.publicId, { resource_type: 'image' });
                    console.log('Deleted from Cloudinary (image)');
                } catch (e) {
                    console.log('Cloudinary delete error:', e.message);
                }
            }

            await Content.deleteOne({ _id: book._id });
            console.log('Deleted from DB');
        }

        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });

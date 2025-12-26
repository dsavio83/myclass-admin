const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Content } = require('./models.cjs');

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('Connected to DB');

        // Pattern to match the bad record seen in logs
        // id: new ObjectId("693e7a0cdeea4125a64c4ca4")
        const badId = "693e7a0cdeea4125a64c4ca4";

        const res = await Content.deleteOne({ _id: badId });
        console.log(`Deleted content with ID ${badId}:`, res.deletedCount);

        // Also look for any other content with encoding % in file url for this lesson
        // LessonID from log: 692a723f856ab8a8d15e4652
        const lessonId = "692a723f856ab8a8d15e4652";
        const overview = await Content.find({ lessonId });
        console.log('Remaining content for lesson:', overview.length);

        // Delete any book for this lesson just to be clean
        const res2 = await Content.deleteMany({ lessonId, type: 'book' });
        console.log('Deleted all books for lesson:', res2.deletedCount);

        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });

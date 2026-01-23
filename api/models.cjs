const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    role: { type: String, enum: ['admin', 'teacher', 'student'], required: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    isFirstLogin: { type: Boolean, default: true },
    mobileNumber: { type: String },
    canEdit: { type: Boolean, default: false },
    totalDownloads: { type: Number, default: 0 },
    worksheetDownloads: { type: Number, default: 0 },
    requestRole: { type: String, default: null },
    teacherRequestStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: null }
}, { timestamps: true });

const classSchema = new mongoose.Schema({
    name: { type: String, required: true },
    isPublished: { type: Boolean, default: false } // Publish toggle
}, { timestamps: true });

const subjectSchema = new mongoose.Schema({
    name: { type: String, required: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    isPublished: { type: Boolean, default: false } // Publish toggle
}, { timestamps: true });

const unitSchema = new mongoose.Schema({
    name: { type: String, required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    isPublished: { type: Boolean, default: false } // Publish toggle
}, { timestamps: true });

const subUnitSchema = new mongoose.Schema({
    name: { type: String, required: true },
    unitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', required: true },
    isPublished: { type: Boolean, default: false } // Publish toggle
}, { timestamps: true });

const lessonSchema = new mongoose.Schema({
    name: { type: String, required: true },
    subUnitId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubUnit', required: true },
    isPublished: { type: Boolean, default: false }, // Publish toggle
    // View Counts
    notesViewCount: { type: Number, default: 0 },
    qaViewCount: { type: Number, default: 0 },
    bookViewCount: { type: Number, default: 0 },
    slideViewCount: { type: Number, default: 0 },
    videoViewCount: { type: Number, default: 0 },
    audioViewCount: { type: Number, default: 0 },
    flashcardViewCount: { type: Number, default: 0 },
    worksheetViewCount: { type: Number, default: 0 },
    questionPaperViewCount: { type: Number, default: 0 },
    quizViewCount: { type: Number, default: 0 },
    activityViewCount: { type: Number, default: 0 },

    // PDF View Counts (Specific for Question & Worksheet)
    worksheetPdfViewCount: { type: Number, default: 0 },
    questionPaperPdfViewCount: { type: Number, default: 0 },

    // Download Counts
    notesDownloadCount: { type: Number, default: 0 },
    qaDownloadCount: { type: Number, default: 0 },
    bookDownloadCount: { type: Number, default: 0 },
    slideDownloadCount: { type: Number, default: 0 },
    videoDownloadCount: { type: Number, default: 0 },
    audioDownloadCount: { type: Number, default: 0 },
    flashcardDownloadCount: { type: Number, default: 0 },
    worksheetDownloadCount: { type: Number, default: 0 },
    questionPaperDownloadCount: { type: Number, default: 0 },
    quizDownloadCount: { type: Number, default: 0 },
    activityDownloadCount: { type: Number, default: 0 },

    // PDF Download Counts
    worksheetPdfDownloadCount: { type: Number, default: 0 },
    questionPaperPdfDownloadCount: { type: Number, default: 0 }
}, { timestamps: true });

const webmasterSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
}, { timestamps: true });

const contentSchema = new mongoose.Schema({
    lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String }, // Text content or JSON
    filePath: { type: String }, // Path to uploaded file
    originalFileName: { type: String }, // Original filename
    fileSize: { type: Number }, // File size in bytes
    // Cloudinary Fields
    storage: { type: String, enum: ['local', 'cloudinary', 'database'], default: 'local' },
    file: {
        url: String,
        publicId: String,
        size: Number,
        mime: String,
        pages: Number,
        duration: Number
    },
    viewCount: { type: Number, default: 0 },
    downloadCount: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: false }, // Publish toggle
    metadata: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

const downloadSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Optional if guest
    contentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content', required: true },
    contentType: { type: String, required: true }, // e.g., 'worksheet'
    emailProvided: { type: String },
    downloadedAt: { type: Date, default: Date.now },
    ipAddress: { type: String },
    userAgent: { type: String },
    emailStatus: { type: String, enum: ['sent', 'failed', 'skipped', 'processing'], default: 'skipped' },
    errorMessage: { type: String }
}, { timestamps: true });

// Create indexes
downloadSchema.index({ userId: 1 });
downloadSchema.index({ contentId: 1 });
downloadSchema.index({ downloadedAt: -1 });

// Create indexes for better query performance
contentSchema.index({ lessonId: 1, type: 1 });
userSchema.index({ username: 1 });

// DownloadLog Schema for tracking all downloads
const downloadLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userEmail: { type: String, required: true },
    userName: { type: String },
    contentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content', required: true },
    contentTitle: { type: String, required: true },
    contentType: { type: String, required: true },
    lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
    className: { type: String },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
    subjectName: { type: String },
    unitName: { type: String },
    subUnitName: { type: String },
    lessonName: { type: String },
    downloadStatus: { type: String, enum: ['success', 'failed'], required: true },
    emailSent: { type: Boolean, default: false },
    errorMessage: { type: String },
    downloadedAt: { type: Date, default: Date.now },
    ipAddress: { type: String }
}, { timestamps: true });

// Indexes for faster queries
downloadLogSchema.index({ userId: 1, downloadedAt: -1 });
downloadLogSchema.index({ downloadStatus: 1, downloadedAt: -1 });
downloadLogSchema.index({ contentType: 1 });

module.exports = {
    User: mongoose.model('User', userSchema),
    Class: mongoose.model('Class', classSchema),
    Subject: mongoose.model('Subject', subjectSchema),
    Unit: mongoose.model('Unit', unitSchema),
    SubUnit: mongoose.model('SubUnit', subUnitSchema),
    Lesson: mongoose.model('Lesson', lessonSchema),
    Content: mongoose.model('Content', contentSchema),
    Webmaster: mongoose.model('Webmaster', webmasterSchema),
    Download: mongoose.model('Download', downloadSchema),
    DownloadLog: mongoose.model('DownloadLog', downloadLogSchema)
};
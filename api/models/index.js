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
    requestRole: { type: String, default: null },
    district: { type: String },
    subDistrict: { type: String },
    school: { type: String }
}, { timestamps: true });

const classSchema = new mongoose.Schema({
    name: { type: String, required: true }
}, { timestamps: true });

const subjectSchema = new mongoose.Schema({
    name: { type: String, required: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true }
}, { timestamps: true });

const unitSchema = new mongoose.Schema({
    name: { type: String, required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true }
}, { timestamps: true });

const subUnitSchema = new mongoose.Schema({
    name: { type: String, required: true },
    unitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', required: true }
}, { timestamps: true });

const lessonSchema = new mongoose.Schema({
    name: { type: String, required: true },
    subUnitId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubUnit', required: true },
    notesViewCount: { type: Number, default: 0 },
    notesDownloadCount: { type: Number, default: 0 },
    qaViewCount: { type: Number, default: 0 },
    qaDownloadCount: { type: Number, default: 0 },
    bookViewCount: { type: Number, default: 0 },
    slideViewCount: { type: Number, default: 0 },
    videoViewCount: { type: Number, default: 0 },
    audioViewCount: { type: Number, default: 0 },
    flashcardViewCount: { type: Number, default: 0 },
    worksheetViewCount: { type: Number, default: 0 },
    questionPaperViewCount: { type: Number, default: 0 },
    quizViewCount: { type: Number, default: 0 },
    activityViewCount: { type: Number, default: 0 }
}, { timestamps: true });

const contentSchema = new mongoose.Schema({
    lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String }, // Can be text, URL, or JSON string
    filePath: { type: String }, // Path to uploaded file in uploads folder
    originalFileName: { type: String }, // Original filename of uploaded file
    fileSize: { type: Number }, // Size of uploaded file in bytes
    viewCount: { type: Number, default: 0 }, // Number of times content has been viewed
    downloadCount: { type: Number, default: 0 }, // Number of times content has been downloaded
    metadata: { type: mongoose.Schema.Types.Mixed } // Flexible field for various metadata
}, { timestamps: true });

const DownloadLog = require('./DownloadLog.cjs');

module.exports = {
    User: mongoose.model('User', userSchema),
    Class: mongoose.model('Class', classSchema),
    Subject: mongoose.model('Subject', subjectSchema),
    Unit: mongoose.model('Unit', unitSchema),
    SubUnit: mongoose.model('SubUnit', subUnitSchema),
    Lesson: mongoose.model('Lesson', lessonSchema),
    Content: mongoose.model('Content', contentSchema),
    DownloadLog
};

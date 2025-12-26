const mongoose = require('mongoose');

const downloadLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
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

module.exports = mongoose.model('DownloadLog', downloadLogSchema);

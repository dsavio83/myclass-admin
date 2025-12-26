
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Class, Subject, Unit, SubUnit, Lesson } = require('./models.cjs');

async function testPublish() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error("MONGODB_URI not found in .env");
            process.exit(1);
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");

        // --- Test Class ---
        let cls = await Class.findOne();
        if (!cls) {
            cls = await Class.create({ name: "Test Class" });
            console.log("Created Test Class");
        }
        console.log(`Original Class status: ${cls.isPublished}`);
        const newClassStatus = !cls.isPublished;

        let updatedClass = await Class.findByIdAndUpdate(cls._id, { $set: { isPublished: newClassStatus } }, { new: true });
        console.log(`Updated Class status: ${updatedClass.isPublished}`);

        if (updatedClass.isPublished !== newClassStatus) {
            console.error("FAILED to update Class isPublished");
        } else {
            console.log("SUCCESS Class update verified in DB");
        }

        // --- Test Subject ---
        let sub = await Subject.findOne();
        if (!sub) {
            sub = await Subject.create({ name: "Test Subject", classId: cls._id });
            console.log("Created Test Subject");
        }
        console.log(`Original Subject status: ${sub.isPublished}`);
        const newSubStatus = !sub.isPublished;
        let updatedSubject = await Subject.findByIdAndUpdate(sub._id, { $set: { isPublished: newSubStatus } }, { new: true });
        console.log(`Updated Subject status: ${updatedSubject.isPublished}`);
        if (updatedSubject.isPublished !== newSubStatus) {
            console.error("FAILED to update Subject isPublished");
        } else {
            console.log("SUCCESS Subject update verified in DB");
        }

        // --- Test Unit ---
        let unit = await Unit.findOne();
        if (!unit) {
            unit = await Unit.create({ name: "Test Unit", subjectId: sub._id });
            console.log("Created Test Unit");
        }
        console.log(`Original Unit status: ${unit.isPublished}`);
        const newUnitStatus = !unit.isPublished;
        let updatedUnit = await Unit.findByIdAndUpdate(unit._id, { $set: { isPublished: newUnitStatus } }, { new: true });
        console.log(`Updated Unit status: ${updatedUnit.isPublished}`);
        if (updatedUnit.isPublished !== newUnitStatus) {
            console.error("FAILED to update Unit isPublished");
        } else {
            console.log("SUCCESS Unit update verified in DB");
        }

        // --- Test SubUnit ---
        let subUnit = await SubUnit.findOne();
        if (!subUnit) {
            subUnit = await SubUnit.create({ name: "Test SubUnit", unitId: unit._id });
            console.log("Created Test SubUnit");
        }
        console.log(`Original SubUnit status: ${subUnit.isPublished}`);
        const newSubUnitStatus = !subUnit.isPublished;
        let updatedSubUnit = await SubUnit.findByIdAndUpdate(subUnit._id, { $set: { isPublished: newSubUnitStatus } }, { new: true });
        console.log(`Updated SubUnit status: ${updatedSubUnit.isPublished}`);
        if (updatedSubUnit.isPublished !== newSubUnitStatus) {
            console.error("FAILED to update SubUnit isPublished");
        } else {
            console.log("SUCCESS SubUnit update verified in DB");
        }

        // --- Test Lesson ---
        let lesson = await Lesson.findOne();
        if (!lesson) {
            lesson = await Lesson.create({ name: "Test Lesson", subUnitId: subUnit._id });
            console.log("Created Test Lesson");
        }
        console.log(`Original Lesson status: ${lesson.isPublished}`);
        const newLessonStatus = !lesson.isPublished;
        let updatedLesson = await Lesson.findByIdAndUpdate(lesson._id, { $set: { isPublished: newLessonStatus } }, { new: true });
        console.log(`Updated Lesson status: ${updatedLesson.isPublished}`);
        if (updatedLesson.isPublished !== newLessonStatus) {
            console.error("FAILED to update Lesson isPublished");
        } else {
            console.log("SUCCESS Lesson update verified in DB");
        }


    } catch (e) {
        console.error("Error:", e);
    } finally {
        await mongoose.disconnect();
    }
}

testPublish();

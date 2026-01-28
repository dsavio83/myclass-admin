// FIX: Import React to provide the namespace for React types.
import React from 'react';

export type UserRole = 'admin' | 'teacher' | 'student';

export interface User {
  _id: string;
  name: string;
  email: string;
  username: string;
  password?: string;
  role: UserRole;
  status: 'active' | 'inactive';
  mobileNumber?: string;
  isFirstLogin: boolean;
  canEdit?: boolean; // New property for granular edit permissions
  requestRole?: string | null;
  teacherRequestStatus?: 'pending' | 'approved' | 'rejected' | null;
  district?: string;
  subDistrict?: string;
  school?: string;
}

export interface Class {
  _id: string;
  name: string;
  isPublished?: boolean;
}

export interface Subject {
  _id: string;
  classId: string;
  name: string;
  isPublished?: boolean;
}

export interface Unit {
  _id: string;
  subjectId: string;
  name: string;
  isPublished?: boolean;
}

export interface SubUnit {
  _id: string;
  unitId: string;
  name: string;
  isPublished?: boolean;
}

export interface Lesson {
  _id: string;
  subUnitId: string;
  name: string;
  isPublished?: boolean;
}

export type ResourceType = 'book' | 'flashcard' | 'notes' | 'qa' | 'activity' | 'video' | 'audio' | 'worksheet' | 'questionPaper' | 'quiz' | 'slide';

export type QuestionPaperCategory = 'Monthly' | 'Term Exam' | 'Model Exam' | 'SSLC Exam' | 'Custom';

export interface QuestionPaperMetadata {
  category: QuestionPaperCategory;
  subCategory?: string; // For Month, Term, Model Name, Custom Name
}

// New Types for QA Metadata
export type QuestionType = 'Basic' | 'Average' | 'Profound';
export type CognitiveProcess = 'CP1' | 'CP2' | 'CP3' | 'CP4' | 'CP5' | 'CP6' | 'CP7';

export interface QAMetadata {
  marks?: number;
  questionType?: QuestionType;
  cognitiveProcess?: CognitiveProcess;
}

// New Types for File Storage
export interface FileMetadata {
  fileId: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  uploadDate: string;
}

export interface Content {
  _id: string;
  lessonId: string;
  type: ResourceType;
  title: string;
  body: string;
  filePath?: string;
  originalFileName?: string;
  fileSize?: number;
  viewCount?: number;
  downloadCount?: number;
  isPublished?: boolean;

  // Unified Cloudinary Model
  file?: {
    url: string;
    publicId: string;
    size: number;
    mime: string;
    pages?: number;
    duration?: number;
  };
  storage?: 'cloudinary' | 'local' | 'database';

  metadata?: QuestionPaperMetadata | QAMetadata | FileMetadata | Record<string, any>; // Union type for metadata with flexibility
}

export interface GroupedContent {
  type: ResourceType;
  count: number;
  docs: Content[];
}

export type ResourceCounts = { [key in ResourceType]?: number };

export interface ApiHookResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
}

// Quiz specific types
export interface AnswerOption {
  text: string;
  isCorrect: boolean;
  rationale: string;
}

export interface QuizQuestion {
  question: string;
  answerOptions: AnswerOption[];
  hint: string;
}

export interface PlatformStats {
  classCount: number;
  subjectCount: number;
  unitCount: number;
  subUnitCount: number;
  lessonCount: number;
  contentCount: number;
  userCount: number;
  adminCount: number;
  teacherCount: number;
  studentCount: number;
  contentByType: ResourceCounts;

  // Publication Stats
  classPublishedCount: number;
  classUnpublishedCount: number;
  subjectPublishedCount: number;
  subjectUnpublishedCount: number;
  unitPublishedCount: number;
  unitUnpublishedCount: number;
  subUnitPublishedCount: number;
  subUnitUnpublishedCount: number;
  lessonPublishedCount: number;
  lessonUnpublishedCount: number;
}

export interface AdminState {
  classId: string | null;
  subjectId: string | null;
  unitId: string | null;
  subUnitId: string | null;
  lessonId: string | null;
  selectedResourceType: ResourceType | null;
  activePage: string;
  scrollPosition: number;
}

export interface TeacherState {
  classId: string | null;
  subjectId: string | null;
  unitId: string | null;
  subUnitId: string | null;
  lessonId: string | null;
  selectedResourceType: ResourceType | null;
  scrollPosition: number;
}

// Save Format for Editors
export enum SaveFormat {
  HTML = 'html',
  DOC = 'doc'
}

// Changed to number to support pixel values.
export type FontSize = number;

export interface Session {
  user: User | null;
  token: string | null;
  adminState: AdminState;
  teacherState: TeacherState;
  fontSize: FontSize; // Stores pixel value (e.g., 12, 14, 16)
}
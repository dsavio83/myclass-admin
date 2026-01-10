

import React from 'react';
import { ResourceType } from './types';
import { BookIcon, FlashcardIcon, NotesIcon, QAIcon, ActivityIcon, VideoIcon, AudioIcon, WorksheetIcon, QuestionPaperIcon, QuizIcon, SlideIcon } from './components/icons/ResourceTypeIcons';

interface ResourceInfo {
  key: ResourceType;
  label: string;
  Icon: React.FC<{ className?: string }>;
  description: string;
  color: string;
  gradient: string;
}

export const RESOURCE_TYPES: ResourceInfo[] = [
  { key: 'book', label: 'Book', Icon: BookIcon, description: 'Read and explore the core textbook content.', color: 'text-blue-600', gradient: 'from-black to-blue-600 dark:from-white dark:to-blue-400' },
  { key: 'slide', label: 'Slides', Icon: SlideIcon, description: 'Visual presentations and lesson overviews.', color: 'text-orange-500', gradient: 'from-black to-orange-500 dark:from-white dark:to-orange-400' },
  { key: 'notes', label: 'Notes', Icon: NotesIcon, description: 'Detailed study notes and key points.', color: 'text-amber-500', gradient: 'from-black to-amber-500 dark:from-white dark:to-amber-400' },
  { key: 'video', label: 'Video', Icon: VideoIcon, description: 'Educational videos and explanations.', color: 'text-red-600', gradient: 'from-black to-red-600 dark:from-white dark:to-red-400' },
  { key: 'audio', label: 'Audio', Icon: AudioIcon, description: 'Audio lessons and pronunciations.', color: 'text-purple-600', gradient: 'from-black to-purple-600 dark:from-white dark:to-purple-400' },
  { key: 'flashcard', label: 'Flashcard', Icon: FlashcardIcon, description: 'Interactive cards for quick revision.', color: 'text-violet-600', gradient: 'from-black to-violet-600 dark:from-white dark:to-violet-400' },
  { key: 'activity', label: 'Bookback Activity', Icon: ActivityIcon, description: 'Exercises and activities from the textbook.', color: 'text-cyan-600', gradient: 'from-gray-900 to-cyan-600 dark:from-white dark:to-cyan-400' },
  { key: 'qa', label: 'Q-A & More', Icon: QAIcon, description: 'Questions, answers, and additional exercises.', color: 'text-emerald-600', gradient: 'from-black to-emerald-600 dark:from-white dark:to-emerald-400' },
  { key: 'quiz', label: 'Quiz', Icon: QuizIcon, description: 'Test your knowledge with interactive quizzes.', color: 'text-rose-600', gradient: 'from-black to-rose-600 dark:from-white dark:to-rose-400' },
  { key: 'worksheet', label: 'Worksheet', Icon: WorksheetIcon, description: 'Downloadable practice sheets and assignments.', color: 'text-green-600', gradient: 'from-black to-green-600 dark:from-white dark:to-green-400' },
  { key: 'questionPaper', label: 'Question Papers', Icon: QuestionPaperIcon, description: 'Previous year and sample question papers.', color: 'text-indigo-600', gradient: 'from-black to-indigo-600 dark:from-white dark:to-indigo-400' },
];
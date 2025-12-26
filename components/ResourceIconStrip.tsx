import React from 'react';
import { ResourceType, ResourceCounts } from '../types';
import { useApi } from '../hooks/useApi';
import { getCountsByLessonId } from '../services/api';
import { RESOURCE_TYPES } from '../constants';

interface ResourceIconStripProps {
  lessonId: string | null;
  selectedType: ResourceType | null;
  onSelectType: (type: ResourceType) => void;
  collapsed?: boolean;
}

// Map to fix Tailwind dynamic class scanning
const RESOURCE_COLORS: Record<ResourceType, string> = {
  book: 'bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-md',
  slide: 'bg-gradient-to-br from-orange-600 to-orange-500 text-white shadow-md', // Darkened from 500/400
  flashcard: 'bg-gradient-to-br from-violet-600 to-violet-500 text-white shadow-md',
  notes: 'bg-gradient-to-br from-amber-600 to-amber-500 text-white shadow-md', // Darkened from 500/400
  qa: 'bg-gradient-to-br from-emerald-600 to-emerald-500 text-white shadow-md',
  quiz: 'bg-gradient-to-br from-rose-600 to-rose-500 text-white shadow-md',
  activity: 'bg-gradient-to-br from-cyan-700 to-cyan-600 text-white shadow-md', // Darkened from 600/500
  video: 'bg-gradient-to-br from-red-600 to-red-500 text-white shadow-md',
  audio: 'bg-gradient-to-br from-purple-600 to-purple-500 text-white shadow-md',
  worksheet: 'bg-gradient-to-br from-green-600 to-green-500 text-white shadow-md',
  questionPaper: 'bg-gradient-to-br from-indigo-600 to-indigo-500 text-white shadow-md',
};

// Explicit badge background colors to ensure consistent "darker" shade matches the button
const BADGE_BG_COLORS: Record<ResourceType, string> = {
  book: 'bg-blue-600',
  slide: 'bg-orange-600',
  flashcard: 'bg-violet-600',
  notes: 'bg-amber-600',
  qa: 'bg-emerald-600',
  quiz: 'bg-rose-600',
  activity: 'bg-cyan-700',
  video: 'bg-red-600',
  audio: 'bg-purple-600',
  worksheet: 'bg-green-600',
  questionPaper: 'bg-indigo-600',
};

export const ResourceIconStrip: React.FC<ResourceIconStripProps> = ({
  lessonId,
  selectedType,
  onSelectType,
  collapsed = false,
}) => {
  const { data: counts } = useApi<ResourceCounts>(
    () => getCountsByLessonId(lessonId!),
    [lessonId],
    !!lessonId
  );

  return (
    <div className="flex flex-col gap-1.5">
      {RESOURCE_TYPES.map(r => {
        const count = counts?.[r.key] || 0;
        const isSelected = selectedType === r.key;
        return (
          <button
            key={r.key}
            onClick={() => onSelectType(r.key)}
            className={`
              relative flex items-center transition-all duration-300 group
              ${collapsed
                ? 'justify-center w-12 h-12 rounded-xl mx-auto'
                : 'w-full justify-start py-2.5 px-3 rounded-lg overflow-hidden'
              }
              ${isSelected
                ? RESOURCE_COLORS[r.key]
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }
            `}
            title={collapsed ? `${r.label} (${count})` : ''}
            aria-pressed={isSelected}
            disabled={!lessonId}
            style={{ opacity: !lessonId ? 0.5 : 1, cursor: !lessonId ? 'not-allowed' : 'pointer' }}
          >
            <r.Icon className={`
              shrink-0 transition-transform duration-200
              ${collapsed ? 'w-6 h-6' : 'w-5 h-5 mr-3'}
              ${!collapsed && isSelected ? 'scale-110' : ''}
              ${!isSelected ? r.color : 'text-white'}
            `} />

            {!collapsed && (
              <>
                <span className={`text-sm font-bold flex-1 text-left tracking-wide ${isSelected ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                  {r.label}
                </span>
                {count > 0 && (
                  <span className={`
                    ml-2 px-2 py-0.5 text-[11px] font-extrabold rounded-full shadow-sm min-w-[20px] text-center
                    ${isSelected
                      ? 'bg-white text-gray-900 border border-white' // Solid white for selected
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600'
                    }
                  `}>
                    {count}
                  </span>
                )}
              </>
            )}

            {collapsed && count > 0 && (
              <span className={`absolute top-0 right-0 -mr-1 -mt-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold shadow ring-2 ring-white dark:ring-gray-900 
                ${isSelected
                  ? `text-white ${BADGE_BG_COLORS[r.key]} ring-2 ring-white border-none`
                  : `text-white ${BADGE_BG_COLORS[r.key]}`
                }`}>
                {count > 9 ? '9+' : count}
              </span>
            )}

            {collapsed && (
              <div className="absolute left-full top-1/2 ml-3 -translate-y-1/2 px-3 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-xl">
                {r.label}
                {/* Little triangle pointer */}
                <div className="absolute top-1/2 -left-1 -mt-1 border-4 border-transparent border-r-gray-900"></div>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};

import React from 'react';
import { ResourceType } from '../types';
import { ResourceIconStrip } from './ResourceIconStrip';

interface SidebarProps {
  lessonId: string | null;
  selectedResourceType: ResourceType | null;
  onSelectResourceType: (type: ResourceType) => void;
  isOpen: boolean;
  isMobile?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  lessonId,
  selectedResourceType,
  onSelectResourceType,
  isOpen,
  isMobile = false
}) => {
  // Desktop: toggles between w-72 (Open) and w-20 (Collapsed)
  // Mobile: toggles between w-72 (Open) and w-0 (Hidden)
  const widthClass = isMobile
    ? (isOpen ? 'w-72' : 'w-0')
    : (isOpen ? 'w-72' : 'w-20');

  const isCollapsed = !isMobile && !isOpen;

  return (
    <aside className={`flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out ${widthClass} overflow-hidden shrink-0 z-10`}>
      <div className={`flex-1 overflow-y-auto no-scrollbar ${isCollapsed ? 'p-2' : 'p-4'}`} style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {!isCollapsed && (
          <h2 className="text-lg font-bold mb-4 text-gray-800 dark:text-gray-100 flex items-center gap-2">
            Resources
          </h2>
        )}
        <ResourceIconStrip
          lessonId={lessonId}
          selectedType={selectedResourceType}
          onSelectType={onSelectResourceType}
          collapsed={isCollapsed}
        />
      </div>
    </aside>
  );
};

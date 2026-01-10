import React, { useEffect } from 'react';
import { CascadeSelectors } from './CascadeSelectors';
import { TemporarySelectionManager } from './TemporarySelectionManager';
import { useTemporarySelections } from '../hooks/useTemporarySelections';
import { useSession } from '../context/SessionContext';

interface EnhancedCascadeSelectorsProps {
  useTemporarySelections?: boolean;
  showSelectionManager?: boolean;
  onSyncToSession?: boolean;
  className?: string;
  // CascadeSelectors props
  classId?: string | null;
  subjectId?: string | null;
  unitId?: string | null;
  subUnitId?: string | null;
  lessonId?: string | null;
  onClassChange?: (id: string | null) => void;
  onSubjectChange?: (id: string | null) => void;
  onUnitChange?: (id: string | null) => void;
  onSubUnitChange?: (id: string | null) => void;
  onLessonChange?: (id: string | null) => void;
  onModalToggle?: (isOpen: boolean) => void;
}

/**
 * Enhanced CascadeSelectors that integrates with temporary selections
 */
export const EnhancedCascadeSelectors: React.FC<EnhancedCascadeSelectorsProps> = ({
  useTemporarySelections: enableTemporarySelections = true,
  showSelectionManager = true,
  onSyncToSession = false,
  className = '',
  // CascadeSelectors props
  classId: externalClassId,
  subjectId: externalSubjectId,
  unitId: externalUnitId,
  subUnitId: externalSubUnitId,
  lessonId: externalLessonId,
  onClassChange: externalOnClassChange,
  onSubjectChange: externalOnSubjectChange,
  onUnitChange: externalOnUnitChange,
  onSubUnitChange: externalOnSubUnitChange,
  onLessonChange: externalOnLessonChange,
  onModalToggle
}) => {
  const { updateAdminState, updateTeacherState, session } = useSession();

  // Always call the hook, but use it conditionally
  const tempSelections = useTemporarySelections();

  // Determine which selections to use based on the prop
  const classId = enableTemporarySelections ? tempSelections.selections.classId : externalClassId;
  const subjectId = enableTemporarySelections ? tempSelections.selections.subjectId : externalSubjectId;
  const unitId = enableTemporarySelections ? tempSelections.selections.unitId : externalUnitId;
  const subUnitId = enableTemporarySelections ? tempSelections.selections.subUnitId : externalSubUnitId;
  const lessonId = enableTemporarySelections ? tempSelections.selections.lessonId : externalLessonId;

  // Create change handlers
  const handleClassChange = (id: string | null) => {
    if (enableTemporarySelections) {
      tempSelections.updateSelection('classId', id);
      // Clear dependent selections
      if (id) {
        tempSelections.updateSelections({
          subjectId: null,
          unitId: null,
          subUnitId: null,
          lessonId: null
        });
      }
    } else {
      externalOnClassChange?.(id);
    }

    // Sync to session if enabled
    if (onSyncToSession) {
      updateAdminState({ classId: id });
      updateTeacherState({ classId: id });
    }
  };

  const handleSubjectChange = (id: string | null) => {
    if (enableTemporarySelections) {
      tempSelections.updateSelection('subjectId', id);
      // Clear dependent selections
      if (id) {
        tempSelections.updateSelections({
          unitId: null,
          subUnitId: null,
          lessonId: null
        });
      }
    } else {
      externalOnSubjectChange?.(id);
    }

    // Sync to session if enabled
    if (onSyncToSession) {
      updateAdminState({ subjectId: id });
      updateTeacherState({ subjectId: id });
    }
  };

  const handleUnitChange = (id: string | null) => {
    if (enableTemporarySelections) {
      tempSelections.updateSelection('unitId', id);
      // Clear dependent selections
      if (id) {
        tempSelections.updateSelections({
          subUnitId: null,
          lessonId: null
        });
      }
    } else {
      externalOnUnitChange?.(id);
    }

    // Sync to session if enabled
    if (onSyncToSession) {
      updateAdminState({ unitId: id });
      updateTeacherState({ unitId: id });
    }
  };

  const handleSubUnitChange = (id: string | null) => {
    if (enableTemporarySelections) {
      tempSelections.updateSelection('subUnitId', id);
      // Clear dependent selections
      if (id) {
        tempSelections.updateSelection('lessonId', null);
      }
    } else {
      externalOnSubUnitChange?.(id);
    }

    // Sync to session if enabled
    if (onSyncToSession) {
      updateAdminState({ subUnitId: id });
      updateTeacherState({ subUnitId: id });
    }
  };

  const handleLessonChange = (id: string | null) => {
    if (enableTemporarySelections) {
      tempSelections.updateSelection('lessonId', id);
    } else {
      externalOnLessonChange?.(id);
    }

    // Sync to session if enabled
    if (onSyncToSession) {
      updateAdminState({ lessonId: id });
      updateTeacherState({ lessonId: id });
    }
  };

  // Handle selection manager changes
  const handleSelectionManagerChange = (selections: any) => {
    // This can be used to sync with other components
    console.log('[EnhancedCascadeSelectors] Selection manager updated:', selections);
  };

  return (
    <div className={`enhanced-cascade-selectors ${className}`}>
      {/* Show selection manager if enabled */}
      {showSelectionManager && (
        <TemporarySelectionManager
          onSelectionChange={handleSelectionManagerChange}
          showResetButton={true}
          showStatus={true}
          className="mb-4"
        />
      )}

      {/* Main cascade selectors */}
      <CascadeSelectors
        classId={classId}
        subjectId={subjectId}
        unitId={unitId}
        subUnitId={subUnitId}
        lessonId={lessonId}
        onClassChange={handleClassChange}
        onSubjectChange={handleSubjectChange}
        onUnitChange={handleUnitChange}
        onSubUnitChange={handleSubUnitChange}
        onLessonChange={handleLessonChange}
        onModalToggle={onModalToggle}
      />
    </div>
  );
};

export default EnhancedCascadeSelectors;
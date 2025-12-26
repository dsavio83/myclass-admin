// Hook for duplicate upload prevention
import { useState, useCallback } from 'react';

interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingContent?: any;
  message?: string;
}

export const useDuplicatePrevention = () => {
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [duplicateResult, setDuplicateResult] = useState<DuplicateCheckResult | null>(null);

  // Check for duplicate uploads
  const checkForDuplicate = useCallback(async (
    lessonId: string,
    title: string,
    type: string,
    file?: File
  ): Promise<DuplicateCheckResult> => {
    setCheckingDuplicate(true);
    setDuplicateResult(null);

    try {
      // Build query parameters
      const queryParams = new URLSearchParams({
        lessonId,
        title: title.trim(),
        type
      });

      // For file uploads, we can also check by file hash if available
      if (file) {
        queryParams.append('fileName', file.name);
        queryParams.append('fileSize', file.size.toString());
      }

      const response = await fetch(`/api/content/check-duplicate?${queryParams}`);
      
      if (!response.ok) {
        throw new Error('Failed to check for duplicates');
      }

      const result = await response.json();
      
      setDuplicateResult(result);
      return result;

    } catch (error) {
      console.error('Duplicate check failed:', error);
      const errorResult = {
        isDuplicate: false,
        message: 'Unable to check for duplicates. Please proceed with upload.'
      };
      setDuplicateResult(errorResult);
      return errorResult;
    } finally {
      setCheckingDuplicate(false);
    }
  }, []);

  // Reset duplicate check state
  const resetDuplicateCheck = useCallback(() => {
    setCheckingDuplicate(false);
    setDuplicateResult(null);
  }, []);

  return {
    checkingDuplicate,
    duplicateResult,
    checkForDuplicate,
    resetDuplicateCheck
  };
};
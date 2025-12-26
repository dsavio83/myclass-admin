# Selection Persistence Guide

## Overview

This guide explains how Class, Subject, Unit, Subunit, and Chapter selections are automatically saved to and restored from browser local storage in your learning platform.

## How It Works

### Automatic Storage
- **When**: Selections are automatically saved to local storage whenever they change
- **Where**: Data is stored in browser's local storage under the key `'learningPlatformNavigation'`
- **What**: The following data is persisted:
  - `classId` - Selected Class ID
  - `subjectId` - Selected Subject ID  
  - `unitId` - Selected Unit ID
  - `subUnitId` - Selected Subunit ID
  - `lessonId` - Selected Chapter ID
  - `selectedResourceType` - Selected resource type
  - `scrollPosition` - Current scroll position
  - `activePage` - Current active page

### Automatic Restoration
- **When**: Selections are automatically restored when the page loads
- **How**: The system reads from local storage and restores the previous state
- **Persistence**: Works across page reloads, browser restarts, and tab changes

### Session Management
- **Session Timeout**: 30 minutes of inactivity will clear the saved selections
- **System Restart**: Detects browser/tab crashes and clears state accordingly
- **Manual Clear**: Selections can be manually cleared through the application

## Technical Implementation

### Key Components

1. **usePersistentNavigation Hook** (`hooks/usePersistentNavigation.ts`)
   - Manages local storage operations
   - Handles session timeout and restart detection
   - Provides debounced saving to optimize performance

2. **SessionContext** (`context/SessionContext.tsx`)
   - Integrates persistent navigation with React context
   - Provides state management across the application
   - Handles both admin and teacher user states

3. **CascadeSelectors Component** (`components/CascadeSelectors.tsx`)
   - UI component for selection interfaces
   - Works with both desktop and mobile layouts
   - Connects to persistent state through props

### Local Storage Structure

```json
{
  "adminState": {
    "classId": "8",
    "subjectId": "tamilat",
    "unitId": "unit1",
    "subUnitId": null,
    "lessonId": null,
    "selectedResourceType": null,
    "activePage": "browser",
    "scrollPosition": 0
  },
  "teacherState": {
    "classId": "8",
    "subjectId": "tamilat", 
    "unitId": "unit1",
    "subUnitId": null,
    "lessonId": null,
    "selectedResourceType": null,
    "scrollPosition": 0
  },
  "lastUpdated": 1701435200000
}
```

## Usage

### For Users
1. Make selections in the Class → Subject → Unit → Subunit → Chapter hierarchy
2. Your selections are automatically saved
3. When you reload the page or come back later, your previous selections are restored

### For Developers

#### Accessing Saved Selections
```typescript
import { useSession } from '../context/SessionContext';

const { session } = useSession();
// Access admin selections: session.adminState
// Access teacher selections: session.teacherState
```

#### Updating Selections
```typescript
import { useSession } from '../context/SessionContext';

const { updateAdminState, updateTeacherState } = useSession();

// Update admin selections
updateAdminState({
  classId: '8',
  subjectId: 'tamilat',
  unitId: 'unit1'
});

// Update teacher selections  
updateTeacherState({
  classId: '9',
  subjectId: 'english'
});
```

#### Manual State Management
```typescript
import { usePersistentNavigation } from '../hooks/usePersistentNavigation';

const {
  adminState,
  teacherState, 
  updateAdminState,
  updateTeacherState,
  clearNavigationState,
  forceSave
} = usePersistentNavigation();
```

## Debugging

### Console Logs
The system provides detailed console logging for debugging:

- `[PersistentNavigation] Initializing...` - Shows when the system starts
- `[PersistentNavigation] Successfully loaded saved state:` - Shows restored data
- `[PersistentNavigation] Updating admin state with:` - Shows state updates
- `[TempSelections] Saved to storage:` - Shows temporary selection saves

### Local Storage Inspection
You can inspect the saved data in browser developer tools:

1. Open Developer Tools (F12)
2. Go to Application/Storage tab
3. Click on Local Storage
4. Look for key: `learningPlatformNavigation`

### Manual Testing
1. Make some selections
2. Open browser console and check for log messages
3. Reload the page and verify selections are restored
4. Clear local storage and verify selections are reset

## Benefits

1. **User Experience**: No need to reselect everything after page reload
2. **Performance**: Debounced saving prevents excessive local storage writes
3. **Reliability**: Session timeout prevents stale data issues
4. **Cross-Tab**: State is synchronized across multiple tabs
5. **Crash Recovery**: Handles browser crashes gracefully

## Troubleshooting

### Selections Not Saving
- Check browser local storage permissions
- Verify console for error messages
- Ensure the page is not in private/incognito mode

### Selections Not Restoring
- Check if session timeout occurred (30+ minutes)
- Look for restart detection in console logs
- Verify local storage data exists

### Performance Issues
- The system uses debounced saving (100ms delay)
- Large amounts of data may cause storage limitations
- Consider clearing old data periodically

## Best Practices

1. **State Updates**: Always use the provided update functions instead of directly modifying state
2. **Cleanup**: Use `clearNavigationState()` when logging out
3. **Debugging**: Use browser developer tools to inspect local storage
4. **Testing**: Test across different browsers and devices
5. **Performance**: Avoid saving very large objects to local storage

## Security Considerations

1. **Data Size**: Local storage has size limits (typically 5-10MB)
2. **Sensitive Data**: Avoid storing sensitive information in local storage
3. **Data Validation**: The system validates stored data before use
4. **Session Management**: Implement proper session cleanup for security
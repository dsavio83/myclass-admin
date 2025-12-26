# தற்காலிக தேர்வு அமைப்பு (Temporary Selection System)

## கண்ணோட்டம் (Overview)

இந்த அமைப்பானது class, subject, unit, subunit, chapter தேர்வுகளை தற்காலிகமாக பிரௌசரில் சேமிக்கவும், ரீஸெட் செய்யவும் உதவுகிறது.

## அம்சங்கள் (Features)

- ✅ தேர்வுகளை localStorage-ல் தற்காலிகமாக சேமித்தல்
- ✅ பக்கம் refresh ஆனால் தேர்வுகள் நீங்காமல் இருத்தல்
- ✅ ஒரு click-ல் அனைத்து தேர்வுகளையும் reset செய்தல்
- ✅ தற்போதைய தேர்வு நிலையை காட்டுதல்
- ✅ Tamil மொழியில் UI
- ✅ Session navigation system- உடன் ஒருங்கிணைப்பு

## பயன்பாடு (Usage)

### 1. Basic Hook Usage

```typescript
import { useTemporarySelections } from '../hooks/useTemporarySelections';

const MyComponent = () => {
  const {
    selections,
    updateSelection,
    updateSelections,
    resetSelections,
    hasSelections,
    getCurrentSelectionLevel
  } = useTemporarySelections();

  // தேர்வு செய்தல்
  const handleClassSelect = (classId: string) => {
    updateSelection('classId', classId);
  };

  // அனைத்து தேர்வுகளையும் reset செய்தல்
  const handleReset = () => {
    resetSelections();
  };

  return (
    <div>
      <p>Current Level: {getCurrentSelectionLevel()}</p>
      <p>Has Selections: {hasSelections() ? 'Yes' : 'No'}</p>
      <button onClick={handleReset}>Reset All</button>
    </div>
  );
};
```

### 2. Utility Functions Usage

```typescript
import { 
  saveTemporarySelections,
  loadTemporarySelections,
  clearTemporarySelections,
  hasTemporarySelections,
  resetTemporarySelections
} from '../utils/selectionUtils';

// தேர்வுகளை save செய்தல்
const selections = {
  classId: 'class1',
  subjectId: 'subject1',
  unitId: null,
  subUnitId: null,
  lessonId: null
};
saveTemporarySelections(selections);

// தேர்வுகளை load செய்தல்
const loadedSelections = loadTemporarySelections();

// தேர்வுகள் இருக்கின்றதா என்று check செய்தல்
if (hasTemporarySelections()) {
  console.log('Selections found');
}

// அனைத்து தேர்வுகளையும் clear செய்தல்
clearTemporarySelections();
```

### 3. Temporary Selection Manager Component

```typescript
import { TemporarySelectionManager } from '../components/TemporarySelectionManager';

<TemporarySelectionManager
  showResetButton={true}
  showStatus={true}
  onSelectionChange={(selections) => {
    console.log('Selections changed:', selections);
  }}
/>
```

### 4. Enhanced Cascade Selectors

```typescript
import { EnhancedCascadeSelectors } from '../components/EnhancedCascadeSelectors';

// Temporary selections உடன்
<EnhancedCascadeSelectors
  useTemporarySelections={true}
  showSelectionManager={true}
  onSyncToSession={false}
/>

// External state உடன்
<EnhancedCascadeSelectors
  useTemporarySelections={false}
  showSelectionManager={true}
  classId={externalClassId}
  subjectId={externalSubjectId}
  // ... other props
  onClassChange={handleClassChange}
  onSubjectChange={handleSubjectChange}
  // ... other handlers
/>
```

## Storage Details

### localStorage Key
```
learningPlatformTempSelections
```

### Data Structure
```typescript
{
  classId: string | null,
  subjectId: string | null,
  unitId: string | null,
  subUnitId: string | null,
  lessonId: string | null
}
```

## API Reference

### useTemporarySelections Hook

| Method | Description | Parameters |
|--------|-------------|------------|
| `selections` | Current selection state | - |
| `updateSelection` | Update a single selection | `(key, value)` |
| `updateSelections` | Update multiple selections | `(updates)` |
| `resetSelections` | Reset all selections to null | - |
| `hasSelections` | Check if any selections exist | - |
| `getCurrentSelectionLevel` | Get current selection level | - |
| `clearSelectionsFromLevel` | Clear selections from a level | `(level)` |

### Utility Functions

| Function | Description | Parameters |
|----------|-------------|------------|
| `saveTemporarySelections` | Save selections to localStorage | `(selections)` |
| `loadTemporarySelections` | Load selections from localStorage | - |
| `clearTemporarySelections` | Clear selections from localStorage | - |
| `resetTemporarySelections` | Reset to default state | - |
| `hasTemporarySelections` | Check if selections exist | - |
| `getCurrentSelectionLevel` | Get current selection level | `(selections)` |
| `isValidSelectionHierarchy` | Validate selection chain | `(selections)` |
| `getSelectionsDisplayText` | Get formatted display text | Multiple params |

## Integration with Existing System

### With Session Context
```typescript
const { session, updateAdminState, updateTeacherState } = useSession();

// Sync temporary selections with session
const syncWithSession = (selections) => {
  updateAdminState(selections);
  updateTeacherState(selections);
};
```

### With Existing Components
```typescript
// Existing component-ஐ modify செய்யாமல்,
// EnhancedCascadeSelectors ஐ use செய்யலாம்
```

## Reset Behavior

1. **Manual Reset**: User clicks reset button
2. **Programmatic Reset**: `resetSelections()` function call
3. **Automatic Clear**: localStorage manual clearing

## Error Handling

- localStorage parse errors -> automatic cleanup
- Invalid selection hierarchy -> reset to defaults
- Storage quota exceeded -> console error, graceful degradation

## Testing

### Manual Testing
1. Select class, subject, unit, subunit, chapter
2. Refresh page -> selections should persist
3. Click reset -> all selections should clear
4. Check browser dev tools localStorage

### Automated Testing
```typescript
// Test temporary selections
import { renderHook, act } from '@testing-library/react';
import { useTemporarySelections } from '../hooks/useTemporarySelections';

test('should persist selections', () => {
  const { result } = renderHook(() => useTemporarySelections());
  
  act(() => {
    result.current.updateSelection('classId', 'class1');
  });
  
  expect(result.current.selections.classId).toBe('class1');
});
```

## Best Practices

1. **Always validate selections** before updating
2. **Use proper error handling** for localStorage operations
3. **Clear dependent selections** when parent selection changes
4. **Provide user feedback** for reset operations
5. **Use Tamil UI text** for better user experience

## Troubleshooting

### Selections Not Persisting
- Check localStorage availability
- Verify localStorage key name
- Check for parse errors

### Reset Not Working
- Verify resetSelections() is called
- Check for localStorage permission issues
- Ensure no conflicting event handlers

### Performance Issues
- Use debounced updates for rapid changes
- Avoid excessive localStorage writes
- Clean up event listeners properly

## Examples

See the following example files:
- `components/TemporarySelectionManager.tsx`
- `components/EnhancedCascadeSelectors.tsx`
- `hooks/useTemporarySelections.ts`
- `utils/selectionUtils.ts`
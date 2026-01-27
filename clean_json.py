import json
import re

def fix_line(line):
    # Check if line is a key-value pair for "f" or "b"
    # Expected format: "key": "value", (for f) or "key": "value" (for b)
    
    # Pattern for "f":
    # It usually ends with ",
    # But if there are unescaped quotes, we might have internal quotes.
    # formatting is usually: WS "f": "CONTENT",
    f_match = re.match(r'^(\s*)"f": "(.*)"(,?)$', line)
    if f_match:
        prefix = f_match.group(1) # indentation
        content = f_match.group(2) # content potentially with quotes
        suffix = f_match.group(3) # comma
        
        # If content ends with `",`, we might have captured too much if regex was greedy?
        # Actually in Python re, .* is greedy, so it captures up to the LAST quote in the line.
        # But for "f", the line ends with `",`. 
        # So `(.*)` will capture `content` up to the last quote before the comma.
        # If the original line was: "f": "Quote "Here"",
        # The greedy match for `"(.*)"` against `"Quote "Here""` matches `Quote "Here"`.
        # So we have the full content.
        
        # Now we need to escape quotes inside `content`.
        # But wait, valid JSON quotes are `\"`. Invalid are `"` literally.
        # We should replace `"` with `\"`, but NOT `\"` (already escaped).
        # A simple way: content.replace('"', '\\"') then fixing already escaped ones?
        # Or better: use a negative lookbehind.
        
        # However, checking if it's already escaped is tricky with just replace.
        # Let's iterate.
        
        fixed_content = ""
        i = 0
        while i < len(content):
            char = content[i]
            if char == '"':
                # Check if preceded by backslash
                if i > 0 and content[i-1] == '\\':
                    fixed_content += char
                else:
                    # Escape it
                    fixed_content += '\\"'
            else:
                fixed_content += char
            i += 1
            
        return f'{prefix}"f": "{fixed_content}"{suffix}'

    # Pattern for "b":
    # formatting is usually: WS "b": "CONTENT" (no comma usually if last prop, but maybe comma if not?)
    # In the user file, "b" is followed by `}` on next line, so no comma usually.
    # But let's handle optional comma.
    b_match = re.match(r'^(\s*)"b": "(.*)"(,?)$', line)
    if b_match:
        prefix = b_match.group(1)
        content = b_match.group(2)
        suffix = b_match.group(3)
        
        fixed_content = ""
        i = 0
        while i < len(content):
            char = content[i]
            if char == '"':
                if i > 0 and content[i-1] == '\\':
                    fixed_content += char
                else:
                    fixed_content += '\\"'
            else:
                fixed_content += char
            i += 1
            
        return f'{prefix}"b": "{fixed_content}"{suffix}'

    return line

def process_file():
    input_file = 'raw_questions.json'
    output_file = 'clean_questions.json'
    
    print(f"Reading {input_file}...")
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            
        fixed_lines = [fix_line(line.rstrip('\n')) for line in lines]
        
        full_content = "\n".join(fixed_lines)
        
        # Verify if it parses now
        try:
            parsed = json.loads(full_content)
            print("Success! The fixed content is valid JSON.")
            
            # Write to output
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(parsed, f, indent=4, ensure_ascii=False)
            print(f"Saved clean JSON to {output_file}")
            
        except json.JSONDecodeError as e:
            print("Cleaning pass finished, but result is still invalid.")
            print(f"Error: {e}")
            print(f"At: {e.lineno}:{e.colno}")
            
            # Save it anyway for debugging
            with open('debug_intermediate.json', 'w', encoding='utf-8') as f:
                f.write(full_content)
                
    except FileNotFoundError:
        print(f"File {input_file} not found.")

if __name__ == "__main__":
    process_file()

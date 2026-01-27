
import json

def clean_hints(data):
    if isinstance(data, list):
        for item in data:
            if isinstance(item, dict):
                if "hint" in item and isinstance(item["hint"], str):
                    item["hint"] = item["hint"].replace("`", "")
                
                # Check answerOptions too as the user mentioned "answerOptions" rationale might have issues? 
                # The user specifically mentioned "hint".
                
                # Recurse just in case
                for key, value in item.items():
                    clean_hints(value)
    elif isinstance(data, dict):
        for key, value in data.items():
            if key == "hint" and isinstance(value, str):
                data[key] = value.replace("`", "")
            else:
                clean_hints(value)

try:
    with open('valid_questions.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    clean_hints(data)
    
    with open('valid_questions.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        
    print("Successfully cleaned valid_questions.json")
except Exception as e:
    print(f"Error: {e}")

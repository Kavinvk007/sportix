import os

source_file = r'd:\sportix\New Text Document.txt'

files = {
    ".gitignore": (1, 16),
    "README.md": (17, 88),
    "backend/database.py": (89, 110),
    "backend/init_db.py": (111, 330),
    "backend/main.py": (331, 492),
    "backend/models.py": (493, 528),
    "backend/requirements.txt": (529, 533),
    "frontend/app.js": (534, 1153),
    "frontend/index.html": (1154, 1412),
    "frontend/style.css": (1413, 2654)
}

os.makedirs(r'd:\sportix\backend', exist_ok=True)
os.makedirs(r'd:\sportix\frontend', exist_ok=True)

with open(source_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for rel_path, (start, end) in files.items():
    file_path = os.path.join(r'd:\sportix', rel_path)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(lines[start-1:end])
        
print("Successfully split the files.")

import re

with open("functions/src/index.ts", "r") as f:
    text = f.read()

text = re.sub(r'<<<<<<< HEAD.*?=======\n', '', text, flags=re.DOTALL)
text = re.sub(r'<<<<<<< HEAD\n', '', text)
text = re.sub(r'=======\n', '', text)
text = re.sub(r'>>>>>>> origin/.*?\n', '', text)

with open("functions/src/index.ts", "w") as f:
    f.write(text)

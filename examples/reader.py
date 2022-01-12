import time
from pathlib import Path

output_file = Path(__file__).parent / 'output.txt'

with open(output_file) as f:
    for line in f.readlines():
        print('Read line:', flush=True)
        print(line, flush=True)
        # time.sleep(0.1)

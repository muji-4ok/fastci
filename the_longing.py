import time
import sys

print('Your king orders you to wait for him.')
print('He will be back in 20 minutes.')
print('You begin waiting.')
sys.stdout.flush()

time.sleep(1)
print('1 second passed', flush=True)

for i in range(2, 60 * 20 + 1):
    time.sleep(1)
    print(f'{i} seconds passed', flush=True)

print('The king is back! Hooray!')

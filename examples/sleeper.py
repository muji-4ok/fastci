import time

print('I feel sleepy...')

for i in range(20):
    time.sleep(60)
    print(f'{i + 1} minute{"" if i == 0 else "s"} passed...')

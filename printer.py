import time

for amount in range(99, 2, -1):
    print(f'{amount} bottles of beer on the wall, {amount} bottles of beer.', flush=True)
    print(f'Take one down, pass it around, {amount - 1} bottles of beer on the wall.', flush=True)
    # time.sleep(0.1)

print('2 bottles of beer on the wall, 2 bottles of beer.', flush=True)
print('Take one down, pass it around, 1 bottle of beer on the wall.', flush=True)
# time.sleep(0.1)
print('1 bottle of beer on the wall, 1 bottle of beer.', flush=True)
print('Take one down, pass it around, no more beer on the wall!', flush=True)

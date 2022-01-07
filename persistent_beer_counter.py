with open('/home/egork/Projects/py/fastci/beer_counter_data/amount') as f:
    amount = int(f.read())

if amount == 0:
    print('No more beer :(')
    new_amount = 0
elif amount == 1:
    print('1 bottle of beer on the wall, 1 bottle of beer.')
    print('Take one down, pass it around, no more beer on the wall!')
    new_amount = 0
elif amount == 2:
    print('2 bottles of beer on the wall, 2 bottles of beer.')
    print('Take one down, pass it around, 1 bottle of beer on the wall.')
    new_amount = 1
else:
    print(f'{amount} bottles of beer on the wall, {amount} bottles of beer.')
    print(f'Take one down, pass it around, {amount - 1} bottles of beer on the wall.')
    new_amount = amount - 1

if amount != new_amount:
    with open('/home/egork/Projects/py/fastci/beer_counter_data/amount', 'w') as f:
        f.write(str(new_amount))

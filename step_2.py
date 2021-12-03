with open('/home/egork/Projects/py/fastci/steps_data/step_1_1.txt') as f:
    if f.read().strip() == 'Done!':
        print('Step 1_1 good!')
    else:
        print('Step 1_1 bad :(')
        print('Aborting')
        exit(1)

with open('/home/egork/Projects/py/fastci/steps_data/step_1_1.txt', 'w') as f:
    f.write('')

print('Step 1_1 consumed')

with open('/home/egork/Projects/py/fastci/steps_data/step_1_2.txt') as f:
    if f.read().strip() == 'Done!':
        print('Step 1_2 good!')
    else:
        print('Step 1_2 bad :(')
        print('Aborting')
        exit(1)

with open('/home/egork/Projects/py/fastci/steps_data/step_1_2.txt', 'w') as f:
    f.write('')

print('Step 1_2 consumed')

with open('/home/egork/Projects/py/fastci/steps_data/step_2.txt', 'w') as f:
    f.write('Done!')

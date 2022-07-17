with open('/workdir/steps/steps_data/step_3_1.txt') as f:
    if f.read().strip() == 'Done!':
        print('Step 3_1 good!')
    else:
        print('Step 3_1 bad :(')
        print('Aborting')
        exit(1)

with open('/workdir/steps/steps_data/step_3_1.txt', 'w') as f:
    f.write('')

print('Step 3_1 consumed')

with open('/workdir/steps/steps_data/step_3_2.txt') as f:
    if f.read().strip() == 'Done!':
        print('Step 3_2 good!')
    else:
        print('Step 3_2 bad :(')
        print('Aborting')
        exit(1)

with open('/workdir/steps/steps_data/step_3_2.txt', 'w') as f:
    f.write('')

print('Step 3_2 consumed')

print('Absolute win!')

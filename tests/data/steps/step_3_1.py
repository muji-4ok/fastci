with open('/workdir/steps/steps_data/step_2.txt') as f:
    if f.read().strip() == 'Done!':
        print('Step 2 good!')
    else:
        print('Step 2 bad :(')
        print('Aborting')
        exit(1)

with open('/workdir/steps/steps_data/step_3_1.txt', 'w') as f:
    f.write('Done!')

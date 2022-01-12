#!/usr/bin/env python3
import os
import sys

# @CopyPaste - keep in sync with tasks.py
os.chdir('/fastci/workdir')
os.execvp(sys.argv[1], sys.argv[1:])

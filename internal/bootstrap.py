#!/usr/bin/env python3
import os
import sys

os.chdir('/fastci/workdir')
os.execvp(sys.argv[1], sys.argv[1:])

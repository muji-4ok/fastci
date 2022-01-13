#!/usr/bin/env python3
import os
import subprocess
import sys
from pathlib import Path

# @CopyPaste - keep in sync with tasks.py
PIPELINE_DIR = Path('/fastci/pipeline')
REPO_DIR = PIPELINE_DIR / 'repo'
SENTINEL_FILE = PIPELINE_DIR / '.repo_setup'

repo_url = sys.argv[1]
commit_hash = sys.argv[2]
target_argv = sys.argv[3:]

print('Repo url:', repo_url)
print('Commit hash:', commit_hash)
print('Target argv:', target_argv)

if not SENTINEL_FILE.exists():
    SENTINEL_FILE.touch()
    subprocess.run(f'git clone {repo_url} {REPO_DIR}', shell=True, check=True)
    os.chdir(REPO_DIR)
    subprocess.run(f'git reset --hard {commit_hash}', shell=True, check=True)
else:
    os.chdir(REPO_DIR)

os.execvp(target_argv[0], target_argv)

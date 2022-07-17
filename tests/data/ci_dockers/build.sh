#!/bin/bash

docker build --tag ubuntu-test -f Dockerfile_ubuntu-test .
docker build --tag arm-dev -f Dockerfile_arm-dev .

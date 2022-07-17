#!/bin/bash

docker run -d -p 0.0.0.0:3000:3000 -v $(realpath .)/public:/front/public -v $(realpath .)/src:/front/src front-runner

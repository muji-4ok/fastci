FROM ubuntu:latest

RUN apt-get update -y && apt-get upgrade -y && apt-get install -y python3 git

COPY ./test_ssh /root/.ssh


#!/bin/bash

# Default values
duration=${1:-2m}
connections=${2:-100}
threads=${3:-4}
endpoint=${4:-"http://4.240.110.59:3002/inbound/bot"}
app_id="6d4943ce-b474-4790-9a60-90d51f6a678e"

wrk -t$threads -c$connections -d$duration -s benchmark-2.lua "$endpoint/$app_id"

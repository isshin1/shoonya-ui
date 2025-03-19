#!/bin/bash
cd /home/kushy/Projects/shoonya_app/shoonya-ui/
docker rm -f shoonya-ui
docker compose up -d

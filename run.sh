#!/bin/bash

docker run -it --rm \
  --name peidi-oms-ui \
  -v $(pwd):/app \
  -v /app/node_modules \
  -v /app/src/.umi \
  -p 8000:8000 \
  peidi-oms-ui

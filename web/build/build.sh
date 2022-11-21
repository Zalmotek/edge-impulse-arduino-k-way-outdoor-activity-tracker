#!/bin/bash

# rm -rf dist
# rm ../bhy-controller/src/static/index.*.js*
# rm ../bhy-controller/src/static/sensor.html

npm install
npm run build 

cp ./dist/index.html ../bhy-controller/src/static/sensor.html
cp ./dist/index.*.js ../bhy-controller/src/static/
cp ./dist/index.*.js.map ../bhy-controller/src/static/
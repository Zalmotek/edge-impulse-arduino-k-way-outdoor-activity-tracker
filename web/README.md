# Data gathering for ML

This code is adapted from [Sensors Readings on a Local Webserver](https://docs.arduino.cc/tutorials/nicla-sense-me/cli-tool).

## Requirements
- go
- npm

## Arduino IoT Cloud account config

Navigate to the `build` folder and in `main.js` update the following IDs with the ones from your Arduino IoT Cloud account:
- `YOUR_THING_ID`
- `YOUR_CLIENT_ID`
- `YOUR_CLIENT_SECRET`

## Building the project

From the `build` folder run:

`./build.sh`

Then navigate to `/web/bhy-controller/src/` and run:

`go run bhy.go webserver`

Next, upload the [App](Arduino_BHY2/examples/App/App.ino) example to Nicla Sense ME.

The `http://localhost:8000/index.html` webpage will open in your browser.

Make sure that WebBLE is enabled! If it is not, enable it from `chrome://flags`, setting "Experimental Web Platform features".

You might also need to use the [CORS chrome extension](https://chrome.google.com/webstore/detail/allow-cors-access-control/lhobafahddgcelffkeicbaginigeejlf?hl=en) in order to access the Arduino IoT Cloud.


import { ArduinoIoTCloud } from 'arduino-iot-js';

const thingIdWearable = "YOUR_THING_ID"

const options = {
  clientId: "YOUR_CLIENT_ID",
  clientSecret: "YOUR_CLIENT_SECRET",
  onDisconnect: message => {
    console.error(message);
  }
}

ArduinoIoTCloud.connect(options)
  .then(() => console.log("Connected to Arduino IoT Cloud broker"))
  .catch(error => console.error(error));

function sendDataCloud(parsedName, value) {
  const dictionary = {
    ACCELEROMETERX: 'AccelerationX',
    ACCELEROMETERY: 'AccelerationY',
    ACCELEROMETERZ: 'AccelerationZ',
    GYROSCOPEX: 'GyroscopeX',
    GYROSCOPEY: 'GyroscopeY',
    GYROSCOPEZ: 'GyroscopeZ',
    ROTATIONW: 'RotationW',
    ROTATIONX: 'RotationX',
    ROTATIONY: 'RotationY',
    ROTATIONZ: 'RotationZ',
    ORIENTATIONH: 'OrientationHeading',
    ORIENTATIONP: 'OrientationPitch',
    ORIENTATIONR: 'OrientationRoll',
    STEP_COUNTER: 'StepCount',
    TEMPERATURE: 'Temperature',
    BAROMETER: 'Pressure',
    HUMIDITY: 'Humidity',
    GAS: 'Gas'
  }

  const name = dictionary[parsedName]

  ArduinoIoTCloud.sendProperty(thingIdWearable, name, value)
    .then(() => {
      console.log(`Property value ${name} correctly sent`);
    })
    .catch((error) => {
      console.error(error)
    });
}


document.getElementById('sensorId').value = '10';
document.getElementById('rate').value = '0';
document.getElementById('latency').value = '0';

const sensorServiceUuid = '34c2e3bb-34aa-11eb-adc1-0242ac120002';
const sensorConfigCharacteristicUuid = '34c2e3bd-34aa-11eb-adc1-0242ac120002';
const sensorDataCharacteristicUuid = '34c2e3bc-34aa-11eb-adc1-0242ac120002';
const sensorLongDataCharacteristicUuid = '34c2e3be-34aa-11eb-adc1-0242ac120002';

var bleDevice
var bleServer
var sensorService
var sensorConfigCharacteristic
var sensorDataCharacteristic
var sensorLongDataCharacteristic

var sensorMap = new Map();
var parseScheme;
var sensorTypes;
var sensorTypesLen;

fetch("./parse-scheme.json")
  .then(response => response.json())
  .then(json => {
    console.log(json);
    parseScheme = json;
  });

fetch("./sensor-type-map.json")
  .then(response => response.json())
  .then(json => {
    console.log(json);
    sensorTypes = json;
    var counter = 0;
    sensorTypesLen = Object.keys(sensorTypes).length;
    console.log("Json length: ", sensorTypesLen);
    fillSensorTable();
  });


document.querySelector('#connectButton').addEventListener('click', function () {
  if (isWebBluetoothEnabled()) {
    connect()
      .then(_ => {
        console.log('Connected')
        document.querySelector('#configureButton').disabled = false
      })
      .catch(error => {
        console.log('ERROR: ' + error);
      });
  }
});

document.querySelector('#configureButton').addEventListener('click',
  _ => {
    var sensorId = parseInt(document.getElementById('sensorId').value);
    var sampleRate = parseFloat(document.getElementById('rate').value);
    var latency = parseInt(document.getElementById('latency').value);

    if (sensorTypes[sensorId].name) {

      var configPacket = new Uint8Array(9);
      configPacket[0] = sensorId;
      configPacket.set(floatToBytes(sampleRate), 1);
      configPacket.set(intToBytes(latency), 5);
      console.log(configPacket);

      sensorConfigCharacteristic.writeValue(configPacket)
        .then(_ => {
          console.log('Configuration written');
        });

      //Handle individual Enabled buttons
      var table = document.getElementById("dataTable");
      if (sensorMap.has(sensorId)) {
        rowIndex = sensorMap.get(sensorId);
        var row = table.rows[rowIndex];
        row.cells[3].firstChild.style.backgroundColor = "limegreen";
      } else {
        var tableLength = table.rows.length;
        sensorMap.set(sensorId, tableLength);
        var row = table.insertRow(tableLength);
        var cell = row.insertCell(0);
        cell.innerHTML = sensorId;
        cell = row.insertCell(1);
        cell.innerHTML = sensorTypes[sensorId].name;
        cell = row.insertCell(2);
        cell.innerHTML = 0;
        cell = row.insertCell(3);
        cell.innerHTML = '<input id="Button" type="button" value="Enabled" onclick="updateSensorStatus(this, \'' + sensorId + '\');"/>'
        row.cells[3].firstChild.style.backgroundColor = "limegreen";
        cell = row.insertCell(4);
        var chartIdx = sensorTypes[sensorId].name;
        cell.innerHTML = '<div id=\'' + chartIdx + '\'></div>';
      }
    }


  }
);

function floatToBytes(value) {
  var tempArray = new Float32Array(1);
  tempArray[0] = value;
  return new Uint8Array(tempArray.buffer);
}

function intToBytes(value) {
  var tempArray = new Int32Array(1);
  tempArray[0] = value;
  return new Uint8Array(tempArray.buffer);
}

function isWebBluetoothEnabled() {
  if (!navigator.bluetooth) {
    console.log('Web Bluetooth is NOT available!')
    return false
  }
  console.log('Web Bluetooth is available!')
  return true
}

function getDeviceInfo() {
  let options = {
    filters: [{ services: [sensorServiceUuid] }]
  };
  console.log('Requesting BLE device info...');
  return navigator.bluetooth.requestDevice(options).then(device => {
    bleDevice = device
  }).catch(error => {
    console.log('Request device error: ' + error)
  });
}

function connect() {
  return getDeviceInfo()
    .then(connectDevice)
    .then(getSensorCharacteristics)
    .then(onConnection);
}

function connectDevice() {
  console.log('Connecting to device')
  bleDevice.addEventListener('gattserverdisconnected', onDisconnection);
  return bleDevice.gatt.connect()
    .then(server => {
      bleServer = server;
      return bleServer.getPrimaryService(sensorServiceUuid);
    })
    .then(service => {
      sensorService = service;
    });
}

function onDisconnection(event) {
  var status = document.getElementById("connectionStatus");
  status.innerHTML = "Disconnected";
  status.className = "badge rounded-pill bg-danger";
}

function onConnection() {
  var status = document.getElementById("connectionStatus");
  status.innerHTML = "Connected";
  status.className = "badge rounded-pill bg-success";
}

function getSensorCharacteristics() {
  console.log('Getting sensor characteristics');
  return sensorService.getCharacteristic(sensorConfigCharacteristicUuid)
    .then(characteristic => {
      sensorConfigCharacteristic = characteristic;
    })
    .then(_ => {
      return sensorService.getCharacteristic(sensorDataCharacteristicUuid);
    })
    .then(characteristic => {
      sensorDataCharacteristic = characteristic;
      sensorDataCharacteristic.startNotifications();
      sensorDataCharacteristic.addEventListener('characteristicvaluechanged', receiveSensorData)
    })
    .then(_ => {
      return sensorService.getCharacteristic(sensorLongDataCharacteristicUuid);
    })
    .then(characteristic => {
      sensorLongDataCharacteristic = characteristic;
      sensorLongDataCharacteristic.startNotifications();
      sensorLongDataCharacteristic.addEventListener('characteristicvaluechanged', receiveSensorData)
    });
}

window.updateSensorStatus = function (_this, sensor) {
  var configPacket = new Uint8Array(9);
  configPacket[0] = sensor;

  if (_this.style.backgroundColor == "limegreen") {
    //Turn sensor OFF
    console.log("Disable sensor ", sensor);
    configPacket.set(floatToBytes(0), 1);
    configPacket.set(intToBytes(0), 5);
    console.log(configPacket);
    sensorConfigCharacteristic.writeValue(configPacket)
      .then(_ => {
        console.log('Configuration written');
      });
    _this.style.backgroundColor = "";
  } else {
    //Turn sensor ON
    console.log("Enable sensor ", sensor);
    configPacket.set(floatToBytes(1), 1);
    console.log(configPacket);
    sensorConfigCharacteristic.writeValue(configPacket)
      .then(_ => {
        console.log('Configuration written');
      });
    _this.style.backgroundColor = "limegreen";
  }
}

function fillSensorTable() {
  var table = document.getElementById("dataTable");
  var tableLength = table.rows.length;

  for (let i = 0; i < sensorTypesLen - 1; i++) {
    var key = Object.keys(sensorTypes)[i];
    if (sensorTypes[key].dashboard == 1) {
      var tableLength = table.rows.length;
      var sensorIdx = parseInt(key)
      sensorMap.set(sensorIdx, tableLength);
      var row = table.insertRow(tableLength);
      var cell = row.insertCell(0);
      cell.innerHTML = key;
      cell = row.insertCell(1);
      cell.innerHTML = sensorTypes[key].name;
      cell = row.insertCell(2);
      cell.innerHTML = 0;
      cell = row.insertCell(3);
      cell.innerHTML = '<input id="Button" type="button" value="Enabled" onclick="updateSensorStatus(this, \'' + sensorIdx + '\');"/>'
      cell = row.insertCell(4);
      var chartIdx = sensorTypes[sensorIdx].name;
      cell.innerHTML = '<div id=\'' + chartIdx + '\'></div>';
    }
  }
}

// var a = []; b = []; c = [];

function receiveSensorData(event) {
  const value = event.target.value;
  // Get sensor data
  const sensor = value.getUint8(0);
  const size = value.getUint8(1);
  console.log(value)
  const parsedData = parseData(sensor, value);
  const parsedName = parsedData[0]
  const parsedStringValue = parsedData[1]
  const parsedValue = parsedData[2]
  console.log(parsedValue)
  console.log(parsedName)

  if (sensorTypes[sensor].scheme == "singleRead")
    sendDataCloud(parsedName, parsedValue[0])
  else if (sensorTypes[sensor].scheme == "xyz") {
    sendDataCloud(parsedName + 'X', parsedValue[0])
    sendDataCloud(parsedName + 'Y', parsedValue[1])
    sendDataCloud(parsedName + 'Z', parsedValue[2])
  } else if (sensorTypes[sensor].scheme == "quaternion") {
    sendDataCloud(parsedName + 'X', parsedValue[0])
    sendDataCloud(parsedName + 'Y', parsedValue[1])
    sendDataCloud(parsedName + 'Z', parsedValue[2])
    sendDataCloud(parsedName + 'W', parsedValue[3])
  } else if (sensorTypes[sensor].scheme == "orientation") {
    sendDataCloud(parsedName + 'H', parsedValue[0])
    sendDataCloud(parsedName + 'P', parsedValue[1])
    sendDataCloud(parsedName + 'R', parsedValue[2])
  }

  var table = document.getElementById("dataTable");
  // If sensor is already in the table -> update its value
  if (sensorMap.has(sensor)) {
    let rowIndex = sensorMap.get(sensor);
    var row = table.rows[rowIndex];
    var cell = row.cells[0];
    cell.innerHTML = sensor;
    cell = row.cells[1];
    cell.innerHTML = parsedName;
    cell = row.cells[2];
    cell.innerHTML = parsedStringValue;
    cell = row.cells[4];
    var chartIdx = parsedName;

    var cnt = 0;

    if (sensorTypes[sensor].scheme == "singleRead") {

      //Initial condition to draw the first chart point
      if (sensorTypes[sensor].value == 0) {   //Plot doesn't exist yet because no valid data have been received
        if (parsedValue != 0) {   //First valid data received: draw it in the chart
          Plotly.newPlot(chartIdx, [{ y: [parsedValue], type: 'line' }]);
          //Update json to signal that the reception started
          cnt = sensorTypes[sensor].value + 1;
          sensorTypes[sensor].value = cnt;
        }
      } else {    //Plot already exists
        Plotly.extendTraces(chartIdx, { y: [[parsedValue]] }, [0]);
        cnt = sensorTypes[sensor].value;
        sensorTypes[sensor].value = cnt + 1;
      }

      if (cnt > 200) {
        Plotly.relayout(chartIdx, {
          xaxis: {
            range: [cnt - 200, cnt]
          }
        });
      }

    } else if (sensorTypes[sensor].scheme == "xyz") {
      //Parse 3D axes values
      const arrXYZValues = parsedStringValue.split(" ");

      console.log("Split: ", arrXYZValues);
      console.log("Split[1]: ", arrXYZValues[1]);
      console.log("Split[5]: ", arrXYZValues[5]);
      console.log("Split[9]: ", arrXYZValues[9]);

      //Initial condition to draw the first chart point
      if (sensorTypes[sensor].value == 0) {   //Plot doesn't exist yet because no valid data have been received
        if (parsedValue != 0) {   //First valid data received: draw it in the chart
          Plotly.newPlot(chartIdx, [{ x: [arrXYZValues[1]], y: [arrXYZValues[5]], z: [arrXYZValues[9]], type: 'mesh3d' }]);
          //Update json to signal that the reception started
          sensorTypes[sensor].value = parsedValue;
        }
      } else {    //Plot already exists
        Plotly.extendTraces(chartIdx, { x: [[arrXYZValues[1]]], y: [[arrXYZValues[5]]], z: [[arrXYZValues[9]]] }, [0]);
      }

    } else if (sensorTypes[sensor].scheme == "BSECOutput") {
      //Parse BSEC values
      const BSECValues = parsedStringValue.split(" ");
      console.log("Split: ", BSECValues);
      console.log("Split[1]: ", BSECValues[2]);
      console.log("Split[7]: ", BSECValues[7]);

      var val1 = BSECValues[2];
      var val2 = BSECValues[7];

      if (sensorTypes[sensor].value == 0) {   //Plot doesn't exist yet because no valid data have been received
        if (val1 != 0 && val2 != 0) {   //First valid data received: draw it in the chart
          Plotly.newPlot(chartIdx, [{ y: [val1], name: 'Temp', type: 'line' }, { y: [val2], name: 'Humidity', type: 'line' }]);
          //Update json to signal that the reception started
          cnt = sensorTypes[sensor].value + 1;
          sensorTypes[sensor].value = cnt;
        }
      } else {    //Plot already exists
        Plotly.extendTraces(chartIdx, { y: [[val1]] }, [0]);
        Plotly.extendTraces(chartIdx, { y: [[val2]] }, [1]);
        cnt = sensorTypes[sensor].value;
        sensorTypes[sensor].value = cnt + 1;
      }

      if (cnt > 150) {
        Plotly.relayout(chartIdx, {
          xaxis: {
            range: [cnt - 150, cnt]
          }
        });
      }
    } else if (sensorTypes[sensor].scheme == "BSECOutputV2") {
      //Parse BSEC values
      const BSECValues = parsedStringValue.split(" ");
      console.log("Split: ", BSECValues);

      var val1 = BSECValues[1];   //iaq
      var val2 = BSECValues[5];   //iaq-s
      var val3 = BSECValues[9] * 1000;   //b-voc-eq
      var val4 = BSECValues[13];  //co2-eq
      var val5 = BSECValues[17];  //status

      if (sensorTypes[sensor].value == 0) {   //Plot doesn't exist yet because no valid data have been received
        if (val4 != 0) {   //First valid data received: draw it in the chart, valid CO2-eq output is always greater than 0
          Plotly.newPlot(chartIdx,
            [
              { y: [val1], name: 'IAQ', type: 'line' }, { y: [val2], name: 'IAQ-S', type: 'line' },
              { y: [val3], name: 'bVOC-eq (ppb)', type: 'line' }, { y: [val4], name: 'CO2-eq (ppm)', type: 'line' }
            ]);
          //Update json to signal that the reception started
          cnt = sensorTypes[sensor].value + 1;
          sensorTypes[sensor].value = cnt;
        }
      } else {    //Plot already exists
        Plotly.extendTraces(chartIdx, { y: [[val1]] }, [0]);
        Plotly.extendTraces(chartIdx, { y: [[val2]] }, [1]);
        Plotly.extendTraces(chartIdx, { y: [[val3]] }, [2]);
        Plotly.extendTraces(chartIdx, { y: [[val4]] }, [3]);
        cnt = sensorTypes[sensor].value;
        sensorTypes[sensor].value = cnt + 1;
      }

      if (cnt > 150) {
        Plotly.relayout(chartIdx, {
          xaxis: {
            range: [cnt - 150, cnt]
          }
        });
      }

    }
  }
}

function parseData(sensor, data) {
  var sensorName = sensorTypes[sensor].name;
  var scheme = sensorTypes[sensor].scheme;
  var result = "";
  var parse_scheme;
  var eventcount;
  // dataIndex start from 2 because the first bytes of the packet indicate
  // the sensor id and the data size
  var dataIndex = 0 + 2;
  var value = 0;
  var values = [];

  if (scheme == "singleRead") {
    parse_scheme = sensorTypes[sensor]["parse-scheme"];
  } else if (scheme == "quaternion") {
    parse_scheme = parseScheme["types"][0]["parse-scheme"];
  } else if (scheme == "xyz") {
    parse_scheme = parseScheme["types"][1]["parse-scheme"];
  } else if (scheme == "orientation") {
    parse_scheme = parseScheme["types"][2]["parse-scheme"];
  } else if (scheme == "event") {
    eventcount = sensorTypes[sensor].eventcount;
    parse_scheme = parseScheme["types"][3]["parse-scheme"];
  } else if (scheme == "activity") {
    parse_scheme = parseScheme["types"][4]["parse-scheme"];
  } else if (scheme == "BSECOutput") {
    parse_scheme = parseScheme["types"][5]["parse-scheme"];
  } else if (scheme == "BSECOutputV2") {
    var size = data.getUint8(1);
    if (size <= 10) {
      parse_scheme = parseScheme["types"][6]["parse-scheme"];
    } else {
      parse_scheme = parseScheme["types"][7]["parse-scheme"];
    }
  }

  parse_scheme.forEach(element => {
    console.log(element);
    var name = element['name'];
    var valueType = element['type'];
    var scale = element['scale-factor'];
    var size = 0;

    if (valueType == "uint8") {
      value = data.getUint8(dataIndex, true) * scale;
      size = 1;
    } else if (valueType == "int8") {
      value = data.getInt8(dataIndex, true) * scale;
      size = 1;
    } else if (valueType == "uint16") {
      value = data.getUint16(dataIndex, true) * scale;
      size = 2;
    } else if (valueType == "int16") {
      value = data.getInt16(dataIndex, true) * scale;
      size = 2;
    } else if (valueType == "uint24") {
      value = data.getUint16(dataIndex, true) + (data.getUint8(dataIndex + 2, true) << 16);
      size = 3;
    } else if (valueType == "uint32") {
      value = data.getUint16(dataIndex, true) + (data.getUint16(dataIndex + 2, true) << 16);
      size = 4;
    } else if (valueType == "float") {
      value = data.getFloat32(dataIndex, true) * scale;
      size = 4;
    } else if (valueType == "none") {
      value = eventcount + 1;
      sensorTypes[sensor].eventcount = value;
      size = 0;
    } else {
      console.log("Error: unknown type");
    }

    if (scheme == "activity") {
      value = geActivityString(value);
    }
    result = result + element.name + ": " + value + "   ";
    console.log(dataIndex);
    values.push(value)
    dataIndex += size;
  });

  return [sensorName, result, values];
}

function geActivityString(value) {

  const activityMessages = ["Still activity ended",
    "Walking activity ended",
    "Running activity ended",
    "On bicycle activity ended",
    "In vehicle activity ended",
    "Tilting activity ended",
    "In vehicle still ended",
    "",
    "Still activity started",
    "Walking activity started",
    "Running activity started",
    "On bicycle activity started",
    "In vehicle activity started",
    "Tilting activity started",
    "In vehicle still started",
    ""];

  for (let i = 0; i < 16; i++) {
    maskedVal = (value & (0x0001 << i)) >> i;
    if (maskedVal) {
      console.log(activityMessages[i]);
      return [activityMessages[i]];
    }
  }
}

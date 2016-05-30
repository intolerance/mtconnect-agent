const log  = require('./config/logger'); // TODO: Use module import/export
const init = require('./init');
const ip = require('ip');

/*
 *  Machine data
 */

const fs        = require('fs');
const net       = require('net');
const readlines = require('gen-readlines');

const MACHINE_PORT = 8081;

// TODO: Fix description and params in functions
function* machineDataGenerator() {
    var fd    = fs.openSync('./public/simple_scenario_1.txt', 'r');
    var stats = fs.fstatSync(fd);

    for (var line of readlines(fd, stats.size)) {
        yield line.toString(); // TODO: String
    }
}

var machine = net.createServer();

machine.on('connection', (socket) => {
    var machineData = machineDataGenerator();

    var writeData = function (socket) {
        data = machineData.next().value;

        if (data) {
            setTimeout(function () {
                socket.write(data);
                writeData(socket);
            }, Math.floor(Math.random() * 3000)); // Simulate delay
        }
        else { // TODO: Move else up!
            socket.destroy();
        }
    };

    writeData(socket);
});

machine.listen(MACHINE_PORT, ip.address());

log.info("Starting machine TCP server on port %d", MACHINE_PORT);

/*
 *  Serve Device definition file
 */

const SERVE_FILE_PORT = 8080;
const node_static = require('node-static');

var file = new node_static.Server("./public");

require('http').createServer(function (request, response) {  // TODO: Change arrow callback
    request.addListener('end', function () {
        /*
         *  Serve files!
         */
        file.serve(request, response);
    }).resume();
}).listen(SERVE_FILE_PORT);

log.info("Starting HTTP web server on port %d", SERVE_FILE_PORT);

/*
 *  SSDP
 */

const ssdp = require('node-ssdp').Server;

var adapter = new ssdp({ "location": ip.address() + ":" + MACHINE_PORT });

adapter.addUSN('urn:schemas-upnp-org:service:VMC-3Axis:1');

adapter.on('advertise-alive', function (headers) {
    console.log(headers);
});

adapter.on('advertise-bye', function (headers) {
    console.log(headers);
});

adapter.start();

process.on('exit', function () {
    adapter.stop();
});


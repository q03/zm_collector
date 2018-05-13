var os = require('os');
// var os_utils 	= require('os-utils');
// var csv_parse = require('csv-parse');
// var parser = csv_parse({delimiter: ','});
var host = os.hostname();
var date = new Date();

var system_platform = process.platform;
var isWin = /^win/.test(system_platform);
const exec = require('child_process').exec;
var connection = undefined;

var rpc = require('json-rpc2');

var socketClient = rpc.Client.$create(2222, 'localhost');

function printError(err) {
    console.error('RPC Error: ' + err.toString());
}
const Influx = require('influx');
const influx = new Influx.InfluxDB({
    host: '10.9.0.1',
    database: 'miners_monitor',
    schema: [
        {
            measurement: 'zm_collector',
            fields: {
                temperature: Influx.FieldType.INTEGER,
                fan_speed: Influx.FieldType.INTEGER,
                sol_ps: Influx.FieldType.INTEGER,
                avg_sol_ps: Influx.FieldType.INTEGER,
                sol_pw: Influx.FieldType.INTEGER,
                avg_sol_pw: Influx.FieldType.INTEGER,
                power_usage: Influx.FieldType.INTEGER,
                avg_power_usage: Influx.FieldType.INTEGER,
                accepted_shares: Influx.FieldType.INTEGER,
                rejected_shares: Influx.FieldType.INTEGER,
                latency: Influx.FieldType.INTEGER
            },
            tags: [
                'host',
                'gpu_id',
                'gpu_name',
                'gpu_pci_bus_id',
                'gpu_pci_device_id',
                'gpu_uuid'
            ]
        }
    ]
});

influx.getDatabaseNames().then(names => {
        if( !names.includes('miners_monitor')){
            return influx.createDatabase('miners_monitor')
        }
    });


function zm_data_collector() {
    socketClient.connectSocket(function (err, conn) {
        if (err) {
            return printError(err);
        }
        if (conn) {
            conn.call('getstats', [], function (err, res) {
                if (err) {
                    console.log(err);
                    return printError(err);
                } else {
                    console.log(date.toUTCString());
                    res.forEach(function (gpu_info) {
                        influx.writePoints([
                            {
                                measurement: 'zm_collector',
                                fields: {
                                    temperature: parseInt(gpu_info.temperature),
                                    fan_speed: parseInt(gpu_info.fan_speed),
                                    sol_ps: parseInt(gpu_info.sol_ps),
                                    avg_sol_ps: parseInt(gpu_info.avg_sol_ps),
                                    sol_pw: parseInt(gpu_info.sol_pw),
                                    avg_sol_pw: parseInt(gpu_info.avg_sol_pw),
                                    power_usage: parseInt(gpu_info.power_usage),
                                    avg_power_usage: parseInt(gpu_info.avg_power_usage),
                                    accepted_shares: parseInt(gpu_info.accepted_shares),
                                    rejected_shares: parseInt(gpu_info.rejected_shares),
                                    latency: parseInt(gpu_info.latency)
                                },
                                tags: {
                                    host: host,
                                    gpu_id: gpu_info.gpu_id,
                                    gpu_name: gpu_info.gpu_name,
                                    gpu_pci_bus_id: gpu_info.gpu_pci_bus_id,
                                    gpu_pci_device_id: gpu_info.gpu_pci_device_id,
                                    gpu_uuid: gpu_info.gpu_uuid
                                }
                            }
                        ]).catch(err => {
                            console.log('Error saving data to InfluxDB! ${err.stack}');
                        console.log(err.message);
                        });
                    });
                }
                ;
            });
        };
    });
}
zm_data_collector();
setInterval(zm_data_collector, 20000);

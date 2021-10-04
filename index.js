// ntrip caster
// by Dr. Yudan Yi


const net = require('net');
const time = require('./time.js');
const coord = require('./coord.js');

let clients = [];
let servers = [];

function find_client(socket) {
    // use another function to locate the index
    return clients.findIndex(obj => obj.socket == socket);
}

function find_server(socket) {
    // use another method to search
    return servers.findIndex(obj => obj.socket==socket);
}

function find_server_by_name(name) {
    return servers.findIndex(obj => obj.name==name);
}

function number_of_server() {
    return servers.length;
}

function number_of_client() {
    return clients.length;
}

function remove_socket(socket) {
    var idxCLI = find_client(socket);
    var idxSVR = find_server(socket);
    //socket.end('remove');
    if (idxCLI>=0) {

        console.log('remove clients: ', clients[idxCLI].name, idxCLI, '/', clients.length);
        clients.splice(idxCLI,1);
    }
    if (idxSVR>=0) {
        console.log('remove servers: ', servers[idxSVR].name, idxSVR, '/', servers.length);
        servers.splice(idxSVR,1);
    }
}

function write_status(socket)
{
    socket.write([
        'HTTP/1.1 200 OK',
        'Content-Type: text/html; charset=UTF-8',
        'Content-Encoding: UTF-8',
        'Accept-Ranges: bytes',
        'Connection: keep-alive',
    ].join('\n') + '\n\n');
    /* send out source table */
    var curtime = time.getCurrentTime();
    socket.write('<h2>GPS Time: '+curtime[0].toString()+' '+curtime[1].toString()+' '+curtime[2].toString()+'<h2>\n\n\n\n');
    socket.write('<h2>Source Table '+number_of_server().toString()+'<h2>\n\n');
    for (var i=0;i<number_of_server();++i) {
        socket.write('<h5>'+i.toString()+' '+servers[i].name+' '+servers[i].xyz[0].toString()+servers[i].xyz[1].toString()+servers[i].xyz[2].toString()+'<h5>\n\n');
    }
    socket.write('\n\n\n\n<h2>Client Table '+number_of_client().toString()+'<h2>\n\n');
    for (var i=0;i<number_of_client();++i) {
        socket.write('<h5>'+i.toString()+' '+clients[i].name+' '+clients[i].dist.toString()+'<h5>\n\n');
    }
    return 0;
}

function find_close_stn(idxCLI)
{
    var idx =-1;
    var dis = 0.0;
    for (var j = 0;j<servers.length;++j) {
        if (servers[j].xyz[0]==0.0||servers[j].xyz[1]==0.0||servers[j].xyz[2]==0.0) continue;
        var dxyz = [servers[j].xyz[0]-clients[idxCLI].xyz[0],
                    servers[j].xyz[1]-clients[idxCLI].xyz[1],
                    servers[j].xyz[2]-clients[idxCLI].xyz[2]];
        var curd = dxyz[0]*dxyz[0] + dxyz[1]*dxyz[1] + dxyz[2]*dxyz[2];
        if (idx<0||curd<dis)
        {
            idx = j;
            dis = curd;
        }

    }
    return [idx, dis];
}

mainProcess();

function mainProcess() {

    const server = net.createServer((socket) => {
        socket.on('data', (data) => {
            //console.log(data)
            let curStr = data.toString();
            var idxCLI = 0;
            var idxSVR = 0;
            var isNewStn = false;
            var isNewSource = false;
            var isNewClient = false;
            if (/GET/.test(curStr)) {
                /* new client */
                isNewStn = true;
                var isNtrip = /Auth/.test(curStr);
                console.log(isNtrip)
                idxCLI = find_client(socket);
                let r = curStr.split('\r\n');
                console.log(socket);
                console.log(r);

                r = r[0].split(' ');

                console.log(r, r.length);

                if (r.length>1) {

                    curStr = r[1];

                    curStr = curStr.replace('/','');

                    var re = /\s*(?:;|$)\s*/;
                    curStr = curStr.split(re);

                    console.log(curStr, curStr.length);

                    if (curStr.length>0 && isNtrip) {
                        curStr = curStr[0];
                        if (idxCLI>=0) {
                            /* client exist */
                            if (clients[idxCLI].name!=curStr) {
                                /* change name, update name */
                                console.log('client', clients[idxCLI].name, idxCLI, '/', number_of_client(), 'update with a new name: ', curStr);
                                clients[idxCLI].name = curStr;
                            }
                        } else {
                            clients.push({name:curStr, socket: socket, xyz: [0,0,0], dist: -1.0});
                            console.log('new client', curStr, number_of_client());
                            isNewClient = true;
                        }

                    } else {
                        //console.log(curStr, curStr.length);
                        write_status(socket);
                        socket.end();
                    }
                }
            }
            if (!isNewStn&&/SOURCE/.test(curStr)) {

                /* new source */
                isNewStn = true;
                idxSVR = find_server(socket);


                let r = curStr.split('\r\n');
                console.log(r)
                r = r[0].split(' ');

                if (r.length>2 && !(/VRS/.test(r[2])) && !(/RTK/.test(r[2]))) { // cannot use RTK and VRS as mountpoint

                    curStr = r[2];

                    curStr = curStr.replace('/','');

                    if (idxSVR>=0) {
                        /* server exist */
                        if (servers[idxSVR].name!=curStr) {
                            /* change name, update name */
                            console.log('server', servers[idxSVR].name, idxSVR, '/', number_of_server(), 'update with a new name: ', curStr);
                            servers[idxSVR].name = curStr;
                        }
                    }
                    else {
                        /* new server */
                        var idxSVR = find_server_by_name(curStr);
                        if (idxSVR<0) {
                            var newserver = {name: curStr, socket:socket, xyz:[0,0,0]};
                            //console.log(newserver.name, newserver.xyz);
                            servers.push(newserver);
                            console.log('new server', curStr, number_of_server());
                        } else {
                            console.log(curStr, 'already existed, add new server with another name ', newName, number_of_server());
                            // reject
                            socket.end();
                        }
                    }
                }
            }
            if (!isNewStn) {

                //var curtime = time.getCurrentTime();
                idxSVR = find_server(socket);
                idxCLI = find_client(socket);

                //console.log(curtime,idxSVR,idxCLI);
                if (idxSVR>=0) {
                    // search coordinate
                    if (servers[idxSVR].xyz[0]==0.0) {
                        console.log(servers[idxSVR].name, servers[idxSVR].xyz);
                    }
                    //call
                    //vrs.decoded_rtcm(data, servers[idxSVR].name);

                    /* server socket */

                    console.log(idxSVR, number_of_server(), servers[idxSVR].name);

                    //var cur_clients = clients.filter(obj => obj.name==servers[idxSVR].name || (/RTK/.test(obj.name) && obj.name.search(servers[idxSVR].name)>=0 ));
                    var cur_clients = clients.filter(obj => obj.name==servers[idxSVR].name );
                    cur_clients.forEach(obj => obj.socket.write(data, function(err) { if (err) obj.socket.end(); }) )
                }

                if (idxCLI>=0) {
                   console.log(data)

                   console.log(idxCLI, number_of_client(), data.toString());
                    /* parse GGA and store the location */
                    xyz = coord.parse_nmea_gga(data.toString())
                    clients[idxCLI].xyz = xyz;
                    //console.log(clients[idxCLI].name, clients[idxCLI].xyz);
                    /*
                    if (/RTK/.test(clients[idxCLI].name))
                    {
                        // search for the closest reference station
                        var best_loc = find_close_stn(idxCLI);
                        var idx = best_loc[0];
                        var dis = best_loc[1];
                        if (idx>=0) {
                            clients[idxCLI].name = 'RTK'+'_'+servers[idx].name;
                            clients[idxCLI].dist = Math.sqrt(dis)/1000.0;
                            console.log(clients[idxCLI].name, clients[idxCLI].dist, clients[idxCLI].xyz, servers[idx].xyz);
                        }
                    }
                    */
                }
            } else {
                socket.write("ICY 200 OK\r\n");
            }

        });

        socket.on('end', () => {
            console.log('discounted');
            remove_socket(socket);
        });

        socket.on('error', (err) => {
            console.log(err);
            remove_socket(socket);
        });

    }).on('error', (err) => {
        console.log(err);
    });

	const port=process.env.PORT||2201;

    server.listen(port,() => {
        console.log(`Ntrip caster running at port `+port);
        });

};

// read mongoDB to get the reference station coordinate
/*
setInterval(function() {
    var idx = 0;
    for (var i=0;i<clients.length;++i)
    {
        if (/RTK/.test(clients[i].name)) {
        if (clients[i].xyz[0]==0.0||clients[i].xyz[1]==0.0||clients[i].xyz[2]==0.0) continue;

        var data = vrs.output_rtcm3_vrs(clients[i].xyz);
        console.log(clients[i].name +' '+ clients[i].xyz);
        console.log(data);
        clients[i].socket.write(data, function(err) { if (err) clients[i].socket.end(); });
        }
    }
}, 1000);
*/

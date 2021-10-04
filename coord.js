/*
    module/functions relating to GNSS Coordinates 
    by. Dr. Yudan Yi
    Modified from C code
*/

let We_WGS84   	= 7.2921151467e-5;
let GM_WGS84   	= 3.9860050e+14;
let ae_WGS84   	= 6378137.0;
let finv_WGS84 	= 298.257223563;
let finv_Pz90  	= 298.257839303;
let grav_WGS84  = 9.7803267714e0;   
let PI          = 3.14159265358979;

//--------------------------------------------------------------------------
//--------------------------------------------------------------------------
//**************************************************************************
// GNSS receiver and satellite related models and transformations
//**************************************************************************
//--------------------------------------------------------------------------
// functions relatingt to coordinate transformation and matrix (vector) rotation
function	blh2xyz(blh)
{
    var xyz = [0,0,0];
    // lat, lon, ht => ecef xyz
    var a = ae_WGS84, finv = finv_WGS84;
    var f	= 1.0/finv, e2=2*f-f*f;
    var lat	= blh[0], lon = blh[1], ht = blh[2];
    var Rw	= Math.sqrt(1-e2*Math.sin(lat)*Math.sin(lat));
    var Rn	= a/Rw;
    xyz[0] = (Rn+ht)*Math.cos(lat)*Math.cos(lon);
    xyz[1] = (Rn+ht)*Math.cos(lat)*Math.sin(lon);
    xyz[2] = (Rn*(1-e2)+ht)*Math.sin(lat);
    return xyz;
}
function	xyz2blh(xyz)
{
    // ecef xyz => blh
    var blh = [0,0,0];
    var a = ae_WGS84, finv = finv_WGS84;
    var f = 1.0/finv, e2=2*f-f*f;
    var x = xyz[0], y = xyz[1], z = xyz[2], lat, lon, ht;
    var R = Math.sqrt(x*x+y*y+z*z);
    var ang = Math.atan(Math.abs(z/Math.sqrt(x*x+y*y)));
    if (z<0.0) ang = -ang;
    var lat1 = ang;
    var Rw = Math.sqrt(1-e2*Math.sin(lat1)*Math.sin(lat1));
    lat = Math.atan(Math.abs(Math.tan(ang)*(1+(a*e2*Math.sin(lat1))/(z*Rw))));
    if (z<0.0) lat =-lat;
    while (Math.abs(lat-lat1)>1e-12)
    {
        lat1 = lat;
        Rw = Math.sqrt(1-e2*Math.sin(lat1)*Math.sin(lat1));
        lat = Math.atan(Math.abs(Math.tan(ang)*(1+(a*e2*Math.sin(lat1))/(z*Rw))));
        if (z<0.0) lat =-lat;
    }
    if (lat>PI) lat = lat-2.0*PI;
    if (Math.abs(x)<1e-12) { if (y>=0.0) lon = PI/2.0; else lon = 3.0*PI/2.0; }
    else
    {
        lon = Math.atan(Math.abs(y/x));
        if (x>0.0) { if (y>=0.0) lon =lon; else lon = 2.0*PI-lon; }
        else { if (y>=0.0) lon = PI-lon; else lon = PI+lon; }
    }
    Rw = Math.sqrt(1-e2*Math.sin(lat)*Math.sin(lat));
    var Rn = a/Rw;
    ht = R*Math.cos(ang)/Math.cos(lat)-Rn;
    if (lon>PI) lon = lon-2.0*PI;
    blh[0] = lat;
    blh[1] = lon;
    blh[2] = ht;
    return blh;
}
function blh2C_en(blh)
{
    // blh => C_en
    var C_en = [ [0, 0, 0], [0, 0, 0], [0, 0, 0]];
    var lat = blh[0], lon = blh[1];//, ht = blh[2];
    C_en[0][0] =-Math.sin(lat)*Math.cos(lon);
    C_en[1][0] =-Math.sin(lat)*Math.sin(lon);
    C_en[2][0] = Math.cos(lat)         ;
    C_en[0][1] =-         Math.sin(lon);
    C_en[1][1] =          Math.cos(lon);
    C_en[2][1] =               0.0;
    C_en[0][2] =-Math.cos(lat)*Math.cos(lon);
    C_en[1][2] =-Math.cos(lat)*Math.sin(lon);
    C_en[2][2] =-Math.sin(lat);
    return C_en;
}

function parse_nmea_gga(ggaStr)
{
    // $GPGGA,182210.71,3723.1031492,N,12205.3973090,W,1,00,1.0,39.131,M,-33.027,M,0.0,*44\r\n
    xyz = [0,0,0];
    if (!/GGA/.test(ggaStr)) return xyz;
    
    var str = ggaStr.split(',');
    if (str.length<6) return xyz;
    var latDD = parseInt(str[2].substr(0,2));
    var latMM = parseFloat(str[2].substr(2));
    var lonDD = parseInt(str[4].substr(0,3));
    var lonMM = parseFloat(str[4].substr(3));  
    //console.log(latDD, latMM, lonDD, lonMM);
    var blh = [latDD + latMM/60.0, lonDD+lonMM/60.0, 0.0];
    if (/S/.test(str[3])) { 
        blh[0] =-blh[0]*PI/180.0;
    } else {
        blh[0] = blh[0]*PI/180.0;
    }
    if (/W/.test(str[5])) {
        blh[1] =-blh[1]*PI/180.0;
    } else {
        blh[1] = blh[1]*PI/180.0;
    }
    //console.log(blh);
    xyz = blh2xyz(blh);
    //console.log(xyz);
    blh = xyz2blh(xyz);
    //console.log(blh);
    return xyz;
}

module.exports = { 
    blh2xyz,
    xyz2blh,
    blh2C_en,
    parse_nmea_gga };

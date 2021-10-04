/*
    module/functions relating to GNSS time 
    by. Dr. Yudan Yi
    Modified from C code
*/
let dayPerMon = [ 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 ];

function YearFour(year) 
{ 
  return ( year<80  )?(year+2000):( (year<1900&&year>80)?(year+1900):(year) ); 
}

function WeekNum(time) 
{ 
    return Math.floor(time/(7*24*3600)); 
}
function WeekSec(time) 
{ 
    return time-WeekNum(time)*(7*24*3600); 
}
function WeekDay(time) 
{ 
    return (int)(WeekSec(time)/(24*3600)); 
}
function DaySec (time) 
{ 
    return WeekSec(time)-Math.floor(WeekSec(time)/(24*3600))*(24*3600); 
}
function DayHour(time) 
{ 
    return Math.floor(DaySec(time)/3600); 
}
function HourSec(time) 
{ 
    return DaySec(time)-DayHour(time)*3600; 
} 
function HourMin(time) 
{ 
    return Math.floor(HourSec(time)/60); 
} 
function MinSec (time) 
{ 
    return HourSec(time)-HourMin(time)*60; 
} 

function IsSkipYear(year) 
{ 
  return (YearFour(year)%4==0&&YearFour(year)%100!=0)||YearFour(year)%400==0; 
}

function DayOfYear(year, mon, day)
{
  var totalDay = day;
  for (var monIndex=0;monIndex<(mon-1);++monIndex)
    totalDay += dayPerMon[monIndex];
  if (mon>2 && IsSkipYear(year))
    ++totalDay;
  return totalDay;
}

function ConvertToTimeGPS(year, month, day, hour, minute, second)
{
  var weekNum = 0;
  var weekSec = 0.0;
  var doy = 0;
  var totalDay = (year<1981)?(0):(360);
  for (yearIndex=1981;yearIndex<year;++yearIndex)
  {
    totalDay += 365;
    if ( IsSkipYear(yearIndex) )
      ++totalDay;
  }
  doy = DayOfYear(year, month, day);
  totalDay += doy;
  weekNum	= Math.floor(totalDay/7);
  weekSec	= (totalDay-weekNum*7)*24.0*3600+hour*3600+minute*60+second;
  return [weekNum, weekSec, doy];
}



function ConvertFromTimeGPS(weekNum, weekSec)
{
    var year = 0;
    var month= 0;
    var day = 0;
    var hour= 0;
    var minute = 0;
    var second = 0;
    var doy = 0;



    weekNum += WeekNum(weekSec);
    weekSec  = WeekSec(weekSec);

    var	weekMin	= Math.floor(weekSec/60.0);
    second		= weekSec-weekMin*60.0;
    var	weekHour= Math.floor(weekMin/60);
    minute		= weekMin-weekHour*60;
    var	weekDay	= Math.floor(weekHour/24);
    hour		= weekHour-weekDay*24;

    var	totalDay= weekDay+weekNum*7;
    if (totalDay<360)
        year = 1980;
    else
    {
        year = 1981;
        totalDay -= 360;
        while (true) 
        {
            if (totalDay<365) break;
            if (IsSkipYear(year))
                --totalDay;
            totalDay -= 365;
            ++year;
        }
    }
    doy = totalDay;
    if (totalDay<=dayPerMon[0])
        month = 1;
    else
    {
        totalDay -= dayPerMon[0];
        if (IsSkipYear(year))
            --totalDay;
        month = 2;
        while (true)
        {
            if (totalDay<=dayPerMon[month-1])
            {
                break;
            }
            else
            {
                totalDay -= dayPerMon[month-1];
                ++ month;
            }
        }
    }
    if (month==2&&IsSkipYear(year))
        ++totalDay;
    day		= totalDay;
    return [year, month, day, hour, minute, second, doy];
}

function getCurrentTime()
{
    var curtime = new Date();
    var yy = curtime.getUTCFullYear();
    var mm = curtime.getUTCMonth()+1;
    var dd = curtime.getUTCDate();
    var h = curtime.getUTCHours();
    var m = curtime.getUTCMinutes();
    var s = curtime.getUTCSeconds()+18;
    var ms = curtime.getUTCMilliseconds();
    //console.log(yy, mm, dd, h, m, s, ms/1000.0);
    var gpstime = ConvertToTimeGPS(yy, mm, dd, h, m, s+ms/1000.0);
    //console.log(gpstime);
    utctime = ConvertFromTimeGPS(gpstime[0], gpstime[1]);
    //console.log(utctime);
    return gpstime;
}



module.exports = { 
    getCurrentTime,
    ConvertFromTimeGPS,
    ConvertToTimeGPS };


//console.log(yy, mm, dd, h, m, s, ms/1000.0);

//var gpstime = ConvertToTimeGPS(yy, mm, dd, h, m, s+ms/1000.0);

//console.log(curtime);
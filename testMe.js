var wugDataFetcher =    require('./aisDataFetcher.js');

/**
 * wuStation = weather underground weather station ID see https://www.wunderground.com/weatherstation/overview.asp
 * wuApiKey = REPLACE WITH YOUR OWN free key from weather underground: To get your key goto https://www.wunderground.com/weather/api/
 * radarImgURI = URL to a animated gif file based on parameters passed in the URL. See https://www.wunderground.com/weather/api/d/docs?d=layers/radar
 * radarImgFileName = filename for downloaded radar image.  File will be overwritten with each download.
 */
const wuStation = 'KILJERSE5';
const wuApiKey = '99220183d677501a';
const radarImgURI = 'http://api.wunderground.com/api/' + wuApiKey + '/animatedradar/image.gif?centerlat=39.0971&centerlon=-90.3148&radius=500&width=1920&height=1200&newmaps=1&rainsnow=1&noclutter=1&timelabel=1&timelabel.y=10&num=15&delay=50';
const radarImgFileName = 'radar.gif';
const rainHistoryDays = 15;

console.log('Setting up wugDataFetcher class');
console.log('Polling weather API every 60 seconds.  Will stop polling after 5 polls. ')
var wx = new wugDataFetcher(wuApiKey, wuStation, 60);
var lastGetDataReq = new Date();
var runCount = 2;

wx.eventNewData(gotNewData);                            // set function to call when new data is received
wx.eventDataRequest(gettingData);                       // set function to call when a request for new data starts
wx.eventGetDataErr(getDataError);                       // set function to call when an error occurs getting data

console.log('\nForcing an update right now.');
wx.updateNow();                                         // force an update of weather data now!

wx.getRainHistory(wuApiKey, wuStation, rainHistoryDays)

getRadarImage();

var primetimePollRate = wx.getMaxPollRate(900, 30600, 580);
console.log('Primetime poll rate = ' + primetimePollRate);

function getDataError(errNum, errTxt){
    console.log('\nERROR:\tError getting data from Weather Underground API');
    console.log('\tError Number = ' + errNum);
    console.log('\t'+ errTxt + '\n');
}

function gettingData(dateObj){
    var time = new Date(dateObj);
    lastGetDataReq = time
    //console.log('Requesting data from weather underground ' + time.getHours() + ':' + time.getMinutes() + ' ' + time.getSeconds() + '.' + time.getMilliseconds());
}

function gotNewData(){
    var time = new Date();
    var callTime = time - lastGetDataReq;
    console.log('\nData from weather underground received ' + time.getHours() + ':' + time.getMinutes() + ' ' + time.getSeconds() + '.' + time.getMilliseconds());
    console.log('Data request was completed in ' + callTime + ' milliseconds.');
    if(runCount > 0){
        printTemp();
        runCount--;
    } else {
        console.log('stopping poll');
        wx.setWxPollTime(0);
        printTemp();  
        printRainTotal();      
        printWxObj();
        console.log('\nEND');
    }
}

function printTemp(){
    console.log('Current temperature is ' + wx.wxObj.temp_f + 'f, feels like ' + wx.wxObj.feelslike_f +'f.');
    console.log('Forecasted high for today is ' + wx.wxObj.fcastTempHigh + 'f, and the forecasted low is ' + wx.wxObj.fcastTempLow + 'f.');
}

function printRainTotal(){
    var sum = wx.wxObj.history.rainDaysOld.reduce((a, b) => Number(a) + Number(b), 0);
    console.log('\nRain total for the past '+ rainHistoryDays +' days = ' + sum + '".');
    console.log('Rain total for last rain event = ' + lastRainEventTotal());
}
function lastRainEventTotal(){
    if(Number(wx.wxObj.history.rainDaysOld[0]) == 0){return 0};
    var eventTotal = 0;

    for (var index = 0; index < wx.wxObj.history.rainDaysOld.length; index++) {
        if(Number(wx.wxObj.history.rainDaysOld[index]) == 0){
            return eventTotal;
        } else {
            eventTotal += Number(wx.wxObj.history.rainDaysOld[index])
        }
    }
    return eventTotal;
}

function printWxObj(){
    console.log('\nThe complete wxObj follows:');
    console.log(wx.wxObj);
}

function getRadarImage(){
    console.log('\n___ Requesting download of animated radar gif. ___');
    var startTime = new Date();
    wx.getWeatherGraphic(radarImgURI, radarImgFileName, function(errNum = 0, errTxt = "", file = radarImgFileName){
        var endTime = new Date();
        var downloadTime = endTime - startTime;
        if(errNum == 0){
            console.log('\n___ Radar Gif Download complete in ' + downloadTime + ' milliseconds. See '+ file +' file in local directory! ___');
        } else {
            console.log('\n___ Error with Radar Gif Download.  Error number = ' + errNum);
            console.log('\n___ Error Text: ' + errTxt);
        }
    });
}

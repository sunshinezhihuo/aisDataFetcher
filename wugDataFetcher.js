var request         = require('request');
var fs              = require('fs')
const EventEmitter  = require('events');

class MyEmitter extends EventEmitter {}
const myEmitter = new MyEmitter();

const dftWuPws     = 'KILJERSE5';
const dftWuApiKey  = '123456789123456';

var wxObjShell = {
    zip:"",
    location_txt:"",
    station_id:"",        
    temp_f:"12",
    wind_mph:"",
    wind_degrees:"",
    wind_dir:"",
    pressure_in:"",
    relative_humidity:"",   
    precip_today_in:"",    
    feelslike_f:"",
    solarradiation:"",
    dewpoint_f:"",
    wind_gust_mph:"",
    wind_string:"",
    observation_time_rfc822:"",
    icon_url:"",
    //forecast data is for the current day
    fcastTempHigh:"",
    fcastTempLow:"",
    qpf_allday:"",              // Quantitative Precipitation Forecast 
    pop:"",                     // Probability of Precipitation
    snow_allday:"",
    maxwind:"",
    maxwindDir:"",
    avewind:"",
    avewindDir:"",
    //Alerts: only first alert is shown
    alertType:"",               // Type details https://www.wunderground.com/weather/api/d/docs?d=data/alerts
    alertDescription:"",        // Only shows first alert.  more may be present but are skipped
    alertMessage:"",
    alertExpires:"",
    expires_epoch:"",
    //History
    history:{
        rainDaysOld:[]
    }
}

class wug{
    /**
     * Class for polling and parsing weather underground data.
     * 
     * * **wuAPiKey**: must be your unique key from https://www.wunderground.com/weather/api/.  Signup to get a free account and key.
     * * **wuPws**: is the weather station ID that sources the data to the weather undergrond' weather api.
     * * **pollInterval**: is the time between calls to the weather underground api. The free account requires you to limit this to 500 calls per day and no more than 10 calls per minute.
     * @param {string} wuApiKey 
     * @param {string} wuPws 
     * @param {number} pollInterval 
     */
    constructor(wuApiKey = dftWuApiKey, wuPws = dftWuPws, pollInterval = 0){                             // Class constructor with optional pin configs
        this._wuApiKey = wuApiKey;
        this._wuPws = wuPws;
        this.wxObj = wxObjShell;    
        myEmitter.on('newData', (dataObj) => {    
            this.wxOjb = dataObj;
            for(var key in dataObj){
                if(this.wxObj.hasOwnProperty(key)){this.wxObj[key] = dataObj[key];} 
            }
        });

        this._getWxTimmer =  setpollInterval(this._wuApiKey, this._wuPws, pollInterval);
    }

    /**
     * Sets the poll time for polling the weahter underground api.  
     * If polling is currently running it will be stopped and reset to the new poll time.
     * Setting **timeInSeconds(0)** will stop polling
     * @param {number} timeInSeconds 
     */
    setWxPollTime(timeInSeconds = 0){
        clearInterval(this._getWxTimmer);
        if(timeInSeconds > 0){
            this._getWxTimmer =  setpollInterval(this._wuApiKey, this._wuPws, timeInSeconds);
        }
    }

    /**
     * Forces an imedate call to weather undergrounds web API.
     * When data is recevied the eventNewData(cbFunction) will be called.
     */
    updateNow(){
        getWxForecast(this._wuApiKey, this._wuPws);
    }

    /**
     * Sets the call back function for the new data event.  
     * The cbFunction will be called every time a successful download occurs.
     * Look in the wxObj to see the parsed data. 
     * @param {Function} cbFunction a local function to call when this event's callback fires.
     */
    eventNewData(cbFunction){
        if (typeof(cbFunction) === 'function') {;
            myEmitter.on('newData', (dataObj) => {    
                this.wxOjb = dataObj;
                for(var key in dataObj){
                    if(this.wxObj.hasOwnProperty(key)){this.wxObj[key] = dataObj[key];} 
                }
                cbFunction();
            });
        } else {
            throw "cbFunction is not a function";
        }
    }

    /**
     * Sets the call back function to call when a request is made for new data.  
     * This can be used to set a time stamp for tracking how long it takes to retreive data.
     * @param {Function} cbFunction 
     */
    eventDataRequest(cbFunction){
        if (typeof(cbFunction) === 'function') {
            myEmitter.on('dataRequest', (dateTime) => {
                cbFunction(dateTime);
            });
        } else {
            throw "cbFunction is not a function";
        }
    }

    /**
     * Sets the call back function to call when an error is received during a weather undergourn API call.
     * @param {Function} cbFunction 
     */
    eventGetDataErr(cbFunction){
        if (typeof(cbFunction) === 'function') {
            myEmitter.on('getDataErr', (errNum, errTxt) => {
                cbFunction(errNum, errTxt);
            });
        } else {
            throw "cbFunction is not a function";
        }
    }

    /**
     * Downloads radar image from weather underground radar layer api.
     * For more information see https://www.wunderground.com/weather/api/d/docs?d=layers/radar
     * @param {string} uri 
     * @param {string} filename 
     * @param {Function} rtnFunction 
     */
    getWeatherGraphic(uri, filename, rtnFunction){
        request.head(uri, function(error, response, body){
            if (!error && response.statusCode == 200) {
                request(uri).pipe(fs.createWriteStream(filename)).on('close', rtnFunction);
            } else {
                var errNumber = 1;
                var errTxt = 'ERROR in wug download of radar image, may be a network issue or problem with URL\n\t' + error;
                rtnFunction(errNumber, errTxt, filename);
            }
        });
    }

    /**
     * Retrieves daily rain amount going back (daysBack) from today’s date.   
     * Makes an API call for each day so the calls are spread out over time to stay in the max free call rate of the weather underground API.
     * Data is stored as an arry in wxDtaObj.history.rainDaysOld[0]
     * 
     * @param {string} wuApiKey 
     * @param {string} wuPws 
     * @param {number} daysBack 
     */
    getRainHistory(wuApiKey = '99220183d677501a', wuPws = 'KILJERSE5', daysBack = 7){
        var dObj = new Date();        
        //makes a request for historic data every 6 seconds
        for (var day = 1; day < daysBack + 1; day++) {   
            setTimeout(function(day, objToUpdate){
                dObj = new Date();
                var dateCode = formatDateString(new Date(dObj.setDate(dObj.getDate()-day)));
                getRainHistory(wuApiKey, wuPws, dateCode, objToUpdate, day - 1);
            }, day * 6000, day, this.wxObj);  
        }
    }    

    /**
     * This method will caculate the max poll rate for primetime polling based on a fixed off peek poll rate and a fixed off peek duration in seconds.  
     * Returns the max poll rate in seconds.
     * 
     * * **offPeakPollRate**: (default = 900) this is the time in seconds to poll the weather underground API during off peek times
     * * **offPeakDuration**: (dfault = 43200) this is the duration in seconds the system will be polling at the offPeekPollRate.  43200 = 12 hours
     * * **apiDailyCallBudget**: (default = 500) this is the total number of calls to make to the weather underground api in 24 hours
     * @param {number} offPeakPollRate 
     * @param {number} offPeakDuration 
     * @param {number} apiDailyCallBudget 
     */
    getMaxPollRate(offPeakPollRate = 900, offPeakDuration = 43200 , apiDailyCallBudget = 500){
        var secondsInDay = 86400;
        var primtimeCalls = apiDailyCallBudget- (offPeakDuration / offPeakPollRate);
        var primetimeSeconds = secondsInDay - offPeakDuration;
        var MaxPrimetimePollRate = primetimeSeconds / primtimeCalls;
        return MaxPrimetimePollRate.toFixed(3); 
    }  
}

function formatDateString(dateObj){
    var year = dateObj.getFullYear().toString();
    var month = ("0" + (dateObj.getMonth() +　1)).slice(-2);
    var day = ("0" + (dateObj.getDate())).slice(-2);
    return(year + month + day);
}

function setpollInterval(key, pws, pollTimeInSeconds = 0){
    var getWxTimmer = null;
    if(pollTimeInSeconds > 0){
        getWxTimmer = setInterval(function(){
            getWxForecast(key, pws);
        }, pollTimeInSeconds * 1000);  
    }
    return getWxTimmer;        
}

function getWxForecast(wuApiKey, wuPws){
    var errNumber = 0;
    var errTxt = '';   
    var rtnObj = {};
    var d = new Date();
    myEmitter.emit('dataRequest', d);
    request('http://api.wunderground.com/api/' + wuApiKey + '/conditions/forecast/alerts/q/pws:' + wuPws + '.json', function (error, response, body) {      
    if (!error && response.statusCode == 200) {    
        try{
            var wxData = JSON.parse(body);
            rtnObj = {
                zip:wxData.current_observation.display_location.zip,
                location_txt:wxData.current_observation.observation_location.full,
                station_id:wxData.current_observation.station_id,        
                temp_f:wxData.current_observation.temp_f,
                wind_mph:wxData.current_observation.wind_mph,
                wind_degrees:wxData.current_observation.wind_degrees,
                wind_dir:wxData.current_observation.wind_dir,
                pressure_in:wxData.current_observation.pressure_in,
                relative_humidity:wxData.current_observation.relative_humidity,   
                precip_today_in:wxData.current_observation.precip_today_in,    
                feelslike_f:wxData.current_observation.feelslike_f,
                solarradiation:wxData.current_observation.solarradiation,
                dewpoint_f:wxData.current_observation.dewpoint_f,
                wind_gust_mph:wxData.current_observation.wind_gust_mph,
                wind_string:wxData.current_observation.wind_string,
                observation_time_rfc822:wxData.current_observation.observation_time_rfc822,
                icon_url:wxData.current_observation.icon_url,     

                fcastTempHigh:wxData.forecast.simpleforecast.forecastday[0].high.fahrenheit,
                fcastTempLow:wxData.forecast.simpleforecast.forecastday[0].low.fahrenheit,
                qpf_allday:wxData.forecast.simpleforecast.forecastday[0].qpf_allday.in,
                pop:wxData.forecast.simpleforecast.forecastday[0].pop,     
                snow_allday:wxData.forecast.simpleforecast.forecastday[0].snow_allday.in,    
                maxwind:wxData.forecast.simpleforecast.forecastday[0].maxwind.mph,  
                maxwindDir:wxData.forecast.simpleforecast.forecastday[0].maxwind.dir, 
                avewind:wxData.forecast.simpleforecast.forecastday[0].avewind.mph,  
                avewindDir:wxData.forecast.simpleforecast.forecastday[0].avewind.dir, 
                alertType:"", 
                alertDescription:"",
                alertMessage:"",
                alertExpires:"",  
                expires_epoch:""                     
            }
            if(wxData.alerts.length>0){
                rtnObj.alertType = wxData.alerts[0].type;
                rtnObj.alertDescription = wxData.alerts[0].description;
                rtnObj.alertMessage = wxData.alerts[0].message;
                rtnObj.alertExpires = wxData.alerts[0].expires;
                rtnObj.expires_epoch = wxData.alerts[0].expires_epoch;
            } 
        }

        catch(err){
            errNumber = 1;
            errTxt = 'Error with getWxForecast(), parsing JSON string data. Detail follows\n\t' + err;
        }
        
    } else {
            errNumber = 2;
            errTxt = 'Error in getWxForecast(), may be a network issue or problem with URL\n\t' + error;
        }
        if(errNumber == 0){
            myEmitter.emit('newData', rtnObj);
        } else {
            myEmitter.emit('getDataErr', errNumber, errTxt);
        }
    });
}

function getRainHistory(wuApiKey, wuPws, dateCode, wxDtaObj, dayIndex){
    var errNumber = 0;
    var errTxt = '';   
    var rainTotal = 0;

    request('http://api.wunderground.com/api/' + wuApiKey + '/history_' + dateCode + '/q/pws:' + wuPws + '.json', function (error, response, body) { 
        if (!error && response.statusCode == 200) {
            try{
            var wxData = JSON.parse(body);
            rainTotal = wxData.history.dailysummary[0].precipi        
            }
            
            catch(err){
                errNumber = 1;
                errTxt = 'Error with getRainHistory(), parsing JSON string data. Detail follows\n\t' + err;
            }        
        } else {
            errNumber = 2;
            errTxt = 'Error in getRainHistory(), may be a network issue or problem with URL\n\t' + error;
        }

        if(errNumber == 0){
            console.log ('rain amount for '+ dateCode + ' = ' + rainTotal); 
            wxDtaObj.history.rainDaysOld[dayIndex]=rainTotal
            //console.log(wxDtaObj.history.rainDaysOld);
        } else {
            console.log ('getDataErr', errNumber, errTxt);
        }
    });
} 


module.exports = wug;
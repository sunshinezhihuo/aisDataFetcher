/*
    wugDataFetcher.js module gets data from web services weahter undergound api.wunderground.com
    See testMe.js located in same directory for usage examples. 
*/

var request =   require('request');
var fs =        require('fs')


var wxObj = {
    zip:"",
    location_txt:"",
    station_id:"",        
    temp_f:"",
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
    expires_epoch:""
}

// public objects
exports.wxObj = wxObj;

// public functions
exports.getWxForecast = function (wuApiKey, wuPws, rtnFunction){
    var errNumber = 0;
    var errTxt = '';    
    
    request('http://api.wunderground.com/api/' + wuApiKey + '/conditions/forecast/alerts/q/pws:' + wuPws + '.json', function (error, response, body) {   
    //console.log('body:');
    //console.log(body);
    if (!error && response.statusCode == 200) {   
        try{
            var wxData = JSON.parse(body);
            wxObj.zip = wxData.current_observation.display_location.zip;
            wxObj.location_txt = wxData.current_observation.observation_location.full;
            wxObj.station_id = wxData.current_observation.station_id;        
            wxObj.temp_f = wxData.current_observation.temp_f;
            wxObj.wind_mph = wxData.current_observation.wind_mph;
            wxObj.wind_degrees = wxData.current_observation.wind_degrees;
            wxObj.wind_dir = wxData.current_observation.wind_dir;
            wxObj.pressure_in = wxData.current_observation.pressure_in;
            wxObj.relative_humidity = wxData.current_observation.relative_humidity;   
            wxObj.precip_today_in = wxData.current_observation.precip_today_in;    
            wxObj.feelslike_f = wxData.current_observation.feelslike_f;
            wxObj.solarradiation= wxData.current_observation.solarradiation;
            wxObj.dewpoint_f= wxData.current_observation.dewpoint_f;
            wxObj.wind_gust_mph = wxData.current_observation.wind_gust_mph;
            wxObj.wind_string = wxData.current_observation.wind_string;
            wxObj.observation_time_rfc822 = wxData.current_observation.observation_time_rfc822;
            wxObj.icon_url = wxData.current_observation.icon_url;     

            wxObj.fcastTempHigh = wxData.forecast.simpleforecast.forecastday[0].high.fahrenheit;
            wxObj.fcastTempLow = wxData.forecast.simpleforecast.forecastday[0].low.fahrenheit;
            wxObj.qpf_allday = wxData.forecast.simpleforecast.forecastday[0].qpf_allday.in;
            wxObj.pop = wxData.forecast.simpleforecast.forecastday[0].pop;     
            wxObj.snow_allday = wxData.forecast.simpleforecast.forecastday[0].snow_allday.in;    
            wxObj.maxwind = wxData.forecast.simpleforecast.forecastday[0].maxwind.mph;  
            wxObj.maxwindDir = wxData.forecast.simpleforecast.forecastday[0].maxwind.dir; 
            wxObj.avewind = wxData.forecast.simpleforecast.forecastday[0].avewind.mph;  
            wxObj.avewindDir = wxData.forecast.simpleforecast.forecastday[0].avewind.dir; 
            if(wxData.alerts.length>0){
                wxObj.alertType = wxData.alerts[0].type; 
                wxObj.alertDescription = wxData.alerts[0].description;
                wxObj.alertMessage = wxData.alerts[0].message;
                wxObj.alertExpires = wxData.alerts[0].expires;
                wxObj.expires_epoch = wxData.alerts[0].expires_epoch;
            } else {
                wxObj.alertType = ""; 
                wxObj.alertDescription = "";
                wxObj.alertMessage = "";
                wxObj.alertExpires = "";   
                wxObj.expires_epoch = "";             
            }  
        }
        catch(err){
            errNumber = 1;
            errTxt = 'ERROR with getWxForecast() in parsing JSON string data. Detail follows\n\t' + err;
        }
    } else {
            errNumber = 2;
            errTxt = 'ERROR in getWxForecast(), may be a network issue or problem with URL\n\t' + error;
        }
        rtnFunction(errNumber, errTxt, wxObj);
    });
}

exports.download = function(uri, filename, rtnFunction){
    request.head(uri, function(error, response, body){
        if (!error && response.statusCode == 200) {
            request(uri).pipe(fs.createWriteStream(filename)).on('close', rtnFunction);
        } else {
            errNumber = 3;
            errTxt = 'ERROR in wxObj.download, may be a network issue or problem with URL\n\t' + error;
            rtnFunction(errNumber, errTxt);
        }
    });
};
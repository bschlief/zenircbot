var ZenIRCBot = require('zenircbot-api').ZenIRCBot
var zen = new ZenIRCBot()
var sub = zen.get_redis_client()
var sourceUrl = 'https://github.com/bschlief/zenircbot'
var fs = require('fs');
var hue = require('node-hue-api').hue;
var lightState = require('node-hue-api').lightState;
var hueConfig = require('./hue.json');
var registerWarningIssued = false;
var api = null;

zen.register_commands(
    'hue.js',
    [
        {
            name: 'hue on',
            description: 'turn on the lights'
        }, {
            name: 'hue off',
            description: 'turn off the lights'
        }, {
            name: 'hue register',
            description: 'press the connect butten then send this to register the device with this software'
        }, {
            name: 'hue clear register',
            description: 'clear out stored registration value locally'
        }, {
            name: 'hue locateBridges',
            description: 'locates bridges and displays them'
        }, {
            name: 'hue apply [1, 2, 3] lightState.create().on.white(200,50)',
            description: 'an example of how to apply a random setting to all 3 lights'
        }
    ]
)

sub.subscribe('in')
sub.on('message', function(channel, message){
  var msg = JSON.parse(message);


  var displayResultConsole = function(result) { 
    console.log("result = " + JSON.stringify(result,null,2));  
  }

  var displayResult = function(result) {
    zen.send_privmsg(msg.data.channel, 
      msg.data.sender + ": result = " + JSON.stringify(result, null, 2));
  }

  var displayError = function(result) {
    zen.send_privmsg(msg.data.channel, 
      msg.data.sender + ": error = " + JSON.stringify(result, null, 2));
  }

  var getDefaultLightArray = function() {
    return [1, 2, 3]; 
  }

  var storeHueConfig = function(config) {
    zen.send_privmsg(msg.data.channel, msg.data.sender + ": writing to local config in hue.json");
    fs.writeFile('./hue.json', JSON.stringify(config, null, 4), function(err) {
      if(err) {
        console.log("Error writing hue.json:" + err);
      }
    });
  }

  var storeUsername = function(hueUsername) {
    hueConfig.username = hueUsername;
    storeHueConfig(hueConfig);
  }

  var getLightArrayFromMessage = function(str) {
    var lightArray = []; 
    var arrayMatch = str.match(/array=\((\d+(,\d+)*)\)/);
    if (!arrayMatch) {
      return [1, 2, 3];
    }
    var arrayString = arrayMatch[1];
    var iterable = arrayString.replace("(","").replace(")","").split(",");
    for (var i = 0; i<iterable.length; i++) {
      lightArray.push(iterable[i.valueOf()]);
    }
    return lightArray;
  }

  var applyLightState = function(state, message){
    var lightArray = getLightArrayFromMessage(message);
    if (!lightArray) 
    {
      lightArray = getDefaultLightArray();
    }

    for (var i=0; i<lightArray.length; i++) {
      api.setLightState(lightArray[i], state)
        .then(displayResultConsole)
        .fail(displayError)
        .done();
    }
  }
  
  if(hueConfig.username) {
    api = new hue.HueApi(hueConfig.hostname, hueConfig.username);
  } else {
    if (!registerWarningIssued) {    
      zen.send_privmsg(msg.data.channel, "hue.js disabled. press connect button then type 'hue register' in the irc window");
    }
    registerWarningIssued = true;
  }

  var getTransitionTime = function(str) {
    transitionMatch = str.match(/transition=(\d+)/);
    transitionTime = 1;
    if (transitionMatch) 
    { 
      transitionTime = transitionMatch[1];
    }
    return transitionTime;
  }

  if (msg.version == 1) {
    if (msg.type == 'privmsg' && /hue/.test(msg.data.message)) {
      if (/locateBridges/i.test(msg.data.message)) {
        zen.send_privmsg(msg.data.channel, msg.data.sender + ": locating hue bridges...");
        hue.locateBridges().then(function(bridge) {
          zen.send_privmsg(msg.data.channel, msg.data.sender + ": bridges found -- "+ JSON.stringify(bridge));
        }).done();
      }
      else if (/clear register/i.test(msg.data.message)) {
        delete hueConfig['username'];
        storeHueConfig(hueConfig); 
      }
      else if (/register/i.test(msg.data.message)) {
        if (hueConfig.username) {
          zen.send_privmsg(msg.data.channel, 
                           msg.data.sender + ": username " + hueConfig.username + " already exists in hue.json");
        }
        else {
          hue.registerUser(hueConfig.hostname, hueConfig.newUserName, hueConfig.userDescription)
            .then(function(result) { 
              hueConfig.username = result;
              storeHueConfig(hueConfig);
            })
            .fail(displayError)
            .done();
          api = new hue.HueApi(hueConfig.hostname, hueConfig.username);
        }
      }
      else if (/hsl=/.test(msg.data.message)) {
        var hslMatch = msg.data.message.match(/hsl=\((\d+),(\d+),(\d+)\)/);
        var transitionTime = getTransitionTime(msg.data.message);
        applyLightState(lightState.create().hsl(hslMatch[1], hslMatch[2], hslMatch[3]).transition(transitionTime),msg.data.message);
      }
      else if (/rgb=/.test(msg.data.message)) {
        var rgbMatch = msg.data.message.match(/rgb=\((\d+),(\d+),(\d+)\)/);
        var transitionTime = getTransitionTime(msg.data.message);
        applyLightState(lightState.create().rgb(rgbMatch[1], rgbMatch[2], rgbMatch[3]).transition(transitionTime),msg.data.message);
      }
      else if (/brightness=/.test(msg.data.message)) {
        var brightnessMatch = msg.data.message.match(/brightness=(\d+)/);
        var transitionTime = getTransitionTime(msg.data.message);
        applyLightState(lightState.create().brightness(brightnessMatch[1]).transition(transitionTime),msg.data.message);
      }
      else if (/white=/.test(msg.data.message)) {
        var whiteMatch = msg.data.message.match(/white=\((\d+),(\d+)\)/);
        var transitionTime = getTransitionTime(msg.data.message);
        applyLightState(lightState.create().white(whiteMatch[1],whiteMatch[2]).transition(transitionTime),msg.data.message);
      }
      else if (/on/i.test(msg.data.message)) {
        var state = lightState.create().on();
        applyLightState(state,msg.data.message);
      }
      else if (/off/i.test(msg.data.message)) {
        var state = lightState.create().off();
        applyLightState(state,msg.data.message);
      }
    } else if (msg.type == 'directed_privmsg') {
      var who = ['whoareyou', 'who are you?', 'source']
        if (/^ping$/i.test(msg.data.message)) {
          zen.send_privmsg(msg.data.channel, msg.data.sender + ': pong!')
        } else if (who.indexOf(msg.data.message) != -1) {
          zen.redis.get('zenircbot:nick', function(err, nick) {
            zen.send_privmsg(msg.data.channel,
              'I am ' + nick + ', an instance of ' +
              'ZenIRCBot. My source can be found ' +
              'here: ' + sourceUrl
              )
          })
        }
    }
  }
})

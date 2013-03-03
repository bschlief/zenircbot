var ZenIRCBot = require('zenircbot-api').ZenIRCBot
var zen = new ZenIRCBot()
var sub = zen.get_redis_client()
var sourceUrl = 'https://github.com/bschlief/zenircbot'
var fs = require('fs');
var hue = require('node-hue-api').hue;
var lightState = require('node-hue-api').lightState;
var hueConfig = require('./hue.json');


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
            description: 'register'
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

  var displayResult = function(result) {
    zen.send_privmsg(msg.data.channel, 
      msg.data.sender + ": result = " + JSON.stringify(result, null, 2));
  }

  var displayError = function(result) {
    zen.send_privmsg(msg.data.channel, 
      msg.data.sender + ": error = " + JSON.stringify(result, null, 2));
  }

  var api;
  if(hueConfig.username) {
    api = new hue.HueApi(hueConfig.hostname, hueConfig.username);
  } else {
    zen.send_privmsg(msg.data.channel, "Need to run the register command");
  }

  var storeUsernameAndDisplayResult = function(result) {
    hueConfig.username = result;
    zen.send_privmsg(msg.data.channel, msg.data.sender + ": storing result in ./hue.json at key username");
    fs.writeFile('./hue.json', JSON.stringify(hue_config, null, 4), function(err) {
      if(err) {
        console.log("Error writing hue.json:" + err);
      }
    }); 
    displayResult(result);
  }

  var applyLightState = function(api, lightArray, state){
    for (i in lightArray) {
      api.setLightState(lightArray[i], state)
        .then(displayResult)
        .fail(displayError)
        .done();
    }
  }

  var ack = function() { zen.send_privmsg(msg.data.channel, msg.data.sender + ":Acknowledged!"); }

  if (msg.version == 1) {
    if (msg.type == 'privmsg' && /hue/.test(msg.data.message)) {
      if (/locateBridges/i.test(msg.data.message)) {
        zen.send_privmsg(msg.data.channel, msg.data.sender + ": locating hue bridges...");
        hue.locateBridges().then(function(bridge) {
          zen.send_privmsg(msg.data.channel, msg.data.sender + ": bridges found -- "+ JSON.stringify(bridge));
        }).done();
      }
      else if (/register/i.test(msg.data.message)) {
        var hue_config = require('./hue.json');

        if (hue_config.username) {
          zen.send_privmsg(msg.data.channel, msg.data.sender + ": user already exists in hue.json");
          displayResult(hue_config.username);
        }
        else {
          zen.send_privmsg(msg.data.channel, msg.data.sender + ": registering user");
          hue.registerUser(hue_config.hostname, hue_config.newUserName, hue_config.userDescription)
            .then(storeUsernameAndDisplayResult)
            .fail(displayError)
            .done();
          api = new hue.HueApi(hueConfig.hostname, hueConfig.username);
        }
      }
      else if (/apply/i.test(msg.data.message)) {
        var apply_idx = msg.data.message.search('hue apply ') + 'hue apply '.length;
        var application_string = msg.data.message.substr(apply_idx);
        zen.send_privmsg(msg.data.channel, msg.data.sender + ": applying: " + application_string);
        var state = eval(application_string);

        applyLightState(api, [1, 2, 3], state);
      }
      else if (/on/i.test(msg.data.message)) {
        ack();

        // Set light state to 'on' with warm white value of 400 and brightness set to 100%
        var state = lightState.create().on();

        applyLightState(api, [1, 2, 3], state);
      }
      else if (/off/i.test(msg.data.message)) {
        ack();

        state = lightState.create().off();

        applyLightState(api, [1, 2, 3], state);
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

var ZenIRCBot = require('zenircbot-api').ZenIRCBot
var zen = new ZenIRCBot()
var sub = zen.get_redis_client()
var sourceUrl = 'https://github.com/bschlief/zenircbot'
var fs = require('fs');
var hue = require('node-hue-api').hue;

zen.register_commands(
    'hue.js',
    [
        {
            name: 'light-on',
            description: 'turns on lights'
        }, {
            name: 'light-off',
            description: 'turns off lights'
        }, {
            name: 'red',
            description: 'turns lights red'
        }, {
            name: 'green',
            description: 'turns lights green'
        }, {
            name: 'register',
            description: 'register'
        }, {
            name: 'locate-bridges',
            description: 'locates bridges and displays them'
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

  var storeUsernameAndDisplayResult = function(result) {
    var hue_config = require('./hue.json');
    hue_config.username = result;
    zen.send_privmsg(msg.data.channel, msg.data.sender + ": storing result in ./hue.json at key username");
    fs.writeFile('./hue.json', JSON.stringify(hue_config, null, 4), function(err) {
      if(err) {
        console.log("Error writing hue.json:" + err);
      }
    }); 
    displayResult(result);
  }

  if (msg.version == 1) {
    if (msg.type == 'privmsg') {
      if (/locate-bridges/i.test(msg.data.message)) {
        zen.send_privmsg(msg.data.channel, msg.data.sender + ": locating hue bridges...");
        hue.locateBridges().then(function(bridge) {
          zen.send_privmsg(msg.data.channel, msg.data.sender + ": your bridges found are as follows -- "+ JSON.stringify(bridge));
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
        }
      }
      else if (/light-off/i.test(msg.data.message)) {
        zen.send_privmsg(msg.data.channel, msg.data.sender + ": this is a light sentence")
      }
      else if (/red/i.test(msg.data.message)) {
        zen.send_privmsg(msg.data.channel, msg.data.sender + ": this is a red sentence")
      }
      else if (/green/i.test(msg.data.message)) {
        zen.send_privmsg(msg.data.channel, msg.data.sender + ": this is a green sentence")
      }
      else if (/blue/i.test(msg.data.message)) {
        zen.send_privmsg(msg.data.channel, msg.data.sender + ": this is a blue sentence")
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

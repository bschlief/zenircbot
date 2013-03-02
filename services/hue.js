var ZenIRCBot = require('zenircbot-api').ZenIRCBot
var zen = new ZenIRCBot()
var sub = zen.get_redis_client()
var sourceUrl = 'https://github.com/bschlief/zenircbot'
var hue = require('hue-module');
var hueConfig = require('./hue.json');
hue.load(hueConfig.ip_address, hueConfig.id_key);

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
            name: 'blue',
            description: 'turns lights blue'
        }
    ]
)


sub.subscribe('in')
sub.on('message', function(channel, message){
    var msg = JSON.parse(message)
    if (msg.version == 1) {
        if (msg.type == 'privmsg') {
            if (/light-on/i.test(msg.data.message)) {
              hue.lights(function(lights){
                for(i in lights) {
                  if(lights.hasOwnProperty(i)) {
                    zen.send_privmsg(msg.data.channel, msg.data.sender + ": turning on a light");
                    hue.change(lights[i].set( {
                      "on": true, 
                      "rgb":[255,255,255]
                    }));
                  }
                }
              });
              zen.send_privmsg(msg.data.channel, msg.data.sender + ": this is a light sentence")
            }
            else if (/light-off/i.test(msg.data.message)) {
              hue.lights(function(lights){
                for(i in lights) {
                  if(lights.hasOwnProperty(i)) {
                    zen.send_privmsg(msg.data.channel, msg.data.sender + ": turning off a light");
                    console.log(hue.change(lights[i].set({"on": false, "rgb":[0,255,255]})));
                  }
                }
              });
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

var ZenIRCBot = require('zenircbot-api').ZenIRCBot
var zen = new ZenIRCBot()
var sub = zen.get_redis_client()
var sourceUrl = 'https://github.com/bschlief/zenircbot'
var hue = require('hue-module');

zen.register_commands(
    'hue.js',
    [
        {
            name: 'light',
            description: 'turns on lights'
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

hueConfig = require('./hue.json');
//hue.load(hueConfig.ip_address, hueConfig.id_key);
hue.load("192.168.1.135", "73f8558a0ef4603c04596624558a63bc");

sub.subscribe('in')
sub.on('message', function(channel, message){
    var msg = JSON.parse(message)
    if (msg.version == 1) {
        if (msg.type == 'privmsg') {
            if (/light/i.test(msg.data.message)) {
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

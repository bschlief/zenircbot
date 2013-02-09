var ZenIRCBot = require('zenircbot-api').ZenIRCBot
var zen = new ZenIRCBot()
var sub = zen.get_redis_client()
var sourceUrl = 'https://github.com/bschlief/zenircbot'

zen.register_commands(
    'rms.js',
    [
        {
            name: 'linux',
            description: 'Trolls the user for saying linux'
        }, {
            name: 'open source',
            description: 'Trolls the user for saying open source'
        }, {
            name: 'rider',
            description: "selects a random sentence from rms's speaking rider"
        }
    ]
)

rider = require('./rms.json');

sub.subscribe('in')
sub.on('message', function(channel, message){
    var msg = JSON.parse(message)
    if (msg.version == 1) {
        if (msg.type == 'privmsg') {
            
            if (/rider/i.test(msg.data.message)) {
                var rand = Math.floor(Math.random()*rider.sentences.length)
                zen.send_privmsg(msg.data.channel, msg.data.sender + ": " + rider.sentences[rand])
            }
            else if (/linux/i.test(msg.data.message)) {
                zen.send_privmsg(msg.data.channel,
                                 msg.data.sender + ': Did you mean GNU/Linux?')
            }
            else if (/open source/i.test(msg.data.message)) {
                zen.send_privmsg(msg.data.channel,
                                 msg.data.sender + ': "Open source" is the slogan of a position that was formulated as a reaction against the free software movement.  Those who support its views have a right to promote them, but I disagree with them and I want to promote the ideals of free software.')
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

import botkit from 'botkit';
import redis from 'botkit-storage-redis';
import feed from 'rss-to-json';
import schedule from 'node-schedule';
require('dotenv').config()

if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET || !process.env.CLIENT_SIGNING_SECRET || !process.env.TOKEN) {
    console.log('Error: Specify CLIENT_ID, CLIENT_SECRET, CLIENT_SIGNING_SECRET and TOKEN in environment');
    process.exit(1);
}

const OZBARGAIN_URL = "https://www.ozbargain.com.au/feed/deals"

const slackConfig = {
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    clientSigningSecret: process.env.CLIENT_SIGNING_SECRET,
    redirectUri: process.env.ENVIRONMENT === "DEVELOPMENT" ?
        'http://localhost:8000/oauth' :
        'https://ozbargainbot.herokuapp.com/oauth',
    scopes: ['incoming-webhook'],
}

if (process.env.REDIS_URL) {
    slackConfig.storage = redis(process.env.REDIS_URL)
} else {
    slackConfig.json_file_store = './store'
}

const controller = botkit.slackbot(slackConfig)

controller.setupWebserver(process.env.PORT || 3000, function (err, webserver) {
    // Setup /slack/receive endpoint
    controller.createWebhookEndpoints(controller.webserver, function(err, req, res) {
        console.log("webhook", req)
    })
    // Setup /login and /oauth endpoints
    controller.createOauthEndpoints(controller.webserver, function (err, req, res) {
        if (err) {
            res.status(500).send('ERROR: ' + err)
        } else {
            res.send('Success!')
        }
    })
})

controller.on("create_incoming_webhook", webhook => {
    getBargains()
})

const getBargains = () => {
    feed.load(OZBARGAIN_URL, (err, rss) => {
        console.log(rss)
    })
}

const sendBargains = (bargains) => {

}
import botkit from 'botkit';
import redis from 'botkit-storage-redis';
import Subscription from './Subscription';
import dotenv from 'dotenv'

dotenv.config()

if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET || !process.env.CLIENT_SIGNING_SECRET) {
    console.log('Error: Specify CLIENT_ID, CLIENT_SECRET, CLIENT_SIGNING_SECRET in environment');
    process.exit(1);
}

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
const subscriptions = []

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
    controller.storage.channels.all((err, allData) => {
        allData.forEach(channel => 
            subscriptions.push(new Subscription(channel, controller))
        )
        console.log('loaded')
    })
})

controller.on("create_incoming_webhook", (bot, message) => {
    const data = {
        id: message.channel_id,
        url: message.url,
        bargains: []
    }
    controller.storage.channels.save(data, err => {
        subscriptions.push(new Subscription(data, controller))
    })
})
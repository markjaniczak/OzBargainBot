import Parser from 'rss-parser';
import schedule from 'node-schedule'

const OZBARGAIN_URL = "https://www.ozbargain.com.au/feed/deals"

class Subscription {
    constructor(data, controller) {
        this.data = data
        this.bot = controller.spawn({
            incoming_webhook: {
                url: data.url
            }
        })
        this.controller = controller
        this.parser = new Parser({
            customFields: {
                item: [
                    ['media:thumbnail', 'thumbnail']
                ]
            }
        })
        this.schedule = schedule.scheduleJob("* * * * *", () => {
            this.getBargains()
        })
    }

    getBargains() {
        this.parser.parseURL(OZBARGAIN_URL)
            .then(
                rss => {
                    //Get a list of new bargains
                    const newBargains = rss.items.filter(bargain => {
                        const guid = parseInt(bargain.guid.split(" ")[0])
                        if (!this.data.bargains.includes(guid)) {
                            this.data.bargains.push(guid)
                            return true
                        }
                    })
                    //Send bargains to Slack
                    this.sendBargains(newBargains)
                    //Save latest bargain to DB
                    this.controller.storage.channels.save({ ...this.data, bargains: this.data.bargains })
                })
            .catch(
                error => console.log(error)
            )
    }

    sendBargains(bargains) {
        bargains.forEach(bargain => {
            this.bot.sendWebhook({ blocks: this.createPayload(bargain) }, (err, res) => {
                console.log(err, res)
            })
        })
    }

    createPayload(bargain) {
        return [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `${bargain.title}\n${bargain.link}`
                },
                accessory: {
                    type: "image",
                    image_url: bargain.thumbnail ? bargain.thumbnail["$"].url : "http://skeletaltheme.neto.com.au/assets/na.gif",
                    alt_text: bargain.title
                }
            },
            {
                type: "context",
                elements: [
                    {
                        type: "plain_text",
                        text: bargain.categories.reduce((acc, cur, index) => `${index > 0 ? acc + "," : ""} ${cur._}`, "")
                    }
                ]
            },
            {
                type: "divider"
            }
        ]
    }
}

export default Subscription
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
                    //Get latest guid
                    const currentBargain = parseInt(rss.items[0].guid.split(" ")[0])
                    //Check for new bargains
                    if (currentBargain > this.data.lastBargain) {
                        //Get a list of new bargains
                        const newBargains = rss.items.filter(bargain =>
                            parseInt(bargain.guid.split(" ")[0]) > this.data.lastBargain
                        )
                        //Send bargains to Slack
                        this.sendBargains(newBargains)
                        //Save latest bargain to DB
                        this.controller.storage.channels.save({ ...this.data, lastBargain: currentBargain })
                        //Update latest bargain in process
                        this.data.lastBargain = currentBargain
                    }
                })
            .catch(
                error => console.log(error)
            )
    }

    sendBargains(bargains) {
        const messagePayload = bargains.reduce((acc, cur) => {
            acc.push(...this.createPayload(cur))
            return acc
        }, [])
        this.bot.sendWebhook({ blocks: messagePayload })
    }

    createPayload(bargain) {
        return [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `<${bargain.link}|:link: ${bargain.title}>`
                },
                accessory: {
                    type: "image",
                    image_url: bargain.thumbnail["$"].url,
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
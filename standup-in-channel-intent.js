const Text = require('../library/ai/text')
const { Ner } = require('@nlpjs/ner')
const { ExtractorEnum } = require('@nlpjs/ner')
const Standup = require('../models/standup');
const scheduler = require('../library/scheduler/scheduler').getInstance();

const ai = (require('../library/ai/ai')).getInstance();

BaseIntent = require('./base/base-intent')

class StandupInChannelIntent extends BaseIntent {

    channelId = null;

    activate = async (data) => {
        this.setup();
        const { event, nlpResult, slackApp } = data;
        this.channelId = event.channel;

        if (event.channel_type == 'im') {
            await slackApp.writeToChannel(
                event.channel, 'You need to write this in some channel if you want to do standups there'
            )
        } else {
            //send me case
            const extractor = new ExtractorEnum();
            const remindMeMatch = extractor.getBestSubstring(event.text, 'remove');
            
            if (remindMeMatch.accuracy > 0.5) {
                await this.removeStandup(event.channel, slackApp);
                return;
            }

            if (!this.isWaitingTo(event.user)) {
                await slackApp.writeToChannel(
                    event.channel, 'What time you want standups to be done?'
                )
                this.addToWaiting(event.user);
            } else {
                await this.getTimeAndSetupSchedule(event, slackApp)
            }
        }
    }

    getTimeAndSetupSchedule = async (event, slackApp) => {

        const inputText = new Text(event.text);
        const scheduleTime = await inputText.getTime();

        let message = '';

        if (scheduleTime) {
            message = 'Standups daily at ' + scheduleTime + '! To remove, just ask me.';
            await this.createStandup(event.user, event.channel, scheduleTime);
            this.excludeFromWaiting(event.user);
        } else {
            message = 'Please say a valid time.'
            this.addToWaiting(event.user, 1, {});
        }


        await slackApp.writeToChannel(
            event.channel, message
        )
    }

    createStandup = async (user, channel, time) => {

        let standup = await Standup.findOne()
            .where("channel").in([channel])
            .exec();

        if(standup) {
            standup.authorUser = user;
            standup.time = time;
        } else {
            standup = new Standup({
                authorUser: user,
                channel: channel,
                time: time
            });
        }

        await standup.save();

        await scheduler.scheduleStandups();
    }

    removeStandup = async (channel, slackApp) => {
        await Standup.deleteOne({ channel: channel }).exec();
        await slackApp.writeToChannel(
            channel, 'Standup removed!'
        )
        await scheduler.scheduleStandups();
    }

    ///////////////////////////////////////////////////////////
    //////////////////////////// NLG  /////////////////////////
    ///////////////////////////////////////////////////////////

    setupAnswers = () => {
        const nlg = this.currentNlg;

        nlg.add('en', 'done', '_Message is sent to <@{{receiverUser}}> successfully_');
        nlg.add('en', 'done', '_<@{{receiverUser}}> got your message successfully_');

        nlg.add('en', 'messages', 'You have {{ messages }} new messages', 'messages > 1'); // messages > 1
    }

    ///////////////////////////////////////////////////////////
    ////////////////////////// CORPUS  ////////////////////////
    ///////////////////////////////////////////////////////////

    corpusEn = {
        "intent": "commands.standup-in-channel",
        "utterances": [
            "start daily standups in this channel",
            "do daily standups in this channel",
            "setup standup in this channel",
        ],
        "answers": [
            "OK"
        ]
    }

    corpusHy = {
        "intent": "commands.standup-in-channel",
        "utterances": [
            "daily standupner sksenq es channelum"
        ],
        "answers": [
            "OK"
        ]
    }
}

module.exports = StandupInChannelIntent
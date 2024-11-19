

const Text = require('../../library/ai/text')

class IntentManager {

    static _instance = null;

    intents = {
        'commands.message-remind': {
            intent: 'commands.message-remind',
            handler: new (require('../message-remind-intent'))(),
            type: 'default'
        },
        'commands.message-channel': {
            intent: 'commands.message-channel',
            handler: new (require('../message-channel-intent'))(),
            type: 'default'
        },
        'commands.message-someone': {
            intent: 'commands.message-someone',
            handler: new (require('../message-someone-intent'))(),
            type: 'default'
        },
        'commands.anyone-in-office-intent': {
            intent: 'commands.anyone-in-office-intent',
            handler: new (require('../anyone-in-office-intent'))(),
            type: 'default'
        },
        'commands.standup-in-channel': {
            intent: 'commands.standup-in-channel',
            handler: new (require('../standup-in-channel-intent'))(),
            type: 'default'
        },
        'commands.birthday-answer': {
            intent: 'commands.birthday-answer',
            handler: new (require('../birthday-answer-intent'))(),
            type: 'default'
        },
    }

    constructor() {
        IntentManager._instance = this;
        this.schedule = require('node-schedule');
    }

    static getInstance = () => {
        if (!IntentManager._instance) {
            return new IntentManager();
        }
        return IntentManager._instance;
    }

    setup = async (ai) => {
        this.nlp = ai.nlp;
        await this.addCorpora();
    }

    getIntent = async (event) => {

        let inputString = event.text;
        let result = '';

        //one of action intents is waiting for an answer
        for(let intent of Object.values(this.intents)) {
            if(intent.handler.isWaitingTo(event.user)) {
                result = intent.intent;
            }
        }

        //new action intent
        const inputText = new Text(inputString)
        inputString = inputText.removeTextWithinQuotes();

        const nlpResult = await this.nlp.process(inputString);

        if(this.intents[nlpResult.intent] && nlpResult.score > 0.6) {
            //catched by other actionable intent
            console.log(nlpResult.intent + ', score: ' + nlpResult.score);
            result = nlpResult.intent;
        }

        //result
        const returnResult = {
            intent: result,
            actionIntent: (this.intents[result] ? this.intents[result].intent : ''),
            nlpResult: nlpResult
        };

        return returnResult
    }

    /**
     * 
     * @param {string} intent 
     * @param {Object} data
     */
    run = async (intentName, data) => {
        try {
            const intent = this.intents[intentName].handler;
            await intent.activate(data);
        } catch (e) {
            console.log("error running " + intentName);
            console.log(e);
        }
    }

    addCorpora = async () => {
        const nlp = this.nlp;
        let corporaEn = [];
        let corporaHy = [];

        Object.values(this.intents).forEach((intent) => {
            if(intent.handler.corpusEn) {
                corporaEn.push(intent.handler.corpusEn);
            }
            if(intent.handler.corpusHy) {
                corporaHy.push(intent.handler.corpusHy);
            }
        });

        let jsonEn = {
            "name": "ActionIntentsCorpusEn",
            "locale": "en-US",
            "data": corporaEn
        }
        let jsonHy = {
            "name": "ActionIntentsCorpusHy",
            "locale": "hy-AM",
            "data": corporaHy
        }
            
        nlp.addCorpus(jsonEn);
        nlp.addCorpus(jsonHy);
    }


}

module.exports = IntentManager
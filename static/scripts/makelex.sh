#Creates a service role (not needed if bot already created on account before)
#aws iam create-service-linked-role --aws-service-name lex.amazonaws.com

region="eu-west-1"

#add put-slot type
aws lex-models put-slot-type --region region --name FlowerTypes --cli-input-json file://FlowerTypes.json

#set up intents for bot
aws lex-models put-intent --region $region --name OrderFlowers --cli-input-json file://OrderFlowers.

#create the bot
aws lex-models put-bot --region $region --name OrderFlowersBot --cli-input-json file://OrderFlowersBot.json

#aws lex-models get-bot --region region --name OrderFlowersBot --version-or-alias "\$LATEST"


#test bot with text
aws lex-runtime post-text --region $region --bot-name OrderFlowersBot --bot-alias "\$LATEST" --user-id UserOne --input-text "i would like to order flowers"
aws lex-runtime post-text --region $region --bot-name OrderFlowersBot --bot-alias "\$LATEST" --user-id UserOne --input-text "roses"
aws lex-runtime post-text --region $region --bot-name OrderFlowersBot --bot-alias "\$LATEST" --user-id UserOne --input-text "tuesday"
aws lex-runtime post-text --region $region --bot-name OrderFlowersBot --bot-alias "\$LATEST" --user-id UserOne --input-text "10:00 a.m."
aws lex-runtime post-text --region $region --bot-name OrderFlowersBot --bot-alias "\$LATEST" --user-id UserOne --input-text "yes"


#test bot with audio
#create audio with amazon polly
aws polly synthesize-speech --region $region --output-format mp3 --text "i would like to order flowers" --voice-id "Kendra" IntentSpeech.mp3
#send audio to bot
aws lex-runtime post-content --region $region --bot-name OrderFlowersBot --bot-alias "\$LATEST" --user-id UserOne --content-type "audio/l16; rate=16000; channels=1" \
    --input-stream IntentSpeech.mpg IntentOutputSpeech.mp3
    
    
    

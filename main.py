from flask import Flask, redirect, url_for, request, render_template
from flask import abort
from flask import make_response
from flask import redirect
from flask import session
from werkzeug.utils import secure_filename
from werkzeug.debug import DebuggedApplication
import subprocess
import requests
import boto3
#from google.cloud import storage

import os
import uuid

app = Flask(__name__)
app.debug = True

@app.route("/")
def welcome():
    session_id = request.cookies.get('session_id')
    lex_response = request.cookies.get('message')
    if(not lex_response):
        lex_response = "Press record to start"
    #lex_response.replace("\054","\n")
    if session_id:
        return render_template("record.html", text=lex_response)
    else:
        return render_template("welcome.html")

@app.route("/legal")
def legal():
    return render_template("legal.html")

@app.route("/start")
def start():
    response = make_response(redirect('/'))
    session_id = uuid.uuid4().hex
    response.set_cookie('session_id', session_id)
    return response

@app.route('/upload', methods=['POST'])
def upload():
    session_id = request.cookies.get('session_id')
    if not session_id:
        make_response('No session', 400)
    word = request.args.get('word')
    audio_data = request.data
    filename = word + '_' + session_id + '_' + uuid.uuid4().hex + '.ogg'
    secure_name = secure_filename(filename)
    # Left in for debugging purposes. If you comment this back in, the data
    # will be saved to the local file system.
    with open(secure_name, 'wb') as f:
        f.write(audio_data)
    
    #polly = boto3.client('polly')
    #response = polly.synthesize_speech(OutputFormat='ogg_vorbis',SampleRate='16000',Text='I would like to order flowers',
     #   VoiceId='Geraint')
    #print(response)
    #with open(pollyfile.obb, 'wb') as f:
     #   f.write(response['AudioStream'])
    
    client = boto3.client('lex-runtime')
    message = client.post_content(botName='sayhi', botAlias='prod', userId='samboo',
       contentType='audio/x-cbr-opus-with-preamble; preamble-size=0; bit-rate=256000; frame-size-milliseconds=4', accept='text/plain; charset=utf-8', inputStream=secure_name)['message']
    #message = client.post_content(botName='sayhi', botAlias='prod', userId='samboo',
     #    contentType='audio/x-l16; sample-rate=16000; channel-count=1', accept='text/plain; charset=utf-8', inputStream=response)['AudioStream']
   
    print(message)
    resp = make_response(render_template('record.html'))
    resp.set_cookie('message', message)
    return resp
    #return message
    
"""
# CSRF protection, see http://flask.pocoo.org/snippets/3/.
@app.before_request
def csrf_protect():
    if request.method == "POST":
        token = session['_csrf_token']
        if not token or token != request.args.get('_csrf_token'):
            abort(403)

def generate_csrf_token():
    if '_csrf_token' not in session:
        session['_csrf_token'] = uuid.uuid4().hex
    return session['_csrf_token']

app.jinja_env.globals['csrf_token'] = generate_csrf_token
# Change this to your own number before you deploy.
app.secret_key = os.environ['SESSION_SECRET_KEY']
"""

if __name__ == "__main__":
    app.run(debug=True,port=8000)
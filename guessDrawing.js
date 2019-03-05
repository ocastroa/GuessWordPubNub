(function() {

    let words = ['alligator', 'bear', 'cat', 'chinchilla', 'cow', 'coyote', 'crocodile', 'dolphin', 'duck', 'fish', 'fox', 'gecko', 'hamster', 'hippopotamus', 'jaguar', 'leopard', 'liger', 'lion', 'lynx', 'monkey', 'ocelot', 'octopus', 'panther', 'penguin', 'pig', 'rhinoceros', 'seal', 'skunk', 'sloth', 'starfish', 'stingray', 'tiger', 'tortoise', 'toucan', 'turtle', 'whale', 'wolf'];
    
    let choosenWord = '';
    let mySign = {
        sign: 'H',
        score: 0,
    }
    let totalScore = 0;
    let turn =  "H";
    let tries = 3;

	/* PubNub */
    let channel = 'guessWord';
    let newUUID = PubNub.generateUUID();

    let hostUUID = ''
    let player = 'Host'
    let isHost = false;
    let guestUUID = ''

    let name = '';

    function $(id) { 
        console.log(document.getElementById(id));  
        return document.getElementById(id); 
    }   

    let chatLog =  $('chatLog'), chatInput = $('chatInput');

    let guessWordChatLog =  $('guessWordChatLog'), guessWordInput = $('guessWordChatInput'),
    clearCanvasButton = $('clearCanvasButton'), colorSwatch = $('colorSwatch'), triesLeft = $('triesLeft'),
    guessWord = $('guessWord'), score = $('score'), otherScore = $('otherScore');

    let pubnubGuessgame = new PubNub({
        uuid: newUUID,
        publish_key     : 'pub-c-0eaf7fdd-cf5d-42f6-bee8-de40fe3b83a8',
        subscribe_key   : 'sub-c-3084ee5c-3a30-11e9-82f9-d2a672cc1cb7',
        ssl		: true
    });

    //Main Chat
    let ChatEngine = ChatEngineCore.create({
        publishKey: 'pub-c-e7a955d5-a869-4d78-b25a-d5f9d72aad6a',
        subscribeKey: 'sub-c-be7320d0-3be8-11e9-82f9-d2a672cc1cb7'
    }, {
        globalChannel: 'guessWord'
    });

    ChatEngine.on('$.ready', function(data) {
        // Every time a message is recieved from PubNub, render it.
        ChatEngine.global.on('message', onMessage);
    });

    //Guess Word Chat
    let GuessWordChatEngine = ChatEngineCore.create({
        publishKey: 'pub-c-72fbd257-fe52-43c3-a861-435c484e9f9e',
        subscribeKey: 'sub-c-f1cdfc38-3bf8-11e9-b86f-06e8d5f9a4fd'
    }, {
        globalChannel: 'guessWord'
    });

    GuessWordChatEngine.on('$.ready', function(data) {
        // Every time a message is recieved from PubNub, render it.
        GuessWordChatEngine.global.on('message', onMessageGuessWord);
    });

    pubnubGuessgame.addListener({
        message: function(msg) {
            if(msg){
                console.log("inside message function");
                console.log(msg.message);

                if(turn !== mySign.sign && msg.message.choosenWord){
                    choosenWord = msg.message.choosenWord;
                }

                //only draw on other player's canvas
                if(turn !== mySign.sign && msg.message.plots){
                    drawFromStream(msg.message);         
                }

                if(msg.message.clearTheCanvas){
                    clearCanvas();
                }
            }    
        },
        presence: function(response) {
            if (response.action === "join") {
                if(response.occupancy < 2){
                    // triesLeft.innerHTML = "";
                    // guessWord.innerHTML = "";
                    hostUUID = response.uuid;
                    isHost = true;

                    console.log("Waiting for opponent");
                    console.log(`You are the ${player}`);
                    console.log("num of ppl: " + response.occupancy);
                    console.log(`Your uuid: ${hostUUID}`);
                    console.log(`My sign is: ${mySign.sign}`);
                }
                else if(response.occupancy === 2){
                    if(!isHost){
                        player = "Guest";
                        guestUUID = response.uuid;
                        mySign.sign = 'G'; 
                    }

                    console.log(`You are the ${player}`);
                    console.log(`Your uuid: ${guestUUID}`);
                    console.log(`My sign is: ${mySign.sign}`);
                }
                else if(response.occupancy > 2){
                    console.log("Game already has two players. Please wait your turn");
                    //startGame();
                }

                if(response.occupancy === 2){
                    console.log("num of ppl: " + response.occupancy);
                    console.log("Starting game...");
                    if(isHost){
                        name = "Host";
                    }
                    else{
                        name = "Guest";
                    }
                                
                    var client = {
                        uuid: name,
                        name: name
                    };
                
                    ChatEngine.connect(client.uuid, client);
                    GuessWordChatEngine.connect(client.uuid, client); 

                    if(turn !== mySign.sign) {
                        console.log("Not your turn to draw");
                        score.innerHTML = `My Score: ${mySign.score}`;
                        otherScore.innerHTML = "Opponent's Score: 0";
                        guessWord.innerHTML = `Guess the drawing!`;
                        triesLeft.innerHTML = `Tries Left: ${tries}`;  
                        return;
                    }

                    else{
                        otherScore.innerHTML = "Opponent's Score: 0";
                        startGame();
                    }
                }
            }
         
            // if(response.action === "leave") {
            //     console.log(`${player} has left game!`);
            //     onbeforeunload = function() {
            //         globalUnsubscribe();
            //         $.ajax({
            //         // Query to server to unsub sync
            //         async:false,
            //         method: "GET",
            //         url: "https://pubsub.pubnub.com/v2/presence/sub-key/sub-c-3084ee5c-3a30-11e9-82f9-d2a672cc1cb7/channel/guessWord/leave?uuid=" + encodeURIComponent(newUUID) 
            //         }).done(function(jqXHR, textStatus) {
            //         console.log( "Request done: " + textStatus );
            //         }).fail(function( jqXHR, textStatus ) {
            //         console.log( "Request failed: " + textStatus );
            //         });
            //         return null;
            // }
            // // Unsubscribe people from PubNub network
            // globalUnsubscribe = function () {
            //     try {
            //     pubnub.unsubscribe({
            //         channels: ['guessWord']
            //     });
            //     pubnub.removeListener(listener);
            //     console.log("removed listener");
            //     } catch (err) {
            //     console.log("Failed to UnSub");
            //     }
            // };
            // //declare other player winner and restart game and wait for another player
            // }
        },
        // status events callback - handles network connectivity status events for all subscribed channels
        status: function(event) {
            if (event.category == "PNConnectedCategory") {
                setUpCanvas();
            }
        }                 
    });

    pubnubGuessgame.subscribe({
		channels: [channel],
        withPresence: true
    });

    function publish(data) {
		pubnubGuessgame.publish({
			channel: channel,
			message: data
		});
     }

    let canvas = document.getElementById('drawCanvas');
    let ctx = canvas.getContext('2d');
    let color = document.querySelector(':checked').getAttribute('data-color');

    /* Set up canvas */
    function setUpCanvas(){
        ctx.fillStyle = "WHITE";
        ctx.fillRect(20,20,window.innerWidth, window.innerHeight);
                
        ctx.strokeStyle = color;
        ctx.lineWidth = '3';
        ctx.lineCap = ctx.lineJoin = 'round';        
    }
    
    let isActive = false;
    let plots = [];
    let clearTheCanvas = false;
    let isTouchSupported = 'ontouchstart' in window;

    var isPointerSupported = navigator.pointerEnabled;
    var isMSPointerSupported =  navigator.msPointerEnabled;
    
    var downEvent = isTouchSupported ? 'touchstart' : (isPointerSupported ? 'pointerdown' : (isMSPointerSupported ? 'MSPointerDown' : 'mousedown'));
    var moveEvent = isTouchSupported ? 'touchmove' : (isPointerSupported ? 'pointermove' : (isMSPointerSupported ? 'MSPointerMove' : 'mousemove'));
    var upEvent = isTouchSupported ? 'touchend' : (isPointerSupported ? 'pointerup' : (isMSPointerSupported ? 'MSPointerUp' : 'mouseup'));

    function clearCanvas(){
        console.log("clearing canvas...");
        ctx.fillStyle = "WHITE";
        ctx.fillRect(20,20,window.innerWidth, window.innerHeight);     
    }

    function nextRound(){
        clearCanvas();
        guessWordChatLog.innerHTML = "";
        console.log("switching turns!");
        console.log(`My sign is: ${mySign.sign}`);
        tries = 3;

        if(turn !== mySign.sign) {
            console.log("Not your turn to draw");
            guessWord.innerHTML = `Guess the drawing!`;
            triesLeft.innerHTML = `Tries Left: ${tries}`;
            canvas.removeEventListener(downEvent, startDraw, false);
            canvas.removeEventListener(moveEvent, draw, false);
            canvas.removeEventListener(upEvent, endDraw, false);    
            clearCanvasButton.removeEventListener('click', clearButton, false);
            console.log("removed event listeners");
            return;
        }

        guessWord.innerHTML = "";
        triesLeft.innerHTML = "";
        startGame();
    }

    function startGame(){
        let chooseIndex = Math.floor(Math.random() * words.length);
        choosenWord = words[chooseIndex];
        words.splice(chooseIndex,1);
        console.log(`Choosen word is: ${choosenWord}`);
        score.innerHTML = `My Score: ${mySign.score}`;
        guessWord.innerHTML = `Draw the word: ${choosenWord}`;

        publish({
            choosenWord: choosenWord
        })            
        
        colorSwatch.addEventListener('click', function() {
            color = document.querySelector(':checked').getAttribute('data-color');
        }, false);

        clearCanvasButton.addEventListener('click', clearButton, false);
                
        canvas.addEventListener(downEvent, startDraw, false);
        canvas.addEventListener(moveEvent, draw, false);
        canvas.addEventListener(upEvent, endDraw, false);    
    }

    /* Draw on canvas */
    function drawFromStream(m) {
        if(!m || m.plots.length < 1) return;
        console.log("inside drawFromStream");
		drawOnCanvas(m.color, m.plots);
    }

    function drawOnCanvas(color, plots) {
    	ctx.strokeStyle = color;
		ctx.beginPath();
		ctx.moveTo(plots[0].x, plots[0].y);

    	for(var i=1; i<plots.length; i++) {
	    	ctx.lineTo(plots[i].x, plots[i].y);
	    }
	    ctx.stroke();
    }

	function draw(e) {
		e.preventDefault(); // prevent continuous touch event process e.g. scrolling!
	  	if(!isActive) return;

    	var x = isTouchSupported ? (e.targetTouches[0].pageX - canvas.offsetLeft) : (e.offsetX || e.layerX - canvas.offsetLeft);
    	var y = isTouchSupported ? (e.targetTouches[0].pageY - canvas.offsetTop) : (e.offsetY || e.layerY - canvas.offsetTop);

    	plots.push({x: (x << 0), y: (y << 0)}); // round numbers for touch screens

    	drawOnCanvas(color, plots);
	}
	
	function startDraw(e) {
          e.preventDefault();

	  	 isActive = true;
	}
	
	function endDraw(e) {
	  	e.preventDefault();
	  	isActive = false;

        console.log(`Plots: ${plots}`);  

        publish({
            color: color,
            plots: plots,
        })

        plots = [];
    }

    function clearButton(e){
        e.preventDefault();

        clearTheCanvas = true;
        publish({
            clearTheCanvas: clearTheCanvas
        })
    }


     //ChatEngine for main chat
    function scrollBottom() {
        chatLog.scrollTo(0, chatLog.scrollHeight);
    }

    function onMessage(message) {
        console.log(message.data.text);
        console.log(message.data.uuid);
        var uuid = message.data.uuid;
        var text = message.data.text;

        // add the message to the chat UI
        var domContent = `<div class="chat-message"><b>${uuid}:</b> ${text}</div>`;
        chatLog.insertAdjacentHTML('beforeend', domContent);
        scrollBottom();
    }

    function sendMessage(e) {
       if (e.keyCode === 13  && !e.shiftKey) e.preventDefault();

        let focussed = chatInput.matches(':focus');

        if (focussed && e.keyCode === 13 && chatInput.value.length > 0) {
            var text = chatInput.value;
            ChatEngine.global.emit('message', {
                text: text,
                uuid: name
            });

            chatInput.value = '';
        }
    }

    // Add event listener for the textarea of the chat UI
    chatInput.addEventListener('keypress', sendMessage);

    //ChatEngine for main chat
    function scrollBottom() {
        chatLog.scrollTo(0, chatLog.scrollHeight);
    }

    function onMessage(message) {
        console.log(message.data.text);
        console.log(message.data.uuid);
        var uuid = message.data.uuid;
        var text = message.data.text;

        // add the message to the chat UI
        var domContent = `<div class="chat-message"><b>${uuid}:</b> ${text}</div>`;
        chatLog.insertAdjacentHTML('beforeend', domContent);
        scrollBottom();
    }

    function sendMessage(e) {
        if (e.keyCode === 13  && !e.shiftKey) e.preventDefault();

        let focused = chatInput.matches(':focus');

        if (focused && e.keyCode === 13 && chatInput.value.length > 0) {
            var text = chatInput.value;
            ChatEngine.global.emit('message', {
                text: text,
                uuid: name
            });

            chatInput.value = '';
        }
    }

    // Add event listener for the textarea of the chat UI
    chatInput.addEventListener('keypress', sendMessage);


    //ChatEngine for guess word chat
    function scrollBottomGuessWord() {
        console.log("scrolling");
        guessWordChatLog.scrollTo(0, guessWordChatLog.scrollHeight);
    }

    function onMessageGuessWord(message) {
        console.log(message.data.text);
        var uuid = message.data.uuid;
        var text = message.data.text;

        // add the message to the chat UI
        var domContent = `<div class="chat-message"><b>${uuid}:</b> ${text}</div>`;
        guessWordChatLog.insertAdjacentHTML('beforeend', domContent);
        scrollBottomGuessWord();

        if(tries > 0 && text === choosenWord){
            console.log("Word was guessed!");
            if(turn !== mySign.sign){
                mySign.score += 1;
                score.innerHTML = `My Score: ${mySign.score}`;    
            }
            if(turn === mySign.sign){
                totalScore++;
                console.log(`Opp. score: ${totalScore}`);
                otherScore.innerHTML = `Opponent's Score: ${totalScore}`;      
            }
            turn = (turn === 'H') ? 'G' : 'H';
            nextRound();
        } 
        
        else if(tries === 1){
            console.log("You ran out of guesses!");
            // score.innerHTML = `Score: ${mySign.score}`;
            turn = (turn === 'H') ? 'G' : 'H';
            nextRound();
        }

        else{
            tries--;
            if(turn !== mySign.sign){
                triesLeft.innerHTML = `Tries Left: ${tries}`;
            }
        }        
    }

    function sendMessageGuessWord(e) {
        if (e.keyCode === 13  && !e.shiftKey) e.preventDefault();

        let focused = guessWordInput.matches(':focus');

        if (focused && e.keyCode === 13 && guessWordInput.value.length > 0) {
            if(turn === mySign.sign){
                window.alert("It's your turn to draw. Only other player can guess the word.");
                return;
            }
            var text = guessWordInput.value;
            GuessWordChatEngine.global.emit('message', {
                text: text,
                uuid: name
            });

            guessWordInput.value = '';          
        }
    }

    // Add event listener for the textarea of the chat UI
    guessWordInput.addEventListener('keypress', sendMessageGuessWord);

})();


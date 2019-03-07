(function() {
    const words = ['bear', 'cat', 'dog', 'car', 'house', 'pickle', 'glasses', 'tiger', 'panda', 'glue', 'bunny', 'skull', 'flower', 'bee', 'elmo', 'kermit', 'goldfish', 'heart', 'lion', 'butterfly', 'pumpkin', 'snowman', 'guitar', 'owl', 'batman', 'dragon', 'pigeon', 'starfish', 'cupcake'];
    
    //Host gets sign of 'H' and Guest gets sign of 'G'
    const mySign = { 
        sign: '',
        score: 0
    }   

    let choosenWord = '';
    let totalScore = 0;
    let turn =  'H';
    let tries = 3; // Each player gets 3 tries to guess the word
    let player = ''; // Player is either 'Host' or 'Guest'
    let winner = '';
    let numOfPlayers = 0;

    function $(id) { 
        return document.getElementById(id); 
    }   

    let chatLog =  $('chatLog'), chatInput = $('chatInput'), guessWordChatLog =  $('guessWordChatLog'), guessWordInput = $('guessWordChatInput'), clearCanvasButton = $('clearCanvasButton'), score = $('score'),        colorSwatch = $('colorSwatch'), triesLeft = $('triesLeft'), guessWord = $('guessWord'),                opponentScore = $('opponentScore');

	// PubNub
    let channel = 'guessWord';
    let newUUID = PubNub.generateUUID();
    let isHost = false;

    let pubnubGuessGame = new PubNub({
        uuid: newUUID,
        publish_key: 'pub-c-0eaf7fdd-cf5d-42f6-bee8-de40fe3b83a8',
        subscribe_key: 'sub-c-3084ee5c-3a30-11e9-82f9-d2a672cc1cb7',
        ssl: true
    });

    //Main Chat
    let ChatEngine = ChatEngineCore.create({
        publishKey: 'pub-c-e7a955d5-a869-4d78-b25a-d5f9d72aad6a',
        subscribeKey: 'sub-c-be7320d0-3be8-11e9-82f9-d2a672cc1cb7'
    }, {
        globalChannel: [channel]
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
        globalChannel: [channel]
    });

    GuessWordChatEngine.on('$.ready', function(data) {
        GuessWordChatEngine.global.on('message', onMessageGuessWord);
    });

    listener = {
        message: function(msg) {
            if(msg){
                // only show word to player whose turn it is to draw
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
            if (response.action === 'join') {
                console.log("join");
                numOfPlayers++;
                console.log(numOfPlayers);
                if(response.occupancy < 2){
                    console.log(response.occupancy);
                    player = 'Host';
                    mySign.sign = 'H';
                    isHost = true;
                    guessWord.innerHTML = 'You are the Host. Waiting for opponent...';
                }

                else if(response.occupancy === 2){
                    console.log(response.occupancy);
                    numOfPlayers++;
                    console.log(numOfPlayers);
                    if(!isHost){
                        player = 'Guest';
                        mySign.sign = 'G'; 
                    }

                    let client = {
                        uuid: player,
                        player: player
                    };
                
                    ChatEngine.connect(client.uuid, client);
                    GuessWordChatEngine.connect(client.uuid, client); 

                    score.innerHTML = `My Score: ${mySign.score}`;
                    opponentScore.innerHTML = `Opponent's Score: ${totalScore}`;

                    // Host draws first
                    if(turn !== mySign.sign) {                   
                        guessWord.innerHTML = `Guess the drawing!`;
                        triesLeft.innerHTML = `Tries Left: ${tries}`;  
                    }
                    else{
                      startGame();  
                    }                    
                }

                // else if(response.occupancy > 2){ 
                //     console.log(response.occupancy);
                //     alert('Game already in progress');
                // }
            }

            if(response.action === 'leave') {
                console.log("leaving");
                unsubscribeFromGame();
            }
        }, 
        status: function(event) {
            if (event.category == 'PNConnectedCategory') {
                if(numOfPlayers === 2){
                    alert('Game already in progress');
                }
                else{
                    console.log("set up canvas");
                    setUpCanvas();                    
                }
            }
        }   
    }

    pubnubGuessGame.addListener(listener);

    pubnubGuessGame.subscribe({
		channels: [channel],
        withPresence: true
    });

    function publish(data) {
		pubnubGuessGame.publish({
			channel: channel,
			message: data
		});
     }

    function unsubscribeFromGame(){
        // Player left before game ended
        if(winner === ''){
            guessWord.innerHTML = 'Player left the game!';
        }

        pubnubGuessGame.removeListener(listener);
        pubnubGuessGame.unsubscribe({
            channels: [channel]
        });

        ChatEngine.disconnect();
        GuessWordChatEngine.disconnect();
     }

    let canvas = $('drawCanvas');
    let ctx = canvas.getContext('2d');
    let color = document.querySelector(':checked').getAttribute('data-color');

    let isActive = false;
    let plots = [];
    let clearTheCanvas = false;
    let isTouchSupported = 'ontouchstart' in window;

    let isPointerSupported = navigator.pointerEnabled;
    let isMSPointerSupported =  navigator.msPointerEnabled;
    
    let downEvent = isTouchSupported ? 'touchstart' : (isPointerSupported ? 'pointerdown' : (isMSPointerSupported ? 'MSPointerDown' : 'mousedown'));
    let moveEvent = isTouchSupported ? 'touchmove' : (isPointerSupported ? 'pointermove' : (isMSPointerSupported ? 'MSPointerMove' : 'mousemove'));
    let upEvent = isTouchSupported ? 'touchend' : (isPointerSupported ? 'pointerup' : (isMSPointerSupported ? 'MSPointerUp' : 'mouseup'));

    function setUpCanvas(){
        ctx.fillStyle = 'WHITE';
        ctx.fillRect(20,20,window.innerWidth, window.innerHeight);
        ctx.strokeStyle = color;
        ctx.lineWidth = '3';
        ctx.lineCap = ctx.lineJoin = 'round';        
    }
    
    function clearCanvas(){
        ctx.fillStyle = 'WHITE';
        ctx.clearRect(0,0,window.innerWidth, window.innerHeight);
        ctx.fillRect(20,20,window.innerWidth, window.innerHeight);     
    }

    function nextRound(){
        if(totalScore === 2 || mySign.score === 2){
            winner = (turn === 'H') ? ('Host won!') : ('Guest won!');
            guessWord.innerHTML = winner;
            unsubscribeFromGame();
            return;
        }

        clearCanvas();
        guessWordChatLog.innerHTML = '';
        tries = 3;

        // Other player's turn to draw a word
        if(turn !== mySign.sign) {
            guessWord.innerHTML = `Guess the drawing!`;
            triesLeft.innerHTML = `Tries Left: ${tries}`;
            canvas.removeEventListener(downEvent, startDraw, false);
            canvas.removeEventListener(moveEvent, draw, false);
            canvas.removeEventListener(upEvent, endDraw, false);    
            clearCanvasButton.removeEventListener('click', clearButton, false);
        }

        else{
            // Player drawing does not guess word
            guessWord.innerHTML = '';
            triesLeft.innerHTML = '';
            startGame();            
        }
    }

    function startGame(){
        // Choose a random word from array, then remove that word
        let chooseIndex = Math.floor(Math.random() * words.length);
        choosenWord = words[chooseIndex];
        words.splice(chooseIndex,1);
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

   // Draw on other player's canvas
    function drawFromStream(m) {
        if(!m || m.plots.length < 1) return;
		drawOnCanvas(m.color, m.plots);
    }

    function drawOnCanvas(color, plots) {
    	ctx.strokeStyle = color;
		ctx.beginPath();
		ctx.moveTo(plots[0].x, plots[0].y);

    	for(let i=1; i<plots.length; i++) {
	    	ctx.lineTo(plots[i].x, plots[i].y);
	    }
	    ctx.stroke();
    }

	function draw(e) {
        // prevent continuous touch event process e.g. scrolling!
		e.preventDefault(); 
	  	if(!isActive) return;

    	let x = isTouchSupported ? (e.targetTouches[0].pageX - canvas.offsetLeft) : (e.offsetX || e.layerX - canvas.offsetLeft);
    	let y = isTouchSupported ? (e.targetTouches[0].pageY - canvas.offsetTop) : (e.offsetY || e.layerY - canvas.offsetTop);

        // round numbers for touch screens
    	plots.push({x: (x << 0), y: (y << 0)}); 

    	drawOnCanvas(color, plots);
	}
	
	function startDraw(e) {
        e.preventDefault();
	  	isActive = true;
	}
	
	function endDraw(e) {
	  	e.preventDefault();
        isActive = false;
          
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


    //ChatEngine for the main chat
    function onMessage(message) {
        // add the message to the chat UI
        let uuid = message.data.uuid;
        let text = message.data.text;
        let domContent = `<div class='chat-message'><b>${uuid}:</b> ${text}</div>`;
        chatLog.insertAdjacentHTML('beforeend', domContent);
        chatLog.scrollTo(0, chatLog.scrollHeight);
    }

    function sendMessage(e) {
        if (e.keyCode === 13  && !e.shiftKey) e.preventDefault();

        let focussed = chatInput.matches(':focus');
        if (focussed && e.keyCode === 13 && chatInput.value.length > 0) {
            let text = chatInput.value;
            ChatEngine.global.emit('message', {
                text: text,
                uuid: player
            });

            chatInput.value = '';
        }
    }

    // Add event listener for the textarea of the chat UI
    chatInput.addEventListener('keypress', sendMessage);


    function switchTurns(){
        turn = (turn === 'H') ? 'G' : 'H';
        nextRound();
    }

    //ChatEngine for the guess word chat
    function onMessageGuessWord(message) {
        let uuid = message.data.uuid;
        let text = message.data.text;
        let domContent = `<div class='chat-message'><b>${uuid}:</b> ${text}</div>`;
        guessWordChatLog.insertAdjacentHTML('beforeend', domContent);
        guessWordChatLog.scrollTo(0, guessWordChatLog.scrollHeight);

        // Check if word was guessed
        if(tries > 0 && text === choosenWord){
            // Give a point to player that guessed the word
            if(turn !== mySign.sign){
                mySign.score += 1;
                score.innerHTML = `My Score: ${mySign.score}`;    
            }
            // Increment score of opponent
            else if(turn === mySign.sign){
                totalScore++;
                opponentScore.innerHTML = `Opponent's Score: ${totalScore}`;      
            }

            switchTurns();
        } 
        
        // Player did not guess the word
        else if(tries === 1){
            switchTurns();
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
                window.alert('It is your turn to draw. Only other player can guess the word.');
                return;
            }
            let text = guessWordInput.value;
            GuessWordChatEngine.global.emit('message', {
                text: text,
                uuid: player
            });

            guessWordInput.value = '';          
        }
    }

    guessWordInput.addEventListener('keypress', sendMessageGuessWord);

})();

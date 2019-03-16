function gameStart(pubnubGuessGame, ChatEngine, GuessWordChatEngine, game, player){
    // Random word will be chosen from the array for player to draw
    const words = ['bear', 'cat', 'dog', 'car', 'house', 'pickle', 'glasses', 'tiger', 'panda', 'glue', 'bunny', 'skull', 'flower',
		   'bee', 'elmo', 'kermit', 'goldfish', 'heart', 'lion', 'butterfly', 'pumpkin', 'snowman', 'guitar', 'owl', 'batman',
		   'dragon', 'pigeon', 'starfish', 'cupcake'];
    
    let chosenWord = '';
    let totalScore = 0;
    let turn =  'H';
    let tries = 3; // Each player gets 3 tries to guess the word
    let winner = '';

    function $(id) { 
        return document.getElementById(id); 
    }   

    let chatLog =  $('chatLog'), chatInput = $('chatInput'), guessWordChatLog =  $('guessWordChatLog'), guessWordInput = $('guessWordChatInput'), 
    clearCanvasButton = $('clearCanvasButton'), score = $('score'), colorSwatch = $('colorSwatch'), triesLeft = $('triesLeft'), 
    guessWord = $('guessWord'), opponentScore = $('opponentScore');

    ChatEngine.on('$.ready', function(data) {
        // Every time a message is recieved from PubNub, render it.
        ChatEngine.global.on('message', onMessage);
    });

    GuessWordChatEngine.on('$.ready', function(data) {
        GuessWordChatEngine.global.on('message', onMessageGuessWord);
    });

    gameListener = {
        message: function(msg) {
            if(msg){
                if(turn !== player.sign && msg.message.chosenWord){
                    chosenWord = msg.message.chosenWord;
                }

                //only draw on other player's canvas
                if(turn !== player.sign && msg.message.plots){
                    drawFromStream(msg.message);         
                }

                if(msg.message.clearTheCanvas){
                    clearCanvas();
                }
            }    
        },
        presence: function(response) {
           if(response.action === 'leave'){
            guessWord.innerHTML = 'Player has left the game. You won!';
            unsubscribeFromGame();
           }
        },
        status: function(event) {
            if (event.category == 'PNConnectedCategory') {
                startGame();
            } 
        }     
    }

    pubnubGuessGame.addListener(gameListener);

    pubnubGuessGame.subscribe({
	channels: [game],
        withPresence: true
    });


    function publish(data) {
	pubnubGuessGame.publish({
	     channel: game,
	     message: data
	});
     }

    function unsubscribeFromGame(){
        pubnubGuessGame.removeListener(gameListener);
        // Unsubscribe from game channel
        pubnubGuessGame.unsubscribe({
            channels: [game]
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
    
    function clearCanvas(){
        ctx.fillStyle = 'WHITE';
        ctx.clearRect(0,0,window.innerWidth, window.innerHeight);
        ctx.fillRect(20,20,window.innerWidth, window.innerHeight);     
    }

    function nextRound(){
        // Winning score is set to 3, but can be changed to any number
        if(totalScore === 3 || player.score === 3){
            winner = (turn === 'H') ? ('Host won!') : ('Guest won!');
            triesLeft.innerHTML = '';
            guessWord.innerHTML = winner;
            unsubscribeFromGame();
            return;
        }

        clearCanvas();
        guessWordChatLog.innerHTML = '';
        tries = 3;

        // Other players turn to guess the drawing
        if(turn !== player.sign) {
            guessWord.innerHTML = `Guess the drawing!`;
            triesLeft.innerHTML = `Tries Left: ${tries}`;
            canvas.removeEventListener(downEvent, startDraw, false);
            canvas.removeEventListener(moveEvent, draw, false);
            canvas.removeEventListener(upEvent, endDraw, false);    
            clearCanvasButton.removeEventListener('click', clearButton, false);
        }

        else{
            guessWord.innerHTML = '';
            triesLeft.innerHTML = '';
            startGame();            
        }
    }

    function startGame(){
        // Player guessing word cannot draw on canvas
        if(turn !== player.sign){
            return;
    	}

        // Choose a random word from array, then remove that word
        let chooseIndex = Math.floor(Math.random() * words.length);
        chosenWord = words[chooseIndex];
        words.splice(chooseIndex,1);
        // only show word to player whose turn it is to draw
        guessWord.innerHTML = `Draw the word: ${chosenWord}`;

        publish({
            chosenWord: chosenWord
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
                uuid: player.name
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
        if(tries > 0 && text === chosenWord){
            // Give a point to player that guessed the word
            if(turn !== player.sign){
                player.score += 1;
                score.innerHTML = `My Score: ${player.score}`;    
            }
            // Increment score of opponent
            else if(turn === player.sign){
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
            // Decrement number of tries left
            tries--;
            if(turn !== player.sign){
                triesLeft.innerHTML = `Tries Left: ${tries}`;
            }
        }        
    }

    function sendMessageGuessWord(e) {
        if (e.keyCode === 13  && !e.shiftKey) e.preventDefault();

        let focused = guessWordInput.matches(':focus');
        if (focused && e.keyCode === 13 && guessWordInput.value.length > 0) {
            if(turn === player.sign){
                window.alert('It is your turn to draw!');
                return;
            }

            let text = guessWordInput.value;
            GuessWordChatEngine.global.emit('message', {
                text: text,
                uuid: player.name
            });

            guessWordInput.value = '';          
        }
    }

    guessWordInput.addEventListener('keypress', sendMessageGuessWord);
}

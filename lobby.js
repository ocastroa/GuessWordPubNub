// Player enters lobby name and game starts once two players are in the same lobby
(function() {
    const player = {
        name: '', // Player is either 'Host' or 'Guest'
        sign: '',
        score: 0
    }

    function $(id) { 
        return document.getElementById(id); 
    }   

    let score = $('score'), triesLeft = $('triesLeft'), guessWord = $('guessWord'), opponentScore = $('opponentScore');

    // PubNub
    let lobby = prompt("Enter name of lobby");
    let game = lobby; // game is the channel where the game takes places
    lobby = lobby + 'Lobby'; // separate channel for lobby
    const newUUID = PubNub.generateUUID();
    let isHost = false;
    let ChatEngine = '';
    let GuessWordChatEngine = '';

    const pubnubGuessGame = new PubNub({
        uuid: newUUID,
        publish_key: 'pub-c-0eaf7fdd-cf5d-42f6-bee8-de40fe3b83a8',
        subscribe_key: 'sub-c-3084ee5c-3a30-11e9-82f9-d2a672cc1cb7',
        ssl: true
    });

    listener = {
        presence: function(response) {
            if (response.action === 'join') {
                if(response.occupancy < 2){
                    // Check that game lobby is not full
                    pubnubGuessGame.hereNow({
                        channels: [game]
                    }, function(status, response){
                        // Unsubscribe if lobby is full
                        if(response.totalOccupancy >= 2){
                            guessWord.innerHTML = '';
                            window.alert("Lobby is full!");    
                            pubnubGuessGame.removeListener(listener);
                            pubnubGuessGame.unsubscribe({
                                channels: [lobby]
                            });           
                            return;             
                        }
                    }); 
                    // Player is the Host
                    player.name = 'Host';
                    player.sign = 'H';
                    isHost = true;
                    guessWord.innerHTML = 'You are the Host. Waiting for opponent...';
                }                    

                else if(response.occupancy === 2){
                    // Player is the Guest
                    if(!isHost){
                        player.name = 'Guest';
                        player.sign = 'G';
                        guessWord.innerHTML = `Guess the drawing!`;
                        triesLeft.innerHTML = "Tries Left: 3";
                    }

                    score.innerHTML = `My Score: ${player.score}`;
                    opponentScore.innerHTML = "Opponent's Score: 0";
                    
                    connectToChat();
                    // Unsubscribe fromm lobby channel
                    pubnubGuessGame.removeListener(listener); 
                    pubnubGuessGame.unsubscribe({
                        channels: [lobby]
                    });       
                    gameStart(pubnubGuessGame, ChatEngine, GuessWordChatEngine, lobby, game, player);               
                }
            }
        }, 
        status: function(event) {
            if (event.category == 'PNConnectedCategory') {
                setUpCanvas();
            } 
        }   
    }

    pubnubGuessGame.addListener(listener);

    pubnubGuessGame.subscribe({
        channels: [lobby],
        withPresence: true
    });

    function connectToChat(){
        //Main Chat
        ChatEngine = ChatEngineCore.create({
            publishKey: 'pub-c-e7a955d5-a869-4d78-b25a-d5f9d72aad6a',
            subscribeKey: 'sub-c-be7320d0-3be8-11e9-82f9-d2a672cc1cb7'
        }, {
            globalChannel: [game]
        });

        //Guess Word Chat
        GuessWordChatEngine = ChatEngineCore.create({
            publishKey: 'pub-c-72fbd257-fe52-43c3-a861-435c484e9f9e',
            subscribeKey: 'sub-c-f1cdfc38-3bf8-11e9-b86f-06e8d5f9a4fd'
        }, {
            globalChannel: [game]
        });

        const client = {
            uuid: player.name,
            player: player.name
        };

        ChatEngine.connect(client.uuid, client);
        GuessWordChatEngine.connect(client.uuid, client);         
    }

    let canvas = document.getElementById('drawCanvas');
    let ctx = canvas.getContext('2d');
    let color = document.querySelector(':checked').getAttribute('data-color');

    function setUpCanvas(){
        ctx.fillStyle = 'WHITE';
        ctx.fillRect(20,20,window.innerWidth, window.innerHeight);
        ctx.strokeStyle = color;
        ctx.lineWidth = '3';
        ctx.lineCap = ctx.lineJoin = 'round';        
    }
})();
   
  
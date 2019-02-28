(function() {
	/* PubNub */
    let channel = 'guessWord';
    let newUUID = PubNub.generateUUID();
    let hostUUID = ''
    let guestUUID = ''
    let player = 'Host'
    //console.log(`Your uuid is: ${newUUID}`);
    //console.log(`channel: ${channel}`);

    let pubnubGuessgame = new PubNub({
        uuid: newUUID,
        publish_key     : 'pub-c-0eaf7fdd-cf5d-42f6-bee8-de40fe3b83a8',
        subscribe_key   : 'sub-c-3084ee5c-3a30-11e9-82f9-d2a672cc1cb7',
        ssl		: true
    });

    pubnubGuessgame.addListener({
        message: function(msg) {
            if(msg){
                console.log("inside message function");
                console.log(msg.message);
                drawFromStream(msg.message);                  
            }    
        },
        presence: function(response) {
            // if(response.occupancy > 1){
            //     document.getElementById('unit').textContent = 'doodlers';
            // }
            // document.getElementById('occupancy').textContent = response.occupancy;

            if (response.action === "join") {
                if(response.occupancy < 2){
                    hostUUID = response.uuid;
                    console.log("Waiting for opponent");
                    console.log(`You are the ${player}`);
                    console.log("num of ppl: " + response.occupancy);
                    console.log(`Your uuid: ${hostUUID}`);
                }
                else if(response.occupancy === 2){
                    player = "Guest";
                    guestUUID = response.uuid;
                    console.log(`You are the ${player}`);
                    console.log(`Your uuid: ${guestUUID}`);
                }
                else if(response.occupancy > 2){
                    console.log("Game already has two players. Please wait your turn");
                }

                if(response.occupancy === 2){
                    console.log("num of ppl: " + response.occupancy);
                    console.log("Starting game...");
                    startGame();
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
    let isTouchSupported = 'ontouchstart' in window;

    function startGame(){
        //only current player, host first, draws while guest guesses word
        if(!hostUUID) return;

        document.getElementById('colorSwatch').addEventListener('click', function() {
            color = document.querySelector(':checked').getAttribute('data-color');
        }, false);
        
        var isPointerSupported = navigator.pointerEnabled;
        var isMSPointerSupported =  navigator.msPointerEnabled;
        
        var downEvent = isTouchSupported ? 'touchstart' : (isPointerSupported ? 'pointerdown' : (isMSPointerSupported ? 'MSPointerDown' : 'mousedown'));
        var moveEvent = isTouchSupported ? 'touchmove' : (isPointerSupported ? 'pointermove' : (isMSPointerSupported ? 'MSPointerMove' : 'mousemove'));
        var upEvent = isTouchSupported ? 'touchend' : (isPointerSupported ? 'pointerup' : (isMSPointerSupported ? 'MSPointerUp' : 'mouseup'));
                
        canvas.addEventListener(downEvent, startDraw, false);
        canvas.addEventListener(moveEvent, draw, false);
        canvas.addEventListener(upEvent, endDraw, false);    
    }

    function publish(data) {
		pubnubGuessgame.publish({
			channel: channel,
			message: data
		});
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
})();

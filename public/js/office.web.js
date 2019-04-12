$(() => {
  const enterRoom = $('[enter-room]');
  const matrixProfile = new MatrixProfile();

  if (matrixProfile.isProfileStored()) {
    enterInOffice(matrixProfile);
  } else {
    redirectToHome();
  }

  //set user name
  $("#userName").text("Whats'up " + matrixProfile.userName() + "!");

  const logoutButton = $('#btnLogout');

  logoutButton.on('click', (e) => {
    const auth2 = gapi.auth2.getAuthInstance();
    auth2.signOut().then(() => {
      matrixProfile.terminate();
      // Redirect
      window.location = '/';
    });
  });

  function removeUser(userId) {
    $(`#${userId}`).remove();
  }

  function showUserInRoom(user, room) {

    var userView = $(`#${user.id}`).length;
    if (userView == 0) {
      userView = $(`<div  id="${user.id}" class="thumbnail user-room"><img class="rounded-circle" style="margin:2px;display:flex;" user-id="${user.id}" title="${user.name}" width="50px" src="${user.imageUrl}"></div>`);
     } else {
       userView = $(`#${user.id}`).detach();
    }

    userInMeetDecorator(user,userView);
    userInRoomDecorator(user, room);
    addGetUserMenu(user,userView);

    $(`#${room}`).append(userView);
  }

  function addGetUserMenu(user,userView){
    if(user.id != matrixProfile.loadStoredProfile().id){
        userView.contextMenu({
            menuSelector: "#getUserMenu",
            menuSelected: function (invokedOn, selectedMenu) {
            //TODO: here we have to emit a event to notify the user  
            console.log($(invokedOn).attr("user-id"));
            alert("thanks to try get '"+$(invokedOn).attr("title")+"' this feature is coming soon :)")
          }
        });
    }  
  }

  function userInMeetDecorator(user,userView){

    var userMeetClass = "rounded-circle user-not-in-call user-room"
    
    if(user.inMeet!=undefined && user.inMeet){
      userMeetClass = "rounded-circle user-in-call user-room";
    }
    
    userView.attr("class",userMeetClass);  
  }

  function userInRoomDecorator(user, room) {
    if (user.id === matrixProfile.loadStoredProfile().id) {
      setDefaultRoomStyles();
      var roomElement = $(`#room_card-${room}`);
      roomElement.attr("class", "card active-room");
  
      var btnElement = $(`#room_btn_enter-${room}`);
      btnElement.attr("class", "card-link btn-enter-in-room-active float-left");
  
      var roomTitle = $(`#room_card_title-${room}`);
      roomTitle.attr("class", "room-title-active float-left");
    }
  }

  function setDefaultRoomStyles() {
    var oldRoom = $(".active-room");
    if (oldRoom.length > 0 ) {
      oldRoom.attr("class", "card room");
    }

    var btnEnterInRoom = $(".btn-enter-in-room-active");
    if (btnEnterInRoom.length > 0 ) {
      btnEnterInRoom.attr("class", "card-link btn-enter-in-room float-left");
    }

    var btnEnterInRoom = $(".room-title-active");
    if (btnEnterInRoom.length > 0 ) {
      btnEnterInRoom.attr("class", "room-title float-left");
    }
  }

  function redirectToHome() {
    window.location.href = './';
  }

  function getMeetingOptions(roomId) {
    return {
      roomName: roomId,
      width: "100%",
      height: "80%",
      parentNode: document.querySelector('#meet'),
      interfaceConfigOverwrite: { TOOLBAR_BUTTONS: [
          'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
          'fodeviceselection', 'hangup', 'profile', 
           'etherpad', 'sharedvideo', 'settings', 'raisehand',
          'videoquality', 'filmstrip',  'stats', 'shortcuts',
          'tileview'
          // 'chat', 'recording', 'livestreaming', 'invite', 'feedback',
      ]}
    };
  }

  function startVideoConference(roomId, name, socket){
  	const domain = 'meet.jit.si';
		const options = getMeetingOptions(roomId);
		api = new JitsiMeetExternalAPI(domain, options);
		api.executeCommand('displayName', matrixProfile.loadStoredProfile().name);
		api.executeCommand('avatarUrl', matrixProfile.loadStoredProfile().imageUrl);
		$("#exampleModalCenter").modal("show");
    
    socket.emit('start-meet', matrixProfile.loadStoredProfile().id);

		$("#exampleModalCenter").on("hidden.bs.modal", function () {
        socket.emit('left-meet', matrixProfile.loadStoredProfile().id);
   			api.dispose();
    });
    
    $('#exampleModalCenter').on('shown.bs.modal', function () {
      var modal = $(this);
      modal.find('.modal-title').text(name);
    });
  }

  function saveLastRoom(data) {
    localStorage.setItem(`last_room${data.user.id}`, data.room);
  }

  function notify(data, title) {
    const options = {
      icon: data.user.imageUrl,
    };

    if (Notification.permission !== 'granted') {
      Notification.requestPermission();
    } else {
      const n = new Notification(title, options);
    }
  }

   function getLastRoom(matrixProfile){
  	var lastRoom = localStorage.getItem(`last_room${matrixProfile.loadStoredProfile().id}`);
    if(lastRoom==null || lastRoom==undefined || lastRoom== "undefined"){
    	lastRoom = $($('[enter-room]')[0]).attr("room-id");
    }	
  }

  function getUrlRoom(){
  	var currentRoom = location.hash;
  	if(currentRoom==null || currentRoom==undefined){
  		return null;
  	}else{
  		return currentRoom.split("#")[1]
  	}
  }

  function enterInOffice(matrixProfile) {

    var currentRoom = getUrlRoom();
    if(currentRoom==null || currentRoom==undefined || currentRoom== "undefined"){
    	currentRoom = getLastRoom(matrixProfile);
    }
    // make connection
    const socket = io.connect(`${window.location.protocol}//${window.location.host}`, {
      query: `user=${matrixProfile.loadStoredProfileAsString()}${currentRoom ? `&room=${currentRoom}` : ''}`,
    });

    enterRoom.on('click', (e) => {
      const room = $(e.target).attr('room-id');
      const roomName = $(e.target).attr('room-name');
      const disableMeeting = new Boolean($(e.target).attr('room-disable-meeting'));
      socket.emit('enter-room', { room, user: matrixProfile.loadStoredProfile() });

      if (disableMeeting == true) return;

      setTimeout(() => {
        startVideoConference($(e.target).attr('room-id'), roomName, socket);
      }, 300);
    });

    socket.on('sync-office', (usersInRoom) => {
      for (var key in usersInRoom) {
        userInroom = usersInRoom[key];
        showUserInRoom(userInroom.user, userInroom.room);
      }
    });


    socket.on('start-meet', (data) => {
      showUserInRoom(data.user, data.room);  
    });

    socket.on('left-meet', (data) => {
      showUserInRoom(data.user, data.room);  
    });

    

    socket.on('enter-room', (data) => {
      console.log(data);
      saveLastRoom(data);
      showUserInRoom(data.user, data.room);

      const loggedUserId = JSON.parse(localStorage.getItem('user')).id;
      const loggedUserRoomId = localStorage.getItem(`last_room${loggedUserId}`);

      if (loggedUserRoomId == data.room && loggedUserId != data.user.id) {
        notify(data, `${data.user.name} entrou na sala`);
      }
    });

    socket.on('disconnect', (userId) => {
      console.log('disconnect',userId);
      removeUser(userId);
    });
  }
});


function onLoad() {
  gapi.load('auth2', () => {
    gapi.auth2.init();
  });
}
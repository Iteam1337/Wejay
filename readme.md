#Wejay Spotify App

This is the code behind the Wejay Spotify App.

To use this code you need to download the preview version of Spotify. Use this link:
http://developer.spotify.com/blog/archives/2012/01/12/new-spotify-api-preview-build-available/ 

Basic structure:

*index.html* - Main layout

*manifest.json* - Manifest json file for setting security, icon, name, descriptions etc for spotify




/Javascipt

*app.js* - Main code controlling the loading of rooms for starting page, login to facebook and initializing room.

*room.js* - RoomController, here is all code related to controlling the actual room. Only one room controller can be initialized per page and is usually stored in global var currentRoom

*hub.js* - CommunicationHub, here is all communication with both the node server and also the api.wejay.org

*autocomplete.js* - spotify controller for adding autocomplete spotify search for an input textbox

var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var mongo_client = require('mongodb').MongoClient;

// Port
var port = 3000;

// Mongo Connect
var url = 'mongodb://localhost:27017/chat_io';

app.use(express.static('public'));

users = [];
connections = [];

server.listen(process.env.PORT || port);
console.log('Server running on Port: ' + port)

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html')
});


mongo_client.connect(url, function(err, db){
    var message_collection = db.collection('message');

    io.sockets.on('connection', function(socket){
        connections.push(socket);
        console.log('Connected: %s sockets connected', connections.length);
        
        // Disconnect
        socket.on('disconnect', function(data){
            users.splice(users.indexOf(socket.username), 1);
            updateUsernames();
            connections.splice(connections.indexOf(socket), 1);
            console.log('Disconnected: %s sockets connected', connections.length);
        });
    
        // Send Message
        socket.on('send message', function(data){
            //console.log(data)
            io.sockets.emit('new message', { msg: data, user: socket.username });

            // Store Chat History
            message_collection.insertOne({ msg: data, user: socket.username }, function(err, res){
                console.log('Insert a document into the message collection')
            });
            
        });
        
        // Retrieve Chat History
        message_collection.find().toArray().then(function(docs){
            socket.emit('chat history', docs)
        });

        // New User
        socket.on('new user', function(data, callback){
            callback(true);
            socket.username = data;
            users.push(socket.username);
            updateUsernames();
        });
        
        function updateUsernames(){
            io.sockets.emit('get users', users);
        }
    });

});

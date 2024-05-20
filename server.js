//imports the Express framework
const express = require('express');

//import mysql module
const mysql = require('mysql');

//import body-parser module
const bodyParser = require('body-parser');

//creates an instance of the Express application
const app = express();

//for password hashing
const bcrypt = require('bcrypt');

// for session management
const session = require('express-session');

// Add middleware for parse incoming request body
app.use(bodyParser.urlencoded({ extended : false }));

// Add middleware for parse incoming data in JSON
app.use(bodyParser.json());

// Session setup
app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 60000 } // 1-minute session
}));

//Make MySQL Database Connection
//Change the 'database' value to the one with the data
var pool  = mysql.createPool({
  connectionLimit : 10,
  host : 'inf2003db-felixchang-67bf.g.aivencloud.com',
  port : '26780',
  user : 'web',
  password : 'web',
  database : 'test'
});

//Check MySQL Database Connection
pool.getConnection((error) => {
	console.log('MySQL Database is connected Successfully');
});

// Redirect to register page on first launch
app.get("/", (request, response) => {
    if (request.session.loggedin) {
        response.redirect("/index");
    } else {
        response.redirect("/frontpage");
    }
});

// Serve as main page
app.get("/frontpage", (request, response) => {
    response.sendFile(__dirname + "/frontpage.html");
});

// Serve registration page
app.get("/register", (request, response) => {
    response.sendFile(__dirname + "/register.html");
});

// Serve login page
app.get("/login", (request, response) => {
    response.sendFile(__dirname + "/login.html");
});

// Serve as admin login page
app.get("/admin", (request, response) => {
    response.sendFile(__dirname + "/admin.html");
});

// Serve as admin dashboard
app.get("/admindash", (request, response) => {
    response.sendFile(__dirname + "/admindash.html");
});


// Serve index page
app.get("/index", (request, response) => {
    if (request.session.loggedin) {
        response.sendFile(__dirname + "/index.html");
    } else {
        response.redirect("/login");
    }
});

// Register Route
app.post('/register', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    bcrypt.hash(password, 10, (err, hash) => {
        if (err) throw err;

        const sql = 'INSERT INTO users (username, password) VALUES (?, ?)';
        pool.query(sql, [username, hash], (error, results) => {
            if (error) {
                return res.json({ success: false, message: 'Registration failed', error });
            }
            res.json({ success: true, message: 'Registration successful' });
        });
    });
});

// Login Route
app.post('/login', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    const sql = 'SELECT * FROM users WHERE username = ?';
    pool.query(sql, [username], (error, results) => {
        if (error) throw error;

        if (results.length === 0) {
            return res.json({ success: false, message: 'User not found' });
        }

        const user = results[0];
        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) throw err;

            if (isMatch) {
                req.session.loggedin = true;
                req.session.username = username;
                res.json({ success: true, message: 'Login successful' });
            } else {
                res.json({ success: false, message: 'Password incorrect' });
            }
        });
    });
});

//Crate Route handle get request
app.get("/get_data", (request, response) => {
	const sql = 'SELECT * FROM games ORDER BY game_id ASC';

	pool.query(sql, (error, results) => {
		console.log(error);
		response.send(results);

	});
});

//Create Route for Insert Data Operation
app.post("/add_data", (request, response) => {

	const first_name = request.body.first_name;

	const last_name = request.body.last_name;

	const age = request.body.age;

	const sql = 'INSERT INTO sample_data (first_name, last_name, age) VALUES (?, ?, ?)';
    
	pool.query(sql, [first_name, last_name, age], (error, results) => {
		response.json({
			message : 'Data Added'
		});
	});

});

//Create Route for Update Data Operation
app.post('/update_data', (request, response) => {

	const variable_name = request.body.variable_name;

	const variable_value = request.body.variable_value;

	const id = request.body.id;

	const sql = `UPDATE sample_data SET `+variable_name+`= "${variable_value}" WHERE id = "${id}"`;
    console.log(sql);

	pool.query(sql, (error, results) => {
		response.json({
			message : 'Data Updated'
		});

	});

});

//Create Route for Delete data operation
app.post("/delete_data", (request, response) => {

	const id = request.body.id;

	const sql = `DELETE FROM sample_data WHERE id = '${id}'`;

	pool.query(sql, (error, results) => {
		response.json({
			message : 'Data Deleted'
		});
	});

});

app.listen(8080, () => {
	console.log('Server listening on port 8080');
});

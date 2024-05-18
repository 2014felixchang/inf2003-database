//imports the Express framework
const express = require('express');

//import mysql module
const mysql = require('mysql');

//import body-parser module
const bodyParser = require('body-parser');

//creates an instance of the Express application
const app = express();

// Add middleware for parse incoming request body
app.use(bodyParser.urlencoded({ extended : false }));

// Add middleware for parse incoming data in JSON
app.use(bodyParser.json());

//Make MySQL Database Connection
//Change the 'database' value to the one with the data
var pool  = mysql.createPool({
  connectionLimit : 10,
  host : 'inf2003db-felixchang-67bf.g.aivencloud.com',
  port : '26780',
  user : 'web',
  password : 'web',
  database : 'defaultdb'
});

//Check MySQL Database Connection
pool.getConnection((error) => {
	console.log('MySQL Database is connected Successfully');
});

//Create Route for Load index.html file
app.get("/", (request, response) => {
	response.sendFile(__dirname + "/index.html");
});

//Crate Route handle get request
app.get("/get_games", (request, response) => {
	const sql = "SELECT * FROM games_table WHERE name LIKE '%" + request.query.search + "%'";

	pool.query(sql, (error, results) => {
		console.log(error);
		response.send(results);

	});
});

//Create Route for Insert Data Operation
// app.post("/add_data", (request, response) => {

// 	const first_name = request.body.first_name;

// 	const last_name = request.body.last_name;

// 	const age = request.body.age;

// 	const sql = 'INSERT INTO sample_data (first_name, last_name, age) VALUES (?, ?, ?)';
    
// 	pool.query(sql, [first_name, last_name, age], (error, results) => {
// 		response.json({
// 			message : 'Data Added'
// 		});
// 	});

// });

//Create Route for Update Data Operation
// app.post('/update_data', (request, response) => {

// 	const variable_name = request.body.variable_name;

// 	const variable_value = request.body.variable_value;

// 	const id = request.body.id;

// 	const sql = `UPDATE sample_data SET `+variable_name+`= "${variable_value}" WHERE id = "${id}"`;
//     console.log(sql);

// 	pool.query(sql, (error, results) => {
// 		response.json({
// 			message : 'Data Updated'
// 		});

// 	});

// });

//Create Route for Delete data operation
// app.post("/delete_data", (request, response) => {

// 	const id = request.body.id;

// 	const sql = `DELETE FROM sample_data WHERE id = '${id}'`;

// 	pool.query(sql, (error, results) => {
// 		response.json({
// 			message : 'Data Deleted'
// 		});
// 	});

// });

app.listen(8080, () => {
	console.log('Server listening on port 8080');
});
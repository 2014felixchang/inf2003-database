// Imports
const express = require('express');
const path = require('path'); 
const mysql = require('mysql');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const session = require('express-session');

// Create an instance of the Express application
const app = express();

// Add middleware for parsing incoming request bodies
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Session setup
app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: false,
    //cookie: { maxAge: 60000 } // 1-minute session
}));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Make MySQL Database Connection
var pool = mysql.createPool({
  connectionLimit: 10,
  host: 'inf2003db-felixchang-67bf.g.aivencloud.com',
  port: '26780',
  user: 'web',
  password: 'web',
  database: 'test'
});

// Check MySQL Database Connection
pool.getConnection((error) => {
    if (error) throw error;
    console.log('MySQL Database is connected successfully');
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

app.get("/gameadd", (request, response) => {
    response.sendFile(__dirname + "/add_game.html");
});

app.get("/gamedelete", (request, response) => {
    response.sendFile(__dirname + "/delete_game.html");
});

// Serve as game info page
app.get("/game_info", (request, response) => {
    response.sendFile(__dirname + "/game_info.html");
});

// Serve as modification of game
app.get("/modify", (request, response) => {
    response.sendFile(__dirname + "/modify_game.html");
});

// Serve index page
app.get("/index", (request, response) => {
    if (request.session.loggedin) {
        response.sendFile(__dirname + "/index2.html");
    } else {
        response.redirect("/login");
    }
});

// Route to get platforms
app.get("/get_platforms", (req, res) => {
    const sql = "SELECT DISTINCT platform FROM games";
    pool.query(sql, (error, results) => {
        if (error) {
            console.error('Error fetching platforms:', error);
            res.status(500).json({ error: 'Error fetching platforms' });
        } else {
            const platforms = results.map(result => result.platform);
            res.json(platforms);
        }
    });
});

// Route to get publishers
app.get("/get_publishers", (req, res) => {
    const sql = "SELECT * FROM publishers";
    pool.query(sql, (error, results) => {
        if (error) {
            console.error('Error fetching publishers:', error);
            res.status(500).json({ error: 'Error fetching publishers' });
        } else {
            res.json(results);
        }
    });
});

// Route to get genres
app.get("/get_genres", (req, res) => {
    const sql = "SELECT * FROM genres";
    pool.query(sql, (error, results) => {
        if (error) {
            console.error('Error fetching genres:', error);
            res.status(500).json({ error: 'Error fetching genres' });
        } else {
            res.json(results);
        }
    });
});

// Register Route
app.post('/register', (req, res) => {
    const { username, password } = req.body;

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
    const { username, password } = req.body;

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
                req.session.user_id = user.id; // store user ID in session
                res.json({ success: true, message: 'Login successful' });
            } else {
                res.json({ success: false, message: 'Password incorrect' });
            }
        });
    });
});

// Logout Route
app.post('/logout', (req, res) => {
    console.log('Logout request received');
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.json({ success: false, message: 'Logout failed' });
        }
        res.json({ success: true, message: 'Logout successful' });
    });
});

// Check login status
app.get('/check-login-status', (req, res) => {
    if (req.session.loggedin) {
        res.json({ isLoggedIn: true });
    } else {
        res.json({ isLoggedIn: false });
    }
});

// Route to add game details
app.post('/gameadd', (req, res) => {
    const { name, year, platform, publisher, genre, na_sales, eu_sales, jp_sales, other_sales } = req.body;

    const sql = 'INSERT INTO games (name, year, platform, publisher_id, genre_id, na_sales, eu_sales, jp_sales, other_sales, global_sales) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    pool.query(sql, [name, year, platform, publisher, genre, na_sales, eu_sales, jp_sales, other_sales, (parseFloat(na_sales) + parseFloat(eu_sales) + parseFloat(jp_sales) + parseFloat(other_sales))], (error, results) => {
        if (error) {
            return res.json({ success: false, message: 'Failed to add game', error });
        }
        res.json({ success: true, message: 'Game added successfully' });
    });
});

// Route to get games based on search
app.get("/get_games", (request, response) => {
    const sql = "SELECT games.*, genres.genre_name FROM games JOIN genres ON games.genre_id = genres.genre_id WHERE games.name LIKE '%" + request.query.search + "%'";
    pool.query(sql, (error, results) => {
        if (error) console.log("Error: " + error);
        response.send(results);
    });
});

// Define a new route that accepts a filter parameter
app.get('/get_games_f', (req, res) => {
    // Get the filter parameter from the request query
    const filter = req.query.filter;
    const platform = req.query.platform;
    const genre = req.query.genre;

    let query = 'SELECT games.*, genres.genre_name FROM games JOIN genres ON games.genre_id = genres.genre_id WHERE 1=1';
    
    if (platform !== 'ALL') {
        query += ` AND games.platform = '${platform}'`;
    }
    if (genre !== 'ALL') {
        query += ` AND genres.genre_name = '${genre}'`;
    }
    if (filter === 'top10') {
        query += ' ORDER BY games.game_id LIMIT 10';
    }
    

    // Connect to the database and execute the query
    pool.query(query, (error, results) => {
        if (error) {
            console.log("Error: " + error);
        } else {
            // If everything went well, send the results
            res.send(results);
        }
    });
});

// Route to get game details
app.get("/open_game", (request, response) => {
    const sql = `SELECT g.game_id, g.name, g.year, g.platform, p.publisher_name as publisher, g2.genre_name as genre
        FROM games g, publishers p, genres g2
        WHERE g.publisher_id = p.publisher_id
        AND g.genre_id = g2.genre_id
        AND g.game_id = ?`;

    pool.query(sql, [request.query.id], (error, results) => {
        if (error) console.log("Error: " + error);
        response.send(results);
    });
});

// Route to retrieve reviews for a game
app.get("/get_reviews", (request, response) => {
    const gameId = request.query.gameid;
    const sql = "SELECT r.review_id, r.rating, r.comment, DATE_FORMAT(r.date, '%Y-%m-%d') as date, u.username, r.user_id FROM reviews r JOIN users u ON r.user_id = u.id WHERE r.game_id = ?";
    
    pool.query(sql, [gameId], (error, results) => {
        if (error) throw error;
        response.send(results);
    });
});

// Route to submit a new review
app.post("/add_review", (request, response) => {
    const { game_id, rating, comment } = request.body;
    const user_id = request.session.user_id; // assuming user_id is stored in session after login

    // Convert current time to Singapore time
    const currentUTC = new Date();
    const singaporeOffset = 8 * 60; // Singapore is UTC+8
    const singaporeTime = new Date(currentUTC.getTime() + (singaporeOffset * 60 * 1000));
    const date = singaporeTime.toISOString().split('T')[0]; // get current date in YYYY-MM-DD format

    const sql = "INSERT INTO reviews (user_id, game_id, rating, comment, date) VALUES (?, ?, ?, ?, ?)";
    pool.query(sql, [user_id, game_id, rating, comment, date], (error, results) => {
        if (error) throw error;
        response.json({ success: true, message: 'Review added successfully' });
    });
});



app.delete('/delete_game/:gameId', (req, res) => {
    const gameId = req.params.gameId;
    const sql = 'DELETE FROM games WHERE game_id = ?';
    connection.query(sql, [gameId], (error) => {
        if (error) {
            console.error('Error deleting game:', error);
            res.status(500).send('Error deleting game');
        } else {
            console.log('Game deleted successfully');
            res.status(200).send('Game deleted successfully yay');
        }
    });
});


// POST route to remove a review
app.post('/delete_review', async (req, res) => {
    //const requestData = JSON.parse(req.body);
    const reviewId = req.body.reviewId;
    const username = req.session.username;
   const review_username=req.body.reviewUsername;
    console.log(reviewId);
    console.log(review_username);

    console.log(username);

    try {
        if (username==review_username){
        const result = await pool.query('DELETE FROM reviews WHERE review_id = ? AND user_id = (SELECT id FROM users WHERE username = ?)', [reviewId, username]);
        res.status(200).json({ message: 'Review deleted successfully' });
        }
        else{
        res.status(200).json({ message: 'You have no rights to delete' });
        }


          
        
    
    } catch (error) {
        console.error('Error deleting review:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


// Start the server
app.listen(8080, () => {
    console.log('Server listening on port 8080');
});

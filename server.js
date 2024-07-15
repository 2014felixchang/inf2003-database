const express = require('express');
const path = require('path');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const session = require('express-session');
const { connectToMongoDB, getDB } = require('./mongodb');
const { ObjectId } = require('mongodb');

const app = express();

// Middleware for parsing incoming request bodies
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Session setup
app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: false,
}));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// MySQL Database Connection
const pool = mysql.createPool({
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

// Connect to MongoDB and Check Connection
connectToMongoDB();

// Middleware to log SQL queries
function logSqlQueries(req, res, next) {
    req.queryLogs = []; // Initialize an empty array to store query logs

    req.logQuery = (sql, values) => {
        const start = process.hrtime();
        pool.query(sql, values, (error, results) => {
            const elapsed = process.hrtime(start)[1] / 1000000; // divide by a million to get milliseconds
            const queryInfo = {
                sql: sql,
                values: values,
                executionTime: elapsed.toFixed(2) + ' ms',
                error: error ? error.message : null
            };
            req.queryLogs.push(queryInfo); // Store query info in request object
            console.log('SQL Query:', queryInfo);
            if (error) {
                console.error('SQL Error:', error);
            }
        });
    };
    next();
}

// Adding the middleware to log SQL queries
// Apply the middleware only to the routes that need SQL logging
app.use('/get_platforms', logSqlQueries);
app.use('/get_publishers', logSqlQueries);
app.use('/get_genres', logSqlQueries);
app.use('/register', logSqlQueries);
app.use('/login', logSqlQueries);
app.use('/edit_game', logSqlQueries);
app.use('/get_games', logSqlQueries);
app.use('/get_games_f', logSqlQueries);
app.use('/open_game', logSqlQueries);

// Function to check if a string is a valid ObjectId
function isValidObjectId(id) {
    return ObjectId.isValid(id) && (String(new ObjectId(id)) === id);
}

//--Routes--//
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
app.get("/admindash", isAdmin, (req, res) => {
    res.sendFile(__dirname + "/admindash.html");
});

app.get("/gameadd", isAdmin, (req, res) => {
    res.sendFile(__dirname + "/add_game.html");
});

app.get("/gamedelete", isAdmin, (req, res) => {
    res.sendFile(__dirname + "/delete_game.html");
});

app.get("/modify", isAdmin, (req, res) => {
    res.sendFile(__dirname + "/modify_game.html");
});

// Serve as game info page
app.get("/game_info", (request, response) => {
    response.sendFile(__dirname + "/game_info.html");
});

// Endpoint to fetch SQL performance data
app.get('/performance', (req, res) => {
    const performanceData = req.queryLogs;
    res.json(performanceData);
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
    req.logQuery(sql); // Logging the SQL query
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
    req.logQuery(sql); // Logging the SQL query
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
    req.logQuery(sql); // Logging the SQL query
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
        if (err) {
            console.error('Error hashing password:', err);
            return res.status(500).json({ success: false, message: 'Registration failed' });
        }

        const sql = 'INSERT INTO users (username, password) VALUES (?, ?)';
        req.logQuery(sql, [username, hash]); // Logging the SQL query
        pool.query(sql, [username, hash], (error, results) => {
            if (error) {
                console.error('Error inserting user:', error);
                if (error.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ success: false, message: 'Username already exists. Please try to login instead.' });
                }
                return res.status(500).json({ success: false, message: 'Registration failed' });
            }
            res.json({ success: true, message: 'Registration successful' });
        });
    });
});


// Login Route
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    const sql = 'SELECT * FROM users WHERE username = ?';
    req.logQuery(sql, [username]); // Logging the SQL query
    pool.query(sql, [username], (error, results) => {
        if (error) {
            console.error('Error fetching user:', error);
            return res.status(500).json({ success: false, message: 'Login failed' });
        }

        if (results.length === 0) {
            return res.json({ success: false, message: 'User not found' });
        }

        const user = results[0];
        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) {
                console.error('Error comparing passwords:', err);
                return res.status(500).json({ success: false, message: 'Login failed' });
            }

            if (isMatch) {
                req.session.loggedin = true;
                req.session.username = username;
                req.session.user_id = user.id;
                res.json({ success: true, message: 'Login successful' });
            } else {
                res.json({ success: false, message: 'Password incorrect' });
            }
        });
    });
});

// Admin Login Route
app.post('/admin-login', (req, res) => {
    const { username, password } = req.body;

    const adminUsername = 'admin'; // Default admin username
    const adminPassword = 'admin'; // Default admin password

    if (username === adminUsername && password === adminPassword) {
        req.session.loggedin = true;
        req.session.isAdmin = true; // Mark session as admin
        res.json({ success: true, message: 'Admin login successful' });
    } else {
        res.json({ success: false, message: 'Invalid username or password' });
    }
});


function isAdmin(req, res, next) {
    if (req.session.loggedin && req.session.isAdmin) {
        next(); // Proceed to the next middleware or route handler
    } else {
        res.redirect('/admin');
    }
}

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
app.post('/gameadd', isAdmin, (req, res) => {
    const { name, year, platform, publisher, genre, na_sales, eu_sales, jp_sales, other_sales } = req.body;

    // Construct the SQL query to check for duplicates
    const sqlCheckDuplicate = `
        SELECT *
        FROM games
        WHERE name = ? AND year = ? AND platform = ? AND publisher_id = ? AND genre_id = ?
          AND na_sales = ? AND eu_sales = ? AND jp_sales = ? AND other_sales = ?
    `;

    // Execute the query to check for duplicates
    pool.query(sqlCheckDuplicate, [name, year, platform, publisher, genre, na_sales, eu_sales, jp_sales, other_sales], (error, results) => {
        if (error) {
            console.error('Error checking duplicate game:', error);
            return res.json({ success: false, message: 'Failed to add game' });
        }

        // If a game with the same details already exists, return an error
        if (results.length > 0) {
            return res.json({ success: false, message: 'A game with the same details already exists' });
        }

        // If no duplicate is found, proceed to insert the game into the database
        const sqlInsertGame = `
            INSERT INTO games (name, year, platform, publisher_id, genre_id, na_sales, eu_sales, jp_sales, other_sales, global_sales)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        // Calculate global sales (sum of regional sales)
        const global_sales = parseFloat(na_sales) + parseFloat(eu_sales) + parseFloat(jp_sales) + parseFloat(other_sales);

        // Execute the insert query
        pool.query(sqlInsertGame, [name, year, platform, publisher, genre, na_sales, eu_sales, jp_sales, other_sales, global_sales], (error, results) => {
            if (error) {
                console.error('Error adding game:', error);
                return res.json({ success: false, message: 'Failed to add game' });
            }
            res.json({ success: true, message: 'Game added successfully' });
        });
    });
});


// POST route to edit game details
app.post("/edit_game", (request, response) => {
    const { gameId, name, year, platform_Name, publisher_id, genre_id } = request.body;

    const sql = `UPDATE games
                 SET name = ?, year = ?, platform = ?, publisher_id = ?, genre_id = ?
                 WHERE game_id = ?`;
    request.logQuery(sql, [name, year, platform_Name, publisher_id, genre_id, gameId]); // Logging the SQL query
    pool.query(sql, [name, year, platform_Name, publisher_id, genre_id, gameId], (error, results) => {
        if (error) {
            console.error("Error updating game details:", error);
            response.status(500).json({ message: "Failed to update game details" });
        } else {
            response.status(200).json({ message: "Game details updated successfully" });
        }
    });
});

// Route to get games based on search
app.get("/get_games", (request, response) => {
    const sql = "SELECT games.*, genres.genre_name FROM games JOIN genres ON games.genre_id = genres.genre_id WHERE games.name LIKE '%" + request.query.search + "%'";;
    request.logQuery(sql); // Logging the SQL query
    pool.query(sql, (error, results) => {
        if (error) {
            console.error("Error fetching games:", error);
            response.status(500).json({ message: "Failed to fetch games" });
        } else {
            response.send(results);
        }
    });
});

// Define a new route that accepts a filter parameter
app.get('/get_games_f', (req, res) => {
    // Get the filter parameter from the request query
    const filter = req.query.filter;
    const platform = req.query.platform;
    const genre = req.query.genre;
    const search = req.query.search;

    let query = 'SELECT games.*, genres.genre_name FROM games JOIN genres ON games.genre_id = genres.genre_id WHERE 1=1';
    
    if (platform !== 'ALL') {
        query += ` AND games.platform = '${platform}'`;
    }
    if (genre !== 'ALL') {
        query += ` AND genres.genre_name = '${genre}'`;
    }
    if (search) {
        query += ` AND games.name LIKE '%${search}%'`;
    }
    if (filter === 'top10') {
        query += ' ORDER BY games.game_id LIMIT 10';
    }

    req.logQuery(query); // Logging the SQL query
    pool.query(query, (error, results) => {
        if (error) {
            console.error("Error fetching filtered games:", error);
            res.status(500).json({ message: "Failed to fetch filtered games" });
        } else {
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
    
    request.logQuery(sql, [request.query.id]); // Logging the SQL query
    pool.query(sql, [request.query.id], (error, results) => {
        if (error) {
            console.error("Error fetching game details:", error);
            response.status(500).json({ message: "Failed to fetch game details" });
        } else {
            response.send(results);
        }
    });
});

// Route to retrieve reviews for a game
app.get("/get_reviews", async (request, response) => {
    const gameId = request.query.gameid;
    const sql = "SELECT r.review_id, r.rating, r.comment, DATE_FORMAT(r.date, '%Y-%m-%d') as date, u.username, r.user_id FROM reviews r JOIN users u ON r.user_id = u.id WHERE r.game_id = ?";
    
    pool.query(sql, [gameId], async (error, results) => {
        if (error) {
            console.error('Error fetching reviews:', error);
            return response.status(500).json({ message: 'Failed to fetch reviews' });
        }

        try {
            const db = getDB();
            const imagesCollection = db.collection('review_images');
            const reviewsWithImages = await Promise.all(results.map(async (review) => {
                let imageBase64 = null;
                try {
                    const reviewIdStr = review.review_id.toString().padStart(24, '0'); // Ensure it's 24 characters long
                    if (isValidObjectId(reviewIdStr)) {
                        const image = await imagesCollection.findOne({ review_id: new ObjectId(reviewIdStr) });
                        if (image) {
                            imageBase64 = image.image_base64;
                        }
                    }
                } catch (imageError) {
                    console.error('Error fetching image for review:', review.review_id, imageError);
                }
                return {
                    ...review,
                    image_base64: imageBase64
                };
            }));
            response.send(reviewsWithImages);
        } catch (error) {
            console.error('Error fetching review images:', error);
            response.status(500).json({ message: 'Failed to fetch review images' });
        }
    });
});

// Route to submit a new review
app.post("/add_review", (request, response) => {
    const { game_id, rating, comment, image_base64 } = request.body;
    const user_id = request.session.user_id; // assuming user_id is stored in session after login

    // Convert current time to Singapore time
    const currentUTC = new Date();
    const singaporeOffset = 8 * 60; // Singapore is UTC+8
    const singaporeTime = new Date(currentUTC.getTime() + (singaporeOffset * 60 * 1000));
    const date = singaporeTime.toISOString().split('T')[0]; // get current date in YYYY-MM-DD format
    const sql = "INSERT INTO reviews (user_id, game_id, rating, comment, date) VALUES (?, ?, ?, ?, ?)";

    pool.query(sql, [user_id, game_id, rating, comment, date], async (error, results) => {
        if (error) {
            console.error('Error adding review:', error);
            return response.status(500).json({ message: 'Failed to add review' });
        }

        if (image_base64) {
            const review_id = results.insertId.toString().padStart(24, '0'); // Ensure it's 24 characters long
            const newImage = {
                review_id: new ObjectId(review_id),
                image_base64,
            };

            try {
                const db = getDB();
                const imagesCollection = db.collection('review_images');
                await imagesCollection.insertOne(newImage);
                response.json({ success: true, message: 'Review and image added successfully' });
            } catch (error) {
                console.error('Error adding image to review:', error);
                response.status(500).json({ message: 'Review added but failed to add image' });
            }
        } else {
            response.json({ success: true, message: 'Review added successfully' });
        }
    });
});

// POST route to remove a review
app.post('/delete_review', async (req, res) => {
    const reviewId = req.body.reviewId;
    const username = req.session.username;
    const reviewUsername = req.body.reviewUsername;
    const isAdmin = req.session.isAdmin; // Check if the user is an admin

    const reviewIdStr = reviewId.toString().padStart(24, '0');
    if (!isValidObjectId(reviewIdStr)) {
        return res.status(400).json({ message: 'Invalid review ID format' });
    }

    try {
        if (isAdmin || username === reviewUsername) {
            await pool.query('DELETE FROM reviews WHERE review_id = ?', [reviewId]);
            const db = getDB();
            const imagesCollection = db.collection('review_images');
            await imagesCollection.deleteOne({ review_id: new ObjectId(reviewIdStr) });
            res.status(200).json({ message: 'Review and associated image deleted successfully' });
        } else {
            res.status(403).json({ message: 'You have no rights to delete this review' });
        }
    } catch (error) {
        console.error('Error deleting review:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// POST route to delete a game
app.post('/delete_game', async (req, res) => {
    const gameId = req.body.gameId;

    try {
        // Delete the game and associated reviews
        const deleteQuery = `
            DELETE games, reviews FROM games
            LEFT JOIN reviews ON games.game_id = reviews.game_id
            WHERE games.game_id = ?;
        `;
        await pool.query(deleteQuery, [gameId]);

        res.status(200).json({ message: 'Deleted successfully' });
    } catch (error) {
        console.error('Error deleting game and reviews:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Start the server
app.listen(8080, () => {
    console.log('Server listening on port 8080');
});

const express = require("express");

const app = express();

const bodyParser = require("body-parser")

let path = require("path");

const port = process.env.PORT || 3000;

const session = require("express-session")

// Connects static
app.use(express.static('public'));

// Session and parser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Use true if your app is served over HTTPS
        httpOnly: true,
    }
}));

// Use EJS
app.set("view engine", "ejs");

// index.ejs
    app.get("/", (req, res) => {
        // Check if the user is logged in
        const isLoggedIn = !!req.session.username;

        // Additional data to pass to the view if the user is logged in
        const extraData = {
            username: req.session.username,
            // Add more data as needed
        };

        // Render the index.ejs view and pass data
        res.render(path.join(__dirname + '/views/index.ejs'), { isLoggedIn, extraData });
    });


// login.ejs
    app.get("/login", (req, res) => {
        res.render(path.join(__dirname + '/views/login.ejs'));
    });

    app.post("/login", (req, res) => {
        console.log('Username:', req.body.username);
        console.log('Password:', req.body.password);

        // Check if user exists in the database
        if (req.session.username) {
            res.redirect('/search')
        } else if (req.body.username === 'admin' && req.body.password === 'password') {
            req.session.username = req.body.username;
            res.redirect('/search');
        } else {
            res.send('Invalid Credentials');
        }
    });

// Logout
    app.get("/logout", (req, res) => {
        // Destroy the session
        req.session.destroy(err => {
            if (err) {
                console.error("Error destroying session:", err);
                res.status(500).send("Internal Server Error");
            } else {
                // Redirect to the home page or any other page after logout
                res.redirect("/");
            }
        });
    });


// dashboard.ejs
    app.get("/dashboard", (req, res) => {
        res.render(path.join(__dirname + '/views/dashboard.ejs'));
    });

// search.ejs
app.get("/search", (req, res) => {
    console.log('Session:', req.session);

    if (req.session.username) {
        res.render(path.join(__dirname + '/views/search.ejs'));
    } else {
        res.redirect('/login');
    }
});

// blog.ejs (community)
    app.get("/community", (req, res) => {
        // Check if the user is logged in
        const isLoggedIn = !!req.session.username;

        // Additional data to pass to the view if the user is logged in
        const extraData = {
            username: req.session.username,
            // Add more data as needed
        };

        // Render the blog.ejs view and pass data
        res.render(path.join(__dirname + '/views/blog.ejs'), { isLoggedIn, extraData });
    });

// Survey
    app.get("/survey", (req, res) => {
        // Check if the user is logged in
        const isLoggedIn = !!req.session.username;

        // Additional data to pass to the view if the user is logged in
        const extraData = {
            username: req.session.username,
            // Add more data as needed
        };

        // Render the survey.ejs view and pass data
        res.render(path.join(__dirname + '/views/survey.ejs'), { isLoggedIn, extraData });
    });


    const knex = require("knex")({
        client: "pg",
        connection: {
            host: process.env.RDS_HOSTNAME || "localhost",
            user: process.env.RDS_USERNAME || "postgres",
            password: process.env.RDS_PASSWORD || "postgres",
            database: process.env.RDS_DB_NAME || "bucket_list",
            port: process.env.RDS_PORT || 5432,
            ssl: process.env.DB_SSL ? {rejectUnauthorized: false} : false
        }
    });

// Make sure server is listening
app.listen(port, () => console.log("I am listening"));

// Functions

function isAuthenticated(req, res, next) {
    if (req.session.username) {
        // User is authenticated, proceed to the next middleware or route handler
        next();
    } else {
        // User is not authenticated, redirect to the login page or handle accordingly
        res.redirect('/login');
    }
}

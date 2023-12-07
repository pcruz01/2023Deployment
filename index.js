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
            user_first_name: req.session.user_first_name,
            // Add more data as needed
        };

        // Render the index.ejs view and pass data
        res.render(path.join(__dirname + '/views/index.ejs'), { isLoggedIn, extraData });
    });

    app.post("/signup", (req, res) => {
        console.log("Body: ", req.body);
        const newUser = {
            username: req.body.newUsername,
            password: req.body.newPassword,
            user_first_name: req.body.firstName,
            user_last_name: req.body.lastName,
            email: req.body.email,
            admin_permission: false // Assuming new users don't have admin permission by default
        };
        console.log("New USer: ", newUser);

        knex('user_login')
            .insert(newUser)
            .then(() => {
                res.redirect('/');
            })
            .catch((error) => {
                if (error.routine === "_bt_check_unique") {
                    res.redirect('/');
                } else {
                    console.error('Error inserting new user account:', error);
                    res.status(500).send('Internal Server Error');
                }
            });
    });

// login.ejs
    app.get("/login", (req, res) => {
        res.render(path.join(__dirname + '/views/login.ejs'));
    });

    app.post("/login", (req, res) => {
        console.log('Username:', req.body.username);
        console.log('Password:', req.body.password);

        // Check if user exists in the database
        knex('user_login')
        .where({
          username: req.body.username,
          password: req.body.password,
          admin_permission: true
        })
        .select()
        .then((users) => {
            if (users.length > 0) {
                req.session.username = req.body.username;
                req.session.user_first_name = users[0].user_first_name;

                res.redirect('/search');
            } else {
                res.send('Invalid Credentials or Insufficient Permissions');
            }
        })
        .catch((error) => {
          console.error('Error querying the database:', error);
          res.status(500).send('Internal Server Error');
        });
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
        // Check if the user is logged in
        const isLoggedIn = !!req.session.username;

        // Additional data to pass to the view if the user is logged in
        const extraData = {
            username: req.session.username,
            // Add more data as needed
        };

        // Render the index.ejs view and pass data
        
        res.render(path.join(__dirname + '/views/dashboard.ejs'), { isLoggedIn, extraData });
    });

// search.ejs
app.get("/search", async (req, res) => {
    // Check if the user is logged in
    const isLoggedIn = !!req.session.username;

    // Additional data to pass to the view if the user is logged in
    const extraData = {
        username: req.session.username,
        user_first_name: req.session.user_first_name,
        // Add more data as needed
    };

    if (req.session.username) {
        // Get the data from the database
        const full_dataset = await get_full_data();

        // Save the full_dataset to sessionStorage
        req.session.personinfo = full_dataset;

        // Save the session before continuing
        req.session.save((err) => {
            if (err) {
                console.error("Error saving session:", err);
                res.status(500).send("Internal Server Error");
            } else {
                // Render the search.ejs view and pass data
                res.render(path.join(__dirname + '/views/search.ejs'), { isLoggedIn, extraData, personinfo: full_dataset });
            }
        });
    } else {
        res.redirect('/login');
    }
});

async function get_full_data() {
    try {
        const result = await knex('person_info as pi')
        .select('pi.*')
        .leftJoin(
            knex
            .select('eo.entry_id', 'o.organization')
            .from('entry_organization as eo')
            .innerJoin('organizations as o', 'eo.organization_id', 'o.organization_id')
            .as('organization_list'),
            'pi.entry_id',
            'organization_list.entry_id'
        )
        .leftJoin(
            knex
            .select('ep.entry_id', 'plat.platform')
            .from('entry_platform as ep')
            .innerJoin('platforms as plat', 'ep.platform_id', 'plat.platform_id')
            .as('platform_list'),
            'pi.entry_id',
            'platform_list.entry_id'
        )
        .groupBy('pi.entry_id')
        .orderBy('pi.entry_id')
        .select(
            knex.raw("string_agg(DISTINCT platform_list.platform, ', ') AS concatenated_platforms"),
            knex.raw("string_agg(DISTINCT organization_list.organization, ', ') AS concatenated_organizations")
        );

        //console.log(result);
        return result;

    } catch (error) {
        console.error(error);
    }
}

app.get("/accountmanage", async (req, res) => {
    // Check if the user is logged in
    const isLoggedIn = !!req.session.username;

    // Additional data to pass to the view if the user is logged in
    const extraData = {
        username: req.session.username,
        user_first_name: req.session.user_first_name,
        // Add more data as needed
    };

    if (req.session.username) {
        // Get the data from the database
        const result = await knex.select('*').from('user_login');

        
        // Save the session before continuing
        req.session.save((err) => {
            if (err) {
                console.error("Error saving session:", err);
                res.status(500).send("Internal Server Error");
            } else {
                // Render the search.ejs view and pass data
                res.render(path.join(__dirname + '/views/accountmanage.ejs'), { isLoggedIn, extraData, accounts: result, submitted: false });
            }
        });
    } else {
        res.redirect('/login');
    }
});

app.post("/accountmanage", async (req, res) => {
    console.log("Body in post: ", req.body);

    let usernames = Array.isArray(req.body.username) ? req.body.username : [req.body.username];
    let user_first_names = Array.isArray(req.body.firstName) ? req.body.firstName : [req.body.firstName];
    let user_last_names = Array.isArray(req.body.lastName) ? req.body.lastName : [req.body.lastName];
    let emails = Array.isArray(req.body.email) ? req.body.email : [req.body.email];
    let accessApproved = Array.isArray(req.body.accessApproved) ? req.body.accessApproved : [req.body.accessApproved];
    // Iterate through the submitted accounts
    for (let i = 0; i < usernames.length; i++) {
        const username = usernames[i];
        const access = accessApproved[i] == 1;

        console.log("Access: ", access, "Token: ", accessApproved[i], "On user: ", username);
        // Update the user_logins table with the submitted account information
        await knex('user_login')
            .where('username', username)
            .update({
                admin_permission: access
            });
    }

    // res.send("Accounts updated successfully");
    
    // Check if the user is logged in
    const isLoggedIn = !!req.session.username;

    // Additional data to pass to the view if the user is logged in
    const extraData = {
        username: req.session.username,
        user_first_name: req.session.user_first_name,
        // Add more data as needed
    };

    if (req.session.username) {
        // Get the data from the database
        const result = await knex.select('*').from('user_login');

        // Save the session before continuing
        req.session.save((err) => {
            if (err) {
                console.error("Error saving session:", err);
                res.status(500).send("Internal Server Error");
            } else {
                // Render the search.ejs view and pass data
                res.render(path.join(__dirname + '/views/accountmanage.ejs'), { isLoggedIn, extraData, accounts: result, submitted: true });
            }
        });
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
            user_first_name: req.session.user_first_name,
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
            user_first_name: req.session.user_first_name,
            // Add more data as needed
        };

        
        knex.select().from("platforms").then(platforms => {

            knex.select().from("organizations").then(organizations => {
                // Render the survey.ejs view and pass data
                res.render(path.join(__dirname + '/views/survey.ejs'), { 
                    isLoggedIn, 
                    extraData, 
                    myplatform: platforms,
                    myorganization: organizations 
                });
            });
        });        
    });


    const knex = require("knex")({
        client: "pg",
        connection: {
            host: process.env.RDS_HOSTNAME || "localhost",
            user: process.env.RDS_USERNAME || "postgres",
            password: process.env.RDS_PASSWORD || "IS403BYU",
            database: process.env.RDS_DB_NAME || "Provo_Mental_Health_Survey",
            port: process.env.RDS_PORT || 5432,
            ssl: process.env.DB_SSL ? {rejectUnauthorized: false} : false
        }
    });


    knex.raw('SELECT 1+1 as result')
    .then(() => {
        console.log('Database is connected');
    })
    .catch((err) => {
        console.error('Error connecting to the database:', err);
    })
    .finally(() => {
        // Ensure to destroy the database connection
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

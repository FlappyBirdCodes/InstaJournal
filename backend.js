const express = require("express");
const app = express();
const path = require('path');
const mongoose = require("mongoose");
const expbs = require("express-handlebars");

const PORT = process.env.PORT || 3000;

//Setting up express handlebars
app.engine("handlebars", expbs());
app.set("view engine", "handlebars");

//Connecting to mongodb database
mongoose.connect("mongodb://localhost/InstaJournalUsers", { useNewUrlParser: true, useUnifiedTopology: true });
const connection = mongoose.connection;
connection.once("open", () => {
    console.log("MongoDB database connection established successfully");
  });
mongoose.set('useFindAndModify', false);

//Setting up body parser
const bodyParser = require("body-parser");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded( { extended: true} ))

//Hosting html files
app.use(express.static(path.join(__dirname, "public")));

//Importing database schema from User.js
const User = require("./User");

app.get("/", (req, res) => {
    res.sendFile('public/index.html' , { root : __dirname});
})

app.get("/login", (req, res) => {
    res.sendFile('public/Login.html' , { root : __dirname});
})

app.get("/signup", (req, res) => {
    res.sendFile('public/SignUp.html' , { root : __dirname});
})

//Decoding the url to find the username
app.use(["/homepage/:username", "/settings/:username", "/posts/:username", "/:id/:username", "/:id/:username/delete"], (req, res, next) => {
    let decoded_username = Buffer.from(req.params.username, "base64");
    decoded_username = decoded_username.toString();
    decoded_username = decoded_username.replace(/\s/g, '');
    req.decoded_username = decoded_username;
    next();
});

//Finding user email and password when on settings page
app.use("/settings/:username", (req, res, next) => {
    User.find( {username: req.decoded_username}, (err, docs) => {
        if (docs.length == 1) {
            req.user_email = docs[0].email;
            req.user_password = docs[0].password;
        }
    })
    next();
})

//Checks if password is confirmed properly before continuing
app.use(["/SignUp", "/changeInfo"], (req, res, next) => {
    if (req.body.password == req.body.confirm_password) {
        req.confirmedPassword = true;
    } else {
        req.confirmedPassword = false;
    }
    next();
})

//Renders the user's home page
app.get("/homepage/:username", (req, res) => {
    User.find( {username: req.decoded_username}, (err, docs) => {
        if (docs.length == 1) {
            res.render("UserHomePage", {username: req.decoded_username, submit: "Submit"});
        } else {
            res.redirect("/deletionError");
        }
    })
});

//Renders the user's setting page
app.get("/settings/:username", (req, res) => {
    User.find( {username: req.decoded_username}, (err, docs) => {
        if (docs.length == 1) {
            res.render("Settings", {username: req.decoded_username, email: req.user_email, password: req.user_password});
        } else {
            res.redirect("/deletionError");
        }
    })
});

//Logs into user profile
app.post("/homepage/:username", (req, res) => {     
    User.findOne( { username : req.body.username.replace(/\s+/g, ''), password: req.body.password },
      (err, user) => {
        if (user) {
            res.render("UserHomePage", {username: req.body.username.replace(/\s+/g, ''), submit: "Submit"} );
        } else {
            res.redirect("/incorrectLogin");
        }
     })
});

//Adding user information to database
app.post("/SignUp", (req, res) => {

    //Checks if username or email is already in database
    let username = req.body.username;
    username = username.replace(/\s+/g, '');

    User.find({$or: [
        {username: username},
        {email: req.body.email}
    ]})
    .then(data => {
        //Username or email is already in database
        if (data.length != 0) {
            //Checks if username and email has been taken
            if (data[0].email == req.body.email && data[0].username == req.body.username) {
                res.redirect("/errorTaken");
            }
            //Checks if just the username has been taken
            else if (data[0].username == req.body.username) {
                res.redirect("/usernameTaken");
            } 
            //Checks if just the email has been taken
            else if (data[0].email == req.body.email) {
                res.redirect("/emailTaken");
            }
        } else {
            //Checks if password and password confirm are the same
            if (req.confirmedPassword) {
                //Creates a new user
                const newUser = new User({
                    username: username,
                    email: req.body.email,
                    password: req.body.password
                });
                //Saves the new user
                newUser.save()
                    .then(data => {
                        //Renders success page if passwords match
                        res.render("Message", { message: "Your sign up was successful", redirect: "Log in" });
                        console.log("Sign up was successful");
                    });
            } else {
                //Renders failure page if passwords don't match
                res.render("Message", { message: "Please confirm password correctly", redirect: "Try again" });
            }
        }
})});

//Adds new post to user database
app.post("/posts/:username", (req, res) => {
    const new_post = [ {title: req.body.title, date: req.body.date, post: req.body.post} ];
    User.findOneAndUpdate(
        { username: req.decoded_username }, 
        { $push: { posts: new_post } },
       (error, success) => {
             if (error) {
                 console.log(error);
             } else {
                let encoded_url = Buffer.from(req.decoded_username);
                encoded_url = encoded_url.toString('base64');
                res.redirect("/posts/" + encoded_url);
             }
         });
});

//Redirect to error pages
app.get("/incorrectLogin", (req, res) => res.render("Message", { message: "Incorrect username or password", redirect: "Try again" }));
app.get("/errorTaken", (req, res) => res.render("Message", { message: "Username and email has already been taken", redirect: "Try again"}));
app.get("/usernameTaken", (req, res) => res.render("Message", { message: "Username has already been taken", redirect: "Try again" }));
app.get("/emailTaken", (req, res) => res.render("Message", { message: "Email has already been taken", redirect: "Try again" }));
app.get("/deletionError", (req, res) => res.render("Error", {message: "Your previous data has already been deleted", error: "Please try logging in again with your new information"}));
app.get("/message", (req, res) => res.render("Message", { message: "Thank you for your message", redirect: "Home" }));
app.get("/error", (req, res) => res.render("Error", {message: "In Database Already", error: "This username or email has already been taken"}));

//Changes user info 
app.post("/changeInfo", (req, res) => {
    if (req.confirmedPassword) {

        let error = null;

        User.find( {$or: [{username: req.body.newUsername}, {email: req.body.newEmail}]}, (err, docs) => {

            if (docs.length == 0) {
                error = false;
            } else if (docs.length == 1) {
                if (req.body.newUsername.trim() == req.body.originalUsername.trim() || req.body.originalEmail.trim() == req.body.newEmail.trim()) {
                    error = false;
                } else {
                    error = true;
                }   
            } else if (docs.length > 1) {
                error = true;
            } 

            if (!error) {

                User.findOne({username: req.body.originalUsername.trim()}, (err, data) => {
                    if (data) {
                        data.username = req.body.newUsername.replace(/\s+/g, '');
                        data.email = req.body.newEmail;
                        data.password = req.body.password;
                        data.save();

                        let encoded = Buffer.from(data.username);
                        encoded = encoded.toString("base64");

                        res.redirect("/homepage/" + encoded);
                    } else {
                        res.redirect("/deletionError");
                    } 

                });

            } else {
                res.redirect("/error");
            }
        })

    } 

})

//Adds post to database 
app.get("/posts/:username", (req, res) => {

    User.findOne({username: req.decoded_username}, (err, docs) => {

        let posts = docs.posts;


        for (i = 0; i < posts.length; i++) {
            if (posts[i].post.length > 43) {
                posts[i].post = posts[i].post.substring(0, 43);
            }
            if (docs.posts[i].date.length > 15) {
                posts[i].date = posts[i].date.substring(0, 15);
            }
            if (docs.posts[i].title.length > 16) {
                posts[i].title = posts[i].title.substring(0, 16);
            }
        }
        
        let encodedUsername = Buffer.from(req.decoded_username);
        encodedUsername = encodedUsername.toString('base64');

        res.render("Posts", {posts: posts});
    })

});

//Renders posts page of the user
app.get("/:id/:username", (req, res) => {
    User.findOne({username: req.decoded_username}, (err, docs) => {
        const postInfo = docs.posts[req.params.id];
        res.render("UserHomePage", {username: req.decoded_username, title: postInfo.title, date: postInfo.date, post: postInfo.post, submit: "Edit"});
        
    })   
})

//Deletes post from database
app.get("/:id/:username/delete", (req, res) => {
    User.findOne({username: req.decoded_username}, (err, data) => {
        data.posts.splice(req.params.id, 1);
        data.save();
        res.redirect("/posts/" + req.params.username);
    })
})

//Allows user to edit their previous posts
app.post("/:id/:username", (req, res) => {
    User.findOne({username: req.decoded_username})
    .then(data => {
        if (data) {
            const updatedPost = {title: req.body.title, date: req.body.date, post: req.body.post};
            data.posts.splice(req.params.id, 1);
            data.posts.splice(req.params.id, 0, updatedPost);
            data.save();
            
            res.redirect("/posts/" + req.params.username);
        }
    }
)})

//Starts server listening on PORT 3000
app.listen(PORT, () => console.log("Listening on port 3000"));
# InstaJournal
This is my first ever full stack web application made with expressJS and mongoDB. The purpose of this application is to store the journals
of users, hence the name InstaJournal. Users can make an account and sign in. When the user is authenticated by the server, they will be
redirected to a rendered template of their homepage. This homepage is rendered with the express-handlebars library, meaning that the page
will be different for each user. 

Once the user is on their homepage, they can now make a journal. Once they have submited the journal, their request will be processed on the backend, saving their journal. The user can perform all sorts of different actions, such as creating a new journal, editing an existing journal or deleting a journal. When the user logs out, the database, hosted on the cloud with mongoDB, remains unchanged.

# Skills
This was my first time writing a server, so knowledge of HTTP requests and how they work was required. Addiitionally, I had to implement a database with mongoDB using the mongoose library in javascript. Additional knowledge of middleware and routers were necessary to minimize code output as well as keeping similar routes in different files. 

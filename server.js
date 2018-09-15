var express = require("express");
var mongojs = require("mongojs");
// Require request and cheerio. This makes the scraping possible
var logger = require("morgan");
var bodyParser = require("body-parser");
var request = require("request");
var axios = require("axios");
var mongoose = require("mongoose");
var cheerio = require("cheerio");
var handlebars = require("handlebars");

var databaseUrl = "CompSciScraperDb";
var collections = ["Articles"];

var db = mongojs(databaseUrl, collections);
db.on("error", function(error) {
  console.log("Database Error:", error);
});

// Require all models
var db = require("./models");

var PORT = 3000;

// Initialize Express
var app = express();

// Configure middleware

// Use morgan logger for logging requests
app.use(logger("dev"));
// Use body-parser for handling form submissions
app.use(bodyParser.urlencoded({ extended: true }));
// Use express.static to serve the public folder as a static directory
app.use(express.static("public"));

// Connect to the Mongo DB
var MONGODB_URI = process.env.MONGODB_URI;

//mongoose.connect("mongodb://localhost/CompSciParser", { useNewUrlParser: true });

mongoose.Promise = Promise;
mongoose.connect(MONGODB_URI);


app.get("/all", function(req, res) {
    // Find all results from the scrapedData collection in the db
    db.Article.find({}, function(error, found) {
      // Throw any errors to the console
      if (error) {
        console.log(error);
      }
      // If there are no errors, send the data to the browser as json
      else {
        res.json(found);
      }
    });
  });

  app.post("/submit", function(req, res) {
    console.log(req.body);
    // Insert the note into the notes collection
    db.notes.insert(req.body, function(error, saved) {
      // Log any errors
      if (error) {
        console.log(error);
      }
      else {
        // Otherwise, send the note back to the browser
        // This will fire off the success function of the ajax request
        res.send(saved);
      }
    });
  });

  app.get("/scrape", function(req, res){
    request("https://www.geeksforgeeks.org/data-structures/", function(error, response, html){
      var $ = cheerio.load(html);
      console.log("scraping!");
      $(".site-content ol li a").each(function(i, element){
          

        var result = {};

        result.title = $(element).text();

        result.link = $(element).attr("href");


        db.Article.create(result); 
      });
      $(".trendings_gfg a").each(function(i, element){
        var result = {};

        result.title = $(element).text();

        result.link = $(element).attr("href");

        db.Article.create(result); 
      });
    });
  });

  // Start the server
app.listen(PORT, function() {
  console.log("App running on port " + PORT + "!");
});

// Route for getting all Articles from the db
app.get("/articles", function(req, res) {
  // Grab every document in the Articles collection
  db.Article.find({})
    .then(function(dbArticle) {
      // If we were able to successfully find Articles, send them back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});


// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function(req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  db.Article.findOne({ _id: req.params.id })
    // ..and populate all of the notes associated with it
    .populate("note")
    .then(function(dbArticle) {
      // If we were able to successfully find an Article with the given id, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});


// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function(req, res) {
  // Create a new note and pass the req.body to the entry
  db.Note.create(req.body)
    .then(function(dbNote) {
      // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
      // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
      // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
      return db.Article.findOneAndUpdate({ _id: req.params.id }, { note: dbNote._id }, { new: true });
    })
    .then(function(dbArticle) {
      // If we were able to successfully update an Article, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});
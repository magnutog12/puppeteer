const express = require("express");
const { scrapePublicRecords } = require("./scrapeLogic");
const app = express();

const PORT = process.env.PORT || 4000;

// Add middleware to parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Update the route to accept name and city parameters
app.get("/scrape", (req, res) => {
    const { name, city } = req.query;
    if (!name || !city) {
        return res.status(400).send("Please provide both name and city parameters.");
    }
    scrapePublicRecords(name, city, res);
});

app.get("/", (req, res) => {
    res.send("Server Running");
});

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});
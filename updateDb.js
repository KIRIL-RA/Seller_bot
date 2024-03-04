const MongoClient = require("mongodb").MongoClient;
const Settings = require("./classes/settings/DBSettings.json");
const readline = require('readline');
const util = require('util');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
const question = util.promisify(rl.question).bind(rl);

const args = process.argv.slice(2); // Getting parameters from command line
const isConfirmed = Boolean(args[0]);

const servers = [
    {
        id: "kz-alm-1",
        code: "kz-alm",
        ip: "213.148.1.70",
        managerPort: 80,
        token: "pf1g02n`dns-gpnOO07qw2",
        ports: []
    }
]

const regions = [
    {
        name:"Алматы",
        country: "Казахстан",
        code: "kz-alm",
        dayCostRub: "2"
    }
]

// MAIN PROGRAM
Main();

async function Main() {
    // If update isn't confirmed
    if (!isConfirmed) {
        const userInput = await question("Are you really want to update datbase?[Y/N]: ")

        if (userInput != 'Y') {
            console.log('Aborted');
            process.exit();
            return;
        }
    }

    console.log("Starting updating");
    await UpdateDb();
    process.exit();
}

async function UpdateDb() {
    // Connecting to database
    const mongoClient = new MongoClient(Settings.CONNECTION_STRING);
    await mongoClient.connect();

    // Gettin all databases
    const dbs = await mongoClient.db().admin().listDatabases();

    // Check if the database exists
    const exists = dbs.databases.some(db => db.name === Settings.DB_NAME);

    // If database exist, deleting it 
    if (exists) {
        console.log("Database already exist, delete it");

        // Deleting database
        const datataBase = mongoClient.db(Settings.DB_NAME);
        await datataBase.dropDatabase();

        console.log("Database deleted");
    }

    // Creating new database
    const dataBase = mongoClient.db(Settings.DB_NAME);

    // Creating collections
    console.log("Creating collections");
    await dataBase.createCollection(Settings.USERS_COLLECTION);
    await dataBase.createCollection(Settings.SERVERS_COLLECTION);
    await dataBase.createCollection(Settings.REGIONS_COLLECTION);
    console.log("Colections created");

    // Adding data to collections
    console.log("Filling collections");
    await dataBase.collection(Settings.SERVERS_COLLECTION).insertMany(servers);
    await dataBase.collection(Settings.REGIONS_COLLECTION).insertMany(regions);
    mongoClient.close();
    console.log("Done");
    return;
}
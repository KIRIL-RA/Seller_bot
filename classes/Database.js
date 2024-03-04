const MongoClient = require("mongodb").MongoClient;
const Settings = require("./settings/DBSettings.json");

/**
 * Access to db information.
 */
class DBWork {
    constructor(url) {
        this.mongoClient = new MongoClient(url);
    }

    /**
     * Getting user from database
     * @param {*} userId 
     */
    async GetUser(userId){
        const datataBase = this.mongoClient.db(Settings.DB_NAME);
        const collection = datataBase.collection(Settings.USERS_COLLECTION);

        return await collection.findOne({userId: userId});
    }

    async AddUser(userInfo){
        const datataBase = this.mongoClient.db(Settings.DB_NAME);
        const collection = datataBase.collection(Settings.USERS_COLLECTION);

        await collection.insertOne(userInfo);
    }

    async UpdateUser(userId, newData){
        const datataBase = this.mongoClient.db(Settings.DB_NAME);
        const collection = datataBase.collection(Settings.USERS_COLLECTION);

        await collection.updateOne({userId: userId}, newData);
    }

    async GetUsers(){
        const datataBase = this.mongoClient.db(Settings.DB_NAME);
        const collection = datataBase.collection(Settings.USERS_COLLECTION);

        return await collection.find().toArray();
    }

    async GetAllConsultationRecords(){
        const datataBase = this.mongoClient.db(Settings.DB_NAME);
        const collection = datataBase.collection(Settings.CONSULTATION_RECORDS_COLLECTION);

        return await collection.find().toArray();
    }

    isConnected() {
        return !!this.mongoClient && !!this.mongoClient.topology && this.mongoClient.topology.isConnected();
    }

    /**
     * Open connection to database
     */
    async Connect() {
        if (!this.isConnected()) await this.mongoClient.connect();
    }

    /**
     * Close connection ro database
     */
    async CloseConnection() {
        await this.mongoClient.close();
    }
}

const DatabaseP = new DBWork(Settings.CONNECTION_STRING);
module.exports = { PlatformDatabase: DatabaseP, DBWork };
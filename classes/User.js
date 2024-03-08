const Stages = require('./settings/Stages.json');

class User{
    constructor(id, database){
       // if(id == undefined || id == null) throw new Error('id undefined');

        this.database = database;
        this.id = id;
        this.isLogined = false;
    }

    FormatUserData(dataRaw) {
        if (!CheckIsAllDataExist([dataRaw.chatId, dataRaw.stages, dataRaw.userName, dataRaw.city, dataRaw.age, dataRaw.contact, dataRaw.isPayed])) throw new Error("Not all data were recieved");
        this.chatId = dataRaw.chatId;
        this.stages = dataRaw.stages;
        this.userName = dataRaw.userName;
        this.city = dataRaw.city;
        this.age = dataRaw.age;
        this.contact = dataRaw.contact;
        this.isPayed = dataRaw.isPayed;
        this.paymentId = dataRaw.paymentId;
        this.id = dataRaw.userId;
    }

    /**
     * Check that user exist and we can work with him
     * @param {any} userInfo (optional) You can set user info, and user wil be logind without using databse
     * @returns true or false
     */
    async Login(userInfo) {
        // Getting user info from databse
        if (userInfo == undefined || userInfo == null) userInfo = await this.database.GetUser(this.id);
        if (userInfo == undefined || userInfo == null) return false;

        // Processing user info
        this.FormatUserData(userInfo);
        this.isLogined = true;

        return true;
    }

    async LoginByPayId(id) {
        // Getting user info from databse
        let userInfo = await this.database.GetUserByPayId(id);
        if (userInfo == undefined || userInfo == null) return false;

        // Processing user info
        this.FormatUserData(userInfo);
        this.isLogined = true;

        return true;
    }

    async CreateNew(chatId, userName){
        if(await this.Login()) return;

        // Forming user info object
        const userInfo = {
            userName: userName,
            userId: this.id,
            chatId: chatId,
            stages: [Stages.WRITING_CITY],
            city: null,
            age: null,
            city: null,
            isPayed: false,
            contact: null,
            paymentId: null
        }

        console.log(userInfo);
        // Save user in database
        await this.database.AddUser(userInfo);
        this.FormatUserData(userInfo);
    }

    async SetStage(stage){
        await this.database.UpdateUser(this.id, {$push: {stages: stage}});
    }

    async SetCity(city){
        await this.database.UpdateUser(this.id, {$set: {city: city}});
    }

    async SetAge(age){
        await this.database.UpdateUser(this.id, {$set: {age: age}});
    }

    async SetContact(contact){
        await this.database.UpdateUser(this.id, {$set: {contact: contact}});
    }

    async SetPayed(){
        await this.database.UpdateUser(this.id, {$set: {isPayed: true}});
    }

    async SetPaymentId(id){
        await this.database.UpdateUser(this.id, {$set: {paymentId: id}});
    }
}

/** Check is all data exist
 * @param {Array} data 
 * @returns 
 */
function CheckIsAllDataExist(data) {
    let isExist = true;

    data.forEach(element => {
        if (!Array.isArray(element))
            if (element === undefined) isExist = false;
    });
    return isExist;
}

module.exports = User;
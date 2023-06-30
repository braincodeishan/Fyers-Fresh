const mongoose=require('mongoose');


const Myschema=new mongoose.Schema({
    authString:String,
    token:String,
})

const Data=new mongoose.model('Data',Myschema)

module.exports=Data;
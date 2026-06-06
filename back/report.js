const express = require("express");

const {
 GoogleGenerativeAI
} = require("@google/generative-ai");

const router = express.Router();

router.post("/", async(req,res)=>{

 try{

 const genAI =
 new GoogleGenerativeAI(
 process.env.GEMINI_API_KEY
 );

 const model =
 genAI.getGenerativeModel({
 model:"gemini-1.5-flash"
 });

 const {message} =
 req.body;

 const result =
 await model.generateContent(message);

 const response =
 result.response.text();

 res.json({
 response
 });

 }catch(err){

 res.status(500).json(err);

 }

});

module.exports = router;
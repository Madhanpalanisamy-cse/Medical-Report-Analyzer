const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../db");

const router = express.Router();

router.post("/register", async(req,res)=>{

 try{

 const {name,email,password} =
 req.body;

 const hash =
 await bcrypt.hash(password,10);

 db.query(
 "INSERT INTO users(name,email,password) VALUES(?,?,?)",
 [name,email,hash],
 (err,result)=>{

   if(err){
     return res.status(400).json(err);
   }

   res.json({
     success:true,
     message:"User Registered"
   });

 });

 }catch(err){
   res.status(500).json(err);
 }

});

router.post("/login",(req,res)=>{

 const {email,password} =
 req.body;

 db.query(
 "SELECT * FROM users WHERE email=?",
 [email],
 async(err,result)=>{

   if(result.length===0){
     return res.status(404).json({
       message:"User Not Found"
     });
   }

   const user = result[0];

   const valid =
   await bcrypt.compare(
     password,
     user.password
   );

   if(!valid){
     return res.status(401).json({
       message:"Wrong Password"
     });
   }

   const token =
   jwt.sign(
   {
     id:user.id,
     email:user.email
   },
   process.env.JWT_SECRET
   );

   res.json({
     token
   });

 });

});


module.exports = router;
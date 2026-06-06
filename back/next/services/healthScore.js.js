function calculateHealthScore(text){

 let score = 100;

 let risk = "Low";

 const lower =
 text.toLowerCase();

 if(lower.includes("diabetes")){
   score -= 20;
 }

 if(lower.includes("cholesterol")){
   score -= 15;
 }

 if(lower.includes("high blood pressure")){
   score -= 15;
 }

 if(score < 70){
   risk = "Medium";
 }

 if(score < 50){
   risk = "High";
 }

 return {
   score,
   risk
 };
}

module.exports =
calculateHealthScore;
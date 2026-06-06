async function uploadReport(){

 const file =
 document.getElementById(
 "reportFile"
 ).files[0];

 const formData =
 new FormData();

 formData.append(
 "report",
 file
 );

 const response =
 await fetch(
 "http://localhost:3000/api/report/upload",
 {
  method:"POST",
  body:formData
 }
 );

 const data =
 await response.json();

 document.querySelector(
 ".score-circle"
 ).innerHTML =
 data.healthScore;

}
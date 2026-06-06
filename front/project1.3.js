let generatedOtp = "";

const password =
document.getElementById("password");

const strengthBar =
document.querySelector(".strength-bar");

const strengthText =
document.getElementById("strengthText");

password.addEventListener("input",()=>{

const value = password.value;

if(value.length < 6){

strengthBar.style.width="30%";
strengthBar.style.background="red";
strengthText.innerText="Weak";

}
else if(
/[A-Z]/.test(value) &&
/[0-9]/.test(value)
){

strengthBar.style.width="100%";
strengthBar.style.background="lime";
strengthText.innerText="Strong";

}
else{

strengthBar.style.width="60%";
strengthBar.style.background="orange";
strengthText.innerText="Medium";

}

});

document
.getElementById("sendOtpBtn")
.addEventListener("click",()=>{

generatedOtp =
Math.floor(
100000 +
Math.random()*900000
);

alert(
"Demo OTP : " +
generatedOtp
);

});

document
.getElementById("registerForm")
.addEventListener("submit",(e)=>{

e.preventDefault();

const enteredOtp =
document.getElementById("otp").value;

const message =
document.getElementById("message");

if(
enteredOtp ==
generatedOtp
){

message.innerHTML =
"✅ Registration Successful";

message.style.color =
"lime";

}
else{

message.innerHTML =
"❌ Invalid OTP";

message.style.color =
"red";

}

});

document
.getElementById("themeToggle")
.addEventListener("change",()=>{

document.body.classList
.toggle("light");

});

const card =
document.getElementById("card");

card.addEventListener(
"mousemove",
(e)=>{

const x =
e.offsetX;

const y =
e.offsetY;

const rotateY =
( x / 20 ) - 20;

const rotateX =
-( y / 20 ) + 20;

card.style.transform =
`rotateX(${rotateX}deg)
 rotateY(${rotateY}deg)`;

});

card.addEventListener(
"mouseleave",
()=>{

card.style.transform =
"rotateX(0) rotateY(0)";

});

document
.getElementById("sendBtn")
.addEventListener("click",()=>{

const input =
document.getElementById("userMessage");

const chatBox =
document.getElementById("chatBox");

const msg =
input.value;

if(!msg) return;

chatBox.innerHTML +=
`
<p>
<b>You:</b> ${msg}
</p>
`;

chatBox.innerHTML +=
`
<p>
<b>AI:</b>
Backend Gemini response here
</p>
`;

input.value="";

chatBox.scrollTop =
chatBox.scrollHeight;

});
function checkPass1()
{
    var pass1 = document.getElementById('password1');
    var pass2 = document.getElementById('password2');
    var message1 = document.getElementById('indicator1');
    var goodColor = "#66cc66";
    var badColor = "#ff6666";

    if(pass1.value.length > 5){
        pass1.style.backgroundColor = goodColor;
        //       message1.style.color = goodColor;
        message1.innerHTML = "Password:character number ok!"
    }
    else{
        pass1.style.backgroundColor = badColor;
//        message1.style.color = badColor;
        message1.innerHTML = " Password: you have to enter at least 6 digit!"
    }
}

function checkPass2()
{
    var pass1 = document.getElementById('password1');
    var pass2 = document.getElementById('password2');
    var message2 = document.getElementById('indicator2');
    var goodColor = "#66cc66";
    var badColor = "#ff6666";

    if(pass1.value === pass2.value){
        pass2.style.backgroundColor = goodColor;
        message2.style.color = goodColor;
        message2.innerHTML = "ok!"
    }
    else{
        pass2.style.backgroundColor = badColor;
        message2.style.color = badColor;
        message2.innerHTML = " These passwords don't match"
    }

}
const loginForm = document.getElementById('login-form');
const register = document.getElementById('register');
loginForm.addEventListener('submit', e => {
    e.preventDefault();
    const loginEmail = loginForm['login-email'].value;
    const loginPassword = loginForm['login-password'].value;
    // console.log(loginEmail, loginPassword);
    auth.signInWithEmailAndPassword(loginEmail, loginPassword).then((result) => {
           
        if(result){
            const user = result.user;
            localStorage.setItem('user',JSON.stringify(user));
            location = "index.html";
          }
        /*
        localStorage.setItem('user',JSON.stringify(user));
        location = "index.html";
            */
    }).catch(err => {
        const loginError = document.getElementById("loginError");
        loginError.innerText = err.message;
    })
});


register.addEventListener('click', e => {
    e.preventDefault();
    location = "http://imp.gob.pe/solicitud-de-acceso-geoimpacto/";
});

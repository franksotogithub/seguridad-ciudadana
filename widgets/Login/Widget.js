///////////////////////////////////////////////////////////////////////////
// Copyright © Esri. All Rights Reserved.
//
// Licensed under the Apache License Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
///////////////////////////////////////////////////////////////////////////
define(['dojo/_base/declare', 'jimu/BaseWidget','./external/vue'],
function(declare, BaseWidget,Vue) {
  //To create a widget, you need to derive from BaseWidget.
  return declare([BaseWidget], {
    // DemoWidget code goes here

    //please note that this property is be set by the framework when widget is loaded.
    //templateString: template,

    baseClass: 'jimu-widget-demo',

    postCreate: function() {
     
      this.inherited(arguments);
      this.createVueApp();
      this.vue_app.user=JSON.parse(localStorage.getItem('user'));
      console.log('this.vue_app.user>>',this.vue_app.user);
      this.vue_app.auth = firebase.auth();
     
    },

    startup: function() {
      this.inherited(arguments);

      
      /*
      const inicio = document.getElementById('inicio');
      const loginForm= document.getElementById('login-form');*/


      /*
      inicio.addEventListener('click', e => {
          e.preventDefault();
          const loginEmail = loginForm['login-email'].value;
          const loginPassword = loginForm['login-password'].value;
         
          this.auth.signInWithEmailAndPassword(loginEmail, loginPassword).then((user) => {  
              localStorage.setItem('user',JSON.stringify(user));
              location = "index.html";
              
          }).catch(err => {
              const loginError = document.getElementById("loginError");
              loginError.innerText = err.message;
          })
      });*/

    },


    
    createVueApp: function(){
      const widget = this;
      this.vue_app = new Vue({
          el: this.domNode.querySelector('[data-id="login-app"]'),
          data: {
              user:null,
              auth:null,
              email:null,
              password:null,
              loginError:null,
          },
  
          methods: {
              login(e){
                widget.login(e);
              },
              cerrarSesion(user){ 
                widget.cerrarSesion(user);
              },

              loginGooogle(e){
                
                widget.loginGooogle(e);
              }
             

          },
         
      });
  },
  
    cerrarSesion: function(user){
      console.log('user>>>',user);
      this.vue_app.auth.signOut().then(() => {
        localStorage.removeItem('user');
        location = "index.html";
      }).catch((error) => {
        // An error happened.
      });


    },

    login(e){ 
      e.preventDefault();
      console.log(this.vue_app.email);
      console.log(this.vue_app.password);
      /*
      this.vue_app.email*/
      this.vue_app.auth.signInWithEmailAndPassword(this.vue_app.email , this.vue_app.password).then((result) => {  
        
       
        if(result){
          const user = result.user;
          localStorage.setItem('user',JSON.stringify(user));
          location = "index.html";
        }
       
        
    }).catch(err => {
        /*
        const loginError = document.getElementById("loginError");
        loginError.innerText = err.message;*/
        this.vue_app.loginError = err.message;
    })

    },


    loginGooogle(e){

      e.preventDefault();

      const provider = new firebase.auth.GoogleAuthProvider();
      /*const provider = new this.vue_app.auth.GoogleAuthProvider();*/
      this.vue_app.auth.signInWithPopup(provider).then((result) => {
    
        const credential = result.credential;

    // This gives you a Google Access Token. You can use it to access the Google API.
        const token = credential.accessToken;
    // The signed-in user info.
        const user = result.user;
        /*console.log('result>>>',user);*/
        localStorage.setItem('user',JSON.stringify(user));
        
        location = "index.html";

    // ...
      }).catch((error) => {
        // Handle Errors here.
        var errorCode = error.code;

        this.vue_app.loginError = error.message;
        // The email of the user's account used.
        var email = error.email;
        // The firebase.auth.AuthCredential type that was used.
        var credential = error.credential;
        // ...
      });

    },



    onOpen: function(){
      console.log('onOpen');
    },

    onClose: function(){
      console.log('onClose');
    },

    onMinimize: function(){
      console.log('onMinimize');
    },

    onMaximize: function(){
      console.log('onMaximize');
    },

    onSignIn: function(credential){
      /* jshint unused:false*/
      console.log('onSignIn');
    },

    onSignOut: function(){
      console.log('onSignOut');
    },

    showVertexCount: function(count){
      this.vertexCount.innerHTML = 'The vertex count is: ' + count;
    }
  });
});
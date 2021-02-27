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
define(['dojo/_base/declare', 'jimu/BaseWidget','./external/vue',],
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
      this.vue_app.user= JSON.parse(localStorage.getItem('user'));
      if(this.vue_app.user){
          this.getConsultas();
      }

      /*
      console.log('postCreate');*/
    },

    startup: function() {
      this.inherited(arguments);
    
      console.log('startup');


      
    },

    createVueApp: function(){

            
            
      const widget = this;
      this.vue_app = new Vue({
          el: this.domNode.querySelector('[data-id="historial-app"]'),
          data: {
              gisMap: this.map,
              processing: false,
              downloading: false,
              statistics: null,
              filterValues: null,                    
              filteredValue: "",
              currentSelectionShape: "",
              consultas:[],
              user:null,
          },
  
          methods: {
              formatDate(value){
                  return moment(value).format('YYYY-MM-DD hh:mm:ss')
              },

              busqueda(consulta){ 

                widget.publishData(consulta);
               
                
              },
             



          },


          filters: {

              dateToString: function (value) {
                  return moment(value).format('YYYY-MM-DD hh:mm:ss');
                }


          }

         
      });
  },


  getConsultas : function(){

  

    this.db = firebase.firestore();

    this.vue_app.consultas=[];

    const uid=this.vue_app.user.uid;
    const docRef = this.db.collection('consultas').where("uid", "==", uid).get();
    docRef.then((querySnapshot)=>{
        querySnapshot.forEach((doc)=>{
           this.vue_app.consultas.push(doc.data());
                  
        })

        this.vue_app.consultas=this.vue_app.consultas.sort(function(a,b){
          return new Date(b.fecha) - new Date(a.fecha);
        });

    }); 
},




    onOpen: function(){
      if(this.vue_app.user){
          this.getConsultas();
      }
      /*console.log('onOpen');*/
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
    },


    onReceiveData: function(name, widgetId, data, historyData) {
    
      if(name == 'FormHistorial'){
        
          this.getConsultas();
      }

      else{
          return;    
      }

      
    },


  });
});
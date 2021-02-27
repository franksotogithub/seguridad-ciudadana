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
define(['dojo/_base/declare', 'jimu/BaseWidget','jimu/PanelManager','./external/vue','./external/vuelidate','./external/validators'],
function(declare, BaseWidget,PanelManager,Vue,Vuelidate,Validators) {
  //To create a widget, you need to derive from BaseWidget.
  return declare([BaseWidget], {
    // DemoWidget code goes here

    //please note that this property is be set by the framework when widget is loaded.
    //templateString: template,

    baseClass: 'jimu-widget-demo',


    createVueApp: function(){
      Vue.use(Vuelidate.default)
            
            
      const widget = this;
      this.vue_app = new Vue({
          el: this.domNode.querySelector('[data-id="form-historial"]'),
          data: {
            form:{
              titulo:null,
              descripcion:null,
              distritos:null,  
            },
            
            datoConsulta:null,
        },
validations:{
  form:{
    titulo:{
      required:Validators.required
    },
   
    distritos:{
      required:Validators.required
    }

  }
  
},

          watch: {

          },



          methods: {
              
              submitForm(evt){


                if(!widget.vue_app.$v.form.$invalid){
                  widget.guardarConsulta(evt);
                }
              }
              

          },




          filters: {

              dateToString: function (value) {
                  return moment(value).format('YYYY-MM-DD hh:mm:ss');
                }


          }

         
      });
  },

  
  guardarConsulta:function(evt){

    PanelManager.getInstance().closePanel(this.id+'_panel');

    this.vue_app.datoConsulta.fecha = Date();
    const db = firebase.firestore();


    db.collection('consultas').add({
      uid: this.vue_app.datoConsulta.uid,
      email: this.vue_app.datoConsulta.email,
      fecha: this.vue_app.datoConsulta.fecha,
      idfeatures: this.vue_app.datoConsulta.idfeatures,
      geometry: this.vue_app.datoConsulta.geometry,
      tableStatistics : this.vue_app.datoConsulta.tableStatistics,
      chartStatisticResults : this.vue_app.datoConsulta.chartStatisticResults,
      titulo : this.vue_app.form.titulo,
      descripcion : (this.vue_app.form.descripcion)?this.vue_app.form.descripcion:'',
      distritos : (this.vue_app.form.distritos)?this.vue_app.form.distritos:'',
    });


    var widgets = this.appConfig.getConfigElementsByName('Historial');

 
      if(widgets.length>0){
          var widgetId = widgets[0].id;
          console.log('widgetId>>',widgetId);
          this.openWidgetById(widgetId).then((widget)=>{
            this.publishData({mensaje:'actualizado'});
          });
      }


  },


    postCreate: function() {
      this.inherited(arguments);
      this.createVueApp();
      

      this.vue_app.distritos='holass'; 
      

      console.log('postCreate');
    },

    startup: function() {
      this.inherited(arguments);
   
      console.log('startup');
      console.log('this.widgetManager>>>',this.widgetManager);
    },


    onOpen: function(){
     

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


      if(name == 'Estadisticas_Imp'){
        console.log('data>>>',data);
     
        this.vue_app.datoConsulta =data;
        this.vue_app.form.distritos = data.distritos;
        this.vue_app.form.titulo = null;
        this.vue_app.form.descripcion = null;

      }

      else{
          return;    
      }

      
    },

  });
});
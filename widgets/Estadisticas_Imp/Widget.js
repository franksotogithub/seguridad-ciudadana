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
define([
    'dojo/_base/declare', 
    'jimu/BaseWidget',
    "esri/toolbars/draw", 
    "esri/layers/FeatureLayer",
    "esri/layers/GraphicsLayer",
    "esri/graphicsUtils",
    "esri/tasks/query",
    './utils',
    './chartutils',
    './external/vue',
    
    "esri/tasks/GeometryService",
    "esri/tasks/AreasAndLengthsParameters",
    'jimu/MapManager',
    
    'https://www.amcharts.com/lib/4/core.js',
   
],
function (
    declare, 
    BaseWidget,
    DrawToolbar,
    FeatureLayer,
    GraphicsLayer,
    graphicsUtils,
    Query,
    Utils,
    ChartUtils,
    Vue,
    GeometryService, 
    AreasAndLengthsParameters,
    MapManager,
    
) {
    require(['https://www.amcharts.com/lib/4/charts.js',])
    
    return declare([BaseWidget,MapManager], {

        baseClass: 'jimu-widget-imp-estadisticas',
        queryFeatureCount: 0,
        results: [],
        fields: [],
        calculateStatisticsTimerId: null,
        current_query: null,
        vue_app: null,
        autoZoom: true,
        drawToolbar: null,
        featureLayer: null,
        graphicsLayer: null,
        db:null,
       
        postCreate: function () {
           
            this.inherited(arguments);

            this.createVueApp();

            if (this.config.useSameLayer){
                this.gis_datatable = this.map.getLayer(this.config.layerId)
            }else{
                this.gis_datatable = this.map.tables.find( t => t.id === this.config.tableId );
            }
            this.drawToolbar = new DrawToolbar(this.map, {
                tooltipOffset: 20,
                drawTime: 90
            });
            this.graphicsLayer = new GraphicsLayer({id: 'statisticsResults'});
            this.map.addLayer(this.graphicsLayer);
            this.featureLayer = new FeatureLayer(this.config.layerUrl);
            
            console.log('this.featureLayer>>>',this.featureLayer);
            // Determinar los fields que se necesitaran
            this.fields = this.fields.concat(this.config.statisticsDefinition.table.map( definition => definition.fieldName))
            this.fields = this.fields.concat(this.config.statisticsDefinition.charts.map( definition => definition.fieldName))
            this.fields =  this.fields.concat([this.config.tableKey]);
            
            this.loadFilterValues();
            
            this.vue_app.user = JSON.parse(localStorage.getItem('user'));
   
        },


        /*
        getConsultas : function(){

           

            this.vue_app.db = firebase.firestore();

            this.vue_app.consultas=[];
            const docRef = this.vue_app.collection('consultas').get();
            docRef.then((querySnapshot)=>{
                querySnapshot.forEach((doc)=>{
                   this.vue_app.consultas.push(doc.data());

                })
            }); 
        },*/

        createVueApp: function(){

            
            
            const widget = this;
            this.vue_app = new Vue({
                el: this.domNode.querySelector('[data-id="statistic-app"]'),
                data: {
                    gisMap: this.map,
                    processing: false,
                    downloading: false,
                    statistics: null,
                    filterValues: null,                    
                    filteredValue: "",
                    currentSelectionShape: "",
                    chartDefs: this.config.statisticsDefinition.charts,
                    consultas:[],
                    drawEndEvent:null,
                    user:null,
                    features:null,
                    db:null,
                    chartStatisticResults:null,
                    distritos: null,
                },
                watch: {
                    filteredValue(value){
                        console.log('value>>>',value);
                        if (value){
                            widget.scheduleCalculateStatistics({geometry: null});
                        }
                    }
                },
                methods: {
                    printMap(){
                        this.downloading = true;
                        Utils.printInform(this.gisMap, this.$refs["statistics-table"], this.$refs["chart-container"], this.chartDefs)
                        .finally( () => {
                            this.downloading = false;
                        });
                    },
                    deactivateSelection(){
                        widget.drawToolbar.deactivate();
                        this.currentSelectionShape = "";
                        this.gisMap.setInfoWindowOnClick(true);
                    },
                    activateSelection(shape){
                        if (this.currentSelectionShape === shape){
                            this.deactivateSelection();
                            return
                        }
                        switch(shape){
                            case 'rectangle':
                                widget.drawToolbar.activate(DrawToolbar.RECTANGLE);
                                break;
                            case 'circle':                                
                                widget.drawToolbar.activate(DrawToolbar.CIRCLE);
                                break;
                            default:
                                widget.drawToolbar.activate(DrawToolbar.POLYGON)
                                break
                        }
                        this.currentSelectionShape = shape;
                        this.gisMap.setInfoWindowOnClick(false);
                    },
                    clearSelection(){
                        this.statistics = [];
                        this.deactivateSelection();
                        widget.graphicsLayer.clear();
                    },

                    
                    formatDate(value){
                        return moment(value).format('YYYY-MM-DD hh:mm:ss')
                    },

                    busqueda(consulta){
                        widget.scheduleCalculateStatistics2(consulta);
                      
                    },
                    guardarConsulta(){
                        widget.guardarConsulta();
                    }

                },


                filters: {

                    dateToString: function (value) {
                        return moment(value).format('YYYY-MM-DD hh:mm:ss');
                      }


                }

               
            });
        },

        loadFilterValues: async function(){
            if (!this.config.filterByField){
                return;
            }
            
            const field = this.config.filterByField;
            const query = new Query(); 
            query.where = "1=1";
            query.outFields = [field];
            query.returnGeometry = false;
            query.returnDistinctValues = true;
            
            const features = await Utils.queryFeaturesInLayer(this.featureLayer, query);
         
            this.vue_app.filterValues = features.map( f => f.attributes[field]);
            
      
        },

        captureReferences: function(){
            this.$ref = {};
            this.domNode.querySelectorAll("[data-id]").forEach( el => {
                this.$ref[el.getAttribute("data-id")] = el;
            });                
        },

        attachEvents: function(){
        
            this.map.on('key-down', (e) => {
                switch(e.keyCode){
                    case 27: // Escape
                        this.vue_app.deactivateSelection();
                        break;
                    case 83: // Letter "S"
                        this.vue_app.activateSelection();
                        break;
                }
            });
            this.drawToolbar.on("draw-end", 
            
            this.scheduleCalculateStatistics.bind(this)
            
            );
        },

        clearResults: function(){
            this.vue_app.statistics = [];
        },        


        
        scheduleCalculateStatistics: function(drawEndEvent){
            clearInterval(this.calculateStatisticsTimerId);
            this.vue_app.processing = true;
            this.vue_app.deactivateSelection();
            this.calculateStatisticsTimerId = setTimeout( () => {
                
                
                this.showStatistics(drawEndEvent);
                
               

            }, 1000)
        },


        scheduleCalculateStatistics2: function(consulta){
            clearInterval(this.calculateStatisticsTimerId);
            this.vue_app.processing = true;
            this.calculateStatisticsTimerId = setTimeout( () => {
                
                
                this.showStatistics2(consulta);
                
               

            }, 1000)
        },

        showStatistics2: async function(consulta){

            let ids =(consulta.idfeatures)?consulta.idfeatures:[];
            let geometry = (consulta.geometry)?JSON.parse(consulta.geometry):null;
            
            let tableStatistics = (consulta.tableStatistics)?JSON.parse(consulta.tableStatistics):null;
            let chartStatisticResults = (consulta.chartStatisticResults)?JSON.parse(consulta.chartStatisticResults):null;
            



            const query_id = Math.random();
            this.current_query = query_id;

            this.graphicsLayer.clear();  
            const query = new Query();    
            query.outFields = this.fields;   
            query.returnGeometry = true;
            query.outSpatialReference = this.map.spatialReference;
            
            let where='';
            ids.forEach((id,index)=>{

                if(index==0)
                where = `${this.config.tableKey} = ${id}`;
                
                else
                where = `${where} OR ${this.config.tableKey} = ${id}`;
            });

            query.where = where

            
            const features = await Utils.queryFeaturesInLayer(this.featureLayer, query, () => {
                return query_id !== this.current_query
            });

    

            if (query_id !== this.current_query){              
                return
            }
            
            
            this.queryFeatureCount = features.length;
        
            if (features.length === 0){
                this.clearResults();
                this.vue_app.processing = false;
                return;
            }
         

            Utils.createGraphics(this.graphicsLayer, features);
            
            if(geometry) {
                Utils.createSelectGraphic(this.graphicsLayer,geometry);
            }


            if (this.autoZoom){
                const extent = graphicsUtils.graphicsExtent(features);
                this.map.setExtent(extent.expand(1.5));
            }

            this.vue_app.statistics= tableStatistics;
            this.drawCharts(chartStatisticResults);
            this.vue_app.processing = false;
           
          
        
        },

        showStatistics: async function(drawEndEvent){
            const numFormater = new Intl.NumberFormat("en-EN");
            const query_id = Math.random();
            this.current_query = query_id;

            this.graphicsLayer.clear();            
            const query = new Query();        
            query.outFields = this.fields;
            query.geometry = drawEndEvent.geometry;
            query.returnGeometry = true;
            query.outSpatialReference = this.map.spatialReference;
            if (this.vue_app.filteredValue){
                query.where = `${this.config.filterByField} = '${this.vue_app.filteredValue}'`
            }

            const features = await Utils.queryFeaturesInLayer(this.featureLayer, query, () => {
                return query_id !== this.current_query
            });


            if (query_id !== this.current_query){
                // Se realizó un query posterior y este debe descartarse
                return
            }
            
            
            this.queryFeatureCount = features.length;
            
            
            if (features.length === 0){
                this.clearResults();
                this.vue_app.processing = false;
                return;
            }

            Utils.createGraphics(this.graphicsLayer, features);
            
            if(drawEndEvent.geometry) {
                Utils.createSelectGraphic(this.graphicsLayer,drawEndEvent.geometry);
            }


            if (this.autoZoom){
                const extent = graphicsUtils.graphicsExtent(features);
                this.map.setExtent(extent.expand(1.5));
            }

            let chartStatisticResults = [];
            let tableStatistics = [];
            const chartDefs = this.config.statisticsDefinition.charts;
            if (this.config.useSameLayer){
                tableStatistics = Utils.calculateStatistics(
                    features,
                    this.config.statisticsDefinition.table
                );

                for( let i = 0; i < chartDefs.length; i++){
                    chartStatisticResults[i] = Utils.calculateStatistics(
                        features,
                        chartDefs[i],
                        chartDefs[i].groupBy
                    );
                }
            }

            console.log('chartStatisticResults>>>',chartStatisticResults);
            this.drawCharts(chartStatisticResults);

            this.vue_app.distritos =chartStatisticResults[1].map((c)=>{ return c.attributes['DISTRITO']}).reduce( (a,b)=>{

                return (b==null)?a:a+ ', '+b;  
            });



            var geometryService = new GeometryService("http://tasks.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer");

            var areasAndLengthParams = new AreasAndLengthsParameters();

            areasAndLengthParams.lengthUnit = esri.tasks.GeometryService.UNIT_FOOT;
            areasAndLengthParams.areaUnit = esri.tasks.GeometryService.UNIT_HECTARES;

           
            const _this = this;

            let area =0;
            

            this.vue_app.statistics=this.fillTableResults(tableStatistics);
            let filtersEstBajo=chartStatisticResults[0].filter(c=>{return (c.attributes['EST_SOCIO']=='Medio Bajo' || c.attributes['EST_SOCIO']=='Bajo')});
            
            let totalEstBajo=filtersEstBajo.reduce( (acum, f) => acum + f.attributes['est_socio_count'], 0);

            this.vue_app.statistics.push({description:"Cantidad de personas en situacion de pobreza", 
            value: numFormater.format( parseFloat(totalEstBajo).toFixed(2)) });

            this.vue_app.statistics.push({description:"Distritos", 
            value: this.vue_app.distritos  });




            if(drawEndEvent.geometry){

                geometryService.simplify([drawEndEvent.geometry], function(simplifiedGeometries) {
                    areasAndLengthParams.polygons = simplifiedGeometries;
                    geometryService.areasAndLengths(areasAndLengthParams);
                });
                
                geometryService.on("areas-and-lengths-complete", function(evtObj){
                   
                    const result = evtObj.result; 
                    area=result.areas[0];
                    
                    if(area){
                        _this.vue_app.statistics.unshift({description:"Area Total de Selección(Hectareas)", 
                        value: numFormater.format( parseFloat(area).toFixed(2)) });

                    } 
                    
    
                });

            

            }

           
            this.vue_app.processing = false;   

            this.vue_app.drawEndEvent=drawEndEvent;
            this.vue_app.features = features;
            this.vue_app.chartStatisticResults = chartStatisticResults;

       
        },


        guardarConsulta: function(){
            this.vue_app.db = firebase.firestore();

            let usuario=JSON.parse(localStorage.getItem('user'));
            let uid=usuario['uid']
            let email=usuario['email']
            let fecha = Date();
           
            
            const idfeatures=  this.vue_app.features.map(f=>{ return f.attributes[this.config.tableKey]});
            const geometry = (this.vue_app.drawEndEvent.geometry)? JSON.stringify(this.vue_app.drawEndEvent.geometry):null;



            
/*
            this.vue_app.db.collection('consultas').add({
                uid:uid,
                email: email,
                fecha: fecha,
                idfeatures: idfeatures,
                geometry: geometry,
                tableStatistics : JSON.stringify(this.vue_app.statistics),
                chartStatisticResults : JSON.stringify(this.vue_app.chartStatisticResults),
               
            });
            */
            
            
            var widgets = this.appConfig.getConfigElementsByName('FormHistorial');

            /*console.log('widgets>>>',widgets);*/


            if(widgets.length>0){
                var widgetId = widgets[0].id;
                
                this.openWidgetById(widgetId).then((widget)=>{
                    this.publishData({
                        uid:uid,
                        email: email,
                        fecha: fecha,
                        idfeatures: idfeatures,
                        geometry: geometry,
                        tableStatistics : JSON.stringify(this.vue_app.statistics),
                        chartStatisticResults : JSON.stringify(this.vue_app.chartStatisticResults),
                        distritos: this.vue_app.distritos
                    });
                    
                  });
            }
            


        },


        fillTableResults: function(statisticsResults){

            const numFormater = new Intl.NumberFormat("en-EN");
            
            this.vue_app.statistics = [];
            if (!statisticsResults){
                return;
            }
          

            let statiscts = []
            const resultForNoGroup = statisticsResults[0].attributes; 
            statiscts = this.config.statisticsDefinition.table.map( sta => {
                return {
                    description: sta.description, 
                    value: numFormater.format(resultForNoGroup[sta.id].toFixed(2))
                }
            });

         
            return statiscts;

        },

        drawCharts: async function(chartStatisticResults){
            am4core.disposeAllCharts();
            const chartDefs = this.config.statisticsDefinition.charts;
            chartStatisticResults.forEach( (statisticResult, i) => {
                const chartsDiv = this.vue_app.$refs[chartDefs[i].id][0];
                switch(chartDefs[i].chart){
                    case "pie":
                        ChartUtils.createPieFromFeatures(statisticResult, chartsDiv, chartDefs[i]);
                }
            });
            
        },
        
        startup: function () {
            this.inherited(arguments);
            this.captureReferences();
            this.attachEvents();

            this.fetchDataByName('Login');

        },

        onOpen: function () {
            var widgets = this.appConfig.getConfigElementsByName('Historial');

            
            if(widgets.length>0){
                var widgetId = widgets[0].id;
                console.log('widgetId>>',widgetId);
                this.openWidgetById(widgetId).then((widget)=>{
                  this.publishData({mensaje:'openEstadisticas_Imp'});
                });
            }
        },

        onClose: function () {
            //
        },

        onMinimize: function () {
            //
        },

        onMaximize: function () {
            //
        },

        onSignIn: function (credential) {
            //
        },

        onSignOut: function () {
            //
        },

        onReceiveData: function(name, widgetId, data, historyData) {
            if(name == 'Historial'){
                const consulta = data;
                this.scheduleCalculateStatistics2(consulta);
           
            }

            else{
                return;    
            }
      
            
          },


        showVertexCount: function (count) {
            this.$ref.vertexCount.innerHTML = 'The vertex count is: ' + count;
        }
    });
});
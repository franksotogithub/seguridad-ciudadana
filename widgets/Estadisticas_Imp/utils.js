define([
    "esri/tasks/query",
    "esri/tasks/QueryTask",
    "esri/tasks/StatisticDefinition",
    "esri/tasks/PrintTask", 
    "esri/tasks/PrintParameters",
    'esri/tasks/PrintTemplate',
    "esri/graphic",
    "esri/tasks/LegendLayer",
], function(
    Query,
    QueryTask,
    StatisticDefinition,
    PrintTask,
    PrintParameters,
    PrintTemplate,
    Graphic,
    LegendLayer,
){

    const getFeatureFields = async (serviceUrl) => {
        let fields = [];
        try {
            const definition = await (await fetch(serviceUrl + "?f=json")).json()
            fields = definition.fields;
        } catch (error) {
            console.error(error);
        }
        return fields;
    };
    
    const getStatistics = async (url, queryFilter, fields, statistics) => {
        const query = new Query();
        query.where = queryFilter;
        query.outStatistics = [];
        fields.forEach( (f) => {
            statistics.forEach( (s) => {
                const statisticDefinition = new StatisticDefinition();
                statisticDefinition.statisticType = s;
                statisticDefinition.onStatisticField = f;
                statisticDefinition.outStatisticFieldName = `result_${f}_${s}`;
        
                query.outStatistics.push(statisticDefinition);
            });
        });

        const queryTask = new QueryTask(url);
        const results = await queryTask.execute(query);

        const resultStatistics = {};
        results.features.forEach( feature => {
            results.fields.forEach( statisticField => {
                const fieldName = statisticField.name.split("_")[1];                
                const type = statisticField.name.split("_")[2];
                resultStatistics[fieldName] = resultStatistics[fieldName] || [];
                resultStatistics[fieldName].push({                    
                    statistictType: type,
                    value: feature.attributes[statisticField.name]
                });
            });
        });

        return resultStatistics;
    };

    const execStatistics = async (url, queryFilter, statistics, groupBy) => {
        statistics = Array.isArray(statistics) ? statistics : [statistics]
        const query = new Query();
        query.where = queryFilter;
        query.outStatistics = [];
        if (groupBy){
            query.groupByFieldsForStatistics = groupBy;
        }
        statistics.forEach( (s) => {
            const statisticDefinition = new StatisticDefinition();
            statisticDefinition.statisticType = s.operation;
            statisticDefinition.onStatisticField = s.fieldName;
            statisticDefinition.outStatisticFieldName = s.id;
            query.outStatistics.push(statisticDefinition);
        });

        const queryTask = new QueryTask(url);
        const results = await queryTask.execute(query);

        return results.features;
    };

    const calculateStatistics = (features, statistics, groupBy) => {
        statistics = Array.isArray(statistics) ? statistics : [statistics]
        const results = {};
        let groups = groupBy ? {} : null;
        if (groups){
            groups = Array.from(new Set(features.map( f => f.attributes[groupBy] )))
            groups.forEach( g => results[g] = {attributes: {}});
        }else{
            results['default'] = {attributes: {}}
        }

        // Agrego los resultados dentro de una propiedad attributes para reproducir el comportamiento de una consulta estadistica de arcgis
        statistics.forEach( s => {
            for (const group in results){
                const groupFeatures = group === 'default' ? features : features.filter( f => f.attributes[groupBy] === group)
                results[group]['attributes'][groupBy] = group;
                switch (s.operation) {
                    case 'sum':
                        results[group]['attributes'][s.id] = groupFeatures.reduce( (acum, f) => acum + f.attributes[s.fieldName], 0);
                        break
                    case 'avg':
                        results[group]['attributes'][s.id] = groupFeatures.reduce( (acum, f) => acum + f.attributes[s.fieldName], 0) / groupFeatures.length;
                        break
                    case 'count':
                        results[group]['attributes'][s.id] = groupFeatures.length
                        break
                }
            }
        });

        return Object.values(results);
    };

    const svgToPng = async (svg) => {
        const {width, height} = svg.getBBox();        
        const blob = new Blob([svg.outerHTML], {type:'image/svg+xml;charset=utf-8'});
        const blobURL = URL.createObjectURL(blob)

        const image = new Image();
        const promise = new Promise( res => {
            image.onload = () => {        
                const canvas = document.createElement('canvas');
                
                canvas.width = Number(width.toFixed(0));
                
                canvas.height = Number(height.toFixed(0));
                const context = canvas.getContext('2d');
                // draw image in canvas starting left-0 , top - 0  
                context.drawImage(image, 0, 0, width, height );
                //  downloadImage(canvas); need to implement
                const png = canvas.toDataURL();
                res({
                    png, 
                    dimensions: {width: canvas.width, height: canvas.height}
                });
    
                // var download = function(href, name){
                //     var link = document.createElement('a');
                //     link.download = name;
                //     link.style.opacity = "0";
                //     document.body.appendChild(link);
                //     link.href = href;
                //     link.click();
                //     link.remove();
                // }
                // download(jpeg, "image.jpg");
            };
        })
        
        image.src = blobURL;

        return await promise;
    }

    const getMapCurrentImage = async (map) => {        
        var printTask, params, template;        
        
        var printUrl =	"https://siu.imp.gob.pe/arcgis/rest/services/print_services/imp_print_service_geoimpactos/GPServer/Export%20Web%20Map";			
        printTask = new PrintTask(printUrl);
        params = new PrintParameters();
        template = new PrintTemplate();
        template.exportOptions = {
            width: 1100,
            height: 800,
            dpi: 150
        };
        template.format = "JPG";
        template.layout = "A4 Landscape IMP Seguridad";
        template.preserveScale = false;
        
        var legendLayer = new LegendLayer();
        legendLayer.layerId= "Vulnerabilidad_Covid19_2855"
        legendLayer.subLayerIds= [0];
        template.layoutOptions = {	                

            legendLayers:[legendLayer]
        };
        params.map = map;
        params.template = template;
        try {
            const result =  await printTask.execute(params)
            const blob = await (await fetch(result.url)).blob()
            return new Promise( resolve => {
                const reader = new FileReader();
                reader.onloadend = function() {
                    resolve(reader.result);
                }
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.log('error>>>',error);
            alert("Se produjo un error generando la imagen de mapa");
            return null;
        }       
    }

    const printInform = async (map, tableNode, graphicsNode, graphicsDefinitions) => {
        // Verify jsPDF 
        try {
            if (jsPDF && !jsPDF.autoTableSetDefaults){
                window.applyPlugin(jsPDF);
            }
        } catch (error) {
            console.error('No se pudo cargar el plugin autotable');
        }
        
        const doc = new jsPDF('landscape')
        
        // Obtener Tabla
        doc.addPage("a4", "l");
        doc.autoTable({html: tableNode});
        
        // Obtener imagenes de gráficos y agregarlos 
        doc.addPage("a4", "l");
        const svgs = graphicsNode.querySelectorAll("svg");        
        let cuadrantes = Array.prototype.map.call(svgs,( _, i)  => {
            const x = i % 2 === 0 ? 0 : doc.internal.pageSize.width / 2;
            const y = i % 4 > 1 ?  doc.internal.pageSize.height / 2 : 0;
            return {
                x: x,
                y: y,
                width: doc.internal.pageSize.width / 2,
                height: doc.internal.pageSize.height / 2,
            }
        })
                       
        for (let i = 0; i < svgs.length; i++){
            const title = graphicsDefinitions[i].description;
            const {png, dimensions} = await svgToPng(svgs[i]);
            const cuadrante = cuadrantes[i];
            const newWidth = cuadrante.width * .8;
            const newHeigth = newWidth * dimensions.height / dimensions.width;
            const x = cuadrante.x + newWidth * .1;
            const y = cuadrante.y + cuadrante.height * .3;
            const y_text = cuadrante.y + cuadrante.height * .1;
            doc.text(x, y_text, title);
            doc.addImage(png, 'PNG', x , y, newWidth, newHeigth)            
        }
        
        // Obtener Imagen del mapa
        const mapImage = await getMapCurrentImage(map);
        if (!mapImage){
            return;
        }
        doc.setPage(1);
        doc.addImage(mapImage, 'JPG', 0, 0, doc.internal.pageSize.width, doc.internal.pageSize.height)
        
        doc.save("mipdf.pdf")
    }

    // Obtiene todos los features devueltos por un query realizando llamadas recursivas de ser necesario
    const queryFeaturesInLayer = async(layer, query, abortFunction) => {
        let features = [];

        const queryResult = await layer.queryFeatures(query);
        
        console.log('queryResult>>>',queryResult);
        if (abortFunction && abortFunction()){
            return false;
        }

        features = features.concat(queryResult.features);
        if (queryResult.exceededTransferLimit){
            query.start = !query.start ? layer.maxRecordCount : query.start + layer.maxRecordCount;
            query.num = layer.maxRecordCount;
            const featuresSecondResult = await queryFeaturesInLayer(layer, query);
            if (featuresSecondResult){
                features = features.concat(featuresSecondResult);
            }
        }
        if (abortFunction && abortFunction()){
            return false;
        }
        return features;
    }

    const createGraphics = (graphicsLayer, features) => {
        
        features.forEach( feature => {
            const polygon = {
                "geometry": feature.geometry,
                "symbol": {
                    "color": [0, 255, 255, 64], "outline": {
                        "color": [0, 255, 255, 255],
                        "width": 1, "type": "esriSLS", "style": "esriSLSSolid"
                    },
                    "type": "esriSFS", "style": "esriSFSSolid"
                }
            };
            graphicsLayer.add( new Graphic(polygon));
        });
    }

    const createSelectGraphic = (graphicsLayer, geometry) => {
        console.log('geometry>>>>',geometry);
        
            const polygon = {
                "geometry": geometry,
                "symbol": {
                    "color": [0, 255, 255, 0], "outline": {
                        "color": [255,0, 0,255],
                        "width": 2, "type": "esriSLS", "style": "esriSLSSolid"
                    },
                    "type": "esriSFS", "style": "esriSFSSolid"
                }
            };
            graphicsLayer.add( new Graphic(polygon));
        
    }


    return {
        svgToPng,
        printInform,
        getFeatureFields,
        getStatistics,
        execStatistics,
        calculateStatistics,
        queryFeaturesInLayer,
        createGraphics,
        createSelectGraphic,
    };
})

// Sociedad peruana de Derecho ambiental

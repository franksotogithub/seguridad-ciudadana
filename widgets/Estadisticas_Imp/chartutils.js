define([], function(){

    const createPieFromFeatures = function(features, node, chartConfig){
        node = node || document.createElement("div");
        const chart = am4core.create(node, am4charts.PieChart);

        // Create pie series
        const series = new am4charts.PieSeries();
        chart.series.push(series);
        series.dataFields.value = chartConfig["value_field"] || chartConfig["id"];
        series.dataFields.category = chartConfig["category_field"] || chartConfig["fieldName"];
        chart.data = features.map( f => f.attributes);
        // Add data
        // chart.data = [{
        //     "country": "Lithuania",
        //     "litres": 501.9
        //     }, {
        //     "country": "Czech Republic",
        //     "litres": 301.9
        //     }, {
        //     "country": "Ireland",
        //     "litres": 201.1
        //     }, {
        //     "country": "Germany",
        //     "litres": 165.8
        //     }, {
        //     "country": "Australia",
        //     "litres": 139.9
        //     }, {
        //     "country": "Austria",
        //     "litres": 128.3
        //     }, {
        //     "country": "UK",
        //     "litres": 99
        //     }, {
        //     "country": "Belgium",
        //     "litres": 60
        //     }, {
        //     "country": "The Netherlands",
        //     "litres": 50
        //     }];
        
        return chart;
    }

    return {
        createPieFromFeatures
    }
})
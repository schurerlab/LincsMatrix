// Fix map for IE
if (!('map' in Array.prototype)) { 
  Array.prototype.map = function (mapper, that /*opt*/) { 
    var other = new Array(this.length); 
    for (var i = 0, n = this.length; i < n; i++) 
      if (i in this) 
        other[i] = mapper.call(that, this[i], i, this); 
    return other; 
  }; 
};

Array.prototype.unique = function() {
    return this.reduce(function(accum, current) {
        if (accum.indexOf(current) < 0) {
            accum.push(current);
        }
        return accum;
    }, []);
}
average = function(a) {
  var r = {mean: 0, variance: 0, deviation: 0}, t = a.length;
  for(var m, s = 0, l = t; l--; s += a[l]);
  for(m = r.mean = s / t, l = t, s = 0; l--; s += Math.pow(a[l] - m, 2));
  return r.deviation = Math.sqrt(r.variance = s / t), r;
}


$.fn.select2.amd.define('select2/selectAllAdapter', [
    'select2/utils',
    'select2/dropdown',
    'select2/dropdown/attachBody'
], function (Utils, Dropdown, AttachBody) {

    function SelectAll() { }
    SelectAll.prototype.render = function (decorated) {
        var self = this,
            $rendered = decorated.call(this),
            $selectAll = $(
                '<div class="selectButton"> Select All</div>'
            ),
            $unselectAll = $(
                '<div class="selectButton"> Unselect All</div>'
            ),
            $btnContainer = $('<div style="margin-top:3px;">').append($selectAll).append($unselectAll);
        if (!this.$element.prop("multiple")) {
            // this isn't a multi-select -> don't add the buttons!
            return $rendered;
        }
        $rendered.find('.select2-dropdown').prepend($btnContainer);
        $selectAll.on('click', function (e) {
            var $results = $rendered.find('.select2-results__option[aria-selected=false]');
            $results.each(function () {
                self.trigger('select', {
                    data: $(this).data('data')
                });
            });
            self.trigger('close');
        });
        $unselectAll.on('click', function (e) {
            var $results = $rendered.find('.select2-results__option[aria-selected=true]');
            $results.each(function () {
                self.trigger('unselect', {
                    data: $(this).data('data')
                });
            });
            self.trigger('close');
        });
        return $rendered;
    };

    return Utils.Decorate(
        Utils.Decorate(
            Dropdown,
            AttachBody
        ),
        SelectAll
    );

});

var browser = BrowserDetect;

if (isOldBrowser()) {
	$('#old_browser_msg').show();
	$('#wtf').hide();
	$('fieldset#state').addClass('ff3');
	$('#ie8_percents').addClass('ff3');
	$('#share2').addClass('ff3');
	$('#poweredby.old_browsers').show();
}

var buckets = 11,
	colorScheme = 'rbow2',
	days = [
		{ name: 'Monday', abbr: 'Mo' },
		{ name: 'Tuesday', abbr: 'Tu' },
		{ name: 'Wednesday', abbr: 'We' },
		{ name: 'Thursday', abbr: 'Th' },
		{ name: 'Friday', abbr: 'Fr' },
		{ name: 'Saturday', abbr: 'Sa' },
		{ name: 'Sunday', abbr: 'Su' }
	],
	types = {
		all: 'All',
		pc: 'Computer',
		mob: 'Mobile'
	};
var fileText,currentLine,currentProgress,fileSize
var data,filterData,rawData,cellCompoundToAssays;
var columns,rows;
var assays = {max:0,data:[]};
var cells = {max:0,data:[]};
var compounds = {max:0,data:[]};
var filteredAssays = {max:0,data:{}};
var assaysVcell = {max:0,data:{}};
var assaysVcompound = {max:0,data:{}};
var timeout; 
var columnIndex = "Cell"
var rowIndex = "Compound"
var first = true;
var downloadData = "";

var smAnnotations ={};
var clAnnotations ={};
var smKeys = [];
var clKeys = [];
var fdKeys = [];

var maxDisplayed = 10000


var gridSize = 5*5,
		gridH = 27,
		gridW = 27;


d3.select('#vis').classed(colorScheme, true);
d3.tsv('SM_annotations.tsv',function(data) {
	data.forEach(function(d){
		smAnnotations[d['LSM_ID']] = d;
	})
	var key = Object.keys(smAnnotations[Object.keys(smAnnotations)[0]]);
	for(var a = 0; a<key.length;a++){
		if(key[a].indexOf("Name") === -1 && key[a].indexOf("ID") === -1){
			smKeys.push(key[a])
		}
	}
});
d3.tsv('CL_annotations.tsv',function(data) {
	data.forEach(function(d){
		clAnnotations[d['CL_Name']] = d;
	})
	var key = Object.keys(clAnnotations[Object.keys(clAnnotations)[0]]);
	for(var a = 0; a<key.length;a++){
		if(key[a].indexOf("Name") === -1){
			clKeys.push(key[a])
		}
	}
});

$(function() 	{
	var loadingStatus = d3.select("#legend").selectAll("#loadingStatus").data([0]); 
	loadingStatus.enter().append("div").attr('id','loadingStatus')
	$('#zoomSlider').change(function() {
		var val =$(this).val()
		if(val < 1)
			val = 1;
		heatMapZoom(1/((1001-val)/1000))
	});
	$('#fileButton').click(function(){
		loadAnnotations("sm");
		loadAnnotations("cl");
		loadFile();
	});
	$('#fileButton2').click(function(){
		d3.text($('#fileSelect').val(), function(error,text) {
			firstParse(text)
		})
	});
	$('#downloadbutton').click(function(){
		var file = new Blob([downloadData], {type: 'text/tsv'});
		if (window.navigator.msSaveOrOpenBlob) // IE10+
			window.navigator.msSaveOrOpenBlob(file, filename);
		else { // Others
			var a = document.createElement("a"),
					url = URL.createObjectURL(file);
			a.href = url;
			a.download = "data.tsv";
			document.body.appendChild(a);
			a.click();
			setTimeout(function() {
				document.body.removeChild(a);
				window.URL.revokeObjectURL(url);  
			}, 0); 
		}
	});
	$('#devMode').click(function(){
		$('#customFileLoader').show();
	});
	
	$('#collapseFilter').click(function(){
		$('#filterDivs').toggle();
		if($(this).html() =="+"){
			$(this).html("-")
			$('#svgData').css("height",385);
			$('#svgRows').css("height",385);
			$('#heatmap').css("height",500);
		}else{
			$(this).html("+")
			$('#svgData').css("height",585);
			$('#svgRows').css("height",585);
			$('#heatmap').css("height",700);
		}
	});
	
	$("#filterbutton").click(function(){
		filterData =[];
		clearTimeout(timeout);
		if(Object.keys(cellCompoundToAssays).length > 0){
			for(var cell in cellCompoundToAssays){
				for(var compound in cellCompoundToAssays[cell]){
					var assaysA = []
					for(var aPos=0; aPos < cellCompoundToAssays[cell][compound].length; aPos++){
						assaysA.push(cellCompoundToAssays[cell][compound][aPos]['Assay'])
					}
					assaysA = assaysA.unique()
					if(assaysA.length > assays.max){
						assays.max = assaysA.length
					}
					filterData.push({
						"Cell":cell,
						"Compound":compound,
						"Assays": assaysA,
						"value": assaysA.length
					})
				}
			}
		}else{
			filterData = rawData.slice(0);
		}
		parseDataWrapper();
	})

	/* ************************** */
	
	// tiles mouseover events
	
});

function parseDataWrapper(){
	$("#downloadbutton").prop('disabled', true);
	filteredAssays = {max:0,data:{}};
	rows = [];
	columns= [];
	fdKeys = Object.keys(filterData[0]);
	data = {'max':0,'data':[]};
	assaysVcell = {max:0,data:{}};
	assaysVcompound = {max:0,data:{}};
	functions = [filterInvalid,filterAssay,filterAssayName,
		filterCellName,filterCellOrgan,filterCellDisease,
		filterCompoundMOA,filterCompoundTarget
	];
	downloadData ="";
	//downloadData = Object.keys(filterData[0]).join(" \t") + "\t# of Assays";
	for(var a = 0; a< fdKeys.length;a++){
		if(a>0){
			downloadData += "\t";
		}
		if(fdKeys[a] == "value"){
			downloadData +="# of Assays"
		}else{
			downloadData +=fdKeys[a]
		}
	}
	if("Compound" in filterData[0]){
		for(var a = 0; a<smKeys.length;a++){
			downloadData += "\t";
			downloadData +=smKeys[a]
		}
	}
	if("Cell" in filterData[0]){
		for(var a = 0; a<clKeys.length;a++){
			downloadData += "\t";
			downloadData +=clKeys[a]
		}
	}
	downloadData += "\n";
	filter(functions)
}

function filter(functions,start = filterData.length-1,functionPosition = 0){
	var stopValue = start - 1000 > 0 ?start - 1000 : 0
	d3.select("#loadingStatus").html(" Currently Filtering : "+(filterData.length - stopValue)+" / " +filterData.length)
	for(var i = start; i >= stopValue; i--){
		var check = filterData[i]
		for(var f =0; f< functions.length;f++){
			if(functions[f](check)){
				filterData.splice(i,1); 
				break;
			}
		}
	}
	if( stopValue > 0){
		timeout = setTimeout(function(){
			filter(functions,stopValue,functionPosition)
		},50)
	}else{
		d3.select("#loadingStatus").html("");
		timeout = setTimeout(function(){
			parse()
		},50)
	}
}

function filterInvalid(check){
	return typeof check != "object"
}

function filterAssay(check){
	var assayCountFilter = $("#assayFilter").val()
	return check["value"] < assayCountFilter 
}

function filterAssayName(check){
	var assayNameFilter = $('#assayNameFilter').val()
	var assayNameLogic = $('#assayNameLogic').val()
	if(assayNameFilter.length ==0)
		return false
	
	var assaysToFilter = check["Assays"];
	if(columnIndex == "Assays"){
		if(rowIndex == "Cell"){
			if(!(check["Cell"] in clAnnotations))
				return true;
			assaysToFilter = clAnnotations[check["Cell"]]['Assay'].split(";")
		}else if(rowIndex == "Compound"){
			if(!(check["Compound"] in smAnnotations))
				return true;
			assaysToFilter = smAnnotations[check["Compound"]]['Assay'].split(";")
		}
	}
	
	
	if(assayNameLogic == "Or"){
		for(var i=0;i<assayNameFilter.length;i++){
			var index = assaysToFilter.indexOf(assayNameFilter[i])
			if(index!==-1){
				return false;
			}
		}
		return true;
	}else if(assayNameLogic == "And"){
		var remove = false;
		for(var i=0;i<assayNameFilter.length;i++){
			var index = assaysToFilter.indexOf(assayNameFilter[i])
			if(index===-1){
				remove = true;
			}
		}
		return remove;
	}
	return false;
}

function filterCellName(check){
	if(!("Cell" in check))
		return false;
	var cellNameFilter = $('#cellNameFilter').val()
	if(cellNameFilter.length ==0)
		return false
	var index = cellNameFilter.indexOf(check["Cell"])
	if(index===-1){
		return true;
	}
	return false;
}

function filterCellOrgan(check){
	if(!("Cell" in check))
		return false;
	var cellOrganFilter = $('#cellOrganFilter').val()
	if(cellOrganFilter.length ==0)
		return false
	if(!(check["Cell"] in clAnnotations))
		return true;
	var index = cellOrganFilter.indexOf(clAnnotations[check["Cell"]]['Organ'])
	if(index===-1){
		return true;
	}
	return false;
}

function filterCellDisease(check){
	if(!("Cell" in check))
		return false;
	var cellDiseaseFilter = $('#cellDiseaseFilter').val()
	var cellDiseaseLogic = $('#cellDiseaseLogic').val()
	if(cellDiseaseFilter.length ==0)
		return false
	if(!(check["Cell"] in clAnnotations))
		return true;
	if(cellDiseaseLogic == "Or"){
		for(var i=0;i<cellDiseaseFilter.length;i++){
			var index = clAnnotations[check["Cell"]]['Disease'].split(",").indexOf(cellDiseaseFilter[i])
			if(index!==-1){
				return false;
			}
		}
		return true;
	}else if(cellDiseaseLogic == "And"){
		var remove = false;
		for(var i=0;i<cellDiseaseFilter.length;i++){
			var index = clAnnotations[check["Cell"]]['Disease'].split(",").indexOf(cellDiseaseFilter[i])
			if(index===-1){
				remove = true;
			}
		}
		return remove;
	}
	return false;
}
/*
function filterCompoundName(check){
	if(!("Compound" in check))
		return false;
	var compoundNameFilter = $('#compoundNameFilter').val()
	if(compoundNameFilter.length ==0)
		return false
	if(!(check["Compound"] in smAnnotations))
		return true;
	var index = compoundNameFilter.indexOf(check["Compound"])
	if(index!==-1){
		return false;
	}
	index = compoundNameFilter.indexOf(smAnnotations[check["Compound"]]['SM_Name'])
	if(index!==-1){
		return false;
	}
	var altNames = smAnnotations[check["Compound"]]['SM_Alternative_Name'].split(",");
	for(var i=0;i<altNames.length;i++){
		index = compoundNameFilter.indexOf(altNames[i])
		if(index!==-1){
			return false;
		}
	}
	return true;
}
*/
function filterCompoundMOA(check){
	if(!("Compound" in check))
		return false;
	var compoundMOAFilter = $('#compoundMOAFilter').val()
	var compoundMOALogic = $('#compoundMOALogic').val()
	if(compoundMOAFilter.length ==0)
		return false
	if(!(check["Compound"] in smAnnotations))
		return true;
	if(compoundMOALogic == "Or"){
		for(var i=0;i<compoundMOAFilter.length;i++){
			var index = smAnnotations[check["Compound"]]['MoA'].split(",").indexOf(compoundMOAFilter[i])
			if(index!==-1){
				return false;
			}
		}
		return true;
	}else if(compoundMOALogic == "And"){
		var remove = false;
		for(var i=0;i<compoundMOAFilter.length;i++){
			var index = smAnnotations[check["Compound"]]['MoA'].split(",").indexOf(compoundMOAFilter[i])
			if(index===-1){
				remove = true;
			}
		}
		return remove;
	}
	return false;
}

function filterCompoundTarget(check){
	if(!("Compound" in check))
		return false;
	var compoundTargetFilter = $('#compoundTargetFilter').val()
	var compoundTargetLogic = $('#compoundTargetLogic').val()
	if(compoundTargetFilter.length ==0)
		return false
	if(!(check["Compound"] in smAnnotations))
		return true;
	if(compoundTargetLogic == "Or"){
		for(var i=0;i<compoundTargetFilter.length;i++){
			var index = smAnnotations[check["Compound"]]['Target_MoA'].split(",").indexOf(compoundTargetFilter[i])
			if(index!==-1){
				return false;
			}
		}
		return true;
	}else if(compoundTargetLogic == "And"){
		var remove = false;
		for(var i=0;i<compoundTargetFilter.length;i++){
			var index = smAnnotations[check["Compound"]]['Target_MoA'].split(",").indexOf(compoundTargetFilter[i])
			if(index===-1){
				remove = true;
			}
		}
		return remove;
	}
	return false;
}

function parse(functions = [],start = 0,functionPosition = 0){
	functions = [parseData,populateData]
	var stopValue = start + 1000 > filterData.length-1 ? filterData.length-1 : start + 1000
	functions[functionPosition](start,stopValue)
	if( stopValue < filterData.length-1){
		d3.select("#loadingStatus").html(" Currently "+functions[functionPosition].name+": "+stopValue+" / " +filterData.length)
		timeout = setTimeout(function(){
			parse(functions,stopValue,functionPosition)
		},50)
	}else{
		d3.select("#loadingStatus").html("");
		if(functionPosition+1 == functions.length){
			d3.select("#loadingStatus").html("Currently Rendering")
			timeout = setTimeout(function(){
				drawHeatmap()
				if(Object.keys(assaysVcell).length > 0 && Object.keys(assaysVcompound).length > 0){
					drawHistogram(d3.selectAll('#assayXcombo'),filteredAssays)
				}
				if(Object.keys(assaysVcell).length > 0){
					drawHistogram(d3.selectAll('#assayXcell'),assaysVcell)
				}
				if(Object.keys(assaysVcompound).length > 0){
					drawHistogram(d3.selectAll('#assayXcompound'),assaysVcompound)
				}
				$("#downloadbutton").prop('disabled', false);
			},50)
		}else{
			timeout = setTimeout(function(){
				parse(functions,0,functionPosition+1)
			},50)
		}
	}
}

function parseData(start,stopValue){
	for(var i = start; i < stopValue; i++){
		if(typeof filterData[i] == "object"){
			var colIndex = filterData[i][columnIndex]
			if(colIndex.length == 1){
				colIndex = colIndex[0]
			}
			if(columns.indexOf(colIndex)===-1 && i <maxDisplayed){
				columns.push(colIndex);
			}
			if(rows.indexOf(filterData[i][rowIndex])===-1&& i <maxDisplayed){
				rows.push(filterData[i][rowIndex]);
			}
			if("Assays" in filterData[i]){
				filterData[i]["Assays"].forEach(function(assay){
					if(assay in filteredAssays.data == false){
						filteredAssays.data[assay] = 0
					}
					filteredAssays.data[assay]++;
					if("Cell" in filterData[i]){
						if(assay in assaysVcell.data == false){
							assaysVcell.data[assay] = []
						}
						assaysVcell.data[assay].push(filterData[i]["Cell"])
					}
					
					
					if("Compound" in filterData[i]){
						if(assay in assaysVcompound.data == false){
							assaysVcompound.data[assay] = []
						}
						assaysVcompound.data[assay].push(filterData[i]["Compound"])
					}
					
				})
				if(filterData[i]["Assays"].length > filteredAssays.max){
					filteredAssays.max = filterData[i]["Assays"].length;
				}
			}
			filterData[i]["value"] = 1;
			if(columnIndex != "Assays"){
				filterData[i]["value"] = filterData[i]["Assays"].length;
				if(filterData[i]["value"] > data.max){
					data.max = filterData[i]["value"];
				}
			}
		}

		downloadData += Object.values(filterData[i]).join(" \t");
		if("Compound" in filterData[i]){
			if(filterData[i]['Compound'] in smAnnotations){
				for(var a = 0; a<smKeys.length;a++){
					downloadData += "\t";
					downloadData +=smAnnotations[filterData[i]['Compound']][smKeys[a]]
				}
			}else{
				for(var a = 0;a <smKeys.length; a++ ){
					downloadData +="\t"
				}
			}
		}
		if("Cell" in filterData[i]){
			if(filterData[i]['Cell'] in clAnnotations){
				for(var a = 0; a<clKeys.length;a++){
					downloadData += "\t";
					downloadData +=clAnnotations[filterData[i]['Cell']][clKeys[a]]
				}
			}else{
				for(var a = 0;a <clKeys.length; a++ ){
					downloadData +="\t"
				}
			}
		}
		downloadData +='\n';
	}
	if(stopValue == filterData.length-1){
		for (var i = 0; i < rows.length; i++) {
			data.data[i] = new Array(columns.length);
		}
		var assays = Object.keys(assaysVcell.data)
		for (var i = 0; i < assays.length; i++) {
			assaysVcell.data[assays[i]] = assaysVcell.data[assays[i]].unique()
			if(assaysVcell.data[assays[i]].length > assaysVcell.max){
				assaysVcell.max = assaysVcell.data[assays[i]].length
			}
			assaysVcell.data[assays[i]] = assaysVcell.data[assays[i]].length
		}
		if(Object.keys(assaysVcompound.data).length > 0){
			for (var i = 0; i < assays.length; i++) {
				assaysVcompound.data[assays[i]] = assaysVcompound.data[assays[i]].unique()
				if(assaysVcompound.data[assays[i]].length > assaysVcompound.max){
					assaysVcompound.max = assaysVcompound.data[assays[i]].length
				}
				assaysVcompound.data[assays[i]] = assaysVcompound.data[assays[i]].length
			}
		}
	}
}
function populateData(start,stop){
	for(var i = start; i < stop; i++){
		if(typeof filterData[i] == "object" && i < maxDisplayed){
			var c = columns.indexOf(filterData[i][columnIndex]);
			var r = rows.indexOf(filterData[i][rowIndex]);
			data.data[r][c] = i;
		}
	}

}

/* ************************** */

function isOldBrowser() {
}


/* ************************** */

function selectedType() {
}

/* ************************** */

function addStateButtons() {
}

/* ************************** */

function getCalcs(state, view) {
};

/* ************************** */

function reColorTiles(state, view) {
}

/* ************************** */

function flipTiles() {
}

/* ************************** */

function drawHistogram(element,histoData ) {
	
	element.html("");
	

	
	var weeklyData = Object.keys(histoData.data);
	var a  = average(Object.values(histoData.data))
	var w = 200
		h =weeklyData.length * 12 + 50;
	var textHeight = 130;
	var largestAssay = 0;
	var largestUnderMean = 0;
	var secondChartExtension = 0;
	var splitChart = false;
	if(a.mean < a.deviation && a.mean > 1000){
		splitChart = true;
		secondChartExtension = 150;
	}
	weeklyData.forEach(function(d){
		if(splitChart && histoData.data[d] < a.mean && histoData.data[d] > largestUnderMean){
			largestUnderMean = histoData.data[d];
		}
		if(histoData.data[d] > largestAssay)
			largestAssay = histoData.data[d]
	})
	if(!splitChart){
		largestUnderMean = largestAssay;

	}
	if(splitChart){
		var y2 = d3.scaleLinear()
		.domain([largestUnderMean, largestAssay])
		.range([0, 100]);
	}
	var y = d3.scaleLinear()
		.domain([0, largestUnderMean])
		.range([0, w]);

	
	var chart = element.append('svg:svg')
		.attr('class', 'chart')
		.attr('width', textHeight+w+secondChartExtension+50)
		.attr('height', h);
		
	var rect = chart.selectAll('rect'),
		text = chart.selectAll('text');
	

		
	text.data(weeklyData)
		.enter()
			.append('svg:text')
				.attr("x", 20)
				.attr('width',150)
				.attr("y", function(d, i) { return (i * 12) + 20})
				.attr("text-anchor", 'left')
				.text(function(d) { return d; });
	chart.append('svg:rect')
				.attr("x", 150)
				.attr("y",0)
				.attr('width', textHeight+w+30)
				.attr('height', h)
				.attr('style','fill:white;');
				
	if(splitChart){			
		chart.append('svg:text')
			.attr('x',textHeight+w)
			.attr('y',10)
			.text(largestUnderMean);
		chart.append('svg:text')
			.attr('x',textHeight+secondChartExtension+w)
			.attr('y',10)
			.text(largestAssay);
	}else{
		chart.append('svg:text')
			.attr('x',textHeight+w)
			.attr('y',10)
			.text(largestAssay);
	}
	chart.append('svg:text')
		.attr('x',150)
		.attr('y',10)
		.text(0);
	rect.data(weeklyData)
		.enter()
			.append('svg:rect')
				//.attr('x', function(d, i) { return (i * 12) +30; })
				.attr("x", 150)
				//.attr('y', function(d) { return h - y(filteredAssays.data[d]) })
				.attr("y", function(d, i) { return (i * 12) +12})
				//.attr('height', function(d) { return y(filteredAssays.data[d]) })
				.attr('height', 10)
				//.attr('width', 10)
				.attr('width', function(d) { return y(histoData.data[d]) > w ? w :y(histoData.data[d]) })
				.attr('id',function(d, i) { return 'assayHisto'+i})
				.attr('class', function(d, i) { return 'hr' + i});
	if (splitChart){
		rect.data(weeklyData)
			.enter()
				.append('svg:rect')
					//.attr('x', function(d, i) { return (i * 12) +30; })
					.attr("x", 380)
					//.attr('y', function(d) { return h - y(filteredAssays.data[d]) })
					.attr("y", function(d, i) { return (i * 12) +12})
					//.attr('height', function(d) { return y(filteredAssays.data[d]) })
					.attr('height', 10)
					//.attr('width', 10)
					.attr('width', function(d) {
							var result = y2(histoData.data[d])
							if(result < 0)
								return 0
							if(result > 100)
								return 100
							return result
						})
					.attr('id',function(d, i) { return 'assayHisto'+i})
					.attr('class', function(d, i) { return 'hr' + i});
	}
	text.data(weeklyData)
		.enter()
			.append('svg:g')
				.attr("class",'histoText')
				.append('svg:text')
					.attr("x", 20)
					.attr('width',150)
					.attr("y", function(d, i) { return (i * 12) + 20})
					.attr("text-anchor", 'left')
					.text(function(d) { return d; });
	
	
	
}

/* ************************** */

function drawMobilePie(state) {
	
}

/* ************************** */

function updateIE8percents(state) {
}

/* ************************** */

function createTiles() {

}

/* ************************** */

function selectHourlyChartBar(hour) {

};

/* ************************** */

function createMap() {

}
function heatMapZoom(level){
	var height=gridH *rows.length+40,
		width=gridW*columns.length +40,
		zoomX =width * level,
		zoomY =height * level;
	d3.select("#svgData svg").attr('viewBox','0 0 '+zoomX+' '+zoomY+'').attr('height',height / level).attr('width',width/level)
	d3.select("#svgColumns svg").attr('viewBox','0 0 '+zoomX+' '+d3.select("#svgColumns svg").attr('height')+'').attr('width',width/level)
	d3.select("#svgRows svg").attr('viewBox','0 0 '+d3.select("#svgRows svg").attr('width')+' '+zoomY+'').attr('height',height / level)
}

function drawHeatmap(){
	//height of each row in the heatmap
	//width of each column in the heatmap
	gridSize = rows.length*columns.length

	d3.select("#heatmapData").html("")
	
	var columnHeight = 0;
	for (var c = 0; c < columns.length; c++) {
		if(columns[c].length *3 > columnHeight){
			columnHeight = columns[c].length *8;
		}
	}
	var rowWidth = 0;
	for (var c = 0; c < rows.length; c++) {
		if(rows[c].length *3 > rowWidth){
			rowWidth = rows[c].length *8;
		}
	}
	var svgColumns = d3.select("#heatmapData")
		.append("div")
		.attr("id","svgColumns")
		.append("svg")
		.attr("width", gridW*columns.length +75)
		.attr("height", 90)
	d3.select("#heatmapData").append("br")
	
	d3.set(columns).each(function(d){
		if(d.length ==1){
			d = d[0]
		}
		var m = 1
		if(rowIndex=="Cell" && columnIndex=="Assays"){
			m=2;
		}
		var width = (columns.indexOf(d)* gridW) + (m * gridW)
		svgColumns.append("text")
		.attr("x", width)
		.attr("y",89)
		.attr("transform","rotate(-45,"+width+","+89+")")
		.text(d)
	})
	
	var svgRows = d3.select("#heatmapData")
		.append("div")
		.attr("id","svgRows")
		.append("svg")
		.attr("width", rowWidth+20)
		.attr("height",gridH *rows.length+40)
		
	d3.set(rows).each(function(d){
		var height = (rows.indexOf(d)*gridH) + 15
		svgRows.append("text")
		.attr("x",15)
		.attr("y",height)
		.text(d)
	})
	
		
	
			 
	var svg = d3.select("#heatmapData")
		.append("div")
		.attr("id","svgData")
		.append("svg")
		.attr("width", gridW*columns.length +70)
		.attr("height",gridH *rows.length+40)
		
	$("#svgData").scroll(function(){
		$("#svgRows").scrollTop($(this).scrollTop())
		$("#svgColumns").scrollLeft($(this).scrollLeft())
	})

	var stopValue = filterData.length > maxDisplayed ?maxDisplayed : filterData.length
	timeout = setTimeout(function(){
				drawHeatmapData(0,stopValue)
	},200)
	
	d3.select("#loadingStatus").html("");
	if($('#collapseFilter').html() =="+"){
		$('#svgData').css("height",385);
		$('#svgRows').css("height",385);
		$('#heatmap').css("height",500);
	}else{
		$('#svgData').css("height",585);
		$('#svgRows').css("height",585);
		$('#heatmap').css("height",700);
	}
}

function drawHeatmapData(start,end){
			
		
	var colorScale = d3.scaleQuantize()
		 .domain([0, data.max > 0 ? data.max : 1])
		 .range([11,10,9,8,7,6,5,4,3,2,1,0]);

	var svg = d3.select("#svgData svg");
	var endValue = start+100 < end ? start+100 : end
	d3.select("#loadingStatus").html(" Currently Rendering : "+endValue+" / " +end)
	for(var i = start; i < endValue; i++){
		var colIndex = filterData[i][columnIndex]
		if(colIndex.length == 1){
			colIndex = colIndex[0]
		}
		var c = columns.indexOf(colIndex)
		var r = rows.indexOf(filterData[i][rowIndex])
		var group = svg.append("svg:g")
				.attr("x", c * gridW+0.2*gridW )
				.attr("y", r * gridH)
				.attr("id", c + ':' + r );
			group.append("rect")
				.attr("x",c * gridW+0.2*gridW)
				.attr("y",r * gridH)
				.attr("width", gridW-2)
				.attr("height", gridH-2)
				.attr("fill",'hsl(200, 100%,'+((parseInt(colorScale(filterData[i]['value']))*5.5)+24)+'%)')
				.attr("id",'rectc-'+c+'r-'+r)
				.classed('svgRect',true);

			group.append("rect")
				.attr("x",c * gridW+0.1*gridW)
				.attr("y",r * gridH+10)
				.attr("width", gridW/2)
				.attr("height", gridH/2)
				.attr("fill",'black')
				.classed('tooltip', true);

			group.append("text")
				.attr("x",c * gridW+0.2*gridW)
				.attr("y",r * gridH+22)
				.attr("fill",'white')
				.text(filterData[i]['value'])
				.classed('tooltip', true);
	}		
	$('.svgRect').hover(function() {
		var tmp = $(this).attr('id').substr(4).split('c-').join('').split('r-'),
			c = parseInt(tmp[0]),
			r = parseInt(tmp[1]);
		d3.select("#"+$(this).attr('id')).classed('sel',true);
		var assayArray = Object.keys(filteredAssays.data);
		var dataId = data.data[r][c]
		var dataEntry = filterData[dataId]
		dataEntry['Assays'].forEach(function(assay){
			d3.select("#assayHisto"+assayArray.indexOf(assay)).classed('sel',true);
		})
	}, function() {
		var tmp = $(this).attr('id').substr(4).split('c-').join('').split('r-'),
			c = parseInt(tmp[0]),
			r = parseInt(tmp[1]);
		d3.select("#"+$(this).attr('id')).classed('sel',false);
		var assayArray = Object.keys(filteredAssays.data);
		var dataId = data.data[r][c]
		var dataEntry = filterData[dataId]
		dataEntry['Assays'].forEach(function(assay){
			d3.select("#assayHisto"+assayArray.indexOf(assay)).classed('sel',false);
		})
	});
	if(endValue != end){
		timeout = setTimeout(function(){
				drawHeatmapData(endValue,end)
		},200)
	}else{
		d3.select("#loadingStatus").html("")
	}
}

function loadFile() {
    var input, file, fr;
	d3.select('#vis').html("");
    if (typeof window.FileReader !== 'function') {
      alert("The file API isn't supported on this browser yet.");
      return;
    }

    input = document.getElementById('fileinput');
    if (!input) {
      alert("Um, couldn't find the fileinput element.");
    }
    else if (!input.files) {
      alert("This browser doesn't seem to support the `files` property of file inputs.");
    }
    else if (!input.files[0]) {
      alert("Please select a file before clicking 'Load'");
    }
    else {
      file = input.files[0];
      fr = new FileReader();
      fr.onload = receivedText;
      fr.readAsText(file);
    }

    function receivedText(e) {
		clearTimeout(timeout);
		firstParse(e.target.result)
    }
 }
function loadAnnotations(annotation) {
    var input, file, fr;
    if (typeof window.FileReader !== 'function') {
      alert("The file API isn't supported on this browser yet.");
      return;
    }
	if(annotation == "sm"){
		input = document.getElementById('smannotationinput');
	}
	if(annotation == "cl"){
		input = document.getElementById('clannotationinput');
	}
    if (!input) {
      alert("Um, couldn't find the fileinput element.");
    }
    else if (!input.files) {
      alert("This browser doesn't seem to support the `files` property of file inputs.");
    }
    else if (!input.files[0]) {
      alert("Please select a file before clicking 'Load'");
    }
    else {
      file = input.files[0];
      fr = new FileReader();
      fr.onload = receivedText;
      fr.readAsText(file);
    }

    function receivedText(e) {
		d3.csvParse(e.target.result,function(d,i){
			if(annotation == "sm"){
				smAnnotations[d['LSM_ID']] = d;
			}
			if(annotation == "cl"){
				clAnnotations[d['CL_Name']] = d;
			}
		})
		var key = []
		if(annotation == "sm"){
			key = Object.keys(smAnnotations[Object.keys(smAnnotations)[0]]);
		}
		if(annotation == "cl"){
			key = Object.keys(clAnnotations[Object.keys(clAnnotations)[0]]);
		}
		for(var a = 0; a<key.length;a++){
			if(key[a].indexOf("Name") === -1){
				if(annotation == "cl" && key[a].indexOf("ID") === -1){
					cmKeys.push(key[a])
				}
				if(annotation == "cl"){
					smKeys.push(key[a])
				}
			}
		}
    }
}

function firstParse(text){
	clearTimeout(timeout);
	$("#downloadbutton").prop('disabled', true);
	$('#compoundFilterDiv').hide();
	$('#cellFilterDiv').hide();
	columnIndex = "Cell"
	rowIndex = "Compound"
	d3.select("#heatmapData").html("")
	fileText = text.trim();
	fileSize = fileText.split('\n').length; 
	console.log("n " + fileSize); 
	rawData =[];
	filterData = [];
	currentLine = 0;
	currentProgress = 0;
	assays = {max:0,data:[]};
	cells = {max:0,data:[]};
	compounds = {max:0,data:[]};
	cellCompoundToAssays = {};
	timeout = setTimeout(parseCsvPieces,50)

}

function parseCsvPieces(){
	currentProgress = 0;
	var completed = false;
	d3.csvParse(fileText,function(line,i){
		completed = true;
		if(i < currentLine || currentProgress > 20000){
			if(currentProgress > 2000)
				completed = false;
			return
		}
		if(i===0){
			if(!("Compound" in line)){
				columnIndex = "Assays"
				rowIndex = "Cell"
			}
			if(!("Cell" in line)){
				columnIndex = "Assays"
				rowIndex = "Compound"
			}
		}
		currentProgress++;
		currentLine = i;
		if(typeof line =="object"){
			if("Assays" in line){
				if(typeof line['Assays'] === 'string'){
					var arrayAssay = line['Assays'].split("##").unique();
					line['Assays'] = arrayAssay;
				}
				var a = line["Assays"]
				for (var q = 0; q < a.length; q++){
					if(assays.data.indexOf(a[q]) == -1){
						assays.data.push(a[q])
					}
				}
				line['value'] = line["Assays"].length
				if(line['value'] > assays.max){
					assays.max = line['value'];
				}
			}
			if("Cell" in line){
				cells.data.push(line['Cell'])
			}
			if("Compound" in line){
				compounds.data.push(line['Compound'])
			}
			if("Assay" in line){
				if(assays.data.indexOf(line['Assay']) == -1){
					assays.data.push(line['Assay'])
				}
				if(!(line['Cell'] in cellCompoundToAssays)){
					cellCompoundToAssays[line['Cell']] ={}
				}
				if(!(line['Compound'] in cellCompoundToAssays[line['Cell']])){
					cellCompoundToAssays[line['Cell']][line['Compound']] = []
				}
				cellCompoundToAssays[line['Cell']][line['Compound']].push(line)
			}
			if(columnIndex == "Assays"){
				for (var q = 0; q < line['Assays'].length; q++){
					var o = {};
					o[rowIndex] = line[rowIndex];
					o['Assays'] = [line['Assays'][q]]
					rawData.push(o)
				}
			}else{
				rawData.push(line)
			}
		}
	});
	if(completed == false){
		d3.select("#loadingStatus").html(" Currently loading: "+currentLine+" / " +fileSize)
		timeout = setTimeout(parseCsvPieces,50)
	}
	if(completed){
		d3.select("#loadingStatus").html(" Currently loading Annotations")
		compounds.data = compounds.data.unique()
		cells.data = cells.data.unique()
		timeout = setTimeout(setupFilters,50)
	}
}
function setupFilters(){
	if(Object.keys(cellCompoundToAssays).length > 0){
		for(var cell in cellCompoundToAssays){
			for(var compound in cellCompoundToAssays[cell]){
				var assaysA = []
				for(var aPos=0; aPos < cellCompoundToAssays[cell][compound].length; aPos++){
					assaysA.push(cellCompoundToAssays[cell][compound][aPos]['Assay'])
				}
				assaysA = assaysA.unique()
				if(assaysA.length > assays.max){
					assays.max = assaysA.length
				}
				filterData.push({
					"Cell":cell,
					"Compound":compound,
					"Assays": assaysA,
					"value": assaysA.length
				})
			}
		}
	}else{
		filterData = rawData.slice(0);
	}
	$("#assayFilter").html(function(){
		var html = "";
		html +="<option>Assay Count</option>"
		for(var i = 0; i<assays.max+1;i++){
			html +="<option>"+i+"</option>"
		}
		return html;
	});
	$("#assayNameFilter").html(function(){
		var html =""
		for(var i = 0; i<assays.data.length;i++){
			html +="<option>"+assays.data[i]+"</option>"
		}
		return html;
	});
	$('#assayNameFilter').select2({	
		placeholder: 'Assay Name',
		closeOnSelect: false,
		width: 250,
		theme: "flat",
		dropdownAdapter: $.fn.select2.amd.require('select2/selectAllAdapter')
	});
	$('#assayNameLogic').select2({
	  width: 50,
	  theme: "flat",
	  minimumResultsForSearch: -1
	});
	$('#assayFilter').select2({
	  placeholder: 'Assay Count',
	  width: 250,
	  theme: "flat",
	});


	$('#assayNameFilter').show();
	$('#assayNameLogic').show();
	$('#assayFilter').show();
	
	if("Cell" in filterData[0]){
		$("#cellNameFilter").html(function(){
			var html ="";
			for(var i = 0; i<cells.data.length;i++){
				html +="<option>"+cells.data[i]+"</option>";
			}
			return html;
		});
		$('#cellNameFilter').select2({
			placeholder: 'Cell Name',
			closeOnSelect: false,
			width: 250,
			theme: "flat",
			dropdownAdapter: $.fn.select2.amd.require('select2/selectAllAdapter')
		});
		$("#cellOrganFilter").html(function(){
			var html ="";
			var organs = [];
			for(var i = 0; i<cells.data.length;i++){
				if(cells.data[i] in clAnnotations)
					organs.push(clAnnotations[cells.data[i]]['Organ'])
			}
			organs = organs.unique();
			for(var i = 0; i<organs.length;i++){
				html +="<option>"+organs[i]+"</option>";
			}
			return html;
		});
		$('#cellOrganFilter').select2({
			placeholder: 'Cell Organs',
			closeOnSelect: false,
			width: 250,
			theme: "flat",
			dropdownAdapter: $.fn.select2.amd.require('select2/selectAllAdapter')
		});
		$("#cellDiseaseFilter").html(function(){
			var html ="";
			var diseases = [];
			for(var i = 0; i<cells.data.length;i++){
				if(cells.data[i] in clAnnotations){
					diseaseArray = clAnnotations[cells.data[i]]['Disease'].split(";")
					for(var q = 0; q<diseaseArray.length;q++){
						diseases.push(diseaseArray[q])
					}
				}
			}
			diseases = diseases.unique();
			for(var i = 0; i<diseases.length;i++){
				html +="<option>"+diseases[i]+"</option>";
			}
			return html;
		});
		$('#cellDiseaseFilter').select2({
			placeholder: 'Cell Disease',
			closeOnSelect: false,
			width: 250,
			theme: "flat",
			dropdownAdapter: $.fn.select2.amd.require('select2/selectAllAdapter')
		});
		$('#cellDiseaseLogic').select2({
		  width: 50,
		  theme: "flat",
		  minimumResultsForSearch: -1
		});
		$('#cellFilterDiv').show();
	}	
	if("Compound" in filterData[0]){
		$("#compoundTargetFilter").html(function(){
			var html ="";
			var targets = [];
			for(var i = 0; i<compounds.data.length;i++){
				if(compounds.data[i] in smAnnotations){
					targetArray = smAnnotations[compounds.data[i]]['Target_MoA'].split(";")
					for(var q = 0; q<targetArray.length;q++){
						targets.push(targetArray[q])
					}
				}
			}
			targets = targets.unique();
			for(var i = 0; i<targets.length;i++){
				html +="<option>"+targets[i]+"</option>";
			}
			return html;
		});
		$('#compoundTargetFilter').select2({
			placeholder: 'Compound Target',
			closeOnSelect: false,
			width: 250,
			theme: "flat",
			dropdownAdapter: $.fn.select2.amd.require('select2/selectAllAdapter')
		});
		$('#compoundTargetLogic').select2({
		  width: 50,
		  theme: "flat",
		  minimumResultsForSearch: -1
		});
		$("#compoundMOAFilter").html(function(){
			var html ="";
			var moas = [];
			for(var i = 0; i<compounds.data.length;i++){
				if(compounds.data[i] in smAnnotations){
					moaArray = smAnnotations[compounds.data[i]]['MoA'].split(";")
					for(var q = 0; q<moaArray.length;q++){
						moas.push(moaArray[q])
					}
				}
			}
			moas = moas.unique();
			for(var i = 0; i<moas.length;i++){
				html +="<option>"+moas[i]+"</option>";
			}
			return html;
		});
		$('#compoundMOAFilter').select2({
			placeholder: 'Compound MOAs',
			closeOnSelect: false,
			width: 250,
			theme: "flat",
			dropdownAdapter: $.fn.select2.amd.require('select2/selectAllAdapter')
		});
		$('#compoundMOALogic').select2({
		  width: 50,
		  theme: "flat",
		  minimumResultsForSearch: -1
		});

		$('#compoundFilterDiv').show();
	}				
	parseDataWrapper();
}

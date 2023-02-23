let dropArea = document.getElementById('drop-area');
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false)
});

function preventDefaults(e) {
    e.preventDefault()
    e.stopPropagation()
};
['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, highlight, false)
});
['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, unhighlight, false)
});
function highlight(e) {
    dropArea.classList.add('highlight')
};
function unhighlight(e) {
    dropArea.classList.remove('highlight')
};

dropArea.addEventListener('drop', handleDrop, false);
function handleDrop(e) {
    let dt = e.dataTransfer
    let files = dt.files

    handleFiles(files)
}

function handleFiles(files) {
    files = [...files];
    if (files.length !== 2) {
        alert("There must be two files (.csv and .met)");
    } else {
        let container = document.getElementById("outputs");
        // Clear old data
        container.innerHTML = "";
        let met = (files[0].name.endsWith(".met") ? files[0] : files[1]);
        let csv = (files[0].name.endsWith(".csv") ? files[0] : files[1]);
        let metReader = new FileReader();
        // Read meta data
        metReader.onload = function (event) {
            let metData = event.target.result;
            // Read csv
            let csvReader = new FileReader();
            csvReader.onload = function (event) {
                let csvData = event.target.result;
                let options = {
                    'prepurge': document.getElementById('prepurge').checked,
                    'sample': document.getElementById('sample').checked,
                    'postpurge': document.getElementById('postpurge').checked,
                    'normalize': document.getElementById('normalize').checked,
                    'cleanData': document.getElementById('cleanData').checked,
                }
                processData(metData, csvData, options, visCallback);
                // Close navigation after this
                closeNav();
            };
            csvReader.readAsText(csv);

        };
        metReader.readAsText(met);
    }
}
function visCallback(data){
    displayParCoord(data, "parcoordsChart")
}
function displayParCoord(data, parcoordId) {
    let classNames = Array.from(new Set(data.map(d=>d.Class)));
            let colors = d3.schemeCategory10;
            let colorMap = {}
            classNames.forEach((cls, i) => colorMap[cls] = colors[i]);
            let colorScale = function (cls) {
                return colorMap[cls];
            }
    let pcTop = 10;
    let pcLeft = 50;
    let pcWidth = window.innerWidth - pcLeft;
    let pcHeight = window.innerHeight - pcTop;
    let container = `#${parcoordId}`;
    // Clean the div
    document.getElementById(parcoordId).innerHTML = "";
    //Setup the layout
    d3.select(container)
        .style('position', 'absolute')
        .style('left', pcLeft + 'px')
        .style('top', (pcTop - 10) + 'px')
        .style('width', pcWidth + "px")
        .style('height', pcHeight + "px")
        .style('outline', 'none')
        .classed("parcoords", true)

    d3.select(container).selectAll("*").remove();
    let pc = parcoords()(`#${parcoordId}`);
    pc
        .data(data)
        .smoothness(0.005)
        .alpha(0.3)
        .margin({ top: 40, left: 10, bottom: 12, right: 10 })
        .render()
        .mode("queue")
        .brushMode("1D-axes")  // enable brushing
        .interactive();
    pc.color(d => colorScale(d['Class'])).render();
    let parcoordSVG = d3.select(container).select("svg");
    parcoordSVG.style("overflow", "visible")
    // Remove ticks on some
    let displayTicksOn = ["Class", "Sample", "Sensor"];
    // Remove labels on some
    let displayLabelsOn = [ "1-1", "3-1", "6-1"];
    parcoordSVG.selectAll('.dimension').each(function(d, i){
        if(displayTicksOn.indexOf(d)<0){
            d3.select(this).selectAll(".tick").style("opacity", 0);
        }
        if(displayLabelsOn.indexOf(d)<0){
            d3.select(this).selectAll(".label").style("opacity", 0);
        }
    });
    
    
    
}
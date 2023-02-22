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
                }
                processData(metData, csvData, options, (oneSampleData, fileName, headers)=>{                    
                });
            };
            csvReader.readAsText(csv);

        };
        metReader.readAsText(met);
    }
}
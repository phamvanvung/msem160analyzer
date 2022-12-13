function processData(metData, csvData, callback) {
    metData = metData.split('\r\n');
    metData = metData.slice(5);

    let parts = metData[0].split('\n');

    let classNames = {}
    parts.forEach(cls => {
        let ps = cls.split('=\t');
        if (ps.length >= 2) {
            classNames[ps[0][ps[0].length - 1]] = ps[1];
        }
    });
    // process csv data
    csvData = csvData.split('\r\n');
    csvData = csvData.slice(2); //Read from the third rows onward (first two rows are not data or header)
    let headers = {}
    let headerLine = csvData[0].split(",");
    let emptyCounter = 1;
    headerLine = headerLine.map((d)=>{
        let header = d;
        if(d===""){
            header = "Untitled" + emptyCounter;
            emptyCounter++;
        }
        headers[header] = header;
        return header;
    })
    csvData[0] = headerLine.join(',');
    debugger
    csvData = csvData.join('\r\n'); // Join back
    csvData = d3.csvParse(csvData);
    // For each classes
    Object.keys(classNames).forEach(cls => {
        let clsData = csvData.filter(d => d.Class === cls);
        // Loop through the items and process the data to add sample counter and add time counter and get the range of each sensor
        let sampleCounter = 0;
        let sampleData = {};
        clsData.forEach((item, i) => {
            //When start
            if (i == 0) {
                //Set sample counter
                sampleCounter = 1;
            } else {
                //Start a new sample or moving from purge phase to sample phase (increases the counter)
                //Also set the time counter to 0
                if (clsData[i - 1].Flag === '6' && clsData[i].Flag === '1') {
                    sampleCounter += 1;
                }
            };
            //Set the sample counter for this item
            if (!sampleData[sampleCounter]){
                sampleData[sampleCounter] = [item];
            }else{
                sampleData[sampleCounter].push(item);
            }
        });
        // For each sample data write a file
        for(i=1; i<=sampleCounter; i++){
            let fileName = classNames[cls] + "-sample-" + i;
            callback(sampleData[i], fileName, headers);
        }
        

    });


}
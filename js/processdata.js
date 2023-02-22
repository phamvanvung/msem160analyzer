function processData(metData, csvData, options, callback) {
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
    csvData = csvData.join('\r\n'); // Join back
    csvData = d3.csvParse(csvData);
    data = [];
    // For each classes
    Object.keys(classNames).forEach(cls => {
        let clsData = csvData.filter(d => d.Class === cls);
        // Loop through the items and process the data to add sample counter and add time counter and get the range of each sensor
        let sampleCounter = 0;
        let sampleData = {};
        clsData.forEach((item, i) => {
            // When start
            if (i == 0) {
                // Set sample counter
                sampleCounter = 1;
            } else {
                // Start a new sample or moving from purge phase to sample phase (increases the counter)
                // Also set the time counter to 0
                if (clsData[i - 1].Flag === '6' && clsData[i].Flag === '1') {
                    sampleCounter += 1;
                }
            };
            // Add sample counter
            item['Sample'] = sampleCounter;
            // Change Class number with name
            item['Class'] = classNames[cls];
            // Add item
            data.push(item)
        });
    });
    // Filter by stage
    data = filterByStage(data, options)
    // Get max time counter
    const maxTimeCount = getMaxTimeCount(data);
    console.log(maxTimeCount);
    // Add time counter
    data = addTimeCounter(data, maxTimeCount);
    // Convert Flag and Sensors into number
    convertFlagAndSensorsToNumbers(data);
    debugger
    console.log(data);
    callback(data);
    //callback with data
}
function filterByStage(data, options){
    result = data;
    if(!options.prepurge){
        result = result.filter(d=>d.Flag!==1);
    }
    if(!options.sample){
        result = result.filter(d=>d.Flag!==2);
    }
    if(!options.postpurge){
        result = result.filter(d=>d.Flag!==3);
    }
    return result;
}
function getMaxTimeCount(data){
    let maxTimeCount = {};
    // classes
    const groups = d3.group(data, d=>d.Class, d=>d.Sample, d=>d.Flag);
    // loop through class
    let classIt = groups.keys()
    let nextClass = classIt.next();
    while(!nextClass.done){
        // loop through sample
        let sampleGroups = groups.get(nextClass.value);
        let sampleIt = sampleGroups.keys();
        let nextSample = sampleIt.next();
        while(!nextSample.done){
            let flagGroups = sampleGroups.get(nextSample.value);
            let flagIt = flagGroups.keys();
            let nextFlag = flagIt.next();
            while(!nextFlag.done){
                let flag = nextFlag.value;
                let l = flagGroups.get(flag).length;
                if(!maxTimeCount[flag] || maxTimeCount[flag] < l){
                    maxTimeCount[flag] = l;
                }
                nextFlag = flagIt.next();
            }
            nextSample = sampleIt.next();

        }
        nextClass = classIt.next();
    }
    return maxTimeCount;
}
function addTimeCounter(data, maxTimeCount){
    let result = [];
    // classes
    const groups = d3.group(data, d=>d.Class, d=>d.Sample, d=>d.Flag);
    // loop through class
    let classIt = groups.keys()
    let nextClass = classIt.next();
    while(!nextClass.done){
        // loop through sample
        let sampleGroups = groups.get(nextClass.value);
        let sampleIt = sampleGroups.keys();
        let nextSample = sampleIt.next();
        while(!nextSample.done){
            let flagGroups = sampleGroups.get(nextSample.value);
            let flagIt = flagGroups.keys();
            let nextFlag = flagIt.next();
            while(!nextFlag.done){
                let flag = nextFlag.value;
                let flagData = flagGroups.get(flag);
                l = flagData.length;
                flagData.forEach((item, i)=>{
                    item.timeStep = (i+1);
                });
                //Add the last part (if it is shorter)
                for(let i = 0; i < maxTimeCount[flag] - l; i++){
                    // copy the previous time step forward
                    let prevRecord = {...flagData[flagData.length-1]};
                    // Add a time step.
                    prevRecord.timeStep = flagData.length;
                    flagData.push(prevRecord);
                }
                // Add it to the result
                result = result.concat(flagData);
                nextFlag = flagIt.next();
            }
            nextSample = sampleIt.next();
        }
        nextClass = classIt.next();
    }
    return result;
}
// Convert flags and sensors into numbers
function convertFlagAndSensorsToNumbers(data){
    let sensors = [];
    for(i=1; i<=32; i++){
        sensors.push("S" + i);
    }
    let flag = "Flag";
    let columns = [flag, ...sensors];
    data.forEach(item=>{
        columns.forEach(c=>{
            item[c] = +item[c];
        })
    });
}
// For each class, for each sensor get the diff population

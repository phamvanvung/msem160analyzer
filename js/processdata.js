function processData(metData, csvData, options, callback) {
    metData = metData.split('\n');
    metData = metData.slice(5);

    let parts = metData.filter(x=>x.indexOf("Class ") == 0);

    let classNames = {}
    parts.forEach(cls => {
        let ps = cls.split('=\t');
        if (ps.length >= 2) {
            classNames[ps[0][ps[0].length - 1]] = ps[1];
        }
    });
    // process csv data
    csvData = csvData.split('\n');
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
    csvData = csvData.join('\n'); // Join back
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
    // Add time counter
    data = addTimeCounter(data, maxTimeCount);
    // Convert Flag and Sensors into number
    convertFlagAndSensorsToNumbers(data);
    // Clean data
    if(options.cleanData){
        cleanData(data);
    }
    // Normalize data
    if(options.normalize){
        normalize(data);
    }
    // Convert to ParCoord data
    data = toParCooordData(data);

    callback(data);
    //callback with data
}
function filterByStage(data, options){
    result = data;
    if(!options.prepurge){
        result = result.filter(d=>d.Flag!=="1");
    }
    if(!options.sample){
        result = result.filter(d=>d.Flag!=="3");
    }
    if(!options.postpurge){
        result = result.filter(d=>d.Flag!=="6");
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
function getInfo(data){
    let classes = new Set(data.map(d=>d.Class));
    let samples = new Set(data.map(d=>d.Sample));
    let flags = new Set(data.map(d=>d.Flag));
    return {classes, samples, flags}
}
function getSensors(){
    let sensors = [];
    for(i=1; i<=32; i++){
        sensors.push('S' + i);
    }
    return sensors;
}
// Convert to parcoord data
function toParCooordData(data){
    let info = getInfo(data);
    let classesIterator = info.classes;
    let samplesIterator = info.samples;
    let sensorsIterator = getSensors();
    results = [];
    
    // For each class
    classesIterator.forEach(cls=>{
        // For each Sample
        samplesIterator.forEach(sample=>{
            // Rows for this sample
            let rows = data.filter(d=>d.Class == cls && d.Sample === sample); //Slice here for the time step
            
            // For each sensor
            sensorsIterator.forEach(sensor=>{
                
                // There should be an item over time
                let item = {
                    'Class': cls,
                    'Sample': sample,
                    'Sensor': sensor
                }
                
                rows.forEach(r=>{
                    timeStamp = r.Flag + "-" + r.timeStep;
                    item[timeStamp] = r[sensor];
                });
                // Add this item to the result
                results.push(item);
            });
        });
        
    });
    return results;
}
// Clean the data
function cleanData(data){
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
                let sensors = getSensors();
                sensors.forEach(sensor=>{
                    let diffs = [];
                    let sensorData = flagData.map(d=>d[sensor]);
                    for(i = 0; i<sensorData.length-1; i++){
                        diffs.push(sensorData[i+1] - sensorData[i]);
                    }
                    // Calculate statistics
                    let q1 = ss.quantile(diffs, 0.25);
                    let q3 = ss.quantile(diffs, 0.75);
                    let iqr = q3 - q1;
                    let lowThreshold = q1 - 5*iqr;
                    let highThreshold = q3 + 5*iqr;
                    // Check for outlying changes
                    for(i = 1; i < sensorData.length; i++){
                        if(diffs[i-1] < lowThreshold || diffs[i-1] > highThreshold){
                            //Item i is having an issue (take its prev value)
                            flagData[i][sensor] = flagData[i-1][sensor];
                        }
                    }

                });
                // Next flag
                nextFlag = flagIt.next();
            }
            // Next next sample
            nextSample = sampleIt.next();
        }
        // Next class
        nextClass = classIt.next();
    }
    return result;
}
// Normalize the data
function normalize(data){
    // Get the max and min of each sensor
    let sensors = getSensors();
    sensors.forEach(sensor=>{
        let scaler = d3.scaleLinear().domain(d3.extent(data.map(d=>d[sensor]))).range([0, 100]);
        // Update
        data.forEach(row=>{
            row[sensor] = scaler(row[sensor]);
        });
    });
    

}

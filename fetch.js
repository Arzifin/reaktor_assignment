/*
  Arttu Lehtola
  Reaktor Assignment
*/

const TOKEN = "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";
const GIST_ID = "000397649efc24684b6b63164bfcfbb9";
const GIST_FILENAME = "dronedb.json";

const droneApiUrl = "https://cors-anywhere.herokuapp.com/https://assignments.reaktor.com/birdnest/drones";
const pilotApiUrl = "https://cors-anywhere.herokuapp.com/https://assignments.reaktor.com/birdnest/pilots/";

/*
function getXMLData(url) {
  console.log("Fetching!")
  fetch(url)
    .then((res) => {
      // Store response data
      return res.text();
    })
    .then(data => {
      let parser = new DOMParser(),
        xmlDoc = parser.parseFromString(data, 'text/xml');
      // Return XML document
      console.log("xmldoc in getter: ", xmlDoc);
      return xmlDoc;
    })
    .catch(error => {
      console.log("Error: \n" + error);
      return null;
    });
}
*/

// Fetches and returns parsed XML doc (of drones)
async function getXMLData(url) {
  try {
    console.log("Fetching!")
    var parser = new DOMParser(), xmlDoc;
    var req = await fetch(url);
    var reqText = await req.text();
    //console.log("req: ", reqText);
    xmlDoc = parser.parseFromString(reqText, 'text/xml');
  } catch (Error) {
    console.log("Error fetching drone data.");
    return null;
  }
  return xmlDoc;
}
// Fetches and returns parsed JSON doc (of pilots)
async function getJSONData(url) {
  try {
    console.log("Fetching!")
    var req = await fetch(url);
    var reqText = await req.text();
    jsonDoc = JSON.parse(reqText);
  } catch (Error) {
    console.log("Error fetching pilot data.");
    return null;
  }
  return jsonDoc;
}


async function start() {
  // Fetch drone XML document
  var xmlDroneDoc = await getXMLData(droneApiUrl);
  
  if (xmlDroneDoc != undefined) {
    console.log(xmlDroneDoc)

    var droneList = xmlDroneDoc.getElementsByTagName('drone');
    console.log("Drone:\n",xmlDroneDoc.getElementsByTagName('drone'));

    var timestamp = xmlDroneDoc.getElementsByTagName('capture')[0].getAttribute("snapshotTimestamp");
    console.log("timestamp: ", timestamp);

    ind = 0
    while (ind < droneList.length) {
      

      console.log("i",ind,": \n",droneList[ind]);

      // ID of Drone
      //var id = droneList[ind].firstElementChild.firstChild.nodeValue;
      //console.log("id:", id);
      // Position X of Drone
      var x = droneList[ind].childNodes[17].firstChild.nodeValue;
      console.log("PosX:", x);
      // Position Y of Drone
      var y = droneList[ind].childNodes[15].firstChild.nodeValue;
      console.log("PosY:", y);

      console.log("Distance: ", eucDis(x, y));

      

      var snum = droneList[ind].childNodes[1].firstChild.nodeValue;
      //snum = snum.replace("SN-",'');
      console.log("snum: ", snum);
      // Fetch pilot info for every element
      var jsonPilotDoc = await getJSONData(pilotApiUrl+snum);
      /*
      if (jsonPilotDoc == null) {
        console.log("Couldn't find the pilot");
      }*/

      var pname = jsonPilotDoc['firstName'] + " " + jsonPilotDoc['lastName']
      console.log("pname: ", pname);
      var ppnum = jsonPilotDoc['phoneNumber'];
      var pemail = jsonPilotDoc['email'];
      var pid = jsonPilotDoc['pilotId'];
      
      // If it's within 100-meter radius
      // Testing
      if (ind == 0) {
      //if (eucDis(x, y) <= 100) {

        // Fetch existing gist data
        var gistData = await getGData();
        console.log("existing jsondata: ", JSON.stringify(gistData));
        //console.log("existing pilot id: ", gistData["violator"][0]["pilotid"]);
        console.log("existing pilot id: ", gistData);
        // Check if ID exists in gist
        /*if (gistData['pilotId'] = pid) {

        }*/
        var violatorIndex = ind;
        console.log("Storing!")
        var data = {
          "violator":[{
                        "dronesn": snum,
                        "pname": pname,
                        "pemail": pemail,
                        "ppnum": ppnum,
                        "timestamp": timestamp,
                      }]
        };
        // Replace violator with pilot id
        var dataStr = JSON.stringify(data).num.replace("violator",pid);
        setGData(JSON.parse(dataStr));
      }
      
      ind+=1;
    }
  }
  // Repeats function (every 15s)
  //setTimeout(start, 15000);
}

function eucDis(x1,y1) {
  var x2 = 250000, 
      y2 = 250000
  if (0 <= x1 <= 500000 && 0 <= y1 <= 500000) {
    
    // Use pythagoras for calculating distance (since it's 2d)
    var distance = Math.sqrt(Math.pow((x1-x2), 2) + Math.pow((y1-y2), 2));
    
    /*if (distance <= 100) {
      console.log("A drone has been spotted in the NFZ!")
    }*/

    return distance;
  }
  else {
    console.log("Couldn't receive correct co-ordinates.")
    return null;
  }
}

function itera(list) {
  console.log("iterating")
  for (i in list) {
    console.log(i);
  }
}

// Fetch set gist (temp) data
async function getGData() {
  const req = await fetch(`https://api.github.com/gists/${GIST_ID}`);
  const gist = await req.json();
  return JSON.parse(gist.files[GIST_FILENAME].content);
}

// Set gist (temp) data
async function setGData(data) {
  const req = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({
      files: {
        [GIST_FILENAME]: {
          content: JSON.stringify(data),
        },
      },
    }),
  });

  return req.json();
}

start();
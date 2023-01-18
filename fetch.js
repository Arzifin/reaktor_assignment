/*
  Arttu Lehtola
  Reaktor Assignment
*/

const TOKEN = "omitted";
const GIST_ID = "000397649efc24684b6b63164bfcfbb9";
const GIST_FILENAME = "dronedb.json";

const droneApiUrl = "https://cors-anywhere.herokuapp.com/https://assignments.reaktor.com/birdnest/drones";
const pilotApiUrl = "https://cors-anywhere.herokuapp.com/https://assignments.reaktor.com/birdnest/pilots/";

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
    console.log("Drone:\n", xmlDroneDoc.getElementsByTagName('drone'));

    var timestamp = xmlDroneDoc.getElementsByTagName('capture')[0].getAttribute("snapshotTimestamp");
    console.log("timestamp: ", timestamp);


    var time = new Date();
    console.log("time:", time.toISOString());

    var i = 0;
    var data = {};
    var dataOut = {};
    let gistData = await getGData();
    while (i < droneList.length) {

      console.log("i", i, ": \n", droneList[i]);

      // ID of Drone
      //var id = droneList[ind].firstElementChild.firstChild.nodeValue;
      //console.log("id:", id);
      // Position X of Drone
      var x = droneList[i].childNodes[17].firstChild.nodeValue;
      console.log("PosX:", x);
      // Position Y of Drone
      var y = droneList[i].childNodes[15].firstChild.nodeValue;
      console.log("PosY:", y);

      var eudis = eucDis(x, y);
      console.log("Distance: ", eudis);


      // Serial number
      var snum = droneList[i].childNodes[1].firstChild.nodeValue;
      console.log("snum: ", snum);
      // Fetch pilot info for every element
      var jsonPilotDoc = await getJSONData(pilotApiUrl + snum);


      var pname = jsonPilotDoc['firstName'] + " " + jsonPilotDoc['lastName']
      console.log("pname: ", pname);
      var ppnum = jsonPilotDoc['phoneNumber'];
      var pemail = jsonPilotDoc['email'];
      var pid = jsonPilotDoc['pilotId'];


      //console.log("criminal spotted! D:")

      // If it's within 100-meter radius
      //if (i == 0) {

      //let gistData = await getGData();
      if (eucDis(x, y) <= 100000) {
        // Fetch existing gist data
        console.log("Violator!")


        // Now we can save new data,
        // combine it with pre-existing data object
        //console.log("Storing!")
        data = {
          "violator": [{
            "dronesn": snum,
            "pilotid": pid,
            "pname": pname,
            "pemail": pemail,
            "ppnum": ppnum,
            "timestamp": timestamp,
            "dist": eudis,
          }]
        };

        // Check if the drone list attendee appears on gist data
        var j = 0;
        while (j < gistData.length) {
          // Matching ID found, update last seen
          if (pid == Object.keys(gistData)[j]) {
            console.log("Updating ", gistData[pid][0]["timestamp"], " to ", time.toISOString());
            gistData[pid][0]["timestamp"] = time.toISOString();

            // If distance has shortened, update it
            if (Object.keys(gistData)[j][0]["dist"] > eudis) {
              Object.keys(gistData)[j][0]["dist"] = eudis;
            }
          }
          // If identical ID is found, then do not re-add
          else {
            data = {}
          }
        }
        
        // Form new JSON object from old and new data
        var dataStr = JSON.stringify(data);
        dataStr = dataStr.replace("violator", pid);
        data = JSON.parse(dataStr);
        // Fetch old data
        //gistData = await getGData();
        dataOut = Object.assign({}, gistData, data);
        console.log("dataOut: ", dataOut)

        // Check timestamps and delete objects accordingly
        var k = 0;
        while (k < gistData.length) {
          var key = Object.keys(data)[k];
          var keyDate = gistData[key][0]["timestamp"];

          // If 10 minutes have passed
          console.log("timedelta: ", dateFromString(keyDate).getTime() - time.getTime())
          if (dateFromString(keyDate).getTime() - time.getTime() <= 600000) {
            console.log("deleted because of time!")
            delete dataOut[key];
          }
        }

        // Save the data changes
        //setGData(dataOut);

      }
      else {
        //dataOut = await getGData();
      }

      // Update look of HTML element
      var output = document.getElementById("out");
      output.innerHTML = 'Violators:' + "<br />" + JSON.stringify(dataOut);

      // Save data to gist
      //setGData(dataOut);

      i += 1;
    }
    // Save data to gist
    // Try not to access gist too often (limitations)
    setGData(dataOut);
  }
  // Repeats function (every 15s)
  // setTimeout(start, 15000);
}

function dateFromString(string) {
  var dt = new Date();
  var dtS = string.slice(string.indexOf('T') + 1, string.indexOf('.'))
  var TimeArray = dtS.split(":");
  dt.setUTCHours(TimeArray[0], TimeArray[1], TimeArray[2]);
  dtS = string.slice(0, string.indexOf('T'))
  TimeArray = dtS.split("-");
  dt.setUTCFullYear(TimeArray[0], TimeArray[1], TimeArray[2]);
  return dt;
}

function eucDis(x1, y1) {
  var x2 = 250000,
    y2 = 250000
  if (0 <= x1 <= 500000 && 0 <= y1 <= 500000) {

    // Use pythagoras for calculating distance (since it's 2d)
    var distance = Math.sqrt(Math.pow((x1 - x2), 2) + Math.pow((y1 - y2), 2));

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
  //console.log("Setting gist data!", data)
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
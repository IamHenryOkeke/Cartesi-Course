// XXX even though ethers is not used in the code below, it's very likely
// it will be used by any DApp, so we are already including it here
const { ethers } = require("ethers");

const rollup_server = process.env.ROLLUP_HTTP_SERVER_URL;
console.log("HTTP rollup_server url is " + rollup_server);

function hexToStr(hex) {
  return ethers.utils.toUtf8String(hex);
}

function strToHex(string) {
  return ethers.hexlify(ethers.utils.toUtf8Bytes(string));
}

function isNumemric(num) {
  return !isNaN(num);
}

let users = []
let toUpperTotal = 0

async function handle_advance(data) {
  console.log("Received advance request data " + JSON.stringify(data));
  const metadata = data["metadata"]
  const sender = metadata["msg_sender"]
  const payload = data["payload"]

  let sentence = hexToStr(payload)

  if(isNumemric(sentence)) {
    const finish_req = await fetch(rollup_server + "/report", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ payload: strToHex("Sentence is not an hex format") }),
    });
    return "reject"
  }

  users.push(sender);
  toUpperTotal += 1;

  sentence = sentence.toUpperCase();
  const notice_req = await fetch(rollup_server + "/notice", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ payload: strToHex(sentence) }),
  });

  return "accept";
}

async function handle_inspect(data) {
  console.log("Received inspect request data " + JSON.stringify(data));
  
  const payload = data["payload"];
  const route = hexToStr(payload);

  let responseObj;
  if (route === "list") {
    responseObj = JSON.stringify({users})
  } else if (route === "total") {
    responseObj = JSON.stringify({toUpperTotal})
  } else {
    responseObj = "route not implemented"
  }

  const report_req = await fetch(rollup_server + "/report", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ payload: strToHex(responseObj) }),
  });

  return "accept";
}

var handlers = {
  advance_state: handle_advance,
  inspect_state: handle_inspect,
};

var finish = { status: "accept" };

(async () => {
  while (true) {
    const finish_req = await fetch(rollup_server + "/finish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "accept" }),
    });

    console.log("Received finish status " + finish_req.status);

    if (finish_req.status == 202) {
      console.log("No pending rollup request, trying again");
    } else {
      const rollup_req = await finish_req.json();
      var handler = handlers[rollup_req["request_type"]];
      finish["status"] = await handler(rollup_req["data"]);
    }
  }
})();

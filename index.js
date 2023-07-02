const express = require("express");
const app = express();
const http = require("http").Server(app);
const PORT = process.env.PORT || 8080;
const path = require("path");
const socketIO = require("socket.io")(http);
const fyers = require("fyers-api-v2");
const mongoose = require("mongoose");
const env = require("dotenv").config();
const Data = require("./Models/Data");
const { exit } = require("process");
app.use(express.static("public"));

const uri = process.env.URI;

const appData = {
  APPID: process.env.APPID,
  SECRETID: process.env.SECRETID,
  REDIRECTURL: process.env.REDIRECTURL,
  AUTHCODE: "",
  ACCESSTOKEN: "",
};

var script = [
  {
    name: "NSE:SBIN-EQ",
    SL: 0,
    TP: 0,
    TSL: 0,
    first_open: 0,
    first_high: 0,
    first_low: 0,
    first_close: 0,

  },
  {
    name: "NSE:SBIN-EQ",
    SL: 0,
    TP: 0,
    TSL: 0,
    first_open: 0,
    first_high: 0,
    first_low: 0,
    first_close: 0,
  },
  {
    name: "NSE:SBIN-EQ",
    SL: 0,
    TP: 0,
    TSL: 0,
    first_open: 0,
    first_high: 0,
    first_low: 0,
    first_close: 0,
  },
  {
    name: "NSE:SBIN-EQ",
    SL: 0,
    TP: 0,
    TSL: 0,
    first_open: 0,
    first_high: 0,
    first_low: 0,
    first_close: 0,
  },
];
let time0830;
let time0915;
let time0930;
let time1515;
let time0945;
let buyTradeTaken = [];
let sellTradeTaken = [];
let exitApp=false;
fyers.setAppId(process.env.APPID);
fyers.setRedirectUrl(process.env.REDIRECTURL);

mongoose
  .connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then((res) => {
    console.log("db connected successfully");
  })
  .catch((error) => {
    console.log("Something wrong happened" + error);
  });

function setDates() {
  const date = new Date();
  let day = date.getDate();
  let month = date.getMonth();
  let year = date.getFullYear();
  console.log(day + "/" + month + "/" + year);
  time0830 = Math.floor(new Date(year, month, day, 8, 30, 0, 0)); //corresponding time to 0915 in utc
  time0915 = Math.floor(new Date(year, month, day, 9, 15, 0, 0)); //corresponding time to 0915 in utc
  time0930 = Math.floor(new Date(year, month, day, 9, 30, 0, 0)); //corresponding time to 0930 in utc
  time1515 = Math.floor(new Date(year, month, day, 15, 15, 0, 0)); //corresponding time to 1515 in utc
  time0945 = Math.floor(new Date(year, month, day, 9, 45, 0, 0)); //corresponding time to 0945 in utc
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

socketIO.on("connection", (socket) => {
  logger(`⚡: Console with ID->${socket.id} just connected`);

  socket.on("token", async (authCode) => {
    try {
      const reqBody = {
        auth_code: authCode,
        client_id: process.env.APPID,
        secret_key: process.env.SECRETID,
      };

      fyers.generate_access_token(reqBody).then(async (response) => {
        //console.log(response);
        const accessToken = response.access_token;
        if (accessToken !== undefined) {
          //console.log("The token is " + accessToken);
          appData.ACCESSTOKEN = accessToken;
          fyers.setAccessToken(accessToken);
          const delResult = await Data.deleteMany({});
          //console.log(delResult);

          logger("AuthCode and Token Database is cleared");
          const newToken = new Data({
            authString: authCode,
            token: accessToken,
          });
          newToken.save().then((res) => {
            console.log(res);
          });
          socket.emit("AuthTokenSaved", "Auth Token Saved");
        } else {
          logger(response.message);
        }
      });
    } catch (e) {
      console.log(e);
    }
  });

  socket.on("scripts",async(script1,script2,script3,script4)=>{
    script[0].name="NSE:"+script1+"-EQ";
    script[1].name="NSE:"+script2+"-EQ";
    script[2].name="NSE:"+script3+"-EQ";
    script[3].name="NSE:"+script4+"-EQ";

    socket.emit("AuthTokenSaved","All the Scripts are saved for trading")
  })


  function logger(data) {
    socket.emit("log", data);
  }

  function barDataSet(price,sl,tp,name){
    socket.emit("barDataSet",price,sl,tp,name)
  }

  socket.on("start", () => {
    socket.emit(
      "startmessage",
      "---------------Bot Started--------------------"
    );
    startBot();
  });

  async function getHistory(scripts) {
    try {
      // logger("INTO FIRST CANDLE");
      let dateFrom = time0915 / 1000;
      let dateTo = time0930 / 1000;

      let history = new fyers.history();
      let result = await history
        .setSymbol(scripts)
        .setResolution("15")
        .setDateFormat(0)
        .setRangeFrom(dateFrom)
        .setRangeTo(dateTo - 1)
        .getHistory();
      //console.log(result);
      if (result.candles) {
        script[0].first_open = result.candles[0][1];
        script[0].first_high = result.candles[0][2];
        script[0].first_low = result.candles[0][3];
        script[0].first_close = result.candles[0][4];

        logger("first candle obtained");
        logger("first candle open"+script[0].first_open+" high "+script[0].first_high+" low "+script[0].first_low+" close "+script[0].first_close);
        return true;
      } else {
        return false;
      }
    } catch (e) {
      console.log(e);
      return false;
    }
  }

  async function takeTrade(id) {
    //console.log(script[id]);
    // logger("TAKING TRADES");
    let quotes = new fyers.quotes();
    let result = await quotes.setSymbol(script[id].name).getQuotes();
    // console.log(result.d);
    if (buyTradeTaken.includes(script[id].name)) {
      exitTrades(script[id].name, 0, id, result);
      
    } else if (sellTradeTaken.includes(script[id].name)) {
      exitTrades(script[id].name, 1, id, result);
      
    } else if (Date.now() > time1515) {
      logger("Times is 03:15, Now no new trade will be taken");
      exitApp=true;

    } else if (result.d[0].v.lp > script[id].first_high) {
      script[id].TP =script[id].first_high +(script[id].first_high - script[id].first_low) / 2;
      buyTradeTaken.push(script[id].name);
      //console.log(buyTradeTaken);
      logger("buy at " + result.d[id].v.lp);


    } else if (result.d[0].v.lp < script[id].first_low) {
      sellTradeTaken.push(script[id].name);
      script[id].TP =script[id].first_low -(script[id].first_high - script[id].first_low) / 2;
      logger("sell at " + result.d[0].v.lp);
    } else {
      logger("loop continues for checking condition for taking positions");
    }
  }

  async function exitTrades(scripts, side, id, result) {
    logger("checking condition for exit for" + scripts);
    // let quotes = new fyers.quotes();
    // let result = await quotes.setSymbol(scripts).getQuotes();
    logger("Price " + result.d[0].v.lp+" Stop Loss " + script[id].SL+ " Target " + script[id].TP);
    
    if (Date.now() > time1515) {
      logger("Time is 03:15 exiting all trade");
      logger("Trade exited");
      exitApp=true;
    } else if (side === 0 &&(result.d[0].v.lp < script[id].SL || result.d[0].v.lp > script[id].TP)) {
      barDataSet(result.d[0].v.lp,script[id].SL,script[id].TP,scripts)
      logger(scripts + "Shares Sold adjusted");
      exitApp=true;
    } else if (side === 1 &&(result.d[0].v.lp > script[id].SL || result.d[0].v.lp < script[id].TP)) {
      barDataSet(result.d[0].v.lp,script[id].SL,script[id].TP,scripts)
      logger(scripts + "Shares Bought adjusted");
      exitApp=true;
    } else {
      barDataSet(result.d[0].v.lp,script[id].SL,script[id].TP,scripts)
      logger("loop continues for selling");
    }
  }

  async function startBot() {
    logger("Welcome to ROBO Trading");
    setDates();
    // getData();

    if (Date.now() > time1515 || Date.now() < time0830) {
      const delResult = await Data.deleteMany({});
      //console.log(delResult);
      logger("Since the time is not in the trading range the BOT has exit");
      logger("AuthCode and Token Database is cleared");

      return;
    }
    logger("TIME IS MORE THAN 08:30AM. Lets Login");
    const appDataFetch = await Data.findOne();
    fyers.setAccessToken(appDataFetch.token);

    while (Date.now() < time0915) {
      await sleep(300000);
      logger("Please Wait");
    }

    fyers.get_funds().then((response) => {
      // console.log(response);
      try {
        if (response.fund_limit[0].equityAmount !== undefined) {
          logger("LOGGED IN TO ACCOUNT SUCCESSFULLY");
          logger(
            "FUND IN YOUR ACCOUNT IS ->" + response.fund_limit[0].equityAmount
          );
        } else {
          logger("Bot Was unable to login Please Try again");
          return;
        }
      } catch (e) {
        // console.log(e)
        logger(response.message);
        return;
      }
    });

    while (Date.now() < time0930) {
      logger("Please Wait till 9:30");

      await sleep(60000);
    }

    logger("TIME IS MORE THAN 9:30AM. Lets find favourable trades");
    const getFirstCandleReport = getHistory(script[0].name);
    if (!getFirstCandleReport) {
      logger("Cannot get First Candle hence Exiting");
      return;
    }
    await sleep(10000);
    script[0].SL = (script[0].first_high + script[0].first_low) / 2;
    //console.log(script[0].SL);
    while (Date.now() < time0945) {
      logger("waiting for 9-45");
      await sleep(60000);
    }
    
    while (!exitApp) {
      takeTrade(0);
      await sleep(60000);
    }
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "/index.html"));
});

http.listen(PORT, () => {
  console.log(`App listening at ${PORT}`);
});

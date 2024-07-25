const fs = require("fs");

function logMessageData(data) {
  const logData = `${new Date().toISOString()} - ${JSON.stringify(data)}\n`;
  fs.appendFile("saintcon-bot.log", logData, (err) => {
    if (err) {
      console.error("Error writing to log file", err);
    }
  });
}

function logExtractionMetadata(data) {
  const logData = `${new Date().toISOString()} - ${JSON.stringify(data)}\n`;
  fs.appendFile("saintcon-extraction.log", logData, (err) => {
    if (err) {
      console.error("Error writing to extraction log file", err);
    }
  });
}

module.exports = { logMessageData, logExtractionMetadata };

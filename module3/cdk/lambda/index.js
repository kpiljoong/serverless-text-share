var crypto = require('crypto');
var aws = require('aws-sdk');
var dynamodb = new aws.DynamoDB({apiVersion: '2012-08-10'});
var TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
  const queryParams = event.queryStringParameters;
  const pathParams = event.pathParameters;
  console.log('query:', queryParams);
  console.log('path:', pathParams);

  let res = {};
  if (queryParams != null) {
    const key = randomValue(10);
    const text = queryParams.text;
    if (text == null) {
      res = {
        code: 500, body: `Text is empty`
      };
    } else {
      res = putItem(key, text);
    }
  } else if (pathParams != null) {
    let path = pathParams.proxy;
    console.log('path', path);
    if (path[path.length-1] == '/') path = path.slice(0, -1);
    const splited = path.split('/');
    console.log('path', splited);
    const pid = splited[splited.length-1];
    console.log('path', pid);
    res = getItem(pid);
  } else {
    res = {
      code: 401,
      body: `Unrecognized operation`
    };
  }

  return res;
};

async function putItem(key, text) {
  let item = {
    "pid": {"S": key},
    "text": {"S": text}
  };
  try {
    let result = await dynamodb.putItem({
      "TableName": TABLE_NAME,
      "Item" : item
    }).promise();
    console.log('result', result);
    return createReseponse(200, key);
  } catch (err) {
    return createReseponse(500, `Failed to put item ${err}`);
  }
}

async function getItem(pid) {
  console.log('pid', pid);
  try {
    let result = await dynamodb.getItem({
      "TableName": TABLE_NAME,
      "Key" : {
          "pid": {"S": pid }
      }
    }).promise();
    console.log('result', result);
    return createReseponse(200, result.Item.text.S);
  } catch (err) {
    return createReseponse(500, `Failed to get item ${err}`);
  }
}

function createReseponse(code, data) {
  return {
    statusCode: code,
    headers: {'Content-Type': 'text/plain; charset=utf-8'},
    body: JSON.stringify({ "new_data": data })
  };
}

const charsNumbers = '0123456789';
const charsLower = 'abcdefghijklmnopqrstuvwxyz';
const charsUpper = charsLower.toUpperCase();
const chars = charsNumbers + charsLower + charsUpper;

function randomValue(length) {
  length = length || 32;

  var string = '';

  while (string.length < length) {
    var bf = crypto.randomBytes(length);
    for (var i = 0; i < bf.length; i++) {
      var index = bf.readUInt8(i) % chars.length;
      string += chars.charAt(index);
    }
  }
  return string;
}
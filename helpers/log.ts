import * as fs from 'fs';
import * as util from 'util';

/**
 * @param data the json object to write to log
 * @param fileName optional filename to write to, defaults to log.json
 */
export async function log(data: object, fileName = 'log.json') {
  const prettyPrinted = util.inspect(data, { depth: null, maxArrayLength: null }); // like json.stringify but handles circular references
  if (!fileName.includes('.json')) {
    fileName = `${fileName}.json`;
  }

  fs.writeFile(`logs/${fileName}`, prettyPrinted, err => {
    if (err) {
      return console.log(
        'An error occurred while writing the log',
        JSON.stringify(err)
      );
    }
    console.log(`log written to logs/${fileName}`);
  });
}

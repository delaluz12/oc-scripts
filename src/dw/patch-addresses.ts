import config from '../../integration-users.config';
import * as helpers from '../../helpers';

//const toPatch = require('../inputData/dw-address-update.json');

interface DWBuyerPatchRequest {
  buyer: string;
  address: string;
  country: string;
}
async function run() {
  var toPatch = await helpers.csvToJson('AddressCountrytoFix20200928.csv');
  const creds = config.dw.prod.seller;

  const sdk = await helpers.ocClient(creds.clientID, creds.clientSecret, 'Production');

  const total = toPatch.length;
  let progress = 0;
  const errors = {};

  await helpers.batchOperations(toPatch, async function singleOperation(
    request: DWBuyerPatchRequest
  ) {
    try {
      progress++;
      await sdk.Addresses.Patch(request.buyer, request.address, { Country: request.country });
      console.log(`${progress} of ${total} patch address requests complete`);
    } catch (e) {
      errors[`${request.buyer}_${request.address}`] = e;
      console.log(e);
    }
  });

  helpers.log(errors, 'dw-patch-addresses-errors');
}

run();
